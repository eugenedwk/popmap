import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { businessesApi, eventsApi } from '../services/api';
import { useState, useEffect, useMemo } from 'react';
import { FormRenderer } from './FormRenderer';
import { trackPageView, trackExternalLinkClick, trackFormOpen } from '../services/analytics';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Calendar,
  Clock,
  MapPin,
  Globe,
  Instagram,
  Mail,
  Phone,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Video,
  FileText,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatPhoneNumber, generatePrimaryColorVars } from '@/lib/utils';
import type { Event, Business } from '../types';
import { BusinessEventsMap } from './BusinessEventsMap';

/**
 * Generate CSS custom properties for business customization
 */
function generateCustomStyles(business: Business): React.CSSProperties | undefined {
  if (!business.can_use_premium_customization) return undefined;

  const styles: React.CSSProperties & { [key: string]: string } = {};

  // Primary color
  if (business.custom_primary_color) {
    const primaryVars = generatePrimaryColorVars(business.custom_primary_color);
    Object.assign(styles, primaryVars);
  }

  // Secondary color for buttons/accents
  if (business.secondary_color) {
    styles['--business-secondary'] = business.secondary_color;
  }

  return Object.keys(styles).length > 0 ? styles : undefined;
}

/**
 * Get background styles for the page
 */
function getBackgroundStyles(business: Business): {
  backgroundStyle: React.CSSProperties;
  overlayStyle: React.CSSProperties;
  hasBackground: boolean;
} {
  if (!business.can_use_premium_customization) {
    return { backgroundStyle: {}, overlayStyle: {}, hasBackground: false };
  }

  const backgroundImage = business.background_image || business.background_image_url;
  const backgroundColor = business.background_color;
  const overlayOpacity = business.background_overlay_opacity ?? 0;

  let backgroundStyle: React.CSSProperties = {};
  let hasBackground = false;

  if (backgroundImage) {
    backgroundStyle = {
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      backgroundAttachment: 'fixed',
    };
    hasBackground = true;
  } else if (backgroundColor) {
    backgroundStyle = {
      backgroundColor: backgroundColor,
    };
    hasBackground = true;
  }

  const overlayStyle: React.CSSProperties = hasBackground && overlayOpacity > 0
    ? {
        backgroundColor: `rgba(0, 0, 0, ${overlayOpacity / 100})`,
      }
    : {};

  return { backgroundStyle, overlayStyle, hasBackground };
}

