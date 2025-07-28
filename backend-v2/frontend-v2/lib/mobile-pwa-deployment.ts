/**
 * Mobile PWA Deployment Configuration and Management
 * Production-ready deployment utilities for mobile features
 * Version: 1.0.0
 */

export interface DeploymentConfig {
  environment: 'development' | 'staging' | 'production'
  features: {
    touchGestures: boolean
    hapticFeedback: boolean
    performanceOptimization: boolean
    analytics: boolean
    debugging: boolean
  }
  rollout: {
    percentage: number
    targetAudience?: 'all' | 'mobile' | 'premium' | 'beta'
    minimumVersion?: string
  }
  monitoring: {
    enabled: boolean
    sampleRate: number
    errorTracking: boolean
    performanceTracking: boolean
  }
}

export interface FeatureFlag {
  name: string
  enabled: boolean
  rolloutPercentage: number
  conditions?: {
    userAgent?: string[]
    viewport?: { minWidth: number; minHeight: number }
    deviceType?: ('mobile' | 'tablet' | 'desktop')[]
    browserVersion?: { [browser: string]: string }
  }
}

const PRODUCTION_CONFIG: DeploymentConfig = {
  environment: 'production',
  features: {
    touchGestures: true,
    hapticFeedback: true,
    performanceOptimization: true,
    analytics: true,
    debugging: false
  },
  rollout: {
    percentage: 100,
    targetAudience: 'all'
  },
  monitoring: {
    enabled: true,
    sampleRate: 0.1, // 10% sampling
    errorTracking: true,
    performanceTracking: true
  }
}

const STAGING_CONFIG: DeploymentConfig = {
  environment: 'staging',
  features: {
    touchGestures: true,
    hapticFeedback: true,
    performanceOptimization: true,
    analytics: true,
    debugging: true
  },
  rollout: {
    percentage: 100,
    targetAudience: 'all'
  },
  monitoring: {
    enabled: true,
    sampleRate: 1.0, // 100% sampling in staging
    errorTracking: true,
    performanceTracking: true
  }
}

const DEVELOPMENT_CONFIG: DeploymentConfig = {
  environment: 'development',
  features: {
    touchGestures: true,
    hapticFeedback: true,
    performanceOptimization: false, // Disable for easier debugging
    analytics: false,
    debugging: true
  },
  rollout: {
    percentage: 100,
    targetAudience: 'all'
  },
  monitoring: {
    enabled: false,
    sampleRate: 0,
    errorTracking: false,
    performanceTracking: false
  }
}

export class MobilePWADeploymentManager {
  private config: DeploymentConfig
  private featureFlags: Map<string, FeatureFlag> = new Map()
  private userId?: string
  private deviceInfo?: any

  constructor(environment?: string, userId?: string) {
    this.config = this.getConfigForEnvironment(environment)
    this.userId = userId
    this.deviceInfo = this.detectDeviceInfo()
    this.initializeFeatureFlags()
  }

  private getConfigForEnvironment(environment?: string): DeploymentConfig {
    const env = environment || process.env.NODE_ENV || 'development'
    
    switch (env) {
      case 'production':
        return PRODUCTION_CONFIG
      case 'staging':
        return STAGING_CONFIG
      default:
        return DEVELOPMENT_CONFIG
    }
  }

  private detectDeviceInfo() {
    if (typeof window === 'undefined') return null

    const userAgent = navigator.userAgent
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
    const isTablet = /iPad|Android(?=.*Tablet)|Windows NT.*Touch/i.test(userAgent)
    const isDesktop = !isMobile && !isTablet

    return {
      userAgent,
      isMobile,
      isTablet,
      isDesktop,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      touchSupport: 'ontouchstart' in window,
      hapticSupport: 'vibrate' in navigator
    }
  }

  private initializeFeatureFlags() {
    // Touch Gestures Feature Flag
    this.featureFlags.set('touch-gestures', {
      name: 'touch-gestures',
      enabled: this.config.features.touchGestures,
      rolloutPercentage: this.config.rollout.percentage,
      conditions: {
        deviceType: ['mobile', 'tablet'],
        viewport: { minWidth: 320, minHeight: 480 }
      }
    })

    // Haptic Feedback Feature Flag
    this.featureFlags.set('haptic-feedback', {
      name: 'haptic-feedback',
      enabled: this.config.features.hapticFeedback,
      rolloutPercentage: this.config.rollout.percentage,
      conditions: {
        deviceType: ['mobile'],
        userAgent: ['iPhone', 'Android']
      }
    })

    // Performance Optimization Feature Flag
    this.featureFlags.set('performance-optimization', {
      name: 'performance-optimization',
      enabled: this.config.features.performanceOptimization,
      rolloutPercentage: this.config.rollout.percentage
    })

    // Analytics Feature Flag
    this.featureFlags.set('analytics', {
      name: 'analytics',
      enabled: this.config.features.analytics,
      rolloutPercentage: this.config.rollout.percentage
    })
  }

  /**
   * Check if a feature is enabled for the current user/device
   */
  isFeatureEnabled(featureName: string): boolean {
    const flag = this.featureFlags.get(featureName)
    if (!flag) return false

    // Check if feature is globally enabled
    if (!flag.enabled) return false

    // Check rollout percentage
    if (this.userId) {
      const userHash = this.hashUserId(this.userId)
      if (userHash % 100 >= flag.rolloutPercentage) return false
    }

    // Check device conditions
    if (flag.conditions && this.deviceInfo) {
      return this.checkFeatureConditions(flag.conditions)
    }

    return true
  }

