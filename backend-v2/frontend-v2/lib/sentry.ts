/**
 * Shared Sentry utilities and configuration for BookedBarber V2
 * 
 * This module provides utilities for:
 * - User context tracking
 * - Custom error reporting
 * - Performance monitoring
 * - Business-specific error handling
 */

import * as Sentry from '@sentry/nextjs'

// Types for better error handling
export interface BookingErrorContext {
  bookingId?: string
  barberId?: string
  clientId?: string
  serviceId?: string
  appointmentDate?: string
  paymentIntentId?: string
  step?: 'selection' | 'scheduling' | 'payment' | 'confirmation'
}

export interface UserContext {
  id: string
  email?: string
  role: 'client' | 'barber' | 'admin' | 'owner'
  businessId?: string
  locationId?: string
  subscriptionTier?: 'free' | 'basic' | 'premium' | 'enterprise'
}

export interface PerformanceContext {
  feature: string
  action: string
  metadata?: Record<string, any>
}

/**
 * Configure user context for Sentry events
 */
export function setUserContext(user: UserContext): void {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.email,
  })

  Sentry.setTag('user.role', user.role)
  
  if (user.businessId) {
    Sentry.setTag('business.id', user.businessId)
  }
  
  if (user.locationId) {
    Sentry.setTag('location.id', user.locationId)
  }
  
  if (user.subscriptionTier) {
    Sentry.setTag('subscription.tier', user.subscriptionTier)
  }

  Sentry.setContext('user_details', {
    role: user.role,
    businessId: user.businessId,
    locationId: user.locationId,
    subscriptionTier: user.subscriptionTier,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Clear user context (e.g., on logout)
 */
export function clearUserContext(): void {
  Sentry.setUser(null)
  Sentry.setTag('user.role', null)
  Sentry.setTag('business.id', null)
  Sentry.setTag('location.id', null)
  Sentry.setTag('subscription.tier', null)
}

/**
 * Report booking-related errors with context
 */
export function reportBookingError(
  error: Error,
  context: BookingErrorContext,
  level: 'error' | 'warning' | 'fatal' = 'error'
): void {
  Sentry.withScope((scope) => {
    scope.setTag('error.category', 'booking')
    scope.setTag('booking.step', context.step || 'unknown')
    
    if (context.bookingId) {
      scope.setTag('booking.id', context.bookingId)
    }
    
    if (context.barberId) {
      scope.setTag('barber.id', context.barberId)
    }
    
    if (context.clientId) {
      scope.setTag('client.id', context.clientId)
    }
    
    if (context.serviceId) {
      scope.setTag('service.id', context.serviceId)
    }
    
    if (context.paymentIntentId) {
      scope.setTag('payment.intent_id', context.paymentIntentId)
    }

    scope.setContext('booking_context', {
      ...context,
      timestamp: new Date().toISOString(),
    })

    scope.setLevel(level)
    Sentry.captureException(error)
  })
}

/**
 * Report payment-related errors with enhanced context
 */
export function reportPaymentError(
  error: Error,
  paymentContext: {
    paymentIntentId?: string
    amount?: number
    currency?: string
    paymentMethod?: string
    customerId?: string
    barberId?: string
    bookingId?: string
  },
  level: 'error' | 'warning' | 'fatal' = 'error'
): void {
  Sentry.withScope((scope) => {
    scope.setTag('error.category', 'payment')
    scope.setTag('payment.method', paymentContext.paymentMethod || 'unknown')
    
    if (paymentContext.paymentIntentId) {
      scope.setTag('payment.intent_id', paymentContext.paymentIntentId)
    }
    
    if (paymentContext.customerId) {
      scope.setTag('stripe.customer_id', paymentContext.customerId)
    }

    scope.setContext('payment_context', {
      ...paymentContext,
      timestamp: new Date().toISOString(),
    })

    scope.setLevel(level)
    Sentry.captureException(error)
  })
}

/**
 * Report API errors with request context
 */
export function reportApiError(
  error: Error,
  apiContext: {
    endpoint: string
    method: string
    statusCode?: number
    responseTime?: number
    requestId?: string
    userId?: string
  },
  level: 'error' | 'warning' | 'fatal' = 'error'
): void {
  Sentry.withScope((scope) => {
    scope.setTag('error.category', 'api')
    scope.setTag('api.endpoint', apiContext.endpoint)
    scope.setTag('api.method', apiContext.method)
    
    if (apiContext.statusCode) {
      scope.setTag('api.status_code', apiContext.statusCode.toString())
    }
    
    if (apiContext.requestId) {
      scope.setTag('api.request_id', apiContext.requestId)
    }

    scope.setContext('api_context', {
      ...apiContext,
      timestamp: new Date().toISOString(),
    })

    scope.setLevel(level)
    Sentry.captureException(error)
  })
}

/**
 * Track custom performance metrics
 */
export function trackPerformance(
  operation: string,
  context: PerformanceContext,
  fn: () => Promise<any> | any
): Promise<any> {
  return Sentry.startSpan(
    {
      name: operation,
      op: context.feature,
      attributes: {
        'custom.feature': context.feature,
        'custom.action': context.action,
        ...context.metadata,
      },
    },
    async () => {
      const startTime = performance.now()
      
      try {
        const result = await fn()
        const duration = performance.now() - startTime
        
        // Add performance breadcrumb
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `${operation} completed`,
          level: 'info',
          data: {
            feature: context.feature,
            action: context.action,
            duration: Math.round(duration),
            success: true,
          },
        })
        
        return result
      } catch (error) {
        const duration = performance.now() - startTime
        
        // Add performance breadcrumb for errors
        Sentry.addBreadcrumb({
          category: 'performance',
          message: `${operation} failed`,
          level: 'error',
          data: {
            feature: context.feature,
            action: context.action,
            duration: Math.round(duration),
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        })
        
        throw error
      }
    }
  )
}

/**
 * Add custom breadcrumb for user actions
 */
export function addUserActionBreadcrumb(
  action: string,
  category: 'navigation' | 'interaction' | 'form' | 'booking' | 'payment',
  data?: Record<string, any>
): void {
  Sentry.addBreadcrumb({
    category: `user.${category}`,
    message: action,
    level: 'info',
    data: {
      ...data,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Capture user feedback with error correlation
 */
export function captureUserFeedback(
  feedback: {
    name: string
    email: string
    comments: string
  },
  eventId?: string
): void {
  const userFeedback = {
    event_id: eventId || Sentry.lastEventId(),
    name: feedback.name,
    email: feedback.email,
    comments: feedback.comments,
  }
  
  Sentry.captureUserFeedback(userFeedback)
}

/**
 * Initialize Sentry for different application contexts
 */
export function initializeSentryContext(context: {
  page?: string
  feature?: string
  userAgent?: string
  viewport?: { width: number; height: number }
}): void {
  if (context.page) {
    Sentry.setTag('page', context.page)
  }
  
  if (context.feature) {
    Sentry.setTag('feature', context.feature)
  }
  
  if (context.userAgent) {
    Sentry.setContext('browser', {
      userAgent: context.userAgent,
      timestamp: new Date().toISOString(),
    })
  }
  
  if (context.viewport) {
    Sentry.setContext('viewport', {
      width: context.viewport.width,
      height: context.viewport.height,
      timestamp: new Date().toISOString(),
    })
  }
}

/**
 * Monitor Core Web Vitals and custom performance metrics
 */
export function setupPerformanceMonitoring(): void {
  if (typeof window !== 'undefined') {
    // Monitor Core Web Vitals
    import('web-vitals').then(({ onCLS, onFCP, onFID, onLCP, onTTFB }) => {
      onCLS((metric) => {
        Sentry.addBreadcrumb({
          category: 'performance.web-vitals',
          message: 'Cumulative Layout Shift',
          level: 'info',
          data: {
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
          },
        })
      })
      
      onFCP((metric) => {
        Sentry.addBreadcrumb({
          category: 'performance.web-vitals',
          message: 'First Contentful Paint',
          level: 'info',
          data: {
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
          },
        })
      })
      
      onFID((metric) => {
        Sentry.addBreadcrumb({
          category: 'performance.web-vitals',
          message: 'First Input Delay',
          level: 'info',
          data: {
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
          },
        })
      })
      
      onLCP((metric) => {
        Sentry.addBreadcrumb({
          category: 'performance.web-vitals',
          message: 'Largest Contentful Paint',
          level: 'info',
          data: {
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
          },
        })
      })
      
      onTTFB((metric) => {
        Sentry.addBreadcrumb({
          category: 'performance.web-vitals',
          message: 'Time to First Byte',
          level: 'info',
          data: {
            value: metric.value,
            rating: metric.rating,
            delta: metric.delta,
          },
        })
      })
    }).catch((error) => {
      console.warn('Failed to load web-vitals:', error)
    })
    
    // Monitor navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          Sentry.addBreadcrumb({
            category: 'performance.navigation',
            message: 'Page load complete',
            level: 'info',
            data: {
              loadTime: Math.round(navigation.loadEventEnd - navigation.fetchStart),
              domContentLoaded: Math.round(navigation.domContentLoadedEventEnd - navigation.fetchStart),
              firstPaint: Math.round(navigation.responseStart - navigation.fetchStart),
            },
          })
        }
      }, 1000)
    })
  }
}

/**
 * Utility for handling async operations with Sentry context
 */
export async function withSentryContext<T>(
  operation: string,
  context: Record<string, any>,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.withScope(async (scope) => {
    scope.setTag('operation', operation)
    scope.setContext('operation_context', {
      ...context,
      timestamp: new Date().toISOString(),
    })
    
    try {
      return await fn()
    } catch (error) {
      scope.setLevel('error')
      throw error
    }
  })
}

// Export Sentry for direct use when needed
export { Sentry }