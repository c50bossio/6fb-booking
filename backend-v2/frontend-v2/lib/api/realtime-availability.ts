/**
 * Real-time availability API client for mobile-first booking experience
 * Supports live updates, caching, and optimistic updates
 */

import { apiClient } from './client'
import { useState, useEffect } from 'react'

export interface AvailabilitySlot {
  time: string
  date: string
  barber_id: number
  barber_name: string
  barber_avatar?: string
  duration: number
  available: boolean
  price: number
  service_id?: number
  service_name?: string
  is_popular: boolean
  next_available?: string
  popularity_score?: number
}

export interface RealTimeAvailabilityResponse {
  date: string
  total_slots: number
  available_slots: number
  slots: AvailabilitySlot[]
  last_updated: string
  next_update: string
  cache_status: string
}

export interface QuickRebookOption {
  appointment_id: number
  original_date: string
  service_name: string
  barber_name: string
  duration: number
  price: number
  can_rebook: boolean
  suggested_slots: AvailabilitySlot[]
  reason?: string
}

export interface MobileBookingStats {
  peak_hours: number[]
  average_booking_time: number
  popular_services: Array<{
    name: string
    bookings: number
    average_price: number
  }>
  recommended_times: string[]
  user_preferences: {
    preferred_barbers?: string[]
    preferred_times?: number[]
    average_frequency?: number
    preferred_services?: string[]
  }
}

export interface BookingRequest {
  barber_id: number
  start_time: string
  duration?: number
  service_id?: number
  notes?: string
}

export interface BookingResponse {
  success: boolean
  appointment_id: number
  confirmation_number: string
  message: string
}

class RealTimeAvailabilityAPI {
  private cache: Map<string, RealTimeAvailabilityResponse> = new Map()
  private cacheTimestamps: Map<string, number> = new Map()
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map()
  private subscribers: Map<string, Set<(data: RealTimeAvailabilityResponse) => void>> = new Map()

  /**
   * Get real-time availability for a specific date
   */
  async getAvailability(
    date: Date,
    options: {
      barber_id?: number
      service_id?: number
      duration?: number
      location_id?: number
      include_popular?: boolean
      auto_refresh?: boolean
    } = {}
  ): Promise<RealTimeAvailabilityResponse> {
    const {
      barber_id,
      service_id,
      duration = 30,
      location_id,
      include_popular = true,
      auto_refresh = true
    } = options

    const cacheKey = this.getCacheKey(date, options)
    
    // Check cache first
    const cachedData = this.getCachedData(cacheKey)
    if (cachedData) {
      // Start auto-refresh if enabled
      if (auto_refresh && !this.updateIntervals.has(cacheKey)) {
        this.startAutoRefresh(cacheKey, date, options)
      }
      return cachedData
    }

    try {
      const params = new URLSearchParams({
        date: date.toISOString(),
        duration: duration.toString(),
        include_popular: include_popular.toString()
      })

      if (barber_id) params.append('barber_id', barber_id.toString())
      if (service_id) params.append('service_id', service_id.toString())
      if (location_id) params.append('location_id', location_id.toString())

      const response = await apiClient.get<RealTimeAvailabilityResponse>(
        `/api/v1/realtime-availability/slots?${params}`
      )

      // Cache the response
      this.cache.set(cacheKey, response)
      this.cacheTimestamps.set(cacheKey, Date.now())

      // Notify subscribers
      this.notifySubscribers(cacheKey, response)

      // Start auto-refresh
      if (auto_refresh) {
        this.startAutoRefresh(cacheKey, date, options)
      }

      return response
    } catch (error) {
      console.error('Failed to fetch availability:', error)
      throw error
    }
  }

