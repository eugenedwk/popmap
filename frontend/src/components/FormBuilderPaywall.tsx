import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Crown, FileText, Zap, Shield, BarChart3 } from 'lucide-react'

interface FormBuilderPaywallProps {
  canUseFormBuilder: boolean
  children: React.ReactNode
}

export function FormBuilderPaywall({ canUseFormBuilder, children }: FormBuilderPaywallProps) {
  const navigate = useNavigate()

  if (canUseFormBuilder) {
    // User has access, render the form builder
    return <>{children}</>
  }

  // Show paywall
  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 rounded-full">
            <Crown className="h-8 w-8 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-2xl">Premium Feature: Form Builder</CardTitle>
            <CardDescription className="text-base">
              Create custom inquiry forms to collect leads and connect with customers
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-amber-200 bg-amber-50">
          <Crown className="h-4 w-4 text-amber-600" />
          <AlertTitle>Upgrade Required</AlertTitle>
          <AlertDescription>
            The Form Builder is a premium feature that requires an active subscription.
            Upgrade today to start collecting leads and growing your business!
          </AlertDescription>
        </Alert>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex gap-3">
            <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Custom Forms</h4>
              <p className="text-sm text-muted-foreground">
                Create unlimited inquiry forms with custom fields tailored to your business needs
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Zap className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Email Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Get instant email alerts when customers submit forms
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">GDPR Compliant</h4>
              <p className="text-sm text-muted-foreground">
                Built-in consent management and data protection features
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <BarChart3 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold mb-1">Submission Analytics</h4>
              <p className="text-sm text-muted-foreground">
                Track form performance and lead generation metrics
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Card */}
        <Card className="border-primary">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>Premium Plan</CardTitle>
              <div className="text-right">
                <p className="text-3xl font-bold">$15</p>
                <p className="text-sm text-muted-foreground">per month</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                <span className="text-sm">Unlimited form templates</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                <span className="text-sm">Custom subdomain for your business</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                <span className="text-sm">Premium page customization</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                <span className="text-sm">Priority support</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                <span className="text-sm">Advanced analytics</span>
              </li>
            </ul>

            <div className="flex gap-3">
              <Button
                size="lg"
                className="flex-1"
                onClick={() => navigate('/billing')}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade Now
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/billing#plans')}
              >
                View All Plans
              </Button>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  )
}