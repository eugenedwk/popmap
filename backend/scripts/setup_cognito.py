#!/usr/bin/env python3
"""
Script to set up AWS Cognito User Pool for PopMap application.
Run this script to create the Cognito User Pool with proper configuration.

Prerequisites:
- AWS CLI configured with appropriate credentials
- boto3 installed (pip install boto3)

Usage:
    python scripts/setup_cognito.py
"""

import boto3
import json
import sys
from botocore.exceptions import ClientError

# Configuration
REGION = 'us-east-1'
POOL_NAME = 'popmap-users'
APP_CLIENT_NAME = 'popmap-web-client'
DOMAIN_PREFIX = 'popmap-auth'

# Callback URLs - update these for production
CALLBACK_URLS = [
    'http://localhost:5173/callback',
    'https://popmap.co/callback',
    'https://www.popmap.co/callback'
]

LOGOUT_URLS = [
    'http://localhost:5173',
    'https://popmap.co',
    'https://www.popmap.co'
]


def create_user_pool(client):
    """Create Cognito User Pool with custom attributes for user roles."""
    print("Creating Cognito User Pool...")

    try:
        response = client.create_user_pool(
            PoolName=POOL_NAME,
            Policies={
                'PasswordPolicy': {
                    'MinimumLength': 8,
                    'RequireUppercase': True,
                    'RequireLowercase': True,
                    'RequireNumbers': True,
                    'RequireSymbols': False,
                }
            },
            AutoVerifiedAttributes=['email'],
            UsernameAttributes=['email'],
            UsernameConfiguration={
                'CaseSensitive': False
            },
            Schema=[
                {
                    'Name': 'email',
                    'AttributeDataType': 'String',
                    'Required': True,
                    'Mutable': True,
                },
                {
                    'Name': 'name',
                    'AttributeDataType': 'String',
                    'Required': True,
                    'Mutable': True,
                },
                {
                    'Name': 'given_name',
                    'AttributeDataType': 'String',
                    'Required': False,
                    'Mutable': True,
                },
                {
                    'Name': 'family_name',
                    'AttributeDataType': 'String',
                    'Required': False,
                    'Mutable': True,
                },
                # Custom attribute for user role (business_owner or attendee)
                {
                    'Name': 'user_role',
                    'AttributeDataType': 'String',
                    'DeveloperOnlyAttribute': False,
                    'Mutable': True,
                    'Required': False,
                    'StringAttributeConstraints': {
                        'MinLength': '1',
                        'MaxLength': '50'
                    }
                }
            ],
            EmailConfiguration={
                'EmailSendingAccount': 'COGNITO_DEFAULT'
            },
            UserPoolTags={
                'Environment': 'production',
                'Application': 'popmap'
            }
        )

        user_pool_id = response['UserPool']['Id']
        print(f"✅ User Pool created: {user_pool_id}")
        return user_pool_id

    except ClientError as e:
        print(f"❌ Error creating user pool: {e}")
        sys.exit(1)


def create_app_client(client, user_pool_id):
    """Create app client for web application."""
    print("Creating app client...")

    try:
        response = client.create_user_pool_client(
            UserPoolId=user_pool_id,
            ClientName=APP_CLIENT_NAME,
            GenerateSecret=False,  # Public client (no secret)
            RefreshTokenValidity=30,
            AccessTokenValidity=60,
            IdTokenValidity=60,
            TokenValidityUnits={
                'AccessToken': 'minutes',
                'IdToken': 'minutes',
                'RefreshToken': 'days'
            },
            ReadAttributes=[
                'email',
                'email_verified',
                'name',
                'given_name',
                'family_name',
                'custom:user_role'
            ],
            WriteAttributes=[
                'email',
                'name',
                'given_name',
                'family_name',
                'custom:user_role'
            ],
            ExplicitAuthFlows=[
                'ALLOW_USER_SRP_AUTH',
                'ALLOW_REFRESH_TOKEN_AUTH',
                'ALLOW_CUSTOM_AUTH'
            ],
            SupportedIdentityProviders=[
                'COGNITO',
                'Facebook',
                'Google'
            ],
            CallbackURLs=CALLBACK_URLS,
            LogoutURLs=LOGOUT_URLS,
            AllowedOAuthFlows=['code', 'implicit'],
            AllowedOAuthScopes=['openid', 'email', 'profile'],
            AllowedOAuthFlowsUserPoolClient=True,
            PreventUserExistenceErrors='ENABLED'
        )

        app_client_id = response['UserPoolClient']['ClientId']
        print(f"✅ App client created: {app_client_id}")
        return app_client_id

    except ClientError as e:
        print(f"❌ Error creating app client: {e}")
        sys.exit(1)


