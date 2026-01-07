import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Map, MapMarker, MarkerContent, MapPopup, MapControls } from '@/components/ui/map'
import { useMapEvents } from '../hooks/useEvents'
import { useUserGeolocation } from '../hooks/useUserGeolocation'
import { eventsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, MapPin, Loader2, ExternalLink } from 'lucide-react'
import { CustomMapPin } from './CustomMapPin'
import type { Event } from '../types'

// Default center (Washington DC) - used as fallback if geolocation fails
// Note: MapLibre uses [longitude, latitude] format
const DEFAULT_CENTER: [number, number] = [-77.0369, 38.9072]

interface MapViewProps {
  onBusinessClick?: (businessId: number) => void
}

function MapView({ onBusinessClick }: MapViewProps) {
  const navigate = useNavigate()
  const { data: events, isLoading, error } = useMapEvents()
  const { coordinates } = useUserGeolocation({ lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] })
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [popupEvent, setPopupEvent] = useState<Event | null>(null)

  // Fetch full event details when an event is selected
  const { data: fullEventDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['event', selectedEventId],
    queryFn: async () => {
      if (!selectedEventId) return null
      const response = await eventsApi.getById(selectedEventId)
      return response.data
    },
    enabled: !!selectedEventId,
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

  function handleMarkerClick(event: Event) {
    setPopupEvent(event)
    setSelectedEventId(event.id)
  }

  function handleCloseModal() {
    setSelectedEventId(null)
    setPopupEvent(null)
  }

  function handleClosePopup() {
    setPopupEvent(null)
  }

  // Calculate center from coordinates (converting from {lat, lng} to [lng, lat])
  const mapCenter: [number, number] = coordinates
    ? [coordinates.lng, coordinates.lat]
    : DEFAULT_CENTER

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Events</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {isLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground">Loading events...</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Map
        center={mapCenter}
        zoom={11}
        className="h-full"
      >
        {/* Map Controls */}
        <MapControls
          position="bottom-right"
          showZoom={true}
          showLocate={true}
        />

        {/* Event Markers */}
        {events?.map((event) => (
          <MapMarker
            key={event.id}
            longitude={parseFloat(event.longitude)}
            latitude={parseFloat(event.latitude)}
            onClick={() => handleMarkerClick(event)}
          >
            <MarkerContent>
              <CustomMapPin categories={event.categories || []} />
            </MarkerContent>
          </MapMarker>
        ))}

        {/* Popup for selected event */}
        {popupEvent && (
          <MapPopup
            longitude={parseFloat(popupEvent.longitude)}
            latitude={parseFloat(popupEvent.latitude)}
            onClose={handleClosePopup}
            closeButton
            className="max-w-xs p-0"
          >
            <div className="p-2">
              {popupEvent.image && (
                <div className="relative w-full h-32 overflow-hidden rounded-md mb-2">
                  <img
                    src={popupEvent.image}
                    alt={popupEvent.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <h3 className="font-bold text-lg mb-1">{popupEvent.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {popupEvent.businesses && popupEvent.businesses.length > 0 ? (
                  <span>
                    {popupEvent.businesses.map((business, index) => (
                      <span key={business.id}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onBusinessClick?.(business.id)
                          }}
                          className="hover:underline hover:text-primary transition-colors"
                        >
                          {business.name}
                        </button>
                        {index < popupEvent.businesses.length - 1 && ', '}
                      </span>
                    ))}
                  </span>
                ) : (
                  popupEvent.business_names
                )}
              </p>
              {popupEvent.categories && popupEvent.categories.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {popupEvent.categories.map((category) => (
                    <Badge key={category} variant="secondary" className="text-xs">
                      {category}
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-sm">
                {formatDate(popupEvent.start_datetime)} - {formatDate(popupEvent.end_datetime)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatTime(popupEvent.start_datetime)}
              </p>
              <Button
                size="sm"
                className="mt-2 w-full"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/e/${popupEvent.id}`)
                }}
              >
                View Details
              </Button>
            </div>
          </MapPopup>
        )}
      </Map>

      {/* Event Details Modal */}
      <Dialog open={!!selectedEventId} onOpenChange={(open) => !open && handleCloseModal()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {isLoadingDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : fullEventDetails ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{fullEventDetails.title}</DialogTitle>
                <DialogDescription>
                  {fullEventDetails.businesses && fullEventDetails.businesses.length > 0 ? (
                    <span>
                      {fullEventDetails.businesses.map((business, index) => (
                        <span key={business.id}>
                          <button
                            onClick={() => {
                              handleCloseModal()
                              onBusinessClick?.(business.id)
                            }}
                            className="hover:underline hover:text-primary transition-colors"
                          >
                            {business.name}
                          </button>
                          {index < fullEventDetails.businesses.length - 1 && ', '}
                        </span>
                      ))}
                    </span>
                  ) : (
                    fullEventDetails.business_names
                  )}
                </DialogDescription>
              </DialogHeader>

              {fullEventDetails.image && (
                <div className="relative w-full h-64 overflow-hidden rounded-lg mb-4">
                  <img
                    src={fullEventDetails.image}
                    alt={fullEventDetails.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {fullEventDetails.categories && fullEventDetails.categories.length > 0 && (
                <div className="flex gap-2 flex-wrap mb-4">
                  {fullEventDetails.categories.map((category) => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                </div>
              )}

              {fullEventDetails.description && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {fullEventDetails.description}
                  </p>
                </div>
              )}

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Date</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(fullEventDetails.start_datetime)}
                      {formatDate(fullEventDetails.start_datetime) !== formatDate(fullEventDetails.end_datetime) && (
                        <> to {formatDate(fullEventDetails.end_datetime)}</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Time</p>
                    <p className="text-sm text-muted-foreground">
                      {formatTime(fullEventDetails.start_datetime)} - {formatTime(fullEventDetails.end_datetime)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-muted-foreground">{fullEventDetails.address}</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              {fullEventDetails.cta_button_text && fullEventDetails.cta_button_url && (
                <>
                  <Separator className="my-4" />
                  <Button
                    className="w-full"
                    asChild
                  >
                    <a
                      href={fullEventDetails.cta_button_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      {fullEventDetails.cta_button_text}
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </>
              )}

              {fullEventDetails.businesses && fullEventDetails.businesses.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm font-medium mb-2">Participating Businesses</p>
                    <div className="flex flex-wrap gap-2">
                      {fullEventDetails.businesses.map((business) => (
                        <Button
                          key={business.id}
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            handleCloseModal()
                            onBusinessClick?.(business.id)
                          }}
                          className="flex items-center gap-2"
                        >
                          {business.logo && (
                            <img
                              src={business.logo}
                              alt={`${business.name} logo`}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          )}
                          {business.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Event details not found.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MapView
