/**
 * Mobile PWA Performance Monitoring and Alerting System
 * Comprehensive monitoring for mobile touch features, haptic feedback, and performance
 * Version: 1.0.0
 */

import { getDeploymentManager } from './mobile-pwa-deployment'

export interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  metadata?: any
}

export interface AlertConfig {
  metricName: string
  threshold: number
  operator: 'gt' | 'lt' | 'eq'
  severity: 'low' | 'medium' | 'high' | 'critical'
  cooldownMinutes: number
  enabled: boolean
}

export interface MonitoringConfig {
  enabled: boolean
  sampleRate: number
  bufferSize: number
  flushInterval: number
  alerts: AlertConfig[]
  endpoints: {
    metrics?: string
    alerts?: string
    health?: string
  }
}

const DEFAULT_MONITORING_CONFIG: MonitoringConfig = {
  enabled: true,
  sampleRate: 0.1, // 10% sampling in production
  bufferSize: 100,
  flushInterval: 30000, // 30 seconds
  alerts: [
    {
      metricName: 'touch_response_time',
      threshold: 50, // 50ms
      operator: 'gt',
      severity: 'high',
      cooldownMinutes: 5,
      enabled: true
    },
    {
      metricName: 'haptic_failure_rate',
      threshold: 0.05, // 5%
      operator: 'gt',
      severity: 'medium',
      cooldownMinutes: 10,
      enabled: true
    },
    {
      metricName: 'frame_rate',
      threshold: 45, // FPS
      operator: 'lt',
      severity: 'high',
      cooldownMinutes: 3,
      enabled: true
    },
    {
      metricName: 'memory_usage',
      threshold: 100, // MB
      operator: 'gt',
      severity: 'medium',
      cooldownMinutes: 15,
      enabled: true
    },
    {
      metricName: 'gesture_error_rate',
      threshold: 0.1, // 10%
      operator: 'gt',
      severity: 'high',
      cooldownMinutes: 5,
      enabled: true
    },
    {
      metricName: 'battery_drain_rate',
      threshold: 5, // % per hour
      operator: 'gt',
      severity: 'low',
      cooldownMinutes: 60,
      enabled: true
    }
  ],
  endpoints: {
    metrics: '/api/v2/analytics/mobile-pwa-metrics',
    alerts: '/api/v2/monitoring/mobile-pwa-alerts',
    health: '/api/v2/health/mobile-pwa'
  }
}

export class MobilePWAMonitoringSystem {
  private config: MonitoringConfig
  private metricsBuffer: PerformanceMetric[] = []
  private alertCooldowns: Map<string, number> = new Map()
  private flushTimer?: NodeJS.Timeout
  private frameRateMonitor?: any
  private memoryMonitor?: any
  private batteryMonitor?: any
  private isMonitoring = false

  constructor(config?: Partial<MonitoringConfig>) {
    this.config = { ...DEFAULT_MONITORING_CONFIG, ...config }
    this.initialize()
  }

  private async initialize() {
    if (!this.config.enabled) return

    // Start periodic flushing
    this.flushTimer = setInterval(() => {
      this.flushMetrics()
    }, this.config.flushInterval)

    // Initialize performance monitors
    this.initializePerformanceMonitoring()
    this.initializeErrorMonitoring()
    this.initializeBatteryMonitoring()

    this.isMonitoring = true
  }

