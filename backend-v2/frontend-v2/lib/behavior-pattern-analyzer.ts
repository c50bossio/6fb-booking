/**
 * User Behavior Pattern Analyzer
 * Advanced system for analyzing user touch patterns and adapting touch sensitivity
 * Provides personalized touch experience based on individual user behavior
 */

import { browserCompatibility, safeRequestAnimationFrame } from './browser-compatibility'

export interface UserBehaviorData {
  userId?: string
  sessionId: string
  timestamp: number
  gestureType: string
  touchDuration: number
  touchPressure: number
  touchArea: number
  velocity: number
  accuracy: number // How close to intended target
  contextType: 'appointment' | 'navigation' | 'input' | 'scroll'
  deviceType: 'phone' | 'tablet' | 'desktop'
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  success: boolean // Whether gesture achieved intended result
}

export interface BehaviorPattern {
  patternId: string
  category: 'touch_sensitivity' | 'gesture_preference' | 'timing_pattern' | 'accuracy_pattern'
  description: string
  confidence: number
  occurrences: number
  lastSeen: number
  characteristics: Record<string, any>
}

export interface UserProfile {
  userId?: string
  createdAt: number
  lastUpdated: number
  
  // Touch characteristics
  averagePressure: number
  preferredTouchDuration: number
  typicalTouchArea: number
  dominantHand: 'left' | 'right' | 'ambidextrous' | 'unknown'
  
  // Gesture preferences
  preferredGestureSpeed: number
  gestureAccuracy: number
  mostUsedGestures: string[]
  
  // Adaptive settings
  touchSensitivity: number      // 0.5 - 2.0 multiplier
  minimumTouchArea: number      // px²
  tapTimeout: number           // milliseconds
  longPressTimeout: number     // milliseconds
  swipeThreshold: number       // px
  
  // Usage patterns
  peakUsageHours: number[]
  averageSessionLength: number
  gestureSuccessRate: number
  
  // Detected patterns
  patterns: BehaviorPattern[]
  adaptations: Record<string, any>
}

export interface AdaptationRule {
  name: string
  condition: (profile: UserProfile, behavior: UserBehaviorData) => boolean
  adaptation: (profile: UserProfile) => Partial<UserProfile>
  priority: number
  description: string
}

export interface BehaviorConfig {
  enablePatternLearning: boolean
  enableAdaptiveAdjustments: boolean
  learningRate: number
  minDataPointsForPattern: number
  patternConfidenceThreshold: number
  adaptationSensitivity: number
  dataRetentionDays: number
  privacyMode: boolean
}

/**
 * User behavior pattern analysis and adaptation system
 */
class BehaviorPatternAnalyzer {
  private config: BehaviorConfig
  private userProfiles = new Map<string, UserProfile>()
  private behaviorData: UserBehaviorData[] = []
  private adaptationRules: AdaptationRule[] = []
  private currentSessionId: string
  private analysisInterval: NodeJS.Timeout
  private cleanupInterval: NodeJS.Timeout

  // Pattern detection templates
  private patternTemplates = {
    'light_touch_user': {
      category: 'touch_sensitivity',
      detector: (data: UserBehaviorData[]) => {
        const avgPressure = data.reduce((sum, d) => sum + d.touchPressure, 0) / data.length
        return avgPressure < 0.3 && data.length > 10
      },
      adaptation: { touchSensitivity: 1.3, minimumTouchArea: 30 }
    },
    'heavy_touch_user': {
      category: 'touch_sensitivity',
      detector: (data: UserBehaviorData[]) => {
        const avgPressure = data.reduce((sum, d) => sum + d.touchPressure, 0) / data.length
        return avgPressure > 0.7 && data.length > 10
      },
      adaptation: { touchSensitivity: 0.8, minimumTouchArea: 20 }
    },
    'fast_gesture_user': {
      category: 'gesture_preference',
      detector: (data: UserBehaviorData[]) => {
        const avgVelocity = data.reduce((sum, d) => sum + d.velocity, 0) / data.length
        return avgVelocity > 800 && data.length > 15
      },
      adaptation: { swipeThreshold: 30, tapTimeout: 150 }
    },
    'slow_deliberate_user': {
      category: 'gesture_preference',
      detector: (data: UserBehaviorData[]) => {
        const avgDuration = data.reduce((sum, d) => sum + d.touchDuration, 0) / data.length
        return avgDuration > 400 && data.length > 15
      },
      adaptation: { longPressTimeout: 1200, tapTimeout: 300 }
    },
    'morning_precision_user': {
      category: 'timing_pattern',
      detector: (data: UserBehaviorData[]) => {
        const morningData = data.filter(d => d.timeOfDay === 'morning')
        if (morningData.length < 5) return false
        const morningAccuracy = morningData.reduce((sum, d) => sum + d.accuracy, 0) / morningData.length
        const otherData = data.filter(d => d.timeOfDay !== 'morning')
        const otherAccuracy = otherData.length > 0 ? otherData.reduce((sum, d) => sum + d.accuracy, 0) / otherData.length : 0
        return morningAccuracy > otherAccuracy + 0.15
      },
      adaptation: { adaptByTimeOfDay: true }
    }
  }

