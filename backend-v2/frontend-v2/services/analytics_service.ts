'use client'

import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns'

// Types for analytics data
export interface RevenueDataPoint {
  date: string
  revenue: number
  appointments: number
  averageTicket: number
  tips: number
  totalRevenue: number
}

export interface ClientMetrics {
  totalClients: number
  newClients: number
  returningClients: number
  vipClients: number
  averageLifetimeValue: number
  retentionRate: number
}

export interface ServiceMetrics {
  serviceId: number
  serviceName: string
  bookings: number
  revenue: number
  averagePrice: number
  profitMargin: number
  popularityRank: number
  isPremium: boolean
}

export interface PredictiveAnalytics {
  projectedMonthlyRevenue: number
  projectedAnnualRevenue: number
  sixFigureGoalProgress: number
  timeToGoal: number // months
  confidenceLevel: number
  growthRate: number
  seasonalTrends: Array<{
    month: string
    multiplier: number
    confidence: number
  }>
}

export interface AnalyticsReport {
  period: {
    start: Date
    end: Date
    type: 'day' | 'week' | 'month' | 'quarter' | 'year'
  }
  summary: {
    totalRevenue: number
    totalAppointments: number
    averageTicket: number
    growthRate: number
    sixFigureProgress: number
  }
  revenueData: RevenueDataPoint[]
  clientMetrics: ClientMetrics
  serviceMetrics: ServiceMetrics[]
  predictive: PredictiveAnalytics
  recommendations: Array<{
    type: 'revenue' | 'efficiency' | 'client' | 'service'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    potentialImpact: number // percentage increase
    timeframe: string
  }>
}

export class AnalyticsService {
  