  private initializePerformanceMonitoring() {
    if (typeof window === 'undefined') return

    // Frame rate monitoring
    this.frameRateMonitor = new FrameRateMonitor((fps) => {
      this.recordMetric('frame_rate', fps, {
        timestamp: Date.now(),
        context: 'animation_frame'
      })
    })

    // Memory monitoring
    if ('memory' in performance) {
      this.memoryMonitor = setInterval(() => {
        const memoryInfo = (performance as any).memory
        const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)
        
        this.recordMetric('memory_usage', usedMB, {
          total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)
        })
      }, 10000) // Every 10 seconds
    }

    // Touch performance monitoring
    this.initializeTouchPerformanceMonitoring()
  }

  private initializeTouchPerformanceMonitoring() {
    if (typeof window === 'undefined') return

    // Monitor touch response times
    let touchStartTime = 0
    
    document.addEventListener('touchstart', (event) => {
      touchStartTime = performance.now()
    }, { passive: true })

    document.addEventListener('touchend', (event) => {
      if (touchStartTime > 0) {
        const responseTime = performance.now() - touchStartTime
        this.recordMetric('touch_response_time', responseTime, {
          targetElement: event.target?.tagName || 'unknown',
          touchPoints: event.changedTouches.length
        })
        touchStartTime = 0
      }
    }, { passive: true })
  }

  private initializeErrorMonitoring() {
    if (typeof window === 'undefined') return

    // Monitor JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordMetric('javascript_error', 1, {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno,
        stack: event.error?.stack
      })
    })

    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordMetric('promise_rejection', 1, {
        reason: event.reason?.toString() || 'unknown'
      })
    })
  }

  private initializeBatteryMonitoring() {
    if (typeof navigator === 'undefined' || !('getBattery' in navigator)) return

    // Monitor battery usage (Chrome only)
    ;(navigator as any).getBattery?.().then((battery: any) => {
      let lastLevel = battery.level
      let lastTime = Date.now()

      const checkBatteryDrain = () => {
        const currentLevel = battery.level
        const currentTime = Date.now()
        const timeDiff = currentTime - lastTime
        const levelDiff = lastLevel - currentLevel

        if (timeDiff > 60000 && levelDiff > 0) { // Check every minute
          const drainRate = (levelDiff / (timeDiff / 3600000)) * 100 // % per hour
          
          this.recordMetric('battery_drain_rate', drainRate, {
            level: currentLevel,
            charging: battery.charging
          })

          lastLevel = currentLevel
          lastTime = currentTime
        }
      }

      setInterval(checkBatteryDrain, 60000) // Check every minute
    }).catch(() => {
      // Battery API not available, skip monitoring
    })
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, metadata?: any): void {
    if (!this.config.enabled || !this.shouldSample()) return

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    }

    this.metricsBuffer.push(metric)
    this.checkAlerts(metric)

    // Flush if buffer is full
    if (this.metricsBuffer.length >= this.config.bufferSize) {
      this.flushMetrics()
    }
  }

  /**
   * Record touch gesture performance
   */
  recordGestureMetric(gestureType: string, success: boolean, responseTime?: number): void {
    this.recordMetric('gesture_interaction', success ? 1 : 0, {
      gestureType,
      responseTime,
      success
    })

    if (!success) {
      this.recordMetric('gesture_error_rate', 1, { gestureType })
    }
  }

  /**
   * Record haptic feedback performance
   */
  recordHapticMetric(pattern: string, success: boolean, duration?: number): void {
    this.recordMetric('haptic_feedback', success ? 1 : 0, {
      pattern,
      duration,
      success
    })

    if (!success) {
      this.recordMetric('haptic_failure_rate', 1, { pattern })
    }
  }

  /**
   * Record calendar performance metrics
   */
  recordCalendarMetric(action: string, duration: number, itemCount?: number): void {
    this.recordMetric('calendar_performance', duration, {
      action,
      itemCount,
      timestamp: Date.now()
    })
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetric[] {
    return [...this.metricsBuffer]
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical'
    metrics: { [key: string]: number }
    alerts: string[]
    lastUpdate: number
  } {
    const metrics: { [key: string]: number } = {}
    const alerts: string[] = []

    // Calculate recent metric averages
    const recentMetrics = this.metricsBuffer.filter(
      m => Date.now() - m.timestamp < 300000 // Last 5 minutes
    )

    // Group by metric name and calculate averages
    const metricGroups = recentMetrics.reduce((groups, metric) => {
      if (!groups[metric.name]) groups[metric.name] = []
      groups[metric.name].push(metric.value)
      return groups
    }, {} as { [key: string]: number[] })

    Object.entries(metricGroups).forEach(([name, values]) => {
      metrics[name] = values.reduce((sum, val) => sum + val, 0) / values.length
    })

    // Check for active alerts
    this.config.alerts.forEach(alert => {
      if (!alert.enabled || !metrics[alert.metricName]) return

      const value = metrics[alert.metricName]
      const threshold = alert.threshold
      let triggered = false

      switch (alert.operator) {
        case 'gt':
          triggered = value > threshold
          break
        case 'lt':
          triggered = value < threshold
          break
        case 'eq':
          triggered = Math.abs(value - threshold) < 0.01
          break
      }

      if (triggered) {
        alerts.push(`${alert.metricName}: ${value.toFixed(2)} ${alert.operator} ${threshold}`)
      }
    })

    // Determine overall status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy'
    const criticalAlerts = this.config.alerts.filter(a => a.severity === 'critical' && alerts.some(alert => alert.includes(a.metricName)))
    const highAlerts = this.config.alerts.filter(a => a.severity === 'high' && alerts.some(alert => alert.includes(a.metricName)))

    if (criticalAlerts.length > 0) {
      status = 'critical'
    } else if (highAlerts.length > 0 || alerts.length > 3) {
      status = 'warning'
    }

    return {
      status,
      metrics,
      alerts,
      lastUpdate: Date.now()
    }
  }

  private shouldSample(): boolean {
    return Math.random() <= this.config.sampleRate
  }

  private checkAlerts(metric: PerformanceMetric): void {
    const relevantAlerts = this.config.alerts.filter(
      alert => alert.enabled && alert.metricName === metric.name
    )

    relevantAlerts.forEach(alert => {
      const cooldownKey = `${alert.metricName}_${alert.operator}_${alert.threshold}`
      const lastTriggered = this.alertCooldowns.get(cooldownKey) || 0
      const cooldownMs = alert.cooldownMinutes * 60 * 1000

      if (Date.now() - lastTriggered < cooldownMs) return

      let triggered = false
      switch (alert.operator) {
        case 'gt':
          triggered = metric.value > alert.threshold
          break
        case 'lt':
          triggered = metric.value < alert.threshold
          break
        case 'eq':
          triggered = Math.abs(metric.value - alert.threshold) < 0.01
          break
      }

      if (triggered) {
        this.triggerAlert(alert, metric)
        this.alertCooldowns.set(cooldownKey, Date.now())
      }
    })
  }

  private triggerAlert(alert: AlertConfig, metric: PerformanceMetric): void {
    const alertData = {
      alert: alert.metricName,
      severity: alert.severity,
      value: metric.value,
      threshold: alert.threshold,
      operator: alert.operator,
      timestamp: metric.timestamp,
      metadata: metric.metadata
    }

    // Log alert
    console.warn(`[Mobile PWA Alert] ${alert.severity.toUpperCase()}: ${alert.metricName} = ${metric.value} (threshold: ${alert.threshold})`, alertData)

    // Send alert to monitoring service
    this.sendAlert(alertData)

    // Browser notification for critical alerts (if permitted)
    if (alert.severity === 'critical' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`Mobile PWA Critical Alert`, {
        body: `${alert.metricName}: ${metric.value} exceeds threshold ${alert.threshold}`,
        icon: '/favicon.ico'
      })
    }
  }

  private async sendAlert(alertData: any): Promise<void> {
    if (!this.config.endpoints.alerts) return

    try {
      await fetch(this.config.endpoints.alerts, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData)
      })
    } catch (error) {
      console.error('Failed to send alert:', error)
    }
  }

  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0 || !this.config.endpoints.metrics) return

    const metricsToSend = [...this.metricsBuffer]
    this.metricsBuffer = []

    try {
      const deploymentManager = getDeploymentManager()
      const config = deploymentManager.getConfig()

      await fetch(this.config.endpoints.metrics, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics: metricsToSend,
          environment: config.environment,
          timestamp: Date.now(),
          userAgent: navigator.userAgent
        })
      })
    } catch (error) {
      console.error('Failed to send metrics:', error)
      // Add metrics back to buffer for retry (with limit)
      if (this.metricsBuffer.length < this.config.bufferSize) {
        this.metricsBuffer.unshift(...metricsToSend.slice(0, this.config.bufferSize - this.metricsBuffer.length))
      }
    }
  }

  /**
   * Update monitoring configuration
   */
  updateConfig(updates: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * Enable/disable specific alerts
   */
  toggleAlert(metricName: string, enabled: boolean): void {
    const alert = this.config.alerts.find(a => a.metricName === metricName)
    if (alert) {
      alert.enabled = enabled
    }
  }

  /**
   * Clean up monitoring system
   */
  destroy(): void {
    this.isMonitoring = false
    
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor)
    }
    
    if (this.batteryMonitor) {
      clearInterval(this.batteryMonitor)
    }
    
    if (this.frameRateMonitor) {
      this.frameRateMonitor.destroy()
    }

    // Flush remaining metrics
    this.flushMetrics()
  }
}

