/**
 * Retry Manager for handling failed operations with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelay?: number
  maxDelay?: number
  backoffMultiplier?: number
  retryCondition?: (error: any) => boolean
  onRetry?: (error: any, attemptNumber: number) => void
}

export interface RetryResult<T> {
  success: boolean
  data?: T
  error?: Error
  attempts: number
}

/**
 * Default retry options
 */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryCondition' | 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2
}

/**
 * Check if the browser is online
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

/**
 * Wait for the specified amount of time
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate the delay for the next retry attempt using exponential backoff
 */
function calculateBackoffDelay(
  attemptNumber: number,
  initialDelay: number,
  maxDelay: number,
  backoffMultiplier: number
): number {
  const exponentialDelay = initialDelay * Math.pow(backoffMultiplier, attemptNumber - 1)
  // Add some jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * exponentialDelay
  return Math.min(exponentialDelay + jitter, maxDelay)
}

/**
 * Default retry condition - retry on network errors and 5xx status codes
 */
function defaultRetryCondition(error: any): boolean {
  // Don't retry if offline
  if (!isOnline()) {
    return false
  }

  // Network errors
  if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
    return true
  }

  // HTTP errors - retry on 5xx and specific 4xx errors
  if (error.response) {
    const status = error.response.status
    return status >= 500 || status === 429 || status === 408
  }

  // Retry on timeout errors
  if (error.message && error.message.toLowerCase().includes('timeout')) {
    return true
  }

  return false
}

/**
 * Retry a promise-returning function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<RetryResult<T>> {
  const opts = {
    ...DEFAULT_OPTIONS,
    ...options
  }

  const retryCondition = opts.retryCondition || defaultRetryCondition

  let lastError: Error | undefined
  let attempts = 0

  for (let i = 0; i <= opts.maxRetries; i++) {
    attempts++
    
    try {
      const data = await fn()
      return {
        success: true,
        data,
        attempts
      }
    } catch (error: any) {
      lastError = error

      // Check if we should retry
      const shouldRetry = i < opts.maxRetries && retryCondition(error)

      if (!shouldRetry) {
        break
      }

      // Calculate delay and wait
      const backoffDelay = calculateBackoffDelay(
        i + 1,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      )

      // Call onRetry callback if provided
      if (opts.onRetry) {
        opts.onRetry(error, i + 1)
      }

      // Wait before retrying
      await delay(backoffDelay)

      // Check if still online before retrying
      if (!isOnline()) {
        lastError = new Error('No internet connection')
        break
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts
  }
}

/**
 * Create a retry wrapper for a specific function
 */
export function createRetryWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  defaultOptions: RetryOptions = {}
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const result = await retryWithBackoff(
      () => fn(...args),
      defaultOptions
    )

    if (result.success && result.data !== undefined) {
      return result.data
    }

    throw result.error || new Error('Operation failed after retries')
  }
}

/**
 * React hook for network status monitoring
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * React hook for retry management
 */
export function useRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
) {
  const [state, setState] = React.useState<{
    loading: boolean
    error: Error | null
    data: T | null
    attempts: number
  }>({
    loading: false,
    error: null,
    data: null,
    attempts: 0
  })

  const execute = React.useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    const result = await retryWithBackoff(fn, options)

    setState({
      loading: false,
      error: result.error || null,
      data: result.data || null,
      attempts: result.attempts
    })

    return result
  }, [fn, options])

  const reset = React.useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: null,
      attempts: 0
    })
  }, [])

  return {
    ...state,
    execute,
    reset,
    retry: execute
  }
}

// Import React for hooks
import React from 'react'

/**
 * Promise retry wrapper with network status awareness
 */
export class RetryManager {
  private static instance: RetryManager
  private onlineListeners: Set<() => void> = new Set()

  private constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.onlineListeners.forEach(listener => listener())
      })
    }
  }

  static getInstance(): RetryManager {
    if (!RetryManager.instance) {
      RetryManager.instance = new RetryManager()
    }
    return RetryManager.instance
  }

  /**
   * Register a callback to be called when coming back online
   */
  onBackOnline(callback: () => void): () => void {
    this.onlineListeners.add(callback)
    return () => this.onlineListeners.delete(callback)
  }

  /**
   * Retry with circuit breaker pattern
   */
  async retryWithCircuitBreaker<T>(
    fn: () => Promise<T>,
    options: RetryOptions & { 
      circuitBreakerThreshold?: number
      circuitBreakerResetTime?: number 
    } = {}
  ): Promise<RetryResult<T>> {
    const threshold = options.circuitBreakerThreshold || 5
    const resetTime = options.circuitBreakerResetTime || 60000 // 1 minute

    // Simple circuit breaker implementation
    const key = fn.toString()
    const failures = this.getFailureCount(key)

    if (failures >= threshold) {
      const lastFailure = this.getLastFailureTime(key)
      if (Date.now() - lastFailure < resetTime) {
        return {
          success: false,
          error: new Error('Circuit breaker is open'),
          attempts: 0
        }
      } else {
        // Reset circuit breaker
        this.resetFailureCount(key)
      }
    }

    const result = await retryWithBackoff(fn, options)

    if (!result.success) {
      this.incrementFailureCount(key)
    } else {
      this.resetFailureCount(key)
    }

    return result
  }

  private failureCounts = new Map<string, number>()
  private lastFailureTimes = new Map<string, number>()

  private getFailureCount(key: string): number {
    return this.failureCounts.get(key) || 0
  }

  private incrementFailureCount(key: string): void {
    this.failureCounts.set(key, this.getFailureCount(key) + 1)
    this.lastFailureTimes.set(key, Date.now())
  }

  private resetFailureCount(key: string): void {
    this.failureCounts.delete(key)
    this.lastFailureTimes.delete(key)
  }

  private getLastFailureTime(key: string): number {
    return this.lastFailureTimes.get(key) || 0
  }
}

// Export singleton instance
export const retryManager = RetryManager.getInstance()