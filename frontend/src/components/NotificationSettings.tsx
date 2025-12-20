import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationsApi } from '../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Bell, Mail, Loader2, CheckCircle } from 'lucide-react';
import type { NotificationPreferences } from '../types';

export function NotificationSettings() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isAuthenticated) {
      loadPreferences();
    }
  }, [isAuthenticated, authLoading, navigate]);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await notificationsApi.getPreferences();
      setPreferences(response.data);
    } catch (err) {
      console.error('Failed to load notification preferences:', err);
      setError('Failed to load notification preferences. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!preferences) return;

    // Optimistically update UI
    setPreferences(prev => prev ? { ...prev, [key]: value } : null);
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await notificationsApi.updatePreferences({ [key]: value });
      setPreferences(response.data);
      setSuccessMessage('Preferences saved!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update preferences:', err);
      // Revert on error
      setPreferences(prev => prev ? { ...prev, [key]: !value } : null);
      setError('Failed to save preferences. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Manage how and when you receive email notifications
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                {successMessage}
              </div>
            )}

            {preferences && (
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <Label htmlFor="email_notifications" className="text-base font-medium">
                        Email Notifications
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Receive email notifications from PopMap
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="email_notifications"
                    checked={preferences.email_notifications_enabled}
                    onCheckedChange={(checked) => handleToggle('email_notifications_enabled', checked)}
                    disabled={isSaving}
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-gray-500 mt-0.5" />
                    <div>
                      <Label htmlFor="event_reminders" className="text-base font-medium">
                        Event Reminders
                      </Label>
                      <p className="text-sm text-gray-500 mt-1">
                        Get reminded 24 hours before events you're going to
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="event_reminders"
                    checked={preferences.event_reminder_enabled}
                    onCheckedChange={(checked) => handleToggle('event_reminder_enabled', checked)}
                    disabled={isSaving || !preferences.email_notifications_enabled}
                  />
                </div>

                {!preferences.email_notifications_enabled && (
                  <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    Event reminders require email notifications to be enabled.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default NotificationSettings;
