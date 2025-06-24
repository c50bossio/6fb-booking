/**
 * React hook for managing real-time availability data
 * Provides optimistic updates, caching, and error handling
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  availabilityService,
  type AvailabilityRequest,
  type AvailabilityResponse,
  type SlotRecommendation
} from '../lib/availability/availability-service'
import {
  conflictResolver,
  type SchedulingConflict,
  type ConflictContext,
  type ReschedulingOptions
} from '../lib/availability/conflict-resolver'
import { errorManager, type AppError } from '../lib/error-handling/error-manager'
import { cache } from '../lib/cache'

export interface UseAvailabilityState {
  availability: AvailabilityResponse | null
  isLoading: boolean
  isRefreshing: boolean
  error: AppError | null
  lastUpdated: Date | null
  dataAge: number
  conflicts: SchedulingConflict[]
  recommendations: SlotRecommendation[]
}

export interface UseAvailabilityActions {
  refreshAvailability: () => Promise<void>
  checkConflicts: (context: ConflictContext) => Promise<SchedulingConflict[]>
  getAlternatives: (request: AvailabilityRequest) => Promise<SlotRecommendation[]>
  reserveSlot: (barberId: number, date: string, time: string, duration: number) => Promise<boolean>
  releaseSlot: (barberId: number, date: string, time: string) => void
  invalidateCache: (barberId?: number, date?: string) => void
  clearError: () => void
}

export interface UseAvailabilityOptions {
  autoRefresh?: boolean
  refreshInterval?: number // milliseconds
  staleTime?: number // milliseconds
  retryOnError?: boolean
  maxRetries?: number
  onError?: (error: AppError) => void
  onConflict?: (conflicts: SchedulingConflict[]) => void
  enableOptimisticUpdates?: boolean
}

export interface UseAvailabilityReturn extends UseAvailabilityState, UseAvailabilityActions {
  isStale: boolean
  isReserved: (barberId: number, date: string, time: string) => boolean
}

const DEFAULT_OPTIONS: Required<UseAvailabilityOptions> = {
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds
  staleTime: 60000, // 1 minute
  retryOnError: true,
  maxRetries: 3,
  onError: () => {},
  onConflict: () => {},
  enableOptimisticUpdates: true,
}

/**
 * Main hook for availability management
 */
