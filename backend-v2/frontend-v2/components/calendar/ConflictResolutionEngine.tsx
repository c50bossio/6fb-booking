'use client'

import React, { useMemo, useCallback } from 'react'
import { addMinutes, isBefore, isAfter, isEqual, format, differenceInMinutes, startOfDay, endOfDay } from 'date-fns'

export interface Appointment {
  id: number
  start_time: string
  end_time?: string
  duration_minutes: number
  barber_id: number
  barber_name?: string
  client_name: string
  service_name: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  location_id?: number
  buffer_before?: number
  buffer_after?: number
  priority?: number
}

export interface Barber {
  id: number
  name: string
  email: string
  working_hours?: {
    start: string
    end: string
    days: number[]
  }
  skills?: string[]
  specialties?: string[]
  is_available?: boolean
  break_times?: Array<{
    start: string
    end: string
    recurring?: boolean
  }>
}

export interface ConflictType {
  type: 'time_overlap' | 'barber_unavailable' | 'double_booking' | 'insufficient_buffer' | 'working_hours_violation' | 'break_time_conflict' | 'resource_conflict'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  affectedAppointments: number[]
  suggestedResolution?: ResolutionStrategy
}

export interface ResolutionStrategy {
  strategy: 'reschedule' | 'reassign_barber' | 'adjust_duration' | 'split_appointment' | 'buffer_adjustment' | 'manual_intervention'
  newTime?: string
  newBarber?: number
  newDuration?: number
  estimatedImpact: 'minimal' | 'moderate' | 'significant'
  confidence: number // 0-100
  reasoning: string
}

export interface ConflictAnalysis {
  hasConflicts: boolean
  conflicts: ConflictType[]
  riskScore: number // 0-100
  recommendations: ResolutionStrategy[]
  affectedBarbers: number[]
  timeSlotUtilization: number
}

export interface ConflictResolutionOptions {
  bufferTime: number
  allowBackToBack: boolean
  considerBreaks: boolean
  checkWorkingHours: boolean
  prioritizeExistingAppointments: boolean
  maxReschedulingRange: number // minutes
  preferredResolutionStrategies: ResolutionStrategy['strategy'][]
}

export class ConflictResolutionEngine {
  private options: ConflictResolutionOptions
  
  constructor(options: Partial<ConflictResolutionOptions> = {}) {
    this.options = {
      bufferTime: 15,
      allowBackToBack: false,
      considerBreaks: true,
      checkWorkingHours: true,
      prioritizeExistingAppointments: true,
      maxReschedulingRange: 240, // 4 hours
      preferredResolutionStrategies: ['reschedule', 'reassign_barber', 'adjust_duration'],
      ...options
    }
  }

