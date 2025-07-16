'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { format, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInDays } from 'date-fns'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  expires: number
  hits: number
  lastAccessed: number
  size: number
  key: string
  priority: number
}

export interface CacheConfig {
  maxSize: number // Maximum cache size in MB
  maxEntries: number // Maximum number of entries
  defaultTTL: number // Default time to live in milliseconds
  prefetchDistance: number // Days to prefetch ahead/behind
  compressionEnabled: boolean
  persistToStorage: boolean
  evictionStrategy: 'lru' | 'lfu' | 'ttl' | 'size'
}

export interface LazyLoadConfig {
  threshold: number // Distance from viewport to trigger loading
  batchSize: number // Number of items to load at once
  maxConcurrency: number // Maximum concurrent requests
  retryAttempts: number
  retryDelay: number
  enablePrefetch: boolean
  prefetchDirection: 'forward' | 'backward' | 'both'
}

export interface CalendarDataRequest {
  startDate: Date
  endDate: Date
  view: 'day' | 'week' | 'month'
  barberId?: number
  locationId?: number
  includeDetails?: boolean
  filters?: Record<string, any>
}

export interface CalendarCacheManagerProps {
  children: React.ReactNode
  apiEndpoint: string
  cacheConfig?: Partial<CacheConfig>
  lazyLoadConfig?: Partial<LazyLoadConfig>
  onDataLoaded?: (data: any, request: CalendarDataRequest) => void
  onError?: (error: Error, request: CalendarDataRequest) => void
  className?: string
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 50, // 50MB
  maxEntries: 1000,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  prefetchDistance: 7, // 7 days
  compressionEnabled: true,
  persistToStorage: true,
  evictionStrategy: 'lru'
}

const DEFAULT_LAZY_LOAD_CONFIG: LazyLoadConfig = {
  threshold: 200, // 200px
  batchSize: 50,
  maxConcurrency: 3,
  retryAttempts: 3,
  retryDelay: 1000,
  enablePrefetch: true,
  prefetchDirection: 'both'
}

