/**
 * Advanced conflict resolution system for appointment scheduling
 * Handles complex scheduling conflicts and provides intelligent rescheduling options
 */

import { availabilityService, type AvailabilityRequest, type SlotRecommendation } from './availability-service'
import { appointmentsService, type AppointmentConflict } from '../api/appointments'
import { appointmentValidator, type ValidationResult } from '../validation/appointment-validation'
import { handleError } from '../error-handling/error-manager'
import { ConflictError, ValidationError, ErrorCode } from '../error-handling/error-types'

export interface SchedulingConflict {
  type: ConflictType
  severity: ConflictSeverity
  message: string
  affectedAppointments: number[]
  suggestedResolutions: ConflictResolution[]
  automaticResolution?: ConflictResolution
  userAction: 'required' | 'optional' | 'automatic'
}

export enum ConflictType {
  OVERLAP = 'overlap',
  BUFFER_VIOLATION = 'buffer_violation',
  DOUBLE_BOOKING = 'double_booking',
  BARBER_UNAVAILABLE = 'barber_unavailable',
  OUTSIDE_HOURS = 'outside_hours',
  BREAK_CONFLICT = 'break_conflict',
  HOLIDAY_CONFLICT = 'holiday_conflict',
  RESOURCE_CONFLICT = 'resource_conflict',
  CLIENT_CONFLICT = 'client_conflict'
}

export enum ConflictSeverity {
  LOW = 'low',         // Can be automatically resolved
  MEDIUM = 'medium',   // Requires user decision
  HIGH = 'high',       // Requires immediate attention
  CRITICAL = 'critical' // Blocks all operations
}

export interface ConflictResolution {
  id: string
  type: ResolutionType
  description: string
  impact: string
  confidence: number // 0-1
  cost: number // Relative cost of this resolution
  steps: ResolutionStep[]
  affectedAppointments: number[]
  requiresConfirmation: boolean
}

export enum ResolutionType {
  RESCHEDULE_APPOINTMENT = 'reschedule_appointment',
  CHANGE_BARBER = 'change_barber',
  SPLIT_APPOINTMENT = 'split_appointment',
  EXTEND_HOURS = 'extend_hours',
  CANCEL_CONFLICTING = 'cancel_conflicting',
  ADJUST_BUFFER = 'adjust_buffer',
  OVERRIDE_CONFLICT = 'override_conflict'
}

export interface ResolutionStep {
  action: string
  description: string
  appointmentId?: number
  newTime?: string
  newDate?: string
  newBarberId?: number
  parameters?: Record<string, any>
}

export interface ReschedulingOptions {
  allowDifferentBarber: boolean
  allowDifferentDate: boolean
  maxDaysOut: number
  maxTimeShift: number // minutes
  preferredTimeRanges: Array<{ start: string; end: string }>
  prioritizeClientPreference: boolean
  minimizeDisruption: boolean
  bufferTimeRequired: number // minutes
}

export interface ConflictContext {
  appointmentId?: number
  barberId: number
  date: string
  time: string
  duration: number
  serviceId: number
  clientId?: number
  priority: 'low' | 'normal' | 'high' | 'urgent'
  isRescheduling: boolean
  originalAppointmentId?: number
}

class ConflictResolver {
  private readonly DEFAULT_BUFFER_TIME = 15 // minutes
  private readonly MAX_RESOLUTION_ATTEMPTS = 5
  private readonly CONFIDENCE_THRESHOLD = 0.7

  /**
   * Analyze scheduling conflicts for a given appointment request
   */
  async analyzeConflicts(context: ConflictContext): Promise<SchedulingConflict[]> {
    try {
      const conflicts: SchedulingConflict[] = []

      // Check for overlapping appointments
      const overlapConflicts = await this.checkOverlapConflicts(context)
      conflicts.push(...overlapConflicts)

      // Check buffer time violations
      const bufferConflicts = await this.checkBufferConflicts(context)
      conflicts.push(...bufferConflicts)

      // Check barber availability
      const availabilityConflicts = await this.checkBarberAvailability(context)
      conflicts.push(...availabilityConflicts)

      // Check business rules
      const businessRuleConflicts = await this.checkBusinessRules(context)
      conflicts.push(...businessRuleConflicts)

      // Generate resolutions for each conflict
      for (const conflict of conflicts) {
        conflict.suggestedResolutions = await this.generateResolutions(conflict, context)

        // Determine if automatic resolution is possible
        const autoResolution = this.findAutomaticResolution(conflict.suggestedResolutions)
        if (autoResolution) {
          conflict.automaticResolution = autoResolution
          conflict.userAction = 'automatic'
        } else if (conflict.severity === ConflictSeverity.LOW) {
          conflict.userAction = 'optional'
        } else {
          conflict.userAction = 'required'
        }
      }

      return conflicts.sort((a, b) => this.getSeverityWeight(b.severity) - this.getSeverityWeight(a.severity))
    } catch (error) {
      throw await handleError(error, {
        operation: 'analyzeConflicts',
        context,
      })
    }
  }

