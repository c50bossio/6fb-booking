/**
 * Calendar Performance Monitoring System
 * Comprehensive analytics and performance tracking for calendar operations
 * Version: 1.0.0
 */

export interface CalendarPerformanceMetrics {
  loadTime: number
  renderTime: number
  conflictResolutionTime: number
  apiResponseTime: number
  cacheHitRate: number
  userInteractionLatency: number
  dataFreshness: number
  errorRate: number
  memoryUsage: number
  networkLatency: number
}

export interface CalendarEvent {
  type: 'view_change' | 'appointment_load' | 'conflict_detected' | 'booking_completed' | 'error'
  timestamp: number
  duration?: number
  metadata: Record<string, any>
  userId?: string
  sessionId: string
}

export interface PerformanceAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  metric: keyof CalendarPerformanceMetrics
  threshold: number
  currentValue: number
  message: string
  timestamp: number
  resolved: boolean
}

export interface CalendarAnalytics {
  dailyAppointments: number[]
  weeklyTrends: Record<string, number>
  conflictPatterns: Record<string, number>
  peakUsageHours: number[]
  userBehaviorPatterns: Record<string, any>
  systemHealthScore: number
}

class CalendarPerformanceMonitor {
  private metrics: CalendarPerformanceMetrics
  private events: CalendarEvent[]
  private alerts: PerformanceAlert[]
  private thresholds: Record<keyof CalendarPerformanceMetrics, number>
  private isMonitoring: boolean
  private sessionId: string
  private startTime: number
  private listeners: Record<string, Function[]>

  constructor() {
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      conflictResolutionTime: 0,
      apiResponseTime: 0,
      cacheHitRate: 100,
      userInteractionLatency: 0,
      dataFreshness: 100,
      errorRate: 0,
      memoryUsage: 0,
      networkLatency: 0
    }

    this.events = []
    this.alerts = []
    this.listeners = {}
    this.isMonitoring = false
    this.sessionId = this.generateSessionId()
    this.startTime = Date.now()

    // Performance thresholds
    this.thresholds = {
      loadTime: 3000,          // 3 seconds
      renderTime: 500,         // 500ms
      conflictResolutionTime: 2000, // 2 seconds
      apiResponseTime: 1000,   // 1 second
      cacheHitRate: 85,        // 85%
      userInteractionLatency: 100, // 100ms
      dataFreshness: 90,       // 90%
      errorRate: 5,            // 5%
      memoryUsage: 100,        // 100MB
      networkLatency: 200      // 200ms
    }

