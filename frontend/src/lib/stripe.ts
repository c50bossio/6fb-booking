/**
 * Stripe client configuration and utilities
 */
import { loadStripe, Stripe } from '@stripe/stripe-js'
import type { StripePaymentElementOptions } from '@stripe/stripe-js'

// Initialize Stripe with publishable key
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!stripePublishableKey && process.env.NODE_ENV !== 'production') {
  console.warn('Stripe publishable key not found in environment variables')
}

// Singleton instance of Stripe
let stripePromise: Promise<Stripe | null> | null = null

/**
 * Get Stripe instance
 */
export const getStripe = () => {
  if (!stripePromise && stripePublishableKey) {
    stripePromise = loadStripe(stripePublishableKey)
  }
  return stripePromise
}

/**
 * Default Stripe PaymentElement options
 */
export const defaultPaymentElementOptions: StripePaymentElementOptions = {
  layout: {
    type: 'tabs',
    defaultCollapsed: false,
    radios: false,
    spacedAccordionItems: false
  },
  paymentMethodOrder: ['card', 'apple_pay', 'google_pay'],
  fields: {
    billingDetails: {
      name: 'auto',
      email: 'auto',
      phone: 'auto',
      address: {
        country: 'never',
        line1: 'auto',
        line2: 'auto',
        city: 'auto',
        state: 'auto',
        postalCode: 'auto'
      }
    }
  },
  wallets: {
    applePay: 'auto',
    googlePay: 'auto'
  }
}

/**
 * Appearance configuration for Stripe Elements
 */
export const stripeAppearance = {
  theme: 'stripe' as const,
  variables: {
    colorPrimary: '#0570de',
    colorBackground: '#ffffff',
    colorText: '#1f2937',
    colorDanger: '#df1b41',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacingUnit: '4px',
    borderRadius: '8px'
  },
  rules: {
    '.Tab': {
      padding: '12px 16px',
      borderRadius: '8px'
    },
    '.Input': {
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #d1d5db'
    },
    '.Input:focus': {
      borderColor: '#0570de',
      boxShadow: '0 0 0 2px rgba(5, 112, 222, 0.1)'
    }
  }
}

/**
 * Dark theme appearance configuration
 */
export const stripeDarkAppearance = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#20d9d2',
    colorBackground: '#1f2937',
    colorText: '#f9fafb',
    colorDanger: '#ef4444',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacingUnit: '4px',
    borderRadius: '8px'
  },
  rules: {
    '.Tab': {
      padding: '12px 16px',
      borderRadius: '8px',
      backgroundColor: '#374151'
    },
    '.Input': {
      padding: '12px',
      borderRadius: '8px',
      backgroundColor: '#374151',
      border: '1px solid #4b5563'
    },
    '.Input:focus': {
      borderColor: '#20d9d2',
      boxShadow: '0 0 0 2px rgba(32, 217, 210, 0.1)'
    }
  }
}

/**
 * Validate Stripe configuration
 */
export const validateStripeConfig = (): boolean => {
  return !!stripePublishableKey
}

/**
 * Format amount for Stripe (convert to cents)
 */
export const formatAmountForStripe = (amount: number, currency = 'usd'): number => {
  // Stripe expects amounts in the smallest currency unit (cents for USD)
  return Math.round(amount * 100)
}

/**
 * Format amount for display (convert from cents)
 */
export const formatAmountFromStripe = (amount: number, currency = 'usd'): number => {
  return amount / 100
}

/**
 * Payment method types supported by the application
 */
export const SUPPORTED_PAYMENT_METHODS = [
  'card',
  'apple_pay',
  'google_pay'
] as const

export type SupportedPaymentMethod = typeof SUPPORTED_PAYMENT_METHODS[number]

/**
 * Stripe payment status mapping
 */
export const STRIPE_PAYMENT_STATUS = {
  requires_payment_method: 'pending',
  requires_confirmation: 'pending',
  requires_action: 'requires_action',
  processing: 'processing',
  requires_capture: 'processing',
  canceled: 'cancelled',
  succeeded: 'succeeded'
} as const

/**
 * Error messages for common Stripe errors
 */
export const STRIPE_ERROR_MESSAGES = {
  card_declined: 'Your card was declined. Please try a different payment method.',
  insufficient_funds: 'Your card has insufficient funds. Please try a different payment method.',
  expired_card: 'Your card has expired. Please try a different payment method.',
  incorrect_cvc: 'Your card\'s security code is incorrect. Please try again.',
  processing_error: 'An error occurred while processing your card. Please try again.',
  incorrect_number: 'Your card number is incorrect. Please try again.',
  invalid_expiry_month: 'Your card\'s expiration month is invalid. Please try again.',
  invalid_expiry_year: 'Your card\'s expiration year is invalid. Please try again.',
  generic_decline: 'Your card was declined. Please contact your bank or try a different payment method.',
  rate_limit: 'Too many requests. Please wait a moment and try again.',
  api_connection_error: 'Network error. Please check your connection and try again.',
  api_error: 'Payment service error. Please try again.',
  authentication_error: 'Authentication error. Please refresh the page and try again.',
  invalid_request_error: 'Invalid payment request. Please refresh the page and try again.'
}

/**
 * Get user-friendly error message from Stripe error
 */
export const getStripeErrorMessage = (error: any): string => {
  if (!error) return 'An unknown error occurred'

  // Handle Stripe error object
  if (error.type === 'card_error' && error.code) {
    return STRIPE_ERROR_MESSAGES[error.code as keyof typeof STRIPE_ERROR_MESSAGES] || error.message
  }

  // Handle other Stripe error types
  if (error.type && STRIPE_ERROR_MESSAGES[error.type as keyof typeof STRIPE_ERROR_MESSAGES]) {
    return STRIPE_ERROR_MESSAGES[error.type as keyof typeof STRIPE_ERROR_MESSAGES]
  }

  // Return the error message if it exists
  if (error.message) {
    return error.message
  }

  // Fallback
  return 'An error occurred while processing your payment. Please try again.'
}
