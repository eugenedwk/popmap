import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { eventsApi, businessesApi } from '../services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

const eventSchema = z.object({
  title: z.string().min(1, 'Event title is required').max(255),
  description: z.string().min(20, 'Description must be at least 20 characters'),
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

function EventForm() {
  const [selectedBusinesses, setSelectedBusinesses] = useState([])
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error' | null

  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: async () => {
      const response = await businessesApi.getAll()
      return response.data
    },
  })

  const mutation = useMutation({
    mutationFn: (data) => eventsApi.create(data),
    onSuccess: () => {
      setSubmitStatus('success')
      form.reset()
      setSelectedBusinesses([])
    },
    onError: () => {
      setSubmitStatus('error')
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

  const fillDCCoordinates = () => {
    form.setValue('latitude', '38.9072')
    form.setValue('longitude', '-77.0369')
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
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your popup event..."
                        className="min-h-[120px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Minimum 20 characters</FormDescription>
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

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address *</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main St, Washington, DC 20001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="latitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Latitude *</FormLabel>
                      <FormControl>
                        <Input placeholder="38.9072" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="longitude"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Longitude *</FormLabel>
                      <FormControl>
                        <Input placeholder="-77.0369" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={fillDCCoordinates}
                >
                  Use DC Center Coordinates
                </Button>
              </div>

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

export default EventForm
