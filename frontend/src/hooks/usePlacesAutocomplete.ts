import { useEffect, useRef, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { PlaceResult } from '../types'

/**
 * Custom hook for Google Places Autocomplete
 * Returns refs and state for managing autocomplete input
 */
export function usePlacesAutocomplete(
  onPlaceSelect: (place: PlaceResult) => void
): React.RefObject<HTMLInputElement> {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  const places = useMapsLibrary('places')

  // Keep the callback ref updated
  useEffect(() => {
    onPlaceSelectRef.current = onPlaceSelect
  }, [onPlaceSelect])

  useEffect(() => {
    if (!places || !inputRef.current) return

    // Only create autocomplete once
    if (autocompleteRef.current) return

    const options: google.maps.places.AutocompleteOptions = {
      fields: ['geometry', 'formatted_address', 'address_components', 'name'],
      // Include addresses, establishments (venues/businesses), and geocoded locations
      types: ['geocode', 'establishment'],
    }

    const autocomplete = new places.Autocomplete(inputRef.current, options)
    autocompleteRef.current = autocomplete

    // Add the listener
    listenerRef.current = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace()

      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()

        // For establishments, include the name in the address
        let address = place.formatted_address || ''
        if (place.name && !address.startsWith(place.name)) {
          address = `${place.name}, ${address}`
        }

        onPlaceSelectRef.current({
          address,
          latitude: lat,
          longitude: lng,
        })
      }
    })

    // Cleanup
    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current)
        listenerRef.current = null
      }
    }
  }, [places])

  return inputRef
}

