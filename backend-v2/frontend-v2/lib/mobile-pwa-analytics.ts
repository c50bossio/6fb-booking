/**
 * Mobile PWA Advanced Analytics System
 * Comprehensive tracking for touch interactions, user behavior, and feature adoption
 * Version: 1.0.0
 */

import { getDeploymentManager } from './mobile-pwa-deployment'
import { getMonitoringSystem } from './mobile-pwa-monitoring'

export interface TouchInteractionEvent {
  type: 'tap' | 'double_tap' | 'long_press' | 'swipe' | 'drag' | 'pinch'
  target: string
  position: { x: number; y: number }
  duration: number
  success: boolean
  timestamp: number
  metadata?: any
}

export interface HapticAnalyticsEvent {
  pattern: string
  success: boolean
  deviceSupport: boolean
  userPreference: boolean
  duration?: number
  timestamp: number
  context: string
}

export interface CalendarAnalyticsEvent {
  action: 'view_change' | 'appointment_select' | 'drag_start' | 'drag_end' | 'time_slot_select' | 'navigation'
  view: 'day' | 'week' | 'month'
  duration: number
  appointmentCount?: number
  success: boolean
  timestamp: number
  metadata?: any
}

export interface UserJourneyEvent {
  step: string
  feature: string
  action: string
  success: boolean
  duration: number
  errorReason?: string
  timestamp: number
  sessionId: string
}

export interface FeatureAdoptionMetrics {
  feature: string
  firstUse: number
  totalUses: number
  lastUse: number
  averageDuration: number
  successRate: number
  userRetention: number
}

export interface AnalyticsConfig {
  enabled: boolean
  sampleRate: number
  bufferSize: number
  flushInterval: number
  trackUserJourneys: boolean
  trackFeatureAdoption: boolean
  trackPerformanceCorrelation: boolean
  anonymizeData: boolean
  endpoints: {
    events: string
    metrics: string
    funnels: string
  }
}

const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  enabled: true,
  sampleRate: 1.0, // 100% for analytics (unlike performance monitoring)
  bufferSize: 50,
  flushInterval: 30000, // 30 seconds
  trackUserJourneys: true,
  trackFeatureAdoption: true,
  trackPerformanceCorrelation: true,
  anonymizeData: true,
  endpoints: {
    events: '/api/v2/analytics/mobile-pwa-events',
    metrics: '/api/v2/analytics/mobile-pwa-metrics',
    funnels: '/api/v2/analytics/mobile-pwa-funnels'
  }
}

export class MobilePWAAnalyticsSystem {
  private config: AnalyticsConfig
  private eventBuffer: any[] = []
  private sessionId: string
  private userId?: string
  private deviceInfo?: any
  private flushTimer?: NodeJS.Timeout
  private sessionStartTime: number
  private featureUsage: Map<string, FeatureAdoptionMetrics> = new Map()
  private currentUserJourney: UserJourneyEvent[] = []
  private interactionSequence: TouchInteractionEvent[] = []

