'use client'

import { APIPerformanceMonitor } from './apiUtils'

// Batch strategy types
export type BatchStrategy = 'time' | 'count' | 'hybrid'

// Configuration for batching behavior
export interface BatchConfig {
  strategy: BatchStrategy
  maxWaitMs: number
  maxBatchSize: number
  minBatchSize: number
  priorityThreshold?: number
}

// Request metadata for batching
export interface BatchRequest<T = any> {
  id: string
  endpoint: string
  options: RequestInit
  resolve: (value: T) => void
  reject: (error: Error) => void
  timestamp: number
  priority: number
  cacheKey?: string
  cacheTtl?: number
}

// Batch execution result
export interface BatchResult {
  id: string
  success: boolean
  data?: any
  error?: Error
}

// Cache entry
interface CacheEntry {
  data: any
  timestamp: number
  ttl: number
}

// Default batch configurations
const DEFAULT_CONFIGS: Record<string, BatchConfig> = {
  dashboard: {
    strategy: 'hybrid',
    maxWaitMs: 50,
    maxBatchSize: 10,
    minBatchSize: 2,
    priorityThreshold: 8
  },
  calendar: {
    strategy: 'time',
    maxWaitMs: 100,
    maxBatchSize: 15,
    minBatchSize: 3
  },
  analytics: {
    strategy: 'count',
    maxWaitMs: 200,
    maxBatchSize: 5,
    minBatchSize: 2
  },
  default: {
    strategy: 'hybrid',
    maxWaitMs: 100,
    maxBatchSize: 8,
    minBatchSize: 2,
    priorityThreshold: 7
  }
}

export class RequestBatcher {
  private static instance: RequestBatcher
  private batches: Map<string, BatchRequest[]> = new Map()
  private timers: Map<string, NodeJS.Timeout> = new Map()
  private cache: Map<string, CacheEntry> = new Map()
  private configs: Map<string, BatchConfig> = new Map()

  private constructor() {
    // Initialize default configurations
    Object.entries(DEFAULT_CONFIGS).forEach(([key, config]) => {
      this.configs.set(key, config)
    })

    // Clean up cache periodically
    setInterval(() => this.cleanupCache(), 60000) // Every minute
  }

  static getInstance(): RequestBatcher {
    if (!RequestBatcher.instance) {
      RequestBatcher.instance = new RequestBatcher()
    }
    return RequestBatcher.instance
  }

  // Configure batch settings for a specific batch type
  configure(batchType: string, config: Partial<BatchConfig>): void {
    const existing = this.configs.get(batchType) || DEFAULT_CONFIGS.default
    this.configs.set(batchType, { ...existing, ...config })
  }

  // Add a request to the batch queue
  async batch<T = any>(
    batchType: string,
    endpoint: string,
    options: RequestInit = {},
    priority: number = 5,
    cacheOptions?: { key: string; ttl: number }
  ): Promise<T> {
    // Check cache first
    if (cacheOptions?.key) {
      const cached = this.getFromCache(cacheOptions.key)
      if (cached) {
        return cached
      }
    }

    return new Promise<T>((resolve, reject) => {
      const requestId = this.generateRequestId()
      const request: BatchRequest<T> = {
        id: requestId,
        endpoint,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
        priority,
        cacheKey: cacheOptions?.key,
        cacheTtl: cacheOptions?.ttl
      }

      // Add to batch
      if (!this.batches.has(batchType)) {
        this.batches.set(batchType, [])
      }
      
      const batch = this.batches.get(batchType)!
      batch.push(request)

      // Sort by priority (higher priority first)
      batch.sort((a, b) => b.priority - a.priority)

      this.scheduleExecution(batchType)
    })
  }

  // Execute multiple individual requests (non-batched)
  async batchIndividual<T = any>(
    batchType: string,
    requests: Array<{
      endpoint: string
      options?: RequestInit
      priority?: number
      cacheOptions?: { key: string; ttl: number }
    }>
  ): Promise<T[]> {
    const promises = requests.map(req => 
      this.batch<T>(
        batchType,
        req.endpoint,
        req.options,
        req.priority || 5,
        req.cacheOptions
      )
    )

    return Promise.all(promises)
  }

