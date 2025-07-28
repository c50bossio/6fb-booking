/**
 * Mobile Booking Hook
 * React hook for mobile-optimized booking flows
 * Version: 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { getMobileBookingWidget, MobileBookingConfig, BookingStep, MobileBookingState } from '@/lib/mobile-booking-widgets'
import type MobileBookingWidgetSystem from '@/lib/mobile-booking-widgets'

interface UseMobileBookingOptions {
  config?: Partial<MobileBookingConfig>
  customSteps?: BookingStep[]
  autoInit?: boolean
  persistState?: boolean
}

interface UseMobileBookingReturn {
  // State
  currentStep: number
  totalSteps: number
  steps: BookingStep[]
  state: MobileBookingState
  isLoading: boolean
  errors: Record<string, string>
  canGoNext: boolean
  canGoPrevious: boolean
  
  // Actions
  nextStep: () => Promise<boolean>
  previousStep: () => Promise<boolean>
  goToStep: (stepIndex: number) => Promise<boolean>
  updateFormData: (stepId: string, data: Record<string, any>) => void
  getFormData: (stepId?: string) => any
  quickBook: (serviceId: string, preferences?: Record<string, any>) => Promise<boolean>
  completeBooking: () => Promise<boolean>
  reset: () => void
  
  // Utilities
  getCurrentStep: () => BookingStep
  validateCurrentStep: () => Promise<boolean>
  exportData: () => any
  
  // Widget instance
  widget: MobileBookingWidgetSystem | null
}

/**
 * Hook for mobile booking workflow
 */
