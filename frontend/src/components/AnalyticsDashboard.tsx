import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { analyticsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Loader2,
  Eye,
  Users,
  MousePointerClick,
  Share2,
  TrendingUp,
  TrendingDown,
  Smartphone,
  Monitor,
  BarChart3,
  Lock
} from 'lucide-react'
import type { Business, AnalyticsOverview, EventAnalytics } from '../types'

interface AnalyticsDashboardProps {
  business: Business
}

function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  description
}: {
  title: string
  value: string | number
  change?: number | null
  icon: React.ComponentType<{ className?: string }>
  description?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && change !== null && (
          <p className={`text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'} flex items-center gap-1`}>
            {change >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}% from last period
          </p>
        )}
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
      </CardContent>
    </Card>
  )
}

function SimpleBarChart({ data }: { data: { date: string; views: number; unique: number }[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    )
  }

  const maxViews = Math.max(...data.map(d => d.views), 1)

  return (
    <div className="h-48 flex items-end gap-1">
      {data.map((day, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className="w-full bg-primary/80 rounded-t"
            style={{ height: `${(day.views / maxViews) * 150}px` }}
            title={`${day.date}: ${day.views} views (${day.unique} unique)`}
          />
          <span className="text-[10px] text-muted-foreground rotate-45 origin-left">
            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      ))}
    </div>
  )
}

function ReferrerList({ referrers }: { referrers: { source: string; count: number }[] }) {
  const sourceLabels: Record<string, string> = {
    direct: 'Direct',
    social_instagram: 'Instagram',
    social_facebook: 'Facebook',
    social_twitter: 'Twitter/X',
    social_tiktok: 'TikTok',
    search: 'Search Engines',
    subdomain: 'Custom Subdomain',
    internal: 'Internal Links',
    other: 'Other',
  }

  return (
    <div className="space-y-2">
      {referrers.map((ref, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <span>{sourceLabels[ref.source] || ref.source}</span>
          <Badge variant="secondary">{ref.count}</Badge>
        </div>
      ))}
      {referrers.length === 0 && (
        <p className="text-sm text-muted-foreground">No referrer data yet</p>
      )}
    </div>
  )
}

function EventsTable({ events }: { events: EventAnalytics[] }) {
  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No events data available
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-2 font-medium">Event</th>
            <th className="text-right py-2 px-2 font-medium">Views</th>
            <th className="text-right py-2 px-2 font-medium">Unique</th>
            <th className="text-right py-2 px-2 font-medium">RSVPs</th>
            <th className="text-right py-2 px-2 font-medium">CTAs</th>
            <th className="text-right py-2 px-2 font-medium">Conv. Rate</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.event_id} className="border-b hover:bg-muted/50">
              <td className="py-2 px-2 max-w-[200px] truncate">{event.event_title}</td>
              <td className="text-right py-2 px-2">{event.total_views}</td>
              <td className="text-right py-2 px-2">{event.unique_visitors}</td>
              <td className="text-right py-2 px-2">
                {event.rsvp_interested + event.rsvp_going}
                <span className="text-muted-foreground text-xs ml-1">
                  ({event.rsvp_going} going)
                </span>
              </td>
              <td className="text-right py-2 px-2">{event.cta_clicks}</td>
              <td className="text-right py-2 px-2">{event.rsvp_conversion_rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AnalyticsDashboard({ business }: AnalyticsDashboardProps) {
  const [days, setDays] = useState(30)

  // Check if analytics is enabled for this business
  const hasAnalyticsAccess = business.can_use_premium_customization

  // Fetch overview data
  const { data: overview, isLoading: overviewLoading, error: overviewError } = useQuery({
    queryKey: ['analytics-overview', business.id, days],
    queryFn: async () => {
      const response = await analyticsApi.getBusinessOverview(business.id, days)
      return response.data
    },
    enabled: hasAnalyticsAccess,
  })

  // Fetch events breakdown
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ['analytics-events', business.id, days],
    queryFn: async () => {
      const response = await analyticsApi.getBusinessEvents(business.id, days)
      return response.data.events
    },
    enabled: hasAnalyticsAccess,
  })

  // Premium paywall for non-subscribers
  if (!hasAnalyticsAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics Dashboard
            <Badge variant="secondary" className="ml-2">Premium</Badge>
          </CardTitle>
          <CardDescription>
            Track page views, visitor engagement, and event performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Unlock Analytics</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-md mx-auto">
              Upgrade to Premium to see detailed analytics about your page views,
              visitor engagement, RSVP conversions, and more.
            </p>
            <Button onClick={() => window.location.href = '/billing'}>
              Upgrade to Premium
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (overviewLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (overviewError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-destructive">
            Failed to load analytics data. Please try again later.
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with time period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics
          </h2>
          <p className="text-muted-foreground">
            {overview?.period_start} to {overview?.period_end}
          </p>
        </div>
        <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Page Views"
          value={overview?.total_views || 0}
          change={overview?.views_change_percent}
          icon={Eye}
        />
        <MetricCard
          title="Unique Visitors"
          value={overview?.unique_visitors || 0}
          icon={Users}
        />
        <MetricCard
          title="CTA Clicks"
          value={overview?.cta_clicks || 0}
          description={`${overview?.cta_click_rate || 0}% click rate`}
          icon={MousePointerClick}
        />
        <MetricCard
          title="Shares"
          value={overview?.share_clicks || 0}
          icon={Share2}
        />
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">By Event</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Views Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Views Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <SimpleBarChart data={overview?.daily_views || []} />
              </CardContent>
            </Card>

            {/* Device & Referrer Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Traffic Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Device breakdown */}
                <div>
                  <p className="text-sm font-medium mb-2">Device Type</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Mobile: {overview?.mobile_percent || 0}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Desktop: {overview?.desktop_percent || 0}%</span>
                    </div>
                  </div>
                </div>

                {/* Referrer breakdown */}
                <div>
                  <p className="text-sm font-medium mb-2">Top Referrers</p>
                  <ReferrerList referrers={overview?.top_referrers || []} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Engagement Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{overview?.rsvp_count || 0}</p>
                  <p className="text-sm text-muted-foreground">Total RSVPs</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{overview?.total_interactions || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Interactions</p>
                </div>
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-3xl font-bold">{overview?.cta_click_rate || 0}%</p>
                  <p className="text-sm text-muted-foreground">CTA Click Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Performance</CardTitle>
              <CardDescription>
                See how each of your events is performing
              </CardDescription>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <EventsTable events={eventsData || []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
