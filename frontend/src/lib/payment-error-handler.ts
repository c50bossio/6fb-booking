/**
 * Comprehensive payment error handling and retry logic
 */

import { getStripeErrorMessage } from './stripe'

// Error types
export interface PaymentError {
  type: 'card_error' | 'payment_error' | 'network_error' | 'validation_error' | 'api_error'
  code?: string
  message: string
  decline_code?: string
  retry_after?: number
  retry_count?: number
  timestamp: Date
  payment_intent_id?: string
  original_error?: any
}

export interface RetryConfig {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryableErrors: string[]
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffMultiplier: 2,
  retryableErrors: [
    'network_error',
    'api_connection_error',
    'api_error',
    'rate_limit',
    'processing_error'
  ]
}

// Non-retryable error codes (card issues that won't resolve with retry)
const NON_RETRYABLE_CODES = [
  'card_declined',
  'insufficient_funds',
  'expired_card',
  'incorrect_cvc',
  'incorrect_number',
  'invalid_expiry_month',
  'invalid_expiry_year',
  'invalid_cvc',
  'authentication_required',
  'card_not_supported',
  'currency_not_supported',
  'duplicate_transaction',
  'fraudulent',
  'generic_decline',
  'incorrect_zip',
  'invalid_account',
  'new_account_information_available',
  'no_action_taken',
  'not_permitted',
  'pickup_card',
  'restricted_card',
  'revoked_authorization',
  'security_violation',
  'service_not_allowed',
  'stolen_card',
  'stop_payment_order',
  'testmode_decline',
  'transaction_not_allowed',
  'try_again_later',
  'withdrawal_count_limit_exceeded'
]

/**
 * Payment Error Handler
 */
export class PaymentErrorHandler {
  private retryConfig: RetryConfig
  private errorHistory: PaymentError[] = []

  constructor(config: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  }

  /**
   * Process and categorize payment errors
   */
  processError(error: any, context?: { payment_intent_id?: string }): PaymentError {
    const processedError: PaymentError = {
      type: this.categorizeError(error),
      message: this.extractErrorMessage(error),
      timestamp: new Date(),
      original_error: error,
      ...context
    }

    // Extract additional error details for Stripe errors
    if (error?.type) {
      processedError.code = error.code
      processedError.decline_code = error.decline_code
    }

    // Add to error history
    this.errorHistory.push(processedError)

    return processedError
  }

  /**
   * Categorize error type
   */
  private categorizeError(error: any): PaymentError['type'] {
    if (!error) return 'payment_error'

    // Stripe error types
    if (error.type === 'card_error') return 'card_error'
    if (error.type === 'validation_error') return 'validation_error'
    if (error.type === 'api_connection_error') return 'network_error'
    if (error.type === 'api_error') return 'api_error'
    if (error.type === 'rate_limit_error') return 'api_error'

    // Network errors
    if (error.name === 'NetworkError' || error.message?.includes('network')) {
      return 'network_error'
    }

    // Validation errors
    if (error.message?.includes('invalid') || error.message?.includes('required')) {
      return 'validation_error'
    }

    return 'payment_error'
  }

  /**
   * Extract user-friendly error message
   */
  private extractErrorMessage(error: any): string {
    // Use Stripe error handler if available
    if (error?.type && (error.type.includes('card_') || error.type.includes('api_'))) {
      return getStripeErrorMessage(error)
    }

    // Generic error messages
    if (error?.message) {
      return error.message
    }

    return 'An unexpected error occurred during payment processing'
  }

  /**
   * Determine if error is retryable
   */
  isRetryable(error: PaymentError): boolean {
    // Don't retry card errors with non-retryable codes
    if (error.type === 'card_error' && error.code) {
      return !NON_RETRYABLE_CODES.includes(error.code)
    }

    // Retry network and API errors
    if (['network_error', 'api_error'].includes(error.type)) {
      return true
    }

    // Don't retry validation errors
    if (error.type === 'validation_error') {
      return false
    }

    // Check against configured retryable errors
    return this.retryConfig.retryableErrors.includes(error.type)
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  calculateRetryDelay(attemptNumber: number): number {
    const delay = this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffMultiplier, attemptNumber)
    return Math.min(delay, this.retryConfig.maxDelay)
  }

  /**
   * Execute payment operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context?: { payment_intent_id?: string }
  ): Promise<T> {
    let lastError: PaymentError | null = null

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = this.processError(error, {
          ...context,
          retry_count: attempt
        })

        // Don't retry on last attempt or non-retryable errors
        if (attempt === this.retryConfig.maxRetries || !this.isRetryable(lastError)) {
          break
        }

        // Wait before retry
        const delay = this.calculateRetryDelay(attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }

  /**
   * Get error suggestions for users
   */
  getErrorSuggestions(error: PaymentError): string[] {
    const suggestions: string[] = []

    switch (error.type) {
      case 'card_error':
        switch (error.code) {
          case 'card_declined':
            suggestions.push('Contact your bank to verify your card is active')
            suggestions.push('Try using a different payment method')
            break
          case 'insufficient_funds':
            suggestions.push('Check your account balance')
            suggestions.push('Try using a different card or payment method')
            break
          case 'expired_card':
            suggestions.push('Update your card expiration date')
            suggestions.push('Use a different card that hasn\'t expired')
            break
          case 'incorrect_cvc':
            suggestions.push('Double-check the security code on your card')
            suggestions.push('Make sure you\'re entering the 3-digit code from the back of your card')
            break
          default:
            suggestions.push('Verify your card details are correct')
            suggestions.push('Try using a different payment method')
        }
        break

      case 'network_error':
        suggestions.push('Check your internet connection')
        suggestions.push('Try again in a few moments')
        suggestions.push('Refresh the page and retry')
        break

      case 'validation_error':
        suggestions.push('Double-check all required fields are filled')
        suggestions.push('Verify your payment information is correct')
        suggestions.push('Make sure your email address is valid')
        break

      case 'api_error':
        suggestions.push('Wait a few minutes and try again')
        suggestions.push('Contact our support team if the issue persists')
        break

      default:
        suggestions.push('Try refreshing the page and starting over')
        suggestions.push('Contact our support team for assistance')
    }

    return suggestions
  }

  /**
   * Get error history for debugging
   */
  getErrorHistory(): PaymentError[] {
    return [...this.errorHistory]
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = []
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number
    errorsByType: Record<string, number>
    retryableErrors: number
    nonRetryableErrors: number
  } {
    const stats = {
      totalErrors: this.errorHistory.length,
      errorsByType: {} as Record<string, number>,
      retryableErrors: 0,
      nonRetryableErrors: 0
    }

    this.errorHistory.forEach(error => {
      // Count by type
      stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1

      // Count retryable vs non-retryable
      if (this.isRetryable(error)) {
        stats.retryableErrors++
      } else {
        stats.nonRetryableErrors++
      }
    })

    return stats
  }
}

/**
 * Global payment error handler instance
 */
export const paymentErrorHandler = new PaymentErrorHandler()

/**
 * Convenience function for handling payment errors
 */
export function handlePaymentError(error: any, context?: { payment_intent_id?: string }): PaymentError {
  return paymentErrorHandler.processError(error, context)
}

/**
 * Convenience function for retrying payment operations
 */
export async function retryPaymentOperation<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>,
  context?: { payment_intent_id?: string }
): Promise<T> {
  const handler = config ? new PaymentErrorHandler(config) : paymentErrorHandler
  return handler.executeWithRetry(operation, context)
}
