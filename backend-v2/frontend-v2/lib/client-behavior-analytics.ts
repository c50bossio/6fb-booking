// Client Behavior Analytics Engine for Six Figure Barber Intelligence
// Advanced client behavior analysis and engagement optimization

export interface BookingPattern {
  clientId: string;
  clientName: string;
  patterns: {
    preferredDays: { day: string; frequency: number; percentage: number }[];
    preferredTimes: { timeSlot: string; frequency: number; percentage: number }[];
    averageDaysBetweenVisits: number;
    seasonalPreferences: { season: string; bookingCount: number; preference: number }[];
    serviceConsistency: number; // 0-100 score for how consistently they book same services
    advanceBookingTendency: number; // Average days booked in advance
  };
  predictedNextBooking: {
    date: string;
    confidence: number;
    suggestedServices: string[];
    optimalReminderTiming: number; // days before suggested booking
  };
  behaviorTrends: {
    frequencyTrend: 'increasing' | 'stable' | 'decreasing';
    spendingTrend: 'increasing' | 'stable' | 'decreasing';
    serviceDiversification: 'expanding' | 'stable' | 'narrowing';
    loyaltyTrend: 'strengthening' | 'stable' | 'weakening';
  };
}

export interface ServicePreference {
  clientId: string;
  servicePreferences: {
    serviceName: string;
    frequency: number;
    lastBooked: string;
    averageSpend: number;
    satisfactionScore: number; // Inferred from rebooking behavior
    seasonalRelevance: number;
    upsellPotential: number;
    crossSellOpportunities: string[];
  }[];
  preferenceEvolution: {
    period: string;
    topServices: string[];
    emergingInterests: string[];
    decliningInterests: string[];
  }[];
  recommendationEngineOutput: {
    nextBestService: string;
    reasoning: string;
    probability: number;
    optimalTiming: string;
  };
}

export interface LoyaltyScore {
  clientId: string;
  clientName: string;
  overallScore: number; // 0-100
  scoreComponents: {
    frequencyScore: number; // Based on visit regularity
    recencyScore: number; // Based on last visit
    monetaryScore: number; // Based on total spending
    engagementScore: number; // Based on service variety and feedback
    referralScore: number; // Based on referred clients
    retentionRisk: number; // 0-100 risk of churning
  };
  loyaltyTier: 'champion' | 'loyal' | 'potential' | 'new' | 'at-risk' | 'lost';
  loyaltyJourney: {
    stage: string;
    duration: number; // days in current stage
    nextStageTarget: {
      targetStage: string;
      requirements: string[];
      estimatedTimeframe: number;
    };
  };
  engagementRecommendations: {
    action: string;
    priority: 'high' | 'medium' | 'low';
    expectedImpact: number;
    implementation: string;
  }[];
}

export interface RetentionAnalysis {
  clientId: string;
  riskAssessment: {
    churnRisk: number; // 0-100
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    keyRiskFactors: {
      factor: string;
      severity: number; // 0-100
      trend: 'improving' | 'stable' | 'worsening';
      description: string;
    }[];
    timeToChurn: number; // estimated days
  };
  retentionStrategies: {
    strategy: string;
    effectiveness: number; // 0-100
    cost: number;
    timeframe: string;
    personalizedMessage: string;
    triggerConditions: string[];
  }[];
  interventionPlan: {
    immediateActions: string[];
    shortTermActions: string[];
    longTermActions: string[];
    monitoringMetrics: string[];
  };
}

export interface ReferralTracking {
  clientId: string;
  referralActivity: {
    referralsGiven: number;
    referralsReceived: number;
    referralSuccessRate: number; // percentage of referrals that converted
    referralValue: number; // total revenue from referred clients
    lastReferralDate: string;
  };
  referralBehavior: {
    referralTriggers: string[]; // What causes them to refer
    referralChannels: string[]; // How they refer (word of mouth, social, etc.)
    referralTiming: string[]; // When they typically refer
    referredClientProfiles: {
      averageAge: number;
      commonServices: string[];
      retentionRate: number;
    };
  };
  referralOpportunities: {
    opportunity: string;
    probability: number;
    potentialValue: number;
    approachStrategy: string;
    optimalTiming: string;
  }[];
}

export interface JourneyStageAnalysis {
  clientId: string;
  currentStage: 'prospect' | 'first-time' | 'repeat' | 'loyal' | 'advocate' | 'dormant';
  stageHistory: {
    stage: string;
    startDate: string;
    endDate: string;
    duration: number; // days
    keyEvents: string[];
    stageValue: number; // revenue generated in this stage
  }[];
  stageProgressions: {
    from: string;
    to: string;
    transitionDate: string;
    triggerEvent: string;
    transitionProbability: number; // likelihood for similar clients
  }[];
  nextStageStrategy: {
    targetStage: string;
    requirements: string[];
    estimatedTimeframe: number;
    keyActions: string[];
    successProbability: number;
  };
  stageOptimization: {
    currentStageHealth: number; // 0-100
    optimizationOpportunities: string[];
    benchmarkPerformance: {
      industry: number;
      business: number;
      personal: number;
    };
  };
}

export interface BehaviorSegmentation {
  segmentName: string;
  segmentDescription: string;
  clientCount: number;
  clients: string[];
  characteristics: {
    visitFrequency: { min: number; max: number; average: number };
    averageSpend: { min: number; max: number; average: number };
    servicePreferences: string[];
    demographicPatterns: { [key: string]: any };
    behaviorPatterns: string[];
  };
  businessValue: {
    totalRevenue: number;
    averageLifetimeValue: number;
    profitMargin: number;
    growthPotential: number;
    retentionRate: number;
  };
  engagementStrategy: {
    communicationStyle: string;
    preferredChannels: string[];
    messagingThemes: string[];
    promotionalOffers: string[];
    serviceRecommendations: string[];
  };
}

export class ClientBehaviorAnalyticsEngine {
  private appointments: any[];
  private clients: any[];
  private services: any[];
  private referrals: any[];

  constructor(
    appointments: any[],
    clients: any[],
    services: any[],
    referrals: any[] = []
  ) {
    this.appointments = appointments;
    this.clients = clients;
    this.services = services;
    this.referrals = referrals;
  }

