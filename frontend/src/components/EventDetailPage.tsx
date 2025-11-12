import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { eventsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin, Loader2, ArrowLeft } from 'lucide-react'

function EventDetailPage() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const eventId = eventIdParam ? parseInt(eventIdParam, 10) : null

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required')
      const response = await eventsApi.getById(eventId)
      return response.data
    },
    enabled: !!eventId,
  })

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Event Not Found</CardTitle>
            <CardDescription>
              The event you're looking for doesn't exist or has been removed.
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

  const handleBusinessClick = (businessId: number) => {
    navigate(`/p/${businessId}`)
  }

  return (
    <div className="h-full bg-background">
      <ScrollArea className="h-full">
        <div className="max-w-6xl mx-auto p-6">
          {/* Back Button */}
          <Button onClick={() => navigate('/')} variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Event Header - Two Column Layout */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
              {/* Left Column - Image */}
              {event.image && (
                <div className="relative w-full h-full min-h-[400px] overflow-hidden rounded-l-lg">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Right Column - Event Details */}
              <div className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-3xl">{event.title}</CardTitle>
                  {event.status && event.status !== 'approved' && (
                    <Badge
                      variant={
                        event.status === 'pending' ? 'secondary' :
                        event.status === 'cancelled' ? 'destructive' :
                        'outline'
                      }
                      className="w-fit"
                    >
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </Badge>
                  )}
                  {event.categories && event.categories.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-2">
                      {event.categories.map((category) => (
                        <Badge key={category} variant="secondary">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-1">
                  {/* Description */}
                  {event.description && (
                    <div className="mb-6">
                      <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                    </div>
                  )}

                  <Separator className="my-4" />

                  {/* Event Details */}
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="font-medium">Date</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.start_datetime)}
                          {formatDate(event.start_datetime) !== formatDate(event.end_datetime) && (
                            <> to {formatDate(event.end_datetime)}</>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="font-medium">Time</p>
                        <p className="text-sm text-muted-foreground">
                          {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="font-medium">Location</p>
                        <p className="text-sm text-muted-foreground">{event.address}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </div>
            </div>

            {/* Participating Businesses - Full Width Below */}
            {event.businesses && event.businesses.length > 0 && (
              <CardContent className="pt-0">
                <Separator className="mb-6" />
                <div>
                  <p className="font-medium mb-4">Participating Businesses</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {event.businesses.map((business) => (
                      <button
                        key={business.id}
                        onClick={() => handleBusinessClick(business.id)}
                        className="flex flex-col items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent hover:border-primary transition-colors"
                      >
                        {business.logo ? (
                          <img
                            src={business.logo}
                            alt={`${business.name} logo`}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                            <span className="text-2xl font-bold text-muted-foreground">
                              {business.name.charAt(0)}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-center line-clamp-2">
                          {business.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </ScrollArea>
    </div>
  )
}

export default EventDetailPage
