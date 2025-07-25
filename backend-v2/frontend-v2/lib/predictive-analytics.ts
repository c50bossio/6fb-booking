// Predictive Analytics Engine for Six Figure Barber Intelligence
// Advanced machine learning models for business forecasting and optimization

export interface ChurnPrediction {
  clientId: string;
  clientName: string;
  churnRisk: number; // 0-100 score
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    factor: string;
    impact: number; // 0-100
    description: string;
  }[];
  recommendedActions: string[];
  timeToChurn: number; // days
  retentionStrategies: {
    strategy: string;
    effectiveness: number; // 0-100
    cost: number;
    timeframe: string;
  }[];
}

export interface RevenueForecast {
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  predictions: {
    date: string;
    predictedRevenue: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
    factors: {
      seasonal: number;
      trend: number;
      cyclical: number;
      irregular: number;
    };
  }[];
  totalForecast: number;
  growthProjection: number;
  seasonalPatterns: {
    pattern: string;
    impact: number;
    timing: string;
  }[];
}

export interface DemandForecast {
  service: string;
  predictions: {
    date: string;
    expectedBookings: number;
    confidenceScore: number;
    demandLevel: 'low' | 'medium' | 'high' | 'peak';
  }[];
  optimalPricing: {
    basePrice: number;
    dynamicPricing: {
      date: string;
      recommendedPrice: number;
      demandMultiplier: number;
    }[];
  };
  resourceRequirements: {
    date: string;
    requiredStaff: number;
    utilization: number;
  }[];
}

export interface PricingOptimization {
  service: string;
  currentPrice: number;
  recommendations: {
    scenario: string;
    recommendedPrice: number;
    expectedDemandChange: number;
    expectedRevenueChange: number;
    priceElasticity: number;
    optimalityScore: number; // 0-100
  }[];
  priceHistory: {
    date: string;
    price: number;
    demand: number;
    revenue: number;
  }[];
  competitiveAnalysis: {
    marketPosition: number; // percentile
    priceAdvantage: number;
    differentiationScore: number;
  };
}

export interface SchedulingOptimization {
  recommendations: {
    date: string;
    timeSlot: string;
    recommendedAction: 'block' | 'promote' | 'adjust_price' | 'staff_extra';
    reasoning: string;
    expectedImpact: number;
  }[];
  staffOptimization: {
    staffMember: string;
    currentUtilization: number;
    optimalSchedule: {
      day: string;
      hours: { start: string; end: string }[];
      expectedRevenue: number;
    }[];
  }[];
  capacityAnalysis: {
    currentCapacity: number;
    optimalCapacity: number;
    bottlenecks: string[];
    expansionOpportunities: string[];
  };
}

export interface SeasonalTrends {
  patterns: {
    name: string;
    type: 'weekly' | 'monthly' | 'seasonal' | 'holiday';
    impact: number; // multiplier
    confidence: number; // 0-100
    duration: { start: string; end: string };
    description: string;
  }[];
  predictions: {
    period: string;
    expectedChange: number;
    recommendations: string[];
  }[];
  businessCycles: {
    cycle: string;
    length: number; // days
    amplitude: number;
    nextPeak: string;
    nextTrough: string;
  }[];
}

export class PredictiveAnalyticsEngine {
  private appointments: any[];
  private clients: any[];
  private services: any[];
  private historicalData: any[];

  constructor(
    appointments: any[],
    clients: any[],
    services: any[],
    historicalData: any[] = []
  ) {
    this.appointments = appointments;
    this.clients = clients;
    this.services = services;
    this.historicalData = historicalData;
  }

  // Client Churn Prediction using ML-inspired algorithms
  public predictClientChurn(): ChurnPrediction[] {
    return this.clients.map(client => {
      const clientAppointments = this.appointments.filter(apt => apt.clientId === client.id);
      const churnRisk = this.calculateChurnRisk(client, clientAppointments);
      const riskLevel = this.getRiskLevel(churnRisk);
      const factors = this.getChurnFactors(client, clientAppointments);
      const timeToChurn = this.estimateTimeToChurn(churnRisk, clientAppointments);

      return {
        clientId: client.id,
        clientName: client.name || 'Unknown Client',
        churnRisk,
        riskLevel,
        factors,
        recommendedActions: this.getRetentionActions(riskLevel, factors),
        timeToChurn,
        retentionStrategies: this.getRetentionStrategies(riskLevel, client)
      };
    });
  }

