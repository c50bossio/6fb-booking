import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'

interface PerformanceMetrics {
  renderTime: number
  appointmentCount: number
  memoryUsage?: number
}

interface CalendarPerformanceHook {
  measureRender: (componentName: string) => () => void
  optimizedAppointmentFilter: (appointments: any[], filters: any) => any[]
  memoizedDateCalculations: (date: Date) => {
    startOfWeek: Date
    endOfWeek: Date
    monthDays: Date[]
    timeSlots: { hour: number; minute: number }[]
  }
  debounceCallback: (callback: Function, delay: number) => Function
  performanceMetrics: PerformanceMetrics | null
}

export function useCalendarPerformance(): CalendarPerformanceHook {
  const metricsRef = useRef<PerformanceMetrics | null>(null)
  const renderTimersRef = useRef<Map<string, number>>(new Map())

  // Measure component render performance
  const measureRender = useCallback((componentName: string) => {
    const startTime = performance.now()
    renderTimersRef.current.set(componentName, startTime)
    
    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Update metrics
      metricsRef.current = {
        ...metricsRef.current,
        renderTime,
        appointmentCount: metricsRef.current?.appointmentCount || 0
      }
      
      // Log slow renders in development
      if (process.env.NODE_ENV === 'development' && renderTime > 16) {
        console.warn(`Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`)
      }
    }
  }, [])

  // Optimized appointment filtering with memoization
  const optimizedAppointmentFilter = useMemo(() => {
    const cache = new Map()
    
    return (appointments: any[], filters: any) => {
      const cacheKey = JSON.stringify({ 
        appointmentIds: appointments.map(a => a.id),
        filters 
      })
      
      if (cache.has(cacheKey)) {
        return cache.get(cacheKey)
      }
      
      const filtered = appointments.filter(appointment => {
        // Date filtering
        if (filters.startDate || filters.endDate) {
          const appointmentDate = new Date(appointment.start_time)
          if (filters.startDate && appointmentDate < filters.startDate) return false
          if (filters.endDate && appointmentDate > filters.endDate) return false
        }
        
        // Barber filtering
        if (filters.barberId && filters.barberId !== 'all') {
          if (appointment.barber_id !== filters.barberId) return false
        }
        
        // Status filtering
        if (filters.status && appointment.status !== filters.status) return false
        
        return true
      })
      
      // Sort appointments by start time for better rendering performance
      const sorted = filtered.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
      
      cache.set(cacheKey, sorted)
      
      // Limit cache size to prevent memory leaks
      if (cache.size > 10) {
        const firstKey = cache.keys().next().value
        cache.delete(firstKey)
      }
      
      return sorted
    }
  }, [])

  // Memoized date calculations to avoid recalculating on every render
  const memoizedDateCalculations = useMemo(() => {
    const cache = new Map()
    
    return (date: Date) => {
      const dateKey = date.toDateString()
      
      if (cache.has(dateKey)) {
        return cache.get(dateKey)
      }
      
      // Calculate week boundaries
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - date.getDay() + 1) // Monday start
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      
      // Calculate month days
      const year = date.getFullYear()
      const month = date.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const monthDays: Date[] = []
      
      for (let day = 1; day <= lastDay.getDate(); day++) {
        monthDays.push(new Date(year, month, day))
      }
      
      // Calculate time slots (6 AM to 10 PM, 30-minute intervals)
      const timeSlots: { hour: number; minute: number }[] = []
      for (let hour = 6; hour < 22; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          timeSlots.push({ hour, minute })
        }
      }
      
      const calculations = {
        startOfWeek,
        endOfWeek,
        monthDays,
        timeSlots
      }
      
      cache.set(dateKey, calculations)
      
      // Limit cache size
      if (cache.size > 5) {
        const firstKey = cache.keys().next().value
        cache.delete(firstKey)
      }
      
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

  return {
    measureRender,
    optimizedAppointmentFilter,
    memoizedDateCalculations,
    debounceCallback,
    performanceMetrics: metricsRef.current
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