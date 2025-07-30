/**
 * Production Sentry Configuration for BookedBarber V2
 * Complete client-side error tracking with business context
 */

import * as Sentry from "@sentry/nextjs";

// Types for enhanced error context
export interface BookingErrorContext {
  bookingId?: string
  barberId?: string
  clientId?: string
  serviceId?: string
  appointmentDate?: string
  paymentIntentId?: string
  step?: 'selection' | 'scheduling' | 'payment' | 'confirmation'
  funnel_position?: number
  conversion_stage?: string
}

export interface UserContext {
  id: string
  email?: string
  role: 'client' | 'barber' | 'admin' | 'owner'
  businessId?: string
  locationId?: string
  subscriptionTier?: 'free' | 'basic' | 'premium' | 'enterprise'
  session_duration?: number
  page_views?: number
}

export interface PerformanceContext {
  feature: string
  action: string
  duration_ms?: number
  resource_timing?: any
  user_agent?: string
  viewport_size?: string
  connection_type?: string
  metadata?: Record<string, any>
}

// Initialize Sentry if DSN is configured
if (process.env.NEXT_PUBLIC_SENTRY_DSN && 
    process.env.NEXT_PUBLIC_SENTRY_DSN !== 'REPLACE_WITH_PRODUCTION_SENTRY_DSN') {
  
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.BUILD_VERSION || '1.0.0',
    
    // Production-optimized sampling
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.02 : 1.0,
    replaysSessionSampleRate: 0.01, // 1% of sessions
    replaysOnErrorSampleRate: 1.0,  // 100% of error sessions
    
    // Enhanced error filtering
    beforeSend(event, hint) {
      // Production error filtering
      if (process.env.NODE_ENV === 'production') {
        // Skip browser-specific noise
        const commonNoise = [
          'ResizeObserver loop limit exceeded',
          'Network Error',
          'Loading chunk',
          'Script error',
          'Non-Error promise rejection captured'
        ];
        
        const errorMessage = event.exception?.values?.[0]?.value || '';
        if (commonNoise.some(noise => errorMessage.includes(noise))) {
          return null;
        }
        
        // Skip extension-related errors
        if (event.request?.url?.includes('extension://')) {
          return null;
        }
      }
      
      // Enhance with business context
      if (event.contexts) {
        event.contexts.business = extractBusinessContext();
        event.contexts.six_figure_barber = {
          methodology_version: '2.0',
          business_focus: determineBusinessFocus(event),
          revenue_impact: assessRevenueImpact(event),
          client_impact: assessClientImpact(event)
        };
      }
      
      return event;
    },
    
    // Enhanced integrations
    integrations: [
      // Core integrations
      Sentry.breadcrumbsIntegration({
        console: true,
        dom: true, 
        history: true,
        fetch: true,
        xhr: true,
      }),
      
      // Performance profiling
      Sentry.browserProfilingIntegration(),
      
      // Session replay (privacy-focused)
      ...(process.env.NEXT_PUBLIC_SENTRY_ENABLE_REPLAY === 'true' ? [
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
          maskAllInputs: true,
          // Only capture business-critical interactions
          maskFn: (element) => {
            // Always mask sensitive elements
            if (element.hasAttribute('data-sensitive')) return true;
            if (element.type === 'password') return true;
            if (element.name?.includes('card')) return true;
            return false;
          }
        })
      ] : []),
    ],
    
    // Business-focused tags
    initialScope: {
      tags: {
        component: 'frontend',
        platform: 'nextjs',
        version: process.env.BUILD_VERSION || '1.0.0',
        business_methodology: 'six_figure_barber',
        deployment_type: process.env.NODE_ENV === 'production' ? 'production' : 'development'
      },
    },
    
    // Transaction filtering
    beforeSendTransaction(event) {
      if (process.env.NODE_ENV === 'production') {
        // Skip very fast transactions (likely not performance bottlenecks)
        if (event.start_timestamp && event.timestamp) {
          const duration = (event.timestamp - event.start_timestamp) * 1000;
          if (duration < 100) return null; // Less than 100ms
        }
        
        // Skip static asset requests
        if (event.transaction?.includes('/_next/static/')) return null;
        if (event.transaction?.includes('/favicon.ico')) return null;
      }
      
      // Add business context to transactions
      event.contexts = event.contexts || {};
      event.contexts.business_transaction = {
        is_revenue_critical: isRevenueCriticalTransaction(event.transaction),
        is_user_journey: isUserJourneyTransaction(event.transaction),
        expected_duration_ms: getExpectedDuration(event.transaction)
      };
      
      return event;
    },
    
    // Privacy and compliance
    sendDefaultPii: false,
    maxBreadcrumbs: 50,
    attachStacktrace: true,
    
    // Allowed domains for better attribution
    allowUrls: [
      /https?:\/\/(.+\.)?bookedbarber\.com/,
      /https?:\/\/(.+\.)?localhost/,
      /https?:\/\/(.+\.)?127\.0\.0\.1/,
      /https?:\/\/(.+\.)?staging-bookedbarber\.com/,
    ],
    
    // Enhanced breadcrumb processing
    beforeBreadcrumb(breadcrumb, hint) {
      // Add business context to API breadcrumbs
      if (breadcrumb.category === 'fetch') {
        const url = breadcrumb.data?.url || '';
        breadcrumb.data = {
          ...breadcrumb.data,
          business_area: categorizeApiCall(url),
          expected_response_time: getExpectedApiTime(url),
          revenue_critical: isRevenueCriticalApi(url)
        };
      }
      
      // Enhanced UI interaction breadcrumbs
      if (breadcrumb.category === 'ui.click') {
        const target = hint?.event?.target as HTMLElement;
        if (target) {
          breadcrumb.data = {
            ...breadcrumb.data,
            business_action: classifyUserAction(target),
            conversion_step: getConversionStep(target),
            funnel_position: getFunnelPosition()
          };
        }
      }
      
      return breadcrumb;
    }
  });
  
  console.log('✅ Sentry production monitoring initialized');
} else {
  console.log('🔕 Sentry DSN not configured - using development mode');
}