  // Advanced Revenue Forecasting
  public forecastRevenue(period: 'daily' | 'weekly' | 'monthly' = 'monthly', periods: number = 12): RevenueForecast {
    const historicalRevenue = this.getHistoricalRevenue(period, 24); // Get 24 periods of historical data
    const seasonalPatterns = this.identifySeasonalPatterns(historicalRevenue);
    const trendAnalysis = this.analyzeTrend(historicalRevenue);
    
    const predictions = this.generateRevenuePredictions(
      historicalRevenue,
      trendAnalysis,
      seasonalPatterns,
      period,
      periods
    );

    const totalForecast = predictions.reduce((sum, p) => sum + p.predictedRevenue, 0);
    const currentPeriodRevenue = historicalRevenue.slice(0, Math.min(periods, historicalRevenue.length))
      .reduce((sum, r) => sum + r.revenue, 0);
    const growthProjection = currentPeriodRevenue > 0 
      ? ((totalForecast - currentPeriodRevenue) / currentPeriodRevenue) * 100 
      : 0;

    return {
      period,
      predictions,
      totalForecast,
      growthProjection,
      seasonalPatterns: seasonalPatterns.map(pattern => ({
        pattern: pattern.name,
        impact: pattern.impact,
        timing: pattern.timing
      }))
    };
  }

  // Service Demand Forecasting
  public forecastDemand(service: string, days: number = 30): DemandForecast {
    const serviceAppointments = this.appointments.filter(apt => 
      apt.services?.some((s: any) => s.name === service)
    );

    const historicalDemand = this.getHistoricalDemand(service, 90);
    const predictions = this.generateDemandPredictions(historicalDemand, days);
    const serviceData = this.services.find(s => s.name === service);
    const basePrice = serviceData?.price || 0;

    return {
      service,
      predictions,
      optimalPricing: {
        basePrice,
        dynamicPricing: predictions.map(p => ({
          date: p.date,
          recommendedPrice: this.calculateDynamicPrice(basePrice, p.demandLevel),
          demandMultiplier: this.getDemandMultiplier(p.demandLevel)
        }))
      },
      resourceRequirements: predictions.map(p => ({
        date: p.date,
        requiredStaff: Math.ceil(p.expectedBookings / 8), // Assuming 8 appointments per staff per day
        utilization: Math.min(p.expectedBookings / 8, 1) * 100
      }))
    };
  }

  // Price Optimization Analysis
  public optimizePricing(service: string): PricingOptimization {
    const serviceData = this.services.find(s => s.name === service);
    const currentPrice = serviceData?.price || 0;
    const serviceAppointments = this.appointments.filter(apt => 
      apt.services?.some((s: any) => s.name === service)
    );

    const priceHistory = this.getPriceHistory(service);
    const priceElasticity = this.calculatePriceElasticity(priceHistory);
    const recommendations = this.generatePricingRecommendations(currentPrice, priceElasticity, serviceAppointments);

    return {
      service,
      currentPrice,
      recommendations,
      priceHistory,
      competitiveAnalysis: {
        marketPosition: this.calculateMarketPosition(currentPrice, service),
        priceAdvantage: this.calculatePriceAdvantage(currentPrice, service),
        differentiationScore: this.calculateDifferentiationScore(service)
      }
    };
  }

  // Scheduling Optimization
  public optimizeScheduling(): SchedulingOptimization {
    const currentUtilization = this.calculateCurrentUtilization();
    const demandPatterns = this.analyzeDemandPatterns();
    const staffAnalysis = this.analyzeStaffPerformance();

    return {
      recommendations: this.generateSchedulingRecommendations(demandPatterns),
      staffOptimization: staffAnalysis.map(staff => ({
        staffMember: staff.name,
        currentUtilization: staff.utilization,
        optimalSchedule: this.generateOptimalSchedule(staff)
      })),
      capacityAnalysis: {
        currentCapacity: currentUtilization.total,
        optimalCapacity: currentUtilization.total * 1.2, // 20% improvement target
        bottlenecks: this.identifyBottlenecks(),
        expansionOpportunities: this.identifyExpansionOpportunities()
      }
    };
  }

