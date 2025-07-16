'use client'

import React, { useMemo, useCallback, useState } from 'react'
import { addDays, addMinutes, subMinutes, format, isBefore, isAfter, differenceInMinutes, startOfDay, endOfDay, isWeekend, isSameDay } from 'date-fns'
import { ConflictResolutionEngine, type Appointment, type Barber, type ConflictAnalysis, type ResolutionStrategy } from './ConflictResolutionEngine'

export interface ReschedulingPreferences {
  preferredTimeSlots: Array<{ start: string; end: string }>
  avoidWeekends: boolean
  maxDaysFromOriginal: number
  preferEarlierTimes: boolean
  preferSameBarber: boolean
  allowShorterDuration: boolean
  considerClientHistory: boolean
  priorityScore: number // 1-10, higher = more flexible rescheduling
}

export interface ClientPreferences {
  id: number
  preferredDays: number[] // 0-6 (Sunday-Saturday)
  preferredTimes: Array<{ start: string; end: string }>
  avoidTimes: Array<{ start: string; end: string }>
  flexibilityScore: number // 1-10, higher = more willing to reschedule
  lastRescheduled?: string
  reschedulingHistory: number // count of times rescheduled
}

export interface ReschedulingSuggestion {
  id: string
  originalAppointment: Appointment
  suggestedTime: string
  suggestedBarber?: number
  suggestedDuration?: number
  confidence: number // 0-100
  reasoning: string[]
  impactScore: number // 1-10, lower = less disruptive
  clientSatisfactionPrediction: number // 0-100
  businessImpact: {
    revenueChange: number
    utilizationChange: number
    clientRetentionRisk: number
  }
  alternatives: Array<{
    time: string
    barber?: number
    confidence: number
    reasoning: string
  }>
}

export interface AutoReschedulingResult {
  success: boolean
  suggestions: ReschedulingSuggestion[]
  cascadeEffects: Array<{
    appointmentId: number
    suggestedChanges: ReschedulingSuggestion
  }>
  totalImpactScore: number
  estimatedClientSatisfaction: number
  recommendedAction: 'auto_apply' | 'present_options' | 'manual_review'
}

export class AutoReschedulingEngine {
  private conflictEngine: ConflictResolutionEngine
  private clientPreferences: Map<number, ClientPreferences>
  private businessRules: {
    peakHours: Array<{ start: string; end: string }>
    minimumNoticeHours: number
    maxReschedulingsPerClient: number
    preferredUtilizationRate: number
  }

  constructor() {
    this.conflictEngine = new ConflictResolutionEngine()
    this.clientPreferences = new Map()
    this.businessRules = {
      peakHours: [
        { start: '09:00', end: '12:00' },
        { start: '17:00', end: '20:00' }
      ],
      minimumNoticeHours: 24,
      maxReschedulingsPerClient: 3,
      preferredUtilizationRate: 85
    }
  }

  // Main automatic rescheduling method
  async generateReschedulingSuggestions(
    conflictingAppointments: Appointment[],
    existingAppointments: Appointment[],
    barbers: Barber[],
    preferences: ReschedulingPreferences
  ): Promise<AutoReschedulingResult> {
    const suggestions: ReschedulingSuggestion[] = []
    const cascadeEffects: Array<{ appointmentId: number; suggestedChanges: ReschedulingSuggestion }> = []

    // Analyze each conflicting appointment
    for (const appointment of conflictingAppointments) {
      const suggestion = await this.generateSuggestionForAppointment(
        appointment,
        existingAppointments,
        barbers,
        preferences
      )
      
      if (suggestion) {
        suggestions.push(suggestion)
        
        // Check for cascade effects
        const cascades = this.analyzeCascadeEffects(suggestion, existingAppointments, barbers)
        cascadeEffects.push(...cascades)
      }
    }

    // Calculate overall impact
    const totalImpactScore = this.calculateTotalImpact(suggestions, cascadeEffects)
    const estimatedClientSatisfaction = this.estimateClientSatisfaction(suggestions)
    
    // Determine recommended action
    const recommendedAction = this.determineRecommendedAction(suggestions, totalImpactScore, estimatedClientSatisfaction)

    return {
      success: suggestions.length > 0,
      suggestions,
      cascadeEffects,
      totalImpactScore,
      estimatedClientSatisfaction,
      recommendedAction
    }
  }

