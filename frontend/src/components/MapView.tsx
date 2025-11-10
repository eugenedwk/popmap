import { useState } from 'react'
import PropTypes from 'prop-types'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import { useMapEvents } from '../hooks/useEvents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Calendar, Clock, MapPin } from 'lucide-react'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Default center (Washington DC)
const DEFAULT_CENTER = { lat: 38.9072, lng: -77.0369 }

function MapView({ onBusinessClick }) {
  const { data: events, isLoading, error } = useMapEvents()
  const [selectedEvent, setSelectedEvent] = useState(null)

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
              <div className="p-2 max-w-xs">
                <h3 className="font-bold text-lg mb-1">{selectedEvent.title}</h3>
                <p className="text-sm text-gray-600 mb-2">
                  {selectedEvent.businesses && selectedEvent.businesses.length > 0 ? (
                    <span>
                      {selectedEvent.businesses.map((business, index) => (
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
                          {index < selectedEvent.businesses.length - 1 && ', '}
                        </span>
                      ))}
                    </span>
                  ) : (
                    selectedEvent.business_names
                  )}
                </p>
                {selectedEvent.categories && selectedEvent.categories.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {selectedEvent.categories.map((category) => (
                      <Badge key={category} variant="secondary" className="text-xs">
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}
                <p className="text-sm">
                  {formatDate(selectedEvent.start_datetime)} - {formatDate(selectedEvent.end_datetime)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatTime(selectedEvent.start_datetime)}
                </p>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Event List Sidebar */}
      <div className="absolute top-0 right-0 h-full w-80 bg-card border-l border-border shadow-lg">
        <ScrollArea className="h-full">
          <div className="p-4">
            <h2 className="text-xl font-bold mb-1">Events on Map</h2>
            <p className="text-sm text-muted-foreground mb-4">
              {events?.length || 0} events
            </p>
            {isLoading && <p className="text-muted-foreground">Loading...</p>}
            {events?.length === 0 && !isLoading && (
              <p className="text-muted-foreground">No events found.</p>
            )}
            <div className="space-y-3">
              {events?.map((event) => (
                <Card
                  key={event.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedEvent?.id === event.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedEvent(event)}
                >
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base line-clamp-2">{event.title}</CardTitle>
                    <CardDescription className="text-xs line-clamp-1">
                      {event.businesses && event.businesses.length > 0 ? (
                        <span>
                          {event.businesses.map((business, index) => (
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
                              {index < event.businesses.length - 1 && ', '}
                            </span>
                          ))}
                        </span>
                      ) : (
                        event.business_names
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    {event.categories && event.categories.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-2">
                        {event.categories.slice(0, 2).map((category) => (
                          <Badge key={category} variant="secondary" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                        {event.categories.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{event.categories.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span className="line-clamp-1">
                          {formatDate(event.start_datetime)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="line-clamp-1">
                          {formatTime(event.start_datetime)}
                        </span>
                      </div>
                      <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{event.address}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

MapView.propTypes = {
  onBusinessClick: PropTypes.func,
}

export default MapView