  // Comprehensive Booking Pattern Analysis
  public analyzeBookingPatterns(): BookingPattern[] {
    return this.clients.map(client => {
      const clientAppointments = this.appointments
        .filter(apt => apt.clientId === client.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (clientAppointments.length === 0) {
        return this.createEmptyBookingPattern(client);
      }

      const patterns = this.extractBookingPatterns(clientAppointments);
      const predictedNextBooking = this.predictNextBooking(clientAppointments, patterns);
      const behaviorTrends = this.analyzeBehaviorTrends(clientAppointments);

      return {
        clientId: client.id,
        clientName: client.name || 'Unknown Client',
        patterns,
        predictedNextBooking,
        behaviorTrends
      };
    });
  }

  // Service Preference Analysis
  public analyzeServicePreferences(): ServicePreference[] {
    return this.clients.map(client => {
      const clientAppointments = this.appointments.filter(apt => apt.clientId === client.id);
      
      if (clientAppointments.length === 0) {
        return this.createEmptyServicePreference(client);
      }

      const servicePreferences = this.calculateServicePreferences(clientAppointments);
      const preferenceEvolution = this.analyzePreferenceEvolution(clientAppointments);
      const recommendationEngineOutput = this.generateServiceRecommendation(client, servicePreferences);

      return {
        clientId: client.id,
        servicePreferences,
        preferenceEvolution,
        recommendationEngineOutput
      };
    });
  }

  // Loyalty Score Calculation
  public calculateLoyaltyScores(): LoyaltyScore[] {
    return this.clients.map(client => {
      const clientAppointments = this.appointments.filter(apt => apt.clientId === client.id);
      const scoreComponents = this.calculateLoyaltyScoreComponents(client, clientAppointments);
      const overallScore = this.calculateOverallLoyaltyScore(scoreComponents);
      const loyaltyTier = this.determineLoyaltyTier(overallScore, scoreComponents);
      const loyaltyJourney = this.analyzeLoyaltyJourney(client, clientAppointments, loyaltyTier);
      const engagementRecommendations = this.generateEngagementRecommendations(loyaltyTier, scoreComponents);

      return {
        clientId: client.id,
        clientName: client.name || 'Unknown Client',
        overallScore,
        scoreComponents,
        loyaltyTier,
        loyaltyJourney,
        engagementRecommendations
      };
    });
  }

  // Retention Risk Analysis  
  public analyzeRetentionRisk(): RetentionAnalysis[] {
    return this.clients.map(client => {
      const clientAppointments = this.appointments.filter(apt => apt.clientId === client.id);
      const riskAssessment = this.assessChurnRisk(client, clientAppointments);
      const retentionStrategies = this.generateRetentionStrategies(riskAssessment);
      const interventionPlan = this.createInterventionPlan(riskAssessment, retentionStrategies);

      return {
        clientId: client.id,
        riskAssessment,
        retentionStrategies,
        interventionPlan
      };
    });
  }

  // Referral Behavior Tracking
  public trackReferralBehavior(): ReferralTracking[] {
    return this.clients.map(client => {
      const clientReferrals = this.referrals.filter(ref => ref.referrerId === client.id);
      const referralActivity = this.calculateReferralActivity(client, clientReferrals);
      const referralBehavior = this.analyzeReferralBehavior(client, clientReferrals);
      const referralOpportunities = this.identifyReferralOpportunities(client, referralActivity, referralBehavior);

      return {
        clientId: client.id,
        referralActivity,
        referralBehavior,
        referralOpportunities
      };
    });
  }

  // Journey Stage Analysis
  public analyzeJourneyStages(): JourneyStageAnalysis[] {
    return this.clients.map(client => {
      const clientAppointments = this.appointments.filter(apt => apt.clientId === client.id);
      const currentStage = this.determineCurrentJourneyStage(client, clientAppointments);
      const stageHistory = this.buildStageHistory(client, clientAppointments);
      const stageProgressions = this.analyzeStageProgressions(stageHistory);
      const nextStageStrategy = this.developNextStageStrategy(currentStage, client, clientAppointments);
      const stageOptimization = this.optimizeCurrentStage(currentStage, client, clientAppointments);

      return {
        clientId: client.id,
        currentStage,
        stageHistory,
        stageProgressions,
        nextStageStrategy,
        stageOptimization
      };
    });
  }

  // Behavior-Based Segmentation
  public segmentClientsByBehavior(): BehaviorSegmentation[] {
    const segments: BehaviorSegmentation[] = [
      {
        segmentName: 'VIP Champions',
        segmentDescription: 'High-frequency, high-value clients who actively refer others',
        clientCount: 0,
        clients: [],
        characteristics: {
          visitFrequency: { min: 4, max: 12, average: 6 },
          averageSpend: { min: 80, max: 200, average: 120 },
          servicePreferences: ['premium services', 'multiple services'],
          demographicPatterns: {},
          behaviorPatterns: ['consistent booking', 'early appointments', 'referrals']
        },
        businessValue: { totalRevenue: 0, averageLifetimeValue: 0, profitMargin: 75, growthPotential: 95, retentionRate: 95 },
        engagementStrategy: {
          communicationStyle: 'personal and exclusive',
          preferredChannels: ['phone', 'in-person'],
          messagingThemes: ['exclusivity', 'appreciation', 'first access'],
          promotionalOffers: ['VIP events', 'early booking privileges'],
          serviceRecommendations: ['new premium services', 'seasonal specialties']
        }
      },
      {
        segmentName: 'Loyal Regulars',
        segmentDescription: 'Consistent clients with steady booking patterns and moderate spend',
        clientCount: 0,
        clients: [],
        characteristics: {
          visitFrequency: { min: 2, max: 4, average: 3 },
          averageSpend: { min: 40, max: 80, average: 60 },
          servicePreferences: ['core services', 'occasional upgrades'],
          demographicPatterns: {},
          behaviorPatterns: ['regular schedule', 'service consistency', 'price conscious']
        },
        businessValue: { totalRevenue: 0, averageLifetimeValue: 0, profitMargin: 65, growthPotential: 75, retentionRate: 85 },
        engagementStrategy: {
          communicationStyle: 'friendly and consistent',
          preferredChannels: ['email', 'SMS'],
          messagingThemes: ['reliability', 'value', 'consistency'],
          promotionalOffers: ['loyalty rewards', 'package deals'],
          serviceRecommendations: ['service upgrades', 'seasonal offerings']
        }
      },
      {
        segmentName: 'Occasional Visitors',
        segmentDescription: 'Infrequent clients with potential for increased engagement',
        clientCount: 0,
        clients: [],
        characteristics: {
          visitFrequency: { min: 0.5, max: 2, average: 1 },
          averageSpend: { min: 30, max: 60, average: 45 },
          servicePreferences: ['basic services', 'price-sensitive'],
          demographicPatterns: {},
          behaviorPatterns: ['irregular schedule', 'price shopping', 'minimal commitment']
        },
        businessValue: { totalRevenue: 0, averageLifetimeValue: 0, profitMargin: 50, growthPotential: 60, retentionRate: 45 },
        engagementStrategy: {
          communicationStyle: 'encouraging and supportive',
          preferredChannels: ['SMS', 'social media'],
          messagingThemes: ['convenience', 'value', 'easy booking'],
          promotionalOffers: ['first-time discounts', 'referral incentives'],
          serviceRecommendations: ['basic packages', 'introductory services']
        }
      },
      {
        segmentName: 'At-Risk Clients',
        segmentDescription: 'Previously regular clients showing declining engagement',
        clientCount: 0,
        clients: [],
        characteristics: {
          visitFrequency: { min: 0, max: 1, average: 0.5 },
          averageSpend: { min: 20, max: 100, average: 50 },
          servicePreferences: ['historical favorites', 'declining variety'],
          demographicPatterns: {},
          behaviorPatterns: ['declining frequency', 'longer gaps', 'reduced spend']
        },
        businessValue: { totalRevenue: 0, averageLifetimeValue: 0, profitMargin: 40, growthPotential: 30, retentionRate: 25 },
        engagementStrategy: {
          communicationStyle: 'personal and re-engaging',
          preferredChannels: ['phone', 'personal email'],
          messagingThemes: ['we miss you', 'special comeback offers', 'personalized'],
          promotionalOffers: ['win-back discounts', 'free consultations'],
          serviceRecommendations: ['previous favorites', 'new experiences']
        }
      }
    ];

    // Segment clients based on their behavior metrics
    this.clients.forEach(client => {
      const clientAppointments = this.appointments.filter(apt => apt.clientId === client.id);
      const metrics = this.calculateClientMetrics(client, clientAppointments);
      const segment = this.assignClientToSegment(metrics, segments);
      
      if (segment) {
        segment.clients.push(client.id);
        segment.clientCount++;
        segment.businessValue.totalRevenue += metrics.totalSpend;
      }
    });

    // Calculate segment-level metrics
    segments.forEach(segment => {
      if (segment.clientCount > 0) {
        segment.businessValue.averageLifetimeValue = segment.businessValue.totalRevenue / segment.clientCount;
      }
    });

    return segments.filter(segment => segment.clientCount > 0);
  }

  // Private helper methods for booking pattern analysis
  private createEmptyBookingPattern(client: any): BookingPattern {
    return {
      clientId: client.id,
      clientName: client.name || 'Unknown Client',
      patterns: {
        preferredDays: [],
        preferredTimes: [],
        averageDaysBetweenVisits: 0,
        seasonalPreferences: [],
        serviceConsistency: 0,
        advanceBookingTendency: 0
      },
      predictedNextBooking: {
        date: '',
        confidence: 0,
        suggestedServices: [],
        optimalReminderTiming: 7
      },
      behaviorTrends: {
        frequencyTrend: 'stable',
        spendingTrend: 'stable',
        serviceDiversification: 'stable',
        loyaltyTrend: 'stable'
      }
    };
  }

  private extractBookingPatterns(appointments: any[]) {
    const preferredDays = this.calculatePreferredDays(appointments);
    const preferredTimes = this.calculatePreferredTimes(appointments);
    const averageDaysBetweenVisits = this.calculateAverageDaysBetween(appointments);
    const seasonalPreferences = this.calculateSeasonalPreferences(appointments);
    const serviceConsistency = this.calculateServiceConsistency(appointments);
    const advanceBookingTendency = this.calculateAdvanceBookingTendency(appointments);

    return {
      preferredDays,
      preferredTimes,
      averageDaysBetweenVisits,
      seasonalPreferences,
      serviceConsistency,
      advanceBookingTendency
    };
  }

  private calculatePreferredDays(appointments: any[]) {
    const dayCount = new Map<string, number>();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    appointments.forEach(apt => {
      const day = dayNames[new Date(apt.date).getDay()];
      dayCount.set(day, (dayCount.get(day) || 0) + 1);
    });

    const total = appointments.length;
    return Array.from(dayCount.entries())
      .map(([day, frequency]) => ({
        day,
        frequency,
        percentage: (frequency / total) * 100
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private calculatePreferredTimes(appointments: any[]) {
    const timeSlots = new Map<string, number>();

    appointments.forEach(apt => {
      const hour = new Date(apt.date).getHours();
      const timeSlot = this.getTimeSlotLabel(hour);
      timeSlots.set(timeSlot, (timeSlots.get(timeSlot) || 0) + 1);
    });

    const total = appointments.length;
    return Array.from(timeSlots.entries())
      .map(([timeSlot, frequency]) => ({
        timeSlot,
        frequency,
        percentage: (frequency / total) * 100
      }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private getTimeSlotLabel(hour: number): string {
    if (hour < 9) return 'Early Morning (Before 9 AM)';
    if (hour < 12) return 'Morning (9 AM - 12 PM)';
    if (hour < 15) return 'Early Afternoon (12 PM - 3 PM)';
    if (hour < 18) return 'Late Afternoon (3 PM - 6 PM)';
    return 'Evening (After 6 PM)';
  }

  private calculateAverageDaysBetween(appointments: any[]): number {
    if (appointments.length < 2) return 0;

    const sortedAppointments = appointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const gaps = [];

    for (let i = 1; i < sortedAppointments.length; i++) {
      const gap = (new Date(sortedAppointments[i].date).getTime() - new Date(sortedAppointments[i - 1].date).getTime()) / (1000 * 60 * 60 * 24);
      gaps.push(gap);
    }

    return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  }

  private calculateSeasonalPreferences(appointments: any[]) {
    const seasonCount = new Map<string, number>();
    const seasons = ['Winter', 'Spring', 'Summer', 'Fall'];

    appointments.forEach(apt => {
      const month = new Date(apt.date).getMonth();
      const season = this.getSeasonFromMonth(month);
      seasonCount.set(season, (seasonCount.get(season) || 0) + 1);
    });

    const total = appointments.length;
    const avgPerSeason = total / 4;

    return seasons.map(season => ({
      season,
      bookingCount: seasonCount.get(season) || 0,
      preference: total > 0 ? ((seasonCount.get(season) || 0) / avgPerSeason) * 100 : 0
    }));
  }

  private getSeasonFromMonth(month: number): string {
    if (month >= 11 || month <= 1) return 'Winter';
    if (month >= 2 && month <= 4) return 'Spring';
    if (month >= 5 && month <= 7) return 'Summer';
    return 'Fall';
  }

  private calculateServiceConsistency(appointments: any[]): number {
    if (appointments.length === 0) return 0;

    const serviceFrequency = new Map<string, number>();
    let totalServices = 0;

    appointments.forEach(apt => {
      apt.services?.forEach((service: any) => {
        serviceFrequency.set(service.name, (serviceFrequency.get(service.name) || 0) + 1);
        totalServices++;
      });
    });

    if (totalServices === 0) return 0;

    // Calculate consistency score based on service distribution
    const mostCommonService = Math.max(...Array.from(serviceFrequency.values()));
    return (mostCommonService / totalServices) * 100;
  }

  private calculateAdvanceBookingTendency(appointments: any[]): number {
    // This would require booking creation date vs appointment date
    // For now, return a default value
    return 7; // Assume 7 days average
  }

  private predictNextBooking(appointments: any[], patterns: any) {
    if (appointments.length === 0) {
      return {
        date: '',
        confidence: 0,
        suggestedServices: [],
        optimalReminderTiming: 7
      };
    }

    const lastAppointment = appointments[appointments.length - 1];
    const lastAppointmentDate = new Date(lastAppointment.date);
    const avgDaysBetween = patterns.averageDaysBetweenVisits || 30;
    
    const predictedDate = new Date(lastAppointmentDate);
    predictedDate.setDate(predictedDate.getDate() + avgDaysBetween);

    const confidence = this.calculatePredictionConfidence(appointments, patterns);
    const suggestedServices = this.suggestNextServices(appointments);

    return {
      date: predictedDate.toISOString().split('T')[0],
      confidence,
      suggestedServices,
      optimalReminderTiming: Math.floor(avgDaysBetween * 0.7) // Remind at 70% of average interval
    };
  }

  private calculatePredictionConfidence(appointments: any[], patterns: any): number {
    let confidence = 50; // Base confidence

    // More appointments = higher confidence
    confidence += Math.min(appointments.length * 5, 30);

    // Consistent booking patterns increase confidence
    if (patterns.serviceConsistency > 70) confidence += 15;
    if (patterns.averageDaysBetweenVisits > 0 && patterns.averageDaysBetweenVisits < 45) confidence += 10;

    // Recent appointments increase confidence
    const daysSinceLastVisit = Math.floor((Date.now() - new Date(appointments[appointments.length - 1].date).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceLastVisit < patterns.averageDaysBetweenVisits) confidence += 10;

    return Math.min(Math.max(confidence, 0), 100);
  }

  private suggestNextServices(appointments: any[]): string[] {
    const serviceFrequency = new Map<string, number>();

    appointments.forEach(apt => {
      apt.services?.forEach((service: any) => {
        serviceFrequency.set(service.name, (serviceFrequency.get(service.name) || 0) + 1);
      });
    });

    return Array.from(serviceFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([serviceName]) => serviceName);
  }

  private analyzeBehaviorTrends(appointments: any[]) {
    const frequencyTrend = this.calculateFrequencyTrend(appointments);
    const spendingTrend = this.calculateSpendingTrend(appointments);
    const serviceDiversification = this.calculateServiceDiversificationTrend(appointments);
    const loyaltyTrend = this.calculateLoyaltyTrend(appointments);

    return {
      frequencyTrend,
      spendingTrend,
      serviceDiversification,
      loyaltyTrend
    };
  }

  private calculateFrequencyTrend(appointments: any[]): 'increasing' | 'stable' | 'decreasing' {
    if (appointments.length < 4) return 'stable';

    const midpoint = Math.floor(appointments.length / 2);
    const firstHalf = appointments.slice(0, midpoint);
    const secondHalf = appointments.slice(-midpoint);

    const firstHalfDays = this.calculateTotalDays(firstHalf);
    const secondHalfDays = this.calculateTotalDays(secondHalf);

    const firstHalfFreq = firstHalfDays > 0 ? firstHalf.length / (firstHalfDays / 30) : 0;
    const secondHalfFreq = secondHalfDays > 0 ? secondHalf.length / (secondHalfDays / 30) : 0;

    if (secondHalfFreq > firstHalfFreq * 1.1) return 'increasing';
    if (secondHalfFreq < firstHalfFreq * 0.9) return 'decreasing';
    return 'stable';
  }

  private calculateSpendingTrend(appointments: any[]): 'increasing' | 'stable' | 'decreasing' {
    if (appointments.length < 4) return 'stable';

    const midpoint = Math.floor(appointments.length / 2);
    const firstHalfAvg = appointments.slice(0, midpoint).reduce((sum, apt) => sum + (apt.totalAmount || 0), 0) / midpoint;
    const secondHalfAvg = appointments.slice(-midpoint).reduce((sum, apt) => sum + (apt.totalAmount || 0), 0) / midpoint;

    if (secondHalfAvg > firstHalfAvg * 1.1) return 'increasing';
    if (secondHalfAvg < firstHalfAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  private calculateServiceDiversificationTrend(appointments: any[]): 'expanding' | 'stable' | 'narrowing' {
    if (appointments.length < 4) return 'stable';

    const midpoint = Math.floor(appointments.length / 2);
    const firstHalfServices = new Set();
    const secondHalfServices = new Set();

    appointments.slice(0, midpoint).forEach(apt => {
      apt.services?.forEach((service: any) => firstHalfServices.add(service.name));
    });

    appointments.slice(-midpoint).forEach(apt => {
      apt.services?.forEach((service: any) => secondHalfServices.add(service.name));
    });

    if (secondHalfServices.size > firstHalfServices.size) return 'expanding';
    if (secondHalfServices.size < firstHalfServices.size) return 'narrowing';
    return 'stable';
  }

  private calculateLoyaltyTrend(appointments: any[]): 'strengthening' | 'stable' | 'weakening' {
    if (appointments.length < 4) return 'stable';

    // Simple implementation based on appointment frequency and recency
    const recentAppointments = appointments.filter(apt => 
      new Date(apt.date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ).length;

    const olderAppointments = appointments.filter(apt => 
      new Date(apt.date) <= new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) &&
      new Date(apt.date) > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    ).length;

    if (recentAppointments > olderAppointments) return 'strengthening';
    if (recentAppointments < olderAppointments * 0.8) return 'weakening';
    return 'stable';
  }

  private calculateTotalDays(appointments: any[]): number {
    if (appointments.length === 0) return 0;
    const firstDate = new Date(appointments[0].date);
    const lastDate = new Date(appointments[appointments.length - 1].date);
    return (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
  }

  // Service preference analysis methods
  private createEmptyServicePreference(client: any): ServicePreference {
    return {
      clientId: client.id,
      servicePreferences: [],
      preferenceEvolution: [],
      recommendationEngineOutput: {
        nextBestService: '',
        reasoning: '',
        probability: 0,
        optimalTiming: ''
      }
    };
  }

  private calculateServicePreferences(appointments: any[]) {
    const serviceStats = new Map<string, {
      frequency: number;
      totalSpent: number;
      lastBooked: string;
      appointments: any[];
    }>();

    appointments.forEach(apt => {
      apt.services?.forEach((service: any) => {
        const serviceName = service.name;
        if (!serviceStats.has(serviceName)) {
          serviceStats.set(serviceName, {
            frequency: 0,
            totalSpent: 0,
            lastBooked: apt.date,
            appointments: []
          });
        }

        const stats = serviceStats.get(serviceName)!;
        stats.frequency++;
        stats.totalSpent += service.price || 0;
        stats.appointments.push(apt);
        
        if (new Date(apt.date) > new Date(stats.lastBooked)) {
          stats.lastBooked = apt.date;
        }
      });
    });

    return Array.from(serviceStats.entries()).map(([serviceName, stats]) => ({
      serviceName,
      frequency: stats.frequency,
      lastBooked: stats.lastBooked,
      averageSpend: stats.frequency > 0 ? stats.totalSpent / stats.frequency : 0,
      satisfactionScore: this.calculateSatisfactionScore(stats.appointments),
      seasonalRelevance: this.calculateSeasonalRelevance(serviceName),
      upsellPotential: this.calculateUpsellPotential(serviceName, stats.frequency),
      crossSellOpportunities: this.identifyCorrelatedServices(serviceName, appointments)
    }));
  }

  private calculateSatisfactionScore(serviceAppointments: any[]): number {
    // Simple satisfaction inference based on rebooking behavior
    const completedAppointments = serviceAppointments.filter(apt => apt.status === 'completed').length;
    const cancelledAppointments = serviceAppointments.filter(apt => apt.status === 'cancelled').length;
    const noShowAppointments = serviceAppointments.filter(apt => apt.status === 'no-show').length;

    const totalAppointments = serviceAppointments.length;
    if (totalAppointments === 0) return 50;

    const completionRate = completedAppointments / totalAppointments;
    const issueRate = (cancelledAppointments + noShowAppointments) / totalAppointments;

    let satisfactionScore = 50; // Base score
    satisfactionScore += completionRate * 40; // Up to 40 points for completion
    satisfactionScore -= issueRate * 30; // Deduct up to 30 points for issues

    // Bonus for repeat bookings of same service
    if (serviceAppointments.length > 2) satisfactionScore += 10;

    return Math.min(Math.max(satisfactionScore, 0), 100);
  }

  private calculateSeasonalRelevance(serviceName: string): number {
    const currentMonth = new Date().getMonth();
    const seasonalServices: Record<string, number[]> = {
      'beard trim': [9, 10, 11, 0, 1, 2], // More relevant in cooler months
      'scalp treatment': [3, 4, 5, 6, 7, 8], // More relevant in warmer months
      'styling': [3, 4, 10, 11], // Spring and fall events
    };

    const relevantMonths = seasonalServices[serviceName.toLowerCase()] || [];
    return relevantMonths.includes(currentMonth) ? 85 : 50;
  }

  private calculateUpsellPotential(serviceName: string, frequency: number): number {
    // Services with higher frequency have lower upsell potential (already maximized)
    let potential = 50;
    
    if (frequency === 1) potential = 80; // High potential for first-time service
    else if (frequency <= 3) potential = 60; // Medium potential
    else potential = 30; // Lower potential for frequent services

    // Adjust based on service type
    const premiumServices = ['hot towel', 'scalp massage', 'premium styling'];
    if (premiumServices.some(ps => serviceName.toLowerCase().includes(ps))) {
      potential += 20;
    }

    return Math.min(Math.max(potential, 0), 100);
  }

  private identifyCorrelatedServices(serviceName: string, appointments: any[]): string[] {
    const correlations = new Map<string, number>();

    appointments.forEach(apt => {
      const hasTargetService = apt.services?.some((s: any) => s.name === serviceName);
      if (!hasTargetService) return;

      apt.services?.forEach((service: any) => {
        if (service.name !== serviceName) {
          correlations.set(service.name, (correlations.get(service.name) || 0) + 1);
        }
      });
    });

    return Array.from(correlations.entries())
      .filter(([_, count]) => count >= 2) // At least 2 co-occurrences
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([service]) => service);
  }

  private analyzePreferenceEvolution(appointments: any[]) {
    const periods = this.dividePeriods(appointments, 3); // Divide into 3 periods
    
    return periods.map((period, index) => {
      const services = new Map<string, number>();
      
      period.forEach(apt => {
        apt.services?.forEach((service: any) => {
          services.set(service.name, (services.get(service.name) || 0) + 1);
        });
      });

      const topServices = Array.from(services.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([service]) => service);

      return {
        period: `Period ${index + 1}`,
        topServices,
        emergingInterests: this.identifyEmergingInterests(services, periods[index - 1]),
        decliningInterests: this.identifyDecliningInterests(services, periods[index - 1])
      };
    });
  }

  private dividePeriods(appointments: any[], periodCount: number) {
    const sortedAppointments = appointments.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const periodSize = Math.ceil(sortedAppointments.length / periodCount);
    const periods = [];

    for (let i = 0; i < periodCount; i++) {
      const start = i * periodSize;
      const end = start + periodSize;
      periods.push(sortedAppointments.slice(start, end));
    }

    return periods.filter(period => period.length > 0);
  }

  private identifyEmergingInterests(currentServices: Map<string, number>, previousPeriod?: any[]): string[] {
    if (!previousPeriod) return [];

    const previousServices = new Map<string, number>();
    previousPeriod.forEach(apt => {
      apt.services?.forEach((service: any) => {
        previousServices.set(service.name, (previousServices.get(service.name) || 0) + 1);
      });
    });

    const emerging = [];
    for (const [service, currentCount] of currentServices) {
      const previousCount = previousServices.get(service) || 0;
      if (currentCount > previousCount) {
        emerging.push(service);
      }
    }

    return emerging.slice(0, 2);
  }

  private identifyDecliningInterests(currentServices: Map<string, number>, previousPeriod?: any[]): string[] {
    if (!previousPeriod) return [];

    const previousServices = new Map<string, number>();
    previousPeriod.forEach(apt => {
      apt.services?.forEach((service: any) => {
        previousServices.set(service.name, (previousServices.get(service.name) || 0) + 1);
      });
    });

    const declining = [];
    for (const [service, previousCount] of previousServices) {
      const currentCount = currentServices.get(service) || 0;
      if (currentCount < previousCount) {
        declining.push(service);
      }
    }

    return declining.slice(0, 2);
  }

  private generateServiceRecommendation(client: any, servicePreferences: any[]) {
    if (servicePreferences.length === 0) {
      return {
        nextBestService: 'haircut',
        reasoning: 'Most popular service for new clients',
        probability: 70,
        optimalTiming: 'Next visit'
      };
    }

    // Find service with highest upsell potential
    const bestUpsell = servicePreferences
      .sort((a, b) => b.upsellPotential - a.upsellPotential)[0];

    return {
      nextBestService: bestUpsell.serviceName,
      reasoning: `High upsell potential (${bestUpsell.upsellPotential}%) based on current preferences`,
      probability: bestUpsell.upsellPotential,
      optimalTiming: this.calculateOptimalTiming(bestUpsell)
    };
  }

  private calculateOptimalTiming(servicePreference: any): string {
    const daysSinceLastBooking = Math.floor(
      (Date.now() - new Date(servicePreference.lastBooked).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastBooking > 60) return 'Immediately - reactivation needed';
    if (daysSinceLastBooking > 30) return 'Next 1-2 weeks';
    if (daysSinceLastBooking > 14) return 'Next visit';
    return 'After current service completion';
  }

  // Loyalty score calculation methods
  private calculateLoyaltyScoreComponents(client: any, appointments: any[]) {
    return {
      frequencyScore: this.calculateFrequencyScore(appointments),
      recencyScore: this.calculateRecencyScore(appointments),
      monetaryScore: this.calculateMonetaryScore(appointments),
      engagementScore: this.calculateEngagementScore(appointments),
      referralScore: this.calculateReferralScore(client),
      retentionRisk: this.calculateRetentionRisk(appointments)
    };
  }

  private calculateFrequencyScore(appointments: any[]): number {
    const appointmentsPerMonth = appointments.length / Math.max(this.getClientLifespanMonths(appointments), 1);
    
    // Score based on visits per month
    if (appointmentsPerMonth >= 4) return 100;
    if (appointmentsPerMonth >= 2) return 80;
    if (appointmentsPerMonth >= 1) return 60;
    if (appointmentsPerMonth >= 0.5) return 40;
    return 20;
  }

  private calculateRecencyScore(appointments: any[]): number {
    if (appointments.length === 0) return 0;

    const lastAppointment = appointments[appointments.length - 1];
    const daysSinceLastVisit = Math.floor(
      (Date.now() - new Date(lastAppointment.date).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastVisit <= 7) return 100;
    if (daysSinceLastVisit <= 14) return 90;
    if (daysSinceLastVisit <= 30) return 70;
    if (daysSinceLastVisit <= 60) return 50;
    if (daysSinceLastVisit <= 90) return 30;
    return 10;
  }

  private calculateMonetaryScore(appointments: any[]): number {
    const totalSpent = appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
    
    // Score based on total lifetime value
    if (totalSpent >= 1000) return 100;
    if (totalSpent >= 500) return 80;
    if (totalSpent >= 250) return 60;
    if (totalSpent >= 100) return 40;
    return 20;
  }

  private calculateEngagementScore(appointments: any[]): number {
    let score = 0;

    // Service variety
    const uniqueServices = new Set();
    appointments.forEach(apt => {
      apt.services?.forEach((service: any) => uniqueServices.add(service.name));
    });
    score += Math.min(uniqueServices.size * 10, 40);

    // Completion rate
    const completedAppointments = appointments.filter(apt => apt.status === 'completed').length;
    const completionRate = appointments.length > 0 ? completedAppointments / appointments.length : 0;
    score += completionRate * 30;

    // Feedback participation (if available)
    // score += feedbackParticipation * 30;

    return Math.min(score, 100);
  }

  private calculateReferralScore(client: any): number {
    const clientReferrals = this.referrals.filter(ref => ref.referrerId === client.id);
    const referralCount = clientReferrals.length;

    if (referralCount >= 5) return 100;
    if (referralCount >= 3) return 80;
    if (referralCount >= 2) return 60;
    if (referralCount >= 1) return 40;
    return 0;
  }

  private calculateRetentionRisk(appointments: any[]): number {
    if (appointments.length === 0) return 100;

    let risk = 0;

    // Frequency decline
    const frequencyTrend = this.calculateFrequencyTrend(appointments);
    if (frequencyTrend === 'decreasing') risk += 30;
    else if (frequencyTrend === 'stable') risk += 10;

    // Recency risk
    const daysSinceLastVisit = Math.floor(
      (Date.now() - new Date(appointments[appointments.length - 1].date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastVisit > 90) risk += 40;
    else if (daysSinceLastVisit > 60) risk += 25;
    else if (daysSinceLastVisit > 30) risk += 10;

    // Spending decline
    const spendingTrend = this.calculateSpendingTrend(appointments);
    if (spendingTrend === 'decreasing') risk += 20;

    // Cancellation rate
    const cancellationRate = appointments.filter(apt => apt.status === 'cancelled').length / appointments.length;
    risk += cancellationRate * 10;

    return Math.min(Math.max(risk, 0), 100);
  }

  private calculateOverallLoyaltyScore(components: any): number {
    const weights = {
      frequencyScore: 0.25,
      recencyScore: 0.20,
      monetaryScore: 0.25,
      engagementScore: 0.15,
      referralScore: 0.15
    };

    let totalScore = 0;
    Object.entries(weights).forEach(([component, weight]) => {
      totalScore += (components[component as keyof typeof components] || 0) * weight;
    });

    // Adjust for retention risk
    totalScore = totalScore * (1 - components.retentionRisk / 200); // Max 50% reduction

    return Math.min(Math.max(totalScore, 0), 100);
  }

  private determineLoyaltyTier(overallScore: number, components: any): 'champion' | 'loyal' | 'potential' | 'new' | 'at-risk' | 'lost' {
    if (components.retentionRisk > 80) return 'lost';
    if (components.retentionRisk > 60) return 'at-risk';
    if (overallScore >= 80 && components.referralScore > 40) return 'champion';
    if (overallScore >= 60) return 'loyal';
    if (overallScore >= 40) return 'potential';
    return 'new';
  }

  private analyzeLoyaltyJourney(client: any, appointments: any[], loyaltyTier: string) {
    const clientLifespanDays = this.getClientLifespanDays(appointments);
    const currentStage = this.mapTierToStage(loyaltyTier);
    
    return {
      stage: currentStage,
      duration: clientLifespanDays,
      nextStageTarget: this.getNextStageTarget(loyaltyTier)
    };
  }

  private mapTierToStage(tier: string): string {
    const stageMap: Record<string, string> = {
      'new': 'Onboarding',
      'potential': 'Development',
      'loyal': 'Engagement',
      'champion': 'Advocacy',
      'at-risk': 'Recovery',
      'lost': 'Win-back'
    };
    return stageMap[tier] || 'Unknown';
  }

  private getNextStageTarget(currentTier: string) {
    const progressions: Record<string, any> = {
      'new': {
        targetStage: 'Development',
        requirements: ['2+ appointments', '60+ days relationship', '$100+ total spend'],
        estimatedTimeframe: 60
      },
      'potential': {
        targetStage: 'Engagement',
        requirements: ['4+ appointments', '6+ months relationship', 'Service variety'],
        estimatedTimeframe: 90
      },
      'loyal': {
        targetStage: 'Advocacy',
        requirements: ['Refer 1+ clients', 'Premium service adoption', '12+ months relationship'],
        estimatedTimeframe: 120
      },
      'at-risk': {
        targetStage: 'Recovery',
        requirements: ['Return visit', 'Satisfaction improvement', 'Re-engagement'],
        estimatedTimeframe: 30
      }
    };

    return progressions[currentTier] || {
      targetStage: 'Maintain Current Level',
      requirements: ['Continue current engagement'],
      estimatedTimeframe: 0
    };
  }

  private generateEngagementRecommendations(loyaltyTier: string, components: any) {
    const recommendations: any[] = [];

    switch (loyaltyTier) {
      case 'champion':
        recommendations.push({
          action: 'VIP recognition program enrollment',
          priority: 'high' as const,
          expectedImpact: 90,
          implementation: 'Personal invitation with exclusive benefits'
        });
        break;
      case 'loyal':
        recommendations.push({
          action: 'Referral program invitation',
          priority: 'high' as const,
          expectedImpact: 80,
          implementation: 'Personalized referral incentive offer'
        });
        break;
      case 'potential':
        recommendations.push({
          action: 'Service upgrade consultation',
          priority: 'medium' as const,
          expectedImpact: 70,
          implementation: 'Complimentary premium service trial'
        });
        break;
      case 'at-risk':
        recommendations.push({
          action: 'Personal retention outreach',
          priority: 'high' as const,
          expectedImpact: 60,
          implementation: 'Direct phone call with comeback offer'
        });
        break;
      case 'new':
        recommendations.push({
          action: 'Welcome series engagement',
          priority: 'medium' as const,
          expectedImpact: 75,
          implementation: 'Structured onboarding communication sequence'
        });
        break;
    }

    return recommendations;
  }

  private getClientLifespanMonths(appointments: any[]): number {
    if (appointments.length === 0) return 1;

    const firstAppointment = new Date(appointments[0].date);
    const lastAppointment = new Date(appointments[appointments.length - 1].date);
    const lifespanMs = lastAppointment.getTime() - firstAppointment.getTime();
    return Math.max(1, lifespanMs / (1000 * 60 * 60 * 24 * 30)); // Convert to months
  }

  private getClientLifespanDays(appointments: any[]): number {
    if (appointments.length === 0) return 0;

    const firstAppointment = new Date(appointments[0].date);
    const now = new Date();
    return Math.floor((now.getTime() - firstAppointment.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Placeholder methods for additional features
  private assessChurnRisk(client: any, appointments: any[]) {
    const churnRisk = this.calculateRetentionRisk(appointments);
    const riskLevel = churnRisk > 80 ? 'critical' : churnRisk > 60 ? 'high' : churnRisk > 40 ? 'medium' : 'low';
    
    return {
      churnRisk,
      riskLevel: riskLevel as 'low' | 'medium' | 'high' | 'critical',
      keyRiskFactors: this.identifyRiskFactors(appointments, churnRisk),
      timeToChurn: this.estimateTimeToChurn(appointments, churnRisk)
    };
  }

  private identifyRiskFactors(appointments: any[], churnRisk: number) {
    const factors = [];

    const daysSinceLastVisit = appointments.length > 0 
      ? Math.floor((Date.now() - new Date(appointments[appointments.length - 1].date).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLastVisit > 60) {
      factors.push({
        factor: 'Extended Absence',
        severity: Math.min(daysSinceLastVisit, 100),
        trend: 'worsening' as const,
        description: `${daysSinceLastVisit} days since last visit`
      });
    }

    const frequencyTrend = this.calculateFrequencyTrend(appointments);
    if (frequencyTrend === 'decreasing') {
      factors.push({
        factor: 'Declining Visit Frequency',
        severity: 70,
        trend: 'worsening' as const,
        description: 'Appointment frequency has decreased over time'
      });
    }

    return factors;
  }

  private estimateTimeToChurn(appointments: any[], churnRisk: number): number {
    if (appointments.length === 0) return 7;

    const avgDaysBetween = this.calculateAverageDaysBetween(appointments);
    const riskMultiplier = (100 - churnRisk) / 100;
    
    return Math.max(7, Math.floor(avgDaysBetween * riskMultiplier));
  }

  private generateRetentionStrategies(riskAssessment: any) {
    const strategies = [];

    if (riskAssessment.riskLevel === 'critical' || riskAssessment.riskLevel === 'high') {
      strategies.push({
        strategy: 'Personal Win-Back Call',
        effectiveness: 75,
        cost: 0,
        timeframe: '1-3 days',
        personalizedMessage: 'We miss you! Let us know how we can serve you better.',
        triggerConditions: ['60+ days since last visit', 'high churn risk score']
      });
    }

    strategies.push({
      strategy: 'Loyalty Incentive Offer',
      effectiveness: 60,
      cost: 25,
      timeframe: '1 week',
      personalizedMessage: 'Special offer just for you - 20% off your next service',
      triggerConditions: ['declining visit frequency', 'medium+ churn risk']
    });

    return strategies;
  }

  private createInterventionPlan(riskAssessment: any, strategies: any[]) {
    return {
      immediateActions: ['Send personalized re-engagement message', 'Schedule follow-up call'],
      shortTermActions: ['Offer loyalty incentive', 'Request feedback on service experience'],
      longTermActions: ['Monitor engagement metrics', 'Adjust service offerings based on feedback'],
      monitoringMetrics: ['Days since last contact', 'Response to outreach', 'Next appointment booking']
    };
  }

  // Additional placeholder methods
  private calculateReferralActivity(client: any, referrals: any[]) {
    return {
      referralsGiven: referrals.length,
      referralsReceived: 0, // Would need to check if client was referred
      referralSuccessRate: referrals.length > 0 ? 85 : 0, // Simplified
      referralValue: referrals.length * 60, // Simplified average value
      lastReferralDate: referrals.length > 0 ? referrals[referrals.length - 1].date : ''
    };
  }

  private analyzeReferralBehavior(client: any, referrals: any[]) {
    return {
      referralTriggers: ['Excellent service experience', 'Special occasions'],
      referralChannels: ['Word of mouth', 'Social media'],
      referralTiming: ['Immediately after service', 'During conversation with friends'],
      referredClientProfiles: {
        averageAge: 35,
        commonServices: ['haircut', 'beard trim'],
        retentionRate: 80
      }
    };
  }

  private identifyReferralOpportunities(client: any, activity: any, behavior: any) {
    const opportunities = [];

    if (activity.referralsGiven === 0) {
      opportunities.push({
        opportunity: 'First Referral Program Introduction',
        probability: 60,
        potentialValue: 120,
        approachStrategy: 'Explain referral benefits during next visit',
        optimalTiming: 'After excellent service delivery'
      });
    }

    return opportunities;
  }

  private determineCurrentJourneyStage(client: any, appointments: any[]): 'prospect' | 'first-time' | 'repeat' | 'loyal' | 'advocate' | 'dormant' {
    if (appointments.length === 0) return 'prospect';
    if (appointments.length === 1) return 'first-time';
    
    const daysSinceLastVisit = Math.floor(
      (Date.now() - new Date(appointments[appointments.length - 1].date).getTime()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysSinceLastVisit > 120) return 'dormant';
    
    const referralCount = this.referrals.filter(ref => ref.referrerId === client.id).length;
    if (referralCount > 0 && appointments.length >= 5) return 'advocate';
    if (appointments.length >= 5) return 'loyal';
    
    return 'repeat';
  }

  private buildStageHistory(client: any, appointments: any[]) {
    // Simplified stage history - in real implementation would track actual stage transitions
    return [
      {
        stage: 'prospect',
        startDate: client.createdAt || appointments[0]?.date || new Date().toISOString(),
        endDate: appointments[0]?.date || new Date().toISOString(),
        duration: 7,
        keyEvents: ['Initial contact', 'First booking'],
        stageValue: 0
      }
    ];
  }

  private analyzeStageProgressions(stageHistory: any[]) {
    return stageHistory.map((stage, index) => {
      if (index === 0) return null;
      const previousStage = stageHistory[index - 1];
      
      return {
        from: previousStage.stage,
        to: stage.stage,
        transitionDate: stage.startDate,
        triggerEvent: stage.keyEvents[0] || 'Unknown',
        transitionProbability: 75 // Simplified
      };
    }).filter(Boolean);
  }

  private developNextStageStrategy(currentStage: string, client: any, appointments: any[]) {
    const strategies: Record<string, any> = {
      'first-time': {
        targetStage: 'repeat',
        requirements: ['Positive service experience', 'Follow-up engagement', 'Second booking within 60 days'],
        estimatedTimeframe: 45,
        keyActions: ['Send follow-up message', 'Offer booking incentive', 'Request feedback'],
        successProbability: 70
      },
      'repeat': {
        targetStage: 'loyal',
        requirements: ['5+ appointments', '6+ months relationship', 'Service consistency'],
        estimatedTimeframe: 120,
        keyActions: ['Introduce loyalty program', 'Expand service offerings', 'Build personal relationship'],
        successProbability: 65
      }
    };

    return strategies[currentStage] || {
      targetStage: 'maintain',
      requirements: ['Continue current engagement'],
      estimatedTimeframe: 0,
      keyActions: ['Monitor satisfaction'],
      successProbability: 80
    };
  }

  private optimizeCurrentStage(currentStage: string, client: any, appointments: any[]) {
    return {
      currentStageHealth: 75, // Simplified health score
      optimizationOpportunities: [
        'Increase service frequency',
        'Expand service variety',
        'Improve satisfaction scores'
      ],
      benchmarkPerformance: {
        industry: 65,
        business: 70,
        personal: 75
      }
    };
  }

  private calculateClientMetrics(client: any, appointments: any[]) {
    const totalSpend = appointments.reduce((sum, apt) => sum + (apt.totalAmount || 0), 0);
    const visitCount = appointments.length;
    const lifespanMonths = this.getClientLifespanMonths(appointments);
    const visitFrequency = lifespanMonths > 0 ? visitCount / lifespanMonths : 0;

    return {
      totalSpend,
      visitCount,
      visitFrequency,
      averageSpend: visitCount > 0 ? totalSpend / visitCount : 0,
      lifespanMonths
    };
  }

  private assignClientToSegment(metrics: any, segments: BehaviorSegmentation[]): BehaviorSegmentation | null {
    for (const segment of segments) {
      const { characteristics } = segment;
      
      if (metrics.visitFrequency >= characteristics.visitFrequency.min &&
          metrics.visitFrequency <= characteristics.visitFrequency.max &&
          metrics.averageSpend >= characteristics.averageSpend.min &&
          metrics.averageSpend <= characteristics.averageSpend.max) {
        return segment;
      }
    }

    return segments[2]; // Default to 'Occasional Visitors'
  }
}

// Export utility functions
export const formatLoyaltyTier = (tier: string): { label: string; color: string } => {
  const tierMapping: Record<string, { label: string; color: string }> = {
    champion: { label: 'Champion', color: 'purple' },
    loyal: { label: 'Loyal', color: 'green' },
    potential: { label: 'Potential', color: 'blue' },
    new: { label: 'New', color: 'cyan' },
    'at-risk': { label: 'At Risk', color: 'orange' },
    lost: { label: 'Lost', color: 'red' }
  };

  return tierMapping[tier] || { label: 'Unknown', color: 'gray' };
};

export const calculateEngagementScore = (
  frequency: number,
  recency: number,
  monetary: number,
  engagement: number
): number => {
  return Math.round((frequency * 0.3 + recency * 0.3 + monetary * 0.25 + engagement * 0.15));
};

export const getRiskLevelColor = (riskLevel: string): string => {
  const colorMap: Record<string, string> = {
    low: 'green',
    medium: 'yellow',
    high: 'orange',
    critical: 'red'
  };
  return colorMap[riskLevel] || 'gray';
};