  /**
   * Get all enabled features for current context
   */
  getEnabledFeatures(): string[] {
    return Array.from(this.featureFlags.keys()).filter(feature => 
      this.isFeatureEnabled(feature)
    )
  }

  /**
   * Get deployment configuration
   */
  getConfig(): DeploymentConfig {
    return { ...this.config }
  }

  /**
   * Update feature flag at runtime (for A/B testing)
   */
  updateFeatureFlag(featureName: string, updates: Partial<FeatureFlag>): void {
    const existing = this.featureFlags.get(featureName)
    if (existing) {
      this.featureFlags.set(featureName, { ...existing, ...updates })
    }
  }

  /**
   * Check if current device meets feature conditions
   */
  private checkFeatureConditions(conditions: FeatureFlag['conditions']): boolean {
    if (!this.deviceInfo) return false

    // Check device type
    if (conditions?.deviceType) {
      const deviceType = this.deviceInfo.isMobile ? 'mobile' : 
                        this.deviceInfo.isTablet ? 'tablet' : 'desktop'
      if (!conditions.deviceType.includes(deviceType)) return false
    }

    // Check viewport
    if (conditions?.viewport) {
      const { width, height } = this.deviceInfo.viewport
      if (width < conditions.viewport.minWidth || height < conditions.viewport.minHeight) {
        return false
      }
    }

    // Check user agent
    if (conditions?.userAgent) {
      const userAgent = this.deviceInfo.userAgent
      const hasMatch = conditions.userAgent.some(ua => userAgent.includes(ua))
      if (!hasMatch) return false
    }

    return true
  }

  /**
   * Simple hash function for consistent user bucketing
   */
  private hashUserId(userId: string): number {
    let hash = 0
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Track feature usage for analytics
   */
  trackFeatureUsage(featureName: string, action: string, metadata?: any): void {
    if (!this.isFeatureEnabled('analytics')) return

    const eventData = {
      feature: featureName,
      action,
      timestamp: Date.now(),
      userId: this.userId,
      deviceInfo: this.deviceInfo,
      environment: this.config.environment,
      metadata
    }

    // Send to analytics service
    this.sendAnalyticsEvent('mobile_pwa_feature_usage', eventData)
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, metadata?: any): void {
    if (!this.config.monitoring.performanceTracking) return

    const performanceData = {
      metric,
      value,
      timestamp: Date.now(),
      userId: this.userId,
      deviceInfo: this.deviceInfo,
      environment: this.config.environment,
      metadata
    }

    // Sample based on configuration
    if (Math.random() <= this.config.monitoring.sampleRate) {
      this.sendAnalyticsEvent('mobile_pwa_performance', performanceData)
    }
  }

  /**
   * Track errors and exceptions
   */
  trackError(error: Error, context?: string, metadata?: any): void {
    if (!this.config.monitoring.errorTracking) return

    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userId: this.userId,
      deviceInfo: this.deviceInfo,
      environment: this.config.environment,
      metadata
    }

    this.sendAnalyticsEvent('mobile_pwa_error', errorData)
  }

  /**
   * Send event to analytics service
   */
  private sendAnalyticsEvent(eventType: string, data: any): void {
    try {
      // In production, this would send to your analytics service
      // For now, we'll use console logging with environment awareness
      if (this.config.environment === 'development') {
        console.log(`[Mobile PWA Analytics] ${eventType}:`, data)
      } else {
        // Production: Send to actual analytics service
        // Example: send to Google Analytics, Mixpanel, etc.
        this.sendToAnalyticsService(eventType, data)
      }
    } catch (error) {
      console.error('Failed to send analytics event:', error)
    }
  }

  /**
   * Send to actual analytics service (placeholder)
   */
  private sendToAnalyticsService(eventType: string, data: any): void {
    // Implementation would depend on your analytics provider
    // Example integrations:
    
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', eventType, data)
    }
    
    // Mixpanel
    if (typeof mixpanel !== 'undefined') {
      mixpanel.track(eventType, data)
    }
    
    // Custom analytics endpoint
    fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: eventType, data })
    }).catch(error => {
      console.error('Analytics API error:', error)
    })
  }
}

/**
 * Global deployment manager instance
 */
let globalDeploymentManager: MobilePWADeploymentManager | null = null

/**
 * Get or create deployment manager
 */
export function getDeploymentManager(userId?: string): MobilePWADeploymentManager {
  if (!globalDeploymentManager) {
    globalDeploymentManager = new MobilePWADeploymentManager(
      process.env.NODE_ENV,
      userId
    )
  }
  return globalDeploymentManager
}

/**
 * React hook for feature flags
 */
export function useFeatureFlag(featureName: string): boolean {
  const manager = getDeploymentManager()
  return manager.isFeatureEnabled(featureName)
}

/**
 * React hook for deployment configuration
 */
export function useDeploymentConfig(): DeploymentConfig {
  const manager = getDeploymentManager()
  return manager.getConfig()
}

/**
 * Track feature usage (convenience function)
 */
export function trackMobilePWAUsage(
  feature: string, 
  action: string, 
  metadata?: any
): void {
  const manager = getDeploymentManager()
  manager.trackFeatureUsage(feature, action, metadata)
}

/**
 * Track performance metrics (convenience function)
 */
export function trackMobilePWAPerformance(
  metric: string, 
  value: number, 
  metadata?: any
): void {
  const manager = getDeploymentManager()
  manager.trackPerformance(metric, value, metadata)
}

export default MobilePWADeploymentManager