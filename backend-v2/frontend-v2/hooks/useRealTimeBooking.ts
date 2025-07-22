/**
 * Real-time booking hook for mobile-first experience
 * Handles optimistic updates, conflict resolution, and booking flow
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { realTimeAvailabilityAPI, type AvailabilitySlot, type BookingRequest, type QuickRebookOption } from '@/lib/api/realtime-availability'

export interface BookingState {
  step: 'selecting' | 'confirming' | 'booking' | 'success' | 'error'
  selectedSlot: AvailabilitySlot | null
  isLoading: boolean
  error: string | null
  confirmationNumber?: string
  appointmentId?: number
}

export interface OptimisticUpdate {
  slotKey: string
  originalAvailable: boolean
  timestamp: number
}

export interface BookingOptions {
  enableOptimisticUpdates?: boolean
  conflictRetryAttempts?: number
  showSuccessFeedback?: boolean
  autoSelectSimilarSlots?: boolean
}

export function useRealTimeBooking(options: BookingOptions = {}) {
  const {
    enableOptimisticUpdates = true,
    conflictRetryAttempts = 2,
    showSuccessFeedback = true,
    autoSelectSimilarSlots = true
  } = options

  const [bookingState, setBookingState] = useState<BookingState>({
    step: 'selecting',
    selectedSlot: null,
    isLoading: false,
    error: null
  })

  const optimisticUpdates = useRef<Map<string, OptimisticUpdate>>(new Map())
  const retryAttempts = useRef<number>(0)

  // Optimistic update management
  const applyOptimisticUpdate = useCallback((slot: AvailabilitySlot) => {
    if (!enableOptimisticUpdates) return

    const slotKey = `${slot.barber_id}-${slot.time}`
    optimisticUpdates.current.set(slotKey, {
      slotKey,
      originalAvailable: slot.available,
      timestamp: Date.now()
    })

    // Visually mark slot as unavailable immediately
    slot.available = false
  }, [enableOptimisticUpdates])

  const revertOptimisticUpdate = useCallback((slot: AvailabilitySlot) => {
    if (!enableOptimisticUpdates) return

    const slotKey = `${slot.barber_id}-${slot.time}`
    const update = optimisticUpdates.current.get(slotKey)
    
    if (update) {
      slot.available = update.originalAvailable
      optimisticUpdates.current.delete(slotKey)
    }
  }, [enableOptimisticUpdates])

  const clearOptimisticUpdates = useCallback(() => {
    optimisticUpdates.current.clear()
  }, [])

  // Slot selection with real-time validation
  const selectSlot = useCallback(async (slot: AvailabilitySlot) => {
    try {
      setBookingState(prev => ({
        ...prev,
        selectedSlot: slot,
        step: 'confirming',
        error: null
      }))

      // Apply optimistic update
      applyOptimisticUpdate(slot)

      // Validate slot is still available in real-time
      const isStillAvailable = await realTimeAvailabilityAPI.checkSlotAvailability(
        slot.barber_id,
        new Date(slot.time),
        slot.duration
      )

      if (!isStillAvailable) {
        revertOptimisticUpdate(slot)
        
        if (autoSelectSimilarSlots) {
          // Try to find similar available slot
          const similarSlot = await findSimilarAvailableSlot(slot)
          if (similarSlot) {
            setBookingState(prev => ({
              ...prev,
              selectedSlot: similarSlot,
              error: 'Original slot unavailable. Similar slot selected.'
            }))
            return
          }
        }

        setBookingState(prev => ({
          ...prev,
          selectedSlot: null,
          step: 'selecting',
          error: 'This slot is no longer available. Please select another time.'
        }))
      }
    } catch (error) {
      revertOptimisticUpdate(slot)
      setBookingState(prev => ({
        ...prev,
        error: 'Failed to validate slot availability',
        step: 'selecting'
      }))
    }
  }, [applyOptimisticUpdate, revertOptimisticUpdate, autoSelectSimilarSlots])

  // Book selected slot
  const confirmBooking = useCallback(async (bookingDetails?: Partial<BookingRequest>) => {
    if (!bookingState.selectedSlot) return

    const slot = bookingState.selectedSlot

    setBookingState(prev => ({
      ...prev,
      step: 'booking',
      isLoading: true,
      error: null
    }))

    try {
      const request: BookingRequest = {
        barber_id: slot.barber_id,
        start_time: slot.time,
        duration: slot.duration,
        service_id: slot.service_id,
        ...bookingDetails
      }

      const result = await realTimeAvailabilityAPI.bookSlot(request)

      if (result.success) {
        setBookingState(prev => ({
          ...prev,
          step: 'success',
          isLoading: false,
          confirmationNumber: result.confirmation_number,
          appointmentId: result.appointment_id
        }))

        // Clear optimistic updates on success
        clearOptimisticUpdates()

        // Show success feedback
        if (showSuccessFeedback && 'vibrate' in navigator) {
          navigator.vibrate([50, 25, 50]) // Success haptic pattern
        }

        retryAttempts.current = 0
      } else {
        throw new Error(result.message || 'Booking failed')
      }
    } catch (error) {
      console.error('Booking failed:', error)
      
      // Revert optimistic update
      revertOptimisticUpdate(slot)

      const errorMessage = error instanceof Error ? error.message : 'Booking failed'
      
      // Handle specific conflict errors with retry
      if (errorMessage.includes('no longer available') && retryAttempts.current < conflictRetryAttempts) {
        retryAttempts.current++
        
        if (autoSelectSimilarSlots) {
          try {
            const similarSlot = await findSimilarAvailableSlot(slot)
            if (similarSlot) {
              setBookingState(prev => ({
                ...prev,
                selectedSlot: similarSlot,
                step: 'confirming',
                error: `Original slot taken. Found similar slot at ${new Date(similarSlot.time).toLocaleTimeString()}`
              }))
              return
            }
          } catch (findError) {
            console.error('Failed to find similar slot:', findError)
          }
        }
      }

      setBookingState(prev => ({
        ...prev,
        step: 'error',
        isLoading: false,
        error: errorMessage
      }))

      // Error haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]) // Error haptic pattern
      }
    }
  }, [bookingState.selectedSlot, revertOptimisticUpdate, clearOptimisticUpdates, showSuccessFeedback, conflictRetryAttempts, autoSelectSimilarSlots])

  // Quick rebook functionality
  const quickRebook = useCallback(async (rebookOption: QuickRebookOption, selectedSlot: AvailabilitySlot) => {
    setBookingState(prev => ({
      ...prev,
      step: 'booking',
      isLoading: true,
      error: null,
      selectedSlot
    }))

    try {
      const result = await realTimeAvailabilityAPI.quickRebook(rebookOption.appointment_id, selectedSlot)

      if (result.success) {
        setBookingState(prev => ({
          ...prev,
          step: 'success',
          isLoading: false,
          confirmationNumber: result.confirmation_number,
          appointmentId: result.appointment_id
        }))

        // Success feedback
        if (showSuccessFeedback && 'vibrate' in navigator) {
          navigator.vibrate([50, 25, 50, 25, 50]) // Enhanced success for rebook
        }
      } else {
        throw new Error(result.message || 'Quick rebook failed')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Quick rebook failed'
      
      setBookingState(prev => ({
        ...prev,
        step: 'error',
        isLoading: false,
        error: errorMessage
      }))

      // Error feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100, 50, 100])
      }
    }
  }, [showSuccessFeedback])

  // Cancel booking flow
  const cancelBooking = useCallback(() => {
    if (bookingState.selectedSlot) {
      revertOptimisticUpdate(bookingState.selectedSlot)
    }
    
    setBookingState({
      step: 'selecting',
      selectedSlot: null,
      isLoading: false,
      error: null
    })
    
    retryAttempts.current = 0
  }, [bookingState.selectedSlot, revertOptimisticUpdate])

  // Reset to initial state
  const resetBooking = useCallback(() => {
    clearOptimisticUpdates()
    setBookingState({
      step: 'selecting',
      selectedSlot: null,
      isLoading: false,
      error: null
    })
    retryAttempts.current = 0
  }, [clearOptimisticUpdates])

  // Find similar available slot (helper function)
  const findSimilarAvailableSlot = useCallback(async (originalSlot: AvailabilitySlot): Promise<AvailabilitySlot | null> => {
    try {
      const originalDate = new Date(originalSlot.time)
      const availability = await realTimeAvailabilityAPI.getAvailability(originalDate, {
        barber_id: originalSlot.barber_id,
        service_id: originalSlot.service_id,
        duration: originalSlot.duration,
        auto_refresh: false
      })

      // Find slots within 2 hours of original time
      const originalTime = originalDate.getTime()
      const twoHours = 2 * 60 * 60 * 1000

      const similarSlots = availability.slots.filter(slot => {
        if (!slot.available || slot.barber_id !== originalSlot.barber_id) return false
        
        const slotTime = new Date(slot.time).getTime()
        const timeDiff = Math.abs(slotTime - originalTime)
        
        return timeDiff <= twoHours
      })

      // Sort by proximity to original time
      similarSlots.sort((a, b) => {
        const aTime = new Date(a.time).getTime()
        const bTime = new Date(b.time).getTime()
        const aDiff = Math.abs(aTime - originalTime)
        const bDiff = Math.abs(bTime - originalTime)
        return aDiff - bDiff
      })

      return similarSlots[0] || null
    } catch (error) {
      console.error('Failed to find similar slot:', error)
      return null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearOptimisticUpdates()
    }
  }, [clearOptimisticUpdates])

  return {
    // State
    bookingState,
    isOptimisticUpdate: (slot: AvailabilitySlot) => {
      const slotKey = `${slot.barber_id}-${slot.time}`
      return optimisticUpdates.current.has(slotKey)
    },

    // Actions
    selectSlot,
    confirmBooking,
    quickRebook,
    cancelBooking,
    resetBooking,

    // Utilities
    canBook: bookingState.step === 'confirming' && !bookingState.isLoading,
    isBooking: bookingState.step === 'booking' && bookingState.isLoading,
    isSuccess: bookingState.step === 'success',
    hasError: bookingState.step === 'error',
    
    // Retry info
    remainingRetries: Math.max(0, conflictRetryAttempts - retryAttempts.current)
  }
}

export default useRealTimeBooking