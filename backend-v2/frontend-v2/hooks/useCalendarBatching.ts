'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { CalendarApiEnhanced } from '@/lib/calendar-api-enhanced'
import { requestBatcher } from '@/lib/requestBatcher'

interface UseCalendarBatchingOptions {
  currentDate?: string
  barberId?: number
  viewType?: 'day' | 'week' | 'month'
  enablePreloading?: boolean
  autoRefreshInterval?: number
}

interface CalendarBatchingState {
  appointments: any[]
  metrics?: any
  availability?: any
  loading: boolean
  error?: Error
  lastUpdated?: Date
}

export const useCalendarBatching = (options: UseCalendarBatchingOptions = {}) => {
  const {
    currentDate = new Date().toISOString().split('T')[0],
    barberId,
    viewType = 'day',
    enablePreloading = true,
    autoRefreshInterval
  } = options

  const [state, setState] = useState<CalendarBatchingState>({
    appointments: [],
    loading: false
  })

  const calendarApi = useRef(CalendarApiEnhanced.getInstance())
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const preloadTimeoutRef = useRef<NodeJS.Timeout>()

  // Batch refresh calendar data
  const batchRefresh = useCallback(async (includeMetrics = false) => {
    setState(prev => ({ ...prev, loading: true, error: undefined }))

    try {
      const result = await calendarApi.current.batchCalendarRefresh({
        viewType,
        currentDate,
        barberId,
        includeMetrics
      })

      setState(prev => ({
        ...prev,
        appointments: result.appointments,
        metrics: result.metrics,
        availability: result.availability,
        loading: false,
        lastUpdated: new Date()
      }))

      // Schedule preloading for adjacent dates
      if (enablePreloading && viewType === 'day') {
        if (preloadTimeoutRef.current) {
          clearTimeout(preloadTimeoutRef.current)
        }
        preloadTimeoutRef.current = setTimeout(() => {
          calendarApi.current.preloadAdjacentDates(currentDate, barberId)
        }, 500)
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error
      }))
    }
  }, [currentDate, barberId, viewType, enablePreloading])

  // Smart refresh (only fetch what's needed)
  const smartRefresh = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: undefined }))

    try {
      await calendarApi.current.smartRefresh({
        currentDate,
        barberId,
        includeAdjacentDays: viewType === 'day'
      })

      // Trigger a regular refresh to get the updated data
      await batchRefresh()
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error
      }))
    }
  }, [currentDate, barberId, viewType, batchRefresh])

  // Batch update multiple appointments
  const batchUpdateAppointments = useCallback(async (operations: Array<{
    type: 'create' | 'update' | 'delete' | 'cancel' | 'reschedule'
    appointmentId?: number
    data?: any
  }>) => {
    setState(prev => ({ ...prev, loading: true }))

    try {
      await calendarApi.current.batchUpdateAppointments(operations)
      
      // Refresh calendar data after batch operations
      await smartRefresh()
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error as Error
      }))
      throw error
    }
  }, [smartRefresh])

  // Get batch statistics for monitoring
  const getBatchStats = useCallback(() => {
    return requestBatcher.getBatchStats()
  }, [])

  // Flush pending batches immediately
  const flushPendingBatches = useCallback(async () => {
    await requestBatcher.flush()
  }, [])

  // Clear cache for fresh data
  const clearCache = useCallback((pattern?: string) => {
    requestBatcher.clearCache(pattern)
  }, [])

  // Configure batching behavior
  const configureBatching = useCallback((batchType: string, config: any) => {
    requestBatcher.configure(batchType, config)
  }, [])

  // Initial load and refresh on dependencies change
  useEffect(() => {
    batchRefresh(true) // Include metrics on initial load
  }, [batchRefresh])

  // Auto refresh interval
  useEffect(() => {
    if (autoRefreshInterval && autoRefreshInterval > 0) {
      refreshTimeoutRef.current = setInterval(() => {
        smartRefresh()
      }, autoRefreshInterval)

      return () => {
        if (refreshTimeoutRef.current) {
          clearInterval(refreshTimeoutRef.current)
        }
      }
    }
  }, [autoRefreshInterval, smartRefresh])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearInterval(refreshTimeoutRef.current)
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
    }
  }, [])

  // Preload adjacent data when date changes
  useEffect(() => {
    if (enablePreloading && viewType === 'day') {
      const timeoutId = setTimeout(() => {
        calendarApi.current.preloadAdjacentDates(currentDate, barberId)
      }, 1000) // Delay to avoid interfering with main load

      return () => clearTimeout(timeoutId)
    }
  }, [currentDate, barberId, enablePreloading, viewType])

  return {
    // State
    appointments: state.appointments,
    metrics: state.metrics,
    availability: state.availability,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Actions
    refresh: batchRefresh,
    smartRefresh,
    batchUpdateAppointments,

    // Utilities
    getBatchStats,
    flushPendingBatches,
    clearCache,
    configureBatching,

    // Calendar API access
    calendarApi: calendarApi.current
  }
}

// Helper hook for batch statistics monitoring
export const useBatchingStats = () => {
  const [stats, setStats] = useState<any>({})

  const updateStats = useCallback(() => {
    setStats(requestBatcher.getBatchStats())
  }, [])

  useEffect(() => {
    // Update stats periodically
    const interval = setInterval(updateStats, 2000)
    
    // Initial update
    updateStats()

    return () => clearInterval(interval)
  }, [updateStats])

  return {
    stats,
    refresh: updateStats
  }
}

// Helper hook for batching configuration
export const useBatchingConfig = () => {
  const configure = useCallback((batchType: string, config: any) => {
    requestBatcher.configure(batchType, config)
  }, [])

  const getConfig = useCallback(() => {
    // This would need to be implemented in the RequestBatcher class
    return {}
  }, [])

  return {
    configure,
    getConfig
  }
}