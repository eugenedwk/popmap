import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a phone number to (XXX) XXX-XXXX format
 * Handles various input formats including:
 * - Numbers with country code (+1)
 * - Numbers with dashes or spaces
 * - Plain digits
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return phone;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Remove leading 1 if present (US country code)
  const cleaned =
    digits.startsWith('1') && digits.length === 11 ? digits.slice(1) : digits;

  // Format as (XXX) XXX-XXXX if we have 10 digits
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(
      6
    )}`;
  }

  // If not 10 digits, return original (might be international format)
  return phone;
}

/**
 * Extracts the domain from a URL
 * Examples:
 * - https://www.example.com → example.com
 * - http://example.com/path → example.com
 * - www.example.com → example.com
 */
export function extractDomain(url: string): string {
  if (!url) return url;

  try {
    // Add protocol if missing for URL parsing
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(urlWithProtocol);
    let domain = urlObj.hostname;

    // Remove www. prefix if present
    if (domain.startsWith('www.')) {
      domain = domain.slice(4);
    }

    return domain;
  } catch {
    // If URL parsing fails, try to extract domain manually
    const cleaned = url
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0];
    return cleaned;
  }
}

/**
 * Extracts the username from an Instagram URL
 * Examples:
 * - https://instagram.com/username → @username
 * - https://www.instagram.com/username/ → @username
 * - instagram.com/username → @username
 */
export function extractInstagramUsername(url: string): string {
  if (!url) return url;

  try {
    // Add protocol if missing for URL parsing
    const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(urlWithProtocol);
    const pathname = urlObj.pathname;

    // Extract username from path (remove leading / and trailing /)
    const username = pathname
      .replace(/^\//, '')
      .replace(/\/$/, '')
      .split('/')[0];

    return username ? `@${username}` : url;
  } catch {
    // If URL parsing fails, try to extract manually
    const match = url.match(/(?:instagram\.com\/|@)([^\/\?]+)/i);
    if (match && match[1]) {
      return `@${match[1]}`;
    }
    return url;
  }
}
