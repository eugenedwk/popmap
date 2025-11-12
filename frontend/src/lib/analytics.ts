// Google Analytics utilities
declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, unknown>
    ) => void
  }
}

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID

/**
 * Initialize Google Analytics
 */
export function initializeGA(): void {
  if (!GA_MEASUREMENT_ID) {
    console.warn('GA_MEASUREMENT_ID not set. Analytics will not be tracked.')
    return
  }

  // Load GA script
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`
  document.head.appendChild(script)

  // Initialize gtag
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    ;(window as any).dataLayer = (window as any).dataLayer || []
    // eslint-disable-next-line prefer-rest-params
    ;(window as any).dataLayer.push(arguments)
  }

  window.gtag('js', new Date())
  window.gtag('config', GA_MEASUREMENT_ID)
}

/**
 * Track page view
 */
export function trackPageView(path: string): void {
  if (!window.gtag) return
  window.gtag('event', 'page_view', {
    page_path: path,
  })
}

/**
 * Track custom event
 */
function trackEvent(eventName: string, parameters?: Record<string, unknown>): void {
  if (!window.gtag) return
  window.gtag('event', eventName, parameters)
}

/**
 * Analytics helper object
 */
export const analytics = {
  /**
   * Track business profile click
   */
  trackBusinessClick(businessId: number): void {
    trackEvent('business_click', {
      business_id: businessId,
    })
  },

  /**
   * Track form view
   */
  trackFormView(formType: 'business' | 'event'): void {
    trackEvent('form_view', {
      form_type: formType,
    })
  },

  /**
   * Track view change
   */
  trackViewChange(view: string): void {
    trackEvent('view_change', {
      view_type: view,
    })
  },

  /**
   * Track home click
   */
  trackHomeClick(): void {
    trackEvent('home_click')
  },

  /**
   * Track form submission
   */
  trackFormSubmit(formType: 'business' | 'event', success: boolean): void {
    trackEvent('form_submit', {
      form_type: formType,
      success: success,
    })
  },
}
