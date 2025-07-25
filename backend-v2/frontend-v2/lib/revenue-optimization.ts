/**
 * Revenue Optimization Algorithm for BookedBarber V2
 * Advanced analytics and AI-powered insights for maximizing barbershop revenue
 * Aligned with Six Figure Barber methodology for premium positioning and growth
 */

import { 
  parseISO, 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth,
  endOfMonth,
  differenceInDays,
  addDays,
  isSameWeek,
  isSameMonth,
  addMinutes,
  differenceInMinutes
} from 'date-fns'

// Revenue optimization types
export interface RevenueMetrics {
  total_revenue: number
  revenue_per_hour: number
  revenue_per_client: number
  average_service_price: number
  utilization_rate: number // Percentage of available time slots filled
  conversion_rate: number // Bookings confirmed vs. initial inquiries
  client_retention_rate: number
  upselling_success_rate: number
  peak_hour_premium: number
  seasonal_variance: number
}

export interface ServiceProfitability {
  service_name: string
  service_id?: number
  total_bookings: number
  total_revenue: number
  average_price: number
  average_duration: number
  revenue_per_minute: number
  demand_score: number // 0-100 based on booking frequency
  profit_margin_estimate: number // Estimated based on time/price ratio
  upsell_potential: number // 0-100
  cross_sell_opportunities: string[]
  six_fb_alignment: number // 0-100 alignment with Six Figure Barber methodology
}

export interface TimeSlotProfitability {
  time_slot: string // HH:mm format
  day_of_week: number
  average_revenue: number
  booking_rate: number // Percentage of this slot that gets booked
  premium_multiplier: number
  client_satisfaction_score: number
  efficiency_score: number
  six_fb_premium_score: number
}

export interface DynamicPricingRecommendation {
  service_name: string
  current_price: number
  recommended_price: number
  price_change_percentage: number
  confidence: number // 0-100
  reasoning: string
  expected_demand_impact: number // Percentage change in demand
  expected_revenue_impact: number // Expected weekly revenue change
  implementation_timeline: 'immediate' | 'next_week' | 'next_month'
  risk_level: 'low' | 'medium' | 'high'
}

export interface UpsellOpportunity {
  client_id?: number
  service_combination: string[]
  current_value: number
  potential_value: number
  value_increase: number
  success_probability: number // 0-100
  optimal_timing: 'during_service' | 'at_checkout' | 'follow_up_call' | 'next_booking'
  script_suggestion: string
  seasonal_relevance: number // 0-100
}

export interface RevenueOptimizationInsight {
  type: 'pricing' | 'scheduling' | 'service_mix' | 'upselling' | 'retention' | 'efficiency'
  title: string
  description: string
  potential_monthly_impact: number
  implementation_effort: 'low' | 'medium' | 'high'
  priority: 'high' | 'medium' | 'low'
  actionable_steps: string[]
  metrics_to_track: string[]
  expected_roi: number // Return on investment percentage
  risk_factors: string[]
  six_fb_methodology_alignment: number // 0-100
}

export interface CompetitiveAnalysis {
  market_position: 'premium' | 'mid_tier' | 'budget'
  price_competitiveness: number // -100 to 100, positive means higher than market
  service_differentiation: number // 0-100
  value_proposition_strength: number // 0-100
  recommended_positioning: string
}

export interface SeasonalRevenuePattern {
  season: 'spring' | 'summer' | 'fall' | 'winter'
  revenue_multiplier: number
  popular_services: string[]
  pricing_adjustments: PricingAdjustment[]
  marketing_focus: string[]
}

export interface PricingAdjustment {
  service_name: string
  adjustment_percentage: number
  start_date: Date
  end_date: Date
  reasoning: string
}

export interface ClientValueSegment {
  segment_name: string
  client_count: number
  average_lifetime_value: number
  average_frequency_days: number
  preferred_services: string[]
  price_sensitivity: number // 0-100, higher = more sensitive
  upsell_responsiveness: number // 0-100
  retention_strategies: string[]
}

export class RevenueOptimizationEngine {
  private appointments: any[] = []
  private services: ServiceProfitability[] = []
  private timeSlots: TimeSlotProfitability[] = []
  private clientSegments: ClientValueSegment[] = []
  private seasonalPatterns: SeasonalRevenuePattern[] = []

  constructor(appointments: any[] = []) {
    this.appointments = appointments
    this.analyzeServiceProfitability()
    this.analyzeTimeSlotProfitability()
    this.analyzeClientValueSegments()
    this.analyzeSeasonalPatterns()
  }

  /**
   * Calculate comprehensive revenue metrics
   */
  public calculateRevenueMetrics(dateRange?: { start: Date; end: Date }): RevenueMetrics {
    let relevantAppointments = this.appointments.filter(apt => apt.status === 'completed')

    if (dateRange) {
      relevantAppointments = relevantAppointments.filter(apt => {
        const aptDate = parseISO(apt.start_time)
        return aptDate >= dateRange.start && aptDate <= dateRange.end
      })
    }

    if (relevantAppointments.length === 0) {
      return this.getDefaultRevenueMetrics()
    }

    const totalRevenue = relevantAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0)
    const totalMinutes = relevantAppointments.reduce((sum, apt) => sum + (apt.duration_minutes || 60), 0)
    const uniqueClients = new Set(relevantAppointments.map(apt => apt.client_id).filter(Boolean)).size

    // Calculate utilization rate (simplified - would need barber availability data)
    const totalAvailableHours = this.estimateAvailableHours(dateRange)
    const totalBookedHours = totalMinutes / 60
    const utilizationRate = Math.min(100, (totalBookedHours / totalAvailableHours) * 100)

    // Calculate retention rate (clients with multiple appointments)
    const clientAppointmentCounts = new Map<number, number>()
    relevantAppointments.forEach(apt => {
      if (apt.client_id) {
        clientAppointmentCounts.set(apt.client_id, (clientAppointmentCounts.get(apt.client_id) || 0) + 1)
      }
    })
    const returningClients = Array.from(clientAppointmentCounts.values()).filter(count => count > 1).length
    const retentionRate = uniqueClients > 0 ? (returningClients / uniqueClients) * 100 : 0

