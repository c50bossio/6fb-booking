'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { browserCompatibility } from '@/lib/browser-compatibility'

interface TouchErrorBoundaryProps {
  children: ReactNode
  fallbackMode?: 'minimal' | 'keyboard' | 'static' | 'enhanced'
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  className?: string
}

interface TouchErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  fallbackMode: 'minimal' | 'keyboard' | 'static' | 'enhanced'
  retryCount: number
  lastError: number
}

/**
 * TouchErrorBoundary provides graceful degradation for touch interaction systems
 * Falls back to keyboard/mouse interactions when touch systems fail
 */
export class TouchErrorBoundary extends Component<TouchErrorBoundaryProps, TouchErrorBoundaryState> {
  private retryTimer: NodeJS.Timeout | null = null
  private readonly maxRetries = 3
  private readonly retryDelay = 2000

  constructor(props: TouchErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      fallbackMode: props.fallbackMode || 'enhanced',
      retryCount: 0,
      lastError: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<TouchErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastError: Date.now()
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('TouchErrorBoundary caught error:', error, errorInfo)
    
    this.setState({
      errorInfo
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Log to monitoring service
    this.logTouchError(error, errorInfo)
    
    // Attempt automatic retry for transient errors
    if (this.isTransientError(error) && this.state.retryCount < this.maxRetries) {
      this.scheduleRetry()
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
    }
  }

  private isTransientError(error: Error): boolean {
    // Check if error might be temporary
    const transientMessages = [
      'touch is not defined',
      'Navigator is not defined',
      'Permission denied',
      'Network request failed',
      'AbortError',
      'TimeoutError'
    ]
    
    return transientMessages.some(msg => 
      error.message.toLowerCase().includes(msg.toLowerCase())
    )
  }

  private scheduleRetry = () => {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer)
    }
    
    this.retryTimer = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }, this.retryDelay)
  }

  private logTouchError(error: Error, errorInfo: ErrorInfo) {
    // Log structured error data for monitoring
    const errorReport = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      },
      context: {
        userAgent: navigator.userAgent,
        touchSupport: browserCompatibility.detectCapabilities().hasTouch,
        pointerSupport: browserCompatibility.detectCapabilities().hasPointer,
        screen: {
          width: window.screen?.width || 0,
          height: window.screen?.height || 0
        },
        viewport: {
          width: window.innerWidth || 0,
          height: window.innerHeight || 0
        }
      },
      retryCount: this.state.retryCount,
      fallbackMode: this.state.fallbackMode
    }

    console.error('Touch system error report:', errorReport)
    
    // Send to monitoring service if available
    if (typeof window !== 'undefined' && (window as any).errorReporter) {
      (window as any).errorReporter.captureException(error, {
        tags: { component: 'TouchErrorBoundary' },
        extra: errorReport
      })
    }
  }

  private handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }))
    }
  }

  private handleFallbackModeChange = (mode: 'minimal' | 'keyboard' | 'static' | 'enhanced') => {
    this.setState({
      fallbackMode: mode,
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      return this.renderFallback()
    }

    return this.props.children
  }

  private renderFallback() {
    const { error, errorInfo, fallbackMode, retryCount } = this.state
    const canRetry = retryCount < this.maxRetries
    const capabilities = browserCompatibility.detectCapabilities()

    switch (fallbackMode) {
      case 'minimal':
        return this.renderMinimalFallback()
      
      case 'keyboard':
        return this.renderKeyboardFallback()
      
      case 'static':
        return this.renderStaticFallback()
      
      case 'enhanced':
      default:
        return this.renderEnhancedFallback(canRetry, capabilities)
    }
  }

  private renderMinimalFallback() {
    return (
      <div className={`touch-error-minimal ${this.props.className || ''}`}>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="text-yellow-600 dark:text-yellow-400">
              ⚠️
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Touch interactions temporarily unavailable
              </h3>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Use mouse or keyboard navigation instead.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  private renderKeyboardFallback() {
    return (
      <div className={`touch-error-keyboard ${this.props.className || ''}`}>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-center">
            <div className="text-blue-600 dark:text-blue-400 text-2xl mb-2">⌨️</div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Keyboard Navigation Mode
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              Touch gestures are not available. Use keyboard shortcuts:
            </p>
            <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
              <div><kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">Tab</kbd> - Navigate</div>
              <div><kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">Enter</kbd> - Select</div>
              <div><kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">Arrow Keys</kbd> - Move</div>
              <div><kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded">Esc</kbd> - Close</div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  private renderStaticFallback() {
    return (
      <div className={`touch-error-static ${this.props.className || ''}`}>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="text-center text-gray-600 dark:text-gray-400">
            <div className="text-2xl mb-2">📱</div>
            <p className="text-sm">
              Interactive features are temporarily disabled.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              Please refresh the page or try a different browser.
            </p>
          </div>
        </div>
      </div>
    )
  }

  private renderEnhancedFallback(canRetry: boolean, capabilities: any) {
    const { error, retryCount } = this.state

    return (
      <div className={`touch-error-enhanced ${this.props.className || ''}`}>
        <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          <div className="text-center">
            <div className="text-red-500 dark:text-red-400 text-3xl mb-3">🚫</div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Touch System Error
            </h3>
            
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              The touch interaction system encountered an error and has been disabled.
            </p>

            {/* Error details (in development) */}
            {process.env.NODE_ENV === 'development' && error && (
              <details className="text-left mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded border">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300">
                  Error Details
                </summary>
                <pre className="text-xs text-gray-600 dark:text-gray-400 mt-2 overflow-auto">
                  {error.message}
                </pre>
              </details>
            )}

            {/* Device capabilities info */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                Device Capabilities
              </h4>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <div>Touch Support: {capabilities.hasTouch ? '✅ Available' : '❌ Not Available'}</div>
                <div>Pointer Support: {capabilities.hasPointer ? '✅ Available' : '❌ Not Available'}</div>
                <div>Hover Support: {capabilities.hasHover ? '✅ Available' : '❌ Not Available'}</div>
                <div>Vibration Support: {capabilities.hasVibration ? '✅ Available' : '❌ Not Available'}</div>
              </div>
            </div>

            {/* Fallback mode selector */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Choose interaction mode:
              </h4>
              <div className="flex flex-wrap gap-2 justify-center">
                <button
                  onClick={() => this.handleFallbackModeChange('enhanced')}
                  className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-700"
                >
                  Enhanced
                </button>
                <button
                  onClick={() => this.handleFallbackModeChange('keyboard')}
                  className="px-3 py-1 text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-700"
                >
                  Keyboard
                </button>
                <button
                  onClick={() => this.handleFallbackModeChange('minimal')}
                  className="px-3 py-1 text-xs bg-yellow-100 dark:bg-yellow-800 text-yellow-700 dark:text-yellow-300 rounded hover:bg-yellow-200 dark:hover:bg-yellow-700"
                >
                  Minimal
                </button>
                <button
                  onClick={() => this.handleFallbackModeChange('static')}
                  className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Static
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 justify-center">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Retry ({this.maxRetries - retryCount} left)
                </button>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>
            </div>

            {/* Help text */}
            <div className="mt-4 text-xs text-gray-500 dark:text-gray-500">
              <p>If this problem persists, try:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Clearing your browser cache</li>
                <li>Using a different browser</li>
                <li>Disabling browser extensions</li>
                <li>Checking your internet connection</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default TouchErrorBoundary