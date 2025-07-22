/**
 * Calendar Memory Optimizer
 * Advanced memory management for large calendars with thousands of appointments
 * Implements virtualization, intelligent caching, and memory leak prevention
 */

import { browserCompatibility } from './browser-compatibility'

export interface CalendarMemoryConfig {
  maxAppointmentsInMemory: number
  virtualRowHeight: number
  cacheSize: number
  enableVirtualization: boolean
  enableLazyLoading: boolean
  memoryThreshold: number // MB
  cleanupInterval: number // ms
}

export interface AppointmentData {
  id: string
  start: Date
  end: Date
  title: string
  data: any
  rendered: boolean
  lastAccessed: number
  size: number // estimated memory size in bytes
}

export interface MemoryMetrics {
  totalAppointments: number
  renderedAppointments: number
  memoryUsage: number // MB
  cacheHitRatio: number
  virtualizedRows: number
  memoryPressure: 'low' | 'medium' | 'high'
}

export interface ViewportInfo {
  startIndex: number
  endIndex: number
  totalItems: number
  visibleHeight: number
  scrollTop: number
}

/**
 * Advanced memory management for calendar systems
 */
class CalendarMemoryOptimizer {
  private config: CalendarMemoryConfig
  private appointments = new Map<string, AppointmentData>()
  private cache = new Map<string, any>()
  private renderQueue: string[] = []
  private virtualizedItems = new Map<number, string>()
  private cleanupInterval: NodeJS.Timeout
  private memoryObserver: PerformanceObserver | null = null
  private lastGC = Date.now()

  // Memory size estimates for different appointment types
  private appointmentSizeEstimates = {
    simple: 1024,      // 1KB - basic appointment
    standard: 2048,    // 2KB - appointment with client info
    detailed: 4096,    // 4KB - appointment with full details, notes
    recurring: 6144,   // 6KB - recurring appointment with instances
    blocked: 512       // 0.5KB - time block/unavailable slot
  }

  // Virtualization settings based on device performance
  private virtualizationSettings = {
    highEnd: {
      itemsPerPage: 100,
      preloadPages: 3,
      maxCacheSize: 1000
    },
    standard: {
      itemsPerPage: 50,
      preloadPages: 2,
      maxCacheSize: 500
    },
    lowEnd: {
      itemsPerPage: 25,
      preloadPages: 1,
      maxCacheSize: 200
    }
  }

