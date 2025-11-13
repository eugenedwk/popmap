from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .serializers import UserSerializer, UpdateProfileSerializer
import logging

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Get current authenticated user information.
    Includes profile data and role information.
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_profile(request):
    """
    Update current user's profile.
    Allows updating name, role, and notification preferences.
    """
    serializer = UpdateProfileSerializer(data=request.data)

    if serializer.is_valid():
        serializer.update(request.user, serializer.validated_data)

        # Return updated user data
        user_serializer = UserSerializer(request.user)
        return Response(user_serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([AllowAny])
def auth_config(request):
    """
    Return Cognito configuration for frontend.
    Public endpoint to provide auth configuration.
    """
    return Response({
        'user_pool_id': settings.AWS_COGNITO_USER_POOL_ID,
        'app_client_id': settings.AWS_COGNITO_APP_CLIENT_ID,
        'region': settings.AWS_COGNITO_REGION,
        'domain': settings.AWS_COGNITO_DOMAIN,
        'hosted_ui_url': f"https://{settings.AWS_COGNITO_DOMAIN}.auth.{settings.AWS_COGNITO_REGION}.amazoncognito.com",
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def auth_status(request):
    """
    Check authentication status and return user info.
    """
    user_serializer = UserSerializer(request.user)
    return Response({
        'isAuthenticated': True,
        'user': user_serializer.data
    })
