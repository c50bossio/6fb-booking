/**
 * Request Deduplication Manager
 * Prevents duplicate API calls and provides optimistic updates with rollback
 */

import { retryWithBackoff, type RetryOptions } from '@/lib/RetryManager'

export interface RequestConfig {
  key: string
  endpoint: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  data?: any
  optimistic?: boolean
  rollbackData?: any
  retryOptions?: RetryOptions
}

export interface PendingRequest {
  id: string
  key: string
  promise: Promise<any>
  timestamp: number
  abortController: AbortController
  optimisticUpdate?: () => void
  rollback?: () => void
}

export interface OptimisticUpdate {
  id: string
  key: string
  originalData: any
  optimisticData: any
  timestamp: number
  applied: boolean
  rollback: () => void
}

/**
 * Request Deduplication Manager
 * Singleton class to manage API request deduplication and optimistic updates
 */
export class RequestDeduplicationManager {
  private static instance: RequestDeduplicationManager
  private pendingRequests = new Map<string, PendingRequest>()
  private optimisticUpdates = new Map<string, OptimisticUpdate>()
  private requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>()
  
  // Configuration
  private readonly MAX_PENDING_REQUESTS = 100
  private readonly REQUEST_TIMEOUT = 30000 // 30 seconds
  private readonly CACHE_DEFAULT_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly CLEANUP_INTERVAL = 60000 // 1 minute
  
  private cleanupTimer?: NodeJS.Timeout

