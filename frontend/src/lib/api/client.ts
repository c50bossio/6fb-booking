/**
 * Enhanced API client with caching, retry logic, and error handling
 */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { smartStorage } from '../utils/storage'
import { errorTracker } from '../monitoring/errorTracking'
import { cacheManager } from '../cache/cacheManager'

// Type definitions for enhanced API client
interface EnhancedAxiosRequestConfig extends AxiosRequestConfig {
  enableCache?: boolean
  cacheTTL?: number
  cacheStrategy?: string
  cacheTags?: string[]
  cacheDependencies?: string[]
  cachePriority?: 'low' | 'medium' | 'high'
  allowDuplication?: boolean
  allowRetry?: boolean
  allowOffline?: boolean
  metadata?: {
    requestId?: string
    startTime?: number
    fromCache?: boolean
    fromAdvancedCache?: boolean
    deduplicated?: boolean
    duration?: number
    cacheKey?: string
  }
}

// Extend axios interfaces to include our custom properties
declare module 'axios' {
  interface AxiosRequestConfig {
    enableCache?: boolean
    cacheTTL?: number
    cacheStrategy?: string
    cacheTags?: string[]
    cacheDependencies?: string[]
    cachePriority?: 'low' | 'medium' | 'high'
    allowDuplication?: boolean
    allowRetry?: boolean
    allowOffline?: boolean
    metadata?: {
      requestId?: string
      startTime?: number
      fromCache?: boolean
      fromAdvancedCache?: boolean
      deduplicated?: boolean
      duration?: number
      cacheKey?: string
    }
  }

  interface AxiosResponse {
    metadata?: {
      requestId?: string
      startTime?: number
      fromCache?: boolean
      fromAdvancedCache?: boolean
      deduplicated?: boolean
      duration?: number
      cacheKey?: string
    }
  }
}

interface ApiError extends Error {
  userMessage?: string
  status?: number
  errorCode?: string
  retryAfter?: number
}

// Request deduplication and caching
interface PendingRequest {
  promise: Promise<any>
  timestamp: number
}

const pendingRequests = new Map<string, PendingRequest>()
const requestCache = new Map<string, { data: any; timestamp: number; ttl: number }>()

// Network status tracking
let isOnline = typeof window !== 'undefined' ? navigator.onLine : true
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { isOnline = true })
  window.addEventListener('offline', () => { isOnline = false })
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

