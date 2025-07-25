// Revenue Analytics Engine for Six Figure Barber Business Intelligence
// Comprehensive revenue analysis and optimization for barbershop businesses

export interface ServiceProfitability {
  serviceId: string;
  serviceName: string;
  totalRevenue: number;
  totalBookings: number;
  averagePrice: number;
  profitMargin: number;
  directCosts: number;
  netProfit: number;
  popularityScore: number; // 0-100
  profitabilityScore: number; // 0-100
  growthRate: number; // percentage
  seasonalityFactor: number;
  recommendations: string[];
  competitivePosition: 'leading' | 'competitive' | 'lagging';
}

export interface RevenueByTime {
  period: string;
  revenue: number;
  bookings: number;
  averageTicket: number;
  growth: number;
  projectedRevenue: number;
  efficiency: number; // revenue per hour
  utilizationRate: number;
}

export interface ClientValueSegmentation {
  segment: 'high-value' | 'medium-value' | 'low-value' | 'churned';
  clientCount: number;
  totalRevenue: number;
  averageLifetimeValue: number;
  averageVisitValue: number;
  visitFrequency: number;
  retentionRate: number;
  growthOpportunity: number;
  revenueShare: number; // percentage of total revenue
  profitContribution: number;
  acquisitionCost: number;
  clientIds: string[];
}

export interface UpsellOpportunity {
  clientId: string;
  clientName: string;
  currentService: string;
  recommendedService: string;
  additionalRevenue: number;
  probability: number; // 0-100
  reasoning: string;
  bestApproachTime: string;
  seasonalRelevance: number;
  historicalPreferences: string[];
  crossSellPotential: {
    service: string;
    price: number;
    likelihood: number;
  }[];
}

export interface PaymentAnalysis {
  paymentMethods: {
    method: string;
    percentage: number;
    averageAmount: number;
    transactionCount: number;
    convenience: number;
    processingCost: number;
    clientPreference: number;
  }[];
  cardOnFileUsage: {
    enabled: number;
    adoption: number;
    revenueImpact: number;
    conversionRate: number;
  };
  subscriptionMetrics: {
    activeSubscriptions: number;
    monthlyRecurringRevenue: number;
    churnRate: number;
    lifetimeValue: number;
  };
  refundAnalysis: {
    refundRate: number;
    averageRefundAmount: number;
    commonReasons: string[];
    impactOnRevenue: number;
  };
}

export interface RevenueGoalTracking {
  currentProgress: {
    dailyRevenue: number;
    weeklyRevenue: number;
    monthlyRevenue: number;
    quarterlyRevenue: number;
    yearlyRevenue: number;
  };
  targets: {
    dailyTarget: number;
    weeklyTarget: number;
    monthlyTarget: number;
    quarterlyTarget: number;
    yearlyTarget: number;
    sixFigureProgress: number; // percentage to $100k
  };
  variance: {
    dailyVariance: number;
    weeklyVariance: number;
    monthlyVariance: number;
    quarterlyVariance: number;
    yearlyVariance: number;
  };
  projections: {
    projectedMonthlyRevenue: number;
    projectedQuarterlyRevenue: number;
    projectedYearlyRevenue: number;
    sixFigureTimeframe: number; // months to reach $100k annually
  };
  milestones: {
    milestone: string;
    target: number;
    current: number;
    progress: number;
    estimatedDate: string;
  }[];
}

export interface RevenueOptimizationInsights {
  opportunities: {
    type: 'pricing' | 'capacity' | 'upselling' | 'retention' | 'acquisition' | 'efficiency';
    title: string;
    description: string;
    potentialIncrease: number;
    difficulty: 'easy' | 'medium' | 'hard';
    timeframe: string;
    priority: number;
    steps: string[];
    expectedROI: number;
  }[];
  priceOptimization: {
    service: string;
    currentPrice: number;
    optimalPrice: number;
    demandElasticity: number;
    revenueImpact: number;
    implementationPlan: string[];
  }[];
  capacityOptimization: {
    currentUtilization: number;
    optimalUtilization: number;
    blockedTimeSlots: {
      day: string;
      timeSlot: string;
      reason: string;
      potentialRevenue: number;
    }[];
    staffingRecommendations: {
      period: string;
      currentStaff: number;
      recommendedStaff: number;
      additionalRevenue: number;
    }[];
  };
}

export class RevenueAnalyticsEngine {
  private appointments: any[];
  private clients: any[];
  private services: any[];
  private payments: any[];
  private goals: any;

  constructor(
    appointments: any[],
    clients: any[],
    services: any[],
    payments: any[] = [],
    goals: any = {}
  ) {
    this.appointments = appointments;
    this.clients = clients;
    this.services = services;
    this.payments = payments;
    this.goals = goals;
  }

