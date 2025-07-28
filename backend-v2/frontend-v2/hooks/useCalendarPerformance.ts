import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { 
  getCalendarMonitor, 
  CalendarPerformanceMetrics, 
  CalendarEvent, 
  PerformanceAlert, 
  CalendarAnalytics 
} from '@/lib/calendar-performance-monitoring'

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

interface CalendarPerformanceHook {
  measureRender: (componentName: string) => () => void
  optimizedAppointmentFilter: (appointments: any[], filters: FilterOptions) => any[]
  memoizedDateCalculations: (date: Date) => {
    startOfWeek: Date
    endOfWeek: Date
    monthDays: Date[]
    timeSlots: { hour: number; minute: number }[]
  }
  debounceCallback: (callback: Function, delay: number) => Function
  performanceMetrics: PerformanceMetrics | null
  optimizedAppointmentsByDay: (appointments: any[], dateRange: { start: Date; end: Date }) => Map<string, any[]>
  memoizedStatusColor: (status: string) => string
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => T
  clearCache: () => void
  // Enhanced monitoring capabilities
  enhancedMetrics: CalendarPerformanceMetrics
  events: CalendarEvent[]
  alerts: PerformanceAlert[]
  analytics: CalendarAnalytics
  measureLoad: () => () => void
  measureApiCall: (endpoint: string) => () => void
  recordConflictResolution: (duration: number) => void
  recordUserInteraction: (interaction: string, latency: number) => void
  recordError: (error: Error, context?: Record<string, any>) => void
  updateDataFreshness: (freshness: number) => void
  resolveAlert: (alertId: string) => void
  clearAlerts: () => void
  exportMetrics: () => string
  isMonitoring: boolean
  startMonitoring: () => void
  stopMonitoring: () => void
}