export function useAvailability(
  request: AvailabilityRequest | null,
  options: UseAvailabilityOptions = {}
): UseAvailabilityReturn {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const requestIdRef = useRef<string>()
  const refreshIntervalRef = useRef<NodeJS.Timeout>()
  const retryCountRef = useRef(0)

  const [state, setState] = useState<UseAvailabilityState>({
    availability: null,
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastUpdated: null,
    dataAge: 0,
    conflicts: [],
    recommendations: [],
  })

  // Generate unique request ID for slot reservations
  const generateRequestId = useCallback(() => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Check if data is stale
  const isStale = useCallback(() => {
    if (!state.lastUpdated) return true
    return Date.now() - state.lastUpdated.getTime() > opts.staleTime
  }, [state.lastUpdated, opts.staleTime])

  // Clear any existing refresh interval
  const clearRefreshInterval = useCallback(() => {
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = undefined
    }
  }, [])

  // Fetch availability data
  const fetchAvailability = useCallback(async (isRefresh = false) => {
    if (!request) return

    try {
      setState(prev => ({
        ...prev,
        isLoading: !isRefresh,
        isRefreshing: isRefresh,
        error: null,
      }))

      const availability = await availabilityService.getAvailability(request)

      setState(prev => ({
        ...prev,
        availability,
        isLoading: false,
        isRefreshing: false,
        lastUpdated: new Date(),
        dataAge: 0,
        recommendations: availability.recommendations,
      }))

      retryCountRef.current = 0
    } catch (error) {
      const appError = await errorManager.handleError(error, {
        operation: 'fetchAvailability',
        request,
      })

      setState(prev => ({
        ...prev,
        isLoading: false,
        isRefreshing: false,
        error: appError,
      }))

      opts.onError(appError)

      // Retry logic
      if (opts.retryOnError && retryCountRef.current < opts.maxRetries) {
        retryCountRef.current++
        setTimeout(() => fetchAvailability(isRefresh), 1000 * retryCountRef.current)
      }
    }
  }, [request, opts])

  // Refresh availability
  const refreshAvailability = useCallback(async () => {
    await fetchAvailability(true)
  }, [fetchAvailability])

  // Check for scheduling conflicts
  const checkConflicts = useCallback(async (context: ConflictContext): Promise<SchedulingConflict[]> => {
    try {
      const conflicts = await conflictResolver.analyzeConflicts(context)

      setState(prev => ({
        ...prev,
        conflicts,
      }))

      if (conflicts.length > 0) {
        opts.onConflict(conflicts)
      }

      return conflicts
    } catch (error) {
      const appError = await errorManager.handleError(error, {
        operation: 'checkConflicts',
        context,
      })

      setState(prev => ({
        ...prev,
        error: appError,
      }))

      opts.onError(appError)
      return []
    }
  }, [opts])

  // Get alternative suggestions
  const getAlternatives = useCallback(async (altRequest: AvailabilityRequest): Promise<SlotRecommendation[]> => {
    try {
      const alternatives = await availabilityService.getAlternativeSuggestions(altRequest)

      setState(prev => ({
        ...prev,
        recommendations: alternatives,
      }))

      return alternatives
    } catch (error) {
      const appError = await errorManager.handleError(error, {
        operation: 'getAlternatives',
        request: altRequest,
      })

      setState(prev => ({
        ...prev,
        error: appError,
      }))

      opts.onError(appError)
      return []
    }
  }, [opts])

  // Reserve a slot
  const reserveSlot = useCallback(async (
    barberId: number,
    date: string,
    time: string,
    duration: number
  ): Promise<boolean> => {
    if (!requestIdRef.current) {
      requestIdRef.current = generateRequestId()
    }

    try {
      const reserved = await availabilityService.reserveSlot(
        barberId,
        date,
        time,
        duration,
        requestIdRef.current
      )

      if (reserved && opts.enableOptimisticUpdates) {
        // Optimistically update the UI
        setState(prev => {
          if (!prev.availability) return prev

          const updatedSlots = prev.availability.slots.map(slot => {
            if (slot.barberId === barberId && slot.time === time) {
              return { ...slot, available: false, conflictReason: 'Reserved' }
            }
            return slot
          })

          return {
            ...prev,
            availability: {
              ...prev.availability,
              slots: updatedSlots,
              availableSlots: updatedSlots.filter(slot => slot.available).length,
              busySlots: updatedSlots.filter(slot => !slot.available).length,
            }
          }
        })
      }

      return reserved
    } catch (error) {
      const appError = await errorManager.handleError(error, {
        operation: 'reserveSlot',
        barberId,
        date,
        time,
      })

      setState(prev => ({
        ...prev,
        error: appError,
      }))

      opts.onError(appError)
      return false
    }
  }, [generateRequestId, opts])

  // Release a reserved slot
  const releaseSlot = useCallback((barberId: number, date: string, time: string) => {
    if (requestIdRef.current) {
      availabilityService.releaseSlot(barberId, date, time, requestIdRef.current)

      if (opts.enableOptimisticUpdates) {
        // Optimistically update the UI
        setState(prev => {
          if (!prev.availability) return prev

          const updatedSlots = prev.availability.slots.map(slot => {
            if (slot.barberId === barberId && slot.time === time && slot.conflictReason === 'Reserved') {
              return { ...slot, available: true, conflictReason: undefined }
            }
            return slot
          })

          return {
            ...prev,
            availability: {
              ...prev.availability,
              slots: updatedSlots,
              availableSlots: updatedSlots.filter(slot => slot.available).length,
              busySlots: updatedSlots.filter(slot => !slot.available).length,
            }
          }
        })
      }

      // Refresh availability to get real state
      setTimeout(() => refreshAvailability(), 1000)
    }
  }, [opts, refreshAvailability])

  // Check if a slot is reserved by this instance
  const isReserved = useCallback((barberId: number, date: string, time: string): boolean => {
    if (!state.availability) return false

    const slot = state.availability.slots.find(
      s => s.barberId === barberId && s.time === time
    )

    return slot?.conflictReason === 'Reserved' && !slot.available
  }, [state.availability])

  // Invalidate cache
  const invalidateCache = useCallback((barberId?: number, date?: string) => {
    availabilityService.invalidateAvailabilityCache(barberId, date)
    refreshAvailability()
  }, [refreshAvailability])

  // Clear error
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }))
  }, [])

  // Update data age
  useEffect(() => {
    if (!state.lastUpdated) return

    const interval = setInterval(() => {
      setState(prev => ({
        ...prev,
        dataAge: Date.now() - (prev.lastUpdated?.getTime() || 0),
      }))
    }, 1000)

    return () => clearInterval(interval)
  }, [state.lastUpdated])

  // Initial fetch
  useEffect(() => {
    if (request) {
      fetchAvailability()
    }
  }, [request, fetchAvailability])

  // Auto-refresh setup
  useEffect(() => {
    if (opts.autoRefresh && request) {
      clearRefreshInterval()

      refreshIntervalRef.current = setInterval(() => {
        if (isStale()) {
          fetchAvailability(true)
        }
      }, opts.refreshInterval)
    }

    return clearRefreshInterval
  }, [opts.autoRefresh, opts.refreshInterval, request, isStale, fetchAvailability, clearRefreshInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearRefreshInterval()

      // Release any reserved slots
      if (requestIdRef.current && state.availability) {
        state.availability.slots.forEach(slot => {
          if (slot.conflictReason === 'Reserved') {
            availabilityService.releaseSlot(
              slot.barberId,
              state.availability!.date,
              slot.time,
              requestIdRef.current!
            )
          }
        })
      }
    }
  }, [clearRefreshInterval, state.availability])

  return {
    ...state,
    isStale: isStale(),
    refreshAvailability,
    checkConflicts,
    getAlternatives,
    reserveSlot,
    releaseSlot,
    isReserved,
    invalidateCache,
    clearError,
  }
}

