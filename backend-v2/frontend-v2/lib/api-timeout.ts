/**
 * API Timeout Configuration and Utilities
 * 
 * This module provides timeout handling for all API requests to prevent
 * hanging requests and improve user experience.
 */

import { toast } from '@/hooks/use-toast'

// Default timeout configurations for different types of requests
export const TIMEOUT_CONFIGS = {
  // Fast operations (auth, simple queries)
  fast: 10000, // 10 seconds
  
  // Standard operations (CRUD operations)
  standard: 30000, // 30 seconds
  
  // Slow operations (file uploads, complex queries)
  slow: 60000, // 60 seconds
  
  // Very slow operations (bulk operations, exports)
  verySlow: 120000, // 2 minutes
  
  // No timeout (for streaming operations)
  none: 0
}

// Endpoint-specific timeout overrides
export const ENDPOINT_TIMEOUTS: Record<string, number> = {
  // Auth endpoints - should be fast
  '/api/v1/auth/login': TIMEOUT_CONFIGS.fast,
  '/api/v1/auth/refresh': TIMEOUT_CONFIGS.fast,
  '/api/v1/auth/logout': TIMEOUT_CONFIGS.fast,
  
  // User operations
  '/api/v1/users/me': TIMEOUT_CONFIGS.fast,
  '/api/v1/users': TIMEOUT_CONFIGS.standard,
  
  // Appointment operations
  '/api/v1/appointments': TIMEOUT_CONFIGS.standard,
  '/api/v1/appointments/slots': TIMEOUT_CONFIGS.standard,
  '/api/v1/appointments/bulk': TIMEOUT_CONFIGS.slow,
  
  // Payment operations - need more time
  '/api/v1/payments/create-intent': TIMEOUT_CONFIGS.standard,
  '/api/v1/payments/confirm': TIMEOUT_CONFIGS.slow,
  '/api/v1/payments/history': TIMEOUT_CONFIGS.standard,
  
  // File operations
  '/api/v1/upload': TIMEOUT_CONFIGS.slow,
  '/api/v1/export': TIMEOUT_CONFIGS.verySlow,
  
  // Analytics - can be slow
  '/api/v1/analytics': TIMEOUT_CONFIGS.slow,
  '/api/v1/analytics/revenue': TIMEOUT_CONFIGS.slow,
  '/api/v1/analytics/comprehensive': TIMEOUT_CONFIGS.verySlow,
  
  // Webhook operations
  '/api/v1/webhooks': TIMEOUT_CONFIGS.standard,
  '/api/v1/webhooks/test': TIMEOUT_CONFIGS.slow,
  
  // Integration operations
  '/api/v1/integrations/gmb': TIMEOUT_CONFIGS.slow,
  '/api/v1/calendar/sync': TIMEOUT_CONFIGS.slow
}

/**
 * Get timeout for a specific endpoint
 */
export function getEndpointTimeout(endpoint: string): number {
  // Check for exact match
  if (ENDPOINT_TIMEOUTS[endpoint]) {
    return ENDPOINT_TIMEOUTS[endpoint]
  }
  
  // Check for pattern match
  for (const [pattern, timeout] of Object.entries(ENDPOINT_TIMEOUTS)) {
    if (endpoint.startsWith(pattern)) {
      return timeout
    }
  }
  
  // Default to standard timeout
  return TIMEOUT_CONFIGS.standard
}

/**
 * Create an AbortController with timeout
 */
export function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController()
  
  if (timeoutMs > 0) {
    setTimeout(() => {
      controller.abort()
    }, timeoutMs)
  }
  
  return controller
}

/**
 * Fetch with timeout wrapper
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs?: number
): Promise<Response> {
  // Determine timeout
  const timeout = timeoutMs ?? getEndpointTimeout(new URL(url).pathname)
  
  // Create abort controller
  const controller = createTimeoutController(timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    
    return response
  } catch (error: any) {
    // Check if it's a timeout error
    if (error.name === 'AbortError') {
      throw new TimeoutError(
        `Request timed out after ${timeout / 1000} seconds`,
        url,
        timeout
      )
    }
    
    // Re-throw other errors
    throw error
  }
}

/**
 * Custom timeout error class
 */
export class TimeoutError extends Error {
  constructor(
    message: string,
    public url: string,
    public timeout: number
  ) {
    super(message)
    this.name = 'TimeoutError'
  }
}

