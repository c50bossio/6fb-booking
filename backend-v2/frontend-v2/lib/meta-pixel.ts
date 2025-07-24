/**
 * Meta Pixel integration for BookedBarber V2
 * Handles Meta Pixel initialization, event tracking, and privacy compliance
 */

'use client'

import { nanoid } from 'nanoid'

// TypeScript declarations for fbq
declare global {
  interface Window {
    fbq?: (...args: any[]) => void
    _fbq?: any
  }
}

// Meta Pixel configuration interface
interface MetaPixelConfig {
  pixelId: string
  appId?: string
  debugMode?: boolean
  automaticConfig?: boolean
  enableAdvancedMatching?: boolean
  respectDNT?: boolean
  consentMode?: boolean
  testEventCode?: string
  dataProcessingOptions?: string[]
}

// User data interface for advanced matching
interface UserData {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  dateOfBirth?: string
  gender?: string
  externalId?: string
  clientIpAddress?: string
  clientUserAgent?: string
  fbc?: string // Facebook click ID
  fbp?: string // Facebook browser ID
}

// Standard Meta events
type StandardEvent = 
  | 'AddPaymentInfo'
  | 'AddToCart' 
  | 'AddToWishlist'
  | 'CompleteRegistration'
  | 'Contact'
  | 'CustomizeProduct'
  | 'Donate'
  | 'FindLocation'
  | 'InitiateCheckout'
  | 'Lead'
  | 'PageView'
  | 'Purchase'
  | 'Schedule'
  | 'Search'
  | 'StartTrial'
  | 'SubmitApplication'
  | 'Subscribe'
  | 'ViewContent'

// Custom barbershop events
type CustomEvent = 
  | 'appointment_booked'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_completed'
  | 'service_viewed'
  | 'barber_selected'
  | 'availability_checked'
  | 'booking_flow_started'
  | 'booking_flow_abandoned'
  | 'payment_initiated'
  | 'payment_failed'
  | 'profile_updated'
  | 'calendar_sync_enabled'
  | 'review_submitted'
  | 'referral_sent'

// Event parameters interface
interface EventParameters {
  content_ids?: string[]
  content_type?: string
  content_name?: string
  content_category?: string
  currency?: string
  value?: number
  num_items?: number
  search_string?: string
  status?: boolean
  custom_data?: Record<string, any>
  eventId?: string
  
  // E-commerce specific
  predicted_ltv?: number
  order_id?: string
  
  // Custom barbershop parameters
  appointment_id?: string
  barber_id?: string
  service_id?: string
  service_name?: string
  duration_minutes?: number
  location_id?: string
  user_role?: string
  payment_method?: string
  
  // Attribution parameters
  fb_login_id?: string
  lead_id?: string
}

class MetaPixelService {
  private config: MetaPixelConfig
  private isInitialized: boolean = false
  private eventQueue: Array<{
    eventName: string
    parameters?: EventParameters
    userData?: UserData
    timestamp: number
  }> = []
  private debugMode: boolean = false
  private testMode: boolean = false
  private hasConsent: boolean = false
  private deduplicationEnabled: boolean = true
  private eventIdPrefix: string = 'bookedbarber_'

  constructor(config: MetaPixelConfig) {
    this.config = config
    this.debugMode = config.debugMode || false
    this.testMode = process.env.NEXT_PUBLIC_META_TEST_MODE === 'true'
    this.deduplicationEnabled = process.env.NEXT_PUBLIC_META_ENABLE_DEDUPLICATION === 'true'
    this.eventIdPrefix = process.env.NEXT_PUBLIC_META_EVENT_ID_PREFIX || 'bookedbarber_'
  }

  /**
   * Initialize Meta Pixel
   */
  public async init(): Promise<void> {
    if (this.isInitialized) return

    try {
      // Check DNT (Do Not Track) setting
      if (this.config.respectDNT && navigator.doNotTrack === '1') {
        console.log('[Meta Pixel] Do Not Track is enabled, skipping initialization')
        return
      }

      // Load Meta Pixel script
      await this.loadPixelScript()

      // Initialize pixel
      this.initializePixel()

      // Process queued events
      this.processEventQueue()

      this.isInitialized = true
      
      if (this.debugMode) {
        console.log('[Meta Pixel] Initialized successfully', {
          pixelId: this.config.pixelId,
          testMode: this.testMode,
          deduplicationEnabled: this.deduplicationEnabled
        })
      }
    } catch (error) {
      console.error('[Meta Pixel] Initialization failed:', error)
      throw error
    }
  }

