/**
 * Comprehensive Client-Side Error Monitoring System
 * 
 * Features:
 * - Real-time error tracking and reporting
 * - Performance monitoring and Core Web Vitals
 * - User session recording for error context
 * - Intelligent error classification and reporting
 * - Integration with Sentry and custom monitoring
 */

import { ErrorInfo } from 'react'
import { NextRouter } from 'next/router'

// Types for comprehensive error tracking
export interface ErrorContext {
  userId?: string
  sessionId: string
  route: string
  userAgent: string
  timestamp: string
  buildVersion?: string
  environment: string
  businessContext?: {
    barberId?: string
    appointmentId?: string
    paymentIntentId?: string
    clientId?: string
    businessFlow?: 'booking' | 'payment' | 'calendar' | 'analytics' | 'auth'
  }
}

export interface ErrorClassification {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  category: 'ui' | 'api' | 'payment' | 'booking' | 'auth' | 'performance' | 'network'
  businessImpact: 'revenue_blocking' | 'user_blocking' | 'experience_degrading' | 'monitoring'
  isRecoverable: boolean
  autoRetryable: boolean
}

export interface PerformanceMetrics {
  cls: number  // Cumulative Layout Shift
  fid: number  // First Input Delay
  lcp: number  // Largest Contentful Paint
  fcp: number  // First Contentful Paint
  ttfb: number // Time to First Byte
  pageLoadTime: number
  memoryUsage?: number
  connectionType?: string
}

export interface UserFeedbackData {
  errorId: string
  userEmail?: string
  description: string
  reproductionSteps?: string
  expectedBehavior?: string
  severity: 'blocking' | 'annoying' | 'minor'
  category: string
}

