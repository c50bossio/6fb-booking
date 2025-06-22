/**
 * Analytics hook for easy tracking throughout the app
 */

import { useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  trackPageView,
  trackEvent,
  trackBooking,
  trackPayment,
  trackRegistration,
  trackLogin,
  trackBarberOnboarding,
  trackSearch,
  trackEngagement,
  trackError,
  trackPerformance,
  trackConversion,
  trackPurchase,
  setUserProperties,
} from '../lib/analytics'

export const useAnalytics = () => {
  const router = useRouter()

  // Track page views on route changes
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      trackPageView(url)
    }

    // Initial page view
    trackPageView(window.location.pathname)

    // Listen for route changes
    // Note: Next.js 13+ app router doesn't have router events
    // We'll track manually where needed
  }, [])

  // Track page view manually
  const trackPage = useCallback((path: string) => {
    trackPageView(path)
  }, [])

  // Track custom events with simplified interface
  const track = useCallback((eventName: string, properties?: Record<string, any>) => {
    trackEvent(eventName, properties)
  }, [])

  // Booking tracking helpers
  const trackBookingFlow = useCallback({
    start: (data?: any) => trackBooking('start', data),
    complete: (data?: any) => trackBooking('complete', data),
    cancel: (data?: any) => trackBooking('cancel', data),
  }, [])

  // Payment tracking helpers
  const trackPaymentFlow = useCallback({
    start: (data?: any) => trackPayment('start', data),
    success: (data?: any) => trackPayment('success', data),
    failed: (data?: any) => trackPayment('failed', data),
  }, [])

  // User tracking helpers
  const trackUser = useCallback({
    register: (method: 'email' | 'google' | 'facebook', userType: 'client' | 'barber' | 'admin') =>
      trackRegistration(method, userType),
    login: (method: 'email' | 'google' | 'facebook', userType: 'client' | 'barber' | 'admin') =>
      trackLogin(method, userType),
    setProperties: (userId: string, properties: any) => setUserProperties(userId, properties),
  }, [])

  // Barber onboarding tracking
  const trackOnboarding = useCallback({
    start: () => trackBarberOnboarding('start'),
    personalInfo: () => trackBarberOnboarding('personal_info'),
    services: (count: number) => trackBarberOnboarding('services', { services_count: count }),
    availability: () => trackBarberOnboarding('availability'),
    payment: (method: string, connected: boolean) =>
      trackBarberOnboarding('payment', { payment_method: method, stripe_connected: connected }),
    complete: () => trackBarberOnboarding('complete'),
  }, [])

  // Search tracking
  const trackSearchQuery = useCallback((
    term: string,
    type: 'service' | 'barber' | 'location',
    resultsCount?: number
  ) => {
    trackSearch(term, type, resultsCount)
  }, [])

  // Engagement tracking
  const trackEngagementEvent = useCallback((
    action: 'view_service' | 'view_barber' | 'view_reviews' | 'share',
    itemId?: string,
    itemType?: string
  ) => {
    trackEngagement(action, itemId, itemType)
  }, [])

  // Error tracking
  const trackErrorEvent = useCallback((
    error: string | Error,
    type: 'javascript' | 'api' | 'payment' | 'booking',
    code?: string
  ) => {
    const errorMessage = error instanceof Error ? error.message : error
    trackError(errorMessage, type, code)
  }, [])

  // Performance tracking
  const trackPerformanceMetric = useCallback((
    metric: 'page_load' | 'api_response' | 'payment_process',
    value: number,
    unit: 'ms' | 'seconds' = 'ms'
  ) => {
    trackPerformance(metric, value, unit)
  }, [])

  // Conversion tracking
  const trackConversionEvent = useCallback((
    type: 'booking_completed' | 'payment_successful' | 'user_registered',
    value?: number
  ) => {
    trackConversion(type, value)
  }, [])

  // Purchase tracking for completed bookings
  const trackBookingPurchase = useCallback((
    transactionId: string,
    appointmentData: {
      service_name: string
      service_id: string
      barber_name: string
      barber_id: string
      amount: number
      currency?: string
      appointment_date: string
    }
  ) => {
    trackPurchase(transactionId, appointmentData)
  }, [])

  // Timing utilities for performance tracking
  const createTimer = useCallback((name: string) => {
    const start = performance.now()

    return {
      end: () => {
        const duration = performance.now() - start
        trackPerformanceMetric(name as any, duration, 'ms')
        return duration
      }
    }
  }, [trackPerformanceMetric])

  // Auto-track API calls
  const trackApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    endpoint: string
  ): Promise<T> => {
    const timer = createTimer('api_response')

    try {
      const result = await apiCall()
      timer.end()
      return result
    } catch (error) {
      timer.end()
      trackErrorEvent(error as Error, 'api', endpoint)
      throw error
    }
  }, [createTimer, trackErrorEvent])

  return {
    // Core tracking
    trackPage,
    track,

    // Specific flows
    booking: trackBookingFlow,
    payment: trackPaymentFlow,
    user: trackUser,
    onboarding: trackOnboarding,

    // Individual events
    trackSearch: trackSearchQuery,
    trackEngagement: trackEngagementEvent,
    trackError: trackErrorEvent,
    trackPerformance: trackPerformanceMetric,
    trackConversion: trackConversionEvent,
    trackPurchase: trackBookingPurchase,

    // Utilities
    createTimer,
    trackApiCall,
  }
}

export default useAnalytics
