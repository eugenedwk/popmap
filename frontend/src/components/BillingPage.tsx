import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { billingApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Crown,
  ArrowLeft,
  CreditCard,
  Calendar,
  XCircle,
  Sparkles,
  Building2,
} from 'lucide-react'
import { useState } from 'react'

export function BillingPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isAuthenticated, user } = useAuth()
  const [searchParams] = useSearchParams()
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const success = searchParams.get('success')
  const canceled = searchParams.get('canceled')

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await billingApi.getPlans()
      return response.data
    },
  })

  const { data: currentSubscription, isLoading: subscriptionLoading } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: async () => {
      const response = await billingApi.getCurrentSubscription()
      return response.data.subscription
    },
    enabled: isAuthenticated,
  })

  const checkoutMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await billingApi.createCheckoutSession({
        plan_id: planId,
        success_url: `${window.location.origin}/billing?success=true`,
        cancel_url: `${window.location.origin}/billing?canceled=true`,
      })
      return response.data
    },
    onSuccess: (data) => {
      window.location.href = data.session_url
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await billingApi.cancelSubscription(true)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-subscription'] })
      setShowCancelDialog(false)
    },
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleSubscribe = (planId: number, price: string) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/billing' } })
      return
    }
    if (price === '0.00') return
    checkoutMutation.mutate(planId)
  }

  const isCurrentPlan = (planId: number) => {
    return currentSubscription?.plan?.id === planId && currentSubscription?.status === 'active'
  }

  const getPlanBadge = (planType: string) => {
    if (planType === 'professional') {
      return <Badge variant="default" className="ml-2">Popular</Badge>
    }
    if (planType === 'enterprise') {
      return <Crown className="h-4 w-4 ml-2 text-yellow-500" />
    }
    return null
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-600">Active</Badge>
      case 'trialing':
        return <Badge className="bg-blue-600">Trial</Badge>
      case 'past_due':
        return <Badge variant="destructive">Past Due</Badge>
      case 'canceled':
        return <Badge variant="secondary">Canceled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (plansLoading || subscriptionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate('/business')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Businesses
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Billing & Subscription
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage your subscription and billing settings
          </p>
        </div>

        {/* Success/Cancel Alerts */}
        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>Payment Successful!</AlertTitle>
            <AlertDescription>
              Your subscription has been activated. Thank you for upgrading!
            </AlertDescription>
          </Alert>
        )}

        {canceled && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment Canceled</AlertTitle>
            <AlertDescription>
              Your payment was canceled. You can try again whenever you're ready.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Subscription Status */}
        {isAuthenticated && currentSubscription && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    Current Subscription
                  </CardTitle>
                  <CardDescription>
                    Your active subscription plan and billing details
                  </CardDescription>
                </div>
                {getStatusBadge(currentSubscription.status)}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Plan</div>
                  <div className="font-semibold text-lg">
                    {currentSubscription.plan?.name || 'Free'}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1">Price</div>
                  <div className="font-semibold text-lg">
                    ${currentSubscription.plan?.price || '0.00'}/month
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {currentSubscription.cancel_at_period_end ? 'Ends On' : 'Renews On'}
                  </div>
                  <div className="font-semibold text-lg">
                    {formatDate(currentSubscription.current_period_end)}
                  </div>
                </div>
              </div>

              {currentSubscription.cancel_at_period_end && (
                <Alert variant="destructive" className="mt-4">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Subscription Ending</AlertTitle>
                  <AlertDescription>
                    Your subscription will end on {formatDate(currentSubscription.current_period_end)}.
                    You'll still have access to premium features until then.
                  </AlertDescription>
                </Alert>
              )}

              {/* Plan Features */}
              {currentSubscription.plan && (
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Included Features:</h4>
                  <ul className="space-y-2">
                    {currentSubscription.plan.max_events_per_month > 0 && (
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {currentSubscription.plan.max_events_per_month === 999999
                          ? 'Unlimited events'
                          : `${currentSubscription.plan.max_events_per_month} events/month`}
                      </li>
                    )}
                    {currentSubscription.plan.custom_subdomain_enabled && (
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Custom subdomain
                      </li>
                    )}
                    {currentSubscription.plan.featured_listing && (
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Featured listing
                      </li>
                    )}
                    {currentSubscription.plan.analytics_enabled && (
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Analytics dashboard
                      </li>
                    )}
                    {currentSubscription.plan.priority_support && (
                      <li className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Priority support
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </CardContent>
            {currentSubscription.status === 'active' && !currentSubscription.cancel_at_period_end && (
              <CardFooter>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setShowCancelDialog(true)}
                >
                  Cancel Subscription
                </Button>
              </CardFooter>
            )}
          </Card>
        )}

        {/* No Subscription CTA */}
        {isAuthenticated && !currentSubscription && (
          <Card className="mb-8 border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Subscription</h3>
                <p className="text-muted-foreground mb-4">
                  Upgrade to a paid plan to unlock premium features like custom forms, page customization, and more.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Not Logged In CTA */}
        {!isAuthenticated && (
          <Card className="mb-8 border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Sign in to manage your subscription</h3>
                <p className="text-muted-foreground mb-4">
                  Create an account or sign in to subscribe to a plan and unlock premium features.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => navigate('/login')}>
                    Sign In
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/signup')}>
                    Create Account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator className="my-8" />

        {/* Plans Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Available Plans</h2>
          <p className="text-muted-foreground mb-6">
            Choose the plan that works best for your business
          </p>
        </div>

        {checkoutMutation.isError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to create checkout session. Please try again.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans?.map((plan) => {
            const isActive = isCurrentPlan(plan.id)
            const isFree = plan.price === '0.00'
            const isProfessional = plan.plan_type === 'professional'

            return (
              <Card
                key={plan.id}
                className={`flex flex-col ${
                  isProfessional ? 'border-primary shadow-lg ring-2 ring-primary' : ''
                } ${isActive ? 'bg-muted/30' : ''}`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      {plan.name}
                      {getPlanBadge(plan.plan_type)}
                    </CardTitle>
                  </div>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.max_events_per_month > 0 && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">
                          {plan.max_events_per_month === 999999
                            ? 'Unlimited events'
                            : `${plan.max_events_per_month} events/month`}
                        </span>
                      </li>
                    )}
                    {plan.custom_subdomain_enabled && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Custom subdomain</span>
                      </li>
                    )}
                    {plan.featured_listing && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Featured listing</span>
                      </li>
                    )}
                    {plan.analytics_enabled && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Analytics dashboard</span>
                      </li>
                    )}
                    {plan.priority_support && (
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">Priority support</span>
                      </li>
                    )}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleSubscribe(plan.id, plan.price)}
                    disabled={checkoutMutation.isPending || isActive || isFree}
                    variant={isProfessional ? 'default' : 'outline'}
                  >
                    {checkoutMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isActive ? (
                      'Current Plan'
                    ) : isFree ? (
                      'Free Forever'
                    ) : currentSubscription?.status === 'active' ? (
                      'Switch Plan'
                    ) : (
                      'Subscribe'
                    )}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>All plans include basic features and email support.</p>
          <p className="mt-2">
            Need a custom plan?{' '}
            <a href="mailto:support@popmap.co" className="text-primary hover:underline">
              Contact us
            </a>
          </p>
        </div>

        {/* Cancel Subscription Dialog */}
        <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Subscription</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your subscription? You'll still have access to premium features until the end of your current billing period.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                onClick={() => cancelMutation.mutate()}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Canceling...
                  </>
                ) : (
                  'Cancel Subscription'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  )
}
