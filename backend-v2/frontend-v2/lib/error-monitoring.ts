/**
 * Comprehensive error monitoring and logging system
 * Provides structured error tracking, performance monitoring, and user analytics
 */

// import { liveRegionManager } from './accessibility'

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories
export enum ErrorCategory {
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'auth',
  PERMISSION = 'permission',
  APPLICATION = 'application',
  PERFORMANCE = 'performance',
  USER_INPUT = 'user_input',
  EXTERNAL_SERVICE = 'external_service'
}

// User context for error reporting
export interface UserContext {
  userId?: string
  email?: string
  userAgent: string
  sessionId: string
  registrationStep?: number
  businessType?: string
  timestamp: string
  timezone: string
}

// Error details structure
export interface ErrorDetails {
  id: string
  message: string
  stack?: string
  category: ErrorCategory
  severity: ErrorSeverity
  context: string
  userContext: UserContext
  metadata: Record<string, any>
  recoverable: boolean
  retryCount: number
  performanceImpact?: PerformanceImpact
}

// Performance impact tracking
export interface PerformanceImpact {
  renderBlocking: boolean
  userInteractionDelay: number
  memoryUsage?: number
  loadTimeIncrease?: number
}

// Error monitoring configuration
export interface ErrorMonitoringConfig {
  enableRemoteLogging: boolean
  enableLocalStorage: boolean
  enableConsoleLogging: boolean
  enableAnalytics: boolean
  maxLocalStorageEntries: number
  remoteEndpoint?: string
  apiKey?: string
  sampleRate: number // 0-1, percentage of errors to report
}

// Default configuration
const DEFAULT_CONFIG: ErrorMonitoringConfig = {
  enableRemoteLogging: process.env.NODE_ENV === 'production',
  enableLocalStorage: true,
  enableConsoleLogging: process.env.NODE_ENV === 'development',
  enableAnalytics: true,
  maxLocalStorageEntries: 100,
  sampleRate: 1.0
}

class ErrorMonitoringService {
  private static instance: ErrorMonitoringService
  private config: ErrorMonitoringConfig
  private errorQueue: ErrorDetails[] = []
  private sessionId: string
  private isOnline: boolean = navigator.onLine

  static getInstance(config?: Partial<ErrorMonitoringConfig>): ErrorMonitoringService {
    if (!ErrorMonitoringService.instance) {
      ErrorMonitoringService.instance = new ErrorMonitoringService(config)
    }
    return ErrorMonitoringService.instance
  }