// Log API configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('API Configuration:', {
    baseURL: API_BASE_URL,
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development'
  })
}

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Enhanced request interceptor with advanced caching and deduplication
apiClient.interceptors.request.use(
  async (config) => {
    try {
      // Check network connectivity
      if (!isOnline && !config.allowOffline) {
        return Promise.reject(new Error('No internet connection'))
      }

      // Use safe storage to get token
      const token = smartStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }

      // Add request ID for debugging and tracking
      const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      config.headers['X-Request-ID'] = requestId
      config.metadata = { requestId, startTime: Date.now() }

      // Handle cache invalidation for mutation operations
      const invalidationTags = shouldInvalidateCache(config)
      if (invalidationTags.length > 0) {
        // Invalidate related cache entries before making the request
        for (const tag of invalidationTags) {
          const invalidatedCount = cacheManager.invalidateByTag(tag)
          if (process.env.NODE_ENV === 'development' && invalidatedCount > 0) {
            console.log(`Cache invalidated: ${invalidatedCount} entries for tag "${tag}"`)
          }
        }
      }

      // Check for cached responses for GET requests using advanced cache
      if (config.method === 'get' && config.enableCache !== false) {
        const smartCacheKey = getSmartCacheKey(config)
        config.metadata.cacheKey = smartCacheKey
        
        try {
          const cachedData = await cacheManager.get(smartCacheKey)
          if (cachedData !== null) {
            // Return cached response from advanced cache
            config.metadata.fromAdvancedCache = true
            config.metadata.fromCache = true
            
            if (process.env.NODE_ENV === 'development') {
              console.log('Cache hit (advanced):', {
                method: config.method?.toUpperCase(),
                url: config.url,
                cacheKey: smartCacheKey
              })
            }
            
            return Promise.resolve({
              data: cachedData,
              status: 200,
              statusText: 'OK',
              headers: { 'X-Cache': 'HIT' },
              config,
              request: {},
              metadata: config.metadata
            })
          }
        } catch (cacheError) {
          console.warn('Advanced cache get error:', cacheError)
          // Fall through to legacy cache check
        }

        // Fallback to legacy cache for backward compatibility  
        const legacyCacheKey = getCacheKey(config)
        const cached = requestCache.get(legacyCacheKey)
        
        if (cached && Date.now() - cached.timestamp < cached.ttl) {
          // Return cached response from legacy cache
          config.metadata.fromCache = true
          return Promise.resolve({
            data: cached.data,
            status: 200,
            statusText: 'OK',
            headers: { 'X-Cache': 'HIT-LEGACY' },
            config,
            request: {},
            metadata: config.metadata
          })
        }
      }

      // Request deduplication for identical requests
      if (config.method === 'get' && config.allowDuplication !== true) {
        const dedupeKey = getDeduplicationKey(config)
        const pending = pendingRequests.get(dedupeKey)
        
        if (pending && Date.now() - pending.timestamp < 5000) {
          // Return existing promise for identical request
          config.metadata.deduplicated = true
          return pending.promise
        }
      }

      // Process cache headers (Cache-Control, ETag support)
      if (config.headers['Cache-Control']) {
        const cacheControl = config.headers['Cache-Control']
        if (cacheControl.includes('no-cache') || cacheControl.includes('no-store')) {
          config.enableCache = false
        } else if (cacheControl.includes('max-age=')) {
          const maxAge = parseInt(cacheControl.match(/max-age=(\d+)/)?.[1] || '0', 10)
          config.cacheTTL = maxAge * 1000 // Convert seconds to milliseconds
        }
      }

      // Log outgoing requests in development
      if (process.env.NODE_ENV === 'development') {
        console.log('API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          hasAuth: !!token,
          fromCache: config.metadata?.fromCache,
          fromAdvancedCache: config.metadata?.fromAdvancedCache,
          deduplicated: config.metadata?.deduplicated,
          cacheKey: config.metadata?.cacheKey,
          timestamp: new Date().toISOString()
        })
      }
    } catch (e) {
      // Handle any unexpected errors
      console.warn('Error in request interceptor:', e)
    }
    return config
  },
  (error) => {
    console.error('Request interceptor error:', error)
    return Promise.reject(error)
  }
)

// Enhanced helper functions for caching and deduplication
function getSmartCacheKey(config: any): string {
  // Create a base key with method and URL
  const baseUrl = config.url?.replace(config.baseURL || '', '') || ''
  const method = config.method?.toUpperCase() || 'GET'
  
  // Sort parameters for consistent key generation
  const sortedParams = config.params ? 
    Object.keys(config.params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = config.params[key]
        return acc
      }, {} as any) : {}
  
  // Create hash-friendly parameter string
  const paramString = Object.keys(sortedParams).length > 0 ? 
    JSON.stringify(sortedParams) : ''
  
  // Include relevant headers that affect caching
  const relevantHeaders = ['Authorization', 'Accept-Language', 'X-User-Role']
  const headerString = relevantHeaders
    .filter(header => config.headers?.[header])
    .map(header => `${header}:${config.headers[header]}`)
    .sort()
    .join('|')
  
  // Generate cache key with api: prefix for strategy matching
  const keyParts = ['api', method, baseUrl]
  if (paramString) keyParts.push(btoa(paramString).slice(0, 16)) // Base64 encoded params (truncated)
  if (headerString) keyParts.push(btoa(headerString).slice(0, 16)) // Base64 encoded headers (truncated)
  
  return keyParts.join(':')
}

