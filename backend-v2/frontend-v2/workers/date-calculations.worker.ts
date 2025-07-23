// Date calculations Web Worker for performance optimization
// Handles complex date operations off the main thread

interface DateCalculationTask {
  id: string
  type: 'generateTimeSlots' | 'findAvailableSlots' | 'calculateRecurring' | 'optimizeSchedule' | 'validateTimeRange'
  payload: any
}

interface TimeSlot {
  start: string
  end: string
  available: boolean
  appointmentId?: number
  reason?: string
}

interface RecurringPattern {
  frequency: 'daily' | 'weekly' | 'monthly'
  interval: number
  daysOfWeek?: number[]
  endDate?: string
  maxOccurrences?: number
}

interface AppointmentData {
  id: number
  start_time: string
  end_time: string
  service_duration: number
  buffer_time?: number
}

interface AvailabilityRules {
  workingHours: {
    start: string
    end: string
  }
  workingDays: number[]
  breaks: {
    start: string
    end: string
  }[]
  minimumBookingNotice: number // hours
  maximumBookingAdvance: number // days
}

// Utility functions for date operations
const dateUtils = {
  // Parse date string to Date object
  parseDate(dateStr: string): Date {
    return new Date(dateStr)
  },

  // Format date to ISO string
  formatDate(date: Date): string {
    return date.toISOString()
  },

  // Add minutes to a date
  addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60000)
  },

  // Add days to a date
  addDays(date: Date, days: number): Date {
    const result = new Date(date)
    result.setDate(result.getDate() + days)
    return result
  },

  // Check if date is within working hours
  isWithinWorkingHours(date: Date, workingHours: { start: string; end: string }): boolean {
    const timeStr = date.toTimeString().substring(0, 5) // HH:MM
    return timeStr >= workingHours.start && timeStr <= workingHours.end
  },

  // Check if date is on working day
  isWorkingDay(date: Date, workingDays: number[]): boolean {
    return workingDays.includes(date.getDay())
  },

  // Check if time slot overlaps with existing appointment
  hasOverlap(slot: TimeSlot, appointments: AppointmentData[]): boolean {
    const slotStart = this.parseDate(slot.start)
    const slotEnd = this.parseDate(slot.end)

    return appointments.some(apt => {
      const aptStart = this.parseDate(apt.start_time)
      const aptEnd = this.parseDate(apt.end_time)

      return slotStart < aptEnd && slotEnd > aptStart
    })
  },

  // Get week boundaries
  getWeekBoundaries(date: Date): { start: Date; end: Date } {
    const start = new Date(date)
    start.setDate(date.getDate() - date.getDay())
    start.setHours(0, 0, 0, 0)

    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    end.setHours(23, 59, 59, 999)

    return { start, end }
  },

  // Get month boundaries
  getMonthBoundaries(date: Date): { start: Date; end: Date } {
    const start = new Date(date.getFullYear(), date.getMonth(), 1)
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
    return { start, end }
  }
}

