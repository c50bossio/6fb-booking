/**
 * Frontend Security Utilities
 * Input validation, sanitization, and security helpers
 */

// Input sanitization functions
export const sanitizeHtml = (input: string): string => {
  if (typeof input !== 'string') return ''
  
  // Remove potentially dangerous HTML tags and attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<link\b[^<]*>/gi, '')
    .replace(/<meta\b[^<]*>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

// SQL injection prevention for search terms
export const sanitizeSearchInput = (input: string): string => {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/[';\"\\]/g, '') // Remove quotes and backslashes
    .replace(/(\-\-|\/\*|\*\/)/g, '') // Remove SQL comment syntax
    .replace(/(union|select|insert|update|delete|drop|create|alter|exec|execute)\s/gi, '') // Remove SQL keywords
    .trim()
    .substring(0, 100) // Limit length
}

// Email validation with security considerations
export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email is required' }
  }

  // Basic format validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' }
  }

  // Length validation
  if (email.length > 254) {
    return { isValid: false, error: 'Email address too long' }
  }

  // Domain validation (basic)
  const domain = email.split('@')[1]
  if (domain.includes('..') || domain.startsWith('.') || domain.endsWith('.')) {
    return { isValid: false, error: 'Invalid email domain' }
  }

  return { isValid: true }
}

// Password strength validation
export const validatePassword = (password: string): { isValid: boolean; error?: string; score: number } => {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required', score: 0 }
  }

  let score = 0
  const feedback: string[] = []

  // Length check
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long')
  } else if (password.length >= 8) {
    score += 1
  }

  if (password.length >= 12) {
    score += 1
  }

  // Character variety checks
  if (/[a-z]/.test(password)) score += 1
  else feedback.push('Include lowercase letters')

  if (/[A-Z]/.test(password)) score += 1
  else feedback.push('Include uppercase letters')

  if (/[0-9]/.test(password)) score += 1
  else feedback.push('Include numbers')

  if (/[^a-zA-Z0-9]/.test(password)) score += 1
  else feedback.push('Include special characters')

  // Common password checks
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein']
  if (commonPasswords.includes(password.toLowerCase())) {
    return { isValid: false, error: 'Password is too common', score: 0 }
  }

  // Sequential characters check
  if (/123|abc|qwe/i.test(password)) {
    score -= 1
    feedback.push('Avoid sequential characters')
  }

  const isValid = score >= 4
  const error = isValid ? undefined : feedback.join(', ')

  return { isValid, error, score }
}

// Phone number validation and formatting
export const validatePhone = (phone: string): { isValid: boolean; formatted?: string; error?: string } => {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' }
  }

  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')

  // Check length for US phone numbers
  if (cleaned.length === 10) {
    const formatted = `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    return { isValid: true, formatted }
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    const formatted = `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    return { isValid: true, formatted }
  }

  return { isValid: false, error: 'Invalid phone number format' }
}

// XSS prevention for display
export const escapeHtml = (text: string): string => {
  if (typeof text !== 'string') return ''
  
  const map: { [key: string]: string } = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
  }

  return text.replace(/[&<>"'/]/g, (s) => map[s])
}

// Content Security Policy helpers
export const generateNonce = (): string => {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

// CSRF token management
export const getCsrfToken = (): string | null => {
  return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || null
}

export const setCsrfToken = (token: string): void => {
  let meta = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'csrf-token'
    document.head.appendChild(meta)
  }
  meta.content = token
}

// Rate limiting helper for frontend
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map()

  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 900000): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    
    // Remove old attempts outside the window
    const validAttempts = attempts.filter(time => now - time < windowMs)
    
    if (validAttempts.length >= maxAttempts) {
      return false
    }
    
    validAttempts.push(now)
    this.attempts.set(key, validAttempts)
    return true
  }

  reset(key: string): void {
    this.attempts.delete(key)
  }
}

// Local storage with encryption-like obfuscation
export const secureStorage = {
  set(key: string, value: any): void {
    try {
      const encoded = btoa(JSON.stringify(value))
      localStorage.setItem(key, encoded)
    } catch (error) {
      console.error('Failed to store data securely:', error)
    }
  },

  get(key: string): any {
    try {
      const encoded = localStorage.getItem(key)
      if (!encoded) return null
      return JSON.parse(atob(encoded))
    } catch (error) {
      console.error('Failed to retrieve data securely:', error)
      return null
    }
  },

  remove(key: string): void {
    localStorage.removeItem(key)
  },

  clear(): void {
    localStorage.clear()
  }
}

// Permission-based route protection
export const checkRoutePermission = (userPermissions: string[], requiredPermissions: string[]): boolean => {
  if (!userPermissions || !requiredPermissions) return false
  
  // Check if user has at least one of the required permissions
  return requiredPermissions.some(permission => userPermissions.includes(permission))
}

// Security event logging
export const logSecurityEvent = (event: string, details?: any): void => {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`Security Event: ${event}`, details)
  }
  
  // In production, this could send to a security monitoring service
  // fetch('/api/security/log', {
  //   method: 'POST',
  //   body: JSON.stringify({ event, details, timestamp: new Date().toISOString() })
  // })
}

export default {
  sanitizeHtml,
  sanitizeSearchInput,
  validateEmail,
  validatePassword,
  validatePhone,
  escapeHtml,
  generateNonce,
  getCsrfToken,
  setCsrfToken,
  RateLimiter,
  secureStorage,
  checkRoutePermission,
  logSecurityEvent
}