  /**
   * Resolve conflicts automatically where possible
   */
  async resolveConflictsAutomatically(
    conflicts: SchedulingConflict[],
    context: ConflictContext,
    options: ReschedulingOptions
  ): Promise<{ resolved: SchedulingConflict[]; unresolved: SchedulingConflict[] }> {
    const resolved: SchedulingConflict[] = []
    const unresolved: SchedulingConflict[] = []

    for (const conflict of conflicts) {
      if (conflict.automaticResolution && conflict.userAction === 'automatic') {
        try {
          await this.executeResolution(conflict.automaticResolution, context)
          resolved.push(conflict)
        } catch (error) {
          // If automatic resolution fails, mark as unresolved
          unresolved.push(conflict)
        }
      } else {
        unresolved.push(conflict)
      }
    }

    return { resolved, unresolved }
  }

  /**
   * Find optimal rescheduling options for conflicted appointments
   */
  async findReschedulingOptions(
    context: ConflictContext,
    options: ReschedulingOptions
  ): Promise<SlotRecommendation[]> {
    try {
      const request: AvailabilityRequest = {
        date: context.date,
        barberId: options.allowDifferentBarber ? undefined : context.barberId,
        serviceId: context.serviceId,
        duration: context.duration,
        preferredTimes: this.extractPreferredTimes(context, options),
        excludeAppointmentId: context.originalAppointmentId,
      }

      const alternatives = await availabilityService.getAlternativeSuggestions(request, {
        suggestAlternatives: true,
        maxAlternatives: 10,
        allowDifferentBarber: options.allowDifferentBarber,
        allowDifferentDate: options.allowDifferentDate,
        maxDaysOut: options.maxDaysOut,
        preferredTimeRanges: options.preferredTimeRanges,
      })

      // Filter and rank based on rescheduling options
      return this.rankReschedulingOptions(alternatives, context, options)
    } catch (error) {
      throw await handleError(error, {
        operation: 'findReschedulingOptions',
        context,
        options,
      })
    }
  }

  /**
   * Handle complex overlapping appointment scenarios
   */
  async resolveOverlappingAppointments(
    appointments: Array<{
      id: number
      barberId: number
      date: string
      time: string
      duration: number
      priority: 'low' | 'normal' | 'high' | 'urgent'
    }>,
    options: ReschedulingOptions
  ): Promise<ConflictResolution[]> {
    try {
      const resolutions: ConflictResolution[] = []

      // Sort appointments by priority
      const sortedAppointments = appointments.sort((a, b) => {
        const priorityWeight = { urgent: 4, high: 3, normal: 2, low: 1 }
        return priorityWeight[b.priority] - priorityWeight[a.priority]
      })

      // Try to resolve conflicts by rescheduling lower priority appointments
      for (let i = 1; i < sortedAppointments.length; i++) {
        const appointment = sortedAppointments[i]

        const reschedulingOptions = await this.findReschedulingOptions(
          {
            appointmentId: appointment.id,
            barberId: appointment.barberId,
            date: appointment.date,
            time: appointment.time,
            duration: appointment.duration,
            serviceId: 0, // Would need to be provided
            priority: appointment.priority,
            isRescheduling: true,
            originalAppointmentId: appointment.id,
          },
          options
        )

        if (reschedulingOptions.length > 0) {
          const bestOption = reschedulingOptions[0]

          resolutions.push({
            id: `reschedule_${appointment.id}`,
            type: ResolutionType.RESCHEDULE_APPOINTMENT,
            description: `Reschedule appointment ${appointment.id} to ${bestOption.slot.time}`,
            impact: `Move appointment to ${bestOption.alternativeDate || appointment.date} at ${bestOption.slot.time}`,
            confidence: bestOption.score / 100,
            cost: this.calculateReschedulingCost(appointment, bestOption),
            steps: [
              {
                action: 'reschedule',
                description: `Reschedule appointment to new time slot`,
                appointmentId: appointment.id,
                newTime: bestOption.slot.time,
                newDate: bestOption.alternativeDate,
                newBarberId: bestOption.slot.barberId !== appointment.barberId ? bestOption.slot.barberId : undefined,
              }
            ],
            affectedAppointments: [appointment.id],
            requiresConfirmation: appointment.priority === 'high' || appointment.priority === 'urgent',
          })
        }
      }

      return resolutions
    } catch (error) {
      throw await handleError(error, {
        operation: 'resolveOverlappingAppointments',
        appointments,
        options,
      })
    }
  }