  // Schedule batch execution based on strategy
  private scheduleExecution(batchType: string): void {
    const config = this.configs.get(batchType) || DEFAULT_CONFIGS.default
    const batch = this.batches.get(batchType)!

    // Clear existing timer
    if (this.timers.has(batchType)) {
      clearTimeout(this.timers.get(batchType)!)
    }

    const shouldExecuteNow = this.shouldExecuteImmediately(batchType, config)
    
    if (shouldExecuteNow) {
      this.executeBatch(batchType)
    } else {
      // Schedule execution
      const timer = setTimeout(() => {
        this.executeBatch(batchType)
      }, this.calculateWaitTime(batchType, config))
      
      this.timers.set(batchType, timer)
    }
  }

  // Determine if batch should execute immediately
  private shouldExecuteImmediately(batchType: string, config: BatchConfig): boolean {
    const batch = this.batches.get(batchType)!
    
    // Count-based: Execute if at max batch size
    if (config.strategy === 'count' && batch.length >= config.maxBatchSize) {
      return true
    }

    // Time-based: Execute if oldest request is too old
    if (config.strategy === 'time') {
      const oldestRequest = batch[batch.length - 1] // Sorted by priority, but oldest might be anywhere
      const minTimestamp = Math.min(...batch.map(r => r.timestamp))
      return Date.now() - minTimestamp >= config.maxWaitMs
    }

    // Hybrid: Execute on max size OR high priority requests
    if (config.strategy === 'hybrid') {
      const hasHighPriority = config.priorityThreshold !== undefined && 
        batch.some(r => r.priority >= config.priorityThreshold!)
      
      return batch.length >= config.maxBatchSize || hasHighPriority || false
    }

    return false
  }

  // Calculate optimal wait time
  private calculateWaitTime(batchType: string, config: BatchConfig): number {
    const batch = this.batches.get(batchType)!
    const batchAge = Date.now() - Math.min(...batch.map(r => r.timestamp))
    
    // Adaptive timing based on batch size and age
    const sizeRatio = batch.length / config.maxBatchSize
    const ageRatio = batchAge / config.maxWaitMs
    
    const remainingTime = Math.max(0, config.maxWaitMs - batchAge)
    const adaptedTime = remainingTime * (1 - sizeRatio * 0.5)
    
    return Math.max(10, Math.min(adaptedTime, config.maxWaitMs))
  }

  // Execute a batch of requests
  private async executeBatch(batchType: string): Promise<void> {
    const batch = this.batches.get(batchType)
    if (!batch || batch.length === 0) return

    // Clear the batch and timer
    this.batches.set(batchType, [])
    if (this.timers.has(batchType)) {
      clearTimeout(this.timers.get(batchType)!)
      this.timers.delete(batchType)
    }


    // Group requests by endpoint for potential server-side batching
    const endpointGroups = this.groupByEndpoint(batch)

    // Execute all requests in parallel
    const promises = Array.from(endpointGroups.entries()).map(async ([endpoint, requests]) => {
      if (requests.length === 1) {
        // Single request - execute directly
        return this.executeSingleRequest(requests[0])
      } else {
        // Multiple requests to same endpoint - could be batched on server
        return this.executeGroupedRequests(endpoint, requests)
      }
    })

    try {
      await Promise.allSettled(promises)
    } catch (error) {
      console.error('Error executing batch:', error)
    }
  }

  // Group requests by endpoint
  private groupByEndpoint(batch: BatchRequest[]): Map<string, BatchRequest[]> {
    const groups = new Map<string, BatchRequest[]>()
    
    batch.forEach(request => {
      const key = this.getEndpointKey(request.endpoint, request.options)
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(request)
    })

    return groups
  }

