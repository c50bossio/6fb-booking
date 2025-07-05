/**
 * AI-Powered Time Suggestions System
 * 
 * Analyzes booking patterns, user preferences, and business logic
 * to suggest optimal appointment times for better conversion and efficiency.
 */

import { format, addMinutes, addHours, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns'
import type { BookingResponse } from '@/lib/api'

interface TimeSlot {
  time: string
  date: Date
  confidence: number
  reason: string
  duration: number
  available: boolean
  preference: 'high' | 'medium' | 'low'
}

interface BookingPattern {
  preferredTimes: string[]
  popularDays: number[]
  averageDuration: number
  cancellationRate: number
  busyPeriods: { start: string; end: string }[]
}

interface ClientProfile {
  id?: number
  name: string
  preferredTimes?: string[]
  previousAppointments: BookingResponse[]
  loyalty: 'new' | 'regular' | 'vip'
  noShowRate: number
}

interface BusinessRules {
  operatingHours: { start: string; end: string }
  lunchBreak?: { start: string; end: string }
  bufferTime: number // minutes between appointments
  peakHours: { start: string; end: string }[]
  minimumAdvanceBooking: number // hours
  maximumAdvanceBooking: number // days
}

class AITimeSuggestionEngine {
  private patterns: Map<string, BookingPattern> = new Map()
  private businessRules: BusinessRules
  
  constructor(businessRules: BusinessRules) {
    this.businessRules = businessRules
  }

  /**
   * Analyze historical booking data to identify patterns
   */
  analyzeBookingPatterns(appointments: BookingResponse[]): BookingPattern {
    const pattern: BookingPattern = {
      preferredTimes: [],
      popularDays: [],
      averageDuration: 60,
      cancellationRate: 0,
      busyPeriods: []
    }

    if (appointments.length === 0) return pattern

    // Analyze preferred booking times
    const timeFrequency = new Map<string, number>()
    const dayFrequency = new Map<number, number>()
    const durations: number[] = []
    let cancellations = 0

    appointments.forEach(appointment => {
      const date = new Date(appointment.start_time)
      const timeSlot = format(date, 'HH:mm')
      const dayOfWeek = date.getDay()

      // Track time preferences
      timeFrequency.set(timeSlot, (timeFrequency.get(timeSlot) || 0) + 1)
      
      // Track day preferences
      dayFrequency.set(dayOfWeek, (dayFrequency.get(dayOfWeek) || 0) + 1)

      // Calculate duration (assume 60 min if end time not available)
      if (appointment.end_time) {
        const endDate = new Date(appointment.end_time)
        durations.push((endDate.getTime() - date.getTime()) / (1000 * 60))
      } else {
        durations.push(60)
      }

      // Track cancellations
      if (appointment.status === 'cancelled') {
        cancellations++
      }
    })

    // Extract top preferred times (top 5)
    pattern.preferredTimes = Array.from(timeFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([time]) => time)

    // Extract popular days
    pattern.popularDays = Array.from(dayFrequency.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day)

    // Calculate average duration
    pattern.averageDuration = durations.length > 0 
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 60

    // Calculate cancellation rate
    pattern.cancellationRate = appointments.length > 0 
      ? cancellations / appointments.length 
      : 0

    return pattern
  }

  /**
   * Generate intelligent time suggestions for a specific date
   */
  async generateTimeSuggestions(
    targetDate: Date,
    serviceType: string,
    clientProfile?: ClientProfile,
    existingAppointments: BookingResponse[] = [],
    requestedDuration: number = 60
  ): Promise<TimeSlot[]> {
    const suggestions: TimeSlot[] = []
    const dayStart = startOfDay(targetDate)
    const dayEnd = endOfDay(targetDate)

    // Get business operating hours for the day
    const operatingStart = this.parseTime(this.businessRules.operatingHours.start, targetDate)
    const operatingEnd = this.parseTime(this.businessRules.operatingHours.end, targetDate)

    // Analyze existing appointments for the day
    const dayAppointments = existingAppointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= dayStart && aptDate <= dayEnd
    })

    // Generate all possible time slots
    let currentTime = operatingStart
    
    while (currentTime < operatingEnd) {
      const endTime = addMinutes(currentTime, requestedDuration)
      
      if (endTime <= operatingEnd) {
        const isAvailable = this.isTimeSlotAvailable(
          currentTime,
          endTime,
          dayAppointments
        )

        if (isAvailable) {
          const suggestion = await this.evaluateTimeSlot(
            currentTime,
            serviceType,
            clientProfile,
            dayAppointments
          )
          
          if (suggestion.confidence > 0.3) { // Only suggest slots with reasonable confidence
            suggestions.push(suggestion)
          }
        }
      }

      currentTime = addMinutes(currentTime, 15) // 15-minute intervals
    }

    // Sort by confidence and preference
    return suggestions
      .sort((a, b) => {
        // First sort by preference (high > medium > low)
        const prefOrder = { high: 3, medium: 2, low: 1 }
        if (prefOrder[a.preference] !== prefOrder[b.preference]) {
          return prefOrder[b.preference] - prefOrder[a.preference]
        }
        // Then by confidence
        return b.confidence - a.confidence
      })
      .slice(0, 6) // Return top 6 suggestions
  }

  /**
   * Evaluate a specific time slot and assign confidence score
   */
  private async evaluateTimeSlot(
    time: Date,
    serviceType: string,
    clientProfile?: ClientProfile,
    dayAppointments: BookingResponse[] = []
  ): Promise<TimeSlot> {
    let confidence = 0.5 // Base confidence
    let reasons: string[] = []
    let preference: 'high' | 'medium' | 'low' = 'medium'

    const timeString = format(time, 'HH:mm')
    const hour = time.getHours()

    // Business hours analysis
    if (this.isInPeakHours(timeString)) {
      confidence += 0.2
      reasons.push('Peak business hours')
      preference = 'high'
    }

    // Avoid lunch break
    if (this.businessRules.lunchBreak && this.isInLunchBreak(timeString)) {
      confidence -= 0.3
      reasons.push('During lunch break')
      preference = 'low'
    }

    // Time of day preferences
    if (hour >= 9 && hour <= 11) {
      confidence += 0.15
      reasons.push('Morning preferred time')
    } else if (hour >= 14 && hour <= 16) {
      confidence += 0.1
      reasons.push('Afternoon preferred time')
    } else if (hour >= 17 && hour <= 19) {
      confidence += 0.05
      reasons.push('Early evening availability')
    }

    // Client preference analysis
    if (clientProfile?.preferredTimes?.includes(timeString)) {
      confidence += 0.25
      reasons.push('Matches client preference')
      preference = 'high'
    }

    // Loyalty consideration
    if (clientProfile?.loyalty === 'vip') {
      confidence += 0.1
      reasons.push('VIP client priority')
    } else if (clientProfile?.loyalty === 'new') {
      // Give new clients slightly better times
      if (hour >= 10 && hour <= 15) {
        confidence += 0.05
        reasons.push('New client accommodation')
      }
    }

    // No-show risk assessment
    if (clientProfile && clientProfile.noShowRate > 0.2) {
      confidence -= 0.1
      reasons.push('Higher no-show risk')
    }

    // Buffer time consideration
    const hasBufferBefore = this.hasAdequateBuffer(time, dayAppointments, 'before')
    const hasBufferAfter = this.hasAdequateBuffer(time, dayAppointments, 'after')
    
    if (hasBufferBefore && hasBufferAfter) {
      confidence += 0.1
      reasons.push('Adequate buffer time')
    }

    // Same-day appointments (avoid overbooking)
    const appointmentCount = dayAppointments.length
    if (appointmentCount < 4) {
      confidence += 0.05
    } else if (appointmentCount > 8) {
      confidence -= 0.1
      reasons.push('Heavy booking day')
    }

    // Service-specific adjustments
    if (serviceType.toLowerCase().includes('consultation')) {
      // Consultations work better in quieter times
      if (hour >= 10 && hour <= 12) {
        confidence += 0.1
        reasons.push('Optimal for consultations')
      }
    }

    // Final confidence normalization
    confidence = Math.max(0, Math.min(1, confidence))

    return {
      time: timeString,
      date: time,
      confidence,
      reason: reasons.join('; '),
      duration: 60, // Default duration
      available: true,
      preference
    }
  }

  /**
   * Check if a time slot is available (no conflicts)
   */
  private isTimeSlotAvailable(
    startTime: Date,
    endTime: Date,
    existingAppointments: BookingResponse[]
  ): boolean {
    return !existingAppointments.some(appointment => {
      const aptStart = new Date(appointment.start_time)
      const aptEnd = appointment.end_time 
        ? new Date(appointment.end_time)
        : addMinutes(aptStart, 60) // Assume 60 min if no end time

      // Check for any overlap
      return (startTime < aptEnd && endTime > aptStart)
    })
  }

  /**
   * Check if time is in peak business hours
   */
  private isInPeakHours(timeString: string): boolean {
    return this.businessRules.peakHours.some(peak => {
      return timeString >= peak.start && timeString <= peak.end
    })
  }

  /**
   * Check if time is during lunch break
   */
  private isInLunchBreak(timeString: string): boolean {
    if (!this.businessRules.lunchBreak) return false
    return timeString >= this.businessRules.lunchBreak.start && 
           timeString <= this.businessRules.lunchBreak.end
  }

  /**
   * Check buffer time around appointments
   */
  private hasAdequateBuffer(
    time: Date,
    dayAppointments: BookingResponse[],
    direction: 'before' | 'after'
  ): boolean {
    const bufferMinutes = this.businessRules.bufferTime
    
    return !dayAppointments.some(appointment => {
      const aptStart = new Date(appointment.start_time)
      const aptEnd = appointment.end_time 
        ? new Date(appointment.end_time)
        : addMinutes(aptStart, 60)

      if (direction === 'before') {
        const bufferStart = addMinutes(time, -bufferMinutes)
        return bufferStart < aptEnd && time > aptStart
      } else {
        const bufferEnd = addMinutes(time, bufferMinutes)
        return time < aptEnd && bufferEnd > aptStart
      }
    })
  }

  /**
   * Parse time string and combine with date
   */
  private parseTime(timeString: string, date: Date): Date {
    const [hours, minutes] = timeString.split(':').map(Number)
    const result = new Date(date)
    result.setHours(hours, minutes, 0, 0)
    return result
  }
}

// Default business rules for a barbershop
export const defaultBusinessRules: BusinessRules = {
  operatingHours: { start: '09:00', end: '19:00' },
  lunchBreak: { start: '12:30', end: '13:30' },
  bufferTime: 15,
  peakHours: [
    { start: '10:00', end: '12:00' },
    { start: '15:00', end: '17:00' }
  ],
  minimumAdvanceBooking: 2,
  maximumAdvanceBooking: 30
}

// Create singleton instance
export const aiTimeSuggestions = new AITimeSuggestionEngine(defaultBusinessRules)

// Export utility functions
export function formatTimeSlotSuggestion(slot: TimeSlot): string {
  const confidence = Math.round(slot.confidence * 100)
  return `${slot.time} (${confidence}% match - ${slot.reason})`
}

export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return 'text-green-600'
  if (confidence >= 0.6) return 'text-blue-600'
  if (confidence >= 0.4) return 'text-yellow-600'
  return 'text-gray-600'
}

export function getPreferenceIcon(preference: TimeSlot['preference']): string {
  switch (preference) {
    case 'high': return '⭐'
    case 'medium': return '👍'
    case 'low': return '💡'
    default: return '🕐'
  }
}