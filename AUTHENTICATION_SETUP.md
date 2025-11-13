# PopMap Authentication Setup Guide

This guide walks through setting up AWS Cognito authentication with user roles (Business Owners & Attendees).

## Phase 2 Progress

### ✅ Completed
- Django authentication app created with user roles
- Backend models, views, serializers configured
- Settings updated with Cognito configuration
- URL routing configured
- Required dependencies added to requirements.txt

### 🔄 In Progress
- AWS Cognito User Pool setup
- Frontend authentication implementation

### ⏳ Pending
- Backend dependencies installation and migrations
- Social provider configuration (Facebook, Google)
- User permissions on existing models
- RSVP system
- Event reminder system

---

## Quick Start

### 1. Set Up AWS Cognito (Run Once)

```bash
cd backend
source venv/bin/activate
python scripts/setup_cognito.py
```

This script will:
- Create a Cognito User Pool named `popmap-users`
- Create an app client for the web application
- Set up a hosted UI domain
- Print environment variables to add to `.env` files
- Provide instructions for adding Facebook and Google providers

### 2. Configure Social Providers

#### Google OAuth Setup
1. Go to https://console.cloud.google.com/
2. Create/select a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URI:
   ```
   https://popmap-auth.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```
6. Get Client ID and Client Secret
7. Add to Cognito:
   ```bash
   aws cognito-idp create-identity-provider \
     --user-pool-id <YOUR_USER_POOL_ID> \
     --provider-name Google \
     --provider-type Google \
     --provider-details client_id=YOUR_GOOGLE_CLIENT_ID,client_secret=YOUR_GOOGLE_CLIENT_SECRET,authorize_scopes='email profile openid' \
     --attribute-mapping email=email,name=name,given_name=given_name,family_name=family_name
   ```

#### Facebook OAuth Setup
1. Go to https://developers.facebook.com/
2. Create a new app (Consumer type)
3. Add "Facebook Login" product
4. Add OAuth redirect URI:
   ```
   https://popmap-auth.auth.us-east-1.amazoncognito.com/oauth2/idpresponse
   ```
5. Get App ID and App Secret from Settings > Basic
6. Add to Cognito:
   ```bash
   aws cognito-idp create-identity-provider \
     --user-pool-id <YOUR_USER_POOL_ID> \
     --provider-name Facebook \
     --provider-type Facebook \
     --provider-details client_id=YOUR_FACEBOOK_APP_ID,client_secret=YOUR_FACEBOOK_APP_SECRET,authorize_scopes='public_profile,email' \
     --attribute-mapping email=email,name=name,username=id
   ```

### 3. Install Backend Dependencies

```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

New dependencies added:
- `PyJWT==2.10.1` - JWT token verification
- `cryptography==44.0.0` - Cryptographic operations for JWT

### 4. Run Database Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

This creates the `UserProfile` table with:
- `cognito_sub` - Links to Cognito user
- `role` - User role (business_owner or attendee)
- `identity_provider` - OAuth provider used
- `email_notifications_enabled` - Notification preferences
- `event_reminder_enabled` - Reminder preferences

### 5. Update Environment Variables

**Backend `.env`:**
```bash
# Add these from the setup script output
AWS_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
AWS_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
AWS_COGNITO_REGION=us-east-1
AWS_COGNITO_DOMAIN=popmap-auth
```

**Frontend `.env`:**
```bash
# Add these from the setup script output
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_APP_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_REGION=us-east-1
VITE_COGNITO_DOMAIN=popmap-auth
VITE_APP_URL=http://localhost:5173
```

### 6. Install Frontend Dependencies

```bash
cd frontend
npm install aws-amplify @aws-amplify/ui-react
```

---

## Architecture

### User Roles

**Business Owner:**
- Can create and manage businesses
- Can create events
- Can join businesses to events
- Full access to business management features

**Attendee:**
- Can view events and businesses
- Can RSVP to events (coming in Phase 2)
- Simplified signup process
- No business management access

### Authentication Flow

1. **Social Login (Facebook/Google):**
   - User clicks social login button
   - Redirected to Cognito Hosted UI
   - Authenticates with social provider
   - Redirected back to app with auth code
   - Frontend exchanges code for tokens
   - Backend verifies JWT token
   - User profile created/updated with role

2. **Email/Password Login:**
   - User enters email/password in custom UI
   - Frontend calls Cognito API directly
   - Receives JWT tokens
   - Backend verifies tokens
   - User profile created/updated

### API Endpoints

**Public:**
- `GET /api/auth/config/` - Get Cognito configuration

**Authenticated:**
- `GET /api/auth/me/` - Get current user info
- `PATCH /api/auth/profile/` - Update user profile
- `GET /api/auth/status/` - Check auth status

### Database Schema

```
UserProfile:
  - id (PK)
  - user_id (FK to Django User)
  - cognito_sub (unique, indexed)
  - role (business_owner | attendee)
  - identity_provider (Cognito, Facebook, Google)
  - is_profile_complete (boolean)
  - email_notifications_enabled (boolean)
  - event_reminder_enabled (boolean)
  - created_at (timestamp)
  - updated_at (timestamp)
```

---

## Testing

### Test Backend Authentication

```bash
# Start Django server
cd backend
source venv/bin/activate
python manage.py runserver

# Test public endpoint
curl http://localhost:8000/api/auth/config/

# Test with auth token (get from frontend after login)
curl -H "Authorization: Bearer <token>" http://localhost:8000/api/auth/me/
```

### Test Frontend

```bash
cd frontend
npm run dev
# Navigate to http://localhost:5173/login
```

---

## Next Steps

1. ✅ Run Cognito setup script
2. ✅ Configure social providers
3. ⏳ Install dependencies and run migrations
4. ⏳ Implement frontend authentication
5. ⏳ Test authentication flow
6. ⏳ Add user role-based permissions
7. ⏳ Implement RSVP system
8. ⏳ Build email reminder system

---

## Troubleshooting

**"No module named 'jwt'"**
- Run: `pip install PyJWT cryptography`

**"Invalid token"**
- Check that environment variables match between frontend/backend
- Verify Cognito User Pool ID and App Client ID

**CORS errors**
- Ensure frontend URL is in `CORS_ALLOWED_ORIGINS`
- Check callback URLs in Cognito app client

**User not created in Django**
- Check backend logs for authentication errors
- Verify CognitoAuthentication is in settings

---

## Resources

- [AWS Cognito Documentation](https://docs.aws.amazon.com/cognito/)
- [AWS Amplify Auth](https://docs.amplify.aws/react/build-a-backend/auth/)
- [Original Integration Guide](./AWS_COGNITO_INTEGRATION.md)