  /**
   * Load Meta Pixel script dynamically
   */
  private async loadPixelScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (window.fbq) {
        resolve()
        return
      }

      // Create the fbq function
      const fbq: any = function(...args: any[]) {
        if (fbq.callMethod) {
          fbq.callMethod.apply(fbq, args)
        } else {
          fbq.queue.push(args)
        }
      }
      
      if (!window.fbq) {
        window.fbq = fbq
      }
      
      fbq.push = fbq
      fbq.loaded = true
      fbq.version = '2.0'
      fbq.queue = [] as any[]

      // Load the script
      const script = document.createElement('script')
      script.async = true
      script.src = 'https://connect.facebook.net/en_US/fbevents.js'
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Failed to load Meta Pixel script'))
      
      document.head.appendChild(script)
    })
  }

  /**
   * Initialize the pixel
   */
  private initializePixel(): void {
    if (!window.fbq) {
      throw new Error('Meta Pixel script not loaded')
    }

    const initOptions: any = {}

    // Advanced matching
    if (this.config.enableAdvancedMatching) {
      initOptions.em = 'auto' // Email matching
      initOptions.fn = 'auto' // First name matching
      initOptions.ln = 'auto' // Last name matching
      initOptions.ph = 'auto' // Phone matching
    }

    // Test event code for debugging
    if (this.config.testEventCode) {
      initOptions.test_event_code = this.config.testEventCode
    }

    // Data processing options for compliance
    if (this.config.dataProcessingOptions && this.config.dataProcessingOptions.length > 0) {
      window.fbq('dataProcessingOptions', this.config.dataProcessingOptions)
    }

    // Initialize pixel
    window.fbq('init', this.config.pixelId, initOptions)

    // Track automatic page view if enabled
    if (process.env.NEXT_PUBLIC_META_TRACK_PAGE_VIEWS === 'true') {
      this.trackPageView()
    }
  }

  /**
   * Set consent status
   */
  public setConsent(hasConsent: boolean): void {
    this.hasConsent = hasConsent
    
    if (window.fbq) {
      if (hasConsent) {
        window.fbq('consent', 'grant')
      } else {
        window.fbq('consent', 'revoke')
      }
    }

    if (this.debugMode) {
      console.log('[Meta Pixel] Consent updated:', hasConsent)
    }
  }

  /**
   * Check if tracking is allowed
   */
  private canTrack(): boolean {
    if (this.config.respectDNT && navigator.doNotTrack === '1') {
      return false
    }
    
    if (this.config.consentMode && !this.hasConsent) {
      return false
    }
    
    return true
  }

  /**
   * Generate event ID for deduplication
   */
  private generateEventId(eventName: string, customId?: string): string {
    if (customId) {
      return `${this.eventIdPrefix}${customId}`
    }
    
    const timestamp = Date.now()
    const random = nanoid(8)
    return `${this.eventIdPrefix}${eventName}_${timestamp}_${random}`
  }

  /**
   * Track a standard Meta event
   */
  public trackEvent(
    eventName: StandardEvent,
    parameters: EventParameters = {},
    userData?: UserData,
    customEventId?: string
  ): void {
    if (!this.canTrack()) {
      if (this.debugMode) {
        console.log('[Meta Pixel] Tracking blocked by consent/DNT:', eventName)
      }
      return
    }

    const eventId = this.generateEventId(eventName, customEventId)
    
    if (!this.isInitialized) {
      this.eventQueue.push({
        eventName,
        parameters: { ...parameters, eventId },
        userData,
        timestamp: Date.now()
      })
      return
    }

    try {
      // Prepare parameters
      const eventParams = this.prepareEventParameters(parameters, eventId)
      
      // Add user data for advanced matching
      if (userData && this.config.enableAdvancedMatching) {
        const hashedUserData = this.hashUserData(userData)
        Object.assign(eventParams, hashedUserData)
      }

      // Track the event
      if (this.testMode) {
        console.log('[Meta Pixel] Test event:', eventName, eventParams)
      } else {
        window.fbq('track', eventName, eventParams, { eventID: eventId })
      }

      if (this.debugMode) {
        console.log('[Meta Pixel] Event tracked:', {
          eventName,
          eventId,
          parameters: eventParams,
          testMode: this.testMode
        })
      }
    } catch (error) {
      console.error('[Meta Pixel] Error tracking event:', eventName, error)
    }
  }

  /**
   * Track a custom event
   */
  public trackCustomEvent(
    eventName: CustomEvent,
    parameters: EventParameters = {},
    userData?: UserData,
    customEventId?: string
  ): void {
    if (!this.canTrack()) {
      if (this.debugMode) {
        console.log('[Meta Pixel] Custom tracking blocked by consent/DNT:', eventName)
      }
      return
    }

    const eventId = this.generateEventId(eventName, customEventId)
    
    if (!this.isInitialized) {
      this.eventQueue.push({
        eventName,
        parameters: { ...parameters, eventId },
        userData,
        timestamp: Date.now()
      })
      return
    }

    try {
      // Prepare parameters
      const eventParams = this.prepareEventParameters(parameters, eventId)
      
      // Add user data for advanced matching
      if (userData && this.config.enableAdvancedMatching) {
        const hashedUserData = this.hashUserData(userData)
        Object.assign(eventParams, hashedUserData)
      }

      // Track the custom event
      if (this.testMode) {
        console.log('[Meta Pixel] Test custom event:', eventName, eventParams)
      } else {
        window.fbq('trackCustom', eventName, eventParams, { eventID: eventId })
      }

      if (this.debugMode) {
        console.log('[Meta Pixel] Custom event tracked:', {
          eventName,
          eventId,
          parameters: eventParams,
          testMode: this.testMode
        })
      }
    } catch (error) {
      console.error('[Meta Pixel] Error tracking custom event:', eventName, error)
    }
  }

  /**
   * Track page view
   */
  public trackPageView(pageName?: string, parameters: EventParameters = {}): void {
    if (!this.canTrack()) return

    const eventParams = this.prepareEventParameters({
      ...parameters,
      content_name: pageName || window.location.pathname
    })

    if (this.testMode) {
      console.log('[Meta Pixel] Test page view:', eventParams)
    } else if (window.fbq) {
      window.fbq('track', 'PageView', eventParams)
    }

    if (this.debugMode) {
      console.log('[Meta Pixel] Page view tracked:', {
        pageName,
        url: window.location.href,
        parameters: eventParams
      })
    }
  }

  /**
   * Prepare event parameters
   */
  private prepareEventParameters(
    parameters: EventParameters,
    eventId?: string
  ): Record<string, any> {
    const params: Record<string, any> = { ...parameters }

    // Add event ID for deduplication
    if (eventId && this.deduplicationEnabled) {
      params.eventID = eventId
    }

    // Ensure currency is set for value events
    if (params.value && !params.currency) {
      params.currency = 'USD'
    }

    // Add timestamp
    params.timestamp = Math.floor(Date.now() / 1000)

    // Clean up undefined values
    Object.keys(params).forEach(key => {
      if (params[key] === undefined) {
        delete params[key]
      }
    })

    return params
  }

  /**
   * Hash user data for privacy (client-side hashing is not recommended for production)
   * This is a placeholder - actual hashing should be done server-side
   */
  private hashUserData(userData: UserData): Record<string, any> {
    const hashed: Record<string, any> = {}
    
    // Note: Client-side hashing is not secure for production
    // This should be done server-side for security
    Object.entries(userData).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        // For demo purposes only - use server-side hashing in production
        hashed[key] = value.toLowerCase().trim()
      } else if (value) {
        hashed[key] = value
      }
    })

    return hashed
  }

  /**
   * Process queued events
   */
  private processEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()
      if (event) {
        if (event.eventName in this.getStandardEvents()) {
          this.trackEvent(
            event.eventName as StandardEvent,
            event.parameters,
            event.userData
          )
        } else {
          this.trackCustomEvent(
            event.eventName as CustomEvent,
            event.parameters,
            event.userData
          )
        }
      }
    }
  }

  /**
   * Get list of standard events
   */
  private getStandardEvents(): Record<string, boolean> {
    return {
      'AddPaymentInfo': true,
      'AddToCart': true,
      'AddToWishlist': true,
      'CompleteRegistration': true,
      'Contact': true,
      'CustomizeProduct': true,
      'Donate': true,
      'FindLocation': true,
      'InitiateCheckout': true,
      'Lead': true,
      'PageView': true,
      'Purchase': true,
      'Schedule': true,
      'Search': true,
      'StartTrial': true,
      'SubmitApplication': true,
      'Subscribe': true,
      'ViewContent': true
    }
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): Record<string, any> {
    return {
      isInitialized: this.isInitialized,
      pixelId: this.config.pixelId,
      debugMode: this.debugMode,
      testMode: this.testMode,
      hasConsent: this.hasConsent,
      deduplicationEnabled: this.deduplicationEnabled,
      eventIdPrefix: this.eventIdPrefix,
      queuedEvents: this.eventQueue.length,
      canTrack: this.canTrack()
    }
  }

  /**
   * Enhanced appointment tracking
   */
  public trackAppointmentBooked(
    appointmentId: string,
    value: number,
    serviceName: string,
    barberId?: string,
    userData?: UserData
  ): void {
    // Track both standard and custom events
    this.trackEvent('Purchase', {
      content_ids: [appointmentId],
      content_type: 'appointment',
      content_name: serviceName,
      currency: 'USD',
      value: value,
      appointment_id: appointmentId,
      barber_id: barberId,
      service_name: serviceName
    }, userData, appointmentId)

    this.trackCustomEvent('appointment_booked', {
      appointment_id: appointmentId,
      service_name: serviceName,
      barber_id: barberId,
      value: value,
      currency: 'USD'
    }, userData, appointmentId)
  }

  /**
   * Enhanced lead tracking
   */
  public trackLead(
    leadId: string,
    value?: number,
    source?: string,
    userData?: UserData
  ): void {
    this.trackEvent('Lead', {
      content_ids: [leadId],
      content_type: 'lead',
      value: value,
      currency: 'USD',
      lead_id: leadId,
      custom_data: {
        source: source
      }
    }, userData, leadId)
  }

  /**
   * Enhanced registration tracking
   */
  public trackRegistration(
    userId: string,
    userRole: string,
    method: string = 'email',
    userData?: UserData
  ): void {
    this.trackEvent('CompleteRegistration', {
      content_name: `${userRole}_registration`,
      status: true,
      user_role: userRole,
      custom_data: {
        method: method,
        user_id: userId
      }
    }, userData, userId)
  }
}