  // Generate suggestion for a specific appointment
  private async generateSuggestionForAppointment(
    appointment: Appointment,
    existingAppointments: Appointment[],
    barbers: Barber[],
    preferences: ReschedulingPreferences
  ): Promise<ReschedulingSuggestion | null> {
    const originalTime = new Date(appointment.start_time)
    const clientPrefs = this.clientPreferences.get(parseInt(appointment.client_name)) // Assuming client_name contains ID
    
    // Check if appointment is eligible for rescheduling
    if (!this.isEligibleForRescheduling(appointment, clientPrefs)) {
      return null
    }

    // Generate time slot options
    const timeSlotOptions = this.generateTimeSlotOptions(appointment, preferences, clientPrefs)
    
    // Score each option
    const scoredOptions = await Promise.all(
      timeSlotOptions.map(async (option) => {
        const score = await this.scoreReschedulingOption(
          appointment,
          option,
          existingAppointments,
          barbers,
          preferences,
          clientPrefs
        )
        return { ...option, score }
      })
    )

    // Sort by score and select best options
    const bestOptions = scoredOptions
      .filter(option => option.score.confidence > 50)
      .sort((a, b) => b.score.confidence - a.score.confidence)
      .slice(0, 5)

    if (bestOptions.length === 0) return null

    const bestOption = bestOptions[0]
    const alternatives = bestOptions.slice(1, 4).map(opt => ({
      time: opt.time.toISOString(),
      barber: opt.barberId,
      confidence: opt.score.confidence,
      reasoning: opt.score.reasoning[0] || 'Alternative time slot'
    }))

    return {
      id: `reschedule-${appointment.id}-${Date.now()}`,
      originalAppointment: appointment,
      suggestedTime: bestOption.time.toISOString(),
      suggestedBarber: bestOption.barberId !== appointment.barber_id ? bestOption.barberId : undefined,
      suggestedDuration: bestOption.duration !== appointment.duration_minutes ? bestOption.duration : undefined,
      confidence: bestOption.score.confidence,
      reasoning: bestOption.score.reasoning,
      impactScore: bestOption.score.impactScore,
      clientSatisfactionPrediction: bestOption.score.clientSatisfaction,
      businessImpact: bestOption.score.businessImpact,
      alternatives
    }
  }

  // Generate possible time slot options
  private generateTimeSlotOptions(
    appointment: Appointment,
    preferences: ReschedulingPreferences,
    clientPrefs?: ClientPreferences
  ): Array<{ time: Date; barberId: number; duration: number }> {
    const options: Array<{ time: Date; barberId: number; duration: number }> = []
    const originalTime = new Date(appointment.start_time)
    const maxDays = preferences.maxDaysFromOriginal
    
    // Generate time slots for each day within range
    for (let dayOffset = -maxDays; dayOffset <= maxDays; dayOffset++) {
      const targetDate = addDays(originalTime, dayOffset)
      
      // Skip weekends if preference is set
      if (preferences.avoidWeekends && isWeekend(targetDate)) continue
      
      // Skip if client has day preferences and this day doesn't match
      if (clientPrefs?.preferredDays.length && !clientPrefs.preferredDays.includes(targetDate.getDay())) continue
      
      // Generate time slots for this day
      const dayOptions = this.generateDayTimeSlots(targetDate, appointment, preferences, clientPrefs)
      options.push(...dayOptions)
    }

    return options
  }

  // Generate time slots for a specific day
  private generateDayTimeSlots(
    date: Date,
    appointment: Appointment,
    preferences: ReschedulingPreferences,
    clientPrefs?: ClientPreferences
  ): Array<{ time: Date; barberId: number; duration: number }> {
    const options: Array<{ time: Date; barberId: number; duration: number }> = []
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)
    
    // Consider preferred time slots
    const timeSlots = preferences.preferredTimeSlots.length 
      ? preferences.preferredTimeSlots 
      : [{ start: '09:00', end: '17:00' }]

