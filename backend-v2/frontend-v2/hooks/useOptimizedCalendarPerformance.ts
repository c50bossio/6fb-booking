import React, { useCallback, useMemo, useRef, useEffect, useState } from 'react'

interface OptimizedPerformanceMetrics {
  renderTime: number
  appointmentCount: number
  memoryUsage?: number
  lastRenderTimestamp: number
  cacheHitRate: number
  userInteractionLatency: number
  componentMountTime: number
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
  performanceMetrics: OptimizedPerformanceMetrics | null
  optimizedAppointmentsByDay: (appointments: any[], dateRange: { start: Date; end: Date }) => Map<string, any[]>
  memoizedStatusColor: (status: string) => string
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => T
  clearCache: () => void
  measureUserInteraction: (interactionType: string) => () => void
}

/**
 * Optimized Calendar Performance Hook
 * Addresses memory leaks and performance issues in the original implementation
 */
export function useOptimizedCalendarPerformance(): CalendarPerformanceHook {
  const metricsRef = useRef<OptimizedPerformanceMetrics | null>(null)
  const renderTimersRef = useRef<Map<string, number>>(new Map())
  const interactionTimersRef = useRef<Map<string, number>>(new Map())
  
  // Enhanced cache management with memory limits
  const cacheRef = useRef<Map<string, any>>(new Map())
  const cacheMetadataRef = useRef<Map<string, { timestamp: number; accessCount: number }>>(new Map())
  const cacheHitsRef = useRef(0)
  const cacheMissesRef = useRef(0)
  const lastClearRef = useRef(Date.now())
  
  // Centralized cleanup registry to prevent memory leaks
  const cleanupRegistry = useRef<Map<string, () => void>>(new Map())
  const componentMountTime = useRef(Date.now())

  // Register cleanup functions to prevent memory leaks
  const registerCleanup = useCallback((id: string, cleanupFn: () => void) => {
    cleanupRegistry.current.set(id, cleanupFn)
  }, [])

  // Enhanced cache management with LRU and memory pressure awareness
  const manageCacheSize = useCallback(() => {
    const maxCacheSize = 100
    const maxMemoryMB = 50
    
    // Memory-based cache eviction
    if (typeof window !== 'undefined' && 'memory' in performance) {
      const memInfo = (performance as any).memory
      if (memInfo && memInfo.usedJSHeapSize > maxMemoryMB * 1024 * 1024) {
        // Aggressive cache clearing under memory pressure
        const entriesToKeep = Math.floor(cacheRef.current.size * 0.3) // Keep only 30%
        const entries = Array.from(cacheMetadataRef.current.entries())
          .sort((a, b) => b[1].accessCount - a[1].accessCount) // Sort by access count
          .slice(0, entriesToKeep)
        
        cacheRef.current.clear()
        cacheMetadataRef.current.clear()
        
        entries.forEach(([key, metadata]) => {
          cacheMetadataRef.current.set(key, metadata)
        })
        
        console.debug(`Memory pressure detected: Cache reduced to ${entriesToKeep} entries`)
        return
      }
    }
    
    // Size-based cache eviction
    if (cacheRef.current.size > maxCacheSize) {
      const entries = Array.from(cacheMetadataRef.current.entries())
        .sort((a, b) => {
          // LRU with access frequency weighting
          const scoreA = a[1].accessCount / (Date.now() - a[1].timestamp)
          const scoreB = b[1].accessCount / (Date.now() - b[1].timestamp)
          return scoreA - scoreB
        })
      
      const entriesToDelete = entries.slice(0, entries.length - Math.floor(maxCacheSize * 0.75))
      entriesToDelete.forEach(([key]) => {
        cacheRef.current.delete(key)
        cacheMetadataRef.current.delete(key)
      })
    }
  }, [])

  // Enhanced render performance measurement
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
      
      // Update metrics with enhanced data
      metricsRef.current = {
        renderTime,
        appointmentCount: metricsRef.current?.appointmentCount || 0,
        lastRenderTimestamp: now,
        cacheHitRate,
        memoryUsage: metricsRef.current?.memoryUsage || 0,
        userInteractionLatency: metricsRef.current?.userInteractionLatency || 0,
        componentMountTime: now - componentMountTime.current
      }
      
      // Intelligent performance logging
      if (process.env.NODE_ENV === 'development') {
        const isSlowRender = renderTime > 50
        const isCriticalRender = renderTime > 100
        
        if (isCriticalRender) {
          console.warn(`🚨 Critical render performance: ${componentName} took ${renderTime.toFixed(2)}ms`)
          // Trigger cache cleanup on critical renders
          manageCacheSize()
        } else if (isSlowRender) {
          console.debug(`⚠️ Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`)
        }
      }
    }
  }, [manageCacheSize])

  // Measure user interaction latency
  const measureUserInteraction = useCallback((interactionType: string) => {
    const startTime = performance.now()
    interactionTimersRef.current.set(interactionType, startTime)
    
    return () => {
      const endTime = performance.now()
      const latency = endTime - startTime
      
      if (metricsRef.current) {
        metricsRef.current.userInteractionLatency = latency
      }
      
      // Log high latency interactions
      if (process.env.NODE_ENV === 'development' && latency > 100) {
        console.warn(`High interaction latency: ${interactionType} took ${latency.toFixed(2)}ms`)
      }
    }
  }, [])

  // Optimized appointment filtering with intelligent caching
  const optimizedAppointmentFilter = useMemo(() => {
    return (appointments: any[], filters: FilterOptions) => {
      // Enhanced cache key with filter fingerprint
      const appointmentHash = appointments.length > 0 ? 
        `${appointments.length}-${appointments[0]?.id}-${appointments[appointments.length - 1]?.id}-${appointments[0]?.updated_at}` : 
        'empty'
      const filterHash = JSON.stringify(filters)
      const cacheKey = `filter-${appointmentHash}-${filterHash}`
      
      // Enhanced cache lookup with metadata tracking
      if (cacheRef.current.has(cacheKey)) {
        cacheHitsRef.current++
        const metadata = cacheMetadataRef.current.get(cacheKey)
        if (metadata) {
          metadata.accessCount++
          metadata.timestamp = Date.now()
        }
        return cacheRef.current.get(cacheKey)
      }
      
      cacheMissesRef.current++
      
      // Optimized filtering with early returns
      let filtered = appointments
      
      // Apply filters in order of selectivity (most selective first)
      if (filters.status) {
        filtered = filtered.filter(apt => apt.status === filters.status)
      }
      
      if (filters.serviceId) {
        filtered = filtered.filter(apt => apt.service_id === filters.serviceId)
      }
      
      if (filters.barberId && filters.barberId !== 'all') {
        filtered = filtered.filter(apt => apt.barber_id === filters.barberId)
      }
      
      // Date filtering (most expensive, do last)
      if (filters.startDate || filters.endDate) {
        filtered = filtered.filter(appointment => {
          try {
            const appointmentDate = new Date(appointment.start_time)
            if (filters.startDate && appointmentDate < filters.startDate) return false
            if (filters.endDate && appointmentDate >= filters.endDate) return false
            return true
          } catch {
            return false
          }
        })
      }
      
      // Pre-sort for better rendering performance
      const sorted = filtered.sort((a, b) => {
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      })
      
      // Update metrics
      if (metricsRef.current) {
        metricsRef.current.appointmentCount = sorted.length
      }
      
      // Cache with metadata
      cacheRef.current.set(cacheKey, sorted)
      cacheMetadataRef.current.set(cacheKey, {
        timestamp: Date.now(),
        accessCount: 1
      })
      
      // Manage cache size
      manageCacheSize()
      
      return sorted
    }
  }, [manageCacheSize])

  // Enhanced memoized date calculations with caching
  const memoizedDateCalculations = useMemo(() => {
    return (date: Date) => {
      const dateKey = `date-calc-${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      
      if (cacheRef.current.has(dateKey)) {
        cacheHitsRef.current++
        const metadata = cacheMetadataRef.current.get(dateKey)
        if (metadata) {
          metadata.accessCount++
          metadata.timestamp = Date.now()
        }
        return cacheRef.current.get(dateKey)
      }
      
      cacheMissesRef.current++
      
      // Optimized date calculations
      const dayOfWeek = date.getDay()
      const startOfWeek = new Date(date)
      startOfWeek.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      
      // Optimized month days calculation
      const year = date.getFullYear()
      const month = date.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      
      // Use Array.from for better performance than loop
      const monthDays = Array.from({ length: daysInMonth }, (_, i) => 
        new Date(year, month, i + 1)
      )
      
      // Pre-calculate business hours time slots
      const timeSlots = Array.from({ length: 32 }, (_, i) => {
        const hour = Math.floor(i / 2) + 6 // Start at 6 AM
        const minute = (i % 2) * 30 // 0 or 30 minutes
        return { hour: hour > 21 ? 21 : hour, minute } // Cap at 9 PM
      }).filter(slot => slot.hour <= 21)
      
      const calculations = {
        startOfWeek,
        endOfWeek,
        monthDays,
        timeSlots
      }
      
      // Cache with metadata
      cacheRef.current.set(dateKey, calculations)
      cacheMetadataRef.current.set(dateKey, {
        timestamp: Date.now(),
        accessCount: 1
      })
      
      return calculations
    }
  }, [])

  // Enhanced debounce with cleanup tracking
  const debounceCallback = useCallback((callback: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    const cleanupId = `debounce-${Date.now()}-${Math.random()}`
    
    const debouncedFn = (...args: any[]) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = setTimeout(() => {
        callback(...args)
        cleanupRegistry.current.delete(cleanupId)
      }, delay)
    }
    
    // Register cleanup
    registerCleanup(cleanupId, () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    })
    
    return debouncedFn
  }, [registerCleanup])

  // Enhanced throttle with cleanup tracking
  const throttle = useCallback(<T extends (...args: any[]) => any>(func: T, limit: number): T => {
    let inThrottle: boolean
    const cleanupId = `throttle-${Date.now()}-${Math.random()}`
    
    const throttledFn = ((...args: any[]) => {
      if (!inThrottle) {
        func.apply(null, args)
        inThrottle = true
        
        const timeoutId = setTimeout(() => {
          inThrottle = false
          cleanupRegistry.current.delete(cleanupId)
        }, limit)
        
        // Register cleanup
        registerCleanup(cleanupId, () => {
          clearTimeout(timeoutId)
          inThrottle = false
        })
      }
    }) as T
    
    return throttledFn
  }, [registerCleanup])

  // Enhanced cache clearing
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    cacheMetadataRef.current.clear()
    cacheHitsRef.current = 0
    cacheMissesRef.current = 0
    lastClearRef.current = Date.now()
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('Calendar cache cleared due to memory pressure or manual request')
    }
  }, [])

  // Optimized appointments by day with enhanced caching
  const optimizedAppointmentsByDay = useCallback((appointments: any[], dateRange: { start: Date; end: Date }) => {
    const cacheKey = `by-day-${appointments.length}-${dateRange.start.toDateString()}-${dateRange.end.toDateString()}`
    
    if (cacheRef.current.has(cacheKey)) {
      cacheHitsRef.current++
      return cacheRef.current.get(cacheKey)
    }
    
    cacheMissesRef.current++
    
    const dayMap = new Map<string, any[]>()
    
    // Optimized single-pass filtering and grouping
    appointments.forEach(appointment => {
      try {
        const appointmentDate = new Date(appointment.start_time)
        if (appointmentDate >= dateRange.start && appointmentDate <= dateRange.end) {
          const dayKey = appointmentDate.toDateString() // More reliable than manual formatting
          
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
    cacheMetadataRef.current.set(cacheKey, {
      timestamp: Date.now(),
      accessCount: 1
    })
    
    return dayMap
  }, [])

  // Memoized status color mapping with theme support
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

  // Enhanced memory monitoring with adaptive intervals
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && 'memory' in performance) {
      let monitoringInterval = 10000 // Start with 10 seconds
      
      const updateInterval = () => {
        const memInfo = (performance as any).memory
        if (memInfo && metricsRef.current) {
          const memoryUsageMB = memInfo.usedJSHeapSize / 1024 / 1024
          
          metricsRef.current = {
            ...metricsRef.current,
            memoryUsage: memoryUsageMB
          }
          
          // Adaptive monitoring frequency based on memory usage
          if (memoryUsageMB > 100) {
            monitoringInterval = 2000 // Monitor every 2 seconds under high memory
          } else if (memoryUsageMB > 50) {
            monitoringInterval = 5000 // Monitor every 5 seconds under medium memory
          } else {
            monitoringInterval = 10000 // Normal monitoring
          }
          
          // Emergency cleanup threshold
          if (memoryUsageMB > 150) {
            console.warn(`Critical memory usage: ${memoryUsageMB.toFixed(1)}MB - triggering emergency cleanup`)
            clearCache()
            // Force garbage collection if available
            if ((window as any).gc) {
              (window as any).gc()
            }
          }
        }
      }
      
      const scheduleNextCheck = () => {
        const timeoutId = setTimeout(() => {
          updateInterval()
          scheduleNextCheck()
        }, monitoringInterval)
        
        registerCleanup('memory-monitor', () => clearTimeout(timeoutId))
      }
      
      scheduleNextCheck()
    }
  }, [clearCache, registerCleanup])

  // Auto-cache cleanup with intelligent timing
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const timeSinceLastClear = now - lastClearRef.current
      const cacheSize = cacheRef.current.size
      
      // Intelligent cache cleanup based on multiple factors
      const shouldClear = 
        timeSinceLastClear > 300000 || // 5 minutes since last clear
        cacheSize > 75 || // Cache size threshold
        (metricsRef.current?.memoryUsage && metricsRef.current.memoryUsage > 75) // 75MB memory threshold
      
      if (shouldClear) {
        // Partial cleanup instead of full clear for better UX
        manageCacheSize()
        
        if (cacheSize > 100) {
          clearCache()
        }
      }
    }, 60000) // Check every minute
    
    registerCleanup('auto-cache-cleanup', () => clearInterval(interval))
    
    return () => clearInterval(interval)
  }, [clearCache, manageCacheSize, registerCleanup])

  // Comprehensive cleanup on unmount
  useEffect(() => {
    return () => {
      // Execute all registered cleanup functions
      cleanupRegistry.current.forEach((cleanup, id) => {
        try {
          cleanup()
        } catch (error) {
          console.error(`Failed to execute cleanup for ${id}:`, error)
        }
      })
      
      // Clear all registries
      cleanupRegistry.current.clear()
      cacheRef.current.clear()
      cacheMetadataRef.current.clear()
      renderTimersRef.current.clear()
      interactionTimersRef.current.clear()
      
      // Reset counters
      cacheHitsRef.current = 0
      cacheMissesRef.current = 0
      
      // Clear metrics
      metricsRef.current = null
      
      if (process.env.NODE_ENV === 'development') {
        console.debug('Optimized calendar performance hook cleaned up successfully')
      }
    }
  }, [])

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
    measureUserInteraction
  }
}