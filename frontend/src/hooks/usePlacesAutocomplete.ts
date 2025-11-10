import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import type { PlaceResult } from '../types'

/**
 * Custom hook for Google Places Autocomplete
 * Returns refs and state for managing autocomplete input
 */
export function usePlacesAutocomplete(
  onPlaceSelect: (place: PlaceResult) => void
): React.RefObject<HTMLInputElement> {
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const places = useMapsLibrary('places')

  useEffect(() => {
    if (!places || !inputRef.current) return

    const options: google.maps.places.AutocompleteOptions = {
      fields: ['geometry', 'formatted_address', 'address_components'],
      types: ['address'], // Only show addresses, not businesses
    }

    setPlaceAutocomplete(new places.Autocomplete(inputRef.current, options))
  }, [places])

  useEffect(() => {
    if (!placeAutocomplete) return

    placeAutocomplete.addListener('place_changed', () => {
      const place = placeAutocomplete.getPlace()

      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        const address = place.formatted_address || ''

        onPlaceSelect({
          address,
          latitude: lat,
          longitude: lng,
        })
      }
    })
  }, [placeAutocomplete, onPlaceSelect])

  return inputRef
}

