import { CalendarAppointment } from './PremiumCalendar'
import { TimeSlotSuggestion, ConflictingAppointment } from '../modals/ConflictResolutionModal'
import { addDays, isSameDay, isToday, isTomorrow, startOfDay, parseISO, format } from 'date-fns'

export interface SuggestionOptions {
  /** Maximum number of days to look ahead */
  maxDaysAhead: number
  /** Preferred time of day (morning, afternoon, evening) */
  preferredPeriod?: 'morning' | 'afternoon' | 'evening'
  /** Working hours start time */
  workingHoursStart: string
  /** Working hours end time */
  workingHoursEnd: string
  /** Time slot interval in minutes */
  slotInterval: number
  /** Maximum number of suggestions to return */
  maxSuggestions: number
  /** Whether to prioritize same-day suggestions */
  prioritizeSameDay: boolean
  /** Whether to look for nearby time slots first */
  prioritizeNearbyTimes: boolean
}

export class ConflictResolutionService {
  private appointments: CalendarAppointment[]
  private options: SuggestionOptions

  constructor(appointments: CalendarAppointment[], options: Partial<SuggestionOptions> = {}) {
    this.appointments = appointments
    this.options = {
      maxDaysAhead: 14,
      workingHoursStart: '08:00',
      workingHoursEnd: '20:00',
      slotInterval: 15,
      maxSuggestions: 10,
      prioritizeSameDay: true,
      prioritizeNearbyTimes: true,
      ...options
    }
  }

