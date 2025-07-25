/**
 * Client Preference Learning System for BookedBarber V2
 * Advanced analytics for understanding client behavior and maximizing retention
 * Aligned with Six Figure Barber methodology for premium client relationships
 */

import { 
  parseISO, 
  differenceInDays, 
  format, 
  startOfWeek, 
  endOfWeek, 
  isSameWeek,
  addDays,
  differenceInMinutes,
  isAfter
} from 'date-fns'

// Enhanced type definitions for client analytics
export interface ClientBehaviorProfile {
  client_id: number
  loyalty_tier: 'new' | 'regular' | 'vip' | 'champion'
  predicted_lifetime_value: number
  retention_risk_score: number // 0-100, higher = more likely to churn
  booking_patterns: BookingPattern
  service_preferences: ServicePreference[]
  communication_preferences: CommunicationPreference
  seasonal_trends: SeasonalTrend[]
  next_appointment_prediction: AppointmentPrediction
  client_journey_stage: ClientJourneyStage
}

export interface BookingPattern {
  average_frequency_days: number
  preferred_times: TimePreference[]
  preferred_days: DayPreference[]
  preferred_barber_consistency: number // 0-100, how consistent they are with barber choice
  advance_booking_days: number // How far in advance they typically book
  cancellation_rate: number // 0-100 percentage
  no_show_rate: number // 0-100 percentage
  reschedule_rate: number // 0-100 percentage
  booking_lead_time_trend: 'increasing' | 'stable' | 'decreasing'
}

export interface TimePreference {
  time_slot: string // HH:mm format
  confidence: number // 0-100
  frequency: number // How many times booked at this time
  revenue_generated: number // Total revenue from this time slot
}

export interface DayPreference {
  day_of_week: number // 0-6
  confidence: number // 0-100
  frequency: number
  average_spend: number
}

export interface ServicePreference {
  service_name: string
  service_id?: number
  frequency: number
  last_booked_date: string
  average_price: number
  satisfaction_score?: number // If available from reviews/feedback
  upsell_potential: number // 0-100
  cross_sell_opportunities: string[]
}

export interface CommunicationPreference {
  preferred_channel: 'sms' | 'email' | 'phone' | 'in_person'
  reminder_timing: number // Hours before appointment
  marketing_receptive: boolean
  response_rate: number // 0-100
  engagement_score: number // 0-100
}

export interface SeasonalTrend {
  season: 'spring' | 'summer' | 'fall' | 'winter'
  booking_frequency_change: number // Percentage change from baseline
  service_preference_shifts: string[]
  revenue_impact: number
}

export interface AppointmentPrediction {
  predicted_date: Date
  confidence: number // 0-100
  recommended_service: string
  estimated_value: number
  optimal_time_slots: string[]
  retention_actions: RetentionAction[]
}

export interface RetentionAction {
  action: 'personalized_offer' | 'loyalty_reward' | 'check_in_call' | 'service_recommendation'
  priority: 'high' | 'medium' | 'low'
  description: string
  expected_impact: number // 0-100
}

export interface ClientJourneyStage {
  stage: 'prospect' | 'first_visit' | 'evaluation' | 'commitment' | 'loyalty' | 'advocacy'
  stage_duration_days: number
  next_stage_probability: number // 0-100
  stage_specific_actions: string[]
}

export interface ClientInsight {
  type: 'retention_risk' | 'upsell_opportunity' | 'loyalty_milestone' | 'behavioral_change'
  client_id: number
  title: string
  description: string
  urgency: 'immediate' | 'within_week' | 'within_month'
  potential_revenue_impact: number
  recommended_actions: string[]
  confidence: number // 0-100
}

export interface ClientSegment {
  name: string
  description: string
  criteria: SegmentCriteria
  client_count: number
  average_revenue: number
  retention_rate: number
  growth_rate: number
}

export interface SegmentCriteria {
  min_appointments?: number
  max_appointments?: number
  min_spend?: number
  max_spend?: number
  loyalty_tiers?: string[]
  booking_frequency_days?: { min?: number; max?: number }
  last_visit_days?: { min?: number; max?: number }
}

export class ClientPreferenceLearningSystem {
  private appointments: any[] = []
  private clients: Map<number, ClientBehaviorProfile> = new Map()
  private segments: ClientSegment[] = []
  private insights: ClientInsight[] = []

