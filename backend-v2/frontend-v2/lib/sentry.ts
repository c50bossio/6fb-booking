/**
 * Lightweight Sentry utilities stub for BookedBarber V2
 * 
 * This module provides no-op implementations when Sentry is not available.
 * For development builds, this reduces bundle size significantly.
 */

// Types for better error handling (kept for compatibility)
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

// No-op implementations for development
export function setUserContext(user: UserContext): void {
  // Development stub - no tracking
}

export function clearUserContext(): void {
  // Development stub - no tracking
}

export function reportBookingError(
  error: Error,
  context: BookingErrorContext,
  level: 'error' | 'warning' | 'fatal' = 'error'
): void {
  // Development stub - log to console instead
  console.error('Booking Error:', error.message, context)
}

export function reportPaymentError(
  error: Error,
  paymentContext: any,
  level: 'error' | 'warning' | 'fatal' = 'error'
): void {
  // Development stub - log to console instead
  console.error('Payment Error:', error.message, paymentContext)
}

export function reportApiError(
  error: Error,
  apiContext: any,
  level: 'error' | 'warning' | 'fatal' = 'error'
): void {
  // Development stub - log to console instead
  console.error('API Error:', error.message, apiContext)
}

export async function trackPerformance<T>(
  operation: string,
  context: PerformanceContext,
  fn: () => Promise<T> | T
): Promise<T> {
  // Development stub - just execute function
  return await fn()
}

export function addUserActionBreadcrumb(
  action: string,
  category: string,
  data?: Record<string, any>
): void {
  // Development stub - no tracking
}

export function captureUserFeedback(
  feedback: any,
  eventId?: string
): void {
  // Development stub - log to console
}

export function initializeSentryContext(context: any): void {
  // Development stub - no tracking
}

export function setupPerformanceMonitoring(): void {
  // Development stub - no monitoring
}

export async function withSentryContext<T>(
  operation: string,
  context: Record<string, any>,
  fn: () => Promise<T>
): Promise<T> {
  // Development stub - just execute function
  return await fn()
}

// Minimal Sentry-like export for compatibility
export const Sentry = {
  captureException: (error: Error) => console.error('Exception:', error),
  addBreadcrumb: (breadcrumb: any) => {},
  setUser: (user: any) => {},
  setTag: (key: string, value: any) => {},
  setContext: (key: string, context: any) => {},
  withScope: (fn: (scope: any) => void) => {
    const mockScope = {
      setTag: (key: string, value: any) => {},
      setContext: (key: string, context: any) => {},
      setUser: (user: any) => {},
      addBreadcrumb: (breadcrumb: any) => {},
    }
    return fn(mockScope)
  },
  startSpan: (options: any, fn: () => any) => fn(),
  lastEventId: () => 'dev-mode',
}