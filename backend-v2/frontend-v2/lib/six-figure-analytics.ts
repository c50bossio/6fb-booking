/**
 * Six Figure Barber Analytics Suite
 * Advanced revenue tracking and business intelligence for Six Figure Barber methodology
 * Provides comprehensive analytics aligned with 6FB business principles
 */

import { browserCompatibility } from './browser-compatibility'

export interface RevenueMetrics {
  // Core Revenue Tracking
  totalRevenue: number
  monthlyRevenue: number
  weeklyRevenue: number
  dailyRevenue: number
  projectedYearlyRevenue: number
  
  // Six Figure Barber Specific
  averageRevenuePerClient: number
  clientLifetimeValue: number
  premiumServiceRevenue: number
  premiumServicePercentage: number
  
  // Growth Metrics
  revenueGrowthRate: number
  monthOverMonthGrowth: number
  yearOverYearGrowth: number
  progressToSixFigures: number // Percentage toward $100k
  
  // Efficiency Metrics
  revenuePerHour: number
  bookingUtilizationRate: number
  timeSlotValueOptimization: number
}

export interface ClientAnalytics {
  // Client Value Metrics
  totalClients: number
  activeClients: number
  newClientsThisMonth: number
  clientRetentionRate: number
  
  // Six Figure Barber Client Categories
  premiumClients: number        // High-value, recurring clients
  regularClients: number        // Standard service clients  
  occasionalClients: number     // Infrequent clients
  lostClients: number          // Churned clients
  
  // Client Value Analysis
  topClientContribution: number // Top 20% client revenue share
  averageVisitsPerClient: number
  averageSpendPerVisit: number
  clientAcquisitionCost: number
  
  // Retention & Loyalty
  repeatClientRate: number
  referralRate: number
  clientSatisfactionScore: number
  loyaltyProgramEngagement: number
}

export interface ServiceAnalytics {
  // Service Performance
  totalServices: number
  completedAppointments: number
  cancelledAppointments: number
  noShowRate: number
  
  // Six Figure Barber Service Mix
  premiumServices: {
    name: string
    revenue: number
    count: number
    averagePrice: number
    profitMargin: number
  }[]
  
  standardServices: {
    name: string
    revenue: number
    count: number
    averagePrice: number
    profitMargin: number
  }[]
  
  // Service Optimization
  mostProfitableServices: string[]
  underperformingServices: string[]
  serviceUpsellRate: number
  averageServiceValue: number
  
  // Booking Patterns
  peakHours: number[]
  seasonalTrends: Record<string, number>
  servicePopularityTrends: Record<string, number>
}

export interface SixFigureGoals {
  // Primary Goal
  annualRevenueTarget: number  // Default: $100,000
  currentProgress: number
  monthlyTargetRevenue: number
  dailyTargetRevenue: number
  
  // Supporting Goals
  clientTargets: {
    totalClients: number
    premiumClients: number
    averageRevenuePerClient: number
    clientRetentionTarget: number
  }
  
  serviceTargets: {
    premiumServiceMix: number // Percentage of revenue from premium services
    averageServicePrice: number
    servicesPerDay: number
    utilizationRate: number
  }
  
  // Milestone Tracking
  milestones: {
    id: string
    description: string
    target: number
    current: number
    completed: boolean
    completedDate?: number
    targetDate: number
  }[]
  
  // Goal Achievement Metrics
  onTrackToGoal: boolean
  daysToGoal: number
  requiredDailyRevenue: number
  goalAchievementProbability: number
}

export interface BusinessIntelligence {
  // Performance Indicators
  kpis: {
    name: string
    value: number
    target: number
    trend: 'up' | 'down' | 'stable'
    status: 'excellent' | 'good' | 'warning' | 'critical'
  }[]
  
  // Insights & Recommendations
  insights: {
    category: 'revenue' | 'clients' | 'services' | 'efficiency' | 'growth'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    actionItems: string[]
    expectedImpact: number
  }[]
  
  // Predictive Analytics
  predictions: {
    thirtyDayRevenueForecast: number
    ninetyDayRevenueForecast: number
    yearEndRevenueForecast: number
    clientGrowthForecast: number
    serviceOptimizationImpact: number
  }
  
  // Benchmarking
  industryBenchmarks: {
    averageRevenuePerClient: number
    industryAverageGrowthRate: number
    retentionRateBenchmark: number
    utilizationRateBenchmark: number
  }
}

