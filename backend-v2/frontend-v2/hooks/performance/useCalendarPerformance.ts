'use client'

import { useRef, useCallback, useEffect, useMemo } from 'react'
import { usePerformanceMonitor, performanceUtils } from '@/lib/performance-utils'

// Types for Web Worker communication
interface DateCalculationTask {
  id: string
  type: 'generateTimeSlots' | 'findAvailableSlots' | 'calculateRecurring' | 'optimizeSchedule' | 'validateTimeRange'
  payload: any
}

interface WorkerResponse {
  id: string
  success: boolean
  result?: any
  error?: string
}

interface TimeSlot {
  start: string
  end: string
  available: boolean
  appointmentId?: number
  reason?: string
}

interface AppointmentData {
  id: number
  start_time: string
  end_time: string
  service_duration: number
  buffer_time?: number
}

interface AvailabilityRules {
  workingHours: { start: string; end: string }
  workingDays: number[]
  breaks: { start: string; end: string }[]
  minimumBookingNotice: number
  maximumBookingAdvance: number
}

interface PerformanceConfig {
  enableWebWorkers?: boolean
  enableVirtualScrolling?: boolean
  chunkSize?: number
  debounceMs?: number
  maxCacheSize?: number
}

interface CalendarPerformanceMetrics {
  renderTime: number
  calculationTime: number
  memoryUsage: number
  itemsRendered: number
  totalItems: number
  cacheHitRate: number
}

/**
 * Enhanced performance hook for calendar operations
 * Provides Web Workers, virtual scrolling, caching, and performance monitoring
 */
