// Category types
export interface Category {
  id: number
  name: string
  slug: string
}

// Business types
export interface Business {
  id: number
  name: string
  description: string
  contact_email: string
  contact_phone?: string
  website?: string
  instagram_url?: string
  tiktok_url?: string
  instagram_handle?: string | null
  available_for_hire: boolean
  logo?: string
  categories: Category[]
  custom_subdomain?: string | null
  can_use_custom_subdomain: boolean
  can_use_premium_customization: boolean
  can_use_form_builder: boolean
  subdomain_url?: string | null
  active_form_template?: FormTemplate | null
  active_form_template_id?: number | null
  // Background options
  background_image?: string
  background_image_url?: string
  background_color?: string
  background_overlay_opacity?: number
  // Branding colors
  custom_primary_color?: string
  secondary_color?: string
  // Header banner
  header_banner?: string
  // Layout options
  default_view_mode?: 'map' | 'list' | 'card'
  hide_contact_info?: boolean
  hide_social_links?: boolean
  // Content display options
  show_upcoming_events_first?: boolean
  hide_past_events?: boolean
  events_per_page?: 6 | 12 | 24
  // Metadata
  is_verified: boolean
  created_at: string
}

// Business for event relationships (minimal)
export interface BusinessMinimal {
  id: number
  name: string
  logo?: string
  categories: Category[]
}

// Venue types
export interface Venue {
  id: number
  business: number
  business_name: string
  name: string
  address: string
  latitude: string
  longitude: string
  created_at: string
  updated_at: string
}

// Venue for dropdowns (minimal)
export interface VenueMinimal {
  id: number
  name: string
  address: string
  latitude: string
  longitude: string
}

// Event types
export interface Event {
  id: number
  title: string
  description: string
  venue?: VenueMinimal | null
  address: string
  latitude: string
  longitude: string
  start_datetime: string
  end_datetime: string
  image?: string
  cta_button_text?: string
  cta_button_url?: string
  require_login_for_rsvp: boolean
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  created_at: string
  updated_at: string
  businesses: BusinessMinimal[]
  business_names: string
  categories: string[]
  user_rsvp_status?: 'interested' | 'going' | null
  rsvp_counts?: {
    interested: number
    going: number
  }
}

// RSVP types
export interface EventRSVP {
  id: number
  event: number
  event_title: string
  user?: number | null
  display_email: string
  display_name: string
  guest_email?: string | null
  guest_name?: string
  is_guest_rsvp: boolean
  status: 'interested' | 'going'
  created_at: string
  updated_at: string
}

// Guest RSVP form data
export interface GuestRSVPFormData {
  guest_email: string
  guest_name?: string
  status: 'interested' | 'going'
  gdpr_consent: boolean
}

// Guest RSVP check response
// Note: status field removed for security (prevents email enumeration)
export interface GuestRSVPCheckResponse {
  has_rsvp: boolean
}

// Form data types
export interface BusinessFormData {
  name: string
  description: string
  contact_email: string
  contact_phone?: string
  website?: string
  instagram_url?: string
  tiktok_url?: string
  available_for_hire?: boolean
  logo?: File
  category_ids: number[]
}

export interface EventFormData {
  title: string
  description: string
  cta_button_text?: string
  cta_button_url?: string
  require_login_for_rsvp?: boolean
  venue_id?: number | null
  address: string
  latitude: string
  longitude: string
  start_datetime: string
  end_datetime: string
  business_ids: number[]
  image?: File
}

export interface VenueFormData {
  business: number
  name: string
  address: string
  latitude: string
  longitude: string
}

// API Response types
export interface ApiResponse<T> {
  message?: string
  data: T
}

// Place autocomplete types
export interface PlaceResult {
  address: string
  latitude: number
  longitude: number
}

// Billing & Subscription types
export interface SubscriptionPlan {
  id: number
  name: string
  slug: string
  plan_type: 'free' | 'starter' | 'professional' | 'enterprise'
  description: string
  price: string
  stripe_price_id: string
  stripe_product_id: string
  max_events_per_month: number
  custom_subdomain_enabled: boolean
  featured_listing: boolean
  analytics_enabled: boolean
  priority_support: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: number
  user: number
  plan: SubscriptionPlan
  stripe_subscription_id: string
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired'
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  canceled_at?: string | null
  trial_start?: string | null
  trial_end?: string | null
  created_at: string
  updated_at: string
}

