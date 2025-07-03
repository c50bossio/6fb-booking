'use client'

import { useCallback } from 'react'
import { useGA4BusinessTracking } from '@/components/providers/GA4Provider'

/**
 * Enhanced GA4 tracking hook with simplified interfaces for common use cases
 */
export function useGA4Tracking() {
  const {
    trackAppointmentEvent,
    trackPaymentEvent,
    trackUserEvent,
    trackBusinessEvent,
    setUserProperties,
    hasConsent,
    canTrack,
    debugInfo
  } = useGA4BusinessTracking()

  // Simplified appointment tracking
  const appointment = {
    booked: useCallback((
      appointmentId: string,
      options: {
        barberId?: string
        serviceName?: string
        price?: number
        duration?: number
        userRole?: string
        locationId?: string
      } = {}
    ) => trackAppointmentEvent('booked', appointmentId, {
      barberId: options.barberId,
      serviceName: options.serviceName,
      price: options.price,
      durationMinutes: options.duration,
      userRole: options.userRole,
      locationId: options.locationId
    }), [trackAppointmentEvent]),

    confirmed: useCallback((
      appointmentId: string,
      barberId?: string,
      userRole?: string,
      locationId?: string
    ) => trackAppointmentEvent('confirmed', appointmentId, {
      barberId,
      userRole,
      locationId
    }), [trackAppointmentEvent]),

    completed: useCallback((
      appointmentId: string,
      options: {
        barberId?: string
        serviceName?: string
        actualDuration?: number
        customerRating?: number
        userRole?: string
        locationId?: string
      } = {}
    ) => trackAppointmentEvent('completed', appointmentId, {
      barberId: options.barberId,
      serviceName: options.serviceName,
      actualDuration: options.actualDuration,
      customerRating: options.customerRating,
      userRole: options.userRole,
      locationId: options.locationId
    }), [trackAppointmentEvent]),

    cancelled: useCallback((
      appointmentId: string,
      reason?: string,
      barberId?: string,
      userRole?: string
    ) => trackBusinessEvent('appointment_cancelled', {
      appointmentId,
      cancellationReason: reason,
      barberId,
      userRole
    }), [trackBusinessEvent])
  }

  // Simplified payment tracking
  const payment = {
    started: useCallback((
      transactionId: string,
      amount: number,
      options: {
        method?: string
        appointmentId?: string
        currency?: string
        userRole?: string
      } = {}
    ) => trackPaymentEvent('initiated', transactionId, amount, {
      paymentMethod: options.method,
      appointmentId: options.appointmentId,
      currency: options.currency || 'USD',
      userRole: options.userRole
    }), [trackPaymentEvent]),

    completed: useCallback((
      transactionId: string,
      amount: number,
      options: {
        method?: string
        appointmentId?: string
        barberId?: string
        serviceName?: string
        currency?: string
        userRole?: string
      } = {}
    ) => trackPaymentEvent('completed', transactionId, amount, {
      paymentMethod: options.method,
      appointmentId: options.appointmentId,
      barberId: options.barberId,
      serviceName: options.serviceName,
      currency: options.currency || 'USD',
      userRole: options.userRole
    }), [trackPaymentEvent]),

    failed: useCallback((
      transactionId: string,
      amount: number,
      error: string,
      options: {
        method?: string
        errorCode?: string
        userRole?: string
      } = {}
    ) => trackPaymentEvent('failed', transactionId, amount, {
      paymentMethod: options.method,
      errorMessage: error,
      errorCode: options.errorCode,
      userRole: options.userRole
    }), [trackPaymentEvent])
  }

  // Simplified user tracking
  const user = {
    registered: useCallback((
      role: string,
      options: {
        method?: string
        source?: string
        locationId?: string
      } = {}
    ) => trackUserEvent('signup', role, {
      method: options.method || 'email',
      referralSource: options.source,
      locationId: options.locationId
    }), [trackUserEvent]),

    loggedIn: useCallback((
      role: string,
      method?: string,
      locationId?: string
    ) => trackUserEvent('login', role, {
      method: method || 'email',
      locationId
    }), [trackUserEvent]),

    setProperties: useCallback((
      userId: string,
      properties: {
        role?: string
        subscriptionTier?: string
        locationId?: string
        barberVerified?: boolean
        [key: string]: any
      }
    ) => setUserProperties(userId, properties), [setUserProperties])
  }

  // Simplified business event tracking
  const business = {
    serviceViewed: useCallback((
      serviceId: string,
      serviceName: string,
      options: {
        barberId?: string
        price?: number
        userRole?: string
        locationId?: string
      } = {}
    ) => trackBusinessEvent('service_viewed', {
      serviceId,
      serviceName,
      barberId: options.barberId,
      price: options.price,
      userRole: options.userRole,
      locationId: options.locationId
    }), [trackBusinessEvent]),

    barberViewed: useCallback((
      barberId: string,
      barberName: string,
      options: {
        locationId?: string
        userRole?: string
        fromSearch?: boolean
      } = {}
    ) => trackBusinessEvent('barber_viewed', {
      barberId,
      barberName,
      locationId: options.locationId,
      userRole: options.userRole
    }), [trackBusinessEvent]),

    availabilityChecked: useCallback((
      barberId: string,
      date: string,
      availableSlots: number,
      userRole?: string
    ) => trackBusinessEvent('availability_checked', {
      barberId,
      dateRequested: date,
      availableSlots,
      userRole
    }), [trackBusinessEvent]),

    searchPerformed: useCallback((
      searchTerm: string,
      resultCount: number,
      filters?: Record<string, any>
    ) => trackBusinessEvent('search', {
      searchTerm,
      resultCount,
      filters: JSON.stringify(filters || {})
    }), [trackBusinessEvent]),

    filterApplied: useCallback((
      filterType: string,
      filterValue: string,
      resultCount?: number
    ) => trackBusinessEvent('filter_applied', {
      filterType,
      filterValue,
      resultCount
    }), [trackBusinessEvent])
  }

  // Enhanced conversion tracking
  const conversion = {
    appointmentBookingStarted: useCallback((
      barberId?: string,
      serviceName?: string,
      userRole?: string
    ) => trackBusinessEvent('booking_flow_started', {
      barberId,
      serviceName,
      userRole,
      step: 'initiated'
    }), [trackBusinessEvent]),

    appointmentBookingCompleted: useCallback((
      appointmentId: string,
      value: number,
      barberId?: string,
      serviceName?: string,
      userRole?: string
    ) => trackBusinessEvent('booking_flow_completed', {
      appointmentId,
      value,
      barberId,
      serviceName,
      userRole,
      step: 'completed'
    }), [trackBusinessEvent]),

    appointmentBookingAbandoned: useCallback((
      step: string,
      barberId?: string,
      serviceName?: string,
      userRole?: string
    ) => trackBusinessEvent('booking_flow_abandoned', {
      barberId,
      serviceName,
      userRole,
      step,
      abandoned: true
    }), [trackBusinessEvent]),

    registrationStarted: useCallback((
      userType: string,
      source?: string
    ) => trackBusinessEvent('registration_started', {
      userType,
      source: source || 'direct',
      step: 'initiated'
    }), [trackBusinessEvent]),

    registrationCompleted: useCallback((
      userType: string,
      userId: string,
      source?: string
    ) => trackBusinessEvent('registration_completed', {
      userType,
      userId,
      source: source || 'direct',
      step: 'completed'
    }), [trackBusinessEvent])
  }

  // Error and performance tracking
  const system = {
    error: useCallback((
      errorType: string,
      errorMessage: string,
      context?: Record<string, any>
    ) => trackBusinessEvent('error_occurred', {
      errorType,
      errorMessage,
      context: JSON.stringify(context || {})
    }), [trackBusinessEvent]),

    performanceIssue: useCallback((
      metricName: string,
      value: number,
      threshold?: number
    ) => trackBusinessEvent('performance_issue', {
      metricName,
      value,
      threshold,
      exceeded: threshold ? value > threshold : undefined
    }), [trackBusinessEvent]),

    featureUsed: useCallback((
      featureName: string,
      userRole?: string,
      context?: Record<string, any>
    ) => trackBusinessEvent('feature_used', {
      featureName,
      userRole,
      context: JSON.stringify(context || {})
    }), [trackBusinessEvent])
  }

  return {
    // Organized tracking methods
    appointment,
    payment,
    user,
    business,
    conversion,
    system,

    // Status and debugging
    hasConsent,
    canTrack,
    debugInfo,

    // Direct access to underlying tracking functions
    trackAppointmentEvent,
    trackPaymentEvent,
    trackUserEvent,
    trackBusinessEvent,
    setUserProperties
  }
}