  // Seasonal Trend Analysis
  public analyzeSeasonalTrends(): SeasonalTrends {
    const patterns = this.identifyAllSeasonalPatterns();
    const predictions = this.generateSeasonalPredictions();
    const businessCycles = this.identifyBusinessCycles();

    return {
      patterns,
      predictions,
      businessCycles
    };
  }

  // Private helper methods for churn prediction
  private calculateChurnRisk(client: any, appointments: any[]): number {
    if (appointments.length === 0) return 95; // No appointments = high churn risk

    const daysSinceLastAppointment = this.getDaysSinceLastAppointment(appointments);
    const appointmentFrequency = this.calculateAppointmentFrequency(appointments);
    const revenueDecline = this.calculateRevenueDecline(appointments);
    const engagementScore = this.calculateEngagementScore(appointments);

    // Weighted risk calculation
    const riskFactors = {
      recency: Math.min(daysSinceLastAppointment * 0.5, 40), // Up to 40 points
      frequency: Math.max(0, 30 - appointmentFrequency * 5), // Up to 30 points
      revenue: revenueDecline * 0.3, // Up to 30 points (if 100% decline)
      engagement: Math.max(0, 20 - engagementScore) // Up to 20 points
    };

    const totalRisk = Object.values(riskFactors).reduce((sum, risk) => sum + risk, 0);
    return Math.min(Math.max(totalRisk, 0), 100);
  }

  private getRiskLevel(churnRisk: number): 'low' | 'medium' | 'high' | 'critical' {
    if (churnRisk >= 80) return 'critical';
    if (churnRisk >= 60) return 'high';
    if (churnRisk >= 40) return 'medium';
    return 'low';
  }

