import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useQuery, useMutation } from '@tanstack/react-query'
import { businessesApi, categoriesApi } from '../services/api'
import { analytics } from '../lib/analytics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

const businessSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(255),
  description: z.string().optional(),
  contact_email: z.string().email('Invalid email address'),
  contact_phone: z.string().regex(/^\+?1?\d{9,15}$/, 'Phone number must be 9-15 digits').optional().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  instagram_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  tiktok_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  logo: z.any().optional(),
  category_ids: z.array(z.number()).min(1, 'Select at least one category'),
})

function BusinessForm() {
  const [selectedCategories, setSelectedCategories] = useState([])
  const [submitStatus, setSubmitStatus] = useState(null) // 'success' | 'error' | null

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await categoriesApi.getAll()
      return response.data.results || response.data
    },
  })

  const mutation = useMutation({
    mutationFn: (data) => businessesApi.create(data),
    onSuccess: () => {
      setSubmitStatus('success')
      analytics.trackFormSubmit('business', true)
      form.reset()
      setSelectedCategories([])
    },
    onError: () => {
      setSubmitStatus('error')
      analytics.trackFormSubmit('business', false)
    },
  })

  const form = useForm({
    resolver: zodResolver(businessSchema),
    defaultValues: {
      name: '',
      description: '',
      contact_email: '',
      contact_phone: '',
      website: '',
      instagram_url: '',
      tiktok_url: '',
      category_ids: [],
    },
  })

  const onSubmit = (data) => {
    setSubmitStatus(null)
    const formData = {
      ...data,
      logo: data.logo?.[0], // Get first file if exists
    }
    mutation.mutate(formData)
  }

  const toggleCategory = (categoryId) => {
    const newSelected = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId]

    setSelectedCategories(newSelected)
    form.setValue('category_ids', newSelected)
  }

  if (categoriesLoading) {
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
          <CardTitle className="text-2xl">Register Your Business</CardTitle>
          <CardDescription>
            Submit your business for review. Once approved, you'll be able to create popup events.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {submitStatus === 'success' && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-green-900">Success!</h3>
                <p className="text-sm text-green-800">
                  Your business has been submitted for review. We'll contact you at the email provided.
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
                  There was an error submitting your business. Please try again.
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
                      <Input placeholder="Your Business Name" {...field} />
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
                        placeholder="Tell us about your business... (optional)"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Optional - Share details about your business</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>Categories *</FormLabel>
                    <FormDescription>Select all categories that apply to your business</FormDescription>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {categories?.map((category) => (
                        <Badge
                          key={category.id}
                          variant={selectedCategories.includes(category.id) ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80"
                          onClick={() => toggleCategory(category.id)}
                        >
                          {category.name}
                        </Badge>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@yourbusiness.com" {...field} />
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
                      <Input placeholder="+1234567890" {...field} />
                    </FormControl>
                    <FormDescription>Format: +1234567890 (9-15 digits)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

              <FormField
                control={form.control}
                name="logo"
                render={({ field: { onChange, value, ...field } }) => (
                  <FormItem>
                    <FormLabel>Business Logo</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => onChange(e.target.files)}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>Upload your business logo (optional)</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Business Registration
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

export default BusinessForm
