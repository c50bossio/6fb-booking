'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { autoInitializeAnalytics, getAnalytics, type GA4Analytics, type ConsentStatus } from '@/lib/analytics'
import useCookieConsent from '@/hooks/useCookieConsent'

interface GA4ContextValue {
  analytics: GA4Analytics | null
  isInitialized: boolean
  hasConsent: boolean
  trackPageView: (title: string, path: string) => void
  trackEvent: (eventName: string, parameters?: Record<string, any>) => void
  updateConsent: (consent: ConsentStatus) => void
}

const GA4Context = createContext<GA4ContextValue | null>(null)

interface GA4ProviderProps {
  children: React.ReactNode
}

export function GA4Provider({ children }: GA4ProviderProps) {
  const [analytics, setAnalytics] = useState<GA4Analytics | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const { preferences, hasConsent, canLoadAnalytics } = useCookieConsent()
  const router = useRouter()

  // Initialize GA4 when consent is granted
  useEffect(() => {
    let mounted = true

    const initializeGA4 = async () => {
      if (canLoadAnalytics && !analytics) {
        try {
          const ga4Instance = autoInitializeAnalytics()
          
          if (ga4Instance && mounted) {
            await ga4Instance.initialize()
            
            // Update consent status
            const consentStatus: ConsentStatus = {
              analytics: preferences.categories.analytics,
              advertising: preferences.categories.marketing,
              functional: preferences.categories.functional,
              necessary: preferences.categories.necessary
            }
            
            ga4Instance.updateConsent(consentStatus)
            
            setAnalytics(ga4Instance)
            setIsInitialized(true)
            
            }
        } catch (error) {
          }
      }
    }

    initializeGA4()

    return () => {
      mounted = false
    }
  }, [canLoadAnalytics, preferences.categories, analytics])

  // Track page views automatically
  useEffect(() => {
    if (!analytics || !canLoadAnalytics) return

    const handleRouteChange = (url: string) => {
      // Extract page title from document or URL
      const pageTitle = document.title || url
      const pagePath = url
      
      analytics.trackPageView(pageTitle, pagePath, url)
    }

    // Track initial page load
    handleRouteChange(window.location.pathname)

    // Note: Next.js 13+ app router doesn't have router events like pages router
    // For now, we'll track via the trackPageView method manually
    // In a production app, you might want to use a different approach for route tracking

  }, [analytics, canLoadAnalytics])

  // Update consent when preferences change
  useEffect(() => {
    if (analytics && preferences.hasConsented) {
      const consentStatus: ConsentStatus = {
        analytics: preferences.categories.analytics,
        advertising: preferences.categories.marketing,
        functional: preferences.categories.functional,
        necessary: preferences.categories.necessary
      }
      
      analytics.updateConsent(consentStatus)
      
      }
  }, [analytics, preferences])

  const trackPageView = useCallback((title: string, path: string) => {
    if (analytics && canLoadAnalytics) {
      analytics.trackPageView(title, path, window.location.href)
    }
  }, [analytics, canLoadAnalytics])

  const trackEvent = useCallback((eventName: string, parameters: Record<string, any> = {}) => {
    if (analytics && canLoadAnalytics) {
      analytics.trackCustomEvent(eventName, parameters)
    }
  }, [analytics, canLoadAnalytics])

  const updateConsent = useCallback((consent: ConsentStatus) => {
    if (analytics) {
      analytics.updateConsent(consent)
    }
  }, [analytics])

  const contextValue: GA4ContextValue = {
    analytics,
    isInitialized,
    hasConsent: canLoadAnalytics,
    trackPageView,
    trackEvent,
    updateConsent
  }

  return (
    <GA4Context.Provider value={contextValue}>
      {children}
    </GA4Context.Provider>
  )
}

export function useGA4() {
  const context = useContext(GA4Context)
  
  if (!context) {
    throw new Error('useGA4 must be used within a GA4Provider')
  }
  
  return context
}

