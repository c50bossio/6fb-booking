/**
 * Comprehensive payment utilities for booking system
 */

import { formatAmountForStripe, formatAmountFromStripe, getStripeErrorMessage } from './stripe'
import { paymentsAPI, type PaymentStatus } from './api/payments'
import type { PaymentDetails as APIPaymentDetails } from '@/types/payment'

// Payment types and interfaces
export interface PaymentDetails {
  method: 'full' | 'deposit'
  amount: number
  currency: string
  status: PaymentStatus
  transaction_id: string
  payment_method_id: string
  metadata?: Record<string, any>
}

export interface PaymentIntent {
  id: string
  client_secret: string
  amount: number
  currency: string
  status: string
  metadata?: Record<string, any>
}

export interface PaymentResult {
  success: boolean
  paymentId?: string
  error?: string
  details?: PaymentDetails
}

export interface PaymentConfig {
  appointmentId: number
  amount: number
  paymentType: 'full' | 'deposit'
  customerEmail?: string
  metadata?: Record<string, any>
}

// Payment processing functions
export class PaymentProcessor {
  /**
   * Create a payment intent for Stripe
   */
  static async createPaymentIntent(config: PaymentConfig): Promise<PaymentIntent> {
    try {
      const intent = await paymentsAPI.createPaymentIntent({
        appointmentId: config.appointmentId.toString(),
        amount: formatAmountForStripe(config.amount),
        saveMethod: false,
        metadata: {
          payment_type: config.paymentType,
          customer_email: config.customerEmail,
          ...config.metadata
        }
      })

      return {
        id: intent.id,
        client_secret: intent.clientSecret,
        amount: config.amount,
        currency: intent.currency || 'USD',
        status: intent.status,
        metadata: config.metadata
      }
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Failed to create payment intent: ${error.message}`
          : 'Failed to create payment intent'
      )
    }
  }

  /**
   * Process payment confirmation
   */
  static async confirmPayment(
    paymentIntentId: string,
    paymentMethodId?: string
  ): Promise<PaymentResult> {
    try {
      const payment = await paymentsAPI.confirmPayment(paymentIntentId, paymentMethodId)

      return {
        success: true,
        paymentId: payment.id,
        details: {
          method: 'full',
          amount: formatAmountFromStripe(payment.amount),
          currency: payment.currency,
          status: payment.status,
          transaction_id: payment.id,
          payment_method_id: paymentMethodId || '',
          metadata: {}
        }
      }
    } catch (error) {
      return {
        success: false,
        error: getStripeErrorMessage(error)
      }
    }
  }

  /**
   * Cancel a payment
   */
  static async cancelPayment(paymentId: string): Promise<PaymentResult> {
    try {
      const payment = await paymentsAPI.cancelPayment(paymentId)

      return {
        success: true,
        paymentId: payment.id,
        details: {
          method: 'full',
          amount: formatAmountFromStripe(payment.amount),
          currency: payment.currency,
          status: payment.status,
          transaction_id: payment.id,
          payment_method_id: '',
          metadata: {}
        }
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel payment'
      }
    }
  }

  /**
   * Get payment details
   */
  static async getPaymentDetails(paymentId: string) {
    try {
      const payment = await paymentsAPI.getPayment(paymentId)
      return {
        success: true,
        payment
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get payment details'
      }
    }
  }
}

// Payment validation utilities
export class PaymentValidator {
  /**
   * Validate payment amount
   */
  static validateAmount(amount: number): { valid: boolean; error?: string } {
    if (amount <= 0) {
      return { valid: false, error: 'Payment amount must be greater than zero' }
    }

    if (amount > 10000) {
      return { valid: false, error: 'Payment amount cannot exceed $10,000' }
    }

    return { valid: true }
  }

  /**
   * Validate appointment for payment
   */
  static validateAppointment(appointmentId?: number): { valid: boolean; error?: string } {
    if (!appointmentId) {
      return { valid: false, error: 'Appointment ID is required for payment processing' }
    }

    return { valid: true }
  }

  /**
   * Validate customer email
   */
  static validateEmail(email?: string): { valid: boolean; error?: string } {
    if (!email) {
      return { valid: false, error: 'Customer email is required' }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Please provide a valid email address' }
    }

    return { valid: true }
  }

  /**
   * Validate payment configuration
   */
  static validatePaymentConfig(config: PaymentConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    const amountValidation = this.validateAmount(config.amount)
    if (!amountValidation.valid) {
      errors.push(amountValidation.error!)
    }

    const appointmentValidation = this.validateAppointment(config.appointmentId)
    if (!appointmentValidation.valid) {
      errors.push(appointmentValidation.error!)
    }

    if (config.customerEmail) {
      const emailValidation = this.validateEmail(config.customerEmail)
      if (!emailValidation.valid) {
        errors.push(emailValidation.error!)
      }
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

// Payment status utilities
export class PaymentStatusManager {
  /**
   * Get user-friendly status message
   */
  static getStatusMessage(status: PaymentStatus): string {
    switch (status) {
      case 'pending':
        return 'Payment is being processed'
      case 'processing':
        return 'Payment is currently being processed'
      case 'succeeded':
        return 'Payment completed successfully'
      case 'failed':
        return 'Payment failed'
      case 'cancelled':
        return 'Payment was cancelled'
      case 'refunded':
        return 'Payment has been refunded'
      case 'partially_refunded':
        return 'Payment has been partially refunded'
      case 'requires_action':
        return 'Additional action required to complete payment'
      default:
        return 'Unknown payment status'
    }
  }

  /**
   * Get status color for UI display
   */
  static getStatusColor(status: PaymentStatus): string {
    switch (status) {
      case 'succeeded':
        return 'text-green-600 bg-green-100'
      case 'pending':
      case 'processing':
        return 'text-blue-600 bg-blue-100'
      case 'failed':
        return 'text-red-600 bg-red-100'
      case 'cancelled':
        return 'text-gray-600 bg-gray-100'
      case 'refunded':
      case 'partially_refunded':
        return 'text-purple-600 bg-purple-100'
      case 'requires_action':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  /**
   * Check if payment can be refunded
   */
  static canRefund(status: PaymentStatus): boolean {
    return status === 'succeeded'
  }

  /**
   * Check if payment can be cancelled
   */
  static canCancel(status: PaymentStatus): boolean {
    return ['pending', 'requires_action'].includes(status)
  }
}

// Payment retry logic
export class PaymentRetryManager {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAYS = [1000, 2000, 4000] // Progressive delays

  /**
   * Retry payment processing with exponential backoff
   */
  static async retryPaymentProcess<T>(
    operation: () => Promise<T>,
    maxRetries: number = this.MAX_RETRIES
  ): Promise<T> {
    let lastError: Error

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')

        // Don't retry on final attempt
        if (attempt === maxRetries) {
          break
        }

        // Don't retry certain types of errors
        if (this.isNonRetryableError(lastError)) {
          break
        }

        // Wait before retry
        const delay = this.RETRY_DELAYS[attempt] || 4000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }

  /**
   * Check if error should not be retried
   */
  private static isNonRetryableError(error: Error): boolean {
    const nonRetryableMessages = [
      'card_declined',
      'insufficient_funds',
      'invalid_expiry_month',
      'invalid_expiry_year',
      'incorrect_cvc',
      'expired_card',
      'incorrect_number'
    ]

    return nonRetryableMessages.some(msg =>
      error.message.toLowerCase().includes(msg)
    )
  }
}

// Format utilities
export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount)
}

export const formatPaymentDate = (date: string | Date): string => {
  const paymentDate = typeof date === 'string' ? new Date(date) : date
  return paymentDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// All utilities are already exported as classes above