  constructor(appointments: any[] = []) {
    this.appointments = appointments
    this.analyzeAllClients()
    this.createClientSegments()
    this.generateInsights()
  }

  /**
   * Analyze all clients and build comprehensive behavior profiles
   */
  private analyzeAllClients(): void {
    const clientAppointments = new Map<number, any[]>()

    // Group appointments by client
    this.appointments
      .filter(apt => apt.client_id)
      .forEach(apt => {
        if (!clientAppointments.has(apt.client_id)) {
          clientAppointments.set(apt.client_id, [])
        }
        clientAppointments.get(apt.client_id)!.push(apt)
      })

    // Analyze each client
    clientAppointments.forEach((clientApts, clientId) => {
      const profile = this.buildClientProfile(clientId, clientApts)
      this.clients.set(clientId, profile)
    })
  }

  /**
   * Build comprehensive behavior profile for a single client
   */
  private buildClientProfile(clientId: number, appointments: any[]): ClientBehaviorProfile {
    // Sort appointments by date
    const sortedAppointments = appointments.sort((a, b) => 
      parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
    )

    const bookingPatterns = this.analyzeBookingPatterns(sortedAppointments)
    const servicePreferences = this.analyzeServicePreferences(sortedAppointments)
    const loyaltyTier = this.determineLoyaltyTier(sortedAppointments)
    const lifetimeValue = this.predictLifetimeValue(sortedAppointments, bookingPatterns)
    const retentionRisk = this.calculateRetentionRisk(sortedAppointments, bookingPatterns)
    const journeyStage = this.determineClientJourneyStage(sortedAppointments)
    const nextAppointment = this.predictNextAppointment(sortedAppointments, bookingPatterns)
    const seasonalTrends = this.analyzeSeasonalTrends(sortedAppointments)
    const communicationPrefs = this.analyzeCommunicationPreferences(sortedAppointments)

    return {
      client_id: clientId,
      loyalty_tier: loyaltyTier,
      predicted_lifetime_value: lifetimeValue,
      retention_risk_score: retentionRisk,
      booking_patterns: bookingPatterns,
      service_preferences: servicePreferences,
      communication_preferences: communicationPrefs,
      seasonal_trends: seasonalTrends,
      next_appointment_prediction: nextAppointment,
      client_journey_stage: journeyStage
    }
  }

  /**
   * Analyze detailed booking patterns with Six Figure Barber insights
   */
  private analyzeBookingPatterns(appointments: any[]): BookingPattern {
    if (appointments.length === 0) {
      return this.getDefaultBookingPattern()
    }

    // Calculate frequency
    const dates = appointments.map(apt => parseISO(apt.start_time))
    let totalDaysBetween = 0
    for (let i = 1; i < dates.length; i++) {
      totalDaysBetween += differenceInDays(dates[i], dates[i-1])
    }
    const avgFrequency = Math.round(totalDaysBetween / Math.max(1, dates.length - 1))

    // Analyze time preferences
    const timePreferences = this.analyzeTimePreferences(appointments)
    const dayPreferences = this.analyzeDayPreferences(appointments)

    // Calculate barber consistency
    const barberFrequency = new Map<number, number>()
    appointments.forEach(apt => {
      barberFrequency.set(apt.barber_id, (barberFrequency.get(apt.barber_id) || 0) + 1)
    })
    const mostFrequentBarberCount = Math.max(...Array.from(barberFrequency.values()))
    const barberConsistency = Math.round((mostFrequentBarberCount / appointments.length) * 100)

    // Calculate lead time patterns
    const now = new Date()
    const leadTimes = appointments
      .filter(apt => apt.created_at)
      .map(apt => differenceInDays(parseISO(apt.start_time), parseISO(apt.created_at)))
      .filter(days => days >= 0)
    
    const avgLeadTime = leadTimes.length > 0 ? 
      Math.round(leadTimes.reduce((sum, days) => sum + days, 0) / leadTimes.length) : 7

    // Calculate rates
    const cancelled = appointments.filter(apt => apt.status === 'cancelled').length
    const noShow = appointments.filter(apt => apt.status === 'no_show').length
    const total = appointments.length

    const cancellationRate = Math.round((cancelled / total) * 100)
    const noShowRate = Math.round((noShow / total) * 100)

    // Determine lead time trend
    const recentLeadTimes = leadTimes.slice(-5)
    const olderLeadTimes = leadTimes.slice(0, 5)
    let leadTimeTrend: 'increasing' | 'stable' | 'decreasing' = 'stable'
    
    if (recentLeadTimes.length > 0 && olderLeadTimes.length > 0) {
      const recentAvg = recentLeadTimes.reduce((sum, days) => sum + days, 0) / recentLeadTimes.length
      const olderAvg = olderLeadTimes.reduce((sum, days) => sum + days, 0) / olderLeadTimes.length
      
      if (recentAvg > olderAvg + 1) leadTimeTrend = 'increasing'
      else if (recentAvg < olderAvg - 1) leadTimeTrend = 'decreasing'
    }

    return {
      average_frequency_days: Math.max(7, avgFrequency || 30),
      preferred_times: timePreferences,
      preferred_days: dayPreferences,
      preferred_barber_consistency: barberConsistency,
      advance_booking_days: avgLeadTime,
      cancellation_rate: cancellationRate,
      no_show_rate: noShowRate,
      reschedule_rate: 0, // Would need reschedule tracking in data model
      booking_lead_time_trend: leadTimeTrend
    }
  }

