/**
 * Google Tag Manager (GTM) Client-Side Library
 * BookedBarber V2 - Advanced Conversion Tracking and Analytics
 * 
 * This library provides comprehensive client-side GTM integration for:
 * - GTM container initialization
 * - DataLayer management
 * - Event tracking to GTM
 * - Enhanced ecommerce tracking
 * - Integration with existing GA4 setup
 * - Privacy-compliant data handling
 */

import { analytics } from './analytics';

// GTM Configuration Interface
interface GTMConfig {
  containerId: string;
  containerPublicId?: string;
  environmentName?: string;
  environmentAuth?: string;
  environmentPreview?: string;
  debugMode?: boolean;
  previewMode?: boolean;
  consentMode?: boolean;
  anonymizeIP?: boolean;
  respectDNT?: boolean;
  customDimensions?: Record<string, string>;
  customMetrics?: Record<string, string>;
  enhancedEcommerce?: boolean;
  ecommerceTracking?: boolean;
  conversionTracking?: boolean;
  crossDomainTracking?: boolean;
  conversionLinker?: boolean;
  conversionLinkerDomains?: string[];
  serverSideTagging?: boolean;
  serverContainerUrl?: string;
  testMode?: boolean;
  validateEvents?: boolean;
  logEvents?: boolean;
  asyncLoading?: boolean;
  deferLoading?: boolean;
  lazyLoading?: boolean;
  errorHandling?: boolean;
  fallbackTracking?: boolean;
  autoPageViews?: boolean;
  autoScrollTracking?: boolean;
  autoOutboundLinks?: boolean;
  autoFormTracking?: boolean;
  autoElementVisibility?: boolean;
  dataLayerName?: string;
  dataLayerLimit?: number;
  dataLayerTimeout?: number;
  eventTimeout?: number;
  batchEvents?: boolean;
  batchSize?: number;
  batchTimeout?: number;
}

// GTM Event Types
export enum GTMEventType {
  PAGE_VIEW = 'page_view',
  APPOINTMENT_BOOKED = 'appointment_booked',
  APPOINTMENT_CONFIRMED = 'appointment_confirmed',
  APPOINTMENT_CANCELLED = 'appointment_cancelled',
  PAYMENT_INITIATED = 'payment_initiated',
  PAYMENT_COMPLETED = 'payment_completed',
  PAYMENT_FAILED = 'payment_failed',
  USER_REGISTERED = 'user_registered',
  USER_LOGIN = 'user_login',
  FORM_SUBMITTED = 'form_submitted',
  SEARCH_PERFORMED = 'search_performed',
  SERVICE_SELECTED = 'service_selected',
  BARBER_SELECTED = 'barber_selected',
  AVAILABILITY_CHECKED = 'availability_checked',
  REVIEW_SUBMITTED = 'review_submitted',
  CALENDAR_SYNC = 'calendar_sync',
  BUTTON_CLICKED = 'button_clicked',
  LINK_CLICKED = 'link_clicked',
  SCROLL_MILESTONE = 'scroll_milestone',
  TIME_ON_PAGE = 'time_on_page',
  CUSTOM_EVENT = 'custom_event'
}

// GTM Ecommerce Item Interface
export interface GTMEcommerceItem {
  item_id: string;
  item_name: string;
  item_category: string;
  item_brand?: string;
  price?: number;
  quantity?: number;
  item_variant?: string;
  item_list_name?: string;
  item_list_id?: string;
  index?: number;
  affiliation?: string;
  coupon?: string;
  discount?: number;
  promotion_id?: string;
  promotion_name?: string;
  creative_name?: string;
  creative_slot?: string;
  location_id?: string;
}