// Convenience hook for tracking page views
export function useGA4PageTracking() {
  const { trackEvent, hasConsent } = useGA4BusinessTracking()

  const trackPageView = useCallback((
    pageName: string,
    section?: string,
    userRole?: string,
    additionalData?: Record<string, any>
  ) => {
    if (!hasConsent) return

    trackEvent('page_view', {
      page_name: pageName,
      page_section: section,
      user_role: userRole,
      ...additionalData
    })
  }, [trackEvent, hasConsent])

  const trackTimeOnPage = useCallback((
    pageName: string,
    timeSpent: number,
    userRole?: string
  ) => {
    if (!hasConsent) return

    trackEvent('time_on_page', {
      page_name: pageName,
      time_spent_seconds: timeSpent,
      user_role: userRole
    })
  }, [trackEvent, hasConsent])

  const trackScrollDepth = useCallback((
    pageName: string,
    scrollPercentage: number,
    userRole?: string
  ) => {
    if (!hasConsent) return

    trackEvent('scroll_depth', {
      page_name: pageName,
      scroll_percentage: scrollPercentage,
      user_role: userRole
    })
  }, [trackEvent, hasConsent])

  return {
    trackPageView,
    trackTimeOnPage,
    trackScrollDepth,
    hasConsent
  }
}

export default useGA4Tracking