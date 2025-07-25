'use client'

import { useEffect, useCallback, useRef } from 'react'
import { useCookieConsent } from '@/hooks/useCookieConsent'
import { trackEvent as trackScriptEvent, trackPageView, initializeScripts } from '@/lib/scriptLoader'

// Conversion event types
export enum ConversionEventType {
  // Page views
  PAGE_VIEW = 'page_view',
  
  // User actions
  SIGN_UP = 'sign_up',
  LOGIN = 'login',
  
  // Booking events
  VIEW_ITEM = 'view_item', // View service
  ADD_TO_CART = 'add_to_cart', // Select service
  BEGIN_CHECKOUT = 'begin_checkout',
  ADD_PAYMENT_INFO = 'add_payment_info',
  PURCHASE = 'purchase', // Booking completed
  
  // Form events
  GENERATE_LEAD = 'generate_lead', // Contact form
  CONTACT = 'contact',
  SUBMIT_APPLICATION = 'submit_application', // Barber application
  
  // Engagement events
  SEARCH = 'search',
  VIEW_ITEM_LIST = 'view_item_list', // View services list
  SELECT_CONTENT = 'select_content',
  SHARE = 'share',
  
  // Custom events
  BOOKING_STARTED = 'booking_started',
  BOOKING_ABANDONED = 'booking_abandoned',
  APPOINTMENT_CANCELED = 'appointment_canceled',
  APPOINTMENT_RESCHEDULED = 'appointment_rescheduled',
  REVIEW_SUBMITTED = 'review_submitted',
  REFERRAL_CLICKED = 'referral_clicked',
  FEATURE_INTEREST = 'feature_interest',
  PRICING_PLAN_SELECTED = 'pricing_plan_selected',
}

// Event parameters interface
export interface ConversionEventParams {
  // Common parameters
  value?: number
  currency?: string
  transaction_id?: string
  
  // Item parameters
  items?: Array<{
    item_id: string
    item_name: string
    price?: number
    quantity?: number
    item_category?: string
    item_variant?: string
  }>
  
  // User parameters
  user_id?: string
  user_type?: 'customer' | 'barber' | 'admin'
  
  // Content parameters
  content_type?: string
  content_id?: string
  content_name?: string
  
  // Search parameters
  search_term?: string
  
  // Custom parameters
  [key: string]: any
}

// Enhanced purchase parameters for e-commerce tracking
export interface PurchaseEventParams extends ConversionEventParams {
  transaction_id: string
  value: number
  currency: string
  tax?: number
  shipping?: number
  coupon?: string
  payment_type?: string
  items: Array<{
    item_id: string
    item_name: string
    price: number
    quantity: number
    item_category?: string
    item_variant?: string
  }>
}

// Component props
interface ConversionTrackerProps {
  children?: React.ReactNode
  debugMode?: boolean
}

// Conversion tracking context
let isInitialized = false
let debugMode = false

// Initialize tracking scripts based on consent
const initializeTracking = (canLoadAnalytics: boolean, canLoadMarketing: boolean) => {
  if (isInitialized) return
  
  initializeScripts({
    necessary: true,
    analytics: canLoadAnalytics,
    marketing: canLoadMarketing,
    functional: false,
  })
  
  isInitialized = true
}

// Main tracking function
export const trackConversion = (
  eventType: ConversionEventType,
  params?: ConversionEventParams
) => {
  if (debugMode) {
  }
  
  // Track via scriptLoader (handles consent internally)
  trackScriptEvent(eventType, params)
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
      type: eventType,
      params,
      timestamp: new Date().toISOString(),
    })
  }
}

// Track page view with enhanced parameters
export const trackEnhancedPageView = (params?: {
  page_title?: string
  page_location?: string
  page_path?: string
  user_id?: string
  user_type?: string
}) => {
  trackPageView(params?.page_path)
  
  // Also track as conversion event with more details
  if (params) {
    trackConversion(ConversionEventType.PAGE_VIEW, params)
  }
}

// E-commerce tracking helper for bookings
export const trackBookingPurchase = (purchaseData: PurchaseEventParams) => {
  // Ensure required fields
  if (!purchaseData.transaction_id || !purchaseData.value || !purchaseData.items?.length) {
    console.error('[ConversionTracker] Invalid purchase data:', purchaseData)
    return
  }
  
  // Set default currency if not provided
  const data = {
    ...purchaseData,
    currency: purchaseData.currency || 'USD',
  }
  
  // Track purchase event
  trackConversion(ConversionEventType.PURCHASE, data)
  
  // Also track for Meta Pixel specific e-commerce event
  if (window.fbq) {
    window.fbq('track', 'Purchase', {
      value: data.value,
      currency: data.currency,
      content_ids: data.items.map(item => item.item_id),
      content_type: 'product',
      num_items: data.items.length,
    })
  }
}

