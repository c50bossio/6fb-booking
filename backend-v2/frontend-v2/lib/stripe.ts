/**
 * Stripe.js integration for payment processing
 */

import { loadStripe, Stripe } from '@stripe/stripe-js'

// Retry configuration
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

// Error types
export enum PaymentErrorType {
  CARD_DECLINED = 'card_declined',
  INSUFFICIENT_FUNDS = 'insufficient_funds',
  EXPIRED_CARD = 'expired_card',
  PROCESSING_ERROR = 'processing_error',
  NETWORK_ERROR = 'network',
  STRIPE_UNAVAILABLE = 'stripe_unavailable',
  GENERIC = 'generic'
}

export interface StripeError {
  type: PaymentErrorType
  message: string
  code?: string
  decline_code?: string
  retryable: boolean
}

// Get publishable key from environment
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!stripePublishableKey) {
  }

// Singleton instance of Stripe
let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get or initialize Stripe instance
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePublishableKey) {
    return Promise.resolve(null)
  }
  
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey)
  }
  
  return stripePromise
}

/**
 * Create a setup intent for collecting payment method
 */
export async function createSetupIntent(
  organizationId: number,
  retries: number = 0
): Promise<{
  clientSecret: string
  setupIntentId: string
  customerId: string
}> {
  try {
    const response = await fetch('/api/v2/billing/setup-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ organization_id: organizationId }),
    })
    
    if (!response.ok) {
      const error = await response.json()
      const parsedError = parseStripeError(error)
      
      // Retry if it's a retryable error and we haven't exceeded max retries
      if (parsedError.retryable && retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)))
        return createSetupIntent(organizationId, retries + 1)
      }
      
      throw parsedError
    }
    
    return response.json()
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError: StripeError = {
        type: PaymentErrorType.NETWORK_ERROR,
        message: 'Unable to connect to payment processor. Please check your internet connection.',
        retryable: true
      }
      
      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retries + 1)))
        return createSetupIntent(organizationId, retries + 1)
      }
      
      throw networkError
    }
    
    throw error
  }
}

/**
 * Attach a payment method to customer
 */
export async function attachPaymentMethod(
  organizationId: number,
  paymentMethodId: string,
  setAsDefault: boolean = true
): Promise<{
  success: boolean
  customerId: string
  paymentMethodId: string
  message: string
}> {
  const response = await fetch('/api/v2/billing/attach-payment-method', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      organization_id: organizationId,
      payment_method_id: paymentMethodId,
      set_as_default: setAsDefault,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to attach payment method')
  }
  
  return response.json()
}

/**
 * Format card brand for display
 */
export function formatCardBrand(brand: string): string {
  const brandMap: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    diners: 'Diners Club',
    jcb: 'JCB',
    unionpay: 'UnionPay',
  }
  
  return brandMap[brand.toLowerCase()] || brand
}

/**
 * Format last 4 digits for display
 */
export function formatLast4(last4: string): string {
  return `•••• ${last4}`
}

/**
 * Check if Stripe is available
 */
export function isStripeAvailable(): boolean {
  return !!stripePublishableKey
}

/**
 * Parse Stripe errors into a consistent format
 */
export function parseStripeError(error: any): StripeError {
  // Handle Stripe API errors
  if (error.type === 'StripeCardError') {
    const declineCode = error.decline_code || error.code
    
    switch (declineCode) {
      case 'insufficient_funds':
        return {
          type: PaymentErrorType.INSUFFICIENT_FUNDS,
          message: 'Your card has insufficient funds.',
          code: declineCode,
          retryable: false
        }
      
      case 'expired_card':
        return {
          type: PaymentErrorType.EXPIRED_CARD,
          message: 'Your card has expired.',
          code: declineCode,
          retryable: false
        }
      
      case 'card_declined':
      case 'generic_decline':
      case 'card_not_supported':
      case 'currency_not_supported':
        return {
          type: PaymentErrorType.CARD_DECLINED,
          message: error.message || 'Your card was declined.',
          code: declineCode,
          decline_code: error.decline_code,
          retryable: false
        }
      
      default:
        return {
          type: PaymentErrorType.CARD_DECLINED,
          message: error.message || 'Your card was declined.',
          code: declineCode,
          retryable: false
        }
    }
  }
  
  // Handle rate limit errors
  if (error.type === 'StripeRateLimitError') {
    return {
      type: PaymentErrorType.PROCESSING_ERROR,
      message: 'Too many requests. Please wait a moment and try again.',
      code: 'rate_limit',
      retryable: true
    }
  }
  
  // Handle API connection errors
  if (error.type === 'StripeAPIError' || error.type === 'StripeConnectionError') {
    return {
      type: PaymentErrorType.NETWORK_ERROR,
      message: 'Unable to connect to payment processor. Please try again.',
      code: 'api_error',
      retryable: true
    }
  }
  
  // Handle validation errors
  if (error.type === 'StripeInvalidRequestError') {
    return {
      type: PaymentErrorType.PROCESSING_ERROR,
      message: 'Invalid payment information. Please check your details and try again.',
      code: 'invalid_request',
      retryable: false
    }
  }
  
  // Handle generic errors
  if (error.detail) {
    return {
      type: PaymentErrorType.GENERIC,
      message: error.detail,
      retryable: true
    }
  }
  
  // Default error
  return {
    type: PaymentErrorType.GENERIC,
    message: error.message || 'An unexpected error occurred. Please try again.',
    retryable: true
  }
}

/**
 * Retry a Stripe operation with exponential backoff
 */
export async function retryStripeOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: any
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      // Check if error is retryable
      const parsedError = parseStripeError(error)
      if (!parsedError.retryable || i === maxRetries) {
        throw parsedError
      }
      
      // Wait with exponential backoff
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)))
    }
  }
  
  throw lastError
}