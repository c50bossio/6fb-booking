/**
 * Intelligent Appointment Scheduling System
 * AI-powered scheduling algorithms for optimal calendar management
 * Version: 1.0.0
 */

export interface AppointmentSlot {
  id: string
  start: Date
  end: Date
  barberId: number
  serviceId: number
  duration: number
  isAvailable: boolean
  conflictProbability: number
  preferenceScore: number
  efficiencyScore: number
}

export interface SchedulingPreference {
  barberId?: number
  preferredTimes?: string[] // e.g., ['morning', 'afternoon', 'evening']
  avoidBackToBack?: boolean
  maximizeBookings?: boolean
  minimizeGaps?: boolean
  balanceWorkload?: boolean
  prioritizeRegularClients?: boolean
}

export interface SchedulingConstraint {
  barberId: number
  startTime: Date
  endTime: Date
  type: 'unavailable' | 'break' | 'lunch' | 'buffer'
  recurring?: 'daily' | 'weekly' | 'monthly'
}

export interface ClientPreference {
  clientId: string
  preferredBarbers?: number[]
  preferredTimeSlots?: { start: string; end: string }[]
  avoidedTimeSlots?: { start: string; end: string }[]
  lastAppointmentDate?: Date
  appointmentHistory: AppointmentHistory[]
  loyaltyScore: number
}

export interface AppointmentHistory {
  date: Date
  barberId: number
  serviceId: number
  duration: number
  satisfaction: number
  noShow: boolean
  cancelled: boolean
}

export interface SchedulingOptimization {
  totalScore: number
  barberUtilization: Record<number, number>
  gapEfficiency: number
  clientSatisfaction: number
  conflictReduction: number
  recommendations: SchedulingRecommendation[]
}

export interface SchedulingRecommendation {
  type: 'reschedule' | 'swap' | 'add_break' | 'extend_hours' | 'staff_adjustment'
  priority: 'high' | 'medium' | 'low'
  description: string
  impact: string
  appointmentIds?: string[]
  suggestedTime?: Date
  estimatedImprovement: number
}

class IntelligentSchedulingEngine {
  private preferences: SchedulingPreference
  private constraints: SchedulingConstraint[]
  private clientPreferences: Map<string, ClientPreference>
  private appointmentHistory: AppointmentHistory[]
  private barberEfficiency: Map<number, number>
  private timeSlotPopularity: Map<string, number>

  constructor(preferences: SchedulingPreference = {}) {
    this.preferences = {
      avoidBackToBack: true,
      maximizeBookings: true,
      minimizeGaps: true,
      balanceWorkload: true,
      prioritizeRegularClients: true,
      ...preferences
    }
    
    this.constraints = []
    this.clientPreferences = new Map()
    this.appointmentHistory = []
    this.barberEfficiency = new Map()
    this.timeSlotPopularity = new Map()
  }

  // Core scheduling algorithm
  public findOptimalSlots(
    serviceId: number,
    duration: number,
    preferredDate: Date,
    clientId?: string,
    options: {
      maxResults?: number
      timeRange?: { start: string; end: string }
      excludeBarbers?: number[]
      preferredBarbers?: number[]
    } = {}
  ): AppointmentSlot[] {
    const {
      maxResults = 10,
      timeRange = { start: '09:00', end: '18:00' },
      excludeBarbers = [],
      preferredBarbers = []
    } = options

    // Generate all possible time slots for the day
    const possibleSlots = this.generateTimeSlots(
      preferredDate,
      duration,
      timeRange,
      excludeBarbers
    )

    // Score each slot based on multiple factors
    const scoredSlots = possibleSlots.map(slot => ({
      ...slot,
      conflictProbability: this.calculateConflictProbability(slot),
      preferenceScore: this.calculatePreferenceScore(slot, clientId, preferredBarbers),
      efficiencyScore: this.calculateEfficiencyScore(slot)
    }))

    // Sort by combined score and return top results
    return scoredSlots
      .sort((a, b) => this.getSlotTotalScore(b) - this.getSlotTotalScore(a))
      .slice(0, maxResults)
  }