// Enhanced error reporting functions
export function setUserContext(user: UserContext): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email,
    role: user.role,
    segment: determineUserSegment(user)
  });
  
  // Set business-specific tags
  Sentry.setTag("user_role", user.role);
  Sentry.setTag("subscription_tier", user.subscriptionTier || "free");
  Sentry.setTag("business_segment", determineBusinessSegment(user));
  
  if (user.businessId) {
    Sentry.setTag("business_id", user.businessId);
  }
}

export function reportBookingError(
  error: Error,
  context: BookingErrorContext,
  level: 'error' | 'warning' | 'fatal' = 'error'
): void {
  Sentry.withScope((scope) => {
    scope.setTag("error_category", "booking");
    scope.setTag("business_impact", "revenue_critical");
    scope.setLevel(level);
    
    // Add booking-specific context
    scope.setContext("booking_error", {
      booking_id: context.bookingId,
      barber_id: context.barberId,
      client_id: context.clientId,
      service_id: context.serviceId,
      appointment_date: context.appointmentDate,
      booking_step: context.step,
      funnel_position: context.funnel_position,
      conversion_stage: context.conversion_stage
    });
    
    // Add Six Figure Barber context
    scope.setContext("six_figure_barber_impact", {
      affects_revenue: true,
      affects_client_experience: true,
      affects_barber_productivity: context.step !== 'confirmation',
      business_priority: "critical"
    });
    
    Sentry.captureException(error);
  });
}

export function reportPaymentError(
  error: Error,
  paymentContext: any,
  level: 'error' | 'warning' | 'fatal' = 'error'
): void {
  Sentry.withScope((scope) => {
    scope.setTag("error_category", "payment");
    scope.setTag("business_impact", "revenue_blocking");
    scope.setLevel(level);
    
    // Add payment context (sensitive data masked)
    scope.setContext("payment_error", {
      payment_intent_id: paymentContext.payment_intent_id,
      amount_cents: paymentContext.amount_cents,
      currency: paymentContext.currency,
      payment_method_type: paymentContext.payment_method_type,
      error_code: paymentContext.error_code,
      // Never include: card details, CVV, full payment methods
    });
    
    scope.setContext("revenue_impact", {
      estimated_lost_revenue: paymentContext.amount_cents || 0,
      affects_conversion: true,
      requires_immediate_attention: true
    });
    
    Sentry.captureException(error);
  });
}

export function reportApiError(
  error: Error,
  apiContext: any,
  level: 'error' | 'warning' | 'fatal' = 'error'
): void {
  Sentry.withScope((scope) => {
    scope.setTag("error_category", "api");
    scope.setTag("api_endpoint", apiContext.endpoint);
    scope.setLevel(level);
    
    scope.setContext("api_error", {
      endpoint: apiContext.endpoint,
      method: apiContext.method,
      status_code: apiContext.status_code,
      response_time_ms: apiContext.response_time_ms,
      request_id: apiContext.request_id
    });
    
    // Classify business impact
    const businessImpact = classifyApiBusinessImpact(apiContext.endpoint);
    scope.setTag("business_impact", businessImpact);
    
    Sentry.captureException(error);
  });
}

