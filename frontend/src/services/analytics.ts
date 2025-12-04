/**
 * Analytics Tracking Service
 *
 * Lightweight, privacy-friendly analytics for PopMap.
 * Uses anonymous session IDs - no PII is collected.
 */

import axios from 'axios'
import type { PageType, InteractionType } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const ANALYTICS_URL = `${API_BASE_URL}/analytics/track`

// Session ID management - stored in sessionStorage for privacy
const SESSION_KEY = 'popmap_session_id'

function generateSessionId(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY)
  if (!sessionId) {
    sessionId = generateSessionId()
    sessionStorage.setItem(SESSION_KEY, sessionId)
  }
  return sessionId
}

// Device detection
function isMobile(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// Fire-and-forget tracking (non-blocking)
async function sendTracking(endpoint: string, data: Record<string, unknown>): Promise<void> {
  try {
    // Use fetch with keepalive for reliability on page unload
    await fetch(`${ANALYTICS_URL}/${endpoint}/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      keepalive: true,
    })
  } catch (error) {
    // Silently fail - analytics should never break the app
    console.debug('Analytics tracking failed:', error)
  }
}

/**
 * Track a page view
 * Call this when a user visits an event or business page
 */
export function trackPageView(pageType: PageType, objectId: number): void {
  sendTracking('pageview', {
    page_type: pageType,
    object_id: objectId,
    session_id: getSessionId(),
    referrer: document.referrer || '',
    user_agent: navigator.userAgent,
    is_mobile: isMobile(),
  })
}

/**
 * Track a user interaction
 * Call this when a user clicks CTA, shares, RSVPs, etc.
 */
export function trackInteraction(
  interactionType: InteractionType,
  pageType: PageType,
  objectId: number,
  metadata?: Record<string, unknown>
): void {
  sendTracking('interaction', {
    interaction_type: interactionType,
    page_type: pageType,
    object_id: objectId,
    session_id: getSessionId(),
    metadata: metadata || {},
  })
}

// Convenience functions for common interactions

export function trackCtaClick(pageType: PageType, objectId: number, url: string): void {
  trackInteraction('cta_click', pageType, objectId, { url })
}

export function trackShare(
  platform: 'instagram' | 'facebook' | 'twitter' | 'copy_link' | 'native',
  pageType: PageType,
  objectId: number
): void {
  const interactionType = `share_${platform}` as InteractionType
  trackInteraction(interactionType, pageType, objectId)
}

export function trackRsvp(
  status: 'interested' | 'going',
  eventId: number
): void {
  const interactionType = `rsvp_${status}` as InteractionType
  trackInteraction(interactionType, 'event', eventId)
}

export function trackFormOpen(pageType: PageType, objectId: number, formId?: number): void {
  trackInteraction('form_open', pageType, objectId, formId ? { form_id: formId } : undefined)
}

export function trackFormSubmit(pageType: PageType, objectId: number, formId?: number): void {
  trackInteraction('form_submit', pageType, objectId, formId ? { form_id: formId } : undefined)
}

export function trackDirectionsClick(pageType: PageType, objectId: number): void {
  trackInteraction('directions_click', pageType, objectId)
}

export function trackExternalLinkClick(
  linkType: 'website' | 'instagram' | 'tiktok',
  pageType: PageType,
  objectId: number,
  url: string
): void {
  const interactionType = `${linkType}_click` as InteractionType
  trackInteraction(interactionType, pageType, objectId, { url })
}

// React hook for automatic page view tracking
export function usePageViewTracking(pageType: PageType, objectId: number | undefined): void {
  // Track on mount when objectId is available
  if (typeof window !== 'undefined' && objectId) {
    // Use a slight delay to ensure the page has loaded
    setTimeout(() => trackPageView(pageType, objectId), 100)
  }
}
