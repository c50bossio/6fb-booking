/**
 * POS Error Handling Utilities
 * Provides comprehensive error handling for the POS system
 */

export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  OFFLINE = 'OFFLINE',
  DUPLICATE_SALE = 'DUPLICATE_SALE',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface POSError {
  type: ErrorType
  message: string
  userMessage: string
  code?: string
  details?: any
  timestamp: Date
  retryable: boolean
  retryCount?: number
  maxRetries?: number
}

export class POSErrorHandler {
  private static readonly ERROR_MESSAGES: Record<ErrorType, string> = {
    [ErrorType.NETWORK_ERROR]: 'Network connection error. Please check your internet connection.',
    [ErrorType.OFFLINE]: 'You are currently offline. Sales will be saved and synced when connection is restored.',
    [ErrorType.DUPLICATE_SALE]: 'This sale appears to be a duplicate. Please verify before proceeding.',
    [ErrorType.TRANSACTION_FAILED]: 'Transaction failed. Please try again or use a different payment method.',
    [ErrorType.AUTHENTICATION_ERROR]: 'Authentication failed. Please log in again.',
    [ErrorType.VALIDATION_ERROR]: 'Please check the entered information and try again.',
    [ErrorType.SERVER_ERROR]: 'Server error occurred. Our team has been notified.',
    [ErrorType.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
    [ErrorType.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.'
  }

  static createError(
    type: ErrorType,
    message: string,
    details?: any,
    retryable = true
  ): POSError {
    return {
      type,
      message,
      userMessage: this.ERROR_MESSAGES[type] || message,
      details,
      timestamp: new Date(),
      retryable,
      retryCount: 0,
      maxRetries: 3
    }
  }

  static parseError(error: any): POSError {
    // Handle different error formats
    if (error.response) {
      // Server responded with error
      const status = error.response.status
      const data = error.response.data

      if (status === 401) {
        return this.createError(
          ErrorType.AUTHENTICATION_ERROR,
          'Authentication failed',
          data,
          false
        )
      }

      if (status === 409) {
        return this.createError(
          ErrorType.DUPLICATE_SALE,
          data.message || 'Duplicate transaction detected',
          data,
          false
        )
      }

      if (status >= 500) {
        return this.createError(
          ErrorType.SERVER_ERROR,
          data.message || 'Server error',
          data,
          true
        )
      }

      if (status === 422 || status === 400) {
        return this.createError(
          ErrorType.VALIDATION_ERROR,
          data.message || 'Validation error',
          data,
          false
        )
      }
    } else if (error.request) {
      // Request made but no response
      if (!navigator.onLine) {
        return this.createError(
          ErrorType.OFFLINE,
          'No internet connection',
          error,
          true
        )
      }

      return this.createError(
        ErrorType.NETWORK_ERROR,
        'Network error',
        error,
        true
      )
    } else if (error.name === 'TimeoutError' || error.code === 'ECONNABORTED') {
      return this.createError(
        ErrorType.TIMEOUT_ERROR,
        'Request timeout',
        error,
        true
      )
    }

    // Unknown error
    return this.createError(
      ErrorType.UNKNOWN_ERROR,
      error.message || 'Unknown error',
      error,
      true
    )
  }

  static isRetryable(error: POSError): boolean {
    return error.retryable && (error.retryCount || 0) < (error.maxRetries || 3)
  }

  static incrementRetry(error: POSError): POSError {
    return {
      ...error,
      retryCount: (error.retryCount || 0) + 1
    }
  }

  static shouldShowOfflineMode(error: POSError): boolean {
    return error.type === ErrorType.OFFLINE || error.type === ErrorType.NETWORK_ERROR
  }

  static formatUserMessage(error: POSError): string {
    if (error.retryCount && error.retryCount > 0) {
      return `${error.userMessage} (Retry ${error.retryCount}/${error.maxRetries})`
    }
    return error.userMessage
  }
}

// Error recovery strategies
export interface RecoveryStrategy {
  canRecover(error: POSError): boolean
  recover(error: POSError, context: any): Promise<any>
}

export class OfflineRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: POSError): boolean {
    return error.type === ErrorType.OFFLINE || error.type === ErrorType.NETWORK_ERROR
  }

  async recover(error: POSError, context: any): Promise<any> {
    // Save to local storage for later sync
    const offlineData = {
      timestamp: new Date().toISOString(),
      data: context,
      error: error
    }

    const existing = localStorage.getItem('pos_offline_queue')
    const queue = existing ? JSON.parse(existing) : []
    queue.push(offlineData)
    localStorage.setItem('pos_offline_queue', JSON.stringify(queue))

    return { offline: true, queued: true }
  }
}

export class RetryStrategy implements RecoveryStrategy {
  private delays = [1000, 2000, 5000] // Exponential backoff

  canRecover(error: POSError): boolean {
    return POSErrorHandler.isRetryable(error)
  }

  async recover(error: POSError, context: any): Promise<any> {
    const retryCount = error.retryCount || 0
    const delay = this.delays[Math.min(retryCount, this.delays.length - 1)]

    await new Promise(resolve => setTimeout(resolve, delay))

    // Caller should retry the operation
    throw POSErrorHandler.incrementRetry(error)
  }
}

// Transaction rollback utilities
export class TransactionRollback {
  private static rollbackHandlers: Map<string, () => Promise<void>> = new Map()

  static register(transactionId: string, handler: () => Promise<void>) {
    this.rollbackHandlers.set(transactionId, handler)
  }

  static async rollback(transactionId: string) {
    const handler = this.rollbackHandlers.get(transactionId)
    if (handler) {
      try {
        await handler()
        this.rollbackHandlers.delete(transactionId)
      } catch (error) {
        console.error('Rollback failed:', error)
        throw error
      }
    }
  }

  static clear(transactionId: string) {
    this.rollbackHandlers.delete(transactionId)
  }
}
