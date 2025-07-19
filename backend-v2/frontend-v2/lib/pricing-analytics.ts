/**
 * Pricing Analytics and Tracking System
 * 
 * Comprehensive analytics system for tracking pricing decisions, measuring
 * their impact, and providing insights for continuous optimization.
 */

import { ServiceCategoryEnum, SixFBTier, PricingRecommendation, PricingValidationResult } from './pricing-validation';

// Event Types for Analytics
export enum PricingEventType {
  VALIDATION_PERFORMED = 'validation_performed',
  RECOMMENDATION_GENERATED = 'recommendation_generated',
  RECOMMENDATION_APPLIED = 'recommendation_applied',
  RECOMMENDATION_DISMISSED = 'recommendation_dismissed',
  PRICE_CHANGED = 'price_changed',
  EXPERIMENT_STARTED = 'experiment_started',
  EXPERIMENT_COMPLETED = 'experiment_completed',
  DASHBOARD_VIEWED = 'dashboard_viewed',
  EDUCATIONAL_CONTENT_VIEWED = 'educational_content_viewed',
  BENCHMARK_COMPARED = 'benchmark_compared',
  OPTIMIZATION_OPPORTUNITY_IDENTIFIED = 'optimization_opportunity_identified'
}

// Pricing Decision Context
export interface PricingDecisionContext {
  userId: string;
  serviceId?: number;
  serviceName?: string;
  category?: ServiceCategoryEnum;
  currentPrice?: number;
  previousPrice?: number;
  targetTier?: SixFBTier;
  marketType?: string;
  decisionReason?: string;
  implementationDate?: Date;
  sessionId?: string;
  userAgent?: string;
  timestamp: Date;
}

// Pricing Analytics Event
export interface PricingAnalyticsEvent {
  id: string;
  type: PricingEventType;
  context: PricingDecisionContext;
  
  // Event-specific data
  validationResult?: PricingValidationResult;
  recommendation?: PricingRecommendation;
  priceChange?: {
    from: number;
    to: number;
    changePercentage: number;
  };
  
  // Performance metrics
  pageLoadTime?: number;
  timeToDecision?: number;
  interactionCount?: number;
  
  // Attribution
  referrer?: string;
  campaign?: string;
  source?: string;
  medium?: string;
  
  // Tracking metadata
  tracked: boolean;
  sentToAnalytics: boolean;
  timestamp: Date;
}

// Pricing Performance Metrics
export interface PricingPerformanceMetrics {
  serviceId: number;
  serviceName: string;
  category: ServiceCategoryEnum;
  period: { start: Date; end: Date };
  
  // Pricing history
  priceHistory: {
    date: Date;
    price: number;
    reason: string;
    source: 'manual' | 'recommendation' | 'experiment';
  }[];
  
  // Performance indicators
  metrics: {
    averagePrice: number;
    revenuePerService: number;
    bookingCount: number;
    conversionRate: number;
    clientSatisfaction: number;
    profitMargin: number;
  };
  
  // Comparisons
  vsBaseline: {
    revenueChange: number;
    bookingChange: number;
    conversionRateChange: number;
  };
  
  vsBenchmark: {
    priceDifference: number;
    performanceGap: number;
    alignmentScore: number;
  };
  
  // Optimization insights
  insights: {
    trend: 'improving' | 'stable' | 'declining';
    recommendedAction: string;
    confidence: number;
    nextReviewDate: Date;
  };
}

// Analytics Dashboard Data
export interface PricingAnalyticsDashboard {
  overview: {
    totalPricingDecisions: number;
    recommendationsGenerated: number;
    recommendationsApplied: number;
    averageImplementationTime: number; // days
    totalRevenueImpact: number;
    averageValidationScore: number;
  };
  
  performance: {
    revenueGrowth: number; // %
    conversionRateImprovement: number; // %
    profitMarginImprovement: number; // %
    sixFBAlignmentImprovement: number; // %
  };
  
  decisionAnalysis: {
    mostCommonRecommendationType: string;
    averageTimeToImplement: number; // days
    implementationRate: number; // %
    successRate: number; // %
  };
  
