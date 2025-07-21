/**
 * React Hook for Cached Time Slots Management
 * 
 * Provides intelligent caching, automatic background refresh, and optimized
 * loading states for time slot data in booking components.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  getCachedTimeSlots, 
  getCachedNextAvailableSlot,
  invalidateBookingCache,
  batchLoadTimeSlots,
  getCacheMetrics,
  type useBookingCache
} from '@/lib/cached-api'
import type { TimeSlot, NextAvailableSlot, SlotsResponse } from '@/lib/api'

interface UsTimeSlotsOptions {
  /** Whether to automatically preload nearby dates */
  preloadNearbyDates?: boolean
  /** Number of days to preload around selected date */
  preloadRange?: number
  /** Service filter for time slots */
  service?: string
  /** Barber ID for barber-specific availability */
  barberId?: string
  /** Whether to enable background refresh */
  backgroundRefresh?: boolean
  /** Callback when cache is updated */
  onCacheUpdate?: () => void
}

interface UseTimeSlotsReturn {
  // Time slots data
  timeSlots: TimeSlot[]
  nextAvailable: NextAvailableSlot | null
  
  // Loading states
  loading: boolean
  refreshing: boolean
  error: string | null
  
  // Actions
  loadTimeSlots: (date: string, forceRefresh?: boolean) => Promise<void>
  loadNextAvailable: (forceRefresh?: boolean) => Promise<void>
  refreshAll: () => Promise<void>
  invalidateCache: (date?: string) => void
  
  // Cache management
  preloadNearbyDates: (centerDate: string) => Promise<void>
  cacheMetrics: ReturnType<typeof getCacheMetrics>
  
  // State helpers
  isDataStale: boolean
  lastRefresh: Date | null
}