  private constructor() {
    this.startCleanupTimer()
    
    // Handle page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseRequests()
        } else {
          this.resumeRequests()
        }
      })
      
      // Handle page unload
      window.addEventListener('beforeunload', () => {
        this.cleanup()
      })
    }
  }

  static getInstance(): RequestDeduplicationManager {
    if (!RequestDeduplicationManager.instance) {
      RequestDeduplicationManager.instance = new RequestDeduplicationManager()
    }
    return RequestDeduplicationManager.instance
  }

  /**
   * Execute a request with deduplication and optional optimistic updates
   */
  async executeRequest<T>(
    config: RequestConfig,
    apiFunction: (signal?: AbortSignal) => Promise<T>,
    onOptimisticUpdate?: () => void,
    onRollback?: () => void
  ): Promise<T> {
    const requestKey = this.generateRequestKey(config)
    
    // Check if request is already pending
    const existingRequest = this.pendingRequests.get(requestKey)
    if (existingRequest) {
      return existingRequest.promise as Promise<T>
    }
    
    // Check cache for GET requests
    if (config.method === 'GET') {
      const cached = this.getCachedData(requestKey)
      if (cached) {
        return cached as T
      }
    }
    
    // Apply optimistic update if configured
    let optimisticUpdateId: string | undefined
    if (config.optimistic && onOptimisticUpdate) {
      optimisticUpdateId = this.applyOptimisticUpdate(
        requestKey,
        config.data,
        onOptimisticUpdate,
        onRollback
      )
    }
    
    // Create abort controller
    const abortController = new AbortController()
    
    // Set timeout
    const timeoutId = setTimeout(() => {
      abortController.abort()
    }, this.REQUEST_TIMEOUT)
    
    // Create request promise with retry logic
    const requestPromise = this.executeWithRetry(
      config,
      apiFunction,
      abortController.signal
    )
    
    // Store pending request
    const pendingRequest: PendingRequest = {
      id: this.generateId(),
      key: requestKey,
      promise: requestPromise,
      timestamp: Date.now(),
      abortController,
      optimisticUpdate: onOptimisticUpdate,
      rollback: onRollback
    }
    
    this.pendingRequests.set(requestKey, pendingRequest)
    
    try {
      const result = await requestPromise
      
      // Clear timeout
      clearTimeout(timeoutId)
      
      // Confirm optimistic update
      if (optimisticUpdateId) {
        this.confirmOptimisticUpdate(optimisticUpdateId)
      }
      
      // Cache successful GET requests
      if (config.method === 'GET') {
        this.setCachedData(requestKey, result)
      }
      
      // Invalidate related cache entries for mutation requests
      if (config.method !== 'GET') {
        this.invalidateRelatedCache(config.endpoint)
      }
      
      return result
      
    } catch (error) {
      // Clear timeout
      clearTimeout(timeoutId)
      
      // Rollback optimistic update
      if (optimisticUpdateId) {
        this.rollbackOptimisticUpdate(optimisticUpdateId)
      }
      
      // Re-throw error
      throw error
      
    } finally {
      // Clean up pending request
      this.pendingRequests.delete(requestKey)
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    config: RequestConfig,
    apiFunction: (signal?: AbortSignal) => Promise<T>,
    signal: AbortSignal
  ): Promise<T> {
    const retryOptions: RetryOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryCondition: (error: any) => {
        // Don't retry if request was aborted
        if (signal.aborted) return false
        
        // Don't retry client errors (4xx) except for specific cases
        if (error.response?.status >= 400 && error.response?.status < 500) {
          return error.response.status === 429 || error.response.status === 408
        }
        
        // Retry server errors (5xx) and network errors
        return error.response?.status >= 500 || error.code === 'NETWORK_ERROR'
      },
      onRetry: (error, attemptNumber) => {
      },
      ...config.retryOptions
    }
    
    const result = await retryWithBackoff(
      () => apiFunction(signal),
      retryOptions
    )
    
    if (!result.success) {
      throw result.error || new Error('Request failed after retries')
    }
    
    return result.data!
  }

  /**
   * Apply optimistic update
   */
  private applyOptimisticUpdate(
    requestKey: string,
    optimisticData: any,
    onUpdate: () => void,
    onRollback?: () => void
  ): string {
    const updateId = this.generateId()
    
    // Store original state for rollback
    const optimisticUpdate: OptimisticUpdate = {
      id: updateId,
      key: requestKey,
      originalData: null, // Would be set by the calling component
      optimisticData,
      timestamp: Date.now(),
      applied: false,
      rollback: onRollback || (() => {})
    }
    
    this.optimisticUpdates.set(updateId, optimisticUpdate)
    
    // Apply the optimistic update
    try {
      onUpdate()
      optimisticUpdate.applied = true
    } catch (error) {
      console.error('Failed to apply optimistic update:', error)
      this.optimisticUpdates.delete(updateId)
      throw error
    }
    
    return updateId
  }

  /**
   * Confirm optimistic update (request succeeded)
   */
  private confirmOptimisticUpdate(updateId: string): void {
    const update = this.optimisticUpdates.get(updateId)
    if (update) {
      this.optimisticUpdates.delete(updateId)
    }
  }

  /**
   * Rollback optimistic update (request failed)
   */
  private rollbackOptimisticUpdate(updateId: string): void {
    const update = this.optimisticUpdates.get(updateId)
    if (update && update.applied) {
      try {
        update.rollback()
      } catch (error) {
        console.error('Failed to rollback optimistic update:', error)
      }
    }
    this.optimisticUpdates.delete(updateId)
  }

  /**
   * Generate unique request key
   */
  private generateRequestKey(config: RequestConfig): string {
    const { method, endpoint, data } = config
    const dataKey = data ? JSON.stringify(data) : ''
    return `${method}:${endpoint}:${btoa(dataKey).slice(0, 10)}`
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): any | null {
    const cached = this.requestCache.get(key)
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data
    }
    if (cached) {
      this.requestCache.delete(key)
    }
    return null
  }

  private setCachedData(key: string, data: any, ttl = this.CACHE_DEFAULT_TTL): void {
    this.requestCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
    
    // Prevent cache from growing too large
    if (this.requestCache.size > 50) {
      const entries = Array.from(this.requestCache.entries())
      const oldestEntries = entries
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)
        .slice(0, entries.length - 25)
      
      oldestEntries.forEach(([key]) => this.requestCache.delete(key))
    }
  }

  private invalidateRelatedCache(endpoint: string): void {
    const keysToDelete: string[] = []
    
    for (const [key] of Array.from(this.requestCache.entries())) {
      if (key.includes(endpoint) || this.isRelatedEndpoint(endpoint, key)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.requestCache.delete(key))
    
    if (keysToDelete.length > 0) {
    }
  }

  private isRelatedEndpoint(mutatedEndpoint: string, cacheKey: string): boolean {
    // Define related endpoints that should be invalidated
    const relations: Record<string, string[]> = {
      '/appointments': ['/bookings', '/calendar', '/my-bookings'],
      '/bookings': ['/appointments', '/calendar', '/my-bookings'],
      '/calendar': ['/appointments', '/bookings', '/my-bookings'],
      '/reschedule': ['/appointments', '/bookings', '/calendar', '/my-bookings'],
      '/cancel': ['/appointments', '/bookings', '/calendar', '/my-bookings']
    }
    
    const related = relations[mutatedEndpoint] || []
    return related.some(relatedEndpoint => cacheKey.includes(relatedEndpoint))
  }

  /**
   * Abort pending requests
   */
  public abortPendingRequests(pattern?: string): void {
    let abortedCount = 0
    
    for (const [key, request] of Array.from(this.pendingRequests.entries())) {
      if (!pattern || key.includes(pattern)) {
        request.abortController.abort()
        this.pendingRequests.delete(key)
        abortedCount++
      }
    }
    
  }

  /**
   * Clear cache
   */
  public clearCache(pattern?: string): void {
    if (pattern) {
      let clearedCount = 0
      for (const [key] of Array.from(this.requestCache.entries())) {
        if (key.includes(pattern)) {
          this.requestCache.delete(key)
          clearedCount++
        }
      }
    } else {
      const clearedCount = this.requestCache.size
      this.requestCache.clear()
    }
  }

  /**
   * Pause/resume requests (for page visibility changes)
   */
  private pauseRequests(): void {
    // Could implement request pausing logic here
  }

  private resumeRequests(): void {
    // Could implement request resuming logic here
  }

  /**
   * Cleanup expired requests and optimistic updates
   */
  private cleanup(): void {
    const now = Date.now()
    
    // Clean up expired pending requests
    for (const [key, request] of Array.from(this.pendingRequests.entries())) {
      if (now - request.timestamp > this.REQUEST_TIMEOUT) {
        request.abortController.abort()
        this.pendingRequests.delete(key)
      }
    }
    
    // Clean up old optimistic updates
    for (const [id, update] of Array.from(this.optimisticUpdates.entries())) {
      if (now - update.timestamp > 30000) { // 30 seconds
        if (update.applied) {
          update.rollback()
        }
        this.optimisticUpdates.delete(id)
      }
    }
    
    // Clean up expired cache entries
    for (const [key, cached] of Array.from(this.requestCache.entries())) {
      if (now - cached.timestamp > cached.ttl) {
        this.requestCache.delete(key)
      }
    }
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Get stats for debugging
   */
  public getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      optimisticUpdates: this.optimisticUpdates.size,
      cacheEntries: this.requestCache.size,
      pendingRequestKeys: Array.from(this.pendingRequests.keys()),
      optimisticUpdateIds: Array.from(this.optimisticUpdates.keys()),
      cacheKeys: Array.from(this.requestCache.keys())
    }
  }
}

// Export singleton instance
export const requestDeduplicationManager = RequestDeduplicationManager.getInstance()

// React hook for using request deduplication
export function useRequestDeduplication() {
  return {
    executeRequest: requestDeduplicationManager.executeRequest.bind(requestDeduplicationManager),
    abortRequests: requestDeduplicationManager.abortPendingRequests.bind(requestDeduplicationManager),
    clearCache: requestDeduplicationManager.clearCache.bind(requestDeduplicationManager),
    getStats: requestDeduplicationManager.getStats.bind(requestDeduplicationManager)
  }
}