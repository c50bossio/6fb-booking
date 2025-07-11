/**
 * Booking Link Generator Utility
 * 
 * Comprehensive utility for generating customizable booking links with URL parameters
 * for the 6FB booking system. Supports service pre-selection, barber filtering,
 * date ranges, tracking parameters, and more.
 */

import {
  BookingLinkParams,
  URLGenerationOptions,
  ParsedBookingURL,
  ValidationResult,
  ValidationConstraints,
  EncodingOptions,
  GeneratedLink,
  BookingLinkTemplate,
  URLShortener,
  LinkAnalytics,
  ServiceInfo,
  BarberInfo,
  BookingConstraints,
  ValidationError,
  VALIDATION_CONSTANTS,
  DEFAULT_BOOKING_CONFIG,
  isValidService,
  isValidBarber,
  isValidDate,
  isValidTime,
  isValidEmail,
  isValidPhone,
  isValidTimezone,
} from '../types/booking-links'

// Core BookingLinkGenerator class
export class BookingLinkGenerator {
  private baseUrl: string
  private defaultOptions: URLGenerationOptions
  private urlShortener?: URLShortener
  private services: ServiceInfo[] = []
  private barbers: BarberInfo[] = []

  constructor(
    baseUrl: string = DEFAULT_BOOKING_CONFIG.baseUrl,
    options: Partial<URLGenerationOptions> = {},
    urlShortener?: URLShortener
  ) {
    this.baseUrl = baseUrl
    this.defaultOptions = {
      encode: true,
      shortUrl: false,
      includeDefaults: false,
      omitEmpty: true,
      ...options,
    }
    this.urlShortener = urlShortener
  }

  /**
   * Set available services for validation
   */
  setServices(services: ServiceInfo[]): void {
    this.services = services
  }

  /**
   * Set available barbers for validation
   */
  setBarbers(barbers: BarberInfo[]): void {
    this.barbers = barbers
  }

  /**
   * Generate a booking URL with the provided parameters
   */
  generateURL(
    params: BookingLinkParams,
    options: URLGenerationOptions = {}
  ): string {
    const finalOptions = { ...this.defaultOptions, ...options }
    
    // Validate parameters if validation is enabled
    if (finalOptions.includeDefaults) {
      const validation = this.validateParams(params)
      if (!validation.isValid) {
        console.warn('Invalid parameters detected:', validation.errors)
      }
    }

    // Clean and prepare parameters
    const cleanParams = this.cleanParameters(params, finalOptions)
    
    // Build query string
    const queryString = this.buildQueryString(cleanParams, finalOptions)
    
    // Construct final URL
    const url = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl
    
    return url
  }

  /**
   * Generate a booking URL for a specific organization
   */
  generateOrganizationURL(
    organizationSlug: string,
    params: BookingLinkParams,
    options: URLGenerationOptions = {}
  ): string {
    // Replace {slug} placeholder with actual organization slug
    const orgUrl = this.baseUrl.replace('{slug}', organizationSlug)
    
    // Temporarily override baseUrl for this generation
    const originalBaseUrl = this.baseUrl
    this.baseUrl = orgUrl
    
    const url = this.generateURL(params, options)
    
    // Restore original baseUrl
    this.baseUrl = originalBaseUrl
    
    return url
  }

  /**
   * Generate a complete booking link with metadata
   */
  async generateLink(
    params: BookingLinkParams,
    options: URLGenerationOptions = {}
  ): Promise<GeneratedLink> {
    const url = this.generateURL(params, options)
    let shortUrl: string | undefined
    let qrCode: string | undefined

    // Generate short URL if requested and available
    if (options.shortUrl && this.urlShortener) {
      try {
        shortUrl = await this.urlShortener.shorten(url)
      } catch (error) {
        console.warn('Failed to generate short URL:', error)
      }
    }

    // Generate QR code data URL (always generate for now)
    qrCode = await this.generateQRCode(shortUrl || url)

    return {
      url,
      shortUrl,
      qrCode,
      parameters: params,
      metadata: {
        generatedAt: new Date().toISOString(),
        clickCount: 0,
        conversionRate: 0,
      },
    }
  }