export function useTimeSlotsCache(options: UsTimeSlotsOptions = {}): UseTimeSlotsReturn {
  const {
    preloadNearbyDates: autoPreload = true,
    preloadRange = 3,
    service,
    barberId,
    backgroundRefresh = true,
    onCacheUpdate
  } = options

  // State
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [nextAvailable, setNextAvailable] = useState<NextAvailableSlot | null>(null)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [cacheMetrics, setCacheMetrics] = useState(getCacheMetrics())

  // Refs for cleanup
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const metricsIntervalRef = useRef<NodeJS.Timeout>()

  // Update cache metrics periodically
  useEffect(() => {
    const updateMetrics = () => setCacheMetrics(getCacheMetrics())
    updateMetrics() // Initial update
    
    metricsIntervalRef.current = setInterval(updateMetrics, 5000) // Every 5 seconds
    
    return () => {
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current)
      }
    }
  }, [])

  // Load time slots for a specific date
  const loadTimeSlots = useCallback(async (date: string, forceRefresh = false): Promise<void> => {
    try {
      if (forceRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)

      // Use barber-specific API if barberId is provided
      let response: SlotsResponse
      if (barberId) {
        // Import the enhanced appointmentsAPI for barber-specific slots
        const { appointmentsAPI } = await import('@/lib/api')
        response = await appointmentsAPI.getAvailableSlotsForBarber(date, barberId)
        console.log('🎯 Loaded barber-specific slots:', { date, barberId, slotsCount: response.slots?.length })
      } else {
        // Use the cached version for general slots
        response = await getCachedTimeSlots(date, service, forceRefresh)
      }
      
      setTimeSlots(response.slots || [])
      setLastRefresh(new Date())
      
      // Auto-preload nearby dates if enabled
      if (autoPreload && !forceRefresh) {
        preloadNearbyDatesInternal(date).catch(console.warn)
      }
      
      onCacheUpdate?.()
    } catch (err: any) {
      console.error('Failed to load time slots:', err)
      setError(err.message || 'Failed to load time slots')
      setTimeSlots([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [service, barberId, autoPreload, onCacheUpdate])

  // Load next available slot
  const loadNextAvailable = useCallback(async (forceRefresh = false): Promise<void> => {
    try {
      if (forceRefresh) {
        setRefreshing(true)
      }

      // For barber-specific booking, we could enhance this to get barber-specific next available
      // For now, use the general next available slot
      const result = await getCachedNextAvailableSlot(service, forceRefresh)
      setNextAvailable(result)
      setLastRefresh(new Date())
      
      onCacheUpdate?.()
    } catch (err: any) {
      console.warn('Failed to load next available slot:', err)
      // Don't set error for next available - it's not critical
      setNextAvailable(null)
    } finally {
      setRefreshing(false)
    }
  }, [service, barberId, onCacheUpdate])

  // Refresh all data
  const refreshAll = useCallback(async (): Promise<void> => {
    const currentDate = new Date().toISOString().split('T')[0]
    await Promise.all([
      loadTimeSlots(currentDate, true),
      loadNextAvailable(true)
    ])
  }, [loadTimeSlots, loadNextAvailable])

  // Invalidate cache
  const invalidateCache = useCallback((date?: string): void => {
    invalidateBookingCache(date)
    setTimeSlots([])
    setNextAvailable(null)
    setCacheMetrics(getCacheMetrics())
    onCacheUpdate?.()
  }, [onCacheUpdate])

  // Preload nearby dates around a center date
  const preloadNearbyDatesInternal = useCallback(async (centerDate: string): Promise<void> => {
    const center = new Date(centerDate)
    const dates: string[] = []
    
    for (let i = -preloadRange; i <= preloadRange; i++) {
      if (i === 0) continue // Skip center date (already loaded)
      
      const date = new Date(center)
      date.setDate(date.getDate() + i)
      
      // Only preload future dates
      if (date >= new Date()) {
        dates.push(date.toISOString().split('T')[0])
      }
    }
    
    if (dates.length > 0) {
      await batchLoadTimeSlots(dates, service)
    }
  }, [preloadRange, service])

  const preloadNearbyDates = useCallback(async (centerDate: string): Promise<void> => {
    await preloadNearbyDatesInternal(centerDate)
    setCacheMetrics(getCacheMetrics())
    onCacheUpdate?.()
  }, [preloadNearbyDatesInternal, onCacheUpdate])

  // Background refresh setup
  useEffect(() => {
    if (!backgroundRefresh) return

    const scheduleRefresh = () => {
      // Refresh every 2 minutes when component is active
      refreshTimeoutRef.current = setTimeout(async () => {
        if (document.visibilityState === 'visible') {
          try {
            await loadNextAvailable(true)
            // Don't refresh time slots in background unless user is actively viewing them
          } catch (err) {
            console.warn('Background refresh failed:', err)
          }
        }
        scheduleRefresh() // Schedule next refresh
      }, 2 * 60 * 1000) // 2 minutes
    }

    scheduleRefresh()

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [backgroundRefresh, loadNextAvailable])

  // Auto-refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && lastRefresh) {
        const timeSinceRefresh = Date.now() - lastRefresh.getTime()
        // Refresh if it's been more than 3 minutes
        if (timeSinceRefresh > 3 * 60 * 1000) {
          refreshAll().catch(console.warn)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [lastRefresh, refreshAll])

  // Calculate if data is stale
  const isDataStale = lastRefresh ? (Date.now() - lastRefresh.getTime()) > 5 * 60 * 1000 : true

  return {
    // Data
    timeSlots,
    nextAvailable,
    
    // States
    loading,
    refreshing,
    error,
    isDataStale,
    lastRefresh,
    cacheMetrics,
    
    // Actions
    loadTimeSlots,
    loadNextAvailable,
    refreshAll,
    invalidateCache,
    preloadNearbyDates
  }
}

/**
 * Hook for managing cache across multiple booking components
 */
export function useBookingCacheManager() {
  const [cacheMetrics, setCacheMetrics] = useState(getCacheMetrics())
  const metricsInterval = useRef<NodeJS.Timeout>()

  useEffect(() => {
    const updateMetrics = () => setCacheMetrics(getCacheMetrics())
    updateMetrics()
    
    metricsInterval.current = setInterval(updateMetrics, 10000) // Every 10 seconds
    
    return () => {
      if (metricsInterval.current) {
        clearInterval(metricsInterval.current)
      }
    }
  }, [])

  const invalidateAll = useCallback(() => {
    invalidateBookingCache()
    setCacheMetrics(getCacheMetrics())
  }, [])

  const invalidateTimeSlots = useCallback((date?: string) => {
    invalidateBookingCache(date)
    setCacheMetrics(getCacheMetrics())
  }, [])

  return {
    cacheMetrics,
    invalidateAll,
    invalidateTimeSlots,
    refreshMetrics: () => setCacheMetrics(getCacheMetrics())
  }
}

/**
 * Performance monitoring hook for cache effectiveness
 */
export function useCachePerformance() {
  const [metrics, setMetrics] = useState(getCacheMetrics())
  const [performanceLog, setPerformanceLog] = useState<Array<{
    timestamp: number
    hitRate: number
    avgAge: number
    size: number
  }>>([])

  useEffect(() => {
    const interval = setInterval(() => {
      const newMetrics = getCacheMetrics()
      setMetrics(newMetrics)
      
      // Keep performance log for analysis
      setPerformanceLog(prev => {
        const newEntry = {
          timestamp: Date.now(),
          hitRate: newMetrics.hitRate,
          avgAge: newMetrics.avgAge,
          size: newMetrics.size
        }
        
        // Keep last 100 entries
        return [...prev.slice(-99), newEntry]
      })
    }, 15000) // Every 15 seconds

    return () => clearInterval(interval)
  }, [])

  const averageHitRate = performanceLog.length > 0
    ? performanceLog.reduce((sum, entry) => sum + entry.hitRate, 0) / performanceLog.length
    : 0

  return {
    currentMetrics: metrics,
    performanceLog,
    averageHitRate: Math.round(averageHitRate * 100), // As percentage
    cacheEfficiency: averageHitRate > 0.7 ? 'good' : averageHitRate > 0.4 ? 'moderate' : 'poor'
  }
}