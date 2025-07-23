'use client'

import { 
  useMemo, 
  useCallback, 
  useEffect, 
  useRef, 
  useState,
  useTransition 
} from 'react'
import { useCalendarPerformance } from './useCalendarPerformance'
import { usePerformanceMonitor, performanceUtils } from '@/lib/performance-utils'
import type { BookingResponse } from '@/lib/api'

interface CalendarOptimizationConfig {
  enableMemoization?: boolean
  enableDeferredUpdates?: boolean
  enableBatchUpdates?: boolean
  enableSmartFiltering?: boolean
  updateBatchSize?: number
  debounceMs?: number
  maxRenderItems?: number
}

interface FilterCriteria {
  status?: string[]
  dateRange?: { start: string; end: string }
  serviceType?: string[]
  clientName?: string
  search?: string
}

interface CalendarData {
  appointments: BookingResponse[]
  timeSlots: any[]
  availabilities: any[]
  conflicts: any[]
}

interface OptimizedCalendarState {
  data: CalendarData
  filteredData: CalendarData
  isLoading: boolean
  error: string | null
  lastUpdate: number
  renderCount: number
}

interface CalendarOperations {
  updateAppointments: (appointments: BookingResponse[]) => void
  addAppointment: (appointment: BookingResponse) => void
  updateAppointment: (id: number, updates: Partial<BookingResponse>) => void
  removeAppointment: (id: number) => void
  bulkUpdateAppointments: (updates: Array<{ id: number; updates: Partial<BookingResponse> }>) => void
  applyFilters: (filters: FilterCriteria) => void
  clearFilters: () => void
  refreshData: () => Promise<void>
}

/**
 * Advanced calendar optimization hook with memoization, batch updates, and smart filtering
 * Provides optimized data management and rendering performance for large calendar datasets
 */
