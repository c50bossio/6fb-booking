/**
 * Real-time availability checking service
 * Handles real-time slot availability, conflict detection, and intelligent suggestions
 */

import { cache, cacheUtils } from '../cache'
import { appointmentsService, type BarberAvailability, type AppointmentConflict } from '../api/appointments'
import { errorManager, handleError } from '../error-handling/error-manager'
import { AppError, ConflictError, ValidationError, ErrorCode } from '../error-handling/error-types'

export interface AvailabilitySlot {
  time: string
  endTime: string
  available: boolean
  barberId: number
  barberName: string
  duration: number
  conflictType?: 'overlap' | 'buffer' | 'break' | 'unavailable'
  conflictReason?: string
  confidence: number // 0-1, how confident we are in this availability
  lastChecked: Date
}

export interface AvailabilityRequest {
  date: string
  barberId?: number
  serviceId: number
  duration: number
  preferredTimes?: string[]
  excludeAppointmentId?: number // For rescheduling
}

export interface AvailabilityResponse {
  date: string
  slots: AvailabilitySlot[]
  totalSlots: number
  availableSlots: number
  busySlots: number
  recommendations: SlotRecommendation[]
  lastUpdated: Date
  dataAge: number // milliseconds since last real-time check
}

export interface SlotRecommendation {
  slot: AvailabilitySlot
  score: number // 0-100, higher is better
  reasons: string[]
  alternativeDate?: string
  priority: 'high' | 'medium' | 'low'
}

export interface ConflictResolutionOptions {
  suggestAlternatives: boolean
  maxAlternatives: number
  allowDifferentBarber: boolean
  allowDifferentDate: boolean
  maxDaysOut: number
  preferredTimeRanges?: Array<{ start: string; end: string }>
}

interface ConcurrentBookingLock {
  slotKey: string
  timestamp: Date
  expiresAt: Date
  requestId: string
}

class AvailabilityService {
  private concurrentLocks: Map<string, ConcurrentBookingLock> = new Map()
  private readonly LOCK_DURATION = 5 * 60 * 1000 // 5 minutes
  private readonly CACHE_TTL = 2 * 60 * 1000 // 2 minutes for availability data
  private readonly STALE_THRESHOLD = 30 * 1000 // 30 seconds before data is considered stale
  private readonly BUFFER_TIME = 15 // 15 minutes buffer between appointments

