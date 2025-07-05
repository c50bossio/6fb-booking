import { useEffect, useState, useCallback } from 'react'
import { useCustomerPixels } from './useCustomerPixels'

interface ConversionEventData {
  event_category?: string
  event_label?: string
  value?: number
  currency?: string
  transaction_id?: string
  item_name?: string
  item_category?: string
  content_name?: string
  content_category?: string
  content_ids?: string[]
  num_items?: number
  page_title?: string
  page_location?: string
  content_group1?: string
  content_group2?: string
  customer_id?: string
  email?: string
  phone?: string
  first_name?: string
  last_name?: string
  city?: string
  state?: string
  zip_code?: string
  country?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

declare global {
  interface Window {
    dataLayer: any[]
    gtag: (...args: any[]) => void
    fbq: (...args: any[]) => void
    _fbq: any
  }
}

/**
 * Enhanced conversion tracking hook with complete customer journey tracking
 */
export function useEnhancedConversionTracking(organizationSlug: string | undefined) {
  const { pixelsLoaded, error } = useCustomerPixels(organizationSlug)
  const [sessionId, setSessionId] = useState<string>('')
  const [customerJourney, setCustomerJourney] = useState<any[]>([])
  
  // Generate session ID on mount
  useEffect(() => {
    const generateSessionId = () => {
      const timestamp = Date.now().toString(36)
      const randomStr = Math.random().toString(36).substring(2, 8)
      return `session_${timestamp}_${randomStr}`
    }
    
    if (!sessionId) {
      setSessionId(generateSessionId())
    }
  }, [sessionId])

  /**
   * Track complete conversion funnel events with enhanced data
   */
  const trackConversionEvent = useCallback((
    eventName: string, 
    eventData: ConversionEventData = {}
  ) => {
    if (!pixelsLoaded) {
      console.log('Pixels not loaded yet, queuing event:', eventName)
      return
    }

    const timestamp = new Date().toISOString()
    const enhancedData = {
      ...eventData,
      session_id: sessionId,
      timestamp,
      page_url: window.location.href,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }

    // Add to customer journey
    setCustomerJourney(prev => [...prev, {
      event: eventName,
      data: enhancedData,
      timestamp
    }])

    // Track on all platforms
    trackGTMEvent(eventName, enhancedData)
    trackGA4Event(eventName, enhancedData)
    trackMetaEvent(eventName, enhancedData)
    trackGoogleAdsEvent(eventName, enhancedData)

    console.log(`🎯 Conversion Event Tracked: ${eventName}`, enhancedData)
  }, [pixelsLoaded, sessionId])

  // Convenience methods for common events
  const trackEvent = useCallback((eventName: string, data: any = {}) => {
    trackConversionEvent(eventName, data)
  }, [trackConversionEvent])

  const trackPageView = useCallback(() => {
    trackConversionEvent('page_view', {
      event_category: 'engagement',
      page_title: document.title,
      page_location: window.location.href
    })
  }, [trackConversionEvent])

  const trackBeginCheckout = useCallback(() => {
    trackConversionEvent('begin_checkout', {
      event_category: 'ecommerce'
    })
  }, [trackConversionEvent])

  const trackAddPaymentInfo = useCallback(() => {
    trackConversionEvent('add_payment_info', {
      event_category: 'ecommerce'
    })
  }, [trackConversionEvent])

  const trackPurchase = useCallback((purchaseData: any) => {
    trackConversionEvent('purchase', {
      event_category: 'ecommerce',
      ...purchaseData
    })
  }, [trackConversionEvent])

  return {
    trackConversionEvent,
    trackEvent,
    trackPageView,
    trackBeginCheckout,
    trackAddPaymentInfo,
    trackPurchase,
    pixelsLoaded,
    error,
    sessionId,
    customerJourney
  }
}

/**
 * Track Google Tag Manager events
 */
function trackGTMEvent(eventName: string, data: ConversionEventData) {
  if (!window.dataLayer) return

  const gtmEventData = {
    event: eventName,
    event_category: data.event_category || 'booking',
    event_label: data.event_label,
    value: data.value,
    currency: data.currency || 'USD',
    transaction_id: data.transaction_id,
    content_name: data.content_name,
    content_category: data.content_category,
    content_ids: data.content_ids,
    num_items: data.num_items,
    page_title: data.page_title,
    page_location: data.page_location,
    content_group1: data.content_group1,
    content_group2: data.content_group2,
    customer_id: data.customer_id,
    session_id: (data as any).session_id,
    timestamp: (data as any).timestamp,
    utm_source: data.utm_source,
    utm_medium: data.utm_medium,
    utm_campaign: data.utm_campaign,
    utm_term: data.utm_term,
    utm_content: data.utm_content
  }

  window.dataLayer.push(gtmEventData)
}

/**
 * Track Google Analytics 4 events
 */
function trackGA4Event(eventName: string, data: ConversionEventData) {
  if (!window.gtag) return

  const ga4EventData: any = {
    event_category: data.event_category || 'booking',
    event_label: data.event_label,
    value: data.value,
    currency: data.currency || 'USD',
    transaction_id: data.transaction_id,
    custom_parameters: {
      session_id: (data as any).session_id,
      content_name: data.content_name,
      content_category: data.content_category,
      customer_id: data.customer_id,
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign
    }
  }

  // Enhanced e-commerce tracking for purchase events
  if (eventName === 'purchase' && data.transaction_id) {
    ga4EventData.transaction_id = data.transaction_id
    ga4EventData.items = [{
      item_id: data.content_ids?.[0] || 'service',
      item_name: data.item_name || data.content_name,
      item_category: data.item_category || data.content_category,
      price: data.value,
      quantity: data.num_items || 1
    }]
  }

  window.gtag('event', eventName, ga4EventData)
}

/**
 * Track Meta (Facebook) Pixel events
 */
function trackMetaEvent(eventName: string, data: ConversionEventData) {
  if (!window.fbq) return

  const metaEventData: any = {
    value: data.value,
    currency: data.currency || 'USD',
    content_name: data.content_name,
    content_category: data.content_category,
    content_ids: data.content_ids,
    num_items: data.num_items
  }

  // Customer information for enhanced matching
  if (data.email || data.phone || data.first_name) {
    metaEventData.user_data = {}
    if (data.email) metaEventData.user_data.em = hashEmail(data.email)
    if (data.phone) metaEventData.user_data.ph = hashPhone(data.phone)
    if (data.first_name) metaEventData.user_data.fn = hashString(data.first_name.toLowerCase())
    if (data.last_name) metaEventData.user_data.ln = hashString(data.last_name.toLowerCase())
    if (data.city) metaEventData.user_data.ct = hashString(data.city.toLowerCase())
    if (data.state) metaEventData.user_data.st = hashString(data.state.toLowerCase())
    if (data.zip_code) metaEventData.user_data.zp = data.zip_code
    if (data.country) metaEventData.user_data.country = hashString(data.country.toLowerCase())
  }

  // Map event names to Meta standard events
  const metaEventMapping: { [key: string]: string } = {
    'page_view': 'PageView',
    'view_content': 'ViewContent',
    'begin_checkout': 'InitiateCheckout',
    'add_payment_info': 'AddPaymentInfo',
    'purchase': 'Purchase',
    'complete_registration': 'CompleteRegistration',
    'contact': 'Contact',
    'schedule': 'Schedule'
  }

  const metaEventName = metaEventMapping[eventName] || eventName

  if (metaEventMapping[eventName]) {
    // Standard Meta event
    window.fbq('track', metaEventName, metaEventData)
  } else {
    // Custom event
    window.fbq('trackCustom', metaEventName, metaEventData)
  }
}

/**
 * Track Google Ads conversion events
 */
function trackGoogleAdsEvent(eventName: string, data: ConversionEventData) {
  if (!window.gtag) return

  // Only track specific conversion events for Google Ads
  if (eventName === 'purchase' || eventName === 'begin_checkout') {
    window.gtag('event', 'conversion', {
      value: data.value,
      currency: data.currency || 'USD',
      transaction_id: data.transaction_id
    })
  }
}

/**
 * Utility functions for Meta Pixel hashing
 */
function hashEmail(email: string): string {
  return email.toLowerCase().trim()
}

function hashPhone(phone: string): string {
  // Remove all non-numeric characters
  return phone.replace(/[^0-9]/g, '')
}

function hashString(str: string): string {
  return str.toLowerCase().trim()
}

/**
 * Pre-built conversion event functions for easy use
 */
export const ConversionEvents = {
  pageView: (data: ConversionEventData = {}) => ({
    event: 'page_view',
    data: {
      event_category: 'engagement',
      ...data
    }
  }),

  viewService: (serviceName: string, price: number, data: ConversionEventData = {}) => ({
    event: 'view_content',
    data: {
      event_category: 'engagement',
      content_name: serviceName,
      content_category: 'barbershop_service',
      value: price,
      ...data
    }
  }),

  beginBooking: (serviceName: string, price: number, data: ConversionEventData = {}) => ({
    event: 'begin_checkout',
    data: {
      event_category: 'ecommerce',
      content_name: serviceName,
      content_category: 'barbershop_service',
      value: price,
      currency: 'USD',
      ...data
    }
  }),

  addContactInfo: (data: ConversionEventData = {}) => ({
    event: 'add_payment_info',
    data: {
      event_category: 'ecommerce',
      ...data
    }
  }),

  completeBooking: (
    serviceName: string, 
    price: number, 
    bookingId: string, 
    customerData: Partial<ConversionEventData> = {}
  ) => ({
    event: 'purchase',
    data: {
      event_category: 'ecommerce',
      content_name: serviceName,
      content_category: 'barbershop_service',
      value: price,
      currency: 'USD',
      transaction_id: bookingId,
      item_name: serviceName,
      item_category: 'service',
      num_items: 1,
      ...customerData
    }
  }),

  registerAccount: (data: ConversionEventData = {}) => ({
    event: 'complete_registration',
    data: {
      event_category: 'engagement',
      ...data
    }
  }),

  contactBarber: (data: ConversionEventData = {}) => ({
    event: 'contact',
    data: {
      event_category: 'engagement',
      ...data
    }
  })
}