  /**
   * Manage buffer time between appointments
   */
  async optimizeBufferTimes(
    barberId: number,
    date: string,
    appointments: Array<{ time: string; duration: number }>
  ): Promise<{ optimized: boolean; suggestions: string[] }> {
    try {
      const suggestions: string[] = []
      let optimized = true

      // Sort appointments by time
      const sortedAppointments = appointments.sort((a, b) =>
        this.timeToMinutes(a.time) - this.timeToMinutes(b.time)
      )

      // Check buffer times between consecutive appointments
      for (let i = 0; i < sortedAppointments.length - 1; i++) {
        const current = sortedAppointments[i]
        const next = sortedAppointments[i + 1]

        const currentEndTime = this.timeToMinutes(current.time) + current.duration
        const nextStartTime = this.timeToMinutes(next.time)
        const actualBuffer = nextStartTime - currentEndTime

        if (actualBuffer < this.DEFAULT_BUFFER_TIME) {
          optimized = false
          suggestions.push(
            `Insufficient buffer time between ${current.time} and ${next.time}. ` +
            `Current: ${actualBuffer} minutes, Required: ${this.DEFAULT_BUFFER_TIME} minutes`
          )
        }
      }

      if (!optimized) {
        suggestions.push(
          'Consider adjusting appointment times to ensure adequate buffer time for cleanup and preparation'
        )
      }

      return { optimized, suggestions }
    } catch (error) {
      throw await handleError(error, {
        operation: 'optimizeBufferTimes',
        barberId,
        date,
      })
    }
  }

  /**
   * Private helper methods
   */
  private async checkOverlapConflicts(context: ConflictContext): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = []

    try {
      const conflictCheck = await availabilityService.checkBookingConflicts(
        context.barberId,
        context.date,
        context.time,
        context.duration,
        context.originalAppointmentId
      )

      if (conflictCheck.has_conflicts) {
        const overlapConflicts = conflictCheck.conflicts.filter(c => c.type === 'overlap')

        if (overlapConflicts.length > 0) {
          conflicts.push({
            type: ConflictType.OVERLAP,
            severity: ConflictSeverity.HIGH,
            message: 'Appointment overlaps with existing booking',
            affectedAppointments: overlapConflicts
              .map(c => c.appointment_id)
              .filter((id): id is number => id !== undefined),
            suggestedResolutions: [],
            userAction: 'required',
          })
        }
      }
    } catch (error) {
      // Handle error but don't throw - conflicts analysis should continue
    }