function BusinessProfile() {
  const { businessId: businessIdParam } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const businessId = businessIdParam ? parseInt(businessIdParam, 10) : null;
  const [joiningEventId, setJoiningEventId] = useState<number | null>(null);
  const [isContactFormOpen, setIsContactFormOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const {
    data: business,
    isLoading: businessLoading,
    error: businessError,
  } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      if (!businessId) throw new Error('Business ID is required');
      const response = await businessesApi.getById(businessId);
      return response.data;
    },
    enabled: !!businessId,
  });

  const { data: allEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await eventsApi.getAll();
      // Handle paginated responses (Django REST Framework)
      return Array.isArray(response.data)
        ? response.data
        : response.data.results || [];
    },
  });

  // Track page view when business loads
  useEffect(() => {
    if (business?.id) {
      trackPageView('business', business.id);
    }
  }, [business?.id]);

  // Mutation for joining events
  const joinEventMutation = useMutation({
    mutationFn: ({
      eventId,
      businessId,
    }: {
      eventId: number;
      businessId: number;
    }) => eventsApi.joinEvent(eventId, businessId),
    onMutate: ({ eventId }) => {
      setJoiningEventId(eventId);
    },
    onSuccess: () => {
      // Refetch events to update the UI
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setJoiningEventId(null);
    },
    onError: (error) => {
      console.error('Failed to join event:', error);
      setJoiningEventId(null);
    },
  });

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (businessLoading || eventsLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (businessError || !business) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">
              Business Not Found
            </CardTitle>
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
    );
  }

  // Filter events that include this business
  // Check both the businesses array (by ID) and business_names string (fallback)
  const businessEvents = (
    Array.isArray(allEvents)
      ? allEvents.filter((event) => {
          // First, try to match by business ID in the businesses array
          if (event.businesses && Array.isArray(event.businesses)) {
            return event.businesses.some((b) => b.id === business.id);
          }
          // Fallback to name matching if businesses array is not available
          if (event.business_names) {
            // Split by comma and trim to handle comma-separated names
            const names = event.business_names.split(',').map((n) => n.trim());
            return names.includes(business.name);
          }
          return false;
        })
      : []
  ) as Event[];

  const now = new Date();

  // Categorize events: past, present (happening now), and future
  const pastEvents = businessEvents.filter((event) => {
    const endDate = new Date(event.end_datetime);
    return endDate < now;
  });

  const presentEvents = businessEvents.filter((event) => {
    const startDate = new Date(event.start_datetime);
    const endDate = new Date(event.end_datetime);
    return startDate <= now && endDate >= now;
  });

  const futureEvents = businessEvents.filter((event) => {
    const startDate = new Date(event.start_datetime);
    return startDate > now;
  });

  // Determine event display settings based on customization
  const showUpcomingFirst = business.show_upcoming_events_first ?? true;
  const hidePastEvents = business.hide_past_events ?? false;
  const eventsPerPage = business.events_per_page ?? 12;
  const hideContactInfo = business.hide_contact_info ?? false;
  const hideSocialLinks = business.hide_social_links ?? false;

  // Get customization styles
  const customStyle = generateCustomStyles(business);
  const { backgroundStyle, overlayStyle, hasBackground } = getBackgroundStyles(business);

  // Get secondary color for buttons
  const secondaryButtonStyle = business.can_use_premium_customization && business.secondary_color
    ? { backgroundColor: business.secondary_color, borderColor: business.secondary_color }
    : undefined;

  // Combine all displayable events for pagination
  const displayableEvents = useMemo(() => {
    const events: Event[] = [];
    if (showUpcomingFirst) {
      events.push(...presentEvents, ...futureEvents);
      if (!hidePastEvents) {
        events.push(...pastEvents);
      }
    } else {
      if (!hidePastEvents) {
        events.push(...pastEvents);
      }
      events.push(...presentEvents, ...futureEvents);
    }
    return events;
  }, [presentEvents, futureEvents, pastEvents, showUpcomingFirst, hidePastEvents]);

  // Pagination calculations
  const totalPages = Math.ceil(displayableEvents.length / eventsPerPage);
  const paginatedEvents = displayableEvents.slice(
    (currentPage - 1) * eventsPerPage,
    currentPage * eventsPerPage
  );

  // Reset to page 1 if events change
  useEffect(() => {
    setCurrentPage(1);
  }, [businessId]);

  // Filter available events (future events that the business is NOT part of)
  const availableEvents = (
    Array.isArray(allEvents)
      ? allEvents.filter((event) => {
          const startDate = new Date(event.start_datetime);
          const endDate = new Date(event.end_datetime);

          // Only show future/ongoing events
          if (endDate < now) return false;

          // Check if business is not already part of this event
          if (event.businesses && Array.isArray(event.businesses)) {
            return !event.businesses.some((b) => b.id === business.id);
          }
          return true;
        })
      : []
  ) as Event[];

  const handleJoinEvent = (eventId: number) => {
    if (businessId) {
      joinEventMutation.mutate({ eventId, businessId });
    }
  };

  return (
    <div
      className="h-full relative"
      style={{ ...customStyle, ...backgroundStyle }}
    >
      {/* Background Overlay for readability */}
      {hasBackground && (
        <div
          className="absolute inset-0 z-0"
          style={overlayStyle}
        />
      )}

      {/* Fallback background color when no custom background */}
      {!hasBackground && (
        <div className="absolute inset-0 z-0 bg-background" />
      )}

      <ScrollArea className="h-full relative z-10">
        <div className="max-w-5xl mx-auto p-6">
          {/* Back Button */}
          <Button
            onClick={() => navigate('/')}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Header Banner */}
          {business.header_banner && business.can_use_premium_customization && (
            <div className="mb-6 rounded-lg overflow-hidden shadow-lg">
              <img
                src={business.header_banner}
                alt={`${business.name} banner`}
                className="w-full h-32 md:h-48 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

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
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-2">
                    <h1 className={`text-3xl font-bold ${customStyle ? 'text-primary' : ''}`}>{business.name}</h1>
                    {business.available_for_hire && (
                      <Badge
                        variant="default"
                        className="mt-1 bg-green-600 hover:bg-green-700"
                      >
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
                  <p className="text-muted-foreground mb-4">
                    {business.description}
                  </p>

                  {/* Contact Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Email & Phone - hidden if hideContactInfo is true */}
                    {!hideContactInfo && (
                      <>
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
                      </>
                    )}
                    {/* Website - always shown */}
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
                    {/* Social Links - hidden if hideSocialLinks is true */}
                    {!hideSocialLinks && (
                      <>
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
                        {business.tiktok_url && (
                          <a
                            href={business.tiktok_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm hover:text-primary transition-colors"
                          >
                            <Video className="h-4 w-4" />
                            TikTok
                          </a>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Form Button */}
          {business.active_form_template && (
            <div className="mb-6">
              <Dialog open={isContactFormOpen} onOpenChange={setIsContactFormOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2" style={secondaryButtonStyle}>
                    <MessageSquare className="h-5 w-5" />
                    Contact {business.name}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Contact {business.name}
                    </DialogTitle>
                    <DialogDescription>
                      Fill out the form below and we'll get back to you as soon as possible.
                    </DialogDescription>
                  </DialogHeader>
                  <FormRenderer
                    template={business.active_form_template}
                    onSubmitSuccess={() => setIsContactFormOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Map of Upcoming Events */}
          {(presentEvents.length > 0 || futureEvents.length > 0) && (
            <div className="mb-6">
              <BusinessEventsMap
                events={[...presentEvents, ...futureEvents]}
                businessName={business.name}
              />
            </div>
          )}

          {/* Available Events to Join - Hidden until authentication is implemented */}
          {false && availableEvents.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Available Events to Join</CardTitle>
                    <CardDescription>
                      Join these upcoming events to expand your presence
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{availableEvents.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableEvents.map((event) => (
                    <Card
                      key={event.id}
                      className="hover:shadow-md transition-shadow"
                    >
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
                        <CardTitle className="text-base line-clamp-2">
                          {event.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="space-y-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(event.start_datetime)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(event.start_datetime)}</span>
                            </div>
                            <div className="flex items-start gap-2">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">
                                {event.address}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => handleJoinEvent(event.id)}
                            disabled={joiningEventId === event.id}
                          >
                            {joiningEventId === event.id ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Joining...
                              </>
                            ) : (
                              'Join Event'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Events Section */}
          <div className="space-y-6">
            {/* Events Header */}
            {displayableEvents.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className={`text-2xl font-bold ${customStyle ? 'text-primary' : ''}`}>Events</h2>
                  <Badge variant="outline">{displayableEvents.length}</Badge>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                )}
              </div>
            )}

            {/* Event Cards Grid */}
            {paginatedEvents.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedEvents.map((event) => {
                  const eventStart = new Date(event.start_datetime);
                  const eventEnd = new Date(event.end_datetime);
                  const isHappeningNow = eventStart <= now && eventEnd >= now;
                  const isPast = eventEnd < now;

                  return (
                    <Card
                      key={event.id}
                      className={`hover:shadow-lg transition-all cursor-pointer ${
                        isHappeningNow
                          ? 'border-2 border-green-500'
                          : isPast
                          ? 'opacity-75 hover:opacity-100'
                          : ''
                      }`}
                      onClick={() => navigate(`/e/${event.id}`)}
                    >
                      {event.image && (
                        <div className="relative h-48 overflow-hidden rounded-t-lg">
                          <img
                            src={event.image}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                          {isHappeningNow && (
                            <Badge className="absolute top-2 right-2 bg-green-600">
                              Happening Now
                            </Badge>
                          )}
                          {isPast && (
                            <Badge variant="secondary" className="absolute top-2 right-2">
                              Past Event
                            </Badge>
                          )}
                        </div>
                      )}
                      {!event.image && (isHappeningNow || isPast) && (
                        <div className="px-4 pt-4">
                          {isHappeningNow && (
                            <Badge className="bg-green-600">Happening Now</Badge>
                          )}
                          {isPast && (
                            <Badge variant="secondary">Past Event</Badge>
                          )}
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="line-clamp-2">
                          {event.title}
                        </CardTitle>
                        {event.categories && event.categories.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap pt-2">
                            {event.categories.map((category) => (
                              <Badge
                                key={category}
                                variant="secondary"
                                className="text-xs"
                              >
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
                              {formatDate(event.start_datetime) !==
                                formatDate(event.end_datetime) && (
                                <div>to {formatDate(event.end_datetime)}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span className="line-clamp-1">
                              {formatTime(event.start_datetime)} -{' '}
                              {formatTime(event.end_datetime)}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">
                              {event.address}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={secondaryButtonStyle}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <Button
                      key={page}
                      variant={page === currentPage ? 'default' : 'outline'}
                      size="sm"
                      className="w-8 h-8 p-0"
                      onClick={() => setCurrentPage(page)}
                      style={page === currentPage ? secondaryButtonStyle : undefined}
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={secondaryButtonStyle}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}

            {/* No Events */}
            {displayableEvents.length === 0 && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    {hidePastEvents
                      ? 'No upcoming events scheduled.'
                      : "This business hasn't participated in any events yet."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

export default BusinessProfile;
