import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { businessesApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2 } from 'lucide-react'
import { BusinessSubdomainSettings } from './BusinessSubdomainSettings'

/**
 * Example Business Dashboard component that demonstrates how to integrate
 * the custom subdomain settings.
 *
 * This component shows:
 * - How to fetch business data
 * - How to organize business settings in tabs
 * - How to integrate the BusinessSubdomainSettings component
 *
 * You can customize this component or integrate the subdomain settings
 * into your existing business dashboard/settings page.
 */
export function BusinessDashboard() {
  const { businessId: businessIdParam } = useParams<{ businessId: string }>()
  const businessId = businessIdParam ? parseInt(businessIdParam, 10) : null

  const { data: business, isLoading, error } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      if (!businessId) throw new Error('Business ID is required')
      const response = await businessesApi.getById(businessId)
      return response.data
    },
    enabled: !!businessId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              Failed to load business information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground">Manage your business settings</p>
        </div>

        <div className="space-y-6">
          {/* Custom Subdomain Settings */}
          <BusinessSubdomainSettings business={business} />

          {/* Add other business settings sections here */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Manage your business information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Add your existing business settings form here
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  )
}
