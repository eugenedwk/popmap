import { useQuery } from '@tanstack/react-query'
import { businessesApi, eventsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Globe, Instagram, Mail, Phone, Loader2, ArrowLeft } from 'lucide-react'
import PropTypes from 'prop-types'

function BusinessProfile({ businessId, onBack }) {
  const { data: business, isLoading: businessLoading, error: businessError } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      const response = await businessesApi.getById(businessId)
      return response.data
    },
    enabled: !!businessId,
  })

  const { data: allEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await eventsApi.getAll()
      return response.data
    },
  })

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const formatTime = (dateString) => {
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
            <Button onClick={onBack} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Filter events that include this business
  const businessEvents = allEvents?.filter(event =>
    event.business_names?.includes(business.name)
  ) || []

  const upcomingEvents = businessEvents.filter(event =>
    new Date(event.end_datetime) >= new Date()
  )

  const pastEvents = businessEvents.filter(event =>
    new Date(event.end_datetime) < new Date()
  )

  return (
    <div className="h-full bg-background">
      <ScrollArea className="h-full">
        <div className="max-w-5xl mx-auto p-6">
          {/* Back Button */}
          <Button onClick={onBack} variant="ghost" className="mb-4">
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
                      className="w-32 h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{business.name}</h1>

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
                        {business.contact_phone}
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
            {/* Upcoming Events */}
            {upcomingEvents.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-2xl font-bold">Upcoming Events</h2>
                  <Badge variant="outline">{upcomingEvents.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {upcomingEvents.map((event) => (
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
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <>
                {upcomingEvents.length > 0 && <Separator className="my-8" />}
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

BusinessProfile.propTypes = {
  businessId: PropTypes.number.isRequired,
  onBack: PropTypes.func.isRequired,
}

export default BusinessProfile
