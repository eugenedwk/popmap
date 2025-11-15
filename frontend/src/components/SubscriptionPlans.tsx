import { useQuery, useMutation } from '@tanstack/react-query'
import { billingApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2, Loader2, AlertCircle, Crown } from 'lucide-react'
import { useState } from 'react'

export function SubscriptionPlans() {
  const { isAuthenticated } = useAuth()
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const response = await billingApi.getPlans()
      return response.data
    }
  })

  const { data: currentSubscription } = useQuery({
    queryKey: ['current-subscription'],
    queryFn: async () => {
      const response = await billingApi.getCurrentSubscription()
      return response.data.subscription
    },
    enabled: isAuthenticated
  })

  const checkoutMutation = useMutation({
    mutationFn: async (planId: number) => {
      const response = await billingApi.createCheckoutSession({
        plan_id: planId,
        success_url: `${window.location.origin}/billing/success`,
        cancel_url: `${window.location.origin}/billing/cancel`
      })
      return response.data
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      window.location.href = data.session_url
    },
    onError: (error: any) => {
      console.error('Failed to create checkout session:', error)
    }
  })

  const handleSubscribe = (planId: number, price: string) => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }

    // Don't allow subscribing to free plan or if price is 0
    if (price === '0.00') {
      return
    }

    checkoutMutation.mutate(planId)
  }

  const isCurrentPlan = (planId: number) => {
    return currentSubscription?.plan?.id === planId
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

  if (plansLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the perfect plan for your business. Upgrade or downgrade at any time.
          </p>
        </div>

        {showLoginPrompt && (
          <Alert className="mb-6 max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please sign in to subscribe to a plan.
            </AlertDescription>
          </Alert>
        )}

        {checkoutMutation.isError && (
          <Alert variant="destructive" className="mb-6 max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {checkoutMutation.error instanceof Error
                ? checkoutMutation.error.message
                : 'Failed to create checkout session. Please try again.'}
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
                  isProfessional ? 'border-primary shadow-lg scale-105' : ''
                }`}
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
                    disabled={
                      checkoutMutation.isPending ||
                      isActive ||
                      isFree
                    }
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
      </div>
    </ScrollArea>
  )
}
