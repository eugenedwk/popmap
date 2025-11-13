import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function AuthCallback() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, refreshUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleCallback() {
      try {
        // Wait a bit for Amplify to process the auth code
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Refresh user data from backend
        await refreshUser();

        // Check if authenticated
        if (isAuthenticated) {
          // Redirect to home
          navigate('/', { replace: true });
        } else {
          setError('Authentication failed. Please try again.');
        }
      } catch (err) {
        console.error('Callback error:', err);
        setError('Something went wrong during authentication.');
      }
    }

    if (!isLoading) {
      handleCallback();
    }
  }, [isAuthenticated, isLoading, navigate, refreshUser]);

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
