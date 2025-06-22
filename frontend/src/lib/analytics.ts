/**
 * Google Analytics 4 tracking utilities for 6FB Booking Platform
 */

import { gtag } from 'gtag'

// Google Analytics 4 configuration
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_TRACKING_ID || ''

// Initialize Google Analytics
export const initGA = () => {
  if (!GA_TRACKING_ID) {
    console.warn('Google Analytics tracking ID not found')
    return
  }

  gtag('config', GA_TRACKING_ID, {
    page_title: document.title,
    page_location: window.location.href,
  })
}

// Track page views
export const trackPageView = (url: string) => {
  if (!GA_TRACKING_ID) return

  gtag('config', GA_TRACKING_ID, {
    page_path: url,
  })
}

// Track custom events
export const trackEvent = (
  eventName: string,
  parameters?: {
    event_category?: string
    event_label?: string
    value?: number
    [key: string]: any
  }
) => {
  if (!GA_TRACKING_ID) return

  gtag('event', eventName, {
    event_category: parameters?.event_category || 'general',
    event_label: parameters?.event_label,
    value: parameters?.value,
    ...parameters,
  })
}

// Track booking events
export const trackBooking = (
  action: 'start' | 'complete' | 'cancel',
  bookingData?: {
    service_id?: string
    barber_id?: string
    amount?: number
    duration?: number
  }
) => {
  trackEvent(`booking_${action}`, {
    event_category: 'booking',
    event_label: action,
    value: bookingData?.amount,
    service_id: bookingData?.service_id,
    barber_id: bookingData?.barber_id,
    duration: bookingData?.duration,
  })
}

// Track payment events
export const trackPayment = (
  action: 'start' | 'success' | 'failed',
  paymentData?: {
    payment_method?: string
    amount?: number
    currency?: string
    appointment_id?: string
  }
) => {
  trackEvent(`payment_${action}`, {
    event_category: 'payment',
    event_label: action,
    value: paymentData?.amount,
    currency: paymentData?.currency || 'USD',
    payment_method: paymentData?.payment_method,
    appointment_id: paymentData?.appointment_id,
  })
}

// Track user registration
export const trackRegistration = (
  method: 'email' | 'google' | 'facebook',
  userType: 'client' | 'barber' | 'admin'
) => {
  trackEvent('sign_up', {
    event_category: 'user',
    method,
    user_type: userType,
  })
}

// Track user login
export const trackLogin = (
  method: 'email' | 'google' | 'facebook',
  userType: 'client' | 'barber' | 'admin'
) => {
  trackEvent('login', {
    event_category: 'user',
    method,
    user_type: userType,
  })
}

// Track barber onboarding
export const trackBarberOnboarding = (
  step: 'start' | 'personal_info' | 'services' | 'availability' | 'payment' | 'complete',
  stepData?: {
    services_count?: number
    payment_method?: string
    stripe_connected?: boolean
  }
) => {
  trackEvent(`barber_onboarding_${step}`, {
    event_category: 'onboarding',
    event_label: step,
    services_count: stepData?.services_count,
    payment_method: stepData?.payment_method,
    stripe_connected: stepData?.stripe_connected,
  })
}

// Track search events
export const trackSearch = (
  searchTerm: string,
  searchType: 'service' | 'barber' | 'location',
  resultsCount?: number
) => {
  trackEvent('search', {
    event_category: 'search',
    search_term: searchTerm,
    search_type: searchType,
    results_count: resultsCount,
  })
}

// Track engagement events
export const trackEngagement = (
  action: 'view_service' | 'view_barber' | 'view_reviews' | 'share',
  itemId?: string,
  itemType?: string
) => {
  trackEvent(action, {
    event_category: 'engagement',
    item_id: itemId,
    item_type: itemType,
  })
}

// Track errors
export const trackError = (
  error: string,
  errorType: 'javascript' | 'api' | 'payment' | 'booking',
  errorCode?: string
) => {
  trackEvent('exception', {
    event_category: 'error',
    description: error,
    error_type: errorType,
    error_code: errorCode,
    fatal: false,
  })
}

// Track performance metrics
export const trackPerformance = (
  metric: 'page_load' | 'api_response' | 'payment_process',
  value: number,
  unit: 'ms' | 'seconds'
) => {
  trackEvent('timing_complete', {
    event_category: 'performance',
    name: metric,
    value: value,
    unit: unit,
  })
}

// Track conversion events
export const trackConversion = (
  conversionType: 'booking_completed' | 'payment_successful' | 'user_registered',
  value?: number
) => {
  trackEvent('conversion', {
    event_category: 'conversion',
    conversion_type: conversionType,
    value: value,
  })
}

// Enhanced ecommerce tracking for appointment bookings
export const trackPurchase = (
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
  trackEvent('purchase', {
    transaction_id: transactionId,
    value: appointmentData.amount,
    currency: appointmentData.currency || 'USD',
    items: [
      {
        item_id: appointmentData.service_id,
        item_name: appointmentData.service_name,
        item_category: 'service',
        item_variant: appointmentData.barber_name,
        price: appointmentData.amount,
        quantity: 1,
      },
    ],
    barber_id: appointmentData.barber_id,
    appointment_date: appointmentData.appointment_date,
  })
}

// Track user properties for better segmentation
export const setUserProperties = (
  userId: string,
  properties: {
    user_type?: 'client' | 'barber' | 'admin'
    location?: string
    preferred_services?: string[]
    customer_lifetime_value?: number
  }
) => {
  if (!GA_TRACKING_ID) return

  gtag('config', GA_TRACKING_ID, {
    user_id: userId,
    custom_map: {
      user_type: properties.user_type,
      location: properties.location,
      preferred_services: properties.preferred_services?.join(','),
      customer_lifetime_value: properties.customer_lifetime_value,
    },
  })
}

// Track custom dimensions
export const setCustomDimensions = (dimensions: Record<string, string | number>) => {
  if (!GA_TRACKING_ID) return

  gtag('config', GA_TRACKING_ID, {
    custom_map: dimensions,
  })
}

export default {
  initGA,
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
  setCustomDimensions,
}