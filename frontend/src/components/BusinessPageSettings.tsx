import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { businessesApi } from '../services/api'
import type { Business } from '../types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Palette, Image, Layout, Crown, AlertTriangle } from 'lucide-react'

const customizationSchema = z.object({
  background_image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  default_view_mode: z.enum(['map', 'list', 'card']),
  custom_primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color like #FF5733').optional().or(z.literal('')),
  show_upcoming_events_first: z.boolean()
})

interface BusinessPageSettingsProps {
  business: Business
  onSuccess?: () => void
}

export function BusinessPageSettings({ business, onSuccess }: BusinessPageSettingsProps) {
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)
  const queryClient = useQueryClient()

  const form = useForm({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      background_image_url: business.background_image_url || '',
      default_view_mode: business.default_view_mode || 'card',
      custom_primary_color: business.custom_primary_color || '',
      show_upcoming_events_first: business.show_upcoming_events_first ?? true
    }
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await businessesApi.update(business.id, data)
      return response.data
    },
    onSuccess: (updatedBusiness) => {
      queryClient.setQueryData(['business', business.id], updatedBusiness)
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      setSubmitStatus('success')
      if (onSuccess) onSuccess()
    },
    onError: (error: any) => {
      console.error('Update failed:', error)
      setSubmitStatus('error')
    }
  })

  const onSubmit = (data: any) => {
    setSubmitStatus(null)
    mutation.mutate(data)
  }

  // Check if user has premium subscription
  if (!business.can_use_premium_customization) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <CardTitle>Premium Customization</CardTitle>
          </div>
          <CardDescription>
            Customize your business page appearance with premium features
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Premium Feature</AlertTitle>
            <AlertDescription className="mt-2">
              Business page customization is a premium feature. Upgrade your subscription to:
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>Add custom background images</li>
                <li>Choose your default view mode</li>
                <li>Customize your brand colors</li>
                <li>Control event display order</li>
              </ul>
              <Button className="mt-4" onClick={() => window.location.href = '/billing'}>
                Upgrade to Premium
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Page Customization</CardTitle>
            </div>
            <CardDescription>
              Customize how your business page appears to visitors
            </CardDescription>
          </div>
          <Badge variant="default" className="bg-amber-500">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Background Image */}
            <FormField
              control={form.control}
              name="background_image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Background Image URL
                    </div>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/background.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Enter a URL for your custom background image (recommended size: 1920x1080)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Default View Mode */}
            <FormField
              control={form.control}
              name="default_view_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <div className="flex items-center gap-2">
                      <Layout className="h-4 w-4" />
                      Default View Mode
                    </div>
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a default view" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="card">Card View</SelectItem>
                      <SelectItem value="list">List View</SelectItem>
                      <SelectItem value="map">Map View</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose how events are displayed by default on your page
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Primary Color */}
            <FormField
              control={form.control}
              name="custom_primary_color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Custom Primary Color
                    </div>
                  </FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="#FF5733"
                        {...field}
                        className="flex-1"
                      />
                    </FormControl>
                    <input
                      type="color"
                      value={field.value || '#000000'}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-12 h-10 rounded border cursor-pointer"
                    />
                  </div>
                  <FormDescription>
                    Choose a custom color for buttons and accents (hex format)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Event Order */}
            <FormField
              control={form.control}
              name="show_upcoming_events_first"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Show Upcoming Events First
                    </FormLabel>
                    <FormDescription>
                      Display upcoming events before past events on your page
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Status Messages */}
            {submitStatus === 'success' && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription>
                  Your customization settings have been saved successfully!
                </AlertDescription>
              </Alert>
            )}

            {submitStatus === 'error' && (
              <Alert variant="destructive">
                <AlertDescription>
                  Failed to save settings. Please try again.
                </AlertDescription>
              </Alert>
            )}

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Customization
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