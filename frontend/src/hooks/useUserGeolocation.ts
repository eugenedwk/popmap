import { useState, useEffect } from 'react';

interface Coordinates {
  lat: number;
  lng: number;
}

interface GeolocationState {
  coordinates: Coordinates | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook to get user's geolocation
 * Falls back to default coordinates if geolocation is unavailable or denied
 */
export function useUserGeolocation(
  defaultCoordinates: Coordinates
): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    coordinates: defaultCoordinates,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    // Check if geolocation is available
    if (!navigator.geolocation) {
      setState({
        coordinates: defaultCoordinates,
        isLoading: false,
        error: 'Geolocation is not supported by your browser',
      });
      return;
    }

    // Request user's current position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coordinates: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          isLoading: false,
          error: null,
        });
      },
      (error) => {
        // Fall back to default coordinates on error
        setState({
          coordinates: defaultCoordinates,
          isLoading: false,
          error: error.message,
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  }, [defaultCoordinates.lat, defaultCoordinates.lng]);

  return state;
}
