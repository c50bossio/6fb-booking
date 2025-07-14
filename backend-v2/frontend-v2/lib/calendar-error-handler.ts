/**
 * Calendar Error Handler
 * Centralized error handling for calendar components
 */

export interface CalendarError {
  type: 'validation' | 'network' | 'permission' | 'unknown';
  message: string;
  details?: any;
  timestamp: Date;
}

export class CalendarErrorHandler {
  private static instance: CalendarErrorHandler;
  private errors: CalendarError[] = [];

  static getInstance(): CalendarErrorHandler {
    if (!CalendarErrorHandler.instance) {
      CalendarErrorHandler.instance = new CalendarErrorHandler();
    }
    return CalendarErrorHandler.instance;
  }

  logError(error: Partial<CalendarError>): CalendarError {
    const calendarError: CalendarError = {
      type: error.type || 'unknown',
      message: error.message || 'An unknown error occurred',
      details: error.details,
      timestamp: new Date()
    };

    this.errors.push(calendarError);
    console.error('Calendar Error:', calendarError);

    return calendarError;
  }

  getErrors(): CalendarError[] {
    return [...this.errors];
  }

  clearErrors(): void {
    this.errors = [];
  }

  getErrorsByType(type: CalendarError['type']): CalendarError[] {
    return this.errors.filter(error => error.type === type);
  }

  static async retryWithBackoff<T>(
    fn: () => Promise<T>,
    context?: string,
    options: { maxRetries?: number; baseDelay?: number } = {}
  ): Promise<T> {
    const { maxRetries = 3, baseDelay = 1000 } = options;
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  static async handleError(error: any, context: string): Promise<CalendarError> {
    const instance = CalendarErrorHandler.getInstance();
    const calendarError = instance.logError({
      type: error.name === 'NetworkError' ? 'network' : 'unknown',
      message: error.message || 'An error occurred',
      details: { context, originalError: error },
      timestamp: new Date()
    });
    
    return calendarError;
  }

  static clearRetryHistory(context: string): void {
    // Clear any retry history for the given context
    // This is a placeholder implementation
    console.log(`Clearing retry history for context: ${context}`);
  }
}

// Convenience functions
export const logCalendarError = (error: Partial<CalendarError>) => {
  return CalendarErrorHandler.getInstance().logError(error);
};

export const getCalendarErrors = () => {
  return CalendarErrorHandler.getInstance().getErrors();
};

export const clearCalendarErrors = () => {
  CalendarErrorHandler.getInstance().clearErrors();
};

// Error type helpers
export const isValidationError = (error: CalendarError) => error.type === 'validation';
export const isNetworkError = (error: CalendarError) => error.type === 'network';
export const isPermissionError = (error: CalendarError) => error.type === 'permission';

// Calendar timeout constants
export const CALENDAR_TIMEOUTS = {
  API_REQUEST: 5000,
  RENDER: 3000,
  INTERACTION: 1000,
  DEBOUNCE: 300,
  ANIMATION: 500,
  DEFAULT: 5000,
  APPOINTMENT: 8000
} as const;

// Timeout wrapper function
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = CALENDAR_TIMEOUTS.API_REQUEST,
  errorMessage: string = 'Operation timed out'
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        const error = logCalendarError({
          type: 'network',
          message: errorMessage,
          details: { timeout: timeoutMs }
        });
        reject(new Error(errorMessage));
      }, timeoutMs);
    })
  ]);
};

export default CalendarErrorHandler;