export async function trackPerformance<T>(
  operation: string,
  context: PerformanceContext,
  fn: () => Promise<T> | T
): Promise<T> {
  return Sentry.startSpan({
    name: operation,
    op: 'function'
  }, async (span) => {
    const startTime = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - startTime;
      
      // Add performance context
      span.setData('duration_ms', duration);
      span.setData('feature', context.feature);
      span.setData('action', context.action);
      
      // Assess performance impact
      const performanceImpact = assessPerformanceImpact(operation, duration);
      span.setData('performance_impact', performanceImpact);
      
      // Add business context
      span.setData('business_critical', isBusinessCriticalOperation(operation));
      span.setData('affects_conversion', affectsConversion(operation));
      
      return result;
    } catch (error) {
      span.setStatus('internal_error');
      throw error;
    }
  });
}

export function addUserActionBreadcrumb(
  action: string,
  category: string,
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    message: `User Action: ${action}`,
    category: `user.${category}`,
    level: 'info',
    data: {
      ...data,
      business_action: classifyBusinessAction(action, category),
      conversion_relevance: assessConversionRelevance(action),
      timestamp: new Date().toISOString()
    }
  });
}

export function captureUserFeedback(
  feedback: any,
  eventId?: string
): void {
  Sentry.captureUserFeedback({
    event_id: eventId || Sentry.lastEventId(),
    name: feedback.name,
    email: feedback.email,
    comments: feedback.comments
  });
}

// Business context helpers
function extractBusinessContext(): Record<string, any> {
  return {
    current_page: window.location.pathname,
    user_agent: navigator.userAgent,
    viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    connection_type: (navigator as any).connection?.effectiveType || 'unknown',
    business_hour: isBusinessHour(),
    peak_traffic_time: isPeakTrafficTime()
  };
}

function determineBusiness Focus(event: any): string {
  const url = event.request?.url || window.location.pathname;
  
  if (url.includes('/booking') || url.includes('/appointment')) {
    return 'booking_optimization';
  } else if (url.includes('/payment') || url.includes('/checkout')) {
    return 'revenue_optimization';
  } else if (url.includes('/profile') || url.includes('/dashboard')) {
    return 'client_experience';
  } else {
    return 'general_operations';
  }
}

function assessRevenueImpact(event: any): 'high' | 'medium' | 'low' {
  const url = event.request?.url || window.location.pathname;
  
  if (url.includes('/payment') || url.includes('/checkout') || url.includes('/book')) {
    return 'high';
  } else if (url.includes('/appointment') || url.includes('/calendar')) {
    return 'medium';
  } else {
    return 'low';
  }
}

function assessClientImpact(event: any): 'high' | 'medium' | 'low' {
  const errorType = event.exception?.values?.[0]?.type || '';
  
  if (errorType.includes('Network') || errorType.includes('Timeout')) {
    return 'high';
  } else if (errorType.includes('Validation') || errorType.includes('Auth')) {
    return 'medium';
  } else {
    return 'low';
  }
}

function isRevenueCriticalTransaction(transaction?: string): boolean {
  if (!transaction) return false;
  return transaction.includes('/payment') || 
         transaction.includes('/checkout') ||
         transaction.includes('/book');
}

function isUserJourneyTransaction(transaction?: string): boolean {
  if (!transaction) return false;
  const journeyPaths = ['/booking', '/appointment', '/calendar', '/profile', '/dashboard'];
  return journeyPaths.some(path => transaction.includes(path));
}

function getExpectedDuration(transaction?: string): number {
  // Expected durations in milliseconds for different transaction types
  const durationMap: Record<string, number> = {
    '/payment': 2000,
    '/booking': 1500,
    '/appointment': 1000,
    '/dashboard': 800,
    '/api': 500
  };
  
  if (!transaction) return 1000;
  
  for (const [path, duration] of Object.entries(durationMap)) {
    if (transaction.includes(path)) {
      return duration;
    }
  }
  
  return 1000; // Default
}

