/**
 * Advanced appointment conflict detection and resolution system
 * Handles scheduling conflicts, double-booking prevention, and smart resolution suggestions
 */

import { parseAPIDate } from '@/lib/timezone'
import { addMinutes, isWithinInterval, startOfDay, endOfDay } from 'date-fns'

export interface Appointment {
  id: number
  start_time: string
  end_time?: string
  duration_minutes?: number
  barber_id?: number
  barber_name?: string
  client_name?: string
  service_name: string
  status: string
}

export interface ConflictInfo {
  type: 'overlap' | 'adjacent' | 'double_booking' | 'barber_unavailable'
  severity: 'critical' | 'warning' | 'info'
  conflictingAppointment: Appointment
  overlapMinutes: number
  message: string
}

export interface ConflictResolution {
  type: 'reschedule' | 'adjust_duration' | 'change_barber' | 'split_appointment'
  suggestedStartTime?: string
  suggestedEndTime?: string
  suggestedBarberId?: number
  adjustedDuration?: number
  message: string
  confidence: number // 0-100, how confident we are this is a good solution
}

export interface ConflictAnalysis {
  hasConflicts: boolean
  conflicts: ConflictInfo[]
  resolutions: ConflictResolution[]
  riskScore: number // 0-100, overall scheduling risk
}

class AppointmentConflictManager {
  private readonly BUFFER_TIME_MINUTES = 15 // Default buffer between appointments
  private readonly WORKING_HOURS = { start: 8, end: 20 } // Default working hours

