import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { APIProvider } from '@vis.gl/react-google-maps'
import { eventsApi, businessesApi, formsApi } from '../services/api'
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete'
import { analytics } from '../lib/analytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, CheckCircle2, XCircle, MapPin, Search, X } from 'lucide-react'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const eventSchema = z.object({
  title: z.string().min(1, 'Event title is required').max(255),
  description: z.string().optional(),
  cta_button_text: z.string().max(50, 'Button text must be 50 characters or less').optional(),
  cta_button_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  require_login_for_rsvp: z.boolean().default(true),
  address: z.string().min(1, 'Address is required').max(500),
  latitude: z.string().regex(/^-?\d+\.?\d*$/, 'Invalid latitude'),
  longitude: z.string().regex(/^-?\d+\.?\d*$/, 'Invalid longitude'),
  event_date: z.string().min(1, 'Event date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  is_recurring: z.boolean().default(false),
  recurrence_count: z.string().optional(),
  business_ids: z.array(z.number()).min(1, 'Select at least one business'),
  form_template: z.number().optional(),
  image: z.any().optional(),
}).refine((data) => {
  // Validate end time is after start time
  return data.end_time > data.start_time
}, {
  message: 'End time must be after start time',
  path: ['end_time'],
}).refine((data) => {
  // If button text is provided, URL must be provided and vice versa
  const hasText = data.cta_button_text && data.cta_button_text.trim() !== ''
  const hasUrl = data.cta_button_url && data.cta_button_url.trim() !== ''
  return (hasText && hasUrl) || (!hasText && !hasUrl)
}, {
  message: 'Both button text and URL are required if you want to add a call-to-action button',
  path: ['cta_button_url'],
}).refine((data) => {
  // If recurring, must select recurrence count
  if (data.is_recurring && (!data.recurrence_count || data.recurrence_count === '1')) {
    return false
  }
  return true
}, {
  message: 'Please select how many times the event repeats',
  path: ['recurrence_count'],
})

