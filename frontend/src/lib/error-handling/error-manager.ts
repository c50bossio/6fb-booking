/**
 * Central error management system for the calendar application
 */

import {
  AppError,
  BaseError,
  NetworkError,
  ValidationError,
  ConflictError,
  AuthError,
  SystemError,
  ErrorCode,
  ErrorSeverity,
  ErrorContext,
  RecoverySuggestion,
  isAppError,
  isNetworkError,
  isRetryableError,
} from './error-types';

interface ErrorPattern {
  code: ErrorCode;
  count: number;
  lastOccurrence: Date;
  frequency: number; // errors per hour
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  backoffMultiplier: number;
}

interface ErrorManagerConfig {
  enableErrorReporting: boolean;
  enableRetry: boolean;
  defaultRetryConfig: RetryConfig;
  reportingEndpoint?: string;
  maxPatternHistory: number;
}

export class ErrorManager {
  private static instance: ErrorManager;
  private errorPatterns: Map<ErrorCode, ErrorPattern> = new Map();
  private config: ErrorManagerConfig;
  private errorListeners: Array<(error: AppError) => void> = [];

  private constructor(config?: Partial<ErrorManagerConfig>) {
    this.config = {
      enableErrorReporting: true,
      enableRetry: true,
      defaultRetryConfig: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
      maxPatternHistory: 100,
      ...config,
    };
  }

  public static getInstance(config?: Partial<ErrorManagerConfig>): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager(config);
    }
    return ErrorManager.instance;
  }

  /**
   * Handle an error with comprehensive processing
   */
  public async handleError(error: unknown, context?: Partial<ErrorContext>): Promise<AppError> {
    const appError = this.normalizeError(error, context);

    // Track error patterns
    this.trackErrorPattern(appError);

    // Notify listeners
    this.notifyListeners(appError);

    // Report error if enabled
    if (this.config.enableErrorReporting) {
      await this.reportError(appError);
    }

    return appError;
  }

  /**
   * Execute an operation with automatic retry logic
   */
  public async withRetry<T>(
    operation: () => Promise<T>,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config.defaultRetryConfig, ...retryConfig };
    let lastError: Error;

    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry if not enabled or not retryable
        if (!this.config.enableRetry || !isRetryableError(error)) {
          throw await this.handleError(error);
        }

        // Don't retry on last attempt
        if (attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );

        await this.delay(delay);
      }
    }

    // All retries exhausted
    const retryError = new SystemError(
      `Operation failed after ${config.maxAttempts} attempts`,
      {
        originalError: lastError,
        userMessage: 'The operation could not be completed. Please try again later.',
      }
    );

    throw await this.handleError(retryError);
  }

  /**
   * Convert any error to AppError
   */
  private normalizeError(error: unknown, context?: Partial<ErrorContext>): AppError {
    if (isAppError(error)) {
      // Already an AppError, just update context
      if (context) {
        error.context = { ...error.context, ...context };
      }
      return error;
    }

    if (error instanceof Error) {
      // Classify error type based on message and properties
      return this.classifyError(error, context);
    }

    // Unknown error type
    return new SystemError(
      `Unknown error: ${String(error)}`,
      {
        userMessage: 'An unexpected error occurred',
        context,
      }
    );
  }

  /**
   * Classify error based on its properties
   */
  private classifyError(error: Error, context?: Partial<ErrorContext>): AppError {
    const message = error.message.toLowerCase();

    // Network errors
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('timeout') ||
      error.name === 'NetworkError'
    ) {
      return new NetworkError(error.message, {
        originalError: error,
        context,
      });
    }

    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required')
    ) {
      return new ValidationError(error.message, undefined, {
        context,
      });
    }

    // Auth errors
    if (
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('authentication')
    ) {
      return new AuthError(error.message, ErrorCode.UNAUTHORIZED, {
        context,
      });
    }

    // Default to system error
    return new SystemError(error.message, {
      originalError: error,
      context,
    });
  }

  /**
   * Track error patterns for analysis
   */
  private trackErrorPattern(error: AppError): void {
    const existing = this.errorPatterns.get(error.code);
    const now = new Date();

    if (existing) {
      existing.count++;
      const hoursSinceFirst = (now.getTime() - existing.lastOccurrence.getTime()) / (1000 * 60 * 60);
      existing.frequency = existing.count / Math.max(hoursSinceFirst, 1);
      existing.lastOccurrence = now;
    } else {
      this.errorPatterns.set(error.code, {
        code: error.code,
        count: 1,
        lastOccurrence: now,
        frequency: 1,
      });
    }

    // Cleanup old patterns
    if (this.errorPatterns.size > this.config.maxPatternHistory) {
      const oldestEntry = Array.from(this.errorPatterns.entries())
        .sort((a, b) => a[1].lastOccurrence.getTime() - b[1].lastOccurrence.getTime())[0];

      this.errorPatterns.delete(oldestEntry[0]);
    }
  }

  /**
   * Get error statistics
   */
  public getErrorStats(): {
    totalErrors: number;
    errorsByCode: Record<ErrorCode, number>;
    frequentErrors: ErrorPattern[];
  } {
    const patterns = Array.from(this.errorPatterns.values());

    return {
      totalErrors: patterns.reduce((sum, pattern) => sum + pattern.count, 0),
      errorsByCode: patterns.reduce((acc, pattern) => {
        acc[pattern.code] = pattern.count;
        return acc;
      }, {} as Record<ErrorCode, number>),
      frequentErrors: patterns
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10),
    };
  }

  /**
   * Register error listener
   */
  public onError(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all error listeners
   */
  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * Report error to external service
   */
  private async reportError(error: AppError): Promise<void> {
    if (!this.config.reportingEndpoint) {
      return;
    }

    try {
      await fetch(this.config.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          error: {
            name: error.name,
            message: error.message,
            code: error.code,
            severity: error.severity,
            stack: error.stack,
            context: error.context,
          },
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  /**
   * Get user-friendly error message
   */
  public getUserMessage(error: AppError): string {
    if (error.userMessage) {
      return error.userMessage;
    }

    // Default messages based on error type
    switch (error.severity) {
      case ErrorSeverity.INFO:
        return 'Information: ' + error.message;
      case ErrorSeverity.WARNING:
        return 'Warning: ' + error.message;
      case ErrorSeverity.ERROR:
        return 'Error: ' + error.message;
      case ErrorSeverity.CRITICAL:
        return 'Critical error occurred. Please contact support.';
      default:
        return error.message;
    }
  }

  /**
   * Get recovery suggestions for an error
   */
  public getRecoverySuggestions(error: AppError): RecoverySuggestion[] {
    const suggestions = error.recoverySuggestions || [];

    // Add generic suggestions based on error type
    if (isNetworkError(error) && suggestions.length === 0) {
      suggestions.push({
        message: 'Check your internet connection',
      });
    }

    return suggestions;
  }

  /**
   * Clear error patterns (useful for testing)
   */
  public clearErrorPatterns(): void {
    this.errorPatterns.clear();
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const errorManager = ErrorManager.getInstance();

// Utility functions
export function handleError(error: unknown, context?: Partial<ErrorContext>): Promise<AppError> {
  return errorManager.handleError(error, context);
}

export function withRetry<T>(
  operation: () => Promise<T>,
  retryConfig?: Partial<RetryConfig>
): Promise<T> {
  return errorManager.withRetry(operation, retryConfig);
}

export function getUserMessage(error: AppError): string {
  return errorManager.getUserMessage(error);
}

export function getRecoverySuggestions(error: AppError): RecoverySuggestion[] {
  return errorManager.getRecoverySuggestions(error);
}