  // Create a key for grouping similar requests
  private getEndpointKey(endpoint: string, options: RequestInit): string {
    const method = options.method || 'GET'
    return `${method}:${endpoint}`
  }

  // Execute a single request
  private async executeSingleRequest(request: BatchRequest): Promise<void> {
    const endTiming = APIPerformanceMonitor.startTiming(request.endpoint)
    
    try {
      const response = await this.makeRequest(request.endpoint, request.options)
      
      // Cache if requested
      if (request.cacheKey && request.cacheTtl) {
        this.setCache(request.cacheKey, response, request.cacheTtl)
      }
      
      request.resolve(response)
    } catch (error) {
      APIPerformanceMonitor.recordError(request.endpoint)
      request.reject(error as Error)
    } finally {
      endTiming()
    }
  }

  // Execute multiple requests to the same endpoint
  private async executeGroupedRequests(endpoint: string, requests: BatchRequest[]): Promise<void> {
    // For now, execute in parallel. Future enhancement could batch on server side
    const promises = requests.map(request => this.executeSingleRequest(request))
    await Promise.allSettled(promises)
  }

  // Make the actual HTTP request
  private async makeRequest(endpoint: string, options: RequestInit): Promise<any> {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    }

    const response = await fetch(`${API_URL}${endpoint}`, config)
    
    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`HTTP ${response.status}: ${errorData}`)
    }

    return response.json()
  }

  // Cache management
  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  private getFromCache(key: string): any | null {
    const entry = this.cache.get(key)
    if (!entry) return null

    const isExpired = Date.now() - entry.timestamp > entry.ttl
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  private cleanupCache(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    for (const [key, entry] of entries) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Utility methods
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Get batch statistics
  getBatchStats(): Record<string, any> {
    const stats: Record<string, any> = {}
    
    const batchEntries = Array.from(this.batches.entries())
    for (const [batchType, batch] of batchEntries) {
      stats[batchType] = {
        pendingRequests: batch.length,
        oldestRequestAge: batch.length > 0 ? 
          Date.now() - Math.min(...batch.map((r: BatchRequest) => r.timestamp)) : 0,
        averagePriority: batch.length > 0 ?
          batch.reduce((sum: number, r: BatchRequest) => sum + r.priority, 0) / batch.length : 0
      }
    }

    stats.cache = {
      size: this.cache.size,
      hitRate: 'Not implemented' // Could track this with counters
    }

    return stats
  }

  // Flush all pending batches immediately
  async flush(): Promise<void> {
    const batchTypes = Array.from(this.batches.keys())
    const promises = batchTypes.map(type => this.executeBatch(type))
    await Promise.allSettled(promises)
  }

  // Clear cache
  clearCache(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern)
      const keys = Array.from(this.cache.keys())
      for (const key of keys) {
        if (regex.test(key)) {
          this.cache.delete(key)
        }
      }
    } else {
      this.cache.clear()
    }
  }
}

// Singleton instance
export const requestBatcher = RequestBatcher.getInstance()

// Convenience functions for common batching patterns
export const batchDashboardData = async (requests: Array<{
  endpoint: string
  options?: RequestInit
  priority?: number
  cacheKey?: string
  cacheTtl?: number
}>) => {
  return requestBatcher.batchIndividual('dashboard', requests.map(req => ({
    ...req,
    cacheOptions: req.cacheKey ? { key: req.cacheKey, ttl: req.cacheTtl || 30000 } : undefined
  })))
}

export const batchCalendarData = async (requests: Array<{
  endpoint: string
  options?: RequestInit
  priority?: number
}>) => {
  return requestBatcher.batchIndividual('calendar', requests)
}

export const batchAnalyticsData = async (requests: Array<{
  endpoint: string
  options?: RequestInit
  cacheKey?: string
  cacheTtl?: number
}>) => {
  return requestBatcher.batchIndividual('analytics', requests.map(req => ({
    ...req,
    cacheOptions: req.cacheKey ? { key: req.cacheKey, ttl: req.cacheTtl || 60000 } : undefined
  })))
}