  // Advanced scheduling optimization
  public optimizeSchedule(
    appointments: any[],
    date: Date,
    constraints: SchedulingConstraint[] = []
  ): SchedulingOptimization {
    this.constraints = constraints

    // Analyze current schedule
    const currentScore = this.calculateScheduleScore(appointments, date)
    
    // Generate optimization recommendations
    const recommendations = this.generateRecommendations(appointments, date)
    
    // Calculate utilization metrics
    const barberUtilization = this.calculateBarberUtilization(appointments, date)
    
    return {
      totalScore: currentScore.totalScore,
      barberUtilization,
      gapEfficiency: currentScore.gapEfficiency,
      clientSatisfaction: currentScore.clientSatisfaction,
      conflictReduction: currentScore.conflictReduction,
      recommendations
    }
  }

  // Intelligent conflict resolution
  public resolveSchedulingConflicts(
    conflictingAppointments: any[]
  ): SchedulingRecommendation[] {
    const recommendations: SchedulingRecommendation[] = []

    for (const appointment of conflictingAppointments) {
      // Analyze conflict type and severity
      const conflictAnalysis = this.analyzeConflict(appointment)
      
      // Generate resolution strategies
      const strategies = this.generateResolutionStrategies(appointment, conflictAnalysis)
      
      recommendations.push(...strategies)
    }

    // Sort by priority and expected impact
    return recommendations.sort((a, b) => {
      const priorityScore = { high: 3, medium: 2, low: 1 }
      return priorityScore[b.priority] - priorityScore[a.priority] ||
             b.estimatedImprovement - a.estimatedImprovement
    })
  }

  // Machine learning-based demand prediction
  public predictDemand(
    date: Date,
    serviceId?: number,
    barberId?: number,
    timeRange?: { start: string; end: string }
  ): {
    expectedBookings: number
    peakHours: string[]
    recommendedStaffing: number
    confidenceScore: number
  } {
    // Analyze historical patterns
    const historicalData = this.analyzeHistoricalDemand(date, serviceId, barberId)
    
    // Consider seasonal factors
    const seasonalAdjustment = this.calculateSeasonalAdjustment(date)
    
    // Account for special events or holidays
    const eventAdjustment = this.calculateEventAdjustment(date)
    
    // Calculate base prediction
    const baseDemand = historicalData.averageDemand * seasonalAdjustment * eventAdjustment
    
    // Identify peak hours
    const peakHours = this.identifyPeakHours(historicalData.hourlyDistribution)
    
    // Recommend staffing levels
    const recommendedStaffing = Math.ceil(baseDemand / this.getAverageAppointmentsPerBarber())
    
    return {
      expectedBookings: Math.round(baseDemand),
      peakHours,
      recommendedStaffing,
      confidenceScore: historicalData.dataQuality
    }
  }

  // Client preference learning
  public updateClientPreferences(
    clientId: string,
    appointmentData: {
      barberId: number
      serviceId: number
      timeSlot: Date
      satisfaction?: number
      completed: boolean
    }
  ): void {
    let clientPref = this.clientPreferences.get(clientId)
    
    if (!clientPref) {
      clientPref = {
        clientId,
        appointmentHistory: [],
        loyaltyScore: 0
      }
    }

    // Add to history
    clientPref.appointmentHistory.push({
      date: appointmentData.timeSlot,
      barberId: appointmentData.barberId,
      serviceId: appointmentData.serviceId,
      duration: 30, // Default, should be passed in
      satisfaction: appointmentData.satisfaction || 5,
      noShow: !appointmentData.completed,
      cancelled: false
    })

    // Update preferences based on patterns
    this.analyzeClientPatterns(clientPref)
    
    // Update loyalty score
    this.updateLoyaltyScore(clientPref)
    
    this.clientPreferences.set(clientId, clientPref)
  }