  /**
   * Get real-time availability for a specific request
   */
  async getAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
    try {
      const cacheKey = this.generateAvailabilityCacheKey(request)

      // Try cache first, but check if data is stale
      const cached = cache.get<AvailabilityResponse>(cacheKey)
      if (cached && this.isDataFresh(cached)) {
        return cached
      }

      // Fetch fresh availability data
      const response = await this.fetchRealTimeAvailability(request)

      // Cache the response
      cache.set(cacheKey, response, this.CACHE_TTL)

      return response
    } catch (error) {
      throw await handleError(error, {
        operation: 'getAvailability',
        request,
      })
    }
  }

  /**
   * Check for conflicts before booking
   */
  async checkBookingConflicts(
    barberId: number,
    date: string,
    time: string,
    duration: number,
    excludeAppointmentId?: number
  ): Promise<AppointmentConflict> {
    try {
      const response = await appointmentsService.checkConflicts({
        barber_id: barberId,
        service_id: 0, // Will be validated by the API
        client_name: '', // Not needed for conflict check
        appointment_date: date,
        appointment_time: time,
        duration_minutes: duration,
      })

      // Add intelligent conflict analysis
      const enhancedConflict = await this.enhanceConflictAnalysis(
        response.data,
        barberId,
        date,
        time,
        duration
      )

      return enhancedConflict
    } catch (error) {
      throw await handleError(error, {
        operation: 'checkBookingConflicts',
        barberId,
        date,
        time,
        duration,
      })
    }
  }

  /**
   * Get intelligent alternative suggestions
   */
  async getAlternativeSuggestions(
    request: AvailabilityRequest,
    options: ConflictResolutionOptions = {
      suggestAlternatives: true,
      maxAlternatives: 5,
      allowDifferentBarber: true,
      allowDifferentDate: true,
      maxDaysOut: 7,
    }
  ): Promise<SlotRecommendation[]> {
    try {
      const suggestions: SlotRecommendation[] = []

      // Get availability for the requested date
      const sameDate = await this.getAvailability(request)

      // Add available slots from same date
      const sameDateSuggestions = this.rankSlots(
        sameDate.slots.filter(slot => slot.available),
        request.preferredTimes || []
      )
      suggestions.push(...sameDateSuggestions)

      // If we need more suggestions and different dates are allowed
      if (suggestions.length < options.maxAlternatives && options.allowDifferentDate) {
        const alternateDates = await this.getAlternateDateSuggestions(
          request,
          options.maxDaysOut,
          options.maxAlternatives - suggestions.length
        )
        suggestions.push(...alternateDates)
      }

      // If different barbers are allowed, get cross-barber suggestions
      if (suggestions.length < options.maxAlternatives && options.allowDifferentBarber) {
        const crossBarberSuggestions = await this.getCrossBarberSuggestions(
          request,
          options.maxAlternatives - suggestions.length
        )
        suggestions.push(...crossBarberSuggestions)
      }

      return suggestions
        .sort((a, b) => b.score - a.score)
        .slice(0, options.maxAlternatives)
    } catch (error) {
      throw await handleError(error, {
        operation: 'getAlternativeSuggestions',
        request,
        options,
      })
    }
  }

  /**
   * Reserve a slot temporarily to prevent double booking
   */
  async reserveSlot(
    barberId: number,
    date: string,
    time: string,
    duration: number,
    requestId: string
  ): Promise<boolean> {
    try {
      const slotKey = `${barberId}-${date}-${time}`
      const now = new Date()
      const expiresAt = new Date(now.getTime() + this.LOCK_DURATION)

      // Check if slot is already locked
      const existingLock = this.concurrentLocks.get(slotKey)
      if (existingLock && existingLock.expiresAt > now) {
        if (existingLock.requestId !== requestId) {
          return false // Slot is locked by another request
        }
        // Extend existing lock
        existingLock.expiresAt = expiresAt
        return true
      }

      // Create new lock
      this.concurrentLocks.set(slotKey, {
        slotKey,
        timestamp: now,
        expiresAt,
        requestId,
      })

      // Clean up expired locks
      this.cleanupExpiredLocks()

      return true
    } catch (error) {
      throw await handleError(error, {
        operation: 'reserveSlot',
        barberId,
        date,
        time,
        requestId,
      })
    }
  }

  /**
   * Release a reserved slot
   */
  releaseSlot(barberId: number, date: string, time: string, requestId: string): void {
    const slotKey = `${barberId}-${date}-${time}`
    const lock = this.concurrentLocks.get(slotKey)

    if (lock && lock.requestId === requestId) {
      this.concurrentLocks.delete(slotKey)
    }
  }

  /**
   * Invalidate availability cache for specific date/barber
   */
  invalidateAvailabilityCache(barberId?: number, date?: string): void {
    if (barberId && date) {
      // Invalidate specific barber/date combination
      const pattern = `availability:${barberId}:${date}`
      cacheUtils.invalidatePattern(pattern)
    } else if (barberId) {
      // Invalidate all dates for barber
      const pattern = `availability:${barberId}`
      cacheUtils.invalidatePattern(pattern)
    } else if (date) {
      // Invalidate all barbers for date
      const pattern = `availability:*:${date}`
      cacheUtils.invalidatePattern(pattern)
    } else {
      // Invalidate all availability cache
      cacheUtils.invalidatePattern('availability:')
    }
  }

  /**
   * Fetch real-time availability data
   */
  private async fetchRealTimeAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse> {
    const now = new Date()

    if (request.barberId) {
      // Get availability for specific barber
      const response = await appointmentsService.getBarberAvailability(
        request.barberId,
        request.date,
        request.serviceId,
        request.duration
      )
      return this.transformBarberAvailability(response.data, now)
    } else {
      // Get availability for all barbers
      const response = await appointmentsService.getMultiBarberAvailability(
        [], // Empty array means all barbers
        request.date,
        request.date,
        request.serviceId
      )
      return this.transformMultiBarberAvailability(response.data, now, request)
    }
  }

  /**
   * Transform API response to our internal format
   */
  private transformBarberAvailability(
    availability: BarberAvailability,
    timestamp: Date
  ): AvailabilityResponse {
    const slots: AvailabilitySlot[] = availability.slots.map(slot => ({
      time: slot.time,
      endTime: slot.end_time,
      available: slot.available,
      barberId: availability.barber_id,
      barberName: availability.barber_name,
      duration: this.calculateSlotDuration(slot.time, slot.end_time),
      conflictType: slot.reason ? this.mapConflictReason(slot.reason) : undefined,
      conflictReason: slot.reason,
      confidence: slot.available ? 0.9 : 0.1,
      lastChecked: timestamp,
    }))

    const availableSlots = slots.filter(slot => slot.available)
    const recommendations = this.generateRecommendations(availableSlots)

    return {
      date: availability.date,
      slots,
      totalSlots: slots.length,
      availableSlots: availableSlots.length,
      busySlots: slots.length - availableSlots.length,
      recommendations,
      lastUpdated: timestamp,
      dataAge: 0,
    }
  }

  /**
   * Transform multi-barber availability
   */
  private transformMultiBarberAvailability(
    availabilities: BarberAvailability[],
    timestamp: Date,
    request: AvailabilityRequest
  ): AvailabilityResponse {
    const allSlots: AvailabilitySlot[] = []

    availabilities.forEach(availability => {
      const barberSlots = availability.slots.map(slot => ({
        time: slot.time,
        endTime: slot.end_time,
        available: slot.available,
        barberId: availability.barber_id,
        barberName: availability.barber_name,
        duration: this.calculateSlotDuration(slot.time, slot.end_time),
        conflictType: slot.reason ? this.mapConflictReason(slot.reason) : undefined,
        conflictReason: slot.reason,
        confidence: slot.available ? 0.9 : 0.1,
        lastChecked: timestamp,
      }))
      allSlots.push(...barberSlots)
    })

    const availableSlots = allSlots.filter(slot => slot.available)
    const recommendations = this.generateRecommendations(availableSlots)

    return {
      date: request.date,
      slots: allSlots,
      totalSlots: allSlots.length,
      availableSlots: availableSlots.length,
      busySlots: allSlots.length - availableSlots.length,
      recommendations,
      lastUpdated: timestamp,
      dataAge: 0,
    }
  }

  /**
   * Generate intelligent recommendations from available slots
   */
  private generateRecommendations(slots: AvailabilitySlot[]): SlotRecommendation[] {
    return slots.map(slot => {
      const score = this.calculateSlotScore(slot)
      const reasons = this.generateSlotReasons(slot, score)

      return {
        slot,
        score,
        reasons,
        priority: score > 80 ? 'high' : score > 60 ? 'medium' : 'low',
      }
    }).sort((a, b) => b.score - a.score)
  }

  /**
   * Calculate a score for slot recommendation
   */
  private calculateSlotScore(slot: AvailabilitySlot): number {
    let score = 50 // Base score

    // Time of day preferences
    const hour = parseInt(slot.time.split(':')[0])
    if (hour >= 10 && hour <= 16) {
      score += 20 // Prime hours
    } else if (hour >= 9 && hour <= 18) {
      score += 10 // Good hours
    }

    // Confidence factor
    score += slot.confidence * 30

    // Penalize very early or very late slots
    if (hour < 8 || hour > 19) {
      score -= 15
    }

    return Math.max(0, Math.min(100, score))
  }

  /**
   * Generate reasons for slot recommendation
   */
  private generateSlotReasons(slot: AvailabilitySlot, score: number): string[] {
    const reasons: string[] = []

    const hour = parseInt(slot.time.split(':')[0])

    if (score > 80) {
      reasons.push('Optimal time slot')
    }

    if (hour >= 10 && hour <= 16) {
      reasons.push('Prime business hours')
    }

    if (slot.confidence > 0.8) {
      reasons.push('High availability confidence')
    }

    if (hour < 8) {
      reasons.push('Early morning slot')
    }

    if (hour > 18) {
      reasons.push('Evening slot')
    }

    return reasons
  }

  /**
   * Enhance conflict analysis with additional intelligence
   */
  private async enhanceConflictAnalysis(
    conflict: AppointmentConflict,
    barberId: number,
    date: string,
    time: string,
    duration: number
  ): Promise<AppointmentConflict> {
    // Add buffer time conflicts
    const bufferConflicts = await this.checkBufferTimeConflicts(
      barberId,
      date,
      time,
      duration
    )

    if (bufferConflicts.length > 0) {
      conflict.conflicts.push(...bufferConflicts)
      conflict.has_conflicts = true
    }

    // Enhance alternative suggestions if conflicts exist
    if (conflict.has_conflicts && (!conflict.alternative_slots || conflict.alternative_slots.length === 0)) {
      const alternatives = await this.getAlternativeSuggestions({
        date,
        barberId,
        serviceId: 0, // This would need to be passed in
        duration,
      })

      conflict.alternative_slots = alternatives.slice(0, 3).map(alt => ({
        date: alt.alternativeDate || date,
        time: alt.slot.time,
        barber_id: alt.slot.barberId,
      }))
    }

    return conflict
  }

  /**
   * Check for buffer time conflicts
   */
  private async checkBufferTimeConflicts(
    barberId: number,
    date: string,
    time: string,
    duration: number
  ): Promise<Array<{ type: 'overlap' | 'unavailable' | 'closed' | 'booking_rule'; message: string; severity: 'error' | 'warning' | 'info' }>> {
    const conflicts = []

    // This would typically check against existing appointments with buffer time
    // For now, we'll return an empty array as this would require API integration

    return conflicts
  }

  /**
   * Get alternative date suggestions
   */
  private async getAlternateDateSuggestions(
    request: AvailabilityRequest,
    maxDaysOut: number,
    maxSuggestions: number
  ): Promise<SlotRecommendation[]> {
    const suggestions: SlotRecommendation[] = []
    const requestDate = new Date(request.date)

    for (let i = 1; i <= maxDaysOut && suggestions.length < maxSuggestions; i++) {
      const alternateDate = new Date(requestDate)
      alternateDate.setDate(alternateDate.getDate() + i)

      const dateStr = alternateDate.toISOString().split('T')[0]

      try {
        const availability = await this.getAvailability({
          ...request,
          date: dateStr,
        })

        const availableSlots = availability.slots.filter(slot => slot.available)
        const rankedSlots = this.rankSlots(availableSlots, request.preferredTimes || [])

        rankedSlots.forEach(recommendation => {
          if (suggestions.length < maxSuggestions) {
            suggestions.push({
              ...recommendation,
              alternativeDate: dateStr,
              score: recommendation.score - (i * 5), // Penalty for being further out
            })
          }
        })
      } catch (error) {
        // Skip this date if there's an error
        continue
      }
    }

    return suggestions
  }

  /**
   * Get cross-barber suggestions
   */
  private async getCrossBarberSuggestions(
    request: AvailabilityRequest,
    maxSuggestions: number
  ): Promise<SlotRecommendation[]> {
    try {
      // Get availability for all barbers
      const allBarbersAvailability = await this.getAvailability({
        ...request,
        barberId: undefined, // Remove barber restriction
      })

      const availableSlots = allBarbersAvailability.slots
        .filter(slot => slot.available && slot.barberId !== request.barberId)

      return this.rankSlots(availableSlots, request.preferredTimes || [])
        .slice(0, maxSuggestions)
        .map(rec => ({
          ...rec,
          score: rec.score - 10, // Small penalty for different barber
          reasons: [...rec.reasons, 'Different barber available'],
        }))
    } catch (error) {
      return []
    }
  }

  /**
   * Rank slots based on preferred times
   */
  private rankSlots(slots: AvailabilitySlot[], preferredTimes: string[]): SlotRecommendation[] {
    return slots.map(slot => {
      let score = this.calculateSlotScore(slot)

      // Boost score for preferred times
      if (preferredTimes.includes(slot.time)) {
        score += 25
      }

      const reasons = this.generateSlotReasons(slot, score)

      return {
        slot,
        score,
        reasons,
        priority: score > 80 ? 'high' : score > 60 ? 'medium' : 'low',
      }
    }).sort((a, b) => b.score - a.score)
  }

  /**
   * Utility methods
   */
  private generateAvailabilityCacheKey(request: AvailabilityRequest): string {
    return `availability:${request.barberId || 'all'}:${request.date}:${request.serviceId}:${request.duration}`
  }

  private isDataFresh(response: AvailabilityResponse): boolean {
    const age = Date.now() - response.lastUpdated.getTime()
    return age < this.STALE_THRESHOLD
  }

  private calculateSlotDuration(startTime: string, endTime: string): number {
    const start = this.timeToMinutes(startTime)
    const end = this.timeToMinutes(endTime)
    return end - start
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  private mapConflictReason(reason: string): 'overlap' | 'buffer' | 'break' | 'unavailable' {
    const lowerReason = reason.toLowerCase()
    if (lowerReason.includes('overlap') || lowerReason.includes('conflict')) {
      return 'overlap'
    }
    if (lowerReason.includes('break') || lowerReason.includes('lunch')) {
      return 'break'
    }
    if (lowerReason.includes('buffer')) {
      return 'buffer'
    }
    return 'unavailable'
  }

  private cleanupExpiredLocks(): void {
    const now = new Date()
    for (const [key, lock] of this.concurrentLocks.entries()) {
      if (lock.expiresAt <= now) {
        this.concurrentLocks.delete(key)
      }
    }
  }
}

// Export singleton instance
export const availabilityService = new AvailabilityService()