export interface AnalyticsConfig {
  // Data Collection
  enableRealTimeTracking: boolean
  trackClientBehavior: boolean
  includeHistoricalData: boolean
  dataRetentionMonths: number
  
  // Six Figure Barber Settings
  annualRevenueGoal: number
  premiumServiceThreshold: number
  clientRetentionTarget: number
  targetUtilizationRate: number
  
  // Analysis Settings
  forecastingModel: 'linear' | 'seasonal' | 'exponential' | 'ml'
  benchmarkSource: 'industry' | 'custom' | 'regional'
  alertThresholds: {
    revenueDropPercent: number
    clientChurnRatePercent: number
    utilizationRatePercent: number
  }
}

/**
 * Six Figure Barber Analytics Suite - Core Analytics Engine
 */
class SixFigureAnalytics {
  private config: AnalyticsConfig
  private revenueData: any[] = []
  private clientData: any[] = []
  private appointmentData: any[] = []
  private updateInterval: NodeJS.Timeout
  private cacheUpdateInterval: NodeJS.Timeout
  private analyticsCache = new Map<string, any>()
  
  // Six Figure Barber Business Rules
  private businessRules = {
    premiumServiceMultiplier: 1.5,    // Premium services are 1.5x standard price
    targetClientValue: 500,           // Target annual value per client
    optimalServiceMix: {              // Optimal revenue mix
      premium: 0.4,                   // 40% premium services
      standard: 0.5,                  // 50% standard services  
      addon: 0.1                      // 10% add-on services
    },
    clientCategorization: {
      premium: { minAnnualSpend: 800, minVisits: 8 },
      regular: { minAnnualSpend: 300, minVisits: 4 },
      occasional: { minAnnualSpend: 100, minVisits: 1 }
    }
  }

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enableRealTimeTracking: true,
      trackClientBehavior: true,
      includeHistoricalData: true,
      dataRetentionMonths: 24,
      annualRevenueGoal: 100000,
      premiumServiceThreshold: 75,
      clientRetentionTarget: 0.8,
      targetUtilizationRate: 0.75,
      forecastingModel: 'seasonal',
      benchmarkSource: 'industry',
      alertThresholds: {
        revenueDropPercent: 15,
        clientChurnRatePercent: 25,
        utilizationRatePercent: 60
      },
      ...config
    }

    this.initializeSixFigureAnalytics()

    // Real-time data updates
    this.updateInterval = setInterval(() => {
      this.updateAnalytics()
    }, 60000) // Every minute

    // Cache refresh for complex calculations
    this.cacheUpdateInterval = setInterval(() => {
      this.refreshAnalyticsCache()
    }, 300000) // Every 5 minutes
  }

  /**
   * Initialize Six Figure Barber analytics system
   */
  private async initializeSixFigureAnalytics(): Promise<void> {
    // Load historical data
    await this.loadAnalyticsData()
    
    // Initialize analytics cache
    this.refreshAnalyticsCache()
    
    // Set up Six Figure Barber specific tracking
    this.setupSixFigureTracking()

    console.log('SixFigureAnalytics: Initialized', {
      annualGoal: this.config.annualRevenueGoal,
      dataPoints: this.revenueData.length,
      realTimeTracking: this.config.enableRealTimeTracking
    })
  }

  /**
   * Get comprehensive revenue metrics
   */
  getRevenueMetrics(dateRange?: { start: Date; end: Date }): RevenueMetrics {
    const cached = this.analyticsCache.get('revenueMetrics')
    if (cached && Date.now() - cached.timestamp < 60000) {
      return cached.data
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    // Filter data based on date ranges
    const monthlyData = this.revenueData.filter(d => new Date(d.date) >= startOfMonth)
    const weeklyData = this.revenueData.filter(d => new Date(d.date) >= startOfWeek)
    const dailyData = this.revenueData.filter(d => new Date(d.date) >= startOfDay)
    const yearlyData = this.revenueData.filter(d => new Date(d.date) >= startOfYear)

    // Calculate core revenue metrics
    const totalRevenue = this.revenueData.reduce((sum, d) => sum + d.amount, 0)
    const monthlyRevenue = monthlyData.reduce((sum, d) => sum + d.amount, 0)
    const weeklyRevenue = weeklyData.reduce((sum, d) => sum + d.amount, 0)
    const dailyRevenue = dailyData.reduce((sum, d) => sum + d.amount, 0)
    
    // Project yearly revenue based on current trend
    const monthsElapsed = (now.getTime() - startOfYear.getTime()) / (30 * 24 * 60 * 60 * 1000)
    const currentYearlyRevenue = yearlyData.reduce((sum, d) => sum + d.amount, 0)
    const projectedYearlyRevenue = monthsElapsed > 0 ? (currentYearlyRevenue / monthsElapsed) * 12 : 0

    // Six Figure Barber specific metrics
    const clientCount = new Set(this.appointmentData.map(a => a.client_id)).size
    const averageRevenuePerClient = clientCount > 0 ? totalRevenue / clientCount : 0
    const clientLifetimeValue = this.calculateClientLifetimeValue()
    
    // Premium service analysis
    const premiumServiceRevenue = this.revenueData
      .filter(d => d.service_price >= this.config.premiumServiceThreshold)
      .reduce((sum, d) => sum + d.amount, 0)
    const premiumServicePercentage = totalRevenue > 0 ? premiumServiceRevenue / totalRevenue : 0

    // Growth calculations
    const lastMonthRevenue = this.getLastMonthRevenue()
    const lastYearRevenue = this.getLastYearRevenue()
    const monthOverMonthGrowth = lastMonthRevenue > 0 ? (monthlyRevenue - lastMonthRevenue) / lastMonthRevenue : 0
    const yearOverYearGrowth = lastYearRevenue > 0 ? (currentYearlyRevenue - lastYearRevenue) / lastYearRevenue : 0
    const revenueGrowthRate = this.calculateRevenueGrowthRate()

    // Progress toward Six Figure goal
    const progressToSixFigures = Math.min(projectedYearlyRevenue / this.config.annualRevenueGoal, 1)

    // Efficiency metrics
    const totalHoursWorked = this.calculateTotalHoursWorked()
    const revenuePerHour = totalHoursWorked > 0 ? totalRevenue / totalHoursWorked : 0
    const bookingUtilizationRate = this.calculateBookingUtilization()
    const timeSlotValueOptimization = this.calculateTimeSlotValue()

    const metrics: RevenueMetrics = {
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      dailyRevenue,
      projectedYearlyRevenue,
      averageRevenuePerClient,
      clientLifetimeValue,
      premiumServiceRevenue,
      premiumServicePercentage,
      revenueGrowthRate,
      monthOverMonthGrowth,
      yearOverYearGrowth,
      progressToSixFigures,
      revenuePerHour,
      bookingUtilizationRate,
      timeSlotValueOptimization
    }

    // Cache the results
    this.analyticsCache.set('revenueMetrics', {
      data: metrics,
      timestamp: Date.now()
    })

    return metrics
  }

  /**
   * Get comprehensive client analytics
   */
  getClientAnalytics(): ClientAnalytics {
    const cached = this.analyticsCache.get('clientAnalytics')
    if (cached && Date.now() - cached.timestamp < 300000) {
      return cached.data
    }

    const uniqueClients = new Set(this.appointmentData.map(a => a.client_id))
    const totalClients = uniqueClients.size

    // Calculate client categories based on Six Figure Barber methodology
    const clientSpending = this.calculateClientSpending()
    const clientVisits = this.calculateClientVisits()
    
    let premiumClients = 0
    let regularClients = 0
    let occasionalClients = 0
    
    uniqueClients.forEach(clientId => {
      const spending = clientSpending.get(clientId) || 0
      const visits = clientVisits.get(clientId) || 0
      
      if (spending >= this.businessRules.clientCategorization.premium.minAnnualSpend &&
          visits >= this.businessRules.clientCategorization.premium.minVisits) {
        premiumClients++
      } else if (spending >= this.businessRules.clientCategorization.regular.minAnnualSpend &&
                visits >= this.businessRules.clientCategorization.regular.minVisits) {
        regularClients++
      } else {
        occasionalClients++
      }
    })

    // Client activity analysis
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)
    const activeClients = new Set(
      this.appointmentData
        .filter(a => new Date(a.date).getTime() > thirtyDaysAgo)
        .map(a => a.client_id)
    ).size

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const newClientsThisMonth = new Set(
      this.appointmentData
        .filter(a => new Date(a.date) >= startOfMonth && a.is_new_client)
        .map(a => a.client_id)
    ).size

    // Retention and value metrics
    const clientRetentionRate = this.calculateClientRetentionRate()
    const topClientContribution = this.calculateTopClientContribution()
    const averageVisitsPerClient = this.appointmentData.length / totalClients
    const averageSpendPerVisit = this.calculateAverageSpendPerVisit()
    const clientAcquisitionCost = this.calculateClientAcquisitionCost()
    
    // Loyalty metrics
    const repeatClientRate = this.calculateRepeatClientRate()
    const referralRate = this.calculateReferralRate()
    const clientSatisfactionScore = this.calculateClientSatisfactionScore()
    const loyaltyProgramEngagement = this.calculateLoyaltyEngagement()

    const analytics: ClientAnalytics = {
      totalClients,
      activeClients,
      newClientsThisMonth,
      clientRetentionRate,
      premiumClients,
      regularClients,
      occasionalClients,
      lostClients: totalClients - activeClients,
      topClientContribution,
      averageVisitsPerClient,
      averageSpendPerVisit,
      clientAcquisitionCost,
      repeatClientRate,
      referralRate,
      clientSatisfactionScore,
      loyaltyProgramEngagement
    }

    this.analyticsCache.set('clientAnalytics', {
      data: analytics,
      timestamp: Date.now()
    })

    return analytics
  }

  /**
   * Get comprehensive service analytics
   */
  getServiceAnalytics(): ServiceAnalytics {
    const appointments = this.appointmentData
    const completedAppointments = appointments.filter(a => a.status === 'completed').length
    const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length
    const noShowAppointments = appointments.filter(a => a.status === 'no_show').length
    const noShowRate = appointments.length > 0 ? noShowAppointments / appointments.length : 0

    // Service categorization
    const serviceRevenue = new Map<string, number>()
    const serviceCounts = new Map<string, number>()
    const servicePrices = new Map<string, number[]>()

    appointments
      .filter(a => a.status === 'completed')
      .forEach(appointment => {
        const service = appointment.service_name
        const price = appointment.service_price || 0
        
        serviceRevenue.set(service, (serviceRevenue.get(service) || 0) + price)
        serviceCounts.set(service, (serviceCounts.get(service) || 0) + 1)
        
        if (!servicePrices.has(service)) {
          servicePrices.set(service, [])
        }
        servicePrices.get(service)!.push(price)
      })

    // Categorize services as premium or standard
    const premiumServices = []
    const standardServices = []

    for (const [service, revenue] of serviceRevenue.entries()) {
      const count = serviceCounts.get(service) || 0
      const prices = servicePrices.get(service) || []
      const averagePrice = prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0
      const profitMargin = this.calculateServiceProfitMargin(service)

      const serviceData = {
        name: service,
        revenue,
        count,
        averagePrice,
        profitMargin
      }

      if (averagePrice >= this.config.premiumServiceThreshold) {
        premiumServices.push(serviceData)
      } else {
        standardServices.push(serviceData)
      }
    }

    // Sort by revenue
    premiumServices.sort((a, b) => b.revenue - a.revenue)
    standardServices.sort((a, b) => b.revenue - a.revenue)

    // Service optimization insights
    const mostProfitableServices = [...premiumServices, ...standardServices]
      .sort((a, b) => (b.revenue * b.profitMargin) - (a.revenue * a.profitMargin))
      .slice(0, 5)
      .map(s => s.name)

    const underperformingServices = [...premiumServices, ...standardServices]
      .filter(s => s.profitMargin < 0.3 || s.count < 5)
      .map(s => s.name)

    const serviceUpsellRate = this.calculateServiceUpsellRate()
    const averageServiceValue = this.revenueData.reduce((sum, d) => sum + d.amount, 0) / Math.max(completedAppointments, 1)

    // Booking patterns
    const peakHours = this.calculatePeakHours()
    const seasonalTrends = this.calculateSeasonalTrends()
    const servicePopularityTrends = this.calculateServicePopularityTrends()

    return {
      totalServices: serviceRevenue.size,
      completedAppointments,
      cancelledAppointments,
      noShowRate,
      premiumServices,
      standardServices,
      mostProfitableServices,
      underperformingServices,
      serviceUpsellRate,
      averageServiceValue,
      peakHours,
      seasonalTrends,
      servicePopularityTrends
    }
  }

  /**
   * Get Six Figure Barber goal tracking
   */
  getSixFigureGoals(): SixFigureGoals {
    const revenueMetrics = this.getRevenueMetrics()
    const currentProgress = revenueMetrics.projectedYearlyRevenue / this.config.annualRevenueGoal
    
    const now = new Date()
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const daysInYear = this.isLeapYear(now.getFullYear()) ? 366 : 365
    const daysPassed = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const daysRemaining = daysInYear - daysPassed

    const monthlyTargetRevenue = this.config.annualRevenueGoal / 12
    const dailyTargetRevenue = this.config.annualRevenueGoal / daysInYear
    
    // Goal achievement probability based on current trend
    const currentRunRate = revenueMetrics.projectedYearlyRevenue
    const goalAchievementProbability = Math.min(currentRunRate / this.config.annualRevenueGoal, 1)
    
    // Required daily revenue to reach goal
    const remainingRevenue = this.config.annualRevenueGoal - revenueMetrics.totalRevenue
    const requiredDailyRevenue = daysRemaining > 0 ? remainingRevenue / daysRemaining : 0

    // Client and service targets
    const clientAnalytics = this.getClientAnalytics()
    const serviceAnalytics = this.getServiceAnalytics()

    const clientTargets = {
      totalClients: Math.ceil(this.config.annualRevenueGoal / this.businessRules.targetClientValue),
      premiumClients: Math.ceil(clientAnalytics.totalClients * 0.3), // 30% premium clients
      averageRevenuePerClient: this.businessRules.targetClientValue,
      clientRetentionTarget: this.config.clientRetentionTarget
    }

    const serviceTargets = {
      premiumServiceMix: 0.4, // 40% of revenue from premium services
      averageServicePrice: this.config.premiumServiceThreshold * 0.8,
      servicesPerDay: Math.ceil(dailyTargetRevenue / this.config.premiumServiceThreshold),
      utilizationRate: this.config.targetUtilizationRate
    }

    // Milestone tracking
    const milestones = this.generateSixFigureMilestones(this.config.annualRevenueGoal, revenueMetrics.totalRevenue)

    return {
      annualRevenueTarget: this.config.annualRevenueGoal,
      currentProgress,
      monthlyTargetRevenue,
      dailyTargetRevenue,
      clientTargets,
      serviceTargets,
      milestones,
      onTrackToGoal: goalAchievementProbability >= 0.8,
      daysToGoal: Math.ceil(remainingRevenue / Math.max(revenueMetrics.dailyRevenue, 1)),
      requiredDailyRevenue,
      goalAchievementProbability
    }
  }

  /**
   * Get business intelligence insights
   */
  getBusinessIntelligence(): BusinessIntelligence {
    const revenueMetrics = this.getRevenueMetrics()
    const clientAnalytics = this.getClientAnalytics()
    const serviceAnalytics = this.getServiceAnalytics()
    const goals = this.getSixFigureGoals()

    // Key Performance Indicators
    const kpis = [
      {
        name: 'Revenue Growth',
        value: revenueMetrics.monthOverMonthGrowth,
        target: 0.1, // 10% monthly growth
        trend: revenueMetrics.monthOverMonthGrowth > 0 ? 'up' : 'down',
        status: this.getKPIStatus(revenueMetrics.monthOverMonthGrowth, 0.1)
      },
      {
        name: 'Client Retention Rate',
        value: clientAnalytics.clientRetentionRate,
        target: this.config.clientRetentionTarget,
        trend: clientAnalytics.clientRetentionRate >= this.config.clientRetentionTarget ? 'up' : 'down',
        status: this.getKPIStatus(clientAnalytics.clientRetentionRate, this.config.clientRetentionTarget)
      },
      {
        name: 'Average Revenue Per Client',
        value: revenueMetrics.averageRevenuePerClient,
        target: this.businessRules.targetClientValue,
        trend: 'stable',
        status: this.getKPIStatus(revenueMetrics.averageRevenuePerClient, this.businessRules.targetClientValue)
      },
      {
        name: 'Premium Service Mix',
        value: revenueMetrics.premiumServicePercentage,
        target: this.businessRules.optimalServiceMix.premium,
        trend: 'stable',
        status: this.getKPIStatus(revenueMetrics.premiumServicePercentage, this.businessRules.optimalServiceMix.premium)
      },
      {
        name: 'Booking Utilization',
        value: revenueMetrics.bookingUtilizationRate,
        target: this.config.targetUtilizationRate,
        trend: 'stable',
        status: this.getKPIStatus(revenueMetrics.bookingUtilizationRate, this.config.targetUtilizationRate)
      }
    ]

    // Generate insights and recommendations
    const insights = this.generateBusinessInsights(revenueMetrics, clientAnalytics, serviceAnalytics, goals)

    // Predictive analytics
    const predictions = {
      thirtyDayRevenueForecast: this.forecastRevenue(30),
      ninetyDayRevenueForecast: this.forecastRevenue(90),
      yearEndRevenueForecast: revenueMetrics.projectedYearlyRevenue,
      clientGrowthForecast: this.forecastClientGrowth(90),
      serviceOptimizationImpact: this.calculateServiceOptimizationImpact()
    }

    // Industry benchmarks (mock data - would integrate with real benchmarking service)
    const industryBenchmarks = {
      averageRevenuePerClient: 450,
      industryAverageGrowthRate: 0.12,
      retentionRateBenchmark: 0.75,
      utilizationRateBenchmark: 0.70
    }

    return {
      kpis,
      insights,
      predictions,
      industryBenchmarks
    }
  }

  /**
   * Generate Six Figure Barber milestones
   */
  private generateSixFigureMilestones(annualTarget: number, currentRevenue: number) {
    const milestones = []
    const milestonePercentages = [0.1, 0.25, 0.5, 0.75, 1.0]
    
    milestonePercentages.forEach((percentage, index) => {
      const target = annualTarget * percentage
      const milestone = {
        id: `milestone-${percentage * 100}`,
        description: `Reach ${percentage * 100}% of annual goal ($${target.toLocaleString()})`,
        target,
        current: Math.min(currentRevenue, target),
        completed: currentRevenue >= target,
        completedDate: currentRevenue >= target ? Date.now() : undefined,
        targetDate: this.calculateMilestoneTargetDate(percentage)
      }
      milestones.push(milestone)
    })
    
    return milestones
  }

  /**
   * Generate business insights and recommendations
   */
  private generateBusinessInsights(
    revenue: RevenueMetrics,
    clients: ClientAnalytics,
    services: ServiceAnalytics,
    goals: SixFigureGoals
  ) {
    const insights = []

    // Revenue optimization insights
    if (revenue.revenueGrowthRate < 0.05) { // Less than 5% growth
      insights.push({
        category: 'revenue' as const,
        priority: 'high' as const,
        title: 'Revenue Growth Below Target',
        description: 'Monthly revenue growth is below the 10% target needed for Six Figure success.',
        actionItems: [
          'Increase premium service offerings',
          'Implement client retention programs',
          'Optimize pricing strategy',
          'Focus on high-value client acquisition'
        ],
        expectedImpact: revenue.monthlyRevenue * 0.15
      })
    }

    // Client value optimization
    if (revenue.averageRevenuePerClient < this.businessRules.targetClientValue * 0.8) {
      insights.push({
        category: 'clients' as const,
        priority: 'high' as const,
        title: 'Client Value Below Target',
        description: `Average client value is below the Six Figure Barber target of $${this.businessRules.targetClientValue}.`,
        actionItems: [
          'Implement service upselling strategies',
          'Create premium service packages',
          'Increase visit frequency through loyalty programs',
          'Focus on client relationship building'
        ],
        expectedImpact: (this.businessRules.targetClientValue - revenue.averageRevenuePerClient) * clients.totalClients
      })
    }

    // Service mix optimization
    if (revenue.premiumServicePercentage < this.businessRules.optimalServiceMix.premium) {
      insights.push({
        category: 'services' as const,
        priority: 'medium' as const,
        title: 'Premium Service Mix Opportunity',
        description: 'Premium services represent less than 40% of revenue. Increasing this mix can significantly boost profitability.',
        actionItems: [
          'Promote premium services to existing clients',
          'Train staff on premium service techniques',
          'Create premium service marketing campaigns',
          'Adjust service menu positioning'
        ],
        expectedImpact: revenue.monthlyRevenue * 0.25
      })
    }

    // Utilization insights
    if (revenue.bookingUtilizationRate < this.config.targetUtilizationRate) {
      insights.push({
        category: 'efficiency' as const,
        priority: 'medium' as const,
        title: 'Booking Utilization Below Target',
        description: 'Calendar utilization is below optimal levels, indicating opportunity for increased revenue.',
        actionItems: [
          'Optimize scheduling to reduce gaps',
          'Implement off-peak promotions',
          'Adjust operating hours based on demand',
          'Improve online booking experience'
        ],
        expectedImpact: revenue.revenuePerHour * (this.config.targetUtilizationRate - revenue.bookingUtilizationRate) * 40 * 4 // 40 hours/week * 4 weeks
      })
    }

    // Client retention insights
    if (clients.clientRetentionRate < this.config.clientRetentionTarget) {
      insights.push({
        category: 'clients' as const,
        priority: 'high' as const,
        title: 'Client Retention Below Target',
        description: 'Client retention rate is below the 80% target, impacting long-term revenue stability.',
        actionItems: [
          'Implement client follow-up programs',
          'Create loyalty rewards system',
          'Improve service quality and consistency',
          'Gather and act on client feedback'
        ],
        expectedImpact: clients.clientAcquisitionCost * (clients.lostClients * 0.5) // Assume 50% retention improvement
      })
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  /**
   * Helper methods for calculations
   */
  private calculateClientLifetimeValue(): number {
    const clientSpending = this.calculateClientSpending()
    const totalSpending = Array.from(clientSpending.values()).reduce((sum, spending) => sum + spending, 0)
    return clientSpending.size > 0 ? totalSpending / clientSpending.size : 0
  }

  private calculateClientSpending(): Map<string, number> {
    const spending = new Map<string, number>()
    this.appointmentData
      .filter(a => a.status === 'completed')
      .forEach(appointment => {
        const clientId = appointment.client_id
        const amount = appointment.service_price || 0
        spending.set(clientId, (spending.get(clientId) || 0) + amount)
      })
    return spending
  }

  private calculateClientVisits(): Map<string, number> {
    const visits = new Map<string, number>()
    this.appointmentData
      .filter(a => a.status === 'completed')
      .forEach(appointment => {
        const clientId = appointment.client_id
        visits.set(clientId, (visits.get(clientId) || 0) + 1)
      })
    return visits
  }

  private calculateClientRetentionRate(): number {
    // Simplified retention calculation - would use more sophisticated cohort analysis
    const sixMonthsAgo = Date.now() - (6 * 30 * 24 * 60 * 60 * 1000)
    const oldClients = new Set(
      this.appointmentData
        .filter(a => new Date(a.date).getTime() < sixMonthsAgo)
        .map(a => a.client_id)
    )
    
    const recentClients = new Set(
      this.appointmentData
        .filter(a => new Date(a.date).getTime() >= sixMonthsAgo)
        .map(a => a.client_id)
    )
    
    let retainedClients = 0
    oldClients.forEach(clientId => {
      if (recentClients.has(clientId)) {
        retainedClients++
      }
    })
    
    return oldClients.size > 0 ? retainedClients / oldClients.size : 0
  }

  private getKPIStatus(current: number, target: number): 'excellent' | 'good' | 'warning' | 'critical' {
    const ratio = current / target
    if (ratio >= 1.1) return 'excellent'
    if (ratio >= 0.9) return 'good'
    if (ratio >= 0.7) return 'warning'
    return 'critical'
  }

  private forecastRevenue(days: number): number {
    // Simple linear forecast based on recent trend
    const recentRevenue = this.revenueData.slice(-30) // Last 30 days
    if (recentRevenue.length < 7) return 0
    
    const totalRecent = recentRevenue.reduce((sum, d) => sum + d.amount, 0)
    const dailyAverage = totalRecent / recentRevenue.length
    
    return dailyAverage * days
  }

  // Additional helper methods (simplified implementations)
  private getLastMonthRevenue(): number { return 0 }
  private getLastYearRevenue(): number { return 0 }
  private calculateRevenueGrowthRate(): number { return 0.05 }
  private calculateTotalHoursWorked(): number { return 160 } // 40 hours/week * 4 weeks
  private calculateBookingUtilization(): number { return 0.75 }
  private calculateTimeSlotValue(): number { return 1.0 }
  private calculateTopClientContribution(): number { return 0.6 } // Top 20% contribute 60%
  private calculateAverageSpendPerVisit(): number { return 75 }
  private calculateClientAcquisitionCost(): number { return 50 }
  private calculateRepeatClientRate(): number { return 0.8 }
  private calculateReferralRate(): number { return 0.15 }
  private calculateClientSatisfactionScore(): number { return 4.5 }
  private calculateLoyaltyEngagement(): number { return 0.4 }
  private calculateServiceProfitMargin(service: string): number { return 0.6 }
  private calculateServiceUpsellRate(): number { return 0.3 }
  private calculatePeakHours(): number[] { return [10, 14, 16, 18] }
  private calculateSeasonalTrends(): Record<string, number> { return {} }
  private calculateServicePopularityTrends(): Record<string, number> { return {} }
  private calculateMilestoneTargetDate(percentage: number): number { 
    return Date.now() + (percentage * 365 * 24 * 60 * 60 * 1000) 
  }
  private forecastClientGrowth(days: number): number { return this.getClientAnalytics().totalClients * 1.1 }
  private calculateServiceOptimizationImpact(): number { return 15000 }
  private isLeapYear(year: number): boolean { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) }

  /**
   * Setup Six Figure Barber specific tracking
   */
  private setupSixFigureTracking(): void {
    // Initialize tracking for Six Figure Barber methodology
    console.log('SixFigureAnalytics: Six Figure Barber tracking configured')
  }

  /**
   * Load analytics data (mock implementation)
   */
  private async loadAnalyticsData(): Promise<void> {
    // In production, this would load from API
    // For now, generate some mock data
    this.generateMockData()
  }

  /**
   * Generate mock data for demonstration
   */
  private generateMockData(): void {
    const now = Date.now()
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
    
    // Generate mock revenue data
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo + (i * 24 * 60 * 60 * 1000))
      this.revenueData.push({
        date: date.toISOString(),
        amount: 200 + Math.random() * 300,
        service_price: 50 + Math.random() * 100
      })
    }
    
    // Generate mock appointment data
    for (let i = 0; i < 100; i++) {
      this.appointmentData.push({
        id: i,
        client_id: `client-${Math.floor(Math.random() * 50)}`,
        date: new Date(thirtyDaysAgo + Math.random() * (30 * 24 * 60 * 60 * 1000)).toISOString(),
        service_name: `Service ${Math.floor(Math.random() * 10)}`,
        service_price: 50 + Math.random() * 150,
        status: Math.random() > 0.1 ? 'completed' : 'cancelled',
        is_new_client: Math.random() > 0.8
      })
    }
  }

  /**
   * Update analytics data
   */
  private updateAnalytics(): void {
    if (!this.config.enableRealTimeTracking) return
    
    // Update cache for frequently accessed data
    this.refreshAnalyticsCache()
  }

  /**
   * Refresh analytics cache
   */
  private refreshAnalyticsCache(): void {
    // Clear cache to force recalculation
    this.analyticsCache.clear()
    
    console.log('SixFigureAnalytics: Cache refreshed')
  }

  /**
   * Record new revenue data
   */
  recordRevenue(amount: number, servicePrice: number, date?: Date): void {
    this.revenueData.push({
      date: (date || new Date()).toISOString(),
      amount,
      service_price: servicePrice
    })
    
    // Limit data size
    if (this.revenueData.length > 1000) {
      this.revenueData = this.revenueData.slice(-500)
    }
  }

  /**
   * Record new appointment
   */
  recordAppointment(appointment: any): void {
    this.appointmentData.push(appointment)
    
    // Limit data size
    if (this.appointmentData.length > 1000) {
      this.appointmentData = this.appointmentData.slice(-500)
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.refreshAnalyticsCache()
    console.log('SixFigureAnalytics: Configuration updated', this.config)
  }

  /**
   * Destroy the analytics system
   */
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }
    
    if (this.cacheUpdateInterval) {
      clearInterval(this.cacheUpdateInterval)
    }
    
    this.analyticsCache.clear()
    this.revenueData = []
    this.clientData = []
    this.appointmentData = []
  }
}

