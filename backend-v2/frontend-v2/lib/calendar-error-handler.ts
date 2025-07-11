import { toastError, toastWarning, toastInfo } from '@/hooks/use-toast'

export type CalendarErrorType = 
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_ERROR'
  | 'CONFLICT_RESOLUTION_FAILED'
  | 'SYNC_AUTH_ERROR'
  | 'LOCATION_LOAD_ERROR'
  | 'APPOINTMENT_UPDATE_FAILED'
  | 'PERMISSION_DENIED'
  | 'RATE_LIMITED'
  | 'UNKNOWN_ERROR'

export interface CalendarError {
  type: CalendarErrorType
  message: string
  details?: any
  retryable: boolean
  statusCode?: number
}

export class CalendarErrorHandler {
  private static retryAttempts = new Map<string, number>()
  private static maxRetries = 3
  private static retryDelay = 1000 // Start with 1 second

  static async handleError(error: any, context: string): Promise<CalendarError> {
    // Determine error type
    const errorType = this.determineErrorType(error)
    const retryKey = `${context}-${errorType}`
    
    // Track retry attempts
    const attempts = this.retryAttempts.get(retryKey) || 0
    this.retryAttempts.set(retryKey, attempts + 1)
    
    const calendarError: CalendarError = {
      type: errorType,
      message: this.getErrorMessage(errorType, error),
      details: error,
      retryable: this.isRetryable(errorType) && attempts < this.maxRetries,
      statusCode: error?.response?.status || error?.status
    }

    // Show appropriate toast based on error type
    this.showErrorToast(calendarError, attempts)
    
    return calendarError
  }

  private static determineErrorType(error: any): CalendarErrorType {
    // Network timeout
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'NETWORK_TIMEOUT'
    }
    
    // Network error
    if (error?.code === 'ERR_NETWORK' || !navigator.onLine) {
      return 'NETWORK_ERROR'
    }
    
    // Auth errors
    if (error?.response?.status === 401 || error?.message?.includes('authentication')) {
      return 'SYNC_AUTH_ERROR'
    }
    
    // Permission errors
    if (error?.response?.status === 403) {
      return 'PERMISSION_DENIED'
    }
    
    // Rate limiting
    if (error?.response?.status === 429) {
      return 'RATE_LIMITED'
    }
    
    // Conflict resolution
    if (error?.message?.includes('conflict') || error?.response?.data?.type === 'conflict') {
      return 'CONFLICT_RESOLUTION_FAILED'
    }
    
    // Location loading
    if (error?.message?.includes('location')) {
      return 'LOCATION_LOAD_ERROR'
    }
    
    // Appointment update
    if (error?.message?.includes('appointment') || error?.response?.data?.type === 'appointment_error') {
      return 'APPOINTMENT_UPDATE_FAILED'
    }
    
    return 'UNKNOWN_ERROR'
  }

  private static getErrorMessage(type: CalendarErrorType, error: any): string {
    switch (type) {
      case 'NETWORK_TIMEOUT':
        return 'Request timed out. Please check your connection and try again.'
      
      case 'NETWORK_ERROR':
        return navigator.onLine 
          ? 'Unable to reach the server. Please try again.'
          : 'You appear to be offline. Please check your internet connection.'
      
      case 'CONFLICT_RESOLUTION_FAILED':
        return 'Unable to resolve scheduling conflict. Please choose a different time.'
      
      case 'SYNC_AUTH_ERROR':
        return 'Calendar sync authentication failed. Please reconnect your calendar.'
      
      case 'LOCATION_LOAD_ERROR':
        return 'Unable to load location data. Some features may be limited.'
      
      case 'APPOINTMENT_UPDATE_FAILED':
        return error?.response?.data?.message || 'Failed to update appointment. Please try again.'
      
      case 'PERMISSION_DENIED':
        return 'You do not have permission to perform this action.'
      
      case 'RATE_LIMITED':
        const retryAfter = error?.response?.headers?.['retry-after']
        return retryAfter 
          ? `Too many requests. Please wait ${retryAfter} seconds.`
          : 'Too many requests. Please wait a moment and try again.'
      
      default:
        return error?.message || 'An unexpected error occurred. Please try again.'
    }
  }

  private static isRetryable(type: CalendarErrorType): boolean {
    return [
      'NETWORK_TIMEOUT',
      'NETWORK_ERROR',
      'LOCATION_LOAD_ERROR',
      'APPOINTMENT_UPDATE_FAILED'
    ].includes(type)
  }

  private static showErrorToast(error: CalendarError, attempts: number) {
    const isFirstAttempt = attempts === 0
    
    switch (error.type) {
      case 'NETWORK_TIMEOUT':
      case 'NETWORK_ERROR':
        if (isFirstAttempt) {
          toastWarning('Connection Issue', error.message)
        } else {
          toastError('Connection Failed', error.message)
        }
        break
      
      case 'SYNC_AUTH_ERROR':
      case 'PERMISSION_DENIED':
        toastError('Access Denied', error.message)
        break
      
      case 'RATE_LIMITED':
        toastWarning('Slow Down', error.message)
        break
      
      case 'CONFLICT_RESOLUTION_FAILED':
        toastWarning('Scheduling Conflict', error.message)
        break
      
      default:
        if (error.retryable && attempts < this.maxRetries) {
          toastWarning('Temporary Issue', `${error.message} (Retry ${attempts + 1}/${this.maxRetries})`)
        } else {
          toastError('Error', error.message)
        }
    }
  }

  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string,
    options: { maxRetries?: number; initialDelay?: number } = {}
  ): Promise<T> {
    const maxRetries = options.maxRetries || this.maxRetries
    const initialDelay = options.initialDelay || this.retryDelay
    
    let lastError: any
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Clear retry count on success
        const retryKey = `${context}-*`
        Array.from(this.retryAttempts.keys())
          .filter(key => key.startsWith(context))
          .forEach(key => this.retryAttempts.delete(key))
        
        return await operation()
      } catch (error) {
        lastError = error
        const calendarError = await this.handleError(error, context)
        
        if (!calendarError.retryable || attempt === maxRetries - 1) {
          throw error
        }
        
        // Exponential backoff
        const delay = initialDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }

  static clearRetryHistory(context?: string) {
    if (context) {
      Array.from(this.retryAttempts.keys())
        .filter(key => key.startsWith(context))
        .forEach(key => this.retryAttempts.delete(key))
    } else {
      this.retryAttempts.clear()
    }
  }
}

// Specific error handlers for calendar operations
export const handleAppointmentError = (error: any) => {
  return CalendarErrorHandler.handleError(error, 'appointment')
}

export const handleSyncError = (error: any) => {
  return CalendarErrorHandler.handleError(error, 'sync')
}

export const handleLocationError = (error: any) => {
  return CalendarErrorHandler.handleError(error, 'location')
}

// Network timeout configuration
export const CALENDAR_TIMEOUTS = {
  DEFAULT: 10000,      // 10 seconds
  APPOINTMENT: 15000,  // 15 seconds for appointment operations
  SYNC: 30000,        // 30 seconds for sync operations
  EXPORT: 60000       // 60 seconds for export operations
}

// Utility to add timeout to promises
export function withTimeout<T>(
  promise: Promise<T>, 
  timeoutMs: number = CALENDAR_TIMEOUTS.DEFAULT,
  timeoutError = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
    )
  ])
}