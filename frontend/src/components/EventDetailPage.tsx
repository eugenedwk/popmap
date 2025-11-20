import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { eventsApi, formsApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, MapPin, Loader2, ArrowLeft, Heart, CheckCircle2, Users, ExternalLink } from 'lucide-react'
import { ShareButtons } from './ShareButtons'
import { EventMetaTags } from './EventMetaTags'
import { FormRenderer } from './FormRenderer'

function EventDetailPage() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const queryClient = useQueryClient()
  const eventId = eventIdParam ? parseInt(eventIdParam, 10) : null
  const [showLoginPrompt, setShowLoginPrompt] = useState(false)

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required')
      const response = await eventsApi.getById(eventId)
      return response.data
    },
    enabled: !!eventId,
  })

  // Fetch form template if event has one
  const { data: formTemplate } = useQuery({
    queryKey: ['form-template', event?.form_template],
    queryFn: async () => {
      if (!event?.form_template) return null
      const response = await formsApi.getTemplateById(event.form_template)
      return response.data
    },
    enabled: !!event?.form_template
  })

  // RSVP mutation
  const rsvpMutation = useMutation({
    mutationFn: ({ status }: { status: 'interested' | 'going' }) => {
      if (!eventId) throw new Error('Event ID is required')
      return eventsApi.rsvp(eventId, status)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
    },
  })

  // Cancel RSVP mutation
  const cancelRsvpMutation = useMutation({
    mutationFn: () => {
      if (!eventId) throw new Error('Event ID is required')
      return eventsApi.cancelRsvp(eventId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', eventId] })
    },
  })

  const handleRsvp = (status: 'interested' | 'going') => {
    if (!isAuthenticated) {
      setShowLoginPrompt(true)
      return
    }
    rsvpMutation.mutate({ status })
  }

  const handleCancelRsvp = () => {
    if (!isAuthenticated) return
    cancelRsvpMutation.mutate()
  }

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

  // Generate the full URL for sharing
  const eventUrl = `${window.location.origin}/e/${event.id}`

  return (
    <div className="h-full bg-background">
      {/* Meta tags for SEO and social sharing */}
      <EventMetaTags
        title={event.title}
        description={event.description || `Join us for ${event.title}`}
        image={event.image}
        url={eventUrl}
        startDate={event.start_datetime}
        endDate={event.end_datetime}
        address={event.address}
      />

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
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <CardTitle className="text-3xl flex-1">{event.title}</CardTitle>
                    <ShareButtons
                      url={eventUrl}
                      title={event.title}
                      description={event.description}
                    />
                  </div>
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

                  {/* Call to Action Button */}
                  {event.cta_button_text && event.cta_button_url && (
                    <div className="mb-6">
                      <Button
                        asChild
                        size="lg"
                        className="w-full sm:w-auto"
                      >
                        <a
                          href={event.cta_button_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {event.cta_button_text}
                          <ExternalLink className="h-4 w-4 ml-2" />
                        </a>
                      </Button>
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

                  <Separator className="my-6" />

                  {/* RSVP Section */}
                  <div className="space-y-4">
                    {showLoginPrompt && (
                      <Alert>
                        <AlertDescription>
                          Please{' '}
                          <button
                            onClick={() => navigate('/login')}
                            className="underline font-medium hover:text-primary"
                          >
                            sign in
                          </button>{' '}
                          to RSVP to this event.
                        </AlertDescription>
                      </Alert>
                    )}

                    {/* RSVP Section - Hidden until accounts are implemented */}
                    {false && (
                      <div>
                        <p className="font-medium mb-3">Interested in this event?</p>
                        <div className="flex flex-wrap gap-2">
                          {event.user_rsvp_status ? (
                            <>
                              <Button
                                variant={event.user_rsvp_status === 'interested' ? 'default' : 'outline'}
                                onClick={() => event.user_rsvp_status === 'interested' ? handleCancelRsvp() : handleRsvp('interested')}
                                disabled={rsvpMutation.isPending || cancelRsvpMutation.isPending}
                              >
                                <Heart className="h-4 w-4 mr-2" fill={event.user_rsvp_status === 'interested' ? 'currentColor' : 'none'} />
                                {event.user_rsvp_status === 'interested' ? 'Interested' : 'Mark Interested'}
                              </Button>
                              <Button
                                variant={event.user_rsvp_status === 'going' ? 'default' : 'outline'}
                                onClick={() => event.user_rsvp_status === 'going' ? handleCancelRsvp() : handleRsvp('going')}
                                disabled={rsvpMutation.isPending || cancelRsvpMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" fill={event.user_rsvp_status === 'going' ? 'currentColor' : 'none'} />
                                {event.user_rsvp_status === 'going' ? 'Going' : 'Mark Going'}
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => handleRsvp('interested')}
                                disabled={rsvpMutation.isPending}
                              >
                                <Heart className="h-4 w-4 mr-2" />
                                Interested
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleRsvp('going')}
                                disabled={rsvpMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Going
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* RSVP Counts - Hidden until accounts are implemented */}
                    {false && event.rsvp_counts && (event.rsvp_counts.interested > 0 || event.rsvp_counts.going > 0) && (
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {event.rsvp_counts.going > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{event.rsvp_counts.going} going</span>
                          </div>
                        )}
                        {event.rsvp_counts.interested > 0 && (
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            <span>{event.rsvp_counts.interested} interested</span>
                          </div>
                        )}
                      </div>
                    )}
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

          {/* Event Registration Form */}
          {formTemplate && (
            <div className="mt-6">
              <FormRenderer templateId={formTemplate.id} />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default EventDetailPage
