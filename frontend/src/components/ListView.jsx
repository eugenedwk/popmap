import PropTypes from 'prop-types'
import { useActiveEvents } from '../hooks/useEvents'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Calendar, Clock, MapPin } from 'lucide-react'

function ListView({ onBusinessClick }) {
  const { data: events, isLoading, error } = useActiveEvents()

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

  const groupedEvents = groupEventsByDate(events)
  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a) - new Date(b)
  )

  return (
    <div className="h-full bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Upcoming Events</h1>
          <p className="text-muted-foreground">
            {events?.length || 0} events scheduled
          </p>
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)]">
          {sortedDates.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No upcoming events found.
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
                      <Card key={event.id} className="hover:shadow-md transition-shadow">
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