  constructor(config?: Partial<AnalyticsConfig>, userId?: string) {
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config }
    this.sessionId = this.generateSessionId()
    this.userId = userId
    this.sessionStartTime = Date.now()
    this.initialize()
  }

  private async initialize() {
    if (!this.config.enabled) return

    this.deviceInfo = this.collectDeviceInfo()
    this.startSession()
    this.initializeEventListeners()
    this.startPeriodicFlush()
  }

  private generateSessionId(): string {
    return `pwa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private collectDeviceInfo() {
    if (typeof window === 'undefined') return null

    const userAgent = navigator.userAgent
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android(?=.*Tablet)|Windows NT.*Touch/i.test(userAgent)
    
    return {
      userAgent: this.config.anonymizeData ? this.anonymizeUserAgent(userAgent) : userAgent,
      isMobile,
      isTablet,
      touchSupport: 'ontouchstart' in window,
      hapticSupport: 'vibrate' in navigator,
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        devicePixelRatio: window.devicePixelRatio
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      connection: this.getConnectionInfo(),
      timestamp: Date.now()
    }
  }

  private anonymizeUserAgent(userAgent: string): string {
    // Remove specific version numbers while keeping general browser/OS info
    return userAgent
      .replace(/\d+\.\d+\.\d+/g, 'X.X.X')
      .replace(/\d+\.\d+/g, 'X.X')
      .replace(/\b\d{4,}\b/g, 'XXXX')
  }

  private getConnectionInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return {
        effectiveType: connection?.effectiveType,
        downlink: connection?.downlink,
        rtt: connection?.rtt
      }
    }
    return null
  }

  private startSession() {
    const sessionEvent = {
      type: 'session_start',
      sessionId: this.sessionId,
      userId: this.userId,
      deviceInfo: this.deviceInfo,
      timestamp: this.sessionStartTime,
      deploymentConfig: this.getDeploymentContext()
    }

    this.bufferEvent(sessionEvent)
  }

  private getDeploymentContext() {
    try {
      const manager = getDeploymentManager()
      return {
        environment: manager.getConfig().environment,
        enabledFeatures: manager.getEnabledFeatures(),
        rolloutPercentage: manager.getConfig().rollout.percentage
      }
    } catch {
      return null
    }
  }

  private initializeEventListeners() {
    if (typeof window === 'undefined') return

    // Touch interaction tracking
    this.initializeTouchTracking()
    
    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.trackEvent('session_visibility', {
        visible: !document.hidden,
        timestamp: Date.now()
      })
    })

    // Page unload
    window.addEventListener('beforeunload', () => {
      this.endSession()
    })
  }

  private initializeTouchTracking() {
    if (typeof window === 'undefined') return

    let touchStartTime = 0
    let touchStartPosition = { x: 0, y: 0 }
    let touchElement = ''

    document.addEventListener('touchstart', (event) => {
      touchStartTime = performance.now()
      const touch = event.touches[0]
      touchStartPosition = { x: touch.clientX, y: touch.clientY }
      touchElement = this.getElementIdentifier(event.target as Element)
    }, { passive: true })

    document.addEventListener('touchend', (event) => {
      if (touchStartTime > 0) {
        const duration = performance.now() - touchStartTime
        const touch = event.changedTouches[0]
        const endPosition = { x: touch.clientX, y: touch.clientY }
        
        const interactionEvent: TouchInteractionEvent = {
          type: this.determineTouchType(touchStartPosition, endPosition, duration),
          target: touchElement,
          position: touchStartPosition,
          duration,
          success: true,
          timestamp: Date.now(),
          metadata: {
            endPosition,
            touchPoints: event.changedTouches.length
          }
        }

        this.trackTouchInteraction(interactionEvent)
        touchStartTime = 0
      }
    }, { passive: true })
  }

  private getElementIdentifier(element: Element | null): string {
    if (!element) return 'unknown'
    
    // Use data attributes, IDs, or class names for identification
    const id = element.id
    const className = element.className
    const dataTestId = element.getAttribute('data-testid')
    const dataRole = element.getAttribute('data-role')
    
    if (dataTestId) return `[data-testid="${dataTestId}"]`
    if (dataRole) return `[data-role="${dataRole}"]`
    if (id) return `#${id}`
    if (className) return `.${className.split(' ')[0]}`
    
    return element.tagName.toLowerCase()
  }

  private determineTouchType(
    start: { x: number; y: number }, 
    end: { x: number; y: number }, 
    duration: number
  ): TouchInteractionEvent['type'] {
    const distance = Math.sqrt(
      Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)
    )

    if (duration > 500) return 'long_press'
    if (distance > 30) return 'swipe'
    if (duration < 200) return 'tap'
    
    return 'tap'
  }

  private startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flushEvents()
    }, this.config.flushInterval)
  }

  /**
   * Track touch interaction event
   */
  trackTouchInteraction(event: TouchInteractionEvent): void {
    if (!this.shouldTrack()) return

    this.interactionSequence.push(event)
    
    // Keep only recent interactions (last 100)
    if (this.interactionSequence.length > 100) {
      this.interactionSequence = this.interactionSequence.slice(-100)
    }

    this.bufferEvent({
      type: 'touch_interaction',
      sessionId: this.sessionId,
      userId: this.userId,
      data: event,
      timestamp: Date.now()
    })

    // Update feature usage
    this.updateFeatureUsage('touch_interactions', event.success, event.duration)
  }

  /**
   * Track haptic feedback analytics
   */
  trackHapticFeedback(event: HapticAnalyticsEvent): void {
    if (!this.shouldTrack()) return

    this.bufferEvent({
      type: 'haptic_feedback',
      sessionId: this.sessionId,
      userId: this.userId,
      data: event,
      timestamp: Date.now()
    })

    this.updateFeatureUsage('haptic_feedback', event.success, event.duration || 0)
  }

  /**
   * Track calendar interaction analytics
   */
  trackCalendarInteraction(event: CalendarAnalyticsEvent): void {
    if (!this.shouldTrack()) return

    this.bufferEvent({
      type: 'calendar_interaction',
      sessionId: this.sessionId,
      userId: this.userId,
      data: event,
      timestamp: Date.now()
    })

    this.updateFeatureUsage('calendar_interactions', event.success, event.duration)
  }

  /**
   * Track user journey step
   */
  trackUserJourneyStep(step: UserJourneyEvent): void {
    if (!this.config.trackUserJourneys || !this.shouldTrack()) return

    step.sessionId = this.sessionId
    this.currentUserJourney.push(step)

    this.bufferEvent({
      type: 'user_journey_step',
      sessionId: this.sessionId,
      userId: this.userId,
      data: step,
      timestamp: Date.now()
    })
  }

  /**
   * Track feature adoption
   */
  trackFeatureUsage(featureName: string, action: string, success: boolean, duration?: number): void {
    if (!this.config.trackFeatureAdoption || !this.shouldTrack()) return

    this.updateFeatureUsage(featureName, success, duration || 0)

    this.bufferEvent({
      type: 'feature_usage',
      sessionId: this.sessionId,
      userId: this.userId,
      data: {
        feature: featureName,
        action,
        success,
        duration,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    })
  }

  /**
   * Track custom event
   */
  trackEvent(eventType: string, data: any): void {
    if (!this.shouldTrack()) return

    this.bufferEvent({
      type: eventType,
      sessionId: this.sessionId,
      userId: this.userId,
      data,
      timestamp: Date.now()
    })
  }

  /**
   * Get interaction patterns analysis
   */
  getInteractionPatterns(): {
    mostUsedGestures: { [key: string]: number }
    averageInteractionDuration: number
    successRate: number
    peakUsageHours: number[]
  } {
    const gestureCounts: { [key: string]: number } = {}
    let totalDuration = 0
    let successfulInteractions = 0

    this.interactionSequence.forEach(interaction => {
      gestureCounts[interaction.type] = (gestureCounts[interaction.type] || 0) + 1
      totalDuration += interaction.duration
      if (interaction.success) successfulInteractions++
    })

    const hourCounts: { [hour: number]: number } = {}
    this.interactionSequence.forEach(interaction => {
      const hour = new Date(interaction.timestamp).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    })

    const peakUsageHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))

    return {
      mostUsedGestures: gestureCounts,
      averageInteractionDuration: this.interactionSequence.length > 0 
        ? totalDuration / this.interactionSequence.length 
        : 0,
      successRate: this.interactionSequence.length > 0 
        ? successfulInteractions / this.interactionSequence.length 
        : 0,
      peakUsageHours
    }
  }

  /**
   * Get feature adoption metrics
   */
  getFeatureAdoptionMetrics(): FeatureAdoptionMetrics[] {
    return Array.from(this.featureUsage.values())
  }

  /**
   * Get user journey analysis
   */
  getUserJourneyAnalysis(): {
    completedJourneys: number
    averageJourneyDuration: number
    dropoffPoints: { [step: string]: number }
    conversionFunnel: { [step: string]: number }
  } {
    if (!this.config.trackUserJourneys) {
      return { completedJourneys: 0, averageJourneyDuration: 0, dropoffPoints: {}, conversionFunnel: {} }
    }

    const dropoffPoints: { [step: string]: number } = {}
    const conversionFunnel: { [step: string]: number } = {}
    let totalDuration = 0
    let completedJourneys = 0

    // Analyze user journey steps
    this.currentUserJourney.forEach((step, index) => {
      conversionFunnel[step.step] = (conversionFunnel[step.step] || 0) + 1
      
      if (!step.success) {
        dropoffPoints[step.step] = (dropoffPoints[step.step] || 0) + 1
      } else if (index === this.currentUserJourney.length - 1) {
        completedJourneys++
        totalDuration += step.duration
      }
    })

    return {
      completedJourneys,
      averageJourneyDuration: completedJourneys > 0 ? totalDuration / completedJourneys : 0,
      dropoffPoints,
      conversionFunnel
    }
  }

  private updateFeatureUsage(featureName: string, success: boolean, duration: number): void {
    const existing = this.featureUsage.get(featureName)
    const now = Date.now()

    if (existing) {
      existing.totalUses++
      existing.lastUse = now
      existing.averageDuration = (existing.averageDuration + duration) / 2
      existing.successRate = ((existing.successRate * (existing.totalUses - 1)) + (success ? 1 : 0)) / existing.totalUses
    } else {
      this.featureUsage.set(featureName, {
        feature: featureName,
        firstUse: now,
        totalUses: 1,
        lastUse: now,
        averageDuration: duration,
        successRate: success ? 1 : 0,
        userRetention: 1 // Will be calculated over time
      })
    }
  }

  private shouldTrack(): boolean {
    return this.config.enabled && Math.random() <= this.config.sampleRate
  }

  private bufferEvent(event: any): void {
    this.eventBuffer.push(event)

    if (this.eventBuffer.length >= this.config.bufferSize) {
      this.flushEvents()
    }
  }

  private async flushEvents(): Promise<void> {
    if (this.eventBuffer.length === 0) return

    const eventsToSend = [...this.eventBuffer]
    this.eventBuffer = []

    try {
      await this.sendEvents(eventsToSend)
    } catch (error) {
      console.error('Failed to send analytics events:', error)
      // Re-buffer failed events (with limit)
      if (this.eventBuffer.length < this.config.bufferSize) {
        this.eventBuffer.unshift(...eventsToSend.slice(0, this.config.bufferSize - this.eventBuffer.length))
      }
    }
  }

  private async sendEvents(events: any[]): Promise<void> {
    const endpoint = this.config.endpoints.events

    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        events,
        metadata: {
          sessionId: this.sessionId,
          timestamp: Date.now(),
          version: '1.0.0'
        }
      })
    })
  }

  private endSession(): void {
    const sessionDuration = Date.now() - this.sessionStartTime

    this.bufferEvent({
      type: 'session_end',
      sessionId: this.sessionId,
      userId: this.userId,
      data: {
        duration: sessionDuration,
        interactionCount: this.interactionSequence.length,
        featureUsage: Array.from(this.featureUsage.values()),
        journeySteps: this.currentUserJourney.length
      },
      timestamp: Date.now()
    })

    // Immediate flush for session end
    this.flushEvents()
  }

  /**
   * Export analytics data for reporting
   */
  exportAnalyticsData(): {
    session: any
    interactions: TouchInteractionEvent[]
    features: FeatureAdoptionMetrics[]
    journey: UserJourneyEvent[]
    patterns: ReturnType<MobilePWAAnalyticsSystem['getInteractionPatterns']>
  } {
    return {
      session: {
        id: this.sessionId,
        duration: Date.now() - this.sessionStartTime,
        deviceInfo: this.deviceInfo
      },
      interactions: this.interactionSequence,
      features: this.getFeatureAdoptionMetrics(),
      journey: this.currentUserJourney,
      patterns: this.getInteractionPatterns()
    }
  }

  /**
   * Clean up analytics system
   */
  destroy(): void {
    this.endSession()
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
  }
}