    return {
      total_revenue: Math.round(totalRevenue),
      revenue_per_hour: Math.round(totalRevenue / Math.max(1, totalBookedHours)),
      revenue_per_client: Math.round(totalRevenue / Math.max(1, uniqueClients)),
      average_service_price: Math.round(totalRevenue / relevantAppointments.length),
      utilization_rate: Math.round(utilizationRate),
      conversion_rate: 85, // Would need booking inquiry data
      client_retention_rate: Math.round(retentionRate),
      upselling_success_rate: this.calculateUpsellRate(relevantAppointments),
      peak_hour_premium: this.calculatePeakHourPremium(relevantAppointments),
      seasonal_variance: this.calculateSeasonalVariance(relevantAppointments)
    }
  }

  /**
   * Analyze profitability of each service offering
   */
  private analyzeServiceProfitability(): void {
    const serviceMap = new Map<string, {
      bookings: any[]
      totalRevenue: number
      totalDuration: number
    }>()

    this.appointments
      .filter(apt => apt.status === 'completed')
      .forEach(apt => {
        const serviceName = apt.service_name
        const current = serviceMap.get(serviceName) || {
          bookings: [],
          totalRevenue: 0,
          totalDuration: 0
        }

        serviceMap.set(serviceName, {
          bookings: [...current.bookings, apt],
          totalRevenue: current.totalRevenue + (apt.price || 0),
          totalDuration: current.totalDuration + (apt.duration_minutes || 60)
        })
      })

    this.services = Array.from(serviceMap.entries()).map(([serviceName, data]) => {
      const avgPrice = data.totalRevenue / data.bookings.length
      const avgDuration = data.totalDuration / data.bookings.length
      const revenuePerMinute = avgPrice / avgDuration

      return {
        service_name: serviceName,
        service_id: data.bookings[0]?.service_id,
        total_bookings: data.bookings.length,
        total_revenue: Math.round(data.totalRevenue),
        average_price: Math.round(avgPrice),
        average_duration: Math.round(avgDuration),
        revenue_per_minute: Math.round(revenuePerMinute * 100) / 100,
        demand_score: this.calculateDemandScore(data.bookings.length),
        profit_margin_estimate: this.estimateProfitMargin(avgPrice, avgDuration),
        upsell_potential: this.calculateServiceUpsellPotential(serviceName, avgPrice),
        cross_sell_opportunities: this.identifyServiceCrossSells(serviceName),
        six_fb_alignment: this.calculateSixFBAlignment(serviceName, avgPrice, revenuePerMinute)
      }
    }).sort((a, b) => b.revenue_per_minute - a.revenue_per_minute)
  }

  /**
   * Analyze profitability of different time slots
   */
  private analyzeTimeSlotProfitability(): void {
    const timeSlotMap = new Map<string, {
      appointments: any[]
      totalRevenue: number
      satisfactionScores: number[]
    }>()

    this.appointments
      .filter(apt => apt.status === 'completed')
      .forEach(apt => {
        const time = format(parseISO(apt.start_time), 'HH:mm')
        const dayOfWeek = parseISO(apt.start_time).getDay()
        const key = `${dayOfWeek}-${time}`

        const current = timeSlotMap.get(key) || {
          appointments: [],
          totalRevenue: 0,
          satisfactionScores: []
        }

        timeSlotMap.set(key, {
          appointments: [...current.appointments, apt],
          totalRevenue: current.totalRevenue + (apt.price || 0),
          satisfactionScores: [...current.satisfactionScores, apt.satisfaction_score || 85]
        })
      })

    this.timeSlots = Array.from(timeSlotMap.entries()).map(([key, data]) => {
      const [dayOfWeek, time] = key.split('-')
      const avgRevenue = data.totalRevenue / data.appointments.length
      const avgSatisfaction = data.satisfactionScores.reduce((sum, score) => sum + score, 0) / data.satisfactionScores.length

      return {
        time_slot: time,
        day_of_week: parseInt(dayOfWeek),
        average_revenue: Math.round(avgRevenue),
        booking_rate: this.calculateTimeSlotBookingRate(time, parseInt(dayOfWeek)),
        premium_multiplier: this.calculatePremiumMultiplier(time, parseInt(dayOfWeek)),
        client_satisfaction_score: Math.round(avgSatisfaction),
        efficiency_score: this.calculateTimeSlotEfficiency(data.appointments),
        six_fb_premium_score: this.calculateSixFBTimeScore(time, parseInt(dayOfWeek))
      }
    }).sort((a, b) => b.average_revenue - a.average_revenue)
  }

  /**
   * Generate dynamic pricing recommendations based on demand and value
   */
  public generateDynamicPricingRecommendations(): DynamicPricingRecommendation[] {
    const recommendations: DynamicPricingRecommendation[] = []

    this.services.forEach(service => {
      const recommendation = this.calculateOptimalPricing(service)
      if (Math.abs(recommendation.price_change_percentage) > 5) { // Only recommend changes > 5%
        recommendations.push(recommendation)
      }
    })

    return recommendations.sort((a, b) => b.expected_revenue_impact - a.expected_revenue_impact)
  }

  /**
   * Calculate optimal pricing for a service
   */
  private calculateOptimalPricing(service: ServiceProfitability): DynamicPricingRecommendation {
    let recommendedPrice = service.average_price
    let reasoning = 'Current pricing appears optimal'
    let confidence = 75
    let demandImpact = 0
    let riskLevel: 'low' | 'medium' | 'high' = 'low'

    // Six Figure Barber methodology: Premium positioning analysis
    if (service.six_fb_alignment > 80 && service.demand_score > 70) {
      // High-value service with strong demand - increase price
      const increase = Math.min(25, service.demand_score * 0.2)
      recommendedPrice = service.average_price * (1 + increase / 100)
      reasoning = `Premium service with high demand supports ${increase.toFixed(1)}% price increase`
      confidence = 85
      demandImpact = -increase * 0.3 // Slight demand decrease expected
      riskLevel = 'low'
    } 
    else if (service.demand_score < 30 && service.profit_margin_estimate < 50) {
      // Low demand service - consider strategic pricing
      if (service.six_fb_alignment > 60) {
        // Six Figure Barber methodology: Don't compete on price, add value
        reasoning = 'Low demand service needs value enhancement, not price reduction'
        confidence = 60
        riskLevel = 'medium'
      } else {
        // Non-premium service with low demand - small price adjustment
        const decrease = Math.min(15, (50 - service.demand_score) * 0.3)
        recommendedPrice = service.average_price * (1 - decrease / 100)
        reasoning = `Low demand suggests ${decrease.toFixed(1)}% price reduction to increase bookings`
        confidence = 70
        demandImpact = decrease * 1.5
        riskLevel = 'medium'
      }
    }
    else if (service.revenue_per_minute > this.getAverageRevenuePerMinute() * 1.2) {
      // High efficiency service - premium pricing opportunity
      const increase = Math.min(20, ((service.revenue_per_minute / this.getAverageRevenuePerMinute()) - 1) * 50)
      recommendedPrice = service.average_price * (1 + increase / 100)
      reasoning = `High efficiency service supports ${increase.toFixed(1)}% premium pricing`
      confidence = 80
      demandImpact = -increase * 0.25
      riskLevel = 'low'
    }

    const priceChange = ((recommendedPrice - service.average_price) / service.average_price) * 100
    const weeklyBookings = service.total_bookings * 0.25 // Assuming monthly data
    const revenueImpact = weeklyBookings * (recommendedPrice - service.average_price) * (1 + demandImpact / 100)

    return {
      service_name: service.service_name,
      current_price: service.average_price,
      recommended_price: Math.round(recommendedPrice),
      price_change_percentage: Math.round(priceChange * 10) / 10,
      confidence,
      reasoning,
      expected_demand_impact: Math.round(demandImpact * 10) / 10,
      expected_revenue_impact: Math.round(revenueImpact),
      implementation_timeline: Math.abs(priceChange) > 15 ? 'next_month' : 'next_week',
      risk_level: riskLevel
    }
  }

  /**
   * Identify upselling opportunities with AI insights
   */
  public generateUpsellOpportunities(): UpsellOpportunity[] {
    const opportunities: UpsellOpportunity[] = []

    // Analyze service combinations that frequently occur together
    const serviceCombinations = this.analyzeServiceCombinations()
    
    // Generate opportunities based on individual appointments
    this.appointments
      .filter(apt => apt.status === 'completed' && apt.client_id)
      .forEach(apt => {
        const upsellOpps = this.findUpsellsForAppointment(apt, serviceCombinations)
        opportunities.push(...upsellOpps)
      })

    // Generate general service package opportunities
    const packageOpportunities = this.generateServicePackageOpportunities()
    opportunities.push(...packageOpportunities)

    return opportunities
      .sort((a, b) => (b.success_probability * b.value_increase) - (a.success_probability * a.value_increase))
      .slice(0, 20) // Top 20 opportunities
  }

  /**
   * Generate comprehensive revenue optimization insights
   */
  public generateOptimizationInsights(): RevenueOptimizationInsight[] {
    const insights: RevenueOptimizationInsight[] = []

    // Pricing optimization insights
    insights.push(...this.generatePricingInsights())

    // Service mix optimization
    insights.push(...this.generateServiceMixInsights())

    // Scheduling efficiency insights
    insights.push(...this.generateSchedulingInsights())

    // Upselling insights
    insights.push(...this.generateUpsellInsights())

    // Client retention insights
    insights.push(...this.generateRetentionInsights())

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Analyze client value segments for targeted strategies
   */
  private analyzeClientValueSegments(): void {
    const clientData = new Map<number, {
      appointments: any[]
      totalSpend: number
      frequency: number
    }>()

    // Group appointments by client
    this.appointments
      .filter(apt => apt.client_id && apt.status === 'completed')
      .forEach(apt => {
        const current = clientData.get(apt.client_id) || {
          appointments: [],
          totalSpend: 0,
          frequency: 0
        }

        clientData.set(apt.client_id, {
          appointments: [...current.appointments, apt],
          totalSpend: current.totalSpend + (apt.price || 0),
          frequency: current.frequency + 1
        })
      })

    // Create segments based on value and behavior
    const segments = {
      'High-Value Champions': [] as any[],
      'Regular Loyalists': [] as any[],
      'Occasional Visitors': [] as any[],
      'Price-Sensitive': [] as any[],
      'Premium Seekers': [] as any[]
    }

    clientData.forEach((data, clientId) => {
      const avgSpend = data.totalSpend / data.frequency
      const lifetimeValue = data.totalSpend

      if (lifetimeValue > 1000 && avgSpend > 75) {
        segments['High-Value Champions'].push({ clientId, data })
      } else if (data.frequency >= 6 && avgSpend > 50) {
        segments['Regular Loyalists'].push({ clientId, data })
      } else if (avgSpend > 80) {
        segments['Premium Seekers'].push({ clientId, data })
      } else if (avgSpend < 40) {
        segments['Price-Sensitive'].push({ clientId, data })
      } else {
        segments['Occasional Visitors'].push({ clientId, data })
      }
    })

    this.clientSegments = Object.entries(segments).map(([name, clients]) => ({
      segment_name: name,
      client_count: clients.length,
      average_lifetime_value: clients.length > 0 
        ? Math.round(clients.reduce((sum, c) => sum + c.data.totalSpend, 0) / clients.length)
        : 0,
      average_frequency_days: this.calculateSegmentFrequency(clients),
      preferred_services: this.getSegmentPreferredServices(clients),
      price_sensitivity: this.calculatePriceSensitivity(name),
      upsell_responsiveness: this.calculateUpsellResponsiveness(name),
      retention_strategies: this.getRetentionStrategies(name)
    }))
  }

  /**
   * Analyze seasonal revenue patterns for strategic planning
   */
  private analyzeSeasonalPatterns(): void {
    const seasonalData = new Map<string, {
      appointments: any[]
      revenue: number
      services: Map<string, number>
    }>()

    this.appointments
      .filter(apt => apt.status === 'completed')
      .forEach(apt => {
        const season = this.getSeason(parseISO(apt.start_time))
        const current = seasonalData.get(season) || {
          appointments: [],
          revenue: 0,
          services: new Map()
        }

        const serviceCount = current.services.get(apt.service_name) || 0
        current.services.set(apt.service_name, serviceCount + 1)

        seasonalData.set(season, {
          appointments: [...current.appointments, apt],
          revenue: current.revenue + (apt.price || 0),
          services: current.services
        })
      })

    const avgSeasonalRevenue = Array.from(seasonalData.values())
      .reduce((sum, data) => sum + data.revenue, 0) / seasonalData.size

    this.seasonalPatterns = Array.from(seasonalData.entries()).map(([season, data]) => {
      const topServices = Array.from(data.services.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([service]) => service)

      return {
        season: season as 'spring' | 'summer' | 'fall' | 'winter',
        revenue_multiplier: data.revenue / avgSeasonalRevenue,
        popular_services: topServices,
        pricing_adjustments: this.generateSeasonalPricingAdjustments(season, data.revenue / avgSeasonalRevenue),
        marketing_focus: this.getSeasonalMarketingFocus(season)
      }
    })
  }

  // Helper methods for calculations

  private calculateDemandScore(bookingCount: number): number {
    const maxBookings = Math.max(...this.services.map(s => s.total_bookings || bookingCount))
    return Math.round((bookingCount / Math.max(1, maxBookings)) * 100)
  }

  private estimateProfitMargin(price: number, duration: number): number {
    // Simplified profit margin estimation
    // In reality, this would factor in overhead, supplies, labor costs
    const baseCostPerMinute = 0.5 // Example base cost
    const estimatedCost = baseCostPerMinute * duration
    return Math.max(0, Math.min(100, ((price - estimatedCost) / price) * 100))
  }

  private calculateServiceUpsellPotential(serviceName: string, avgPrice: number): number {
    let potential = 50 // Base potential

    // Basic services have higher upsell potential
    if (serviceName.toLowerCase().includes('haircut') && avgPrice < 60) {
      potential += 30
    }

    // Services with complementary offerings
    if (serviceName.toLowerCase().includes('beard') || serviceName.toLowerCase().includes('shave')) {
      potential += 20
    }

    return Math.min(100, potential)
  }

  private identifyServiceCrossSells(serviceName: string): string[] {
    const crossSellMap: { [key: string]: string[] } = {
      'haircut': ['Beard Trim', 'Styling', 'Hair Treatment', 'Product Purchase'],
      'beard trim': ['Haircut', 'Mustache Trim', 'Beard Oil', 'Face Treatment'],
      'shave': ['Beard Trim', 'Face Treatment', 'Aftershave', 'Moisturizer'],
      'styling': ['Haircut', 'Hair Product', 'Beard Styling', 'Premium Finish']
    }

    const service = serviceName.toLowerCase()
    for (const [key, opportunities] of Object.entries(crossSellMap)) {
      if (service.includes(key)) {
        return opportunities
      }
    }

    return ['Premium Add-ons', 'Product Recommendations']
  }

  private calculateSixFBAlignment(serviceName: string, avgPrice: number, revenuePerMinute: number): number {
    let alignment = 50 // Base alignment

    // Premium pricing alignment (Six Figure Barber emphasizes value over discounting)
    if (avgPrice > 60) alignment += 20
    if (avgPrice > 80) alignment += 15

    // High revenue per minute indicates efficiency and value
    if (revenuePerMinute > 1.5) alignment += 15
    if (revenuePerMinute > 2.0) alignment += 10

    // Premium service names
    if (serviceName.toLowerCase().includes('signature') || 
        serviceName.toLowerCase().includes('premium') ||
        serviceName.toLowerCase().includes('luxury')) {
      alignment += 20
    }

    return Math.min(100, alignment)
  }

  private calculateTimeSlotBookingRate(time: string, dayOfWeek: number): number {
    // This would require booking inquiry data vs. confirmed bookings
    // Simplified estimation based on time popularity
    const hour = parseInt(time.split(':')[0])
    
    let baseRate = 60 // Base booking rate
    
    // Peak hours
    if (hour >= 16 && hour <= 18) baseRate += 20 // After work
    if (hour >= 10 && hour <= 14) baseRate += 15 // Mid-day
    
    // Weekend premium
    if (dayOfWeek === 0 || dayOfWeek === 6) baseRate += 10
    
    return Math.min(95, baseRate)
  }

  private calculatePremiumMultiplier(time: string, dayOfWeek: number): number {
    const hour = parseInt(time.split(':')[0])
    let multiplier = 1.0

    // Premium time slots
    if (hour >= 16 && hour <= 18) multiplier += 0.15 // After work rush
    if (hour >= 10 && hour <= 14) multiplier += 0.10 // Prime business hours
    if (dayOfWeek === 0 || dayOfWeek === 6) multiplier += 0.12 // Weekend premium

    return Math.round(multiplier * 100) / 100
  }

  private calculateTimeSlotEfficiency(appointments: any[]): number {
    // Calculate efficiency based on appointment spacing and utilization
    let efficiencyScore = 75 // Base score

    // Check for back-to-back bookings (more efficient)
    let consecutiveSlots = 0
    appointments.sort((a, b) => parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime())
    
    for (let i = 1; i < appointments.length; i++) {
      const prevEnd = addMinutes(parseISO(appointments[i-1].start_time), appointments[i-1].duration_minutes || 60)
      const currentStart = parseISO(appointments[i].start_time)
      const gap = differenceInMinutes(currentStart, prevEnd)
      
      if (gap <= 15) consecutiveSlots++
    }

    if (appointments.length > 1) {
      const consecutiveRate = consecutiveSlots / (appointments.length - 1)
      efficiencyScore += consecutiveRate * 25
    }

    return Math.min(100, Math.round(efficiencyScore))
  }

  private calculateSixFBTimeScore(time: string, dayOfWeek: number): number {
    const hour = parseInt(time.split(':')[0])
    let score = 50

    // Six Figure Barber methodology favors professional business hours
    if (hour >= 9 && hour <= 17) score += 25
    if (hour >= 10 && hour <= 16) score += 15 // Prime professional hours

    // Avoid budget perception time slots
    if (hour < 9 || hour > 19) score -= 15

    // Weekend professional services
    if (dayOfWeek === 6) score += 10 // Saturday professional services
    if (dayOfWeek === 0) score += 5  // Sunday premium

    return Math.max(0, Math.min(100, score))
  }

  private getAverageRevenuePerMinute(): number {
    if (this.services.length === 0) return 1.0
    return this.services.reduce((sum, service) => sum + service.revenue_per_minute, 0) / this.services.length
  }

  private calculateUpsellRate(appointments: any[]): number {
    // This would require tracking of upsell attempts vs. successes
    // Simplified estimation based on service diversity per client
    const clientServices = new Map<number, Set<string>>()
    
    appointments.forEach(apt => {
      if (apt.client_id) {
        if (!clientServices.has(apt.client_id)) {
          clientServices.set(apt.client_id, new Set())
        }
        clientServices.get(apt.client_id)!.add(apt.service_name)
      }
    })

    let multiServiceClients = 0
    clientServices.forEach(services => {
      if (services.size > 1) multiServiceClients++
    })

    return clientServices.size > 0 ? Math.round((multiServiceClients / clientServices.size) * 100) : 0
  }

  private calculatePeakHourPremium(appointments: any[]): number {
    const peakHourRevenue = appointments
      .filter(apt => {
        const hour = parseISO(apt.start_time).getHours()
        return hour >= 16 && hour <= 18 // Peak hours
      })
      .reduce((sum, apt) => sum + (apt.price || 0), 0)

    const offPeakRevenue = appointments
      .filter(apt => {
        const hour = parseISO(apt.start_time).getHours()
        return hour < 16 || hour > 18
      })
      .reduce((sum, apt) => sum + (apt.price || 0), 0)

    const peakCount = appointments.filter(apt => {
      const hour = parseISO(apt.start_time).getHours()
      return hour >= 16 && hour <= 18
    }).length

    const offPeakCount = appointments.filter(apt => {
      const hour = parseISO(apt.start_time).getHours()
      return hour < 16 || hour > 18
    }).length

    if (peakCount === 0 || offPeakCount === 0) return 0

    const peakAvg = peakHourRevenue / peakCount
    const offPeakAvg = offPeakRevenue / offPeakCount

    return Math.round(((peakAvg - offPeakAvg) / offPeakAvg) * 100)
  }

  private calculateSeasonalVariance(appointments: any[]): number {
    const seasonalRevenue = new Map<string, number>()
    
    appointments.forEach(apt => {
      const season = this.getSeason(parseISO(apt.start_time))
      seasonalRevenue.set(season, (seasonalRevenue.get(season) || 0) + (apt.price || 0))
    })

    const revenues = Array.from(seasonalRevenue.values())
    if (revenues.length < 2) return 0

    const avg = revenues.reduce((sum, rev) => sum + rev, 0) / revenues.length
    const variance = revenues.reduce((sum, rev) => sum + Math.pow(rev - avg, 2), 0) / revenues.length
    const stdDev = Math.sqrt(variance)

    return Math.round((stdDev / avg) * 100)
  }

  private estimateAvailableHours(dateRange?: { start: Date; end: Date }): number {
    // Simplified estimation - would need actual barber availability data
    const days = dateRange ? differenceInDays(dateRange.end, dateRange.start) : 30
    const hoursPerDay = 8 // Typical barbershop hours
    const workingDays = Math.round(days * 0.85) // Accounting for off days
    
    return hoursPerDay * workingDays
  }

  private getDefaultRevenueMetrics(): RevenueMetrics {
    return {
      total_revenue: 0,
      revenue_per_hour: 0,
      revenue_per_client: 0,
      average_service_price: 0,
      utilization_rate: 0,
      conversion_rate: 0,
      client_retention_rate: 0,
      upselling_success_rate: 0,
      peak_hour_premium: 0,
      seasonal_variance: 0
    }
  }

  private analyzeServiceCombinations(): Map<string, string[]> {
    // Analyze which services are commonly booked together
    const combinations = new Map<string, string[]>()
    
    // Group appointments by client and date to find combinations
    const clientDayAppointments = new Map<string, any[]>()
    
    this.appointments.forEach(apt => {
      const key = `${apt.client_id}-${format(parseISO(apt.start_time), 'yyyy-MM-dd')}`
      if (!clientDayAppointments.has(key)) {
        clientDayAppointments.set(key, [])
      }
      clientDayAppointments.get(key)!.push(apt)
    })

    clientDayAppointments.forEach(dayAppointments => {
      if (dayAppointments.length > 1) {
        const services = dayAppointments.map(apt => apt.service_name).sort()
        const primaryService = services[0]
        
        if (!combinations.has(primaryService)) {
          combinations.set(primaryService, [])
        }
        combinations.get(primaryService)!.push(...services.slice(1))
      }
    })

    return combinations
  }

  private findUpsellsForAppointment(appointment: any, combinations: Map<string, string[]>): UpsellOpportunity[] {
    const opportunities: UpsellOpportunity[] = []
    const serviceName = appointment.service_name
    const crossSells = combinations.get(serviceName) || this.identifyServiceCrossSells(serviceName)

    crossSells.forEach(additionalService => {
      const additionalPrice = this.getAverageServicePrice(additionalService)
      if (additionalPrice > 0) {
        opportunities.push({
          client_id: appointment.client_id,
          service_combination: [serviceName, additionalService],
          current_value: appointment.price || 0,
          potential_value: (appointment.price || 0) + additionalPrice,
          value_increase: additionalPrice,
          success_probability: this.calculateUpsellProbability(serviceName, additionalService),
          optimal_timing: this.getOptimalUpsellTiming(serviceName, additionalService),
          script_suggestion: this.generateUpsellScript(serviceName, additionalService),
          seasonal_relevance: this.getSeasonalRelevance(additionalService, parseISO(appointment.start_time))
        })
      }
    })

    return opportunities
  }

  private generateServicePackageOpportunities(): UpsellOpportunity[] {
    // Generate package opportunities based on popular service combinations
    const packages = [
      {
        name: 'Complete Grooming Package',
        services: ['Haircut', 'Beard Trim', 'Styling'],
        basePrice: 120,
        discount: 0.15
      },
      {
        name: 'Premium Experience',
        services: ['Signature Haircut', 'Hot Towel Shave', 'Scalp Treatment'],
        basePrice: 150,
        discount: 0.10
      },
      {
        name: 'Quick Touch-up',
        services: ['Haircut', 'Beard Line-up'],
        basePrice: 65,
        discount: 0.10
      }
    ]

    return packages.map(pkg => ({
      service_combination: pkg.services,
      current_value: pkg.services.reduce((sum, service) => sum + this.getAverageServicePrice(service), 0),
      potential_value: pkg.basePrice,
      value_increase: pkg.basePrice - (pkg.services.reduce((sum, service) => sum + this.getAverageServicePrice(service), 0) * (1 - pkg.discount)),
      success_probability: 65,
      optimal_timing: 'at_checkout' as const,
      script_suggestion: `Save ${Math.round(pkg.discount * 100)}% with our ${pkg.name} - everything you need in one convenient package`,
      seasonal_relevance: 75
    }))
  }

  private generatePricingInsights(): RevenueOptimizationInsight[] {
    const insights: RevenueOptimizationInsight[] = []
    
    // Find underpriced premium services
    const premiumServices = this.services.filter(s => s.six_fb_alignment > 75 && s.demand_score > 60)
    if (premiumServices.length > 0) {
      const avgPrice = premiumServices.reduce((sum, s) => sum + s.average_price, 0) / premiumServices.length
      const potentialIncrease = avgPrice * 0.15 // 15% increase
      const monthlyImpact = premiumServices.reduce((sum, s) => sum + (s.total_bookings * potentialIncrease), 0)

      insights.push({
        type: 'pricing',
        title: 'Premium Service Pricing Opportunity',
        description: `Your premium services are underpriced compared to their value and demand. A strategic 15% increase could boost monthly revenue by $${Math.round(monthlyImpact)}.`,
        potential_monthly_impact: monthlyImpact,
        implementation_effort: 'low',
        priority: 'high',
        actionable_steps: [
          'Implement graduated price increases over 2 months',
          'Emphasize value and premium positioning in marketing',
          'Train staff on value-based selling techniques'
        ],
        metrics_to_track: ['Average service price', 'Booking conversion rate', 'Client satisfaction'],
        expected_roi: 300, // 300% ROI on pricing changes
        risk_factors: ['Potential short-term booking decrease', 'Client sticker shock'],
        six_fb_methodology_alignment: 95
      })
    }

    return insights
  }

  private generateServiceMixInsights(): RevenueOptimizationInsight[] {
    const insights: RevenueOptimizationInsight[] = []
    
    // Identify high-margin services that are underutilized
    const highMarginServices = this.services.filter(s => s.profit_margin_estimate > 70 && s.demand_score < 40)
    
    if (highMarginServices.length > 0) {
      const potentialRevenue = highMarginServices.reduce((sum, s) => {
        const currentMonthly = s.total_bookings * s.average_price
        const potential = currentMonthly * 2 // Double the bookings
        return sum + (potential - currentMonthly)
      }, 0)

      insights.push({
        type: 'service_mix',
        title: 'High-Margin Service Promotion Opportunity',
        description: `Services like ${highMarginServices.map(s => s.service_name).join(', ')} have excellent margins but low demand. Strategic promotion could significantly boost profitability.`,
        potential_monthly_impact: potentialRevenue,
        implementation_effort: 'medium',
        priority: 'high',
        actionable_steps: [
          'Create targeted marketing campaigns for underutilized services',
          'Train staff to suggest high-margin services',
          'Offer introductory packages featuring these services'
        ],
        metrics_to_track: ['Service booking rates', 'Revenue per service category', 'Staff suggestion rates'],
        expected_roi: 250,
        risk_factors: ['Marketing investment required', 'Staff training time'],
        six_fb_methodology_alignment: 85
      })
    }

    return insights
  }

  private generateSchedulingInsights(): RevenueOptimizationInsight[] {
    const insights: RevenueOptimizationInsight[] = []
    
    // Analyze peak hour optimization
    const peakSlots = this.timeSlots.filter(slot => slot.premium_multiplier > 1.1)
    const offPeakSlots = this.timeSlots.filter(slot => slot.booking_rate < 50)

    if (peakSlots.length > 0 && offPeakSlots.length > 0) {
      const peakRevenuePotential = peakSlots.reduce((sum, slot) => sum + (slot.average_revenue * 0.2), 0) * 4 // Weekly estimate
      
      insights.push({
        type: 'scheduling',
        title: 'Peak Hour Revenue Optimization',
        description: `You have ${peakSlots.length} high-value time slots and ${offPeakSlots.length} underutilized periods. Strategic scheduling could increase weekly revenue by $${Math.round(peakRevenuePotential * 4)}.`,
        potential_monthly_impact: peakRevenuePotential * 4,
        implementation_effort: 'low',
        priority: 'medium',
        actionable_steps: [
          'Reserve peak hours for premium services and VIP clients',
          'Offer off-peak discounts to increase utilization',
          'Implement dynamic booking incentives'
        ],
        metrics_to_track: ['Peak hour utilization', 'Average revenue per time slot', 'Overall booking rate'],
        expected_roi: 200,
        risk_factors: ['Client scheduling preference conflicts'],
        six_fb_methodology_alignment: 80
      })
    }

    return insights
  }

  private generateUpsellInsights(): RevenueOptimizationInsight[] {
    const currentUpsellRate = this.calculateUpsellRate(this.appointments)
    const targetUpsellRate = 35 // Industry benchmark
    
    if (currentUpsellRate < targetUpsellRate) {
      const improvement = targetUpsellRate - currentUpsellRate
      const averageServicePrice = this.services.reduce((sum, s) => sum + s.average_price, 0) / this.services.length
      const monthlyAppointments = this.appointments.length
      const potentialRevenue = (monthlyAppointments * (improvement / 100)) * (averageServicePrice * 0.4) // 40% average upsell value

      return [{
        type: 'upselling',
        title: 'Upselling Performance Improvement',
        description: `Current upselling rate is ${currentUpsellRate}%, below the ${targetUpsellRate}% target. Improving upselling could add $${Math.round(potentialRevenue)} monthly revenue.`,
        potential_monthly_impact: potentialRevenue,
        implementation_effort: 'medium',
        priority: 'high',
        actionable_steps: [
          'Implement structured upselling training for all staff',
          'Create service menus highlighting complementary offerings',
          'Develop scripted upselling approaches for each service'
        ],
        metrics_to_track: ['Upselling success rate', 'Average ticket size', 'Service combinations per client'],
        expected_roi: 400,
        risk_factors: ['Staff resistance to sales training', 'Client perception of pushy sales'],
        six_fb_methodology_alignment: 90
      }]
    }

    return []
  }

  private generateRetentionInsights(): RevenueOptimizationInsight[] {
    const metrics = this.calculateRevenueMetrics()
    const targetRetentionRate = 75 // Six Figure Barber target
    
    if (metrics.client_retention_rate < targetRetentionRate) {
      const improvement = targetRetentionRate - metrics.client_retention_rate
      const avgClientValue = metrics.revenue_per_client
      const newClients = new Set(this.appointments.map(apt => apt.client_id)).size
      const potentialRevenue = (newClients * (improvement / 100)) * avgClientValue * 0.5 // Conservative estimate

      return [{
        type: 'retention',
        title: 'Client Retention Improvement Opportunity',
        description: `Client retention rate is ${Math.round(metrics.client_retention_rate)}%, below the ${targetRetentionRate}% Six Figure Barber target. Improving retention could add $${Math.round(potentialRevenue)} monthly revenue.`,
        potential_monthly_impact: potentialRevenue,
        implementation_effort: 'high',
        priority: 'high',
        actionable_steps: [
          'Implement automated follow-up and reminder systems',
          'Create loyalty rewards program',
          'Develop personalized service recommendations',
          'Train staff in relationship building techniques'
        ],
        metrics_to_track: ['Client retention rate', 'Repeat booking rate', 'Client lifetime value'],
        expected_roi: 500,
        risk_factors: ['Technology investment required', 'Staff training intensive'],
        six_fb_methodology_alignment: 95
      }]
    }

    return []
  }

  // Additional helper methods

  private getAverageServicePrice(serviceName: string): number {
    const service = this.services.find(s => s.service_name.toLowerCase().includes(serviceName.toLowerCase()))
    return service?.average_price || 50 // Default price if not found
  }

  private calculateUpsellProbability(primaryService: string, additionalService: string): number {
    // Base probability
    let probability = 45

    // Complementary services have higher success rates
    if ((primaryService.toLowerCase().includes('haircut') && additionalService.toLowerCase().includes('beard')) ||
        (primaryService.toLowerCase().includes('beard') && additionalService.toLowerCase().includes('mustache'))) {
      probability += 25
    }

    // Same service category
    if (this.getServiceCategory(primaryService) === this.getServiceCategory(additionalService)) {
      probability += 15
    }

    return Math.min(85, probability)
  }

  private getOptimalUpsellTiming(primaryService: string, additionalService: string): 'during_service' | 'at_checkout' | 'follow_up_call' | 'next_booking' {
    // Quick add-ons during service
    if (additionalService.toLowerCase().includes('trim') || additionalService.toLowerCase().includes('style')) {
      return 'during_service'
    }
    
    // Complex services for next booking
    if (additionalService.toLowerCase().includes('treatment') || additionalService.toLowerCase().includes('color')) {
      return 'next_booking'
    }

    // Default to checkout
    return 'at_checkout'
  }

  private generateUpsellScript(primaryService: string, additionalService: string): string {
    const scripts = {
      'haircut_beard': "Since we're giving you a fresh haircut, would you like me to clean up your beard line to complete the look?",
      'beard_mustache': "Your beard looks great - shall we also trim your mustache to match?",
      'haircut_styling': "Would you like me to style your hair with some product to show you how to maintain this look at home?",
      'default': `Would you be interested in adding ${additionalService} to complement your ${primaryService}?`
    }

    const key = `${this.getServiceCategory(primaryService)}_${this.getServiceCategory(additionalService)}`
    return scripts[key] || scripts['default']
  }

  private getSeasonalRelevance(serviceName: string, date: Date): number {
    const season = this.getSeason(date)
    const service = serviceName.toLowerCase()

    // Seasonal service relevance
    if (season === 'summer' && (service.includes('beard') || service.includes('trim'))) return 85
    if (season === 'winter' && service.includes('treatment')) return 80
    if (season === 'spring' && service.includes('color')) return 75
    
    return 65 // Base relevance
  }

  private getServiceCategory(serviceName: string): string {
    const service = serviceName.toLowerCase()
    if (service.includes('haircut') || service.includes('cut')) return 'haircut'
    if (service.includes('beard') || service.includes('trim')) return 'beard'
    if (service.includes('shave')) return 'shave'
    if (service.includes('style') || service.includes('styling')) return 'style'
    if (service.includes('treatment')) return 'treatment'
    return 'other'
  }

  private getSeason(date: Date): string {
    const month = date.getMonth()
    if (month >= 2 && month <= 4) return 'spring'
    if (month >= 5 && month <= 7) return 'summer'
    if (month >= 8 && month <= 10) return 'fall'
    return 'winter'
  }

  private calculateSegmentFrequency(clients: any[]): number {
    if (clients.length === 0) return 30
    
    const frequencies = clients.map(client => {
      const appointments = client.data.appointments
      if (appointments.length < 2) return 30
      
      const dates = appointments.map((apt: any) => parseISO(apt.start_time)).sort((a: Date, b: Date) => a.getTime() - b.getTime())
      let totalDays = 0
      for (let i = 1; i < dates.length; i++) {
        totalDays += differenceInDays(dates[i], dates[i-1])
      }
      return totalDays / (dates.length - 1)
    })

    return Math.round(frequencies.reduce((sum, freq) => sum + freq, 0) / frequencies.length)
  }

  private getSegmentPreferredServices(clients: any[]): string[] {
    const serviceFreq = new Map<string, number>()
    
    clients.forEach(client => {
      client.data.appointments.forEach((apt: any) => {
        serviceFreq.set(apt.service_name, (serviceFreq.get(apt.service_name) || 0) + 1)
      })
    })

    return Array.from(serviceFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([service]) => service)
  }

  private calculatePriceSensitivity(segmentName: string): number {
    const sensitivityMap: { [key: string]: number } = {
      'High-Value Champions': 20,
      'Regular Loyalists': 40,
      'Occasional Visitors': 60,
      'Price-Sensitive': 85,
      'Premium Seekers': 25
    }
    return sensitivityMap[segmentName] || 50
  }

  private calculateUpsellResponsiveness(segmentName: string): number {
    const responsivenessMap: { [key: string]: number } = {
      'High-Value Champions': 85,
      'Regular Loyalists': 70,
      'Occasional Visitors': 45,
      'Price-Sensitive': 30,
      'Premium Seekers': 80
    }
    return responsivenessMap[segmentName] || 50
  }

  private getRetentionStrategies(segmentName: string): string[] {
    const strategiesMap: { [key: string]: string[] } = {
      'High-Value Champions': ['VIP treatment', 'Exclusive services', 'Personal barber assignment'],
      'Regular Loyalists': ['Loyalty rewards', 'Birthday specials', 'Referral incentives'],
      'Occasional Visitors': ['Re-engagement campaigns', 'Service education', 'Convenience improvements'],
      'Price-Sensitive': ['Value packages', 'Off-peak discounts', 'Loyalty savings'],
      'Premium Seekers': ['Premium service introductions', 'Luxury experiences', 'Exclusive products']
    }
    return strategiesMap[segmentName] || ['General retention tactics']
  }

  private generateSeasonalPricingAdjustments(season: string, multiplier: number): PricingAdjustment[] {
    const adjustments: PricingAdjustment[] = []
    
    if (multiplier > 1.1) { // High demand season
      adjustments.push({
        service_name: 'Premium Services',
        adjustment_percentage: 10,
        start_date: this.getSeasonStart(season),
        end_date: this.getSeasonEnd(season),
        reasoning: `High demand during ${season} supports premium pricing`
      })
    }

    return adjustments
  }

  private getSeasonalMarketingFocus(season: string): string[] {
    const focusMap: { [key: string]: string[] } = {
      'spring': ['Fresh looks', 'Spring cleaning your style', 'New beginnings'],
      'summer': ['Beat the heat cuts', 'Vacation ready', 'Professional summer style'],
      'fall': ['Back to business', 'Seasonal refresh', 'Professional polish'],
      'winter': ['Holiday ready', 'Warm treatments', 'Winter maintenance']
    }
    return focusMap[season] || ['General grooming services']
  }

  private getSeasonStart(season: string): Date {
    const year = new Date().getFullYear()
    const seasonDates: { [key: string]: [number, number] } = {
      'spring': [2, 20], // March 20
      'summer': [5, 21], // June 21
      'fall': [8, 22],   // September 22
      'winter': [11, 21] // December 21
    }
    const [month, day] = seasonDates[season] || [0, 1]
    return new Date(year, month, day)
  }

  private getSeasonEnd(season: string): Date {
    const seasonOrder = ['winter', 'spring', 'summer', 'fall']
    const currentIndex = seasonOrder.indexOf(season)
    const nextSeason = seasonOrder[(currentIndex + 1) % 4]
    return this.getSeasonStart(nextSeason)
  }

  // Public API methods for external access

  /**
   * Get service profitability analysis
   */
  public getServiceProfitability(): ServiceProfitability[] {
    return this.services
  }

  /**
   * Get time slot analysis
   */
  public getTimeSlotAnalysis(): TimeSlotProfitability[] {
    return this.timeSlots
  }

  /**
   * Get client value segments
   */
  public getClientValueSegments(): ClientValueSegment[] {
    return this.clientSegments
  }

  /**
   * Get seasonal patterns
   */
  public getSeasonalPatterns(): SeasonalRevenuePattern[] {
    return this.seasonalPatterns
  }

  /**
   * Update engine with new appointment data
   */
  public updateWithNewData(newAppointments: any[]): void {
    this.appointments = [...this.appointments, ...newAppointments]
    this.analyzeServiceProfitability()
    this.analyzeTimeSlotProfitability()
    this.analyzeClientValueSegments()
    this.analyzeSeasonalPatterns()
  }
}

// Export utility functions
export const createRevenueOptimizationEngine = (appointments: any[]): RevenueOptimizationEngine => {
  return new RevenueOptimizationEngine(appointments)
}

export const calculateServiceROI = (
  service: ServiceProfitability,
  marketingCost: number
): number => {
  const monthlyRevenue = service.total_revenue
  const roi = ((monthlyRevenue - marketingCost) / marketingCost) * 100
  return Math.round(roi)
}