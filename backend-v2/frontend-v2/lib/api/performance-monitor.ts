/**
 * Performance Monitor
 * 
 * Tracks API request performance with comprehensive metrics collection
 */

import { MonitoringConfig } from './types/common'

export interface RequestMetrics {
  endpoint: string
  method: string
  duration: number
  status: number
  requestSize?: number
  responseSize?: number
  timestamp: number
  tags?: Record<string, string>
}

export interface EndpointStats {
  endpoint: string
  count: number
  avgDuration: number
  minDuration: number
  maxDuration: number
  errorRate: number
  lastRequest: number
  statusCodes: Record<number, number>
}

export interface PerformanceSummary {
  totalRequests: number
  avgResponseTime: number
  errorRate: number
  slowRequests: number
  topEndpoints: EndpointStats[]
  recentErrors: RequestMetrics[]
  performanceScore: number
}

export class PerformanceMonitor {
  private config: MonitoringConfig
  private metrics: RequestMetrics[] = []
  private maxMetricsSize = 1000 // Keep last 1000 requests in memory
  private timers: Map<string, number> = new Map()

  constructor(config: MonitoringConfig) {
    this.config = config
  }

  /**
   * Start timing a request
   */
  startTiming(requestId: string, endpoint: string, method: string): () => void {
    if (!this.config.enabled || !this.config.performanceTracking) {
      return () => {} // No-op
    }

    const startTime = performance.now()
    this.timers.set(requestId, startTime)

    if (this.config.logRequests) {
      console.log(`🚀 Starting ${method} ${endpoint} [${requestId}]`)
    }

    return () => {
      this.endTiming(requestId, endpoint, method)
    }
  }

  /**
   * End timing a request and record metrics
   */
  endTiming(
    requestId: string,
    endpoint: string,
    method: string,
    status: number = 0,
    requestSize?: number,
    responseSize?: number,
    tags?: Record<string, string>
  ): void {
    if (!this.config.enabled || !this.config.performanceTracking) {
      return
    }

    const startTime = this.timers.get(requestId)
    if (!startTime) {
      console.warn(`⚠️ No start time found for request ${requestId}`)
      return
    }

    const duration = performance.now() - startTime
    this.timers.delete(requestId)

    const metrics: RequestMetrics = {
      endpoint,
      method,
      duration,
      status,
      requestSize,
      responseSize,
      timestamp: Date.now(),
      tags
    }

    this.recordMetrics(metrics)

    // Log slow requests
    if (duration > this.config.slowRequestThreshold) {
      console.warn(
        `🐌 Slow request detected: ${method} ${endpoint} took ${duration.toFixed(2)}ms [${requestId}]`
      )
    }

    if (this.config.logRequests) {
      const statusEmoji = status >= 200 && status < 300 ? '✅' : '❌'
      console.log(
        `${statusEmoji} ${method} ${endpoint} - ${status} - ${duration.toFixed(2)}ms [${requestId}]`
      )
    }
  }

  /**
   * Record request metrics
   */
  recordMetrics(metrics: RequestMetrics): void {
    this.metrics.push(metrics)

    // Keep metrics array size manageable
    if (this.metrics.length > this.maxMetricsSize) {
      this.metrics = this.metrics.slice(-this.maxMetricsSize)
    }
  }

  /**
   * Track an operation with automatic timing
   */
  async track<T>(
    operation: () => Promise<T>,
    endpoint: string,
    method: string = 'GET',
    tags?: Record<string, string>
  ): Promise<T> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const endTiming = this.startTiming(requestId, endpoint, method)

