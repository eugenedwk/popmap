import PropTypes from 'prop-types'
import { useState, useMemo, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useActiveEvents } from '../hooks/useEvents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Clock, MapPin, Search } from 'lucide-react'

function ListView({ onBusinessClick }) {
  const navigate = useNavigate()
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
      weekday: 'long',
      month: 'long',
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

  const groupEventsByDate = (events) => {
    const grouped = {}
    events?.forEach((event) => {
      const dateKey = new Date(event.start_datetime).toDateString()
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(event)
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

  const groupedEvents = groupEventsByDate(filteredEvents)
  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a) - new Date(b)
  )

  return (
    <div className="h-full bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Upcoming Events</h1>
          <p className="text-muted-foreground">
            Showing {filteredEvents.length} of {events?.length || 0} events
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
          {sortedDates.length === 0 ? (
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
            <div className="space-y-6">
              {sortedDates.map((dateKey) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold">
                      {formatDate(dateKey)}
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {groupedEvents[dateKey].map((event) => (
                      <Card
                        key={event.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/e/${event.id}`)}
                      >
                        <CardHeader>
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <CardTitle className="text-xl">{event.title}</CardTitle>
                              <CardDescription>
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
                            </div>
                            {event.image && (
                              <img
                                src={event.image}
                                alt={event.title}
                                className="w-20 h-20 object-cover rounded-md"
                              />
                            )}
                          </div>
                          {event.categories && event.categories.length > 0 && (
                            <div className="flex gap-1.5 flex-wrap mt-2">
                              {event.categories.map((category) => (
                                <Badge key={category} variant="secondary">
                                  {category}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>
                                {formatTime(event.start_datetime)} - {formatTime(event.end_datetime)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              <span>{event.address}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {dateKey !== sortedDates[sortedDates.length - 1] && (
                    <Separator className="mt-6" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  )
}

ListView.propTypes = {
  onBusinessClick: PropTypes.func,
}

export default ListView
