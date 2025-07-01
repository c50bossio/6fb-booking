import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'

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
}

export function useCalendarPerformance(): CalendarPerformanceHook {
  const metricsRef = useRef<PerformanceMetrics | null>(null)
  const renderTimersRef = useRef<Map<string, number>>(new Map())
  const cacheRef = useRef<Map<string, any>>(new Map())
  const cacheHitsRef = useRef(0)
  const cacheMissesRef = useRef(0)
  const lastClearRef = useRef(Date.now())

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
      if (process.env.NODE_ENV === 'development' && renderTime > 50) {
        // Throttle console warnings to max once per 5 seconds
        const lastWarn = renderTimersRef.current.get(`${componentName}_lastWarn`) || 0
        if (now - lastWarn > 5000) {
          console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms (Cache hit rate: ${cacheHitRate.toFixed(1)}%)`)
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
          if (filters.endDate && appointmentDate > filters.endDate) return false
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
      
      // Aggressive cache management
      if (cacheRef.current.size > 20) {
        const keysToDelete = Array.from(cacheRef.current.keys()).slice(0, 10)
        keysToDelete.forEach(key => cacheRef.current.delete(key))
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

  // Debounced callback for expensive operations
  const debounceCallback = useCallback((callback: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => callback(...args), delay)
    }
  }, [])

  // Monitor memory usage in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const interval = setInterval(() => {
        const memInfo = (performance as any).memory
        if (memInfo) {
          metricsRef.current = {
            ...metricsRef.current,
            memoryUsage: memInfo.usedJSHeapSize / 1024 / 1024, // MB
            renderTime: metricsRef.current?.renderTime || 0,
            appointmentCount: metricsRef.current?.appointmentCount || 0
          }
          
          // Warn if memory usage is high
          if (memInfo.usedJSHeapSize > 100 * 1024 * 1024) { // 100MB
            console.warn('High memory usage detected:', memInfo.usedJSHeapSize / 1024 / 1024, 'MB')
          }
        }
      }, 5000) // Check every 5 seconds
      
      return () => clearInterval(interval)
    }
  }, [])

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
  
  // Throttle function for expensive operations
  const throttle = useCallback(<T extends (...args: any[]) => any>(func: T, limit: number): T => {
    let inThrottle: boolean
    return ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(null, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }) as T
  }, [])
  
  // Clear cache function
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    cacheHitsRef.current = 0
    cacheMissesRef.current = 0
    lastClearRef.current = Date.now()
  }, [])
  
  // Auto-clear cache periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      if (now - lastClearRef.current > 300000) { // 5 minutes
        clearCache()
      }
    }, 60000) // Check every minute
    
    return () => clearInterval(interval)
  }, [clearCache])

  return {
    measureRender,
    optimizedAppointmentFilter,
    memoizedDateCalculations,
    debounceCallback,
    performanceMetrics: metricsRef.current,
    optimizedAppointmentsByDay,
    memoizedStatusColor,
    throttle,
    clearCache
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