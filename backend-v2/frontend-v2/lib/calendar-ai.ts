'use client'

import { format, addDays, addMinutes, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns'
import type { BookingResponse } from '@/lib/api'

interface AppointmentPattern {
  clientName: string
  serviceType: string
  preferredTimes: string[]
  preferredDays: number[]
  frequency: 'weekly' | 'monthly' | 'irregular'
  duration: number
  lastBooking?: Date
}

interface TimePreference {
  hour: number
  minute: number
  weight: number // 0-1, higher means more preferred
}

interface SchedulingConstraints {
  workingHours: { start: string; end: string }
  workingDays: number[]
  breakTimes: { start: string; end: string }[]
  minimumBookingNotice: number // hours
  maximumBookingAdvance: number // days
  bufferTime: number // minutes between appointments
  preferredAppointmentLength: number // minutes
}

interface SchedulingSuggestion {
  id: string
  date: Date
  time: string
  duration: number
  confidence: number // 0-1
  reasoning: string
  conflictLevel: 'none' | 'low' | 'medium' | 'high'
  alternatives: {
    date: Date
    time: string
    confidence: number
  }[]
}

interface OptimizationResult {
  originalSchedule: BookingResponse[]
  optimizedSchedule: BookingResponse[]
  improvements: {
    reducedGaps: number
    betterUtilization: number
    reducedTravel: number
    clientSatisfaction: number
  }
  suggestions: string[]
}

interface ClientInsights {
  clientName: string
  bookingPatterns: {
    preferredTimes: TimePreference[]
    preferredDays: number[]
    averageFrequency: number
    seasonalTrends: { month: number; bookingCount: number }[]
  }
  servicePreferences: {
    serviceType: string
    frequency: number
    averageDuration: number
  }[]
  loyaltyScore: number
  riskOfChurn: number
  recommendedActions: string[]
}

class CalendarAI {
  private appointmentHistory: BookingResponse[] = []
  private clientPatterns: Map<string, AppointmentPattern> = new Map()
  private timePreferences: Map<string, TimePreference[]> = new Map()

  constructor() {
    this.initializeAI()
  }

  private initializeAI() {
    // Initialize with basic patterns and preferences
    console.log('Calendar AI initialized')
  }

  // Learn from appointment history
  public trainFromHistory(appointments: BookingResponse[]): void {
    this.appointmentHistory = [...appointments]
    this.extractClientPatterns()
    this.analyzeTimePreferences()
  }

  // Extract client booking patterns
  private extractClientPatterns(): void {
    const clientData = new Map<string, BookingResponse[]>()
    
    // Group appointments by client
    this.appointmentHistory.forEach(appointment => {
      const client = appointment.client_name || 'Unknown'
      if (!clientData.has(client)) {
        clientData.set(client, [])
      }
      clientData.get(client)!.push(appointment)
    })

    // Analyze patterns for each client
    clientData.forEach((appointments, clientName) => {
      if (appointments.length < 2) return

      const pattern = this.analyzeClientPattern(clientName, appointments)
      this.clientPatterns.set(clientName, pattern)
    })
  }

  private analyzeClientPattern(clientName: string, appointments: BookingResponse[]): AppointmentPattern {
    const sortedAppointments = appointments.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    // Extract preferred times
    const timeMap = new Map<string, number>()
    const dayMap = new Map<number, number>()
    const serviceMap = new Map<string, number>()
    let totalDuration = 0

    sortedAppointments.forEach(apt => {
      const date = new Date(apt.start_time)
      const time = format(date, 'HH:mm')
      const day = date.getDay()
      const service = apt.service_name || 'Unknown'
      const duration = apt.duration || 60

      timeMap.set(time, (timeMap.get(time) || 0) + 1)
      dayMap.set(day, (dayMap.get(day) || 0) + 1)
      serviceMap.set(service, (serviceMap.get(service) || 0) + 1)
      totalDuration += duration
    })

    // Get preferred times (top 3)
    const preferredTimes = Array.from(timeMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([time]) => time)

    // Get preferred days (top 3)
    const preferredDays = Array.from(dayMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day)

    // Determine frequency
    const frequency = this.determineFrequency(sortedAppointments)

    // Most common service type
    const serviceType = Array.from(serviceMap.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'Unknown'

    return {
      clientName,
      serviceType,
      preferredTimes,
      preferredDays,
      frequency,
      duration: Math.round(totalDuration / sortedAppointments.length),
      lastBooking: new Date(sortedAppointments[sortedAppointments.length - 1].start_time)
    }
  }

  private determineFrequency(appointments: BookingResponse[]): 'weekly' | 'monthly' | 'irregular' {
    if (appointments.length < 3) return 'irregular'

    const intervals: number[] = []
    for (let i = 1; i < appointments.length; i++) {
      const current = new Date(appointments[i].start_time)
      const previous = new Date(appointments[i - 1].start_time)
      const diffDays = Math.round((current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24))
      intervals.push(diffDays)
    }

    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length

    if (avgInterval <= 10) return 'weekly'
    if (avgInterval <= 35) return 'monthly'
    return 'irregular'
  }

  // Analyze time preferences across all appointments
  private analyzeTimePreferences(): void {
    const hourMap = new Map<number, number>()
    const dayHourMap = new Map<string, number>()

    this.appointmentHistory.forEach(apt => {
      const date = new Date(apt.start_time)
      const hour = date.getHours()
      const day = date.getDay()
      const dayHourKey = `${day}_${hour}`

      hourMap.set(hour, (hourMap.get(hour) || 0) + 1)
      dayHourMap.set(dayHourKey, (dayHourMap.get(dayHourKey) || 0) + 1)
    })

    // Calculate preferences for each hour
    const totalAppointments = this.appointmentHistory.length
    const preferences: TimePreference[] = []

    for (let hour = 6; hour <= 22; hour++) {
      const count = hourMap.get(hour) || 0
      const weight = totalAppointments > 0 ? count / totalAppointments : 0

      preferences.push({
        hour,
        minute: 0,
        weight: Math.min(weight * 2, 1) // Boost the weight for better suggestions
      })
    }

    this.timePreferences.set('global', preferences)
  }

  // Generate intelligent scheduling suggestions
  public generateSchedulingSuggestions(
    date: Date,
    serviceType: string,
    duration: number,
    clientName?: string,
    constraints: SchedulingConstraints = this.getDefaultConstraints()
  ): SchedulingSuggestion[] {
    const suggestions: SchedulingSuggestion[] = []
    const targetDate = startOfDay(date)

    // Get client pattern if available
    const clientPattern = clientName ? this.clientPatterns.get(clientName) : null
    const globalPreferences = this.timePreferences.get('global') || []

    // Generate suggestions for the target date
    const dateString = format(targetDate, 'yyyy-MM-dd')
    const availableSlots = this.findAvailableTimeSlots(targetDate, duration, constraints)

    availableSlots.forEach((slot, index) => {
      const confidence = this.calculateSlotConfidence(
        slot,
        serviceType,
        clientPattern,
        globalPreferences,
        constraints
      )

      const conflictLevel = this.assessConflictLevel(slot, targetDate)
      
      const suggestion: SchedulingSuggestion = {
        id: `suggestion_${dateString}_${slot}_${index}`,
        date: targetDate,
        time: slot,
        duration,
        confidence,
        reasoning: this.generateReasoning(slot, confidence, clientPattern, conflictLevel),
        conflictLevel,
        alternatives: this.generateAlternatives(targetDate, slot, duration, constraints)
      }

      suggestions.push(suggestion)
    })

    // Sort by confidence and return top suggestions
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5) // Return top 5 suggestions
  }

  private findAvailableTimeSlots(
    date: Date,
    duration: number,
    constraints: SchedulingConstraints
  ): string[] {
    const slots: string[] = []
    const [startHour, startMinute] = constraints.workingHours.start.split(':').map(Number)
    const [endHour, endMinute] = constraints.workingHours.end.split(':').map(Number)
    
    const workingStart = new Date(date)
    workingStart.setHours(startHour, startMinute, 0, 0)
    
    const workingEnd = new Date(date)
    workingEnd.setHours(endHour, endMinute, 0, 0)

    // Check if it's a working day
    if (!constraints.workingDays.includes(date.getDay())) {
      return slots
    }

    let currentTime = new Date(workingStart)
    
    while (addMinutes(currentTime, duration) <= workingEnd) {
      const timeString = format(currentTime, 'HH:mm')
      
      // Check if slot conflicts with existing appointments or breaks
      if (this.isSlotAvailable(currentTime, duration, constraints)) {
        slots.push(timeString)
      }
      
      currentTime = addMinutes(currentTime, 30) // 30-minute intervals
    }

    return slots
  }

  private isSlotAvailable(
    startTime: Date,
    duration: number,
    constraints: SchedulingConstraints
  ): boolean {
    const endTime = addMinutes(startTime, duration)

    // Check against break times
    for (const breakTime of constraints.breakTimes) {
      const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number)
      const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number)
      
      const breakStart = new Date(startTime)
      breakStart.setHours(breakStartHour, breakStartMinute, 0, 0)
      
      const breakEnd = new Date(startTime)
      breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0)

      if (isWithinInterval(startTime, { start: breakStart, end: breakEnd }) ||
          isWithinInterval(endTime, { start: breakStart, end: breakEnd })) {
        return false
      }
    }

    // Check against existing appointments
    const dayStart = startOfDay(startTime)
    const dayEnd = endOfDay(startTime)
    
    const dayAppointments = this.appointmentHistory.filter(apt => {
      const aptStart = new Date(apt.start_time)
      return isWithinInterval(aptStart, { start: dayStart, end: dayEnd })
    })

    for (const apt of dayAppointments) {
      const aptStart = new Date(apt.start_time)
      const aptEnd = new Date(apt.end_time || addMinutes(aptStart, apt.duration || 60))

      // Add buffer time
      const bufferedAptStart = addMinutes(aptStart, -constraints.bufferTime)
      const bufferedAptEnd = addMinutes(aptEnd, constraints.bufferTime)

      if (isWithinInterval(startTime, { start: bufferedAptStart, end: bufferedAptEnd }) ||
          isWithinInterval(endTime, { start: bufferedAptStart, end: bufferedAptEnd }) ||
          (startTime <= bufferedAptStart && endTime >= bufferedAptEnd)) {
        return false
      }
    }

    return true
  }

  private calculateSlotConfidence(
    timeSlot: string,
    serviceType: string,
    clientPattern: AppointmentPattern | null,
    globalPreferences: TimePreference[],
    constraints: SchedulingConstraints
  ): number {
    let confidence = 0.5 // Base confidence

    const [hour, minute] = timeSlot.split(':').map(Number)

    // Client preference weight (40%)
    if (clientPattern) {
      if (clientPattern.preferredTimes.includes(timeSlot)) {
        confidence += 0.4
      }
    }

    // Global time preference weight (30%)
    const globalPref = globalPreferences.find(pref => pref.hour === hour)
    if (globalPref) {
      confidence += globalPref.weight * 0.3
    }

    // Service type match weight (20%)
    if (clientPattern && clientPattern.serviceType === serviceType) {
      confidence += 0.2
    }

    // Peak hours bonus (10%)
    if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
      confidence += 0.1
    }

    // Avoid very early or very late hours
    if (hour < 8 || hour > 18) {
      confidence -= 0.2
    }

    return Math.max(0, Math.min(1, confidence))
  }

  private assessConflictLevel(timeSlot: string, date: Date): 'none' | 'low' | 'medium' | 'high' {
    const [hour] = timeSlot.split(':').map(Number)
    
    // Check how busy this time slot typically is
    const historicalCount = this.appointmentHistory.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate.getHours() === hour
    }).length

    const totalAppointments = this.appointmentHistory.length
    const utilization = totalAppointments > 0 ? historicalCount / totalAppointments : 0

    if (utilization < 0.1) return 'none'
    if (utilization < 0.3) return 'low'
    if (utilization < 0.6) return 'medium'
    return 'high'
  }

  private generateReasoning(
    timeSlot: string,
    confidence: number,
    clientPattern: AppointmentPattern | null,
    conflictLevel: string
  ): string {
    const reasons: string[] = []

    if (confidence > 0.8) {
      reasons.push('Highly recommended based on historical preferences')
    } else if (confidence > 0.6) {
      reasons.push('Good fit based on booking patterns')
    } else if (confidence > 0.4) {
      reasons.push('Moderate recommendation')
    } else {
      reasons.push('Alternative option available')
    }

    if (clientPattern) {
      if (clientPattern.preferredTimes.includes(timeSlot)) {
        reasons.push(`${clientPattern.clientName} typically books at this time`)
      }
    }

    if (conflictLevel === 'none') {
      reasons.push('Low competition for this time slot')
    } else if (conflictLevel === 'high') {
      reasons.push('Popular time slot - book early')
    }

    return reasons.join('. ')
  }

  private generateAlternatives(
    date: Date,
    preferredTime: string,
    duration: number,
    constraints: SchedulingConstraints
  ): { date: Date; time: string; confidence: number }[] {
    const alternatives: { date: Date; time: string; confidence: number }[] = []
    
    // Generate alternatives for same day (different times)
    const sameDaySlots = this.findAvailableTimeSlots(date, duration, constraints)
    sameDaySlots
      .filter(time => time !== preferredTime)
      .slice(0, 2)
      .forEach(time => {
        alternatives.push({
          date,
          time,
          confidence: Math.random() * 0.8 // Simplified for demo
        })
      })

    // Generate alternatives for next few days
    for (let i = 1; i <= 3; i++) {
      const altDate = addDays(date, i)
      const altSlots = this.findAvailableTimeSlots(altDate, duration, constraints)
      
      if (altSlots.includes(preferredTime)) {
        alternatives.push({
          date: altDate,
          time: preferredTime,
          confidence: 0.9 - (i * 0.1)
        })
      } else if (altSlots.length > 0) {
        alternatives.push({
          date: altDate,
          time: altSlots[0],
          confidence: 0.8 - (i * 0.1)
        })
      }
    }

    return alternatives.slice(0, 3) // Return top 3 alternatives
  }

  // Optimize existing schedule
  public optimizeSchedule(
    appointments: BookingResponse[],
    constraints: SchedulingConstraints
  ): OptimizationResult {
    const originalSchedule = [...appointments]
    let optimizedSchedule = [...appointments]
    
    // Sort appointments by date and time
    optimizedSchedule.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    const improvements = {
      reducedGaps: 0,
      betterUtilization: 0,
      reducedTravel: 0,
      clientSatisfaction: 0
    }

    const suggestions: string[] = []

    // Calculate gaps in original schedule
    const originalGaps = this.calculateTotalGaps(originalSchedule)
    
    // Attempt to minimize gaps by rearranging appointments
    const rearranged = this.minimizeGaps(optimizedSchedule, constraints)
    optimizedSchedule = rearranged

    // Calculate improvements
    const optimizedGaps = this.calculateTotalGaps(optimizedSchedule)
    improvements.reducedGaps = Math.max(0, originalGaps - optimizedGaps)

    // Calculate utilization improvement
    const originalUtilization = this.calculateUtilization(originalSchedule, constraints)
    const optimizedUtilization = this.calculateUtilization(optimizedSchedule, constraints)
    improvements.betterUtilization = optimizedUtilization - originalUtilization

    // Generate suggestions
    if (improvements.reducedGaps > 0) {
      suggestions.push(`Reduced gaps by ${improvements.reducedGaps} minutes through better scheduling`)
    }
    
    if (improvements.betterUtilization > 0) {
      suggestions.push(`Improved utilization by ${(improvements.betterUtilization * 100).toFixed(1)}%`)
    }

    if (optimizedGaps > 60) {
      suggestions.push('Consider booking shorter services during remaining gap times')
    }

    return {
      originalSchedule,
      optimizedSchedule,
      improvements,
      suggestions
    }
  }

  private calculateTotalGaps(appointments: BookingResponse[]): number {
    if (appointments.length < 2) return 0

    const sorted = appointments.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    let totalGaps = 0
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]
      const next = sorted[i + 1]
      
      const currentEnd = new Date(current.end_time || addMinutes(new Date(current.start_time), current.duration || 60))
      const nextStart = new Date(next.start_time)
      
      // Only count gaps on the same day
      if (currentEnd.toDateString() === nextStart.toDateString()) {
        const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60)
        if (gapMinutes > 0) {
          totalGaps += gapMinutes
        }
      }
    }

    return totalGaps
  }

  private minimizeGaps(appointments: BookingResponse[], constraints: SchedulingConstraints): BookingResponse[] {
    // This is a simplified optimization - in practice, you'd use more sophisticated algorithms
    return appointments // For demo, return unchanged
  }

  private calculateUtilization(appointments: BookingResponse[], constraints: SchedulingConstraints): number {
    if (appointments.length === 0) return 0

    const totalScheduledTime = appointments.reduce((sum, apt) => {
      return sum + (apt.duration || 60)
    }, 0)

    // Calculate total available time (simplified)
    const [startHour] = constraints.workingHours.start.split(':').map(Number)
    const [endHour] = constraints.workingHours.end.split(':').map(Number)
    const dailyAvailableMinutes = (endHour - startHour) * 60
    const workingDays = constraints.workingDays.length
    
    // Assume 5 working days for simplification
    const weeklyAvailableMinutes = dailyAvailableMinutes * workingDays
    
    return totalScheduledTime / weeklyAvailableMinutes
  }

  // Generate client insights
  public generateClientInsights(clientName: string): ClientInsights | null {
    const pattern = this.clientPatterns.get(clientName)
    if (!pattern) return null

    const clientAppointments = this.appointmentHistory.filter(apt => 
      apt.client_name === clientName
    )

    const insights: ClientInsights = {
      clientName,
      bookingPatterns: {
        preferredTimes: this.analyzeClientTimePreferences(clientAppointments),
        preferredDays: pattern.preferredDays,
        averageFrequency: this.calculateAverageFrequency(clientAppointments),
        seasonalTrends: this.analyzeSeasonalTrends(clientAppointments)
      },
      servicePreferences: this.analyzeServicePreferences(clientAppointments),
      loyaltyScore: this.calculateLoyaltyScore(clientAppointments),
      riskOfChurn: this.calculateChurnRisk(clientAppointments),
      recommendedActions: this.generateRecommendedActions(clientAppointments, pattern)
    }

    return insights
  }

  private analyzeClientTimePreferences(appointments: BookingResponse[]): TimePreference[] {
    const timeMap = new Map<string, number>()
    
    appointments.forEach(apt => {
      const time = format(new Date(apt.start_time), 'HH:mm')
      timeMap.set(time, (timeMap.get(time) || 0) + 1)
    })

    return Array.from(timeMap.entries())
      .map(([time, count]) => {
        const [hour, minute] = time.split(':').map(Number)
        return {
          hour,
          minute,
          weight: count / appointments.length
        }
      })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5)
  }

  private calculateAverageFrequency(appointments: BookingResponse[]): number {
    if (appointments.length < 2) return 0

    const sorted = appointments.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    const intervals: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      const current = new Date(sorted[i].start_time)
      const previous = new Date(sorted[i - 1].start_time)
      const diffDays = (current.getTime() - previous.getTime()) / (1000 * 60 * 60 * 24)
      intervals.push(diffDays)
    }

    return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
  }

  private analyzeSeasonalTrends(appointments: BookingResponse[]): { month: number; bookingCount: number }[] {
    const monthMap = new Map<number, number>()
    
    appointments.forEach(apt => {
      const month = new Date(apt.start_time).getMonth()
      monthMap.set(month, (monthMap.get(month) || 0) + 1)
    })

    return Array.from(monthMap.entries())
      .map(([month, count]) => ({ month, bookingCount: count }))
      .sort((a, b) => a.month - b.month)
  }

  private analyzeServicePreferences(appointments: BookingResponse[]): {
    serviceType: string
    frequency: number
    averageDuration: number
  }[] {
    const serviceMap = new Map<string, { count: number; totalDuration: number }>()
    
    appointments.forEach(apt => {
      const service = apt.service_name || 'Unknown'
      const duration = apt.duration || 60
      
      if (!serviceMap.has(service)) {
        serviceMap.set(service, { count: 0, totalDuration: 0 })
      }
      
      const data = serviceMap.get(service)!
      data.count += 1
      data.totalDuration += duration
    })

    return Array.from(serviceMap.entries())
      .map(([serviceType, data]) => ({
        serviceType,
        frequency: data.count / appointments.length,
        averageDuration: data.totalDuration / data.count
      }))
      .sort((a, b) => b.frequency - a.frequency)
  }

  private calculateLoyaltyScore(appointments: BookingResponse[]): number {
    // Simplified loyalty calculation
    const totalAppointments = appointments.length
    const monthsActive = this.calculateMonthsActive(appointments)
    const regularityScore = this.calculateRegularityScore(appointments)
    
    let score = 0
    
    // Appointment frequency score (0-40 points)
    score += Math.min(40, totalAppointments * 2)
    
    // Longevity score (0-30 points)
    score += Math.min(30, monthsActive * 3)
    
    // Regularity score (0-30 points)
    score += regularityScore * 30
    
    return Math.min(100, score)
  }

  private calculateMonthsActive(appointments: BookingResponse[]): number {
    if (appointments.length === 0) return 0
    
    const sorted = appointments.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
    
    const first = new Date(sorted[0].start_time)
    const last = new Date(sorted[sorted.length - 1].start_time)
    
    const diffTime = Math.abs(last.getTime() - first.getTime())
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30))
    
    return diffMonths
  }

  private calculateRegularityScore(appointments: BookingResponse[]): number {
    const frequency = this.calculateAverageFrequency(appointments)
    
    if (frequency <= 7) return 1 // Weekly or more frequent
    if (frequency <= 14) return 0.8 // Bi-weekly
    if (frequency <= 30) return 0.6 // Monthly
    if (frequency <= 60) return 0.4 // Bi-monthly
    return 0.2 // Less frequent
  }

  private calculateChurnRisk(appointments: BookingResponse[]): number {
    if (appointments.length === 0) return 1

    const sorted = appointments.sort((a, b) => 
      new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
    )

    const lastBooking = new Date(sorted[0].start_time)
    const now = new Date()
    const daysSinceLastBooking = (now.getTime() - lastBooking.getTime()) / (1000 * 60 * 60 * 24)
    
    const averageFrequency = this.calculateAverageFrequency(appointments)
    const expectedNextBooking = averageFrequency * 1.5 // Allow some buffer
    
    if (daysSinceLastBooking > expectedNextBooking) {
      return Math.min(1, daysSinceLastBooking / expectedNextBooking - 1)
    }
    
    return 0
  }

  private generateRecommendedActions(appointments: BookingResponse[], pattern: AppointmentPattern): string[] {
    const actions: string[] = []
    const now = new Date()
    
    if (pattern.lastBooking) {
      const daysSince = (now.getTime() - pattern.lastBooking.getTime()) / (1000 * 60 * 60 * 24)
      
      if (daysSince > 30) {
        actions.push('Send re-engagement email or offer')
      }
      
      if (pattern.frequency === 'weekly' && daysSince > 10) {
        actions.push('Remind about next weekly appointment')
      }
      
      if (pattern.frequency === 'monthly' && daysSince > 35) {
        actions.push('Send monthly appointment reminder')
      }
    }
    
    const loyaltyScore = this.calculateLoyaltyScore(appointments)
    if (loyaltyScore > 80) {
      actions.push('Offer loyalty rewards or referral incentives')
    }
    
    const churnRisk = this.calculateChurnRisk(appointments)
    if (churnRisk > 0.5) {
      actions.push('High churn risk - consider retention campaign')
    }
    
    return actions
  }

  private getDefaultConstraints(): SchedulingConstraints {
    return {
      workingHours: { start: '09:00', end: '18:00' },
      workingDays: [1, 2, 3, 4, 5], // Monday to Friday
      breakTimes: [{ start: '12:00', end: '13:00' }],
      minimumBookingNotice: 2, // 2 hours
      maximumBookingAdvance: 30, // 30 days
      bufferTime: 15, // 15 minutes
      preferredAppointmentLength: 60 // 60 minutes
    }
  }
}

// Singleton instance
export const calendarAI = new CalendarAI()

// Utility functions
export function initializeCalendarAI(appointments: BookingResponse[]) {
  calendarAI.trainFromHistory(appointments)
}

export function getSmartSuggestions(
  date: Date,
  serviceType: string,
  duration: number,
  clientName?: string,
  constraints?: SchedulingConstraints
): SchedulingSuggestion[] {
  return calendarAI.generateSchedulingSuggestions(date, serviceType, duration, clientName, constraints)
}

export function optimizeExistingSchedule(
  appointments: BookingResponse[],
  constraints?: SchedulingConstraints
): OptimizationResult {
  return calendarAI.optimizeSchedule(appointments, constraints || calendarAI['getDefaultConstraints']())
}

export function getClientInsights(clientName: string): ClientInsights | null {
  return calendarAI.generateClientInsights(clientName)
}

export type {
  AppointmentPattern,
  SchedulingSuggestion,
  OptimizationResult,
  ClientInsights,
  SchedulingConstraints,
  TimePreference
}