  /**
   * Generate comprehensive analytics report for a given period
   */
  static generateReport(
    appointments: any[],
    clients: any[],
    period: { start: Date; end: Date; type: 'day' | 'week' | 'month' | 'quarter' | 'year' }
  ): AnalyticsReport {
    
    // Filter appointments to the specified period
    const periodAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= period.start && aptDate <= period.end && apt.status === 'completed'
    })

    // Generate revenue time series data
    const revenueData = this.generateRevenueTimeSeries(periodAppointments, period)
    
    // Calculate client metrics
    const clientMetrics = this.calculateClientMetrics(periodAppointments, clients, period)
    
    // Analyze service performance
    const serviceMetrics = this.analyzeServicePerformance(periodAppointments)
    
    // Generate predictive analytics
    const predictive = this.generatePredictiveAnalytics(appointments, period)
    
    // Calculate summary metrics
    const totalRevenue = periodAppointments.reduce((sum, apt) => sum + apt.price + (apt.tips || 0), 0)
    const totalAppointments = periodAppointments.length
    const averageTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0
    
    // Calculate growth rate (compare to previous period)
    const previousPeriod = this.getPreviousPeriod(period)
    const previousAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= previousPeriod.start && aptDate <= previousPeriod.end && apt.status === 'completed'
    })
    const previousRevenue = previousAppointments.reduce((sum, apt) => sum + apt.price + (apt.tips || 0), 0)
    const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0
    
    // Six figure progress (annual projection)
    const annualProjection = this.calculateAnnualProjection(totalRevenue, period.type)
    const sixFigureProgress = (annualProjection / 100000) * 100
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      { totalRevenue, totalAppointments, averageTicket, growthRate, sixFigureProgress },
      clientMetrics,
      serviceMetrics,
      predictive
    )

    return {
      period,
      summary: {
        totalRevenue,
        totalAppointments,
        averageTicket,
        growthRate,
        sixFigureProgress
      },
      revenueData,
      clientMetrics,
      serviceMetrics,
      predictive,
      recommendations
    }
  }

  /**
   * Generate revenue time series data based on period type
   */
  private static generateRevenueTimeSeries(
    appointments: any[],
    period: { start: Date; end: Date; type: 'day' | 'week' | 'month' | 'quarter' | 'year' }
  ): RevenueDataPoint[] {
    let intervals: Date[]
    
    switch (period.type) {
      case 'day':
        // Hourly data for day view
        intervals = []
        for (let hour = 8; hour <= 18; hour++) {
          const date = new Date(period.start)
          date.setHours(hour, 0, 0, 0)
          intervals.push(date)
        }
        break
      case 'week':
        // Daily data for week view
        intervals = eachDayOfInterval({ start: period.start, end: period.end })
        break
      case 'month':
        // Daily data for month view
        intervals = eachDayOfInterval({ start: period.start, end: period.end })
        break
      case 'quarter':
        // Weekly data for quarter view
        intervals = eachWeekOfInterval({ start: period.start, end: period.end })
        break
      case 'year':
        // Monthly data for year view
        intervals = eachMonthOfInterval({ start: period.start, end: period.end })
        break
      default:
        intervals = eachDayOfInterval({ start: period.start, end: period.end })
    }

    return intervals.map(intervalDate => {
      const intervalAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.start_time)
        
        if (period.type === 'day') {
          // Hour-based grouping
          return aptDate.getHours() === intervalDate.getHours() &&
                 aptDate.toDateString() === intervalDate.toDateString()
        } else if (period.type === 'quarter' || period.type === 'year') {
          // Week/month based grouping
          return this.isInSameInterval(aptDate, intervalDate, period.type)
        } else {
          // Day-based grouping
          return aptDate.toDateString() === intervalDate.toDateString()
        }
      })

      const revenue = intervalAppointments.reduce((sum, apt) => sum + apt.price, 0)
      const tips = intervalAppointments.reduce((sum, apt) => sum + (apt.tips || 0), 0)
      const totalRevenue = revenue + tips
      const appointmentCount = intervalAppointments.length
      const averageTicket = appointmentCount > 0 ? totalRevenue / appointmentCount : 0

      return {
        date: period.type === 'day' ? format(intervalDate, 'HH:mm') : format(intervalDate, 'MMM d'),
        revenue,
        appointments: appointmentCount,
        averageTicket,
        tips,
        totalRevenue
      }
    })
  }

  /**
   * Calculate comprehensive client metrics
   */
  private static calculateClientMetrics(
    appointments: any[],
    clients: any[],
    period: { start: Date; end: Date; type: string }
  ): ClientMetrics {
    const periodClients = new Set(appointments.map(apt => apt.client_id))
    const totalClients = periodClients.size

    // Calculate new vs returning clients
    const clientFirstAppointments = new Map<number, Date>()
    clients.forEach(client => {
      if (client.created_at) {
        clientFirstAppointments.set(client.id, new Date(client.created_at))
      }
    })

    let newClients = 0
    let returningClients = 0
    
    periodClients.forEach(clientId => {
      const firstAppointment = clientFirstAppointments.get(clientId)
      if (firstAppointment && firstAppointment >= period.start && firstAppointment <= period.end) {
        newClients++
      } else {
        returningClients++
      }
    })

    // VIP clients (clients with high revenue or frequent visits)
    const vipClients = clients.filter(client => 
      client.is_vip || client.total_revenue > 500 || client.total_appointments > 10
    ).length

    // Calculate average lifetime value
    const averageLifetimeValue = clients.length > 0 
      ? clients.reduce((sum, client) => sum + (client.total_revenue || 0), 0) / clients.length
      : 0

    // Calculate retention rate (simplified - clients who booked in this period and previous period)
    const previousPeriod = this.getPreviousPeriod(period)
    const previousAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= previousPeriod.start && aptDate <= previousPeriod.end
    })
    const previousClients = new Set(previousAppointments.map(apt => apt.client_id))
    const retainedClients = Array.from(periodClients).filter(clientId => previousClients.has(clientId))
    const retentionRate = previousClients.size > 0 ? (retainedClients.length / previousClients.size) * 100 : 100

    return {
      totalClients,
      newClients,
      returningClients,
      vipClients,
      averageLifetimeValue,
      retentionRate
    }
  }

  /**
   * Analyze service performance metrics
   */
  private static analyzeServicePerformance(appointments: any[]): ServiceMetrics[] {
    const serviceMap = new Map<number, {
      serviceName: string
      bookings: number
      revenue: number
      prices: number[]
      isPremium: boolean
    }>()

    // Group appointments by service
    appointments.forEach(apt => {
      const serviceId = apt.service_id
      const existing = serviceMap.get(serviceId) || {
        serviceName: apt.service_name,
        bookings: 0,
        revenue: 0,
        prices: [],
        isPremium: apt.is_premium || false
      }

      existing.bookings++
      existing.revenue += apt.price + (apt.tips || 0)
      existing.prices.push(apt.price)
      
      serviceMap.set(serviceId, existing)
    })

    // Convert to ServiceMetrics array and calculate additional metrics
    const services = Array.from(serviceMap.entries()).map(([serviceId, data], index) => {
      const averagePrice = data.prices.length > 0 
        ? data.prices.reduce((sum, price) => sum + price, 0) / data.prices.length 
        : 0
      
      // Simplified profit margin calculation (premium services have higher margins)
      const profitMargin = data.isPremium ? 75 : 60

      return {
        serviceId,
        serviceName: data.serviceName,
        bookings: data.bookings,
        revenue: data.revenue,
        averagePrice,
        profitMargin,
        popularityRank: index + 1, // Will be sorted later
        isPremium: data.isPremium
      }
    })

    // Sort by revenue and assign popularity ranks
    services.sort((a, b) => b.revenue - a.revenue)
    services.forEach((service, index) => {
      service.popularityRank = index + 1
    })

    return services
  }

  /**
   * Generate predictive analytics based on historical data
   */
  private static generatePredictiveAnalytics(
    appointments: any[],
    currentPeriod: { start: Date; end: Date; type: string }
  ): PredictiveAnalytics {
    // Calculate monthly averages from historical data
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(new Date(), i + 1))
      const monthEnd = endOfMonth(monthStart)
      const monthAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.start_time)
        return aptDate >= monthStart && aptDate <= monthEnd && apt.status === 'completed'
      })
      return monthAppointments.reduce((sum, apt) => sum + apt.price + (apt.tips || 0), 0)
    })

    const averageMonthlyRevenue = last6Months.reduce((sum, revenue) => sum + revenue, 0) / last6Months.length
    const projectedAnnualRevenue = averageMonthlyRevenue * 12
    const sixFigureGoalProgress = (projectedAnnualRevenue / 100000) * 100

    // Calculate growth rate
    const recentRevenue = last6Months.slice(0, 3).reduce((sum, revenue) => sum + revenue, 0) / 3
    const olderRevenue = last6Months.slice(3, 6).reduce((sum, revenue) => sum + revenue, 0) / 3
    const growthRate = olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue) * 100 : 0

    // Estimate time to reach six-figure goal
    const remainingRevenue = Math.max(0, 100000 - projectedAnnualRevenue)
    const monthlyGrowth = averageMonthlyRevenue * (growthRate / 100)
    const timeToGoal = monthlyGrowth > 0 ? Math.ceil(remainingRevenue / monthlyGrowth) : 999

    // Generate seasonal trends (simplified)
    const seasonalTrends = [
      { month: 'Jan', multiplier: 0.85, confidence: 0.8 },
      { month: 'Feb', multiplier: 0.9, confidence: 0.8 },
      { month: 'Mar', multiplier: 1.1, confidence: 0.85 },
      { month: 'Apr', multiplier: 1.15, confidence: 0.9 },
      { month: 'May', multiplier: 1.2, confidence: 0.9 },
      { month: 'Jun', multiplier: 1.1, confidence: 0.85 },
      { month: 'Jul', multiplier: 1.05, confidence: 0.8 },
      { month: 'Aug', multiplier: 1.0, confidence: 0.8 },
      { month: 'Sep', multiplier: 1.1, confidence: 0.85 },
      { month: 'Oct', multiplier: 1.15, confidence: 0.9 },
      { month: 'Nov', multiplier: 1.25, confidence: 0.9 },
      { month: 'Dec', multiplier: 1.3, confidence: 0.95 }
    ]

    return {
      projectedMonthlyRevenue: averageMonthlyRevenue,
      projectedAnnualRevenue,
      sixFigureGoalProgress,
      timeToGoal,
      confidenceLevel: 0.85,
      growthRate,
      seasonalTrends
    }
  }

  /**
   * Generate AI-powered recommendations based on analytics
   */
  private static generateRecommendations(
    summary: any,
    clientMetrics: ClientMetrics,
    serviceMetrics: ServiceMetrics[],
    predictive: PredictiveAnalytics
  ) {
    const recommendations = []

    // Revenue-based recommendations
    if (summary.growthRate < 5) {
      recommendations.push({
        type: 'revenue' as const,
        priority: 'high' as const,
        title: 'Accelerate Revenue Growth',
        description: 'Current growth rate is below target. Focus on premium service upselling and client value optimization.',
        potentialImpact: 15,
        timeframe: '30 days'
      })
    }

    if (predictive.sixFigureGoalProgress < 70) {
      recommendations.push({
        type: 'revenue' as const,
        priority: 'high' as const,
        title: 'Six Figure Goal at Risk',
        description: 'Current trajectory will not reach six-figure annual goal. Implement premium pricing strategy.',
        potentialImpact: 25,
        timeframe: '60 days'
      })
    }

    // Client-based recommendations
    if (clientMetrics.retentionRate < 80) {
      recommendations.push({
        type: 'client' as const,
        priority: 'medium' as const,
        title: 'Improve Client Retention',
        description: 'Client retention is below optimal. Implement loyalty program and follow-up strategies.',
        potentialImpact: 20,
        timeframe: '45 days'
      })
    }

    if (clientMetrics.newClients < clientMetrics.totalClients * 0.2) {
      recommendations.push({
        type: 'client' as const,
        priority: 'medium' as const,
        title: 'Increase New Client Acquisition',
        description: 'New client rate is low. Enhance marketing efforts and referral programs.',
        potentialImpact: 18,
        timeframe: '30 days'
      })
    }

    // Service-based recommendations
    const premiumServices = serviceMetrics.filter(s => s.isPremium)
    const premiumAdoption = premiumServices.reduce((sum, s) => sum + s.bookings, 0) / 
                          serviceMetrics.reduce((sum, s) => sum + s.bookings, 0) * 100

    if (premiumAdoption < 40) {
      recommendations.push({
        type: 'service' as const,
        priority: 'high' as const,
        title: 'Boost Premium Service Adoption',
        description: 'Only ' + premiumAdoption.toFixed(1) + '% of bookings are premium services. Train on upselling techniques.',
        potentialImpact: 30,
        timeframe: '21 days'
      })
    }

    // Efficiency recommendations
    if (summary.averageTicket < 80) {
      recommendations.push({
        type: 'efficiency' as const,
        priority: 'medium' as const,
        title: 'Increase Average Ticket Value',
        description: 'Average ticket is below target. Focus on service packages and add-on sales.',
        potentialImpact: 22,
        timeframe: '30 days'
      })
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Helper function to get previous period for comparison
   */
  private static getPreviousPeriod(period: { start: Date; end: Date; type: string }) {
    const duration = period.end.getTime() - period.start.getTime()
    
    return {
      start: new Date(period.start.getTime() - duration),
      end: new Date(period.start.getTime()),
      type: period.type
    }
  }

  /**
   * Helper function to calculate annual projection based on period type
   */
  private static calculateAnnualProjection(revenue: number, periodType: string): number {
    switch (periodType) {
      case 'day':
        return revenue * 365
      case 'week':
        return revenue * 52
      case 'month':
        return revenue * 12
      case 'quarter':
        return revenue * 4
      case 'year':
        return revenue
      default:
        return revenue * 12
    }
  }

  /**
   * Helper function to check if dates are in same interval
   */
  private static isInSameInterval(date1: Date, date2: Date, intervalType: string): boolean {
    if (intervalType === 'quarter' || intervalType === 'year') {
      return startOfWeek(date1).getTime() === startOfWeek(date2).getTime()
    }
    return date1.toDateString() === date2.toDateString()
  }

  /**
   * Export report data to JSON for external use
   */
  static exportReport(report: AnalyticsReport): string {
    return JSON.stringify(report, null, 2)
  }

  /**
   * Generate CSV export for revenue data
   */
  static exportRevenueCSV(revenueData: RevenueDataPoint[]): string {
    const headers = ['Date', 'Revenue', 'Appointments', 'Average Ticket', 'Tips', 'Total Revenue']
    const rows = revenueData.map(data => [
      data.date,
      data.revenue.toFixed(2),
      data.appointments.toString(),
      data.averageTicket.toFixed(2),
      data.tips.toFixed(2),
      data.totalRevenue.toFixed(2)
    ])

    return [headers, ...rows].map(row => row.join(',')).join('\n')
  }
}