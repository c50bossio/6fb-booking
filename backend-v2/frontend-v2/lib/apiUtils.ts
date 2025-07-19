'use client'

import { toastError, toastInfo } from '@/hooks/use-toast'

// API validation schemas for common endpoints
const API_SCHEMAS: Record<string, any> = {
  '/api/v1/auth/login': {
    request: {
      email: 'string',
      password: 'string'
    },
    response: {
      access_token: 'string',
      token_type: 'string',
      refresh_token: 'string?'
    }
  },
  '/api/v1/auth/me': {
    response: {
      id: 'number',
      email: 'string',
      name: 'string',
      role: 'string?',
      timezone: 'string?'
    }
  },
  '/api/v1/bookings': {
    request: {
      date: 'string',
      time: 'string',
      service: 'string'
    },
    response: {
      id: 'number',
      start_time: 'string',
      service_name: 'string',
      status: 'string'
    }
  },
  '/api/v1/appointments': {
    request: {
      date: 'string',
      time: 'string',
      service: 'string'
    },
    response: {
      // GET request returns a list
      appointments: 'array?',
      total: 'number?',
      // POST request returns single appointment
      id: 'number?',
      user_id: 'number?',
      barber_id: 'number?',
      client_id: 'number?',
      service_id: 'number?',
      service_name: 'string?',
      start_time: 'string?',
      duration_minutes: 'number?',
      price: 'number?',
      status: 'string?',
      notes: 'string?',
      recurring_pattern_id: 'number?',
      google_event_id: 'string?',
      created_at: 'string?'
    }
  }
}

// Performance monitoring utility
export class APIPerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map()
  private static errors: Map<string, number> = new Map()

  static startTiming(endpoint: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const duration = performance.now() - startTime
      
      // Store metric
      if (!this.metrics.has(endpoint)) {
        this.metrics.set(endpoint, [])
      }
      this.metrics.get(endpoint)!.push(duration)
      
      // Keep only last 100 measurements
      const metrics = this.metrics.get(endpoint)!
      if (metrics.length > 100) {
        metrics.shift()
      }
      
      // Log slow requests
      if (duration > 1000) {
        }ms`)
      }
    }
  }

  static recordError(endpoint: string) {
    const current = this.errors.get(endpoint) || 0
    this.errors.set(endpoint, current + 1)
  }

  static getMetrics() {
    const summary: Record<string, any> = {}
    
    this.metrics.forEach((durations, endpoint) => {
      if (durations.length > 0) {
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length
        const max = Math.max(...durations)
        const min = Math.min(...durations)
        
        summary[endpoint] = {
          count: durations.length,
          avgMs: Math.round(avg),
          minMs: Math.round(min),
          maxMs: Math.round(max),
          errors: this.errors.get(endpoint) || 0
        }
      }
    })
    
    return summary
  }

  static logSummary() {
    const summary = this.getMetrics()
    }
}

// Validation helper
export function validateAPIRequest(endpoint: string, data: any): { isValid: boolean; errors: string[] } {
  const schema = API_SCHEMAS[endpoint]?.request
  if (!schema) return { isValid: true, errors: [] }
  
  const errors: string[] = []
  
  Object.entries(schema).forEach(([key, type]) => {
    const isOptional = (type as string).endsWith('?')
    const actualType = (type as string).replace('?', '')
    
    if (!isOptional && !(key in data)) {
      errors.push(`Missing required field: ${key}`)
    } else if (key in data && typeof data[key] !== actualType) {
      errors.push(`Invalid type for ${key}: expected ${actualType}, got ${typeof data[key]}`)
    }
  })
  
  return { isValid: errors.length === 0, errors }
}

export function validateAPIResponse(endpoint: string, data: any): { isValid: boolean; errors: string[] } {
  const schema = API_SCHEMAS[endpoint]?.response
  if (!schema) return { isValid: true, errors: [] }
  
  const errors: string[] = []
  
  Object.entries(schema).forEach(([key, type]) => {
    const isOptional = (type as string).endsWith('?')
    const actualType = (type as string).replace('?', '')
    
    if (!isOptional && !(key in data)) {
      errors.push(`Missing expected field: ${key}`)
    }
  })
  
  return { isValid: errors.length === 0, errors }
}

// Retry configuration
export const defaultRetryConfigs = {
  standard: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2
  },
  critical: {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 1.5
  },
  none: {
    maxRetries: 0,
    initialDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1
  }
}

// Retry helper with exponential backoff
export async function retryOperation<T>(
  operation: () => Promise<T>,
  config = defaultRetryConfigs.standard,
  shouldRetry?: (error: Error) => boolean
): Promise<T> {
  let lastError: Error
  let delay = config.initialDelay
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Check if we should retry
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        throw lastError
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Calculate next delay with exponential backoff
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay)
    }
  }
  
  throw lastError!
}

// Export performance metrics for debugging
if (typeof window !== 'undefined') {
  (window as any).__API_PERFORMANCE__ = APIPerformanceMonitor
}