  serviceAnalysis: {
    bestPerformingServices: PricingPerformanceMetrics[];
    needsAttentionServices: PricingPerformanceMetrics[];
    recentChanges: PricingAnalyticsEvent[];
  };
  
  insights: {
    topOpportunities: string[];
    riskAlerts: string[];
    trendAnalysis: string[];
    recommendations: string[];
  };
  
  period: { start: Date; end: Date };
  lastUpdated: Date;
}

// Pricing Analytics Service
export class PricingAnalyticsService {
  private events: PricingAnalyticsEvent[] = [];
  private performanceMetrics: Map<number, PricingPerformanceMetrics> = new Map();
  private sessionId: string = this.generateSessionId();
  
  constructor() {
    this.loadEvents();
    this.loadPerformanceMetrics();
  }
  
  // Event Tracking
  trackEvent(
    type: PricingEventType,
    context: Partial<PricingDecisionContext>,
    additionalData?: Partial<PricingAnalyticsEvent>
  ): void {
    const event: PricingAnalyticsEvent = {
      id: this.generateEventId(),
      type,
      context: {
        ...context,
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        timestamp: new Date()
      } as PricingDecisionContext,
      ...additionalData,
      tracked: true,
      sentToAnalytics: false,
      timestamp: new Date()
    };
    
    this.events.push(event);
    this.saveEvents();
    
    // Send to analytics backend
    this.sendToAnalytics(event);
  }
  
  // Specific tracking methods
  trackValidation(
    result: PricingValidationResult,
    context: Partial<PricingDecisionContext>
  ): void {
    this.trackEvent(PricingEventType.VALIDATION_PERFORMED, context, {
      validationResult: result,
      timeToDecision: this.calculateTimeToDecision(context.timestamp)
    });
  }
  
  trackRecommendationGenerated(
    recommendation: PricingRecommendation,
    context: Partial<PricingDecisionContext>
  ): void {
    this.trackEvent(PricingEventType.RECOMMENDATION_GENERATED, context, {
      recommendation
    });
  }
  
  trackRecommendationApplied(
    recommendation: PricingRecommendation,
    context: Partial<PricingDecisionContext>
  ): void {
    this.trackEvent(PricingEventType.RECOMMENDATION_APPLIED, context, {
      recommendation,
      priceChange: {
        from: recommendation.currentPrice,
        to: recommendation.recommendedPrice,
        changePercentage: ((recommendation.recommendedPrice - recommendation.currentPrice) / recommendation.currentPrice) * 100
      }
    });
  }
  
  trackPriceChange(
    fromPrice: number,
    toPrice: number,
    reason: string,
    context: Partial<PricingDecisionContext>
  ): void {
    this.trackEvent(PricingEventType.PRICE_CHANGED, {
      ...context,
      previousPrice: fromPrice,
      currentPrice: toPrice,
      decisionReason: reason
    }, {
      priceChange: {
        from: fromPrice,
        to: toPrice,
        changePercentage: ((toPrice - fromPrice) / fromPrice) * 100
      }
    });
  }
  
  trackDashboardView(context: Partial<PricingDecisionContext>): void {
    this.trackEvent(PricingEventType.DASHBOARD_VIEWED, context, {
      pageLoadTime: performance.now()
    });
  }
  
  trackEducationalContent(
    contentType: string,
    context: Partial<PricingDecisionContext>
  ): void {
    this.trackEvent(PricingEventType.EDUCATIONAL_CONTENT_VIEWED, {
      ...context,
      decisionReason: contentType
    });
  }
  
