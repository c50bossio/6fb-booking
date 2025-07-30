/**
 * Enhanced Error Handler
 * Comprehensive error handling for API requests with structured logging,
 * automatic retries, circuit breaker patterns, and business context awareness
 */

import * as Sentry from '@sentry/nextjs'

export interface ErrorContext {
  endpoint: string
  method: string
  statusCode?: number
  requestId?: string
  userId?: string
  userRole?: string
  feature?: string
  businessContext?: {
    barbershopId?: string
    appointmentId?: string
    clientId?: string
    paymentId?: string
    workflow?: 'booking' | 'payment' | 'analytics' | 'calendar' | 'auth'
  }
  retryAttempt?: number
  userAgent?: string
  correlationId?: string
}

export interface ApiErrorDetails {
  message: string
  code?: string
  details?: Record<string, any>
  validation?: Record<string, string[]>
  suggestion?: string
  retryable?: boolean
  category: 'network' | 'authentication' | 'authorization' | 'validation' | 'business' | 'system' | 'external'
  severity: 'low' | 'medium' | 'high' | 'critical'
  businessImpact: 'none' | 'minor' | 'major' | 'revenue_blocking'
}

export interface ErrorHandlerConfig {
  enableRetries?: boolean
  maxRetries?: number
  retryDelay?: number
  retryMultiplier?: number
  enableCircuitBreaker?: boolean
  circuitBreakerThreshold?: number
  enableLogging?: boolean
  enableSentry?: boolean
  enableUserNotification?: boolean
  customRecoveryActions?: Array<{
    condition: (error: any, context: ErrorContext) => boolean
    action: (error: any, context: ErrorContext) => Promise<any>
    description: string
  }>
}

class EnhancedErrorHandler {
  private config: Required<ErrorHandlerConfig>
  private circuitBreakers = new Map<string, CircuitBreaker>()
  private errorPatterns = new Map<string, ErrorPattern>()
  private correlationIdCounter = 0

  constructor(config: ErrorHandlerConfig = {}) {
    this.config = {
      enableRetries: true,
      maxRetries: 3,
      retryDelay: 1000,
      retryMultiplier: 2,
      enableCircuitBreaker: true,
      circuitBreakerThreshold: 5,
      enableLogging: true,
      enableSentry: true,
      enableUserNotification: true,
      customRecoveryActions: [],
      ...config
    }
  }

  /**
   * Main error handling method
   */
  async handleApiError(
    error: any,
    context: Partial<ErrorContext> = {},
    options: Partial<ErrorHandlerConfig> = {}
  ): Promise<ApiErrorDetails> {
    const mergedConfig = { ...this.config, ...options }
    const fullContext = this.enrichContext(context)
    
    // Generate correlation ID for tracking
    if (!fullContext.correlationId) {
      fullContext.correlationId = this.generateCorrelationId()
    }

    // Extract error details
    const errorDetails = this.extractErrorDetails(error, fullContext)
    
    // Log error with structured data
    if (mergedConfig.enableLogging) {
      this.logError(error, errorDetails, fullContext)
    }
    
    // Report to Sentry with enhanced context
    if (mergedConfig.enableSentry) {
      this.reportToSentry(error, errorDetails, fullContext)
    }
    
    // Update error patterns for analysis
    this.updateErrorPatterns(error, errorDetails, fullContext)
    
    // Handle circuit breaker logic
    if (mergedConfig.enableCircuitBreaker) {
      this.updateCircuitBreaker(fullContext.endpoint, errorDetails)
    }
    
    // Attempt automatic recovery
    const recoveryResult = await this.attemptRecovery(error, fullContext, mergedConfig)
    if (recoveryResult.recovered) {
      return recoveryResult.result
    }
    
    // Store error for analytics
    this.storeErrorAnalytics(error, errorDetails, fullContext)
    
    return errorDetails
  }

