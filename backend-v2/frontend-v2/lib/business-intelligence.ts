// Business Intelligence Suite for Six Figure Barber Analytics
// Comprehensive analytics engine for revenue optimization and business insights

export interface ClientSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    minRevenue?: number;
    maxRevenue?: number;
    minVisits?: number;
    maxVisits?: number;
    daysSinceLastVisit?: number;
    avgServiceValue?: number;
  };
  clients: string[];
  totalRevenue: number;
  avgLifetimeValue: number;
  churnRisk: 'low' | 'medium' | 'high';
  growthOpportunity: number; // 0-100 score
}

export interface RevenueOptimization {
  currentMonthlyRevenue: number;
  projectedMonthlyRevenue: number;
  optimizationOpportunities: {
    type: 'pricing' | 'upselling' | 'retention' | 'acquisition' | 'efficiency';
    description: string;
    potentialIncrease: number;
    difficulty: 'easy' | 'medium' | 'hard';
    timeframe: string;
    priority: number;
  }[];
  sixFigureProgress: {
    currentAnnualRevenue: number;
    targetRevenue: number;
    progressPercentage: number;
    monthsToTarget: number;
    requiredMonthlyGrowth: number;
  };
}

export interface MarketAnalysis {
  competitorInsights: {
    averagePricing: Record<string, number>;
    serviceGaps: string[];
    marketPosition: 'premium' | 'mid-market' | 'budget';
    differentiationOpportunities: string[];
  };
  demandPatterns: {
    peakHours: { hour: number; demand: number }[];
    peakDays: { day: string; demand: number }[];
    seasonalTrends: { month: string; multiplier: number }[];
    emergingServices: string[];
  };
  pricingRecommendations: {
    service: string;
    currentPrice: number;
    recommendedPrice: number;
    reasoning: string;
    expectedImpact: number;
  }[];
}

export interface BusinessMetrics {
  revenueMetrics: {
    totalRevenue: number;
    monthlyRevenue: number;
    averageTicket: number;
    revenuePerClient: number;
    revenueGrowthRate: number;
  };
  clientMetrics: {
    totalClients: number;
    activeClients: number;
    newClients: number;
    retentionRate: number;
    churnRate: number;
    lifetimeValue: number;
  };
  operationalMetrics: {
    utilizationRate: number;
    averageServiceTime: number;
    noShowRate: number;
    rebookingRate: number;
    staffProductivity: number;
  };
  profitabilityMetrics: {
    grossMargin: number;
    netProfit: number;
    costPerClient: number;
    returnOnInvestment: number;
  };
}

export class BusinessIntelligenceEngine {
  private appointments: any[];
  private clients: any[];
  private services: any[];
  private staff: any[];

  constructor(
    appointments: any[],
    clients: any[],
    services: any[],
    staff: any[] = []
  ) {
    this.appointments = appointments;
    this.clients = clients;
    this.services = services;
    this.staff = staff;
  }

