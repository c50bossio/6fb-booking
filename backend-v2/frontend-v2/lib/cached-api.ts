/**
 * Cached API Functions for BookedBarber V2
 * 
 * Provides cached versions of API functions with intelligent cache management,
 * automatic background refresh, and performance optimization.
 */

import { cache } from './cache'
import { 
  appointmentsAPI, 
  getNextAvailableSlot, 
  getProfile, 
  getBookingSettings,
  type SlotsResponse,
  type NextAvailableSlot,
  type User,
  type BookingSettings
} from './api'

/**
 * Cached version of time slots API with intelligent cache management
 */
export async function getCachedTimeSlots(
  date: string, 
  service?: string,
  forceRefresh = false
): Promise<SlotsResponse> {
  const key = cache.generateTimeslotKey(date, service)
  
  if (forceRefresh) {
    return cache.refresh(key, () => appointmentsAPI.getAvailableSlots(date))
  }
  
  return cache.get(key, () => appointmentsAPI.getAvailableSlots(date))
}

/**
 * Cached version of next available slot API
 */
export async function getCachedNextAvailableSlot(
  service?: string,
  forceRefresh = false
): Promise<NextAvailableSlot> {
  const key = cache.generateNextAvailableKey(service)
  
  if (forceRefresh) {
    return cache.refresh(key, () => getNextAvailableSlot())
  }
  
  return cache.get(key, () => getNextAvailableSlot())
}

/**
 * Cached version of user profile API
 */
export async function getCachedProfile(forceRefresh = false): Promise<User> {
  const key = 'profile|current'
  
  if (forceRefresh) {
    return cache.refresh(key, () => getProfile())
  }
  
  return cache.get(key, () => getProfile())
}

/**
 * Cached version of booking settings API
 */
export async function getCachedBookingSettings(forceRefresh = false): Promise<BookingSettings> {
  const key = 'settings|booking'
  
  if (forceRefresh) {
    return cache.refresh(key, () => getBookingSettings())
  }
  
  return cache.get(key, () => getBookingSettings())
}

/**
 * Preload cache with commonly needed data
 */
export async function preloadBookingData(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  // Preload in parallel without waiting
  const preloadPromises = [
    getCachedTimeSlots(today).catch(console.warn),
    getCachedTimeSlots(tomorrow).catch(console.warn),
    getCachedNextAvailableSlot().catch(console.warn),
    getCachedBookingSettings().catch(console.warn)
  ]
  
  // Don't await - run in background
  Promise.all(preloadPromises).catch(console.warn)
}

/**
 * Batch load time slots for multiple dates
 */
export async function batchLoadTimeSlots(
  dates: string[],
  service?: string
): Promise<Map<string, SlotsResponse>> {
  const results = new Map<string, SlotsResponse>()
  
  // Load all dates in parallel
  const promises = dates.map(async (date) => {
    try {
      const slots = await getCachedTimeSlots(date, service)
      results.set(date, slots)
    } catch (error) {
      console.warn(`Failed to load slots for ${date}:`, error)
    }
  })
  
  await Promise.all(promises)
  return results
}

/**
 * Smart cache invalidation after booking operations
 */
export function invalidateBookingCache(date?: string, options: {
  invalidateNextAvailable?: boolean
  invalidateProfile?: boolean
  invalidateSettings?: boolean
} = {}): void {
  // Always invalidate time slots for the affected date
  cache.invalidateTimeSlots(date)
  
  if (options.invalidateNextAvailable !== false) {
    // Default to true - bookings usually affect next available
    cache.invalidate(/^next-available/)
  }
  
  if (options.invalidateProfile) {
    cache.invalidate('profile|current')
  }
  
  if (options.invalidateSettings) {
    cache.invalidate('settings|booking')
  }
}

/**
 * Get cache performance metrics
 */
export function getCacheMetrics(): {
  hitRate: number
  size: number
  freshEntries: number
  staleEntries: number
  avgAge: number
} {
  const stats = cache.getStats()
  const freshEntries = stats.entries.filter(e => e.fresh).length
  const staleEntries = stats.entries.length - freshEntries
  const avgAge = stats.entries.length > 0 
    ? stats.entries.reduce((sum, e) => sum + e.age, 0) / stats.entries.length 
    : 0
  
  return {
    hitRate: stats.size > 0 ? freshEntries / stats.size : 0,
    size: stats.size,
    freshEntries,
    staleEntries,
    avgAge: Math.round(avgAge / 1000) // Convert to seconds
  }
}

