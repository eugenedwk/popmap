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
  available_for_hire: boolean
  logo?: string
  categories: Category[]
  custom_subdomain?: string | null
  can_use_custom_subdomain: boolean
  subdomain_url?: string | null
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

// Event types
export interface Event {
  id: number
  title: string
  description: string
  address: string
  latitude: string
  longitude: string
  start_datetime: string
  end_datetime: string
  image?: string
  cta_button_text?: string
  cta_button_url?: string
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
  user: number
  user_email: string
  user_name: string
  status: 'interested' | 'going'
  created_at: string
  updated_at: string
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
  address: string
  latitude: string
  longitude: string
  start_datetime: string
  end_datetime: string
  business_ids: number[]
  image?: File
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
