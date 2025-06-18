/**
 * Simple in-memory cache with TTL support
 */

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class Cache {
  private store: Map<string, CacheItem<any>> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const item = this.store.get(key)
    
    if (!item) return null
    
    // Check if item has expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key)
      return null
    }
    
    return item.data
  }

  /**
   * Set item in cache with TTL (in milliseconds)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    // Clear existing timer if any
    const existingTimer = this.timers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Store item
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })

    // Set auto-delete timer
    const timer = setTimeout(() => {
      this.delete(key)
    }, ttl)

    this.timers.set(key, timer)
  }

  /**
   * Delete item from cache
   */
  delete(key: string): void {
    this.store.delete(key)
    
    const timer = this.timers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(key)
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer))
    
    // Clear stores
    this.store.clear()
    this.timers.clear()
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.store.size
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const item = this.store.get(key)
    if (!item) return false
    
    // Check expiry
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key)
      return false
    }
    
    return true
  }
}

// Export singleton instance
export const cache = new Cache()

// Cache key generators
export const cacheKeys = {
  analytics: (type: string, startDate: string, endDate: string, locationId?: number) => 
    `analytics:${type}:${startDate}:${endDate}:${locationId || 'all'}`,
  
  user: (userId: number) => `user:${userId}`,
  
  location: (locationId: number) => `location:${locationId}`,
  
  barber: (barberId: number) => `barber:${barberId}`,
  
  appointments: (date: string, locationId?: number) => 
    `appointments:${date}:${locationId || 'all'}`
}

// Cache utilities
export const cacheUtils = {
  /**
   * Fetch with cache
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    // Check cache first
    const cached = cache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    // Fetch fresh data
    const data = await fetcher()
    
    // Store in cache
    cache.set(key, data, ttl)
    
    return data
  },

  /**
   * Invalidate related cache entries
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = []
    
    // Find matching keys (simple pattern matching)
    cache['store'].forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    })
    
    // Delete matching keys
    keysToDelete.forEach(key => cache.delete(key))
  }
}