  /**
   * Analyze conflicts for a new or moved appointment
   */
  analyzeConflicts(
    targetAppointment: Omit<Appointment, 'id'> & { id?: number },
    existingAppointments: Appointment[],
    options: {
      bufferTime?: number
      checkBarberAvailability?: boolean
      workingHours?: { start: number; end: number }
      allowAdjacent?: boolean
    } = {}
  ): ConflictAnalysis {
    const {
      bufferTime = this.BUFFER_TIME_MINUTES,
      checkBarberAvailability = true,
      workingHours = this.WORKING_HOURS,
      allowAdjacent = false
    } = options

    const conflicts: ConflictInfo[] = []
    const resolutions: ConflictResolution[] = []

    // Parse target appointment times
    const targetStart = parseAPIDate(targetAppointment.start_time)
    const targetEnd = this.getAppointmentEndTime(targetAppointment)

    // Filter out the appointment being moved (if it's an update)
    const relevantAppointments = existingAppointments.filter(
      apt => apt.id !== targetAppointment.id
    )

    // Check for direct time conflicts
    relevantAppointments.forEach(existing => {
      const existingStart = parseAPIDate(existing.start_time)
      const existingEnd = this.getAppointmentEndTime(existing)

      // Skip if different barbers (unless checking overall availability)
      if (checkBarberAvailability && 
          targetAppointment.barber_id && 
          existing.barber_id && 
          targetAppointment.barber_id !== existing.barber_id) {
        return
      }

      const conflict = this.detectTimeConflict(
        { start: targetStart, end: targetEnd },
        { start: existingStart, end: existingEnd },
        existing,
        bufferTime,
        allowAdjacent
      )

      if (conflict) {
        conflicts.push(conflict)
      }
    })

    // Check working hours
    const workingHoursConflict = this.checkWorkingHours(
      targetStart,
      targetEnd,
      workingHours
    )
    if (workingHoursConflict) {
      conflicts.push(workingHoursConflict)
    }

    // Generate resolution suggestions
    if (conflicts.length > 0) {
      const suggestedResolutions = this.generateResolutions(
        targetAppointment,
        relevantAppointments,
        conflicts,
        { bufferTime, workingHours }
      )
      resolutions.push(...suggestedResolutions)
    }

    const riskScore = this.calculateRiskScore(conflicts)

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      resolutions: resolutions.sort((a, b) => b.confidence - a.confidence),
      riskScore
    }
  }

  /**
   * Find the next available time slot for an appointment
   */
  findNextAvailableSlot(
    appointment: Omit<Appointment, 'id'>,
    existingAppointments: Appointment[],
    searchOptions: {
      startAfter?: Date
      searchDays?: number
      preferredTimes?: { start: number; end: number }[]
      bufferTime?: number
    } = {}
  ): { start: Date; end: Date; confidence: number } | null {
    const {
      startAfter = new Date(),
      searchDays = 7,
      preferredTimes = [{ start: 9, end: 17 }],
      bufferTime = this.BUFFER_TIME_MINUTES
    } = searchOptions

    const duration = appointment.duration_minutes || 60
    const searchStart = startAfter > parseAPIDate(appointment.start_time) 
      ? startAfter 
      : parseAPIDate(appointment.start_time)

    // Search through each day
    for (let dayOffset = 0; dayOffset < searchDays; dayOffset++) {
      const searchDay = addMinutes(startOfDay(searchStart), dayOffset * 24 * 60)

      for (const timeSlot of preferredTimes) {
        const dayStart = new Date(searchDay)
        dayStart.setHours(timeSlot.start, 0, 0, 0)
        
        const dayEnd = new Date(searchDay)
        dayEnd.setHours(timeSlot.end, 0, 0, 0)

        // Check 15-minute intervals throughout the day
        for (let minutes = 0; minutes < (timeSlot.end - timeSlot.start) * 60; minutes += 15) {
          const slotStart = addMinutes(dayStart, minutes)
          const slotEnd = addMinutes(slotStart, duration + bufferTime)

          if (slotEnd > dayEnd) break

          // Check if this slot conflicts with existing appointments
          const hasConflict = existingAppointments.some(existing => {
            if (appointment.barber_id && existing.barber_id && 
                appointment.barber_id !== existing.barber_id) {
              return false
            }

            const existingStart = parseAPIDate(existing.start_time)
            const existingEnd = this.getAppointmentEndTime(existing)

            return this.timeRangesOverlap(
              { start: slotStart, end: slotEnd },
              { start: existingStart, end: existingEnd }
            )
          })

          if (!hasConflict) {
            const confidence = this.calculateSlotConfidence(
              slotStart,
              appointment,
              existingAppointments
            )

            return {
              start: slotStart,
              end: addMinutes(slotStart, duration),
              confidence
            }
          }
        }
      }
    }

    return null
  }

  /**
   * Get suggestions for resolving scheduling conflicts
   */
  getConflictResolutionSuggestions(
    analysis: ConflictAnalysis,
    appointment: Omit<Appointment, 'id'>,
    existingAppointments: Appointment[],
    availableBarbers: { id: number; name: string }[] = []
  ): ConflictResolution[] {
    const resolutions: ConflictResolution[] = []

    // Suggestion 1: Reschedule to next available slot
    const nextSlot = this.findNextAvailableSlot(appointment, existingAppointments)
    if (nextSlot) {
      resolutions.push({
        type: 'reschedule',
        suggestedStartTime: nextSlot.start.toISOString(),
        suggestedEndTime: nextSlot.end.toISOString(),
        message: `Move to ${nextSlot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        confidence: nextSlot.confidence
      })
    }

    // Suggestion 2: Assign different barber
    if (availableBarbers.length > 1 && appointment.barber_id) {
      const alternativeBarbers = availableBarbers.filter(b => b.id !== appointment.barber_id)
      
      for (const barber of alternativeBarbers) {
        const testAppointment = { ...appointment, barber_id: barber.id }
        const testAnalysis = this.analyzeConflicts(testAppointment, existingAppointments)
        
        if (!testAnalysis.hasConflicts) {
          resolutions.push({
            type: 'change_barber',
            suggestedBarberId: barber.id,
            message: `Assign to ${barber.name}`,
            confidence: 85
          })
          break
        }
      }
    }

    // Suggestion 3: Adjust appointment duration
    if (appointment.duration_minutes && appointment.duration_minutes > 30) {
      const shorterDuration = Math.max(30, appointment.duration_minutes - 15)
      const testAppointment = { ...appointment, duration_minutes: shorterDuration }
      const testAnalysis = this.analyzeConflicts(testAppointment, existingAppointments)
      
      if (testAnalysis.conflicts.length < analysis.conflicts.length) {
        resolutions.push({
          type: 'adjust_duration',
          adjustedDuration: shorterDuration,
          message: `Reduce to ${shorterDuration} minutes`,
          confidence: 70
        })
      }
    }

    return resolutions.sort((a, b) => b.confidence - a.confidence)
  }

  private getAppointmentEndTime(appointment: Omit<Appointment, 'id'>): Date {
    if (appointment.end_time) {
      return parseAPIDate(appointment.end_time)
    }
    
    const start = parseAPIDate(appointment.start_time)
    const duration = appointment.duration_minutes || 60
    return addMinutes(start, duration)
  }

  private detectTimeConflict(
    target: { start: Date; end: Date },
    existing: { start: Date; end: Date },
    existingAppointment: Appointment,
    bufferTime: number,
    allowAdjacent: boolean
  ): ConflictInfo | null {
    // Add buffer time to check for adequate spacing
    const targetWithBuffer = {
      start: addMinutes(target.start, -bufferTime),
      end: addMinutes(target.end, bufferTime)
    }

    if (this.timeRangesOverlap(targetWithBuffer, existing)) {
      const overlapMinutes = this.calculateOverlapMinutes(target, existing)
      
      let type: ConflictInfo['type'] = 'overlap'
      let severity: ConflictInfo['severity'] = 'warning'
      let message = `Overlaps with ${existingAppointment.client_name || 'appointment'}`

      // Exact time conflict (same start/end)
      if (target.start.getTime() === existing.start.getTime() && 
          target.end.getTime() === existing.end.getTime()) {
        type = 'double_booking'
        severity = 'critical'
        message = `Double booking with ${existingAppointment.client_name || 'appointment'}`
      }
      // Adjacent appointments without buffer
      else if (overlapMinutes === 0 && !allowAdjacent) {
        type = 'adjacent'
        severity = 'info'
        message = `Back-to-back with ${existingAppointment.client_name || 'appointment'} (no buffer time)`
      }
      // Significant overlap
      else if (overlapMinutes > bufferTime) {
        severity = 'critical'
        message = `${overlapMinutes}min overlap with ${existingAppointment.client_name || 'appointment'}`
      }

      return {
        type,
        severity,
        conflictingAppointment: existingAppointment,
        overlapMinutes,
        message
      }
    }

    return null
  }

  private checkWorkingHours(
    start: Date,
    end: Date,
    workingHours: { start: number; end: number }
  ): ConflictInfo | null {
    const startHour = start.getHours()
    const endHour = end.getHours()

    if (startHour < workingHours.start || endHour > workingHours.end) {
      return {
        type: 'barber_unavailable',
        severity: 'warning',
        conflictingAppointment: {} as Appointment, // Placeholder
        overlapMinutes: 0,
        message: `Outside working hours (${workingHours.start}:00 - ${workingHours.end}:00)`
      }
    }

    return null
  }

  private timeRangesOverlap(
    range1: { start: Date; end: Date },
    range2: { start: Date; end: Date }
  ): boolean {
    return range1.start < range2.end && range1.end > range2.start
  }

  private calculateOverlapMinutes(
    range1: { start: Date; end: Date },
    range2: { start: Date; end: Date }
  ): number {
    const overlapStart = new Date(Math.max(range1.start.getTime(), range2.start.getTime()))
    const overlapEnd = new Date(Math.min(range1.end.getTime(), range2.end.getTime()))
    
    if (overlapStart >= overlapEnd) return 0
    
    return Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60))
  }

  private generateResolutions(
    appointment: Omit<Appointment, 'id'>,
    existingAppointments: Appointment[],
    conflicts: ConflictInfo[],
    options: { bufferTime: number; workingHours: { start: number; end: number } }
  ): ConflictResolution[] {
    const resolutions: ConflictResolution[] = []

    // Find next available slot
    const nextSlot = this.findNextAvailableSlot(appointment, existingAppointments)
    if (nextSlot) {
      resolutions.push({
        type: 'reschedule',
        suggestedStartTime: nextSlot.start.toISOString(),
        suggestedEndTime: nextSlot.end.toISOString(),
        message: `Reschedule to ${nextSlot.start.toLocaleString()}`,
        confidence: nextSlot.confidence
      })
    }

    return resolutions
  }

  private calculateRiskScore(conflicts: ConflictInfo[]): number {
    if (conflicts.length === 0) return 0

    let score = 0
    conflicts.forEach(conflict => {
      switch (conflict.severity) {
        case 'critical':
          score += 40
          break
        case 'warning':
          score += 20
          break
        case 'info':
          score += 10
          break
      }
    })

    return Math.min(100, score)
  }

  private calculateSlotConfidence(
    slotStart: Date,
    appointment: Omit<Appointment, 'id'>,
    existingAppointments: Appointment[]
  ): number {
    let confidence = 100

    // Prefer morning slots (9-12)
    const hour = slotStart.getHours()
    if (hour >= 9 && hour <= 12) {
      confidence += 10
    } else if (hour >= 13 && hour <= 16) {
      // Afternoon is neutral
    } else {
      confidence -= 20
    }

    // Check nearby appointments for spacing
    const nearbyAppointments = existingAppointments.filter(apt => {
      const aptStart = parseAPIDate(apt.start_time)
      const timeDiff = Math.abs(aptStart.getTime() - slotStart.getTime())
      return timeDiff < 2 * 60 * 60 * 1000 // Within 2 hours
    })

    confidence -= nearbyAppointments.length * 5

    return Math.max(0, Math.min(100, confidence))
  }
}

// Export singleton instance
export const conflictManager = new AppointmentConflictManager()

// Utility functions for common conflict scenarios
export const ConflictUtils = {
  /**
   * Quick check if appointment can be scheduled without conflicts
   */
  canSchedule(
    appointment: Omit<Appointment, 'id'>,
    existingAppointments: Appointment[]
  ): boolean {
    const analysis = conflictManager.analyzeConflicts(appointment, existingAppointments)
    return !analysis.hasConflicts || analysis.riskScore < 30
  },

  /**
   * Get human-readable conflict summary
   */
  getConflictSummary(analysis: ConflictAnalysis): string {
    if (!analysis.hasConflicts) {
      return 'No conflicts detected'
    }

    const criticalCount = analysis.conflicts.filter(c => c.severity === 'critical').length
    const warningCount = analysis.conflicts.filter(c => c.severity === 'warning').length

    if (criticalCount > 0) {
      return `${criticalCount} critical conflict${criticalCount > 1 ? 's' : ''} found`
    } else if (warningCount > 0) {
      return `${warningCount} scheduling warning${warningCount > 1 ? 's' : ''}`
    }

    return 'Minor scheduling issues detected'
  },

  /**
   * Get best resolution recommendation
   */
  getBestResolution(analysis: ConflictAnalysis): ConflictResolution | null {
    return analysis.resolutions.length > 0 ? analysis.resolutions[0] : null
  }
}