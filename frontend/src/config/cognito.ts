import { Amplify } from 'aws-amplify';

const cognitoConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_APP_CLIENT_ID || '',
      loginWith: {
        oauth: {
          domain: `${import.meta.env.VITE_COGNITO_DOMAIN || ''}.auth.${import.meta.env.VITE_COGNITO_REGION || 'us-east-1'}.amazoncognito.com`,
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [
            `${import.meta.env.VITE_APP_URL || 'http://localhost:5173'}/callback`,
          ],
          redirectSignOut: [
            import.meta.env.VITE_APP_URL || 'http://localhost:5173',
          ],
          responseType: 'code',
        },
      },
    },
  },
};

// Initialize Amplify
Amplify.configure(cognitoConfig);

export default cognitoConfig;