function getCacheKey(config: any): string {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}`
}

function getDeduplicationKey(config: any): string {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}:${JSON.stringify(config.data || {})}`
}

// Cache invalidation helpers
function getInvalidationTags(config: any): string[] {
  const tags: string[] = []
  const url = config.url || ''
  const method = config.method?.toUpperCase() || 'GET'
  
  // Add resource-based tags
  if (url.includes('/users')) tags.push('users')
  if (url.includes('/appointments')) tags.push('appointments')
  if (url.includes('/barbers')) tags.push('barbers')
  if (url.includes('/clients')) tags.push('clients')
  if (url.includes('/analytics')) tags.push('analytics')
  if (url.includes('/financial')) tags.push('financial')
  if (url.includes('/services')) tags.push('services')
  
  // Add general API tag
  tags.push('api')
  
  return tags
}

function shouldInvalidateCache(config: any): string[] {
  const method = config.method?.toUpperCase()
  const invalidationTags: string[] = []
  
  // Only invalidate for mutation operations
  if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    return invalidationTags
  }
  
  // Get tags that should be invalidated based on the operation
  const resourceTags = getInvalidationTags(config)
  invalidationTags.push(...resourceTags)
  
  // Add specific invalidation patterns
  const url = config.url || ''
  
  // User operations invalidate user-related caches
  if (url.includes('/users') || url.includes('/auth')) {
    invalidationTags.push('users', 'auth')
  }
  
  // Appointment operations invalidate appointments and analytics
  if (url.includes('/appointments')) {
    invalidationTags.push('appointments', 'analytics', 'calendar')
  }
  
  // Financial operations invalidate financial and analytics data
  if (url.includes('/financial') || url.includes('/payouts') || url.includes('/payments')) {
    invalidationTags.push('financial', 'analytics', 'dashboard')
  }
  
  return Array.from(new Set(invalidationTags)) // Remove duplicates
}

