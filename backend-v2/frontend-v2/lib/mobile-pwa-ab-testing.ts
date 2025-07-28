/**
 * Mobile PWA A/B Testing Framework
 * Controlled experimentation for mobile features and optimizations
 * Version: 1.0.0
 */

import { getDeploymentManager } from './mobile-pwa-deployment'
import { getAnalyticsSystem } from './mobile-pwa-analytics'
import { getMonitoringSystem } from './mobile-pwa-monitoring'

export interface ABTestVariant {
  id: string
  name: string
  description: string
  weight: number // 0-100, percentage of traffic
  config: any // Variant-specific configuration
  isControl: boolean
}

export interface ABTest {
  id: string
  name: string
  description: string
  status: 'draft' | 'running' | 'paused' | 'completed'
  variants: ABTestVariant[]
  startDate: number
  endDate?: number
  targetMetric: string
  successCriteria: string
  tags: string[]
  createdBy: string
  createdAt: number
}

export interface ABTestAssignment {
  userId: string
  testId: string
  variantId: string
  assignedAt: number
  sessionId: string
}

export interface ABTestResult {
  testId: string
  variantId: string
  metric: string
  value: number
  sampleSize: number
  confidence: number
  timestamp: number
}

export interface ABTestConfig {
  enabled: boolean
  stickyAssignments: boolean // Users stay in same variant
  cookieDuration: number // Days to remember assignment
  minimumSampleSize: number
  confidenceThreshold: number // 95% = 0.95
  excludeBots: boolean
  respectDoNotTrack: boolean
}

const DEFAULT_AB_CONFIG: ABTestConfig = {
  enabled: true,
  stickyAssignments: true,
  cookieDuration: 30, // 30 days
  minimumSampleSize: 100,
  confidenceThreshold: 0.95,
  excludeBots: true,
  respectDoNotTrack: true
}

export class MobilePWAABTestingFramework {
  private config: ABTestConfig
  private activeTests: Map<string, ABTest> = new Map()
  private userAssignments: Map<string, ABTestAssignment[]> = new Map()
  private testResults: Map<string, ABTestResult[]> = new Map()
  private userId?: string
  private sessionId: string

  constructor(config?: Partial<ABTestConfig>, userId?: string) {
    this.config = { ...DEFAULT_AB_CONFIG, ...config }
    this.userId = userId
    this.sessionId = this.generateSessionId()
    this.initializeFramework()
  }

  private initializeFramework() {
    if (!this.config.enabled) return

    // Load active tests
    this.loadActiveTests()
    
    // Load user assignments from storage
    this.loadUserAssignments()
    
    // Initialize default mobile PWA tests
    this.initializeDefaultTests()
  }