  private constructor(config?: Partial<ErrorMonitoringConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.sessionId = this.generateSessionId()
    this.initializeMonitoring()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeMonitoring() {
    // Only initialize in browser environment
    if (typeof window === 'undefined') return
    
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error, {
        category: ErrorCategory.APPLICATION,
        severity: ErrorSeverity.HIGH,
        context: 'Global Error Handler',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        category: ErrorCategory.APPLICATION,
        severity: ErrorSeverity.HIGH,
        context: 'Unhandled Promise Rejection',
        metadata: {
          promise: event.promise
        }
      })
    })

    // Network status monitoring
    window.addEventListener('online', () => {
      this.isOnline = true
      this.flushErrorQueue()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })

    // Performance monitoring
    this.initializePerformanceMonitoring()
  }

  private initializePerformanceMonitoring() {
    if ('PerformanceObserver' in window) {
      // Monitor long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 200) { // Tasks longer than 200ms (reduced sensitivity for performance)
            this.captureError(new Error('Long Task Detected'), {
              category: ErrorCategory.PERFORMANCE,
              severity: ErrorSeverity.MEDIUM,
              context: 'Performance Monitoring',
              metadata: {
                taskDuration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              }
            })
          }
        }
      })

      try {
        longTaskObserver.observe({ entryTypes: ['longtask'] })
      } catch (e) {
        // Browser doesn't support longtask
      }

      // Monitor layout shifts
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (entry.value > 0.1) { // Significant layout shift
            this.captureError(new Error('Layout Shift Detected'), {
              category: ErrorCategory.PERFORMANCE,
              severity: ErrorSeverity.LOW,
              context: 'Layout Stability',
              metadata: {
                value: entry.value,
                sources: entry.sources
              }
            })
          }
        }
      })

      try {
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] })
      } catch (e) {
        // Browser doesn't support layout-shift
      }
    }
  }

  private getUserContext(): UserContext {
    return {
      userAgent: navigator.userAgent,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      // Additional context can be set via setUserContext method
      ...this.getCurrentUserContext()
    }
  }

  private getCurrentUserContext(): Partial<UserContext> {
    // Try to get user context from storage or global state (client-side only)
    if (typeof window === 'undefined') return {}
    
    try {
      const stored = localStorage.getItem('error_monitoring_user_context')
      return stored ? JSON.parse(stored) : {}
    } catch {
      return {}
    }
  }

  public setUserContext(context: Partial<UserContext>) {
    // Only store user context on client-side
    if (typeof window === 'undefined') return
    
    try {
      const existing = this.getCurrentUserContext()
      const updated = { ...existing, ...context }
      localStorage.setItem('error_monitoring_user_context', JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to set user context:', e)
    }
  }

  private shouldReportError(): boolean {
    return Math.random() < this.config.sampleRate
  }

  private categorizeError(error: Error, providedCategory?: ErrorCategory): ErrorCategory {
    if (providedCategory) return providedCategory

    const message = error.message.toLowerCase()
    
    if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
      return ErrorCategory.NETWORK
    }
    if (message.includes('validation') || message.includes('required') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorCategory.AUTHENTICATION
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return ErrorCategory.PERMISSION
    }
    
    return ErrorCategory.APPLICATION
  }

  private determineSeverity(error: Error, category: ErrorCategory): ErrorSeverity {
    // Critical errors that break core functionality
    if (error.message.includes('ChunkLoadError') || 
        error.message.includes('Script error') ||
        category === ErrorCategory.AUTHENTICATION) {
      return ErrorSeverity.CRITICAL
    }

    // High severity for network and application errors
    if (category === ErrorCategory.NETWORK || 
        category === ErrorCategory.APPLICATION) {
      return ErrorSeverity.HIGH
    }

    // Medium severity for validation and permission errors
    if (category === ErrorCategory.VALIDATION || 
        category === ErrorCategory.PERMISSION) {
      return ErrorSeverity.MEDIUM
    }

    return ErrorSeverity.LOW
  }

  public captureError(
    error: Error, 
    options: {
      category?: ErrorCategory
      severity?: ErrorSeverity
      context: string
      metadata?: Record<string, any>
      recoverable?: boolean
      retryCount?: number
    }
  ): string {
    const errorId = this.generateErrorId()
    const category = this.categorizeError(error, options.category)
    const severity = options.severity || this.determineSeverity(error, category)

    const errorDetails: ErrorDetails = {
      id: errorId,
      message: error.message,
      stack: error.stack,
      category,
      severity,
      context: options.context,
      userContext: this.getUserContext(),
      metadata: {
        ...options.metadata,
        url: window.location.href,
        referrer: document.referrer,
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        browserOnline: this.isOnline
      },
      recoverable: options.recoverable ?? true,
      retryCount: options.retryCount ?? 0
    }

    // Only report errors based on sample rate
    if (!this.shouldReportError()) {
      return errorId
    }

    // Console logging in development
    if (this.config.enableConsoleLogging) {
      console.group(`🚨 Error [${severity.toUpperCase()}] - ${category}`)
      console.error('Message:', error.message)
      console.error('Context:', options.context)
      console.error('Stack:', error.stack)
      console.log('Metadata:', errorDetails.metadata)
      console.groupEnd()
    }

    // Local storage logging
    if (this.config.enableLocalStorage) {
      this.storeErrorLocally(errorDetails)
    }

    // Remote logging
    if (this.config.enableRemoteLogging && this.isOnline) {
      this.sendErrorRemotely(errorDetails)
    } else {
      this.errorQueue.push(errorDetails)
    }

    // Analytics tracking
    if (this.config.enableAnalytics) {
      this.trackErrorAnalytics(errorDetails)
    }

    // Accessibility announcement for critical errors
    if (severity === ErrorSeverity.CRITICAL && typeof window !== 'undefined') {
      try {
        // Dynamic import to avoid SSR issues
        import('./accessibility').then(({ liveRegionManager }) => {
          liveRegionManager.announceUrgently(
            `Critical error occurred: ${error.message}. Please refresh the page or contact support.`
          )
        }).catch(() => {
          // Fallback if accessibility module fails
          console.warn('Failed to announce critical error via accessibility module')
        })
      } catch {
        // Silent fallback
      }
    }

    return errorId
  }

  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private storeErrorLocally(errorDetails: ErrorDetails) {
    try {
      const stored = localStorage.getItem('error_monitoring_logs') || '[]'
      const logs: ErrorDetails[] = JSON.parse(stored)
      
      logs.unshift(errorDetails) // New errors at the beginning
      
      // Keep only the most recent entries
      if (logs.length > this.config.maxLocalStorageEntries) {
        logs.splice(this.config.maxLocalStorageEntries)
      }
      
      localStorage.setItem('error_monitoring_logs', JSON.stringify(logs))
    } catch (e) {
      console.warn('Failed to store error locally:', e)
    }
  }

  private async sendErrorRemotely(errorDetails: ErrorDetails) {
    if (!this.config.remoteEndpoint) return

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
        },
        body: JSON.stringify(errorDetails)
      })
    } catch (e) {
      // Failed to send remotely, add to queue
      this.errorQueue.push(errorDetails)
      console.warn('Failed to send error remotely:', e)
    }
  }

  private flushErrorQueue() {
    if (!this.isOnline || this.errorQueue.length === 0) return

    const errorsToSend = [...this.errorQueue]
    this.errorQueue = []

    errorsToSend.forEach(error => {
      this.sendErrorRemotely(error)
    })
  }

  private trackErrorAnalytics(errorDetails: ErrorDetails) {
    // Track with Google Analytics if available
    if (typeof gtag !== 'undefined') {
      gtag('event', 'exception', {
        description: errorDetails.message,
        fatal: errorDetails.severity === ErrorSeverity.CRITICAL,
        custom_map: {
          error_category: errorDetails.category,
          error_context: errorDetails.context,
          error_id: errorDetails.id
        }
      })
    }

    // Track with custom analytics
    if (typeof window !== 'undefined' && (window as any).analytics) {
      (window as any).analytics.track('Error Occurred', {
        errorId: errorDetails.id,
        category: errorDetails.category,
        severity: errorDetails.severity,
        context: errorDetails.context,
        recoverable: errorDetails.recoverable,
        retryCount: errorDetails.retryCount
      })
    }
  }

  public getErrorLogs(filters?: {
    category?: ErrorCategory
    severity?: ErrorSeverity
    startDate?: Date
    endDate?: Date
  }): ErrorDetails[] {
    try {
      const stored = localStorage.getItem('error_monitoring_logs') || '[]'
      let logs: ErrorDetails[] = JSON.parse(stored)

      if (filters) {
        logs = logs.filter(log => {
          if (filters.category && log.category !== filters.category) return false
          if (filters.severity && log.severity !== filters.severity) return false
          if (filters.startDate && new Date(log.userContext.timestamp) < filters.startDate) return false
          if (filters.endDate && new Date(log.userContext.timestamp) > filters.endDate) return false
          return true
        })
      }

      return logs
    } catch {
      return []
    }
  }

  public clearErrorLogs() {
    try {
      localStorage.removeItem('error_monitoring_logs')
      this.errorQueue = []
    } catch (e) {
      console.warn('Failed to clear error logs:', e)
    }
  }

  public getErrorStats(): {
    totalErrors: number
    errorsByCategory: Record<ErrorCategory, number>
    errorsBySeverity: Record<ErrorSeverity, number>
    recentErrors: number
  } {
    const logs = this.getErrorLogs()
    const now = new Date()
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)

    const stats = {
      totalErrors: logs.length,
      errorsByCategory: {} as Record<ErrorCategory, number>,
      errorsBySeverity: {} as Record<ErrorSeverity, number>,
      recentErrors: logs.filter(log => 
        new Date(log.userContext.timestamp) > oneHourAgo
      ).length
    }

    // Initialize counters
    Object.values(ErrorCategory).forEach(category => {
      stats.errorsByCategory[category] = 0
    })
    Object.values(ErrorSeverity).forEach(severity => {
      stats.errorsBySeverity[severity] = 0
    })

    // Count errors
    logs.forEach(log => {
      stats.errorsByCategory[log.category]++
      stats.errorsBySeverity[log.severity]++
    })

    return stats
  }
}