  // Service Profitability Analysis
  public analyzeServiceProfitability(): ServiceProfitability[] {
    return this.services.map(service => {
      const serviceAppointments = this.appointments.filter(apt =>
        apt.services?.some((s: any) => s.name === service.name)
      );

      const totalRevenue = serviceAppointments.reduce((sum, apt) => {
        const serviceRevenue = apt.services?.find((s: any) => s.name === service.name)?.price || service.price || 0;
        return sum + serviceRevenue;
      }, 0);

      const totalBookings = serviceAppointments.length;
      const averagePrice = totalBookings > 0 ? totalRevenue / totalBookings : service.price || 0;
      
      // Estimate costs (simplified - in real implementation would be more detailed)
      const directCosts = totalRevenue * 0.3; // 30% cost estimate
      const netProfit = totalRevenue - directCosts;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Calculate scores
      const popularityScore = this.calculatePopularityScore(serviceAppointments, this.appointments);
      const profitabilityScore = this.calculateProfitabilityScore(netProfit, totalRevenue);
      const growthRate = this.calculateServiceGrowthRate(service.name);
      const seasonalityFactor = this.calculateSeasonalityFactor(service.name);

      return {
        serviceId: service.id || service.name,
        serviceName: service.name,
        totalRevenue,
        totalBookings,
        averagePrice,
        profitMargin,
        directCosts,
        netProfit,
        popularityScore,
        profitabilityScore,
        growthRate,
        seasonalityFactor,
        recommendations: this.generateServiceRecommendations(service, {
          popularityScore,
          profitabilityScore,
          growthRate,
          totalBookings
        }),
        competitivePosition: this.determineCompetitivePosition(popularityScore, profitabilityScore)
      };
    });
  }

  // Time-based Revenue Analysis
  public analyzeRevenueByTime(period: 'hourly' | 'daily' | 'weekly' | 'monthly' = 'daily', periods: number = 30): RevenueByTime[] {
    const timeData = [];
    const now = new Date();

    for (let i = 0; i < periods; i++) {
      const { startDate, endDate, periodLabel } = this.getPeriodBounds(period, i, now);
      
      const periodAppointments = this.appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= startDate && aptDate < endDate;
      });

      const revenue = periodAppointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
      const bookings = periodAppointments.length;
      const averageTicket = bookings > 0 ? revenue / bookings : 0;

