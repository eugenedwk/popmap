import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { businessesApi, formsApi, eventsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Plus, FileText, Eye, Calendar, Edit, Building2, Settings } from 'lucide-react'
import { BusinessSubdomainSettings } from './BusinessSubdomainSettings'
import { BusinessEditForm } from './BusinessEditForm'
import { FormTemplateBuilder } from './FormTemplateBuilder'
import { BusinessPageSettings } from './BusinessPageSettings'
import { FormBuilderPaywall } from './FormBuilderPaywall'
import { format } from 'date-fns'

/**
 * Business Dashboard - Main dashboard for business owners to manage their business
 *
 * Features:
 * - View and create events
 * - Edit business profile
 * - Manage form templates
 * - Configure custom subdomain (premium feature)
 */
export function BusinessDashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { businessId: businessIdParam } = useParams<{ businessId: string }>()
  const businessId = businessIdParam ? parseInt(businessIdParam, 10) : null
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)

  // Get tab from query params (default to 'events')
  const defaultTab = searchParams.get('tab') || 'events'

  const { data: business, isLoading, error } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      if (!businessId) throw new Error('Business ID is required')
      const response = await businessesApi.getById(businessId)
      return response.data
    },
    enabled: !!businessId,
  })

  // Fetch events associated with this business
  const { data: myEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ['my-events'],
    queryFn: async () => {
      const response = await eventsApi.getMyEvents()
      // Filter to only events that include this business
      return response.data.filter(event =>
        event.businesses.some(b => b.id === businessId)
      )
    },
    enabled: !!businessId,
  })

  // Fetch form templates for this business
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['form-templates', businessId],
    queryFn: async () => {
      const response = await formsApi.getTemplates()
      // API returns paginated response with results array
      const data = response.data.results || response.data
      return data.filter((t: any) => t.business === businessId)
    },
    enabled: !!businessId
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !business) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              Failed to load business information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Show form builder if creating a new form
  if (showCreateForm && businessId) {
    return (
      <FormTemplateBuilder
        businessId={businessId}
        onSave={(templateId) => {
          setShowCreateForm(false)
          refetchTemplates()
          navigate(`/forms/${templateId}/submissions`)
        }}
      />
    )
  }

  // Show edit profile form
  if (showEditProfile) {
    return (
      <ScrollArea className="h-full">
        <div className="max-w-4xl mx-auto p-6">
          <BusinessEditForm
            business={business}
            onSuccess={() => setShowEditProfile(false)}
          />
        </div>
      </ScrollArea>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Approved</Badge>
      case 'pending':
        return <Badge variant="secondary">Pending Review</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <ScrollArea className="h-full">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Building2 className="h-8 w-8" />
                {business.name}
              </h1>
              <p className="text-muted-foreground mt-1">Manage your business and events</p>
            </div>
            {!business.is_verified && (
              <Badge variant="secondary" className="mt-1">
                Pending Verification
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="events" className="gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">My Events</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <Edit className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="forms" className="gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Forms</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Events</CardTitle>
                    <CardDescription>
                      Create and manage popup events for your business
                    </CardDescription>
                  </div>
                  <Button onClick={() => navigate('/submit-event')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !myEvents || myEvents.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-lg font-medium text-muted-foreground">No events yet</p>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Create your first popup event to get discovered by customers
                    </p>
                    <Button onClick={() => navigate('/submit-event')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Event
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/e/${event.id}`)}>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{event.title}</h3>
                            {getStatusBadge(event.status)}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{format(new Date(event.start_datetime), 'MMM d, yyyy h:mm a')}</span>
                            <span>•</span>
                            <span>{event.address}</span>
                          </div>
                          {event.status === 'pending' && (
                            <p className="text-xs text-yellow-600 mt-2">
                              This event is pending admin approval before it appears on the map
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/e/${event.id}`)
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <BusinessEditForm business={business} />
          </TabsContent>

          {/* Forms Tab */}
          <TabsContent value="forms">
            <FormBuilderPaywall canUseFormBuilder={business.can_use_form_builder}>
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Form Templates</CardTitle>
                      <CardDescription>
                        Create and manage forms for collecting information from your customers
                      </CardDescription>
                    </div>
                    <Button onClick={() => setShowCreateForm(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Form
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {templatesLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !templates || templates.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                      <p className="text-lg font-medium text-muted-foreground">No forms yet</p>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">
                        Create your first form to start collecting submissions
                      </p>
                      <Button onClick={() => setShowCreateForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Form
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {templates.map((template) => (
                        <div
                          key={template.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold">{template.name}</h3>
                            <p className="text-sm text-muted-foreground">{template.title}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>{template.field_count} fields</span>
                              <span>•</span>
                              <span>{template.submission_count} submissions</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/forms/${template.id}/submissions`)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Submissions
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </FormBuilderPaywall>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            {/* Page Customization Settings (Premium) */}
            <BusinessPageSettings business={business} />

            {/* Custom Subdomain Settings */}
            <BusinessSubdomainSettings business={business} />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  )
}