  // Generate time slots for a given day
  private generateTimeSlots(
    date: Date,
    duration: number,
    timeRange: { start: string; end: string },
    excludeBarbers: number[]
  ): AppointmentSlot[] {
    const slots: AppointmentSlot[] = []
    const availableBarbers = this.getAvailableBarbers(date, excludeBarbers)
    
    const [startHour, startMinute] = timeRange.start.split(':').map(Number)
    const [endHour, endMinute] = timeRange.end.split(':').map(Number)
    
    const startTime = new Date(date)
    startTime.setHours(startHour, startMinute, 0, 0)
    
    const endTime = new Date(date)
    endTime.setHours(endHour, endMinute, 0, 0)
    
    // Generate slots in 15-minute increments
    const slotIncrement = 15 * 60 * 1000 // 15 minutes in milliseconds
    
    for (let barberId of availableBarbers) {
      let currentTime = new Date(startTime)
      
      while (currentTime.getTime() + (duration * 60 * 1000) <= endTime.getTime()) {
        const slotEnd = new Date(currentTime.getTime() + (duration * 60 * 1000))
        
        if (this.isSlotAvailable(barberId, currentTime, slotEnd)) {
          slots.push({
            id: `${barberId}-${currentTime.getTime()}`,
            start: new Date(currentTime),
            end: slotEnd,
            barberId,
            serviceId: 0, // Will be set when booking
            duration,
            isAvailable: true,
            conflictProbability: 0,
            preferenceScore: 0,
            efficiencyScore: 0
          })
        }
        
        currentTime = new Date(currentTime.getTime() + slotIncrement)
      }
    }
    
    return slots
  }

  private calculateConflictProbability(slot: AppointmentSlot): number {
    let probability = 0

    // Check for overlapping appointments
    const overlapping = this.hasOverlappingAppointments(slot)
    if (overlapping) probability += 0.8

    // Check for back-to-back appointments if preference is to avoid them
    if (this.preferences.avoidBackToBack) {
      const hasBackToBack = this.hasBackToBackAppointments(slot)
      if (hasBackToBack) probability += 0.3
    }

    // Check for barber constraints
    const hasConstraints = this.violatesConstraints(slot)
    if (hasConstraints) probability += 0.5

    return Math.min(probability, 1.0)
  }

  private calculatePreferenceScore(
    slot: AppointmentSlot,
    clientId?: string,
    preferredBarbers: number[] = []
  ): number {
    let score = 0.5 // Base score

    // Client preferences
    if (clientId) {
      const clientPref = this.clientPreferences.get(clientId)
      if (clientPref) {
        // Preferred barber bonus
        if (clientPref.preferredBarbers?.includes(slot.barberId)) {
          score += 0.3
        }

        // Preferred time slot bonus
        if (this.isPreferredTime(slot, clientPref)) {
          score += 0.2
        }

        // Loyalty bonus
        score += clientPref.loyaltyScore * 0.1
      }
    }

    // Preferred barbers from request
    if (preferredBarbers.includes(slot.barberId)) {
      score += 0.2
    }

    // Time slot popularity (lower is better for availability)
    const popularityPenalty = this.timeSlotPopularity.get(this.getTimeSlotKey(slot)) || 0
    score -= popularityPenalty * 0.1

    return Math.max(0, Math.min(1, score))
  }

  private calculateEfficiencyScore(slot: AppointmentSlot): number {
    let score = 0.5

    // Barber efficiency bonus
    const barberEff = this.barberEfficiency.get(slot.barberId) || 0.5
    score += barberEff * 0.3

    // Gap minimization
    if (this.preferences.minimizeGaps) {
      const gapScore = this.calculateGapScore(slot)
      score += gapScore * 0.2
    }

    // Utilization optimization
    if (this.preferences.maximizeBookings) {
      const utilizationScore = this.calculateUtilizationScore(slot)
      score += utilizationScore * 0.2
    }

    return Math.max(0, Math.min(1, score))
  }

  private getSlotTotalScore(slot: AppointmentSlot): number {
    const conflictWeight = 0.4
    const preferenceWeight = 0.3
    const efficiencyWeight = 0.3

    return (
      (1 - slot.conflictProbability) * conflictWeight +
      slot.preferenceScore * preferenceWeight +
      slot.efficiencyScore * efficiencyWeight
    )
  }