  /**
   * Subscribe to real-time availability updates
   */
  subscribeToAvailability(
    date: Date,
    options: any,
    callback: (data: RealTimeAvailabilityResponse) => void
  ): () => void {
    const cacheKey = this.getCacheKey(date, options)
    
    if (!this.subscribers.has(cacheKey)) {
      this.subscribers.set(cacheKey, new Set())
    }
    
    this.subscribers.get(cacheKey)!.add(callback)

    // Start fetching data if not already doing so
    this.getAvailability(date, { ...options, auto_refresh: true })

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(cacheKey)
      if (subscribers) {
        subscribers.delete(callback)
        if (subscribers.size === 0) {
          this.stopAutoRefresh(cacheKey)
          this.subscribers.delete(cacheKey)
        }
      }
    }
  }

  /**
   * Get quick rebook options for current user
   */
  async getQuickRebookOptions(
    limit: number = 5,
    days_ahead: number = 14
  ): Promise<QuickRebookOption[]> {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        days_ahead: days_ahead.toString()
      })

      const response = await apiClient.get<QuickRebookOption[]>(
        `/api/v1/realtime-availability/quick-rebook?${params}`
      )

      return response
    } catch (error) {
      console.error('Failed to fetch rebook options:', error)
      throw error
    }
  }

  /**
   * Book a slot with real-time conflict checking
   */
  async bookSlot(request: BookingRequest): Promise<BookingResponse> {
    try {
      const response = await apiClient.post<BookingResponse>(
        '/api/v1/realtime-availability/book-slot',
        request
      )

      // Invalidate relevant cache entries
      this.invalidateCache(new Date(request.start_time))

      return response
    } catch (error) {
      console.error('Failed to book slot:', error)
      throw error
    }
  }

  /**
   * Quick rebook from previous appointment
   */
  async quickRebook(
    appointmentId: number,
    newSlot: AvailabilitySlot
  ): Promise<BookingResponse> {
    try {
      const request: BookingRequest = {
        barber_id: newSlot.barber_id,
        start_time: newSlot.time,
        duration: newSlot.duration,
        service_id: newSlot.service_id,
        notes: `Rebooked from appointment #${appointmentId}`
      }

      return await this.bookSlot(request)
    } catch (error) {
      console.error('Failed to quick rebook:', error)
      throw error
    }
  }

  /**
   * Get mobile booking statistics
   */
  async getMobileStats(): Promise<MobileBookingStats> {
    try {
      const cacheKey = 'mobile-stats'
      const cached = this.cache.get(cacheKey) as any
      const cacheTime = this.cacheTimestamps.get(cacheKey) || 0
      
      // Cache stats for 5 minutes
      if (cached && Date.now() - cacheTime < 5 * 60 * 1000) {
        return cached
      }

      const response = await apiClient.get<MobileBookingStats>(
        '/api/v1/realtime-availability/mobile-stats'
      )

      this.cache.set(cacheKey, response as any)
      this.cacheTimestamps.set(cacheKey, Date.now())

      return response
    } catch (error) {
      console.error('Failed to fetch mobile stats:', error)
      throw error
    }
  }

  /**
   * Check if a specific slot is still available
   */
  async checkSlotAvailability(
    barberId: number,
    startTime: Date,
    duration: number = 30
  ): Promise<boolean> {
    try {
      const availability = await this.getAvailability(startTime, {
        barber_id: barberId,
        duration,
        auto_refresh: false
      })

      const targetTime = startTime.toISOString()
      const slot = availability.slots.find(s => 
        s.barber_id === barberId && 
        new Date(s.time).getTime() === startTime.getTime()
      )

      return slot?.available || false
    } catch (error) {
      console.error('Failed to check slot availability:', error)
      return false
    }
  }

  /**
   * Get availability for multiple dates (batch request)
   */
  async getAvailabilityBatch(
    dates: Date[],
    options: any = {}
  ): Promise<Map<string, RealTimeAvailabilityResponse>> {
    const results = new Map<string, RealTimeAvailabilityResponse>()
    
    // Execute requests in parallel
    const promises = dates.map(async (date) => {
      try {
        const availability = await this.getAvailability(date, options)
        results.set(date.toISOString().split('T')[0], availability)
      } catch (error) {
        console.error(`Failed to fetch availability for ${date}:`, error)
      }
    })

    await Promise.all(promises)
    return results
  }

  // Private helper methods
  private getCacheKey(date: Date, options: any): string {
    const dateStr = date.toISOString().split('T')[0]
    const optionsStr = JSON.stringify(options)
    return `${dateStr}-${optionsStr}`
  }

  private getCachedData(cacheKey: string): RealTimeAvailabilityResponse | null {
    const cached = this.cache.get(cacheKey)
    const timestamp = this.cacheTimestamps.get(cacheKey)
    
    if (!cached || !timestamp) return null
    
    // Cache expires after 30 seconds for real-time feel
    const isExpired = Date.now() - timestamp > 30 * 1000
    if (isExpired) {
      this.cache.delete(cacheKey)
      this.cacheTimestamps.delete(cacheKey)
      return null
    }
    
    return cached
  }

  private startAutoRefresh(cacheKey: string, date: Date, options: any) {
    if (this.updateIntervals.has(cacheKey)) return

    const interval = setInterval(async () => {
      try {
        const fresh = await this.fetchFreshAvailability(date, options)
        this.cache.set(cacheKey, fresh)
        this.cacheTimestamps.set(cacheKey, Date.now())
        this.notifySubscribers(cacheKey, fresh)
      } catch (error) {
        console.error('Auto-refresh failed:', error)
      }
    }, 30000) // Refresh every 30 seconds

    this.updateIntervals.set(cacheKey, interval)
  }

  private stopAutoRefresh(cacheKey: string) {
    const interval = this.updateIntervals.get(cacheKey)
    if (interval) {
      clearInterval(interval)
      this.updateIntervals.delete(cacheKey)
    }
  }

  private async fetchFreshAvailability(
    date: Date,
    options: any
  ): Promise<RealTimeAvailabilityResponse> {
    const params = new URLSearchParams({
      date: date.toISOString(),
      duration: (options.duration || 30).toString(),
      include_popular: (options.include_popular !== false).toString()
    })

    if (options.barber_id) params.append('barber_id', options.barber_id.toString())
    if (options.service_id) params.append('service_id', options.service_id.toString())
    if (options.location_id) params.append('location_id', options.location_id.toString())

    return await apiClient.get<RealTimeAvailabilityResponse>(
      `/api/v1/realtime-availability/slots?${params}`
    )
  }

  private notifySubscribers(cacheKey: string, data: RealTimeAvailabilityResponse) {
    const subscribers = this.subscribers.get(cacheKey)
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Subscriber callback error:', error)
        }
      })
    }
  }

  private invalidateCache(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    
    // Remove all cache entries for this date
    for (const [key] of this.cache) {
      if (key.startsWith(dateStr)) {
        this.cache.delete(key)
        this.cacheTimestamps.delete(key)
      }
    }
  }

  /**
   * Cleanup resources when component unmounts
   */
  cleanup() {
    // Clear all intervals
    for (const interval of this.updateIntervals.values()) {
      clearInterval(interval)
    }
    
    // Clear all caches
    this.cache.clear()
    this.cacheTimestamps.clear()
    this.updateIntervals.clear()
    this.subscribers.clear()
  }
}

