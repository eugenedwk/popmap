import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { businessesApi } from '../services/api'
import { Loader2 } from 'lucide-react'
import { getSubdomain } from '@/lib/subdomain'

interface SubdomainRedirectProps {
  children: React.ReactNode
}

/**
 * Component that handles subdomain-based routing
 * If on a custom subdomain (e.g., tomo.popmap.co), redirects to the business profile
 */
export function SubdomainRedirect({ children }: SubdomainRedirectProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const subdomain = getSubdomain()

    // No subdomain, render children normally
    if (!subdomain) {
      setIsChecking(false)
      return
    }

    // Already on a business profile page, don't redirect again
    if (location.pathname.startsWith('/p/')) {
      setIsChecking(false)
      return
    }

    // Look up business by subdomain and redirect
    const lookupAndRedirect = async () => {
      try {
        const response = await businessesApi.getBySubdomain(subdomain)
        const business = response.data
        navigate(`/p/${business.id}`, { replace: true })
      } catch (err) {
        console.error('Failed to find business for subdomain:', subdomain, err)
        setError(`No business found for subdomain: ${subdomain}`)
        setIsChecking(false)
      }
    }

    lookupAndRedirect()
  }, [location.pathname, navigate])

  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-md px-4">
          <h1 className="text-2xl font-bold text-destructive mb-2">Business Not Found</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <a
            href="https://popmap.co"
            className="text-primary hover:underline"
          >
            Go to PopMap
          </a>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