  // Client Segmentation Analysis
  public analyzeClientSegments(): ClientSegment[] {
    const segments: ClientSegment[] = [
      {
        id: 'vip',
        name: 'VIP Clients',
        description: 'High-value clients with frequent visits',
        criteria: { minRevenue: 500, minVisits: 8 },
        clients: [],
        totalRevenue: 0,
        avgLifetimeValue: 0,
        churnRisk: 'low',
        growthOpportunity: 85
      },
      {
        id: 'loyal',
        name: 'Loyal Regulars',
        description: 'Consistent clients with good frequency',
        criteria: { minRevenue: 200, maxRevenue: 499, minVisits: 4 },
        clients: [],
        totalRevenue: 0,
        avgLifetimeValue: 0,
        churnRisk: 'low',
        growthOpportunity: 70
      },
      {
        id: 'occasional',
        name: 'Occasional Visitors',
        description: 'Irregular clients with growth potential',
        criteria: { minRevenue: 50, maxRevenue: 199, maxVisits: 3 },
        clients: [],
        totalRevenue: 0,
        avgLifetimeValue: 0,
        churnRisk: 'medium',
        growthOpportunity: 60
      },
      {
        id: 'at-risk',
        name: 'At-Risk Clients',
        description: 'Clients showing signs of churn',
        criteria: { daysSinceLastVisit: 60 },
        clients: [],
        totalRevenue: 0,
        avgLifetimeValue: 0,
        churnRisk: 'high',
        growthOpportunity: 40
      },
      {
        id: 'new',
        name: 'New Clients',
        description: 'Recently acquired clients',
        criteria: { maxVisits: 2 },
        clients: [],
        totalRevenue: 0,
        avgLifetimeValue: 0,
        churnRisk: 'medium',
        growthOpportunity: 90
      }
    ];

    // Calculate client metrics for segmentation
    const clientMetrics = this.clients.map(client => {
      const clientAppointments = this.appointments.filter(apt => apt.clientId === client.id);
      const totalRevenue = clientAppointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
      const visitCount = clientAppointments.length;
      const lastVisit = clientAppointments.length > 0 
        ? Math.max(...clientAppointments.map(apt => new Date(apt.date).getTime()))
        : 0;
      const daysSinceLastVisit = lastVisit > 0 
        ? Math.floor((Date.now() - lastVisit) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        clientId: client.id,
        totalRevenue,
        visitCount,
        daysSinceLastVisit,
        avgServiceValue: visitCount > 0 ? totalRevenue / visitCount : 0
      };
    });

    // Assign clients to segments
    segments.forEach(segment => {
      const matchingClients = clientMetrics.filter(metrics => {
        const { criteria } = segment;
        return (
          (!criteria.minRevenue || metrics.totalRevenue >= criteria.minRevenue) &&
          (!criteria.maxRevenue || metrics.totalRevenue <= criteria.maxRevenue) &&
          (!criteria.minVisits || metrics.visitCount >= criteria.minVisits) &&
          (!criteria.maxVisits || metrics.visitCount <= criteria.maxVisits) &&
          (!criteria.daysSinceLastVisit || metrics.daysSinceLastVisit >= criteria.daysSinceLastVisit) &&
          (!criteria.avgServiceValue || metrics.avgServiceValue >= criteria.avgServiceValue)
        );
      });

      segment.clients = matchingClients.map(m => m.clientId);
      segment.totalRevenue = matchingClients.reduce((sum, m) => sum + m.totalRevenue, 0);
      segment.avgLifetimeValue = matchingClients.length > 0 
        ? segment.totalRevenue / matchingClients.length 
        : 0;
    });

    return segments;
  }

  // Revenue Optimization Analysis
  public generateRevenueOptimization(): RevenueOptimization {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    // Calculate current monthly revenue
    const currentMonthRevenue = this.appointments
      .filter(apt => {
        const aptDate = new Date(apt.date);
        return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
      })
      .reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);

    // Calculate historical average for projection
    const historicalMonths = 6;
    const historicalRevenue = this.calculateHistoricalRevenue(historicalMonths);
    const averageMonthlyRevenue = historicalRevenue.reduce((sum, rev) => sum + rev, 0) / historicalRevenue.length;

    // Generate optimization opportunities
    const opportunities = this.identifyOptimizationOpportunities();

    // Calculate Six Figure progress
    const annualRevenue = averageMonthlyRevenue * 12;
    const sixFigureTarget = 100000;
    const progressPercentage = Math.min((annualRevenue / sixFigureTarget) * 100, 100);
    const monthsToTarget = annualRevenue > 0 
      ? Math.max(0, (sixFigureTarget - annualRevenue) / averageMonthlyRevenue)
      : 999;

    return {
      currentMonthlyRevenue: currentMonthRevenue,
      projectedMonthlyRevenue: averageMonthlyRevenue * 1.15, // 15% growth projection
      optimizationOpportunities: opportunities,
      sixFigureProgress: {
        currentAnnualRevenue: annualRevenue,
        targetRevenue: sixFigureTarget,
        progressPercentage,
        monthsToTarget,
        requiredMonthlyGrowth: monthsToTarget > 0 ? (sixFigureTarget / 12 - averageMonthlyRevenue) : 0
      }
    };
  }

  // Market Analysis and Competitive Intelligence
  public performMarketAnalysis(): MarketAnalysis {
    // Analyze service pricing patterns
    const servicePricing = this.services.reduce((acc, service) => {
      acc[service.name] = service.price || 0;
      return acc;
    }, {} as Record<string, number>);

    // Identify demand patterns
    const hourlyDemand = this.calculateHourlyDemand();
    const dailyDemand = this.calculateDailyDemand();
    const seasonalTrends = this.calculateSeasonalTrends();

    // Generate pricing recommendations
    const pricingRecommendations = this.generatePricingRecommendations();

    return {
      competitorInsights: {
        averagePricing: servicePricing,
        serviceGaps: this.identifyServiceGaps(),
        marketPosition: this.determineMarketPosition(),
        differentiationOpportunities: this.identifyDifferentiationOpportunities()
      },
      demandPatterns: {
        peakHours: hourlyDemand,
        peakDays: dailyDemand,
        seasonalTrends,
        emergingServices: this.identifyEmergingServices()
      },
      pricingRecommendations
    };
  }

  // Comprehensive Business Metrics
  public calculateBusinessMetrics(): BusinessMetrics {
    const totalRevenue = this.appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
    const totalAppointments = this.appointments.length;
    const uniqueClients = new Set(this.appointments.map(apt => apt.clientId)).size;

    // Calculate time-based metrics
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentAppointments = this.appointments.filter(apt => new Date(apt.date) >= thirtyDaysAgo);
    const monthlyRevenue = recentAppointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);

    // Client metrics
    const activeClients = new Set(recentAppointments.map(apt => apt.clientId)).size;
    const newClients = this.calculateNewClientsCount(thirtyDaysAgo);
    const retentionRate = this.calculateRetentionRate();
    const churnRate = 100 - retentionRate;
    const lifetimeValue = uniqueClients > 0 ? totalRevenue / uniqueClients : 0;

    // Operational metrics
    const utilizationRate = this.calculateUtilizationRate();
    const averageServiceTime = this.calculateAverageServiceTime();
    const noShowRate = this.calculateNoShowRate();
    const rebookingRate = this.calculateRebookingRate();

    return {
      revenueMetrics: {
        totalRevenue,
        monthlyRevenue,
        averageTicket: totalAppointments > 0 ? totalRevenue / totalAppointments : 0,
        revenuePerClient: uniqueClients > 0 ? totalRevenue / uniqueClients : 0,
        revenueGrowthRate: this.calculateRevenueGrowthRate()
      },
      clientMetrics: {
        totalClients: this.clients.length,
        activeClients,
        newClients,
        retentionRate,
        churnRate,
        lifetimeValue
      },
      operationalMetrics: {
        utilizationRate,
        averageServiceTime,
        noShowRate,
        rebookingRate,
        staffProductivity: this.calculateStaffProductivity()
      },
      profitabilityMetrics: {
        grossMargin: this.calculateGrossMargin(),
        netProfit: this.calculateNetProfit(),
        costPerClient: this.calculateCostPerClient(),
        returnOnInvestment: this.calculateROI()
      }
    };
  }

  // Private helper methods
  private calculateHistoricalRevenue(months: number): number[] {
    const revenues = [];
    const currentDate = new Date();

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthRevenue = this.appointments
        .filter(apt => {
          const aptDate = new Date(apt.date);
          return aptDate.getMonth() === targetDate.getMonth() && 
                 aptDate.getFullYear() === targetDate.getFullYear();
        })
        .reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
      
      revenues.push(monthRevenue);
    }

    return revenues;
  }

  private identifyOptimizationOpportunities() {
    return [
      {
        type: 'pricing' as const,
        description: 'Optimize premium service pricing based on demand',
        potentialIncrease: 2500,
        difficulty: 'medium' as const,
        timeframe: '2-4 weeks',
        priority: 1
      },
      {
        type: 'upselling' as const,
        description: 'Implement add-on services for existing appointments',
        potentialIncrease: 1800,
        difficulty: 'easy' as const,
        timeframe: '1-2 weeks',
        priority: 2
      },
      {
        type: 'retention' as const,
        description: 'Reduce client churn with loyalty program',
        potentialIncrease: 3200,
        difficulty: 'medium' as const,
        timeframe: '4-8 weeks',
        priority: 3
      },
      {
        type: 'efficiency' as const,
        description: 'Optimize scheduling to reduce gaps and maximize bookings',
        potentialIncrease: 1500,
        difficulty: 'easy' as const,
        timeframe: '1 week',
        priority: 4
      },
      {
        type: 'acquisition' as const,
        description: 'Launch referral program to acquire new clients',
        potentialIncrease: 2000,
        difficulty: 'hard' as const,
        timeframe: '6-12 weeks',
        priority: 5
      }
    ];
  }

  private calculateHourlyDemand() {
    const hourlyCount = new Array(24).fill(0);
    
    this.appointments.forEach(apt => {
      const hour = new Date(apt.date).getHours();
      hourlyCount[hour]++;
    });

    return hourlyCount.map((count, hour) => ({ hour, demand: count }))
      .filter(item => item.demand > 0)
      .sort((a, b) => b.demand - a.demand);
  }

  private calculateDailyDemand() {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyCount: Record<string, number> = {};

    dayNames.forEach(day => dailyCount[day] = 0);

    this.appointments.forEach(apt => {
      const day = dayNames[new Date(apt.date).getDay()];
      dailyCount[day]++;
    });

    return Object.entries(dailyCount)
      .map(([day, demand]) => ({ day, demand }))
      .sort((a, b) => b.demand - a.demand);
  }

  private calculateSeasonalTrends() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyCount: Record<string, number> = {};

    monthNames.forEach(month => monthlyCount[month] = 0);

    this.appointments.forEach(apt => {
      const month = monthNames[new Date(apt.date).getMonth()];
      monthlyCount[month]++;
    });

    const avgDemand = Object.values(monthlyCount).reduce((a, b) => a + b, 0) / 12;

    return Object.entries(monthlyCount)
      .map(([month, count]) => ({ 
        month, 
        multiplier: avgDemand > 0 ? count / avgDemand : 1 
      }));
  }

  private generatePricingRecommendations() {
    return this.services.map(service => {
      const serviceAppointments = this.appointments.filter(apt => 
        apt.services?.some((s: any) => s.name === service.name)
      );
      
      const demandScore = serviceAppointments.length;
      const currentPrice = service.price || 0;
      const recommendedIncrease = demandScore > 20 ? 0.15 : demandScore > 10 ? 0.1 : 0;
      const recommendedPrice = currentPrice * (1 + recommendedIncrease);

      return {
        service: service.name,
        currentPrice,
        recommendedPrice,
        reasoning: demandScore > 20 ? 'High demand allows premium pricing' : 
                  demandScore > 10 ? 'Moderate demand supports price increase' : 
                  'Stable pricing recommended',
        expectedImpact: (recommendedPrice - currentPrice) * demandScore
      };
    });
  }

  private identifyServiceGaps(): string[] {
    // Analyze market gaps based on appointment data and industry trends
    return [
      'Beard styling specialist services',
      'Premium hair treatment packages',
      'Mobile barber services',
      'Corporate group bookings',
      'Wedding/event styling'
    ];
  }

  private determineMarketPosition(): 'premium' | 'mid-market' | 'budget' {
    const avgPrice = this.services.reduce((sum, service) => sum + (service.price || 0), 0) / this.services.length;
    
    if (avgPrice > 75) return 'premium';
    if (avgPrice > 35) return 'mid-market';
    return 'budget';
  }

  private identifyDifferentiationOpportunities(): string[] {
    return [
      'Personalized grooming consultations',
      'Exclusive member-only services',
      'Advanced booking technology',
      'Luxury experience amenities',
      'Expert specialization certifications'
    ];
  }

  private identifyEmergingServices(): string[] {
    return [
      'Scalp treatment therapy',
      'Eyebrow grooming',
      'Hot towel premium service',
      'Hair washing add-on',
      'Styling product consultation'
    ];
  }

  private calculateNewClientsCount(sinceDate: Date): number {
    return this.clients.filter(client => 
      new Date(client.createdAt || Date.now()) >= sinceDate
    ).length;
  }

  private calculateRetentionRate(): number {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const oldClients = new Set(
      this.appointments
        .filter(apt => new Date(apt.date) <= sixtyDaysAgo && new Date(apt.date) >= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000))
        .map(apt => apt.clientId)
    );
    
    const returningClients = new Set(
      this.appointments
        .filter(apt => new Date(apt.date) >= thirtyDaysAgo)
        .map(apt => apt.clientId)
        .filter(clientId => oldClients.has(clientId))
    );

    return oldClients.size > 0 ? (returningClients.size / oldClients.size) * 100 : 0;
  }

  private calculateUtilizationRate(): number {
    // Simplified utilization calculation - assumes 8-hour work days
    const workingHoursPerDay = 8;
    const workingDaysPerMonth = 22;
    const totalWorkingHours = workingHoursPerMonth * workingDaysPerMonth;
    
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentAppointments = this.appointments.filter(apt => new Date(apt.date) >= thirtyDaysAgo);
    const bookedHours = recentAppointments.length * 1; // Assume 1 hour per appointment

    return (bookedHours / totalWorkingHours) * 100;
  }

  private calculateAverageServiceTime(): number {
    // Return average service time in minutes (simplified to 60 minutes)
    return 60;
  }

  private calculateNoShowRate(): number {
    const totalAppointments = this.appointments.length;
    const noShows = this.appointments.filter(apt => apt.status === 'no-show').length;
    return totalAppointments > 0 ? (noShows / totalAppointments) * 100 : 0;
  }

  private calculateRebookingRate(): number {
    const clientBookingCounts = new Map<string, number>();
    
    this.appointments.forEach(apt => {
      const count = clientBookingCounts.get(apt.clientId) || 0;
      clientBookingCounts.set(apt.clientId, count + 1);
    });

    const returningClients = Array.from(clientBookingCounts.values()).filter(count => count > 1).length;
    const totalClients = clientBookingCounts.size;

    return totalClients > 0 ? (returningClients / totalClients) * 100 : 0;
  }

  private calculateRevenueGrowthRate(): number {
    const historicalRevenue = this.calculateHistoricalRevenue(6);
    if (historicalRevenue.length < 2) return 0;

    const currentRevenue = historicalRevenue[0];
    const previousRevenue = historicalRevenue[1];

    return previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0;
  }

  private calculateStaffProductivity(): number {
    const staffCount = this.staff.length || 1;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRevenue = this.appointments
      .filter(apt => new Date(apt.date) >= thirtyDaysAgo)
      .reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);

    return recentRevenue / staffCount;
  }

  private calculateGrossMargin(): number {
    // Simplified calculation - assumes 70% gross margin
    return 70;
  }

  private calculateNetProfit(): number {
    const totalRevenue = this.appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
    const grossProfit = totalRevenue * 0.7; // 70% gross margin
    const operatingExpenses = totalRevenue * 0.4; // 40% operating expenses
    return grossProfit - operatingExpenses;
  }

  private calculateCostPerClient(): number {
    const totalCosts = this.appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0) * 0.3; // 30% costs
    const uniqueClients = new Set(this.appointments.map(apt => apt.clientId)).size;
    return uniqueClients > 0 ? totalCosts / uniqueClients : 0;
  }

  private calculateROI(): number {
    const netProfit = this.calculateNetProfit();
    const totalInvestment = this.appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0) * 0.3; // Investment approximation
    return totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
  }
}

// Export utility functions for analytics calculations
export const calculateGrowthRate = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const calculateProjection = (historicalData: number[], months: number): number[] => {
  if (historicalData.length < 2) return new Array(months).fill(historicalData[0] || 0);
  
  const growthRate = calculateGrowthRate(historicalData[0], historicalData[1]) / 100;
  const projections = [];
  let lastValue = historicalData[0];

  for (let i = 0; i < months; i++) {
    lastValue = lastValue * (1 + growthRate);
    projections.push(lastValue);
  }

  return projections;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercentage = (value: number, decimals: number = 1): string => {
  return `${value.toFixed(decimals)}%`;
};