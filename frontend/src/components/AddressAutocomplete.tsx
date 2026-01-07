import { useRef, useEffect, useState } from 'react'
import { useAddressAutocomplete } from '../hooks/useAddressAutocomplete'
import { Input } from '@/components/ui/input'
import { Loader2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlaceResult } from '../types'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onPlaceSelect: (place: PlaceResult) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = 'Search for an address...',
  className,
  disabled = false,
}: AddressAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    query,
    setQuery,
    suggestions,
    isLoading,
    selectSuggestion,
    clearSuggestions,
  } = useAddressAutocomplete({ countryCode: 'us' })

  // Sync external value with internal query
  useEffect(() => {
    if (value !== query) {
      setQuery(value)
    }
  }, [value])

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setQuery(newValue)
    onChange(newValue)
    setIsOpen(true)
    setHighlightedIndex(-1)
  }

  // Handle suggestion selection
  const handleSelect = (index: number) => {
    const suggestion = suggestions[index]
    if (suggestion) {
      const place = selectSuggestion(suggestion)
      onChange(place.address)
      onPlaceSelect(place)
      setIsOpen(false)
      clearSuggestions()
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0) {
          handleSelect(highlightedIndex)
        }
        break
      case 'Escape':
        setIsOpen(false)
        setHighlightedIndex(-1)
        break
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Open dropdown when there are suggestions
  useEffect(() => {
    if (suggestions.length > 0) {
      setIsOpen(true)
    }
  }, [suggestions])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Dropdown suggestions */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <ul className="max-h-60 overflow-auto py-1">
            {suggestions.map((suggestion, index) => (
              <li
                key={suggestion.place_id}
                onClick={() => handleSelect(index)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={cn(
                  'cursor-pointer px-3 py-2 text-sm',
                  index === highlightedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50'
                )}
              >
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-muted-foreground" />
                  <span className="line-clamp-2">{suggestion.display_name}</span>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
            Powered by OpenStreetMap
          </div>
        </div>
      )}
    </div>
  )
}