  /**
   * Parse a booking URL and extract parameters
   */
  parseURL(url: string): ParsedBookingURL {
    try {
      const urlObj = new URL(url)
      const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`
      const params = this.parseQueryString(urlObj.search)
      const hash = urlObj.hash ? urlObj.hash.substring(1) : undefined

      const validation = this.validateParams(params)

      return {
        baseUrl,
        params,
        hash,
        isValid: validation.isValid,
        errors: validation.errors,
      }
    } catch (error) {
      return {
        baseUrl: '',
        params: {},
        isValid: false,
        errors: ['Invalid URL format'],
      }
    }
  }

  /**
   * Validate booking parameters
   */
  validateParams(
    params: BookingLinkParams,
    constraints: ValidationConstraints = {}
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Apply default constraints
    const finalConstraints: ValidationConstraints = {
      serviceExists: this.services.length > 0,
      barberExists: this.barbers.length > 0,
      dateInFuture: true,
      validTimeSlots: true,
      businessHours: true,
      maxParameterLength: VALIDATION_CONSTANTS.MAX_PARAMETER_LENGTH,
      ...constraints,
    }

    // Validate required parameters
    if (finalConstraints.required) {
      for (const field of finalConstraints.required) {
        if (!params[field as keyof BookingLinkParams]) {
          errors.push(`Required parameter '${field}' is missing`)
        }
      }
    }

    // Validate service
    if (params.service) {
      if (Array.isArray(params.service)) {
        for (const service of params.service) {
          if (!isValidService(service)) {
            errors.push(`Invalid service: ${service}`)
          } else if (finalConstraints.serviceExists && !this.serviceExists(service)) {
            errors.push(`Service does not exist: ${service}`)
          }
        }
      } else {
        if (!isValidService(params.service)) {
          errors.push(`Invalid service: ${params.service}`)
        } else if (finalConstraints.serviceExists && !this.serviceExists(params.service)) {
          errors.push(`Service does not exist: ${params.service}`)
        }
      }
    }

    // Validate barber
    if (params.barber) {
      if (Array.isArray(params.barber)) {
        for (const barber of params.barber) {
          if (!isValidBarber(barber)) {
            errors.push(`Invalid barber: ${barber}`)
          } else if (finalConstraints.barberExists && !this.barberExists(barber)) {
            errors.push(`Barber does not exist: ${barber}`)
          }
        }
      } else {
        if (!isValidBarber(params.barber)) {
          errors.push(`Invalid barber: ${params.barber}`)
        } else if (finalConstraints.barberExists && !this.barberExists(params.barber)) {
          errors.push(`Barber does not exist: ${params.barber}`)
        }
      }
    }

    // Validate date
    if (params.date) {
      if (!isValidDate(params.date)) {
        errors.push(`Invalid date format: ${params.date}`)
      } else if (finalConstraints.dateInFuture && new Date(params.date) <= new Date()) {
        errors.push(`Date must be in the future: ${params.date}`)
      }
    }

    // Validate date range
    if (params.dateRange) {
      const [start, end] = params.dateRange.split(',')
      if (!start || !end || !isValidDate(start) || !isValidDate(end)) {
        errors.push(`Invalid date range format: ${params.dateRange}`)
      } else if (new Date(start) >= new Date(end)) {
        errors.push(`Start date must be before end date: ${params.dateRange}`)
      }
    }

    // Validate time
    if (params.time && !isValidTime(params.time)) {
      errors.push(`Invalid time format: ${params.time}`)
    }

    // Validate time range
    if (params.timeRange) {
      const [start, end] = params.timeRange.split(',')
      if (!start || !end || !isValidTime(start) || !isValidTime(end)) {
        errors.push(`Invalid time range format: ${params.timeRange}`)
      }
    }

    // Validate email
    if (params.email && !isValidEmail(params.email)) {
      errors.push(`Invalid email format: ${params.email}`)
    }

    // Validate phone
    if (params.phone && !isValidPhone(params.phone)) {
      errors.push(`Invalid phone format: ${params.phone}`)
    }

    // Validate timezone
    if (params.timezone && !isValidTimezone(params.timezone)) {
      errors.push(`Invalid timezone: ${params.timezone}`)
    }

    // Validate parameter lengths
    if (finalConstraints.maxParameterLength) {
      Object.entries(params).forEach(([key, value]) => {
        if (typeof value === 'string' && value.length > finalConstraints.maxParameterLength!) {
          errors.push(`Parameter '${key}' exceeds maximum length`)
        }
      })
    }

    // Validate duration
    if (params.duration && (params.duration < 5 || params.duration > 480)) {
      errors.push(`Duration must be between 5 and 480 minutes`)
    }

    // Validate lead time
    if (params.leadTime && params.leadTime < 0) {
      errors.push(`Lead time cannot be negative`)
    }

    // Add warnings for potentially problematic parameters
    if (params.quickBook && (params.date || params.time)) {
      warnings.push('Quick book is enabled but specific date/time provided')
    }

    if (params.service && params.barber && this.services.length > 0 && this.barbers.length > 0) {
      // Check if barber offers the selected service
      const service = this.services.find(s => s.name === params.service || s.slug === params.service)
      const barber = this.barbers.find(b => b.name === params.barber || b.slug === params.barber)
      
      if (service && barber && !barber.services.includes(service.id)) {
        warnings.push(`Barber '${params.barber}' may not offer service '${params.service}'`)
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Create a booking link template
   */
  createTemplate(
    name: string,
    description: string,
    params: BookingLinkParams,
    category: 'marketing' | 'social' | 'email' | 'general' = 'general'
  ): BookingLinkTemplate {
    return {
      id: this.generateId(),
      name,
      description,
      params,
      isActive: true,
      category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  /**
   * Generate common booking link variations
   */
  generateCommonLinks(baseParams: BookingLinkParams = {}): Record<string, string> {
    const links: Record<string, string> = {}

    // Basic booking link
    links.basic = this.generateURL(baseParams)

    // Quick booking (next available)
    links.quickBook = this.generateURL({
      ...baseParams,
      quickBook: true,
    })

    // Service-specific links
    if (this.services.length > 0) {
      this.services.slice(0, 3).forEach(service => {
        links[`service_${service.slug}`] = this.generateURL({
          ...baseParams,
          service: service.slug,
        })
      })
    }

    // Barber-specific links
    if (this.barbers.length > 0) {
      this.barbers.slice(0, 3).forEach(barber => {
        links[`barber_${barber.slug}`] = this.generateURL({
          ...baseParams,
          barber: barber.slug,
        })
      })
    }

    // Date range links (this week, next week)
    const today = new Date()
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(today.getDate() - today.getDay())
    const thisWeekEnd = new Date(thisWeekStart)
    thisWeekEnd.setDate(thisWeekStart.getDate() + 6)

    links.thisWeek = this.generateURL({
      ...baseParams,
      dateRange: `${this.formatDate(thisWeekStart)},${this.formatDate(thisWeekEnd)}`,
    })

    const nextWeekStart = new Date(thisWeekEnd)
    nextWeekStart.setDate(thisWeekEnd.getDate() + 1)
    const nextWeekEnd = new Date(nextWeekStart)
    nextWeekEnd.setDate(nextWeekStart.getDate() + 6)

    links.nextWeek = this.generateURL({
      ...baseParams,
      dateRange: `${this.formatDate(nextWeekStart)},${this.formatDate(nextWeekEnd)}`,
    })

    return links
  }

  /**
   * Generate marketing campaign links
   */
  generateCampaignLinks(
    campaignName: string,
    baseParams: BookingLinkParams = {}
  ): Record<string, string> {
    const campaignParams = {
      ...baseParams,
      campaign: campaignName,
    }

    return {
      facebook: this.generateURL({
        ...campaignParams,
        utm_source: 'facebook',
        utm_medium: 'social',
      }),
      instagram: this.generateURL({
        ...campaignParams,
        utm_source: 'instagram',
        utm_medium: 'social',
      }),
      google: this.generateURL({
        ...campaignParams,
        utm_source: 'google',
        utm_medium: 'cpc',
      }),
      email: this.generateURL({
        ...campaignParams,
        utm_source: 'email',
        utm_medium: 'email',
      }),
      sms: this.generateURL({
        ...campaignParams,
        utm_source: 'sms',
        utm_medium: 'sms',
      }),
    }
  }

  // Private helper methods

  private cleanParameters(
    params: BookingLinkParams,
    options: URLGenerationOptions
  ): Record<string, string | string[]> {
    const cleaned: Record<string, string | string[]> = {}

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        if (!options.omitEmpty) {
          cleaned[key] = ''
        }
        return
      }

      if (Array.isArray(value)) {
        if (value.length > 0) {
          cleaned[key] = value.map(v => String(v))
        } else if (!options.omitEmpty) {
          cleaned[key] = []
        }
      } else if (typeof value === 'object') {
        // Handle object values by JSON stringifying them
        try {
          const jsonValue = JSON.stringify(value)
          if (jsonValue !== '{}' || !options.omitEmpty) {
            cleaned[key] = jsonValue
          }
        } catch (error) {
          // If JSON stringify fails, convert to string
          const stringValue = String(value)
          if (stringValue !== '' || !options.omitEmpty) {
            cleaned[key] = stringValue
          }
        }
      } else {
        const stringValue = String(value)
        if (stringValue !== '' || !options.omitEmpty) {
          cleaned[key] = stringValue
        }
      }
    })

    return cleaned
  }

  private buildQueryString(
    params: Record<string, string | string[]>,
    options: URLGenerationOptions
  ): string {
    const pairs: string[] = []

    Object.entries(params).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        // Handle array parameters
        const arrayValue = value.join(',')
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(arrayValue)}`)
      } else {
        pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      }
    })

    return pairs.join('&')
  }

  private parseQueryString(queryString: string): BookingLinkParams {
    const params: BookingLinkParams = {}
    
    if (!queryString || queryString === '?') {
      return params
    }

    // Remove leading '?' if present
    const cleanQueryString = queryString.startsWith('?') ? queryString.substring(1) : queryString
    
    // Parse manually for better Jest compatibility
    const pairs = cleanQueryString.split('&')
    
    pairs.forEach(pair => {
      if (!pair) return
      
      const [key, value] = pair.split('=').map(decodeURIComponent)
      if (!key || value === undefined) return
      
      // Handle JSON values first (for custom objects) to avoid splitting on commas inside JSON
      if (key === 'custom' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          (params as any)[key] = JSON.parse(value)
          return
        } catch (error) {
          // If JSON parse fails, treat as string (fall through)
        }
      }

      // Handle comma-separated arrays for specific fields only
      const arrayFields = ['service', 'barber', 'services', 'barbers']
      if (value.includes(',') && arrayFields.includes(key)) {
        const arrayValue = value.split(',').map(v => v.trim()).filter(v => v)
        if (arrayValue.length > 1) {
          (params as any)[key] = arrayValue
          return
        }
        // If only one value after split, treat as single value (fall through)
      }

      // Handle numeric values
      if (key.includes('Id') || key === 'duration' || key === 'leadTime' || key === 'maxAdvance') {
        const numValue = parseInt(value, 10)
        if (!isNaN(numValue)) {
          (params as any)[key] = numValue
          return
        }
      }

      // Handle boolean values
      if (key === 'recurring' || key === 'quickBook') {
        (params as any)[key] = value === 'true'
        return
      }


      // Default to string
      (params as any)[key] = value
    })

    return params
  }

  private serviceExists(serviceName: string): boolean {
    return this.services.some(
      service => service.name === serviceName || service.slug === serviceName
    )
  }

  private barberExists(barberName: string): boolean {
    return this.barbers.some(
      barber => barber.name === barberName || barber.slug === barberName
    )
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0]
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  private async generateQRCode(url: string): Promise<string> {
    // This would integrate with a QR code library
    // For now, return a placeholder
    return `data:image/svg+xml;base64,${btoa(`<svg>QR Code for ${url}</svg>`)}`
  }
}