/**
 * Frame Rate Monitor for smooth animation tracking
 */
class FrameRateMonitor {
  private callback: (fps: number) => void
  private frameCount = 0
  private lastTime = 0
  private animationId?: number
  private isRunning = false

  constructor(callback: (fps: number) => void) {
    this.callback = callback
    this.start()
  }

  private start(): void {
    this.isRunning = true
    this.lastTime = performance.now()
    this.frameCount = 0
    this.tick()
  }

  private tick = (): void => {
    if (!this.isRunning) return

    const currentTime = performance.now()
    this.frameCount++

    // Calculate FPS every second
    if (currentTime - this.lastTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime))
      this.callback(fps)
      
      this.frameCount = 0
      this.lastTime = currentTime
    }

    this.animationId = requestAnimationFrame(this.tick)
  }

  destroy(): void {
    this.isRunning = false
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }
  }
}

/**
 * Global monitoring instance
 */
let globalMonitoringSystem: MobilePWAMonitoringSystem | null = null

/**
 * Get or create monitoring system
 */
export function getMonitoringSystem(config?: Partial<MonitoringConfig>): MobilePWAMonitoringSystem {
  if (!globalMonitoringSystem) {
    globalMonitoringSystem = new MobilePWAMonitoringSystem(config)
  }
  return globalMonitoringSystem
}

