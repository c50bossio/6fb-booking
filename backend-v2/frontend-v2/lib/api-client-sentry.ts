/**
 * Enhanced API client with comprehensive Sentry integration
 * 
 * This module provides:
 * - Automatic error reporting for API failures
 * - Performance monitoring for API requests
 * - Request/response context tracking
 * - Retry logic with Sentry breadcrumbs
 */

import { reportApiError, addUserActionBreadcrumb, trackPerformance } from './sentry'

export interface ApiRequestOptions extends RequestInit {
  timeout?: number
  retries?: number
  retryDelay?: number
  tags?: Record<string, string>
  feature?: string
}

export interface ApiResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Headers
  requestId?: string
}

export interface ApiError extends Error {
  status?: number
  statusText?: string
  response?: Response
  requestId?: string
  endpoint?: string
  method?: string
}

/**
 * Enhanced fetch wrapper with Sentry integration
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
    tags = {},
    feature = 'api',
    ...fetchOptions
  } = options

  const method = fetchOptions.method || 'GET'
  const startTime = performance.now()
  
  // Generate request ID for tracking
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Add Sentry context
  const sentryTags = {
    'api.endpoint': endpoint,
    'api.method': method,
    'api.request_id': requestId,
    'api.feature': feature,
    ...tags,
  }

  // Add breadcrumb for request start
  addUserActionBreadcrumb(
    `API request started: ${method} ${endpoint}`,
    'navigation',
    {
      endpoint,
      method,
      requestId,
      feature,
      hasBody: !!fetchOptions.body,
      contentType: fetchOptions.headers?.['Content-Type'] || 'none',
    }
  )

  return trackPerformance(
    `API ${method} ${endpoint}`,
    {
      feature: 'api',
      action: `${method.toLowerCase()}_request`,
      metadata: {
        endpoint,
        method,
        requestId,
        ...sentryTags,
      },
    },
    async () => {
      let lastError: ApiError | null = null
      
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), timeout)

          const response = await fetch(endpoint, {
            ...fetchOptions,
            signal: controller.signal,
            headers: {
              'Content-Type': 'application/json',
              'X-Request-ID': requestId,
              ...fetchOptions.headers,
            },
          })

          clearTimeout(timeoutId)
          const duration = performance.now() - startTime

          // Extract response metadata
          const responseRequestId = response.headers.get('X-Request-ID') || requestId
          const responseSize = response.headers.get('Content-Length')
          const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining')

          // Add success breadcrumb
          addUserActionBreadcrumb(
            `API response received: ${response.status}`,
            'navigation',
            {
              endpoint,
              method,
              requestId: responseRequestId,
              status: response.status,
              duration: Math.round(duration),
              responseSize: responseSize ? parseInt(responseSize) : undefined,
              rateLimitRemaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
              attempt,
              success: response.ok,
            }
          )

          if (!response.ok) {
            // Create API error for non-2xx responses
            const errorText = await response.text().catch(() => 'Unknown error')
            const apiError: ApiError = new Error(
              `API request failed: ${response.status} ${response.statusText}`
            )
            apiError.status = response.status
            apiError.statusText = response.statusText
            apiError.response = response
            apiError.requestId = responseRequestId
            apiError.endpoint = endpoint
            apiError.method = method

            // Report API error to Sentry
            reportApiError(
              apiError,
              {
                endpoint,
                method,
                statusCode: response.status,
                responseTime: duration,
                requestId: responseRequestId,
              },
              response.status >= 500 ? 'error' : 'warning'
            )

            throw apiError
          }

          // Parse response data
          let data: T
          const contentType = response.headers.get('Content-Type') || ''
          
          if (contentType.includes('application/json')) {
            data = await response.json()
          } else if (contentType.includes('text/')) {
            data = await response.text() as unknown as T
          } else {
            data = await response.blob() as unknown as T
          }

          return {
            data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            requestId: responseRequestId,
          }

        } catch (error) {
          const duration = performance.now() - startTime
          lastError = error as ApiError
          lastError.requestId = requestId
          lastError.endpoint = endpoint
          lastError.method = method

          // Add error breadcrumb
          addUserActionBreadcrumb(
            `API request failed (attempt ${attempt}): ${error.message}`,
            'navigation',
            {
              endpoint,
              method,
              requestId,
              attempt,
              duration: Math.round(duration),
              error: error.message,
              errorType: error.name,
              willRetry: attempt < retries,
            }
          )

          // Don't retry for certain error types
          if (error.name === 'AbortError' || 
              (lastError.status && lastError.status < 500 && lastError.status !== 429)) {
            break
          }

          // Wait before retry (except on last attempt)
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt))
          }
        }
      }

      // Report final error if all attempts failed
      if (lastError) {
        const duration = performance.now() - startTime
        
        reportApiError(
          lastError,
          {
            endpoint,
            method,
            statusCode: lastError.status,
            responseTime: duration,
            requestId,
          },
          'error'
        )

        throw lastError
      }

      throw new Error('All retry attempts exhausted without success')
    }
  )
}

/**
 * Convenience methods for common HTTP methods
 */