// Export singleton instance
export const errorMonitoring = ErrorMonitoringService.getInstance()

// Convenience functions
export function captureError(
  error: Error,
  context: string,
  options?: {
    category?: ErrorCategory
    severity?: ErrorSeverity
    metadata?: Record<string, any>
    recoverable?: boolean
    retryCount?: number
  }
): string {
  return errorMonitoring.captureError(error, {
    context,
    ...options
  })
}

export function captureValidationError(
  error: Error,
  fieldName: string,
  value?: any
): string {
  return errorMonitoring.captureError(error, {
    category: ErrorCategory.VALIDATION,
    severity: ErrorSeverity.LOW,
    context: `Form Validation - ${fieldName}`,
    metadata: {
      fieldName,
      fieldValue: value,
      validationType: 'client-side'
    },
    recoverable: true
  })
}

export function captureNetworkError(
  error: Error,
  endpoint: string,
  method: string = 'GET'
): string {
  return errorMonitoring.captureError(error, {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.HIGH,
    context: `Network Request - ${method} ${endpoint}`,
    metadata: {
      endpoint,
      method,
      timestamp: new Date().toISOString()
    },
    recoverable: true
  })
}

export function capturePerformanceError(
  message: string,
  performanceData: Record<string, any>
): string {
  const error = new Error(message)
  return errorMonitoring.captureError(error, {
    category: ErrorCategory.PERFORMANCE,
    severity: ErrorSeverity.MEDIUM,
    context: 'Performance Monitoring',
    metadata: {
      ...performanceData,
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection ? {
        effectiveType: (navigator as any).connection.effectiveType,
        downlink: (navigator as any).connection.downlink,
        rtt: (navigator as any).connection.rtt
      } : null
    },
    recoverable: true
  })
}

export function setUserContext(context: Partial<UserContext>) {
  errorMonitoring.setUserContext(context)
}

export function getErrorStats() {
  return errorMonitoring.getErrorStats()
}

export function clearErrorLogs() {
  errorMonitoring.clearErrorLogs()
}

export type { ErrorDetails, UserContext, ErrorMonitoringConfig }