  constructor(config: Partial<CalendarMemoryConfig> = {}) {
    this.config = {
      maxAppointmentsInMemory: 500,
      virtualRowHeight: 60,
      cacheSize: 100,
      enableVirtualization: true,
      enableLazyLoading: true,
      memoryThreshold: 100, // 100MB
      cleanupInterval: 30000, // 30 seconds
      ...config
    }

    this.initializeMemoryOptimization()
    this.startMemoryMonitoring()

    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.performMemoryCleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * Initialize memory optimization based on device capabilities
   */
  private initializeMemoryOptimization(): void {
    const deviceType = this.detectDeviceMemoryTier()
    const settings = this.virtualizationSettings[deviceType]

    // Adjust configuration based on device
    this.config.maxAppointmentsInMemory = settings.maxCacheSize
    this.config.cacheSize = Math.floor(settings.maxCacheSize * 0.2)

    // Enable aggressive optimization for low-end devices
    if (deviceType === 'lowEnd') {
      this.config.enableVirtualization = true
      this.config.enableLazyLoading = true
      this.config.memoryThreshold = 50 // Lower threshold
    }

    console.log('CalendarMemoryOptimizer: Initialized', {
      deviceType,
      maxAppointmentsInMemory: this.config.maxAppointmentsInMemory,
      enableVirtualization: this.config.enableVirtualization,
      memoryThreshold: this.config.memoryThreshold
    })
  }

  /**
   * Detect device memory tier
   */
  private detectDeviceMemoryTier(): 'highEnd' | 'standard' | 'lowEnd' {
    const navigator = window.navigator as any
    const deviceMemory = navigator.deviceMemory || 4
    
    if (deviceMemory >= 8) return 'highEnd'
    if (deviceMemory <= 2) return 'lowEnd'
    return 'standard'
  }

  /**
   * Add appointments with memory management
   */
  addAppointments(appointments: any[]): void {
    const startTime = performance.now()
    let addedCount = 0
    let skippedCount = 0

    appointments.forEach(apt => {
      const appointmentData: AppointmentData = {
        id: apt.id,
        start: new Date(apt.start),
        end: new Date(apt.end),
        title: apt.title || '',
        data: apt,
        rendered: false,
        lastAccessed: Date.now(),
        size: this.estimateAppointmentSize(apt)
      }

      // Check memory constraints
      if (this.appointments.size >= this.config.maxAppointmentsInMemory) {
        // Remove least recently used appointment
        const lruId = this.findLeastRecentlyUsed()
        if (lruId) {
          this.appointments.delete(lruId)
        } else {
          skippedCount++
          return
        }
      }

      this.appointments.set(apt.id, appointmentData)
      addedCount++
    })

    const processingTime = performance.now() - startTime
    console.log('CalendarMemoryOptimizer: Added appointments', {
      added: addedCount,
      skipped: skippedCount,
      total: this.appointments.size,
      processingTime: Math.round(processingTime)
    })
  }

  /**
   * Get virtualized appointments for viewport
   */
  getVirtualizedAppointments(viewport: ViewportInfo): AppointmentData[] {
    if (!this.config.enableVirtualization) {
      return Array.from(this.appointments.values())
    }

    const visibleAppointments: AppointmentData[] = []
    const itemHeight = this.config.virtualRowHeight
    const startIndex = Math.floor(viewport.scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(viewport.visibleHeight / itemHeight) + 2, // Buffer of 2
      viewport.totalItems
    )

    // Get appointments in visible range
    for (let i = startIndex; i < endIndex; i++) {
      const appointmentId = this.virtualizedItems.get(i)
      if (appointmentId) {
        const appointment = this.appointments.get(appointmentId)
        if (appointment) {
          appointment.lastAccessed = Date.now()
          appointment.rendered = true
          visibleAppointments.push(appointment)
        }
      }
    }

    // Sort by start time
    visibleAppointments.sort((a, b) => a.start.getTime() - b.start.getTime())

    return visibleAppointments
  }

  /**
   * Update virtualized items mapping
   */
  updateVirtualizedItems(sortedAppointmentIds: string[]): void {
    this.virtualizedItems.clear()
    sortedAppointmentIds.forEach((id, index) => {
      this.virtualizedItems.set(index, id)
    })
  }

  /**
   * Estimate appointment memory size
   */
  private estimateAppointmentSize(appointment: any): number {
    // Determine appointment complexity
    let type = 'simple'
    
    if (appointment.recurring) {
      type = 'recurring'
    } else if (appointment.client && appointment.notes) {
      type = 'detailed'
    } else if (appointment.client) {
      type = 'standard'
    } else if (appointment.blocked) {
      type = 'blocked'
    }

    return this.appointmentSizeEstimates[type]
  }

  /**
   * Find least recently used appointment
   */
  private findLeastRecentlyUsed(): string | null {
    let lruId: string | null = null
    let oldestAccess = Date.now()

    for (const [id, appointment] of this.appointments) {
      if (appointment.lastAccessed < oldestAccess && !appointment.rendered) {
        oldestAccess = appointment.lastAccessed
        lruId = id
      }
    }

    return lruId
  }

  /**
   * Cache appointment render data
   */
  cacheAppointmentRender(appointmentId: string, renderData: any): void {
    // Check cache size limit
    if (this.cache.size >= this.config.cacheSize) {
      // Remove oldest cache entry
      const firstKey = this.cache.keys().next().value
      if (firstKey) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(appointmentId, {
      data: renderData,
      timestamp: Date.now(),
      size: this.estimateRenderDataSize(renderData)
    })
  }

  /**
   * Get cached render data
   */
  getCachedRenderData(appointmentId: string): any | null {
    const cached = this.cache.get(appointmentId)
    if (cached) {
      // Update access time
      cached.timestamp = Date.now()
      return cached.data
    }
    return null
  }

  /**
   * Estimate render data size
   */
  private estimateRenderDataSize(renderData: any): number {
    // Rough estimate based on data complexity
    try {
      const jsonString = JSON.stringify(renderData)
      return jsonString.length * 2 // Rough estimate including object overhead
    } catch {
      return 1024 // Default 1KB
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    // Use Performance Observer if available
    if ('PerformanceObserver' in window && (window as any).performance?.measureUserAgentSpecificMemory) {
      try {
        this.memoryObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          entries.forEach(entry => {
            if (entry.entryType === 'memory') {
              this.handleMemoryPressure(entry as any)
            }
          })
        })
        
        this.memoryObserver.observe({ entryTypes: ['memory'] })
      } catch (error) {
        console.warn('CalendarMemoryOptimizer: Memory monitoring not available')
      }
    }

    // Fallback: periodic memory estimation
    setInterval(() => {
      this.estimateMemoryUsage()
    }, 10000) // Every 10 seconds
  }

  /**
   * Handle memory pressure
   */
  private handleMemoryPressure(memoryEntry: any): void {
    const usedMemory = memoryEntry.usedJSHeapSize / (1024 * 1024) // Convert to MB
    
    if (usedMemory > this.config.memoryThreshold) {
      console.warn('CalendarMemoryOptimizer: High memory usage detected', usedMemory, 'MB')
      this.performEmergencyCleanup()
    }
  }

  /**
   * Estimate current memory usage
   */
  private estimateMemoryUsage(): number {
    const appointmentMemory = Array.from(this.appointments.values())
      .reduce((sum, apt) => sum + apt.size, 0)
    
    const cacheMemory = Array.from(this.cache.values())
      .reduce((sum, cached) => sum + (cached.size || 1024), 0)
    
    const totalBytes = appointmentMemory + cacheMemory
    const totalMB = totalBytes / (1024 * 1024)
    
    return totalMB
  }

  /**
   * Perform regular memory cleanup
   */
  private performMemoryCleanup(): void {
    const now = Date.now()
    const cleanupThreshold = 60000 // 1 minute

    // Clean up old appointments
    let removedAppointments = 0
    for (const [id, appointment] of this.appointments) {
      if (!appointment.rendered && now - appointment.lastAccessed > cleanupThreshold) {
        this.appointments.delete(id)
        removedAppointments++
      }
    }

    // Clean up old cache entries
    let removedCache = 0
    for (const [id, cached] of this.cache) {
      if (now - cached.timestamp > cleanupThreshold) {
        this.cache.delete(id)
        removedCache++
      }
    }

    // Force garbage collection if available and needed
    if (removedAppointments > 50 || removedCache > 20) {
      this.requestGarbageCollection()
    }

    if (removedAppointments > 0 || removedCache > 0) {
      console.log('CalendarMemoryOptimizer: Cleanup completed', {
        removedAppointments,
        removedCache,
        currentAppointments: this.appointments.size,
        currentCache: this.cache.size
      })
    }
  }

  /**
   * Perform emergency memory cleanup
   */
  private performEmergencyCleanup(): void {
    // Remove non-rendered appointments
    const nonRendered = Array.from(this.appointments.entries())
      .filter(([, apt]) => !apt.rendered)
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed)

    // Remove 50% of non-rendered appointments
    const toRemove = Math.floor(nonRendered.length * 0.5)
    for (let i = 0; i < toRemove; i++) {
      this.appointments.delete(nonRendered[i][0])
    }

    // Clear 75% of cache
    const cacheEntries = Array.from(this.cache.keys())
    const cacheToRemove = Math.floor(cacheEntries.length * 0.75)
    for (let i = 0; i < cacheToRemove; i++) {
      this.cache.delete(cacheEntries[i])
    }

    // Force garbage collection
    this.requestGarbageCollection()

    console.warn('CalendarMemoryOptimizer: Emergency cleanup performed', {
      removedAppointments: toRemove,
      removedCache: cacheToRemove,
      remainingAppointments: this.appointments.size,
      remainingCache: this.cache.size
    })
  }