// Utility functions for direct use without class instantiation

/**
 * Quick URL generation function
 */
export function generateBookingURL(
  params: BookingLinkParams,
  baseUrl: string = DEFAULT_BOOKING_CONFIG.baseUrl
): string {
  const generator = new BookingLinkGenerator(baseUrl)
  return generator.generateURL(params)
}

/**
 * Generate booking URL for a specific organization
 */
export function generateOrganizationBookingURL(
  organizationSlug: string,
  params: BookingLinkParams,
  baseUrl: string = DEFAULT_BOOKING_CONFIG.baseUrl
): string {
  const generator = new BookingLinkGenerator(baseUrl)
  return generator.generateOrganizationURL(organizationSlug, params)
}

/**
 * Parse booking URL parameters
 */
export function parseBookingURL(url: string): ParsedBookingURL {
  const generator = new BookingLinkGenerator()
  return generator.parseURL(url)
}

/**
 * Validate booking parameters
 */
export function validateBookingParams(
  params: BookingLinkParams,
  constraints?: ValidationConstraints
): ValidationResult {
  const generator = new BookingLinkGenerator()
  return generator.validateParams(params, constraints)
}

/**
 * Generate common booking link variations
 */
export function generateCommonBookingLinks(
  baseParams: BookingLinkParams = {},
  baseUrl?: string
): Record<string, string> {
  const generator = new BookingLinkGenerator(baseUrl)
  return generator.generateCommonLinks(baseParams)
}

