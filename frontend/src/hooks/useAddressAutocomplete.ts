import { useState, useCallback, useRef, useEffect } from 'react'
import type { PlaceResult } from '../types'

interface NominatimResult {
  place_id: number
  licence: string
  osm_type: string
  osm_id: number
  boundingbox: string[]
  lat: string
  lon: string
  display_name: string
  class: string
  type: string
  importance: number
  address?: {
    house_number?: string
    road?: string
    city?: string
    state?: string
    postcode?: string
    country?: string
    country_code?: string
  }
}

interface UseAddressAutocompleteOptions {
  debounceMs?: number
  minChars?: number
  countryCode?: string // e.g., 'us' for United States
}

interface UseAddressAutocompleteReturn {
  query: string
  setQuery: (query: string) => void
  suggestions: NominatimResult[]
  isLoading: boolean
  error: string | null
  selectSuggestion: (suggestion: NominatimResult) => PlaceResult
  clearSuggestions: () => void
}

/**
 * Hook for address autocomplete using OpenStreetMap Nominatim
 * Free to use with proper attribution (handled by MapLibre)
 * Rate limit: 1 request per second
 */
export function useAddressAutocomplete(
  options: UseAddressAutocompleteOptions = {}
): UseAddressAutocompleteReturn {
  const { debounceMs = 300, minChars = 3, countryCode } = options

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const searchAddress = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < minChars) {
      setSuggestions([])
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    abortControllerRef.current = new AbortController()
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        format: 'json',
        addressdetails: '1',
        limit: '5',
      })

      if (countryCode) {
        params.append('countrycodes', countryCode)
      }

      // Using Nominatim's public API
      // Note: For production, consider setting up your own instance or using a commercial service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`,
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'User-Agent': 'PopMap/1.0 (https://popmap.co)',
          },
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch address suggestions')
      }

      const data: NominatimResult[] = await response.json()
      setSuggestions(data)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return
      }
      setError(err instanceof Error ? err.message : 'Unknown error')
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [minChars, countryCode])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      searchAddress(query)
    }, debounceMs)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, debounceMs, searchAddress])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const selectSuggestion = useCallback((suggestion: NominatimResult): PlaceResult => {
    return {
      address: suggestion.display_name,
      latitude: parseFloat(suggestion.lat),
      longitude: parseFloat(suggestion.lon),
    }
  }, [])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
  }, [])

  return {
    query,
    setQuery,
    suggestions,
    isLoading,
    error,
    selectSuggestion,
    clearSuggestions,
  }
}

/**
 * Simple geocoding function for one-off address lookups
 */
export async function geocodeAddress(address: string): Promise<PlaceResult | null> {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      addressdetails: '1',
      limit: '1',
    })

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'PopMap/1.0 (https://popmap.co)',
        },
      }
    )

    if (!response.ok) {
      return null
    }

    const data: NominatimResult[] = await response.json()

    if (data.length === 0) {
      return null
    }

    return {
      address: data[0].display_name,
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
    }
  } catch {
    return null
  }
}

/**
 * Reverse geocoding - get address from coordinates
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      lat: latitude.toString(),
      lon: longitude.toString(),
      format: 'json',
    })

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'PopMap/1.0 (https://popmap.co)',
        },
      }
    )

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.display_name || null
  } catch {
    return null
  }
}