export class CalendarCache<T = any> {
  private cache: Map<string, CacheEntry<T>>
  private config: CacheConfig
  private accessOrder: string[] // For LRU
  private accessCount: Map<string, number> // For LFU
  private currentSize: number // Current cache size in bytes

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config }
    this.cache = new Map()
    this.accessOrder = []
    this.accessCount = new Map()
    this.currentSize = 0
    
    if (this.config.persistToStorage) {
      this.loadFromStorage()
    }
  }

  // Generate cache key
  private generateKey(request: CalendarDataRequest): string {
    const keyParts = [
      format(request.startDate, 'yyyy-MM-dd'),
      format(request.endDate, 'yyyy-MM-dd'),
      request.view,
      request.barberId || 'all',
      request.locationId || 'all',
      JSON.stringify(request.filters || {})
    ]
    return keyParts.join('|')
  }

  // Estimate data size
  private estimateSize(data: T): number {
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch {
      return JSON.stringify(data).length * 2 // Rough estimate
    }
  }

  // Compress data if enabled
  private async compressData(data: T): Promise<string> {
    if (!this.config.compressionEnabled) {
      return JSON.stringify(data)
    }

    try {
      const jsonString = JSON.stringify(data)
      
      // Use CompressionStream if available (modern browsers)
      if ('CompressionStream' in window) {
        const stream = new CompressionStream('gzip')
        const writer = stream.writable.getWriter()
        const reader = stream.readable.getReader()
        
        writer.write(new TextEncoder().encode(jsonString))
        writer.close()
        
        const chunks: Uint8Array[] = []
        let done = false
        
        while (!done) {
          const result = await reader.read()
          done = result.done
          if (result.value) chunks.push(result.value)
        }
        
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          compressed.set(chunk, offset)
          offset += chunk.length
        }
        
        return btoa(String.fromCharCode(...compressed))
      }
      
      // Fallback: simple compression
      return this.simpleCompress(jsonString)
    } catch {
      return JSON.stringify(data)
    }
  }

  // Simple compression fallback
  private simpleCompress(str: string): string {
    const compressed: string[] = []
    let i = 0
    
    while (i < str.length) {
      let count = 1
      let char = str[i]
      
      while (i + count < str.length && str[i + count] === char && count < 9) {
        count++
      }
      
      if (count > 3) {
        compressed.push(`${count}${char}`)
      } else {
        compressed.push(char.repeat(count))
      }
      
      i += count
    }
    
    return compressed.join('')
  }

  // Decompress data
  private async decompressData(compressedData: string): Promise<T> {
    if (!this.config.compressionEnabled) {
      return JSON.parse(compressedData)
    }

    try {
      // Try decompression first
      if ('DecompressionStream' in window) {
        const compressed = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0))
        const stream = new DecompressionStream('gzip')
        const writer = stream.writable.getWriter()
        const reader = stream.readable.getReader()
        
        writer.write(compressed)
        writer.close()
        
        const chunks: Uint8Array[] = []
        let done = false
        
        while (!done) {
          const result = await reader.read()
          done = result.done
          if (result.value) chunks.push(result.value)
        }
        
        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
        let offset = 0
        for (const chunk of chunks) {
          decompressed.set(chunk, offset)
          offset += chunk.length
        }
        
        const jsonString = new TextDecoder().decode(decompressed)
        return JSON.parse(jsonString)
      }
      
      // Fallback to simple decompression or direct parsing
      return JSON.parse(compressedData)
    } catch {
      // If decompression fails, try direct parsing
      return JSON.parse(compressedData)
    }
  }

  // Evict entries based on strategy
  private evict(): void {
    if (this.cache.size === 0) return

    let keyToEvict: string | null = null

    switch (this.config.evictionStrategy) {
      case 'lru':
        keyToEvict = this.accessOrder[0] || null
        break
        
      case 'lfu':
        let minCount = Infinity
        for (const [key, entry] of this.cache) {
          const count = this.accessCount.get(key) || 0
          if (count < minCount) {
            minCount = count
            keyToEvict = key
          }
        }
        break
        
      case 'ttl':
        const now = Date.now()
        for (const [key, entry] of this.cache) {
          if (entry.expires < now) {
            keyToEvict = key
            break
          }
        }
        break
        
      case 'size':
        let maxSize = 0
        for (const [key, entry] of this.cache) {
          if (entry.size > maxSize) {
            maxSize = entry.size
            keyToEvict = key
          }
        }
        break
    }

    if (keyToEvict) {
      this.delete(keyToEvict)
    }
  }

  // Set cache entry
  async set(request: CalendarDataRequest, data: T, ttl?: number): Promise<void> {
    const key = this.generateKey(request)
    const now = Date.now()
    const size = this.estimateSize(data)
    const expires = now + (ttl || this.config.defaultTTL)

    // Check if we need to evict
    while (
      (this.cache.size >= this.config.maxEntries) ||
      (this.currentSize + size > this.config.maxSize * 1024 * 1024)
    ) {
      this.evict()
    }

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.delete(key)
    }

    const compressedData = await this.compressData(data)
    
    const entry: CacheEntry<T> = {
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      timestamp: now,
      expires,
      hits: 0,
      lastAccessed: now,
      size,
      key,
      priority: this.calculatePriority(request, data)
    }

    this.cache.set(key, entry)
    this.currentSize += size
    this.accessOrder.push(key)
    this.accessCount.set(key, 0)

    if (this.config.persistToStorage) {
      this.saveToStorage()
    }
  }

  // Get cache entry
  async get(request: CalendarDataRequest): Promise<T | null> {
    const key = this.generateKey(request)
    const entry = this.cache.get(key)

    if (!entry) return null

    const now = Date.now()
    
    // Check if expired
    if (entry.expires < now) {
      this.delete(key)
      return null
    }

    // Update access statistics
    entry.hits++
    entry.lastAccessed = now
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1)

    // Update LRU order
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
      this.accessOrder.push(key)
    }

    return entry.data
  }

  // Delete cache entry
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    this.cache.delete(key)
    this.currentSize -= entry.size
    
    const index = this.accessOrder.indexOf(key)
    if (index > -1) {
      this.accessOrder.splice(index, 1)
    }
    
    this.accessCount.delete(key)
    return true
  }

  // Clear cache
  clear(): void {
    this.cache.clear()
    this.accessOrder = []
    this.accessCount.clear()
    this.currentSize = 0
    
    if (this.config.persistToStorage) {
      localStorage.removeItem('calendarCache')
    }
  }

  // Calculate entry priority
  private calculatePriority(request: CalendarDataRequest, data: T): number {
    let priority = 1
    
    // Higher priority for current week/month
    const now = new Date()
    const daysDiff = Math.abs(differenceInDays(request.startDate, now))
    
    if (daysDiff <= 7) priority += 5
    else if (daysDiff <= 30) priority += 3
    else if (daysDiff <= 90) priority += 1
    
    // Higher priority for detailed data
    if (request.includeDetails) priority += 2
    
    // Higher priority for specific barber/location
    if (request.barberId) priority += 1
    if (request.locationId) priority += 1
    
    return priority
  }

  // Save to localStorage
  private saveToStorage(): void {
    try {
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        accessOrder: this.accessOrder,
        accessCount: Array.from(this.accessCount.entries()),
        currentSize: this.currentSize,
        timestamp: Date.now()
      }
      
      localStorage.setItem('calendarCache', JSON.stringify(cacheData))
    } catch (error) {
      console.warn('Failed to save cache to storage:', error)
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('calendarCache')
      if (!stored) return

      const cacheData = JSON.parse(stored)
      const now = Date.now()
      
      // Only load if cache is less than 1 hour old
      if (now - cacheData.timestamp > 60 * 60 * 1000) {
        localStorage.removeItem('calendarCache')
        return
      }

      this.cache = new Map(cacheData.entries.filter(([key, entry]: [string, CacheEntry<T>]) => {
        return entry.expires > now
      }))
      
      this.accessOrder = cacheData.accessOrder.filter(key => this.cache.has(key))
      this.accessCount = new Map(cacheData.accessCount.filter(([key]: [string, number]) => this.cache.has(key)))
      this.currentSize = cacheData.currentSize
    } catch (error) {
      console.warn('Failed to load cache from storage:', error)
      localStorage.removeItem('calendarCache')
    }
  }

  // Get cache statistics
  getStats() {
    const now = Date.now()
    const expiredCount = Array.from(this.cache.values()).filter(entry => entry.expires < now).length
    
    return {
      size: this.cache.size,
      currentSizeMB: (this.currentSize / (1024 * 1024)).toFixed(2),
      maxSizeMB: this.config.maxSize,
      utilization: (this.currentSize / (this.config.maxSize * 1024 * 1024) * 100).toFixed(1),
      expiredCount,
      hitRatio: this.calculateHitRatio(),
      oldestEntry: Math.min(...Array.from(this.cache.values()).map(e => e.timestamp)),
      newestEntry: Math.max(...Array.from(this.cache.values()).map(e => e.timestamp))
    }
  }

  private calculateHitRatio(): number {
    const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0)
    return this.cache.size > 0 ? (totalHits / this.cache.size) : 0
  }
}