/**
 * React hook for monitoring integration
 */
export function usePerformanceMonitoring(): {
  recordMetric: (name: string, value: number, metadata?: any) => void
  recordGestureMetric: (gestureType: string, success: boolean, responseTime?: number) => void
  recordHapticMetric: (pattern: string, success: boolean, duration?: number) => void
  getHealthStatus: () => ReturnType<MobilePWAMonitoringSystem['getHealthStatus']>
} {
  const monitoring = getMonitoringSystem()

  return {
    recordMetric: monitoring.recordMetric.bind(monitoring),
    recordGestureMetric: monitoring.recordGestureMetric.bind(monitoring),
    recordHapticMetric: monitoring.recordHapticMetric.bind(monitoring),
    getHealthStatus: monitoring.getHealthStatus.bind(monitoring)
  }
}

/**
 * Convenience functions for common metrics
 */
export function trackTouchPerformance(element: string, responseTime: number): void {
  const monitoring = getMonitoringSystem()
  monitoring.recordMetric('touch_response_time', responseTime, { element })
}

export function trackGestureSuccess(gestureType: string, success: boolean): void {
  const monitoring = getMonitoringSystem()
  monitoring.recordGestureMetric(gestureType, success)
}

export function trackHapticFeedback(pattern: string, success: boolean): void {
  const monitoring = getMonitoringSystem()
  monitoring.recordHapticMetric(pattern, success)
}

export function trackCalendarPerformance(action: string, duration: number): void {
  const monitoring = getMonitoringSystem()
  monitoring.recordCalendarMetric(action, duration)
}

export default MobilePWAMonitoringSystem