/**
 * Generate campaign-specific booking links
 */
export function generateCampaignBookingLinks(
  campaignName: string,
  baseParams: BookingLinkParams = {},
  baseUrl?: string
): Record<string, string> {
  const generator = new BookingLinkGenerator(baseUrl)
  return generator.generateCampaignLinks(campaignName, baseParams)
}

/**
 * URL encoding utilities
 */
export const URLEncoder = {
  /**
   * Encode parameters for URL
   */
  encodeParams(params: Record<string, any>): string {
    return Object.entries(params)
      .filter(([_, value]) => value !== null && value !== undefined)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${encodeURIComponent(key)}=${encodeURIComponent(value.join(','))}`
        }
        return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      })
      .join('&')
  },

  /**
   * Decode parameters from URL
   */
  decodeParams(queryString: string): Record<string, any> {
    const params: Record<string, any> = {}
    const searchParams = new URLSearchParams(queryString)
    
    searchParams.forEach((value, key) => {
      if (value.includes(',')) {
        params[key] = value.split(',').map(v => v.trim())
      } else {
        params[key] = value
      }
    })
    
    return params
  },

  /**
   * Sanitize URL parameters
   */
  sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {}
    
    Object.entries(params).forEach(([key, value]) => {
      // Remove potentially dangerous characters
      const cleanKey = key.replace(/[^\w\-_]/g, '')
      
      if (Array.isArray(value)) {
        sanitized[cleanKey] = value.map(v => 
          String(v).replace(/[<>"\'/\\]/g, '').trim()
        ).filter(v => v)
      } else {
        sanitized[cleanKey] = String(value).replace(/[<>"\'/\\]/g, '').trim()
      }
    })
    
    return sanitized
  }
}

/**
 * URL shortening service implementation
 */
export class SimpleURLShortener implements URLShortener {
  private baseUrl: string
  private apiKey?: string

  constructor(baseUrl: string = 'https://short.6fb.app', apiKey?: string) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  async shorten(
    url: string,
    options: { customSlug?: string; expiresAt?: string } = {}
  ): Promise<string> {
    // This would integrate with a URL shortening service
    // For now, return a simple hash-based short URL
    const hash = this.generateHash(url)
    return `${this.baseUrl}/${options.customSlug || hash}`
  }

  async expand(shortUrl: string): Promise<string> {
    // This would query the URL shortening service
    // For now, return the original URL (placeholder)
    return shortUrl
  }

  async getAnalytics(shortUrl: string): Promise<LinkAnalytics> {
    // This would fetch analytics from the URL shortening service
    return {
      clicks: 0,
      conversions: 0,
      conversionRate: 0,
      referrers: {},
      devices: {},
      locations: {},
      timeDistribution: {},
    }
  }

  private generateHash(url: string): string {
    let hash = 0
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substr(0, 6)
  }
}

// Export default instance
export default new BookingLinkGenerator()