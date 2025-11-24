import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { businessesApi, categoriesApi } from '../services/api'
import type { Business } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle, Building2 } from 'lucide-react'

const businessSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(255),
  description: z.string().optional(),
  contact_email: z.string().email('Invalid email address').optional().or(z.literal('')),
  contact_phone: z.string().optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  instagram_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  tiktok_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  available_for_hire: z.boolean().default(false),
  category_ids: z.array(z.number()).optional(),
  logo: z.any().optional(),
})

interface BusinessEditFormProps {
  business: Business
  onSuccess?: () => void
}

export function BusinessEditForm({ business, onSuccess }: BusinessEditFormProps) {
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)
  const queryClient = useQueryClient()

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesApi.getAll()
      return response.data
    },
  })

  const mutation = useMutation({
    mutationFn: (data: Partial<Business>) => businessesApi.update(business.id, data),
    onSuccess: () => {
      setSubmitStatus('success')
      queryClient.invalidateQueries({ queryKey: ['business', business.id] })
      queryClient.invalidateQueries({ queryKey: ['my-businesses'] })
      if (onSuccess) {
        onSuccess()
      }
    },
    onError: () => {
      setSubmitStatus('error')
    },
  })

  const form = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: business.name,
      description: business.description || '',
      contact_email: business.contact_email || '',
      contact_phone: business.contact_phone || '',
      website: business.website || '',
      instagram_url: business.instagram_url || '',
      tiktok_url: business.tiktok_url || '',
      available_for_hire: business.available_for_hire || false,
      category_ids: business.categories.map(c => c.id),
    },
  })

  const onSubmit = (data: any) => {
    setSubmitStatus(null)
    const updateData: any = { ...data }

    // Remove logo if not changed
    if (!data.logo?.[0]) {
      delete updateData.logo
    } else {
      updateData.logo = data.logo[0]
    }

    mutation.mutate(updateData)
  }

  if (categoriesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Edit Business Profile
        </CardTitle>
        <CardDescription>
          Update your business information and settings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submitStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900">Success!</h3>
              <p className="text-sm text-green-800">
                Your business profile has been updated successfully.
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
                There was an error updating your profile. Please try again.
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Business" {...field} />
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
                      placeholder="Tell customers about your business..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Optional - Describe what you offer</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@business.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input placeholder="https://yourbusiness.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="instagram_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instagram URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://instagram.com/yourbusiness" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tiktok_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TikTok URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://tiktok.com/@yourbusiness" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Categories</FormLabel>
                  <FormDescription>Select all categories that apply to your business</FormDescription>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {categories?.map((category) => (
                      <FormField
                        key={category.id}
                        control={form.control}
                        name="category_ids"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={category.id}
                              className="flex items-center space-x-0"
                            >
                              <FormControl>
                                <Badge
                                  variant={field.value?.includes(category.id) ? 'default' : 'outline'}
                                  className="cursor-pointer hover:opacity-80"
                                  onClick={() => {
                                    const currentValue = field.value || []
                                    const newValue = currentValue.includes(category.id)
                                      ? currentValue.filter((id) => id !== category.id)
                                      : [...currentValue, category.id]
                                    field.onChange(newValue)
                                  }}
                                >
                                  {category.name}
                                </Badge>
                              </FormControl>
                            </FormItem>
                          )
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="available_for_hire"
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
                      Available for Hire
                    </FormLabel>
                    <FormDescription>
                      Check this if you're open to catering requests and event bookings
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="logo"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Business Logo</FormLabel>
                  {business.logo && (
                    <div className="mb-2">
                      <p className="text-sm text-muted-foreground mb-2">Current logo:</p>
                      <img src={business.logo} alt="Current logo" className="h-20 w-20 object-cover rounded" />
                    </div>
                  )}
                  <FormControl>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => onChange(e.target.files)}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Upload a new logo (optional)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
              {onSuccess && (
                <Button type="button" variant="outline" onClick={onSuccess}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
