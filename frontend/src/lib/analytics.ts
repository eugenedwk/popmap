import ReactGA from 'react-ga4'

// Use environment variable if provided, otherwise use the default measurement ID
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID || 'G-8DEDRQ8XW4'

export function initializeGA() {
  if (GA_MEASUREMENT_ID && typeof window !== 'undefined') {
    ReactGA.initialize(GA_MEASUREMENT_ID)
  }
}

export function trackPageView(path: string) {
  if (GA_MEASUREMENT_ID && typeof window !== 'undefined') {
    // Track page view for GA4
    ReactGA.gtag('config', GA_MEASUREMENT_ID, {
      page_path: path,
    })
  }
}

export function trackEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (GA_MEASUREMENT_ID && typeof window !== 'undefined') {
    ReactGA.event({
      action,
      category,
      label,
      value,
    })
  }
}

// Specific event tracking functions for common actions
export const analytics = {
  // View changes
  trackViewChange: (view: string) => {
    trackEvent('view_change', 'navigation', view)
  },

  // Business interactions
  trackBusinessClick: (businessId: number, businessName?: string) => {
    trackEvent('business_click', 'engagement', businessName || `business_${businessId}`, businessId)
  },

  // Navigation
  trackHomeClick: () => {
    trackEvent('home_click', 'navigation', 'logo')
  },

  // Form submissions
  trackFormSubmit: (formType: 'business' | 'event', success: boolean) => {
    trackEvent(
      'form_submit',
      'form',
      formType,
      success ? 1 : 0
    )
  },

  // Form views
  trackFormView: (formType: 'business' | 'event') => {
    trackEvent('form_view', 'form', formType)
  },
}