  private generateSessionId(): string {
    return `ab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private loadActiveTests() {
    try {
      const stored = localStorage.getItem('mobile_pwa_ab_tests')
      if (stored) {
        const tests = JSON.parse(stored)
        tests.forEach((test: ABTest) => {
          if (test.status === 'running') {
            this.activeTests.set(test.id, test)
          }
        })
      }
    } catch (error) {
      console.warn('Failed to load AB tests from storage:', error)
    }
  }

  private loadUserAssignments() {
    if (!this.userId) return

    try {
      const stored = localStorage.getItem(`mobile_pwa_ab_assignments_${this.userId}`)
      if (stored) {
        const assignments = JSON.parse(stored)
        this.userAssignments.set(this.userId, assignments)
      }
    } catch (error) {
      console.warn('Failed to load user assignments:', error)
    }
  }

  private saveUserAssignments() {
    if (!this.userId || !this.config.stickyAssignments) return

    try {
      const assignments = this.userAssignments.get(this.userId) || []
      localStorage.setItem(
        `mobile_pwa_ab_assignments_${this.userId}`,
        JSON.stringify(assignments)
      )
    } catch (error) {
      console.warn('Failed to save user assignments:', error)
    }
  }

  private initializeDefaultTests() {
    // Default A/B tests for mobile PWA features
    const defaultTests: ABTest[] = [
      {
        id: 'haptic_feedback_intensity',
        name: 'Haptic Feedback Intensity',
        description: 'Test different haptic feedback intensity levels for touch interactions',
        status: 'running',
        variants: [
          {
            id: 'control',
            name: 'Standard Intensity',
            description: 'Current haptic feedback intensity',
            weight: 50,
            config: { hapticIntensity: 'medium' },
            isControl: true
          },
          {
            id: 'light_haptic',
            name: 'Light Haptic',
            description: 'Lighter haptic feedback for better battery life',
            weight: 25,
            config: { hapticIntensity: 'light' },
            isControl: false
          },
          {
            id: 'strong_haptic',
            name: 'Strong Haptic',
            description: 'Stronger haptic feedback for better user perception',
            weight: 25,
            config: { hapticIntensity: 'heavy' },
            isControl: false
          }
        ],
        startDate: Date.now() - 86400000, // Started yesterday
        targetMetric: 'user_satisfaction',
        successCriteria: 'Increase user satisfaction rating by 10%',
        tags: ['haptic', 'ux', 'mobile'],
        createdBy: 'mobile_pwa_system',
        createdAt: Date.now() - 86400000
      },
      {
        id: 'touch_response_threshold',
        name: 'Touch Response Threshold',
        description: 'Optimize touch response time thresholds for better performance',
        status: 'running',
        variants: [
          {
            id: 'control',
            name: 'Current Threshold',
            description: '16ms touch response threshold',
            weight: 50,
            config: { touchThreshold: 16 },
            isControl: true
          },
          {
            id: 'fast_threshold',
            name: 'Fast Threshold',
            description: '10ms touch response threshold',
            weight: 50,
            config: { touchThreshold: 10 },
            isControl: false
          }
        ],
        startDate: Date.now() - 172800000, // Started 2 days ago
        targetMetric: 'touch_success_rate',
        successCriteria: 'Improve touch success rate by 5%',
        tags: ['performance', 'touch', 'mobile'],
        createdBy: 'mobile_pwa_system',
        createdAt: Date.now() - 172800000
      },
      {
        id: 'onboarding_flow_length',
        name: 'Onboarding Flow Length',
        description: 'Test different onboarding flow lengths for feature adoption',
        status: 'running',
        variants: [
          {
            id: 'control',
            name: 'Full Onboarding',
            description: 'Complete 9-step onboarding flow',
            weight: 40,
            config: { onboardingSteps: 9 },
            isControl: true
          },
          {
            id: 'short_onboarding',
            name: 'Short Onboarding',
            description: 'Condensed 5-step onboarding flow',
            weight: 30,
            config: { onboardingSteps: 5 },
            isControl: false
          },
          {
            id: 'minimal_onboarding',
            name: 'Minimal Onboarding',
            description: 'Essential 3-step onboarding flow',
            weight: 30,
            config: { onboardingSteps: 3 },
            isControl: false
          }
        ],
        startDate: Date.now() - 259200000, // Started 3 days ago
        targetMetric: 'onboarding_completion_rate',
        successCriteria: 'Increase completion rate by 15%',
        tags: ['onboarding', 'ux', 'adoption'],
        createdBy: 'mobile_pwa_system',
        createdAt: Date.now() - 259200000
      }
    ]

    defaultTests.forEach(test => {
      this.activeTests.set(test.id, test)
    })
  }

  /**
   * Get variant assignment for a test
   */
  getVariant(testId: string): ABTestVariant | null {
    const test = this.activeTests.get(testId)
    if (!test || test.status !== 'running') return null

    if (!this.userId) {
      // Anonymous users get random assignment
      return this.getRandomVariant(test)
    }

    // Check for existing assignment
    const userAssignments = this.userAssignments.get(this.userId) || []
    const existingAssignment = userAssignments.find(a => a.testId === testId)

    if (existingAssignment && this.config.stickyAssignments) {
      const variant = test.variants.find(v => v.id === existingAssignment.variantId)
      if (variant) return variant
    }

    // Create new assignment
    const variant = this.assignUserToVariant(test)
    if (variant) {
      const assignment: ABTestAssignment = {
        userId: this.userId,
        testId,
        variantId: variant.id,
        assignedAt: Date.now(),
        sessionId: this.sessionId
      }

      const assignments = this.userAssignments.get(this.userId) || []
      assignments.push(assignment)
      this.userAssignments.set(this.userId, assignments)
      this.saveUserAssignments()

      // Track assignment event
      this.trackAssignmentEvent(testId, variant.id)
    }

    return variant
  }

  private getRandomVariant(test: ABTest): ABTestVariant {
    const random = Math.random() * 100
    let cumulativeWeight = 0

    for (const variant of test.variants) {
      cumulativeWeight += variant.weight
      if (random <= cumulativeWeight) {
        return variant
      }
    }

    // Fallback to control variant
    return test.variants.find(v => v.isControl) || test.variants[0]
  }

  private assignUserToVariant(test: ABTest): ABTestVariant {
    if (!this.userId) return this.getRandomVariant(test)

    // Use user ID hash for consistent assignment
    const hash = this.hashString(this.userId + test.id)
    const random = (hash % 10000) / 100 // 0-100 with more precision

    let cumulativeWeight = 0
    for (const variant of test.variants) {
      cumulativeWeight += variant.weight
      if (random <= cumulativeWeight) {
        return variant
      }
    }

    return test.variants.find(v => v.isControl) || test.variants[0]
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Track conversion event for A/B test
   */
  trackConversion(testId: string, metric: string, value: number = 1): void {
    const test = this.activeTests.get(testId)
    if (!test) return

    const variant = this.getVariant(testId)
    if (!variant) return

    const result: ABTestResult = {
      testId,
      variantId: variant.id,
      metric,
      value,
      sampleSize: 1,
      confidence: 0,
      timestamp: Date.now()
    }

    const results = this.testResults.get(testId) || []
    results.push(result)
    this.testResults.set(testId, results)

    // Track with analytics system
    const analytics = getAnalyticsSystem()
    analytics.trackEvent('ab_test_conversion', {
      testId,
      variantId: variant.id,
      metric,
      value,
      userId: this.userId,
      sessionId: this.sessionId
    })
  }

  /**
   * Get test results and statistical analysis
   */
  getTestResults(testId: string): {
    test: ABTest
    variants: Array<{
      variant: ABTestVariant
      metrics: { [metric: string]: { value: number; sampleSize: number; confidence: number } }
      conversionRate: number
      improvement: number
    }>
    winner?: string
    confidence: number
  } | null {
    const test = this.activeTests.get(testId)
    if (!test) return null

    const results = this.testResults.get(testId) || []
    const variantResults = test.variants.map(variant => {
      const variantData = results.filter(r => r.variantId === variant.id)
      
      const metrics: { [metric: string]: { value: number; sampleSize: number; confidence: number } } = {}
      const metricGroups = this.groupBy(variantData, 'metric')
      
      Object.entries(metricGroups).forEach(([metric, data]) => {
        const values = data.map(d => d.value)
        const sampleSize = data.length
        const value = values.reduce((sum, v) => sum + v, 0) / sampleSize
        
        metrics[metric] = {
          value,
          sampleSize,
          confidence: this.calculateConfidence(values)
        }
      })

      const conversionRate = metrics[test.targetMetric]?.value || 0
      const controlRate = this.getControlConversionRate(test, results)
      const improvement = controlRate > 0 ? ((conversionRate - controlRate) / controlRate) * 100 : 0

      return {
        variant,
        metrics,
        conversionRate,
        improvement
      }
    })

    // Determine winner based on statistical significance
    const winner = this.determineWinner(variantResults, test.targetMetric)
    const confidence = this.calculateTestConfidence(variantResults, test.targetMetric)

    return {
      test,
      variants: variantResults,
      winner,
      confidence
    }
  }

  private getControlConversionRate(test: ABTest, results: ABTestResult[]): number {
    const controlVariant = test.variants.find(v => v.isControl)
    if (!controlVariant) return 0

    const controlResults = results.filter(r => r.variantId === controlVariant.id && r.metric === test.targetMetric)
    if (controlResults.length === 0) return 0

    return controlResults.reduce((sum, r) => sum + r.value, 0) / controlResults.length
  }

  private determineWinner(variantResults: any[], targetMetric: string): string | undefined {
    const validVariants = variantResults.filter(v => 
      v.metrics[targetMetric]?.sampleSize >= this.config.minimumSampleSize
    )

    if (validVariants.length < 2) return undefined

    const bestVariant = validVariants.reduce((best, current) => 
      (current.metrics[targetMetric]?.value || 0) > (best.metrics[targetMetric]?.value || 0) ? current : best
    )

    const confidence = bestVariant.metrics[targetMetric]?.confidence || 0
    return confidence >= this.config.confidenceThreshold ? bestVariant.variant.id : undefined
  }

  private calculateConfidence(values: number[]): number {
    if (values.length < 30) return 0 // Insufficient sample size

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    const standardError = Math.sqrt(variance / values.length)
    
    // Simplified confidence calculation (assumes normal distribution)
    const margin = 1.96 * standardError // 95% confidence interval
    return mean > margin ? 0.95 : Math.max(0, 0.95 - (margin - mean) / mean)
  }

  private calculateTestConfidence(variantResults: any[], targetMetric: string): number {
    const controlVariant = variantResults.find(v => v.variant.isControl)
    if (!controlVariant) return 0

    const testVariants = variantResults.filter(v => !v.variant.isControl)
    if (testVariants.length === 0) return 0

    // Return highest confidence among test variants
    return Math.max(...testVariants.map(v => v.metrics[targetMetric]?.confidence || 0))
  }

  private groupBy<T>(array: T[], key: keyof T): { [key: string]: T[] } {
    return array.reduce((groups, item) => {
      const groupKey = String(item[key])
      groups[groupKey] = groups[groupKey] || []
      groups[groupKey].push(item)
      return groups
    }, {} as { [key: string]: T[] })
  }

  private trackAssignmentEvent(testId: string, variantId: string): void {
    const analytics = getAnalyticsSystem()
    analytics.trackEvent('ab_test_assignment', {
      testId,
      variantId,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now()
    })
  }

  /**
   * Create new A/B test
   */
  createTest(test: Omit<ABTest, 'id' | 'createdAt'>): string {
    const id = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newTest: ABTest = {
      ...test,
      id,
      createdAt: Date.now()
    }

    this.activeTests.set(id, newTest)
    this.saveTests()
    
    return id
  }

  /**
   * Start/stop test
   */
  updateTestStatus(testId: string, status: ABTest['status']): boolean {
    const test = this.activeTests.get(testId)
    if (!test) return false

    test.status = status
    this.saveTests()
    
    return true
  }

  /**
   * Get all active tests
   */
  getActiveTests(): ABTest[] {
    return Array.from(this.activeTests.values()).filter(test => test.status === 'running')
  }

  /**
   * Get user's current assignments
   */
  getUserAssignments(): ABTestAssignment[] {
    if (!this.userId) return []
    return this.userAssignments.get(this.userId) || []
  }

  private saveTests(): void {
    try {
      const tests = Array.from(this.activeTests.values())
      localStorage.setItem('mobile_pwa_ab_tests', JSON.stringify(tests))
    } catch (error) {
      console.warn('Failed to save AB tests:', error)
    }
  }

  /**
   * Export test data for analysis
   */
  exportTestData(testId: string): any {
    const results = this.getTestResults(testId)
    if (!results) return null

    return {
      test: results.test,
      results: results.variants,
      winner: results.winner,
      confidence: results.confidence,
      exportedAt: Date.now()
    }
  }
}

// Global A/B testing instance
let globalABTesting: MobilePWAABTestingFramework | null = null

/**
 * Get or create A/B testing instance
 */
export function getABTestingFramework(config?: Partial<ABTestConfig>, userId?: string): MobilePWAABTestingFramework {
  if (!globalABTesting) {
    globalABTesting = new MobilePWAABTestingFramework(config, userId)
  }
  return globalABTesting
}

/**
 * React hook for A/B testing
 */
export function useABTest(testId: string): {
  variant: ABTestVariant | null
  trackConversion: (metric: string, value?: number) => void
  isControl: boolean
  config: any
} {
  const abTesting = getABTestingFramework()
  const variant = abTesting.getVariant(testId)

  return {
    variant,
    trackConversion: (metric: string, value: number = 1) => {
      abTesting.trackConversion(testId, metric, value)
    },
    isControl: variant?.isControl || false,
    config: variant?.config || {}
  }
}

/**
 * Convenience functions for common mobile PWA tests
 */
export function useHapticIntensityTest(): {
  intensity: 'light' | 'medium' | 'heavy'
  trackSuccess: () => void
} {
  const { config, trackConversion } = useABTest('haptic_feedback_intensity')
  
  return {
    intensity: config.hapticIntensity || 'medium',
    trackSuccess: () => trackConversion('haptic_success')
  }
}

export function useTouchThresholdTest(): {
  threshold: number
  trackTouch: (responseTime: number) => void
} {
  const { config, trackConversion } = useABTest('touch_response_threshold')
  
  return {
    threshold: config.touchThreshold || 16,
    trackTouch: (responseTime: number) => {
      trackConversion('touch_response_time', responseTime)
      if (responseTime <= config.touchThreshold) {
        trackConversion('touch_success', 1)
      }
    }
  }
}

export function useOnboardingLengthTest(): {
  stepCount: number
  trackCompletion: () => void
} {
  const { config, trackConversion } = useABTest('onboarding_flow_length')
  
  return {
    stepCount: config.onboardingSteps || 9,
    trackCompletion: () => trackConversion('onboarding_completion')
  }
}

export default MobilePWAABTestingFramework