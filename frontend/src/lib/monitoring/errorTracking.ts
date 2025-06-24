/**
 * Comprehensive error monitoring and tracking service
 */

interface ErrorContext {
  userId?: string
  userEmail?: string
  userRole?: string
  page?: string
  component?: string
  action?: string
  apiEndpoint?: string
  requestId?: string
  timestamp: number
  userAgent: string
  url: string
  sessionId?: string
  buildVersion?: string
  feature?: string
}

interface ErrorDetails {
  name: string
  message: string
  stack?: string
  cause?: any
  code?: string
  status?: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: 'javascript' | 'api' | 'network' | 'auth' | 'validation' | 'business' | 'ui' | 'performance'
  context: ErrorContext
  fingerprint: string
  tags: string[]
  metadata?: Record<string, any>
}

interface ErrorEvent {
  id: string
  error: ErrorDetails
  occurredAt: number
  reportedAt: number
  count: number
  resolved: boolean
}

class ErrorTracker {
  private errors: Map<string, ErrorEvent> = new Map()
  private sessionId: string
  private buildVersion: string
  private maxErrors = 1000
  private reportingEndpoint = '/api/v1/errors'
  private offlineQueue: ErrorEvent[] = []
  private reportingEnabled = true
  private rateLimitWindow = 60000 // 1 minute
  private maxErrorsPerWindow = 50
  private errorCounts: Map<string, { count: number; firstSeen: number }> = new Map()

