import { useState } from 'react'
import { Map, MapMarker, MarkerContent, MapPopup, MapControls } from '@/components/ui/map'
import { useMapEvents } from '../hooks/useEvents'
import { useUserGeolocation } from '../hooks/useUserGeolocation'
import { Card, CardContent } from '@/components/ui/card'
import EventCard from './EventCard'
import type { Event } from '../types'

// Default center (San Francisco) - used as fallback if geolocation fails
// Note: MapLibre uses [longitude, latitude] format
const DEFAULT_CENTER: [number, number] = [-122.4194, 37.7749]

function EventMap() {
  const { data: events, isLoading, error } = useMapEvents()
  const { coordinates } = useUserGeolocation({ lat: DEFAULT_CENTER[1], lng: DEFAULT_CENTER[0] })
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)

  // Calculate center from coordinates (converting from {lat, lng} to [lng, lat])
  const mapCenter: [number, number] = coordinates
    ? [coordinates.lng, coordinates.lat]
    : DEFAULT_CENTER

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Events</h2>
          <p className="text-gray-600">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full">
      {isLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-white px-4 py-2 rounded-lg shadow-lg">
          <p className="text-gray-600">Loading events...</p>
        </div>
      )}

      <Map
        center={mapCenter}
        zoom={12}
        className="h-full"
      >
        <MapControls position="bottom-right" showZoom={true} showLocate={true} />

        {events?.map((event) => (
          <MapMarker
            key={event.id}
            longitude={parseFloat(event.longitude)}
            latitude={parseFloat(event.latitude)}
            onClick={() => setSelectedEvent(event)}
          >
            <MarkerContent>
              <div className="h-3 w-3 rounded-full bg-primary border-2 border-white shadow-lg" />
            </MarkerContent>
          </MapMarker>
        ))}

        {selectedEvent && (
          <MapPopup
            longitude={parseFloat(selectedEvent.longitude)}
            latitude={parseFloat(selectedEvent.latitude)}
            onClose={() => setSelectedEvent(null)}
            closeButton
            className="max-w-xs p-0"
          >
            <div className="p-2">
              <h3 className="font-bold text-lg">{selectedEvent.title}</h3>
              <p className="text-sm text-gray-600 mb-1">{selectedEvent.business_names}</p>
              <p className="text-sm">
                {new Date(selectedEvent.start_datetime).toLocaleDateString()} -{' '}
                {new Date(selectedEvent.end_datetime).toLocaleDateString()}
              </p>
            </div>
          </MapPopup>
        )}
      </Map>

      {/* Event List Sidebar */}
      <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-lg overflow-y-auto">
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Upcoming Events</h2>
          {isLoading && <p className="text-gray-500">Loading...</p>}
          {events?.length === 0 && (
            <p className="text-gray-500">No upcoming events found.</p>
          )}
          <div className="space-y-4">
            {events?.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onClick={() => setSelectedEvent(event)}
                isSelected={selectedEvent?.id === event.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventMap
