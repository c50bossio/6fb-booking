'use client'

/**
 * Appointment Conflict Detection System
 * Identifies and resolves scheduling conflicts in the calendar
 */

export interface Appointment {
  id: number
  service_name: string
  client_name: string
  appointment_date: string
  start_time: string
  end_time?: string
  duration?: number
  barber_name?: string
  barber_id?: number
  status?: string
}

export interface ConflictDetails {
  id: string
  type: 'time_overlap' | 'double_booking' | 'barber_unavailable' | 'business_hours'
  severity: 'low' | 'medium' | 'high' | 'critical'
  appointment1: Appointment
  appointment2?: Appointment
  conflictStart: Date
  conflictEnd: Date
  description: string
  suggestions: ConflictResolution[]
}

export interface ConflictResolution {
  id: string
  type: 'reschedule' | 'reassign_barber' | 'adjust_duration' | 'cancel'
  description: string
  newStartTime?: Date
  newEndTime?: Date
  newBarberId?: number
  newDuration?: number
  effort: 'low' | 'medium' | 'high'
  impact: 'minimal' | 'moderate' | 'significant'
}

export interface BusinessHours {
  [key: string]: { // day of week (0-6)
    isOpen: boolean
    openTime: string // "09:00"
    closeTime: string // "17:00"
    breaks?: { start: string; end: string }[]
  }
}

export interface BarberAvailability {
  barberId: number
  name: string
  workingHours: BusinessHours
  timeOff: { start: Date; end: Date; reason: string }[]
  maxConcurrentAppointments: number
}

/**
 * Main conflict detection class
 */
export class AppointmentConflictDetector {
  private appointments: Appointment[]
  private barberAvailability: BarberAvailability[]
  private businessHours: BusinessHours

  constructor(
    appointments: Appointment[],
    barberAvailability: BarberAvailability[] = [],
    businessHours: BusinessHours = this.getDefaultBusinessHours()
  ) {
    this.appointments = appointments
    this.barberAvailability = barberAvailability
    this.businessHours = businessHours
  }

  /**
   * Detect all conflicts in the current appointment set
   */
  detectAllConflicts(): ConflictDetails[] {
    const conflicts: ConflictDetails[] = []

    // Check each appointment against all others
    for (let i = 0; i < this.appointments.length; i++) {
      const apt1 = this.appointments[i]
      
      // Time overlap conflicts
      for (let j = i + 1; j < this.appointments.length; j++) {
        const apt2 = this.appointments[j]
        const timeConflict = this.detectTimeOverlap(apt1, apt2)
        if (timeConflict) {
          conflicts.push(timeConflict)
        }
      }

      // Business hours conflicts
      const businessHoursConflict = this.detectBusinessHoursConflict(apt1)
      if (businessHoursConflict) {
        conflicts.push(businessHoursConflict)
      }

      // Barber availability conflicts
      const barberConflict = this.detectBarberAvailabilityConflict(apt1)
      if (barberConflict) {
        conflicts.push(barberConflict)
      }
    }

    return conflicts
  }

  /**
   * Detect conflicts for a specific appointment
   */
  detectConflictsForAppointment(appointment: Appointment): ConflictDetails[] {
    const conflicts: ConflictDetails[] = []

    // Check against all other appointments
    this.appointments.forEach(other => {
      if (other.id !== appointment.id) {
        const conflict = this.detectTimeOverlap(appointment, other)
        if (conflict) {
          conflicts.push(conflict)
        }
      }
    })

    // Check business hours
    const businessHoursConflict = this.detectBusinessHoursConflict(appointment)
    if (businessHoursConflict) {
      conflicts.push(businessHoursConflict)
    }

    // Check barber availability
    const barberConflict = this.detectBarberAvailabilityConflict(appointment)
    if (barberConflict) {
      conflicts.push(barberConflict)
    }

    return conflicts
  }

  /**
   * Check if a proposed time slot would create conflicts
   */
  wouldCreateConflict(
    appointmentId: number,
    newDate: Date,
    newTime: string,
    duration: number = 60
  ): ConflictDetails[] {
    const endTime = new Date(newDate)
    endTime.setMinutes(endTime.getMinutes() + duration)

    const proposedAppointment: Appointment = {
      id: appointmentId,
      service_name: 'Proposed',
      client_name: 'Test',
      appointment_date: newDate.toISOString(),
      start_time: newDate.toISOString(),
      end_time: endTime.toISOString(),
      duration
    }

    return this.detectConflictsForAppointment(proposedAppointment)
  }

  /**
   * Detect time overlap between two appointments
   */
  private detectTimeOverlap(apt1: Appointment, apt2: Appointment): ConflictDetails | null {
    const start1 = new Date(apt1.start_time)
    const end1 = this.getAppointmentEndTime(apt1)
    const start2 = new Date(apt2.start_time)
    const end2 = this.getAppointmentEndTime(apt2)

    // Check if appointments are on the same date
    if (start1.toDateString() !== start2.toDateString()) {
      return null
    }

    // Check for time overlap
    const hasOverlap = start1 < end2 && start2 < end1

    if (hasOverlap) {
      const conflictStart = new Date(Math.max(start1.getTime(), start2.getTime()))
      const conflictEnd = new Date(Math.min(end1.getTime(), end2.getTime()))

      // Check if same barber (if specified)
      const sameBarber = apt1.barber_id && apt2.barber_id && apt1.barber_id === apt2.barber_id
      const severity = sameBarber ? 'critical' : 'high'

      return {
        id: `overlap_${apt1.id}_${apt2.id}`,
        type: 'time_overlap',
        severity,
        appointment1: apt1,
        appointment2: apt2,
        conflictStart,
        conflictEnd,
        description: `${apt1.service_name} and ${apt2.service_name} have overlapping times`,
        suggestions: this.generateResolutionSuggestions(apt1, apt2, 'time_overlap')
      }
    }

    return null
  }

  /**
   * Detect business hours conflicts
   */
  private detectBusinessHoursConflict(appointment: Appointment): ConflictDetails | null {
    const startTime = new Date(appointment.start_time)
    const endTime = this.getAppointmentEndTime(appointment)
    const dayOfWeek = startTime.getDay().toString()

    const businessDay = this.businessHours[dayOfWeek]
    if (!businessDay || !businessDay.isOpen) {
      return {
        id: `business_hours_${appointment.id}`,
        type: 'business_hours',
        severity: 'high',
        appointment1: appointment,
        conflictStart: startTime,
        conflictEnd: endTime,
        description: `${appointment.service_name} is scheduled outside business hours`,
        suggestions: this.generateResolutionSuggestions(appointment, null, 'business_hours')
      }
    }

    const openTime = this.parseTime(businessDay.openTime)
    const closeTime = this.parseTime(businessDay.closeTime)
    const aptStartTime = startTime.getHours() * 60 + startTime.getMinutes()
    const aptEndTime = endTime.getHours() * 60 + endTime.getMinutes()

    if (aptStartTime < openTime || aptEndTime > closeTime) {
      return {
        id: `business_hours_${appointment.id}`,
        type: 'business_hours',
        severity: 'high',
        appointment1: appointment,
        conflictStart: startTime,
        conflictEnd: endTime,
        description: `${appointment.service_name} extends outside business hours (${businessDay.openTime} - ${businessDay.closeTime})`,
        suggestions: this.generateResolutionSuggestions(appointment, null, 'business_hours')
      }
    }

    return null
  }

  /**
   * Detect barber availability conflicts
   */
  private detectBarberAvailabilityConflict(appointment: Appointment): ConflictDetails | null {
    if (!appointment.barber_id) return null

    const barber = this.barberAvailability.find(b => b.barberId === appointment.barber_id)
    if (!barber) return null

    const startTime = new Date(appointment.start_time)
    const endTime = this.getAppointmentEndTime(appointment)

    // Check if barber has time off
    const timeOffConflict = barber.timeOff.find(timeOff => 
      startTime < timeOff.end && endTime > timeOff.start
    )

    if (timeOffConflict) {
      return {
        id: `barber_unavailable_${appointment.id}`,
        type: 'barber_unavailable',
        severity: 'critical',
        appointment1: appointment,
        conflictStart: startTime,
        conflictEnd: endTime,
        description: `${barber.name} is unavailable (${timeOffConflict.reason})`,
        suggestions: this.generateResolutionSuggestions(appointment, null, 'barber_unavailable')
      }
    }

    return null
  }

  /**
   * Generate resolution suggestions for conflicts
   */
  private generateResolutionSuggestions(
    apt1: Appointment,
    apt2: Appointment | null,
    conflictType: ConflictDetails['type']
  ): ConflictResolution[] {
    const suggestions: ConflictResolution[] = []

    switch (conflictType) {
      case 'time_overlap':
        // Suggest rescheduling the later appointment
        if (apt2) {
          const laterApt = new Date(apt1.start_time) > new Date(apt2.start_time) ? apt1 : apt2
          const suggestedTime = this.findNextAvailableSlot(laterApt)
          
          if (suggestedTime) {
            suggestions.push({
              id: `reschedule_${laterApt.id}`,
              type: 'reschedule',
              description: `Reschedule ${laterApt.service_name} to ${suggestedTime.toLocaleTimeString()}`,
              newStartTime: suggestedTime,
              effort: 'low',
              impact: 'minimal'
            })
          }
        }
        break

      case 'business_hours':
        const suggestedBusinessTime = this.findNextAvailableBusinessSlot(apt1)
        if (suggestedBusinessTime) {
          suggestions.push({
            id: `reschedule_business_${apt1.id}`,
            type: 'reschedule',
            description: `Reschedule to ${suggestedBusinessTime.toLocaleTimeString()} during business hours`,
            newStartTime: suggestedBusinessTime,
            effort: 'low',
            impact: 'minimal'
          })
        }
        break

      case 'barber_unavailable':
        // Suggest reassigning to another barber
        const availableBarber = this.findAvailableBarber(apt1)
        if (availableBarber) {
          suggestions.push({
            id: `reassign_${apt1.id}`,
            type: 'reassign_barber',
            description: `Reassign to ${availableBarber.name}`,
            newBarberId: availableBarber.barberId,
            effort: 'low',
            impact: 'minimal'
          })
        }
        break
    }

    return suggestions
  }

  /**
   * Find next available time slot
   */
  private findNextAvailableSlot(appointment: Appointment): Date | null {
    const startTime = new Date(appointment.start_time)
    const duration = appointment.duration || 60
    
    // Start searching from 30 minutes after the original time
    const searchStart = new Date(startTime)
    searchStart.setMinutes(searchStart.getMinutes() + 30)

    // Search for the next 24 hours
    for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
      const candidateTime = new Date(searchStart)
      candidateTime.setMinutes(candidateTime.getMinutes() + minutes)

      if (this.isTimeSlotAvailable(candidateTime, duration, appointment.id)) {
        return candidateTime
      }
    }

    return null
  }

  /**
   * Find next available slot during business hours
   */
  private findNextAvailableBusinessSlot(appointment: Appointment): Date | null {
    const startTime = new Date(appointment.start_time)
    const duration = appointment.duration || 60

    // Search for the next 7 days
    for (let day = 0; day < 7; day++) {
      const candidateDate = new Date(startTime)
      candidateDate.setDate(candidateDate.getDate() + day)
      
      const dayOfWeek = candidateDate.getDay().toString()
      const businessDay = this.businessHours[dayOfWeek]
      
      if (!businessDay || !businessDay.isOpen) continue

      const openTime = this.parseTime(businessDay.openTime)
      const closeTime = this.parseTime(businessDay.closeTime)

      // Search within business hours
      for (let minutes = openTime; minutes <= closeTime - duration; minutes += 30) {
        const candidateTime = new Date(candidateDate)
        candidateTime.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0)

        if (this.isTimeSlotAvailable(candidateTime, duration, appointment.id)) {
          return candidateTime
        }
      }
    }

    return null
  }

  /**
   * Find available barber for appointment
   */
  private findAvailableBarber(appointment: Appointment): BarberAvailability | null {
    const startTime = new Date(appointment.start_time)
    const endTime = this.getAppointmentEndTime(appointment)

    return this.barberAvailability.find(barber => {
      // Skip current barber
      if (barber.barberId === appointment.barber_id) return false

      // Check if barber has time off
      const hasTimeOff = barber.timeOff.some(timeOff =>
        startTime < timeOff.end && endTime > timeOff.start
      )

      return !hasTimeOff
    }) || null
  }

  /**
   * Check if a time slot is available
   */
  private isTimeSlotAvailable(startTime: Date, duration: number, excludeAppointmentId?: number): boolean {
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + duration)

    return !this.appointments.some(apt => {
      if (excludeAppointmentId && apt.id === excludeAppointmentId) return false

      const aptStart = new Date(apt.start_time)
      const aptEnd = this.getAppointmentEndTime(apt)

      return startTime < aptEnd && endTime > aptStart
    })
  }

  /**
   * Get appointment end time
   */
  private getAppointmentEndTime(appointment: Appointment): Date {
    if (appointment.end_time) {
      return new Date(appointment.end_time)
    }

    const startTime = new Date(appointment.start_time)
    const duration = appointment.duration || 60 // Default 1 hour
    const endTime = new Date(startTime)
    endTime.setMinutes(endTime.getMinutes() + duration)
    
    return endTime
  }

  /**
   * Parse time string to minutes
   */
  private parseTime(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Get default business hours
   */
  private getDefaultBusinessHours(): BusinessHours {
    return {
      '0': { isOpen: false, openTime: '09:00', closeTime: '17:00' }, // Sunday
      '1': { isOpen: true, openTime: '09:00', closeTime: '17:00' },  // Monday
      '2': { isOpen: true, openTime: '09:00', closeTime: '17:00' },  // Tuesday
      '3': { isOpen: true, openTime: '09:00', closeTime: '17:00' },  // Wednesday
      '4': { isOpen: true, openTime: '09:00', closeTime: '17:00' },  // Thursday
      '5': { isOpen: true, openTime: '09:00', closeTime: '18:00' },  // Friday
      '6': { isOpen: true, openTime: '09:00', closeTime: '16:00' }   // Saturday
    }
  }
}

/**
 * Hook for using conflict detection in React components
 */
export function useConflictDetection(
  appointments: Appointment[],
  barberAvailability?: BarberAvailability[],
  businessHours?: BusinessHours
) {
  const detector = new AppointmentConflictDetector(appointments, barberAvailability, businessHours)

  const detectAllConflicts = () => detector.detectAllConflicts()
  
  const detectConflictsForAppointment = (appointment: Appointment) => 
    detector.detectConflictsForAppointment(appointment)
  
  const wouldCreateConflict = (appointmentId: number, newDate: Date, newTime: string, duration?: number) =>
    detector.wouldCreateConflict(appointmentId, newDate, newTime, duration)

  return {
    detectAllConflicts,
    detectConflictsForAppointment,
    wouldCreateConflict,
    detector
  }
}