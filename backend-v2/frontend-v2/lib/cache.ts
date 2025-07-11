/**
 * Intelligent Caching System for BookedBarber V2
 * 
 * Provides smart caching for API responses with automatic invalidation,
 * background refresh, and performance optimization for time slots.
 */

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  expiresAt: number
  key: string
  version: number
  stale?: boolean
}

export interface CacheOptions {
  /** Cache duration in milliseconds */
  ttl?: number
  /** Whether to serve stale data while refreshing in background */
  staleWhileRevalidate?: boolean
  /** Maximum stale time in milliseconds */
  maxStale?: number
  /** Custom cache key generator */
  keyGenerator?: (...args: any[]) => string
  /** Background refresh function */
  refreshFn?: () => Promise<any>
}

export interface TimeslotCacheKey {
  date: string
  service?: string
  barber?: number
}

class IntelligentCache {
  private cache = new Map<string, CacheEntry>()
  private refreshPromises = new Map<string, Promise<any>>()
  private version = 1

  // Default cache configurations for different data types
  private readonly defaultConfigs = {
    timeSlots: {
      ttl: 2 * 60 * 1000, // 2 minutes for time slots (frequently changing)
      staleWhileRevalidate: true,
      maxStale: 5 * 60 * 1000, // 5 minutes max stale
    },
    nextAvailable: {
      ttl: 1 * 60 * 1000, // 1 minute for next available (very dynamic)
      staleWhileRevalidate: true,
      maxStale: 3 * 60 * 1000, // 3 minutes max stale
    },
    userProfile: {
      ttl: 10 * 60 * 1000, // 10 minutes for user profile (rarely changes)
      staleWhileRevalidate: false,
      maxStale: 30 * 60 * 1000, // 30 minutes max stale
    },
    bookingSettings: {
      ttl: 30 * 60 * 1000, // 30 minutes for booking settings (static)
      staleWhileRevalidate: true,
      maxStale: 60 * 60 * 1000, // 1 hour max stale
    }
  }

  /**
   * Generates a cache key for time slots based on date and optional filters
   */
  generateTimeslotKey(date: string, service?: string, barber?: number): string {
    const parts = ['timeslots', date]
    if (service) parts.push(`service:${service}`)
    if (barber) parts.push(`barber:${barber}`)
    return parts.join('|')
  }

  /**
   * Generates a cache key for next available slot
   */
  generateNextAvailableKey(service?: string): string {
    const parts = ['next-available']
    if (service) parts.push(`service:${service}`)
    return parts.join('|')
  }

  /**
   * Get data from cache with intelligent stale-while-revalidate
   */
  async get<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const config = { ...this.getDefaultConfig(key), ...options }
    const entry = this.cache.get(key)
    const now = Date.now()

    // Cache hit - fresh data
    if (entry && now < entry.expiresAt && entry.version === this.version) {
      return entry.data
    }

    // Cache hit - stale data, serve while revalidating
    if (entry && config.staleWhileRevalidate && 
        now < (entry.expiresAt + (config.maxStale || 0)) &&
        entry.version === this.version) {
      
      // Serve stale data immediately
      const staleData = entry.data
      
      // Background refresh (don't await)
      this.refreshInBackground(key, fetchFn, config)
      
      return staleData
    }