    this.initializeMonitoring()
  }

  private generateSessionId(): string {
    return `cal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return

    // Performance observer for calendar-specific operations
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach(entry => {
          if (entry.name.includes('calendar') || entry.name.includes('appointment')) {
            this.recordPerformanceEntry(entry)
          }
        })
      })

      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] })
    }

    // Memory usage monitoring
    if ('memory' in performance) {
      this.startMemoryMonitoring()
    }

    // Network latency monitoring
    this.startNetworkMonitoring()
  }

  private recordPerformanceEntry(entry: PerformanceEntry): void {
    const duration = entry.duration || 0

    if (entry.name.includes('calendar-load')) {
      this.updateMetric('loadTime', duration)
    } else if (entry.name.includes('calendar-render')) {
      this.updateMetric('renderTime', duration)
    } else if (entry.name.includes('api-response')) {
      this.updateMetric('apiResponseTime', duration)
    }

    this.recordEvent({
      type: 'view_change',
      timestamp: Date.now(),
      duration,
      metadata: {
        entryName: entry.name,
        entryType: entry.entryType,
        performance: duration
      },
      sessionId: this.sessionId
    })
  }

  private startMemoryMonitoring(): void {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedJSHeapSize = memory.usedJSHeapSize / (1024 * 1024) // Convert to MB
        this.updateMetric('memoryUsage', usedJSHeapSize)
      }
    }

    setInterval(checkMemory, 10000) // Check every 10 seconds
  }

  private startNetworkMonitoring(): void {
    const measureNetworkLatency = async () => {
      const start = performance.now()
      try {
        const response = await fetch('/api/v2/health', { 
          method: 'HEAD',
          cache: 'no-cache'
        })
        const latency = performance.now() - start
        this.updateMetric('networkLatency', latency)
        
        if (!response.ok) {
          this.incrementErrorRate()
        }
      } catch (error) {
        this.incrementErrorRate()
        const latency = performance.now() - start
        this.updateMetric('networkLatency', latency)
      }
    }

    // Check network latency every 30 seconds
    setInterval(measureNetworkLatency, 30000)
  }

  // Public methods
  public startMonitoring(): void {
    this.isMonitoring = true
    this.startTime = Date.now()
    
    this.recordEvent({
      type: 'view_change',
      timestamp: Date.now(),
      metadata: { action: 'monitoring_started' },
      sessionId: this.sessionId
    })
  }

  public stopMonitoring(): void {
    this.isMonitoring = false
    
    this.recordEvent({
      type: 'view_change',
      timestamp: Date.now(),
      duration: Date.now() - this.startTime,
      metadata: { action: 'monitoring_stopped' },
      sessionId: this.sessionId
    })
  }

  public measureCalendarLoad(): () => void {
    const startTime = performance.now()
    performance.mark('calendar-load-start')

    return () => {
      performance.mark('calendar-load-end')
      performance.measure('calendar-load', 'calendar-load-start', 'calendar-load-end')
      
      const loadTime = performance.now() - startTime
      this.updateMetric('loadTime', loadTime)

      this.recordEvent({
        type: 'appointment_load',
        timestamp: Date.now(),
        duration: loadTime,
        metadata: { operation: 'calendar_load' },
        sessionId: this.sessionId
      })
    }
  }

  public measureRenderTime(): () => void {
    const startTime = performance.now()
    performance.mark('calendar-render-start')

    return () => {
      performance.mark('calendar-render-end')
      performance.measure('calendar-render', 'calendar-render-start', 'calendar-render-end')
      
      const renderTime = performance.now() - startTime
      this.updateMetric('renderTime', renderTime)
    }
  }

  public measureApiCall(endpoint: string): () => void {
    const startTime = performance.now()
    const markName = `api-${endpoint}-start`
    performance.mark(markName)

    return () => {
      const endMarkName = `api-${endpoint}-end`
      performance.mark(endMarkName)
      performance.measure(`api-response-${endpoint}`, markName, endMarkName)
      
      const apiTime = performance.now() - startTime
      this.updateMetric('apiResponseTime', apiTime)
    }
  }

  public recordConflictResolution(duration: number): void {
    this.updateMetric('conflictResolutionTime', duration)
    
    this.recordEvent({
      type: 'conflict_detected',
      timestamp: Date.now(),
      duration,
      metadata: { resolved: true },
      sessionId: this.sessionId
    })
  }

  public recordUserInteraction(interaction: string, latency: number): void {
    this.updateMetric('userInteractionLatency', latency)
    
    this.recordEvent({
      type: 'view_change',
      timestamp: Date.now(),
      duration: latency,
      metadata: { 
        interaction,
        userAction: true
      },
      sessionId: this.sessionId
    })
  }

  public recordError(error: Error, context?: Record<string, any>): void {
    this.incrementErrorRate()
    
    this.recordEvent({
      type: 'error',
      timestamp: Date.now(),
      metadata: {
        error: error.message,
        stack: error.stack,
        context
      },
      sessionId: this.sessionId
    })
  }

  public updateCacheMetrics(hits: number, misses: number): void {
    const total = hits + misses
    const hitRate = total > 0 ? (hits / total) * 100 : 100
    this.updateMetric('cacheHitRate', hitRate)
  }

  public updateDataFreshness(freshness: number): void {
    this.updateMetric('dataFreshness', freshness)
  }

  private updateMetric(metric: keyof CalendarPerformanceMetrics, value: number): void {
    // Exponential moving average for smoothing
    const alpha = 0.3
    this.metrics[metric] = alpha * value + (1 - alpha) * this.metrics[metric]

    // Check thresholds and create alerts
    this.checkThreshold(metric, this.metrics[metric])
  }

  private incrementErrorRate(): void {
    const currentRate = this.metrics.errorRate
    this.metrics.errorRate = Math.min(100, currentRate + 1)
    
    this.checkThreshold('errorRate', this.metrics.errorRate)
  }

  private checkThreshold(metric: keyof CalendarPerformanceMetrics, value: number): void {
    const threshold = this.thresholds[metric]
    const isViolation = (metric === 'cacheHitRate' || metric === 'dataFreshness') ? 
      value < threshold : value > threshold

    if (isViolation) {
      this.createAlert(metric, threshold, value)
    }
  }

  private createAlert(metric: keyof CalendarPerformanceMetrics, threshold: number, currentValue: number): void {
    const alertId = `${metric}_${Date.now()}`
    
    const alert: PerformanceAlert = {
      id: alertId,
      type: currentValue > threshold * 1.5 ? 'error' : 'warning',
      metric,
      threshold,
      currentValue,
      message: this.getAlertMessage(metric, currentValue, threshold),
      timestamp: Date.now(),
      resolved: false
    }

    this.alerts.push(alert)
    
    // Emit alert event
    this.emit('alert', alert)
  }

  private getAlertMessage(metric: keyof CalendarPerformanceMetrics, value: number, threshold: number): string {
    const metricNames: Record<keyof CalendarPerformanceMetrics, string> = {
      loadTime: 'Calendar load time',
      renderTime: 'Render time',
      conflictResolutionTime: 'Conflict resolution time',
      apiResponseTime: 'API response time',
      cacheHitRate: 'Cache hit rate',
      userInteractionLatency: 'User interaction latency',
      dataFreshness: 'Data freshness',
      errorRate: 'Error rate',
      memoryUsage: 'Memory usage',
      networkLatency: 'Network latency'
    }

    const name = metricNames[metric]
    const unit = this.getMetricUnit(metric)
    
    return `${name} is ${value.toFixed(1)}${unit}, exceeding threshold of ${threshold}${unit}`
  }

  private getMetricUnit(metric: keyof CalendarPerformanceMetrics): string {
    const units: Record<keyof CalendarPerformanceMetrics, string> = {
      loadTime: 'ms',
      renderTime: 'ms',
      conflictResolutionTime: 'ms',
      apiResponseTime: 'ms',
      cacheHitRate: '%',
      userInteractionLatency: 'ms',
      dataFreshness: '%',
      errorRate: '%',
      memoryUsage: 'MB',
      networkLatency: 'ms'
    }

    return units[metric] || ''
  }

  private recordEvent(event: CalendarEvent): void {
    this.events.push(event)
    
    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events = this.events.slice(-1000)
    }

    // Emit event
    this.emit('event', event)
  }

  // Event system
  public on(event: string, callback: Function): void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }

  public off(event: string, callback: Function): void {
    if (!this.listeners[event]) return
    
    const index = this.listeners[event].indexOf(callback)
    if (index > -1) {
      this.listeners[event].splice(index, 1)
    }
  }

  private emit(event: string, data: any): void {
    if (!this.listeners[event]) return
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error in event listener:', error)
      }
    })
  }

  // Analytics and reporting
  public getMetrics(): CalendarPerformanceMetrics {
    return { ...this.metrics }
  }

  public getEvents(limit?: number): CalendarEvent[] {
    return limit ? this.events.slice(-limit) : [...this.events]
  }

  public getAlerts(unresolved?: boolean): PerformanceAlert[] {
    if (unresolved) {
      return this.alerts.filter(alert => !alert.resolved)
    }
    return [...this.alerts]
  }

  public getAnalytics(): CalendarAnalytics {
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000
    
    // Calculate daily appointments for last 7 days
    const dailyAppointments = Array.from({ length: 7 }, (_, i) => {
      const dayStart = now - (i * dayMs)
      const dayEnd = dayStart + dayMs
      
      return this.events.filter(event => 
        event.type === 'booking_completed' &&
        event.timestamp >= dayStart &&
        event.timestamp < dayEnd
      ).length
    }).reverse()

    // Calculate weekly trends
    const weeklyTrends = {
      averageLoadTime: this.metrics.loadTime,
      conflictReductions: this.events.filter(e => 
        e.type === 'conflict_detected' && 
        e.metadata.resolved
      ).length,
      userSatisfaction: Math.max(0, 100 - this.metrics.errorRate)
    }

    // Analyze conflict patterns
    const conflictPatterns = this.events
      .filter(e => e.type === 'conflict_detected')
      .reduce((patterns, event) => {
        const hour = new Date(event.timestamp).getHours()
        patterns[`hour_${hour}`] = (patterns[`hour_${hour}`] || 0) + 1
        return patterns
      }, {} as Record<string, number>)

    // Calculate peak usage hours
    const hourlyActivity = this.events.reduce((hours, event) => {
      const hour = new Date(event.timestamp).getHours()
      hours[hour] = (hours[hour] || 0) + 1
      return hours
    }, {} as Record<number, number>)

    const peakUsageHours = Object.entries(hourlyActivity)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour))

    // Calculate system health score
    const healthFactors = {
      performance: Math.max(0, 100 - (this.metrics.loadTime / 50)), // Lower is better
      reliability: Math.max(0, 100 - this.metrics.errorRate),
      efficiency: this.metrics.cacheHitRate,
      responsiveness: Math.max(0, 100 - (this.metrics.apiResponseTime / 20))
    }

    const systemHealthScore = Object.values(healthFactors).reduce((sum, score) => sum + score, 0) / 4

    return {
      dailyAppointments,
      weeklyTrends,
      conflictPatterns,
      peakUsageHours,
      userBehaviorPatterns: {
        sessionDuration: Date.now() - this.startTime,
        eventsPerSession: this.events.length,
        errorRate: this.metrics.errorRate
      },
      systemHealthScore
    }
  }

  public exportMetrics(): string {
    const data = {
      sessionId: this.sessionId,
      startTime: this.startTime,
      endTime: Date.now(),
      metrics: this.metrics,
      events: this.events,
      alerts: this.alerts,
      analytics: this.getAnalytics()
    }

    return JSON.stringify(data, null, 2)
  }

  public resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
      this.emit('alertResolved', alert)
    }
  }

  public clearAlerts(): void {
    this.alerts = []
  }

  public reset(): void {
    this.metrics = {
      loadTime: 0,
      renderTime: 0,
      conflictResolutionTime: 0,
      apiResponseTime: 0,
      cacheHitRate: 100,
      userInteractionLatency: 0,
      dataFreshness: 100,
      errorRate: 0,
      memoryUsage: 0,
      networkLatency: 0
    }
    
    this.events = []
    this.alerts = []
    this.sessionId = this.generateSessionId()
    this.startTime = Date.now()
  }
}

// Global instance
let calendarMonitor: CalendarPerformanceMonitor | null = null

export function getCalendarMonitor(): CalendarPerformanceMonitor {
  if (!calendarMonitor) {
    calendarMonitor = new CalendarPerformanceMonitor()
  }
  return calendarMonitor
}

export { CalendarPerformanceMonitor }
export default getCalendarMonitor