  /**
   * Generate smart time slot suggestions for a conflicted appointment
   */
  generateSuggestions(
    draggedAppointment: CalendarAppointment,
    targetDate: string,
    targetTime: string,
    barberId: number
  ): TimeSlotSuggestion[] {
    const suggestions: TimeSlotSuggestion[] = []
    const targetDateTime = new Date(`${targetDate} ${targetTime}`)

    // Get barber's existing appointments
    const barberAppointments = this.appointments.filter(apt => apt.barberId === barberId)

    // Generate suggestions for multiple days
    for (let dayOffset = 0; dayOffset <= this.options.maxDaysAhead; dayOffset++) {
      const date = addDays(parseISO(targetDate), dayOffset)
      const dateStr = format(date, 'yyyy-MM-dd')

      // Skip past dates
      if (date < startOfDay(new Date())) continue

      const daySuggestions = this.generateDaySuggestions(
        draggedAppointment,
        dateStr,
        targetTime,
        barberAppointments,
        dayOffset === 0 // isSameDay
      )

      suggestions.push(...daySuggestions)
    }

    // Sort suggestions by score (descending) and return top suggestions
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, this.options.maxSuggestions)
  }

  /**
   * Generate suggestions for a specific day
   */
  private generateDaySuggestions(
    draggedAppointment: CalendarAppointment,
    date: string,
    originalTime: string,
    barberAppointments: CalendarAppointment[],
    isSameDay: boolean
  ): TimeSlotSuggestion[] {
    const suggestions: TimeSlotSuggestion[] = []
    const dayAppointments = barberAppointments.filter(apt => apt.date === date)

    // Generate all possible time slots for the day
    const timeSlots = this.generateTimeSlots()

    for (const time of timeSlots) {
      if (this.isTimeSlotAvailable(time, draggedAppointment.duration, dayAppointments, draggedAppointment.id)) {
        const suggestion = this.createSuggestion(
          date,
          time,
          draggedAppointment.duration,
          originalTime,
          isSameDay
        )

        suggestions.push(suggestion)
      }
    }

    return suggestions
  }

  /**
   * Create a time slot suggestion with scoring
   */
  private createSuggestion(
    date: string,
    time: string,
    duration: number,
    originalTime: string,
    isSameDay: boolean
  ): TimeSlotSuggestion {
    const endTime = this.calculateEndTime(time, duration)
    let score = 100 // Base score
    let reason = ''
    let priority: 'high' | 'medium' | 'low' = 'medium'

    const dateObj = parseISO(date)
    const [originalHour] = originalTime.split(':').map(Number)
    const [suggestionHour] = time.split(':').map(Number)
    const timeDifference = Math.abs(originalHour - suggestionHour)

    // Scoring factors
    if (isSameDay) {
      score += 50
      reason += 'Same day, '
      priority = 'high'
    } else if (isToday(dateObj)) {
      score += 30
      reason += 'Today, '
    } else if (isTomorrow(dateObj)) {
      score += 20
      reason += 'Tomorrow, '
    }

    // Time proximity bonus
    if (timeDifference <= 1) {
      score += 30
      reason += 'very close to original time'
      if (priority === 'medium') priority = 'high'
    } else if (timeDifference <= 2) {
      score += 20
      reason += 'close to original time'
    } else if (timeDifference <= 3) {
      score += 10
      reason += 'nearby time'
    } else {
      reason += 'available slot'
    }

    // Preferred time periods
    if (this.options.preferredPeriod) {
      const period = this.getTimePeriod(time)
      if (period === this.options.preferredPeriod) {
        score += 15
        reason += `, preferred ${period}`
      }
    }

    // Prime time bonuses (avoid very early or very late slots)
    if (suggestionHour >= 9 && suggestionHour <= 17) {
      score += 10
    } else if (suggestionHour < 8 || suggestionHour > 18) {
      score -= 10
      priority = 'low'
    }

    // Weekend penalty (if applicable)
    const dayOfWeek = dateObj.getDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      score -= 5
    }

    return {
      date,
      time,
      endTime,
      score: Math.max(0, score),
      reason: reason.replace(/,\s*$/, '') || 'Available time slot',
      priority
    }
  }

  /**
   * Check if a time slot is available for booking
   */
  private isTimeSlotAvailable(
    time: string,
    duration: number,
    dayAppointments: CalendarAppointment[],
    excludeId?: string
  ): boolean {
    const startTime = this.timeToMinutes(time)
    const endTime = startTime + duration

    for (const appointment of dayAppointments) {
      if (excludeId && appointment.id === excludeId) continue

      const aptStart = this.timeToMinutes(appointment.startTime)
      const aptEnd = this.timeToMinutes(appointment.endTime)

      // Check for overlap
      if (startTime < aptEnd && endTime > aptStart) {
        return false
      }
    }

    return true
  }

  /**
   * Generate all possible time slots within working hours
   */
  private generateTimeSlots(): string[] {
    const slots: string[] = []
    const startMinutes = this.timeToMinutes(this.options.workingHoursStart)
    const endMinutes = this.timeToMinutes(this.options.workingHoursEnd)

    for (let minutes = startMinutes; minutes < endMinutes; minutes += this.options.slotInterval) {
      slots.push(this.minutesToTime(minutes))
    }

    return slots
  }

  /**
   * Calculate end time given start time and duration
   */
  private calculateEndTime(startTime: string, duration: number): string {
    const startMinutes = this.timeToMinutes(startTime)
    return this.minutesToTime(startMinutes + duration)
  }

  /**
   * Convert time string to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Convert minutes since midnight to time string
   */
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  /**
   * Get time period for a given time
   */
  private getTimePeriod(time: string): 'morning' | 'afternoon' | 'evening' {
    const hour = parseInt(time.split(':')[0])
    if (hour < 12) return 'morning'
    if (hour < 17) return 'afternoon'
    return 'evening'
  }

  /**
   * Analyze conflicts and categorize conflicting appointments
   */
  static analyzeConflicts(
    appointments: CalendarAppointment[],
    draggedAppointment: CalendarAppointment,
    targetDate: string,
    targetTime: string
  ): ConflictingAppointment[] {
    const movedAppointment = {
      ...draggedAppointment,
      date: targetDate,
      startTime: targetTime
    }

    const conflictingAppointments: ConflictingAppointment[] = []

    for (const appointment of appointments) {
      if (appointment.id === draggedAppointment.id) continue
      if (appointment.barberId !== draggedAppointment.barberId) continue
      if (appointment.date !== targetDate) continue

      // Check for time overlap
      if (this.checkTimeOverlap(movedAppointment, appointment)) {
        conflictingAppointments.push({
          id: appointment.id,
          client: appointment.client,
          service: appointment.service,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          barber: appointment.barber,
          canBump: this.canAppointmentBeBumped(appointment)
        })
      }
    }

    return conflictingAppointments
  }

  /**
   * Check if two appointments have overlapping times
   */
  private static checkTimeOverlap(apt1: CalendarAppointment, apt2: CalendarAppointment): boolean {
    const start1 = new Date(`2024-01-01 ${apt1.startTime}`)
    const end1 = new Date(`2024-01-01 ${apt1.endTime}`)
    const start2 = new Date(`2024-01-01 ${apt2.startTime}`)
    const end2 = new Date(`2024-01-01 ${apt2.endTime}`)

    return start1 < end2 && end1 > start2
  }

  /**
   * Determine if an appointment can be moved/bumped
   */
  private static canAppointmentBeBumped(appointment: CalendarAppointment): boolean {
    // Don't bump confirmed appointments that are very soon (within 2 hours)
    const appointmentTime = new Date(`${appointment.date} ${appointment.startTime}`)
    const now = new Date()
    const timeDifference = appointmentTime.getTime() - now.getTime()
    const hoursUntilAppointment = timeDifference / (1000 * 60 * 60)

    if (hoursUntilAppointment < 2) return false

    // Don't bump completed or cancelled appointments
    if (appointment.status === 'completed' || appointment.status === 'cancelled') return false

    // VIP clients or certain services might not be bumpable
    if (appointment.service.toLowerCase().includes('vip')) return false

    return true
  }

  /**
   * Find optimal bump configurations for conflicting appointments
   */
  findBumpSuggestions(
    conflictingAppointments: ConflictingAppointment[],
    barberId: number
  ): Map<string, TimeSlotSuggestion[]> {
    const bumpSuggestions = new Map<string, TimeSlotSuggestion[]>()

    for (const conflict of conflictingAppointments) {
      if (!conflict.canBump) continue

      // Find the original appointment to get duration
      const originalAppointment = this.appointments.find(apt => apt.id === conflict.id)
      if (!originalAppointment) continue

      // Generate suggestions for this appointment
      const suggestions = this.generateSuggestions(
        originalAppointment,
        originalAppointment.date,
        originalAppointment.startTime,
        barberId
      )

      bumpSuggestions.set(conflict.id, suggestions.slice(0, 5)) // Top 5 suggestions per appointment
    }

    return bumpSuggestions
  }

  /**
   * Validate a potential resolution to ensure it doesn't create new conflicts
   */
  validateResolution(
    resolution: {
      type: 'accept_suggestion' | 'bump_appointments' | 'allow_overlap'
      suggestions: TimeSlotSuggestion[]
      bumps: Array<{ appointmentId: string; newDate: string; newTime: string }>
    },
    barberId: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (resolution.type === 'bump_appointments') {
      // Check if bump targets don't create new conflicts
      for (const bump of resolution.bumps) {
        const appointment = this.appointments.find(apt => apt.id === bump.appointmentId)
        if (!appointment) continue

        const conflicts = ConflictResolutionService.analyzeConflicts(
          this.appointments,
          appointment,
          bump.newDate,
          bump.newTime
        )

        if (conflicts.length > 0) {
          errors.push(`Moving ${appointment.client}'s appointment would create new conflicts`)
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }
}

export default ConflictResolutionService