/**
 * Global analytics instance
 */
let globalAnalyticsSystem: MobilePWAAnalyticsSystem | null = null

/**
 * Get or create analytics system
 */
export function getAnalyticsSystem(config?: Partial<AnalyticsConfig>, userId?: string): MobilePWAAnalyticsSystem {
  if (!globalAnalyticsSystem) {
    globalAnalyticsSystem = new MobilePWAAnalyticsSystem(config, userId)
  }
  return globalAnalyticsSystem
}

/**
 * React hook for analytics integration
 */
export function useMobilePWAAnalytics(): {
  trackTouchInteraction: (event: TouchInteractionEvent) => void
  trackHapticFeedback: (event: HapticAnalyticsEvent) => void
  trackCalendarInteraction: (event: CalendarAnalyticsEvent) => void
  trackFeatureUsage: (feature: string, action: string, success: boolean, duration?: number) => void
  trackUserJourneyStep: (step: UserJourneyEvent) => void
  getInteractionPatterns: () => ReturnType<MobilePWAAnalyticsSystem['getInteractionPatterns']>
  getFeatureAdoption: () => FeatureAdoptionMetrics[]
} {
  const analytics = getAnalyticsSystem()

  return {
    trackTouchInteraction: analytics.trackTouchInteraction.bind(analytics),
    trackHapticFeedback: analytics.trackHapticFeedback.bind(analytics),
    trackCalendarInteraction: analytics.trackCalendarInteraction.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    trackUserJourneyStep: analytics.trackUserJourneyStep.bind(analytics),
    getInteractionPatterns: analytics.getInteractionPatterns.bind(analytics),
    getFeatureAdoption: analytics.getFeatureAdoptionMetrics.bind(analytics)
  }
}

/**
 * Convenience functions for common analytics events
 */
export function trackMobileTouchInteraction(
  type: TouchInteractionEvent['type'],
  target: string,
  success: boolean = true,
  duration?: number
): void {
  const analytics = getAnalyticsSystem()
  analytics.trackTouchInteraction({
    type,
    target,
    position: { x: 0, y: 0 }, // Will be captured by event listeners
    duration: duration || 0,
    success,
    timestamp: Date.now()
  })
}

export function trackMobileHapticAnalytics(
  pattern: string,
  success: boolean,
  context: string = 'unknown'
): void {
  const analytics = getAnalyticsSystem()
  analytics.trackHapticFeedback({
    pattern,
    success,
    deviceSupport: 'vibrate' in navigator,
    userPreference: true, // Could be determined from settings
    timestamp: Date.now(),
    context
  })
}

export function trackMobileCalendarAnalytics(
  action: CalendarAnalyticsEvent['action'],
  view: CalendarAnalyticsEvent['view'],
  success: boolean = true,
  duration?: number
): void {
  const analytics = getAnalyticsSystem()
  analytics.trackCalendarInteraction({
    action,
    view,
    duration: duration || 0,
    success,
    timestamp: Date.now()
  })
}

export default MobilePWAAnalyticsSystem