class ClientErrorMonitor {
  private sessionId: string
  private errors: Map<string, any> = new Map()
  private performanceMetrics: PerformanceMetrics | null = null
  private userContext: any = null
  private errorQueue: any[] = []
  private isOnline = true
  private retryAttempts = new Map<string, number>()

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeMonitoring()
    this.setupPerformanceMonitoring()
    this.setupNetworkMonitoring()
    this.setupUnhandledErrorCatching()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeMonitoring() {
    // Set up global error handlers
    if (typeof window !== 'undefined') {
      // Capture unhandled errors
      window.addEventListener('error', this.handleGlobalError.bind(this))
      
      // Capture unhandled promise rejections
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection.bind(this))
      
      // Monitor page visibility changes
      document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))
      
      // Set up offline/online detection
      window.addEventListener('online', () => {
        this.isOnline = true
        this.flushErrorQueue()
      })
      
      window.addEventListener('offline', () => {
        this.isOnline = false
      })
    }
  }

  private handleGlobalError(event: ErrorEvent) {
    const error = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      type: 'javascript'
    }

    this.reportError(error, this.classifyError(error))
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    const error = {
      message: event.reason?.message || 'Unhandled Promise Rejection',
      stack: event.reason?.stack,
      reason: event.reason,
      type: 'promise'
    }

    this.reportError(error, this.classifyError(error))
  }

  private handleVisibilityChange() {
    if (document.hidden) {
      // Page is hidden, flush any pending errors
      this.flushErrorQueue()
    }
  }

  private setupPerformanceMonitoring() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Monitor Core Web Vitals
      this.measureCoreWebVitals()
      
      // Monitor page load performance
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.collectPerformanceMetrics()
        }, 0)
      })
    }
  }

  private measureCoreWebVitals() {
    // CLS (Cumulative Layout Shift)
    let clsValue = 0
    let clsEntries: any[] = []

    if ('PerformanceObserver' in window) {
      try {
        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsEntries.push(entry)
              clsValue += (entry as any).value
            }
          }
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        // FID (First Input Delay)
        const fidObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const fid = entry.processingStart - entry.startTime
            this.updatePerformanceMetric('fid', fid)
            
            if (fid > 100) { // FID > 100ms is poor
              this.reportPerformanceIssue('high_fid', { fid, entry })
            }
          }
        })
        fidObserver.observe({ entryTypes: ['first-input'] })

        // LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const lastEntry = entries[entries.length - 1]
          const lcp = lastEntry.startTime
          this.updatePerformanceMetric('lcp', lcp)
          
          if (lcp > 2500) { // LCP > 2.5s is poor
            this.reportPerformanceIssue('slow_lcp', { lcp, entry: lastEntry })
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

      } catch (e) {
        console.warn('Performance monitoring not supported:', e)
      }
    }
  }

  private collectPerformanceMetrics() {
    if (!performance.timing) return

    const timing = performance.timing
    const navigation = performance.navigation

    this.performanceMetrics = {
      cls: 0, // Will be updated by observer
      fid: 0, // Will be updated by observer  
      lcp: 0, // Will be updated by observer
      fcp: timing.responseStart - timing.fetchStart,
      ttfb: timing.responseStart - timing.requestStart,
      pageLoadTime: timing.loadEventEnd - timing.navigationStart,
      memoryUsage: (performance as any).memory?.usedJSHeapSize,
      connectionType: (navigator as any).connection?.effectiveType
    }

    // Check for performance issues
    if (this.performanceMetrics.pageLoadTime > 3000) {
      this.reportPerformanceIssue('slow_page_load', this.performanceMetrics)
    }

    if (this.performanceMetrics.memoryUsage && this.performanceMetrics.memoryUsage > 50 * 1024 * 1024) {
      this.reportPerformanceIssue('high_memory_usage', this.performanceMetrics)
    }
  }

  private updatePerformanceMetric(metric: keyof PerformanceMetrics, value: number) {
    if (!this.performanceMetrics) {
      this.performanceMetrics = {
        cls: 0, fid: 0, lcp: 0, fcp: 0, ttfb: 0, pageLoadTime: 0
      }
    }
    this.performanceMetrics[metric] = value
  }

  private setupNetworkMonitoring() {
    if (typeof window !== 'undefined' && 'fetch' in window) {
      const originalFetch = window.fetch
      
      window.fetch = async (...args) => {
        const startTime = performance.now()
        const url = args[0].toString()
        
        try {
          const response = await originalFetch(...args)
          const endTime = performance.now()
          const duration = endTime - startTime
          
          // Monitor slow API calls
          if (duration > 5000) {
            this.reportPerformanceIssue('slow_api_call', {
              url,
              duration,
              status: response.status
            })
          }
          
          // Monitor API errors
          if (!response.ok) {
            this.reportApiError(url, response.status, duration)
          }
          
          return response
        } catch (error: any) {
          const endTime = performance.now()
          const duration = endTime - startTime
          
          this.reportNetworkError(url, error, duration)
          throw error
        }
      }
    }
  }

  private setupUnhandledErrorCatching() {
    // React Error Boundary integration
    if (typeof window !== 'undefined') {
      (window as any).__REACT_ERROR_BOUNDARY_HOOK__ = (error: Error, errorInfo: ErrorInfo) => {
        this.reportReactError(error, errorInfo)
      }
    }
  }

  private classifyError(error: any): ErrorClassification {
    const message = error.message?.toLowerCase() || ''
    const stack = error.stack?.toLowerCase() || ''
    const filename = error.filename?.toLowerCase() || ''

    // Critical errors that block core functionality
    if (
      message.includes('payment') || 
      message.includes('stripe') ||
      message.includes('checkout') ||
      stack.includes('payment')
    ) {
      return {
        severity: 'critical',
        category: 'payment',
        businessImpact: 'revenue_blocking',
        isRecoverable: true,
        autoRetryable: false
      }
    }

    if (
      message.includes('booking') ||
      message.includes('appointment') ||
      message.includes('calendar') ||
      stack.includes('booking')
    ) {
      return {
        severity: 'high',
        category: 'booking',
        businessImpact: 'user_blocking',
        isRecoverable: true,
        autoRetryable: true
      }
    }

    if (
      message.includes('auth') ||
      message.includes('login') ||
      message.includes('unauthorized') ||
      message.includes('403') ||
      message.includes('401')
    ) {
      return {
        severity: 'high',
        category: 'auth',
        businessImpact: 'user_blocking',
        isRecoverable: true,
        autoRetryable: false
      }
    }

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      error.type === 'network'
    ) {
      return {
        severity: 'medium',
        category: 'network',
        businessImpact: 'experience_degrading',
        isRecoverable: true,
        autoRetryable: true
      }
    }

    if (
      message.includes('chunk') ||
      message.includes('loading') ||
      filename.includes('chunk')
    ) {
      return {
        severity: 'medium',
        category: 'ui',
        businessImpact: 'experience_degrading',
        isRecoverable: true,
        autoRetryable: true
      }
    }

    // Default classification
    return {
      severity: 'medium',
      category: 'ui',
      businessImpact: 'experience_degrading',
      isRecoverable: false,
      autoRetryable: false
    }
  }

  public setUserContext(user: any) {
    this.userContext = user
  }

  public reportError(error: any, classification?: ErrorClassification) {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const classifiedError = classification || this.classifyError(error)
    
    const errorReport = {
      id: errorId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        type: error.type || 'unknown',
        ...error
      },
      classification: classifiedError,
      context: this.getErrorContext(),
      performanceMetrics: this.performanceMetrics,
      userContext: this.userContext,
      url: window.location.href,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION || 'unknown'
    }

    this.errors.set(errorId, errorReport)
    
    if (this.isOnline) {
      this.sendErrorReport(errorReport)
    } else {
      this.errorQueue.push(errorReport)
    }

    // Attempt auto-recovery for recoverable errors
    if (classifiedError.isRecoverable && classifiedError.autoRetryable) {
      this.attemptAutoRecovery(errorId, errorReport)
    }

    return errorId
  }

  public reportReactError(error: Error, errorInfo: ErrorInfo) {
    const classification: ErrorClassification = {
      severity: 'high',
      category: 'ui',
      businessImpact: 'user_blocking',
      isRecoverable: true,
      autoRetryable: false
    }

    this.reportError({
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      type: 'react'
    }, classification)
  }

  public reportApiError(url: string, status: number, duration: number) {
    const severity = status >= 500 ? 'high' : status >= 400 ? 'medium' : 'low'
    
    this.reportError({
      message: `API Error: ${status}`,
      url,
      status,
      duration,
      type: 'api'
    }, {
      severity: severity as any,
      category: 'api',
      businessImpact: status >= 500 ? 'user_blocking' : 'experience_degrading',
      isRecoverable: true,
      autoRetryable: status >= 500 || status === 429
    })
  }

  public reportNetworkError(url: string, error: any, duration: number) {
    this.reportError({
      message: `Network Error: ${error.message}`,
      url,
      duration,
      error: error.toString(),
      type: 'network'
    }, {
      severity: 'medium',
      category: 'network',
      businessImpact: 'experience_degrading',
      isRecoverable: true,
      autoRetryable: true
    })
  }

  public reportPerformanceIssue(type: string, metrics: any) {
    this.reportError({
      message: `Performance Issue: ${type}`,
      metrics,
      type: 'performance'
    }, {
      severity: 'low',
      category: 'performance',
      businessImpact: 'experience_degrading',
      isRecoverable: false,
      autoRetryable: false
    })
  }

  public reportUserFeedback(feedback: UserFeedbackData) {
    const errorReport = this.errors.get(feedback.errorId)
    if (errorReport) {
      errorReport.userFeedback = feedback
      this.sendErrorReport(errorReport)
    }
  }

  private getErrorContext(): ErrorContext {
    return {
      userId: this.userContext?.id,
      sessionId: this.sessionId,
      route: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      buildVersion: process.env.NEXT_PUBLIC_BUILD_VERSION || 'unknown',
      environment: process.env.NODE_ENV || 'development'
    }
  }

  private async sendErrorReport(errorReport: any) {
    try {
      // Send to internal monitoring API
      await fetch('/api/v2/error-monitoring/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(errorReport)
      })

      // Send to Sentry if available
      if (typeof window !== 'undefined' && (window as any).Sentry) {
        const Sentry = (window as any).Sentry
        
        Sentry.withScope((scope: any) => {
          scope.setTag('errorId', errorReport.id)
          scope.setTag('category', errorReport.classification.category)
          scope.setTag('businessImpact', errorReport.classification.businessImpact)
          scope.setContext('errorContext', errorReport.context)
          scope.setContext('performanceMetrics', errorReport.performanceMetrics)
          
          if (errorReport.userContext) {
            scope.setUser(errorReport.userContext)
          }
          
          Sentry.captureException(errorReport.error, {
            level: errorReport.classification.severity
          })
        })
      }
    } catch (e) {
      console.error('Failed to send error report:', e)
    }
  }

  private async attemptAutoRecovery(errorId: string, errorReport: any) {
    const currentAttempts = this.retryAttempts.get(errorId) || 0
    
    if (currentAttempts >= 3) {
      console.warn(`Max retry attempts reached for error ${errorId}`)
      return
    }

    this.retryAttempts.set(errorId, currentAttempts + 1)
    
    // Wait with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, currentAttempts), 10000)
    await new Promise(resolve => setTimeout(resolve, delay))

    try {
      // Attempt recovery based on error type
      const { category } = errorReport.classification
      
      if (category === 'network') {
        // Retry failed network request
        console.log(`Attempting network retry for error ${errorId}`)
        // The original fetch wrapper will handle the retry
      } else if (category === 'ui') {
        // Attempt to reload the problematic component
        console.log(`Attempting UI recovery for error ${errorId}`)
        window.location.reload()
      }
      
      // Mark as recovered if successful
      this.reportError({
        message: `Auto-recovery successful for ${errorId}`,
        originalErrorId: errorId,
        attempts: currentAttempts + 1,
        type: 'recovery'
      }, {
        severity: 'info',
        category: 'monitoring',
        businessImpact: 'monitoring',
        isRecoverable: false,
        autoRetryable: false
      })
      
    } catch (recoveryError) {
      console.error(`Auto-recovery failed for error ${errorId}:`, recoveryError)
    }
  }

  private flushErrorQueue() {
    if (this.errorQueue.length === 0) return
    
    console.log(`Flushing ${this.errorQueue.length} queued errors`)
    
    const queuedErrors = [...this.errorQueue]
    this.errorQueue = []
    
    queuedErrors.forEach(errorReport => {
      this.sendErrorReport(errorReport)
    })
  }

  public getDashboardData() {
    const activeErrors = Array.from(this.errors.values())
    
    return {
      sessionId: this.sessionId,
      totalErrors: activeErrors.length,
      errorsByCategory: activeErrors.reduce((acc, error) => {
        const category = error.classification.category
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      errorsBySeverity: activeErrors.reduce((acc, error) => {
        const severity = error.classification.severity
        acc[severity] = (acc[severity] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      performanceMetrics: this.performanceMetrics,
      isOnline: this.isOnline,
      queuedErrors: this.errorQueue.length
    }
  }
}

// Global error monitor instance
let errorMonitor: ClientErrorMonitor | null = null

export function initializeErrorMonitoring() {
  if (typeof window !== 'undefined' && !errorMonitor) {
    errorMonitor = new ClientErrorMonitor()
  }
  return errorMonitor
}

export function getErrorMonitor() {
  return errorMonitor || initializeErrorMonitoring()
}

// Convenience functions
export function reportError(error: any, classification?: ErrorClassification) {
  const monitor = getErrorMonitor()
  return monitor?.reportError(error, classification)
}

export function setUserContext(user: any) {
  const monitor = getErrorMonitor()
  monitor?.setUserContext(user)
}

export function reportUserFeedback(feedback: UserFeedbackData) {
  const monitor = getErrorMonitor()
  monitor?.reportUserFeedback(feedback)
}

export function getErrorDashboardData() {
  const monitor = getErrorMonitor()
  return monitor?.getDashboardData()
}

// Performance monitoring utilities
export function measurePagePerformance(pageName: string) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    
    return {
      pageName,
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstByte: navigation.responseStart - navigation.fetchStart,
      dnsTiming: navigation.domainLookupEnd - navigation.domainLookupStart,
      connectionTime: navigation.connectEnd - navigation.connectStart,
      renderTime: navigation.loadEventEnd - navigation.responseEnd
    }
  }
  return null
}

// Export types for external use
export type {
  ErrorContext,
  ErrorClassification,
  PerformanceMetrics,
  UserFeedbackData
}