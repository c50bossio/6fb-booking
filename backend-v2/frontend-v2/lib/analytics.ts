/**
 * Google Analytics 4 (GA4) Analytics Library for BookedBarber V2
 * 
 * This library provides comprehensive client-side GA4 integration including:
 * - gtag-based event tracking with enhanced ecommerce
 * - Privacy compliance (GDPR/CCPA) with consent management
 * - Custom dimensions for barber business metrics
 * - Event validation and error handling
 * - Real-time debugging and testing support
 */

import { loadScript } from './scriptLoader'

// Types
export interface GA4Config {
  measurementId: string
  debugMode?: boolean
  sendPageView?: boolean
  anonymizeIp?: boolean
  respectDnt?: boolean
  consentMode?: boolean
  customDimensions?: Record<string, string>
  enhancedMeasurement?: boolean
  crossDomainTracking?: boolean
  cookieDomain?: string
  cookieExpires?: number
}

export interface GA4Event {
  action: string
  category?: string
  label?: string
  value?: number
  customParameters?: Record<string, any>
}

export interface GA4User {
  id?: string
  properties?: Record<string, any>
}

export interface GA4EcommerceItem {
  item_id: string
  item_name: string
  category?: string
  quantity?: number
  price?: number
  item_brand?: string
  item_variant?: string
  currency?: string
}

export interface ConsentStatus {
  analytics: boolean
  advertising: boolean
  functional: boolean
  necessary: boolean
}

// Global gtag type
declare global {
  interface Window {
    gtag: (...args: any[]) => void
    dataLayer: any[]
    ga4Analytics?: GA4Analytics
  }
}

class GA4Analytics {
  private config: GA4Config
  private initialized = false
  private consentGranted = false
  private eventQueue: Array<() => void> = []
  private debugMode = false
  private logEvents = false

  constructor(config: GA4Config) {
    this.config = {
      debugMode: false,
      sendPageView: true,
      anonymizeIp: true,
      respectDnt: true,
      consentMode: true,
      enhancedMeasurement: true,
      crossDomainTracking: false,
      cookieDomain: 'auto',
      cookieExpires: 7776000, // 90 days
      ...config
    }

    this.debugMode = this.config.debugMode || process.env.NODE_ENV === 'development'
    this.logEvents = this.debugMode || process.env.NEXT_PUBLIC_GA4_LOG_EVENTS === 'true'

    if (this.debugMode) {
      console.log('GA4Analytics initialized with config:', this.config)
    }
  }

  /**
   * Initialize GA4 tracking
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    // Check if measurement ID is provided
    if (!this.config.measurementId) {
      console.warn('GA4 Measurement ID not provided. Analytics tracking disabled.')
      return
    }

    // Check Do Not Track
    if (this.config.respectDnt && this.isDntEnabled()) {
      console.log('Do Not Track enabled. Analytics tracking disabled.')
      return
    }

    try {
      // Initialize dataLayer
      window.dataLayer = window.dataLayer || []
      
      // Define gtag function
      window.gtag = function(...args: any[]) {
        window.dataLayer.push(args)
      }

      // Configure gtag with timestamp
      window.gtag('js', new Date())

      // Load GA4 script
      const scriptUrl = `https://www.googletagmanager.com/gtag/js?id=${this.config.measurementId}`
      await loadScript(scriptUrl)

      // Configure GA4
      this.configureGA4()

      this.initialized = true

      // Process queued events
      this.processEventQueue()

      if (this.debugMode) {
        console.log('GA4Analytics successfully initialized')
      }

    } catch (error) {
      console.error('Failed to initialize GA4Analytics:', error)
    }
  }

  /**
   * Configure GA4 settings
   */
  private configureGA4(): void {
    const gtagConfig: Record<string, any> = {
      send_page_view: this.config.sendPageView,
      anonymize_ip: this.config.anonymizeIp,
      allow_google_signals: true,
      allow_ad_personalization_signals: false,
      cookie_domain: this.config.cookieDomain,
      cookie_expires: this.config.cookieExpires,
      debug_mode: this.debugMode
    }

    // Enhanced measurement settings
    if (this.config.enhancedMeasurement) {
      gtagConfig.enhanced_measurements = {
        scrolls: true,
        outbound_clicks: true,
        site_search: true,
        video_engagement: true,
        file_downloads: true
      }
    }

    // Cross-domain tracking
    if (this.config.crossDomainTracking) {
      gtagConfig.linker = {
        domains: [] // Configure domains in environment
      }
    }

    // Custom dimensions
    if (this.config.customDimensions) {
      Object.entries(this.config.customDimensions).forEach(([key, dimensionId]) => {
        gtagConfig[dimensionId] = key
      })
    }

    window.gtag('config', this.config.measurementId, gtagConfig)

    // Configure consent mode if enabled
    if (this.config.consentMode) {
      this.configureConsentMode()
    }
  }