// Singleton instance for global Six Figure Barber analytics
export const sixFigureAnalytics = new SixFigureAnalytics()

// React hook for Six Figure Barber analytics
export function useSixFigureAnalytics() {
  const getRevenueMetrics = (dateRange?: { start: Date; end: Date }) => {
    return sixFigureAnalytics.getRevenueMetrics(dateRange)
  }

  const getClientAnalytics = () => {
    return sixFigureAnalytics.getClientAnalytics()
  }

  const getServiceAnalytics = () => {
    return sixFigureAnalytics.getServiceAnalytics()
  }

  const getSixFigureGoals = () => {
    return sixFigureAnalytics.getSixFigureGoals()
  }

  const getBusinessIntelligence = () => {
    return sixFigureAnalytics.getBusinessIntelligence()
  }

  const recordRevenue = (amount: number, servicePrice: number, date?: Date) => {
    sixFigureAnalytics.recordRevenue(amount, servicePrice, date)
  }

  const recordAppointment = (appointment: any) => {
    sixFigureAnalytics.recordAppointment(appointment)
  }

  return {
    getRevenueMetrics,
    getClientAnalytics,
    getServiceAnalytics,
    getSixFigureGoals,
    getBusinessIntelligence,
    recordRevenue,
    recordAppointment
  }
}

export default sixFigureAnalytics