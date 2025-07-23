'use client'

/**
 * Security utilities for BookedBarber calendar system
 * Provides XSS prevention, input sanitization, and secure data handling
 */

// DOMPurify-like sanitization for client-side
const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input.replace(/[&<>"'`=\/]/g, (s) => HTML_ESCAPE_MAP[s] || s)
}

/**
 * Sanitizes appointment data for calendar display
 */
export interface AppointmentInput {
  title?: string
  description?: string
  notes?: string
  client_name?: string
  service_name?: string
}

export function sanitizeAppointmentData(data: AppointmentInput): AppointmentInput {
  const sanitized: AppointmentInput = {}
  
  if (data.title) sanitized.title = sanitizeHTML(data.title)
  if (data.description) sanitized.description = sanitizeHTML(data.description)
  if (data.notes) sanitized.notes = sanitizeHTML(data.notes)
  if (data.client_name) sanitized.client_name = sanitizeHTML(data.client_name)
  if (data.service_name) sanitized.service_name = sanitizeHTML(data.service_name)
  
  return sanitized
}

/**
 * Validates and sanitizes email addresses
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') return ''
  
  // Basic email validation and sanitization
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const sanitized = email.trim().toLowerCase()
  
  return emailRegex.test(sanitized) ? sanitized : ''
}

/**
 * Validates phone numbers and removes potentially malicious content
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') return ''
  
  // Remove all non-digit characters except +, -, (, ), and spaces
  const sanitized = phone.replace(/[^\d+\-() ]/g, '')
  
  // Basic phone number validation (10-15 digits)
  const digitsOnly = sanitized.replace(/\D/g, '')
  return digitsOnly.length >= 10 && digitsOnly.length <= 15 ? sanitized : ''
}

/**
 * Content Security Policy helper for calendar widgets
 */
export const CALENDAR_CSP = {
  defaultSrc: "'self'",
  scriptSrc: "'self' 'unsafe-inline'", // Needed for dynamic calendar rendering
  styleSrc: "'self' 'unsafe-inline'", // Needed for dynamic styles
  imgSrc: "'self' data: https:", // Allow data URLs and HTTPS images
  connectSrc: "'self' https://api.stripe.com", // API endpoints
  fontSrc: "'self' https://fonts.gstatic.com",
  objectSrc: "'none'",
  baseUri: "'self'",
  formAction: "'self'",
  frameAncestors: "'none'",
  upgradeInsecureRequests: true
}

/**
 * Rate limiting helper for form submissions
 */
class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  
  /**
   * Check if action is rate limited
   * @param identifier - User identifier (IP, user ID, etc.)
   * @param maxAttempts - Maximum attempts allowed
   * @param windowMs - Time window in milliseconds
   */
  isRateLimited(identifier: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now()
    const userAttempts = this.attempts.get(identifier) || []
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(timestamp => now - timestamp < windowMs)
    
    if (recentAttempts.length >= maxAttempts) {
      return true
    }
    
    // Add current attempt
    recentAttempts.push(now)
    this.attempts.set(identifier, recentAttempts)
    
    return false
  }
  
  /**
   * Clear rate limit for identifier
   */
  clearRateLimit(identifier: string): void {
    this.attempts.delete(identifier)
  }
}

export const rateLimiter = new RateLimiter()

/**
 * Secure local storage wrapper with encryption simulation
 */
export class SecureStorage {
  private static encode(data: string): string {
    // Simple base64 encoding (in production, use proper encryption)
    return btoa(encodeURIComponent(data))
  }
  
  private static decode(encoded: string): string {
    try {
      return decodeURIComponent(atob(encoded))
    } catch {
      return ''
    }
  }
  
  static setItem(key: string, value: any): void {
    try {
      const serialized = JSON.stringify(value)
      const encoded = this.encode(serialized)
      localStorage.setItem(`bb_${key}`, encoded)
    } catch (error) {
      console.error('SecureStorage: Failed to store data', error)
    }
  }
  
  static getItem<T>(key: string): T | null {
    try {
      const encoded = localStorage.getItem(`bb_${key}`)
      if (!encoded) return null
      
      const decoded = this.decode(encoded)
      return JSON.parse(decoded) as T
    } catch (error) {
      console.error('SecureStorage: Failed to retrieve data', error)
      return null
    }
  }
  
  static removeItem(key: string): void {
    localStorage.removeItem(`bb_${key}`)
  }
  
  static clear(): void {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith('bb_')) {
        localStorage.removeItem(key)
      }
    })
  }
}

/**
 * Input validation utilities
 */
export const validators = {
  appointmentTitle: (title: string): boolean => {
    return typeof title === 'string' && title.trim().length > 0 && title.length <= 200
  },
  
  appointmentDuration: (duration: number): boolean => {
    return Number.isInteger(duration) && duration > 0 && duration <= 480 // Max 8 hours
  },
  
  appointmentPrice: (price: number): boolean => {
    return typeof price === 'number' && price >= 0 && price <= 10000 // Max $10,000
  },
  
  clientName: (name: string): boolean => {
    return typeof name === 'string' && name.trim().length > 0 && name.length <= 100
  },
  
  serviceName: (service: string): boolean => {
    return typeof service === 'string' && service.trim().length > 0 && service.length <= 100
  }
}

/**
 * Security audit logger
 */
export class SecurityAudit {
  private static logs: Array<{timestamp: number, event: string, details: any}> = []
  
  static log(event: string, details: any = {}): void {
    this.logs.push({
      timestamp: Date.now(),
      event,
      details: sanitizeHTML(JSON.stringify(details))
    })
    
    // Keep only last 100 logs
    if (this.logs.length > 100) {
      this.logs.shift()
    }
    
    // In production, send to security monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to security monitoring service
      console.warn(`Security Event: ${event}`, details)
    }
  }
  
  static getLogs(): Array<{timestamp: number, event: string, details: any}> {
    return [...this.logs]
  }
  
  static clearLogs(): void {
    this.logs.length = 0
  }
}