// GTM Event Interface
export interface GTMEvent {
  event: string;
  event_type?: GTMEventType;
  client_id?: string;
  user_id?: string;
  session_id?: string;
  timestamp?: string;
  page_location?: string;
  page_title?: string;
  page_referrer?: string;
  language?: string;
  screen_resolution?: string;
  viewport_size?: string;
  user_agent?: string;
  custom_dimensions?: Record<string, any>;
  custom_metrics?: Record<string, number>;
  ecommerce?: {
    items?: GTMEcommerceItem[];
    currency?: string;
    value?: number;
    transaction_id?: string;
    affiliation?: string;
    coupon?: string;
    shipping?: number;
    tax?: number;
  };
  event_parameters?: Record<string, any>;
  consent?: Record<string, boolean>;
  [key: string]: any;
}

// DataLayer Type Declaration
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
    gtm: {
      start: number;
      uniqueEventId: number;
    };
    google_tag_manager: any;
    GoogleAnalyticsObject: string;
  }
}

class GTMManager {
  private config: GTMConfig;
  private initialized = false;
  private eventQueue: GTMEvent[] = [];
  private isLoading = false;
  private customDimensions: Record<string, string> = {};
  private customMetrics: Record<string, string> = {};
  private batchQueue: GTMEvent[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private lastEventTime = 0;
  private sessionId: string;
  private clientId: string;
  private pageLoadTime: number;
  private consentGranted: Record<string, boolean> = {};
  
  constructor(config: GTMConfig) {
    this.config = {
      debugMode: false,
      previewMode: false,
      consentMode: true,
      anonymizeIP: true,
      respectDNT: true,
      enhancedEcommerce: true,
      ecommerceTracking: true,
      conversionTracking: true,
      crossDomainTracking: false,
      conversionLinker: true,
      conversionLinkerDomains: [],
      serverSideTagging: false,
      testMode: false,
      validateEvents: true,
      logEvents: false,
      asyncLoading: true,
      deferLoading: false,
      lazyLoading: false,
      errorHandling: true,
      fallbackTracking: true,
      autoPageViews: true,
      autoScrollTracking: true,
      autoOutboundLinks: true,
      autoFormTracking: true,
      autoElementVisibility: true,
      dataLayerName: 'dataLayer',
      dataLayerLimit: 150,
      dataLayerTimeout: 5000,
      eventTimeout: 2000,
      batchEvents: true,
      batchSize: 10,
      batchTimeout: 1000,
      ...config
    };
    
    // Initialize IDs
    this.sessionId = this.generateSessionId();
    this.clientId = this.generateClientId();
    this.pageLoadTime = Date.now();
    
    // Parse custom dimensions and metrics
    this.parseCustomDimensions();
    this.parseCustomMetrics();
    
    // Initialize consent
    this.initializeConsent();
    
    // Start initialization
    this.init();
  }
  
  private generateSessionId(): string {
    return `gtm_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  private generateClientId(): string {
    // Try to get existing client ID from storage
    const existingId = localStorage.getItem('gtm_client_id');
    if (existingId) {
      return existingId;
    }
    
    // Generate new client ID
    const clientId = `${Date.now()}.${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('gtm_client_id', clientId);
    return clientId;
  }
  
  private parseCustomDimensions(): void {
    try {
      if (this.config.customDimensions) {
        if (typeof this.config.customDimensions === 'string') {
          this.customDimensions = JSON.parse(this.config.customDimensions);
        } else {
          this.customDimensions = this.config.customDimensions;
        }
      }
    } catch (error) {
      console.error('Error parsing GTM custom dimensions:', error);
    }
  }
  
  private parseCustomMetrics(): void {
    try {
      if (this.config.customMetrics) {
        if (typeof this.config.customMetrics === 'string') {
          this.customMetrics = JSON.parse(this.config.customMetrics);
        } else {
          this.customMetrics = this.config.customMetrics;
        }
      }
    } catch (error) {
      console.error('Error parsing GTM custom metrics:', error);
    }
  }
  
  private initializeConsent(): void {
    if (this.config.consentMode) {
      // Initialize with default consent settings
      this.consentGranted = {
        analytics_storage: false,
        ad_storage: false,
        functionality_storage: true,
        personalization_storage: false,
        security_storage: true
      };
      
      // Check for existing consent
      const storedConsent = localStorage.getItem('gtm_consent');
      if (storedConsent) {
        try {
          this.consentGranted = { ...this.consentGranted, ...JSON.parse(storedConsent) };
        } catch (error) {
          console.error('Error parsing stored consent:', error);
        }
      }
    }
  }
  
  private async init(): Promise<void> {
    if (this.initialized || this.isLoading) {
      return;
    }
    
    this.isLoading = true;
    
    try {
      // Check if GTM should be loaded
      if (!this.shouldLoadGTM()) {
        this.log('GTM loading skipped due to privacy settings');
        this.isLoading = false;
        return;
      }
      
      // Initialize dataLayer
      this.initializeDataLayer();
      
      // Load GTM script
      await this.loadGTMScript();
      
      // Configure GTM
      this.configureGTM();
      
      // Set up auto-tracking
      this.setupAutoTracking();
      
      // Process queued events
      this.processEventQueue();
      
      this.initialized = true;
      this.log('GTM initialized successfully');
      
      // Send initial page view if enabled
      if (this.config.autoPageViews) {
        this.trackPageView();
      }
      
    } catch (error) {
      console.error('Error initializing GTM:', error);
      
      // Fallback to GA4 if available
      if (this.config.fallbackTracking) {
        this.setupFallbackTracking();
      }
    } finally {
      this.isLoading = false;
    }
  }
  
  private shouldLoadGTM(): boolean {
    // Check Do Not Track
    if (this.config.respectDNT && navigator.doNotTrack === '1') {
      return false;
    }
    
    // Check if container ID is configured
    if (!this.config.containerId) {
      this.log('GTM container ID not configured');
      return false;
    }
    
    // Check consent
    if (this.config.consentMode && !this.consentGranted.analytics_storage) {
      this.log('GTM loading blocked by consent settings');
      return false;
    }
    
    return true;
  }
  
  private initializeDataLayer(): void {
    // Initialize global dataLayer
    window.dataLayer = window.dataLayer || [];
    
    // Set initial dataLayer values
    window.dataLayer.push({
      'gtm.start': Date.now(),
      'gtm.uniqueEventId': 0,
      'gtm.load': true,
      'event': 'gtm.js',
      'client_id': this.clientId,
      'session_id': this.sessionId,
      'page_load_time': this.pageLoadTime
    });
    
    // Add consent information
    if (this.config.consentMode) {
      window.dataLayer.push({
        'event': 'consent_default',
        'consent': this.consentGranted
      });
    }
  }
  
  private async loadGTMScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Build GTM URL
        let gtmUrl = `https://www.googletagmanager.com/gtm.js?id=${this.config.containerId}`;
        
        // Add environment parameters
        if (this.config.environmentAuth && this.config.environmentPreview) {
          gtmUrl += `&gtm_auth=${this.config.environmentAuth}&gtm_preview=${this.config.environmentPreview}&gtm_cookies_win=x`;
        }
        
        // Add debug parameters
        if (this.config.debugMode) {
          gtmUrl += '&gtm_debug=1';
        }
        
        // Create script element
        const script = document.createElement('script');
        script.async = this.config.asyncLoading;
        script.defer = this.config.deferLoading;
        script.src = gtmUrl;
        
        // Handle script load
        script.onload = () => {
          this.log('GTM script loaded successfully');
          resolve();
        };
        
        script.onerror = (error) => {
          console.error('Error loading GTM script:', error);
          reject(error);
        };
        
        // Add script to document
        document.head.appendChild(script);
        
      } catch (error) {
        reject(error);
      }
    });
  }
  
  private configureGTM(): void {
    // Configure GTM settings
    this.push({
      'event': 'gtm.config',
      'gtm.container_id': this.config.containerId,
      'gtm.debug_mode': this.config.debugMode,
      'gtm.preview_mode': this.config.previewMode,
      'gtm.anonymize_ip': this.config.anonymizeIP,
      'gtm.enhanced_ecommerce': this.config.enhancedEcommerce,
      'gtm.conversion_linker': this.config.conversionLinker,
      'gtm.cross_domain_tracking': this.config.crossDomainTracking
    });
    
    // Configure conversion linker domains
    if (this.config.conversionLinker && this.config.conversionLinkerDomains?.length) {
      this.push({
        'event': 'gtm.linker',
        'gtm.linker_domains': this.config.conversionLinkerDomains
      });
    }
    
    // Configure server-side tagging
    if (this.config.serverSideTagging && this.config.serverContainerUrl) {
      this.push({
        'event': 'gtm.server_side',
        'gtm.server_container_url': this.config.serverContainerUrl
      });
    }
  }
  
  private setupAutoTracking(): void {
    // Auto scroll tracking
    if (this.config.autoScrollTracking) {
      this.setupScrollTracking();
    }
    
    // Auto outbound link tracking
    if (this.config.autoOutboundLinks) {
      this.setupOutboundLinkTracking();
    }
    
    // Auto form tracking
    if (this.config.autoFormTracking) {
      this.setupFormTracking();
    }
    
    // Auto element visibility tracking
    if (this.config.autoElementVisibility) {
      this.setupElementVisibilityTracking();
    }
  }
  
  private setupScrollTracking(): void {
    let scrollMilestones = [25, 50, 75, 90, 100];
    let trackedMilestones = new Set<number>();
    
    const handleScroll = (): void => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
      );
      
      for (const milestone of scrollMilestones) {
        if (scrollPercent >= milestone && !trackedMilestones.has(milestone)) {
          trackedMilestones.add(milestone);
          this.trackEvent({
            event: 'scroll_milestone',
            event_type: GTMEventType.SCROLL_MILESTONE,
            scroll_percent: milestone,
            page_location: window.location.href,
            page_title: document.title
          });
        }
      }
    };
    
    // Throttle scroll events
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(handleScroll, 100);
    });
  }
  
  private setupOutboundLinkTracking(): void {
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');
      
      if (link && link.href) {
        const url = new URL(link.href);
        const currentDomain = window.location.hostname;
        
        // Check if it's an outbound link
        if (url.hostname !== currentDomain) {
          this.trackEvent({
            event: 'outbound_link_click',
            event_type: GTMEventType.LINK_CLICKED,
            link_url: link.href,
            link_text: link.textContent || '',
            link_domain: url.hostname,
            page_location: window.location.href
          });
        }
      }
    });
  }
  
  private setupFormTracking(): void {
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      
      if (form && form.tagName === 'FORM') {
        const formData = new FormData(form);
        const formFields = Array.from(formData.keys());
        
        this.trackEvent({
          event: 'form_submit',
          event_type: GTMEventType.FORM_SUBMITTED,
          form_id: form.id || 'unknown',
          form_name: form.name || 'unknown',
          form_fields: formFields,
          page_location: window.location.href
        });
      }
    });
  }
  
  private setupElementVisibilityTracking(): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const element = entry.target as HTMLElement;
          const elementId = element.id || element.className || 'unknown';
          
          this.trackEvent({
            event: 'element_visible',
            event_type: GTMEventType.CUSTOM_EVENT,
            element_id: elementId,
            element_type: element.tagName.toLowerCase(),
            visibility_ratio: entry.intersectionRatio,
            page_location: window.location.href
          });
        }
      });
    }, {
      threshold: [0.5, 1.0]
    });
    
    // Observe elements with tracking attributes
    const trackingElements = document.querySelectorAll('[data-gtm-track-visibility="true"]');
    trackingElements.forEach((element) => observer.observe(element));
  }
  
  private setupFallbackTracking(): void {
    // Fallback to GA4 analytics if available
    if (analytics && typeof analytics.track === 'function') {
      this.log('Setting up fallback tracking with GA4');
      
      // Override track method to use GA4
      const originalTrack = this.trackEvent.bind(this);
      this.trackEvent = (event: GTMEvent) => {
        // Try GTM first
        const gtmResult = originalTrack(event);
        
        // Fallback to GA4
        if (!gtmResult && analytics) {
          analytics.track(event.event, event.event_parameters || {});
        }
        
        return gtmResult;
      };
    }
  }
  
  private processEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.trackEvent(event);
      }
    }
  }
  
  private validateEvent(event: GTMEvent): boolean {
    if (!this.config.validateEvents) {
      return true;
    }
    
    // Basic validation
    if (!event.event || typeof event.event !== 'string') {
      console.error('GTM event missing or invalid event name:', event);
      return false;
    }
    
    // Validate ecommerce items
    if (event.ecommerce?.items) {
      for (const item of event.ecommerce.items) {
        if (!item.item_id || !item.item_name) {
          console.error('GTM ecommerce item missing required fields:', item);
          return false;
        }
      }
    }
    
    return true;
  }
  
  private enrichEvent(event: GTMEvent): GTMEvent {
    const enrichedEvent: GTMEvent = {
      ...event,
      client_id: this.clientId,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
      page_location: window.location.href,
      page_title: document.title,
      page_referrer: document.referrer,
      language: navigator.language,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      user_agent: navigator.userAgent
    };
    
    // Add custom dimensions
    if (this.customDimensions) {
      enrichedEvent.custom_dimensions = {
        ...enrichedEvent.custom_dimensions,
        ...this.customDimensions
      };
    }
    
    // Add consent information
    if (this.config.consentMode) {
      enrichedEvent.consent = this.consentGranted;
    }
    
    return enrichedEvent;
  }
  
  private push(data: any): void {
    if (typeof window !== 'undefined' && window.dataLayer) {
      window.dataLayer.push(data);
      
      // Enforce dataLayer limit
      if (window.dataLayer.length > this.config.dataLayerLimit!) {
        window.dataLayer.splice(0, window.dataLayer.length - this.config.dataLayerLimit!);
      }
    }
  }
  
  private log(message: string, ...args: any[]): void {
    if (this.config.logEvents || this.config.debugMode) {
      console.log(`[GTM] ${message}`, ...args);
    }
  }
  
  // Public Methods
  
  public trackEvent(event: GTMEvent): boolean {
    try {
      // Queue event if not initialized
      if (!this.initialized && !this.isLoading) {
        this.eventQueue.push(event);
        return true;
      }
      
      // Validate event
      if (!this.validateEvent(event)) {
        return false;
      }
      
      // Enrich event data
      const enrichedEvent = this.enrichEvent(event);
      
      // Log event
      this.log('Tracking event:', enrichedEvent.event, enrichedEvent);
      
      // Handle batching
      if (this.config.batchEvents) {
        return this.addToBatch(enrichedEvent);
      } else {
        return this.sendEvent(enrichedEvent);
      }
      
    } catch (error) {
      console.error('Error tracking GTM event:', error);
      return false;
    }
  }
  
  private addToBatch(event: GTMEvent): boolean {
    this.batchQueue.push(event);
    
    // Check batch size
    if (this.batchQueue.length >= this.config.batchSize!) {
      return this.flushBatch();
    }
    
    // Set timeout for batch
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    this.batchTimeout = setTimeout(() => {
      this.flushBatch();
    }, this.config.batchTimeout!);
    
    return true;
  }
  
  private flushBatch(): boolean {
    if (this.batchQueue.length === 0) {
      return true;
    }
    
    try {
      // Send batch
      this.push({
        'event': 'gtm.batch',
        'gtm.batch_events': this.batchQueue,
        'gtm.batch_size': this.batchQueue.length,
        'gtm.batch_timestamp': Date.now()
      });
      
      this.log(`Sent GTM batch: ${this.batchQueue.length} events`);
      
      // Clear batch
      this.batchQueue = [];
      
      // Clear timeout
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
        this.batchTimeout = null;
      }
      
      return true;
    } catch (error) {
      console.error('Error flushing GTM batch:', error);
      return false;
    }
  }
  
  private sendEvent(event: GTMEvent): boolean {
    try {
      this.push(event);
      return true;
    } catch (error) {
      console.error('Error sending GTM event:', error);
      return false;
    }
  }
  
  public trackPageView(
    url?: string,
    title?: string,
    referrer?: string,
    customDimensions?: Record<string, any>
  ): boolean {
    return this.trackEvent({
      event: 'page_view',
      event_type: GTMEventType.PAGE_VIEW,
      page_location: url || window.location.href,
      page_title: title || document.title,
      page_referrer: referrer || document.referrer,
      custom_dimensions: customDimensions
    });
  }
  
  public trackAppointmentBooked(
    appointmentId: string,
    barberId: string,
    serviceId: string,
    appointmentValue: number,
    locationId?: string,
    customDimensions?: Record<string, any>
  ): boolean {
    const appointmentItem: GTMEcommerceItem = {
      item_id: appointmentId,
      item_name: `Appointment - ${serviceId}`,
      item_category: 'Appointment',
      item_brand: 'BookedBarber',
      price: appointmentValue,
      quantity: 1,
      item_variant: barberId,
      location_id: locationId
    };
    
    return this.trackEvent({
      event: 'appointment_booked',
      event_type: GTMEventType.APPOINTMENT_BOOKED,
      ecommerce: {
        items: [appointmentItem],
        currency: 'USD',
        value: appointmentValue,
        transaction_id: appointmentId
      },
      custom_dimensions: {
        ...customDimensions,
        barber_id: barberId,
        service_id: serviceId,
        appointment_value: appointmentValue,
        location_id: locationId
      }
    });
  }
  
  public trackPaymentCompleted(
    paymentId: string,
    appointmentId: string,
    amount: number,
    paymentMethod: string,
    customDimensions?: Record<string, any>
  ): boolean {
    return this.trackEvent({
      event: 'payment_completed',
      event_type: GTMEventType.PAYMENT_COMPLETED,
      ecommerce: {
        currency: 'USD',
        value: amount,
        transaction_id: paymentId
      },
      custom_dimensions: {
        ...customDimensions,
        payment_method: paymentMethod,
        payment_id: paymentId,
        appointment_id: appointmentId
      }
    });
  }
  
  public trackUserRegistration(
    userId: string,
    registrationMethod: string,
    userRole: string,
    customDimensions?: Record<string, any>
  ): boolean {
    return this.trackEvent({
      event: 'user_registered',
      event_type: GTMEventType.USER_REGISTERED,
      user_id: userId,
      event_parameters: {
        method: registrationMethod,
        user_role: userRole
      },
      custom_dimensions: {
        ...customDimensions,
        user_role: userRole,
        registration_method: registrationMethod
      }
    });
  }
  
  public trackCustomEvent(
    eventName: string,
    eventParameters?: Record<string, any>,
    customDimensions?: Record<string, any>,
    customMetrics?: Record<string, number>,
    ecommerceItems?: GTMEcommerceItem[]
  ): boolean {
    return this.trackEvent({
      event: eventName,
      event_type: GTMEventType.CUSTOM_EVENT,
      event_parameters: eventParameters,
      custom_dimensions: customDimensions,
      custom_metrics: customMetrics,
      ecommerce: ecommerceItems ? { items: ecommerceItems } : undefined
    });
  }
  
  public updateConsent(consent: Record<string, boolean>): void {
    this.consentGranted = { ...this.consentGranted, ...consent };
    
    // Store consent
    localStorage.setItem('gtm_consent', JSON.stringify(this.consentGranted));
    
    // Update GTM
    this.push({
      'event': 'consent_update',
      'consent': this.consentGranted
    });
    
    this.log('Consent updated:', this.consentGranted);
  }
  
  public setCustomDimension(name: string, value: any): void {
    this.customDimensions[name] = value;
    
    // Update dataLayer
    this.push({
      [name]: value
    });
  }
  
  public setCustomMetric(name: string, value: number): void {
    this.customMetrics[name] = value;
    
    // Update dataLayer
    this.push({
      [name]: value
    });
  }
  
  public flushEvents(): boolean {
    return this.flushBatch();
  }
  
  public getConfig(): GTMConfig {
    return { ...this.config };
  }
  
  public getClientId(): string {
    return this.clientId;
  }
  
  public getSessionId(): string {
    return this.sessionId;
  }
  
  public isInitialized(): boolean {
    return this.initialized;
  }
  
  public getConsent(): Record<string, boolean> {
    return { ...this.consentGranted };
  }
}