  /**
   * Enrich context with additional information
   */
  private enrichContext(context: Partial<ErrorContext>): ErrorContext {
    const enriched: ErrorContext = {
      endpoint: 'unknown',
      method: 'GET',
      ...context
    }

    // Add browser/session information
    if (typeof window !== 'undefined') {
      enriched.userAgent = navigator.userAgent
      enriched.correlationId = enriched.correlationId || sessionStorage.getItem('correlationId') || undefined
    }

    // Add timestamp
    enriched.timestamp = new Date().toISOString()

    return enriched
  }

  /**
   * Extract detailed error information
   */
  private extractErrorDetails(error: any, context: ErrorContext): ApiErrorDetails {
    let details: ApiErrorDetails = {
      message: 'An unexpected error occurred',
      category: 'system',
      severity: 'medium',
      businessImpact: 'minor',
      retryable: false
    }

    // Handle different error types
    if (error?.response) {
      // HTTP Response Error
      const status = error.response.status || 500
      const data = error.response.data || {}
      
      details = {
        message: data.message || data.detail || this.getDefaultMessage(status),
        code: data.code || `HTTP_${status}`,
        details: data.details || {},
        validation: data.validation || {},
        suggestion: data.suggestion || this.getDefaultSuggestion(status),
        retryable: this.isRetryableStatus(status),
        category: this.categorizeHttpError(status, context),
        severity: this.assessErrorSeverity(status, context),
        businessImpact: this.assessBusinessImpact(status, context)
      }
    } else if (error?.request) {
      // Network Error
      details = {
        message: 'Network connection failed. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        retryable: true,
        category: 'network',
        severity: 'high',
        businessImpact: this.assessNetworkBusinessImpact(context),
        suggestion: 'Please check your internet connection and try again.'
      }
    } else if (error instanceof TypeError && error.message.includes('fetch')) {
      // Fetch API Error
      details = {
        message: 'Failed to connect to the server.',
        code: 'FETCH_ERROR',
        retryable: true,
        category: 'network',
        severity: 'high',
        businessImpact: 'major',
        suggestion: 'Please check your internet connection and try again.'
      }
    } else if (error instanceof Error) {
      // Generic Error
      details = {
        message: error.message || 'An unexpected error occurred',
        code: error.name || 'GENERIC_ERROR',
        retryable: false,
        category: 'system',
        severity: 'medium',
        businessImpact: 'minor',
        suggestion: 'Please try again or contact support if the issue persists.'
      }
    }

    return details
  }

  /**
   * Categorize HTTP errors based on status code and context
   */
  private categorizeHttpError(status: number, context: ErrorContext): ApiErrorDetails['category'] {
    const endpoint = context.endpoint.toLowerCase()
    
    if (status === 401) return 'authentication'
    if (status === 403) return 'authorization'
    if (status >= 400 && status < 500) return 'validation'
    if (status >= 500 && status < 600) return 'system'
    
    // Context-based categorization
    if (endpoint.includes('auth') || endpoint.includes('login')) return 'authentication'
    if (endpoint.includes('payment') || endpoint.includes('stripe')) return 'external'
    if (endpoint.includes('booking') || endpoint.includes('appointment')) return 'business'
    
    return 'system'
  }

  /**
   * Assess error severity based on context
   */
  private assessErrorSeverity(status: number, context: ErrorContext): ApiErrorDetails['severity'] {
    const workflow = context.businessContext?.workflow
    
    // Critical severity for revenue-blocking workflows
    if ((workflow === 'payment' || workflow === 'booking') && status >= 500) {
      return 'critical'
    }
    
    // High severity for user-blocking errors
    if (status === 401 || status === 403 || (status >= 500 && status < 503)) {
      return 'high'
    }
    
    // Medium severity for validation errors
    if (status >= 400 && status < 500) {
      return 'medium'
    }
    
    return 'low'
  }

