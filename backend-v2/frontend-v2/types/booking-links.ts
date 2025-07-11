/**
 * Booking Link Types and Interfaces
 * 
 * Comprehensive TypeScript definitions for booking link generation
 * and URL parameter handling in the 6FB booking system.
 */

// Core booking link parameter types
export interface BookingLinkParams {
  // Service selection
  service?: string | string[]
  serviceId?: number | number[]
  
  // Barber/employee selection
  barber?: string | string[]
  barberId?: number | number[]
  employee?: string | string[]
  employeeId?: number | number[]
  
  // Date and time constraints
  date?: string // ISO date string (YYYY-MM-DD)
  dateRange?: string // "start,end" format
  time?: string // HH:MM format
  timeRange?: string // "start,end" format
  
  // Time slot preferences
  timeSlots?: string[] // Array of preferred time slots
  duration?: number // Duration in minutes
  
  // Booking constraints
  leadTime?: number // Minimum hours in advance
  maxAdvance?: number // Maximum days in advance
  bufferTime?: number // Buffer time between appointments
  
  // Location and availability
  location?: string
  locationId?: number
  timezone?: string
  
  // Campaign and tracking
  ref?: string // Referral source
  campaign?: string // Campaign name
  source?: string // Traffic source
  medium?: string // Marketing medium
  term?: string // Search term
  content?: string // Ad content
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
  
  // Booking preferences
  recurring?: boolean // Enable recurring booking flow
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'custom'
  quickBook?: boolean // Skip to next available slot
  
  // Client information pre-fill
  name?: string
  email?: string
  phone?: string
  
  // Special options
  giftCertificate?: string // Gift certificate code
  coupon?: string // Coupon code
  package?: string // Service package
  
  // Accessibility and UI
  theme?: 'light' | 'dark' | 'auto'
  lang?: string // Language preference
  
  // Custom fields
  custom?: Record<string, string>
}

// Validation result interface
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// URL generation options
export interface URLGenerationOptions {
  baseUrl?: string
  encode?: boolean
  shortUrl?: boolean
  includeDefaults?: boolean
  omitEmpty?: boolean
}

// Parsed URL result
export interface ParsedBookingURL {
  baseUrl: string
  params: BookingLinkParams
  hash?: string
  isValid: boolean
  errors: string[]
}

// Service information for link generation
export interface ServiceInfo {
  id: number
  name: string
  slug: string
  duration: number
  price: number
  category: string
  isActive: boolean
}

// Barber information for link generation
export interface BarberInfo {
  id: number
  name: string
  slug: string
  email: string
  isActive: boolean
  services: number[]
  timezone: string
}

// Date range specification
export interface DateRange {
  start: string // ISO date string
  end: string // ISO date string
}

// Time range specification
export interface TimeRange {
  start: string // HH:MM format
  end: string // HH:MM format
}

// Booking constraint options
export interface BookingConstraints {
  minLeadTime?: number // Hours
  maxAdvanceTime?: number // Days
  businessHours?: {
    start: string // HH:MM
    end: string // HH:MM
    days: number[] // 0-6 (Sun-Sat)
  }
  blackoutDates?: string[] // ISO date strings
  bufferTime?: number // Minutes
}

// Link generation result
export interface GeneratedLink {
  url: string
  shortUrl?: string
  qrCode?: string
  parameters: BookingLinkParams
  metadata: {
    generatedAt: string
    expiresAt?: string
    clickCount?: number
    conversionRate?: number
  }
}

// Link analytics interface
export interface LinkAnalytics {
  clicks: number
  conversions: number
  conversionRate: number
  referrers: Record<string, number>
  devices: Record<string, number>
  locations: Record<string, number>
  timeDistribution: Record<string, number>
}

// Predefined booking link templates
export interface BookingLinkTemplate {
  id: string
  name: string
  description: string
  params: BookingLinkParams
  isActive: boolean
  category: 'marketing' | 'social' | 'email' | 'general'
  createdAt: string
  updatedAt: string
}

// URL shortening service interface
export interface URLShortener {
  shorten(url: string, options?: { customSlug?: string; expiresAt?: string }): Promise<string>
  expand(shortUrl: string): Promise<string>
  getAnalytics(shortUrl: string): Promise<LinkAnalytics>
}

// Parameter encoding options
export interface EncodingOptions {
  arrayFormat: 'comma' | 'bracket' | 'index'
  encodeValues: boolean
  skipNulls: boolean
  strictNullHandling: boolean
}