// Enhanced response interceptor with advanced caching
apiClient.interceptors.response.use(
  async (response) => {
    try {
      const config = response.config
      const metadata = config.metadata || {}

      // Cache successful GET responses using advanced cache manager
      if (config.method === 'get' && response.status === 200 && config.enableCache !== false && !metadata.fromCache) {
        const smartCacheKey = metadata.cacheKey || getSmartCacheKey(config)
        
        // Determine cache options
        const cacheOptions = {
          ttl: config.cacheTTL,
          strategy: config.cacheStrategy || 'api',
          tags: config.cacheTags || getInvalidationTags(config),
          dependencies: config.cacheDependencies || [],
          priority: config.cachePriority
        }

        // Handle ETag caching
        const etag = response.headers?.etag || response.headers?.ETag
        if (etag) {
          cacheOptions.tags = [...(cacheOptions.tags || []), `etag:${etag}`]
        }

        try {
          // Store in advanced cache
          const cacheSuccess = await cacheManager.set(smartCacheKey, response.data, cacheOptions)
          
          if (process.env.NODE_ENV === 'development' && cacheSuccess) {
            console.log('Response cached (advanced):', {
              method: config.method?.toUpperCase(),
              url: config.url,
              cacheKey: smartCacheKey,
              tags: cacheOptions.tags,
              ttl: cacheOptions.ttl
            })
          }
        } catch (cacheError) {
          console.warn('Advanced cache set error:', cacheError)
          // Fall back to legacy cache
          const legacyCacheKey = getCacheKey(config)
          const ttl = config.cacheTTL || 300000 // Default 5 minutes
          
          requestCache.set(legacyCacheKey, {
            data: response.data,
            timestamp: Date.now(),
            ttl
          })
        }

        // Keep legacy cache cleanup for backward compatibility
        if (requestCache.size > 100) {
          const entries = Array.from(requestCache.entries())
          entries.sort((a, b) => b[1].timestamp - a[1].timestamp)
          requestCache.clear()
          entries.slice(0, 100).forEach(([key, value]) => requestCache.set(key, value))
        }
      }

      // Clean up pending requests
      if (config.method === 'get') {
        const dedupeKey = getDeduplicationKey(config)
        pendingRequests.delete(dedupeKey)
      }

      // Add response timing and metadata
      if (metadata.startTime) {
        const duration = Date.now() - metadata.startTime
        response.metadata = { ...metadata, duration }
      }

      // Add cache warming for frequently accessed endpoints
      if (config.method === 'get' && !metadata.fromCache) {
        const url = config.url || ''
        
        // Warm cache for related endpoints
        const warmingCandidates: string[] = []
        
        if (url.includes('/appointments') && !url.includes('/appointments/')) {
          // If fetching appointments list, warm individual appointment cache
          const appointmentIds = response.data?.data?.slice(0, 5)?.map((apt: any) => apt.id) || []
          warmingCandidates.push(...appointmentIds.map((id: any) => `/appointments/${id}`))
        }
        
        if (url.includes('/users/me')) {
          // If fetching current user, warm related data
          warmingCandidates.push('/users/me/appointments', '/users/me/analytics')
        }
        
        // Perform cache warming asynchronously (don't block response)
        if (warmingCandidates.length > 0) {
          setTimeout(() => {
            cacheManager.prefetch(warmingCandidates, 'low').catch(err => {
              console.warn('Cache warming failed:', err)
            })
          }, 100)
        }
      }

      // Log successful requests in development
      if (process.env.NODE_ENV === 'development') {
        console.log('API Success:', {
          method: response.config.method?.toUpperCase(),
          url: response.config.url,
          status: response.status,
          duration: response.metadata?.duration,
          fromCache: metadata.fromCache,
          fromAdvancedCache: metadata.fromAdvancedCache,
          cached: config.method === 'get' && config.enableCache !== false,
          cacheKey: metadata.cacheKey
        })
      }
    } catch (e) {
      console.warn('Error in response interceptor:', e)
    }
    
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Clean up pending requests on error
    if (originalRequest?.method === 'get') {
      const dedupeKey = getDeduplicationKey(originalRequest)
      pendingRequests.delete(dedupeKey)
    }

    // Log error details with better context
    const errorInfo = {
      url: originalRequest?.url,
      method: originalRequest?.method?.toUpperCase(),
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.message || error.message,
      details: error.response?.data?.detail || null,
      errorCode: error.response?.data?.error_code || null,
      retryAfter: error.response?.data?.retry_after || null,
      timestamp: new Date().toISOString()
    }

    console.error('API Error:', errorInfo)

    // Report API error to monitoring system
    errorTracker.captureApiError(
      error,
      originalRequest?.url || 'unknown',
      originalRequest?.method?.toUpperCase() || 'GET',
      originalRequest?.headers?.['X-Request-ID']
    )

    // Handle 401 Unauthorized - redirect to login
    if (error.response?.status === 401) {
      // Clear stored tokens
      smartStorage.removeItem('access_token')
      smartStorage.removeItem('user')

      // Only redirect if not already on login/auth pages and window is available
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname
        const authPaths = ['/login', '/signup', '/reset-password']

        if (!authPaths.some(path => currentPath.includes(path))) {
          // Store current location for redirect after login
          smartStorage.setItem('redirect_after_login', currentPath)
          window.location.href = '/login'
        }
      }
      return Promise.reject(error)
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('Access forbidden - insufficient permissions')
      return Promise.reject(error)
    }

    // Handle 404 Not Found - don't retry
    if (error.response?.status === 404) {
      return Promise.reject(error)
    }

    // Handle 422 Validation Error - don't retry
    if (error.response?.status === 422) {
      return Promise.reject(error)
    }

    // Enhanced retry logic for network failures
    if (!error.response && !originalRequest._retry) {
      originalRequest._retry = true

      // Check if we should retry based on method (don't retry mutations by default)
      const safeToRetry = originalRequest.method === 'get' || originalRequest.allowRetry === true
      if (!safeToRetry) {
        return Promise.reject(error)
      }

      // Wait with exponential backoff
      const retryCount = originalRequest._retryCount || 0
      const delay = Math.min(1000 * Math.pow(2, retryCount), 5000)
      await new Promise(resolve => setTimeout(resolve, delay))

      if (process.env.NODE_ENV === 'development') {
        console.log(`Retrying network failure (attempt ${retryCount + 1}):`, originalRequest.url)
      }

      originalRequest._retryCount = retryCount + 1
      
      // Add to pending requests for deduplication
      if (originalRequest.method === 'get') {
        const dedupeKey = getDeduplicationKey(originalRequest)
        const promise = apiClient(originalRequest)
        pendingRequests.set(dedupeKey, { promise, timestamp: Date.now() })
        return promise
      }
      
      return apiClient(originalRequest)
    }

    // Handle 429 Rate Limiting with respect for retry_after
    if (error.response?.status === 429) {
      const retryAfter = errorInfo.retryAfter || 1
      const delay = retryAfter * 1000 // Convert to milliseconds
      
      if (!originalRequest._retry && (originalRequest._retryCount || 0) < 3) {
        originalRequest._retry = true
        originalRequest._retryCount = (originalRequest._retryCount || 0) + 1

        if (process.env.NODE_ENV === 'development') {
          console.log(`Rate limited, retrying after ${retryAfter}s (attempt ${originalRequest._retryCount}):`, originalRequest.url)
        }

        await new Promise(resolve => setTimeout(resolve, delay))
        return apiClient(originalRequest)
      }
    }

    // Handle 500+ server errors with limited retry and respect for retry_after
    if (error.response?.status >= 500 && !originalRequest._retry && (originalRequest._retryCount || 0) < 2) {
      originalRequest._retry = true
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1

      // Use retry_after from server or calculate exponential backoff
      const retryAfter = errorInfo.retryAfter
      const delay = retryAfter 
        ? retryAfter * 1000 
        : Math.min(2000 * Math.pow(2, originalRequest._retryCount - 1), 10000)

      await new Promise(resolve => setTimeout(resolve, delay))

      if (process.env.NODE_ENV === 'development') {
        console.log(`Retrying server error (attempt ${originalRequest._retryCount}):`, originalRequest.url)
      }

      return apiClient(originalRequest)
    }

    // For client errors (4xx), add user-friendly error handling
    if (error.response?.status >= 400 && error.response?.status < 500) {
      // Enhance error with user-friendly message
      error.userMessage = getUserFriendlyErrorMessage(error.response.status, error.response.data)
    }

    return Promise.reject(error)
  }
)

