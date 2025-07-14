/**
 * Common API Types
 * 
 * Shared interfaces and types used across all API domains
 */

// ===============================
// Core Response Types
// ===============================

export interface APIResponse<T = any> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  requestId: string
  timestamp: string
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, any>
    validationErrors?: ValidationDetail[]
  }
  requestId: string
  timestamp: string
}

export interface ValidationDetail {
  field: string
  message: string
  code: string
  value?: any
}

// ===============================
// Request Configuration Types
// ===============================

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  timeout?: number
  retries?: number
  retryDelay?: number
  tags?: Record<string, string>
  feature?: string
  validation?: boolean
  retryConfig?: RetryConfig
}

export interface APIClientConfig {
  baseURL: string
  timeout: number
  retry: RetryConfig
  auth: AuthConfig
  monitoring: MonitoringConfig
  sentry: SentryConfig
  feature?: string
}

export interface AuthConfig {
  tokenStorage: 'localStorage' | 'sessionStorage' | 'memory'
  refreshThreshold: number // seconds before token expiry to refresh
  autoRefresh: boolean
}

export interface MonitoringConfig {
  enabled: boolean
  logRequests: boolean
  logResponses: boolean
  logErrors: boolean
  performanceTracking: boolean
  slowRequestThreshold: number // ms
}

export interface SentryConfig {
  enabled: boolean
  trackPerformance: boolean
  addBreadcrumbs: boolean
  reportErrors: boolean
  sampleRate: number
}

// ===============================
// Retry Configuration Types
// ===============================

export interface RetryConfig {
  maxRetries: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
  retryCondition?: (error: APIError) => boolean
}

export interface APIErrorContext {
  status?: number
  statusText?: string
  endpoint: string
  method: string
  requestId: string
  response?: Response
  timestamp: string
}

// ===============================
// Error Types
// ===============================

export class APIError extends Error {
  public status?: number
  public statusText?: string
  public endpoint: string
  public method: string
  public requestId: string
  public response?: Response
  public retryAttempt: number = 0
  public timestamp: string

  constructor(message: string, context: APIErrorContext) {
    super(message)
    this.name = 'APIError'
    this.status = context.status
    this.statusText = context.statusText
    this.endpoint = context.endpoint
    this.method = context.method
    this.requestId = context.requestId
    this.response = context.response
    this.timestamp = context.timestamp
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      statusText: this.statusText,
      endpoint: this.endpoint,
      method: this.method,
      requestId: this.requestId,
      retryAttempt: this.retryAttempt,
      timestamp: this.timestamp
    }
  }
}

export class NetworkError extends APIError {
  constructor(message: string, context: APIErrorContext) {
    super(message, context)
    this.name = 'NetworkError'
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string, context: APIErrorContext) {
    super(message, context)
    this.name = 'AuthenticationError'
  }
}

export class ValidationError extends APIError {
  public validationErrors: ValidationDetail[]
  
  constructor(message: string, context: APIErrorContext, validationErrors: ValidationDetail[]) {
    super(message, context)
    this.name = 'ValidationError'
    this.validationErrors = validationErrors
  }

  toJSON() {
    return {
      ...super.toJSON(),
      validationErrors: this.validationErrors
    }
  }
}

export class RateLimitError extends APIError {
  public retryAfter?: number // seconds
  
  constructor(message: string, context: APIErrorContext, retryAfter?: number) {
    super(message, context)
    this.name = 'RateLimitError'
    this.retryAfter = retryAfter
  }

  toJSON() {
    return {
      ...super.toJSON(),
      retryAfter: this.retryAfter
    }
  }
}

// ===============================
// Common Entity Types
// ===============================

export interface BaseEntity {
  id: number
  created_at: string
  updated_at: string
}

export interface TimestampedEntity {
  created_at: string
  updated_at: string
}

export interface NamedEntity extends BaseEntity {
  name: string
  description?: string
}

export interface UserReference {
  id: number
  email: string
  first_name: string
  last_name: string
  display_name?: string
}

export interface Address {
  street: string
  city: string
  state: string
  zip_code: string
  country?: string
}

export interface ContactInfo {
  email?: string
  phone?: string
  address?: Address
}

// ===============================
// Utility Types
// ===============================

export type OptionalFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type RequiredFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

export type CreateRequest<T extends BaseEntity> = Omit<T, 'id' | 'created_at' | 'updated_at'>

export type UpdateRequest<T extends BaseEntity> = Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>

// ===============================
// Predefined Retry Configurations
// ===============================

export const RETRY_PRESETS: Record<string, RetryConfig> = {
  standard: {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    backoffMultiplier: 2,
    retryCondition: (error: APIError) => {
      // Retry on server errors and rate limits, but not client errors
      return !error.status || error.status >= 500 || error.status === 429
    }
  },
  
  critical: {
    maxRetries: 5,
    initialDelay: 500,
    maxDelay: 10000,
    backoffMultiplier: 1.5,
    retryCondition: (error: APIError) => {
      // More aggressive retry for critical operations
      return !error.status || error.status >= 500 || error.status === 429 || error.status === 503
    }
  },
  
  realtime: {
    maxRetries: 1,
    initialDelay: 200,
    maxDelay: 1000,
    backoffMultiplier: 1,
    retryCondition: (error: APIError) => {
      // Quick retry only for server errors
      return !error.status || error.status >= 500
    }
  },
  
  none: {
    maxRetries: 0,
    initialDelay: 0,
    maxDelay: 0,
    backoffMultiplier: 1
  },

  auth: {
    maxRetries: 2,
    initialDelay: 1000,
    maxDelay: 3000,
    backoffMultiplier: 2,
    retryCondition: (error: APIError) => {
      // Don't retry authentication failures (401, 403) or validation errors (400)
      return !error.status || (error.status >= 500 && error.status !== 401 && error.status !== 403 && error.status !== 400)
    }
  }
}

// ===============================
// Default Configurations
// ===============================

export const DEFAULT_CLIENT_CONFIG: APIClientConfig = {
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 15000,
  retry: RETRY_PRESETS.standard,
  auth: {
    tokenStorage: 'localStorage',
    refreshThreshold: 300, // 5 minutes
    autoRefresh: true
  },
  monitoring: {
    enabled: true,
    logRequests: process.env.NODE_ENV === 'development',
    logResponses: process.env.NODE_ENV === 'development',
    logErrors: true,
    performanceTracking: true,
    slowRequestThreshold: 1000
  },
  sentry: {
    enabled: process.env.NODE_ENV === 'production',
    trackPerformance: true,
    addBreadcrumbs: true,
    reportErrors: true,
    sampleRate: 0.1
  }
}