    // Cache miss or expired - fetch fresh data
    return this.fetchAndCache(key, fetchFn, config)
  }

  /**
   * Set data in cache with metadata
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const config = { ...this.getDefaultConfig(key), ...options }
    const now = Date.now()
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + (config.ttl || 5 * 60 * 1000),
      key,
      version: this.version
    }

    this.cache.set(key, entry)
    
    // Clean up old entries periodically
    if (this.cache.size > 100) {
      this.cleanup()
    }
  }

  /**
   * Invalidate specific cache entries
   */
  invalidate(pattern?: string | RegExp): void {
    if (!pattern) {
      // Invalidate all
      this.cache.clear()
      this.refreshPromises.clear()
      return
    }

    const keysToDelete: string[] = []
    
    for (const key of this.cache.keys()) {
      const matches = typeof pattern === 'string' 
        ? key.includes(pattern)
        : pattern.test(key)
      
      if (matches) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key)
      this.refreshPromises.delete(key)
    })
  }

  /**
   * Invalidate all time slot related cache when booking is made
   */
  invalidateTimeSlots(date?: string): void {
    if (date) {
      // Invalidate specific date
      this.invalidate(`timeslots|${date}`)
    } else {
      // Invalidate all time slots
      this.invalidate(/^timeslots\|/)
    }
    
    // Always invalidate next available when time slots change
    this.invalidate(/^next-available/)
  }

  /**
   * Preload cache with common data patterns
   */
  async preload(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    // Preload today and tomorrow's slots in background
    const { appointmentsAPI } = await import('./api')
    
    // Don't await these - run in background
    this.get(
      this.generateTimeslotKey(today),
      () => appointmentsAPI.getAvailableSlots(today)
    ).catch(console.warn)

    this.get(
      this.generateTimeslotKey(tomorrow),
      () => appointmentsAPI.getAvailableSlots(tomorrow)
    ).catch(console.warn)

    this.get(
      this.generateNextAvailableKey(),
      async () => {
        const { getNextAvailableSlot } = await import('./api')
        return getNextAvailableSlot()
      }
    ).catch(console.warn)
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): {
    size: number
    entries: Array<{ key: string; age: number; fresh: boolean }>
  } {
    const now = Date.now()
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      age: now - entry.timestamp,
      fresh: now < entry.expiresAt
    }))

    return {
      size: this.cache.size,
      entries
    }
  }

  /**
   * Force refresh of specific cache entry
   */
  async refresh<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const data = await fetchFn()
    this.set(key, data)
    return data
  }

  // Private methods

  private async refreshInBackground<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config: CacheOptions
  ): void {
    // Prevent multiple concurrent refreshes
    if (this.refreshPromises.has(key)) {
      return
    }

    const refreshPromise = fetchFn()
      .then(data => {
        this.set(key, data, config)
        return data
      })
      .catch(error => {
        console.warn(`Background refresh failed for ${key}:`, error)
      })
      .finally(() => {
        this.refreshPromises.delete(key)
      })

    this.refreshPromises.set(key, refreshPromise)
  }

  private async fetchAndCache<T>(
    key: string,
    fetchFn: () => Promise<T>,
    config: CacheOptions
  ): Promise<T> {
    // Check if already fetching
    const existingPromise = this.refreshPromises.get(key)
    if (existingPromise) {
      return existingPromise
    }

    const promise = fetchFn()
      .then(data => {
        this.set(key, data, config)
        return data
      })
      .finally(() => {
        this.refreshPromises.delete(key)
      })

    this.refreshPromises.set(key, promise)
    return promise
  }

  private getDefaultConfig(key: string): CacheOptions {
    if (key.startsWith('timeslots')) return this.defaultConfigs.timeSlots
    if (key.startsWith('next-available')) return this.defaultConfigs.nextAvailable
    if (key.startsWith('profile')) return this.defaultConfigs.userProfile
    if (key.startsWith('settings')) return this.defaultConfigs.bookingSettings
    
    // Default config
    return {
      ttl: 5 * 60 * 1000, // 5 minutes
      staleWhileRevalidate: true,
      maxStale: 10 * 60 * 1000 // 10 minutes
    }
  }

  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      // Remove entries that are beyond max stale time
      const maxStale = this.getDefaultConfig(key).maxStale || 10 * 60 * 1000
      if (now > entry.expiresAt + maxStale) {
        toDelete.push(key)
      }
    }

    toDelete.forEach(key => this.cache.delete(key))
  }

  /**
   * Increment cache version to invalidate all entries
   */
  invalidateAll(): void {
    this.version++
    this.cache.clear()
    this.refreshPromises.clear()
  }
}

// Global cache instance
export const cache = new IntelligentCache()

// Cache management hooks for React components
export function useCacheInvalidation() {
  return {
    invalidateTimeSlots: (date?: string) => cache.invalidateTimeSlots(date),
    invalidateAll: () => cache.invalidateAll(),
    invalidate: (pattern: string | RegExp) => cache.invalidate(pattern),
    getStats: () => cache.getStats()
  }
}

// Initialize cache preloading
if (typeof window !== 'undefined') {
  // Preload cache after a short delay to not block initial render
  setTimeout(() => {
    cache.preload().catch(console.warn)
  }, 1000)
  
  // Refresh cache when user focuses window (they might have missed updates)
  window.addEventListener('focus', () => {
    cache.invalidate(/^timeslots\|/)
    cache.invalidate(/^next-available/)
    setTimeout(() => cache.preload().catch(console.warn), 100)
  })
}