/**
 * Get user-friendly error messages for common HTTP status codes
 */
function getUserFriendlyErrorMessage(status: number, data: any): string {
  switch (status) {
    case 400:
      return data?.message || 'Invalid request. Please check your input and try again.'
    case 401:
      return 'Your session has expired. Please log in again.'
    case 403:
      return 'You don\'t have permission to perform this action.'
    case 404:
      return 'The requested resource was not found.'
    case 409:
      return data?.message || 'This action conflicts with existing data.'
    case 422:
      return data?.message || 'Please check your input and try again.'
    case 429:
      return 'Too many requests. Please wait a moment and try again.'
    case 500:
      return 'Server error. Please try again later.'
    case 502:
      return 'Service temporarily unavailable. Please try again later.'
    case 503:
      return 'Service maintenance in progress. Please try again later.'
    default:
      return data?.message || 'An unexpected error occurred. Please try again.'
  }
}

// Enhanced utility functions for API management with advanced caching
export const apiUtils = {
  /**
   * Clear all cached responses (both legacy and advanced)
   */
  clearCache(): void {
    // Clear legacy cache
    requestCache.clear()
    
    // Clear advanced cache
    cacheManager.clear()
    
    if (process.env.NODE_ENV === 'development') {
      console.log('All API caches cleared (legacy + advanced)')
    }
  },

  /**
   * Clear specific cache entries by pattern
   */
  clearCacheByPattern(pattern: string): void {
    // Clear legacy cache by pattern
    const keys = Array.from(requestCache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        requestCache.delete(key)
      }
    })
    
    // Clear advanced cache by tag (more efficient)
    let invalidatedCount = 0
    if (pattern.includes('/users')) invalidatedCount += cacheManager.invalidateByTag('users')
    if (pattern.includes('/appointments')) invalidatedCount += cacheManager.invalidateByTag('appointments')
    if (pattern.includes('/analytics')) invalidatedCount += cacheManager.invalidateByTag('analytics')
    if (pattern.includes('/financial')) invalidatedCount += cacheManager.invalidateByTag('financial')
    
    // Fallback: invalidate by general api tag if no specific matches
    if (invalidatedCount === 0) {
      invalidatedCount = cacheManager.invalidateByTag('api')
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`API cache cleared for pattern: ${pattern} (${invalidatedCount} advanced entries)`)
    }
  },

  /**
   * Clear cache by tag (advanced cache feature)
   */
  clearCacheByTag(tag: string): number {
    const invalidated = cacheManager.invalidateByTag(tag)
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Cache cleared for tag: ${tag} (${invalidated} entries)`)
    }
    
    return invalidated
  },

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats(): {
    legacy: {
      size: number
      entries: Array<{ key: string; age: number; ttl: number }>
    }
    advanced: {
      size: number
      memoryUsage: number
      metrics: any
    }
  } {
    // Legacy cache stats
    const now = Date.now()
    const legacyEntries = Array.from(requestCache.entries()).map(([key, value]) => ({
      key,
      age: now - value.timestamp,
      ttl: value.ttl
    }))

    // Advanced cache stats
    const advancedSize = cacheManager.getSize()
    const advancedMetrics = cacheManager.getMetrics()

    return {
      legacy: {
        size: requestCache.size,
        entries: legacyEntries
      },
      advanced: {
        size: advancedSize.entries,
        memoryUsage: advancedSize.memoryUsage,
        metrics: advancedMetrics
      }
    }
  },

  /**
   * Get pending requests info
   */
  getPendingRequests(): Array<{ key: string; age: number }> {
    const now = Date.now()
    return Array.from(pendingRequests.entries()).map(([key, value]) => ({
      key,
      age: now - value.timestamp
    }))
  },

  /**
   * Get network status
   */
  isOnline(): boolean {
    return isOnline
  },

  /**
   * Force refresh a cached endpoint with smart cache key
   */
  async refreshCache(url: string, params?: any, config?: any): Promise<any> {
    const requestConfig = { method: 'get', url, params, ...config }
    
    // Clear from both legacy and advanced cache
    const legacyCacheKey = getCacheKey(requestConfig)
    const smartCacheKey = getSmartCacheKey(requestConfig)
    
    requestCache.delete(legacyCacheKey)
    cacheManager.delete(smartCacheKey)
    
    return apiClient.get(url, { params, enableCache: true, ...config })
  },

  /**
   * Prefetch data into cache
   */
  async prefetchEndpoints(endpoints: string[], priority: 'low' | 'medium' | 'high' = 'low'): Promise<void> {
    try {
      await cacheManager.prefetch(endpoints, priority)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`Prefetched ${endpoints.length} endpoints with priority: ${priority}`)
      }
    } catch (error) {
      console.warn('Prefetch failed:', error)
    }
  },

  /**
   * Warm cache for frequently accessed data
   */
  async warmCache(): Promise<void> {
    const commonEndpoints = [
      '/auth/me',
      '/users/me',
      '/appointments/upcoming',
      '/analytics/dashboard'
    ]
    
    await this.prefetchEndpoints(commonEndpoints, 'medium')
  },

  /**
   * Check API health with enhanced metrics
   */
  async checkHealth(): Promise<{
    healthy: boolean
    status?: any
    error?: string
    cacheHealth?: any
  }> {
    try {
      const response = await apiClient.get('/health')
      const cacheMetrics = cacheManager.getMetrics()
      
      return {
        healthy: true,
        status: response.data,
        cacheHealth: {
          hitRate: cacheMetrics.hitRate,
          totalRequests: cacheMetrics.totalRequests,
          memoryUsage: cacheMetrics.memoryUsage
        }
      }
    } catch (error: any) {
      return {
        healthy: false,
        error: error.message || 'Health check failed'
      }
    }
  },

  /**
   * Test authentication
   */
  async testAuth(): Promise<{
    authenticated: boolean
    user?: any
    error?: string
  }> {
    try {
      const response = await apiClient.get('/auth/me')
      return {
        authenticated: true,
        user: response.data
      }
    } catch (error: any) {
      return {
        authenticated: false,
        error: error.response?.data?.detail || error.message || 'Authentication test failed'
      }
    }
  },

  /**
   * Get API configuration info with cache details
   */
  getConfig() {
    const cacheStats = this.getCacheStats()
    
    return {
      baseURL: API_BASE_URL,
      hasToken: !!smartStorage.getItem('access_token'),
      environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
      cache: {
        legacyEntries: cacheStats.legacy.size,
        advancedEntries: cacheStats.advanced.size,
        memoryUsage: cacheStats.advanced.memoryUsage,
        hitRate: cacheStats.advanced.metrics.hitRate
      }
    }
  },

  /**
   * Advanced cache management
   */
  cache: {
    /**
     * Get cache entry
     */
    async get<T>(key: string): Promise<T | null> {
      return cacheManager.get<T>(key)
    },

    /**
     * Set cache entry
     */
    async set<T>(key: string, data: T, options?: any): Promise<boolean> {
      return cacheManager.set(key, data, options)
    },

    /**
     * Delete cache entry
     */
    delete(key: string): boolean {
      return cacheManager.delete(key)
    },

    /**
     * Get cache metrics
     */
    getMetrics() {
      return cacheManager.getMetrics()
    },

    /**
     * Invalidate by tag
     */
    invalidateByTag(tag: string): number {
      return cacheManager.invalidateByTag(tag)
    }
  }
}

export default apiClient

// Type definitions
export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  full_name: string
  role: string
  is_active: boolean
  is_verified: boolean
  primary_location_id?: number
  permissions?: string[]
  sixfb_certification_level?: string
  certification_date?: string
  created_at: string
  updated_at: string
  last_login?: string
  phone_number?: string
  profile_image_url?: string | null
  location_id?: number
  barber_id?: number
}

export interface Location {
  id: number
  name: string
  location_code: string
  address: string
  city: string
  state: string
  zip_code: string
  phone: string
  email: string
  franchise_type: string
  is_active: boolean
  mentor_id?: number
  mentor_name?: string
  operating_hours: Record<string, string>
  capacity: number
  created_at: string
}

export interface Barber {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  location_id?: number
  location_name?: string
  user_id?: number
  commission_rate: number
  created_at: string
  sixfb_score?: number
  monthly_revenue?: number
  appointments_this_week?: number
}

export interface Appointment {
  id: number
  barber_id: number
  barber_name: string
  client_id?: number
  client_name: string
  client_email?: string
  client_phone?: string
  appointment_date: string
  appointment_time?: string
  status: string
  service_name: string
  service_duration: number
  service_price: number
  service_revenue?: number
  tip_amount?: number
  product_revenue?: number
  total_amount: number
  customer_type: string
  source: string
  notes?: string
  created_at: string
}

export interface TrainingModule {
  id: number
  title: string
  description: string
  category: string
  difficulty_level: string
  content_type: string
  estimated_duration: number
  passing_score: number
  required_for_certification?: string
  is_mandatory: boolean
  can_access: boolean
  enrollment_status: string
  progress: number
  best_score: number
}

export interface ApiResponse<T> {
  data: T
  message?: string
  status?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  totalPages?: number
  hasNext?: boolean
  hasPrev?: boolean
  limit?: number
}

export interface ErrorResponse {
  detail: string
  status_code?: number
}
