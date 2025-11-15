import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { businessesApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Info, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Business } from '../types'

interface BusinessSubdomainSettingsProps {
  business: Business
}

export function BusinessSubdomainSettings({ business }: BusinessSubdomainSettingsProps) {
  const [subdomain, setSubdomain] = useState(business.custom_subdomain || '')
  const [error, setError] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const updateMutation = useMutation({
    mutationFn: (data: { custom_subdomain: string }) =>
      businessesApi.update(business.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business', business.id] })
      setError(null)
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.custom_subdomain?.[0] ||
                          err.response?.data?.detail ||
                          'Failed to save subdomain'
      setError(errorMessage)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate subdomain format
    const subdomainPattern = /^[a-z0-9-]+$/
    if (subdomain && !subdomainPattern.test(subdomain)) {
      setError('Subdomain can only contain lowercase letters, numbers, and hyphens')
      return
    }

    updateMutation.mutate({ custom_subdomain: subdomain })
  }

  const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Auto-convert to lowercase and remove invalid characters
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setSubdomain(value)
    setError(null)
  }

  // If user cannot use custom subdomains, show upgrade message
  if (!business.can_use_custom_subdomain) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Custom Subdomain</CardTitle>
          <CardDescription>
            Get a custom subdomain for your business
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Upgrade to unlock custom subdomains</AlertTitle>
            <AlertDescription>
              Custom subdomains are available with Professional and Enterprise plans.
              Upgrade your subscription to get your own branded URL like{' '}
              <span className="font-mono font-semibold">yourbusiness.popmap.co</span>
            </AlertDescription>
          </Alert>
          <Button className="mt-4" variant="default">
            View Pricing Plans
          </Button>
        </CardContent>
      </Card>
    )
  }

  // If user has custom subdomain feature enabled
  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Subdomain</CardTitle>
        <CardDescription>
          Set up a custom subdomain for your business page
        </CardDescription>
      </CardHeader>
      <CardContent>
        {business.subdomain_url && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Your business is live!</AlertTitle>
            <AlertDescription className="text-green-700">
              <a
                href={business.subdomain_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-mono font-semibold hover:underline"
              >
                {business.subdomain_url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subdomain">Custom Subdomain</Label>
            <div className="flex items-center gap-2">
              <Input
                id="subdomain"
                value={subdomain}
                onChange={handleSubdomainChange}
                placeholder="mybusiness"
                pattern="[a-z0-9-]+"
                maxLength={50}
                className="flex-1"
              />
              <span className="text-muted-foreground whitespace-nowrap">.popmap.co</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Only lowercase letters, numbers, and hyphens allowed
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {updateMutation.isSuccess && !error && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700">
                Subdomain saved successfully!
              </AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={updateMutation.isPending || !subdomain}
            className="w-full sm:w-auto"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Subdomain'}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-semibold mb-2">How it works</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Choose a unique subdomain for your business</li>
            <li>Your business page will be available at yoursubdomain.popmap.co</li>
            <li>Share this custom URL with your customers</li>
            <li>You can change your subdomain at any time</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