  /**
   * Configure consent mode for GDPR/CCPA compliance
   */
  private configureConsentMode(): void {
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: this.consentGranted ? 'granted' : 'denied',
      functionality_storage: 'granted',
      personalization_storage: 'denied',
      security_storage: 'granted'
    })
  }

  /**
   * Update consent status
   */
  updateConsent(consent: ConsentStatus): void {
    this.consentGranted = consent.analytics

    if (this.initialized) {
      window.gtag('consent', 'update', {
        ad_storage: consent.advertising ? 'granted' : 'denied',
        ad_user_data: consent.advertising ? 'granted' : 'denied',
        ad_personalization: consent.advertising ? 'granted' : 'denied',
        analytics_storage: consent.analytics ? 'granted' : 'denied',
        functionality_storage: consent.functional ? 'granted' : 'denied',
        personalization_storage: consent.functional ? 'granted' : 'denied'
      })

      if (this.debugMode) {
        console.log('GA4 consent updated:', consent)
      }
    }
  }

  /**
   * Set user properties
   */
  setUser(user: GA4User): void {
    if (!this.shouldTrack()) return

    const userProperties: Record<string, any> = {}

    if (user.id) {
      window.gtag('config', this.config.measurementId, {
        user_id: user.id
      })
    }

    if (user.properties) {
      Object.entries(user.properties).forEach(([key, value]) => {
        // Map to custom dimensions if available
        const dimensionKey = this.config.customDimensions?.[key] || key
        userProperties[dimensionKey] = { value }
      })

      window.gtag('set', userProperties)
    }

    this.logEvent('User properties set', { user })
  }

  /**
   * Track page view
   */
  trackPageView(
    pageTitle: string,
    pagePath: string,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      page_title: pageTitle,
      page_location: window.location.href,
      page_path: pagePath
    }

    if (customDimensions) {
      this.addCustomDimensions(parameters, customDimensions)
    }

    this.executeOrQueue(() => {
      window.gtag('event', 'page_view', parameters)
      this.logEvent('Page View', parameters)
    })
  }

  /**
   * Track appointment booking
   */
  trackAppointmentBooked(
    appointmentId: string,
    barberId?: string,
    serviceName?: string,
    price?: number,
    durationMinutes?: number,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      appointment_id: appointmentId,
      currency: 'USD',
      value: price || 0
    }

    if (barberId) parameters.barber_id = barberId
    if (serviceName) parameters.service_name = serviceName
    if (durationMinutes) parameters.duration_minutes = durationMinutes

    // Add business dimensions
    const businessDimensions = {
      barber_id: barberId,
      appointment_service: serviceName,
      ...customDimensions
    }

    this.addCustomDimensions(parameters, businessDimensions)

    this.executeOrQueue(() => {
      window.gtag('event', 'appointment_booked', parameters)
      this.logEvent('Appointment Booked', parameters)
    })
  }

  /**
   * Track appointment confirmation
   */
  trackAppointmentConfirmed(
    appointmentId: string,
    barberId?: string,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      appointment_id: appointmentId,
      barber_id: barberId || ''
    }

    const businessDimensions = {
      barber_id: barberId,
      ...customDimensions
    }

    this.addCustomDimensions(parameters, businessDimensions)

    this.executeOrQueue(() => {
      window.gtag('event', 'appointment_confirmed', parameters)
      this.logEvent('Appointment Confirmed', parameters)
    })
  }

  /**
   * Track appointment completion
   */
  trackAppointmentCompleted(
    appointmentId: string,
    barberId?: string,
    serviceName?: string,
    actualDuration?: number,
    customerRating?: number,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      appointment_id: appointmentId,
      barber_id: barberId || '',
      service_name: serviceName || ''
    }

    if (actualDuration) parameters.actual_duration = actualDuration
    if (customerRating) parameters.customer_rating = customerRating

    const businessDimensions = {
      barber_id: barberId,
      appointment_service: serviceName,
      ...customDimensions
    }

    this.addCustomDimensions(parameters, businessDimensions)

    this.executeOrQueue(() => {
      window.gtag('event', 'appointment_completed', parameters)
      this.logEvent('Appointment Completed', parameters)
    })
  }

  /**
   * Track payment initiation
   */
  trackPaymentInitiated(
    transactionId: string,
    amount: number,
    currency = 'USD',
    paymentMethod?: string,
    appointmentId?: string,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      transaction_id: transactionId,
      value: amount,
      currency,
      payment_method: paymentMethod || 'unknown',
      appointment_id: appointmentId || ''
    }

    const businessDimensions = {
      payment_method: paymentMethod,
      ...customDimensions
    }

    this.addCustomDimensions(parameters, businessDimensions)

    this.executeOrQueue(() => {
      window.gtag('event', 'begin_checkout', parameters)
      this.logEvent('Payment Initiated', parameters)
    })
  }

  /**
   * Track successful payment with enhanced ecommerce
   */
  trackPaymentCompleted(
    transactionId: string,
    amount: number,
    currency = 'USD',
    paymentMethod?: string,
    appointmentId?: string,
    barberId?: string,
    serviceName?: string,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      transaction_id: transactionId,
      value: amount,
      currency,
      payment_method: paymentMethod || 'unknown',
      appointment_id: appointmentId || '',
      barber_id: barberId || ''
    }

    // Add ecommerce items for enhanced tracking
    if (serviceName && appointmentId) {
      parameters.items = [{
        item_id: appointmentId,
        item_name: serviceName,
        category: 'barber_service',
        quantity: 1,
        price: amount,
        item_brand: 'BookedBarber',
        currency
      }]
    }

    const businessDimensions = {
      payment_method: paymentMethod,
      barber_id: barberId,
      appointment_service: serviceName,
      ...customDimensions
    }

    this.addCustomDimensions(parameters, businessDimensions)

    this.executeOrQueue(() => {
      window.gtag('event', 'purchase', parameters)
      this.logEvent('Payment Completed', parameters)
    })
  }

  /**
   * Track failed payment
   */
  trackPaymentFailed(
    transactionId: string,
    amount: number,
    errorCode?: string,
    errorMessage?: string,
    paymentMethod?: string,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      transaction_id: transactionId,
      value: amount,
      currency: 'USD',
      error_code: errorCode || 'unknown',
      error_message: errorMessage || 'unknown_error',
      payment_method: paymentMethod || 'unknown'
    }

    const businessDimensions = {
      payment_method: paymentMethod,
      ...customDimensions
    }

    this.addCustomDimensions(parameters, businessDimensions)

    this.executeOrQueue(() => {
      window.gtag('event', 'payment_failed', parameters)
      this.logEvent('Payment Failed', parameters)
    })
  }

  /**
   * Track user registration
   */
  trackUserSignup(
    userRole: string,
    signupMethod?: string,
    referralSource?: string,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      method: signupMethod || 'email',
      user_role: userRole,
      referral_source: referralSource || 'direct'
    }

    const businessDimensions = {
      user_role: userRole,
      subscription_tier: 'free',
      ...customDimensions
    }

    this.addCustomDimensions(parameters, businessDimensions)

    this.executeOrQueue(() => {
      window.gtag('event', 'sign_up', parameters)
      this.logEvent('User Signup', parameters)
    })
  }

  /**
   * Track user login
   */
  trackUserLogin(
    userRole: string,
    loginMethod?: string,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      method: loginMethod || 'email',
      user_role: userRole
    }

    const businessDimensions = {
      user_role: userRole,
      ...customDimensions
    }

    this.addCustomDimensions(parameters, businessDimensions)

    this.executeOrQueue(() => {
      window.gtag('event', 'login', parameters)
      this.logEvent('User Login', parameters)
    })
  }

  /**
   * Track service view
   */
  trackServiceViewed(
    serviceId: string,
    serviceName: string,
    barberId?: string,
    price?: number,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      service_id: serviceId,
      service_name: serviceName,
      content_type: 'service'
    }

    if (barberId) parameters.barber_id = barberId
    if (price) {
      parameters.value = price
      parameters.currency = 'USD'
    }

    const businessDimensions = {
      barber_id: barberId,
      appointment_service: serviceName,
      ...customDimensions
    }

    this.addCustomDimensions(parameters, businessDimensions)

    this.executeOrQueue(() => {
      window.gtag('event', 'view_item', parameters)
      this.logEvent('Service Viewed', parameters)
    })
  }

  /**
   * Track barber profile view
   */
  trackBarberViewed(
    barberId: string,
    barberName: string,
    locationId?: string,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      item_id: barberId,
      item_name: barberName,
      content_type: 'barber_profile',
      barber_id: barberId,
      location_id: locationId || ''
    }

    const businessDimensions = {
      barber_id: barberId,
      location_id: locationId,
      ...customDimensions
    }

    this.addCustomDimensions(parameters, businessDimensions)

    this.executeOrQueue(() => {
      window.gtag('event', 'view_item', parameters)
      this.logEvent('Barber Viewed', parameters)
    })
  }

  /**
   * Track availability check
   */
  trackAvailabilityChecked(
    barberId: string,
    dateRequested: string,
    availableSlots: number,
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    const parameters: Record<string, any> = {
      barber_id: barberId,
      date_requested: dateRequested,
      available_slots: availableSlots,
      action: 'check_availability'
    }

    const businessDimensions = {
      barber_id: barberId,
      ...customDimensions
    }

    this.addCustomDimensions(parameters, businessDimensions)

    this.executeOrQueue(() => {
      window.gtag('event', 'availability_checked', parameters)
      this.logEvent('Availability Checked', parameters)
    })
  }

  /**
   * Track custom event
   */
  trackCustomEvent(
    eventName: string,
    parameters: Record<string, any> = {},
    customDimensions?: Record<string, any>
  ): void {
    if (!this.shouldTrack()) return

    if (!this.validateEventName(eventName)) {
      console.warn(`Invalid GA4 event name: ${eventName}`)
      return
    }

    const eventParameters = { ...parameters }

    if (customDimensions) {
      this.addCustomDimensions(eventParameters, customDimensions)
    }

    this.executeOrQueue(() => {
      window.gtag('event', eventName, eventParameters)
      this.logEvent(`Custom Event: ${eventName}`, eventParameters)
    })
  }

  /**
   * Add custom dimensions to parameters
   */
  private addCustomDimensions(
    parameters: Record<string, any>,
    customDimensions?: Record<string, any>
  ): void {
    if (!customDimensions || !this.config.customDimensions) return

    Object.entries(customDimensions).forEach(([key, value]) => {
      const dimensionKey = this.config.customDimensions![key]
      if (dimensionKey && value !== undefined && value !== null) {
        parameters[dimensionKey] = value
      }
    })
  }

  /**
   * Execute function or queue it if not initialized
   */
  private executeOrQueue(fn: () => void): void {
    if (this.initialized && this.consentGranted) {
      fn()
    } else {
      this.eventQueue.push(fn)
    }
  }

  /**
   * Process queued events
   */
  private processEventQueue(): void {
    if (!this.consentGranted) return

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()
      if (event) {
        event()
      }
    }
  }

  /**
   * Check if tracking should be performed
   */
  private shouldTrack(): boolean {
    if (!this.initialized) {
      return false
    }

    if (this.config.consentMode && !this.consentGranted) {
      return false
    }

    if (this.config.respectDnt && this.isDntEnabled()) {
      return false
    }

    return true
  }

  /**
   * Check if Do Not Track is enabled
   */
  private isDntEnabled(): boolean {
    return (
      navigator.doNotTrack === '1' ||
      (window as any).doNotTrack === '1' ||
      navigator.msDoNotTrack === '1'
    )
  }

  /**
   * Validate event name
   */
  private validateEventName(name: string): boolean {
    // GA4 event name validation
    if (!name || name.length > 40) return false
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) return false
    return true
  }

  /**
   * Log events for debugging
   */
  private logEvent(eventName: string, parameters: Record<string, any>): void {
    if (this.logEvents) {
      console.log(`🔍 GA4 Event: ${eventName}`, parameters)
    }
  }

  /**
   * Get debug information
   */
  getDebugInfo(): Record<string, any> {
    return {
      initialized: this.initialized,
      consentGranted: this.consentGranted,
      measurementId: this.config.measurementId,
      queuedEvents: this.eventQueue.length,
      debugMode: this.debugMode,
      dntEnabled: this.isDntEnabled()
    }
  }
}