export interface CreateCheckoutSessionRequest {
  plan_id: number
  success_url: string
  cancel_url: string
}

export interface CheckoutSessionResponse {
  session_id: string
  session_url: string
  publishable_key: string
}

// Form Builder types
export interface FormFieldOption {
  id?: number
  label: string
  value: string
  order: number
}

export interface FormField {
  id?: number
  form_template?: number
  field_type: 'text' | 'dropdown' | 'phone' | 'radio'
  label: string
  placeholder?: string
  help_text?: string
  is_required: boolean
  order: number
  options?: FormFieldOption[]
}

export interface FormTemplate {
  id: number
  business: number
  business_name: string
  name: string
  title: string
  description?: string
  notification_email: string
  send_confirmation_to_submitter: boolean
  confirmation_message?: string
  submit_button_text?: string
  submit_button_icon?: string
  is_active: boolean
  created_at: string
  updated_at: string
  fields: FormField[]
  submission_count: number
  field_count?: number
}

export interface FormResponse {
  id: number
  field: number
  field_label: string
  field_type: string
  value: string
}

export interface FormSubmission {
  id: number
  form_template: number
  form_name: string
  form_title: string
  user?: number
  user_email?: string
  submitter_email: string
  event?: number
  submitted_at: string
  responses: FormResponse[]
  notification_sent: boolean
  confirmation_sent: boolean
}

export interface FormSubmissionRequest {
  submitter_email?: string
  event_id?: number
  responses: Array<{
    field_id: number
    value: string
  }>
}

export interface FormTemplateFormData {
  business: number
  name: string
  title: string
  description?: string
  notification_email: string
  send_confirmation_to_submitter: boolean
  confirmation_message?: string
  submit_button_text?: string
  submit_button_icon?: string
}

// Analytics types
export type PageType = 'event' | 'business'

export type InteractionType =
  | 'cta_click'
  | 'share_instagram'
  | 'share_facebook'
  | 'share_twitter'
  | 'share_copy_link'
  | 'share_native'
  | 'rsvp_interested'
  | 'rsvp_going'
  | 'form_open'
  | 'form_submit'
  | 'directions_click'
  | 'website_click'
  | 'instagram_click'
  | 'tiktok_click'

export interface PageViewData {
  page_type: PageType
  object_id: number
  session_id: string
  referrer: string
  user_agent: string
  is_mobile: boolean
}

export interface InteractionData {
  interaction_type: InteractionType
  page_type: PageType
  object_id: number
  session_id: string
  metadata?: Record<string, unknown>
}

export interface DailyViewData {
  date: string
  views: number
  unique: number
}

export interface ReferrerData {
  source: string
  count: number
}

export interface AnalyticsOverview {
  period_start: string
  period_end: string
  total_views: number
  unique_visitors: number
  views_change_percent: number | null
  mobile_percent: number
  desktop_percent: number
  top_referrers: ReferrerData[]
  total_interactions: number
  cta_clicks: number
  cta_click_rate: number
  share_clicks: number
  rsvp_count: number
  daily_views: DailyViewData[]
}

export interface EventAnalytics {
  event_id: number
  event_title: string
  total_views: number
  unique_visitors: number
  rsvp_interested: number
  rsvp_going: number
  cta_clicks: number
  share_clicks: number
  rsvp_conversion_rate: number
}

export interface EventDetailAnalytics {
  event_id: number
  event_title: string
  period_start: string
  period_end: string
  total_views: number
  unique_visitors: number
  mobile_views: number
  desktop_views: number
  referrers: Record<string, number>
  interactions: Record<string, number>
  daily_views: DailyViewData[]
}

// Notification Preferences types
export interface NotificationPreferences {
  email_notifications_enabled: boolean
  event_reminder_enabled: boolean
}

export interface GuestUnsubscribeResponse {
  message: string
  email: string
}

// Instagram Import types
export interface InstagramImportResult {
  imported: number
  skipped_duplicate: number
  skipped_not_event: number
  skipped_error: number
  draft_ids: number[]
  error?: string
}

export interface InstagramImportHistory {
  instagram_post_id: string
  event_id: number | null
  event_title: string | null
  original_permalink: string
  imported_at: string
}
