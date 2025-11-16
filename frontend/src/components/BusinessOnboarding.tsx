import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { businessesApi } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import type { BusinessFormData } from '../types';

export function BusinessOnboarding() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [formData, setFormData] = useState<Partial<BusinessFormData>>({
    name: '',
    description: '',
    contact_email: user?.email || '',
    contact_phone: '',
    website: '',
    instagram_url: '',
    tiktok_url: '',
    available_for_hire: true,
    category_ids: [],
  });

  const [error, setError] = useState('');
  const [step, setStep] = useState<'info' | 'success'>('info');

  const createBusinessMutation = useMutation({
    mutationFn: (data: BusinessFormData) => businessesApi.create(data),
    onSuccess: async () => {
      await refreshUser();
      setStep('success');
    },
    onError: (err: any) => {
      console.error('Business creation error:', err);
      setError(err.response?.data?.message || 'Failed to create business profile. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.contact_email) {
      setError('Business name and contact email are required');
      return;
    }

    createBusinessMutation.mutate(formData as BusinessFormData);
  };

  const handleInputChange = (field: keyof BusinessFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSkip = () => {
    navigate('/');
  };

  // Success Step
  if (step === 'success') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Business Profile Created!</CardTitle>
            <CardDescription>
              Your business profile has been submitted for review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Our team will review your business profile within 1-2 business days.
                You'll receive an email once it's approved.
              </AlertDescription>
            </Alert>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>What's next?</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>We'll verify your business information</li>
                <li>Once approved, your profile will be visible on PopMap</li>
                <li>You'll be able to create and manage popup events</li>
                <li>Start promoting your business to local audiences</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => navigate('/')}
            >
              Explore PopMap
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Business Info Step
  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Create Your Business Profile</CardTitle>
              <CardDescription>
                Tell us about your business to start hosting popup events
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Basic Information</h3>

              <div className="space-y-2">
                <Label htmlFor="name">Business Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Your Business Name"
                  required
                  disabled={createBusinessMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Tell us about your business..."
                  rows={4}
                  required
                  disabled={createBusinessMutation.isPending}
                />
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Contact Information</h3>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Email *</Label>
                <Input
                  id="contact_email"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleInputChange('contact_email', e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={createBusinessMutation.isPending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Phone Number (optional)</Label>
                <Input
                  id="contact_phone"
                  type="tel"
                  value={formData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  disabled={createBusinessMutation.isPending}
                />
              </div>
            </div>

            {/* Online Presence */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Online Presence (optional)</h3>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                  disabled={createBusinessMutation.isPending}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="instagram_url">Instagram</Label>
                  <Input
                    id="instagram_url"
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => handleInputChange('instagram_url', e.target.value)}
                    placeholder="https://instagram.com/yourbusiness"
                    disabled={createBusinessMutation.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tiktok_url">TikTok</Label>
                  <Input
                    id="tiktok_url"
                    type="url"
                    value={formData.tiktok_url}
                    onChange={(e) => handleInputChange('tiktok_url', e.target.value)}
                    placeholder="https://tiktok.com/@yourbusiness"
                    disabled={createBusinessMutation.isPending}
                  />
                </div>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Your business profile will be reviewed by our team before going live.
                This helps us maintain quality and authenticity on PopMap.
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleSkip}
              disabled={createBusinessMutation.isPending}
            >
              Skip for now
            </Button>
            <Button
              type="submit"
              disabled={createBusinessMutation.isPending}
            >
              {createBusinessMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Business Profile'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