function categorizeApiCall(url: string): string {
  if (url.includes('/payment') || url.includes('/stripe')) return 'payment_processing';
  if (url.includes('/appointment') || url.includes('/booking')) return 'booking_management';
  if (url.includes('/auth') || url.includes('/login')) return 'authentication';
  if (url.includes('/user') || url.includes('/profile')) return 'user_management';
  return 'general_api';
}

function getExpectedApiTime(url: string): number {
  if (url.includes('/payment')) return 2000;
  if (url.includes('/booking')) return 1000;
  if (url.includes('/auth')) return 800;
  return 500;
}

function isRevenueCriticalApi(url: string): boolean {
  return url.includes('/payment') || 
         url.includes('/booking') || 
         url.includes('/checkout');
}

function classifyUserAction(target: HTMLElement): string {
  if (target.textContent?.toLowerCase().includes('book')) return 'booking_initiation';
  if (target.textContent?.toLowerCase().includes('pay')) return 'payment_initiation';
  if (target.classList.contains('btn-primary')) return 'primary_cta';
  if (target.tagName === 'A') return 'navigation';
  return 'general_interaction';
}

function getConversionStep(target: HTMLElement): string {
  const page = window.location.pathname;
  
  if (page.includes('/booking')) {
    if (target.textContent?.toLowerCase().includes('select')) return 'service_selection';
    if (target.textContent?.toLowerCase().includes('time')) return 'time_selection';
    if (target.textContent?.toLowerCase().includes('book')) return 'booking_confirmation';
  } else if (page.includes('/payment')) {
    return 'payment_processing';
  }
  
  return 'general_step';
}

function getFunnelPosition(): number {
  const page = window.location.pathname;
  
  if (page === '/' || page.includes('/home')) return 1;
  if (page.includes('/services')) return 2;
  if (page.includes('/booking')) return 3;
  if (page.includes('/payment')) return 4;
  if (page.includes('/confirmation')) return 5;
  
  return 0;
}

function determineUserSegment(user: UserContext): string {
  if (user.role === 'owner' || user.role === 'admin') return 'business_owner';
  if (user.role === 'barber') return 'service_provider';
  if (user.subscriptionTier === 'premium' || user.subscriptionTier === 'enterprise') return 'premium_client';
  return 'standard_client';
}

function determineBusinessSegment(user: UserContext): string {
  if (user.subscriptionTier === 'enterprise') return 'enterprise';
  if (user.subscriptionTier === 'premium') return 'premium';
  if (user.role === 'barber' || user.role === 'owner') return 'business_user';
  return 'consumer';
}

function classifyApiBusinessImpact(endpoint: string): string {
  if (endpoint.includes('/payment')) return 'revenue_blocking';
  if (endpoint.includes('/booking')) return 'user_blocking';
  if (endpoint.includes('/auth')) return 'experience_degrading';
  return 'operational';
}

function assessPerformanceImpact(operation: string, duration: number): string {
  if (duration > 5000) return 'severe';
  if (duration > 2000) return 'moderate';
  if (duration > 1000) return 'minor';
  return 'acceptable';
}

function isBusinessCriticalOperation(operation: string): boolean {
  const criticalOps = ['payment', 'booking', 'authentication', 'checkout'];
  return criticalOps.some(op => operation.toLowerCase().includes(op));
}

function affectsConversion(operation: string): boolean {
  const conversionOps = ['payment', 'booking', 'checkout', 'appointment'];
  return conversionOps.some(op => operation.toLowerCase().includes(op));
}

function classifyBusinessAction(action: string, category: string): string {
  if (action.includes('book') || action.includes('appointment')) return 'revenue_generation';
  if (action.includes('pay') || action.includes('checkout')) return 'revenue_conversion';
  if (action.includes('login') || action.includes('register')) return 'user_acquisition';
  if (action.includes('profile') || action.includes('settings')) return 'user_retention';
  return 'general_engagement';
}

function assessConversionRelevance(action: string): 'high' | 'medium' | 'low' {
  if (action.includes('book') || action.includes('pay')) return 'high';
  if (action.includes('select') || action.includes('choose')) return 'medium';
  return 'low';
}

function isBusinessHour(): boolean {
  const hour = new Date().getHours();
  return hour >= 9 && hour <= 17; // 9 AM to 5 PM
}

function isPeakTrafficTime(): boolean {
  const hour = new Date().getHours();
  // Peak times: lunch (12-1) and evening (6-8)
  return (hour >= 12 && hour <= 13) || (hour >= 18 && hour <= 20);
}

// Export enhanced Sentry object
export { Sentry };