// Default GTM configuration from environment variables
const defaultConfig: GTMConfig = {
  containerId: process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || '',
  containerPublicId: process.env.NEXT_PUBLIC_GTM_CONTAINER_PUBLIC_ID || '',
  environmentName: process.env.NEXT_PUBLIC_GTM_ENVIRONMENT_NAME || 'Development',
  environmentAuth: process.env.NEXT_PUBLIC_GTM_ENVIRONMENT_AUTH || '',
  environmentPreview: process.env.NEXT_PUBLIC_GTM_ENVIRONMENT_PREVIEW || '',
  debugMode: process.env.NEXT_PUBLIC_GTM_DEBUG_MODE === 'true',
  previewMode: process.env.NEXT_PUBLIC_GTM_PREVIEW_MODE === 'true',
  consentMode: process.env.NEXT_PUBLIC_GTM_CONSENT_MODE === 'true',
  anonymizeIP: process.env.NEXT_PUBLIC_GTM_ANONYMIZE_IP === 'true',
  respectDNT: process.env.NEXT_PUBLIC_GTM_RESPECT_DNT === 'true',
  customDimensions: process.env.NEXT_PUBLIC_GTM_CUSTOM_DIMENSIONS || '{}',
  customMetrics: process.env.NEXT_PUBLIC_GTM_CUSTOM_METRICS || '{}',
  enhancedEcommerce: process.env.NEXT_PUBLIC_GTM_ENHANCED_ECOMMERCE === 'true',
  ecommerceTracking: process.env.NEXT_PUBLIC_GTM_ECOMMERCE_TRACKING === 'true',
  conversionTracking: process.env.NEXT_PUBLIC_GTM_CONVERSION_TRACKING === 'true',
  crossDomainTracking: process.env.NEXT_PUBLIC_GTM_CROSS_DOMAIN_TRACKING === 'true',
  conversionLinker: process.env.NEXT_PUBLIC_GTM_CONVERSION_LINKER === 'true',
  conversionLinkerDomains: JSON.parse(process.env.NEXT_PUBLIC_GTM_CONVERSION_LINKER_DOMAINS || '[]'),
  serverSideTagging: process.env.NEXT_PUBLIC_GTM_SERVER_SIDE_TAGGING === 'true',
  serverContainerUrl: process.env.NEXT_PUBLIC_GTM_SERVER_CONTAINER_URL || '',
  testMode: process.env.NEXT_PUBLIC_GTM_TEST_MODE === 'true',
  validateEvents: process.env.NEXT_PUBLIC_GTM_VALIDATE_EVENTS === 'true',
  logEvents: process.env.NEXT_PUBLIC_GTM_LOG_EVENTS === 'true',
  asyncLoading: process.env.NEXT_PUBLIC_GTM_ASYNC_LOADING === 'true',
  deferLoading: process.env.NEXT_PUBLIC_GTM_DEFER_LOADING === 'true',
  lazyLoading: process.env.NEXT_PUBLIC_GTM_LAZY_LOADING === 'true',
  errorHandling: process.env.NEXT_PUBLIC_GTM_ERROR_HANDLING === 'true',
  fallbackTracking: process.env.NEXT_PUBLIC_GTM_FALLBACK_TRACKING === 'true',
  autoPageViews: process.env.NEXT_PUBLIC_GTM_AUTO_PAGE_VIEWS === 'true',
  autoScrollTracking: process.env.NEXT_PUBLIC_GTM_AUTO_SCROLL_TRACKING === 'true',
  autoOutboundLinks: process.env.NEXT_PUBLIC_GTM_AUTO_OUTBOUND_LINKS === 'true',
  autoFormTracking: process.env.NEXT_PUBLIC_GTM_AUTO_FORM_TRACKING === 'true',
  autoElementVisibility: process.env.NEXT_PUBLIC_GTM_AUTO_ELEMENT_VISIBILITY === 'true',
  dataLayerName: process.env.NEXT_PUBLIC_GTM_DATALAYER_NAME || 'dataLayer',
  dataLayerLimit: parseInt(process.env.NEXT_PUBLIC_GTM_DATALAYER_LIMIT || '150'),
  dataLayerTimeout: parseInt(process.env.NEXT_PUBLIC_GTM_DATALAYER_TIMEOUT || '5000'),
  eventTimeout: parseInt(process.env.NEXT_PUBLIC_GTM_EVENT_TIMEOUT || '2000'),
  batchEvents: process.env.NEXT_PUBLIC_GTM_BATCH_EVENTS === 'true',
  batchSize: parseInt(process.env.NEXT_PUBLIC_GTM_BATCH_SIZE || '10'),
  batchTimeout: parseInt(process.env.NEXT_PUBLIC_GTM_BATCH_TIMEOUT || '1000')
};

