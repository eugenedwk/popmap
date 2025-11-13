import { useState } from 'react'
import { APIProvider, Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import { useMapEvents } from '../hooks/useEvents'
import { useUserGeolocation } from '../hooks/useUserGeolocation'
import EventCard from './EventCard'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Default center (San Francisco) - used as fallback if geolocation fails
const DEFAULT_CENTER = { lat: 37.7749, lng: -122.4194 }

function EventMap() {
  const { data: events, isLoading, error } = useMapEvents()
  const { coordinates } = useUserGeolocation(DEFAULT_CENTER)
  const [selectedEvent, setSelectedEvent] = useState(null)

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Configuration Required</h2>
          <p className="text-gray-600">
            Please add your Google Maps API key to the .env file:
          </p>
          <code className="block mt-2 p-2 bg-gray-100 text-sm">
            VITE_GOOGLE_MAPS_API_KEY=your-key-here
          </code>
        </div>
      </div>
    )
  }

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

      <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
        <Map
          defaultCenter={coordinates || DEFAULT_CENTER}
          defaultZoom={12}
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
                <h3 className="font-bold text-lg">{selectedEvent.title}</h3>
                <p className="text-sm text-gray-600 mb-1">{selectedEvent.business_name}</p>
                <p className="text-sm">
                  {new Date(selectedEvent.start_datetime).toLocaleDateString()} -{' '}
                  {new Date(selectedEvent.end_datetime).toLocaleDateString()}
                </p>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

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