// Export singleton instance
export const realTimeAvailabilityAPI = new RealTimeAvailabilityAPI()

// React hook for easy component integration
export function useRealTimeAvailability(
  date: Date,
  options: any = {}
) {
  const [availability, setAvailability] = useState<RealTimeAvailabilityResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    const loadAvailability = async () => {
      try {
        setLoading(true)
        setError(null)

        // Subscribe to real-time updates
        unsubscribe = realTimeAvailabilityAPI.subscribeToAvailability(
          date,
          options,
          (data) => {
            setAvailability(data)
            setLoading(false)
          }
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load availability')
        setLoading(false)
      }
    }

    loadAvailability()

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [date, JSON.stringify(options)])

  return { availability, loading, error }
}

// React hook for quick rebook options
export function useQuickRebookOptions() {
  const [rebookOptions, setRebookOptions] = useState<QuickRebookOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRebookOptions = async () => {
      try {
        setLoading(true)
        setError(null)
        const options = await realTimeAvailabilityAPI.getQuickRebookOptions()
        setRebookOptions(options)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load rebook options')
      } finally {
        setLoading(false)
      }
    }

    loadRebookOptions()
  }, [])

  return { rebookOptions, loading, error, refetch: () => loadRebookOptions() }
}

export default realTimeAvailabilityAPI