// React hook for conversion tracking
export const useConversionTracking = (options?: { debug?: boolean }) => {
  const { canLoadAnalytics, canLoadMarketing, preferences } = useCookieConsent()
  const hasInitialized = useRef(false)
  
  useEffect(() => {
    if (options?.debug) {
      debugMode = true
    }
  }, [options?.debug])
  
  // Initialize scripts when consent is available
  useEffect(() => {
    if (!hasInitialized.current && preferences.hasConsented) {
      initializeTracking(canLoadAnalytics, canLoadMarketing)
      hasInitialized.current = true
    }
  }, [canLoadAnalytics, canLoadMarketing, preferences.hasConsented])
  
  // Track function with consent check
  const track = useCallback((
    eventType: ConversionEventType,
    params?: ConversionEventParams
  ) => {
    // Check consent before tracking
    const requiresAnalytics = [
      ConversionEventType.PAGE_VIEW,
      ConversionEventType.SEARCH,
      ConversionEventType.VIEW_ITEM,
      ConversionEventType.VIEW_ITEM_LIST,
    ].includes(eventType)
    
    const requiresMarketing = [
      ConversionEventType.PURCHASE,
      ConversionEventType.ADD_TO_CART,
      ConversionEventType.BEGIN_CHECKOUT,
      ConversionEventType.GENERATE_LEAD,
    ].includes(eventType)
    
    if (requiresAnalytics && !canLoadAnalytics) {
      if (debugMode) {
      }
      return
    }
    
    if (requiresMarketing && !canLoadMarketing) {
      if (debugMode) {
      }
      return
    }
    
    trackConversion(eventType, params)
  }, [canLoadAnalytics, canLoadMarketing])
  
  // Helper functions
  const trackPageView = useCallback((params?: Parameters<typeof trackEnhancedPageView>[0]) => {
    if (canLoadAnalytics) {
      trackEnhancedPageView(params)
    }
  }, [canLoadAnalytics])
  
  const trackPurchase = useCallback((data: PurchaseEventParams) => {
    if (canLoadMarketing) {
      trackBookingPurchase(data)
    }
  }, [canLoadMarketing])
  
  const trackFormSubmission = useCallback((formName: string, params?: ConversionEventParams) => {
    track(ConversionEventType.GENERATE_LEAD, {
      ...params,
      content_name: formName,
      content_type: 'form',
    })
  }, [track])
  
  const trackSearch = useCallback((searchTerm: string, resultsCount?: number) => {
    track(ConversionEventType.SEARCH, {
      search_term: searchTerm,
      value: resultsCount,
    })
  }, [track])
  
  const trackBookingStep = useCallback((step: 'started' | 'service_selected' | 'checkout' | 'completed', params?: ConversionEventParams) => {
    const eventMap = {
      started: ConversionEventType.BOOKING_STARTED,
      service_selected: ConversionEventType.ADD_TO_CART,
      checkout: ConversionEventType.BEGIN_CHECKOUT,
      completed: ConversionEventType.PURCHASE,
    }
    
    track(eventMap[step], params)
  }, [track])
  
  return {
    // Core tracking function
    track,
    
    // Specialized tracking functions
    trackPageView,
    trackPurchase,
    trackFormSubmission,
    trackSearch,
    trackBookingStep,
    
    // Consent status
    canTrackAnalytics: canLoadAnalytics,
    canTrackMarketing: canLoadMarketing,
    hasConsent: preferences.hasConsented,
  }
}

// Main component for initializing tracking
export const ConversionTracker: React.FC<ConversionTrackerProps> = ({ 
  children,
  debugMode: debug = false,
}) => {
  const { canLoadAnalytics, canLoadMarketing, preferences } = useCookieConsent()
  
  useEffect(() => {
    debugMode = debug
  }, [debug])
  
  useEffect(() => {
    if (preferences.hasConsented) {
      initializeTracking(canLoadAnalytics, canLoadMarketing)
    }
  }, [canLoadAnalytics, canLoadMarketing, preferences.hasConsented])
  
  // Track page views on route changes
  useEffect(() => {
    if (canLoadAnalytics) {
      trackEnhancedPageView({
        page_path: window.location.pathname,
        page_location: window.location.href,
        page_title: document.title,
      })
    }
  }, [canLoadAnalytics])
  
  return <>{children}</>
}

// Export everything
export default ConversionTracker

// Type declarations for global objects (if not already declared)
declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    gtag?: (...args: any[]) => void
  }
}