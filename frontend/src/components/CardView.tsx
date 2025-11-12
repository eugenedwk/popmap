import PropTypes from 'prop-types'
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useActiveEvents } from '../hooks/useEvents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Clock, MapPin, Search } from 'lucide-react'

function CardView({ onBusinessClick }) {
  const { data: events, isLoading, error } = useActiveEvents()
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize state from URL params
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all')

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams()
    if (searchQuery) {
      params.set('search', searchQuery)
    }
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory)
    }
    setSearchParams(params, { replace: true })
  }, [searchQuery, selectedCategory, setSearchParams])

  // Filter events based on search and category
  const filteredEvents = useMemo(() => {
    if (!events) return []

    return events.filter((event) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.address?.toLowerCase().includes(searchQuery.toLowerCase())

      // Category filter - check if any business has the selected category
      const matchesCategory =
        selectedCategory === 'all' ||
        event.businesses?.some((business) =>
          business.categories?.some((cat) => cat.id.toString() === selectedCategory)
        )

      return matchesSearch && matchesCategory
    })
  }, [events, searchQuery, selectedCategory])

  // Extract unique categories from all businesses in events
  const availableCategories = useMemo(() => {
    if (!events) return []
    const categoriesMap = new Map()
    events.forEach((event) => {
      event.businesses?.forEach((business) => {
        business.categories?.forEach((cat) => {
          if (!categoriesMap.has(cat.id)) {
            categoriesMap.set(cat.id, cat.name)
          }
        })
      })
    })
    return Array.from(categoriesMap.entries())
      .map(([id, name]) => ({ id: id.toString(), name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [events])

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

  const groupEventsByCategory = (events) => {
    const grouped = {}

    events?.forEach((event) => {
      if (!event.categories || event.categories.length === 0) {
        // Events without categories
        if (!grouped['Uncategorized']) {
          grouped['Uncategorized'] = []
        }
        grouped['Uncategorized'].push(event)
      } else {
        // Add event to each of its categories
        event.categories.forEach((category) => {
          if (!grouped[category]) {
            grouped[category] = []
          }
          grouped[category].push(event)
        })
      }
    })

    return grouped
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Events</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground">Loading events...</p>
      </div>
    )
  }

  const groupedEvents = groupEventsByCategory(filteredEvents)
  const categories = Object.keys(groupedEvents).sort()

  return (
    <div className="h-full bg-background">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Events by Category</h1>
          <p className="text-muted-foreground">
            Showing {filteredEvents.length} of {events?.length || 0} events across {categories.length} {categories.length === 1 ? 'category' : 'categories'}
          </p>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 space-y-4 md:space-y-0 md:flex md:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {availableCategories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <ScrollArea className="h-[calc(100vh-20rem)]">
          {categories.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'No events found matching your filters.'
                    : 'No upcoming events found.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {categories.map((category) => (
                <div key={category}>
                  <div className="flex items-center gap-3 mb-4">
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {category}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {groupedEvents[category].length} {groupedEvents[category].length === 1 ? 'event' : 'events'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedEvents[category].map((event) => (
                      <Card key={`${category}-${event.id}`} className="hover:shadow-lg transition-shadow">
                        {event.image && (
                          <div className="relative h-48 overflow-hidden rounded-t-lg">
                            <img
                              src={event.image}
                              alt={event.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <CardHeader>
                          <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                          <CardDescription className="line-clamp-1">
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
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <div>
                                <div>{formatDate(event.start_datetime)}</div>
                                {formatDate(event.start_datetime) !== formatDate(event.end_datetime) && (
                                  <div>to {formatDate(event.end_datetime)}</div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4 flex-shrink-0" />
                              <span className="line-clamp-1">
                                {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                              </span>
                            </div>
                            <div className="flex items-start gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-2">{event.address}</span>
                            </div>
                          </div>
                          {event.categories && event.categories.length > 1 && (
                            <div className="flex gap-1.5 flex-wrap mt-3">
                              {event.categories
                                .filter(c => c !== category)
                                .map((cat) => (
                                  <Badge key={cat} variant="secondary" className="text-xs">
                                    {cat}
                                  </Badge>
                                ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

CardView.propTypes = {
  onBusinessClick: PropTypes.func,
}

export default CardView
