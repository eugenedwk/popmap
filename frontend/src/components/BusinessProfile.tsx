import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { businessesApi, eventsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Globe, Instagram, Mail, Phone, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { formatPhoneNumber } from '@/lib/utils'
import type { Event } from '../types'

function BusinessProfile() {
  const { businessId: businessIdParam } = useParams<{ businessId: string }>()
  const navigate = useNavigate()
  const businessId = businessIdParam ? parseInt(businessIdParam, 10) : null
  const { data: business, isLoading: businessLoading, error: businessError } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      if (!businessId) throw new Error('Business ID is required')
      const response = await businessesApi.getById(businessId)
      return response.data
    },
    enabled: !!businessId,
  })

  const { data: allEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await eventsApi.getAll()
      // Handle paginated responses (Django REST Framework)
      return Array.isArray(response.data) ? response.data : (response.data.results || [])
    },
  })

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  if (businessLoading || eventsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (businessError || !business) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Business Not Found</CardTitle>
            <CardDescription>
              The business you're looking for doesn't exist or has been removed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter events that include this business
  // Check both the businesses array (by ID) and business_names string (fallback)
  const businessEvents = (Array.isArray(allEvents) ? allEvents.filter(event => {
    // First, try to match by business ID in the businesses array
    if (event.businesses && Array.isArray(event.businesses)) {
      return event.businesses.some(b => b.id === business.id)
    }
    // Fallback to name matching if businesses array is not available
    if (event.business_names) {
      // Split by comma and trim to handle comma-separated names
      const names = event.business_names.split(',').map(n => n.trim())
      return names.includes(business.name)
    }
    return false
  }) : []) as Event[]

  const now = new Date()

  // Categorize events: past, present (happening now), and future
  const pastEvents = businessEvents.filter(event => {
    const endDate = new Date(event.end_datetime)
    return endDate < now
  })

  const presentEvents = businessEvents.filter(event => {
    const startDate = new Date(event.start_datetime)
    const endDate = new Date(event.end_datetime)
    return startDate <= now && endDate >= now
  })

  const futureEvents = businessEvents.filter(event => {
    const startDate = new Date(event.start_datetime)
    return startDate > now
  })

  return (
    <div className="h-full bg-background">
      <ScrollArea className="h-full">
        <div className="max-w-5xl mx-auto p-6">
          {/* Back Button */}
          <Button onClick={() => navigate('/')} variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Business Header */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                {business.logo && (
                  <div className="flex-shrink-0">
                    <img
                      src={business.logo}
                      alt={`${business.name} logo`}
                      className="w-32 h-32 md:w-40 md:h-40 object-contain rounded-lg border border-border bg-card p-2"
                      onError={(e) => {
                        // Hide image if it fails to load
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{business.name}</h1>
                    {business.is_verified && (
                      <Badge variant="default" className="mt-1">Verified</Badge>
                    )}
                    {business.available_for_hire && (
                      <Badge variant="default" className="mt-1 bg-green-600 hover:bg-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Available for Hire
                      </Badge>
                    )}
                  </div>

                  {/* Categories */}
                  {business.categories && business.categories.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-4">
                      {business.categories.map((category) => (
                        <Badge key={category.id} variant="secondary">
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Description */}
                  <p className="text-muted-foreground mb-4">{business.description}</p>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {business.contact_email && (
                      <a
                        href={`mailto:${business.contact_email}`}
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                        {business.contact_email}
                      </a>
                    )}
                    {business.contact_phone && (
                      <a
                        href={`tel:${business.contact_phone}`}
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <Phone className="h-4 w-4" />
                        {formatPhoneNumber(business.contact_phone)}
                      </a>
                    )}
                    {business.website && (
                      <a
                        href={business.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <Globe className="h-4 w-4" />
                        Website
                      </a>
                    )}
                    {business.instagram_url && (
                      <a
                        href={business.instagram_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                      >
                        <Instagram className="h-4 w-4" />
                        Instagram
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events Section */}
          <div className="space-y-6">
            {/* Present Events (Happening Now) */}
            {presentEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-bold">Happening Now</h2>
                  <Badge variant="default" className="bg-green-600">{presentEvents.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {presentEvents.map((event) => (
                    <Card key={event.id} className="border-2 border-green-500 hover:shadow-lg transition-shadow">
                      {event.image && (
                        <div className="relative h-48 overflow-hidden rounded-t-lg">
                          <img
                            src={event.image}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                        {event.categories && event.categories.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap pt-2">
                            {event.categories.map((category) => (
                              <Badge key={category} variant="secondary" className="text-xs">
                                {category}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <div>
                              <div>{formatDate(event.start_datetime)}</div>
                              {formatDate(event.start_datetime) !== formatDate(event.end_datetime) && (
                                <div>to {formatDate(event.end_datetime)}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span className="line-clamp-1">
                              {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{event.address}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Future Events */}
            {futureEvents.length > 0 && (
              <>
                {presentEvents.length > 0 && <Separator className="my-8" />}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-2xl font-bold">Upcoming Events</h2>
                    <Badge variant="outline">{futureEvents.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {futureEvents.map((event) => (
                      <Card key={event.id} className="hover:shadow-lg transition-shadow">
                        {event.image && (
                          <div className="relative h-48 overflow-hidden rounded-t-lg">
                            <img
                              src={event.image}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardHeader>
                          <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                          {event.categories && event.categories.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap pt-2">
                              {event.categories.map((category) => (
                                <Badge key={category} variant="secondary" className="text-xs">
                                  {category}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div>
                                <div>{formatDate(event.start_datetime)}</div>
                                {formatDate(event.start_datetime) !== formatDate(event.end_datetime) && (
                                  <div>to {formatDate(event.end_datetime)}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span className="line-clamp-1">
                                {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{event.address}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <>
                {(presentEvents.length > 0 || futureEvents.length > 0) && <Separator className="my-8" />}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h2 className="text-2xl font-bold">Past Events</h2>
                    <Badge variant="outline">{pastEvents.length}</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pastEvents.map((event) => (
                      <Card key={event.id} className="opacity-75 hover:opacity-100 transition-opacity">
                        {event.image && (
                          <div className="relative h-32 overflow-hidden rounded-t-lg">
                            <img
                              src={event.image}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base line-clamp-2">{event.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(event.start_datetime)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* No Events */}
            {businessEvents.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    This business hasn't participated in any events yet.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}

export default BusinessProfile