  /**
   * Analyze time preferences with revenue correlation
   */
  private analyzeTimePreferences(appointments: any[]): TimePreference[] {
    const timeMap = new Map<string, { count: number; revenue: number }>()

    appointments.forEach(apt => {
      const timeSlot = format(parseISO(apt.start_time), 'HH:mm')
      const current = timeMap.get(timeSlot) || { count: 0, revenue: 0 }
      timeMap.set(timeSlot, {
        count: current.count + 1,
        revenue: current.revenue + (apt.price || 0)
      })
    })

    const totalAppointments = appointments.length
    return Array.from(timeMap.entries())
      .map(([time, data]) => ({
        time_slot: time,
        confidence: Math.round((data.count / totalAppointments) * 100),
        frequency: data.count,
        revenue_generated: data.revenue
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5) // Top 5 preferred times
  }

  /**
   * Analyze day preferences with spend correlation
   */
  private analyzeDayPreferences(appointments: any[]): DayPreference[] {
    const dayMap = new Map<number, { count: number; totalSpend: number }>()

    appointments.forEach(apt => {
      const dayOfWeek = parseISO(apt.start_time).getDay()
      const current = dayMap.get(dayOfWeek) || { count: 0, totalSpend: 0 }
      dayMap.set(dayOfWeek, {
        count: current.count + 1,
        totalSpend: current.totalSpend + (apt.price || 0)
      })
    })

    const totalAppointments = appointments.length
    return Array.from(dayMap.entries())
      .map(([day, data]) => ({
        day_of_week: day,
        confidence: Math.round((data.count / totalAppointments) * 100),
        frequency: data.count,
        average_spend: Math.round(data.totalSpend / data.count)
      }))
      .sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Analyze service preferences with upsell opportunities
   */
  private analyzeServicePreferences(appointments: any[]): ServicePreference[] {
    const serviceMap = new Map<string, { 
      count: number; 
      totalPrice: number; 
      lastDate: string;
      serviceId?: number;
    }>()

    appointments.forEach(apt => {
      const serviceName = apt.service_name
      const current = serviceMap.get(serviceName) || { 
        count: 0, 
        totalPrice: 0, 
        lastDate: apt.start_time,
        serviceId: apt.service_id
      }
      
      serviceMap.set(serviceName, {
        count: current.count + 1,
        totalPrice: current.totalPrice + (apt.price || 0),
        lastDate: isAfter(parseISO(apt.start_time), parseISO(current.lastDate)) ? 
          apt.start_time : current.lastDate,
        serviceId: apt.service_id || current.serviceId
      })
    })

    return Array.from(serviceMap.entries())
      .map(([serviceName, data]) => ({
        service_name: serviceName,
        service_id: data.serviceId,
        frequency: data.count,
        last_booked_date: data.lastDate,
        average_price: Math.round(data.totalPrice / data.count),
        upsell_potential: this.calculateUpsellPotential(serviceName, data.count, data.totalPrice / data.count),
        cross_sell_opportunities: this.identifyCrossSellOpportunities(serviceName)
      }))
      .sort((a, b) => b.frequency - a.frequency)
  }

  /**
   * Determine loyalty tier based on Six Figure Barber methodology
   */
  private determineLoyaltyTier(appointments: any[]): 'new' | 'regular' | 'vip' | 'champion' {
    const appointmentCount = appointments.length
    const totalSpend = appointments.reduce((sum, apt) => sum + (apt.price || 0), 0)
    const avgSpend = totalSpend / appointmentCount
    
    // Get date range
    const dates = appointments.map(apt => parseISO(apt.start_time)).sort((a, b) => a.getTime() - b.getTime())
    const daysSinceFirst = dates.length > 1 ? differenceInDays(dates[dates.length - 1], dates[0]) : 0
    
    // Six Figure Barber tier logic
    if (appointmentCount >= 20 && avgSpend >= 75 && daysSinceFirst >= 180) {
      return 'champion' // Top-tier clients, high value and loyalty
    } else if (appointmentCount >= 10 && avgSpend >= 60 && daysSinceFirst >= 90) {
      return 'vip' // High-value regular clients
    } else if (appointmentCount >= 4 && daysSinceFirst >= 30) {
      return 'regular' // Established clients
    } else {
      return 'new' // New or infrequent clients
    }
  }

  /**
   * Predict lifetime value using Six Figure Barber metrics
   */
  private predictLifetimeValue(appointments: any[], patterns: BookingPattern): number {
    if (appointments.length === 0) return 0

    const avgSpend = appointments.reduce((sum, apt) => sum + (apt.price || 0), 0) / appointments.length
    const appointmentsPerYear = Math.round(365 / patterns.average_frequency_days)
    const retentionMultiplier = this.getRetentionMultiplier(patterns)
    
    // Six Figure Barber methodology: Focus on long-term client relationships
    const baseLifetimeValue = avgSpend * appointmentsPerYear * 3 // 3-year projection
    const adjustedValue = baseLifetimeValue * retentionMultiplier
    
    return Math.round(adjustedValue)
  }

  /**
   * Calculate retention risk score
   */
  private calculateRetentionRisk(appointments: any[], patterns: BookingPattern): number {
    let riskScore = 0

    // Recent booking activity
    const lastAppointment = appointments[appointments.length - 1]
    const daysSinceLastVisit = differenceInDays(new Date(), parseISO(lastAppointment.start_time))
    
    if (daysSinceLastVisit > patterns.average_frequency_days * 1.5) {
      riskScore += 30 // Overdue for typical frequency
    }
    
    if (daysSinceLastVisit > patterns.average_frequency_days * 2) {
      riskScore += 20 // Significantly overdue
    }

    // Booking pattern changes
    if (patterns.booking_lead_time_trend === 'decreasing') {
      riskScore += 15 // Last-minute booking pattern indicates less commitment
    }

    // Cancellation and no-show rates
    riskScore += Math.min(25, patterns.cancellation_rate * 0.5)
    riskScore += Math.min(20, patterns.no_show_rate)

    return Math.min(100, riskScore)
  }

  /**
   * Determine client journey stage
   */
  private determineClientJourneyStage(appointments: any[]): ClientJourneyStage {
    const appointmentCount = appointments.length
    const dates = appointments.map(apt => parseISO(apt.start_time)).sort((a, b) => a.getTime() - b.getTime())
    const daysSinceFirst = dates.length > 1 ? differenceInDays(new Date(), dates[0]) : 0

    if (appointmentCount === 1) {
      return {
        stage: 'first_visit',
        stage_duration_days: daysSinceFirst,
        next_stage_probability: 75,
        stage_specific_actions: [
          'Send follow-up satisfaction survey',
          'Offer new client discount for second visit',
          'Share barbershop social media and booking app'
        ]
      }
    } else if (appointmentCount <= 3 && daysSinceFirst <= 90) {
      return {
        stage: 'evaluation',
        stage_duration_days: daysSinceFirst,
        next_stage_probability: 60,
        stage_specific_actions: [
          'Introduce to other services',
          'Build personal connection and trust',
          'Ensure consistent quality experience'
        ]
      }
    } else if (appointmentCount <= 8 && daysSinceFirst <= 180) {
      return {
        stage: 'commitment',
        stage_duration_days: daysSinceFirst,
        next_stage_probability: 80,
        stage_specific_actions: [
          'Offer loyalty program enrollment',
          'Suggest premium service upgrades',
          'Request reviews and referrals'
        ]
      }
    } else if (appointmentCount >= 10 || daysSinceFirst >= 180) {
      return {
        stage: 'loyalty',
        stage_duration_days: daysSinceFirst,
        next_stage_probability: 90,
        stage_specific_actions: [
          'VIP treatment and exclusive offers',
          'Advanced booking privileges',
          'Referral incentive programs'
        ]
      }
    }

    return {
      stage: 'prospect',
      stage_duration_days: 0,
      next_stage_probability: 50,
      stage_specific_actions: ['Complete first appointment booking']
    }
  }

  /**
   * Predict next appointment with optimal scheduling
   */
  private predictNextAppointment(appointments: any[], patterns: BookingPattern): AppointmentPrediction {
    if (appointments.length === 0) {
      return this.getDefaultAppointmentPrediction()
    }

    const lastAppointment = appointments[appointments.length - 1]
    const lastDate = parseISO(lastAppointment.start_time)
    const predictedDate = addDays(lastDate, patterns.average_frequency_days)
    
    // Find most frequent service
    const serviceFreq = new Map<string, number>()
    appointments.forEach(apt => {
      serviceFreq.set(apt.service_name, (serviceFreq.get(apt.service_name) || 0) + 1)
    })
    const mostFrequentService = Array.from(serviceFreq.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'Haircut'

    // Calculate confidence based on consistency
    const consistency = patterns.preferred_barber_consistency + 
                       (100 - patterns.cancellation_rate) + 
                       (100 - patterns.no_show_rate)
    const confidence = Math.round(consistency / 3)

    // Estimate value based on service preferences and trends
    const avgSpend = appointments.reduce((sum, apt) => sum + (apt.price || 0), 0) / appointments.length
    const estimatedValue = Math.round(avgSpend * 1.1) // Slight increase for upselling

    // Get optimal time slots
    const topTimeSlots = patterns.preferred_times
      .slice(0, 3)
      .map(pref => pref.time_slot)

    // Generate retention actions based on risk score
    const retentionRisk = this.calculateRetentionRisk(appointments, patterns)
    const retentionActions = this.generateRetentionActions(retentionRisk)

    return {
      predicted_date: predictedDate,
      confidence,
      recommended_service: mostFrequentService,
      estimated_value: estimatedValue,
      optimal_time_slots: topTimeSlots,
      retention_actions: retentionActions
    }
  }

  /**
   * Analyze seasonal booking trends
   */
  private analyzeSeasonalTrends(appointments: any[]): SeasonalTrend[] {
    const seasonalData = new Map<string, { count: number; revenue: number; services: Set<string> }>()

    appointments.forEach(apt => {
      const date = parseISO(apt.start_time)
      const season = this.getSeason(date)
      
      const current = seasonalData.get(season) || { count: 0, revenue: 0, services: new Set() }
      seasonalData.set(season, {
        count: current.count + 1,
        revenue: current.revenue + (apt.price || 0),
        services: current.services.add(apt.service_name)
      })
    })

    const avgPerSeason = appointments.length / 4
    const avgRevenuePerSeason = appointments.reduce((sum, apt) => sum + (apt.price || 0), 0) / 4

    return Array.from(seasonalData.entries()).map(([season, data]) => ({
      season: season as 'spring' | 'summer' | 'fall' | 'winter',
      booking_frequency_change: Math.round(((data.count - avgPerSeason) / avgPerSeason) * 100),
      service_preference_shifts: Array.from(data.services),
      revenue_impact: data.revenue - avgRevenuePerSeason
    }))
  }

  /**
   * Analyze communication preferences
   */
  private analyzeCommunicationPreferences(appointments: any[]): CommunicationPreference {
    // This would integrate with actual communication data if available
    // For now, providing intelligent defaults based on booking patterns
    
    const recentAppointments = appointments.slice(-5)
    const avgLeadTime = recentAppointments
      .filter(apt => apt.created_at)
      .reduce((sum, apt) => {
        const leadHours = differenceInMinutes(parseISO(apt.start_time), parseISO(apt.created_at)) / 60
        return sum + leadHours
      }, 0) / Math.max(1, recentAppointments.length)

    return {
      preferred_channel: 'sms', // Most common for barbershops
      reminder_timing: Math.min(24, Math.max(2, Math.round(avgLeadTime * 0.1))),
      marketing_receptive: appointments.length >= 3, // Regular clients more receptive
      response_rate: 85, // Industry standard
      engagement_score: Math.min(100, appointments.length * 10) // Based on loyalty
    }
  }

  /**
   * Create intelligent client segments for targeted marketing
   */
  private createClientSegments(): void {
    this.segments = [
      {
        name: 'VIP Champions',
        description: 'Highest value clients with strong loyalty and advocacy potential',
        criteria: {
          loyalty_tiers: ['champion', 'vip'],
          min_spend: 1000,
          min_appointments: 8
        },
        client_count: 0,
        average_revenue: 0,
        retention_rate: 0,
        growth_rate: 0
      },
      {
        name: 'Regular Loyalists',
        description: 'Consistent clients with good frequency and moderate spend',
        criteria: {
          loyalty_tiers: ['regular'],
          min_appointments: 4,
          booking_frequency_days: { min: 14, max: 45 }
        },
        client_count: 0,
        average_revenue: 0,
        retention_rate: 0,
        growth_rate: 0
      },
      {
        name: 'At-Risk Regulars',
        description: 'Previously regular clients showing signs of churn',
        criteria: {
          loyalty_tiers: ['regular', 'vip'],
          last_visit_days: { min: 60 }
        },
        client_count: 0,
        average_revenue: 0,
        retention_rate: 0,
        growth_rate: 0
      },
      {
        name: 'New Client Nurture',
        description: 'Recent clients in evaluation stage needing retention focus',
        criteria: {
          loyalty_tiers: ['new'],
          max_appointments: 3,
          last_visit_days: { max: 30 }
        },
        client_count: 0,
        average_revenue: 0,
        retention_rate: 0,
        growth_rate: 0
      },
      {
        name: 'Premium Opportunity',
        description: 'Regular clients with potential for premium service upselling',
        criteria: {
          loyalty_tiers: ['regular', 'vip'],
          min_appointments: 5,
          max_spend: 75 // Below premium threshold
        },
        client_count: 0,
        average_revenue: 0,
        retention_rate: 0,
        growth_rate: 0
      }
    ]

    // Calculate segment metrics
    this.segments.forEach(segment => {
      const segmentClients = this.getClientsInSegment(segment.criteria)
      segment.client_count = segmentClients.length
      
      if (segmentClients.length > 0) {
        segment.average_revenue = segmentClients.reduce((sum, client) => 
          sum + client.predicted_lifetime_value, 0) / segmentClients.length
        segment.retention_rate = 100 - (segmentClients.reduce((sum, client) => 
          sum + client.retention_risk_score, 0) / segmentClients.length)
      }
    })
  }

  /**
   * Generate actionable insights for client management
   */
  private generateInsights(): void {
    this.insights = []

    // Check for high-risk clients
    this.clients.forEach(client => {
      if (client.retention_risk_score > 70) {
        this.insights.push({
          type: 'retention_risk',
          client_id: client.client_id,
          title: `High Churn Risk - Client ${client.client_id}`,
          description: `${client.loyalty_tier} client with ${client.retention_risk_score}% churn risk. Last visit was ${this.getLastVisitDays(client.client_id)} days ago.`,
          urgency: client.retention_risk_score > 85 ? 'immediate' : 'within_week',
          potential_revenue_impact: client.predicted_lifetime_value * 0.8, // 80% of LTV at risk
          recommended_actions: client.next_appointment_prediction.retention_actions.map(action => action.description),
          confidence: 85
        })
      }

      // Check for upsell opportunities
      const upsellPotential = this.calculateOverallUpsellPotential(client)
      if (upsellPotential > 60 && client.loyalty_tier !== 'new') {
        this.insights.push({
          type: 'upsell_opportunity',
          client_id: client.client_id,
          title: `Premium Service Opportunity - Client ${client.client_id}`,
          description: `${client.loyalty_tier} client showing ${upsellPotential}% potential for premium service upgrades.`,
          urgency: 'within_month',
          potential_revenue_impact: client.next_appointment_prediction.estimated_value * 0.4,
          recommended_actions: [
            'Introduce signature services during next visit',
            'Offer package deals for multiple services',
            'Suggest seasonal premium treatments'
          ],
          confidence: upsellPotential
        })
      }

      // Check for loyalty milestones
      if (this.isApproachingMilestone(client)) {
        this.insights.push({
          type: 'loyalty_milestone',
          client_id: client.client_id,
          title: `Loyalty Milestone Approaching - Client ${client.client_id}`,
          description: `Client approaching ${this.getNextMilestone(client)} milestone. Perfect time for special recognition.`,
          urgency: 'within_week',
          potential_revenue_impact: client.next_appointment_prediction.estimated_value * 1.2,
          recommended_actions: [
            'Prepare milestone celebration and gift',
            'Offer exclusive milestone discount',
            'Request review and referral'
          ],
          confidence: 90
        })
      }
    })
  }

  // Public API methods
  
  /**
   * Get comprehensive client profile
   */
  public getClientProfile(clientId: number): ClientBehaviorProfile | null {
    return this.clients.get(clientId) || null
  }

  /**
   * Get all client profiles
   */
  public getAllClientProfiles(): ClientBehaviorProfile[] {
    return Array.from(this.clients.values())
  }

  /**
   * Get clients in a specific segment
   */
  public getClientsInSegment(criteria: SegmentCriteria): ClientBehaviorProfile[] {
    return Array.from(this.clients.values()).filter(client => {
      return this.matchesSegmentCriteria(client, criteria)
    })
  }

  /**
   * Get actionable insights sorted by priority
   */
  public getInsights(): ClientInsight[] {
    return this.insights.sort((a, b) => {
      const urgencyOrder = { immediate: 3, within_week: 2, within_month: 1 }
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
    })
  }

  /**
   * Get insights for specific client
   */
  public getClientInsights(clientId: number): ClientInsight[] {
    return this.insights.filter(insight => insight.client_id === clientId)
  }

  /**
   * Get client segments
   */
  public getClientSegments(): ClientSegment[] {
    return this.segments
  }

  /**
   * Predict optimal booking time for client
   */
  public getOptimalBookingTime(clientId: number): { time: string; day: number; confidence: number } | null {
    const client = this.clients.get(clientId)
    if (!client) return null

    const topTime = client.booking_patterns.preferred_times[0]
    const topDay = client.booking_patterns.preferred_days[0]

    if (!topTime || !topDay) return null

    return {
      time: topTime.time_slot,
      day: topDay.day_of_week,
      confidence: Math.round((topTime.confidence + topDay.confidence) / 2)
    }
  }

  /**
   * Update system with new appointment data
   */
  public updateWithNewAppointments(newAppointments: any[]): void {
    this.appointments = [...this.appointments, ...newAppointments]
    this.analyzeAllClients()
    this.createClientSegments()
    this.generateInsights()
  }

  // Helper methods

  private getDefaultBookingPattern(): BookingPattern {
    return {
      average_frequency_days: 30,
      preferred_times: [],
      preferred_days: [],
      preferred_barber_consistency: 50,
      advance_booking_days: 7,
      cancellation_rate: 5,
      no_show_rate: 2,
      reschedule_rate: 10,
      booking_lead_time_trend: 'stable'
    }
  }

  private getDefaultAppointmentPrediction(): AppointmentPrediction {
    return {
      predicted_date: addDays(new Date(), 30),
      confidence: 50,
      recommended_service: 'Haircut',
      estimated_value: 50,
      optimal_time_slots: ['10:00', '14:00', '16:00'],
      retention_actions: []
    }
  }

  private calculateUpsellPotential(serviceName: string, frequency: number, avgPrice: number): number {
    let potential = 0
    
    // Basic services have high upsell potential
    if (serviceName.toLowerCase().includes('haircut') && avgPrice < 60) {
      potential += 40
    }
    
    // Frequent customers are good upsell candidates
    if (frequency >= 3) potential += 30
    
    // Lower-priced services suggest upsell opportunity
    if (avgPrice < 50) potential += 20
    
    return Math.min(100, potential)
  }

  private identifyCrossSellOpportunities(serviceName: string): string[] {
    const crossSells: { [key: string]: string[] } = {
      'haircut': ['Beard Trim', 'Styling', 'Hair Wash'],
      'beard trim': ['Haircut', 'Mustache Trim', 'Beard Oil Treatment'],
      'styling': ['Haircut', 'Hair Treatment', 'Product Application'],
      'shave': ['Beard Trim', 'Mustache Trim', 'Face Treatment']
    }

    const service = serviceName.toLowerCase()
    for (const [key, opportunities] of Object.entries(crossSells)) {
      if (service.includes(key)) {
        return opportunities
      }
    }

    return ['Premium Services', 'Add-on Treatments']
  }

  private getRetentionMultiplier(patterns: BookingPattern): number {
    let multiplier = 1.0

    // High consistency increases retention
    if (patterns.preferred_barber_consistency > 80) multiplier += 0.2
    
    // Low cancellation rate indicates reliability
    if (patterns.cancellation_rate < 10) multiplier += 0.1
    
    // Advance booking indicates planning and commitment
    if (patterns.advance_booking_days > 7) multiplier += 0.15
    
    // Reduce for high-risk patterns
    if (patterns.no_show_rate > 10) multiplier -= 0.2
    if (patterns.booking_lead_time_trend === 'decreasing') multiplier -= 0.1

    return Math.max(0.5, Math.min(1.5, multiplier))
  }

  private generateRetentionActions(riskScore: number): RetentionAction[] {
    const actions: RetentionAction[] = []

    if (riskScore > 80) {
      actions.push({
        action: 'check_in_call',
        priority: 'high',
        description: 'Personal call to check satisfaction and address concerns',
        expected_impact: 75
      })
    }

    if (riskScore > 60) {
      actions.push({
        action: 'personalized_offer',
        priority: 'high',
        description: 'Customized discount or service upgrade offer',
        expected_impact: 65
      })
    }

    if (riskScore > 40) {
      actions.push({
        action: 'loyalty_reward',
        priority: 'medium',
        description: 'Loyalty program benefits or milestone recognition',
        expected_impact: 45
      })
    }

    actions.push({
      action: 'service_recommendation',
      priority: 'low',
      description: 'Suggest new services based on preferences',
      expected_impact: 35
    })

    return actions
  }

  private getSeason(date: Date): string {
    const month = date.getMonth()
    if (month >= 2 && month <= 4) return 'spring'
    if (month >= 5 && month <= 7) return 'summer'
    if (month >= 8 && month <= 10) return 'fall'
    return 'winter'
  }

  private matchesSegmentCriteria(client: ClientBehaviorProfile, criteria: SegmentCriteria): boolean {
    // This would implement complex matching logic based on all criteria
    // Simplified version for demonstration
    if (criteria.loyalty_tiers && !criteria.loyalty_tiers.includes(client.loyalty_tier)) {
      return false
    }
    
    return true // Simplified for brevity
  }

  private calculateOverallUpsellPotential(client: ClientBehaviorProfile): number {
    return client.service_preferences.reduce((avg, pref) => avg + pref.upsell_potential, 0) / 
           Math.max(1, client.service_preferences.length)
  }

  private isApproachingMilestone(client: ClientBehaviorProfile): boolean {
    // Check for various milestone criteria
    return client.client_journey_stage.stage === 'commitment' && 
           client.client_journey_stage.next_stage_probability > 75
  }

  private getNextMilestone(client: ClientBehaviorProfile): string {
    switch (client.loyalty_tier) {
      case 'new': return '5th visit'
      case 'regular': return '10th visit'
      case 'vip': return '25th visit'
      default: return 'loyalty milestone'
    }
  }

  private getLastVisitDays(clientId: number): number {
    const clientAppointments = this.appointments.filter(apt => apt.client_id === clientId)
    if (clientAppointments.length === 0) return 999
    
    const lastAppointment = clientAppointments.sort((a, b) => 
      parseISO(b.start_time).getTime() - parseISO(a.start_time).getTime()
    )[0]
    
    return differenceInDays(new Date(), parseISO(lastAppointment.start_time))
  }
}

// Export utility functions
export const createClientPreferenceLearningSystem = (appointments: any[]): ClientPreferenceLearningSystem => {
  return new ClientPreferenceLearningSystem(appointments)
}

export const calculateClientLifetimeValue = (
  appointments: any[],
  avgFrequencyDays: number,
  projectionYears: number = 3
): number => {
  if (appointments.length === 0) return 0
  
  const avgSpend = appointments.reduce((sum, apt) => sum + (apt.price || 0), 0) / appointments.length
  const appointmentsPerYear = Math.round(365 / avgFrequencyDays)
  
  return Math.round(avgSpend * appointmentsPerYear * projectionYears)
}