  constructor() {
    this.sessionId = this.generateSessionId()
    this.buildVersion = process.env.NEXT_PUBLIC_BUILD_VERSION || 'development'
    this.setupGlobalHandlers()
    this.startPeriodicReporting()
    this.setupBeforeUnloadHandler()
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private setupGlobalHandlers(): void {
    // Handle uncaught JavaScript errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureError(event.error || new Error(event.message), {
          category: 'javascript',
          severity: 'high',
          context: {
            component: 'global',
            action: 'uncaught_error',
            metadata: {
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno
            }
          }
        })
      })

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError(
          event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
          {
            category: 'javascript',
            severity: 'high',
            context: {
              component: 'global',
              action: 'unhandled_promise_rejection'
            }
          }
        )
      })

      // Handle network errors
      window.addEventListener('offline', () => {
        this.captureError(new Error('Network connection lost'), {
          category: 'network',
          severity: 'medium',
          context: {
            component: 'global',
            action: 'network_offline'
          }
        })
      })

      // Monitor performance issues
      if ('PerformanceObserver' in window) {
        try {
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'navigation' && entry instanceof PerformanceNavigationTiming) {
                const loadTime = entry.loadEventEnd - entry.navigationStart
                if (loadTime > 5000) { // Slow page load
                  this.captureError(new Error(`Slow page load: ${loadTime}ms`), {
                    category: 'performance',
                    severity: 'medium',
                    context: {
                      component: 'global',
                      action: 'slow_page_load',
                      metadata: {
                        loadTime,
                        domContentLoaded: entry.domContentLoadedEventEnd - entry.navigationStart,
                        firstPaint: performance.getEntriesByType('paint').find(p => p.name === 'first-paint')?.startTime
                      }
                    }
                  })
                }
              }
            }
          })
          observer.observe({ entryTypes: ['navigation'] })
        } catch (e) {
          console.warn('Performance monitoring not supported:', e)
        }
      }
    }
  }

  private setupBeforeUnloadHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flushErrors()
      })
    }
  }

  private startPeriodicReporting(): void {
    if (typeof window !== 'undefined') {
      setInterval(() => {
        this.reportErrors()
      }, 30000) // Report every 30 seconds
    }
  }

  private createFingerprint(error: Error, context: Partial<ErrorContext> = {}): string {
    const key = [
      error.name,
      error.message?.replace(/\d+/g, 'N')?.replace(/['"]/g, ''), // Normalize dynamic content
      context.component || '',
      context.action || '',
      context.apiEndpoint || ''
    ].join('|')

    // Simple hash function
    let hash = 0
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }

  private isRateLimited(fingerprint: string): boolean {
    const now = Date.now()
    const errorCount = this.errorCounts.get(fingerprint)

    if (!errorCount) {
      this.errorCounts.set(fingerprint, { count: 1, firstSeen: now })
      return false
    }

    // Reset counter if window has passed
    if (now - errorCount.firstSeen > this.rateLimitWindow) {
      this.errorCounts.set(fingerprint, { count: 1, firstSeen: now })
      return false
    }

    errorCount.count++
    return errorCount.count > this.maxErrorsPerWindow
  }

  private getCurrentContext(): ErrorContext {
    const now = Date.now()
    
    return {
      timestamp: now,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      sessionId: this.sessionId,
      buildVersion: this.buildVersion,
      userId: this.getUserId(),
      userEmail: this.getUserEmail(),
      userRole: this.getUserRole(),
      page: this.getCurrentPage()
    }
  }

  private getUserId(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.id?.toString()
    } catch {
      return undefined
    }
  }

  private getUserEmail(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.email
    } catch {
      return undefined
    }
  }

  private getUserRole(): string | undefined {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.role
    } catch {
      return undefined
    }
  }

  private getCurrentPage(): string {
    if (typeof window !== 'undefined') {
      return window.location.pathname
    }
    return 'unknown'
  }

  public captureError(
    error: Error,
    options: {
      category?: ErrorDetails['category']
      severity?: ErrorDetails['severity']
      context?: Partial<ErrorContext>
      tags?: string[]
      metadata?: Record<string, any>
    } = {}
  ): string {
    const {
      category = 'javascript',
      severity = 'medium',
      context = {},
      tags = [],
      metadata = {}
    } = options

    const fingerprint = this.createFingerprint(error, context)

    // Rate limiting
    if (this.isRateLimited(fingerprint)) {
      console.warn('Error reporting rate limited:', fingerprint)
      return fingerprint
    }

    const fullContext: ErrorContext = {
      ...this.getCurrentContext(),
      ...context
    }

    const errorDetails: ErrorDetails = {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
      code: (error as any).code,
      status: (error as any).status,
      severity,
      category,
      context: fullContext,
      fingerprint,
      tags: [...tags, category, severity],
      metadata
    }

    const errorId = `${fingerprint}-${Date.now()}`
    const existingError = this.errors.get(fingerprint)

    if (existingError) {
      // Update existing error
      existingError.count++
      existingError.occurredAt = Date.now()
    } else {
      // Create new error event
      const errorEvent: ErrorEvent = {
        id: errorId,
        error: errorDetails,
        occurredAt: Date.now(),
        reportedAt: 0,
        count: 1,
        resolved: false
      }

      this.errors.set(fingerprint, errorEvent)

      // Cleanup old errors if we exceed max
      if (this.errors.size > this.maxErrors) {
        const oldestKey = Array.from(this.errors.entries())
          .sort(([, a], [, b]) => a.occurredAt - b.occurredAt)[0][0]
        this.errors.delete(oldestKey)
      }
    }

    // Log locally for development
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 Error Captured [${severity.toUpperCase()}]`)
      console.error('Error:', error)
      console.log('Context:', fullContext)
      console.log('Fingerprint:', fingerprint)
      console.log('Metadata:', metadata)
      console.groupEnd()
    }

    return fingerprint
  }

  public captureApiError(
    error: any,
    endpoint: string,
    method: string = 'GET',
    requestId?: string
  ): string {
    const severity: ErrorDetails['severity'] = 
      error.status >= 500 ? 'high' : 
      error.status >= 400 ? 'medium' : 'low'

    return this.captureError(error, {
      category: 'api',
      severity,
      context: {
        apiEndpoint: `${method} ${endpoint}`,
        requestId,
        action: 'api_request'
      },
      tags: [`api_${error.status}`, method.toLowerCase(), 'http_error'],
      metadata: {
        endpoint,
        method,
        status: error.status,
        statusText: error.statusText,
        responseData: error.response?.data
      }
    })
  }

  public captureValidationError(
    error: Error,
    field: string,
    value: any,
    component: string
  ): string {
    return this.captureError(error, {
      category: 'validation',
      severity: 'low',
      context: {
        component,
        action: 'validation_failed'
      },
      tags: ['validation', 'form_error'],
      metadata: {
        field,
        value: typeof value === 'string' ? value.substring(0, 100) : value,
        validationType: error.name
      }
    })
  }

  public captureBusinessLogicError(
    error: Error,
    feature: string,
    component: string,
    action: string
  ): string {
    return this.captureError(error, {
      category: 'business',
      severity: 'medium',
      context: {
        feature,
        component,
        action
      },
      tags: ['business_logic', feature],
      metadata: {
        businessContext: {
          feature,
          component,
          action
        }
      }
    })
  }

  public capturePerformanceIssue(
    name: string,
    duration: number,
    threshold: number,
    component: string
  ): string {
    const error = new Error(`Performance issue: ${name} took ${duration}ms (threshold: ${threshold}ms)`)
    
    return this.captureError(error, {
      category: 'performance',
      severity: duration > threshold * 2 ? 'high' : 'medium',
      context: {
        component,
        action: 'performance_monitoring'
      },
      tags: ['performance', 'slow_operation'],
      metadata: {
        operationName: name,
        duration,
        threshold,
        ratio: duration / threshold
      }
    })
  }

  private async reportErrors(): Promise<void> {
    if (!this.reportingEnabled || this.errors.size === 0) {
      return
    }

    const unreportedErrors = Array.from(this.errors.values())
      .filter(error => error.reportedAt === 0)

    if (unreportedErrors.length === 0) {
      return
    }

    try {
      const response = await fetch(this.reportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errors: unreportedErrors,
          sessionId: this.sessionId,
          reportedAt: Date.now()
        })
      })

      if (response.ok) {
        // Mark errors as reported
        unreportedErrors.forEach(error => {
          error.reportedAt = Date.now()
        })
        
        // Clear offline queue
        this.offlineQueue = []
      } else {
        // Add to offline queue for retry
        this.offlineQueue.push(...unreportedErrors)
      }
    } catch (error) {
      // Network error - add to offline queue
      this.offlineQueue.push(...unreportedErrors)
    }
  }

  public flushErrors(): void {
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      const unreportedErrors = Array.from(this.errors.values())
        .filter(error => error.reportedAt === 0)

      if (unreportedErrors.length > 0) {
        const data = JSON.stringify({
          errors: unreportedErrors,
          sessionId: this.sessionId,
          reportedAt: Date.now()
        })

        navigator.sendBeacon(this.reportingEndpoint, data)
      }
    }
  }

  public getErrorSummary(): {
    totalErrors: number
    errorsByCategory: Record<string, number>
    errorsBySeverity: Record<string, number>
    recentErrors: ErrorEvent[]
  } {
    const errors = Array.from(this.errors.values())
    
    const errorsByCategory: Record<string, number> = {}
    const errorsBySeverity: Record<string, number> = {}

    errors.forEach(error => {
      errorsByCategory[error.error.category] = (errorsByCategory[error.error.category] || 0) + error.count
      errorsBySeverity[error.error.severity] = (errorsBySeverity[error.error.severity] || 0) + error.count
    })

    const recentErrors = errors
      .sort((a, b) => b.occurredAt - a.occurredAt)
      .slice(0, 10)

    return {
      totalErrors: errors.length,
      errorsByCategory,
      errorsBySeverity,
      recentErrors
    }
  }

  public clearErrors(): void {
    this.errors.clear()
    this.errorCounts.clear()
    this.offlineQueue = []
  }

  public setReportingEnabled(enabled: boolean): void {
    this.reportingEnabled = enabled
  }

  public setContext(context: Partial<ErrorContext>): void {
    // This could be used to set user context after login, etc.
    // Implementation would depend on how you want to manage global context
  }
}

// Global error tracker instance
export const errorTracker = new ErrorTracker()

// React Error Boundary helper
export class ErrorBoundary extends Error {
  constructor(
    message: string,
    public readonly component: string,
    public readonly originalError?: Error
  ) {
    super(message)
    this.name = 'ErrorBoundary'
  }
}

// Hook for React components to report errors
export function useErrorReporting() {
  const reportError = (
    error: Error,
    options: Parameters<typeof errorTracker.captureError>[1] = {}
  ) => {
    return errorTracker.captureError(error, options)
  }

  const reportApiError = (error: any, endpoint: string, method?: string, requestId?: string) => {
    return errorTracker.captureApiError(error, endpoint, method, requestId)
  }

  const reportValidationError = (error: Error, field: string, value: any, component: string) => {
    return errorTracker.captureValidationError(error, field, value, component)
  }

  const reportBusinessError = (error: Error, feature: string, component: string, action: string) => {
    return errorTracker.captureBusinessLogicError(error, feature, component, action)
  }

  const reportPerformanceIssue = (name: string, duration: number, threshold: number, component: string) => {
    return errorTracker.capturePerformanceIssue(name, duration, threshold, component)
  }

  return {
    reportError,
    reportApiError,
    reportValidationError,
    reportBusinessError,
    reportPerformanceIssue,
    getErrorSummary: () => errorTracker.getErrorSummary()
  }
}

// Performance monitoring utility
export function withPerformanceTracking<T extends (...args: any[]) => any>(
  fn: T,
  name: string,
  component: string,
  threshold: number = 1000
): T {
  return ((...args: any[]) => {
    const start = performance.now()
    
    try {
      const result = fn(...args)
      
      if (result instanceof Promise) {
        return result.finally(() => {
          const duration = performance.now() - start
          if (duration > threshold) {
            errorTracker.capturePerformanceIssue(name, duration, threshold, component)
          }
        })
      } else {
        const duration = performance.now() - start
        if (duration > threshold) {
          errorTracker.capturePerformanceIssue(name, duration, threshold, component)
        }
        return result
      }
    } catch (error) {
      const duration = performance.now() - start
      errorTracker.captureError(error as Error, {
        category: 'javascript',
        severity: 'high',
        context: {
          component,
          action: name
        },
        metadata: {
          duration,
          functionName: name
        }
      })
      throw error
    }
  }) as T
}

export default errorTracker