  /**
   * Assess business impact
   */
  private assessBusinessImpact(status: number, context: ErrorContext): ApiErrorDetails['businessImpact'] {
    const workflow = context.businessContext?.workflow
    const endpoint = context.endpoint.toLowerCase()
    
    // Revenue blocking
    if (workflow === 'payment' || endpoint.includes('payment') || endpoint.includes('stripe')) {
      return status >= 500 ? 'revenue_blocking' : 'major'
    }
    
    // Major impact for booking system
    if (workflow === 'booking' || endpoint.includes('booking') || endpoint.includes('appointment')) {
      return status >= 500 ? 'major' : 'minor'
    }
    
    // Auth errors block users
    if (status === 401 || status === 403) {
      return 'major'
    }
    
    return status >= 500 ? 'minor' : 'none'
  }

  /**
   * Assess network error business impact
   */
  private assessNetworkBusinessImpact(context: ErrorContext): ApiErrorDetails['businessImpact'] {
    const workflow = context.businessContext?.workflow
    
    if (workflow === 'payment') return 'revenue_blocking'
    if (workflow === 'booking') return 'major'
    return 'minor'
  }

  /**
   * Check if status code is retryable
   */
  private isRetryableStatus(status: number): boolean {
    // Retry server errors and some client errors
    return status >= 500 || status === 408 || status === 429 || status === 503
  }

  /**
   * Get default error message for HTTP status
   */
  private getDefaultMessage(status: number): string {
    const messages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'Authentication required. Please log in.',
      403: 'You do not have permission to perform this action.',
      404: 'The requested resource was not found.',
      408: 'Request timeout. Please try again.',
      409: 'Conflict with current state. Please refresh and try again.',
      422: 'Invalid data provided. Please check your input.',
      429: 'Too many requests. Please wait and try again.',
      500: 'Internal server error. Our team has been notified.',
      502: 'Service temporarily unavailable. Please try again.',
      503: 'Service temporarily unavailable. Please try again.',
      504: 'Request timeout. Please try again.'
    }
    