/**
 * Specialized hook for conflict detection
 */
export function useConflictDetection(
  context: ConflictContext | null,
  options: Pick<UseAvailabilityOptions, 'onConflict' | 'onError'> = {}
) {
  const [conflicts, setConflicts] = useState<SchedulingConflict[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const [error, setError] = useState<AppError | null>(null)

  const checkConflicts = useCallback(async () => {
    if (!context) return []

    setIsChecking(true)
    setError(null)

    try {
      const detectedConflicts = await conflictResolver.analyzeConflicts(context)
      setConflicts(detectedConflicts)

      if (detectedConflicts.length > 0 && options.onConflict) {
        options.onConflict(detectedConflicts)
      }

      return detectedConflicts
    } catch (err) {
      const appError = await errorManager.handleError(err, {
        operation: 'useConflictDetection',
        context,
      })

      setError(appError)

      if (options.onError) {
        options.onError(appError)
      }

      return []
    } finally {
      setIsChecking(false)
    }
  }, [context, options])

  // Auto-check when context changes
  useEffect(() => {
    if (context) {
      checkConflicts()
    }
  }, [context, checkConflicts])

  return {
    conflicts,
    isChecking,
    error,
    checkConflicts,
    hasConflicts: conflicts.length > 0,
    criticalConflicts: conflicts.filter(c => c.severity === 'critical'),
    clearError: () => setError(null),
  }
}

/**
 * Hook for managing slot reservations
 */
export function useSlotReservation() {
  const [reservedSlots, setReservedSlots] = useState<Map<string, {
    barberId: number
    date: string
    time: string
    expiresAt: Date
  }>>(new Map())

  const requestIdRef = useRef<string>()

  const generateRequestId = useCallback(() => {
    if (!requestIdRef.current) {
      requestIdRef.current = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    return requestIdRef.current
  }, [])

  const reserveSlot = useCallback(async (
    barberId: number,
    date: string,
    time: string,
    duration: number,
    reservationDuration = 5 * 60 * 1000 // 5 minutes
  ): Promise<boolean> => {
    const requestId = generateRequestId()
    const slotKey = `${barberId}-${date}-${time}`

    try {
      const reserved = await availabilityService.reserveSlot(
        barberId,
        date,
        time,
        duration,
        requestId
      )

      if (reserved) {
        setReservedSlots(prev => new Map(prev.set(slotKey, {
          barberId,
          date,
          time,
          expiresAt: new Date(Date.now() + reservationDuration)
        })))

        // Auto-release after reservation duration
        setTimeout(() => {
          releaseSlot(barberId, date, time)
        }, reservationDuration)
      }

      return reserved
    } catch (error) {
      console.error('Failed to reserve slot:', error)
      return false
    }
  }, [generateRequestId])

  const releaseSlot = useCallback((barberId: number, date: string, time: string) => {
    const slotKey = `${barberId}-${date}-${time}`
    const requestId = requestIdRef.current

    if (requestId) {
      availabilityService.releaseSlot(barberId, date, time, requestId)
    }

    setReservedSlots(prev => {
      const newMap = new Map(prev)
      newMap.delete(slotKey)
      return newMap
    })
  }, [])

  const isSlotReserved = useCallback((barberId: number, date: string, time: string): boolean => {
    const slotKey = `${barberId}-${date}-${time}`
    const reservation = reservedSlots.get(slotKey)

    if (!reservation) return false

    // Check if reservation has expired
    if (reservation.expiresAt <= new Date()) {
      releaseSlot(barberId, date, time)
      return false
    }

    return true
  }, [reservedSlots, releaseSlot])

  const releaseAllSlots = useCallback(() => {
    reservedSlots.forEach(reservation => {
      releaseSlot(reservation.barberId, reservation.date, reservation.time)
    })
  }, [reservedSlots, releaseSlot])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      releaseAllSlots()
    }
  }, [releaseAllSlots])

  return {
    reserveSlot,
    releaseSlot,
    isSlotReserved,
    releaseAllSlots,
    reservedSlots: Array.from(reservedSlots.values()),
  }
}
