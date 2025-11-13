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
