'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { TouchErrorBoundary } from './TouchErrorBoundary'
import { CalendarSkeleton } from '../calendar/CalendarLoadingStates'
import { CalendarView } from '@/types/calendar'

interface CalendarTouchErrorBoundaryProps {
  children: ReactNode
  calendarView?: CalendarView
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  className?: string
  fallbackComponent?: ReactNode
}

interface CalendarTouchErrorBoundaryState {
  hasCalendarError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  fallbackMode: 'skeleton' | 'simplified' | 'read-only' | 'minimal'
}

/**
 * CalendarTouchErrorBoundary provides calendar-specific error handling
 * Maintains calendar functionality even when touch systems fail
 */
export class CalendarTouchErrorBoundary extends Component<CalendarTouchErrorBoundaryProps, CalendarTouchErrorBoundaryState> {
  constructor(props: CalendarTouchErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasCalendarError: false,
      error: null,
      errorInfo: null,
      fallbackMode: 'simplified'
    }
  }

  static getDerivedStateFromError(error: Error): Partial<CalendarTouchErrorBoundaryState> {
    // Check if this is a calendar-specific error
    const isCalendarError = this.isCalendarTouchError(error)
    
    return {
      hasCalendarError: isCalendarError,
      error: isCalendarError ? error : null,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (this.isCalendarTouchError(error)) {
      console.error('Calendar touch system error:', error, errorInfo)
      
      this.setState({
        errorInfo
      })

      // Log calendar-specific error data
      this.logCalendarTouchError(error, errorInfo)

      // Call custom error handler
      if (this.props.onError) {
        this.props.onError(error, errorInfo)
      }
    }
  }

  private static isCalendarTouchError(error: Error): boolean {
    const calendarTouchErrors = [
      'calendar',
      'appointment',
      'drag',
      'gesture',
      'touch',
      'swipe',
      'pinch',
      'UnifiedCalendar',
      'CalendarWeekView',
      'TouchDragManager',
      'SwipeReveal',
      'TouchPredictor'
    ]
    
    return calendarTouchErrors.some(keyword => 
      error.message?.toLowerCase().includes(keyword.toLowerCase()) ||
      error.stack?.toLowerCase().includes(keyword.toLowerCase())
    )
  }

  private isCalendarTouchError(error: Error): boolean {
    return CalendarTouchErrorBoundary.isCalendarTouchError(error)
  }

  private logCalendarTouchError(error: Error, errorInfo: ErrorInfo) {
    const calendarErrorReport = {
      timestamp: new Date().toISOString(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack
      },
      calendarContext: {
        view: this.props.calendarView || 'unknown',
        touchCapabilities: {
          maxTouchPoints: navigator.maxTouchPoints || 0,
          touchSupport: 'ontouchstart' in window,
          pointerEvents: window.PointerEvent !== undefined,
          gestureEvents: 'ongesturestart' in window
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          orientation: (screen as any).orientation?.type || 'unknown'
        }
      },
      fallbackMode: this.state.fallbackMode
    }

    console.error('Calendar touch error report:', calendarErrorReport)
    
    // Send to monitoring service
    if (typeof window !== 'undefined' && (window as any).errorReporter) {
      (window as any).errorReporter.captureException(error, {
        tags: { 
          component: 'CalendarTouchErrorBoundary',
          view: this.props.calendarView || 'unknown'
        },
        extra: calendarErrorReport
      })
    }
  }

  private handleFallbackModeChange = (mode: 'skeleton' | 'simplified' | 'read-only' | 'minimal') => {
    this.setState({
      fallbackMode: mode,
      hasCalendarError: false,
      error: null,
      errorInfo: null
    })
  }

  private handleRetry = () => {
    this.setState({
      hasCalendarError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    const { hasCalendarError } = this.state

    // If we have a calendar-specific error, render calendar fallback
    if (hasCalendarError) {
      return this.renderCalendarFallback()
    }

    // Otherwise, wrap in general TouchErrorBoundary
    return (
      <TouchErrorBoundary
        fallbackMode="enhanced"
        onError={this.props.onError}
        className={this.props.className}
      >
        {this.props.children}
      </TouchErrorBoundary>
    )
  }

  private renderCalendarFallback() {
    const { fallbackMode, error } = this.state

    switch (fallbackMode) {
      case 'skeleton':
        return this.renderSkeletonFallback()
      
      case 'read-only':
        return this.renderReadOnlyFallback()
      
      case 'minimal':
        return this.renderMinimalCalendarFallback()
      
      case 'simplified':
      default:
        return this.renderSimplifiedCalendarFallback()
    }
  }

  private renderSkeletonFallback() {
    return (
      <div className={`calendar-touch-error-skeleton ${this.props.className || ''}`}>
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
            <span className="text-sm text-yellow-800 dark:text-yellow-200">
              Calendar touch interactions temporarily unavailable. Showing preview.
            </span>
          </div>
        </div>
        <CalendarSkeleton 
          view={this.props.calendarView || 'week'} 
          showStats={true}
        />
      </div>
    )
  }

  private renderReadOnlyFallback() {
    return (
      <div className={`calendar-touch-error-readonly ${this.props.className || ''}`}>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
          <div className="text-center">
            <div className="text-blue-600 dark:text-blue-400 text-2xl mb-2">📅</div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Calendar in Read-Only Mode
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
              Touch gestures are disabled. Calendar is view-only.
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={this.handleRetry}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={() => this.handleFallbackModeChange('simplified')}
                className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-700"
              >
                Simplified View
              </button>
            </div>
          </div>
        </div>
        {this.props.fallbackComponent || this.renderBasicCalendarInfo()}
      </div>
    )
  }

  private renderMinimalCalendarFallback() {
    return (
      <div className={`calendar-touch-error-minimal ${this.props.className || ''}`}>
        <div className="p-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-center">
          <div className="text-gray-400 dark:text-gray-600 text-4xl mb-3">📅</div>
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
            Calendar Temporarily Unavailable
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            The interactive calendar system is experiencing issues.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  private renderSimplifiedCalendarFallback() {
    const { error } = this.state

    return (
      <div className={`calendar-touch-error-simplified ${this.props.className || ''}`}>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
          {/* Error notification */}
          <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-3">
              <div className="text-orange-500 dark:text-orange-400 text-xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                  Calendar Touch System Error
                </h3>
                <p className="text-xs text-orange-700 dark:text-orange-300 mb-2">
                  Touch interactions are temporarily disabled. Basic calendar functions are still available.
                </p>
                
                {/* Fallback mode controls */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={this.handleRetry}
                    className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => this.handleFallbackModeChange('read-only')}
                    className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-700"
                  >
                    Read-Only Mode
                  </button>
                  <button
                    onClick={() => this.handleFallbackModeChange('skeleton')}
                    className="px-2 py-1 text-xs bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-700"
                  >
                    Preview Mode
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Basic calendar info */}
          <div className="p-6">
            {this.renderBasicCalendarInfo()}
          </div>

          {/* Development error details */}
          {process.env.NODE_ENV === 'development' && error && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <details>
                <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded overflow-auto">
                  {error.message}
                  {error.stack && '\n\nStack trace:\n' + error.stack}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    )
  }

  private renderBasicCalendarInfo() {
    const today = new Date()
    const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' })
    const currentDate = today.toLocaleDateString()

    return (
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {currentMonth}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Today: {currentDate}
        </p>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            Available Actions
          </h3>
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <div>• View calendar in new tab</div>
            <div>• Use keyboard navigation (Tab, Arrow keys)</div>
            <div>• Access calendar through main menu</div>
            <div>• Reload page to restore touch features</div>
          </div>
        </div>

        <div className="mt-4 flex gap-2 justify-center">
          <button
            onClick={() => window.open('/calendar', '_blank')}
            className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            Open Calendar
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }
}

export default CalendarTouchErrorBoundary