export function useCalendarPerformance(): CalendarPerformanceHook {
  // Enhanced monitoring system
  const monitor = getCalendarMonitor()
  const [enhancedMetrics, setEnhancedMetrics] = useState<CalendarPerformanceMetrics>(monitor.getMetrics())
  const [events, setEvents] = useState<CalendarEvent[]>(monitor.getEvents(20))
  const [alerts, setAlerts] = useState<PerformanceAlert[]>(monitor.getAlerts())
  const [analytics, setAnalytics] = useState<CalendarAnalytics>(monitor.getAnalytics())
  const [isMonitoring, setIsMonitoring] = useState(false)
  
  // Original refs for backward compatibility
  const metricsRef = useRef<PerformanceMetrics | null>(null)
  const renderTimersRef = useRef<Map<string, number>>(new Map())
  const cacheRef = useRef<Map<string, any>>(new Map())
  const cacheHitsRef = useRef(0)
  const cacheMissesRef = useRef(0)
  const lastClearRef = useRef(Date.now())
  const intervalRefs = useRef<Set<NodeJS.Timeout>>(new Set())
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set())

  // Measure component render performance with throttling
  const measureRender = useCallback((componentName: string) => {
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
        appointmentCount: metricsRef.current?.appointmentCount || 0,
        lastRenderTimestamp: now,
        cacheHitRate,
        memoryUsage: metricsRef.current?.memoryUsage
      }
      
      // Only log slow renders occasionally to reduce performance impact
      if (process.env.NODE_ENV === 'development' && renderTime > 100) {
        // Throttle console warnings to max once per 10 seconds for critical performance issues
        const lastWarn = renderTimersRef.current.get(`${componentName}_lastWarn`) || 0
        if (now - lastWarn > 10000) {
          console.warn(`Critical render performance: ${componentName} took ${renderTime.toFixed(2)}ms (Cache hit rate: ${cacheHitRate.toFixed(1)}%)`)
          renderTimersRef.current.set(`${componentName}_lastWarn`, now)
        }
      }
    }
  }, [])

  // Optimized appointment filtering with enhanced memoization
  const optimizedAppointmentFilter = useMemo(() => {
    return (appointments: any[], filters: FilterOptions) => {
      // Create stable cache key
      const appointmentHash = appointments.length > 0 ? 
        `${appointments.length}-${appointments[0]?.id}-${appointments[appointments.length - 1]?.id}` : 
        'empty'
      const cacheKey = `filter-${appointmentHash}-${JSON.stringify(filters)}`
      
      if (cacheRef.current.has(cacheKey)) {
        cacheHitsRef.current++
        return cacheRef.current.get(cacheKey)
      }
      
      cacheMissesRef.current++
      
      // Use more efficient filtering
      const filtered = appointments.filter(appointment => {
        // Quick status check first (most common filter)
        if (filters.status && appointment.status !== filters.status) return false
        
        // Barber filtering
        if (filters.barberId && filters.barberId !== 'all') {
          if (appointment.barber_id !== filters.barberId) return false
        }
        
        // Service filtering
        if (filters.serviceId && appointment.service_id !== filters.serviceId) return false
        
        // Date filtering (most expensive, do last)
        if (filters.startDate || filters.endDate) {
          const appointmentDate = new Date(appointment.start_time)
          if (filters.startDate && appointmentDate < filters.startDate) return false
          if (filters.endDate && appointmentDate >= filters.endDate) return false
        }
        
        return true
      })
      
      // Pre-sort for better rendering performance
      const sorted = filtered.sort((a, b) => {
        const timeA = new Date(a.start_time).getTime()
        const timeB = new Date(b.start_time).getTime()
        return timeA - timeB
      })
      
      // Update appointment count in metrics
      if (metricsRef.current) {
        metricsRef.current.appointmentCount = sorted.length
      }
      
      cacheRef.current.set(cacheKey, sorted)
      
          // Enhanced cache management with LRU-style eviction
      if (cacheRef.current.size > 50) {
        // Clear oldest entries, keeping most recent 25
        const entries = Array.from(cacheRef.current.entries())
        const keysToDelete = entries.slice(0, entries.length - 25).map(([key]) => key)
        keysToDelete.forEach(key => cacheRef.current.delete(key))
        
        // Reset counters proportionally
        const retainRatio = 25 / entries.length
        cacheHitsRef.current = Math.floor(cacheHitsRef.current * retainRatio)
        cacheMissesRef.current = Math.floor(cacheMissesRef.current * retainRatio)
      }
      
      return sorted
    }
  }, [])

  // Enhanced memoized date calculations
  const memoizedDateCalculations = useMemo(() => {
    return (date: Date) => {
      const dateKey = `date-calc-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      
      if (cacheRef.current.has(dateKey)) {
        cacheHitsRef.current++
        return cacheRef.current.get(dateKey)
      }
      
      cacheMissesRef.current++
      
      // Calculate week boundaries (Monday start)
      const dayOfWeek = date.getDay()
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      
      // Calculate month days more efficiently
      const year = date.getFullYear()
      const month = date.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      const monthDays: Date[] = new Array(daysInMonth)
      
      for (let day = 0; day < daysInMonth; day++) {
        monthDays[day] = new Date(year, month, day + 1)
      }
      
      // Pre-calculate common time slots
      const timeSlots: { hour: number; minute: number }[] = []
      for (let hour = 6; hour < 22; hour++) {
        timeSlots.push({ hour, minute: 0 })
        timeSlots.push({ hour, minute: 30 })
      }
      
      const calculations = {
        startOfWeek,
        endOfWeek,
        monthDays,
        timeSlots
      }
      
      cacheRef.current.set(dateKey, calculations)
      
      return calculations
    }
  }, [])

  // Debounced callback for expensive operations with timeout tracking
  const debounceCallback = useCallback((callback: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    
    return (...args: any[]) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
        timeoutRefs.current.delete(timeoutId)
      }
      
      timeoutId = setTimeout(() => {
        callback(...args)
        timeoutRefs.current.delete(timeoutId)
      }, delay)
      
      timeoutRefs.current.add(timeoutId)
    }
  }, [])

  // Clear cache function
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    cacheHitsRef.current = 0
    cacheMissesRef.current = 0
    lastClearRef.current = Date.now()
  }, [])

  // Monitor memory usage in development with proper cleanup
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && 'memory' in performance) {
      const interval = setInterval(() => {
        const memInfo = (performance as any).memory
        if (memInfo && metricsRef.current) {
          metricsRef.current = {
            ...metricsRef.current,
            memoryUsage: memInfo.usedJSHeapSize / 1024 / 1024, // MB
            renderTime: metricsRef.current?.renderTime || 0,
            appointmentCount: metricsRef.current?.appointmentCount || 0,
            lastRenderTimestamp: metricsRef.current?.lastRenderTimestamp || Date.now(),
            cacheHitRate: metricsRef.current?.cacheHitRate || 0
          }
          
          // Warn if memory usage is critical
          if (memInfo.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB threshold
            // Only warn once per minute to reduce noise
            const now = Date.now()
            const lastMemWarn = renderTimersRef.current.get('memory_warn') || 0
            if (now - lastMemWarn > 60000) {
              console.warn('High memory usage detected:', Math.round(memInfo.usedJSHeapSize / 1024 / 1024), 'MB')
              renderTimersRef.current.set('memory_warn', now)
            }
            
            // Trigger emergency cleanup if memory usage is critical
            if (memInfo.usedJSHeapSize > 200 * 1024 * 1024) { // 200MB critical threshold
              console.warn('Critical memory usage - triggering emergency cleanup')
              clearCache()
            }
          }
        }
      }, 5000) // Check every 5 seconds
      
      intervalRefs.current.add(interval)
      
      return () => {
        clearInterval(interval)
        intervalRefs.current.delete(interval)
      }
    }
  }, [clearCache])

  // New optimized appointments by day function
  const optimizedAppointmentsByDay = useCallback((appointments: any[], dateRange: { start: Date; end: Date }) => {
    const cacheKey = `by-day-${appointments.length}-${dateRange.start.toDateString()}-${dateRange.end.toDateString()}`
    
    if (cacheRef.current.has(cacheKey)) {
      cacheHitsRef.current++
      return cacheRef.current.get(cacheKey)
    }
    
    cacheMissesRef.current++
    
    const dayMap = new Map<string, any[]>()
    
    // Filter and group in single pass
    appointments.forEach(appointment => {
      try {
        const appointmentDate = new Date(appointment.start_time)
        if (appointmentDate >= dateRange.start && appointmentDate <= dateRange.end) {
          const dayKey = `${appointmentDate.getFullYear()}-${appointmentDate.getMonth()}-${appointmentDate.getDate()}`
          
          if (!dayMap.has(dayKey)) {
            dayMap.set(dayKey, [])
          }
          dayMap.get(dayKey)!.push(appointment)
        }
      } catch {
        // Skip invalid dates
      }
    })
    
    // Sort appointments within each day
    dayMap.forEach((dayAppointments) => {
      dayAppointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    })
    
    cacheRef.current.set(cacheKey, dayMap)
    
    return dayMap
  }, [])
  
  // Memoized status color mapping
  const memoizedStatusColor = useMemo(() => {
    const statusColorMap = new Map([
      ['confirmed', 'bg-green-500 border-green-600 text-white'],
      ['scheduled', 'bg-green-500 border-green-600 text-white'],
      ['pending', 'bg-yellow-500 border-yellow-600 text-white'],
      ['cancelled', 'bg-red-500 border-red-600 text-white'],
      ['completed', 'bg-blue-500 border-blue-600 text-white']
    ])
    
    return (status: string) => {
      return statusColorMap.get(status) || 'bg-purple-500 border-purple-600 text-white'
    }
  }, [])
  
  // Throttle function for expensive operations with timeout tracking
  const throttle = useCallback(<T extends (...args: any[]) => any>(func: T, limit: number): T => {
    let inThrottle: boolean
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(null, args)
        inThrottle = true
        const timeoutId = setTimeout(() => {
          inThrottle = false
          timeoutRefs.current.delete(timeoutId)
        }, limit)
        timeoutRefs.current.add(timeoutId)
      }
    }) as T
  }, [])
  
  // Auto-clear cache periodically with memory monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      
      // Clear cache every 5 minutes or if memory usage is high
      const shouldClear = now - lastClearRef.current > 300000 || // 5 minutes
        (metricsRef.current?.memoryUsage && metricsRef.current.memoryUsage > 100) // 100MB
      
      if (shouldClear) {
        clearCache()
      }
      
      // Emergency cache clearing if size grows too large
      if (cacheRef.current.size > 100) {
        // Emergency cache clear due to size limits
        clearCache()
      }
    }, 60000) // Check every minute
    
    intervalRefs.current.add(interval)
    
    return () => {
      clearInterval(interval)
      intervalRefs.current.delete(interval)
    }
  }, [clearCache])

  // Comprehensive cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all intervals
      intervalRefs.current.forEach(interval => clearInterval(interval))
      intervalRefs.current.clear()
      
      // Clear all timeouts
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout))
      timeoutRefs.current.clear()
      
      // Clear all caches and refs
      cacheRef.current.clear()
      renderTimersRef.current.clear()
      
      // Reset counters
      cacheHitsRef.current = 0
      cacheMissesRef.current = 0
      
      // Clear metrics
      metricsRef.current = null
      
      if (process.env.NODE_ENV === 'development') {
        // Calendar performance hook cleaned up successfully
      }
    }
  }, [])
  
  // Memory pressure listener for browsers that support it
  useEffect(() => {
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const handleMemoryPressure = () => {
        // Memory pressure detected, clearing calendar cache
        clearCache()
      }
      
      // Listen for memory pressure events (experimental API)
      if ('onmemorywarning' in window) {
        window.addEventListener('memorywarning', handleMemoryPressure)
        return () => window.removeEventListener('memorywarning', handleMemoryPressure)
      }
    }
  }, [clearCache])

  // Enhanced monitoring methods
  const measureLoad = useCallback(() => {
    return monitor.measureCalendarLoad()
  }, [monitor])

  const measureApiCall = useCallback((endpoint: string) => {
    return monitor.measureApiCall(endpoint)
  }, [monitor])

  const recordConflictResolution = useCallback((duration: number) => {
    monitor.recordConflictResolution(duration)
  }, [monitor])

  const recordUserInteraction = useCallback((interaction: string, latency: number) => {
    monitor.recordUserInteraction(interaction, latency)
  }, [monitor])

  const recordError = useCallback((error: Error, context?: Record<string, any>) => {
    monitor.recordError(error, context)
  }, [monitor])

  const updateDataFreshness = useCallback((freshness: number) => {
    monitor.updateDataFreshness(freshness)
  }, [monitor])

  const resolveAlert = useCallback((alertId: string) => {
    monitor.resolveAlert(alertId)
  }, [monitor])

  const clearAlerts = useCallback(() => {
    monitor.clearAlerts()
    setAlerts([])
  }, [monitor])

  const exportMetrics = useCallback(() => {
    return monitor.exportMetrics()
  }, [monitor])

  const startMonitoring = useCallback(() => {
    monitor.startMonitoring()
    setIsMonitoring(true)
  }, [monitor])

  const stopMonitoring = useCallback(() => {
    monitor.stopMonitoring()
    setIsMonitoring(false)
  }, [monitor])

  // Enhanced monitoring event listeners
  useEffect(() => {
    const handleAlert = (alert: PerformanceAlert) => {
      setAlerts(prev => [...prev, alert])
    }

    const handleEvent = (event: CalendarEvent) => {
      setEvents(prev => [event, ...prev.slice(0, 19)])
    }

    const handleAlertResolved = (alert: PerformanceAlert) => {
      setAlerts(prev => prev.map(a => a.id === alert.id ? alert : a))
    }

    monitor.on('alert', handleAlert)
    monitor.on('event', handleEvent)
    monitor.on('alertResolved', handleAlertResolved)

    // Update enhanced metrics periodically
    const interval = setInterval(() => {
      setEnhancedMetrics(monitor.getMetrics())
      setAnalytics(monitor.getAnalytics())
    }, 5000)

    intervalRefs.current.add(interval)

    return () => {
      monitor.off('alert', handleAlert)
      monitor.off('event', handleEvent)
      monitor.off('alertResolved', handleAlertResolved)
      clearInterval(interval)
      intervalRefs.current.delete(interval)
    }
  }, [monitor])

  // Integrate cache metrics with enhanced monitoring
  useEffect(() => {
    const totalRequests = cacheHitsRef.current + cacheMissesRef.current
    if (totalRequests > 0) {
      monitor.updateCacheMetrics(cacheHitsRef.current, cacheMissesRef.current)
    }
  }, [monitor])

  return {
    measureRender,
    optimizedAppointmentFilter,
    memoizedDateCalculations,
    debounceCallback,
    performanceMetrics: metricsRef.current,
    optimizedAppointmentsByDay,
    memoizedStatusColor,
    throttle,
    clearCache,
    // Enhanced monitoring capabilities
    enhancedMetrics,
    events,
    alerts,
    analytics,
    measureLoad,
    measureApiCall,
    recordConflictResolution,
    recordUserInteraction,
    recordError,
    updateDataFreshness,
    resolveAlert,
    clearAlerts,
    exportMetrics,
    isMonitoring,
    startMonitoring,
    stopMonitoring
  }
}

// Higher-order component for measuring component performance
export function withPerformanceMonitoring<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  const WrappedComponent = React.memo((props: T) => {
    const { measureRender } = useCalendarPerformance()
    const endMeasure = useRef<(() => void) | null>(null)
    
    useEffect(() => {
      endMeasure.current = measureRender(componentName)
      
      return () => {
        endMeasure.current?.()
      }
    })
    
    return React.createElement(Component, props)
  })
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`
  
  return WrappedComponent
}

// Hook for optimizing large lists with virtual scrolling
export function useVirtualScrolling(
  items: any[], 
  containerHeight: number, 
  itemHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0)
  
  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    )
    
    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    }
  }, [items, scrollTop, containerHeight, itemHeight])
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])
  
  return {
    visibleItems,
    handleScroll,
    totalHeight: visibleItems.totalHeight,
    offsetY: visibleItems.offsetY
  }
}