  private getChurnFactors(client: any, appointments: any[]) {
    const factors = [];
    const daysSinceLastAppointment = this.getDaysSinceLastAppointment(appointments);
    const appointmentFrequency = this.calculateAppointmentFrequency(appointments);

    if (daysSinceLastAppointment > 60) {
      factors.push({
        factor: 'Long absence',
        impact: Math.min(daysSinceLastAppointment, 100),
        description: `${daysSinceLastAppointment} days since last appointment`
      });
    }

    if (appointmentFrequency < 0.5) {
      factors.push({
        factor: 'Low frequency',
        impact: 70,
        description: 'Less than 0.5 appointments per month'
      });
    }

    if (appointments.length > 0) {
      const recentCancellations = appointments.filter(apt => 
        apt.status === 'cancelled' && 
        new Date(apt.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      ).length;

      if (recentCancellations > 2) {
        factors.push({
          factor: 'Frequent cancellations',
          impact: recentCancellations * 15,
          description: `${recentCancellations} cancellations in last 90 days`
        });
      }
    }

    return factors;
  }

  private getRetentionActions(riskLevel: string, factors: any[]): string[] {
    const actions = [];

    switch (riskLevel) {
      case 'critical':
        actions.push('Immediate personal outreach call');
        actions.push('Offer significant discount on next visit');
        actions.push('Send personalized win-back campaign');
        break;
      case 'high':
        actions.push('Send targeted retention email');
        actions.push('Offer loyalty program enrollment');
        actions.push('Schedule follow-up reminder');
        break;
      case 'medium':
        actions.push('Send general check-in message');
        actions.push('Invite to special events');
        actions.push('Share relevant content');
        break;
      default:
        actions.push('Maintain regular communication');
        actions.push('Continue excellent service');
    }

    return actions;
  }

  private getRetentionStrategies(riskLevel: string, client: any) {
    const strategies = [];

    if (riskLevel === 'critical' || riskLevel === 'high') {
      strategies.push({
        strategy: 'Personal consultation call',
        effectiveness: 85,
        cost: 0,
        timeframe: '1-2 days'
      });

      strategies.push({
        strategy: 'Discount incentive (20-30%)',
        effectiveness: 70,
        cost: 25,
        timeframe: '1 week'
      });
    }

    strategies.push({
      strategy: 'Loyalty program enrollment',
      effectiveness: 60,
      cost: 10,
      timeframe: '2-4 weeks'
    });

    strategies.push({
      strategy: 'Referral bonus program',
      effectiveness: 55,
      cost: 15,
      timeframe: '4-8 weeks'
    });

    return strategies;
  }

  private estimateTimeToChurn(churnRisk: number, appointments: any[]): number {
    if (appointments.length === 0) return 7; // Immediate risk

    const avgDaysBetweenAppointments = this.calculateAverageDaysBetweenAppointments(appointments);
    const riskMultiplier = Math.max(0.1, (100 - churnRisk) / 100);

    return Math.max(7, Math.floor(avgDaysBetweenAppointments * riskMultiplier));
  }

  // Revenue forecasting helpers
  private getHistoricalRevenue(period: string, periods: number) {
    const revenue = [];
    const now = new Date();

    for (let i = 0; i < periods; i++) {
      let startDate: Date, endDate: Date;

      switch (period) {
        case 'daily':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i - 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          break;
        case 'weekly':
          startDate = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
          endDate = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
          break;
        case 'monthly':
        default:
          startDate = new Date(now.getFullYear(), now.getMonth() - i - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          break;
      }

      const periodRevenue = this.appointments
        .filter(apt => {
          const aptDate = new Date(apt.date);
          return aptDate >= startDate && aptDate < endDate;
        })
        .reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);

      revenue.unshift({
        date: startDate.toISOString().split('T')[0],
        revenue: periodRevenue
      });
    }

    return revenue;
  }

  private identifySeasonalPatterns(historicalRevenue: any[]) {
    // Simplified seasonal pattern identification
    return [
      {
        name: 'Holiday Season',
        impact: 1.3,
        timing: 'November-December',
        confidence: 85
      },
      {
        name: 'Summer Peak',
        impact: 1.15,
        timing: 'June-August',
        confidence: 75
      },
      {
        name: 'Back to School',
        impact: 1.1,
        timing: 'August-September',
        confidence: 70
      }
    ];
  }

  private analyzeTrend(historicalRevenue: any[]) {
    if (historicalRevenue.length < 2) return { slope: 0, direction: 'stable' };

    const revenues = historicalRevenue.map(r => r.revenue);
    const n = revenues.length;
    const x = Array.from({ length: n }, (_, i) => i);
    
    // Simple linear regression for trend
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = revenues.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * revenues[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const direction = slope > 10 ? 'growing' : slope < -10 ? 'declining' : 'stable';

    return { slope, direction };
  }

  private generateRevenuePredictions(
    historicalRevenue: any[],
    trendAnalysis: any,
    seasonalPatterns: any[],
    period: string,
    periods: number
  ) {
    const predictions = [];
    const baseRevenue = historicalRevenue.length > 0 
      ? historicalRevenue.slice(-3).reduce((sum, r) => sum + r.revenue, 0) / 3 
      : 0;

    for (let i = 1; i <= periods; i++) {
      const futureDate = this.getFutureDate(period, i);
      const trendComponent = baseRevenue + (trendAnalysis.slope * i);
      const seasonalMultiplier = this.getSeasonalMultiplier(futureDate, seasonalPatterns);
      
      const predictedRevenue = Math.max(0, trendComponent * seasonalMultiplier);
      const confidence = Math.max(50, 90 - (i * 2)); // Confidence decreases over time

      predictions.push({
        date: futureDate,
        predictedRevenue,
        confidenceInterval: {
          lower: predictedRevenue * (1 - (100 - confidence) / 200),
          upper: predictedRevenue * (1 + (100 - confidence) / 200)
        },
        factors: {
          seasonal: seasonalMultiplier,
          trend: trendAnalysis.slope,
          cyclical: 1.0,
          irregular: 1.0
        }
      });
    }

    return predictions;
  }

  // Additional helper methods
  private getDaysSinceLastAppointment(appointments: any[]): number {
    if (appointments.length === 0) return 999;
    
    const lastAppointment = appointments.reduce((latest, apt) => {
      const aptDate = new Date(apt.date);
      const latestDate = new Date(latest.date);
      return aptDate > latestDate ? apt : latest;
    });

    return Math.floor((Date.now() - new Date(lastAppointment.date).getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateAppointmentFrequency(appointments: any[]): number {
    if (appointments.length < 2) return appointments.length;

    const sortedAppointments = appointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstDate = new Date(sortedAppointments[0].date);
    const lastDate = new Date(sortedAppointments[sortedAppointments.length - 1].date);
    const daysBetween = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
    const monthsBetween = daysBetween / 30;

    return monthsBetween > 0 ? appointments.length / monthsBetween : appointments.length;
  }

  private calculateRevenueDecline(appointments: any[]): number {
    if (appointments.length < 4) return 0;

    const sortedAppointments = appointments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentRevenue = sortedAppointments.slice(0, 2).reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
    const olderRevenue = sortedAppointments.slice(-2).reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);

    return olderRevenue > 0 ? Math.max(0, ((olderRevenue - recentRevenue) / olderRevenue) * 100) : 0;
  }

  private calculateEngagementScore(appointments: any[]): number {
    let score = 0;
    
    // Recent appointments boost score
    const recentAppointments = appointments.filter(apt => 
      new Date(apt.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    );
    score += recentAppointments.length * 5;

    // Completed appointments vs cancellations
    const completedRate = appointments.filter(apt => apt.status === 'completed').length / appointments.length;
    score += completedRate * 10;

    // Service variety
    const uniqueServices = new Set(
      appointments.flatMap(apt => apt.services?.map((s: any) => s.name) || [])
    ).size;
    score += uniqueServices * 2;

    return Math.min(score, 20);
  }

  private calculateAverageDaysBetweenAppointments(appointments: any[]): number {
    if (appointments.length < 2) return 30; // Default assumption

    const sortedAppointments = appointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const gaps = [];

    for (let i = 1; i < sortedAppointments.length; i++) {
      const gap = (new Date(sortedAppointments[i].date).getTime() - new Date(sortedAppointments[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }

    return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  }

  private getFutureDate(period: string, periodsAhead: number): string {
    const now = new Date();
    let futureDate: Date;

    switch (period) {
      case 'daily':
        futureDate = new Date(now.getTime() + periodsAhead * 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        futureDate = new Date(now.getTime() + periodsAhead * 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
      default:
        futureDate = new Date(now.getFullYear(), now.getMonth() + periodsAhead, now.getDate());
        break;
    }

    return futureDate.toISOString().split('T')[0];
  }

  private getSeasonalMultiplier(date: string, patterns: any[]): number {
    const month = new Date(date).getMonth();
    let multiplier = 1.0;

    patterns.forEach(pattern => {
      if (pattern.timing.includes('November') && (month === 10 || month === 11)) {
        multiplier *= pattern.impact;
      } else if (pattern.timing.includes('Summer') && (month >= 5 && month <= 7)) {
        multiplier *= pattern.impact;
      } else if (pattern.timing.includes('August') && month === 7) {
        multiplier *= pattern.impact;
      }
    });

    return multiplier;
  }

  // Placeholder methods for additional functionality
  private getHistoricalDemand(service: string, days: number) {
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      bookings: Math.floor(Math.random() * 10) + 1,
      revenue: Math.floor(Math.random() * 500) + 100
    })).reverse();
  }

  private generateDemandPredictions(historicalDemand: any[], days: number) {
    return Array.from({ length: days }, (_, i) => {
      const avgBookings = historicalDemand.slice(-7).reduce((sum, d) => sum + d.bookings, 0) / 7;
      const randomVariation = (Math.random() - 0.5) * 0.4; // ±20% variation
      const expectedBookings = Math.max(1, Math.floor(avgBookings * (1 + randomVariation)));
      
      return {
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expectedBookings,
        confidenceScore: Math.max(60, 90 - i),
        demandLevel: expectedBookings > avgBookings * 1.5 ? 'peak' as const :
                    expectedBookings > avgBookings * 1.2 ? 'high' as const :
                    expectedBookings > avgBookings * 0.8 ? 'medium' as const : 'low' as const
      };
    });
  }

  private calculateDynamicPrice(basePrice: number, demandLevel: string): number {
    const multipliers = {
      low: 0.9,
      medium: 1.0,
      high: 1.1,
      peak: 1.25
    };
    return Math.floor(basePrice * multipliers[demandLevel as keyof typeof multipliers]);
  }

  private getDemandMultiplier(demandLevel: string): number {
    const multipliers = {
      low: 0.9,
      medium: 1.0,
      high: 1.1,
      peak: 1.25
    };
    return multipliers[demandLevel as keyof typeof multipliers];
  }

  private getPriceHistory(service: string) {
    // Simplified price history - in real implementation, would come from database
    return Array.from({ length: 12 }, (_, i) => ({
      date: new Date(Date.now() - i * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: 50 + Math.floor(Math.random() * 20),
      demand: Math.floor(Math.random() * 30) + 10,
      revenue: (50 + Math.floor(Math.random() * 20)) * (Math.floor(Math.random() * 30) + 10)
    })).reverse();
  }

  private calculatePriceElasticity(priceHistory: any[]): number {
    // Simplified elasticity calculation
    if (priceHistory.length < 2) return -1.0;
    
    const priceChanges = [];
    const demandChanges = [];

    for (let i = 1; i < priceHistory.length; i++) {
      const priceChange = (priceHistory[i].price - priceHistory[i-1].price) / priceHistory[i-1].price;
      const demandChange = (priceHistory[i].demand - priceHistory[i-1].demand) / priceHistory[i-1].demand;
      
      if (priceChange !== 0) {
        priceChanges.push(priceChange);
        demandChanges.push(demandChange);
      }
    }

    if (priceChanges.length === 0) return -1.0;

    const avgPriceChange = priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length;
    const avgDemandChange = demandChanges.reduce((a, b) => a + b, 0) / demandChanges.length;

    return avgPriceChange !== 0 ? avgDemandChange / avgPriceChange : -1.0;
  }

  private generatePricingRecommendations(currentPrice: number, elasticity: number, appointments: any[]) {
    return [
      {
        scenario: 'Conservative increase',
        recommendedPrice: currentPrice * 1.05,
        expectedDemandChange: elasticity * 5,
        expectedRevenueChange: (currentPrice * 1.05 * (1 + elasticity * 0.05) - currentPrice) * appointments.length,
        priceElasticity: elasticity,
        optimalityScore: 75
      },
      {
        scenario: 'Moderate increase',
        recommendedPrice: currentPrice * 1.10,
        expectedDemandChange: elasticity * 10,
        expectedRevenueChange: (currentPrice * 1.10 * (1 + elasticity * 0.10) - currentPrice) * appointments.length,
        priceElasticity: elasticity,
        optimalityScore: 85
      },
      {
        scenario: 'Aggressive increase',
        recommendedPrice: currentPrice * 1.20,
        expectedDemandChange: elasticity * 20,
        expectedRevenueChange: (currentPrice * 1.20 * (1 + elasticity * 0.20) - currentPrice) * appointments.length,
        priceElasticity: elasticity,
        optimalityScore: 60
      }
    ];
  }

  // Additional placeholder methods for comprehensive functionality
  private calculateCurrentUtilization() {
    return { total: 75, byDay: [80, 70, 85, 90, 75, 60, 45] };
  }

  private analyzeDemandPatterns() {
    return Array.from({ length: 7 }, (_, i) => ({
      day: i,
      demand: Math.floor(Math.random() * 50) + 30,
      optimal: Math.floor(Math.random() * 60) + 40
    }));
  }

  private analyzeStaffPerformance() {
    return [
      { name: 'Staff Member 1', utilization: 80, revenue: 2500, efficiency: 85 },
      { name: 'Staff Member 2', utilization: 75, revenue: 2200, efficiency: 78 }
    ];
  }

  private generateSchedulingRecommendations(demandPatterns: any[]) {
    return demandPatterns.map((pattern, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      timeSlot: '2:00 PM - 3:00 PM',
      recommendedAction: pattern.demand > pattern.optimal ? 'staff_extra' as const : 'promote' as const,
      reasoning: pattern.demand > pattern.optimal ? 'High demand expected' : 'Promote to fill capacity',
      expectedImpact: Math.abs(pattern.demand - pattern.optimal) * 50
    }));
  }

  private generateOptimalSchedule(staff: any) {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map(day => ({
      day,
      hours: [{ start: '9:00 AM', end: '5:00 PM' }],
      expectedRevenue: Math.floor(Math.random() * 500) + 300
    }));
  }

  private identifyBottlenecks(): string[] {
    return [
      'Peak hour staffing shortage',
      'Limited premium service availability',
      'Booking system capacity during busy periods'
    ];
  }

  private identifyExpansionOpportunities(): string[] {
    return [
      'Additional staff during peak hours',
      'Extended weekend hours',
      'New premium service offerings',
      'Improved booking system capacity'
    ];
  }

  private identifyAllSeasonalPatterns() {
    return [
      {
        name: 'Weekend Peak',
        type: 'weekly' as const,
        impact: 1.4,
        confidence: 90,
        duration: { start: 'Friday', end: 'Sunday' },
        description: 'Higher demand on weekends'
      },
      {
        name: 'Holiday Season',
        type: 'seasonal' as const,
        impact: 1.3,
        confidence: 85,
        duration: { start: '2024-11-01', end: '2024-12-31' },
        description: 'Increased bookings during holiday season'
      },
      {
        name: 'Back to School',
        type: 'seasonal' as const,
        impact: 1.15,
        confidence: 75,
        duration: { start: '2024-08-15', end: '2024-09-15' },
        description: 'Back to school grooming surge'
      }
    ];
  }

  private generateSeasonalPredictions() {
    return [
      {
        period: 'Next Month',
        expectedChange: 15,
        recommendations: ['Increase weekend staffing', 'Promote premium services']
      },
      {
        period: 'Next Quarter',
        expectedChange: 8,
        recommendations: ['Plan holiday promotions', 'Stock seasonal products']
      }
    ];
  }

  private identifyBusinessCycles() {
    return [
      {
        cycle: 'Weekly',
        length: 7,
        amplitude: 0.3,
        nextPeak: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nextTrough: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      },
      {
        cycle: 'Monthly',
        length: 30,
        amplitude: 0.2,
        nextPeak: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nextTrough: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    ];
  }

  private calculateMarketPosition(price: number, service: string): number {
    // Simplified market position calculation (percentile)
    const marketPrices = [30, 40, 45, 50, 55, 60, 70, 80, 90, 100]; // Sample market data
    const position = marketPrices.filter(p => p <= price).length / marketPrices.length * 100;
    return Math.min(Math.max(position, 0), 100);
  }

  private calculatePriceAdvantage(price: number, service: string): number {
    const averageMarketPrice = 55; // Simplified average
    return ((price - averageMarketPrice) / averageMarketPrice) * 100;
  }

  private calculateDifferentiationScore(service: string): number {
    // Simplified differentiation score based on service uniqueness
    const commonServices = ['haircut', 'beard trim', 'shampoo'];
    const premiumServices = ['hot towel', 'scalp massage', 'styling'];
    
    if (premiumServices.some(ps => service.toLowerCase().includes(ps))) return 85;
    if (commonServices.some(cs => service.toLowerCase().includes(cs))) return 45;
    return 65; // Default for other services
  }
}

// Export utility functions
export const calculateConfidenceInterval = (value: number, confidence: number): { lower: number; upper: number } => {
  const margin = value * ((100 - confidence) / 200);
  return {
    lower: Math.max(0, value - margin),
    upper: value + margin
  };
};

export const formatRiskLevel = (risk: number): string => {
  if (risk >= 80) return 'Critical';
  if (risk >= 60) return 'High';
  if (risk >= 40) return 'Medium';
  return 'Low';
};

export const formatTrendDirection = (slope: number): string => {
  if (slope > 10) return 'Strong Growth';
  if (slope > 0) return 'Growing';
  if (slope < -10) return 'Declining';
  if (slope < 0) return 'Slight Decline';
  return 'Stable';
};