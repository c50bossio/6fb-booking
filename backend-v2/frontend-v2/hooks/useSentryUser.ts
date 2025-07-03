import { useEffect, useCallback } from 'react'
import { 
  setUserContext, 
  clearUserContext, 
  addUserActionBreadcrumb,
  initializeSentryContext,
  UserContext 
} from '../lib/sentry'

/**
 * Hook for managing Sentry user context and session tracking
 */
export function useSentryUser() {
  // Set user context in Sentry
  const setUser = useCallback((user: UserContext) => {
    setUserContext(user)
    
    addUserActionBreadcrumb(
      'User context set',
      'interaction',
      {
        userId: user.id,
        role: user.role,
        businessId: user.businessId,
        subscriptionTier: user.subscriptionTier,
      }
    )
  }, [])

  // Clear user context (e.g., on logout)
  const clearUser = useCallback(() => {
    addUserActionBreadcrumb(
      'User context cleared',
      'interaction',
      {}
    )
    
    clearUserContext()
  }, [])

  // Track user action with context
  const trackUserAction = useCallback((
    action: string,
    category: 'navigation' | 'interaction' | 'form' | 'booking' | 'payment',
    data?: Record<string, any>
  ) => {
    addUserActionBreadcrumb(action, category, data)
  }, [])

  // Initialize browser context
  const initializeBrowserContext = useCallback(() => {
    if (typeof window !== 'undefined') {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      }

      initializeSentryContext({
        userAgent: navigator.userAgent,
        viewport,
      })

      addUserActionBreadcrumb(
        'Browser context initialized',
        'interaction',
        {
          viewport,
          userAgent: navigator.userAgent,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled,
          onLine: navigator.onLine,
        }
      )
    }
  }, [])

  // Set up session tracking
  useEffect(() => {
    initializeBrowserContext()

    // Track page visibility changes
    const handleVisibilityChange = () => {
      trackUserAction(
        document.hidden ? 'Page became hidden' : 'Page became visible',
        'interaction',
        { hidden: document.hidden }
      )
    }

    // Track network status changes
    const handleOnline = () => {
      trackUserAction('Connection restored', 'interaction', { online: true })
    }

    const handleOffline = () => {
      trackUserAction('Connection lost', 'interaction', { online: false })
    }

    // Track window resize (for responsive design insights)
    const handleResize = () => {
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      }
      
      initializeSentryContext({ viewport })
      
      trackUserAction(
        'Window resized',
        'interaction',
        { viewport }
      )
    }

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('resize', handleResize)
    }
  }, [initializeBrowserContext, trackUserAction])

  return {
    setUser,
    clearUser,
    trackUserAction,
    initializeBrowserContext,
  }
}

/**
 * Hook for tracking form interactions and validation errors
 */
export function useSentryFormTracking(formName: string) {
  const { trackUserAction } = useSentryUser()

  const trackFormStart = useCallback(() => {
    trackUserAction(
      `Form started: ${formName}`,
      'form',
      { formName, action: 'start' }
    )
  }, [formName, trackUserAction])

  const trackFormSubmit = useCallback((success: boolean, data?: Record<string, any>) => {
    trackUserAction(
      `Form ${success ? 'submitted' : 'failed'}: ${formName}`,
      'form',
      { 
        formName, 
        action: 'submit', 
        success,
        ...data 
      }
    )
  }, [formName, trackUserAction])

  const trackFormValidationError = useCallback((fieldName: string, errorMessage: string) => {
    trackUserAction(
      `Form validation error: ${formName}`,
      'form',
      { 
        formName, 
        action: 'validation_error',
        fieldName,
        errorMessage 
      }
    )
  }, [formName, trackUserAction])

  const trackFormFieldFocus = useCallback((fieldName: string) => {
    trackUserAction(
      `Form field focused: ${fieldName}`,
      'form',
      { 
        formName, 
        action: 'field_focus',
        fieldName 
      }
    )
  }, [formName, trackUserAction])

  const trackFormAbandon = useCallback((lastFieldName?: string) => {
    trackUserAction(
      `Form abandoned: ${formName}`,
      'form',
      { 
        formName, 
        action: 'abandon',
        lastFieldName 
      }
    )
  }, [formName, trackUserAction])

  return {
    trackFormStart,
    trackFormSubmit,
    trackFormValidationError,
    trackFormFieldFocus,
    trackFormAbandon,
  }
}

/**
 * Hook for tracking booking-specific user actions
 */
export function useSentryBookingTracking() {
  const { trackUserAction } = useSentryUser()

  const trackServiceSelection = useCallback((serviceId: string, serviceName: string) => {
    trackUserAction(
      'Service selected',
      'booking',
      { serviceId, serviceName }
    )
  }, [trackUserAction])

  const trackBarberSelection = useCallback((barberId: string, barberName: string) => {
    trackUserAction(
      'Barber selected',
      'booking',
      { barberId, barberName }
    )
  }, [trackUserAction])

  const trackTimeSlotSelection = useCallback((timeSlot: string, date: string) => {
    trackUserAction(
      'Time slot selected',
      'booking',
      { timeSlot, date }
    )
  }, [trackUserAction])

  const trackBookingAttempt = useCallback((bookingData: Record<string, any>) => {
    trackUserAction(
      'Booking attempt started',
      'booking',
      { ...bookingData, action: 'attempt' }
    )
  }, [trackUserAction])

  const trackBookingSuccess = useCallback((bookingId: string, bookingData: Record<string, any>) => {
    trackUserAction(
      'Booking completed successfully',
      'booking',
      { bookingId, ...bookingData, action: 'success' }
    )
  }, [trackUserAction])

  const trackBookingError = useCallback((error: string, bookingData: Record<string, any>) => {
    trackUserAction(
      'Booking failed',
      'booking',
      { error, ...bookingData, action: 'error' }
    )
  }, [trackUserAction])

  return {
    trackServiceSelection,
    trackBarberSelection,
    trackTimeSlotSelection,
    trackBookingAttempt,
    trackBookingSuccess,
    trackBookingError,
  }
}

/**
 * Hook for tracking payment-specific user actions
 */
export function useSentryPaymentTracking() {
  const { trackUserAction } = useSentryUser()

  const trackPaymentMethodSelection = useCallback((method: string) => {
    trackUserAction(
      'Payment method selected',
      'payment',
      { method }
    )
  }, [trackUserAction])

  const trackPaymentAttempt = useCallback((amount: number, currency: string) => {
    trackUserAction(
      'Payment attempt started',
      'payment',
      { amount, currency, action: 'attempt' }
    )
  }, [trackUserAction])

  const trackPaymentSuccess = useCallback((
    paymentIntentId: string, 
    amount: number, 
    currency: string
  ) => {
    trackUserAction(
      'Payment completed successfully',
      'payment',
      { paymentIntentId, amount, currency, action: 'success' }
    )
  }, [trackUserAction])

  const trackPaymentError = useCallback((
    error: string, 
    amount: number, 
    currency: string
  ) => {
    trackUserAction(
      'Payment failed',
      'payment',
      { error, amount, currency, action: 'error' }
    )
  }, [trackUserAction])

  const trackPaymentRefund = useCallback((
    paymentIntentId: string, 
    refundAmount: number
  ) => {
    trackUserAction(
      'Payment refund processed',
      'payment',
      { paymentIntentId, refundAmount, action: 'refund' }
    )
  }, [trackUserAction])

  return {
    trackPaymentMethodSelection,
    trackPaymentAttempt,
    trackPaymentSuccess,
    trackPaymentError,
    trackPaymentRefund,
  }
}