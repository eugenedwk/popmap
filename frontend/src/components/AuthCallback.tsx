import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient, setProcessingCallback } from '../services/api';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AuthCallback() {
  const navigate = useNavigate();
  const { isLoading, refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      // Use sessionStorage to prevent duplicate processing across mounts
      // This survives React Strict Mode and component re-renders
      const callbackId = sessionStorage.getItem('authCallbackProcessing');
      const now = Date.now();

      // If a callback was started within the last 30 seconds, skip
      if (callbackId && (now - parseInt(callbackId)) < 30000) {
        return;
      }

      // Mark callback as processing with current timestamp
      sessionStorage.setItem('authCallbackProcessing', now.toString());

      // Prevent auto-signout during callback processing
      setProcessingCallback(true);

      try {
        // Wait for Amplify to process the auth code
        // The Hub listener in Amplify handles the token exchange
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check if we have a valid session before calling backend
        const { fetchAuthSession } = await import('aws-amplify/auth');
        let session = await fetchAuthSession();

        // Retry a few times if token not ready
        let retries = 0;
        while (!session.tokens?.idToken && retries < 3) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          session = await fetchAuthSession();
          retries++;
        }

        if (!session.tokens?.idToken) {
          throw new Error('Failed to get authentication token');
        }

        // Refresh user data from backend - this creates the user if they don't exist
        await refreshUser();

        // Check for pending role from signup flow - get it before any async operations
        const pendingRole = localStorage.getItem('pendingUserRole');

        // Clear the pending role immediately to prevent duplicate processing
        if (pendingRole) {
          localStorage.removeItem('pendingUserRole');
        }

        if (pendingRole && (pendingRole === 'business_owner' || pendingRole === 'attendee')) {
          try {
            // Apply the role to the user's profile
            await apiClient.patch('/auth/profile/', { role: pendingRole });
            // Refresh user data to get updated role
            await refreshUser();
          } catch (err) {
            console.error('Failed to set user role:', err);
          }
        }

        // Navigate based on the role - don't rely on React state which may be stale
        if (pendingRole === 'business_owner') {
          navigate('/onboarding/business', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('Something went wrong during authentication.');
        // Clear the processing flag on error so user can retry
        sessionStorage.removeItem('authCallbackProcessing');
      } finally {
        // Re-enable auto-signout
        setProcessingCallback(false);
      }
    }

    if (!isLoading) {
      handleCallback();
    }
  }, [isLoading, navigate, refreshUser]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Authentication Error</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/login')}
                className="flex-1"
              >
                Back to Login
              </Button>
              <Button
                onClick={() => navigate('/')}
                className="flex-1"
              >
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Completing authentication...</p>
      <p className="text-sm text-muted-foreground mt-2">Please wait</p>
    </div>
  );
}