    return conflicts
  }

  private async checkBufferConflicts(context: ConflictContext): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = []

    // This would check if there's adequate buffer time before/after the appointment
    // Implementation would depend on business rules and existing appointments

    return conflicts
  }

  private async checkBarberAvailability(context: ConflictContext): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = []

    try {
      const availability = await availabilityService.getAvailability({
        date: context.date,
        barberId: context.barberId,
        serviceId: context.serviceId,
        duration: context.duration,
      })

      const requestedSlot = availability.slots.find(slot =>
        slot.time === context.time && slot.barberId === context.barberId
      )

      if (!requestedSlot || !requestedSlot.available) {
        conflicts.push({
          type: ConflictType.BARBER_UNAVAILABLE,
          severity: ConflictSeverity.MEDIUM,
          message: 'Barber is not available at the requested time',
          affectedAppointments: [],
          suggestedResolutions: [],
          userAction: 'required',
        })
      }
    } catch (error) {
      // Handle error but continue
    }

    return conflicts
  }

  private async checkBusinessRules(context: ConflictContext): Promise<SchedulingConflict[]> {
    const conflicts: SchedulingConflict[] = []

    // Validate against business rules
    const validation = appointmentValidator.validateTimeSlot({
      date: context.date,
      time: context.time,
      barberId: context.barberId,
      duration: context.duration,
    })

    if (!validation.isValid) {
      validation.errors.forEach(error => {
        let conflictType = ConflictType.OUTSIDE_HOURS
        let severity = ConflictSeverity.MEDIUM

        if (error.code === 'OUTSIDE_BUSINESS_HOURS') {
          conflictType = ConflictType.OUTSIDE_HOURS
          severity = ConflictSeverity.HIGH
        } else if (error.code === 'CLOSED_DAY') {
          conflictType = ConflictType.HOLIDAY_CONFLICT
          severity = ConflictSeverity.HIGH
        }

        conflicts.push({
          type: conflictType,
          severity,
          message: error.message,
          affectedAppointments: [],
          suggestedResolutions: [],
          userAction: 'required',
        })
      })
    }

    return conflicts
  }

  private async generateResolutions(
    conflict: SchedulingConflict,
    context: ConflictContext
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = []

    switch (conflict.type) {
      case ConflictType.OVERLAP:
        resolutions.push(...await this.generateOverlapResolutions(conflict, context))
        break
      case ConflictType.BARBER_UNAVAILABLE:
        resolutions.push(...await this.generateAvailabilityResolutions(conflict, context))
        break
      case ConflictType.OUTSIDE_HOURS:
        resolutions.push(...await this.generateBusinessHoursResolutions(conflict, context))
        break
      default:
        resolutions.push(...await this.generateGenericResolutions(conflict, context))
    }

    return resolutions.sort((a, b) => b.confidence - a.confidence)
  }

  private async generateOverlapResolutions(
    conflict: SchedulingConflict,
    context: ConflictContext
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = []

    // Suggest rescheduling to next available slot
    const alternatives = await availabilityService.getAlternativeSuggestions({
      date: context.date,
      barberId: context.barberId,
      serviceId: context.serviceId,
      duration: context.duration,
    })

    if (alternatives.length > 0) {
      const bestAlternative = alternatives[0]
      resolutions.push({
        id: `reschedule_${Date.now()}`,
        type: ResolutionType.RESCHEDULE_APPOINTMENT,
        description: `Reschedule to ${bestAlternative.slot.time}`,
        impact: `Appointment moved to ${bestAlternative.slot.time}`,
        confidence: bestAlternative.score / 100,
        cost: 1,
        steps: [{
          action: 'reschedule',
          description: 'Move appointment to new time slot',
          newTime: bestAlternative.slot.time,
          newDate: bestAlternative.alternativeDate,
        }],
        affectedAppointments: [context.appointmentId].filter((id): id is number => id !== undefined),
        requiresConfirmation: true,
      })
    }

    return resolutions
  }

  private async generateAvailabilityResolutions(
    conflict: SchedulingConflict,
    context: ConflictContext
  ): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = []

    // Suggest different barber
    const alternatives = await availabilityService.getAlternativeSuggestions({
      date: context.date,
      serviceId: context.serviceId,
      duration: context.duration,
    }, {
      suggestAlternatives: true,
      maxAlternatives: 3,
      allowDifferentBarber: true,
      allowDifferentDate: false,
      maxDaysOut: 0,
    })

    alternatives.forEach(alt => {
      if (alt.slot.barberId !== context.barberId) {
        resolutions.push({
          id: `change_barber_${alt.slot.barberId}`,
          type: ResolutionType.CHANGE_BARBER,
          description: `Switch to ${alt.slot.barberName}`,
          impact: `Appointment with different barber`,
          confidence: alt.score / 100,
          cost: 2,
          steps: [{
            action: 'change_barber',
            description: 'Assign appointment to different barber',
            newBarberId: alt.slot.barberId,
          }],
          affectedAppointments: [context.appointmentId].filter((id): id is number => id !== undefined),
          requiresConfirmation: true,
        })
      }
    })

    return resolutions
  }

  private async generateBusinessHoursResolutions(
    conflict: SchedulingConflict,
    context: ConflictContext
  ): Promise<ConflictResolution[]> {
    // For business hours conflicts, suggest times within business hours
    const resolutions: ConflictResolution[] = []

    const suggestions = appointmentValidator.getSuggestedAlternatives(
      context.date,
      context.time,
      context.duration
    )

    suggestions.forEach((time, index) => {
      resolutions.push({
        id: `business_hours_${index}`,
        type: ResolutionType.RESCHEDULE_APPOINTMENT,
        description: `Reschedule to ${time} (within business hours)`,
        impact: `Appointment moved to business hours`,
        confidence: 0.8,
        cost: 1,
        steps: [{
          action: 'reschedule',
          description: 'Move to business hours',
          newTime: time,
        }],
        affectedAppointments: [context.appointmentId].filter((id): id is number => id !== undefined),
        requiresConfirmation: false,
      })
    })

    return resolutions
  }

  private async generateGenericResolutions(
    conflict: SchedulingConflict,
    context: ConflictContext
  ): Promise<ConflictResolution[]> {
    // Generic fallback resolutions
    return [{
      id: `manual_${Date.now()}`,
      type: ResolutionType.OVERRIDE_CONFLICT,
      description: 'Manual override required',
      impact: 'Conflict will be overridden',
      confidence: 0.1,
      cost: 10,
      steps: [{
        action: 'override',
        description: 'Manually override the conflict',
      }],
      affectedAppointments: [],
      requiresConfirmation: true,
    }]
  }

  private findAutomaticResolution(resolutions: ConflictResolution[]): ConflictResolution | undefined {
    return resolutions.find(resolution =>
      resolution.confidence >= this.CONFIDENCE_THRESHOLD &&
      resolution.cost <= 2 &&
      !resolution.requiresConfirmation
    )
  }

  private async executeResolution(resolution: ConflictResolution, context: ConflictContext): Promise<void> {
    for (const step of resolution.steps) {
      switch (step.action) {
        case 'reschedule':
          if (step.appointmentId && step.newTime) {
            await appointmentsService.rescheduleAppointment(
              step.appointmentId,
              step.newDate || context.date,
              step.newTime
            )
          }
          break
        case 'change_barber':
          if (step.appointmentId && step.newBarberId) {
            await appointmentsService.updateAppointment(step.appointmentId, {
              barber_id: step.newBarberId
            })
          }
          break
        // Add other resolution execution logic as needed
      }
    }
  }

  private getSeverityWeight(severity: ConflictSeverity): number {
    switch (severity) {
      case ConflictSeverity.CRITICAL: return 4
      case ConflictSeverity.HIGH: return 3
      case ConflictSeverity.MEDIUM: return 2
      case ConflictSeverity.LOW: return 1
      default: return 0
    }
  }

  private extractPreferredTimes(context: ConflictContext, options: ReschedulingOptions): string[] {
    const preferredTimes: string[] = []

    // Extract times from preferred time ranges
    options.preferredTimeRanges.forEach(range => {
      const startMinutes = this.timeToMinutes(range.start)
      const endMinutes = this.timeToMinutes(range.end)

      for (let minutes = startMinutes; minutes <= endMinutes - context.duration; minutes += 30) {
        preferredTimes.push(this.minutesToTime(minutes))
      }
    })

    return preferredTimes
  }

  private rankReschedulingOptions(
    alternatives: SlotRecommendation[],
    context: ConflictContext,
    options: ReschedulingOptions
  ): SlotRecommendation[] {
    return alternatives.map(alt => {
      let adjustedScore = alt.score

      // Penalize different barber if client preference matters
      if (options.prioritizeClientPreference && alt.slot.barberId !== context.barberId) {
        adjustedScore -= 20
      }

      // Penalize time shifts beyond preferences
      const timeShift = Math.abs(
        this.timeToMinutes(alt.slot.time) - this.timeToMinutes(context.time)
      )
      if (timeShift > options.maxTimeShift) {
        adjustedScore -= (timeShift - options.maxTimeShift) / 10
      }

      return {
        ...alt,
        score: Math.max(0, adjustedScore)
      }
    }).sort((a, b) => b.score - a.score)
  }

  private calculateReschedulingCost(
    appointment: { priority: string },
    option: SlotRecommendation
  ): number {
    let cost = 1

    // Higher cost for high priority appointments
    if (appointment.priority === 'high' || appointment.priority === 'urgent') {
      cost += 2
    }

    // Lower score options have higher cost
    cost += (100 - option.score) / 50

    return cost
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver()