// Main calculation functions
const calculations = {
  // Generate time slots for a given date range
  generateTimeSlots(
    startDate: string,
    endDate: string,
    slotDuration: number,
    availabilityRules: AvailabilityRules,
    existingAppointments: AppointmentData[]
  ): TimeSlot[] {
    const slots: TimeSlot[] = []
    const start = dateUtils.parseDate(startDate)
    const end = dateUtils.parseDate(endDate)
    
    let currentDate = new Date(start)
    
    while (currentDate <= end) {
      if (dateUtils.isWorkingDay(currentDate, availabilityRules.workingDays)) {
        const dailySlots = this.generateDailyTimeSlots(
          currentDate,
          slotDuration,
          availabilityRules,
          existingAppointments
        )
        slots.push(...dailySlots)
      }
      currentDate = dateUtils.addDays(currentDate, 1)
    }
    
    return slots
  },

  // Generate time slots for a single day
  generateDailyTimeSlots(
    date: Date,
    slotDuration: number,
    availabilityRules: AvailabilityRules,
    existingAppointments: AppointmentData[]
  ): TimeSlot[] {
    const slots: TimeSlot[] = []
    const workingStart = new Date(date)
    const [startHour, startMin] = availabilityRules.workingHours.start.split(':').map(Number)
    workingStart.setHours(startHour, startMin, 0, 0)
    
    const workingEnd = new Date(date)
    const [endHour, endMin] = availabilityRules.workingHours.end.split(':').map(Number)
    workingEnd.setHours(endHour, endMin, 0, 0)
    
    let currentTime = new Date(workingStart)
    
    while (currentTime < workingEnd) {
      const slotEnd = dateUtils.addMinutes(currentTime, slotDuration)
      
      if (slotEnd <= workingEnd) {
        const slot: TimeSlot = {
          start: dateUtils.formatDate(currentTime),
          end: dateUtils.formatDate(slotEnd),
          available: true
        }
        
        // Check availability
        if (this.isSlotDuringBreak(currentTime, slotEnd, availabilityRules.breaks)) {
          slot.available = false
          slot.reason = 'During break time'
        } else if (this.isSlotTooSoon(currentTime, availabilityRules.minimumBookingNotice)) {
          slot.available = false
          slot.reason = 'Too soon to book'
        } else if (this.isSlotTooFar(currentTime, availabilityRules.maximumBookingAdvance)) {
          slot.available = false
          slot.reason = 'Too far in advance'
        } else if (dateUtils.hasOverlap(slot, existingAppointments)) {
          slot.available = false
          slot.reason = 'Time slot occupied'
          
          // Find the conflicting appointment
          const conflictingApt = existingAppointments.find(apt => {
            const aptStart = dateUtils.parseDate(apt.start_time)
            const aptEnd = dateUtils.parseDate(apt.end_time)
            const slotStart = dateUtils.parseDate(slot.start)
            const slotEnd = dateUtils.parseDate(slot.end)
            return slotStart < aptEnd && slotEnd > aptStart
          })
          
          if (conflictingApt) {
            slot.appointmentId = conflictingApt.id
          }
        }
        
        slots.push(slot)
      }
      
      currentTime = dateUtils.addMinutes(currentTime, slotDuration)
    }
    
    return slots
  },

  // Check if slot is during break time
  isSlotDuringBreak(
    slotStart: Date,
    slotEnd: Date,
    breaks: { start: string; end: string }[]
  ): boolean {
    return breaks.some(breakTime => {
      const breakStart = new Date(slotStart)
      const [startHour, startMin] = breakTime.start.split(':').map(Number)
      breakStart.setHours(startHour, startMin, 0, 0)
      
      const breakEnd = new Date(slotStart)
      const [endHour, endMin] = breakTime.end.split(':').map(Number)
      breakEnd.setHours(endHour, endMin, 0, 0)
      
      return slotStart < breakEnd && slotEnd > breakStart
    })
  },

  // Check if slot is too soon to book
  isSlotTooSoon(slotStart: Date, minimumNoticeHours: number): boolean {
    const now = new Date()
    const minBookingTime = dateUtils.addMinutes(now, minimumNoticeHours * 60)
    return slotStart < minBookingTime
  },

  // Check if slot is too far in advance
  isSlotTooFar(slotStart: Date, maximumAdvanceDays: number): boolean {
    const now = new Date()
    const maxBookingTime = dateUtils.addDays(now, maximumAdvanceDays)
    return slotStart > maxBookingTime
  },

  // Find available slots for a specific duration
  findAvailableSlots(
    date: string,
    duration: number,
    availabilityRules: AvailabilityRules,
    existingAppointments: AppointmentData[],
    maxResults: number = 10
  ): TimeSlot[] {
    const allSlots = this.generateTimeSlots(
      date,
      date,
      duration,
      availabilityRules,
      existingAppointments
    )
    
    return allSlots
      .filter(slot => slot.available)
      .slice(0, maxResults)
  },

  // Calculate recurring appointment dates
  calculateRecurringDates(
    startDate: string,
    pattern: RecurringPattern,
    availabilityRules: AvailabilityRules
  ): string[] {
    const dates: string[] = []
    const start = dateUtils.parseDate(startDate)
    const endDate = pattern.endDate ? dateUtils.parseDate(pattern.endDate) : null
    
    let currentDate = new Date(start)
    let occurrenceCount = 0
    
    while (
      (!endDate || currentDate <= endDate) &&
      (!pattern.maxOccurrences || occurrenceCount < pattern.maxOccurrences)
    ) {
      // Check if date matches pattern
      if (this.matchesRecurringPattern(currentDate, start, pattern, availabilityRules)) {
        dates.push(dateUtils.formatDate(currentDate))
        occurrenceCount++
      }
      
      // Move to next potential date
      if (pattern.frequency === 'daily') {
        currentDate = dateUtils.addDays(currentDate, pattern.interval)
      } else if (pattern.frequency === 'weekly') {
        currentDate = dateUtils.addDays(currentDate, pattern.interval * 7)
      } else if (pattern.frequency === 'monthly') {
        const newMonth = currentDate.getMonth() + pattern.interval
        currentDate.setMonth(newMonth)
      }
    }
    
    return dates
  },

  // Check if date matches recurring pattern
  matchesRecurringPattern(
    date: Date,
    originalDate: Date,
    pattern: RecurringPattern,
    availabilityRules: AvailabilityRules
  ): boolean {
    // Check if it's a working day
    if (!dateUtils.isWorkingDay(date, availabilityRules.workingDays)) {
      return false
    }
    
    // Check specific days of week if specified
    if (pattern.daysOfWeek && !pattern.daysOfWeek.includes(date.getDay())) {
      return false
    }
    
    return true
  },

  // Optimize schedule for maximum utilization
  optimizeSchedule(
    appointments: AppointmentData[],
    availabilityRules: AvailabilityRules,
    optimizationTarget: 'time' | 'revenue' | 'satisfaction' = 'time'
  ): {
    optimizedSchedule: AppointmentData[]
    improvementScore: number
    suggestions: string[]
  } {
    const optimizedSchedule = [...appointments]
    const suggestions: string[] = []
    
    // Sort appointments by start time
    optimizedSchedule.sort((a, b) => 
      dateUtils.parseDate(a.start_time).getTime() - dateUtils.parseDate(b.start_time).getTime()
    )
    
    // Calculate gaps and suggest improvements
    let totalGapTime = 0
    
    for (let i = 0; i < optimizedSchedule.length - 1; i++) {
      const current = optimizedSchedule[i]
      const next = optimizedSchedule[i + 1]
      
      const currentEnd = dateUtils.parseDate(current.end_time)
      const nextStart = dateUtils.parseDate(next.start_time)
      
      const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60)
      
      if (gapMinutes > 30) {
        totalGapTime += gapMinutes
        suggestions.push(`${gapMinutes} minute gap between appointments at ${currentEnd.toLocaleTimeString()}`)
      }
    }
    
    // Calculate improvement score
    const totalScheduledTime = appointments.reduce((total, apt) => {
      const start = dateUtils.parseDate(apt.start_time)
      const end = dateUtils.parseDate(apt.end_time)
      return total + (end.getTime() - start.getTime())
    }, 0)
    
    const utilizationRate = totalScheduledTime / (totalScheduledTime + totalGapTime * 60000)
    const improvementScore = Math.round(utilizationRate * 100)
    
    if (totalGapTime < 30) {
      suggestions.push('Schedule is well optimized with minimal gaps')
    } else {
      suggestions.push(`Consider booking shorter services during ${totalGapTime} minutes of gap time`)
    }
    
    return {
      optimizedSchedule,
      improvementScore,
      suggestions
    }
  },

  // Validate time range for conflicts
  validateTimeRange(
    startTime: string,
    endTime: string,
    existingAppointments: AppointmentData[],
    availabilityRules: AvailabilityRules
  ): {
    isValid: boolean
    conflicts: string[]
    warnings: string[]
  } {
    const conflicts: string[] = []
    const warnings: string[] = []
    const start = dateUtils.parseDate(startTime)
    const end = dateUtils.parseDate(endTime)
    
    // Check basic validations
    if (start >= end) {
      conflicts.push('End time must be after start time')
    }
    
    if (!dateUtils.isWorkingDay(start, availabilityRules.workingDays)) {
      conflicts.push('Selected day is not a working day')
    }
    
    if (!dateUtils.isWithinWorkingHours(start, availabilityRules.workingHours) ||
        !dateUtils.isWithinWorkingHours(end, availabilityRules.workingHours)) {
      conflicts.push('Time is outside working hours')
    }
    
    // Check for overlaps with existing appointments
    const hasOverlap = existingAppointments.some(apt => {
      const aptStart = dateUtils.parseDate(apt.start_time)
      const aptEnd = dateUtils.parseDate(apt.end_time)
      return start < aptEnd && end > aptStart
    })
    
    if (hasOverlap) {
      conflicts.push('Time slot conflicts with existing appointment')
    }
    
    // Check breaks
    if (this.isSlotDuringBreak(start, end, availabilityRules.breaks)) {
      conflicts.push('Time slot overlaps with break time')
    }
    
    // Warnings
    if (this.isSlotTooSoon(start, availabilityRules.minimumBookingNotice)) {
      warnings.push(`Booking should be made at least ${availabilityRules.minimumBookingNotice} hours in advance`)
    }
    
    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings
    }
  }
}

