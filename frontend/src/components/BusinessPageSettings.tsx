import React, { useState, useRef } from 'react'
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
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Loader2, Palette, Image, Layout, Crown, AlertTriangle,
  Upload, Eye, EyeOff, ListFilter, ImageIcon
} from 'lucide-react'

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/

const customizationSchema = z.object({
  // Background options
  background_image_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  background_color: z.string().regex(hexColorRegex, 'Must be a valid hex color like #1a1a2e').optional().or(z.literal('')),
  background_overlay_opacity: z.number().min(0).max(100),
  // Branding colors
  custom_primary_color: z.string().regex(hexColorRegex, 'Must be a valid hex color like #FF5733').optional().or(z.literal('')),
  secondary_color: z.string().regex(hexColorRegex, 'Must be a valid hex color like #3498db').optional().or(z.literal('')),
  // Layout options
  default_view_mode: z.enum(['map', 'list', 'card']),
  hide_contact_info: z.boolean(),
  hide_social_links: z.boolean(),
  // Content display options
  show_upcoming_events_first: z.boolean(),
  hide_past_events: z.boolean(),
  events_per_page: z.number()
})

interface BusinessPageSettingsProps {
  business: Business
  onSuccess?: () => void
}

export function BusinessPageSettings({ business, onSuccess }: BusinessPageSettingsProps) {
  const [submitStatus, setSubmitStatus] = useState<'success' | 'error' | null>(null)
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null)
  const [headerBannerFile, setHeaderBannerFile] = useState<File | null>(null)
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string | null>(
    business.background_image || null
  )
  const [headerBannerPreview, setHeaderBannerPreview] = useState<string | null>(
    business.header_banner || null
  )
  const backgroundImageInputRef = useRef<HTMLInputElement>(null)
  const headerBannerInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const form = useForm({
    resolver: zodResolver(customizationSchema),
    defaultValues: {
      // Background options
      background_image_url: business.background_image_url || '',
      background_color: business.background_color || '',
      background_overlay_opacity: business.background_overlay_opacity ?? 0,
      // Branding colors
      custom_primary_color: business.custom_primary_color || '',
      secondary_color: business.secondary_color || '',
      // Layout options
      default_view_mode: business.default_view_mode || 'card',
      hide_contact_info: business.hide_contact_info ?? false,
      hide_social_links: business.hide_social_links ?? false,
      // Content display options
      show_upcoming_events_first: business.show_upcoming_events_first ?? true,
      hide_past_events: business.hide_past_events ?? false,
      events_per_page: business.events_per_page ?? 12
    }
  })

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData()

      // Add all form fields
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) {
          formData.append(key, data[key].toString())
        }
      })

      // Add file uploads if present
      if (backgroundImageFile) {
        formData.append('background_image', backgroundImageFile)
      }
      if (headerBannerFile) {
        formData.append('header_banner', headerBannerFile)
      }

      const response = await businessesApi.update(business.id, formData)
      return response.data
    },
    onSuccess: (updatedBusiness) => {
      queryClient.setQueryData(['business', business.id], updatedBusiness)
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      setSubmitStatus('success')
      setBackgroundImageFile(null)
      setHeaderBannerFile(null)
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

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    setPreview: (preview: string | null) => void
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      setFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const clearFile = (
    setFile: (file: File | null) => void,
    setPreview: (preview: string | null) => void,
    inputRef: React.RefObject<HTMLInputElement>
  ) => {
    setFile(null)
    setPreview(null)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
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
                <li>Add custom background images or colors</li>
                <li>Upload a header banner</li>
                <li>Choose your brand colors</li>
                <li>Control page layout and visibility</li>
                <li>Customize event display settings</li>
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
            <Tabs defaultValue="background" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="background">Background</TabsTrigger>
                <TabsTrigger value="branding">Branding</TabsTrigger>
                <TabsTrigger value="layout">Layout</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
              </TabsList>

              {/* Background Tab */}
              <TabsContent value="background" className="space-y-6 mt-6">
                {/* Background Image Upload */}
                <div className="space-y-4">
                  <FormLabel>
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Background Image (Upload)
                    </div>
                  </FormLabel>
                  <div className="flex items-center gap-4">
                    <input
                      ref={backgroundImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setBackgroundImageFile, setBackgroundImagePreview)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => backgroundImageInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Image
                    </Button>
                    {(backgroundImagePreview || backgroundImageFile) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => clearFile(setBackgroundImageFile, setBackgroundImagePreview, backgroundImageInputRef)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {backgroundImagePreview && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border">
                      <img
                        src={backgroundImagePreview}
                        alt="Background preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Upload a custom background image (recommended: 1920x1080)
                  </p>
                </div>

                <Separator />

                {/* Background Image URL */}
                <FormField
                  control={form.control}
                  name="background_image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <div className="flex items-center gap-2">
                          <Image className="h-4 w-4" />
                          Background Image URL (Alternative)
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
                        Or enter a URL for your background image
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Background Color */}
                <FormField
                  control={form.control}
                  name="background_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Background Color
                        </div>
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="#1a1a2e"
                            {...field}
                            className="flex-1"
                          />
                        </FormControl>
                        <input
                          type="color"
                          value={field.value || '#1a1a2e'}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                      </div>
                      <FormDescription>
                        Alternative to background image - solid color background
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Background Overlay Opacity */}
                <FormField
                  control={form.control}
                  name="background_overlay_opacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <div className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Background Overlay Opacity: {field.value}%
                        </div>
                      </FormLabel>
                      <FormControl>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[field.value]}
                          onValueChange={([value]) => field.onChange(value)}
                          className="w-full"
                        />
                      </FormControl>
                      <FormDescription>
                        Add a dark overlay for better text readability (0 = none, 100 = fully dark)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Header Banner */}
                <Separator />
                <div className="space-y-4">
                  <FormLabel>
                    <div className="flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Header Banner
                    </div>
                  </FormLabel>
                  <div className="flex items-center gap-4">
                    <input
                      ref={headerBannerInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, setHeaderBannerFile, setHeaderBannerPreview)}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => headerBannerInputRef.current?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose Banner
                    </Button>
                    {(headerBannerPreview || headerBannerFile) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => clearFile(setHeaderBannerFile, setHeaderBannerPreview, headerBannerInputRef)}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  {headerBannerPreview && (
                    <div className="relative w-full h-24 rounded-lg overflow-hidden border">
                      <img
                        src={headerBannerPreview}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Banner image displayed at the top of your page (recommended: 1200x300)
                  </p>
                </div>
              </TabsContent>

              {/* Branding Tab */}
              <TabsContent value="branding" className="space-y-6 mt-6">
                {/* Primary Color */}
                <FormField
                  control={form.control}
                  name="custom_primary_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Primary Color
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
                        Main brand color for headings and primary elements
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Secondary Color */}
                <FormField
                  control={form.control}
                  name="secondary_color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <div className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Secondary / Accent Color
                        </div>
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input
                            type="text"
                            placeholder="#3498db"
                            {...field}
                            className="flex-1"
                          />
                        </FormControl>
                        <input
                          type="color"
                          value={field.value || '#3498db'}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="w-12 h-10 rounded border cursor-pointer"
                        />
                      </div>
                      <FormDescription>
                        Accent color for buttons, links, and interactive elements
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Color Preview */}
                <div className="p-4 rounded-lg border bg-card">
                  <p className="text-sm font-medium mb-3">Preview</p>
                  <div className="flex gap-4 items-center">
                    <div
                      className="w-16 h-16 rounded-lg border"
                      style={{ backgroundColor: form.watch('custom_primary_color') || '#e5e5e5' }}
                    />
                    <div
                      className="w-16 h-16 rounded-lg border"
                      style={{ backgroundColor: form.watch('secondary_color') || '#e5e5e5' }}
                    />
                    <div className="flex-1">
                      <Button
                        type="button"
                        size="sm"
                        style={{
                          backgroundColor: form.watch('secondary_color') || undefined,
                          borderColor: form.watch('secondary_color') || undefined
                        }}
                      >
                        Sample Button
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Layout Tab */}
              <TabsContent value="layout" className="space-y-6 mt-6">
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

                <Separator />

                {/* Hide Contact Info */}
                <FormField
                  control={form.control}
                  name="hide_contact_info"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          <div className="flex items-center gap-2">
                            <EyeOff className="h-4 w-4" />
                            Hide Contact Information
                          </div>
                        </FormLabel>
                        <FormDescription>
                          Hide email and phone number from your public page
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

                {/* Hide Social Links */}
                <FormField
                  control={form.control}
                  name="hide_social_links"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          <div className="flex items-center gap-2">
                            <EyeOff className="h-4 w-4" />
                            Hide Social Media Links
                          </div>
                        </FormLabel>
                        <FormDescription>
                          Hide Instagram and TikTok links from your public page
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
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content" className="space-y-6 mt-6">
                {/* Show Upcoming Events First */}
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
                          Display upcoming events before past events
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

                {/* Hide Past Events */}
                <FormField
                  control={form.control}
                  name="hide_past_events"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          <div className="flex items-center gap-2">
                            <EyeOff className="h-4 w-4" />
                            Hide Past Events
                          </div>
                        </FormLabel>
                        <FormDescription>
                          Only show upcoming events, hide events that have already happened
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

                {/* Events Per Page */}
                <FormField
                  control={form.control}
                  name="events_per_page"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <div className="flex items-center gap-2">
                          <ListFilter className="h-4 w-4" />
                          Events Per Page
                        </div>
                      </FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select events per page" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="6">6 events</SelectItem>
                          <SelectItem value="12">12 events</SelectItem>
                          <SelectItem value="24">24 events</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How many events to show per page on your business page
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

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
            <div className="flex gap-3 pt-4">
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