export function useMobileBooking(options: UseMobileBookingOptions = {}): UseMobileBookingReturn {
  const {
    config,
    customSteps,
    autoInit = true,
    persistState = true
  } = options

  const [widget, setWidget] = useState<MobileBookingWidgetSystem | null>(null)
  const [state, setState] = useState<MobileBookingState>({
    currentStep: 0,
    totalSteps: 0,
    isLoading: false,
    canGoNext: false,
    canGoPrevious: false,
    formData: {},
    errors: {},
    touchPosition: null,
    swipeDirection: null,
    isValidating: false
  })
  const [steps, setSteps] = useState<BookingStep[]>([])
  
  const stateRef = useRef(state)
  stateRef.current = state

  // Initialize widget
  useEffect(() => {
    if (!autoInit) return

    const bookingWidget = getMobileBookingWidget(config, customSteps)
    setWidget(bookingWidget)

    // Load persisted state if enabled
    if (persistState) {
      loadPersistedState(bookingWidget)
    }

    // Setup event listeners
    const handleStateUpdate = (newState: MobileBookingState) => {
      setState(newState)
      
      // Persist state if enabled
      if (persistState) {
        persistBookingState(newState, bookingWidget.getFormData())
      }
    }

    const handleStepChange = (data: { step: number; direction: string }) => {
      // Trigger any step change effects
      console.log(`Step changed to ${data.step} (${data.direction})`)
    }

    const handleFormUpdate = (data: { stepId: string; data: any; formData: any }) => {
      // Persist form data if enabled
      if (persistState) {
        persistBookingState(stateRef.current, data.formData)
      }
    }

    const handleBookingComplete = (data: { formData: any }) => {
      // Clear persisted state on completion
      if (persistState) {
        clearPersistedState()
      }
    }

    bookingWidget.on('state:updated', handleStateUpdate)
    bookingWidget.on('step:changed', handleStepChange)
    bookingWidget.on('form:updated', handleFormUpdate)
    bookingWidget.on('booking:completed', handleBookingComplete)

    // Initial state sync
    setState(bookingWidget.getState())
    setSteps(bookingWidget.getSteps())

    return () => {
      bookingWidget.off('state:updated', handleStateUpdate)
      bookingWidget.off('step:changed', handleStepChange)
      bookingWidget.off('form:updated', handleFormUpdate)
      bookingWidget.off('booking:completed', handleBookingComplete)
    }
  }, [autoInit, config, customSteps, persistState])

  // Load persisted state from localStorage
  const loadPersistedState = useCallback((widget: MobileBookingWidgetSystem) => {
    try {
      const persistedData = localStorage.getItem('mobile_booking_state')
      if (persistedData) {
        const { state: savedState, formData } = JSON.parse(persistedData)
        
        // Restore form data
        Object.keys(formData).forEach(stepId => {
          widget.updateFormData(stepId, formData[stepId])
        })

        // Restore current step if valid
        if (savedState.currentStep >= 0 && savedState.currentStep < widget.getSteps().length) {
          widget.goToStep(savedState.currentStep)
        }
      }
    } catch (error) {
      console.error('Failed to load persisted booking state:', error)
    }
  }, [])

  // Persist booking state to localStorage
  const persistBookingState = useCallback((state: MobileBookingState, formData: any) => {
    try {
      const dataToSave = {
        state: {
          currentStep: state.currentStep,
          formData: state.formData
        },
        formData,
        timestamp: Date.now()
      }
      localStorage.setItem('mobile_booking_state', JSON.stringify(dataToSave))
    } catch (error) {
      console.error('Failed to persist booking state:', error)
    }
  }, [])

  // Clear persisted state
  const clearPersistedState = useCallback(() => {
    try {
      localStorage.removeItem('mobile_booking_state')
    } catch (error) {
      console.error('Failed to clear persisted state:', error)
    }
  }, [])

  // Navigation actions
  const nextStep = useCallback(async (): Promise<boolean> => {
    if (!widget) return false
    return await widget.nextStep()
  }, [widget])

  const previousStep = useCallback(async (): Promise<boolean> => {
    if (!widget) return false
    return await widget.previousStep()
  }, [widget])

  const goToStep = useCallback(async (stepIndex: number): Promise<boolean> => {
    if (!widget) return false
    return await widget.goToStep(stepIndex)
  }, [widget])

  // Form data management
  const updateFormData = useCallback((stepId: string, data: Record<string, any>) => {
    if (!widget) return
    widget.updateFormData(stepId, data)
  }, [widget])

  const getFormData = useCallback((stepId?: string) => {
    if (!widget) return {}
    return widget.getFormData(stepId)
  }, [widget])

  // Booking actions
  const quickBook = useCallback(async (serviceId: string, preferences?: Record<string, any>): Promise<boolean> => {
    if (!widget) return false
    return await widget.quickBook(serviceId, preferences)
  }, [widget])

  const completeBooking = useCallback(async (): Promise<boolean> => {
    if (!widget) return false
    return await widget.completeBooking()
  }, [widget])

  const reset = useCallback(() => {
    if (!widget) return
    widget.reset()
    if (persistState) {
      clearPersistedState()
    }
  }, [widget, persistState, clearPersistedState])

  // Utility functions
  const getCurrentStep = useCallback((): BookingStep | null => {
    if (!widget) return null
    return widget.getCurrentStep()
  }, [widget])

  const validateCurrentStep = useCallback(async (): Promise<boolean> => {
    if (!widget) return false
    return await widget.validateStep(state.currentStep)
  }, [widget, state.currentStep])

  const exportData = useCallback(() => {
    if (!widget) return null
    return widget.exportBookingData()
  }, [widget])

  return {
    // State
    currentStep: state.currentStep,
    totalSteps: state.totalSteps,
    steps,
    state,
    isLoading: state.isLoading,
    errors: state.errors,
    canGoNext: state.canGoNext,
    canGoPrevious: state.canGoPrevious,

    // Actions
    nextStep,
    previousStep,
    goToStep,
    updateFormData,
    getFormData,
    quickBook,
    completeBooking,
    reset,

    // Utilities
    getCurrentStep,
    validateCurrentStep,
    exportData,

    // Widget instance
    widget
  }
}

/**
 * Hook for step-specific mobile booking functionality
 */
