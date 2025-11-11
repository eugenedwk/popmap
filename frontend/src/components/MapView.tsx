import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import { useMapEvents } from '../hooks/useEvents'
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
import { Calendar, Clock, MapPin, Loader2, X } from 'lucide-react'
import type { Event } from '../types'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Default center (Washington DC)
const DEFAULT_CENTER = { lat: 38.9072, lng: -77.0369 }

interface MapViewProps {
  onBusinessClick?: (businessId: number) => void
}

function MapView({ onBusinessClick }: MapViewProps) {
  const { data: events, isLoading, error } = useMapEvents()
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null)
  const [infoWindowEvent, setInfoWindowEvent] = useState<Event | null>(null)

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
    setInfoWindowEvent(event)
    setSelectedEventId(event.id)
  }

  function handleCloseModal() {
    setSelectedEventId(null)
    setInfoWindowEvent(null)
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Configuration Required</CardTitle>
            <CardDescription>
              Please add your Google Maps API key to the .env file:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block p-2 bg-muted text-sm rounded">
              VITE_GOOGLE_MAPS_API_KEY=your-key-here
            </code>
          </CardContent>
        </Card>
      </div>
    )
  }

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

      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={DEFAULT_CENTER}
          defaultZoom={11}
          mapId="popmap-events"
          className="h-full"
        >
          {events?.map((event) => (
            <AdvancedMarker
              key={event.id}
              position={{ lat: parseFloat(event.latitude), lng: parseFloat(event.longitude) }}
              onClick={() => handleMarkerClick(event)}
            />
          ))}

          {/* Minimal InfoWindow for quick preview */}
          {infoWindowEvent && (
            <InfoWindow
              position={{
                lat: parseFloat(infoWindowEvent.latitude),
                lng: parseFloat(infoWindowEvent.longitude),
              }}
              onCloseClick={() => {
                setInfoWindowEvent(null)
                setSelectedEventId(null)
              }}
            >
              <div className="p-2 max-w-xs">
                <h3 className="font-bold text-lg mb-1">{infoWindowEvent.title}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {infoWindowEvent.businesses && infoWindowEvent.businesses.length > 0 ? (
                    <span>
                      {infoWindowEvent.businesses.map((business, index) => (
                        <span key={business.id}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onBusinessClick?.(business.id)
                            }}
                            className="hover:underline hover:text-blue-800 transition-colors"
                          >
                            {business.name}
                          </button>
                          {index < infoWindowEvent.businesses.length - 1 && ', '}
                        </span>
                      ))}
                    </span>
                  ) : (
                    infoWindowEvent.business_names
                  )}
                </p>
                {infoWindowEvent.categories && infoWindowEvent.categories.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {infoWindowEvent.categories.map((category) => (
                      <Badge key={category} variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm">
                  {formatDate(infoWindowEvent.start_datetime)} - {formatDate(infoWindowEvent.end_datetime)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(infoWindowEvent.start_datetime)}
                </p>
                <Button
                  size="sm"
                  className="mt-2 w-full"
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedEventId(infoWindowEvent.id)
                  }}
                >
                  View Details
                </Button>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

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
                        >
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
