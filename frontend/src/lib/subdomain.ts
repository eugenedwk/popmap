/**
 * Subdomain detection and navigation utilities
 */

// Main domains that don't have subdomains
const MAIN_DOMAINS = ['popmap.co', 'localhost', '127.0.0.1']

// Reserved subdomains that shouldn't trigger business lookup
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app']

/**
 * Extracts subdomain from the current hostname
 * Returns null if on main domain or reserved subdomains
 */
export function getSubdomain(): string | null {
  const host = window.location.hostname

  for (const domain of MAIN_DOMAINS) {
    if (host === domain) {
      return null // Main domain, no subdomain
    }
    if (host.endsWith(`.${domain}`)) {
      const subdomain = host.replace(`.${domain}`, '')
      if (RESERVED_SUBDOMAINS.includes(subdomain)) {
        return null // Reserved subdomain
      }
      return subdomain
    }
  }

  return null
}

/**
 * Checks if currently on a custom business subdomain
 */
export function isOnSubdomain(): boolean {
  return getSubdomain() !== null
}

/**
 * Gets the main site URL (www.popmap.co or localhost for dev)
 */
export function getMainSiteUrl(): string {
  const host = window.location.hostname

  // Local development
  if (host === 'localhost' || host === '127.0.0.1') {
    return `${window.location.protocol}//${host}:${window.location.port}`
  }

  // Production - always go to www.popmap.co
  return 'https://www.popmap.co'
}

/**
 * Gets a URL that navigates to the main site
 * If on subdomain, returns full external URL
 * If on main site, returns relative path
 */
export function getMainSiteLink(path: string = '/'): string {
  if (isOnSubdomain()) {
    const baseUrl = getMainSiteUrl()
    return `${baseUrl}${path}`
  }
  return path
}
