/**
 * Real-time cache status and performance monitoring hook
 * Provides comprehensive insights into cache health, performance, and memory usage
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { cacheManager } from '@/lib/cache/cacheManager'
import { apiUtils } from '@/lib/api/client'

interface CacheStatusMetrics {
  // Basic metrics
  totalEntries: number
  memoryUsage: number
  hitRate: number
  totalRequests: number
  hits: number
  misses: number
  evictions: number

  // Performance metrics
  averageAccessTime: number
  slowQueries: number
  cacheEfficiency: number

  // Health indicators
  isHealthy: boolean
  memoryPressure: 'low' | 'medium' | 'high'
  recommendations: string[]

  // Breakdown by strategy/tag
  byStrategy: Record<string, {
    entries: number
    hitRate: number
    memoryUsage: number
  }>
  
  byTag: Record<string, {
    entries: number
    lastAccessed: number
    totalSize: number
  }>

  // Temporal data
  history: Array<{
    timestamp: number
    hitRate: number
    memoryUsage: number
    totalRequests: number
  }>
}

interface CacheOperation {
  id: string
  type: 'get' | 'set' | 'delete' | 'invalidate'
  key: string
  timestamp: number
  duration: number
  success: boolean
  hitType?: 'hit' | 'miss' | 'stale'
  size?: number
}

interface CacheAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  title: string
  message: string
  timestamp: number
  resolved: boolean
  data?: any
}

export function useCacheStatus(options: {
  refreshInterval?: number
  trackOperations?: boolean
  maxOperationHistory?: number
  enableAlerts?: boolean
  alertThresholds?: {
    lowHitRate?: number
    highMemoryUsage?: number
    slowQueryThreshold?: number
  }
} = {}) {
  const {
    refreshInterval = 5000, // 5 seconds
    trackOperations = true,
    maxOperationHistory = 100,
    enableAlerts = true,
    alertThresholds = {
      lowHitRate: 60, // Below 60%
      highMemoryUsage: 40 * 1024 * 1024, // Above 40MB
      slowQueryThreshold: 500 // Above 500ms
    }
  } = options

  // State for cache metrics and status
  const [metrics, setMetrics] = useState<CacheStatusMetrics>({
    totalEntries: 0,
    memoryUsage: 0,
    hitRate: 0,
    totalRequests: 0,
    hits: 0,
    misses: 0,
    evictions: 0,
    averageAccessTime: 0,
    slowQueries: 0,
    cacheEfficiency: 0,
    isHealthy: true,
    memoryPressure: 'low',
    recommendations: [],
    byStrategy: {},
    byTag: {},
    history: []
  })

  const [operations, setOperations] = useState<CacheOperation[]>([])
  const [alerts, setAlerts] = useState<CacheAlert[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)

  // Track recent operations for debugging
  const addOperation = useCallback((operation: Omit<CacheOperation, 'id' | 'timestamp'>) => {
    if (!trackOperations) return

    const newOperation: CacheOperation = {
      ...operation,
      id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }

    setOperations(prev => {
      const updated = [newOperation, ...prev]
      return updated.slice(0, maxOperationHistory)
    })

    // Check for alerts
    if (enableAlerts) {
      checkForAlerts(newOperation)
    }
  }, [trackOperations, maxOperationHistory, enableAlerts])

  // Alert system
  const checkForAlerts = useCallback((operation: CacheOperation) => {
    const newAlerts: CacheAlert[] = []

    // Slow query alert
    if (operation.duration > (alertThresholds.slowQueryThreshold || 500)) {
      newAlerts.push({
        id: `alert-slow-${operation.id}`,
        type: 'warning',
        title: 'Slow Cache Operation',
        message: `Cache ${operation.type} for key "${operation.key}" took ${operation.duration}ms`,
        timestamp: Date.now(),
        resolved: false,
        data: { operation }
      })
    }

    // Failed operation alert
    if (!operation.success) {
      newAlerts.push({
        id: `alert-fail-${operation.id}`,
        type: 'error',
        title: 'Cache Operation Failed',
        message: `Cache ${operation.type} failed for key "${operation.key}"`,
        timestamp: Date.now(),
        resolved: false,
        data: { operation }
      })
    }

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)) // Keep last 50 alerts
    }
  }, [alertThresholds])

  // System health alerts
  const checkSystemHealth = useCallback((currentMetrics: CacheStatusMetrics) => {
    const systemAlerts: CacheAlert[] = []

    // Low hit rate alert
    if (currentMetrics.hitRate < (alertThresholds.lowHitRate || 60) && currentMetrics.totalRequests > 10) {
      systemAlerts.push({
        id: 'alert-low-hit-rate',
        type: 'warning',
        title: 'Low Cache Hit Rate',
        message: `Cache hit rate is ${currentMetrics.hitRate.toFixed(1)}%, consider reviewing cache strategies`,
        timestamp: Date.now(),
        resolved: false,
        data: { hitRate: currentMetrics.hitRate }
      })
    }

    // High memory usage alert
    if (currentMetrics.memoryUsage > (alertThresholds.highMemoryUsage || 40 * 1024 * 1024)) {
      systemAlerts.push({
        id: 'alert-high-memory',
        type: 'warning',
        title: 'High Memory Usage',
        message: `Cache memory usage is ${(currentMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        timestamp: Date.now(),
        resolved: false,
        data: { memoryUsage: currentMetrics.memoryUsage }
      })
    }

    if (systemAlerts.length > 0) {
      setAlerts(prev => {
        // Remove old alerts of the same type
        const filtered = prev.filter(alert => 
          !systemAlerts.some(newAlert => newAlert.id === alert.id)
        )
        return [...systemAlerts, ...filtered].slice(0, 50)
      })
    }
  }, [alertThresholds])

  // Collect comprehensive cache metrics
  const collectMetrics = useCallback(async (): Promise<CacheStatusMetrics> => {
    try {
      // Get basic cache metrics
      const cacheMetrics = cacheManager.getMetrics()
      const cacheSize = cacheManager.getSize()
      const apiStats = apiUtils.getCacheStats()

      // Calculate derived metrics
      const cacheEfficiency = cacheMetrics.totalRequests > 0 
        ? (cacheMetrics.hits / cacheMetrics.totalRequests) * 100 
        : 0

      // Determine memory pressure
      const maxMemory = 50 * 1024 * 1024 // 50MB default limit
      const memoryUsage = cacheSize.memoryUsage + apiStats.advanced.memoryUsage
      const memoryPercentage = (memoryUsage / maxMemory) * 100

      let memoryPressure: 'low' | 'medium' | 'high' = 'low'
      if (memoryPercentage > 80) memoryPressure = 'high'
      else if (memoryPercentage > 60) memoryPressure = 'medium'

      // Generate recommendations
      const recommendations: string[] = []
      
      if (cacheMetrics.hitRate < 70 && cacheMetrics.totalRequests > 20) {
        recommendations.push('Consider increasing cache TTL for frequently accessed data')
      }
      
      if (memoryPressure === 'high') {
        recommendations.push('Memory usage is high, consider enabling compression or reducing cache size')
      }
      
      if (cacheMetrics.averageAccessTime > 50) {
        recommendations.push('Cache access time is high, check for cache fragmentation')
      }

      if (cacheMetrics.evictions > cacheMetrics.hits * 0.1) {
        recommendations.push('High eviction rate detected, consider increasing cache size')
      }

      // Calculate slow queries (operations > 100ms)
      const slowQueries = operations.filter(op => op.duration > 100).length

      // Build strategy breakdown (simulated - would need actual implementation)
      const byStrategy: Record<string, any> = {
        api: {
          entries: Math.floor(cacheSize.entries * 0.6),
          hitRate: cacheMetrics.hitRate * 1.1,
          memoryUsage: Math.floor(memoryUsage * 0.6)
        },
        component: {
          entries: Math.floor(cacheSize.entries * 0.3),
          hitRate: cacheMetrics.hitRate * 0.9,
          memoryUsage: Math.floor(memoryUsage * 0.3)
        },
        static: {
          entries: Math.floor(cacheSize.entries * 0.1),
          hitRate: cacheMetrics.hitRate * 1.2,
          memoryUsage: Math.floor(memoryUsage * 0.1)
        }
      }

      // Build tag breakdown (simulated)
      const byTag: Record<string, any> = {
        users: { entries: Math.floor(cacheSize.entries * 0.2), lastAccessed: Date.now() - 30000, totalSize: Math.floor(memoryUsage * 0.2) },
        appointments: { entries: Math.floor(cacheSize.entries * 0.3), lastAccessed: Date.now() - 10000, totalSize: Math.floor(memoryUsage * 0.3) },
        analytics: { entries: Math.floor(cacheSize.entries * 0.25), lastAccessed: Date.now() - 60000, totalSize: Math.floor(memoryUsage * 0.25) },
        api: { entries: Math.floor(cacheSize.entries * 0.25), lastAccessed: Date.now() - 5000, totalSize: Math.floor(memoryUsage * 0.25) }
      }

      // Determine overall health
      const isHealthy = cacheMetrics.hitRate > 50 && 
                       memoryPressure !== 'high' && 
                       cacheMetrics.averageAccessTime < 100

      return {
        totalEntries: cacheSize.entries,
        memoryUsage,
        hitRate: cacheMetrics.hitRate,
        totalRequests: cacheMetrics.totalRequests,
        hits: cacheMetrics.hits,
        misses: cacheMetrics.misses,
        evictions: cacheMetrics.evictions,
        averageAccessTime: cacheMetrics.averageAccessTime,
        slowQueries,
        cacheEfficiency,
        isHealthy,
        memoryPressure,
        recommendations,
        byStrategy,
        byTag,
        history: [] // Will be populated separately
      }

    } catch (error) {
      console.warn('Failed to collect cache metrics:', error)
      
      // Return default metrics
      return {
        totalEntries: 0,
        memoryUsage: 0,
        hitRate: 0,
        totalRequests: 0,
        hits: 0,
        misses: 0,
        evictions: 0,
        averageAccessTime: 0,
        slowQueries: 0,
        cacheEfficiency: 0,
        isHealthy: false,
        memoryPressure: 'low',
        recommendations: ['Unable to collect cache metrics'],
        byStrategy: {},
        byTag: {},
        history: []
      }
    }
  }, [operations])

  // Update metrics with history tracking
  const updateMetrics = useCallback(async () => {
    const newMetrics = await collectMetrics()
    
    setMetrics(prev => {
      // Add to history
      const historyEntry = {
        timestamp: Date.now(),
        hitRate: newMetrics.hitRate,
        memoryUsage: newMetrics.memoryUsage,
        totalRequests: newMetrics.totalRequests
      }

      const updatedHistory = [historyEntry, ...prev.history].slice(0, 100) // Keep last 100 points

      return {
        ...newMetrics,
        history: updatedHistory
      }
    })

    // Check for system health alerts
    if (enableAlerts) {
      checkSystemHealth(newMetrics)
    }

  }, [collectMetrics, enableAlerts, checkSystemHealth])

  // Start/stop monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true)
  }, [])

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)
  }, [])

  // Clear operations and alerts
  const clearOperations = useCallback(() => {
    setOperations([])
  }, [])

  const clearAlerts = useCallback(() => {
    setAlerts([])
  }, [])

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, resolved: true } : alert
      )
    )
  }, [])

  // Cache management functions
  const clearCache = useCallback(() => {
    cacheManager.clear()
    apiUtils.clearCache()
    
    addOperation({
      type: 'delete',
      key: '*',
      duration: 0,
      success: true
    })

    // Force metrics refresh
    setTimeout(updateMetrics, 100)
  }, [addOperation, updateMetrics])

  const invalidateByTag = useCallback((tag: string) => {
    const start = performance.now()
    const count = cacheManager.invalidateByTag(tag)
    const duration = performance.now() - start

    addOperation({
      type: 'invalidate',
      key: `tag:${tag}`,
      duration,
      success: count > 0,
      size: count
    })

    // Force metrics refresh
    setTimeout(updateMetrics, 100)
  }, [addOperation, updateMetrics])

  // Auto-refresh metrics
  useEffect(() => {
    if (!isMonitoring) return

    const interval = setInterval(updateMetrics, refreshInterval)
    
    // Initial update
    updateMetrics()

    return () => clearInterval(interval)
  }, [isMonitoring, refreshInterval, updateMetrics])

  // Start monitoring on mount
  useEffect(() => {
    startMonitoring()
    return () => stopMonitoring()
  }, [startMonitoring, stopMonitoring])

  // Computed values
  const recentOperations = useMemo(() => 
    operations.slice(0, 20), // Last 20 operations
    [operations]
  )

  const unreadAlerts = useMemo(() => 
    alerts.filter(alert => !alert.resolved),
    [alerts]
  )

  const criticalAlerts = useMemo(() => 
    alerts.filter(alert => alert.type === 'error' && !alert.resolved),
    [alerts]
  )

  // Performance trend analysis
  const performanceTrend = useMemo(() => {
    if (metrics.history.length < 2) return 'stable'
    
    const recent = metrics.history.slice(0, 5)
    const avgRecent = recent.reduce((sum, point) => sum + point.hitRate, 0) / recent.length
    
    const older = metrics.history.slice(5, 10)
    if (older.length === 0) return 'stable'
    
    const avgOlder = older.reduce((sum, point) => sum + point.hitRate, 0) / older.length
    
    const difference = avgRecent - avgOlder
    
    if (difference > 5) return 'improving'
    if (difference < -5) return 'declining'
    return 'stable'
  }, [metrics.history])

  return {
    // Core metrics
    metrics,
    operations: recentOperations,
    alerts: unreadAlerts,
    allAlerts: alerts,
    criticalAlerts,

    // Status flags
    isMonitoring,
    isHealthy: metrics.isHealthy,
    memoryPressure: metrics.memoryPressure,
    performanceTrend,

    // Control functions
    startMonitoring,
    stopMonitoring,
    updateMetrics,
    
    // Operation tracking
    addOperation,
    clearOperations,

    // Alert management
    clearAlerts,
    resolveAlert,

    // Cache management
    clearCache,
    invalidateByTag,

    // Utility functions
    refreshMetrics: updateMetrics,
    getCacheStats: () => apiUtils.getCacheStats(),
    
    // Export data for debugging
    exportMetrics: () => ({
      metrics,
      operations,
      alerts,
      timestamp: Date.now()
    })
  }
}