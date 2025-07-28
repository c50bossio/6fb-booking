/**
 * Unified Meta tracking hook for BookedBarber V2
 * Coordinates client-side Meta Pixel and server-side Conversions API
 * Handles event deduplication and privacy compliance
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { nanoid } from 'nanoid'
import { useCookieConsent } from './useCookieConsent'
import { 
  initializeMetaPixel, 
  getMetaPixel, 
  type StandardEvent, 
  type CustomEvent, 
  type EventParameters, 
  type UserData 
} from '@/lib/meta-pixel'

// Server-side tracking API interface
interface ServerSideTrackingOptions {
  enableServerSide?: boolean
  enableClientSide?: boolean
  deduplicationEnabled?: boolean
  fallbackToPixel?: boolean
}

// Meta tracking configuration
interface MetaTrackingConfig {
  pixelId?: string
  enableDeduplication: boolean
  enableServerSide: boolean
  enableClientSide: boolean
  debugMode: boolean
  testMode: boolean
  eventIdPrefix: string
  batchEvents: boolean
  batchSize: number
  batchTimeout: number
}

// Event data for server-side tracking
interface ServerSideEventData {
  eventName: string
  eventId: string
  eventTime: number
  userData: UserData
  customData: EventParameters
  actionSource: 'website' | 'email' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other'
  testEventCode?: string
  deduplicationInfo?: {
    eventId: string
    eventName: string
    userData: UserData
    customData: EventParameters
    timestamp: number
    clientSideTracked: boolean
    source: string
  }
}

// Batched events for performance
interface BatchedEvent {
  eventData: ServerSideEventData
  timestamp: number
  retryCount: number
}

export function useMetaTracking(options: ServerSideTrackingOptions = {}) {
  const { hasConsent, canTrack } = useCookieConsent()
  const [isInitialized, setIsInitialized] = useState(false)
  const [metaPixel, setMetaPixel] = useState<any>(null)
  const [eventBatch, setEventBatch] = useState<BatchedEvent[]>([])
  const [batchTimer, setBatchTimer] = useState<NodeJS.Timeout | null>(null)

  // Configuration from environment variables
  const config: MetaTrackingConfig = {
    pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID,
    enableDeduplication: process.env.NEXT_PUBLIC_META_ENABLE_DEDUPLICATION === 'true',
    enableServerSide: options.enableServerSide ?? true,
    enableClientSide: options.enableClientSide ?? true,
    debugMode: process.env.NEXT_PUBLIC_META_LOG_EVENTS === 'true',
    testMode: process.env.NEXT_PUBLIC_META_TEST_MODE === 'true',
    eventIdPrefix: process.env.NEXT_PUBLIC_META_EVENT_ID_PREFIX || 'bookedbarber_',
    batchEvents: process.env.NEXT_PUBLIC_META_BATCH_EVENTS === 'true',
    batchSize: parseInt(process.env.NEXT_PUBLIC_META_BATCH_SIZE || '10'),
    batchTimeout: parseInt(process.env.NEXT_PUBLIC_META_BATCH_TIMEOUT || '1000')
  }

  // Initialize Meta Pixel
  useEffect(() => {
    if (!canTrack || !config.pixelId || isInitialized) return

    const initPixel = async () => {
      try {
        if (config.enableClientSide) {
          const pixel = initializeMetaPixel()
          await pixel.init()
          pixel.setConsent(hasConsent)
          setMetaPixel(pixel)
        }
        
        setIsInitialized(true)
        
        if (config.debugMode) {
          console.log('[Meta Tracking] Initialized with config:', {
            enableClientSide: config.enableClientSide,
            enableServerSide: config.enableServerSide,
            hasConsent
          })
        }
      } catch (error) {
        console.error('[Meta Tracking] Initialization failed:', error)
      }
    }

    initPixel()
  }, [canTrack, hasConsent, config.pixelId, isInitialized])

  // Update consent when it changes
  useEffect(() => {
    if (metaPixel) {
      metaPixel.setConsent(hasConsent)
    }
  }, [hasConsent, metaPixel])

  // Process event batch
  useEffect(() => {
    if (eventBatch.length >= config.batchSize || 
        (eventBatch.length > 0 && batchTimer)) {
      processBatch()
    }
  }, [eventBatch])

  /**
   * Generate unique event ID for deduplication
   */
  const generateEventId = useCallback((eventName: string, customId?: string): string => {
    if (customId) {
      return `${config.eventIdPrefix}${customId}`
    }
    
    const timestamp = Date.now()
    const random = nanoid(8)
    return `${config.eventIdPrefix}${eventName}_${timestamp}_${random}`
  }, [config.eventIdPrefix])

  /**
   * Get user data from browser context
   */
  const getUserDataFromContext = useCallback((): UserData => {
    const userData: UserData = {}

    // Get Facebook click ID from URL parameters
    const urlParams = new URLSearchParams(window.location.search)
    const fbclid = urlParams.get('fbclid')
    if (fbclid) {
      userData.fbc = `fb.1.${Date.now()}.${fbclid}`
    }

    // Get Facebook browser ID from cookies
    const fbpCookie = document.cookie
      .split('; ')
      .find(row => row.startsWith('_fbp='))
    if (fbpCookie) {
      userData.fbp = fbpCookie.split('=')[1]
    }

    // Get client IP and user agent (for server-side)
    userData.clientUserAgent = navigator.userAgent
    
    return userData
  }, [])

  /**
   * Send event to server-side Conversions API
   */
  const sendServerSideEvent = useCallback(async (
    eventData: ServerSideEventData
  ): Promise<boolean> => {
    if (!config.enableServerSide || config.testMode) {
      if (config.debugMode && config.testMode) {
      }
      return true
    }

    try {
      const response = await fetch('/api/v2/tracking/meta-conversions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      })

      if (!response.ok) {
        throw new Error(`Server-side tracking failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      if (config.debugMode) {
      }
      
      return true
    } catch (error) {
      console.error('[Meta Tracking] Server-side event failed:', error)
      return false
    }
  }, [config.enableServerSide, config.testMode, config.debugMode])

  /**
   * Add event to batch for processing
   */
  const addToBatch = useCallback((eventData: ServerSideEventData) => {
    if (!config.batchEvents) {
      sendServerSideEvent(eventData)
      return
    }

    setEventBatch(prev => [...prev, {
      eventData,
      timestamp: Date.now(),
      retryCount: 0
    }])

    // Set batch timer if not already set
    if (!batchTimer) {
      const timer = setTimeout(() => {
        processBatch()
        setBatchTimer(null)
      }, config.batchTimeout)
      setBatchTimer(timer)
    }
  }, [config.batchEvents, config.batchTimeout, batchTimer, sendServerSideEvent])

  /**
   * Process batch of events
   */
  const processBatch = useCallback(async () => {
    if (eventBatch.length === 0) return

    const batchToProcess = [...eventBatch]
    setEventBatch([])
    
    if (batchTimer) {
      clearTimeout(batchTimer)
      setBatchTimer(null)
    }

    try {
      const response = await fetch('/api/v2/tracking/meta-conversions-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          events: batchToProcess.map(b => b.eventData)
        })
      })

      if (!response.ok) {
        throw new Error(`Batch processing failed: ${response.statusText}`)
      }

      if (config.debugMode) {
      }
    } catch (error) {
      console.error('[Meta Tracking] Batch processing failed:', error)
      
      // Retry failed events (up to 3 times)
      const retryEvents = batchToProcess
        .filter(event => event.retryCount < 3)
        .map(event => ({ ...event, retryCount: event.retryCount + 1 }))
      
      if (retryEvents.length > 0) {
        setEventBatch(prev => [...prev, ...retryEvents])
      }
    }
  }, [eventBatch, batchTimer, config.debugMode])

  /**
   * Track unified Meta event (both client-side and server-side)
   */
  const trackEvent = useCallback((
    eventType: 'standard' | 'custom',
    eventName: StandardEvent | CustomEvent,
    parameters: EventParameters = {},
    userData?: UserData,
    customEventId?: string,
    options: {
      enableClientSide?: boolean
      enableServerSide?: boolean
      actionSource?: 'website' | 'email' | 'phone_call' | 'chat' | 'physical_store' | 'system_generated' | 'other'
      fallbackToPixel?: boolean
    } = {}
  ) => {
    if (!canTrack || !hasConsent) {
      if (config.debugMode) {
      }
      return
    }

    const eventId = generateEventId(eventName, customEventId)
    const contextUserData = getUserDataFromContext()
    const combinedUserData = { ...contextUserData, ...userData }

    const shouldTrackClientSide = (options.enableClientSide ?? config.enableClientSide) && metaPixel
    const shouldTrackServerSide = options.enableServerSide ?? config.enableServerSide

    // Enhanced deduplication: Register event before tracking
    const deduplicationInfo = {
      eventId,
      eventName,
      userData: combinedUserData,
      customData: parameters,
      timestamp: Date.now()
    }

    // Track client-side (Meta Pixel) first for immediate tracking
    if (shouldTrackClientSide) {
      try {
        if (eventType === 'standard') {
          metaPixel.trackEvent(
            eventName as StandardEvent,
            parameters,
            combinedUserData,
            config.enableDeduplication ? eventId : undefined
          )
        } else {
          metaPixel.trackCustomEvent(
            eventName as CustomEvent,
            parameters,
            combinedUserData,
            config.enableDeduplication ? eventId : undefined
          )
        }

        if (config.debugMode) {
          console.log('[Meta Tracking] Tracked client-side event:', {
            eventName,
            eventId,
            source: 'pixel'
          })
        }
      } catch (error) {
        console.error('[Meta Tracking] Client-side event failed:', error)
        
        // Fallback to server-side if client-side fails and fallback is enabled
        if (options.fallbackToPixel !== false && shouldTrackServerSide) {
        }
      }
    }

    // Track server-side (Conversions API) with deduplication
    const trackServerSide = () => {
      if (!shouldTrackServerSide) return

      const serverEventData: ServerSideEventData = {
        eventName,
        eventId: config.enableDeduplication ? eventId : nanoid(),
        eventTime: Math.floor(Date.now() / 1000),
        userData: combinedUserData,
        customData: parameters,
        actionSource: options.actionSource || 'website',
        testEventCode: process.env.NEXT_PUBLIC_META_TEST_EVENT_CODE || undefined
      }

      // Add deduplication information
      if (config.enableDeduplication) {
        serverEventData.deduplicationInfo = {
          ...deduplicationInfo,
          clientSideTracked: shouldTrackClientSide,
          source: 'conversions_api'
        }
      }

      addToBatch(serverEventData)

      if (config.debugMode) {
        console.log('[Meta Tracking] Tracked server-side event:', {
          eventName,
          eventId,
          source: 'conversions_api',
          deduplicationEnabled: config.enableDeduplication
        })
      }
    }

    if (shouldTrackServerSide) {
      trackServerSide()
    }

    if (config.debugMode) {
      console.log('[Meta Tracking] Event tracking summary:', {
        eventType,
        eventName,
        eventId,
        clientSide: shouldTrackClientSide,
        serverSide: shouldTrackServerSide,
        deduplicationEnabled: config.enableDeduplication,
        parameters,
        userData: combinedUserData,
        deduplicationInfo: config.enableDeduplication ? deduplicationInfo : null
      })
    }
  }, [
    canTrack, 
    hasConsent, 
    metaPixel, 
    config, 
    generateEventId, 
    getUserDataFromContext, 
    addToBatch
  ])

  /**
   * Simplified appointment tracking
   */
  const appointment = {
    booked: useCallback((
      appointmentId: string,
      options: {
        serviceName?: string
        barberId?: string
        price?: number
        duration?: number
        userRole?: string
        locationId?: string
        userData?: UserData
      } = {}
    ) => {
      // Track as Purchase (standard event)
      trackEvent('standard', 'Purchase', {
        content_ids: [appointmentId],
        content_type: 'appointment',
        content_name: options.serviceName || 'Appointment',
        currency: 'USD',
        value: options.price || 0,
        appointment_id: appointmentId,
        barber_id: options.barberId,
        service_name: options.serviceName,
        duration_minutes: options.duration,
        user_role: options.userRole,
        location_id: options.locationId
      }, options.userData, appointmentId)

      // Track as custom event
      trackEvent('custom', 'appointment_booked', {
        appointment_id: appointmentId,
        service_name: options.serviceName,
        barber_id: options.barberId,
        value: options.price,
        currency: 'USD',
        duration_minutes: options.duration,
        user_role: options.userRole,
        location_id: options.locationId
      }, options.userData, appointmentId)
    }, [trackEvent]),

    confirmed: useCallback((
      appointmentId: string,
      options: {
        barberId?: string
        userRole?: string
        locationId?: string
        userData?: UserData
      } = {}
    ) => {
      trackEvent('custom', 'appointment_confirmed', {
        appointment_id: appointmentId,
        barber_id: options.barberId,
        user_role: options.userRole,
        location_id: options.locationId
      }, options.userData, `${appointmentId}_confirmed`)
    }, [trackEvent]),

    cancelled: useCallback((
      appointmentId: string,
      options: {
        reason?: string
        barberId?: string
        userRole?: string
        userData?: UserData
      } = {}
    ) => {
      trackEvent('custom', 'appointment_cancelled', {
        appointment_id: appointmentId,
        cancellation_reason: options.reason,
        barber_id: options.barberId,
        user_role: options.userRole
      }, options.userData, `${appointmentId}_cancelled`)
    }, [trackEvent]),

    completed: useCallback((
      appointmentId: string,
      options: {
        barberId?: string
        serviceName?: string
        actualDuration?: number
        customerRating?: number
        userRole?: string
        locationId?: string
        userData?: UserData
      } = {}
    ) => {
      trackEvent('custom', 'appointment_completed', {
        appointment_id: appointmentId,
        barber_id: options.barberId,
        service_name: options.serviceName,
        actual_duration: options.actualDuration,
        customer_rating: options.customerRating,
        user_role: options.userRole,
        location_id: options.locationId
      }, options.userData, `${appointmentId}_completed`)
    }, [trackEvent])
  }

  /**
   * Simplified payment tracking
   */
  const payment = {
    initiated: useCallback((
      transactionId: string,
      amount: number,
      options: {
        method?: string
        appointmentId?: string
        currency?: string
        userRole?: string
        userData?: UserData
      } = {}
    ) => {
      trackEvent('standard', 'InitiateCheckout', {
        content_ids: [transactionId],
        content_type: 'payment',
        currency: options.currency || 'USD',
        value: amount,
        payment_method: options.method,
        appointment_id: options.appointmentId,
        user_role: options.userRole
      }, options.userData, transactionId)

      trackEvent('custom', 'payment_initiated', {
        transaction_id: transactionId,
        amount: amount,
        currency: options.currency || 'USD',
        payment_method: options.method,
        appointment_id: options.appointmentId,
        user_role: options.userRole
      }, options.userData, transactionId)
    }, [trackEvent]),

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
        userData?: UserData
      } = {}
    ) => {
      trackEvent('standard', 'Purchase', {
        content_ids: [options.appointmentId || transactionId],
        content_type: 'payment',
        currency: options.currency || 'USD',
        value: amount,
        payment_method: options.method,
        appointment_id: options.appointmentId,
        barber_id: options.barberId,
        service_name: options.serviceName,
        user_role: options.userRole
      }, options.userData, transactionId)
    }, [trackEvent]),

    failed: useCallback((
      transactionId: string,
      amount: number,
      error: string,
      options: {
        method?: string
        errorCode?: string
        userRole?: string
        userData?: UserData
      } = {}
    ) => {
      trackEvent('custom', 'payment_failed', {
        transaction_id: transactionId,
        amount: amount,
        currency: 'USD',
        payment_method: options.method,
        error_message: error,
        error_code: options.errorCode,
        user_role: options.userRole
      }, options.userData, `${transactionId}_failed`)
    }, [trackEvent])
  }

  /**
   * Simplified user tracking
   */
  const user = {
    registered: useCallback((
      userId: string,
      role: string,
      options: {
        method?: string
        source?: string
        locationId?: string
        userData?: UserData
      } = {}
    ) => {
      trackEvent('standard', 'CompleteRegistration', {
        content_name: `${role}_registration`,
        status: true,
        user_role: role,
        registration_method: options.method || 'email',
        referral_source: options.source,
        location_id: options.locationId
      }, options.userData, userId)
    }, [trackEvent]),

    loggedIn: useCallback((
      userId: string,
      role: string,
      options: {
        method?: string
        locationId?: string
        userData?: UserData
      } = {}
    ) => {
      trackEvent('custom', 'user_login', {
        user_id: userId,
        user_role: role,
        login_method: options.method || 'email',
        location_id: options.locationId
      }, options.userData, `${userId}_login`)
    }, [trackEvent])
  }

  /**
   * Simplified business event tracking
   */
  const business = {
    serviceViewed: useCallback((
      serviceId: string,
      serviceName: string,
      options: {
        barberId?: string
        price?: number
        userRole?: string
        locationId?: string
        userData?: UserData
      } = {}
    ) => {
      trackEvent('standard', 'ViewContent', {
        content_ids: [serviceId],
        content_type: 'service',
        content_name: serviceName,
        currency: 'USD',
        value: options.price,
        barber_id: options.barberId,
        user_role: options.userRole,
        location_id: options.locationId
      }, options.userData, `service_${serviceId}`)

      trackEvent('custom', 'service_viewed', {
        service_id: serviceId,
        service_name: serviceName,
        barber_id: options.barberId,
        price: options.price,
        user_role: options.userRole,
        location_id: options.locationId
      }, options.userData, `service_${serviceId}`)
    }, [trackEvent]),

    barberSelected: useCallback((
      barberId: string,
      barberName: string,
      options: {
        locationId?: string
        userRole?: string
        userData?: UserData
      } = {}
    ) => {
      trackEvent('custom', 'barber_selected', {
        barber_id: barberId,
        barber_name: barberName,
        location_id: options.locationId,
        user_role: options.userRole
      }, options.userData, `barber_${barberId}`)
    }, [trackEvent]),

    searchPerformed: useCallback((
      searchTerm: string,
      resultCount: number,
      options: {
        filters?: Record<string, any>
        userData?: UserData
      } = {}
    ) => {
      trackEvent('standard', 'Search', {
        search_string: searchTerm,
        content_category: 'barber_search',
        num_items: resultCount,
        custom_data: {
          filters: JSON.stringify(options.filters || {})
        }
      }, options.userData)
    }, [trackEvent])
  }

  /**
   * Lead tracking
   */
  const lead = {
    generated: useCallback((
      leadId: string,
      options: {
        value?: number
        source?: string
        userData?: UserData
      } = {}
    ) => {
      trackEvent('standard', 'Lead', {
        content_ids: [leadId],
        content_type: 'lead',
        value: options.value,
        currency: 'USD',
        lead_id: leadId,
        custom_data: {
          source: options.source
        }
      }, options.userData, leadId)
    }, [trackEvent])
  }

  /**
   * Get debug information
   */
  const getDebugInfo = useCallback(() => {
    return {
      isInitialized,
      hasConsent,
      canTrack,
      config,
      pixelDebugInfo: metaPixel?.getDebugInfo(),
      eventBatchSize: eventBatch.length,
      batchTimerActive: !!batchTimer
    }
  }, [isInitialized, hasConsent, canTrack, config, metaPixel, eventBatch.length, batchTimer])

  return {
    // Core tracking functions
    trackEvent,
    
    // Simplified tracking interfaces
    appointment,
    payment,
    user,
    business,
    lead,

    // Status information
    isInitialized,
    hasConsent,
    canTrack,
    config,
    
    // Debug information
    getDebugInfo
  }
}

export default useMetaTracking