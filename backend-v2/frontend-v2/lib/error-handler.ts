'use client'

import { toastError, toastSuccess, toastInfo } from '@/hooks/use-toast'

export interface AppError extends Error {
  code?: string
  status?: number
  retryable?: boolean
}

export class ErrorHandler {
  static handle(error: unknown, context?: string): AppError {
    const appError = this.normalizeError(error)
    
    // Log error for debugging
    // Show user-friendly notification
    this.showNotification(appError, context)
    
    return appError
  }
  
  static normalizeError(error: unknown): AppError {
    if (error instanceof Error) {
      const appError = error as AppError
      
      // Extract status code from error message if present
      const statusMatch = appError.message.match(/(\d{3})/)
      if (statusMatch) {
        appError.status = parseInt(statusMatch[1])
      }
      
      // Determine if error is retryable
      appError.retryable = this.isRetryable(appError)
      
      return appError
    }
    
    // Handle non-Error objects
    const message = typeof error === 'string' ? error : 'An unexpected error occurred'
    const appError = new Error(message) as AppError
    appError.retryable = false
    
    return appError
  }
  
  static isRetryable(error: AppError): boolean {
    // Network errors are usually retryable
    if (error.message.toLowerCase().includes('network') || 
        error.message.toLowerCase().includes('fetch') ||
        error.message.toLowerCase().includes('connection')) {
      return true
    }
    
    // Server errors (5xx) are retryable
    if (error.status && error.status >= 500) {
      return true
    }
    
    // Rate limiting is retryable
    if (error.status === 429) {
      return true
    }
    
    // Timeout errors are retryable
    if (error.message.toLowerCase().includes('timeout')) {
      return true
    }
    
    return false
  }
  
  static showNotification(error: AppError, context?: string) {
    const title = this.getErrorTitle(error, context)
    const message = this.getUserFriendlyMessage(error)
    
    toastError(title, message)
  }
  
  static getErrorTitle(error: AppError, context?: string): string {
    if (context) {
      return `${context} Error`
    }
    
    if (error.status) {
      switch (error.status) {
        case 401:
          return 'Authentication Error'
        case 403:
          return 'Permission Denied'
        case 404:
          return 'Not Found'
        case 429:
          return 'Rate Limit Exceeded'
        case 500:
          return 'Server Error'
        default:
          return 'Request Failed'
      }
    }
    
    if (error.message.toLowerCase().includes('network')) {
      return 'Connection Error'
    }
    
    return 'Error'
  }
  
  static getUserFriendlyMessage(error: AppError): string {
    // Return the original message if it's already user-friendly
    if (this.isUserFriendlyMessage(error.message)) {
      return error.message
    }
    
    // Provide generic messages for common error types
    if (error.status) {
      switch (error.status) {
        case 401:
          return 'Please log in to continue.'
        case 403:
          return 'You do not have permission to perform this action.'
        case 404:
          return 'The requested resource was not found.'
        case 429:
          return 'Too many requests. Please wait a moment and try again.'
        case 500:
          return 'Server error. Please try again later or contact support.'
      }
    }
    
    if (error.message.toLowerCase().includes('network')) {
      return 'Unable to connect to the server. Please check your connection and try again.'
    }
    
    return 'An unexpected error occurred. Please try again.'
  }
  
  static isUserFriendlyMessage(message: string): boolean {
    // Check if message is already user-friendly (doesn't contain technical terms)
    const technicalTerms = [
      'TypeError',
      'ReferenceError',
      'SyntaxError',
      'fetch',
      'XMLHttpRequest',
      'Promise',
      'undefined is not',
      'Cannot read property',
      'Cannot access before initialization'
    ]
    
    return !technicalTerms.some(term => 
      message.toLowerCase().includes(term.toLowerCase())
    )
  }
  
  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: string,
    onError?: (error: AppError) => void
  ): Promise<T | null> {
    try {
      return await operation()
    } catch (error) {
      const appError = this.handle(error, context)
      onError?.(appError)
      return null
    }
  }
  
  static showSuccess(message: string, description?: string) {
    toastSuccess(message, description)
  }
  
  static showInfo(message: string, description?: string) {
    toastInfo(message, description)
  }
}