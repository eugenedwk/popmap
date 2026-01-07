import { useState, useMemo, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { eventsApi, businessesApi, formsApi, venuesApi } from '../services/api'
import type { VenueMinimal, PlaceResult } from '../types'
import { AddressAutocomplete } from './AddressAutocomplete'
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
  end_date: z.string().optional(),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  is_multi_day: z.boolean().default(false),
  is_recurring: z.boolean().default(false),
  recurrence_count: z.string().optional(),
  business_ids: z.array(z.number()).min(1, 'Select at least one business'),
  form_template: z.number().optional(),
  image: z.any().optional(),
}).refine((data) => {
  // For single-day events, validate end time is after start time
  if (!data.is_multi_day) {
    return data.end_time > data.start_time
  }
  return true
}, {
  message: 'End time must be after start time',
  path: ['end_time'],
}).refine((data) => {
  // For multi-day events, validate end date is provided and after start date
  if (data.is_multi_day) {
    if (!data.end_date) return false
    return data.end_date >= data.event_date
  }
  return true
}, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
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

interface EventFormContentProps {
  eventId?: number
}

function EventFormContent({ eventId }: EventFormContentProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditMode = !!eventId

  const [selectedBusinesses, setSelectedBusinesses] = useState<number[]>([])
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)
  const [selectedPlace, setSelectedPlace] = useState<{ address: string; latitude: number; longitude: number } | null>(null)
  const [businessSearch, setBusinessSearch] = useState('')
  const [isFormReady, setIsFormReady] = useState(!isEditMode) // Ready immediately for create, wait for data in edit
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null)

  // Fetch existing event data when in edit mode
  const { data: existingEvent, isLoading: eventLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      const response = await eventsApi.getById(eventId!)
      return response.data
    },
    enabled: isEditMode,
  })

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

  // Fetch venues for the first selected business
  const { data: venues } = useQuery({
    queryKey: ['venues', selectedBusinesses[0]],
    queryFn: async () => {
      const response = await venuesApi.getForBusiness(selectedBusinesses[0])
      return response.data
    },
    enabled: selectedBusinesses.length > 0
  })

  const mutation = useMutation({
    mutationFn: (data: any) => isEditMode ? eventsApi.update(eventId!, data) : eventsApi.create(data),
    onSuccess: () => {
      setSubmitStatus('success')
      analytics.trackFormSubmit('event', true)

      // Invalidate relevant queries
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: ['event', eventId] })
      }
      queryClient.invalidateQueries({ queryKey: ['my-events'] })
      queryClient.invalidateQueries({ queryKey: ['events'] })

      if (!isEditMode) {
        form.reset()
        setSelectedBusinesses([])
        setSelectedPlace(null)
        setBusinessSearch('')
        setSelectedVenueId(null)
      }
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
      end_date: '',
      start_time: '',
      end_time: '',
      is_multi_day: false,
      is_recurring: false,
      recurrence_count: '1',
      business_ids: [],
      form_template: undefined,
    },
  })

  // Populate form with existing event data when editing
  useEffect(() => {
    if (existingEvent && isEditMode && !isFormReady) {
      // Parse datetime strings to extract date and time
      const startDate = existingEvent.start_datetime.split('T')[0]
      const startTime = existingEvent.start_datetime.split('T')[1]?.substring(0, 5) || ''
      const endDate = existingEvent.end_datetime.split('T')[0]
      const endTime = existingEvent.end_datetime.split('T')[1]?.substring(0, 5) || ''

      // Check if multi-day event (different dates)
      const isMultiDayEvent = startDate !== endDate

      // Get business IDs from existing event
      const businessIds = existingEvent.businesses?.map((b: any) => b.id) || []

      // Set form values
      form.reset({
        title: existingEvent.title || '',
        description: existingEvent.description || '',
        cta_button_text: existingEvent.cta_button_text || '',
        cta_button_url: existingEvent.cta_button_url || '',
        require_login_for_rsvp: existingEvent.require_login_for_rsvp ?? true,
        address: existingEvent.address || '',
        latitude: existingEvent.latitude?.toString() || '',
        longitude: existingEvent.longitude?.toString() || '',
        event_date: startDate,
        end_date: isMultiDayEvent ? endDate : '',
        start_time: startTime,
        end_time: endTime,
        is_multi_day: isMultiDayEvent,
        is_recurring: false, // Can't edit recurring settings on existing events
        recurrence_count: '1',
        business_ids: businessIds,
        form_template: existingEvent.form_template || undefined,
      })

      // Set selected businesses state
      setSelectedBusinesses(businessIds)

      // Set selected place for display
      if (existingEvent.address && existingEvent.latitude && existingEvent.longitude) {
        setSelectedPlace({
          address: existingEvent.address,
          latitude: parseFloat(existingEvent.latitude),
          longitude: parseFloat(existingEvent.longitude),
        })
      }

      // Set selected venue if event has one
      if (existingEvent.venue?.id) {
        setSelectedVenueId(existingEvent.venue.id.toString())
      }

      setIsFormReady(true)
    }
  }, [existingEvent, isEditMode, isFormReady, form])

  // Watch the is_multi_day and is_recurring fields to show/hide options
  const isMultiDay = form.watch('is_multi_day')
  const isRecurring = form.watch('is_recurring')

  // Handle place selection from autocomplete - memoized to prevent listener recreation
  const handlePlaceSelect = useCallback((place) => {
    setSelectedPlace(place)
    form.setValue('address', place.address)
    form.setValue('latitude', place.latitude.toString())
    form.setValue('longitude', place.longitude.toString())
    // Clear venue selection when manually selecting a place
    setSelectedVenueId(null)
    // Trigger validation
    form.trigger(['address', 'latitude', 'longitude'])
  }, [form])

  // Handle venue selection - auto-populate location fields
  const handleVenueSelect = useCallback((venueId: string) => {
    if (venueId === 'none') {
      setSelectedVenueId(null)
      // Don't clear the address fields - let user keep current selection
      return
    }

    setSelectedVenueId(venueId)
    const venue = venues?.find((v: VenueMinimal) => v.id.toString() === venueId)
    if (venue) {
      const place = {
        address: venue.address,
        latitude: parseFloat(venue.latitude),
        longitude: parseFloat(venue.longitude)
      }
      setSelectedPlace(place)
      form.setValue('address', venue.address)
      form.setValue('latitude', venue.latitude)
      form.setValue('longitude', venue.longitude)
      form.trigger(['address', 'latitude', 'longitude'])
    }
  }, [venues, form])

  const onSubmit = (data) => {
    setSubmitStatus(null)

    // Combine date and time into datetime strings
    // For multi-day events, use end_date; otherwise use event_date
    const start_datetime = `${data.event_date}T${data.start_time}`
    const endDate = data.is_multi_day ? data.end_date : data.event_date
    const end_datetime = `${endDate}T${data.end_time}`

    const formData = {
      title: data.title,
      description: data.description,
      cta_button_text: data.cta_button_text,
      cta_button_url: data.cta_button_url,
      require_login_for_rsvp: data.require_login_for_rsvp,
      venue_id: selectedVenueId ? parseInt(selectedVenueId) : null,
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

  if (businessesLoading || (isEditMode && (eventLoading || !isFormReady))) {
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
          <CardTitle className="text-2xl">{isEditMode ? 'Edit Event' : 'Submit a Popup Event'}</CardTitle>
          <CardDescription>
            {isEditMode
              ? 'Update your event details below.'
              : 'Submit your popup event for review. Once approved, it will appear on the map.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Success!</h3>
                <p className="text-sm text-green-800">
                  {isEditMode
                    ? 'Your event has been updated successfully.'
                    : "Your event has been submitted for review. We'll notify you once it's approved."}
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

              {/* Venue Selector - only show if venues are available */}
              {venues && venues.length > 0 && (
                <div className="space-y-2">
                  <FormLabel>Select a Saved Venue</FormLabel>
                  <Select
                    value={selectedVenueId || undefined}
                    onValueChange={handleVenueSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a saved venue (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Enter address manually</SelectItem>
                      {venues.map((venue: VenueMinimal) => (
                        <SelectItem key={venue.id} value={venue.id.toString()}>
                          {venue.name} - {venue.address}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select a previously saved venue to auto-fill the location, or enter a new address below.
                  </FormDescription>
                </div>
              )}

              {/* Address Autocomplete */}
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Location *</FormLabel>
                    <FormControl>
                      <AddressAutocomplete
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value)
                          // Clear coordinates and venue selection when user clears the field
                          if (!value) {
                            setSelectedPlace(null)
                            setSelectedVenueId(null)
                            form.setValue('latitude', '')
                            form.setValue('longitude', '')
                          }
                        }}
                        onPlaceSelect={(place) => {
                          handlePlaceSelect(place)
                          setSelectedVenueId(null) // Clear venue selection when using autocomplete
                        }}
                        placeholder="Search for an address..."
                      />
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
                name="is_multi_day"
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
                        Multi-day event
                      </FormLabel>
                      <FormDescription>
                        Check this if the event spans multiple days (e.g., a weekend festival)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className={`grid gap-4 ${isMultiDay ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <FormField
                  control={form.control}
                  name="event_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isMultiDay ? 'Start Date *' : 'Event Date *'}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {isMultiDay && (
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date *</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            min={form.watch('event_date')}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isMultiDay ? 'Start Time (first day) *' : 'Start Time *'}</FormLabel>
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
                      <FormLabel>{isMultiDay ? 'End Time (last day) *' : 'End Time *'}</FormLabel>
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
                        Check this if the event repeats weekly{isMultiDay ? ' (each occurrence will span the same number of days)' : ''}
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
                {isEditMode ? 'Update Event' : 'Submit Event for Review'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

// Main EventForm component
function EventForm() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>()
  const eventId = eventIdParam ? parseInt(eventIdParam, 10) : undefined

  return <EventFormContent eventId={eventId} />
}

export default EventForm
