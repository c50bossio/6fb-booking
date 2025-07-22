/**
 * Advanced Cache Manager
 * Multi-level caching system for calendar data with intelligent prefetching
 * Provides instant data access with smart invalidation and synchronization
 */

import { browserCompatibility } from './browser-compatibility'

export interface CacheEntry {
  key: string
  data: any
  timestamp: number
  ttl: number
  accessCount: number
  lastAccessed: number
  size: number
  priority: number
  dependencies: string[]
  metadata: Record<string, any>
}

export interface CacheConfig {
  maxMemorySize: number // bytes
  maxEntries: number
  defaultTtl: number // milliseconds
  enablePersistence: boolean
  enablePrefetching: boolean
  enableCompression: boolean
  compressionThreshold: number // bytes
  evictionStrategy: 'lru' | 'lfu' | 'priority' | 'size'
}

export interface CacheStats {
  hitRate: number
  missRate: number
  totalHits: number
  totalMisses: number
  totalSize: number
  entryCount: number
  memoryUsage: number
  averageAccessTime: number
}

export interface PrefetchRule {
  pattern: RegExp
  prefetchKeys: (key: string) => string[]
  priority: number
  conditions: (context: any) => boolean
}

/**
 * Advanced multi-level cache management system
 */
class AdvancedCacheManager {
  private config: CacheConfig
  private memoryCache = new Map<string, CacheEntry>()
  private persistentCache: IDBDatabase | null = null
  private prefetchRules: PrefetchRule[] = []
  private stats: CacheStats = {
    hitRate: 0,
    missRate: 0,
    totalHits: 0,
    totalMisses: 0,
    totalSize: 0,
    entryCount: 0,
    memoryUsage: 0,
    averageAccessTime: 0
  }

  private cleanupInterval: NodeJS.Timeout
  private compressionWorker: Worker | null = null
  private prefetchQueue: string[] = []
  private isProcessingPrefetch = false

  // Cache priorities for different data types
  private cachePriorities = {
    'appointment': 100,      // High priority - frequently accessed
    'calendar-view': 90,     // High priority - view data
    'user-preferences': 85,  // High priority - settings
    'availability': 80,      // Medium-high priority
    'client-data': 70,       // Medium priority
    'analytics': 50,         // Medium priority
    'templates': 40,         // Lower priority
    'static-data': 30        // Low priority
  }