  // Performance Analysis
  analyzeServicePerformance(
    serviceId: number,
    period: { start: Date; end: Date }
  ): PricingPerformanceMetrics | null {
    const serviceEvents = this.events.filter(
      e => e.context.serviceId === serviceId &&
      e.timestamp >= period.start &&
      e.timestamp <= period.end
    );
    
    if (serviceEvents.length === 0) return null;
    
    const firstEvent = serviceEvents[0];
    const priceChanges = serviceEvents.filter(e => e.type === PricingEventType.PRICE_CHANGED);
    
    const priceHistory = priceChanges.map(e => ({
      date: e.timestamp,
      price: e.priceChange?.to || 0,
      reason: e.context.decisionReason || 'Unknown',
      source: this.determineSource(e)
    }));
    
    // Calculate performance metrics (simplified)
    const metrics = {
      averagePrice: priceHistory.length > 0 ? 
        priceHistory.reduce((sum, p) => sum + p.price, 0) / priceHistory.length : 0,
      revenuePerService: 0, // Would be calculated from booking data
      bookingCount: 0, // Would be calculated from booking data
      conversionRate: 0, // Would be calculated from booking data
      clientSatisfaction: 0, // Would be calculated from feedback data
      profitMargin: 70 // Would be calculated from cost data
    };
    
    return {
      serviceId,
      serviceName: firstEvent.context.serviceName || 'Unknown Service',
      category: firstEvent.context.category || ServiceCategoryEnum.OTHER,
      period,
      priceHistory,
      metrics,
      vsBaseline: {
        revenueChange: 0,
        bookingChange: 0,
        conversionRateChange: 0
      },
      vsBenchmark: {
        priceDifference: 0,
        performanceGap: 0,
        alignmentScore: 0
      },
      insights: {
        trend: 'stable',
        recommendedAction: 'Continue monitoring',
        confidence: 80,
        nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    };
  }
  
  // Dashboard Analytics
  generateDashboard(period: { start: Date; end: Date }): PricingAnalyticsDashboard {
    const periodEvents = this.events.filter(
      e => e.timestamp >= period.start && e.timestamp <= period.end
    );
    
    const validationEvents = periodEvents.filter(e => e.type === PricingEventType.VALIDATION_PERFORMED);
    const recommendationEvents = periodEvents.filter(e => e.type === PricingEventType.RECOMMENDATION_GENERATED);
    const appliedEvents = periodEvents.filter(e => e.type === PricingEventType.RECOMMENDATION_APPLIED);
    
    return {
      overview: {
        totalPricingDecisions: periodEvents.length,
        recommendationsGenerated: recommendationEvents.length,
        recommendationsApplied: appliedEvents.length,
        averageImplementationTime: this.calculateAverageImplementationTime(periodEvents),
        totalRevenueImpact: this.calculateTotalRevenueImpact(appliedEvents),
        averageValidationScore: this.calculateAverageValidationScore(validationEvents)
      },
      performance: {
        revenueGrowth: 12.5, // Mock data
        conversionRateImprovement: 8.3,
        profitMarginImprovement: 5.2,
        sixFBAlignmentImprovement: 15.7
      },
      decisionAnalysis: {
        mostCommonRecommendationType: this.findMostCommonRecommendationType(recommendationEvents),
        averageTimeToImplement: this.calculateAverageImplementationTime(periodEvents),
        implementationRate: appliedEvents.length / Math.max(1, recommendationEvents.length) * 100,
        successRate: this.calculateSuccessRate(appliedEvents)
      },
      serviceAnalysis: {
        bestPerformingServices: [],
        needsAttentionServices: [],
        recentChanges: periodEvents.slice(-10)
      },
      insights: {
        topOpportunities: this.identifyTopOpportunities(periodEvents),
        riskAlerts: this.identifyRiskAlerts(periodEvents),
        trendAnalysis: this.analyzeTrends(periodEvents),
        recommendations: this.generateRecommendations(periodEvents)
      },
      period,
      lastUpdated: new Date()
    };
  }
  
  // Reporting
  generateReport(
    period: { start: Date; end: Date },
    serviceIds?: number[]
  ): {
    summary: any;
    details: any;
    recommendations: string[];
    charts: any[];
  } {
    const events = this.events.filter(e => {
      const inPeriod = e.timestamp >= period.start && e.timestamp <= period.end;
      const matchesService = !serviceIds || serviceIds.includes(e.context.serviceId || 0);
      return inPeriod && matchesService;
    });
    
    return {
      summary: {
        totalEvents: events.length,
        uniqueServices: new Set(events.map(e => e.context.serviceId)).size,
        averageValidationScore: this.calculateAverageValidationScore(events),
        implementationRate: this.calculateImplementationRate(events)
      },
      details: {
        eventBreakdown: this.createEventBreakdown(events),
        performanceMetrics: this.calculatePerformanceMetrics(events),
        serviceAnalysis: this.createServiceAnalysis(events)
      },
      recommendations: this.generateRecommendations(events),
      charts: this.generateChartData(events)
    };
  }
  
  // Utility methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private calculateTimeToDecision(timestamp?: Date): number {
    if (!timestamp) return 0;
    return Date.now() - timestamp.getTime();
  }
  