// Singleton instance
let analyticsInstance: GA4Analytics | null = null

/**
 * Initialize GA4 analytics
 */
export function initializeAnalytics(config: GA4Config): GA4Analytics {
  if (!analyticsInstance) {
    analyticsInstance = new GA4Analytics(config)
    window.ga4Analytics = analyticsInstance
  }
  return analyticsInstance
}

/**
 * Get analytics instance
 */
export function getAnalytics(): GA4Analytics | null {
  return analyticsInstance || window.ga4Analytics || null
}

/**
 * Auto-initialize from environment variables
 */
export function autoInitializeAnalytics(): GA4Analytics | null {
  const measurementId = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID

  if (!measurementId) {
    console.warn('NEXT_PUBLIC_GA4_MEASUREMENT_ID not found. GA4 analytics disabled.')
    return null
  }

  const config: GA4Config = {
    measurementId,
    debugMode: process.env.NEXT_PUBLIC_GA4_DEBUG_MODE === 'true',
    sendPageView: process.env.NEXT_PUBLIC_GA4_SEND_PAGE_VIEW !== 'false',
    anonymizeIp: process.env.NEXT_PUBLIC_GA4_ANONYMIZE_IP !== 'false',
    respectDnt: process.env.NEXT_PUBLIC_GA4_RESPECT_DNT !== 'false',
    consentMode: process.env.NEXT_PUBLIC_GA4_CONSENT_MODE !== 'false',
    enhancedMeasurement: process.env.NEXT_PUBLIC_GA4_ENHANCED_MEASUREMENT !== 'false',
    crossDomainTracking: process.env.NEXT_PUBLIC_GA4_CROSS_DOMAIN_TRACKING === 'true'
  }

  // Parse custom dimensions
  const customDimensionsStr = process.env.NEXT_PUBLIC_GA4_CUSTOM_DIMENSIONS
  if (customDimensionsStr) {
    try {
      config.customDimensions = JSON.parse(customDimensionsStr)
    } catch (error) {
      console.warn('Failed to parse NEXT_PUBLIC_GA4_CUSTOM_DIMENSIONS:', error)
    }
  }

  return initializeAnalytics(config)
}

// Export types
export type { GA4Config, GA4Event, GA4User, GA4EcommerceItem, ConsentStatus }
export { GA4Analytics }

// Export analytics instance for backward compatibility
export const analytics = getAnalytics()