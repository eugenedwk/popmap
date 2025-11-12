# AWS Cognito & SSO Integration Guide

## Overview
This guide documents the steps to integrate AWS Cognito with social authentication (Facebook and Instagram) for the Popmap application.

## Table of Contents
1. [AWS Cognito Setup](#step-1-aws-cognito-setup)
2. [Social Provider Configuration](#step-2-social-provider-configuration)
3. [Backend Integration (Django)](#step-3-backend-integration-django)
4. [Frontend Integration (React)](#step-4-frontend-integration-react)
5. [Environment Variables](#step-5-environment-variables)
6. [Business Ownership Integration](#step-6-business-ownership-integration)
7. [Testing & Deployment](#step-7-testing--deployment)

---

## Step 1: AWS Cognito Setup

### 1.1 Create Cognito User Pool

**Using AWS CLI:**
```bash
aws cognito-idp create-user-pool \
  --pool-name popmap-users \
  --auto-verified-attributes email \
  --username-attributes email \
  --policies "PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true}"
```

**Using AWS Console:**
1. Navigate to AWS Cognito in AWS Console
2. Click "Create User Pool"
3. Configure sign-in options:
   - Sign-in option: **Email**
   - Username attributes: **Email**
4. Configure security requirements:
   - Password policy: Use defaults (min 8 chars, require uppercase, lowercase, numbers)
   - Multi-factor authentication: Optional (can enable later)
5. Configure sign-up experience:
   - Enable self-registration: **Yes**
   - Allow Cognito to automatically send messages: **Yes**
6. Configure message delivery:
   - Email provider: **Send email with Cognito** (or configure SES for production)
7. Integrate your app:
   - User pool name: `popmap-users`
   - App client name: `popmap-web-client`
   - Client type: **Public client**
8. Required attributes:
   - `email` (required, mutable)
   - `name` (required, mutable)
   - `given_name` (optional)
   - `family_name` (optional)

### 1.2 Create App Client

1. In your User Pool, go to "App integration" → "App clients"
2. Click "Create app client"
3. Configure app client:
   - App client name: `popmap-web-client`
   - Client type: **Public client** (no client secret)
   - Authentication flows:
     - ✅ ALLOW_USER_SRP_AUTH
     - ✅ ALLOW_REFRESH_TOKEN_AUTH
     - ✅ ALLOW_CUSTOM_AUTH
4. OAuth 2.0 configuration:
   - Allowed OAuth flows:
     - ✅ Authorization code grant
     - ✅ Implicit grant (for testing only)
   - Allowed OAuth scopes:
     - ✅ openid
     - ✅ email
     - ✅ profile
   - Callback URLs:
     ```
     http://localhost:5173/callback
     https://popmap.co/callback
     ```
   - Sign-out URLs:
     ```
     http://localhost:5173
     https://popmap.co
     ```

### 1.3 Configure Hosted UI Domain

1. Go to "App integration" → "Domain"
2. Choose a domain prefix: `popmap-auth` (or your preferred prefix)
3. Full domain will be: `popmap-auth.auth.us-east-1.amazoncognito.com`
4. Save the domain

### 1.4 Save Important Values

Note these values for later configuration:
- **User Pool ID**: `us-east-1_xxxxxxxxx`
- **App Client ID**: `xxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Region**: `us-east-1`
- **Domain**: `popmap-auth`

---

## Step 2: Social Provider Configuration

### 2.1 Facebook Setup

#### Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Click "My Apps" → "Create App"
3. Choose app type: **Consumer**
4. App display name: `Popmap`
5. App contact email: Your email
6. Click "Create App"

#### Configure Facebook Login
1. In your Facebook App dashboard, click "Add Product"
2. Find "Facebook Login" and click "Set Up"
3. Choose platform: **Web**
4. Enter site URL: `https://popmap.co`
5. Go to "Facebook Login" → "Settings"
6. Configure OAuth redirect URIs:
   ```
   https://popmap-auth.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```
7. Enable "Use Strict Mode for Redirect URIs": **Yes**
8. Save changes

#### Get Facebook App Credentials
1. Go to "Settings" → "Basic"
2. Note your:
   - **App ID**: `xxxxxxxxxxxxxxxxxxxx`
   - **App Secret**: Click "Show" to reveal

#### Add Facebook to Cognito
1. In AWS Cognito User Pool, go to "Sign-in experience" → "Federated identity provider sign-in"
2. Click "Add identity provider"
3. Select "Facebook"
4. Configure:
   - Facebook App ID: `<your-facebook-app-id>`
   - Facebook App secret: `<your-facebook-app-secret>`
   - Authorize scopes: `public_profile,email`
5. Attribute mapping:
   - `email` → `email`
   - `name` → `name`
   - `id` → `username`
6. Click "Add identity provider"

### 2.2 Instagram Setup

**Note:** Instagram Business/Creator accounts authenticate through Facebook Login.

#### Option 1: Use Facebook Login (Recommended)
Instagram users can sign in using their Facebook account that's connected to their Instagram account. No additional setup needed beyond Facebook configuration above.

#### Option 2: Instagram Basic Display API (For Instagram-only auth)
1. In your Facebook App, add "Instagram Basic Display" product
2. Configure settings:
   - Valid OAuth Redirect URIs:
     ```
     https://popmap-auth.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
     ```
3. Get Instagram App ID and Secret
4. Add to Cognito as separate identity provider

**Recommendation:** Start with Facebook Login as it covers both Facebook and Instagram users.

### 2.3 Update App Integration in Cognito

1. Go to "App integration" → "App clients" → Your app client
2. Edit "Hosted UI" settings
3. Under "Identity providers", ensure Facebook is checked
4. Save changes

---

## Step 3: Backend Integration (Django)

### 3.1 Install Dependencies

```bash
cd backend
source venv/bin/activate
pip install pycognito boto3 python-jose[cryptography] requests
pip freeze > requirements.txt
```

### 3.2 Create Authentication App

```bash
python manage.py startapp authentication
```

Add to `INSTALLED_APPS` in `config/settings.py`:
```python
INSTALLED_APPS = [
    # ...
    'apps.authentication',
]
```

### 3.3 Update Settings

Add to `backend/config/settings.py`:

```python
import os

# AWS Cognito Configuration
AWS_COGNITO_USER_POOL_ID = os.getenv('AWS_COGNITO_USER_POOL_ID')
AWS_COGNITO_APP_CLIENT_ID = os.getenv('AWS_COGNITO_APP_CLIENT_ID')
AWS_COGNITO_REGION = os.getenv('AWS_COGNITO_REGION', 'us-east-1')
AWS_COGNITO_DOMAIN = os.getenv('AWS_COGNITO_DOMAIN')

# Update REST_FRAMEWORK settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'apps.authentication.backends.CognitoAuthentication',
        'rest_framework.authentication.SessionAuthentication',  # Keep for admin
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
}
```

### 3.4 Create Authentication Backend

Create `backend/apps/authentication/backends.py`:

```python
from rest_framework import authentication, exceptions
from django.contrib.auth.models import User
import jwt
from jwt import PyJWKClient
from django.conf import settings

class CognitoAuthentication(authentication.BaseAuthentication):
    """
    Authenticate users using AWS Cognito JWT tokens.
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
            raise exceptions.AuthenticationFailed(f'Authentication failed: {str(e)}')

    def verify_token(self, token):
        """Verify JWT token using Cognito's public keys"""
        jwks_url = (
            f'https://cognito-idp.{settings.AWS_COGNITO_REGION}.amazonaws.com/'
            f'{settings.AWS_COGNITO_USER_POOL_ID}/.well-known/jwks.json'
        )

        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=['RS256'],
            audience=settings.AWS_COGNITO_APP_CLIENT_ID,
            options={'verify_exp': True}
        )

        return payload

    def get_or_create_user(self, payload):
        """Get or create Django user from Cognito claims"""
        cognito_sub = payload.get('sub')
        email = payload.get('email', '')
        username = payload.get('cognito:username') or email or cognito_sub

        # Try to find existing user by cognito_sub
        from apps.authentication.models import CognitoUser
        try:
            cognito_user = CognitoUser.objects.select_related('user').get(
                cognito_sub=cognito_sub
            )
            return cognito_user.user
        except CognitoUser.DoesNotExist:
            pass

        # Create new user
        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': payload.get('given_name', ''),
                'last_name': payload.get('family_name', ''),
            }
        )

        # Link to Cognito
        CognitoUser.objects.get_or_create(
            user=user,
            cognito_sub=cognito_sub
        )

        return user
```

### 3.5 Create Models

Create `backend/apps/authentication/models.py`:

```python
from django.db import models
from django.contrib.auth.models import User

class CognitoUser(models.Model):
    """
    Links Django User to AWS Cognito user.
    Stores the Cognito sub (subject) identifier.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='cognito'
    )
    cognito_sub = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        help_text="Cognito user's sub (subject) identifier"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cognito User"
        verbose_name_plural = "Cognito Users"

    def __str__(self):
        return f"{self.user.username} ({self.cognito_sub})"
```

### 3.6 Create Views

Create `backend/apps/authentication/views.py`:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def me(request):
    """
    Get current user information.
    """
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def auth_config(request):
    """
    Return Cognito configuration for frontend.
    """
    return Response({
        'user_pool_id': settings.AWS_COGNITO_USER_POOL_ID,
        'app_client_id': settings.AWS_COGNITO_APP_CLIENT_ID,
        'region': settings.AWS_COGNITO_REGION,
        'domain': settings.AWS_COGNITO_DOMAIN,
    })
```

### 3.7 Create URLs

Create `backend/apps/authentication/urls.py`:

```python
from django.urls import path
from . import views

urlpatterns = [
    path('me/', views.me, name='auth-me'),
    path('config/', views.auth_config, name='auth-config'),
]
```

Add to `backend/config/urls.py`:

```python
urlpatterns = [
    # ... existing patterns
    path('api/auth/', include('apps.authentication.urls')),
]
```

### 3.8 Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

---

## Step 4: Frontend Integration (React)

### 4.1 Install Dependencies

```bash
cd frontend
npm install aws-amplify @aws-amplify/ui-react
```

### 4.2 Create Cognito Configuration

Create `frontend/src/config/cognito.ts`:

```typescript
import { Amplify } from 'aws-amplify';

const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_APP_CLIENT_ID || '',
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN || '',
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [
            import.meta.env.VITE_APP_URL + '/callback',
            'http://localhost:5173/callback',
          ],
          redirectSignOut: [
            import.meta.env.VITE_APP_URL,
            'http://localhost:5173',
          ],
          responseType: 'code',
        }
      }
    }
  }
};

Amplify.configure(cognitoConfig);

export default cognitoConfig;
```

### 4.3 Create Auth Context

Create `frontend/src/contexts/AuthContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  fetchAuthSession,
  signInWithRedirect,
  signOut as amplifySignOut,
  getCurrentUser,
} from 'aws-amplify/auth';

interface User {
  username: string;
  userId: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (provider?: 'Facebook' | 'Google') => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  async function checkAuthStatus() {
    try {
      const currentUser = await getCurrentUser();
      setUser({
        username: currentUser.username,
        userId: currentUser.userId,
      });
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(provider?: 'Facebook' | 'Google') {
    try {
      await signInWithRedirect({
        provider: provider ? { custom: provider } : undefined,
      });
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async function signOut() {
    try {
      await amplifySignOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async function getAccessToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.accessToken?.toString() || null;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated, isLoading, signIn, signOut, getAccessToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

### 4.4 Update API Client

Update `frontend/src/services/api.ts`:

```typescript
import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';
import type { Category, Business, Event, BusinessFormData, EventFormData, ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authentication token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // User is not authenticated, continue without token
      console.debug('No auth token available');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 responses
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - could trigger re-authentication
      console.error('Authentication failed');
    }
    return Promise.reject(error);
  }
);

// ... rest of your existing API functions
```

### 4.5 Create Login Component

Create `frontend/src/components/Login.tsx`:

```typescript
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function Login() {
  const { signIn, isLoading } = useAuth();

  const handleFacebookLogin = async () => {
    try {
      await signIn('Facebook');
    } catch (error) {
      console.error('Facebook login failed:', error);
    }
  };

  const handleEmailLogin = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error('Email login failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to Popmap</CardTitle>
          <CardDescription>
            Connect with your social accounts or use email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleFacebookLogin}
            className="w-full"
            variant="outline"
            size="lg"
          >
            <svg className="mr-2 h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Continue with Facebook
          </Button>
          <Button
            onClick={handleEmailLogin}
            className="w-full"
            size="lg"
          >
            Continue with Email
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.6 Create Auth Callback Component

Create `frontend/src/components/AuthCallback.tsx`:

```typescript
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function AuthCallback() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Redirect to home or intended destination
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin mb-4" />
      <p className="text-muted-foreground">Processing authentication...</p>
    </div>
  );
}
```

### 4.7 Update App.tsx

Update `frontend/src/App.tsx`:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { Login } from './components/Login';
import { AuthCallback } from './components/AuthCallback';
// ... import other components

// Import cognito config to initialize Amplify
import './config/cognito';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/callback" element={<AuthCallback />} />
            {/* ... other routes */}
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### 4.8 Update BusinessProfile to Show Join UI

Update `frontend/src/components/BusinessProfile.tsx`:

Change this line:
```typescript
{false && availableEvents.length > 0 && (
```

To:
```typescript
{isAuthenticated && business.owner === user?.userId && availableEvents.length > 0 && (
```

---

## Step 5: Environment Variables

### 5.1 Backend Environment Variables

Create/update `backend/.env`:

```bash
# AWS Cognito Configuration
AWS_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
AWS_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_COGNITO_REGION=us-east-1
AWS_COGNITO_DOMAIN=popmap-auth

# Existing variables
DATABASE_URL=postgresql://eugenekim@localhost/popmap
DEBUG=True
SECRET_KEY=your-secret-key
```

### 5.2 Frontend Environment Variables

Create/update `frontend/.env`:

```bash
# API Configuration
VITE_API_URL=http://localhost:8000/api

# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_DOMAIN=popmap-auth
VITE_APP_URL=http://localhost:5173
```

### 5.3 Production Environment Variables

For production (`.env.production` or deployment platform):

**Backend:**
```bash
AWS_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
AWS_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_COGNITO_REGION=us-east-1
AWS_COGNITO_DOMAIN=popmap-auth
DATABASE_URL=postgresql://popmap_admin:password@rds-endpoint/popmap
DEBUG=False
ALLOWED_HOSTS=api.popmap.co
```

**Frontend:**
```bash
VITE_API_URL=https://api.popmap.co/api
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_DOMAIN=popmap-auth
VITE_APP_URL=https://popmap.co
```

---

## Step 6: Business Ownership Integration

### 6.1 Update Business Model

The Business model already has an `owner` field. Ensure it's properly configured:

```python
# backend/apps/events/models.py

class Business(models.Model):
    # ... existing fields

    owner = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='businesses'
    )
```

### 6.2 Update Business Creation

When a user creates a business, automatically set them as the owner:

```python
# backend/apps/events/views.py

class BusinessViewSet(viewsets.ModelViewSet):
    def perform_create(self, serializer):
        # Set the current user as the owner
        serializer.save(owner=self.request.user)
```

### 6.3 Add Owner Check to Join/Leave Events

The join/leave endpoints already check ownership:

```python
# Check if the authenticated user owns this business
if business.owner != request.user:
    return Response(
        {'error': 'You do not have permission to manage this business'},
        status=status.HTTP_403_FORBIDDEN
    )
```

---

## Step 7: Testing & Deployment

### 7.1 Local Testing

1. **Start Backend:**
   ```bash
   cd backend
   source venv/bin/activate
   python manage.py runserver
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Authentication Flow:**
   - Navigate to `http://localhost:5173/login`
   - Click "Continue with Facebook"
   - Complete Facebook OAuth flow
   - Should redirect back to `http://localhost:5173/callback`
   - Should then redirect to home page as authenticated user

4. **Test API Authentication:**
   ```bash
   # Get access token from browser dev tools (localStorage or cookies)
   curl -H "Authorization: Bearer <token>" http://localhost:8000/api/auth/me/
   ```

### 7.2 Common Issues & Troubleshooting

**Issue: "redirect_uri_mismatch"**
- Verify callback URLs in Cognito app client match exactly
- Check that Facebook app has correct OAuth redirect URI

**Issue: "Invalid token"**
- Ensure Cognito User Pool ID and region are correct
- Check that App Client ID matches

**Issue: CORS errors**
- Update Django CORS settings to allow frontend origin
- Ensure `CORS_ALLOWED_ORIGINS` includes your frontend URL

**Issue: User not being created in Django**
- Check backend logs for authentication errors
- Verify CognitoAuthentication backend is in AUTHENTICATION_BACKENDS

### 7.3 Production Deployment Checklist

- [ ] Update Cognito callback URLs to production domain
- [ ] Update Facebook app OAuth redirect URI to production
- [ ] Set production environment variables
- [ ] Configure HTTPS/SSL certificates
- [ ] Update CORS settings for production domain
- [ ] Test authentication flow in production
- [ ] Monitor authentication errors in CloudWatch/logs
- [ ] Set up session/token refresh handling
- [ ] Configure user pool MFA (optional but recommended)

---

## Next Steps

1. **Test locally** with Facebook login
2. **Add Google Sign-In** (similar process to Facebook)
3. **Implement password reset** flow
4. **Add user profile** management
5. **Set up MFA** for enhanced security
6. **Monitor usage** in Cognito console

## Useful Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS Amplify Auth Documentation](https://docs.amplify.aws/react/build-a-backend/auth/)
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login/)
- [Django REST Framework Authentication](https://www.django-rest-framework.org/api-guide/authentication/)

---

## Status

- [ ] AWS Cognito User Pool created
- [ ] Facebook app configured
- [ ] Backend authentication implemented
- [ ] Frontend authentication implemented
- [ ] Local testing completed
- [ ] Production deployment completed