def create_user_pool_domain(client, user_pool_id):
    """Create Cognito domain for hosted UI."""
    print(f"Creating user pool domain: {DOMAIN_PREFIX}...")

    try:
        client.create_user_pool_domain(
            Domain=DOMAIN_PREFIX,
            UserPoolId=user_pool_id
        )

        domain = f"{DOMAIN_PREFIX}.auth.{REGION}.amazoncognito.com"
        print(f"✅ Domain created: {domain}")
        return domain

    except ClientError as e:
        if e.response['Error']['Code'] == 'InvalidParameterException':
            print(f"⚠️  Domain {DOMAIN_PREFIX} might already exist or be invalid")
        else:
            print(f"❌ Error creating domain: {e}")
        return None


def add_google_provider(client, user_pool_id):
    """Add Google as identity provider."""
    print("\n⚠️  To add Google as an identity provider:")
    print("1. Go to https://console.cloud.google.com/")
    print("2. Create a new project or select existing")
    print("3. Enable Google+ API")
    print("4. Create OAuth 2.0 credentials (Web application)")
    print("5. Add authorized redirect URI:")
    print(f"   https://{DOMAIN_PREFIX}.auth.{REGION}.amazoncognito.com/oauth2/idpresponse")
    print("6. Note your Client ID and Client Secret")
    print("\nThen run:")
    print(f"aws cognito-idp create-identity-provider \\")
    print(f"  --user-pool-id {user_pool_id} \\")
    print(f"  --provider-name Google \\")
    print(f"  --provider-type Google \\")
    print(f"  --provider-details client_id=YOUR_GOOGLE_CLIENT_ID,client_secret=YOUR_GOOGLE_CLIENT_SECRET,authorize_scopes='email profile openid' \\")
    print(f"  --attribute-mapping email=email,name=name,given_name=given_name,family_name=family_name")


def add_facebook_provider(client, user_pool_id):
    """Add Facebook as identity provider."""
    print("\n⚠️  To add Facebook as an identity provider:")
    print("1. Go to https://developers.facebook.com/")
    print("2. Create a new app (Consumer type)")
    print("3. Add Facebook Login product")
    print("4. In Facebook Login Settings, add OAuth redirect URI:")
    print(f"   https://{DOMAIN_PREFIX}.auth.{REGION}.amazoncognito.com/oauth2/idpresponse")
    print("5. Get App ID and App Secret from Settings > Basic")
    print("\nThen run:")
    print(f"aws cognito-idp create-identity-provider \\")
    print(f"  --user-pool-id {user_pool_id} \\")
    print(f"  --provider-name Facebook \\")
    print(f"  --provider-type Facebook \\")
    print(f"  --provider-details client_id=YOUR_FACEBOOK_APP_ID,client_secret=YOUR_FACEBOOK_APP_SECRET,authorize_scopes='public_profile,email' \\")
    print(f"  --attribute-mapping email=email,name=name,username=id")


def print_env_vars(user_pool_id, app_client_id, domain):
    """Print environment variables to add to .env files."""
    print("\n" + "="*70)
    print("✅ SETUP COMPLETE!")
    print("="*70)
    print("\n📝 Add these to your backend/.env file:")
    print("-" * 70)
    print(f"AWS_COGNITO_USER_POOL_ID={user_pool_id}")
    print(f"AWS_COGNITO_APP_CLIENT_ID={app_client_id}")
    print(f"AWS_COGNITO_REGION={REGION}")
    print(f"AWS_COGNITO_DOMAIN={DOMAIN_PREFIX}")

    print("\n📝 Add these to your frontend/.env file:")
    print("-" * 70)
    print(f"VITE_COGNITO_USER_POOL_ID={user_pool_id}")
    print(f"VITE_COGNITO_APP_CLIENT_ID={app_client_id}")
    print(f"VITE_COGNITO_REGION={REGION}")
    print(f"VITE_COGNITO_DOMAIN={DOMAIN_PREFIX}")
    print(f"VITE_APP_URL=http://localhost:5173")

    print("\n🔗 Hosted UI URL:")
    print(f"https://{domain}/login?client_id={app_client_id}&response_type=code&redirect_uri=http://localhost:5173/callback")
    print("="*70 + "\n")


def main():
    """Main setup function."""
    print("="*70)
    print("AWS Cognito Setup for PopMap")
    print("="*70 + "\n")

    # Initialize boto3 client
    try:
        client = boto3.client('cognito-idp', region_name=REGION)
        print(f"✅ Connected to AWS region: {REGION}\n")
    except Exception as e:
        print(f"❌ Failed to connect to AWS: {e}")
        print("Make sure AWS CLI is configured: aws configure")
        sys.exit(1)

    # Create resources
    user_pool_id = create_user_pool(client)
    app_client_id = create_app_client(client, user_pool_id)
    domain = create_user_pool_domain(client, user_pool_id)

    # Print instructions for social providers
    add_google_provider(client, user_pool_id)
    add_facebook_provider(client, user_pool_id)

    # Print environment variables
    print_env_vars(user_pool_id, app_client_id, domain or f"{DOMAIN_PREFIX}.auth.{REGION}.amazoncognito.com")


if __name__ == '__main__':
    main()
