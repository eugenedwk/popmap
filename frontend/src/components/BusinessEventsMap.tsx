import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, MapPin } from 'lucide-react'
import type { Event } from '../types'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

interface BusinessEventsMapProps {
  events: Event[]
  businessName: string
}

export function BusinessEventsMap({ events, businessName }: BusinessEventsMapProps) {
  const navigate = useNavigate()
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  // Calculate center of map based on events
  const mapCenter = useMemo(() => {
    if (events.length === 0) {
      // Default to San Francisco if no events
      return { lat: 37.7749, lng: -122.4194 }
    }

    // Calculate average position of all events
    const avgLat = events.reduce((sum, event) => sum + parseFloat(event.latitude), 0) / events.length
    const avgLng = events.reduce((sum, event) => sum + parseFloat(event.longitude), 0) / events.length

    return { lat: avgLat, lng: avgLng }
  }, [events])

  // Calculate appropriate zoom level based on event spread
  const mapZoom = useMemo(() => {
    if (events.length <= 1) return 13

    // Calculate bounding box
    const lats = events.map(e => parseFloat(e.latitude))
    const lngs = events.map(e => parseFloat(e.longitude))

    const latRange = Math.max(...lats) - Math.min(...lats)
    const lngRange = Math.max(...lngs) - Math.min(...lngs)
    const maxRange = Math.max(latRange, lngRange)

    // Adjust zoom based on range
    if (maxRange > 0.5) return 10
    if (maxRange > 0.2) return 11
    if (maxRange > 0.1) return 12
    return 13
  }, [events])

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

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Locations</CardTitle>
          <CardDescription>
            Google Maps API key is not configured
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Locations</CardTitle>
          <CardDescription>
            No upcoming events to display on map
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Upcoming Event Locations</CardTitle>
            <CardDescription>
              {events.length} {events.length === 1 ? 'event' : 'events'} on the map
            </CardDescription>
          </div>
          <Badge variant="outline">{events.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px] rounded-lg overflow-hidden border">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              defaultCenter={mapCenter}
              defaultZoom={mapZoom}
              mapId="business-events-map"
              className="h-full w-full"
              disableDefaultUI={false}
              gestureHandling="greedy"
            >
              {events.map((event) => (
                <AdvancedMarker
                  key={event.id}
                  position={{
                    lat: parseFloat(event.latitude),
                    lng: parseFloat(event.longitude)
                  }}
                  onClick={() => setSelectedEvent(event)}
                />
              ))}

              {selectedEvent && (
                <InfoWindow
                  position={{
                    lat: parseFloat(selectedEvent.latitude),
                    lng: parseFloat(selectedEvent.longitude),
                  }}
                  onCloseClick={() => setSelectedEvent(null)}
                >
                  <div className="p-2 max-w-sm">
                    <h3 className="font-bold text-base mb-2 line-clamp-2">
                      {selectedEvent.title}
                    </h3>

                    <div className="space-y-1.5 text-sm mb-3">
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{formatDate(selectedEvent.start_datetime)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span>
                          {formatTime(selectedEvent.start_datetime)} - {formatTime(selectedEvent.end_datetime)}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{selectedEvent.address}</span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => navigate(`/e/${selectedEvent.id}`)}
                    >
                      View Event Details
                    </Button>
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        </div>
      </CardContent>
    </Card>
  )
}
