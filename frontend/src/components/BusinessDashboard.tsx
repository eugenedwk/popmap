import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { businessesApi, formsApi } from '../services/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, Plus, FileText, Eye } from 'lucide-react'
import { BusinessSubdomainSettings } from './BusinessSubdomainSettings'
import { FormTemplateBuilder } from './FormTemplateBuilder'

/**
 * Example Business Dashboard component that demonstrates how to integrate
 * the custom subdomain settings.
 *
 * This component shows:
 * - How to fetch business data
 * - How to organize business settings in tabs
 * - How to integrate the BusinessSubdomainSettings component
 *
 * You can customize this component or integrate the subdomain settings
 * into your existing business dashboard/settings page.
 */
export function BusinessDashboard() {
  const navigate = useNavigate()
  const { businessId: businessIdParam } = useParams<{ businessId: string }>()
  const businessId = businessIdParam ? parseInt(businessIdParam, 10) : null
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { data: business, isLoading, error } = useQuery({
    queryKey: ['business', businessId],
    queryFn: async () => {
      if (!businessId) throw new Error('Business ID is required')
      const response = await businessesApi.getById(businessId)
      return response.data
    },
    enabled: !!businessId,
  })

  // Fetch form templates for this business
  const { data: templates, isLoading: templatesLoading, refetch: refetchTemplates } = useQuery({
    queryKey: ['form-templates', businessId],
    queryFn: async () => {
      const response = await formsApi.getTemplates()
      return response.data.filter(t => t.business === businessId)
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

  return (
    <ScrollArea className="h-full">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{business.name}</h1>
          <p className="text-muted-foreground">Manage your business settings</p>
        </div>

        <div className="space-y-6">
          {/* Form Templates Management */}
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
                          <span>{template.fields.length} fields</span>
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

          {/* Custom Subdomain Settings */}
          <BusinessSubdomainSettings business={business} />

          {/* Add other business settings sections here */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Manage your business information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Add your existing business settings form here
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ScrollArea>
  )
}
