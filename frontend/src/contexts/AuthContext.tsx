import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  fetchAuthSession,
  signInWithRedirect,
  signOut as amplifySignOut,
  getCurrentUser,
  signIn as amplifySignIn,
  signUp as amplifySignUp,
  confirmSignUp as amplifyConfirmSignUp,
} from 'aws-amplify/auth';
import { apiClient } from '../services/api';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'business_owner' | 'attendee';
  is_business_owner: boolean;
  is_attendee: boolean;
  profile: {
    role: string;
    identity_provider: string;
    is_profile_complete: boolean;
    email_notifications_enabled: boolean;
    event_reminder_enabled: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, role: 'business_owner' | 'attendee') => Promise<void>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signInWithSocial: (provider: 'Facebook' | 'Google', role?: 'business_owner' | 'attendee') => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  refreshUser: () => Promise<void>;
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
      // Check if user is authenticated in Cognito
      await getCurrentUser();

      // Fetch user profile from backend
      await refreshUser();
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }

  async function refreshUser() {
    try {
      const response = await apiClient.get('/auth/me/');
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      setUser(null);
      setIsAuthenticated(false);
    }
  }

  async function signInWithEmail(email: string, password: string) {
    try {
      await amplifySignIn({ username: email, password });
      await checkAuthStatus();
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  async function signUpWithEmail(
    email: string,
    password: string,
    name: string,
    role: 'business_owner' | 'attendee'
  ) {
    try {
      await amplifySignUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            name,
            'custom:user_role': role,
          },
        },
      });
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  }

  async function confirmSignUp(email: string, code: string) {
    try {
      await amplifyConfirmSignUp({
        username: email,
        confirmationCode: code,
      });
    } catch (error) {
      console.error('Confirmation error:', error);
      throw error;
    }
  }

  async function signInWithSocial(provider: 'Facebook' | 'Google', role?: 'business_owner' | 'attendee') {
    try {
      // Store role in localStorage if provided (for signup flow)
      if (role) {
        localStorage.setItem('pendingUserRole', role);
      }
      await signInWithRedirect({
        provider: { custom: provider },
      });
    } catch (error) {
      console.error('Social sign in error:', error);
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
      // Use ID token to include custom attributes like user_role
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      console.error('Failed to get access token:', error);
      return null;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        signInWithEmail,
        signUpWithEmail,
        confirmSignUp,
        signInWithSocial,
        signOut,
        getAccessToken,
        refreshUser,
      }}
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