// Validation constraints
export interface ValidationConstraints {
  required?: string[]
  serviceExists?: boolean
  barberExists?: boolean
  dateInFuture?: boolean
  validTimeSlots?: boolean
  businessHours?: boolean
  maxParameterLength?: number
}

// Link customization options
export interface LinkCustomization {
  brandColor?: string
  logo?: string
  companyName?: string
  footerText?: string
  customCSS?: string
  customDomain?: string
}

// Booking context for link generation
export interface BookingContext {
  userId?: number
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  referrer?: string
  timestamp: string
}

// Error types for validation
export type ValidationError = 
  | 'INVALID_SERVICE'
  | 'INVALID_BARBER'
  | 'INVALID_DATE'
  | 'INVALID_TIME'
  | 'INVALID_TIME_RANGE'
  | 'INVALID_DATE_RANGE'
  | 'INVALID_TIMEZONE'
  | 'INVALID_DURATION'
  | 'INVALID_LEAD_TIME'
  | 'INVALID_EMAIL'
  | 'INVALID_PHONE'
  | 'INVALID_URL'
  | 'PARAMETER_TOO_LONG'
  | 'REQUIRED_PARAMETER_MISSING'
  | 'CONFLICTING_PARAMETERS'
  | 'BUSINESS_HOURS_VIOLATION'
  | 'BLACKOUT_DATE'
  | 'SERVICE_NOT_AVAILABLE'
  | 'BARBER_NOT_AVAILABLE'

// Constants for parameter validation
export const VALIDATION_CONSTANTS = {
  MAX_PARAMETER_LENGTH: 255,
  MAX_URL_LENGTH: 2048,
  MAX_CUSTOM_FIELDS: 10,
  MAX_SERVICES: 5,
  MAX_BARBERS: 3,
  DATE_FORMAT: 'YYYY-MM-DD',
  TIME_FORMAT: 'HH:MM',
  TIMEZONE_FORMAT: 'America/New_York',
  DEFAULT_DURATION: 30,
  MIN_LEAD_TIME: 1,
  MAX_ADVANCE_TIME: 90,
} as const

// Supported URL parameter formats
export const PARAMETER_FORMATS = {
  COMMA_SEPARATED: 'comma',
  BRACKET_NOTATION: 'bracket',
  INDEXED_ARRAY: 'index',
} as const

// Default booking link configuration
export const DEFAULT_BOOKING_CONFIG = {
  baseUrl: 'https://bookedbarber.com/{slug}', // V2 organization slug-based URLs
  encoding: {
    arrayFormat: 'comma' as const,
    encodeValues: true,
    skipNulls: true,
    strictNullHandling: false,
  },
  validation: {
    serviceExists: true,
    barberExists: true,
    dateInFuture: true,
    validTimeSlots: true,
    businessHours: true,
    maxParameterLength: 255,
  },
  customization: {
    brandColor: '#0ea5e9',
    companyName: '6FB Booking',
  },
} as const

// Type guards for runtime validation
export const isValidService = (service: any): service is string => {
  return typeof service === 'string' && service.length > 0 && service.length <= 100
}

export const isValidBarber = (barber: any): barber is string => {
  return typeof barber === 'string' && barber.length > 0 && barber.length <= 100
}

export const isValidDate = (date: any): date is string => {
  if (typeof date !== 'string') return false
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  return dateRegex.test(date) && !isNaN(Date.parse(date))
}

export const isValidTime = (time: any): time is string => {
  if (typeof time !== 'string') return false
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

export const isValidEmail = (email: any): email is string => {
  if (typeof email !== 'string') return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPhone = (phone: any): phone is string => {
  if (typeof phone !== 'string') return false
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))
}

export const isValidTimezone = (timezone: any): timezone is string => {
  if (typeof timezone !== 'string') return false
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

// Utility type for optional booking parameters
export type OptionalBookingParams = Partial<BookingLinkParams>

// Utility type for required booking parameters
export type RequiredBookingParams = Required<Pick<BookingLinkParams, 'service' | 'date' | 'time'>>

// Export type for external consumption
export type BookingLinkGenerator = {
  generateURL(params: BookingLinkParams, options?: URLGenerationOptions): string
  parseURL(url: string): ParsedBookingURL
  validateParams(params: BookingLinkParams, constraints?: ValidationConstraints): ValidationResult
  shortenURL(url: string, options?: { customSlug?: string }): Promise<string>
}