    try {
      const result = await operation()
      this.endTiming(requestId, endpoint, method, 200, undefined, undefined, tags)
      return result
    } catch (error: any) {
      const status = error.status || 0
      this.endTiming(requestId, endpoint, method, status, undefined, undefined, tags)
      throw error
    }
  }

  /**
   * Get performance summary
   */
  getSummary(timeWindow?: number): PerformanceSummary {
    const now = Date.now()
    const windowStart = timeWindow ? now - timeWindow : 0
    const relevantMetrics = this.metrics.filter(m => m.timestamp >= windowStart)

    if (relevantMetrics.length === 0) {
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        slowRequests: 0,
        topEndpoints: [],
        recentErrors: [],
        performanceScore: 100
      }
    }

    const totalRequests = relevantMetrics.length
    const avgResponseTime = relevantMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests
    const errorCount = relevantMetrics.filter(m => m.status >= 400).length
    const errorRate = (errorCount / totalRequests) * 100
    const slowRequests = relevantMetrics.filter(m => m.duration > this.config.slowRequestThreshold).length

    // Group by endpoint
    const endpointGroups = this.groupByEndpoint(relevantMetrics)
    const topEndpoints = Object.values(endpointGroups)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Recent errors (last 10)
    const recentErrors = relevantMetrics
      .filter(m => m.status >= 400)
      .slice(-10)
      .reverse()

    // Calculate performance score (0-100)
    const performanceScore = this.calculatePerformanceScore(avgResponseTime, errorRate, slowRequests, totalRequests)

    return {
      totalRequests,
      avgResponseTime,
      errorRate,
      slowRequests,
      topEndpoints,
      recentErrors,
      performanceScore
    }
  }

  /**
   * Get metrics for a specific endpoint
   */
  getEndpointMetrics(endpoint: string, timeWindow?: number): RequestMetrics[] {
    const now = Date.now()
    const windowStart = timeWindow ? now - timeWindow : 0
    
    return this.metrics.filter(m => 
      m.endpoint === endpoint && m.timestamp >= windowStart
    )
  }

  /**
   * Get slow requests
   */
  getSlowRequests(timeWindow?: number): RequestMetrics[] {
    const now = Date.now()
    const windowStart = timeWindow ? now - timeWindow : 0
    
    return this.metrics
      .filter(m => 
        m.duration > this.config.slowRequestThreshold && 
        m.timestamp >= windowStart
      )
      .sort((a, b) => b.duration - a.duration)
  }

  /**
   * Get error requests
   */
  getErrorRequests(timeWindow?: number): RequestMetrics[] {
    const now = Date.now()
    const windowStart = timeWindow ? now - timeWindow : 0
    
    return this.metrics
      .filter(m => m.status >= 400 && m.timestamp >= windowStart)
      .sort((a, b) => b.timestamp - a.timestamp)
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = []
    this.timers.clear()
  }

  /**
   * Get current configuration
   */
  getConfig(): MonitoringConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): RequestMetrics[] {
    return [...this.metrics]
  }

  /**
   * Log performance summary to console
   */
  logSummary(timeWindow?: number): void {
    const summary = this.getSummary(timeWindow)
    
    console.group('📊 API Performance Summary')
    console.log(`Total Requests: ${summary.totalRequests}`)
    console.log(`Average Response Time: ${summary.avgResponseTime.toFixed(2)}ms`)
    console.log(`Error Rate: ${summary.errorRate.toFixed(2)}%`)
    console.log(`Slow Requests: ${summary.slowRequests}`)
    console.log(`Performance Score: ${summary.performanceScore}/100`)
    
    if (summary.topEndpoints.length > 0) {
      console.log('\nTop Endpoints:')
      summary.topEndpoints.slice(0, 5).forEach(endpoint => {
        console.log(`  ${endpoint.endpoint}: ${endpoint.count} requests, ${endpoint.avgDuration.toFixed(2)}ms avg`)
      })
    }
    
    if (summary.recentErrors.length > 0) {
      console.log('\nRecent Errors:')
      summary.recentErrors.slice(0, 3).forEach(error => {
        console.log(`  ${error.method} ${error.endpoint}: ${error.status} (${error.duration.toFixed(2)}ms)`)
      })
    }
    
    console.groupEnd()
  }

  /**
   * Group metrics by endpoint
   */
  private groupByEndpoint(metrics: RequestMetrics[]): Record<string, EndpointStats> {
    const groups: Record<string, EndpointStats> = {}

    metrics.forEach(metric => {
      if (!groups[metric.endpoint]) {
        groups[metric.endpoint] = {
          endpoint: metric.endpoint,
          count: 0,
          avgDuration: 0,
          minDuration: Infinity,
          maxDuration: 0,
          errorRate: 0,
          lastRequest: 0,
          statusCodes: {}
        }
      }

      const stats = groups[metric.endpoint]
      stats.count++
      stats.minDuration = Math.min(stats.minDuration, metric.duration)
      stats.maxDuration = Math.max(stats.maxDuration, metric.duration)
      stats.lastRequest = Math.max(stats.lastRequest, metric.timestamp)
      
      // Track status codes
      stats.statusCodes[metric.status] = (stats.statusCodes[metric.status] || 0) + 1
    })

    // Calculate averages and error rates
    Object.values(groups).forEach(stats => {
      const endpointMetrics = metrics.filter(m => m.endpoint === stats.endpoint)
      stats.avgDuration = endpointMetrics.reduce((sum, m) => sum + m.duration, 0) / stats.count
      
      const errorCount = endpointMetrics.filter(m => m.status >= 400).length
      stats.errorRate = (errorCount / stats.count) * 100
    })

    return groups
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(
    avgResponseTime: number,
    errorRate: number,
    slowRequests: number,
    totalRequests: number
  ): number {
    let score = 100

    // Penalize slow average response time
    if (avgResponseTime > 1000) score -= 20
    else if (avgResponseTime > 500) score -= 10
    else if (avgResponseTime > 200) score -= 5

    // Penalize high error rate
    if (errorRate > 10) score -= 30
    else if (errorRate > 5) score -= 20
    else if (errorRate > 1) score -= 10

    // Penalize high percentage of slow requests
    const slowRequestRate = (slowRequests / totalRequests) * 100
    if (slowRequestRate > 20) score -= 20
    else if (slowRequestRate > 10) score -= 10
    else if (slowRequestRate > 5) score -= 5

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Create a performance monitor with default configuration
   */
  static create(config: Partial<MonitoringConfig> = {}): PerformanceMonitor {
    const defaultConfig: MonitoringConfig = {
      enabled: true,
      logRequests: process.env.NODE_ENV === 'development',
      logResponses: false,
      logErrors: true,
      performanceTracking: true,
      slowRequestThreshold: 1000
    }

    return new PerformanceMonitor({ ...defaultConfig, ...config })
  }
}

// Global performance monitor instance for convenience
export const globalPerformanceMonitor = PerformanceMonitor.create()

// Expose monitor to window for debugging in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__API_PERFORMANCE_MONITOR__ = globalPerformanceMonitor
}