export function useOptimizedCalendar(
  initialAppointments: BookingResponse[] = [],
  config: CalendarOptimizationConfig = {}
) {
  const {
    enableMemoization = true,
    enableDeferredUpdates = true,
    enableBatchUpdates = true,
    enableSmartFiltering = true,
    updateBatchSize = 50,
    debounceMs = 300,
    maxRenderItems = 1000
  } = config

  // State management
  const [state, setState] = useState<OptimizedCalendarState>({
    data: {
      appointments: initialAppointments,
      timeSlots: [],
      availabilities: [],
      conflicts: []
    },
    filteredData: {
      appointments: initialAppointments,
      timeSlots: [],
      availabilities: [],
      conflicts: []
    },
    isLoading: false,
    error: null,
    lastUpdate: Date.now(),
    renderCount: 0
  })

  const [filters, setFilters] = useState<FilterCriteria>({})
  const [isPending, startTransition] = useTransition()
  
  // Refs for optimization
  const batchUpdateQueue = useRef<Array<() => void>>([])
  const filterTimeoutRef = useRef<NodeJS.Timeout>()
  const lastFilterHash = useRef<string>('')
  
  // Performance hooks
  const { 
    debouncedGenerateTimeSlots, 
    optimizeDataForRendering,
    trackCalendarRender,
    getPerformanceReport
  } = useCalendarPerformance({
    enableWebWorkers: true,
    enableVirtualScrolling: true,
    chunkSize: updateBatchSize,
    debounceMs
  })

  const { startBenchmark, endBenchmark } = usePerformanceMonitor()

  // Memoized appointment grouping and sorting
  const groupedAppointments = useMemo(() => {
    if (!enableMemoization) return state.filteredData.appointments

    const benchmarkId = `groupAppointments_${Date.now()}`
    startBenchmark(benchmarkId, 'Group Appointments')

    try {
      const appointments = state.filteredData.appointments
      const grouped = {
        byDate: new Map<string, BookingResponse[]>(),
        byStatus: new Map<string, BookingResponse[]>(),
        byClient: new Map<string, BookingResponse[]>(),
        byService: new Map<string, BookingResponse[]>(),
        sorted: [...appointments].sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        )
      }

      appointments.forEach(appointment => {
        const date = new Date(appointment.start_time).toDateString()
        const status = appointment.status
        const client = appointment.client_name || 'Unknown'
        const service = appointment.service_name || 'Unknown'

        // Group by date
        if (!grouped.byDate.has(date)) grouped.byDate.set(date, [])
        grouped.byDate.get(date)!.push(appointment)

        // Group by status
        if (!grouped.byStatus.has(status)) grouped.byStatus.set(status, [])
        grouped.byStatus.get(status)!.push(appointment)

        // Group by client
        if (!grouped.byClient.has(client)) grouped.byClient.set(client, [])
        grouped.byClient.get(client)!.push(appointment)

        // Group by service
        if (!grouped.byService.has(service)) grouped.byService.set(service, [])
        grouped.byService.get(service)!.push(appointment)
      })

      return grouped
    } finally {
      endBenchmark(benchmarkId)
    }
  }, [state.filteredData.appointments, enableMemoization, startBenchmark, endBenchmark])

  // Memoized statistics
  const calendarStats = useMemo(() => {
    if (!enableMemoization) return null

    const appointments = state.filteredData.appointments
    const now = new Date()
    
    return {
      total: appointments.length,
      today: appointments.filter(apt => {
        const aptDate = new Date(apt.start_time)
        return aptDate.toDateString() === now.toDateString()
      }).length,
      thisWeek: appointments.filter(apt => {
        const aptDate = new Date(apt.start_time)
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return aptDate >= weekStart && aptDate <= weekEnd
      }).length,
      upcoming: appointments.filter(apt => 
        new Date(apt.start_time) > now
      ).length,
      byStatus: Array.from(groupedAppointments.byStatus.entries()).map(([status, apts]) => ({
        status,
        count: apts.length,
        percentage: (apts.length / appointments.length) * 100
      })),
      revenue: appointments.reduce((sum, apt) => sum + (apt.price || 0), 0)
    }
  }, [state.filteredData.appointments, groupedAppointments, enableMemoization])

  // Smart filtering with performance optimization
  const applySmartFiltering = useCallback((
    appointments: BookingResponse[],
    filterCriteria: FilterCriteria
  ): BookingResponse[] => {
    if (!enableSmartFiltering || Object.keys(filterCriteria).length === 0) {
      return appointments
    }

    const benchmarkId = `smartFiltering_${Date.now()}`
    startBenchmark(benchmarkId, 'Smart Filtering')

    try {
      return appointments.filter(appointment => {
        // Status filter
        if (filterCriteria.status && filterCriteria.status.length > 0) {
          if (!filterCriteria.status.includes(appointment.status)) return false
        }

        // Date range filter
        if (filterCriteria.dateRange) {
          const aptDate = new Date(appointment.start_time)
          const startDate = new Date(filterCriteria.dateRange.start)
          const endDate = new Date(filterCriteria.dateRange.end)
          if (aptDate < startDate || aptDate > endDate) return false
        }

        // Service type filter
        if (filterCriteria.serviceType && filterCriteria.serviceType.length > 0) {
          if (!filterCriteria.serviceType.includes(appointment.service_name || '')) return false
        }

        // Client name filter
        if (filterCriteria.clientName) {
          const clientName = appointment.client_name?.toLowerCase() || ''
          const searchName = filterCriteria.clientName.toLowerCase()
          if (!clientName.includes(searchName)) return false
        }

        // General search filter
        if (filterCriteria.search) {
          const searchTerm = filterCriteria.search.toLowerCase()
          const searchableText = [
            appointment.client_name,
            appointment.service_name,
            appointment.notes,
            appointment.client_email,
            appointment.client_phone
          ].join(' ').toLowerCase()
          
          if (!searchableText.includes(searchTerm)) return false
        }

        return true
      })
    } finally {
      endBenchmark(benchmarkId)
    }
  }, [enableSmartFiltering, startBenchmark, endBenchmark])

  // Batch update processor
  const processBatchUpdates = useCallback(() => {
    if (!enableBatchUpdates || batchUpdateQueue.current.length === 0) return

    const benchmarkId = `batchUpdates_${Date.now()}`
    startBenchmark(benchmarkId, 'Process Batch Updates')

    try {
      if (enableDeferredUpdates) {
        startTransition(() => {
          const updates = [...batchUpdateQueue.current]
          batchUpdateQueue.current = []
          updates.forEach(update => update())
        })
      } else {
        const updates = [...batchUpdateQueue.current]
        batchUpdateQueue.current = []
        updates.forEach(update => update())
      }
    } finally {
      endBenchmark(benchmarkId)
    }
  }, [enableBatchUpdates, enableDeferredUpdates, startBenchmark, endBenchmark, startTransition])

  // Debounced filter application
  const debouncedApplyFilters = useMemo(() => 
    performanceUtils.debounce((newFilters: FilterCriteria) => {
      const filterHash = JSON.stringify(newFilters)
      
      if (filterHash === lastFilterHash.current) return
      lastFilterHash.current = filterHash

      const filtered = applySmartFiltering(state.data.appointments, newFilters)
      
      setState(prev => ({
        ...prev,
        filteredData: {
          ...prev.filteredData,
          appointments: filtered
        },
        lastUpdate: Date.now()
      }))
    }, debounceMs), 
    [applySmartFiltering, state.data.appointments, debounceMs]
  )

  // Calendar operations
  const operations: CalendarOperations = useMemo(() => ({
    updateAppointments: (appointments: BookingResponse[]) => {
      const update = () => {
        setState(prev => {
          const newData = {
            ...prev.data,
            appointments: appointments.slice(0, maxRenderItems)
          }
          
          return {
            ...prev,
            data: newData,
            filteredData: {
              ...prev.filteredData,
              appointments: applySmartFiltering(newData.appointments, filters)
            },
            lastUpdate: Date.now(),
            renderCount: prev.renderCount + 1
          }
        })
      }

      if (enableBatchUpdates) {
        batchUpdateQueue.current.push(update)
        processBatchUpdates()
      } else {
        update()
      }
    },

    addAppointment: (appointment: BookingResponse) => {
      const update = () => {
        setState(prev => {
          const newAppointments = [appointment, ...prev.data.appointments]
          const filtered = applySmartFiltering(newAppointments, filters)

          return {
            ...prev,
            data: {
              ...prev.data,
              appointments: newAppointments
            },
            filteredData: {
              ...prev.filteredData,
              appointments: filtered
            },
            lastUpdate: Date.now()
          }
        })
      }

      if (enableBatchUpdates) {
        batchUpdateQueue.current.push(update)
        processBatchUpdates()
      } else {
        update()
      }
    },

    updateAppointment: (id: number, updates: Partial<BookingResponse>) => {
      const update = () => {
        setState(prev => {
          const newAppointments = prev.data.appointments.map(apt =>
            apt.id === id ? { ...apt, ...updates } : apt
          )
          const filtered = applySmartFiltering(newAppointments, filters)

          return {
            ...prev,
            data: {
              ...prev.data,
              appointments: newAppointments
            },
            filteredData: {
              ...prev.filteredData,
              appointments: filtered
            },
            lastUpdate: Date.now()
          }
        })
      }

      if (enableBatchUpdates) {
        batchUpdateQueue.current.push(update)
        processBatchUpdates()
      } else {
        update()
      }
    },

    removeAppointment: (id: number) => {
      const update = () => {
        setState(prev => {
          const newAppointments = prev.data.appointments.filter(apt => apt.id !== id)
          const filtered = applySmartFiltering(newAppointments, filters)

          return {
            ...prev,
            data: {
              ...prev.data,
              appointments: newAppointments
            },
            filteredData: {
              ...prev.filteredData,
              appointments: filtered
            },
            lastUpdate: Date.now()
          }
        })
      }

      if (enableBatchUpdates) {
        batchUpdateQueue.current.push(update)
        processBatchUpdates()
      } else {
        update()
      }
    },

    bulkUpdateAppointments: (updates: Array<{ id: number; updates: Partial<BookingResponse> }>) => {
      const update = () => {
        setState(prev => {
          const newAppointments = [...prev.data.appointments]
          
          updates.forEach(({ id, updates: aptUpdates }) => {
            const index = newAppointments.findIndex(apt => apt.id === id)
            if (index !== -1) {
              newAppointments[index] = { ...newAppointments[index], ...aptUpdates }
            }
          })

          const filtered = applySmartFiltering(newAppointments, filters)

          return {
            ...prev,
            data: {
              ...prev.data,
              appointments: newAppointments
            },
            filteredData: {
              ...prev.filteredData,
              appointments: filtered
            },
            lastUpdate: Date.now()
          }
        })
      }

      if (enableBatchUpdates) {
        batchUpdateQueue.current.push(update)
        processBatchUpdates()
      } else {
        update()
      }
    },

    applyFilters: (filterCriteria: FilterCriteria) => {
      setFilters(filterCriteria)
      debouncedApplyFilters(filterCriteria)
    },

    clearFilters: () => {
      setFilters({})
      debouncedApplyFilters({})
    },

    refreshData: async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      try {
        // This would typically fetch from API
        // For now, just refresh the filtered data
        const filtered = applySmartFiltering(state.data.appointments, filters)
        
        setState(prev => ({
          ...prev,
          filteredData: {
            ...prev.filteredData,
            appointments: filtered
          },
          isLoading: false,
          lastUpdate: Date.now()
        }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to refresh data',
          isLoading: false
        }))
      }
    }
  }), [
    filters, 
    applySmartFiltering, 
    enableBatchUpdates, 
    processBatchUpdates, 
    debouncedApplyFilters,
    maxRenderItems,
    state.data.appointments
  ])

  // Track render performance
  useEffect(() => {
    trackCalendarRender('OptimizedCalendar', state.filteredData.appointments.length)
  }, [trackCalendarRender, state.filteredData.appointments.length])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current)
      }
    }
  }, [])

  // Optimized data for rendering (chunked if needed)
  const optimizedRenderData = useMemo(() => {
    if (state.filteredData.appointments.length <= maxRenderItems) {
      return {
        appointments: state.filteredData.appointments,
        hasMore: false,
        totalCount: state.filteredData.appointments.length
      }
    }

    const chunks = optimizeDataForRendering(state.filteredData.appointments)
    
    return {
      appointments: chunks.getChunk(0) || [],
      hasMore: chunks.totalChunks > 1,
      totalCount: state.filteredData.appointments.length,
      loadNextChunk: (chunkIndex: number) => chunks.getChunk(chunkIndex)
    }
  }, [state.filteredData.appointments, maxRenderItems, optimizeDataForRendering])

  return {
    // Core data
    appointments: optimizedRenderData.appointments,
    allAppointments: state.data.appointments,
    filteredCount: state.filteredData.appointments.length,
    totalCount: state.data.appointments.length,
    
    // Optimized data structures
    groupedAppointments,
    calendarStats,
    optimizedRenderData,
    
    // Operations
    ...operations,
    
    // State
    isLoading: state.isLoading || isPending,
    error: state.error,
    filters,
    lastUpdate: state.lastUpdate,
    renderCount: state.renderCount,
    
    // Performance utilities
    getPerformanceReport,
    
    // Configuration
    config: {
      enableMemoization,
      enableDeferredUpdates,
      enableBatchUpdates,
      enableSmartFiltering,
      updateBatchSize,
      debounceMs,
      maxRenderItems
    }
  }
}

export default useOptimizedCalendar
export type { CalendarOptimizationConfig, FilterCriteria, CalendarData, CalendarOperations }