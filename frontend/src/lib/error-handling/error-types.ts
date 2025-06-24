/**
 * Error handling types and definitions for the calendar application
 */

export enum ErrorCode {
  // Network errors (1xxx)
  NETWORK_ERROR = 1000,
  NETWORK_TIMEOUT = 1001,
  NETWORK_OFFLINE = 1002,
  API_ERROR = 1003,

  // Validation errors (2xxx)
  VALIDATION_ERROR = 2000,
  INVALID_INPUT = 2001,
  MISSING_REQUIRED = 2002,
  FORMAT_ERROR = 2003,

  // Business logic errors (3xxx)
  BUSINESS_ERROR = 3000,
  BOOKING_CONFLICT = 3001,
  INSUFFICIENT_PERMISSIONS = 3002,
  RESOURCE_NOT_FOUND = 3003,
  DUPLICATE_ENTRY = 3004,
  QUOTA_EXCEEDED = 3005,

  // Authentication errors (4xxx)
  AUTH_ERROR = 4000,
  UNAUTHORIZED = 4001,
  SESSION_EXPIRED = 4002,
  INVALID_CREDENTIALS = 4003,

  // System errors (5xxx)
  SYSTEM_ERROR = 5000,
  UNKNOWN_ERROR = 5001,
  CONFIGURATION_ERROR = 5002,
  DEPENDENCY_ERROR = 5003,
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action?: string;
  metadata?: Record<string, any>;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
}

export interface RecoverySuggestion {
  message: string;
  action?: () => void | Promise<void>;
  actionLabel?: string;
}

export interface AppError extends Error {
  code: ErrorCode;
  severity: ErrorSeverity;
  context?: ErrorContext;
  originalError?: Error;
  isRetryable?: boolean;
  recoverySuggestions?: RecoverySuggestion[];
  userMessage?: string;
}

export class BaseError extends Error implements AppError {
  code: ErrorCode;
  severity: ErrorSeverity;
  context?: ErrorContext;
  originalError?: Error;
  isRetryable?: boolean;
  recoverySuggestions?: RecoverySuggestion[];
  userMessage?: string;

  constructor(
    message: string,
    code: ErrorCode,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
    options?: {
      originalError?: Error;
      isRetryable?: boolean;
      recoverySuggestions?: RecoverySuggestion[];
      userMessage?: string;
      context?: Partial<ErrorContext>;
    }
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.originalError = options?.originalError;
    this.isRetryable = options?.isRetryable ?? false;
    this.recoverySuggestions = options?.recoverySuggestions;
    this.userMessage = options?.userMessage;

    this.context = {
      timestamp: new Date(),
      ...options?.context,
    };

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export class NetworkError extends BaseError {
  constructor(
    message: string,
    options?: {
      originalError?: Error;
      isRetryable?: boolean;
      userMessage?: string;
      context?: Partial<ErrorContext>;
    }
  ) {
    super(
      message,
      ErrorCode.NETWORK_ERROR,
      ErrorSeverity.ERROR,
      {
        ...options,
        isRetryable: options?.isRetryable ?? true,
        recoverySuggestions: [
          {
            message: 'Check your internet connection and try again',
          },
          {
            message: 'If the problem persists, contact support',
          },
        ],
      }
    );
  }
}

export class ValidationError extends BaseError {
  fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    fieldErrors?: Record<string, string[]>,
    options?: {
      userMessage?: string;
      context?: Partial<ErrorContext>;
    }
  ) {
    super(
      message,
      ErrorCode.VALIDATION_ERROR,
      ErrorSeverity.WARNING,
      {
        ...options,
        isRetryable: false,
        recoverySuggestions: [
          {
            message: 'Please check your input and try again',
          },
        ],
      }
    );
    this.fieldErrors = fieldErrors;
  }
}

export class ConflictError extends BaseError {
  conflictType: 'booking' | 'resource' | 'schedule';

  constructor(
    message: string,
    conflictType: 'booking' | 'resource' | 'schedule',
    options?: {
      userMessage?: string;
      context?: Partial<ErrorContext>;
      recoverySuggestions?: RecoverySuggestion[];
    }
  ) {
    super(
      message,
      ErrorCode.BOOKING_CONFLICT,
      ErrorSeverity.WARNING,
      {
        ...options,
        isRetryable: false,
        recoverySuggestions: options?.recoverySuggestions || [
          {
            message: 'Please select a different time slot',
          },
        ],
      }
    );
    this.conflictType = conflictType;
  }
}

export class AuthError extends BaseError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.AUTH_ERROR,
    options?: {
      userMessage?: string;
      context?: Partial<ErrorContext>;
    }
  ) {
    super(
      message,
      code,
      ErrorSeverity.ERROR,
      {
        ...options,
        isRetryable: false,
        recoverySuggestions: [
          {
            message: 'Please sign in again',
            actionLabel: 'Sign In',
          },
        ],
      }
    );
  }
}

export class SystemError extends BaseError {
  constructor(
    message: string,
    options?: {
      originalError?: Error;
      userMessage?: string;
      context?: Partial<ErrorContext>;
    }
  ) {
    super(
      message,
      ErrorCode.SYSTEM_ERROR,
      ErrorSeverity.CRITICAL,
      {
        ...options,
        isRetryable: true,
        userMessage: options?.userMessage || 'An unexpected error occurred. Please try again later.',
        recoverySuggestions: [
          {
            message: 'Try refreshing the page',
            action: () => window.location.reload(),
            actionLabel: 'Refresh',
          },
          {
            message: 'If the problem persists, contact support',
          },
        ],
      }
    );
  }
}

// Type guards
export function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error &&
    'code' in error &&
    'severity' in error
  );
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

export function isRetryableError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isRetryable ?? false;
  }
  return false;
}
