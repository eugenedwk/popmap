from rest_framework import authentication, exceptions
from django.contrib.auth.models import User
import jwt
from jwt import PyJWKClient
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


class CognitoAuthentication(authentication.BaseAuthentication):
    """
    Authenticate users using AWS Cognito JWT tokens.
    Extracts user role from custom:user_role claim.
    """

    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')

        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]

        try:
            # Verify and decode the JWT token
            payload = self.verify_token(token)

            # Get or create Django user from Cognito claims
            user = self.get_or_create_user(payload)

            return (user, token)

        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed('Token has expired')
        except jwt.InvalidTokenError as e:
            raise exceptions.AuthenticationFailed(f'Invalid token: {str(e)}')
        except Exception as e:
            logger.error(f'Authentication failed: {str(e)}')
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}')

    def verify_token(self, token):
        """Verify JWT token using Cognito's public keys"""
        region = settings.AWS_COGNITO_REGION
        user_pool_id = settings.AWS_COGNITO_USER_POOL_ID
        app_client_id = settings.AWS_COGNITO_APP_CLIENT_ID

        jwks_url = (
            f'https://cognito-idp.{region}.amazonaws.com/'
            f'{user_pool_id}/.well-known/jwks.json'
        )

        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Cognito access tokens don't have 'aud' claim, only 'client_id'
        # ID tokens have 'aud' claim
        # Decode without audience verification first
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=['RS256'],
            options={'verify_exp': True, 'verify_aud': False}
        )

        # Verify the token is for our app
        # Access tokens have client_id, ID tokens have aud
        token_client_id = payload.get('client_id') or payload.get('aud')
        if token_client_id != app_client_id:
            raise jwt.InvalidTokenError('Token is not for this application')

        # Verify token_use is either 'access' or 'id'
        token_use = payload.get('token_use')
        if token_use not in ['access', 'id']:
            raise jwt.InvalidTokenError('Invalid token_use claim')

        return payload

    def get_or_create_user(self, payload):
        """Get or create Django user from Cognito claims"""
        from apps.authentication.models import UserProfile, UserRole

        cognito_sub = payload.get('sub')
        email = payload.get('email', '')
        username = payload.get('cognito:username') or email or cognito_sub

        # Extract user role from custom attribute
        user_role = payload.get('custom:user_role', UserRole.ATTENDEE)

        # Normalize role value
        if user_role not in [UserRole.BUSINESS_OWNER, UserRole.ATTENDEE]:
            user_role = UserRole.ATTENDEE

        # Extract identity provider
        identity_provider = payload.get('identities', [{}])[0].get('providerName', 'Cognito') \
                          if 'identities' in payload else 'Cognito'

        # Try to find existing user by cognito_sub
        try:
            user_profile = UserProfile.objects.select_related('user').get(
                cognito_sub=cognito_sub
            )
            user = user_profile.user

            # Update user info if changed
            if user.email != email:
                user.email = email
                user.save(update_fields=['email'])

            # Update profile if role or provider changed
            if user_profile.role != user_role or user_profile.identity_provider != identity_provider:
                user_profile.role = user_role
                user_profile.identity_provider = identity_provider
                user_profile.save(update_fields=['role', 'identity_provider', 'updated_at'])

            return user

        except UserProfile.DoesNotExist:
            pass

        # Create new user
        user, created = User.objects.get_or_create(
            username=username[:150],  # Django username max length
            defaults={
                'email': email,
                'first_name': payload.get('given_name', '')[:150],
                'last_name': payload.get('family_name', '')[:150],
            }
        )

        # If username existed, update email
        if not created and user.email != email:
            user.email = email
            user.save(update_fields=['email'])

        # Create user profile and link to Cognito
        UserProfile.objects.create(
            user=user,
            cognito_sub=cognito_sub,
            role=user_role,
            identity_provider=identity_provider,
            is_profile_complete=False
        )

        logger.info(f'Created new user: {username} with role: {user_role}')

        return user
