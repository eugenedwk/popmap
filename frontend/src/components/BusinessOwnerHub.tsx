import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { businessesApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Building2, Plus, Settings } from 'lucide-react'

/**
 * Business Owner Hub - Landing page for business owners
 * Shows all businesses owned by the user and allows them to manage each one
 */
export function BusinessOwnerHub() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: myBusinesses, isLoading } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: async () => {
      const response = await businessesApi.getMyBusinesses()
      return response.data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="h-8 w-8" />
          My Businesses
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your businesses and create popup events
        </p>
      </div>

      {!myBusinesses || myBusinesses.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No businesses yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first business to start hosting popup events
              </p>
              <Button onClick={() => navigate('/submit-business')}>
                <Plus className="h-4 w-4 mr-2" />
                Register Your Business
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {myBusinesses.map((business) => (
              <Card key={business.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{business.name}</CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {business.description || 'No description'}
                      </CardDescription>
                    </div>
                    {business.logo && (
                      <img
                        src={business.logo}
                        alt={business.name}
                        className="h-12 w-12 rounded object-cover flex-shrink-0"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Status Badge */}
                    <div className="flex items-center gap-2">
                      {business.is_verified ? (
                        <Badge variant="default" className="bg-green-600">
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          Pending Verification
                        </Badge>
                      )}
                    </div>

                    {/* Categories */}
                    {business.categories && business.categories.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {business.categories.slice(0, 3).map((category) => (
                          <Badge key={category.id} variant="outline" className="text-xs">
                            {category.name}
                          </Badge>
                        ))}
                        {business.categories.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{business.categories.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/business/${business.id}/dashboard`)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/p/${business.id}`)}
                      >
                        View Page
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add New Business Card */}
          <Card className="mt-6 border-dashed">
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Plus className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h3 className="font-semibold mb-2">Add Another Business</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Register another business to manage multiple locations or brands
                </p>
                <Button variant="outline" onClick={() => navigate('/submit-business')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Register New Business
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
