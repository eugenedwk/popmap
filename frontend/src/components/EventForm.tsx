import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { APIProvider } from '@vis.gl/react-google-maps'
import { eventsApi, businessesApi } from '../services/api'
import { usePlacesAutocomplete } from '../hooks/usePlacesAutocomplete'
import { analytics } from '../lib/analytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, MapPin } from 'lucide-react'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

const eventSchema = z.object({
  title: z.string().min(1, 'Event title is required').max(255),
  description: z.string().optional(),
  address: z.string().min(1, 'Address is required').max(500),
  latitude: z.string().regex(/^-?\d+\.?\d*$/, 'Invalid latitude'),
  longitude: z.string().regex(/^-?\d+\.?\d*$/, 'Invalid longitude'),
  start_datetime: z.string().min(1, 'Start date and time is required'),
  end_datetime: z.string().min(1, 'End date and time is required'),
  business_ids: z.array(z.number()).min(1, 'Select at least one business'),
  image: z.any().optional(),
}).refine((data) => {
  const start = new Date(data.start_datetime)
  const end = new Date(data.end_datetime)
  return end > start
}, {
  message: 'End date must be after start date',
  path: ['end_datetime'],
})

function EventFormContent() {
  const [selectedBusinesses, setSelectedBusinesses] = useState([])
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error' | null
  const [selectedPlace, setSelectedPlace] = useState(null)

  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: async () => {
      const response = await businessesApi.getAll()
      return response.data.results || response.data
    },
  })

  const mutation = useMutation({
    mutationFn: (data) => eventsApi.create(data),
    onSuccess: () => {
      setSubmitStatus('success')
      analytics.trackFormSubmit('event', true)
      form.reset()
      setSelectedBusinesses([])
      setSelectedPlace(null)
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
      address: '',
      latitude: '',
      longitude: '',
      start_datetime: '',
      end_datetime: '',
      business_ids: [],
    },
  })

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
    const formData = {
      ...data,
      image: data.image?.[0], // Get first file if exists
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
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

              <FormField
                control={form.control}
                name="business_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>Participating Businesses *</FormLabel>
                    <FormDescription>Select all businesses participating in this event</FormDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {businesses?.map((business) => (
                        <Badge
                          key={business.id}
                          variant={selectedBusinesses.includes(business.id) ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80"
                          onClick={() => toggleBusiness(business.id)}
                        >
                          {business.name}
                        </Badge>
                      ))}
                    </div>
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

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_datetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date & Time *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="end_datetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date & Time *</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

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