// Lazy loading manager
export class LazyLoadManager {
  private config: LazyLoadConfig
  private loadingRequests: Set<string>
  private requestQueue: CalendarDataRequest[]
  private activeRequests: number
  private observers: Map<string, IntersectionObserver>

  constructor(config: Partial<LazyLoadConfig> = {}) {
    this.config = { ...DEFAULT_LAZY_LOAD_CONFIG, ...config }
    this.loadingRequests = new Set()
    this.requestQueue = []
    this.activeRequests = 0
    this.observers = new Map()
  }

  // Create intersection observer for lazy loading
  createObserver(callback: (entries: IntersectionObserverEntry[]) => void): IntersectionObserver {
    return new IntersectionObserver(callback, {
      rootMargin: `${this.config.threshold}px`,
      threshold: 0.1
    })
  }

  // Queue a data request
  async queueRequest(
    request: CalendarDataRequest,
    loader: (request: CalendarDataRequest) => Promise<any>,
    priority: number = 1
  ): Promise<any> {
    const key = this.generateRequestKey(request)
    
    if (this.loadingRequests.has(key)) {
      // Return existing promise if already loading
      return new Promise((resolve, reject) => {
        const checkCompletion = () => {
          if (!this.loadingRequests.has(key)) {
            resolve(null) // Request completed elsewhere
          } else {
            setTimeout(checkCompletion, 100)
          }
        }
        checkCompletion()
      })
    }

    this.requestQueue.push({ ...request, priority } as any)
    this.requestQueue.sort((a, b) => (b as any).priority - (a as any).priority)
    
    return this.processQueue(loader)
  }

  // Process request queue
  private async processQueue(loader: (request: CalendarDataRequest) => Promise<any>): Promise<any> {
    if (this.activeRequests >= this.config.maxConcurrency || this.requestQueue.length === 0) {
      return null
    }

    const request = this.requestQueue.shift()!
    const key = this.generateRequestKey(request)
    
    this.loadingRequests.add(key)
    this.activeRequests++

    try {
      const result = await this.executeWithRetry(request, loader)
      this.loadingRequests.delete(key)
      this.activeRequests--
      
      // Process next in queue
      if (this.requestQueue.length > 0) {
        this.processQueue(loader)
      }
      
      return result
    } catch (error) {
      this.loadingRequests.delete(key)
      this.activeRequests--
      throw error
    }
  }