// Hook for tracking specific business events
export function useGA4BusinessTracking() {
  const { analytics, hasConsent } = useGA4()
  const { preferences } = useCookieConsent()

  const trackAppointmentEvent = useCallback(async (
    eventType: 'booked' | 'confirmed' | 'completed',
    appointmentId: string,
    options: {
      barberId?: string
      serviceName?: string
      price?: number
      durationMinutes?: number
      actualDuration?: number
      customerRating?: number
      userRole?: string
      locationId?: string
    } = {}
  ) => {
    if (!analytics || !hasConsent) return false

    const customDimensions = {
      user_role: options.userRole,
      barber_id: options.barberId,
      location_id: options.locationId,
      appointment_service: options.serviceName
    }

    try {
      switch (eventType) {
        case 'booked':
          return await analytics.trackAppointmentBooked(
            appointmentId,
            options.barberId,
            options.serviceName,
            options.price,
            options.durationMinutes,
            customDimensions
          )
        case 'confirmed':
          return await analytics.trackAppointmentConfirmed(
            appointmentId,
            options.barberId,
            customDimensions
          )
        case 'completed':
          return await analytics.trackAppointmentCompleted(
            appointmentId,
            options.barberId,
            options.serviceName,
            options.actualDuration,
            options.customerRating,
            customDimensions
          )
        default:
          return false
      }
    } catch (error) {
      return false
    }
  }, [analytics, hasConsent])

  const trackPaymentEvent = useCallback(async (
    eventType: 'initiated' | 'completed' | 'failed',
    transactionId: string,
    amount: number,
    options: {
      currency?: string
      paymentMethod?: string
      appointmentId?: string
      barberId?: string
      serviceName?: string
      errorCode?: string
      errorMessage?: string
      userRole?: string
      locationId?: string
    } = {}
  ) => {
    if (!analytics || !hasConsent) return false

    const customDimensions = {
      user_role: options.userRole,
      barber_id: options.barberId,
      location_id: options.locationId,
      payment_method: options.paymentMethod,
      appointment_service: options.serviceName
    }

    try {
      switch (eventType) {
        case 'initiated':
          return await analytics.trackPaymentInitiated(
            transactionId,
            amount,
            options.currency,
            options.paymentMethod,
            options.appointmentId,
            customDimensions
          )
        case 'completed':
          return await analytics.trackPaymentCompleted(
            transactionId,
            amount,
            options.currency,
            options.paymentMethod,
            options.appointmentId,
            options.barberId,
            options.serviceName,
            customDimensions
          )
        case 'failed':
          return await analytics.trackPaymentFailed(
            transactionId,
            amount,
            options.errorCode,
            options.errorMessage,
            options.paymentMethod,
            customDimensions
          )
        default:
          return false
      }
    } catch (error) {
      return false
    }
  }, [analytics, hasConsent])

  const trackUserEvent = useCallback(async (
    eventType: 'signup' | 'login',
    userRole: string,
    options: {
      method?: string
      referralSource?: string
      locationId?: string
      subscriptionTier?: string
    } = {}
  ) => {
    if (!analytics || !hasConsent) return false

    const customDimensions = {
      user_role: userRole,
      location_id: options.locationId,
      subscription_tier: options.subscriptionTier || 'free'
    }

    try {
      switch (eventType) {
        case 'signup':
          return await analytics.trackUserSignup(
            userRole,
            options.method,
            options.referralSource,
            customDimensions
          )
        case 'login':
          return await analytics.trackUserLogin(
            userRole,
            options.method,
            customDimensions
          )
        default:
          return false
      }
    } catch (error) {
      return false
    }
  }, [analytics, hasConsent])

  const trackBusinessEvent = useCallback(async (
    eventType: 'service_viewed' | 'barber_viewed' | 'availability_checked',
    data: {
      serviceId?: string
      serviceName?: string
      barberId?: string
      barberName?: string
      locationId?: string
      price?: number
      dateRequested?: string
      availableSlots?: number
      userRole?: string
    }
  ) => {
    if (!analytics || !hasConsent) return false

    const customDimensions = {
      user_role: data.userRole,
      barber_id: data.barberId,
      location_id: data.locationId,
      appointment_service: data.serviceName
    }

    try {
      switch (eventType) {
        case 'service_viewed':
          if (!data.serviceId || !data.serviceName) {
            return false
          }
          return await analytics.trackServiceViewed(
            data.serviceId,
            data.serviceName,
            data.barberId,
            data.price,
            customDimensions
          )
        case 'barber_viewed':
          if (!data.barberId || !data.barberName) {
            return false
          }
          return await analytics.trackBarberViewed(
            data.barberId,
            data.barberName,
            data.locationId,
            customDimensions
          )
        case 'availability_checked':
          if (!data.barberId || !data.dateRequested || data.availableSlots === undefined) {
            return false
          }
          return await analytics.trackAvailabilityChecked(
            data.barberId,
            data.dateRequested,
            data.availableSlots,
            customDimensions
          )
        default:
          return false
      }
    } catch (error) {
      return false
    }
  }, [analytics, hasConsent])

  const setUserProperties = useCallback((userId: string, properties: Record<string, any>) => {
    if (!analytics || !hasConsent) return

    analytics.setUser({
      id: userId,
      properties
    })
  }, [analytics, hasConsent])

  return {
    trackAppointmentEvent,
    trackPaymentEvent,
    trackUserEvent,
    trackBusinessEvent,
    setUserProperties,
    hasConsent,
    canTrack: hasConsent && !!analytics,
    debugInfo: analytics?.getDebugInfo()
  }
}

export default GA4Provider