export const api = {
  get: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(endpoint: string, data?: any, options?: Omit<ApiRequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(endpoint: string, options?: Omit<ApiRequestOptions, 'method'>) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
}

/**
 * Booking-specific API methods with enhanced tracking
 */
export const bookingApi = {
  getAvailability: async (barberId: string, date: string) => {
    return api.get(`/api/v1/availability/${barberId}`, {
      feature: 'booking',
      tags: { 'booking.action': 'get_availability', 'booking.barber_id': barberId },
    })
  },

  createBooking: async (bookingData: any) => {
    return api.post('/api/v1/bookings', bookingData, {
      feature: 'booking',
      tags: { 'booking.action': 'create_booking' },
    })
  },

  updateBooking: async (bookingId: string, updates: any) => {
    return api.patch(`/api/v1/bookings/${bookingId}`, updates, {
      feature: 'booking',
      tags: { 'booking.action': 'update_booking', 'booking.id': bookingId },
    })
  },

  cancelBooking: async (bookingId: string, reason?: string) => {
    return api.delete(`/api/v1/bookings/${bookingId}`, {
      feature: 'booking',
      tags: { 'booking.action': 'cancel_booking', 'booking.id': bookingId },
    })
  },
}

/**
 * Payment-specific API methods with enhanced tracking
 */
export const paymentApi = {
  createPaymentIntent: async (amount: number, currency: string, bookingId: string) => {
    return api.post('/api/v1/payments/create-intent', 
      { amount, currency, booking_id: bookingId },
      {
        feature: 'payment',
        tags: { 
          'payment.action': 'create_intent',
          'payment.amount': amount.toString(),
          'payment.currency': currency,
          'booking.id': bookingId,
        },
      }
    )
  },

  confirmPayment: async (paymentIntentId: string, paymentMethodId: string) => {
    return api.post('/api/v1/payments/confirm',
      { payment_intent_id: paymentIntentId, payment_method_id: paymentMethodId },
      {
        feature: 'payment',
        tags: { 
          'payment.action': 'confirm_payment',
          'payment.intent_id': paymentIntentId,
        },
      }
    )
  },

  refundPayment: async (paymentIntentId: string, amount?: number) => {
    return api.post('/api/v1/payments/refund',
      { payment_intent_id: paymentIntentId, amount },
      {
        feature: 'payment',
        tags: { 
          'payment.action': 'refund',
          'payment.intent_id': paymentIntentId,
        },
      }
    )
  },
}

/**
 * User/Auth-specific API methods
 */
export const authApi = {
  login: async (email: string, password: string) => {
    return api.post('/api/v1/auth/login',
      { email, password },
      {
        feature: 'auth',
        tags: { 'auth.action': 'login' },
      }
    )
  },

  register: async (userData: any) => {
    return api.post('/api/v1/auth/register',
      userData,
      {
        feature: 'auth',
        tags: { 'auth.action': 'register' },
      }
    )
  },

  refreshToken: async () => {
    return api.post('/api/v1/auth/refresh',
      {},
      {
        feature: 'auth',
        tags: { 'auth.action': 'refresh_token' },
      }
    )
  },

  logout: async () => {
    return api.post('/api/v1/auth/logout',
      {},
      {
        feature: 'auth',
        tags: { 'auth.action': 'logout' },
      }
    )
  },
}