  private calculateScheduleScore(appointments: any[], date: Date) {
    // Implement comprehensive schedule scoring
    const gapEfficiency = this.calculateGapEfficiency(appointments)
    const clientSatisfaction = this.calculateClientSatisfaction(appointments)
    const conflictReduction = this.calculateConflictReduction(appointments)
    
    const totalScore = (gapEfficiency + clientSatisfaction + conflictReduction) / 3

    return {
      totalScore,
      gapEfficiency,
      clientSatisfaction,
      conflictReduction
    }
  }

  private generateRecommendations(appointments: any[], date: Date): SchedulingRecommendation[] {
    const recommendations: SchedulingRecommendation[] = []

    // Analyze gaps and suggest optimization
    const gaps = this.findScheduleGaps(appointments, date)
    if (gaps.length > 0) {
      recommendations.push({
        type: 'reschedule',
        priority: 'medium',
        description: `${gaps.length} scheduling gaps detected that could be optimized`,
        impact: 'Improved barber utilization and reduced idle time',
        estimatedImprovement: 15
      })
    }

    // Check for overbooked periods
    const overbookedPeriods = this.findOverbookedPeriods(appointments, date)
    if (overbookedPeriods.length > 0) {
      recommendations.push({
        type: 'staff_adjustment',
        priority: 'high',
        description: 'Peak periods require additional staffing',
        impact: 'Reduced wait times and improved client satisfaction',
        estimatedImprovement: 25
      })
    }

    // Suggest break optimization
    const breakOptimization = this.optimizeBreaks(appointments, date)
    if (breakOptimization.improvement > 10) {
      recommendations.push({
        type: 'add_break',
        priority: 'low',
        description: 'Break scheduling could be optimized',
        impact: 'Better staff well-being and sustained performance',
        estimatedImprovement: breakOptimization.improvement
      })
    }

    return recommendations
  }

  // Helper methods (simplified implementations)
  private analyzeConflict(appointment: any) {
    return { severity: 'medium', type: 'overlap' }
  }

  private generateResolutionStrategies(appointment: any, analysis: any): SchedulingRecommendation[] {
    return [{
      type: 'reschedule',
      priority: 'high',
      description: 'Reschedule conflicting appointment',
      impact: 'Resolves scheduling conflict',
      estimatedImprovement: 100
    }]
  }

  private analyzeHistoricalDemand(date: Date, serviceId?: number, barberId?: number) {
    return {
      averageDemand: 15,
      hourlyDistribution: new Map(),
      dataQuality: 0.8
    }
  }

  private calculateSeasonalAdjustment(date: Date): number {
    // Simple seasonal adjustment - would be more sophisticated in production
    const month = date.getMonth()
    const seasonalFactors = [0.8, 0.8, 0.9, 1.0, 1.1, 1.2, 1.2, 1.1, 1.0, 0.9, 0.8, 0.8]
    return seasonalFactors[month]
  }

  private calculateEventAdjustment(date: Date): number {
    // Check for holidays, special events, etc.
    // This would integrate with a calendar service in production
    return 1.0
  }

  private identifyPeakHours(hourlyDistribution: Map<number, number>): string[] {
    // Simplified peak hour identification
    return ['10:00-12:00', '14:00-16:00']
  }

  private getAverageAppointmentsPerBarber(): number {
    return 8 // Average appointments per barber per day
  }

  private analyzeClientPatterns(clientPref: ClientPreference): void {
    // Analyze appointment history to identify patterns
    const history = clientPref.appointmentHistory
    
    if (history.length >= 3) {
      // Find preferred barbers
      const barberFrequency = new Map<number, number>()
      history.forEach(apt => {
        barberFrequency.set(apt.barberId, (barberFrequency.get(apt.barberId) || 0) + 1)
      })
      
      clientPref.preferredBarbers = Array.from(barberFrequency.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([barberId]) => barberId)
    }
  }

  private updateLoyaltyScore(clientPref: ClientPreference): void {
    const history = clientPref.appointmentHistory
    const totalAppointments = history.length
    const completedAppointments = history.filter(apt => !apt.noShow && !apt.cancelled).length
    const avgSatisfaction = history.reduce((sum, apt) => sum + apt.satisfaction, 0) / totalAppointments
    
    clientPref.loyaltyScore = Math.min(1.0, 
      (completedAppointments / totalAppointments) * 0.5 + 
      (avgSatisfaction / 10) * 0.3 + 
      (totalAppointments / 20) * 0.2
    )
  }