    return messages[status] || `HTTP Error ${status}`
  }

  /**
   * Get default suggestion for HTTP status
   */
  private getDefaultSuggestion(status: number): string {
    if (status === 401) return 'Please log in and try again.'
    if (status === 403) return 'Contact support if you believe you should have access.'
    if (status === 429) return 'Please wait a moment before trying again.'
    if (status >= 500) return 'Please try again in a few moments.'
    if (status >= 400) return 'Please check your input and try again.'
    return 'Please try again or contact support.'
  }

  /**
   * Log error with structured data
   */
  private logError(error: any, details: ApiErrorDetails, context: ErrorContext) {
    const logData = {
      timestamp: new Date().toISOString(),
      level: this.getLogLevel(details.severity),
      message: details.message,
      error: {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
        code: details.code
      },
      context: {
        ...context,
        userAgent: undefined // Remove potentially large user agent from logs
      },
      details,
      correlationId: context.correlationId,
      fingerprint: this.generateErrorFingerprint(error, details, context)
    }

    // Log to console with structured format
    if (details.severity === 'critical' || details.severity === 'high') {
      console.error('🚨 Critical API Error:', logData)
    } else if (details.severity === 'medium') {
      console.warn('⚠️ API Error:', logData)
    } else {
      console.info('ℹ️ API Error:', logData)
    }

    // Send to external logging service (if configured)
    this.sendToExternalLogging(logData)
  }

  /**
   * Report error to Sentry with enhanced context
   */
  private reportToSentry(error: any, details: ApiErrorDetails, context: ErrorContext) {
    try {
      Sentry.withScope((scope) => {
        // Set tags for filtering
        scope.setTag('errorHandler', 'enhanced')
        scope.setTag('category', details.category)
        scope.setTag('severity', details.severity)
        scope.setTag('businessImpact', details.businessImpact)
        scope.setTag('retryable', details.retryable)
        scope.setTag('httpStatus', context.statusCode)
        scope.setTag('endpoint', context.endpoint)
        scope.setTag('method', context.method)
        
        // Business context tags
        if (context.businessContext) {
          Object.entries(context.businessContext).forEach(([key, value]) => {
            if (value) scope.setTag(`business.${key}`, value)
          })
        }
        
        // Set context for debugging
        scope.setContext('errorDetails', details)
        scope.setContext('apiContext', {
          ...context,
          userAgent: undefined // Avoid large user agents
        })
        
        // Set user context
        scope.setUser({
          id: context.userId,
          role: context.userRole
        })
        
        // Set severity level
        if (details.severity === 'critical') {
          scope.setLevel('fatal')
        } else if (details.severity === 'high') {
          scope.setLevel('error')
        } else if (details.severity === 'medium') {
          scope.setLevel('warning')
        } else {
          scope.setLevel('info')
        }
        
        // Add breadcrumb
        Sentry.addBreadcrumb({
          category: 'api_error',
          message: `API Error: ${details.message}`,
          level: details.severity === 'critical' ? 'fatal' : 'error',
          data: {
            endpoint: context.endpoint,
            method: context.method,
            statusCode: context.statusCode,
            businessImpact: details.businessImpact
          }
        })
        
        // Capture exception
        Sentry.captureException(error)
      })
    } catch (sentryError) {
      console.warn('Failed to report to Sentry:', sentryError)
    }
  }

  /**
   * Update error patterns for analysis
   */
  private updateErrorPatterns(error: any, details: ApiErrorDetails, context: ErrorContext) {
    const fingerprint = this.generateErrorFingerprint(error, details, context)
    
    const existing = this.errorPatterns.get(fingerprint)
    if (existing) {
      existing.count++
      existing.lastSeen = new Date()
    } else {
      this.errorPatterns.set(fingerprint, {
        fingerprint,
        count: 1,
        firstSeen: new Date(),
        lastSeen: new Date(),
        details,
        context: { ...context }
      })
    }
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(endpoint: string, details: ApiErrorDetails) {
    let breaker = this.circuitBreakers.get(endpoint)
    if (!breaker) {
      breaker = new CircuitBreaker(this.config.circuitBreakerThreshold)
      this.circuitBreakers.set(endpoint, breaker)
    }
    
    breaker.recordError()
  }

  /**
   * Attempt automatic error recovery
   */
  private async attemptRecovery(
    error: any,
    context: ErrorContext,
    config: Required<ErrorHandlerConfig>
  ): Promise<{ recovered: boolean; result?: any }> {
    // Check circuit breaker
    const breaker = this.circuitBreakers.get(context.endpoint)
    if (breaker?.isOpen()) {
      return { recovered: false }
    }
    
    // Try custom recovery actions
    for (const action of config.customRecoveryActions) {
      if (action.condition(error, context)) {
        try {
          console.info(`🔧 Attempting recovery: ${action.description}`)
          const result = await action.action(error, context)
          return { recovered: true, result }
        } catch (recoveryError) {
          console.warn(`❌ Recovery failed: ${action.description}`, recoveryError)
        }
      }
    }
    
    return { recovered: false }
  }

  /**
   * Store error for analytics
   */
  private storeErrorAnalytics(error: any, details: ApiErrorDetails, context: ErrorContext) {
    // Store in localStorage for analytics (with size limits)
    try {
      const analyticsData = {
        timestamp: new Date().toISOString(),
        fingerprint: this.generateErrorFingerprint(error, details, context),
        category: details.category,
        severity: details.severity,
        businessImpact: details.businessImpact,
        endpoint: context.endpoint,
        method: context.method,
        statusCode: context.statusCode,
        workflow: context.businessContext?.workflow
      }
      
      const existing = JSON.parse(localStorage.getItem('errorAnalytics') || '[]')
      existing.push(analyticsData)
      
      // Keep only last 100 errors
      if (existing.length > 100) {
        existing.splice(0, existing.length - 100)
      }
      
      localStorage.setItem('errorAnalytics', JSON.stringify(existing))
    } catch (storageError) {
      console.warn('Failed to store error analytics:', storageError)
    }
  }

  /**
   * Generate error fingerprint for deduplication
   */
  private generateErrorFingerprint(error: any, details: ApiErrorDetails, context: ErrorContext): string {
    const components = [
      details.category,
      details.code || 'unknown',
      context.endpoint,
      context.method,
      context.statusCode?.toString() || 'unknown'
    ]
    
    return btoa(components.join('|')).substring(0, 16)
  }

  /**
   * Generate unique correlation ID for request tracking
   */
  private generateCorrelationId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    const counter = (++this.correlationIdCounter).toString(36)
    return `${timestamp}-${random}-${counter}`
  }

  /**
   * Get log level based on severity
   */
  private getLogLevel(severity: ApiErrorDetails['severity']): string {
    const levels = {
      critical: 'error',
      high: 'error',
      medium: 'warn',
      low: 'info'
    }
    return levels[severity] || 'info'
  }

  /**
   * Send to external logging service
   */
  private sendToExternalLogging(logData: any) {
    // Implementation for external logging service (e.g., LogRocket, DataDog)
    // This would be configured based on the specific service being used
    if (typeof window !== 'undefined' && (window as any).LogRocket) {
      (window as any).LogRocket.captureException(new Error(logData.message), {
        tags: {
          category: logData.details.category,
          severity: logData.details.severity
        },
        extra: logData
      })
    }
  }
}