  // Main conflict analysis method
  analyzeConflicts(
    newAppointment: Appointment,
    existingAppointments: Appointment[],
    barbers: Barber[]
  ): ConflictAnalysis {
    const conflicts: ConflictType[] = []
    const affectedBarbers: Set<number> = new Set()
    
    // Get the target barber
    const targetBarber = barbers.find(b => b.id === newAppointment.barber_id)
    if (!targetBarber) {
      conflicts.push({
        type: 'barber_unavailable',
        severity: 'critical',
        description: 'Selected barber not found',
        affectedAppointments: [newAppointment.id]
      })
      
      return {
        hasConflicts: true,
        conflicts,
        riskScore: 100,
        recommendations: [],
        affectedBarbers: [],
        timeSlotUtilization: 0
      }
    }

    // Calculate appointment end time
    const startTime = new Date(newAppointment.start_time)
    const endTime = newAppointment.end_time 
      ? new Date(newAppointment.end_time)
      : addMinutes(startTime, newAppointment.duration_minutes)

    // Filter existing appointments for the same barber on the same day
    const sameBarberAppointments = existingAppointments.filter(apt => 
      apt.barber_id === newAppointment.barber_id &&
      apt.status !== 'cancelled' &&
      apt.status !== 'no_show' &&
      this.isSameDay(new Date(apt.start_time), startTime)
    )

    // 1. Check for time overlaps
    const timeConflicts = this.checkTimeOverlaps(newAppointment, sameBarberAppointments)
    conflicts.push(...timeConflicts)

    // 2. Check working hours
    if (this.options.checkWorkingHours) {
      const workingHoursConflict = this.checkWorkingHours(newAppointment, targetBarber)
      if (workingHoursConflict) conflicts.push(workingHoursConflict)
    }

    // 3. Check break times
    if (this.options.considerBreaks) {
      const breakConflicts = this.checkBreakTimeConflicts(newAppointment, targetBarber)
      conflicts.push(...breakConflicts)
    }

    // 4. Check buffer requirements
    if (!this.options.allowBackToBack) {
      const bufferConflicts = this.checkBufferRequirements(newAppointment, sameBarberAppointments)
      conflicts.push(...bufferConflicts)
    }

    // 5. Check for double bookings
    const doubleBookingConflicts = this.checkDoubleBookings(newAppointment, sameBarberAppointments)
    conflicts.push(...doubleBookingConflicts)

    // Calculate risk score
    const riskScore = this.calculateRiskScore(conflicts)
    
    // Generate recommendations
    const recommendations = this.generateResolutionStrategies(
      newAppointment,
      conflicts,
      existingAppointments,
      barbers
    )

    // Calculate time slot utilization
    const timeSlotUtilization = this.calculateTimeSlotUtilization(
      newAppointment,
      sameBarberAppointments,
      targetBarber
    )

    // Collect affected barbers
    conflicts.forEach(conflict => {
      conflict.affectedAppointments.forEach(aptId => {
        const apt = existingAppointments.find(a => a.id === aptId)
        if (apt) affectedBarbers.add(apt.barber_id)
      })
      affectedBarbers.add(newAppointment.barber_id)
    })

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      riskScore,
      recommendations,
      affectedBarbers: Array.from(affectedBarbers),
      timeSlotUtilization
    }
  }

  // Check for time overlaps between appointments
  private checkTimeOverlaps(newAppointment: Appointment, existingAppointments: Appointment[]): ConflictType[] {
    const conflicts: ConflictType[] = []
    const newStart = new Date(newAppointment.start_time)
    const newEnd = addMinutes(newStart, newAppointment.duration_minutes)

    existingAppointments.forEach(existing => {
      const existingStart = new Date(existing.start_time)
      const existingEnd = addMinutes(existingStart, existing.duration_minutes)

      // Check for overlap
      if (this.timesOverlap(newStart, newEnd, existingStart, existingEnd)) {
        const overlapMinutes = this.calculateOverlapMinutes(newStart, newEnd, existingStart, existingEnd)
        
        conflicts.push({
          type: 'time_overlap',
          severity: overlapMinutes > 30 ? 'high' : overlapMinutes > 15 ? 'medium' : 'low',
          description: `Overlaps with existing appointment by ${overlapMinutes} minutes`,
          affectedAppointments: [existing.id],
          suggestedResolution: {
            strategy: 'reschedule',
            estimatedImpact: 'moderate',
            confidence: 80,
            reasoning: `Reschedule to avoid ${overlapMinutes} minute overlap`
          }
        })
      }
    })

    return conflicts
  }

  // Check working hours violations
  private checkWorkingHours(appointment: Appointment, barber: Barber): ConflictType | null {
    if (!barber.working_hours) return null

    const appointmentDate = new Date(appointment.start_time)
    const dayOfWeek = appointmentDate.getDay()
    
    // Check if barber works on this day
    if (!barber.working_hours.days.includes(dayOfWeek)) {
      return {
        type: 'working_hours_violation',
        severity: 'high',
        description: `Barber ${barber.name} doesn't work on ${format(appointmentDate, 'EEEE')}`,
        affectedAppointments: [appointment.id],
        suggestedResolution: {
          strategy: 'reschedule',
          estimatedImpact: 'significant',
          confidence: 90,
          reasoning: 'Reschedule to a day when barber is available'
        }
      }
    }

    // Check if appointment is within working hours
    const workStart = this.parseTimeToDate(barber.working_hours.start, appointmentDate)
    const workEnd = this.parseTimeToDate(barber.working_hours.end, appointmentDate)
    const appointmentStart = appointmentDate
    const appointmentEnd = addMinutes(appointmentStart, appointment.duration_minutes)

    if (isBefore(appointmentStart, workStart) || isAfter(appointmentEnd, workEnd)) {
      return {
        type: 'working_hours_violation',
        severity: 'high',
        description: `Appointment outside working hours (${barber.working_hours.start} - ${barber.working_hours.end})`,
        affectedAppointments: [appointment.id],
        suggestedResolution: {
          strategy: 'reschedule',
          estimatedImpact: 'moderate',
          confidence: 85,
          reasoning: `Reschedule to within working hours: ${barber.working_hours.start} - ${barber.working_hours.end}`
        }
      }
    }

    return null
  }

  // Check break time conflicts
  private checkBreakTimeConflicts(appointment: Appointment, barber: Barber): ConflictType[] {
    const conflicts: ConflictType[] = []
    if (!barber.break_times) return conflicts

    const appointmentStart = new Date(appointment.start_time)
    const appointmentEnd = addMinutes(appointmentStart, appointment.duration_minutes)

    barber.break_times.forEach(breakTime => {
      const breakStart = this.parseTimeToDate(breakTime.start, appointmentStart)
      const breakEnd = this.parseTimeToDate(breakTime.end, appointmentStart)

      if (this.timesOverlap(appointmentStart, appointmentEnd, breakStart, breakEnd)) {
        conflicts.push({
          type: 'break_time_conflict',
          severity: 'medium',
          description: `Conflicts with barber's break time (${breakTime.start} - ${breakTime.end})`,
          affectedAppointments: [appointment.id],
          suggestedResolution: {
            strategy: 'reschedule',
            estimatedImpact: 'moderate',
            confidence: 75,
            reasoning: `Avoid break time: ${breakTime.start} - ${breakTime.end}`
          }
        })
      }
    })

    return conflicts
  }

  // Check buffer requirements
  private checkBufferRequirements(newAppointment: Appointment, existingAppointments: Appointment[]): ConflictType[] {
    const conflicts: ConflictType[] = []
    const newStart = new Date(newAppointment.start_time)
    const newEnd = addMinutes(newStart, newAppointment.duration_minutes)
    const bufferTime = this.options.bufferTime

    existingAppointments.forEach(existing => {
      const existingStart = new Date(existing.start_time)
      const existingEnd = addMinutes(existingStart, existing.duration_minutes)

      // Check buffer before new appointment
      const timeBetweenExistingEndAndNewStart = differenceInMinutes(newStart, existingEnd)
      if (timeBetweenExistingEndAndNewStart >= 0 && timeBetweenExistingEndAndNewStart < bufferTime) {
        conflicts.push({
          type: 'insufficient_buffer',
          severity: 'low',
          description: `Insufficient buffer time (${timeBetweenExistingEndAndNewStart} min) after previous appointment`,
          affectedAppointments: [existing.id],
          suggestedResolution: {
            strategy: 'reschedule',
            newTime: addMinutes(existingEnd, bufferTime).toISOString(),
            estimatedImpact: 'minimal',
            confidence: 90,
            reasoning: `Add ${bufferTime} minute buffer after previous appointment`
          }
        })
      }

      // Check buffer after new appointment
      const timeBetweenNewEndAndExistingStart = differenceInMinutes(existingStart, newEnd)
      if (timeBetweenNewEndAndExistingStart >= 0 && timeBetweenNewEndAndExistingStart < bufferTime) {
        conflicts.push({
          type: 'insufficient_buffer',
          severity: 'low',
          description: `Insufficient buffer time (${timeBetweenNewEndAndExistingStart} min) before next appointment`,
          affectedAppointments: [existing.id],
          suggestedResolution: {
            strategy: 'reschedule',
            newTime: new Date(existingStart.getTime() - (newAppointment.duration_minutes + bufferTime) * 60000).toISOString(),
            estimatedImpact: 'minimal',
            confidence: 90,
            reasoning: `Add ${bufferTime} minute buffer before next appointment`
          }
        })
      }
    })

    return conflicts
  }

  // Check for exact double bookings
  private checkDoubleBookings(newAppointment: Appointment, existingAppointments: Appointment[]): ConflictType[] {
    const conflicts: ConflictType[] = []
    const newStart = new Date(newAppointment.start_time)

    existingAppointments.forEach(existing => {
      const existingStart = new Date(existing.start_time)
      
      if (isEqual(newStart, existingStart)) {
        conflicts.push({
          type: 'double_booking',
          severity: 'critical',
          description: 'Exact time slot already booked',
          affectedAppointments: [existing.id],
          suggestedResolution: {
            strategy: 'reschedule',
            estimatedImpact: 'moderate',
            confidence: 95,
            reasoning: 'Find alternative time slot'
          }
        })
      }
    })

    return conflicts
  }

  // Generate resolution strategies
  private generateResolutionStrategies(
    appointment: Appointment,
    conflicts: ConflictType[],
    existingAppointments: Appointment[],
    barbers: Barber[]
  ): ResolutionStrategy[] {
    const strategies: ResolutionStrategy[] = []

    // Strategy 1: Reschedule to nearest available slot
    const reschedulingStrategy = this.findNearestAvailableSlot(appointment, existingAppointments, barbers)
    if (reschedulingStrategy) strategies.push(reschedulingStrategy)

    // Strategy 2: Reassign to different barber
    if (barbers.length > 1) {
      const reassignmentStrategy = this.findAlternativeBarber(appointment, existingAppointments, barbers)
      if (reassignmentStrategy) strategies.push(reassignmentStrategy)
    }

    // Strategy 3: Adjust appointment duration
    const durationStrategy = this.suggestDurationAdjustment(appointment, conflicts)
    if (durationStrategy) strategies.push(durationStrategy)

    // Strategy 4: Split appointment
    if (appointment.duration_minutes >= 60) {
      const splitStrategy = this.suggestAppointmentSplit(appointment, existingAppointments, barbers)
      if (splitStrategy) strategies.push(splitStrategy)
    }

    // Sort by confidence and preferred strategies
    return strategies.sort((a, b) => {
      const aPreferenceIndex = this.options.preferredResolutionStrategies.indexOf(a.strategy)
      const bPreferenceIndex = this.options.preferredResolutionStrategies.indexOf(b.strategy)
      
      // Prefer strategies in preference list, then by confidence
      if (aPreferenceIndex !== -1 && bPreferenceIndex !== -1) {
        return aPreferenceIndex - bPreferenceIndex
      }
      if (aPreferenceIndex !== -1) return -1
      if (bPreferenceIndex !== -1) return 1
      
      return b.confidence - a.confidence
    })
  }

  // Find nearest available time slot
  private findNearestAvailableSlot(
    appointment: Appointment,
    existingAppointments: Appointment[],
    barbers: Barber[]
  ): ResolutionStrategy | null {
    const barber = barbers.find(b => b.id === appointment.barber_id)
    if (!barber) return null

    const originalStart = new Date(appointment.start_time)
    const dayStart = startOfDay(originalStart)
    const dayEnd = endOfDay(originalStart)
    
    // Try slots every 15 minutes from day start to day end
    for (let time = dayStart; time <= dayEnd; time = addMinutes(time, 15)) {
      if (this.isSlotAvailable(time, appointment.duration_minutes, appointment.barber_id, existingAppointments, barber)) {
        const minutesDiff = Math.abs(differenceInMinutes(time, originalStart))
        
        if (minutesDiff <= this.options.maxReschedulingRange) {
          return {
            strategy: 'reschedule',
            newTime: time.toISOString(),
            estimatedImpact: minutesDiff <= 30 ? 'minimal' : minutesDiff <= 60 ? 'moderate' : 'significant',
            confidence: Math.max(50, 100 - (minutesDiff / 10)),
            reasoning: `Available slot found ${minutesDiff} minutes from original time`
          }
        }
      }
    }

    return null
  }

  // Find alternative barber
  private findAlternativeBarber(
    appointment: Appointment,
    existingAppointments: Appointment[],
    barbers: Barber[]
  ): ResolutionStrategy | null {
    const originalTime = new Date(appointment.start_time)
    
    for (const barber of barbers) {
      if (barber.id === appointment.barber_id || !barber.is_available) continue
      
      if (this.isSlotAvailable(originalTime, appointment.duration_minutes, barber.id, existingAppointments, barber)) {
        return {
          strategy: 'reassign_barber',
          newBarber: barber.id,
          estimatedImpact: 'moderate',
          confidence: 75,
          reasoning: `${barber.name} is available at the requested time`
        }
      }
    }

    return null
  }

  // Suggest duration adjustment
  private suggestDurationAdjustment(appointment: Appointment, conflicts: ConflictType[]): ResolutionStrategy | null {
    const overlapConflicts = conflicts.filter(c => c.type === 'time_overlap')
    if (overlapConflicts.length === 0) return null

    // Suggest reducing duration to fit between existing appointments
    const suggestedDuration = Math.max(15, appointment.duration_minutes - 15)
    
    return {
      strategy: 'adjust_duration',
      newDuration: suggestedDuration,
      estimatedImpact: 'moderate',
      confidence: 60,
      reasoning: `Reduce duration by 15 minutes to avoid conflicts`
    }
  }

  // Suggest appointment split
  private suggestAppointmentSplit(
    appointment: Appointment,
    existingAppointments: Appointment[],
    barbers: Barber[]
  ): ResolutionStrategy | null {
    const halfDuration = Math.floor(appointment.duration_minutes / 2)
    const originalStart = new Date(appointment.start_time)
    
    // Try to find two slots for half the duration
    const barber = barbers.find(b => b.id === appointment.barber_id)
    if (!barber) return null

    const firstSlotAvailable = this.isSlotAvailable(originalStart, halfDuration, appointment.barber_id, existingAppointments, barber)
    
    if (firstSlotAvailable) {
      return {
        strategy: 'split_appointment',
        newDuration: halfDuration,
        estimatedImpact: 'significant',
        confidence: 70,
        reasoning: `Split into two ${halfDuration}-minute sessions`
      }
    }

    return null
  }

  // Helper methods
  private isSlotAvailable(
    startTime: Date,
    duration: number,
    barberId: number,
    existingAppointments: Appointment[],
    barber: Barber
  ): boolean {
    const endTime = addMinutes(startTime, duration)
    
    // Check working hours
    if (this.options.checkWorkingHours && barber.working_hours) {
      const dayOfWeek = startTime.getDay()
      if (!barber.working_hours.days.includes(dayOfWeek)) return false
      
      const workStart = this.parseTimeToDate(barber.working_hours.start, startTime)
      const workEnd = this.parseTimeToDate(barber.working_hours.end, startTime)
      
      if (isBefore(startTime, workStart) || isAfter(endTime, workEnd)) return false
    }

    // Check against existing appointments
    const barberAppointments = existingAppointments.filter(apt => 
      apt.barber_id === barberId &&
      apt.status !== 'cancelled' &&
      apt.status !== 'no_show' &&
      this.isSameDay(new Date(apt.start_time), startTime)
    )

    for (const apt of barberAppointments) {
      const aptStart = new Date(apt.start_time)
      const aptEnd = addMinutes(aptStart, apt.duration_minutes)
      
      if (this.timesOverlap(startTime, endTime, aptStart, aptEnd)) return false
      
      // Check buffer requirements
      if (!this.options.allowBackToBack) {
        const timeBefore = differenceInMinutes(startTime, aptEnd)
        const timeAfter = differenceInMinutes(aptStart, endTime)
        
        if ((timeBefore >= 0 && timeBefore < this.options.bufferTime) ||
            (timeAfter >= 0 && timeAfter < this.options.bufferTime)) {
          return false
        }
      }
    }

    return true
  }

  private calculateRiskScore(conflicts: ConflictType[]): number {
    if (conflicts.length === 0) return 0

    const severityWeights = { low: 10, medium: 25, high: 50, critical: 100 }
    const totalScore = conflicts.reduce((sum, conflict) => sum + severityWeights[conflict.severity], 0)
    
    return Math.min(100, totalScore)
  }

  private calculateTimeSlotUtilization(
    newAppointment: Appointment,
    existingAppointments: Appointment[],
    barber: Barber
  ): number {
    if (!barber.working_hours) return 0

    const appointmentDate = new Date(newAppointment.start_time)
    const dayStart = this.parseTimeToDate(barber.working_hours.start, appointmentDate)
    const dayEnd = this.parseTimeToDate(barber.working_hours.end, appointmentDate)
    const totalWorkingMinutes = differenceInMinutes(dayEnd, dayStart)

    const bookedMinutes = existingAppointments.reduce((sum, apt) => {
      if (this.isSameDay(new Date(apt.start_time), appointmentDate)) {
        return sum + apt.duration_minutes
      }
      return sum
    }, 0) + newAppointment.duration_minutes

    return Math.min(100, (bookedMinutes / totalWorkingMinutes) * 100)
  }

  private timesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return isBefore(start1, end2) && isAfter(end1, start2)
  }

  private calculateOverlapMinutes(start1: Date, end1: Date, start2: Date, end2: Date): number {
    const overlapStart = isAfter(start1, start2) ? start1 : start2
    const overlapEnd = isBefore(end1, end2) ? end1 : end2
    return differenceInMinutes(overlapEnd, overlapStart)
  }

  private parseTimeToDate(timeString: string, baseDate: Date): Date {
    const [hours, minutes] = timeString.split(':').map(Number)
    const result = new Date(baseDate)
    result.setHours(hours, minutes, 0, 0)
    return result
  }

  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString()
  }
}