    for (const slot of timeSlots) {
      const slotStart = this.parseTimeToDate(slot.start, date)
      const slotEnd = this.parseTimeToDate(slot.end, date)
      
      // Generate 15-minute intervals within slot
      for (let time = slotStart; time < slotEnd; time = addMinutes(time, 15)) {
        // Consider original barber first if preference is set
        const barberIds = preferences.preferSameBarber 
          ? [appointment.barber_id] 
          : this.getAvailableBarberIds(appointment)
        
        for (const barberId of barberIds) {
          // Consider original duration and shorter options if allowed
          const durations = preferences.allowShorterDuration
            ? [appointment.duration_minutes, Math.max(15, appointment.duration_minutes - 15), Math.max(15, appointment.duration_minutes - 30)]
            : [appointment.duration_minutes]
          
          for (const duration of durations) {
            const endTime = addMinutes(time, duration)
            if (endTime <= slotEnd) {
              options.push({ time: new Date(time), barberId, duration })
            }
          }
        }
      }
    }

    return options
  }

  // Score a rescheduling option
  private async scoreReschedulingOption(
    appointment: Appointment,
    option: { time: Date; barberId: number; duration: number },
    existingAppointments: Appointment[],
    barbers: Barber[],
    preferences: ReschedulingPreferences,
    clientPrefs?: ClientPreferences
  ): Promise<{
    confidence: number
    impactScore: number
    clientSatisfaction: number
    businessImpact: {
      revenueChange: number
      utilizationChange: number
      clientRetentionRisk: number
    }
    reasoning: string[]
  }> {
    const reasoning: string[] = []
    let confidence = 100
    let impactScore = 1
    let clientSatisfaction = 80
    
    const originalTime = new Date(appointment.start_time)
    const timeDifference = Math.abs(differenceInMinutes(option.time, originalTime))
    const barber = barbers.find(b => b.id === option.barberId)

    // Check availability
    const testAppointment: Appointment = {
      ...appointment,
      start_time: option.time.toISOString(),
      duration_minutes: option.duration,
      barber_id: option.barberId
    }

    const analysis = this.conflictEngine.analyzeConflicts(testAppointment, existingAppointments, barbers)
    
    if (analysis.hasConflicts) {
      confidence -= analysis.riskScore
      reasoning.push(`Conflicts detected (risk: ${analysis.riskScore})`)
    }

    // Time difference penalty
    if (timeDifference > 60) {
      const penalty = Math.min(30, timeDifference / 60 * 10)
      confidence -= penalty
      impactScore += Math.ceil(penalty / 10)
      reasoning.push(`${Math.ceil(timeDifference / 60)} hours from original time`)
    }

    // Client preferences scoring
    if (clientPrefs) {
      const dayOfWeek = option.time.getDay()
      const timeOfDay = format(option.time, 'HH:mm')
      
      // Preferred days
      if (clientPrefs.preferredDays.includes(dayOfWeek)) {
        confidence += 10
        clientSatisfaction += 15
        reasoning.push('Matches client preferred day')
      }
      
      // Preferred times
      const matchesPreferredTime = clientPrefs.preferredTimes.some(pref => 
        timeOfDay >= pref.start && timeOfDay <= pref.end
      )
      if (matchesPreferredTime) {
        confidence += 15
        clientSatisfaction += 20
        reasoning.push('Within client preferred time')
      }
      
      // Avoid times
      const inAvoidTime = clientPrefs.avoidTimes.some(avoid => 
        timeOfDay >= avoid.start && timeOfDay <= avoid.end
      )
      if (inAvoidTime) {
        confidence -= 20
        clientSatisfaction -= 25
        reasoning.push('During client avoid time')
      }
      
      // Flexibility score
      clientSatisfaction += clientPrefs.flexibilityScore * 2
      
      // Rescheduling history penalty
      if (clientPrefs.reschedulingHistory > 2) {
        confidence -= 10
        clientSatisfaction -= 15
        impactScore += 1
        reasoning.push('Client has been rescheduled multiple times')
      }
    }

    // Barber change penalty
    if (option.barberId !== appointment.barber_id) {
      confidence -= 15
      clientSatisfaction -= 10
      impactScore += 1
      reasoning.push(`Different barber: ${barber?.name || 'Unknown'}`)
    }

    // Duration change
    if (option.duration !== appointment.duration_minutes) {
      const durationDiff = appointment.duration_minutes - option.duration
      confidence -= Math.abs(durationDiff / 15 * 5)
      clientSatisfaction -= Math.abs(durationDiff / 15 * 8)
      impactScore += Math.ceil(Math.abs(durationDiff) / 30)
      reasoning.push(`Duration ${durationDiff > 0 ? 'reduced' : 'increased'} by ${Math.abs(durationDiff)} minutes`)
    }

    // Peak hours bonus
    const timeStr = format(option.time, 'HH:mm')
    const isDuringPeakHours = this.businessRules.peakHours.some(peak => 
      timeStr >= peak.start && timeStr <= peak.end
    )
    if (!isDuringPeakHours) {
      confidence += 5
      reasoning.push('Outside peak hours')
    }

    // Weekend penalty
    if (isWeekend(option.time) && preferences.avoidWeekends) {
      confidence -= 25
      clientSatisfaction -= 20
      reasoning.push('Weekend appointment')
    }

    // Business impact calculation
    const revenueChange = option.duration !== appointment.duration_minutes 
      ? (option.duration - appointment.duration_minutes) * 2 // $2 per minute assumption
      : 0
    
    const utilizationChange = analysis.timeSlotUtilization - 70 // Assuming 70% baseline
    const clientRetentionRisk = Math.max(0, (100 - clientSatisfaction) / 2)

    // Ensure confidence is within bounds
    confidence = Math.max(0, Math.min(100, confidence))
    clientSatisfaction = Math.max(0, Math.min(100, clientSatisfaction))
    impactScore = Math.max(1, Math.min(10, impactScore))

    return {
      confidence,
      impactScore,
      clientSatisfaction,
      businessImpact: {
        revenueChange,
        utilizationChange,
        clientRetentionRisk
      },
      reasoning
    }
  }

  // Check if appointment is eligible for rescheduling
  private isEligibleForRescheduling(appointment: Appointment, clientPrefs?: ClientPreferences): boolean {
    // Check minimum notice period
    const appointmentTime = new Date(appointment.start_time)
    const now = new Date()
    const hoursUntilAppointment = differenceInMinutes(appointmentTime, now) / 60
    
    if (hoursUntilAppointment < this.businessRules.minimumNoticeHours) {
      return false
    }

    // Check status
    if (appointment.status === 'completed' || appointment.status === 'no_show') {
      return false
    }

    // Check client rescheduling limit
    if (clientPrefs && clientPrefs.reschedulingHistory >= this.businessRules.maxReschedulingsPerClient) {
      return false
    }

    return true
  }

  // Analyze cascade effects
  private analyzeCascadeEffects(
    suggestion: ReschedulingSuggestion,
    existingAppointments: Appointment[],
    barbers: Barber[]
  ): Array<{ appointmentId: number; suggestedChanges: ReschedulingSuggestion }> {
    const cascades: Array<{ appointmentId: number; suggestedChanges: ReschedulingSuggestion }> = []
    
    // Check if the suggested change affects other appointments
    const suggestedTime = new Date(suggestion.suggestedTime)
    const suggestedEnd = addMinutes(suggestedTime, suggestion.suggestedDuration || suggestion.originalAppointment.duration_minutes)
    
    const affectedAppointments = existingAppointments.filter(apt => {
      if (apt.id === suggestion.originalAppointment.id) return false
      
      const aptStart = new Date(apt.start_time)
      const aptEnd = addMinutes(aptStart, apt.duration_minutes)
      
      // Check for overlaps or buffer violations
      return this.timesOverlap(suggestedTime, suggestedEnd, aptStart, aptEnd) ||
             this.violatesBuffer(suggestedTime, suggestedEnd, aptStart, aptEnd)
    })

    // Generate cascade suggestions for affected appointments
    for (const affected of affectedAppointments) {
      // This would recursively generate suggestions for affected appointments
      // For now, we'll mark them as needing manual review
      cascades.push({
        appointmentId: affected.id,
        suggestedChanges: {
          id: `cascade-${affected.id}`,
          originalAppointment: affected,
          suggestedTime: addMinutes(suggestedEnd, 15).toISOString(), // Simple cascade: move 15 min after
          confidence: 60,
          reasoning: ['Cascaded from another rescheduling'],
          impactScore: 3,
          clientSatisfactionPrediction: 70,
          businessImpact: {
            revenueChange: 0,
            utilizationChange: 0,
            clientRetentionRisk: 15
          },
          alternatives: []
        }
      })
    }

    return cascades
  }

  // Calculate total impact
  private calculateTotalImpact(
    suggestions: ReschedulingSuggestion[],
    cascadeEffects: Array<{ appointmentId: number; suggestedChanges: ReschedulingSuggestion }>
  ): number {
    const totalImpact = suggestions.reduce((sum, s) => sum + s.impactScore, 0) +
                       cascadeEffects.reduce((sum, c) => sum + c.suggestedChanges.impactScore, 0)
    
    return Math.min(100, totalImpact * 10) // Scale to 0-100
  }

  // Estimate overall client satisfaction
  private estimateClientSatisfaction(suggestions: ReschedulingSuggestion[]): number {
    if (suggestions.length === 0) return 0
    
    const averageSatisfaction = suggestions.reduce((sum, s) => sum + s.clientSatisfactionPrediction, 0) / suggestions.length
    return Math.round(averageSatisfaction)
  }

  // Determine recommended action
  private determineRecommendedAction(
    suggestions: ReschedulingSuggestion[],
    totalImpactScore: number,
    estimatedClientSatisfaction: number
  ): 'auto_apply' | 'present_options' | 'manual_review' {
    const highConfidenceSuggestions = suggestions.filter(s => s.confidence >= 80)
    
    if (highConfidenceSuggestions.length === suggestions.length && 
        totalImpactScore <= 30 && 
        estimatedClientSatisfaction >= 75) {
      return 'auto_apply'
    }
    
    if (totalImpactScore <= 60 && estimatedClientSatisfaction >= 60) {
      return 'present_options'
    }
    
    return 'manual_review'
  }

  // Helper methods
  private getAvailableBarberIds(appointment: Appointment): number[] {
    // This would typically query the database for available barbers
    // For now, return the original barber ID
    return [appointment.barber_id]
  }

  private parseTimeToDate(timeString: string, baseDate: Date): Date {
    const [hours, minutes] = timeString.split(':').map(Number)
    const result = new Date(baseDate)
    result.setHours(hours, minutes, 0, 0)
    return result
  }

  private timesOverlap(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    return isBefore(start1, end2) && isAfter(end1, start2)
  }

  private violatesBuffer(start1: Date, end1: Date, start2: Date, end2: Date): boolean {
    const bufferMinutes = 15
    const gap1 = differenceInMinutes(start2, end1)
    const gap2 = differenceInMinutes(start1, end2)
    
    return (gap1 >= 0 && gap1 < bufferMinutes) || (gap2 >= 0 && gap2 < bufferMinutes)
  }

  // Public methods for updating preferences
  setClientPreferences(clientId: number, preferences: ClientPreferences): void {
    this.clientPreferences.set(clientId, preferences)
  }

  updateBusinessRules(rules: Partial<typeof this.businessRules>): void {
    this.businessRules = { ...this.businessRules, ...rules }
  }
}