/**
 * Handle timeout errors with user-friendly messages
 */
export function handleTimeoutError(error: TimeoutError, endpoint: string): void {
  // Determine user-friendly message based on endpoint
  let userMessage = 'The request took too long to complete. Please try again.'
  
  if (endpoint.includes('/auth/')) {
    userMessage = 'Login is taking longer than expected. Please check your connection and try again.'
  } else if (endpoint.includes('/appointments')) {
    userMessage = 'Loading appointments is taking too long. Please refresh the page.'
  } else if (endpoint.includes('/payments')) {
    userMessage = 'Payment processing is taking longer than expected. Please do not retry - check your payment history.'
  } else if (endpoint.includes('/analytics')) {
    userMessage = 'Loading analytics data is taking too long. Try selecting a smaller date range.'
  } else if (endpoint.includes('/export')) {
    userMessage = 'Export is taking longer than expected. Large exports may take several minutes.'
  }
  
  toast({
    title: 'Request Timeout',
    description: userMessage,
    variant: 'destructive',
    duration: 10000 // Show for 10 seconds
  })
}

/**
 * Retry with timeout configuration
 */
export interface RetryWithTimeoutConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  timeout: number
  onRetry?: (attempt: number, error: Error) => void
}

export const defaultRetryWithTimeoutConfigs = {
  standard: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    timeout: TIMEOUT_CONFIGS.standard
  },
  critical: {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 1.5,
    timeout: TIMEOUT_CONFIGS.slow
  },
  fast: {
    maxRetries: 2,
    initialDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
    timeout: TIMEOUT_CONFIGS.fast
  }
}

/**
 * Retry operation with timeout
 */
export async function retryWithTimeout<T>(
  operation: () => Promise<T>,
  config: RetryWithTimeoutConfig = defaultRetryWithTimeoutConfigs.standard,
  shouldRetry?: (error: Error) => boolean
): Promise<T> {
  let lastError: Error
  let delay = config.initialDelay
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Create a promise that rejects on timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        if (config.timeout > 0) {
          setTimeout(() => {
            reject(new TimeoutError(
              `Operation timed out after ${config.timeout / 1000} seconds`,
              'unknown',
              config.timeout
            ))
          }, config.timeout)
        }
      })
      
      // Race between operation and timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ])
      
      return result
    } catch (error) {
      lastError = error as Error
      
      // Call retry callback if provided
      if (config.onRetry && attempt < config.maxRetries) {
        config.onRetry(attempt + 1, lastError)
      }
      
      // Check if we should retry
      if (shouldRetry && !shouldRetry(lastError)) {
        throw lastError
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxRetries) {
        throw lastError
      }
      
      // Don't retry timeout errors if it's a critical timeout
      if (lastError instanceof TimeoutError && config.timeout >= TIMEOUT_CONFIGS.slow) {
        throw lastError
      }
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay))
      
      // Increase delay for next attempt
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelay)
    }
  }
  
  throw lastError!
}

/**
 * Monitor and report slow endpoints
 */
export class SlowEndpointMonitor {
  private static slowRequests: Map<string, number[]> = new Map()
  private static threshold = 5000 // 5 seconds
  
  static recordRequest(endpoint: string, duration: number) {
    if (duration > this.threshold) {
      if (!this.slowRequests.has(endpoint)) {
        this.slowRequests.set(endpoint, [])
      }
      
      const requests = this.slowRequests.get(endpoint)!
      requests.push(duration)
      
      // Keep only last 10 slow requests
      if (requests.length > 10) {
        requests.shift()
      }
      
      // Warn if endpoint is consistently slow
      if (requests.length >= 5) {
        const avgDuration = requests.reduce((a, b) => a + b, 0) / requests.length
        if (avgDuration > this.threshold * 2) {
          // This endpoint is consistently very slow
          // Could send to monitoring service
        }
      }
    }
  }
  
  static getSlowEndpoints(): Record<string, { count: number; avgDuration: number }> {
    const report: Record<string, { count: number; avgDuration: number }> = {}
    
    this.slowRequests.forEach((durations, endpoint) => {
      if (durations.length > 0) {
        report[endpoint] = {
          count: durations.length,
          avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        }
      }
    })
    
    return report
  }
}