  // Execute request with retry logic
  private async executeWithRetry(
    request: CalendarDataRequest,
    loader: (request: CalendarDataRequest) => Promise<any>
  ): Promise<any> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        return await loader(request)
      } catch (error) {
        lastError = error as Error
        
        if (attempt < this.config.retryAttempts - 1) {
          await new Promise(resolve => 
            setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempt))
          )
        }
      }
    }
    
    throw lastError
  }

  // Generate request key
  private generateRequestKey(request: CalendarDataRequest): string {
    return `${format(request.startDate, 'yyyy-MM-dd')}-${format(request.endDate, 'yyyy-MM-dd')}-${request.view}`
  }

  // Prefetch adjacent data
  async prefetch(
    currentRequest: CalendarDataRequest,
    loader: (request: CalendarDataRequest) => Promise<any>,
    cache: CalendarCache
  ): Promise<void> {
    if (!this.config.enablePrefetch) return

    const prefetchRequests: CalendarDataRequest[] = []
    const { prefetchDirection } = this.config

    if (prefetchDirection === 'forward' || prefetchDirection === 'both') {
      // Prefetch future data
      const futureRequest: CalendarDataRequest = {
        ...currentRequest,
        startDate: addDays(currentRequest.endDate, 1),
        endDate: addDays(currentRequest.endDate, this.config.prefetchDistance || 7)
      }
      prefetchRequests.push(futureRequest)
    }

    if (prefetchDirection === 'backward' || prefetchDirection === 'both') {
      // Prefetch past data
      const pastRequest: CalendarDataRequest = {
        ...currentRequest,
        startDate: subDays(currentRequest.startDate, this.config.prefetchDistance || 7),
        endDate: subDays(currentRequest.startDate, 1)
      }
      prefetchRequests.push(pastRequest)
    }

    // Execute prefetch requests with low priority
    for (const request of prefetchRequests) {
      // Check if data is already cached
      const cached = await cache.get(request)
      if (!cached) {
        this.queueRequest(request, loader, 0) // Low priority
      }
    }
  }

  // Clean up observers
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
  }
}

// React component for cache management
export function CalendarCacheManager({
  children,
  apiEndpoint,
  cacheConfig = {},
  lazyLoadConfig = {},
  onDataLoaded,
  onError,
  className = ''
}: CalendarCacheManagerProps) {
  const cache = useRef(new CalendarCache(cacheConfig))
  const lazyLoader = useRef(new LazyLoadManager(lazyLoadConfig))
  const [cacheStats, setCacheStats] = useState(cache.current.getStats())

  // Update cache stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(cache.current.getStats())
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Data loader function
  const loadData = useCallback(async (request: CalendarDataRequest) => {
    try {
      // Check cache first
      const cached = await cache.current.get(request)
      if (cached) {
        onDataLoaded?.(cached, request)
        return cached
      }

      // Load from API
      const url = new URL(apiEndpoint)
      url.searchParams.set('start_date', format(request.startDate, 'yyyy-MM-dd'))
      url.searchParams.set('end_date', format(request.endDate, 'yyyy-MM-dd'))
      url.searchParams.set('view', request.view)
      
      if (request.barberId) url.searchParams.set('barber_id', request.barberId.toString())
      if (request.locationId) url.searchParams.set('location_id', request.locationId.toString())
      if (request.includeDetails) url.searchParams.set('include_details', 'true')
      if (request.filters) {
        Object.entries(request.filters).forEach(([key, value]) => {
          url.searchParams.set(key, value.toString())
        })
      }

      const response = await fetch(url.toString())
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Cache the result
      await cache.current.set(request, data)
      
      // Trigger prefetch
      lazyLoader.current.prefetch(request, loadData, cache.current)
      
      onDataLoaded?.(data, request)
      return data
    } catch (error) {
      onError?.(error as Error, request)
      throw error
    }
  }, [apiEndpoint, onDataLoaded, onError])

  // Provide cache context
  const cacheContext = useMemo(() => ({
    cache: cache.current,
    lazyLoader: lazyLoader.current,
    loadData,
    stats: cacheStats
  }), [loadData, cacheStats])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      lazyLoader.current.cleanup()
    }
  }, [])

  return (
    <CalendarCacheContext.Provider value={cacheContext}>
      <div className={`calendar-cache-manager ${className}`}>
        {/* Cache stats indicator (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 right-4 bg-black text-white text-xs p-2 rounded z-50 font-mono">
            <div>Cache: {cacheStats.size} entries</div>
            <div>Size: {cacheStats.currentSizeMB}MB / {cacheStats.maxSizeMB}MB</div>
            <div>Hit Ratio: {cacheStats.hitRatio.toFixed(1)}</div>
            <div>Utilization: {cacheStats.utilization}%</div>
          </div>
        )}
        {children}
      </div>
    </CalendarCacheContext.Provider>
  )
}

// Context for cache access
const CalendarCacheContext = React.createContext<{
  cache: CalendarCache
  lazyLoader: LazyLoadManager
  loadData: (request: CalendarDataRequest) => Promise<any>
  stats: any
} | null>(null)

// Hook for using calendar cache
export function useCalendarCache() {
  const context = React.useContext(CalendarCacheContext)
  if (!context) {
    throw new Error('useCalendarCache must be used within CalendarCacheManager')
  }
  return context
}

export default CalendarCacheManager