// React component for displaying rescheduling suggestions
export interface AutoReschedulingUIProps {
  result: AutoReschedulingResult
  onApplySuggestion: (suggestion: ReschedulingSuggestion) => void
  onApplyAll: () => void
  onReject: () => void
  className?: string
}

export function AutoReschedulingUI({
  result,
  onApplySuggestion,
  onApplyAll,
  onReject,
  className = ''
}: AutoReschedulingUIProps) {
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)

  const getActionColor = (action: string) => {
    switch (action) {
      case 'auto_apply': return 'text-green-700 bg-green-100 border-green-200'
      case 'present_options': return 'text-blue-700 bg-blue-100 border-blue-200'
      case 'manual_review': return 'text-orange-700 bg-orange-100 border-orange-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600 bg-green-50'
    if (confidence >= 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  if (!result.success) {
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <p className="text-gray-600">No automatic rescheduling suggestions available.</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with overall stats */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Automatic Rescheduling Suggestions</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getActionColor(result.recommendedAction)}`}>
            {result.recommendedAction.replace('_', ' ').toUpperCase()}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Impact:</span>
            <div className="font-semibold">{result.totalImpactScore}/100</div>
          </div>
          <div>
            <span className="text-gray-600">Client Satisfaction:</span>
            <div className="font-semibold">{result.estimatedClientSatisfaction}%</div>
          </div>
          <div>
            <span className="text-gray-600">Suggestions:</span>
            <div className="font-semibold">{result.suggestions.length}</div>
          </div>
        </div>
      </div>

      {/* Individual suggestions */}
      <div className="space-y-3">
        {result.suggestions.map((suggestion) => (
          <div key={suggestion.id} className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">
                      {suggestion.originalAppointment.service_name} - {suggestion.originalAppointment.client_name}
                    </h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                      {suggestion.confidence}% confidence
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <strong>From:</strong> {format(new Date(suggestion.originalAppointment.start_time), 'MMM d, h:mm a')}
                    </div>
                    <div>
                      <strong>To:</strong> {format(new Date(suggestion.suggestedTime), 'MMM d, h:mm a')}
                      {suggestion.suggestedBarber && ' (Different barber)'}
                      {suggestion.suggestedDuration && ` (${suggestion.suggestedDuration} min)`}
                    </div>
                    <div>
                      <strong>Impact:</strong> {suggestion.impactScore}/10 | 
                      <strong> Satisfaction:</strong> {suggestion.clientSatisfactionPrediction}%
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <button
                      onClick={() => setExpandedSuggestion(
                        expandedSuggestion === suggestion.id ? null : suggestion.id
                      )}
                      className="text-blue-600 text-sm hover:text-blue-800"
                    >
                      {expandedSuggestion === suggestion.id ? 'Hide details' : 'Show details'}
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={() => onApplySuggestion(suggestion)}
                  className="ml-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Apply
                </button>
              </div>
              
              {expandedSuggestion === suggestion.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <div>
                    <h5 className="font-medium text-sm mb-1">Reasoning:</h5>
                    <ul className="text-sm text-gray-600 list-disc list-inside">
                      {suggestion.reasoning.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {suggestion.alternatives.length > 0 && (
                    <div>
                      <h5 className="font-medium text-sm mb-1">Alternatives:</h5>
                      <div className="space-y-1">
                        {suggestion.alternatives.map((alt, idx) => (
                          <div key={idx} className="text-sm text-gray-600 flex justify-between">
                            <span>{format(new Date(alt.time), 'MMM d, h:mm a')}</span>
                            <span>{alt.confidence}% confidence</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <h5 className="font-medium text-sm mb-1">Business Impact:</h5>
                    <div className="text-sm text-gray-600 grid grid-cols-3 gap-2">
                      <div>Revenue: ${suggestion.businessImpact.revenueChange}</div>
                      <div>Utilization: {suggestion.businessImpact.utilizationChange > 0 ? '+' : ''}{suggestion.businessImpact.utilizationChange}%</div>
                      <div>Retention Risk: {suggestion.businessImpact.clientRetentionRisk}%</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Cascade effects */}
      {result.cascadeEffects.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">
            Cascade Effects ({result.cascadeEffects.length} appointments affected)
          </h4>
          <p className="text-sm text-yellow-700">
            These changes may require additional rescheduling of other appointments.
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        {result.recommendedAction === 'auto_apply' && (
          <button
            onClick={onApplyAll}
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Apply All Suggestions
          </button>
        )}
        <button
          onClick={onReject}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
        >
          Cancel Rescheduling
        </button>
      </div>
    </div>
  )
}

export default AutoReschedulingEngine