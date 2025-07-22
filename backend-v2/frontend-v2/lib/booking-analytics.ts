/**
 * Booking analytics and success optimization
 * Tracks mobile booking performance and user behavior
 */

export interface BookingAnalytics {
  sessionId: string
  startTime: number
  steps: BookingStep[]
  deviceInfo: DeviceInfo
  performance: PerformanceMetrics
  outcome: BookingOutcome
}

export interface BookingStep {
  step: 'calendar_load' | 'slot_select' | 'confirm' | 'booking' | 'success' | 'error'
  timestamp: number
  duration?: number
  metadata?: Record<string, any>
}

export interface DeviceInfo {
  userAgent: string
  screenWidth: number
  screenHeight: number
  devicePixelRatio: number
  isMobile: boolean
  isTouch: boolean
  connection?: NetworkInformation
}

export interface PerformanceMetrics {
  calendarLoadTime: number
  apiResponseTimes: number[]
  cacheHitRate: number
  errorCount: number
  retryCount: number
  totalSessionTime: number
}

export interface BookingOutcome {
  success: boolean
  errorType?: string
  conversionRate?: number
  timeToBook?: number
  abandonmentStep?: string
}

class BookingAnalyticsTracker {
  private analytics: BookingAnalytics
  private stepStartTime: number = 0

  constructor() {
    this.analytics = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      steps: [],
      deviceInfo: this.getDeviceInfo(),
      performance: {
        calendarLoadTime: 0,
        apiResponseTimes: [],
        cacheHitRate: 0,
        errorCount: 0,
        retryCount: 0,
        totalSessionTime: 0
      },
      outcome: {
        success: false
      }
    }