      // Calculate growth compared to previous period
      const { startDate: prevStart, endDate: prevEnd } = this.getPeriodBounds(period, i + 1, now);
      const prevAppointments = this.appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= prevStart && aptDate < prevEnd;
      });
      const prevRevenue = prevAppointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
      const growth = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

      // Calculate efficiency metrics
      const workingHours = this.getWorkingHours(period);
      const efficiency = workingHours > 0 ? revenue / workingHours : 0;
      const utilizationRate = this.calculateUtilizationRate(periodAppointments, workingHours);

      // Project revenue based on trend
      const projectedRevenue = this.projectRevenue(revenue, growth);

      timeData.unshift({
        period: periodLabel,
        revenue,
        bookings,
        averageTicket,
        growth,
        projectedRevenue,
        efficiency,
        utilizationRate
      });
    }

    return timeData;
  }

  // Client Value Segmentation
  public analyzeClientValueSegmentation(): ClientValueSegmentation[] {
    const clientMetrics = this.clients.map(client => {
      const clientAppointments = this.appointments.filter(apt => apt.clientId === client.id);
      const totalRevenue = clientAppointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
      const visitCount = clientAppointments.length;
      const averageVisitValue = visitCount > 0 ? totalRevenue / visitCount : 0;
      const daysSinceFirst = this.getDaysSinceFirstVisit(clientAppointments);
      const visitFrequency = daysSinceFirst > 0 ? (visitCount / daysSinceFirst) * 30 : 0; // visits per month
      const daysSinceLastVisit = this.getDaysSinceLastVisit(clientAppointments);

      return {
        clientId: client.id,
        totalRevenue,
        visitCount,
        averageVisitValue,
        visitFrequency,
        daysSinceLastVisit,
        lifetimeValue: totalRevenue,
        acquisitionCost: this.estimateAcquisitionCost(client)
      };
    });

    // Define segments
    const segments: ClientValueSegmentation[] = [
      {
        segment: 'high-value',
        clientCount: 0,
        totalRevenue: 0,
        averageLifetimeValue: 0,
        averageVisitValue: 0,
        visitFrequency: 0,
        retentionRate: 0,
        growthOpportunity: 95,
        revenueShare: 0,
        profitContribution: 0,
        acquisitionCost: 0,
        clientIds: []
      },
      {
        segment: 'medium-value',
        clientCount: 0,
        totalRevenue: 0,
        averageLifetimeValue: 0,
        averageVisitValue: 0,
        visitFrequency: 0,
        retentionRate: 0,
        growthOpportunity: 70,
        revenueShare: 0,
        profitContribution: 0,
        acquisitionCost: 0,
        clientIds: []
      },
      {
        segment: 'low-value',
        clientCount: 0,
        totalRevenue: 0,
        averageLifetimeValue: 0,
        averageVisitValue: 0,
        visitFrequency: 0,
        retentionRate: 0,
        growthOpportunity: 45,
        revenueShare: 0,
        profitContribution: 0,
        acquisitionCost: 0,
        clientIds: []
      },
      {
        segment: 'churned',
        clientCount: 0,
        totalRevenue: 0,
        averageLifetimeValue: 0,
        averageVisitValue: 0,
        visitFrequency: 0,
        retentionRate: 0,
        growthOpportunity: 20,
        revenueShare: 0,
        profitContribution: 0,
        acquisitionCost: 0,
        clientIds: []
      }
    ];

    const totalRevenue = clientMetrics.reduce((sum, client) => sum + client.totalRevenue, 0);

    // Segment clients
    clientMetrics.forEach(client => {
      let segment: ClientValueSegmentation;
      
      if (client.daysSinceLastVisit > 90) {
        segment = segments.find(s => s.segment === 'churned')!;
      } else if (client.totalRevenue >= 500 && client.visitFrequency >= 1) {
        segment = segments.find(s => s.segment === 'high-value')!;
      } else if (client.totalRevenue >= 200 || client.visitFrequency >= 0.5) {
        segment = segments.find(s => s.segment === 'medium-value')!;
      } else {
        segment = segments.find(s => s.segment === 'low-value')!;
      }

      segment.clientIds.push(client.clientId);
      segment.clientCount++;
      segment.totalRevenue += client.totalRevenue;
      segment.acquisitionCost += client.acquisitionCost;
    });

    // Calculate segment metrics
    segments.forEach(segment => {
      if (segment.clientCount > 0) {
        segment.averageLifetimeValue = segment.totalRevenue / segment.clientCount;
        segment.revenueShare = totalRevenue > 0 ? (segment.totalRevenue / totalRevenue) * 100 : 0;
        segment.profitContribution = segment.totalRevenue * 0.7; // 70% profit margin assumption
        segment.acquisitionCost = segment.acquisitionCost / segment.clientCount;

        // Calculate segment-specific metrics
        const segmentClients = clientMetrics.filter(c => segment.clientIds.includes(c.clientId));
        segment.averageVisitValue = segmentClients.reduce((sum, c) => sum + c.averageVisitValue, 0) / segment.clientCount;
        segment.visitFrequency = segmentClients.reduce((sum, c) => sum + c.visitFrequency, 0) / segment.clientCount;
        
        // Calculate retention rate for active segments
        if (segment.segment !== 'churned') {
          const activeClients = segmentClients.filter(c => c.daysSinceLastVisit <= 60).length;
          segment.retentionRate = (activeClients / segment.clientCount) * 100;
        }
      }
    });

    return segments;
  }

  // Upselling Opportunity Analysis
  public identifyUpsellOpportunities(): UpsellOpportunity[] {
    const opportunities: UpsellOpportunity[] = [];

    this.clients.forEach(client => {
      const clientAppointments = this.appointments.filter(apt => apt.clientId === client.id);
      if (clientAppointments.length === 0) return;

      const recentAppointments = clientAppointments
        .filter(apt => new Date(apt.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (recentAppointments.length === 0) return;

      const lastAppointment = recentAppointments[0];
      const currentServices = lastAppointment.services?.map((s: any) => s.name) || [];
      const historicalServices = new Set(
        clientAppointments.flatMap(apt => apt.services?.map((s: any) => s.name) || [])
      );

      // Find upsell opportunities
      const upsellCandidates = this.findUpsellCandidates(currentServices, Array.from(historicalServices));

      upsellCandidates.forEach(candidate => {
        const probability = this.calculateUpsellProbability(client, candidate, clientAppointments);
        const additionalRevenue = this.services.find(s => s.name === candidate.service)?.price || 0;

        if (probability >= 30) { // Only include opportunities with decent probability
          opportunities.push({
            clientId: client.id,
            clientName: client.name || 'Unknown Client',
            currentService: currentServices.join(', '),
            recommendedService: candidate.service,
            additionalRevenue,
            probability,
            reasoning: candidate.reasoning,
            bestApproachTime: this.getBestApproachTime(clientAppointments),
            seasonalRelevance: this.calculateSeasonalRelevance(candidate.service),
            historicalPreferences: Array.from(historicalServices),
            crossSellPotential: this.identifyCrossSellPotential(candidate.service, client)
          });
        }
      });
    });

    return opportunities.sort((a, b) => 
      (b.probability * b.additionalRevenue) - (a.probability * a.additionalRevenue)
    );
  }

  // Payment Method Analysis
  public analyzePaymentMethods(): PaymentAnalysis {
    const paymentStats = new Map<string, { count: number; total: number }>();
    let totalTransactions = 0;
    let totalAmount = 0;

    // Process payment data
    this.appointments.forEach(apt => {
      if (apt.paymentMethod && apt.totalAmount) {
        const method = apt.paymentMethod;
        const amount = apt.totalAmount;
        
        if (!paymentStats.has(method)) {
          paymentStats.set(method, { count: 0, total: 0 });
        }
        
        const stats = paymentStats.get(method)!;
        stats.count++;
        stats.total += amount;
        
        totalTransactions++;
        totalAmount += amount;
      }
    });

    // Calculate payment method metrics
    const paymentMethods = Array.from(paymentStats.entries()).map(([method, stats]) => ({
      method,
      percentage: (stats.count / totalTransactions) * 100,
      averageAmount: stats.total / stats.count,
      transactionCount: stats.count,
      convenience: this.getPaymentConvenience(method),
      processingCost: this.getProcessingCost(method),
      clientPreference: this.getClientPreference(method)
    }));

    // Card on file analysis
    const cardOnFileAppointments = this.appointments.filter(apt => apt.cardOnFile === true);
    const cardOnFileUsage = {
      enabled: this.clients.filter(c => c.cardOnFile === true).length,
      adoption: this.clients.length > 0 ? (this.clients.filter(c => c.cardOnFile === true).length / this.clients.length) * 100 : 0,
      revenueImpact: cardOnFileAppointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0),
      conversionRate: this.calculateCardOnFileConversionRate()
    };

    // Subscription metrics (if applicable)
    const subscriptionMetrics = {
      activeSubscriptions: this.clients.filter(c => c.subscriptionActive === true).length,
      monthlyRecurringRevenue: this.calculateMRR(),
      churnRate: this.calculateSubscriptionChurnRate(),
      lifetimeValue: this.calculateSubscriptionLTV()
    };

    // Refund analysis
    const refunds = this.appointments.filter(apt => apt.status === 'refunded');
    const refundAnalysis = {
      refundRate: this.appointments.length > 0 ? (refunds.length / this.appointments.length) * 100 : 0,
      averageRefundAmount: refunds.length > 0 ? refunds.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0) / refunds.length : 0,
      commonReasons: this.getCommonRefundReasons(refunds),
      impactOnRevenue: refunds.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0)
    };

    return {
      paymentMethods,
      cardOnFileUsage,
      subscriptionMetrics,
      refundAnalysis
    };
  }

  // Revenue Goal Tracking
  public trackRevenueGoals(): RevenueGoalTracking {
    const now = new Date();
    const currentProgress = {
      dailyRevenue: this.getRevenueForPeriod('daily', 0),
      weeklyRevenue: this.getRevenueForPeriod('weekly', 0),
      monthlyRevenue: this.getRevenueForPeriod('monthly', 0),
      quarterlyRevenue: this.getRevenueForPeriod('quarterly', 0),
      yearlyRevenue: this.getRevenueForPeriod('yearly', 0)
    };

    // Set realistic targets based on Six Figure methodology
    const yearlyTarget = this.goals.yearlyTarget || 100000; // Six Figure goal
    const targets = {
      dailyTarget: yearlyTarget / 250, // 250 working days per year
      weeklyTarget: yearlyTarget / 50, // 50 working weeks per year
      monthlyTarget: yearlyTarget / 12,
      quarterlyTarget: yearlyTarget / 4,
      yearlyTarget,
      sixFigureProgress: (currentProgress.yearlyRevenue / 100000) * 100
    };

    // Calculate variances
    const variance = {
      dailyVariance: this.calculateVariance(currentProgress.dailyRevenue, targets.dailyTarget),
      weeklyVariance: this.calculateVariance(currentProgress.weeklyRevenue, targets.weeklyTarget),
      monthlyVariance: this.calculateVariance(currentProgress.monthlyRevenue, targets.monthlyTarget),
      quarterlyVariance: this.calculateVariance(currentProgress.quarterlyRevenue, targets.quarterlyTarget),
      yearlyVariance: this.calculateVariance(currentProgress.yearlyRevenue, targets.yearlyTarget)
    };

    // Calculate projections
    const monthlyGrowthRate = this.calculateGrowthRate('monthly');
    const projections = {
      projectedMonthlyRevenue: currentProgress.monthlyRevenue * (1 + monthlyGrowthRate / 100),
      projectedQuarterlyRevenue: currentProgress.quarterlyRevenue * (1 + monthlyGrowthRate / 100 * 3),
      projectedYearlyRevenue: currentProgress.yearlyRevenue + (currentProgress.monthlyRevenue * (1 + monthlyGrowthRate / 100) * 12),
      sixFigureTimeframe: this.calculateSixFigureTimeframe(currentProgress.monthlyRevenue, monthlyGrowthRate)
    };

    // Define milestones
    const milestones = [
      {
        milestone: 'Monthly $5K',
        target: 5000,
        current: currentProgress.monthlyRevenue,
        progress: Math.min((currentProgress.monthlyRevenue / 5000) * 100, 100),
        estimatedDate: this.estimateMilestoneDate(currentProgress.monthlyRevenue, 5000, monthlyGrowthRate)
      },
      {
        milestone: 'Monthly $8.33K (Six Figure Pace)',
        target: 8333,
        current: currentProgress.monthlyRevenue,
        progress: Math.min((currentProgress.monthlyRevenue / 8333) * 100, 100),
        estimatedDate: this.estimateMilestoneDate(currentProgress.monthlyRevenue, 8333, monthlyGrowthRate)
      },
      {
        milestone: 'Quarterly $25K',
        target: 25000,
        current: currentProgress.quarterlyRevenue,
        progress: Math.min((currentProgress.quarterlyRevenue / 25000) * 100, 100),
        estimatedDate: this.estimateMilestoneDate(currentProgress.quarterlyRevenue / 3, 25000 / 3, monthlyGrowthRate)
      },
      {
        milestone: 'Annual $100K (Six Figure)',
        target: 100000,
        current: currentProgress.yearlyRevenue,
        progress: Math.min((currentProgress.yearlyRevenue / 100000) * 100, 100),
        estimatedDate: this.estimateMilestoneDate(currentProgress.monthlyRevenue, 100000 / 12, monthlyGrowthRate)
      }
    ];

    return {
      currentProgress,
      targets,
      variance,
      projections,
      milestones
    };
  }

  // Revenue Optimization Insights
  public generateRevenueOptimizationInsights(): RevenueOptimizationInsights {
    const opportunities = this.identifyRevenueOpportunities();
    const priceOptimization = this.analyzePriceOptimization();
    const capacityOptimization = this.analyzeCapacityOptimization();

    return {
      opportunities,
      priceOptimization,
      capacityOptimization
    };
  }

  // Private helper methods
  private calculatePopularityScore(serviceAppointments: any[], allAppointments: any[]): number {
    const serviceBookings = serviceAppointments.length;
    const totalBookings = allAppointments.length;
    
    if (totalBookings === 0) return 0;
    
    const marketShare = (serviceBookings / totalBookings) * 100;
    return Math.min(marketShare * 2, 100); // Scale to 0-100, with 50% market share = 100 score
  }

  private calculateProfitabilityScore(netProfit: number, totalRevenue: number): number {
    if (totalRevenue === 0) return 0;
    
    const profitMargin = (netProfit / totalRevenue) * 100;
    return Math.min(Math.max(profitMargin * 1.5, 0), 100); // Scale profit margin to 0-100
  }

  private calculateServiceGrowthRate(serviceName: string): number {
    const now = new Date();
    const currentMonth = this.appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.getMonth() === now.getMonth() && 
             aptDate.getFullYear() === now.getFullYear() &&
             apt.services?.some((s: any) => s.name === serviceName);
    }).length;

    const lastMonth = this.appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return aptDate.getMonth() === lastMonthDate.getMonth() && 
             aptDate.getFullYear() === lastMonthDate.getFullYear() &&
             apt.services?.some((s: any) => s.name === serviceName);
    }).length;

    return lastMonth > 0 ? ((currentMonth - lastMonth) / lastMonth) * 100 : 0;
  }

  private calculateSeasonalityFactor(serviceName: string): number {
    // Simplified seasonality calculation
    // In real implementation, would analyze historical data across seasons
    const seasonalServices: Record<string, number> = {
      'beard trim': 1.2, // Higher in winter
      'hair styling': 1.3, // Higher before events/holidays
      'scalp treatment': 0.9, // Lower in summer
      'haircut': 1.0 // Consistent year-round
    };

    return seasonalServices[serviceName.toLowerCase()] || 1.0;
  }

  private generateServiceRecommendations(service: any, metrics: any): string[] {
    const recommendations = [];

    if (metrics.popularityScore < 30) {
      recommendations.push('Increase marketing and promotion for this service');
    }

    if (metrics.profitabilityScore < 50) {
      recommendations.push('Review pricing strategy and cost optimization');
    }

    if (metrics.growthRate < 0) {
      recommendations.push('Analyze declining demand and consider service improvements');
    } else if (metrics.growthRate > 20) {
      recommendations.push('Consider capacity expansion due to high growth');
    }

    if (metrics.totalBookings > 0 && metrics.popularityScore > 70) {
      recommendations.push('Leverage popularity for premium pricing opportunities');
    }

    return recommendations;
  }

  private determineCompetitivePosition(popularityScore: number, profitabilityScore: number): 'leading' | 'competitive' | 'lagging' {
    const combinedScore = (popularityScore + profitabilityScore) / 2;
    
    if (combinedScore >= 70) return 'leading';
    if (combinedScore >= 40) return 'competitive';
    return 'lagging';
  }

  private getPeriodBounds(period: string, periodsAgo: number, now: Date) {
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    switch (period) {
      case 'hourly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - periodsAgo - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - periodsAgo);
        periodLabel = startDate.toLocaleString('en-US', { hour: '2-digit', hour12: true });
        break;
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - periodsAgo - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - periodsAgo);
        periodLabel = startDate.toLocaleDateString();
        break;
      case 'weekly':
        const weekStart = now.getDate() - now.getDay() - (periodsAgo * 7);
        startDate = new Date(now.getFullYear(), now.getMonth(), weekStart - 7);
        endDate = new Date(now.getFullYear(), now.getMonth(), weekStart);
        periodLabel = `Week of ${startDate.toLocaleDateString()}`;
        break;
      case 'monthly':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - periodsAgo - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() - periodsAgo, 1);
        periodLabel = startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        break;
    }

    return { startDate, endDate, periodLabel };
  }

  private getWorkingHours(period: string): number {
    // Simplified working hours calculation
    const hoursPerDay = 8;
    const daysPerWeek = 6; // Assume barbershop works 6 days a week

    switch (period) {
      case 'hourly': return 1;
      case 'daily': return hoursPerDay;
      case 'weekly': return hoursPerDay * daysPerWeek;
      case 'monthly': return hoursPerDay * daysPerWeek * 4.33; // Average weeks per month
      default: return hoursPerDay;
    }
  }

  private calculateUtilizationRate(appointments: any[], workingHours: number): number {
    const bookedHours = appointments.length * 1; // Assume 1 hour per appointment
    return workingHours > 0 ? (bookedHours / workingHours) * 100 : 0;
  }

  private projectRevenue(currentRevenue: number, growthRate: number): number {
    return currentRevenue * (1 + growthRate / 100);
  }

  private getDaysSinceFirstVisit(appointments: any[]): number {
    if (appointments.length === 0) return 0;
    
    const firstAppointment = appointments.reduce((earliest, apt) => {
      const aptDate = new Date(apt.date);
      const earliestDate = new Date(earliest.date);
      return aptDate < earliestDate ? apt : earliest;
    });

    return Math.floor((Date.now() - new Date(firstAppointment.date).getTime()) / (1000 * 60 * 60 * 24));
  }

  private getDaysSinceLastVisit(appointments: any[]): number {
    if (appointments.length === 0) return 999;
    
    const lastAppointment = appointments.reduce((latest, apt) => {
      const aptDate = new Date(apt.date);
      const latestDate = new Date(latest.date);
      return aptDate > latestDate ? apt : latest;
    });

    return Math.floor((Date.now() - new Date(lastAppointment.date).getTime()) / (1000 * 60 * 60 * 24));
  }

  private estimateAcquisitionCost(client: any): number {
    // Simplified acquisition cost estimation
    // In real implementation, would factor in marketing spend, referral costs, etc.
    return 25; // $25 average acquisition cost
  }

  private findUpsellCandidates(currentServices: string[], historicalServices: string[]): any[] {
    const candidates = [];
    const allServices = this.services.map(s => s.name);

    // Look for services not currently booked but available
    const missingServices = allServices.filter(service => !currentServices.includes(service));

    // Common upsell combinations
    const upsellRules = [
      { base: 'haircut', upsell: 'beard trim', reasoning: 'Complete grooming package' },
      { base: 'haircut', upsell: 'shampoo', reasoning: 'Enhanced hair care experience' },
      { base: 'beard trim', upsell: 'mustache trim', reasoning: 'Complete facial hair grooming' },
      { base: 'haircut', upsell: 'styling', reasoning: 'Professional finished look' },
      { base: 'haircut', upsell: 'hot towel', reasoning: 'Luxury service upgrade' }
    ];

    currentServices.forEach(currentService => {
      const applicableRules = upsellRules.filter(rule => 
        currentService.toLowerCase().includes(rule.base.toLowerCase()) &&
        missingServices.some(ms => ms.toLowerCase().includes(rule.upsell.toLowerCase()))
      );

      applicableRules.forEach(rule => {
        const matchingService = missingServices.find(ms => 
          ms.toLowerCase().includes(rule.upsell.toLowerCase())
        );
        
        if (matchingService) {
          candidates.push({
            service: matchingService,
            reasoning: rule.reasoning
          });
        }
      });
    });

    return candidates;
  }

  private calculateUpsellProbability(client: any, candidate: any, appointments: any[]): number {
    let probability = 50; // Base probability

    // Historical service diversity increases probability
    const serviceVariety = new Set(appointments.flatMap(apt => apt.services?.map((s: any) => s.name) || [])).size;
    probability += Math.min(serviceVariety * 5, 20);

    // Recent visits increase probability
    const recentVisits = appointments.filter(apt => 
      new Date(apt.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    probability += Math.min(recentVisits * 10, 30);

    // High-value clients more likely to upsell
    const totalSpent = appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
    if (totalSpent > 500) probability += 15;
    else if (totalSpent > 200) probability += 10;

    return Math.min(Math.max(probability, 0), 100);
  }

  private getBestApproachTime(appointments: any[]): string {
    if (appointments.length === 0) return 'Next appointment';
    
    // Analyze appointment patterns to suggest best time
    const lastAppointment = appointments[appointments.length - 1];
    const daysSinceLastVisit = Math.floor((Date.now() - new Date(lastAppointment.date).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastVisit < 7) return 'During current visit';
    if (daysSinceLastVisit < 30) return 'Next scheduled appointment';
    return 'Re-engagement campaign';
  }

  private calculateSeasonalRelevance(service: string): number {
    const currentMonth = new Date().getMonth();
    const seasonalRelevance: Record<string, number[]> = {
      'beard trim': [8, 9, 10, 11, 0, 1], // Fall/Winter months
      'hair styling': [3, 4, 5, 10, 11], // Spring and pre-holiday
      'scalp treatment': [2, 3, 4, 5, 6, 7, 8], // Warmer months
    };

    const relevantMonths = seasonalRelevance[service.toLowerCase()] || [];
    return relevantMonths.includes(currentMonth) ? 85 : 45;
  }

  private identifyCrossSellPotential(service: string, client: any) {
    // Simplified cross-sell identification
    const crossSellMap: Record<string, { service: string; price: number; likelihood: number }[]> = {
      'beard trim': [
        { service: 'mustache trim', price: 15, likelihood: 70 },
        { service: 'beard oil', price: 25, likelihood: 50 }
      ],
      'haircut': [
        { service: 'shampoo', price: 10, likelihood: 60 },
        { service: 'styling', price: 20, likelihood: 45 }
      ]
    };

    return crossSellMap[service.toLowerCase()] || [];
  }

  // Payment method helper methods
  private getPaymentConvenience(method: string): number {
    const conveniences: Record<string, number> = {
      'card': 90,
      'cash': 60,
      'digital wallet': 95,
      'bank transfer': 70
    };
    return conveniences[method.toLowerCase()] || 75;
  }

  private getProcessingCost(method: string): number {
    const costs: Record<string, number> = {
      'card': 2.9,
      'cash': 0,
      'digital wallet': 2.7,
      'bank transfer': 1.5
    };
    return costs[method.toLowerCase()] || 2.5;
  }

  private getClientPreference(method: string): number {
    const preferences: Record<string, number> = {
      'card': 85,
      'cash': 40,
      'digital wallet': 75,
      'bank transfer': 30
    };
    return preferences[method.toLowerCase()] || 50;
  }

  private calculateCardOnFileConversionRate(): number {
    const totalClients = this.clients.length;
    const cardOnFileClients = this.clients.filter(c => c.cardOnFile === true).length;
    return totalClients > 0 ? (cardOnFileClients / totalClients) * 100 : 0;
  }

  private calculateMRR(): number {
    // Simplified MRR calculation
    return this.clients.filter(c => c.subscriptionActive === true).length * 50; // Assume $50/month average
  }

  private calculateSubscriptionChurnRate(): number {
    // Simplified churn rate calculation
    return 5; // 5% monthly churn rate assumption
  }

  private calculateSubscriptionLTV(): number {
    const avgSubscriptionValue = 50;
    const avgLifespanMonths = 20; // 20 month average lifespan
    return avgSubscriptionValue * avgLifespanMonths;
  }

  private getCommonRefundReasons(refunds: any[]): string[] {
    // In real implementation, would analyze actual refund reasons
    return [
      'Service dissatisfaction',
      'Scheduling conflicts',
      'Price concerns',
      'Technical issues'
    ];
  }

  private getRevenueForPeriod(period: string, periodsAgo: number): number {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - periodsAgo - 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - periodsAgo);
        break;
      case 'weekly':
        const weekStart = now.getDate() - now.getDay() - (periodsAgo * 7);
        startDate = new Date(now.getFullYear(), now.getMonth(), weekStart - 7);
        endDate = new Date(now.getFullYear(), now.getMonth(), weekStart);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - periodsAgo - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() - periodsAgo, 1);
        break;
      case 'quarterly':
        startDate = new Date(now.getFullYear(), now.getMonth() - (periodsAgo + 1) * 3, 1);
        endDate = new Date(now.getFullYear(), now.getMonth() - periodsAgo * 3, 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear() - periodsAgo - 1, 0, 1);
        endDate = new Date(now.getFullYear() - periodsAgo, 0, 1);
        break;
      default:
        return 0;
    }

    return this.appointments
      .filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate >= startDate && aptDate < endDate;
      })
      .reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
  }

  private calculateVariance(actual: number, target: number): number {
    return target > 0 ? ((actual - target) / target) * 100 : 0;
  }

  private calculateGrowthRate(period: string): number {
    const current = this.getRevenueForPeriod(period, 0);
    const previous = this.getRevenueForPeriod(period, 1);
    return previous > 0 ? ((current - previous) / previous) * 100 : 0;
  }

  private calculateSixFigureTimeframe(monthlyRevenue: number, growthRate: number): number {
    const targetMonthlyRevenue = 100000 / 12; // $8,333 per month
    
    if (monthlyRevenue >= targetMonthlyRevenue) return 0;
    if (growthRate <= 0) return 999; // Never at current rate
    
    // Calculate months needed with compound growth
    const monthsNeeded = Math.log(targetMonthlyRevenue / monthlyRevenue) / Math.log(1 + growthRate / 100);
    return Math.ceil(monthsNeeded);
  }

  private estimateMilestoneDate(currentValue: number, targetValue: number, growthRate: number): string {
    if (currentValue >= targetValue) return 'Achieved';
    if (growthRate <= 0) return 'N/A';
    
    const monthsNeeded = Math.log(targetValue / currentValue) / Math.log(1 + growthRate / 100);
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + Math.ceil(monthsNeeded));
    
    return targetDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  // Revenue optimization methods
  private identifyRevenueOpportunities() {
    return [
      {
        type: 'pricing' as const,
        title: 'Premium Service Pricing',
        description: 'Increase prices for high-demand services during peak hours',
        potentialIncrease: 3200,
        difficulty: 'medium' as const,
        timeframe: '2-4 weeks',
        priority: 1,
        steps: [
          'Analyze demand patterns for peak hours',
          'Test 10-15% price increase on premium services',
          'Monitor booking rate and adjust accordingly',
          'Implement dynamic pricing system'
        ],
        expectedROI: 150
      },
      {
        type: 'upselling' as const,
        title: 'Service Bundle Packages',
        description: 'Create attractive service bundles to increase average ticket',
        potentialIncrease: 2800,
        difficulty: 'easy' as const,
        timeframe: '1-2 weeks',
        priority: 2,
        steps: [
          'Design popular service combinations',
          'Create bundle pricing strategy',
          'Train staff on upselling techniques',
          'Track bundle conversion rates'
        ],
        expectedROI: 200
      },
      {
        type: 'capacity' as const,
        title: 'Extended Operating Hours',
        description: 'Add early morning and late evening slots for working professionals',
        potentialIncrease: 2400,
        difficulty: 'medium' as const,
        timeframe: '3-6 weeks',
        priority: 3,
        steps: [
          'Survey client preferences for extended hours',
          'Analyze demand for early/late appointments',
          'Adjust staff schedules',
          'Market new availability to professionals'
        ],
        expectedROI: 120
      },
      {
        type: 'retention' as const,
        title: 'Loyalty Program Implementation',
        description: 'Reduce churn and increase visit frequency with rewards program',
        potentialIncrease: 1800,
        difficulty: 'medium' as const,
        timeframe: '4-8 weeks',
        priority: 4,
        steps: [
          'Design loyalty program structure',
          'Implement tracking system',
          'Launch with existing high-value clients',
          'Monitor redemption rates and adjust rewards'
        ],
        expectedROI: 180
      }
    ];
  }

  private analyzePriceOptimization() {
    return this.services.map(service => {
      const serviceAppointments = this.appointments.filter(apt =>
        apt.services?.some((s: any) => s.name === service.name)
      );
      
      const currentPrice = service.price || 0;
      const demandLevel = serviceAppointments.length;
      const demandElasticity = this.calculateDemandElasticity(service.name);
      
      // Calculate optimal price based on demand elasticity
      const optimalPriceIncrease = demandLevel > 20 ? 0.15 : demandLevel > 10 ? 0.10 : 0.05;
      const optimalPrice = currentPrice * (1 + optimalPriceIncrease);
      const revenueImpact = (optimalPrice - currentPrice) * demandLevel * (1 + demandElasticity * optimalPriceIncrease);

      return {
        service: service.name,
        currentPrice,
        optimalPrice,
        demandElasticity,
        revenueImpact,
        implementationPlan: [
          'Test price increase with small client segment',
          'Monitor booking rate changes',
          'Adjust price based on demand response',
          'Implement gradually across all clients'
        ]
      };
    });
  }

  private analyzeCapacityOptimization() {
    const totalHours = 8 * 6 * 4; // 8 hours/day, 6 days/week, 4 weeks
    const bookedHours = this.appointments.length; // Simplified: 1 hour per appointment
    const currentUtilization = (bookedHours / totalHours) * 100;
    const optimalUtilization = 85; // Target 85% utilization

    return {
      currentUtilization,
      optimalUtilization,
      blockedTimeSlots: this.identifyBlockedTimeSlots(),
      staffingRecommendations: this.generateStaffingRecommendations()
    };
  }

  private calculateDemandElasticity(serviceName: string): number {
    // Simplified elasticity calculation
    const elasticityMap: Record<string, number> = {
      'haircut': -0.5, // Relatively inelastic
      'beard trim': -0.7,
      'premium services': -1.2, // More elastic
      'basic services': -0.3
    };

    return elasticityMap[serviceName.toLowerCase()] || -0.8;
  }

  private identifyBlockedTimeSlots() {
    // Simplified blocked time slot identification
    return [
      {
        day: 'Monday',
        timeSlot: '2:00 PM - 3:00 PM',
        reason: 'Historically low demand',
        potentialRevenue: 60
      },
      {
        day: 'Tuesday',
        timeSlot: '11:00 AM - 12:00 PM',
        reason: 'Staff break time conflict',
        potentialRevenue: 50
      }
    ];
  }

  private generateStaffingRecommendations() {
    return [
      {
        period: 'Weekend Peak Hours',
        currentStaff: 2,
        recommendedStaff: 3,
        additionalRevenue: 800
      },
      {
        period: 'Friday Evening',
        currentStaff: 1,
        recommendedStaff: 2,
        additionalRevenue: 400
      }
    ];
  }
}

// Export utility functions
export const formatRevenue = (amount: number, period?: string): string => {
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  return period ? `${formatted}/${period}` : formatted;
};

export const calculateRevenueGrowth = (current: number, previous: number): number => {
  return previous > 0 ? ((current - previous) / previous) * 100 : 0;
};

export const getRevenueHealthScore = (variance: number): { score: number; status: string; color: string } => {
  if (variance >= 10) return { score: 100, status: 'Excellent', color: 'green' };
  if (variance >= 0) return { score: 80, status: 'Good', color: 'blue' };
  if (variance >= -10) return { score: 60, status: 'Fair', color: 'yellow' };
  if (variance >= -25) return { score: 40, status: 'Poor', color: 'orange' };
  return { score: 20, status: 'Critical', color: 'red' };
};