// Export singleton instance
let metaPixelInstance: MetaPixelService | null = null

export function initializeMetaPixel(): MetaPixelService {
  if (!metaPixelInstance) {
    const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID
    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    
    if (!pixelId) {
      throw new Error('Meta Pixel ID not configured')
    }

    metaPixelInstance = new MetaPixelService({
      pixelId,
      appId,
      debugMode: process.env.NEXT_PUBLIC_META_PIXEL_DEBUG_MODE === 'true',
      automaticConfig: process.env.NEXT_PUBLIC_META_PIXEL_AUTOMATIC_CONFIG === 'true',
      enableAdvancedMatching: process.env.NEXT_PUBLIC_META_PIXEL_ENABLE_ADVANCED_MATCHING === 'true',
      respectDNT: process.env.NEXT_PUBLIC_META_RESPECT_DNT === 'true',
      consentMode: process.env.NEXT_PUBLIC_META_CONSENT_MODE === 'true',
      testEventCode: process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE || undefined,
      dataProcessingOptions: JSON.parse(process.env.NEXT_PUBLIC_META_DATA_PROCESSING_OPTIONS || '[]')
    })
  }
  
  return metaPixelInstance
}

export function getMetaPixel(): MetaPixelService | null {
  return metaPixelInstance
}

export default MetaPixelService
export type { StandardEvent, CustomEvent, EventParameters, UserData }