// Global GTM instance
let gtmInstance: GTMManager | null = null;

// Initialize GTM
export const initGTM = (config?: Partial<GTMConfig>): GTMManager => {
  if (!gtmInstance) {
    gtmInstance = new GTMManager({ ...defaultConfig, ...config });
  }
  return gtmInstance;
};

// Get GTM instance
export const getGTM = (): GTMManager | null => {
  return gtmInstance;
};

// Convenience functions
export const trackGTMEvent = (event: GTMEvent): boolean => {
  return gtmInstance?.trackEvent(event) || false;
};

export const trackGTMPageView = (
  url?: string,
  title?: string,
  referrer?: string,
  customDimensions?: Record<string, any>
): boolean => {
  return gtmInstance?.trackPageView(url, title, referrer, customDimensions) || false;
};

export const trackGTMAppointmentBooked = (
  appointmentId: string,
  barberId: string,
  serviceId: string,
  appointmentValue: number,
  locationId?: string,
  customDimensions?: Record<string, any>
): boolean => {
  return gtmInstance?.trackAppointmentBooked(
    appointmentId,
    barberId,
    serviceId,
    appointmentValue,
    locationId,
    customDimensions
  ) || false;
};

export const trackGTMPaymentCompleted = (
  paymentId: string,
  appointmentId: string,
  amount: number,
  paymentMethod: string,
  customDimensions?: Record<string, any>
): boolean => {
  return gtmInstance?.trackPaymentCompleted(
    paymentId,
    appointmentId,
    amount,
    paymentMethod,
    customDimensions
  ) || false;
};