  // Simplified helper methods for core functionality
  private getAvailableBarbers(date: Date, excludeBarbers: number[]): number[] {
    // Return mock barber IDs - would query database in production
    return [1, 2, 3, 4, 5].filter(id => !excludeBarbers.includes(id))
  }

  private isSlotAvailable(barberId: number, start: Date, end: Date): boolean {
    // Check against existing appointments and constraints
    return !this.constraints.some(constraint => 
      constraint.barberId === barberId &&
      start < constraint.endTime &&
      end > constraint.startTime
    )
  }

  private hasOverlappingAppointments(slot: AppointmentSlot): boolean {
    // Check for overlapping appointments - simplified
    return false
  }

  private hasBackToBackAppointments(slot: AppointmentSlot): boolean {
    // Check for back-to-back appointments - simplified
    return false
  }

  private violatesConstraints(slot: AppointmentSlot): boolean {
    return this.constraints.some(constraint =>
      constraint.barberId === slot.barberId &&
      slot.start < constraint.endTime &&
      slot.end > constraint.startTime
    )
  }

  private isPreferredTime(slot: AppointmentSlot, clientPref: ClientPreference): boolean {
    // Check if slot matches client's preferred time patterns
    return clientPref.preferredTimeSlots?.some(timeSlot => {
      const [startHour] = timeSlot.start.split(':').map(Number)
      const [endHour] = timeSlot.end.split(':').map(Number)
      const slotHour = slot.start.getHours()
      return slotHour >= startHour && slotHour < endHour
    }) || false
  }

  private getTimeSlotKey(slot: AppointmentSlot): string {
    return `${slot.start.getHours()}:${slot.start.getMinutes().toString().padStart(2, '0')}`
  }

  private calculateGapScore(slot: AppointmentSlot): number {
    // Calculate how well this slot fills gaps - simplified
    return 0.5
  }

  private calculateUtilizationScore(slot: AppointmentSlot): number {
    // Calculate utilization optimization score - simplified
    return 0.5
  }

  private calculateBarberUtilization(appointments: any[], date: Date): Record<number, number> {
    // Calculate utilization percentage for each barber
    const utilization: Record<number, number> = {}
    const barbers = this.getAvailableBarbers(date, [])
    
    barbers.forEach(barberId => {
      const barberAppointments = appointments.filter(apt => apt.barber_id === barberId)
      const totalMinutes = barberAppointments.reduce((sum, apt) => sum + (apt.duration || 30), 0)
      const workDayMinutes = 8 * 60 // 8 hours
      utilization[barberId] = Math.min(100, (totalMinutes / workDayMinutes) * 100)
    })
    
    return utilization
  }

  private calculateGapEfficiency(appointments: any[]): number {
    // Calculate how efficiently gaps are utilized - simplified
    return 75
  }

  private calculateClientSatisfaction(appointments: any[]): number {
    // Calculate predicted client satisfaction - simplified
    return 85
  }

  private calculateConflictReduction(appointments: any[]): number {
    // Calculate conflict reduction score - simplified
    return 90
  }

  private findScheduleGaps(appointments: any[], date: Date): any[] {
    // Find gaps in the schedule - simplified
    return []
  }

  private findOverbookedPeriods(appointments: any[], date: Date): any[] {
    // Find periods with too many appointments - simplified
    return []
  }

  private optimizeBreaks(appointments: any[], date: Date): { improvement: number } {
    // Optimize break scheduling - simplified
    return { improvement: 5 }
  }
}

// Export singleton instance
let schedulingEngine: IntelligentSchedulingEngine | null = null

export function getSchedulingEngine(preferences?: SchedulingPreference): IntelligentSchedulingEngine {
  if (!schedulingEngine) {
    schedulingEngine = new IntelligentSchedulingEngine(preferences)
  }
  return schedulingEngine
}

export { IntelligentSchedulingEngine }
export default getSchedulingEngine