/**
 * React hook for managing cache in components
 */
export function useBookingCache() {
  return {
    // Data fetching
    getTimeSlots: getCachedTimeSlots,
    getNextAvailable: getCachedNextAvailableSlot,
    getProfile: getCachedProfile,
    getBookingSettings: getCachedBookingSettings,
    
    // Batch operations
    batchLoadTimeSlots,
    preloadBookingData,
    
    // Cache management
    invalidateBookingCache,
    forceRefresh: (type: 'timeSlots' | 'nextAvailable' | 'profile' | 'settings', ...args: any[]) => {
      switch (type) {
        case 'timeSlots':
          return getCachedTimeSlots(args[0], args[1], true)
        case 'nextAvailable':
          return getCachedNextAvailableSlot(args[0], true)
        case 'profile':
          return getCachedProfile(true)
        case 'settings':
          return getCachedBookingSettings(true)
      }
    },
    
    // Metrics
    getMetrics: getCacheMetrics
  }
}

/**
 * Background refresh scheduler for keeping cache warm
 */
class CacheRefreshScheduler {
  private intervals = new Map<string, NodeJS.Timeout>()
  
  /**
   * Schedule regular refresh of time slots for current date
   */
  scheduleTimeSlotsRefresh(): void {
    // Refresh every 90 seconds (before 2-minute cache expires)
    const interval = setInterval(() => {
      const today = new Date().toISOString().split('T')[0]
      getCachedTimeSlots(today, undefined, true).catch(console.warn)
    }, 90 * 1000)
    
    this.intervals.set('timeSlots', interval)
  }
  
  /**
   * Schedule regular refresh of next available slot
   */
  scheduleNextAvailableRefresh(): void {
    // Refresh every 45 seconds (before 1-minute cache expires)
    const interval = setInterval(() => {
      getCachedNextAvailableSlot(undefined, true).catch(console.warn)
    }, 45 * 1000)
    
    this.intervals.set('nextAvailable', interval)
  }
  
  /**
   * Stop all scheduled refreshes
   */
  stopAll(): void {
    for (const interval of Array.from(this.intervals.values())) {
      clearInterval(interval)
    }
    this.intervals.clear()
  }
  
  /**
   * Start smart refresh scheduling based on user activity
   */
  startSmart(): void {
    // Only refresh when page is visible and user is active
    if (typeof window !== 'undefined') {
      let isVisible = !document.hidden
      let lastActivity = Date.now()
      
      // Track visibility
      document.addEventListener('visibilitychange', () => {
        isVisible = !document.hidden
        if (isVisible) {
          // Refresh immediately when page becomes visible
          this.refreshImmediate()
        }
      })
      
      // Track user activity
      const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart']
      const updateActivity = () => { lastActivity = Date.now() }
      activityEvents.forEach(event => {
        document.addEventListener(event, updateActivity, { passive: true })
      })
      
      // Only refresh if user is active and page is visible
      const conditionalRefresh = () => {
        const timeSinceActivity = Date.now() - lastActivity
        if (isVisible && timeSinceActivity < 5 * 60 * 1000) { // 5 minutes
          this.refreshImmediate()
        }
      }
      
      // Schedule conditional refreshes
      this.intervals.set('smart', setInterval(conditionalRefresh, 60 * 1000)) // Every minute
    }
  }
  
  private refreshImmediate(): void {
    const today = new Date().toISOString().split('T')[0]
    getCachedTimeSlots(today, undefined, true).catch(console.warn)
    getCachedNextAvailableSlot(undefined, true).catch(console.warn)
  }
}

// Global scheduler instance
export const cacheScheduler = new CacheRefreshScheduler()

// Auto-start smart scheduling in browser
if (typeof window !== 'undefined') {
  // Start smart scheduling after page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      cacheScheduler.startSmart()
    }, 2000) // Wait 2 seconds after load
  })
  
  // Stop scheduling when page unloads
  window.addEventListener('beforeunload', () => {
    cacheScheduler.stopAll()
  })
}