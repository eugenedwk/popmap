import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { eventsApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Calendar, Heart, CheckCircle2, ArrowLeft } from 'lucide-react'

function MyRSVPs() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  const { data: rsvps, isLoading, error } = useQuery({
    queryKey: ['my-rsvps'],
    queryFn: async () => {
      const response = await eventsApi.getMyRsvps()
      return response.data
    },
    enabled: isAuthenticated,
  })

  function formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>
              Please sign in to view your RSVPs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/login')}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              Failed to load your RSVPs. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full bg-background">
      <ScrollArea className="h-full">
        <div className="max-w-4xl mx-auto p-6">
          {/* Back Button */}
          <Button onClick={() => navigate('/')} variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2">My RSVPs</h1>
            <p className="text-muted-foreground">
              Events you're interested in or planning to attend
            </p>
          </div>

          {/* RSVPs List */}
          {!rsvps || rsvps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">No RSVPs yet</p>
                <p className="text-muted-foreground mb-4">
                  Start exploring events and RSVP to ones you're interested in!
                </p>
                <Button onClick={() => navigate('/')}>
                  Browse Events
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {rsvps.map((rsvp: any) => (
                <Card key={rsvp.id} className="hover:border-primary transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-semibold">
                            {rsvp.event_title}
                          </h3>
                          <Badge
                            variant={rsvp.status === 'going' ? 'default' : 'secondary'}
                            className="flex items-center gap-1"
                          >
                            {rsvp.status === 'going' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <Heart className="h-3 w-3" />
                            )}
                            {rsvp.status === 'going' ? 'Going' : 'Interested'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          RSVP'd on {formatDate(rsvp.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/e/${rsvp.event}`)}
                      >
                        View Event
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default MyRSVPs