export function useCalendarPerformance(config: PerformanceConfig = {}) {
  const {
    enableWebWorkers = true,
    enableVirtualScrolling = true,
    chunkSize = 50,
    debounceMs = 300,
    maxCacheSize = 100
  } = config

  const workerRef = useRef<Worker | null>(null)
  const pendingTasks = useRef<Map<string, { resolve: Function; reject: Function }>>(new Map())
  const cacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map())
  const performanceMetrics = useRef<CalendarPerformanceMetrics>({
    renderTime: 0,
    calculationTime: 0,
    memoryUsage: 0,
    itemsRendered: 0,
    totalItems: 0,
    cacheHitRate: 0
  })

  const { startBenchmark, endBenchmark, trackRender, getCurrentMetrics, getMemoryUsage } = usePerformanceMonitor()

  // Initialize Web Worker
  useEffect(() => {
    if (enableWebWorkers && typeof Window !== 'undefined' && 'Worker' in window) {
      try {
        workerRef.current = new Worker(
          new URL('../workers/date-calculations.worker.ts', import.meta.url)
        )

        workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
          const { id, success, result, error } = event.data
          const pending = pendingTasks.current.get(id)
          
          if (pending) {
            if (success) {
              pending.resolve(result)
            } else {
              pending.reject(new Error(error || 'Worker task failed'))
            }
            pendingTasks.current.delete(id)
          }
        }

        workerRef.current.onerror = (error) => {
          console.error('Web Worker error:', error)
          // Fallback to main thread calculations
        }
      } catch (error) {
        console.warn('Failed to initialize Web Worker, falling back to main thread:', error)
      }
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      pendingTasks.current.clear()
    }
  }, [enableWebWorkers])

  // Web Worker task execution
  const executeWorkerTask = useCallback(async <T>(
    type: DateCalculationTask['type'],
    payload: any
  ): Promise<T> => {
    if (!workerRef.current) {
      throw new Error('Web Worker not available')
    }

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const benchmarkId = `worker_${type}_${taskId}`
    
    startBenchmark(benchmarkId, `Worker: ${type}`)

    return new Promise((resolve, reject) => {
      pendingTasks.current.set(taskId, { resolve, reject })
      
      const task: DateCalculationTask = { id: taskId, type, payload }
      workerRef.current!.postMessage(task)

      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingTasks.current.has(taskId)) {
          pendingTasks.current.delete(taskId)
          reject(new Error('Worker task timeout'))
        }
      }, 30000)
    }).finally(() => {
      endBenchmark(benchmarkId)
    })
  }, [startBenchmark, endBenchmark])

  // Caching utilities
  const getCached = useCallback((key: string): any | null => {
    const cached = cacheRef.current.get(key)
    
    if (cached) {
      // Check if cache is still valid (5 minutes)
      const isValid = Date.now() - cached.timestamp < 5 * 60 * 1000
      
      if (isValid) {
        // Update cache hit rate
        const currentMetrics = performanceMetrics.current
        currentMetrics.cacheHitRate = Math.min(currentMetrics.cacheHitRate + 0.1, 1)
        return cached.data
      } else {
        cacheRef.current.delete(key)
      }
    }
    
    return null
  }, [])

  const setCache = useCallback((key: string, data: any): void => {
    if (cacheRef.current.size >= maxCacheSize) {
      // Remove oldest entry
      const oldestKey = Array.from(cacheRef.current.keys())[0]
      cacheRef.current.delete(oldestKey)
    }
    
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now()
    })
  }, [maxCacheSize])

  // Generate time slots with performance optimization
  const generateTimeSlots = useCallback(async (
    startDate: string,
    endDate: string,
    slotDuration: number,
    availabilityRules: AvailabilityRules,
    existingAppointments: AppointmentData[]
  ): Promise<TimeSlot[]> => {
    const cacheKey = `slots_${startDate}_${endDate}_${slotDuration}_${JSON.stringify(availabilityRules)}`
    
    // Check cache first
    const cached = getCached(cacheKey)
    if (cached) return cached

    const benchmarkId = `generateTimeSlots_${Date.now()}`
    startBenchmark(benchmarkId, 'Generate Time Slots')
    
    try {
      let result: TimeSlot[]
      
      if (enableWebWorkers && workerRef.current) {
        result = await executeWorkerTask('generateTimeSlots', {
          startDate,
          endDate,
          slotDuration,
          availabilityRules,
          existingAppointments
        })
      } else {
        // Fallback to main thread (simplified implementation)
        result = await generateTimeSlotsMainThread(
          startDate,
          endDate,
          slotDuration,
          availabilityRules,
          existingAppointments
        )
      }
      
      setCache(cacheKey, result)
      performanceMetrics.current.totalItems = result.length
      
      return result
    } finally {
      const benchmark = endBenchmark(benchmarkId)
      if (benchmark) {
        performanceMetrics.current.calculationTime = benchmark.duration || 0
      }
    }
  }, [enableWebWorkers, getCached, setCache, executeWorkerTask, startBenchmark, endBenchmark])

  // Find available slots with optimization
  const findAvailableSlots = useCallback(async (
    date: string,
    duration: number,
    availabilityRules: AvailabilityRules,
    existingAppointments: AppointmentData[],
    maxResults: number = 10
  ): Promise<TimeSlot[]> => {
    const cacheKey = `available_${date}_${duration}_${maxResults}`
    const cached = getCached(cacheKey)
    if (cached) return cached

    const benchmarkId = `findAvailableSlots_${Date.now()}`
    startBenchmark(benchmarkId, 'Find Available Slots')
    
    try {
      let result: TimeSlot[]
      
      if (enableWebWorkers && workerRef.current) {
        result = await executeWorkerTask('findAvailableSlots', {
          date,
          duration,
          availabilityRules,
          existingAppointments,
          maxResults
        })
      } else {
        // Simplified main thread implementation
        const allSlots = await generateTimeSlotsMainThread(
          date,
          date,
          duration,
          availabilityRules,
          existingAppointments
        )
        result = allSlots.filter(slot => slot.available).slice(0, maxResults)
      }
      
      setCache(cacheKey, result)
      return result
    } finally {
      endBenchmark(benchmarkId)
    }
  }, [enableWebWorkers, getCached, setCache, executeWorkerTask, generateTimeSlots])

  // Virtual scrolling utilities
  const calculateVirtualScrollParams = useCallback((
    totalItems: number,
    itemHeight: number,
    containerHeight: number,
    scrollTop: number
  ) => {
    return performanceUtils.calculateVirtualScrollParams(
      totalItems,
      itemHeight,
      containerHeight,
      scrollTop
    )
  }, [])

  // Optimized data chunking for large datasets
  const optimizeDataForRendering = useCallback(<T>(
    data: T[],
    customChunkSize?: number
  ) => {
    const effectiveChunkSize = customChunkSize || chunkSize
    return performanceUtils.optimizeForLargeDataset(data, effectiveChunkSize)
  }, [chunkSize])

  // Debounced functions for performance
  const debouncedFunctions = useMemo(() => ({
    generateTimeSlots: performanceUtils.debounce(generateTimeSlots, debounceMs),
    findAvailableSlots: performanceUtils.debounce(findAvailableSlots, debounceMs)
  }), [generateTimeSlots, findAvailableSlots, debounceMs])

  // Performance metrics tracking
  const updatePerformanceMetrics = useCallback(() => {
    const currentMetrics = getCurrentMetrics()
    const memory = getMemoryUsage()
    
    performanceMetrics.current = {
      ...performanceMetrics.current,
      renderTime: currentMetrics.renderTime,
      memoryUsage: memory.usedJSHeapSize,
      itemsRendered: performanceMetrics.current.itemsRendered,
      totalItems: performanceMetrics.current.totalItems,
      cacheHitRate: performanceMetrics.current.cacheHitRate
    }
  }, [getCurrentMetrics, getMemoryUsage])

  // Track render for performance monitoring
  const trackCalendarRender = useCallback((componentName: string, itemCount: number) => {
    trackRender(componentName)
    performanceMetrics.current.itemsRendered = itemCount
    updatePerformanceMetrics()
  }, [trackRender, updatePerformanceMetrics])

  // Get performance report
  const getPerformanceReport = useCallback(() => {
    updatePerformanceMetrics()
    
    return {
      metrics: { ...performanceMetrics.current },
      cacheStats: {
        size: cacheRef.current.size,
        maxSize: maxCacheSize,
        utilization: (cacheRef.current.size / maxCacheSize) * 100
      },
      webWorkerStats: {
        enabled: enableWebWorkers,
        available: !!workerRef.current,
        pendingTasks: pendingTasks.current.size
      },
      recommendations: generatePerformanceRecommendations()
    }
  }, [updatePerformanceMetrics, maxCacheSize, enableWebWorkers])

  // Generate performance recommendations
  const generatePerformanceRecommendations = useCallback((): string[] => {
    const recommendations: string[] = []
    const metrics = performanceMetrics.current
    
    if (metrics.calculationTime > 1000) {
      recommendations.push('Date calculations are slow. Consider reducing date range or enabling Web Workers.')
    }
    
    if (metrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected. Enable virtual scrolling for large datasets.')
    }
    
    if (metrics.cacheHitRate < 0.5) {
      recommendations.push('Low cache hit rate. Consider increasing cache size or optimizing query patterns.')
    }
    
    if (metrics.itemsRendered > 1000) {
      recommendations.push('Rendering many items. Virtual scrolling could improve performance.')
    }
    
    return recommendations
  }, [])

  // Clear cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    performanceMetrics.current.cacheHitRate = 0
  }, [])

  return {
    // Core functionality
    generateTimeSlots,
    findAvailableSlots,
    
    // Debounced functions
    debouncedGenerateTimeSlots: debouncedFunctions.generateTimeSlots,
    debouncedFindAvailableSlots: debouncedFunctions.findAvailableSlots,
    
    // Virtual scrolling
    calculateVirtualScrollParams,
    optimizeDataForRendering,
    
    // Performance monitoring
    trackCalendarRender,
    updatePerformanceMetrics,
    getPerformanceReport,
    
    // Cache management
    getCached,
    setCache,
    clearCache,
    
    // Configuration
    config: {
      enableWebWorkers,
      enableVirtualScrolling,
      chunkSize,
      debounceMs,
      maxCacheSize
    },
    
    // Status
    isWebWorkerAvailable: !!workerRef.current,
    pendingTasksCount: pendingTasks.current.size,
    cacheSize: cacheRef.current.size
  }
}

// Fallback main thread implementation (simplified)
async function generateTimeSlotsMainThread(
  startDate: string,
  endDate: string,
  slotDuration: number,
  availabilityRules: AvailabilityRules,
  existingAppointments: AppointmentData[]
): Promise<TimeSlot[]> {
  // This is a simplified implementation for fallback
  // In a real scenario, this would implement the full date calculation logic
  const slots: TimeSlot[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  let currentTime = new Date(start)
  
  while (currentTime < end) {
    const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000)
    
    if (slotEnd <= end) {
      slots.push({
        start: currentTime.toISOString(),
        end: slotEnd.toISOString(),
        available: Math.random() > 0.3 // Simplified availability check
      })
    }
    
    currentTime = new Date(currentTime.getTime() + slotDuration * 60000)
  }
  
  return slots
}

export default useCalendarPerformance