  constructor(config: Partial<BehaviorConfig> = {}) {
    this.config = {
      enablePatternLearning: true,
      enableAdaptiveAdjustments: true,
      learningRate: 0.1,
      minDataPointsForPattern: 20,
      patternConfidenceThreshold: 0.7,
      adaptationSensitivity: 1.0,
      dataRetentionDays: 30,
      privacyMode: false,
      ...config
    }

    this.currentSessionId = this.generateSessionId()
    this.initializeBehaviorAnalysis()
    this.setupAdaptationRules()

    // Periodic analysis
    this.analysisInterval = setInterval(() => {
      this.performPatternAnalysis()
    }, 60000) // Every minute

    // Cleanup old data
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldData()
    }, 24 * 60 * 60 * 1000) // Daily
  }

  /**
   * Initialize behavior analysis system
   */
  private async initializeBehaviorAnalysis(): Promise<void> {
    // Load existing user profiles
    await this.loadUserProfiles()

    // Initialize device-specific defaults
    const deviceType = this.detectDeviceType()
    this.setDeviceDefaults(deviceType)

    console.log('BehaviorPatternAnalyzer: Initialized', {
      deviceType,
      privacyMode: this.config.privacyMode,
      enablePatternLearning: this.config.enablePatternLearning,
      profilesLoaded: this.userProfiles.size
    })
  }

  /**
   * Record user behavior data
   */
  recordBehavior(behaviorData: Omit<UserBehaviorData, 'sessionId' | 'timestamp' | 'deviceType' | 'timeOfDay'>): void {
    if (!this.config.enablePatternLearning) return

    const completeBehavior: UserBehaviorData = {
      ...behaviorData,
      sessionId: this.currentSessionId,
      timestamp: Date.now(),
      deviceType: this.detectDeviceType(),
      timeOfDay: this.getTimeOfDay()
    }

    this.behaviorData.push(completeBehavior)

    // Limit memory usage
    if (this.behaviorData.length > 1000) {
      this.behaviorData = this.behaviorData.slice(-500)
    }

    // Update user profile immediately for critical behaviors
    if (behaviorData.gestureType === 'tap' || behaviorData.gestureType === 'drag') {
      this.updateUserProfile(completeBehavior)
    }

    console.log('BehaviorPatternAnalyzer: Behavior recorded', {
      gestureType: behaviorData.gestureType,
      contextType: behaviorData.contextType,
      success: behaviorData.success
    })
  }

  /**
   * Get adaptive touch settings for current user
   */
  getAdaptiveTouchSettings(userId?: string): {
    touchSensitivity: number
    minimumTouchArea: number
    tapTimeout: number
    longPressTimeout: number
    swipeThreshold: number
  } {
    const profile = this.getUserProfile(userId)
    
    return {
      touchSensitivity: profile.touchSensitivity,
      minimumTouchArea: profile.minimumTouchArea,
      tapTimeout: profile.tapTimeout,
      longPressTimeout: profile.longPressTimeout,
      swipeThreshold: profile.swipeThreshold
    }
  }

  /**
   * Get user profile (creates if doesn't exist)
   */
  private getUserProfile(userId?: string): UserProfile {
    const key = userId || 'anonymous'
    
    if (!this.userProfiles.has(key)) {
      this.userProfiles.set(key, this.createDefaultProfile(userId))
    }
    
    return this.userProfiles.get(key)!
  }

  /**
   * Create default user profile
   */
  private createDefaultProfile(userId?: string): UserProfile {
    const deviceType = this.detectDeviceType()
    
    return {
      userId,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
      
      // Default touch characteristics
      averagePressure: 0.5,
      preferredTouchDuration: 200,
      typicalTouchArea: 25,
      dominantHand: 'unknown',
      
      // Default gesture preferences
      preferredGestureSpeed: 400,
      gestureAccuracy: 0.8,
      mostUsedGestures: ['tap', 'drag', 'swipe'],
      
      // Default adaptive settings
      touchSensitivity: deviceType === 'phone' ? 1.2 : 1.0,
      minimumTouchArea: deviceType === 'phone' ? 25 : 20,
      tapTimeout: 200,
      longPressTimeout: 800,
      swipeThreshold: 50,
      
      // Default usage patterns
      peakUsageHours: [9, 14, 19], // 9am, 2pm, 7pm
      averageSessionLength: 300000, // 5 minutes
      gestureSuccessRate: 0.85,
      
      patterns: [],
      adaptations: {}
    }
  }

  /**
   * Update user profile with new behavior data
   */
  private updateUserProfile(behavior: UserBehaviorData): void {
    const profile = this.getUserProfile(behavior.userId)
    const learningRate = this.config.learningRate
    
    // Update running averages
    profile.averagePressure = this.updateRunningAverage(
      profile.averagePressure, 
      behavior.touchPressure, 
      learningRate
    )
    
    profile.preferredTouchDuration = this.updateRunningAverage(
      profile.preferredTouchDuration, 
      behavior.touchDuration, 
      learningRate
    )
    
    profile.typicalTouchArea = this.updateRunningAverage(
      profile.typicalTouchArea, 
      behavior.touchArea, 
      learningRate
    )
    
    profile.preferredGestureSpeed = this.updateRunningAverage(
      profile.preferredGestureSpeed, 
      behavior.velocity, 
      learningRate
    )
    
    profile.gestureAccuracy = this.updateRunningAverage(
      profile.gestureAccuracy, 
      behavior.accuracy, 
      learningRate
    )
    
    // Update gesture usage
    this.updateGestureUsage(profile, behavior.gestureType)
    
    // Update peak usage hours
    this.updateUsageHours(profile, new Date(behavior.timestamp).getHours())
    
    // Update success rate
    profile.gestureSuccessRate = this.updateRunningAverage(
      profile.gestureSuccessRate,
      behavior.success ? 1.0 : 0.0,
      learningRate * 0.5 // Slower adaptation for success rate
    )
    
    profile.lastUpdated = Date.now()
    
    // Trigger adaptive adjustments if enabled
    if (this.config.enableAdaptiveAdjustments) {
      this.applyAdaptiveAdjustments(profile, behavior)
    }
  }

  /**
   * Apply adaptive adjustments based on behavior
   */
  private applyAdaptiveAdjustments(profile: UserProfile, behavior: UserBehaviorData): void {
    let adjustmentMade = false
    
    // Adjust touch sensitivity based on pressure patterns
    if (profile.averagePressure < 0.3 && profile.touchSensitivity < 1.5) {
      profile.touchSensitivity += 0.05
      adjustmentMade = true
    } else if (profile.averagePressure > 0.7 && profile.touchSensitivity > 0.7) {
      profile.touchSensitivity -= 0.05
      adjustmentMade = true
    }
    
    // Adjust timeouts based on gesture success and duration patterns
    if (profile.gestureSuccessRate < 0.7) {
      if (profile.preferredTouchDuration > 300) {
        profile.longPressTimeout = Math.min(1200, profile.longPressTimeout + 50)
        adjustmentMade = true
      }
      if (profile.preferredGestureSpeed < 200) {
        profile.tapTimeout = Math.min(400, profile.tapTimeout + 25)
        adjustmentMade = true
      }
    }
    
    // Adjust swipe threshold based on gesture accuracy
    if (behavior.gestureType === 'swipe' && behavior.accuracy < 0.6) {
      profile.swipeThreshold = Math.max(30, profile.swipeThreshold - 5)
      adjustmentMade = true
    }
    
    // Adjust minimum touch area for users with accuracy issues
    if (profile.gestureAccuracy < 0.7 && profile.minimumTouchArea < 40) {
      profile.minimumTouchArea += 2
      adjustmentMade = true
    }
    
    if (adjustmentMade) {
      console.log('BehaviorPatternAnalyzer: Applied adaptive adjustments', {
        userId: profile.userId || 'anonymous',
        touchSensitivity: Math.round(profile.touchSensitivity * 100) / 100,
        tapTimeout: profile.tapTimeout,
        longPressTimeout: profile.longPressTimeout
      })
    }
  }

  /**
   * Perform pattern analysis on behavior data
   */
  private performPatternAnalysis(): void {
    if (this.behaviorData.length < this.config.minDataPointsForPattern) return
    
    // Group behavior data by user
    const userBehaviorMap = new Map<string, UserBehaviorData[]>()
    
    this.behaviorData.forEach(behavior => {
      const key = behavior.userId || 'anonymous'
      if (!userBehaviorMap.has(key)) {
        userBehaviorMap.set(key, [])
      }
      userBehaviorMap.get(key)!.push(behavior)
    })
    
    // Analyze patterns for each user
    userBehaviorMap.forEach((behaviors, userId) => {
      this.analyzeUserPatterns(userId, behaviors)
    })
  }

  /**
   * Analyze patterns for specific user
   */
  private analyzeUserPatterns(userId: string, behaviors: UserBehaviorData[]): void {
    const profile = this.getUserProfile(userId === 'anonymous' ? undefined : userId)
    
    // Detect patterns using templates
    Object.entries(this.patternTemplates).forEach(([patternName, template]) => {
      const isDetected = template.detector(behaviors)
      
      if (isDetected) {
        const existingPattern = profile.patterns.find(p => p.patternId === patternName)
        
        if (existingPattern) {
          existingPattern.occurrences++
          existingPattern.lastSeen = Date.now()
          existingPattern.confidence = Math.min(1.0, existingPattern.confidence + 0.1)
        } else {
          profile.patterns.push({
            patternId: patternName,
            category: template.category as any,
            description: `Detected ${patternName.replace(/_/g, ' ')} pattern`,
            confidence: 0.7,
            occurrences: 1,
            lastSeen: Date.now(),
            characteristics: template.adaptation
          })
        }
        
        // Apply pattern adaptations
        if (profile.patterns.find(p => p.patternId === patternName)!.confidence > this.config.patternConfidenceThreshold) {
          Object.assign(profile.adaptations, template.adaptation)
          this.applyPatternAdaptations(profile, template.adaptation)
        }
      }
    })
    
    // Detect hand dominance
    this.detectHandDominance(profile, behaviors)
    
    // Update time-based patterns
    this.updateTimeBasedPatterns(profile, behaviors)
  }

  /**
   * Detect hand dominance from touch patterns
   */
  private detectHandDominance(profile: UserProfile, behaviors: UserBehaviorData[]): void {
    // Simple heuristic: analyze touch positions on screen
    const screenWidth = window.innerWidth
    const leftSideTouches = behaviors.filter(b => b.contextType !== 'scroll').length // Simplified
    const rightSideTouches = behaviors.length - leftSideTouches
    
    if (leftSideTouches > rightSideTouches * 1.3) {
      profile.dominantHand = 'left'
    } else if (rightSideTouches > leftSideTouches * 1.3) {
      profile.dominantHand = 'right'
    } else if (Math.abs(leftSideTouches - rightSideTouches) < behaviors.length * 0.1) {
      profile.dominantHand = 'ambidextrous'
    }
  }

  /**
   * Update time-based usage patterns
   */
  private updateTimeBasedPatterns(profile: UserProfile, behaviors: UserBehaviorData[]): void {
    const hourCounts = new Array(24).fill(0)
    
    behaviors.forEach(behavior => {
      const hour = new Date(behavior.timestamp).getHours()
      hourCounts[hour]++
    })
    
    // Find peak hours (top 3)
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour)
    
    profile.peakUsageHours = peakHours
  }

  /**
   * Apply pattern adaptations to profile
   */
  private applyPatternAdaptations(profile: UserProfile, adaptations: Record<string, any>): void {
    Object.entries(adaptations).forEach(([key, value]) => {
      if (key in profile && typeof value === 'number') {
        // Apply adaptation with sensitivity multiplier
        const currentValue = (profile as any)[key]
        const adaptedValue = currentValue + (value - currentValue) * this.config.adaptationSensitivity * 0.1
        ;(profile as any)[key] = adaptedValue
      }
    })
  }

  /**
   * Setup adaptation rules
   */
  private setupAdaptationRules(): void {
    this.adaptationRules = [
      {
        name: 'low_accuracy_assistance',
        priority: 100,
        description: 'Increase touch sensitivity for users with low accuracy',
        condition: (profile) => profile.gestureAccuracy < 0.6,
        adaptation: (profile) => ({
          touchSensitivity: Math.min(2.0, profile.touchSensitivity * 1.1),
          minimumTouchArea: Math.min(50, profile.minimumTouchArea + 5)
        })
      },
      {
        name: 'fast_user_optimization',
        priority: 80,
        description: 'Optimize timeouts for fast gesture users',
        condition: (profile) => profile.preferredGestureSpeed > 600,
        adaptation: (profile) => ({
          tapTimeout: Math.max(100, profile.tapTimeout * 0.8),
          swipeThreshold: Math.max(30, profile.swipeThreshold * 0.8)
        })
      },
      {
        name: 'deliberate_user_optimization',
        priority: 80,
        description: 'Extend timeouts for deliberate gesture users',
        condition: (profile) => profile.preferredTouchDuration > 400,
        adaptation: (profile) => ({
          longPressTimeout: Math.min(1500, profile.longPressTimeout * 1.2),
          tapTimeout: Math.min(500, profile.tapTimeout * 1.2)
        })
      }
    ]
  }

  /**
   * Get user behavior insights
   */
  getUserBehaviorInsights(userId?: string): {
    profile: UserProfile
    patterns: BehaviorPattern[]
    recommendations: string[]
    adaptations: Record<string, any>
  } {
    const profile = this.getUserProfile(userId)
    const recommendations: string[] = []
    
    // Generate recommendations based on patterns
    if (profile.gestureAccuracy < 0.7) {
      recommendations.push('Consider slowing down gestures for better accuracy')
    }
    
    if (profile.averagePressure < 0.3) {
      recommendations.push('Light touch detected - sensitivity has been increased')
    }
    
    if (profile.gestureSuccessRate < 0.8) {
      recommendations.push('Touch timeouts have been adjusted for better recognition')
    }
    
    return {
      profile,
      patterns: profile.patterns.filter(p => p.confidence > 0.6),
      recommendations,
      adaptations: profile.adaptations
    }
  }

  /**
   * Helper methods
   */
  private updateRunningAverage(current: number, newValue: number, learningRate: number): number {
    return current * (1 - learningRate) + newValue * learningRate
  }

  private updateGestureUsage(profile: UserProfile, gestureType: string): void {
    if (!profile.mostUsedGestures.includes(gestureType)) {
      profile.mostUsedGestures.push(gestureType)
      profile.mostUsedGestures = profile.mostUsedGestures.slice(0, 5) // Keep top 5
    }
  }

  private updateUsageHours(profile: UserProfile, hour: number): void {
    if (!profile.peakUsageHours.includes(hour)) {
      profile.peakUsageHours.push(hour)
      profile.peakUsageHours.sort((a, b) => a - b)
      profile.peakUsageHours = profile.peakUsageHours.slice(0, 3) // Keep top 3
    }
  }

  private detectDeviceType(): 'phone' | 'tablet' | 'desktop' {
    const width = window.innerWidth
    if (width < 768) return 'phone'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 17) return 'afternoon'
    if (hour >= 17 && hour < 22) return 'evening'
    return 'night'
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private setDeviceDefaults(deviceType: 'phone' | 'tablet' | 'desktop'): void {
    // Adjust global defaults based on device type
    switch (deviceType) {
      case 'phone':
        this.config.adaptationSensitivity *= 1.2
        break
      case 'tablet':
        this.config.adaptationSensitivity *= 1.1
        break
      default:
        // Desktop defaults
        break
    }
  }

  /**
   * Data management methods
   */
  private async loadUserProfiles(): Promise<void> {
    if (this.config.privacyMode) return
    
    try {
      const saved = localStorage.getItem('behaviorUserProfiles')
      if (saved) {
        const profiles = JSON.parse(saved)
        Object.entries(profiles).forEach(([key, profile]) => {
          this.userProfiles.set(key, profile as UserProfile)
        })
        console.log('BehaviorPatternAnalyzer: Loaded user profiles', this.userProfiles.size)
      }
    } catch (error) {
      console.warn('BehaviorPatternAnalyzer: Failed to load user profiles:', error)
    }
  }

  private persistUserProfiles(): void {
    if (this.config.privacyMode) return
    
    try {
      const profiles: Record<string, UserProfile> = {}
      this.userProfiles.forEach((profile, key) => {
        profiles[key] = profile
      })
      localStorage.setItem('behaviorUserProfiles', JSON.stringify(profiles))
    } catch (error) {
      console.warn('BehaviorPatternAnalyzer: Failed to persist user profiles:', error)
    }
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000)
    
    // Clean old behavior data
    this.behaviorData = this.behaviorData.filter(data => data.timestamp > cutoffTime)
    
    // Clean old patterns from profiles
    this.userProfiles.forEach(profile => {
      profile.patterns = profile.patterns.filter(pattern => pattern.lastSeen > cutoffTime)
    })
    
    console.log('BehaviorPatternAnalyzer: Cleanup completed', {
      behaviorDataSize: this.behaviorData.length,
      profileCount: this.userProfiles.size
    })
  }

  /**
   * Get behavior analytics
   */
  getBehaviorAnalytics(): {
    totalUsers: number
    totalBehaviorData: number
    patternsDetected: number
    averageAccuracy: number
    adaptationsMade: number
  } {
    let totalPatterns = 0
    let totalAccuracy = 0
    let adaptationsMade = 0
    
    this.userProfiles.forEach(profile => {
      totalPatterns += profile.patterns.length
      totalAccuracy += profile.gestureAccuracy
      adaptationsMade += Object.keys(profile.adaptations).length
    })
    
    return {
      totalUsers: this.userProfiles.size,
      totalBehaviorData: this.behaviorData.length,
      patternsDetected: totalPatterns,
      averageAccuracy: this.userProfiles.size > 0 ? totalAccuracy / this.userProfiles.size : 0,
      adaptationsMade
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<BehaviorConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('BehaviorPatternAnalyzer: Configuration updated', this.config)
  }

  /**
   * Destroy the behavior analyzer
   */
  destroy(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval)
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
    
    // Persist final data
    this.persistUserProfiles()
    
    this.userProfiles.clear()
    this.behaviorData = []
    this.adaptationRules = []
  }
}

// Singleton instance for global behavior analysis
export const behaviorPatternAnalyzer = new BehaviorPatternAnalyzer()

// React hook for behavior pattern analysis
export function useBehaviorPatternAnalysis() {
  const recordBehavior = (behaviorData: Omit<UserBehaviorData, 'sessionId' | 'timestamp' | 'deviceType' | 'timeOfDay'>) => {
    behaviorPatternAnalyzer.recordBehavior(behaviorData)
  }

  const getAdaptiveTouchSettings = (userId?: string) => {
    return behaviorPatternAnalyzer.getAdaptiveTouchSettings(userId)
  }

  const getUserBehaviorInsights = (userId?: string) => {
    return behaviorPatternAnalyzer.getUserBehaviorInsights(userId)
  }

  const getBehaviorAnalytics = () => {
    return behaviorPatternAnalyzer.getBehaviorAnalytics()
  }

  return {
    recordBehavior,
    getAdaptiveTouchSettings,
    getUserBehaviorInsights,
    getBehaviorAnalytics
  }
}

export default behaviorPatternAnalyzer