export function useMobileBookingStep(stepId: string) {
  const booking = useMobileBooking()
  const currentStepId = booking.getCurrentStep()?.id

  const isCurrentStep = currentStepId === stepId
  const isCompleted = booking.steps.find(s => s.id === stepId)?.completed || false
  const stepData = booking.getFormData(stepId)
  const stepErrors = Object.keys(booking.errors)
    .filter(key => key.startsWith(`${stepId}.`))
    .reduce((acc, key) => {
      acc[key.replace(`${stepId}.`, '')] = booking.errors[key]
      return acc
    }, {} as Record<string, string>)

  const updateData = useCallback((data: Record<string, any>) => {
    booking.updateFormData(stepId, data)
  }, [booking, stepId])

  const goToThisStep = useCallback(() => {
    const stepIndex = booking.steps.findIndex(s => s.id === stepId)
    if (stepIndex >= 0) {
      return booking.goToStep(stepIndex)
    }
    return Promise.resolve(false)
  }, [booking, stepId])

  return {
    isCurrentStep,
    isCompleted,
    stepData,
    stepErrors,
    updateData,
    goToThisStep,
    ...booking
  }
}

/**
 * Hook for mobile booking progress tracking
 */
export function useMobileBookingProgress() {
  const booking = useMobileBooking()

  const progress = {
    current: booking.currentStep + 1,
    total: booking.totalSteps,
    percentage: Math.round(((booking.currentStep + 1) / booking.totalSteps) * 100),
    completed: booking.steps.filter(s => s.completed).length,
    remaining: booking.steps.filter(s => !s.completed).length
  }

  const getStepStatus = useCallback((stepIndex: number) => {
    if (stepIndex < booking.currentStep) return 'completed'
    if (stepIndex === booking.currentStep) return 'current'
    return 'pending'
  }, [booking.currentStep])

  const isStepAccessible = useCallback((stepIndex: number) => {
    // Can access current step and previous completed steps
    if (stepIndex <= booking.currentStep) return true
    
    // Check if all required previous steps are completed
    for (let i = 0; i < stepIndex; i++) {
      const step = booking.steps[i]
      if (step.required && !step.completed) {
        return false
      }
    }
    
    return true
  }, [booking.steps, booking.currentStep])

  return {
    progress,
    getStepStatus,
    isStepAccessible,
    ...booking
  }
}

/**
 * Hook for mobile booking gestures and touch interactions
 */
export function useMobileBookingGestures() {
  const booking = useMobileBooking()
  const [gestureState, setGestureState] = useState({
    isSwipeEnabled: true,
    swipeThreshold: 50,
    lastSwipeDirection: null as string | null
  })

  useEffect(() => {
    if (!booking.widget) return

    const handleSwipe = (direction: string) => {
      setGestureState(prev => ({ ...prev, lastSwipeDirection: direction }))
      
      // Clear after animation
      setTimeout(() => {
        setGestureState(prev => ({ ...prev, lastSwipeDirection: null }))
      }, 300)
    }

    booking.widget.on('swipe:up', () => handleSwipe('up'))
    booking.widget.on('swipe:down', () => handleSwipe('down'))
    booking.widget.on('swipe:left', () => handleSwipe('left'))
    booking.widget.on('swipe:right', () => handleSwipe('right'))

    return () => {
      if (booking.widget) {
        booking.widget.off('swipe:up', () => handleSwipe('up'))
        booking.widget.off('swipe:down', () => handleSwipe('down'))
        booking.widget.off('swipe:left', () => handleSwipe('left'))
        booking.widget.off('swipe:right', () => handleSwipe('right'))
      }
    }
  }, [booking.widget])

  const enableSwipe = useCallback(() => {
    setGestureState(prev => ({ ...prev, isSwipeEnabled: true }))
  }, [])

  const disableSwipe = useCallback(() => {
    setGestureState(prev => ({ ...prev, isSwipeEnabled: false }))
  }, [])

  return {
    gestureState,
    enableSwipe,
    disableSwipe,
    ...booking
  }
}

export default useMobileBooking