    this.trackStep('calendar_load')
  }

  private generateSessionId(): string {
    return `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private getDeviceInfo(): DeviceInfo {
    if (typeof window === 'undefined') {
      return {
        userAgent: '',
        screenWidth: 0,
        screenHeight: 0,
        devicePixelRatio: 1,
        isMobile: false,
        isTouch: false
      }
    }

    return {
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio || 1,
      isMobile: window.innerWidth < 768,
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      connection: (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection
    }
  }

  /**
   * Track a booking step
   */
  trackStep(step: BookingStep['step'], metadata?: Record<string, any>) {
    const now = Date.now()
    const duration = this.stepStartTime ? now - this.stepStartTime : 0

    this.analytics.steps.push({
      step,
      timestamp: now,
      duration,
      metadata
    })

    this.stepStartTime = now

    // Special handling for specific steps
    if (step === 'calendar_load') {
      this.trackCalendarLoad()
    }
  }

  /**
   * Track API response time
   */
  trackApiResponse(responseTime: number, cacheHit: boolean = false) {
    this.analytics.performance.apiResponseTimes.push(responseTime)
    
    // Update cache hit rate
    const totalRequests = this.analytics.performance.apiResponseTimes.length
    const currentHitRate = this.analytics.performance.cacheHitRate
    this.analytics.performance.cacheHitRate = ((currentHitRate * (totalRequests - 1)) + (cacheHit ? 1 : 0)) / totalRequests
  }

  /**
   * Track errors
   */
  trackError(errorType: string, metadata?: Record<string, any>) {
    this.analytics.performance.errorCount++
    this.trackStep('error', { errorType, ...metadata })
  }

  /**
   * Track retry attempts
   */
  trackRetry(reason: string) {
    this.analytics.performance.retryCount++
    this.trackStep('confirm', { isRetry: true, reason })
  }

  /**
   * Track successful booking
   */
  trackSuccess(appointmentId: number, confirmationNumber: string) {
    const totalTime = Date.now() - this.analytics.startTime
    
    this.analytics.outcome = {
      success: true,
      timeToBook: totalTime,
      conversionRate: 1.0
    }

    this.analytics.performance.totalSessionTime = totalTime
    
    this.trackStep('success', { appointmentId, confirmationNumber })
    this.sendAnalytics()
  }

  /**
   * Track abandonment
   */
  trackAbandonment(step: string, reason?: string) {
    const totalTime = Date.now() - this.analytics.startTime
    
    this.analytics.outcome = {
      success: false,
      abandonmentStep: step,
      timeToBook: totalTime,
      conversionRate: 0.0
    }

    this.analytics.performance.totalSessionTime = totalTime
    
    this.trackStep('error', { abandonment: true, reason })
    this.sendAnalytics()
  }

  /**
   * Track calendar load performance
   */
  private trackCalendarLoad() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      // Use Navigation Timing API if available
      setTimeout(() => {
        const timing = performance.timing
        const loadTime = timing.loadEventEnd - timing.navigationStart
        this.analytics.performance.calendarLoadTime = loadTime
      }, 0)
    }
  }

  /**
   * Get real-time analytics data
   */
  getAnalytics(): BookingAnalytics {
    return {
      ...this.analytics,
      performance: {
        ...this.analytics.performance,
        totalSessionTime: Date.now() - this.analytics.startTime
      }
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const analytics = this.getAnalytics()
    const responses = analytics.performance.apiResponseTimes
    
    return {
      sessionDuration: analytics.performance.totalSessionTime,
      avgApiResponse: responses.length > 0 ? responses.reduce((a, b) => a + b, 0) / responses.length : 0,
      cacheHitRate: Math.round(analytics.performance.cacheHitRate * 100),
      errorRate: analytics.performance.errorCount / Math.max(1, analytics.steps.length) * 100,
      stepCount: analytics.steps.length,
      conversionRate: analytics.outcome.conversionRate || 0
    }
  }

  /**
   * Send analytics to backend
   */
  private async sendAnalytics() {
    try {
      // Only send analytics in production or when explicitly enabled
      if (process.env.NODE_ENV !== 'production' && !process.env.NEXT_PUBLIC_ENABLE_ANALYTICS) {
        console.log('📊 Booking Analytics:', this.analytics)
        return
      }

      const response = await fetch('/api/v1/analytics/booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.analytics)
      })

      if (!response.ok) {
        console.warn('Failed to send booking analytics:', response.statusText)
      }
    } catch (error) {
      console.warn('Error sending booking analytics:', error)
    }
  }

  /**
   * Track page visibility changes
   */
  trackVisibilityChange() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.trackStep('calendar_load', { visibility: 'hidden' })
        } else {
          this.trackStep('calendar_load', { visibility: 'visible' })
        }
      })
    }
  }

  /**
   * Track network changes
   */
  trackNetworkChange() {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      
      if (connection) {
        connection.addEventListener('change', () => {
          this.trackStep('calendar_load', { 
            networkChange: true,
            effectiveType: connection.effectiveType,
            downlink: connection.downlink
          })
        })
      }
    }
  }

  /**
   * Cleanup event listeners
   */
  cleanup() {
    // Remove any event listeners if needed
  }
}

// Optimization recommendations based on analytics
export class BookingOptimizer {
  static analyzePerformance(analytics: BookingAnalytics): OptimizationRecommendations {
    const recommendations: OptimizationRecommendations = {
      performance: [],
      ux: [],
      conversion: []
    }

    // Analyze API performance
    const avgApiTime = analytics.performance.apiResponseTimes.reduce((a, b) => a + b, 0) / analytics.performance.apiResponseTimes.length
    if (avgApiTime > 200) {
      recommendations.performance.push({
        type: 'api_optimization',
        priority: 'high',
        description: 'API response times are slow. Consider caching or optimizing queries.',
        metric: `${Math.round(avgApiTime)}ms average`
      })
    }

    // Analyze cache hit rate
    if (analytics.performance.cacheHitRate < 0.8) {
      recommendations.performance.push({
        type: 'cache_optimization',
        priority: 'medium',
        description: 'Cache hit rate is low. Review caching strategy.',
        metric: `${Math.round(analytics.performance.cacheHitRate * 100)}% hit rate`
      })
    }

    // Analyze error rate
    const errorRate = analytics.performance.errorCount / analytics.steps.length
    if (errorRate > 0.1) {
      recommendations.ux.push({
        type: 'error_reduction',
        priority: 'high',
        description: 'High error rate detected. Review error handling and user feedback.',
        metric: `${Math.round(errorRate * 100)}% error rate`
      })
    }

    // Analyze abandonment
    if (!analytics.outcome.success && analytics.outcome.abandonmentStep) {
      recommendations.conversion.push({
        type: 'abandonment_reduction',
        priority: 'high',
        description: `Users frequently abandon at ${analytics.outcome.abandonmentStep}. Review this step for usability issues.`,
        metric: `Abandoned at ${analytics.outcome.abandonmentStep}`
      })
    }

    // Analyze mobile performance
    if (analytics.deviceInfo.isMobile) {
      const mobileSteps = analytics.steps.filter(s => s.duration && s.duration > 1000)
      if (mobileSteps.length > 0) {
        recommendations.ux.push({
          type: 'mobile_optimization',
          priority: 'medium',
          description: 'Slow steps detected on mobile. Consider progressive loading.',
          metric: `${mobileSteps.length} slow steps`
        })
      }
    }

    return recommendations
  }

  static getOptimizationScore(analytics: BookingAnalytics): number {
    let score = 100

    // Deduct for slow API responses
    const avgApiTime = analytics.performance.apiResponseTimes.reduce((a, b) => a + b, 0) / analytics.performance.apiResponseTimes.length
    if (avgApiTime > 200) score -= 10
    if (avgApiTime > 500) score -= 20

    // Deduct for low cache hit rate
    if (analytics.performance.cacheHitRate < 0.8) score -= 15

    // Deduct for errors
    const errorRate = analytics.performance.errorCount / analytics.steps.length
    score -= errorRate * 30

    // Deduct for abandonment
    if (!analytics.outcome.success) score -= 25

    // Bonus for successful completion
    if (analytics.outcome.success && analytics.performance.totalSessionTime < 60000) {
      score += 10 // Fast completion bonus
    }

    return Math.max(0, Math.min(100, score))
  }
}

export interface OptimizationRecommendations {
  performance: OptimizationRecommendation[]
  ux: OptimizationRecommendation[]
  conversion: OptimizationRecommendation[]
}

export interface OptimizationRecommendation {
  type: string
  priority: 'low' | 'medium' | 'high'
  description: string
  metric: string
}

// Export singleton instance
export const bookingAnalytics = new BookingAnalyticsTracker()

// React hook for analytics
export function useBookingAnalytics() {
  return {
    trackStep: bookingAnalytics.trackStep.bind(bookingAnalytics),
    trackApiResponse: bookingAnalytics.trackApiResponse.bind(bookingAnalytics),
    trackError: bookingAnalytics.trackError.bind(bookingAnalytics),
    trackRetry: bookingAnalytics.trackRetry.bind(bookingAnalytics),
    trackSuccess: bookingAnalytics.trackSuccess.bind(bookingAnalytics),
    trackAbandonment: bookingAnalytics.trackAbandonment.bind(bookingAnalytics),
    getAnalytics: bookingAnalytics.getAnalytics.bind(bookingAnalytics),
    getPerformanceSummary: bookingAnalytics.getPerformanceSummary.bind(bookingAnalytics)
  }
}

export default BookingAnalyticsTracker