/**
 * Advanced caching system with intelligent cache management
 */

interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  key: string
  accessCount: number
  lastAccessed: number
  size: number
  tags: string[]
  dependencies: string[]
  priority: 'low' | 'medium' | 'high'
  validator?: () => boolean
}

interface CacheConfig {
  defaultTTL: number
  maxSize: number
  maxEntries: number
  enablePersistence: boolean
  enableCompression: boolean
  enableMetrics: boolean
  cleanupInterval: number
}

interface CacheMetrics {
  hits: number
  misses: number
  evictions: number
  totalRequests: number
  averageAccessTime: number
  memoryUsage: number
  hitRate: number
}

interface CacheStrategy {
  shouldCache: (key: string, data: any) => boolean
  getTTL: (key: string, data: any) => number
  getPriority: (key: string, data: any) => 'low' | 'medium' | 'high'
  getTags: (key: string, data: any) => string[]
}

class AdvancedCacheManager {
  private cache = new Map<string, CacheEntry>()
  private persistence: Storage | null = null
  private config: CacheConfig
  private metrics: CacheMetrics
  private strategies = new Map<string, CacheStrategy>()
  private cleanupTimer: NodeJS.Timeout | null = null
  private compressionWorker: Worker | null = null

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 300000, // 5 minutes
      maxSize: 50 * 1024 * 1024, // 50MB
      maxEntries: 1000,
      enablePersistence: true,
      enableCompression: false,
      enableMetrics: true,
      cleanupInterval: 60000, // 1 minute
      ...config
    }

    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      hitRate: 0
    }

    this.init()
  }

  private init(): void {
    // Initialize persistence if enabled
    if (this.config.enablePersistence && typeof window !== 'undefined') {
      try {
        this.persistence = window.localStorage
        this.loadFromPersistence()
      } catch (e) {
        console.warn('Cache persistence not available:', e)
      }
    }

    // Initialize compression worker if enabled
    if (this.config.enableCompression && typeof Worker !== 'undefined') {
      try {
        this.setupCompressionWorker()
      } catch (e) {
        console.warn('Cache compression not available:', e)
      }
    }

    // Start cleanup timer
    this.startCleanupTimer()

    // Load default strategies
    this.setupDefaultStrategies()
  }

  private setupCompressionWorker(): void {
    const workerCode = `
      self.onmessage = function(e) {
        const { action, data, id } = e.data;
        
        if (action === 'compress') {
          try {
            // Simple compression using JSON stringify with replacer
            const compressed = JSON.stringify(data);
            self.postMessage({ id, result: compressed, error: null });
          } catch (error) {
            self.postMessage({ id, result: null, error: error.message });
          }
        } else if (action === 'decompress') {
          try {
            const decompressed = JSON.parse(data);
            self.postMessage({ id, result: decompressed, error: null });
          } catch (error) {
            self.postMessage({ id, result: null, error: error.message });
          }
        }
      };
    `

    const blob = new Blob([workerCode], { type: 'application/javascript' })
    this.compressionWorker = new Worker(URL.createObjectURL(blob))
  }

  private setupDefaultStrategies(): void {
    // API response strategy
    this.registerStrategy('api', {
      shouldCache: (key: string, data: any) => {
        // Cache GET requests and small responses
        return key.includes('GET') && this.getDataSize(data) < 1024 * 1024 // 1MB
      },
      getTTL: (key: string, data: any) => {
        if (key.includes('/users') || key.includes('/auth')) return 600000 // 10 minutes
        if (key.includes('/appointments')) return 300000 // 5 minutes
        if (key.includes('/analytics')) return 1800000 // 30 minutes
        return this.config.defaultTTL
      },
      getPriority: (key: string, data: any) => {
        if (key.includes('/auth') || key.includes('/users')) return 'high'
        if (key.includes('/appointments')) return 'medium'
        return 'low'
      },
      getTags: (key: string, data: any) => {
        const tags = ['api']
        if (key.includes('/users')) tags.push('users')
        if (key.includes('/appointments')) tags.push('appointments')
        if (key.includes('/analytics')) tags.push('analytics')
        return tags
      }
    })

    // Component state strategy
    this.registerStrategy('component', {
      shouldCache: (key: string, data: any) => {
        return this.getDataSize(data) < 512 * 1024 // 512KB
      },
      getTTL: () => 1800000, // 30 minutes
      getPriority: () => 'medium',
      getTags: (key: string) => ['component', key.split(':')[1] || 'unknown']
    })

    // Static data strategy
    this.registerStrategy('static', {
      shouldCache: () => true,
      getTTL: () => 3600000, // 1 hour
      getPriority: () => 'low',
      getTags: () => ['static']
    })
  }

  registerStrategy(name: string, strategy: CacheStrategy): void {
    this.strategies.set(name, strategy)
  }

  async set<T>(
    key: string, 
    data: T, 
    options: {
      ttl?: number
      strategy?: string
      tags?: string[]
      dependencies?: string[]
      priority?: 'low' | 'medium' | 'high'
      validator?: () => boolean
    } = {}
  ): Promise<boolean> {
    const startTime = performance.now()

    try {
      // Determine strategy
      const strategyName = options.strategy || this.getStrategyForKey(key)
      const strategy = this.strategies.get(strategyName)

      // Check if we should cache this data
      if (strategy && !strategy.shouldCache(key, data)) {
        return false
      }

      // Calculate cache entry properties
      const size = this.getDataSize(data)
      const ttl = options.ttl || strategy?.getTTL(key, data) || this.config.defaultTTL
      const priority = options.priority || strategy?.getPriority(key, data) || 'medium'
      const tags = options.tags || strategy?.getTags(key, data) || []

      // Check if we need to make space
      if (!this.hasSpaceFor(size)) {
        this.evictLeastUsed(size)
      }

      // Compress data if enabled and beneficial
      let processedData = data
      if (this.config.enableCompression && size > 10240) { // 10KB threshold
        processedData = await this.compressData(data)
      }

      // Create cache entry
      const entry: CacheEntry<T> = {
        data: processedData,
        timestamp: Date.now(),
        ttl,
        key,
        accessCount: 0,
        lastAccessed: Date.now(),
        size,
        tags,
        dependencies: options.dependencies || [],
        priority,
        validator: options.validator
      }

      // Store in memory cache
      this.cache.set(key, entry)

      // Persist if enabled
      if (this.config.enablePersistence && this.persistence) {
        this.persistEntry(key, entry)
      }

      // Update metrics
      if (this.config.enableMetrics) {
        this.updateMetrics('set', performance.now() - startTime)
      }

      return true

    } catch (error) {
      console.warn('Cache set error:', error)
      return false
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now()
    this.metrics.totalRequests++

    try {
      let entry = this.cache.get(key) as CacheEntry<T> | undefined

      // Try to load from persistence if not in memory
      if (!entry && this.config.enablePersistence && this.persistence) {
        const persistedEntry = this.loadFromPersistence(key) as CacheEntry<T> | null
        if (persistedEntry) {
          entry = persistedEntry
          this.cache.set(key, entry)
        }
      }

      if (!entry) {
        this.metrics.misses++
        this.updateHitRate()
        return null
      }

      // Check if entry is expired
      if (this.isExpired(entry)) {
        this.delete(key)
        this.metrics.misses++
        this.updateHitRate()
        return null
      }

      // Validate entry if validator exists
      if (entry.validator && !entry.validator()) {
        this.delete(key)
        this.metrics.misses++
        this.updateHitRate()
        return null
      }

      // Update access statistics
      entry.accessCount++
      entry.lastAccessed = Date.now()

      // Decompress if needed
      let data = entry.data
      if (this.isCompressed(data)) {
        data = await this.decompressData(data)
      }

      // Update metrics
      this.metrics.hits++
      this.updateHitRate()
      
      if (this.config.enableMetrics) {
        this.updateMetrics('get', performance.now() - startTime)
      }

      return data as T

    } catch (error) {
      console.warn('Cache get error:', error)
      this.metrics.misses++
      this.updateHitRate()
      return null
    }
  }

  delete(key: string): boolean {
    try {
      const deleted = this.cache.delete(key)
      
      if (deleted && this.config.enablePersistence && this.persistence) {
        this.persistence.removeItem(`cache:${key}`)
      }

      return deleted
    } catch (error) {
      console.warn('Cache delete error:', error)
      return false
    }
  }

  clear(): void {
    try {
      this.cache.clear()
      
      if (this.config.enablePersistence && this.persistence) {
        const keys = Object.keys(this.persistence)
        keys.forEach(key => {
          if (key.startsWith('cache:')) {
            this.persistence?.removeItem(key)
          }
        })
      }

      this.resetMetrics()
    } catch (error) {
      console.warn('Cache clear error:', error)
    }
  }

  invalidateByTag(tag: string): number {
    let invalidated = 0
    
    this.cache.forEach((entry, key) => {
      if (entry.tags.includes(tag)) {
        this.delete(key)
        invalidated++
      }
    })

    return invalidated
  }

  invalidateByDependency(dependency: string): number {
    let invalidated = 0
    
    this.cache.forEach((entry, key) => {
      if (entry.dependencies.includes(dependency)) {
        this.delete(key)
        invalidated++
      }
    })

    return invalidated
  }

  getMetrics(): CacheMetrics {
    this.updateMemoryUsage()
    return { ...this.metrics }
  }

  getSize(): { entries: number; memoryUsage: number } {
    let totalSize = 0
    this.cache.forEach((entry) => {
      totalSize += entry.size
    })

    return {
      entries: this.cache.size,
      memoryUsage: totalSize
    }
  }

  // Smart prefetching
  async prefetch(keys: string[], priority: 'low' | 'medium' | 'high' = 'low'): Promise<void> {
    const prefetchPromises = keys
      .filter(key => !this.cache.has(key))
      .slice(0, 10) // Limit concurrent prefetches
      .map(async key => {
        try {
          // This would integrate with your API client
          // For now, just mark as prefetch attempted
          console.log(`Prefetching ${key} with priority ${priority}`)
        } catch (error) {
          console.warn(`Prefetch failed for ${key}:`, error)
        }
      })

    await Promise.allSettled(prefetchPromises)
  }

  // Private methods
  private getStrategyForKey(key: string): string {
    if (key.startsWith('api:')) return 'api'
    if (key.startsWith('component:')) return 'component'
    if (key.startsWith('static:')) return 'static'
    return 'api' // default
  }

  private getDataSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size
    } catch {
      return JSON.stringify(data).length * 2 // Rough estimate
    }
  }

  private hasSpaceFor(size: number): boolean {
    const currentSize = this.getSize().memoryUsage
    return (currentSize + size) <= this.config.maxSize && 
           this.cache.size < this.config.maxEntries
  }

  private evictLeastUsed(requiredSize: number): void {
    const entries = Array.from(this.cache.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => {
        // Sort by priority (low first), then by access patterns
        const priorityWeight = { low: 1, medium: 2, high: 3 }
        const aPriority = priorityWeight[a.entry.priority]
        const bPriority = priorityWeight[b.entry.priority]
        
        if (aPriority !== bPriority) {
          return aPriority - bPriority
        }

        // Then by access frequency and recency
        const aScore = a.entry.accessCount * 0.7 + (Date.now() - a.entry.lastAccessed) * 0.3
        const bScore = b.entry.accessCount * 0.7 + (Date.now() - b.entry.lastAccessed) * 0.3
        
        return aScore - bScore
      })

    let freedSize = 0
    let evicted = 0

    for (const { key, entry } of entries) {
      if (freedSize >= requiredSize || evicted >= 10) break // Safety limit
      
      this.delete(key)
      freedSize += entry.size
      evicted++
      this.metrics.evictions++
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  private async compressData(data: any): Promise<any> {
    if (!this.compressionWorker) {
      return data // Fallback to uncompressed
    }

    return new Promise((resolve) => {
      const id = Math.random().toString(36)
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker?.removeEventListener('message', handleMessage)
          resolve(e.data.result || data)
        }
      }

      this.compressionWorker.addEventListener('message', handleMessage)
      this.compressionWorker.postMessage({ action: 'compress', data, id })

      // Timeout fallback
      setTimeout(() => {
        this.compressionWorker?.removeEventListener('message', handleMessage)
        resolve(data)
      }, 1000)
    })
  }

  private async decompressData(data: any): Promise<any> {
    if (!this.compressionWorker || !this.isCompressed(data)) {
      return data
    }

    return new Promise((resolve) => {
      const id = Math.random().toString(36)
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker?.removeEventListener('message', handleMessage)
          resolve(e.data.result || data)
        }
      }

      this.compressionWorker.addEventListener('message', handleMessage)
      this.compressionWorker.postMessage({ action: 'decompress', data, id })

      // Timeout fallback
      setTimeout(() => {
        this.compressionWorker?.removeEventListener('message', handleMessage)
        resolve(data)
      }, 1000)
    })
  }

  private isCompressed(data: any): boolean {
    return typeof data === 'string' && data.startsWith('compressed:')
  }

  private loadFromPersistence(key?: string): CacheEntry | null | void {
    if (!this.persistence) return null

    // If no key provided, load all entries
    if (!key) {
      try {
        const keys = Object.keys(this.persistence)
        keys.forEach(storageKey => {
          if (storageKey.startsWith('cache:')) {
            const cacheKey = storageKey.substring(6)
            const entry = this.loadFromPersistence(cacheKey) as CacheEntry | null
            if (entry && !this.isExpired(entry)) {
              this.cache.set(cacheKey, entry)
            }
          }
        })
      } catch (error) {
        console.warn('Failed to load cache from persistence:', error)
      }
      return
    }

    // Load specific entry
    try {
      const stored = this.persistence.getItem(`cache:${key}`)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  private persistEntry(key: string, entry: CacheEntry): void {
    if (!this.persistence) return

    try {
      this.persistence.setItem(`cache:${key}`, JSON.stringify(entry))
    } catch (error) {
      // Storage might be full, try to make space
      this.cleanupPersistence()
      try {
        this.persistence.setItem(`cache:${key}`, JSON.stringify(entry))
      } catch {
        console.warn('Failed to persist cache entry:', error)
      }
    }
  }

  private cleanupPersistence(): void {
    if (!this.persistence) return

    try {
      const keys = Object.keys(this.persistence)
      const cacheKeys = keys.filter(key => key.startsWith('cache:'))
      
      // Remove oldest entries first
      cacheKeys
        .map(key => {
          const entry = this.loadFromPersistence(key.substring(6)) as CacheEntry | null
          return { key, timestamp: entry?.timestamp || 0 }
        })
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(0, Math.floor(cacheKeys.length * 0.3)) // Remove 30% of entries
        .forEach(({ key }) => this.persistence?.removeItem(key))
        
    } catch (error) {
      console.warn('Failed to cleanup persistence:', error)
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    this.cache.forEach((entry, key) => {
      if (this.isExpired(entry)) {
        expiredKeys.push(key)
      }
    })

    expiredKeys.forEach(key => this.delete(key))

    // Update memory usage
    this.updateMemoryUsage()
  }

  private updateMetrics(operation: 'get' | 'set', duration: number): void {
    const alpha = 0.1 // Exponential moving average factor
    this.metrics.averageAccessTime = 
      (1 - alpha) * this.metrics.averageAccessTime + alpha * duration
  }

  private updateHitRate(): void {
    this.metrics.hitRate = this.metrics.totalRequests > 0 
      ? (this.metrics.hits / this.metrics.totalRequests) * 100 
      : 0
  }

  private updateMemoryUsage(): void {
    this.metrics.memoryUsage = this.getSize().memoryUsage
  }

  private resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0,
      averageAccessTime: 0,
      memoryUsage: 0,
      hitRate: 0
    }
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = null
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate()
      this.compressionWorker = null
    }

    this.cache.clear()
  }
}

// Global cache instance
export const cacheManager = new AdvancedCacheManager({
  defaultTTL: 300000, // 5 minutes
  maxSize: 50 * 1024 * 1024, // 50MB
  maxEntries: 1000,
  enablePersistence: true,
  enableCompression: false, // Disabled by default for development
  enableMetrics: true,
  cleanupInterval: 60000 // 1 minute
})

// React hook for cache management
export function useCache() {
  const get = async <T>(key: string): Promise<T | null> => {
    return cacheManager.get<T>(key)
  }

  const set = async <T>(
    key: string, 
    data: T, 
    options?: Parameters<typeof cacheManager.set>[2]
  ): Promise<boolean> => {
    return cacheManager.set(key, data, options)
  }

  const invalidateTag = (tag: string): number => {
    return cacheManager.invalidateByTag(tag)
  }

  const getMetrics = (): CacheMetrics => {
    return cacheManager.getMetrics()
  }

  return {
    get,
    set,
    invalidateTag,
    getMetrics,
    prefetch: cacheManager.prefetch.bind(cacheManager),
    clear: cacheManager.clear.bind(cacheManager)
  }
}

export default cacheManager