export const trackGTMUserRegistration = (
  userId: string,
  registrationMethod: string,
  userRole: string,
  customDimensions?: Record<string, any>
): boolean => {
  return gtmInstance?.trackUserRegistration(
    userId,
    registrationMethod,
    userRole,
    customDimensions
  ) || false;
};

export const trackGTMCustomEvent = (
  eventName: string,
  eventParameters?: Record<string, any>,
  customDimensions?: Record<string, any>,
  customMetrics?: Record<string, number>,
  ecommerceItems?: GTMEcommerceItem[]
): boolean => {
  return gtmInstance?.trackCustomEvent(
    eventName,
    eventParameters,
    customDimensions,
    customMetrics,
    ecommerceItems
  ) || false;
};

export const updateGTMConsent = (consent: Record<string, boolean>): void => {
  gtmInstance?.updateConsent(consent);
};

export const setGTMCustomDimension = (name: string, value: any): void => {
  gtmInstance?.setCustomDimension(name, value);
};

export const setGTMCustomMetric = (name: string, value: number): void => {
  gtmInstance?.setCustomMetric(name, value);
};

export const flushGTMEvents = (): boolean => {
  return gtmInstance?.flushEvents() || false;
};

// Export types and classes
export type { GTMConfig, GTMEvent, GTMEcommerceItem };
export { GTMManager, GTMEventType };

// Auto-initialize GTM if container ID is configured
if (typeof window !== 'undefined' && defaultConfig.containerId) {
  initGTM();
}