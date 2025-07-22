'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, endOfMonth } from 'date-fns'
import { CalendarApiEnhanced } from '@/lib/calendar-api-enhanced'
import { requestBatcher } from '@/lib/requestBatcher'

interface PerformanceMetrics {
  renderTime: number
  appointmentCount: number
  memoryUsage?: number
  lastRenderTimestamp: number
  cacheHitRate: number
}

interface FilterOptions {
  barberId?: number | 'all'
  startDate?: Date
  endDate?: Date
  status?: string
  serviceId?: number
}

interface UseCalendarOptimizationOptions {
  currentDate?: string
  barberId?: number
  viewType?: 'day' | 'week' | 'month'
  enablePreloading?: boolean
  autoRefreshInterval?: number
  enablePerformanceTracking?: boolean
}

interface CalendarBatchingState {
  appointments: any[]
  metrics?: any
  availability?: any
  loading: boolean
  error?: Error
  lastUpdated?: Date
}

/**
 * Consolidated calendar optimization hook that combines performance tracking and request batching
 * Merges useCalendarPerformance and useCalendarBatching functionality
 */
export function useCalendarOptimization(options: UseCalendarOptimizationOptions = {}) {
  const {
    currentDate = new Date().toISOString().split('T')[0],
    barberId,
    viewType = 'day',
    enablePreloading = true,
    autoRefreshInterval,
    enablePerformanceTracking = true
  } = options

  // Batching state
  const [state, setState] = useState<CalendarBatchingState>({
    appointments: [],
    loading: false
  })

  // Performance tracking refs
  const metricsRef = useRef<PerformanceMetrics | null>(null)
  const renderTimersRef = useRef<Map<string, number>>(new Map())
  const cacheRef = useRef<Map<string, any>>(new Map())
  const cacheHitsRef = useRef(0)
  const cacheMissesRef = useRef(0)
  const lastClearRef = useRef(Date.now())
  const intervalRefs = useRef<Set<NodeJS.Timeout>>(new Set())
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set())

  // API and timeout refs
  const calendarApi = useRef(CalendarApiEnhanced.getInstance())
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const preloadTimeoutRef = useRef<NodeJS.Timeout>()

  // Performance measurement
  const measureRender = useCallback((componentName: string) => {
    if (!enablePerformanceTracking) return () => {}

    const startTime = performance.now()
    renderTimersRef.current.set(componentName, startTime)
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      const now = Date.now()
      
      // Calculate cache hit rate
      const totalRequests = cacheHitsRef.current + cacheMissesRef.current
      const cacheHitRate = totalRequests > 0 ? (cacheHitsRef.current / totalRequests) * 100 : 0
      
      // Update metrics
      metricsRef.current = {
        renderTime,
        appointmentCount: state.appointments.length,
        memoryUsage: (performance as any)?.memory?.usedJSHeapSize || undefined,
        lastRenderTimestamp: now,
        cacheHitRate
      }
    }
  }, [enablePerformanceTracking, state.appointments.length])

  // Optimized appointment filtering with caching
  const optimizedAppointmentFilter = useCallback((appointments: any[], filters: FilterOptions) => {
    const cacheKey = JSON.stringify({ filters, count: appointments.length })
    
    // Check cache first
    if (cacheRef.current.has(cacheKey)) {
      cacheHitsRef.current++
      return cacheRef.current.get(cacheKey)
    }
    
    cacheMissesRef.current++
    
    let filtered = appointments
    
    if (filters.barberId && filters.barberId !== 'all') {
      filtered = filtered.filter(apt => apt.barberId === filters.barberId)
    }
    
    if (filters.startDate) {
      filtered = filtered.filter(apt => new Date(apt.start_time) >= filters.startDate!)
    }
    
    if (filters.endDate) {
      filtered = filtered.filter(apt => new Date(apt.start_time) <= filters.endDate!)
    }
    
    if (filters.status) {
      filtered = filtered.filter(apt => apt.status === filters.status)
    }
    
    if (filters.serviceId) {
      filtered = filtered.filter(apt => apt.serviceId === filters.serviceId)
    }
    
    // Cache the result
    cacheRef.current.set(cacheKey, filtered)
    return filtered
  }, [])

  // Memoized date calculations
  const memoizedDateCalculations = useCallback((date: Date) => {
    const cacheKey = `date-calc-${date.toISOString().split('T')[0]}`
    
    if (cacheRef.current.has(cacheKey)) {
      cacheHitsRef.current++
      return cacheRef.current.get(cacheKey)
    }
    
    cacheMissesRef.current++
    
    const startWeek = startOfWeek(date, { weekStartsOn: 0 })
    const endWeek = endOfWeek(date, { weekStartsOn: 0 })
    const monthDays = eachDayOfInterval({
      start: startOfMonth(date),
      end: endOfMonth(date)
    })
    
    // Generate time slots (assuming 8 AM to 8 PM, 15-minute slots)
    const timeSlots = []
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        timeSlots.push({ hour, minute })
      }
    }
    
    const result = {
      startOfWeek: startWeek,
      endOfWeek: endWeek,
      monthDays,
      timeSlots
    }
    
    cacheRef.current.set(cacheKey, result)
    return result
  }, [])

  // Debounce function
  const debounceCallback = useCallback((callback: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    
    const debounced = (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => callback(...args), delay)
      timeoutRefs.current.add(timeoutId)
    }
    
    return debounced
  }, [])

  // Throttle function
  const throttle = useCallback(<T extends (...args: any[]) => any>(func: T, limit: number): T => {
    let inThrottle: boolean
    
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(null, args)
        inThrottle = true
        const timeout = setTimeout(() => inThrottle = false, limit)
        timeoutRefs.current.add(timeout)
      }
    }) as T
  }, [])

  // Optimized appointments by day with caching
  const optimizedAppointmentsByDay = useCallback((appointments: any[], dateRange: { start: Date; end: Date }) => {
    const cacheKey = `appointments-by-day-${dateRange.start.toISOString()}-${dateRange.end.toISOString()}-${appointments.length}`
    
    if (cacheRef.current.has(cacheKey)) {
      cacheHitsRef.current++
      return cacheRef.current.get(cacheKey)
    }
    
    cacheMissesRef.current++
    
    const appointmentsByDay = new Map<string, any[]>()
    
    appointments.forEach(appointment => {
      const appointmentDate = new Date(appointment.start_time)
      if (appointmentDate >= dateRange.start && appointmentDate <= dateRange.end) {
        const dayKey = appointmentDate.toISOString().split('T')[0]
        if (!appointmentsByDay.has(dayKey)) {
          appointmentsByDay.set(dayKey, [])
        }
        appointmentsByDay.get(dayKey)!.push(appointment)
      }
    })
    
    cacheRef.current.set(cacheKey, appointmentsByDay)
    return appointmentsByDay
  }, [])

  // Memoized status color
  const memoizedStatusColor = useCallback((status: string) => {
    const cacheKey = `status-color-${status}`
    
    if (cacheRef.current.has(cacheKey)) {
      cacheHitsRef.current++
      return cacheRef.current.get(cacheKey)
    }
    
    cacheMissesRef.current++
    
    const colorMap: Record<string, string> = {
      'confirmed': '#22c55e',
      'pending': '#f59e0b',
      'cancelled': '#ef4444',
      'completed': '#8b5cf6',
      'no-show': '#6b7280'
    }
    
    const color = colorMap[status] || '#6b7280'
    cacheRef.current.set(cacheKey, color)
    return color
  }, [])

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
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error as Error,
        loading: false
      }))
    }
  }, [viewType, currentDate, barberId])

  // Preload adjacent dates
  const preloadAdjacent = useCallback(async () => {
    if (!enablePreloading) return

    try {
      await calendarApi.current.preloadAdjacentDates({
        currentDate,
        viewType,
        barberId
      })
    } catch (error) {
      console.warn('Preload failed:', error)
    }
  }, [enablePreloading, currentDate, viewType, barberId])

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    cacheHitsRef.current = 0
    cacheMissesRef.current = 0
    lastClearRef.current = Date.now()
  }, [])

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefreshInterval && autoRefreshInterval > 0) {
      const interval = setInterval(() => {
        batchRefresh(false)
      }, autoRefreshInterval)
      
      intervalRefs.current.add(interval)
      
      return () => {
        clearInterval(interval)
        intervalRefs.current.delete(interval)
      }
    }
  }, [autoRefreshInterval, batchRefresh])

  // Preload setup
  useEffect(() => {
    if (enablePreloading) {
      const timeout = setTimeout(preloadAdjacent, 500)
      preloadTimeoutRef.current = timeout
      timeoutRefs.current.add(timeout)
      
      return () => {
        clearTimeout(timeout)
        timeoutRefs.current.delete(timeout)
      }
    }
  }, [enablePreloading, preloadAdjacent])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all intervals
      intervalRefs.current.forEach(interval => clearInterval(interval))
      intervalRefs.current.clear()
      
      // Clear all timeouts
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
      timeoutRefs.current.clear()
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current)
      }
    }
  }, [])

  // Get current performance metrics
  const performanceMetrics = useMemo(() => metricsRef.current, [metricsRef.current])

  return {
    // Batching state
    appointments: state.appointments,
    metrics: state.metrics,
    availability: state.availability,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    
    // Batching functions
    batchRefresh,
    preloadAdjacent,
    
    // Performance functions
    measureRender,
    optimizedAppointmentFilter,
    memoizedDateCalculations,
    debounceCallback,
    throttle,
    optimizedAppointmentsByDay,
    memoizedStatusColor,
    
    // Performance metrics
    performanceMetrics,
    
    // Cache management
    clearCache,
    
    // Cache statistics
    getCacheStats: () => ({
      size: cacheRef.current.size,
      hitRate: cacheHitsRef.current / (cacheHitsRef.current + cacheMissesRef.current) * 100 || 0,
      hits: cacheHitsRef.current,
      misses: cacheMissesRef.current,
      lastClear: lastClearRef.current
    })
  }
}

// Type exports
export type { PerformanceMetrics, FilterOptions, UseCalendarOptimizationOptions, CalendarBatchingState }