/**
 * Circuit Breaker implementation
 */
class CircuitBreaker {
  private errorCount = 0
  private lastErrorTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'
  private readonly timeout = 60000 // 1 minute

  constructor(private threshold: number) {}

  recordError() {
    this.errorCount++
    this.lastErrorTime = Date.now()
    
    if (this.errorCount >= this.threshold) {
      this.state = 'open'
    }
  }

  recordSuccess() {
    this.errorCount = 0
    this.state = 'closed'
  }

  isOpen(): boolean {
    if (this.state === 'open') {
      if (Date.now() - this.lastErrorTime > this.timeout) {
        this.state = 'half-open'
        return false
      }
      return true
    }
    return false
  }
}

/**
 * Error Pattern interface for analytics
 */
interface ErrorPattern {
  fingerprint: string
  count: number
  firstSeen: Date
  lastSeen: Date
  details: ApiErrorDetails
  context: ErrorContext
}

// Global instance
export const enhancedErrorHandler = new EnhancedErrorHandler()

/**
 * Hook for using enhanced error handling in React components
 */
export function useEnhancedErrorHandler() {
  return {
    handleApiError: enhancedErrorHandler.handleApiError.bind(enhancedErrorHandler),
    getErrorPatterns: () => Array.from(enhancedErrorHandler['errorPatterns'].values()),
    getCircuitBreakerStatus: (endpoint: string) => {
      const breaker = enhancedErrorHandler['circuitBreakers'].get(endpoint)
      return breaker ? {
        isOpen: breaker.isOpen(),
        errorCount: breaker['errorCount'],
        state: breaker['state']
      } : null
    }
  }
}

/**
 * Default error handler configurations for different contexts
 */
export const ErrorHandlerConfigs = {
  payment: {
    enableRetries: true,
    maxRetries: 2,
    enableCircuitBreaker: true,
    enableUserNotification: true,
    customRecoveryActions: [
      {
        condition: (error: any) => error?.response?.status === 409,
        action: async () => {
          // Handle payment conflicts by checking transaction status
          console.info('Checking payment transaction status...')
          return { recovered: false } // Placeholder
        },
        description: 'Check payment transaction status'
      }
    ]
  },
  booking: {
    enableRetries: true,
    maxRetries: 3,
    enableCircuitBreaker: true,
    enableUserNotification: true,
    customRecoveryActions: [
      {
        condition: (error: any) => error?.response?.status === 409,
        action: async () => {
          // Handle booking conflicts by refreshing availability
          console.info('Refreshing appointment availability...')
          return { recovered: false } // Placeholder
        },
        description: 'Refresh appointment availability'
      }
    ]
  },
  auth: {
    enableRetries: false,
    maxRetries: 1,
    enableCircuitBreaker: false,
    enableUserNotification: true
  },
  general: {
    enableRetries: true,
    maxRetries: 2,
    enableCircuitBreaker: true,
    enableUserNotification: true
  }
}