// React component for conflict resolution UI
export interface ConflictResolutionUIProps {
  analysis: ConflictAnalysis
  appointment: Appointment
  onResolve: (strategy: ResolutionStrategy) => void
  onIgnore: () => void
  className?: string
}

export function ConflictResolutionUI({
  analysis,
  appointment,
  onResolve,
  onIgnore,
  className = ''
}: ConflictResolutionUIProps) {
  const getSeverityColor = (severity: ConflictType['severity']) => {
    switch (severity) {
      case 'low': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'critical': return 'text-red-800 bg-red-100 border-red-300'
    }
  }

  if (!analysis.hasConflicts) {
    return (
      <div className={`p-4 bg-green-50 border border-green-200 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-green-800 font-medium">No conflicts detected</span>
        </div>
        <p className="text-green-700 text-sm mt-1">
          Appointment can be scheduled without issues.
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Risk score indicator */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <span className="font-medium">Risk Score</span>
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-300 ${
                analysis.riskScore <= 30 ? 'bg-green-500' :
                analysis.riskScore <= 60 ? 'bg-yellow-500' :
                analysis.riskScore <= 80 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${analysis.riskScore}%` }}
            />
          </div>
          <span className="font-mono text-sm">{analysis.riskScore}/100</span>
        </div>
      </div>

      {/* Conflicts list */}
      <div className="space-y-2">
        <h4 className="font-medium text-gray-900">Detected Conflicts</h4>
        {analysis.conflicts.map((conflict, index) => (
          <div 
            key={index}
            className={`p-3 border rounded-lg ${getSeverityColor(conflict.severity)}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-medium capitalize">
                  {conflict.type.replace('_', ' ')}
                </span>
                <span className={`ml-2 px-2 py-1 text-xs rounded-full font-medium ${getSeverityColor(conflict.severity)}`}>
                  {conflict.severity}
                </span>
              </div>
            </div>
            <p className="text-sm mt-1">{conflict.description}</p>
          </div>
        ))}
      </div>

      {/* Resolution recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Recommended Solutions</h4>
          {analysis.recommendations.slice(0, 3).map((recommendation, index) => (
            <div key={index} className="p-3 border border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">
                      {recommendation.strategy.replace('_', ' ')}
                    </span>
                    <span className="text-xs px-2 py-1 bg-blue-200 text-blue-800 rounded-full">
                      {recommendation.confidence}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    {recommendation.reasoning}
                  </p>
                  {recommendation.newTime && (
                    <p className="text-xs text-blue-600 mt-1">
                      New time: {format(new Date(recommendation.newTime), 'MMM d, h:mm a')}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => onResolve(recommendation)}
                  className="ml-3 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onIgnore}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
        >
          Proceed Anyway
        </button>
      </div>
    </div>
  )
}

export default ConflictResolutionEngine