// Message handler
self.onmessage = function(e: MessageEvent<DateCalculationTask>) {
  const { id, type, payload } = e.data
  let result: any
  
  try {
    switch (type) {
      case 'generateTimeSlots':
        result = calculations.generateTimeSlots(
          payload.startDate,
          payload.endDate,
          payload.slotDuration,
          payload.availabilityRules,
          payload.existingAppointments
        )
        break
        
      case 'findAvailableSlots':
        result = calculations.findAvailableSlots(
          payload.date,
          payload.duration,
          payload.availabilityRules,
          payload.existingAppointments,
          payload.maxResults
        )
        break
        
      case 'calculateRecurring':
        result = calculations.calculateRecurringDates(
          payload.startDate,
          payload.pattern,
          payload.availabilityRules
        )
        break
        
      case 'optimizeSchedule':
        result = calculations.optimizeSchedule(
          payload.appointments,
          payload.availabilityRules,
          payload.optimizationTarget
        )
        break
        
      case 'validateTimeRange':
        result = calculations.validateTimeRange(
          payload.startTime,
          payload.endTime,
          payload.existingAppointments,
          payload.availabilityRules
        )
        break
        
      default:
        throw new Error(`Unknown task type: ${type}`)
    }
    
    self.postMessage({
      id,
      success: true,
      result
    })
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}

// Export types for TypeScript (won't be used in worker context)
export type { DateCalculationTask, TimeSlot, RecurringPattern, AppointmentData, AvailabilityRules }