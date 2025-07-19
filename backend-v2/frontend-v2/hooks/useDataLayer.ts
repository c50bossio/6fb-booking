/**
 * useDataLayer Hook - GTM DataLayer Management for React Components
 * BookedBarber V2 - Advanced Conversion Tracking and Analytics
 * 
 * This hook provides comprehensive DataLayer management for React components:
 * - Centralized dataLayer operations
 * - Type-safe event definitions
 * - Business event mapping
 * - State synchronization with GTM
 * - Integration with existing analytics
 * - Performance optimizations
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  getGTM, 
  initGTM, 
  trackGTMEvent, 
  trackGTMPageView,
  trackGTMAppointmentBooked,
  trackGTMPaymentCompleted,
  trackGTMUserRegistration,
  trackGTMCustomEvent,
  updateGTMConsent,
  setGTMCustomDimension,
  setGTMCustomMetric,
  flushGTMEvents,
  type GTMEvent,
  type GTMEcommerceItem,
  GTMEventType
} from '../lib/gtm';
import { analytics } from '../lib/analytics';

// DataLayer Event Types for BookedBarber
export interface BookedBarberEvents {
  // Page Events
  page_view: {
    page_path: string;
    page_title: string;
    page_referrer?: string;
    user_type?: 'anonymous' | 'customer' | 'barber' | 'admin';
    location_id?: string;
  };
  
  // Authentication Events
  user_login: {
    method: 'email' | 'google' | 'facebook';
    user_role: 'customer' | 'barber' | 'admin';
    location_id?: string;
  };
  
  user_register: {
    method: 'email' | 'google' | 'facebook';
    user_role: 'customer' | 'barber' | 'admin';
    location_id?: string;
  };
  
  user_logout: {
    session_duration: number;
    pages_viewed: number;
  };
  
  // Booking Events
  appointment_start: {
    barber_id: string;
    service_id: string;
    location_id: string;
    appointment_date: string;
    appointment_time: string;
  };
  
  appointment_booked: {
    appointment_id: string;
    barber_id: string;
    service_id: string;
    location_id: string;
    appointment_value: number;
    appointment_date: string;
    appointment_time: string;
    booking_method: 'web' | 'mobile' | 'admin';
  };
  
  appointment_confirmed: {
    appointment_id: string;
    confirmation_method: 'email' | 'sms' | 'auto';
    time_to_confirm: number;
  };
  
  appointment_cancelled: {
    appointment_id: string;
    cancellation_reason: string;
    cancelled_by: 'customer' | 'barber' | 'admin';
    advance_notice_hours: number;
  };
  
  appointment_rescheduled: {
    appointment_id: string;
    old_date: string;
    new_date: string;
    reschedule_reason: string;
  };
  
  // Payment Events
  payment_start: {
    appointment_id: string;
    amount: number;
    payment_method: 'card' | 'cash' | 'other';
  };
  
  payment_completed: {
    payment_id: string;
    appointment_id: string;
    amount: number;
    payment_method: 'card' | 'cash' | 'other';
    processing_time: number;
  };
  
  payment_failed: {
    appointment_id: string;
    amount: number;
    payment_method: 'card' | 'cash' | 'other';
    error_code: string;
    error_message: string;
  };
  
  // Search & Discovery Events
  search_performed: {
    search_term: string;
    search_type: 'barber' | 'service' | 'location';
    results_count: number;
  };
  
  service_viewed: {
    service_id: string;
    service_name: string;
    service_price: number;
    location_id: string;
  };
  
  barber_viewed: {
    barber_id: string;
    barber_name: string;
    location_id: string;
    rating: number;
  };
  
  availability_checked: {
    barber_id: string;
    service_id: string;
    location_id: string;
    date: string;
    available_slots: number;
  };
  
  // Engagement Events
  form_started: {
    form_name: string;
    form_type: 'booking' | 'contact' | 'registration' | 'payment';
  };
  
  form_completed: {
    form_name: string;
    form_type: 'booking' | 'contact' | 'registration' | 'payment';
    completion_time: number;
  };
  
  button_clicked: {
    button_text: string;
    button_location: string;
    page_path: string;
  };
  
  link_clicked: {
    link_text: string;
    link_url: string;
    link_type: 'internal' | 'external';
  };
  
  // Business Events
  review_submitted: {
    appointment_id: string;
    barber_id: string;
    rating: number;
    has_comment: boolean;
  };
  
  calendar_synced: {
    barber_id: string;
    sync_type: 'google' | 'outlook' | 'apple';
    appointments_synced: number;
  };
  
  notification_sent: {
    notification_type: 'reminder' | 'confirmation' | 'cancellation';
    method: 'email' | 'sms';
    appointment_id: string;
  };
  
  // Error Events
  error_occurred: {
    error_type: string;
    error_message: string;
    page_path: string;
    user_action: string;
  };
  
  // Custom Events
  custom_event: {
    event_category: string;
    event_action: string;
    event_label?: string;
    event_value?: number;
    [key: string]: any;
  };
}

// DataLayer State Interface
export interface DataLayerState {
  isInitialized: boolean;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  consentGranted: Record<string, boolean>;
  customDimensions: Record<string, any>;
  customMetrics: Record<string, number>;
  sessionInfo: {
    sessionId: string;
    clientId: string;
    startTime: number;
    pageViews: number;
    eventsTracked: number;
  };
}

// DataLayer Configuration
export interface DataLayerConfig {
  enableAutoTracking?: boolean;
  enableBatching?: boolean;
  enableFallback?: boolean;
  enableDebugMode?: boolean;
  enableValidation?: boolean;
  customDimensions?: Record<string, string>;
  customMetrics?: Record<string, string>;
  consentSettings?: Record<string, boolean>;
}

// Custom Hook for DataLayer Management
export const useDataLayer = (config?: DataLayerConfig) => {
  // State Management
  const [state, setState] = useState<DataLayerState>({
    isInitialized: false,
    isLoading: true,
    hasError: false,
    consentGranted: {},
    customDimensions: {},
    customMetrics: {},
    sessionInfo: {
      sessionId: '',
      clientId: '',
      startTime: Date.now(),
      pageViews: 0,
      eventsTracked: 0
    }
  });
  
  // Refs for tracking
  const eventCountRef = useRef(0);
  const pageViewCountRef = useRef(0);
  const sessionStartRef = useRef(Date.now());
  const lastEventTimeRef = useRef(Date.now());
  
  // Initialize GTM and DataLayer
  useEffect(() => {
    const initializeDataLayer = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, hasError: false }));
        
        // Initialize GTM
        const gtmConfig = {
          debugMode: config?.enableDebugMode || false,
          validateEvents: config?.enableValidation !== false,
          batchEvents: config?.enableBatching !== false,
          fallbackTracking: config?.enableFallback !== false,
          customDimensions: config?.customDimensions || {},
          customMetrics: config?.customMetrics || {}
        };
        
        const gtm = initGTM(gtmConfig);
        
        // Wait for initialization
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds
        
        while (!gtm.isInitialized() && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (gtm.isInitialized()) {
          // Update state with GTM info
          setState(prev => ({
            ...prev,
            isInitialized: true,
            isLoading: false,
            consentGranted: gtm.getConsent(),
            sessionInfo: {
              ...prev.sessionInfo,
              sessionId: gtm.getSessionId(),
              clientId: gtm.getClientId()
            }
          }));
          
          // Set up auto tracking if enabled
          if (config?.enableAutoTracking !== false) {
            setupAutoTracking();
          }
          
          // Set consent if provided
          if (config?.consentSettings) {
            updateConsent(config.consentSettings);
          }
          
        } else {
          throw new Error('GTM initialization timeout');
        }
        
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          hasError: true,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }));
        
        // Fallback to GA4 if available
        if (config?.enableFallback !== false && analytics) {
          }
      }
    };
    
    initializeDataLayer();
  }, [config]);
  
  // Auto Tracking Setup
  const setupAutoTracking = useCallback(() => {
    // Track initial page view
    trackPageView();
    
    // Set up visibility change tracking
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushEvents();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Set up beforeunload tracking
    const handleBeforeUnload = () => {
      flushEvents();
      trackSessionEnd();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
  
  // Track Page View
  const trackPageView = useCallback((
    customData?: Partial<BookedBarberEvents['page_view']>
  ) => {
    try {
      pageViewCountRef.current += 1;
      
      const pageViewData: BookedBarberEvents['page_view'] = {
        page_path: window.location.pathname,
        page_title: document.title,
        page_referrer: document.referrer,
        ...customData
      };
      
      const success = trackGTMPageView(
        window.location.href,
        document.title,
        document.referrer,
        pageViewData
      );
      
      if (success) {
        setState(prev => ({
          ...prev,
          sessionInfo: {
            ...prev.sessionInfo,
            pageViews: pageViewCountRef.current
          }
        }));
      }
      
      // Fallback to GA4
      if (!success && analytics) {
        analytics.track('page_view', pageViewData);
      }
      
      return success;
    } catch (error) {
      return false;
    }
  }, []);
  
  // Track Appointment Events
  const trackAppointmentBooked = useCallback((
    data: BookedBarberEvents['appointment_booked']
  ) => {
    try {
      const success = trackGTMAppointmentBooked(
        data.appointment_id,
        data.barber_id,
        data.service_id,
        data.appointment_value,
        data.location_id,
        {
          appointment_date: data.appointment_date,
          appointment_time: data.appointment_time,
          booking_method: data.booking_method
        }
      );
      
      if (success) {
        incrementEventCount();
      }
      
      // Fallback to GA4
      if (!success && analytics) {
        analytics.track('appointment_booked', data);
      }
      
      return success;
    } catch (error) {
      return false;
    }
  }, []);
  
  // Track Payment Events
  const trackPaymentCompleted = useCallback((
    data: BookedBarberEvents['payment_completed']
  ) => {
    try {
      const success = trackGTMPaymentCompleted(
        data.payment_id,
        data.appointment_id,
        data.amount,
        data.payment_method,
        {
          processing_time: data.processing_time
        }
      );
      
      if (success) {
        incrementEventCount();
      }
      
      // Fallback to GA4
      if (!success && analytics) {
        analytics.track('payment_completed', data);
      }
      
      return success;
    } catch (error) {
      return false;
    }
  }, []);
  
  // Track User Registration
  const trackUserRegistration = useCallback((
    data: BookedBarberEvents['user_register']
  ) => {
    try {
      const success = trackGTMUserRegistration(
        '', // User ID will be set by the system
        data.method,
        data.user_role,
        {
          location_id: data.location_id
        }
      );
      
      if (success) {
        incrementEventCount();
      }
      
      // Fallback to GA4
      if (!success && analytics) {
        analytics.track('user_register', data);
      }
      
      return success;
    } catch (error) {
      return false;
    }
  }, []);
  
  // Track Custom Events
  const trackEvent = useCallback(<T extends keyof BookedBarberEvents>(
    eventName: T,
    eventData: BookedBarberEvents[T]
  ) => {
    try {
      // Map event to GTM event type
      const gtmEventType = mapEventToGTMType(eventName);
      
      const gtmEvent: GTMEvent = {
        event: eventName,
        event_type: gtmEventType,
        event_parameters: eventData,
        custom_dimensions: eventData
      };
      
      const success = trackGTMEvent(gtmEvent);
      
      if (success) {
        incrementEventCount();
        lastEventTimeRef.current = Date.now();
      }
      
      // Fallback to GA4
      if (!success && analytics) {
        analytics.track(eventName, eventData);
      }
      
      return success;
    } catch (error) {
      return false;
    }
  }, []);
  
  // Track Business-Specific Events
  const trackAppointmentStart = useCallback((
    data: BookedBarberEvents['appointment_start']
  ) => trackEvent('appointment_start', data), [trackEvent]);
  
  const trackAppointmentConfirmed = useCallback((
    data: BookedBarberEvents['appointment_confirmed']
  ) => trackEvent('appointment_confirmed', data), [trackEvent]);
  
  const trackAppointmentCancelled = useCallback((
    data: BookedBarberEvents['appointment_cancelled']
  ) => trackEvent('appointment_cancelled', data), [trackEvent]);
  
  const trackPaymentStart = useCallback((
    data: BookedBarberEvents['payment_start']
  ) => trackEvent('payment_start', data), [trackEvent]);
  
  const trackPaymentFailed = useCallback((
    data: BookedBarberEvents['payment_failed']
  ) => trackEvent('payment_failed', data), [trackEvent]);
  
  const trackSearchPerformed = useCallback((
    data: BookedBarberEvents['search_performed']
  ) => trackEvent('search_performed', data), [trackEvent]);
  
  const trackServiceViewed = useCallback((
    data: BookedBarberEvents['service_viewed']
  ) => trackEvent('service_viewed', data), [trackEvent]);
  
  const trackBarberViewed = useCallback((
    data: BookedBarberEvents['barber_viewed']
  ) => trackEvent('barber_viewed', data), [trackEvent]);
  
  const trackFormStarted = useCallback((
    data: BookedBarberEvents['form_started']
  ) => trackEvent('form_started', data), [trackEvent]);
  
  const trackFormCompleted = useCallback((
    data: BookedBarberEvents['form_completed']
  ) => trackEvent('form_completed', data), [trackEvent]);
  
  const trackButtonClicked = useCallback((
    data: BookedBarberEvents['button_clicked']
  ) => trackEvent('button_clicked', data), [trackEvent]);
  
  const trackReviewSubmitted = useCallback((
    data: BookedBarberEvents['review_submitted']
  ) => trackEvent('review_submitted', data), [trackEvent]);
  
  const trackError = useCallback((
    data: BookedBarberEvents['error_occurred']
  ) => trackEvent('error_occurred', data), [trackEvent]);
  
  // Consent Management
  const updateConsent = useCallback((consent: Record<string, boolean>) => {
    try {
      updateGTMConsent(consent);
      setState(prev => ({
        ...prev,
        consentGranted: { ...prev.consentGranted, ...consent }
      }));
      return true;
    } catch (error) {
      return false;
    }
  }, []);
  
  // Custom Dimensions and Metrics
  const setCustomDimension = useCallback((name: string, value: any) => {
    try {
      setGTMCustomDimension(name, value);
      setState(prev => ({
        ...prev,
        customDimensions: { ...prev.customDimensions, [name]: value }
      }));
      return true;
    } catch (error) {
      return false;
    }
  }, []);
  
  const setCustomMetric = useCallback((name: string, value: number) => {
    try {
      setGTMCustomMetric(name, value);
      setState(prev => ({
        ...prev,
        customMetrics: { ...prev.customMetrics, [name]: value }
      }));
      return true;
    } catch (error) {
      return false;
    }
  }, []);
  
  // Session Management
  const trackSessionEnd = useCallback(() => {
    const sessionDuration = Date.now() - sessionStartRef.current;
    const sessionData = {
      session_duration: Math.round(sessionDuration / 1000),
      pages_viewed: pageViewCountRef.current,
      events_tracked: eventCountRef.current,
      last_event_time: lastEventTimeRef.current
    };
    
    return trackEvent('user_logout', {
      session_duration: sessionData.session_duration,
      pages_viewed: sessionData.pages_viewed
    });
  }, [trackEvent]);
  
  // Event Management
  const flushEvents = useCallback(() => {
    try {
      return flushGTMEvents();
    } catch (error) {
      return false;
    }
  }, []);
  
  // Helper Functions
  const incrementEventCount = useCallback(() => {
    eventCountRef.current += 1;
    setState(prev => ({
      ...prev,
      sessionInfo: {
        ...prev.sessionInfo,
        eventsTracked: eventCountRef.current
      }
    }));
  }, []);
  
  const mapEventToGTMType = (eventName: string): GTMEventType => {
    const eventTypeMap: Record<string, GTMEventType> = {
      'page_view': GTMEventType.PAGE_VIEW,
      'appointment_booked': GTMEventType.APPOINTMENT_BOOKED,
      'appointment_confirmed': GTMEventType.APPOINTMENT_CONFIRMED,
      'appointment_cancelled': GTMEventType.APPOINTMENT_CANCELLED,
      'payment_start': GTMEventType.PAYMENT_INITIATED,
      'payment_completed': GTMEventType.PAYMENT_COMPLETED,
      'payment_failed': GTMEventType.PAYMENT_FAILED,
      'user_register': GTMEventType.USER_REGISTERED,
      'user_login': GTMEventType.USER_LOGIN,
      'form_started': GTMEventType.FORM_SUBMITTED,
      'form_completed': GTMEventType.FORM_SUBMITTED,
      'search_performed': GTMEventType.SEARCH_PERFORMED,
      'service_viewed': GTMEventType.SERVICE_SELECTED,
      'barber_viewed': GTMEventType.BARBER_SELECTED,
      'availability_checked': GTMEventType.AVAILABILITY_CHECKED,
      'review_submitted': GTMEventType.REVIEW_SUBMITTED,
      'button_clicked': GTMEventType.BUTTON_CLICKED,
      'link_clicked': GTMEventType.LINK_CLICKED
    };
    
    return eventTypeMap[eventName] || GTMEventType.CUSTOM_EVENT;
  };
  
  // Return hook interface
  return {
    // State
    ...state,
    
    // Page Tracking
    trackPageView,
    
    // Appointment Tracking
    trackAppointmentStart,
    trackAppointmentBooked,
    trackAppointmentConfirmed,
    trackAppointmentCancelled,
    
    // Payment Tracking
    trackPaymentStart,
    trackPaymentCompleted,
    trackPaymentFailed,
    
    // User Tracking
    trackUserRegistration,
    
    // Engagement Tracking
    trackSearchPerformed,
    trackServiceViewed,
    trackBarberViewed,
    trackFormStarted,
    trackFormCompleted,
    trackButtonClicked,
    trackReviewSubmitted,
    
    // Error Tracking
    trackError,
    
    // Generic Event Tracking
    trackEvent,
    
    // Consent Management
    updateConsent,
    
    // Custom Dimensions/Metrics
    setCustomDimension,
    setCustomMetric,
    
    // Session Management
    trackSessionEnd,
    
    // Event Management
    flushEvents
  };
};

// Export types
export type { BookedBarberEvents, DataLayerState, DataLayerConfig };

// Export the hook
export default useDataLayer;