function EventFormContent() {
  const [selectedBusinesses, setSelectedBusinesses] = useState([])
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error' | null
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [businessSearch, setBusinessSearch] = useState('')

  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: async () => {
      const response = await businessesApi.getAll()
      return response.data.results || response.data
    },
  })

  // Fetch form templates for selected businesses
  const { data: formTemplates } = useQuery({
    queryKey: ['form-templates', selectedBusinesses],
    queryFn: async () => {
      if (selectedBusinesses.length === 0) return []
      const response = await formsApi.getTemplates()
      // Filter templates that belong to selected businesses
      return response.data.filter(t => selectedBusinesses.includes(t.business))
    },
    enabled: selectedBusinesses.length > 0
  })

  const mutation = useMutation({
    mutationFn: (data) => eventsApi.create(data),
    onSuccess: () => {
      setSubmitStatus('success')
      analytics.trackFormSubmit('event', true)
      form.reset()
      setSelectedBusinesses([])
      setSelectedPlace(null)
      setBusinessSearch('')
    },
    onError: () => {
      setSubmitStatus('error')
      analytics.trackFormSubmit('event', false)
    },
  })

  const form = useForm({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      description: '',
      cta_button_text: '',
      cta_button_url: '',
      require_login_for_rsvp: true,
      address: '',
      latitude: '',
      longitude: '',
      event_date: '',
      start_time: '',
      end_time: '',
      is_recurring: false,
      recurrence_count: '1',
      business_ids: [],
      form_template: undefined,
    },
  })

  // Watch the is_recurring field to show/hide recurrence options
  const isRecurring = form.watch('is_recurring')

  // Handle place selection from autocomplete
  const handlePlaceSelect = (place) => {
    setSelectedPlace(place)
    form.setValue('address', place.address)
    form.setValue('latitude', place.latitude.toString())
    form.setValue('longitude', place.longitude.toString())
    // Trigger validation
    form.trigger(['address', 'latitude', 'longitude'])
  }

  const inputRef = usePlacesAutocomplete(handlePlaceSelect)

  const onSubmit = (data) => {
    setSubmitStatus(null)

    // Combine date and time into datetime strings
    const start_datetime = `${data.event_date}T${data.start_time}`
    const end_datetime = `${data.event_date}T${data.end_time}`

    const formData = {
      title: data.title,
      description: data.description,
      cta_button_text: data.cta_button_text,
      cta_button_url: data.cta_button_url,
      require_login_for_rsvp: data.require_login_for_rsvp,
      address: data.address,
      image: data.image?.[0], // Get first file if exists
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
      start_datetime,
      end_datetime,
      business_ids: data.business_ids,
      form_template: data.form_template || null, // Convert undefined to null
      // Include recurrence info for backend to create multiple events
      is_recurring: data.is_recurring,
      recurrence_count: data.is_recurring ? parseInt(data.recurrence_count || '1') : 1,
    }
    mutation.mutate(formData)
  }

  const toggleBusiness = (businessId) => {
    const newSelected = selectedBusinesses.includes(businessId)
      ? selectedBusinesses.filter(id => id !== businessId)
      : [...selectedBusinesses, businessId]

    setSelectedBusinesses(newSelected)
    form.setValue('business_ids', newSelected)
  }

  // Filter businesses based on search query
  const filteredBusinesses = useMemo(() => {
    if (!businesses) return []
    if (!businessSearch) return businesses

    const query = businessSearch.toLowerCase()
    return businesses.filter(business =>
      business.name.toLowerCase().includes(query) ||
      business.description?.toLowerCase().includes(query) ||
      business.categories?.some(cat => cat.name.toLowerCase().includes(query))
    )
  }, [businesses, businessSearch])

  // Get selected business objects for display
  const selectedBusinessObjects = useMemo(() => {
    if (!businesses) return []
    return businesses.filter(b => selectedBusinesses.includes(b.id))
  }, [businesses, selectedBusinesses])

  if (businessesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Submit a Popup Event</CardTitle>
          <CardDescription>
            Submit your popup event for review. Once approved, it will appear on the map.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Success!</h3>
                <p className="text-sm text-green-800">
                  Your event has been submitted for review. We'll notify you once it's approved.
                </p>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900">Error</h3>
                <p className="text-sm text-red-800">
                  There was an error submitting your event. Please check all fields and try again.
                </p>
              </div>
            </div>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Title *</FormLabel>
                    <FormControl>
                      <Input placeholder="Summer Popup Market" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your popup event... (optional)"
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional - Add details about your event</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cta_button_text"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Call-to-Action Button Text</FormLabel>
                      <FormControl>
                        <Input placeholder="Buy Tickets" {...field} />
                      </FormControl>
                      <FormDescription>Optional (max 50 characters)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cta_button_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Call-to-Action Button URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://tickets.example.com" {...field} />
                      </FormControl>
                      <FormDescription>Optional</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="business_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>Participating Businesses *</FormLabel>
                    <FormDescription>Search and select all businesses participating in this event</FormDescription>

                    {/* Selected businesses display */}
                    {selectedBusinessObjects.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 p-3 border rounded-md bg-muted/30">
                        {selectedBusinessObjects.map((business) => (
                          <Badge
                            key={business.id}
                            variant="default"
                            className="cursor-pointer hover:opacity-80"
                          >
                            {business.name}
                            <X
                              className="ml-1 h-3 w-3"
                              onClick={() => toggleBusiness(business.id)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Search input */}
                    <div className="relative mt-2">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search businesses by name or category..."
                        value={businessSearch}
                        onChange={(e) => setBusinessSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Filtered businesses list */}
                    <ScrollArea className="h-[200px] mt-2 border rounded-md">
                      <div className="p-2">
                        {filteredBusinesses.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {businessSearch ? 'No businesses found matching your search' : 'No businesses available'}
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {filteredBusinesses.map((business) => {
                              const isSelected = selectedBusinesses.includes(business.id)
                              return (
                                <div
                                  key={business.id}
                                  onClick={() => toggleBusiness(business.id)}
                                  className={`
                                    flex items-start gap-3 p-2 rounded-md cursor-pointer transition-colors
                                    ${isSelected ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'}
                                  `}
                                >
                                  <div className="flex-shrink-0 pt-0.5">
                                    <div className={`
                                      w-4 h-4 rounded border-2 flex items-center justify-center
                                      ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}
                                    `}>
                                      {isSelected && (
                                        <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium">{business.name}</p>
                                    {business.categories && business.categories.length > 0 && (
                                      <div className="flex gap-1 mt-1 flex-wrap">
                                        {business.categories.map((category) => (
                                          <Badge key={category.id} variant="secondary" className="text-xs">
                                            {category.name}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Address Autocomplete */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Location *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          ref={inputRef}
                          placeholder="Search for an address..."
                          className="pl-9"
                          onChange={(e) => {
                            field.onChange(e)
                            // Clear coordinates when user manually types
                            if (!e.target.value) {
                              setSelectedPlace(null)
                              form.setValue('latitude', '')
                              form.setValue('longitude', '')
                            }
                          }}
                          value={field.value}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Start typing to search for an address. The location will be automatically geocoded.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Display selected coordinates */}
              {selectedPlace && (
                <div className="rounded-lg bg-muted p-3 text-sm">
                  <p className="font-medium text-muted-foreground mb-1">Selected Location:</p>
                  <p className="text-foreground">{selectedPlace.address}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Coordinates: {selectedPlace.latitude.toFixed(6)}, {selectedPlace.longitude.toFixed(6)}
                  </p>
                </div>
              )}

              {/* Hidden fields for latitude and longitude */}
              <input type="hidden" {...form.register('latitude')} />
              <input type="hidden" {...form.register('longitude')} />

              <FormField
                control={form.control}
                name="event_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time *</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="is_recurring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Recurring event
                      </FormLabel>
                      <FormDescription>
                        Check this if the event repeats weekly
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              {isRecurring && (
                <FormField
                  control={form.control}
                  name="recurrence_count"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Repeat for how many weeks? *</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select number of weeks" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="2">2 weeks</SelectItem>
                          <SelectItem value="3">3 weeks</SelectItem>
                          <SelectItem value="4">4 weeks</SelectItem>
                          <SelectItem value="6">6 weeks</SelectItem>
                          <SelectItem value="8">8 weeks</SelectItem>
                          <SelectItem value="12">12 weeks</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        This will create {field.value || '...'} separate events, one for each week
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="form_template"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attach Form (Optional)</FormLabel>
                    <Select
                      value={field.value?.toString()}
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a form template" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No form</SelectItem>
                        {formTemplates && formTemplates.length > 0 ? (
                          formTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.name} - {template.business_name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="no-templates" disabled>
                            No forms available for selected businesses
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select a form to collect information from attendees
                      {selectedBusinesses.length === 0 && ' (select a business first)'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="require_login_for_rsvp"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Require login to RSVP
                      </FormLabel>
                      <FormDescription>
                        If unchecked, anyone can RSVP with just an email address (reduces friction for attendees)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Event Image</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onChange(e.target.files)}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Upload an image for your event (optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Event for Review
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

// Wrapper component that provides Google Maps API
function EventForm() {
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Configuration Required</CardTitle>
            <CardDescription>
              Please add your Google Maps API key to the .env file:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <code className="block p-2 bg-muted text-sm rounded">
              VITE_GOOGLE_MAPS_API_KEY=your-key-here
            </code>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <EventFormContent />
    </APIProvider>
  )
}

export default EventForm
