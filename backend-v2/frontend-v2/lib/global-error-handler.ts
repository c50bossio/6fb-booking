'use client'

import * as Sentry from '@sentry/nextjs'

interface ErrorContext {
  user_action?: string
  component?: string
  api_endpoint?: string
  timestamp: string
  url: string
  user_agent: string
}

interface ApiError {
  method: string
  url: string
  status: number
  responseText?: string
  correlation_id?: string
}

export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler
  private lastUserAction: string = 'page_load'
  private errorCount: number = 0
  private apiErrors: ApiError[] = []
  private isInitialized: boolean = false

  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler()
    }
    return GlobalErrorHandler.instance
  }

  init(): void {
    if (this.isInitialized) {
      return
    }

    // Global error handler for JavaScript errors
    window.addEventListener('error', this.handleJavaScriptError.bind(this), true)
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this), true)
    
    // Intercept API errors
    this.interceptApiErrors()
    
    // Track user actions for context
    this.trackUserActions()
    
    // Setup periodic error reporting
    this.setupPeriodicReporting()
    
    this.isInitialized = true
    console.log('✅ Global Error Handler initialized')
  }

  private handleJavaScriptError(event: ErrorEvent): void {
    this.errorCount++
    
    const errorContext: ErrorContext = {
      user_action: this.lastUserAction,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent
    }

    // Determine error severity
    const isCritical = this.isCriticalError(event.error)
    
    // Log locally for debugging
    console.error('JavaScript Error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      context: errorContext,
      severity: isCritical ? 'critical' : 'error'
    })

    // Send to Sentry with enhanced context
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'javascript')
      scope.setTag('error_boundary', false)
      scope.setTag('severity', isCritical ? 'critical' : 'error')
      scope.setLevel(isCritical ? 'fatal' : 'error')
      
      scope.setContext('error_context', errorContext)
      scope.setContext('browser_info', {
        user_agent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookie_enabled: navigator.cookieEnabled,
        online: navigator.onLine
      })
      
      if (event.filename) {
        scope.setTag('error_file', event.filename.split('/').pop() || 'unknown')
      }
      
      scope.addBreadcrumb({
        message: `User action: ${this.lastUserAction}`,
        category: 'user',
        level: 'info'
      })
      
      Sentry.captureException(event.error || new Error(event.message))
    })

    // Show user notification for critical errors
    if (isCritical) {
      this.showUserErrorNotification('A critical error occurred. The page may need to be refreshed.')
    }
  }

  private handlePromiseRejection(event: PromiseRejectionEvent): void {
    this.errorCount++
    
    const error = event.reason
    const errorContext: ErrorContext = {
      user_action: this.lastUserAction,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent
    }
    
    // Log locally
    console.error('Unhandled Promise Rejection:', {
      reason: error,
      context: errorContext
    })

    // Send to Sentry
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'unhandled_promise')
      scope.setTag('error_boundary', false)
      scope.setLevel('error')
      
      scope.setContext('error_context', errorContext)
      
      scope.addBreadcrumb({
        message: `Promise rejection during: ${this.lastUserAction}`,
        category: 'navigation',
        level: 'error'
      })
      
      Sentry.captureException(
        error instanceof Error ? error : new Error(String(error))
      )
    })
  }

  private interceptApiErrors(): void {
    // Store original fetch
    const originalFetch = window.fetch
    
    // Override fetch to capture API errors
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const [url, options] = args
      const startTime = Date.now()
      
      try {
        const response = await originalFetch(...args)
        const duration = Date.now() - startTime
        
        // Log slow API calls
        if (duration > 3000) {
          this.logSlowApiCall(url, duration, response.status)
        }
        
        // Handle API errors
        if (!response.ok) {
          await this.handleApiError(url, options, response, duration)
        }
        
        return response
      } catch (error) {
        // Network errors
        const duration = Date.now() - startTime
        await this.handleNetworkError(url, options, error as Error, duration)
        throw error
      }
    }

    // Also intercept XMLHttpRequest for completeness
    this.interceptXHRErrors()
  }

  private async handleApiError(
    url: string | URL, 
    options: RequestInit | undefined, 
    response: Response,
    duration: number
  ): Promise<void> {
    const method = options?.method || 'GET'
    const urlString = url.toString()
    
    let responseText = ''
    try {
      responseText = await response.clone().text()
    } catch (e) {
      responseText = 'Unable to read response'
    }
    
    const apiError: ApiError = {
      method,
      url: urlString,
      status: response.status,
      responseText: responseText.substring(0, 1000), // Limit size
      correlation_id: response.headers.get('x-correlation-id') || undefined
    }
    
    this.apiErrors.push(apiError)
    
    // Keep only last 10 API errors
    if (this.apiErrors.length > 10) {
      this.apiErrors.shift()
    }
    
    // Log API error
    console.error('API Error:', apiError)
    
    // Send to Sentry for client errors (4xx) and server errors (5xx)
    if (response.status >= 400) {
      Sentry.withScope((scope) => {
        scope.setTag('error_type', 'api')
        scope.setTag('api_status', response.status.toString())
        scope.setTag('api_endpoint', this.sanitizeUrl(urlString))
        scope.setLevel(response.status >= 500 ? 'error' : 'warning')
        
        scope.setContext('api_error', {
          method,
          url: this.sanitizeUrl(urlString),
          status: response.status,
          duration,
          correlation_id: apiError.correlation_id,
          user_action: this.lastUserAction
        })
        
        scope.addBreadcrumb({
          message: `API ${method} ${response.status}`,
          category: 'http',
          level: response.status >= 500 ? 'error' : 'warning',
          data: {
            url: this.sanitizeUrl(urlString),
            status_code: response.status,
            method
          }
        })
        
        const error = new Error(`API Error: ${method} ${urlString} returned ${response.status}`)
        Sentry.captureException(error)
      })
    }
  }

  private async handleNetworkError(
    url: string | URL,
    options: RequestInit | undefined,
    error: Error,
    duration: number
  ): Promise<void> {
    const method = options?.method || 'GET'
    const urlString = url.toString()
    
    console.error('Network Error:', {
      method,
      url: urlString,
      error: error.message,
      duration
    })
    
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'network')
      scope.setTag('api_endpoint', this.sanitizeUrl(urlString))
      scope.setLevel('error')
      
      scope.setContext('network_error', {
        method,
        url: this.sanitizeUrl(urlString),
        duration,
        user_action: this.lastUserAction,
        online: navigator.onLine
      })
      
      scope.addBreadcrumb({
        message: `Network error: ${method} ${urlString}`,
        category: 'http',
        level: 'error'
      })
      
      Sentry.captureException(error)
    })
  }

  private interceptXHRErrors(): void {
    const originalXHROpen = XMLHttpRequest.prototype.open
    const originalXHRSend = XMLHttpRequest.prototype.send
    
    XMLHttpRequest.prototype.open = function(method: string, url: string | URL, ...args: any[]) {
      (this as any)._errorHandler_method = method
      ;(this as any)._errorHandler_url = url.toString()
      return originalXHROpen.apply(this, [method, url, ...args])
    }
    
    XMLHttpRequest.prototype.send = function(...args: any[]) {
      this.addEventListener('error', () => {
        const method = (this as any)._errorHandler_method || 'UNKNOWN'
        const url = (this as any)._errorHandler_url || 'unknown'
        
        console.error('XHR Error:', { method, url, status: this.status })
        
        Sentry.withScope((scope) => {
          scope.setTag('error_type', 'xhr')
          scope.setTag('xhr_status', this.status.toString())
          scope.setLevel('error')
          
          const error = new Error(`XHR Error: ${method} ${url}`)
          Sentry.captureException(error)
        })
      })
      
      return originalXHRSend.apply(this, args)
    }
  }

  private trackUserActions(): void {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const tagName = target.tagName.toLowerCase()
      const className = target.className
      const id = target.id
      
      let action = `click_${tagName}`
      if (id) action += `_${id}`
      if (className && typeof className === 'string') {
        action += `_${className.split(' ')[0]}`
      }
      
      this.lastUserAction = action.substring(0, 50) // Limit length
    }, true)
    
    // Track navigation
    const trackNavigation = () => {
      this.lastUserAction = `navigate_${window.location.pathname}`
    }
    
    // Handle both regular navigation and SPA routing
    window.addEventListener('popstate', trackNavigation)
    
    // Override pushState and replaceState for SPA navigation
    const originalPushState = history.pushState
    const originalReplaceState = history.replaceState
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args)
      trackNavigation()
    }
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args)
      trackNavigation()
    }
  }

  private setupPeriodicReporting(): void {
    // Report error statistics every 5 minutes
    setInterval(() => {
      if (this.errorCount > 0 || this.apiErrors.length > 0) {
        console.log('Error Statistics:', {
          total_errors: this.errorCount,
          recent_api_errors: this.apiErrors.length,
          last_user_action: this.lastUserAction
        })
        
        // Reset counters
        this.errorCount = 0
        this.apiErrors = []
      }
    }, 5 * 60 * 1000) // 5 minutes
  }

  private isCriticalError(error: Error): boolean {
    if (!error) return false
    
    const criticalPatterns = [
      /chunk.*load/i,
      /script.*error/i,
      /network.*error/i,
      /failed.*fetch/i,
      /authentication.*failed/i,
      /payment.*failed/i
    ]
    
    return criticalPatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    )
  }

  private logSlowApiCall(url: string | URL, duration: number, status: number): void {
    console.warn('Slow API Call:', {
      url: this.sanitizeUrl(url.toString()),
      duration,
      status,
      user_action: this.lastUserAction
    })
    
    Sentry.addBreadcrumb({
      message: `Slow API call: ${duration}ms`,
      category: 'performance',
      level: 'warning',
      data: {
        url: this.sanitizeUrl(url.toString()),
        duration,
        status
      }
    })
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      // Remove sensitive query parameters
      const sensitiveParams = ['token', 'key', 'secret', 'password', 'auth']
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]')
        }
      })
      return urlObj.toString()
    } catch {
      return url.replace(/[?&](token|key|secret|password|auth)=[^&]*/gi, '$1=[REDACTED]')
    }
  }

  private showUserErrorNotification(message: string): void {
    // This would integrate with your toast system
    console.error('Critical Error Notification:', message)
    
    // You could implement a more sophisticated notification system here
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification('Application Error', {
          body: message,
          icon: '/favicon.ico'
        })
      }
    }
  }

  // Public method to manually report errors
  reportError(error: Error, context?: Partial<ErrorContext>): void {
    const errorContext: ErrorContext = {
      user_action: context?.user_action || this.lastUserAction,
      component: context?.component,
      api_endpoint: context?.api_endpoint,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      user_agent: navigator.userAgent
    }
    
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'manual')
      scope.setLevel('error')
      scope.setContext('manual_error_context', errorContext)
      
      Sentry.captureException(error)
    })
  }

  // Public method to add custom breadcrumbs
  addBreadcrumb(message: string, category: string, data?: any): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data: data || {}
    })
  }

  // Get error statistics
  getErrorStats(): { errorCount: number; apiErrors: ApiError[]; lastUserAction: string } {
    return {
      errorCount: this.errorCount,
      apiErrors: [...this.apiErrors],
      lastUserAction: this.lastUserAction
    }
  }
}

// Export singleton instance
export const globalErrorHandler = GlobalErrorHandler.getInstance()

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      globalErrorHandler.init()
    })
  } else {
    globalErrorHandler.init()
  }
}