  /**
   * Request garbage collection if available
   */
  private requestGarbageCollection(): void {
    const now = Date.now()
    
    // Don't request GC too frequently
    if (now - this.lastGC < 5000) return
    
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc()
        this.lastGC = now
        console.log('CalendarMemoryOptimizer: Garbage collection requested')
      } catch (error) {
        // GC not available or failed
      }
    }
  }

  /**
   * Get current memory metrics
   */
  getMemoryMetrics(): MemoryMetrics {
    const totalAppointments = this.appointments.size
    const renderedAppointments = Array.from(this.appointments.values())
      .filter(apt => apt.rendered).length
    
    const memoryUsage = this.estimateMemoryUsage()
    const cacheHits = this.cache.size
    const totalRequests = totalAppointments
    const cacheHitRatio = totalRequests > 0 ? cacheHits / totalRequests : 0

    let memoryPressure: 'low' | 'medium' | 'high' = 'low'
    if (memoryUsage > this.config.memoryThreshold * 0.8) {
      memoryPressure = 'high'
    } else if (memoryUsage > this.config.memoryThreshold * 0.6) {
      memoryPressure = 'medium'
    }

    return {
      totalAppointments,
      renderedAppointments,
      memoryUsage,
      cacheHitRatio,
      virtualizedRows: this.virtualizedItems.size,
      memoryPressure
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CalendarMemoryConfig>): void {
    this.config = { ...this.config, ...newConfig }
    console.log('CalendarMemoryOptimizer: Configuration updated', this.config)
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.appointments.clear()
    this.cache.clear()
    this.virtualizedItems.clear()
    this.renderQueue = []

    console.log('CalendarMemoryOptimizer: All data cleared')
  }

  /**
   * Destroy the memory optimizer
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    if (this.memoryObserver) {
      this.memoryObserver.disconnect()
    }

    this.clearAll()
  }
}

// Singleton instance for global calendar memory optimization
export const calendarMemoryOptimizer = new CalendarMemoryOptimizer()

// React hook for memory-optimized calendar
export function useCalendarMemoryOptimization() {
  const addAppointments = (appointments: any[]) => {
    calendarMemoryOptimizer.addAppointments(appointments)
  }

  const getVirtualizedAppointments = (viewport: ViewportInfo) => {
    return calendarMemoryOptimizer.getVirtualizedAppointments(viewport)
  }

  const cacheRenderData = (appointmentId: string, renderData: any) => {
    calendarMemoryOptimizer.cacheAppointmentRender(appointmentId, renderData)
  }

  const getCachedRenderData = (appointmentId: string) => {
    return calendarMemoryOptimizer.getCachedRenderData(appointmentId)
  }

  const getMetrics = () => {
    return calendarMemoryOptimizer.getMemoryMetrics()
  }

  const clearAll = () => {
    calendarMemoryOptimizer.clearAll()
  }

  return {
    addAppointments,
    getVirtualizedAppointments,
    cacheRenderData,
    getCachedRenderData,
    getMetrics,
    clearAll
  }
}

export default calendarMemoryOptimizer