  // TTL configurations for different data types
  private ttlConfigs = {
    'appointment': 5 * 60 * 1000,        // 5 minutes
    'calendar-view': 2 * 60 * 1000,      // 2 minutes
    'user-preferences': 30 * 60 * 1000,  // 30 minutes
    'availability': 1 * 60 * 1000,       // 1 minute
    'client-data': 10 * 60 * 1000,       // 10 minutes
    'analytics': 60 * 60 * 1000,         // 1 hour
    'templates': 24 * 60 * 60 * 1000,    // 24 hours
    'static-data': 7 * 24 * 60 * 60 * 1000 // 7 days
  }

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxMemorySize: 50 * 1024 * 1024, // 50MB
      maxEntries: 10000,
      defaultTtl: 5 * 60 * 1000, // 5 minutes
      enablePersistence: true,
      enablePrefetching: true,
      enableCompression: true,
      compressionThreshold: 10 * 1024, // 10KB
      evictionStrategy: 'lru',
      ...config
    }

    this.initializeCache()
    this.setupPrefetchRules()

    // Cleanup and optimization
    this.cleanupInterval = setInterval(() => {
      this.performMaintenance()
    }, 30000) // Every 30 seconds
  }

  /**
   * Initialize cache system
   */
  private async initializeCache(): Promise<void> {
    // Adjust config based on device capabilities
    const deviceType = this.detectDeviceCapabilities()
    
    switch (deviceType) {
      case 'lowEnd':
        this.config.maxMemorySize = 10 * 1024 * 1024 // 10MB
        this.config.maxEntries = 1000
        this.config.enableCompression = false
        this.config.enablePrefetching = false
        break
      case 'highEnd':
        this.config.maxMemorySize = 100 * 1024 * 1024 // 100MB
        this.config.maxEntries = 50000
        break
      default:
        // Keep default values
        break
    }

    // Initialize persistent cache if supported and enabled
    if (this.config.enablePersistence && 'indexedDB' in window) {
      await this.initializePersistentCache()
    }

    // Initialize compression worker if enabled
    if (this.config.enableCompression && 'Worker' in window) {
      this.initializeCompressionWorker()
    }

    console.log('AdvancedCacheManager: Initialized', {
      deviceType,
      maxMemorySize: Math.round(this.config.maxMemorySize / 1024 / 1024),
      enablePersistence: this.config.enablePersistence,
      enablePrefetching: this.config.enablePrefetching
    })
  }

  /**
   * Detect device capabilities for optimization
   */
  private detectDeviceCapabilities(): 'highEnd' | 'standard' | 'lowEnd' {
    const navigator = window.navigator as any
    const deviceMemory = navigator.deviceMemory || 4
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection
    const effectiveType = connection?.effectiveType || '4g'
    
    // High-end device with good connection
    if (deviceMemory >= 8 && (effectiveType === '4g' || effectiveType === '5g')) {
      return 'highEnd'
    }
    
    // Low-end device or poor connection
    if (deviceMemory <= 2 || effectiveType === '2g' || effectiveType === 'slow-2g') {
      return 'lowEnd'
    }
    
    return 'standard'
  }

  /**
   * Initialize persistent cache using IndexedDB
   */
  private async initializePersistentCache(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('CalendarCacheDB', 1)
      
      request.onerror = () => {
        console.warn('AdvancedCacheManager: Failed to initialize persistent cache')
        resolve()
      }
      
      request.onsuccess = () => {
        this.persistentCache = request.result
        console.log('AdvancedCacheManager: Persistent cache initialized')
        resolve()
      }
      
      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' })
          store.createIndex('timestamp', 'timestamp')
          store.createIndex('priority', 'priority')
        }
      }
    })
  }

  /**
   * Initialize compression worker
   */
  private initializeCompressionWorker(): void {
    try {
      // Create compression worker (would need actual worker file in production)
      const workerScript = `
        self.onmessage = function(e) {
          const { action, data, key } = e.data;
          
          if (action === 'compress') {
            // Simple compression simulation
            const compressed = JSON.stringify(data);
            self.postMessage({ action: 'compressed', key, data: compressed, originalSize: JSON.stringify(data).length, compressedSize: compressed.length });
          } else if (action === 'decompress') {
            // Simple decompression simulation
            const decompressed = JSON.parse(data);
            self.postMessage({ action: 'decompressed', key, data: decompressed });
          }
        };
      `
      
      const blob = new Blob([workerScript], { type: 'application/javascript' })
      this.compressionWorker = new Worker(URL.createObjectURL(blob))
      
      this.compressionWorker.onmessage = (e) => {
        this.handleCompressionWorkerMessage(e.data)
      }
      
      console.log('AdvancedCacheManager: Compression worker initialized')
    } catch (error) {
      console.warn('AdvancedCacheManager: Failed to initialize compression worker:', error)
      this.config.enableCompression = false
    }
  }

  /**
   * Handle compression worker messages
   */
  private handleCompressionWorkerMessage(message: any): void {
    const { action, key, data } = message
    
    if (action === 'compressed') {
      // Update cache entry with compressed data
      const entry = this.memoryCache.get(key)
      if (entry) {
        entry.data = data
        entry.size = message.compressedSize
        entry.metadata.compressed = true
        entry.metadata.originalSize = message.originalSize
      }
    } else if (action === 'decompressed') {
      // Return decompressed data to caller (would need callback system)
      console.log('AdvancedCacheManager: Data decompressed for', key)
    }
  }

  /**
   * Setup intelligent prefetch rules
   */
  private setupPrefetchRules(): void {
    // Calendar view prefetch rule
    this.prefetchRules.push({
      pattern: /^calendar-view-(\d{4}-\d{2}-\d{2})$/,
      prefetchKeys: (key) => {
        const match = key.match(/(\d{4}-\d{2}-\d{2})/)
        if (match) {
          const date = new Date(match[1])
          const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000)
          const prevDay = new Date(date.getTime() - 24 * 60 * 60 * 1000)
          
          return [
            `calendar-view-${nextDay.toISOString().split('T')[0]}`,
            `calendar-view-${prevDay.toISOString().split('T')[0]}`
          ]
        }
        return []
      },
      priority: 80,
      conditions: (context) => context.viewType === 'day'
    })

    // Appointment prefetch rule
    this.prefetchRules.push({
      pattern: /^appointment-(\d+)$/,
      prefetchKeys: (key) => {
        const match = key.match(/(\d+)/)
        if (match) {
          const appointmentId = parseInt(match[1])
          return [
            `client-data-appointment-${appointmentId}`,
            `appointment-notes-${appointmentId}`,
            `appointment-history-${appointmentId}`
          ]
        }
        return []
      },
      priority: 90,
      conditions: (context) => context.prefetchAppointmentDetails === true
    })

    // User preferences prefetch rule
    this.prefetchRules.push({
      pattern: /^user-preferences-(\d+)$/,
      prefetchKeys: (key) => {
        const match = key.match(/(\d+)/)
        if (match) {
          const userId = match[1]
          return [
            `user-settings-${userId}`,
            `user-calendar-config-${userId}`,
            `user-notification-settings-${userId}`
          ]
        }
        return []
      },
      priority: 70,
      conditions: (context) => true
    })
  }

  /**
   * Get data from cache with intelligent loading
   */
  async get(key: string, fallbackLoader?: () => Promise<any>): Promise<any> {
    const startTime = performance.now()
    
    try {
      // Check memory cache first
      const memoryEntry = this.memoryCache.get(key)
      if (memoryEntry && this.isEntryValid(memoryEntry)) {
        memoryEntry.accessCount++
        memoryEntry.lastAccessed = Date.now()
        this.stats.totalHits++
        this.updateAccessTime(performance.now() - startTime)
        
        // Trigger prefetch for related data
        if (this.config.enablePrefetching) {
          this.triggerPrefetch(key)
        }
        
        return this.decompressData(memoryEntry)
      }

      // Check persistent cache if available
      if (this.persistentCache) {
        const persistentData = await this.getPersistentData(key)
        if (persistentData) {
          // Move to memory cache
          await this.set(key, persistentData.data, persistentData.ttl, persistentData.priority)
          this.stats.totalHits++
          this.updateAccessTime(performance.now() - startTime)
          return persistentData.data
        }
      }

      // Cache miss - use fallback loader
      this.stats.totalMisses++
      this.updateAccessTime(performance.now() - startTime)
      
      if (fallbackLoader) {
        const data = await fallbackLoader()
        
        // Cache the loaded data
        const priority = this.getPriorityForKey(key)
        const ttl = this.getTtlForKey(key)
        await this.set(key, data, ttl, priority)
        
        return data
      }

      return null
    } catch (error) {
      console.error('AdvancedCacheManager: Get failed for key', key, error)
      this.stats.totalMisses++
      return null
    }
  }

  /**
   * Set data in cache with optimization
   */
  async set(
    key: string, 
    data: any, 
    ttl?: number, 
    priority?: number, 
    dependencies: string[] = []
  ): Promise<void> {
    try {
      const now = Date.now()
      const finalTtl = ttl || this.getTtlForKey(key)
      const finalPriority = priority || this.getPriorityForKey(key)
      const dataSize = this.estimateDataSize(data)

      // Check if we need to evict entries
      if (this.needsEviction(dataSize)) {
        await this.evictEntries(dataSize)
      }

      const entry: CacheEntry = {
        key,
        data,
        timestamp: now,
        ttl: finalTtl,
        accessCount: 1,
        lastAccessed: now,
        size: dataSize,
        priority: finalPriority,
        dependencies,
        metadata: {
          compressed: false,
          dataType: this.getDataTypeFromKey(key),
          version: 1
        }
      }

      // Compress large entries if compression is enabled
      if (this.config.enableCompression && dataSize > this.config.compressionThreshold) {
        await this.compressEntry(entry)
      }

      // Store in memory cache
      this.memoryCache.set(key, entry)
      this.updateStats()

      // Store in persistent cache if available and appropriate
      if (this.persistentCache && this.shouldPersist(key, finalPriority)) {
        await this.setPersistentData(key, entry)
      }

      console.log('AdvancedCacheManager: Cached', {
        key,
        size: dataSize,
        ttl: finalTtl,
        priority: finalPriority,
        compressed: entry.metadata.compressed
      })
    } catch (error) {
      console.error('AdvancedCacheManager: Set failed for key', key, error)
    }
  }

  /**
   * Check if cache entry is valid
   */
  private isEntryValid(entry: CacheEntry): boolean {
    const now = Date.now()
    return (now - entry.timestamp) < entry.ttl
  }

  /**
   * Decompress data if needed
   */
  private async decompressData(entry: CacheEntry): Promise<any> {
    if (entry.metadata.compressed && this.compressionWorker) {
      // In a real implementation, this would be async with worker
      return JSON.parse(entry.data)
    }
    return entry.data
  }

  /**
   * Compress cache entry
   */
  private async compressEntry(entry: CacheEntry): Promise<void> {
    if (this.compressionWorker) {
      // In a real implementation, this would use the worker
      const compressed = JSON.stringify(entry.data)
      entry.data = compressed
      entry.metadata.compressed = true
      entry.metadata.originalSize = entry.size
      entry.size = compressed.length
    }
  }

  /**
   * Get priority for cache key
   */
  private getPriorityForKey(key: string): number {
    for (const [dataType, priority] of Object.entries(this.cachePriorities)) {
      if (key.includes(dataType)) {
        return priority
      }
    }
    return 50 // Default priority
  }

  /**
   * Get TTL for cache key
   */
  private getTtlForKey(key: string): number {
    for (const [dataType, ttl] of Object.entries(this.ttlConfigs)) {
      if (key.includes(dataType)) {
        return ttl
      }
    }
    return this.config.defaultTtl
  }

  /**
   * Get data type from cache key
   */
  private getDataTypeFromKey(key: string): string {
    for (const dataType of Object.keys(this.cachePriorities)) {
      if (key.includes(dataType)) {
        return dataType
      }
    }
    return 'unknown'
  }

  /**
   * Estimate data size in bytes
   */
  private estimateDataSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2 // Rough estimate including object overhead
    } catch {
      return 1024 // Default 1KB if can't serialize
    }
  }

  /**
   * Check if eviction is needed
   */
  private needsEviction(newEntrySize: number): boolean {
    const currentSize = this.getCurrentMemoryUsage()
    const wouldExceedSize = (currentSize + newEntrySize) > this.config.maxMemorySize
    const wouldExceedCount = this.memoryCache.size >= this.config.maxEntries
    
    return wouldExceedSize || wouldExceedCount
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    let totalSize = 0
    for (const entry of this.memoryCache.values()) {
      totalSize += entry.size
    }
    return totalSize
  }

  /**
   * Evict cache entries to make space
   */
  private async evictEntries(spaceNeeded: number): Promise<void> {
    const entries = Array.from(this.memoryCache.values())
    let spaceFreed = 0
    let entriesRemoved = 0

    // Sort entries for eviction based on strategy
    entries.sort((a, b) => {
      switch (this.config.evictionStrategy) {
        case 'lru':
          return a.lastAccessed - b.lastAccessed
        case 'lfu':
          return a.accessCount - b.accessCount
        case 'priority':
          return a.priority - b.priority
        case 'size':
          return b.size - a.size
        default:
          return a.lastAccessed - b.lastAccessed
      }
    })

    // Remove entries until we have enough space
    for (const entry of entries) {
      if (spaceFreed >= spaceNeeded && entriesRemoved >= 10) {
        break
      }

      // Don't evict high-priority, recently accessed entries
      if (entry.priority > 80 && Date.now() - entry.lastAccessed < 30000) {
        continue
      }

      this.memoryCache.delete(entry.key)
      spaceFreed += entry.size
      entriesRemoved++
    }

    console.log('AdvancedCacheManager: Evicted entries', {
      entriesRemoved,
      spaceFreed: Math.round(spaceFreed / 1024)
    })
  }

  /**
   * Trigger prefetch for related data
   */
  private triggerPrefetch(key: string, context: any = {}): void {
    if (!this.config.enablePrefetching || this.isProcessingPrefetch) {
      return
    }

    for (const rule of this.prefetchRules) {
      if (rule.pattern.test(key) && rule.conditions(context)) {
        const prefetchKeys = rule.prefetchKeys(key)
        
        prefetchKeys.forEach(prefetchKey => {
          if (!this.memoryCache.has(prefetchKey) && !this.prefetchQueue.includes(prefetchKey)) {
            this.prefetchQueue.push(prefetchKey)
          }
        })
        
        // Process prefetch queue
        if (!this.isProcessingPrefetch) {
          setTimeout(() => this.processPrefetchQueue(), 100)
        }
        break
      }
    }
  }

  /**
   * Process prefetch queue
   */
  private async processPrefetchQueue(): Promise<void> {
    if (this.isProcessingPrefetch || this.prefetchQueue.length === 0) {
      return
    }

    this.isProcessingPrefetch = true

    // Process up to 3 prefetch requests at once
    const batch = this.prefetchQueue.splice(0, 3)
    
    for (const key of batch) {
      try {
        // This would typically call the appropriate API endpoint
        // For now, just log the prefetch attempt
        console.log('AdvancedCacheManager: Prefetching', key)
        
        // Simulate prefetch delay
        await new Promise(resolve => setTimeout(resolve, 10))
      } catch (error) {
        console.warn('AdvancedCacheManager: Prefetch failed for', key, error)
      }
    }

    this.isProcessingPrefetch = false

    // Continue processing if more items in queue
    if (this.prefetchQueue.length > 0) {
      setTimeout(() => this.processPrefetchQueue(), 500)
    }
  }

  /**
   * Check if entry should be persisted
   */
  private shouldPersist(key: string, priority: number): boolean {
    // Only persist high-priority, long-lived data
    return priority > 70 && this.getTtlForKey(key) > 10 * 60 * 1000 // > 10 minutes TTL
  }

  /**
   * Get data from persistent cache
   */
  private async getPersistentData(key: string): Promise<CacheEntry | null> {
    if (!this.persistentCache) return null

    return new Promise((resolve) => {
      const transaction = this.persistentCache!.transaction(['cache'], 'readonly')
      const store = transaction.objectStore('cache')
      const request = store.get(key)
      
      request.onsuccess = () => {
        const entry = request.result
        if (entry && this.isEntryValid(entry)) {
          resolve(entry)
        } else {
          resolve(null)
        }
      }
      
      request.onerror = () => resolve(null)
    })
  }

  /**
   * Set data in persistent cache
   */
  private async setPersistentData(key: string, entry: CacheEntry): Promise<void> {
    if (!this.persistentCache) return

    return new Promise((resolve) => {
      const transaction = this.persistentCache!.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      store.put(entry)
      
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => resolve()
    })
  }

  /**
   * Update access time metrics
   */
  private updateAccessTime(accessTime: number): void {
    const alpha = 0.1
    this.stats.averageAccessTime = 
      this.stats.averageAccessTime * (1 - alpha) + accessTime * alpha
  }

  /**
   * Update cache statistics
   */
  private updateStats(): void {
    this.stats.entryCount = this.memoryCache.size
    this.stats.totalSize = this.getCurrentMemoryUsage()
    this.stats.memoryUsage = this.stats.totalSize / this.config.maxMemorySize
    
    const totalRequests = this.stats.totalHits + this.stats.totalMisses
    if (totalRequests > 0) {
      this.stats.hitRate = this.stats.totalHits / totalRequests
      this.stats.missRate = this.stats.totalMisses / totalRequests
    }
  }

  /**
   * Invalidate cache entries by key pattern
   */
  invalidateByPattern(pattern: RegExp): number {
    let invalidatedCount = 0
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (pattern.test(key)) {
        this.memoryCache.delete(key)
        invalidatedCount++
      }
    }

    this.updateStats()
    console.log('AdvancedCacheManager: Invalidated by pattern', pattern, invalidatedCount)
    return invalidatedCount
  }

  /**
   * Invalidate cache entries by dependency
   */
  invalidateByDependency(dependencyKey: string): number {
    let invalidatedCount = 0
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.dependencies.includes(dependencyKey)) {
        this.memoryCache.delete(key)
        invalidatedCount++
      }
    }

    this.updateStats()
    console.log('AdvancedCacheManager: Invalidated by dependency', dependencyKey, invalidatedCount)
    return invalidatedCount
  }

  /**
   * Periodic maintenance
   */
  private performMaintenance(): void {
    const now = Date.now()
    let expiredCount = 0

    // Remove expired entries
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isEntryValid(entry)) {
        this.memoryCache.delete(key)
        expiredCount++
      }
    }

    // Update statistics
    this.updateStats()

    // Log maintenance results
    if (expiredCount > 0) {
      console.log('AdvancedCacheManager: Maintenance completed', {
        expiredEntries: expiredCount,
        totalEntries: this.stats.entryCount,
        memoryUsage: Math.round(this.stats.memoryUsage * 100),
        hitRate: Math.round(this.stats.hitRate * 100)
      })
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    this.updateStats()
    return { ...this.stats }
  }

  /**
   * Clear all cache data
   */
  clear(): void {
    this.memoryCache.clear()
    this.prefetchQueue = []
    
    if (this.persistentCache) {
      const transaction = this.persistentCache.transaction(['cache'], 'readwrite')
      const store = transaction.objectStore('cache')
      store.clear()
    }

    this.updateStats()
    console.log('AdvancedCacheManager: All cache data cleared')
  }

  /**
   * Destroy the cache manager
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    if (this.compressionWorker) {
      this.compressionWorker.terminate()
    }

    if (this.persistentCache) {
      this.persistentCache.close()
    }

    this.clear()
  }
}

// Singleton instance for global cache management
export const advancedCacheManager = new AdvancedCacheManager()

// React hook for advanced caching
export function useAdvancedCache() {
  const get = async (key: string, fallbackLoader?: () => Promise<any>) => {
    return advancedCacheManager.get(key, fallbackLoader)
  }

  const set = async (key: string, data: any, ttl?: number, priority?: number, dependencies?: string[]) => {
    return advancedCacheManager.set(key, data, ttl, priority, dependencies)
  }

  const invalidateByPattern = (pattern: RegExp) => {
    return advancedCacheManager.invalidateByPattern(pattern)
  }

  const invalidateByDependency = (dependencyKey: string) => {
    return advancedCacheManager.invalidateByDependency(dependencyKey)
  }

  const getStats = () => {
    return advancedCacheManager.getStats()
  }

  const clear = () => {
    advancedCacheManager.clear()
  }

  return {
    get,
    set,
    invalidateByPattern,
    invalidateByDependency,
    getStats,
    clear
  }
}

export default advancedCacheManager