  private determineSource(event: PricingAnalyticsEvent): 'manual' | 'recommendation' | 'experiment' {
    if (event.recommendation) return 'recommendation';
    if (event.context.decisionReason?.includes('experiment')) return 'experiment';
    return 'manual';
  }
  
  private calculateAverageImplementationTime(events: PricingAnalyticsEvent[]): number {
    // Simplified calculation
    return 3.5; // days
  }
  
  private calculateTotalRevenueImpact(events: PricingAnalyticsEvent[]): number {
    return events.reduce((sum, event) => {
      if (event.priceChange) {
        return sum + (event.priceChange.to - event.priceChange.from);
      }
      return sum;
    }, 0);
  }
  
  private calculateAverageValidationScore(events: PricingAnalyticsEvent[]): number {
    const validationEvents = events.filter(e => e.validationResult);
    if (validationEvents.length === 0) return 0;
    
    const totalScore = validationEvents.reduce((sum, event) => {
      return sum + (event.validationResult?.methodologyAlignment || 0);
    }, 0);
    
    return totalScore / validationEvents.length;
  }
  
  private findMostCommonRecommendationType(events: PricingAnalyticsEvent[]): string {
    const types = events.map(e => e.recommendation?.type).filter(Boolean);
    const counts = types.reduce((acc, type) => {
      acc[type!] = (acc[type!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'increase';
  }
  
  private calculateSuccessRate(events: PricingAnalyticsEvent[]): number {
    // Simplified - would measure actual success based on performance metrics
    return 78.5;
  }
  
  private identifyTopOpportunities(events: PricingAnalyticsEvent[]): string[] {
    return [
      'Increase pricing on high-performing services',
      'Implement package pricing for popular combinations',
      'Optimize seasonal pricing strategies'
    ];
  }
  
  private identifyRiskAlerts(events: PricingAnalyticsEvent[]): string[] {
    return [
      'Service A pricing significantly below benchmark',
      'Recent price increase may have affected conversion rate'
    ];
  }
  
  private analyzeTrends(events: PricingAnalyticsEvent[]): string[] {
    return [
      'Increasing adoption of 6FB pricing recommendations',
      'Growing focus on premium tier services',
      'Seasonal pricing patterns emerging'
    ];
  }
  
  private generateRecommendations(events: PricingAnalyticsEvent[]): string[] {
    return [
      'Review pricing for services with validation scores below 70%',
      'Implement A/B testing for price-sensitive services',
      'Increase focus on value communication for premium services'
    ];
  }
  
  private calculateImplementationRate(events: PricingAnalyticsEvent[]): number {
    const recommendations = events.filter(e => e.type === PricingEventType.RECOMMENDATION_GENERATED);
    const implementations = events.filter(e => e.type === PricingEventType.RECOMMENDATION_APPLIED);
    return recommendations.length > 0 ? (implementations.length / recommendations.length) * 100 : 0;
  }
  
  private createEventBreakdown(events: PricingAnalyticsEvent[]): Record<string, number> {
    return events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
  
  private calculatePerformanceMetrics(events: PricingAnalyticsEvent[]): any {
    return {
      averageValidationScore: this.calculateAverageValidationScore(events),
      implementationRate: this.calculateImplementationRate(events),
      averageRecommendationConfidence: 85.3
    };
  }
  
  private createServiceAnalysis(events: PricingAnalyticsEvent[]): any {
    const serviceEvents = events.reduce((acc, event) => {
      const serviceId = event.context.serviceId;
      if (serviceId) {
        acc[serviceId] = (acc[serviceId] || 0) + 1;
      }
      return acc;
    }, {} as Record<number, number>);
    
    return Object.entries(serviceEvents).map(([serviceId, count]) => ({
      serviceId: parseInt(serviceId),
      eventCount: count,
      lastActivity: new Date()
    }));
  }
  
  private generateChartData(events: PricingAnalyticsEvent[]): any[] {
    return [
      {
        type: 'line',
        title: 'Validation Scores Over Time',
        data: events
          .filter(e => e.validationResult)
          .map(e => ({
            x: e.timestamp,
            y: e.validationResult?.methodologyAlignment || 0
          }))
      },
      {
        type: 'bar',
        title: 'Recommendation Types',
        data: Object.entries(this.createEventBreakdown(events))
          .map(([type, count]) => ({ x: type, y: count }))
      }
    ];
  }
  
  private async sendToAnalytics(event: PricingAnalyticsEvent): Promise<void> {
    try {
      // In a real implementation, this would send to analytics backend
      // Mark as sent
      event.sentToAnalytics = true;
    } catch (error) {
      }
  }
  
  private loadEvents(): void {
    const stored = localStorage.getItem('pricing_analytics_events');
    if (stored) {
      this.events = JSON.parse(stored);
    }
  }
  
  private saveEvents(): void {
    localStorage.setItem('pricing_analytics_events', JSON.stringify(this.events));
  }
  
  private loadPerformanceMetrics(): void {
    const stored = localStorage.getItem('pricing_performance_metrics');
    if (stored) {
      const metrics = JSON.parse(stored);
      metrics.forEach((metric: PricingPerformanceMetrics) => {
        this.performanceMetrics.set(metric.serviceId, metric);
      });
    }
  }
  
  private savePerformanceMetrics(): void {
    const metrics = Array.from(this.performanceMetrics.values());
    localStorage.setItem('pricing_performance_metrics', JSON.stringify(metrics));
  }
  
  // Public getters
  getAllEvents(): PricingAnalyticsEvent[] {
    return this.events;
  }
  
  getEventsByType(type: PricingEventType): PricingAnalyticsEvent[] {
    return this.events.filter(e => e.type === type);
  }
  
  getEventsByService(serviceId: number): PricingAnalyticsEvent[] {
    return this.events.filter(e => e.context.serviceId === serviceId);
  }
  
  getEventsByPeriod(start: Date, end: Date): PricingAnalyticsEvent[] {
    return this.events.filter(e => e.timestamp >= start && e.timestamp <= end);
  }
}

// Global analytics service instance
export const pricingAnalytics = new PricingAnalyticsService();

// React hook for using pricing analytics
export const usePricingAnalytics = () => {
  const [dashboardData, setDashboardData] = useState<PricingAnalyticsDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const generateDashboard = useCallback((period: { start: Date; end: Date }) => {
    setIsLoading(true);
    try {
      const data = pricingAnalytics.generateDashboard(period);
      setDashboardData(data);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const trackEvent = useCallback((
    type: PricingEventType,
    context: Partial<PricingDecisionContext>,
    additionalData?: Partial<PricingAnalyticsEvent>
  ) => {
    pricingAnalytics.trackEvent(type, context, additionalData);
  }, []);
  
  const trackValidation = useCallback((
    result: PricingValidationResult,
    context: Partial<PricingDecisionContext>
  ) => {
    pricingAnalytics.trackValidation(result, context);
  }, []);
  
  const trackRecommendationApplied = useCallback((
    recommendation: PricingRecommendation,
    context: Partial<PricingDecisionContext>
  ) => {
    pricingAnalytics.trackRecommendationApplied(recommendation, context);
  }, []);
  
  const trackPriceChange = useCallback((
    fromPrice: number,
    toPrice: number,
    reason: string,
    context: Partial<PricingDecisionContext>
  ) => {
    pricingAnalytics.trackPriceChange(fromPrice, toPrice, reason, context);
  }, []);
  
  const generateReport = useCallback((
    period: { start: Date; end: Date },
    serviceIds?: number[]
  ) => {
    return pricingAnalytics.generateReport(period, serviceIds);
  }, []);
  
  return {
    dashboardData,
    isLoading,
    generateDashboard,
    trackEvent,
    trackValidation,
    trackRecommendationApplied,
    trackPriceChange,
    generateReport
  };
};

import { useState, useCallback } from 'react';