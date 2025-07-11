/**
 * Six Figure Barber Pricing Recommendation Engine
 * 
 * Advanced pricing optimization engine that analyzes market data, service performance,
 * and 6FB methodology to provide intelligent pricing recommendations.
 */

import {
  SixFBPricingBenchmark,
  PricingRecommendation,
  OptimizationOpportunity,
  MarketData,
  ProfitabilityMetrics,
  ServiceCategoryEnum,
  SixFBTier,
  MarketType,
  PricingStrategy,
  RevenueImpact,
  PricingValidationRequest,
  PricingAnalysis,
  DEFAULT_6FB_BENCHMARKS
} from './pricing-validation';

// Engine Configuration
export interface PricingEngineConfig {
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  marketType: MarketType;
  targetTier: SixFBTier;
  profitMarginTarget: number;
  clientRetentionPriority: number; // 0-100
  revenuePriority: number; // 0-100
  competitivePositioning: 'leader' | 'follower' | 'premium';
  riskTolerance: 'low' | 'medium' | 'high';
}

// Performance Metrics
export interface ServicePerformanceMetrics {
  serviceId: number;
  bookingRate: number;
  clientSatisfaction: number;
  repeatBookingRate: number;
  averageRevenue: number;
  profitMargin: number;
  cancellationRate: number;
  noShowRate: number;
  upsellRate: number;
  seasonalityIndex: number;
}

// Market Intelligence
export interface MarketIntelligence {
  competitorPricing: { [key in ServiceCategoryEnum]?: number[] };
  demandTrends: { [key in ServiceCategoryEnum]?: number };
  priceElasticity: { [key in ServiceCategoryEnum]?: number };
  customerSegments: {
    segment: string;
    priceThreshold: number;
    volumePercentage: number;
  }[];
  seasonalMultipliers: { [month: string]: number };
  economicFactors: {
    inflation: number;
    unemploymentRate: number;
    disposableIncome: number;
  };
}

// Pricing Engine Class
export class SixFBPricingEngine {
  private config: PricingEngineConfig;
  private benchmarks: SixFBPricingBenchmark[];
  private marketIntelligence: MarketIntelligence;

  constructor(config: PricingEngineConfig, marketIntelligence?: MarketIntelligence) {
    this.config = config;
    this.benchmarks = DEFAULT_6FB_BENCHMARKS;
    this.marketIntelligence = marketIntelligence || this.getDefaultMarketIntelligence();
  }

  /**
   * Generate comprehensive pricing recommendations for a service
   */
  public generateRecommendations(
    request: PricingValidationRequest,
    performance: ServicePerformanceMetrics,
    currentMetrics: ProfitabilityMetrics
  ): PricingRecommendation[] {
    const recommendations: PricingRecommendation[] = [];
    const benchmark = this.getBenchmarkForService(request.category, request.targetTier || this.config.targetTier);

    if (!benchmark) {
      return recommendations;
    }

    // 1. Benchmark-based recommendations
    const benchmarkRec = this.generateBenchmarkRecommendation(request, benchmark);
    if (benchmarkRec) recommendations.push(benchmarkRec);

    // 2. Performance-based recommendations
    const performanceRec = this.generatePerformanceRecommendation(request, performance, benchmark);
    if (performanceRec) recommendations.push(performanceRec);

    // 3. Market-based recommendations
    const marketRec = this.generateMarketRecommendation(request, benchmark);
    if (marketRec) recommendations.push(marketRec);

    // 4. Profitability-based recommendations
    const profitRec = this.generateProfitabilityRecommendation(request, currentMetrics, benchmark);
    if (profitRec) recommendations.push(profitRec);

    // 5. Strategic recommendations
    const strategicRec = this.generateStrategicRecommendation(request, performance, benchmark);
    if (strategicRec) recommendations.push(strategicRec);

    // Sort by confidence and expected impact
    return recommendations.sort((a, b) => {
      const scoreA = a.confidence * (Math.abs(a.expectedImpact.revenueChange) / 100);
      const scoreB = b.confidence * (Math.abs(b.expectedImpact.revenueChange) / 100);
      return scoreB - scoreA;
    });
  }

  /**
   * Generate optimization opportunities
   */
  public generateOptimizationOpportunities(
    request: PricingValidationRequest,
    performance: ServicePerformanceMetrics,
    currentMetrics: ProfitabilityMetrics
  ): OptimizationOpportunity[] {
    const opportunities: OptimizationOpportunity[] = [];
    const benchmark = this.getBenchmarkForService(request.category, request.targetTier || this.config.targetTier);

    if (!benchmark) return opportunities;

    // 1. Pricing optimization
    if (this.shouldOptimizePricing(request, performance, benchmark)) {
      opportunities.push({
        type: 'pricing',
        priority: this.calculatePricingPriority(request, performance, benchmark),
        description: this.generatePricingOptimizationDescription(request, performance, benchmark),
        implementation: this.generatePricingImplementationPlan(request, performance, benchmark),
        expectedRevenue: this.calculateExpectedRevenue(request, performance, benchmark),
        effortLevel: this.calculateEffortLevel('pricing', request, performance),
        timeframe: this.calculateTimeframe('pricing', request, performance)
      });
    }

    // 2. Packaging opportunities
    if (this.shouldCreatePackages(request, performance)) {
      opportunities.push({
        type: 'packaging',
        priority: 'high',
        description: 'Bundle services to increase average transaction value and client convenience.',
        implementation: 'Create complementary service packages with 10-15% discount to individual totals.',
        expectedRevenue: request.basePrice * 0.4,
        effortLevel: 'medium',
        timeframe: '4-6 weeks'
      });
    }

    // 3. Positioning opportunities
    if (this.shouldRepositionService(request, performance, benchmark)) {
      opportunities.push({
        type: 'positioning',
        priority: this.calculateRepositioningPriority(request, performance, benchmark),
        description: this.generateRepositioningDescription(request, performance, benchmark),
        implementation: this.generateRepositioningPlan(request, performance, benchmark),
        expectedRevenue: this.calculateRepositioningRevenue(request, performance, benchmark),
        effortLevel: 'high',
        timeframe: '8-12 weeks'
      });
    }

    // 4. Upselling opportunities
    if (this.shouldFocusOnUpselling(request, performance)) {
      opportunities.push({
        type: 'upsell',
        priority: 'medium',
        description: 'Implement systematic upselling to increase revenue per client.',
        implementation: 'Train staff on consultative selling and create upsell menus.',
        expectedRevenue: request.basePrice * 0.25,
        effortLevel: 'low',
        timeframe: '2-4 weeks'
      });
    }

    // 5. Duration optimization
    if (this.shouldOptimizeDuration(request, performance, benchmark)) {
      opportunities.push({
        type: 'duration',
        priority: 'medium',
        description: 'Optimize service duration for better revenue per hour.',
        implementation: 'Adjust service duration and pricing to maximize hourly revenue.',
        expectedRevenue: this.calculateDurationOptimizationRevenue(request, performance, benchmark),
        effortLevel: 'medium',
        timeframe: '2-3 weeks'
      });
    }

    return opportunities.sort((a, b) => {
      const priorityScore = { high: 3, medium: 2, low: 1 };
      return priorityScore[b.priority] - priorityScore[a.priority];
    });
  }

  /**
   * Analyze market positioning
   */
  public analyzeMarketPosition(
    request: PricingValidationRequest,
    performance: ServicePerformanceMetrics
  ): {
    position: 'premium' | 'competitive' | 'value';
    percentile: number;
    competitiveGap: number;
    recommendations: string[];
  } {
    const competitorPrices = this.marketIntelligence.competitorPricing[request.category] || [];
    const averageMarketPrice = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
    
    const percentile = this.calculatePercentile(request.basePrice, competitorPrices);
    const competitiveGap = request.basePrice - averageMarketPrice;
    
    let position: 'premium' | 'competitive' | 'value';
    if (percentile >= 75) position = 'premium';
    else if (percentile >= 25) position = 'competitive';
    else position = 'value';

    const recommendations = this.generateMarketPositionRecommendations(
      position,
      percentile,
      competitiveGap,
      request,
      performance
    );

    return {
      position,
      percentile,
      competitiveGap,
      recommendations
    };
  }

  /**
   * Calculate optimal pricing range
   */
  public calculateOptimalPricingRange(
    request: PricingValidationRequest,
    performance: ServicePerformanceMetrics
  ): {
    optimal: number;
    range: { min: number; max: number };
    confidence: number;
    reasoning: string;
  } {
    const benchmark = this.getBenchmarkForService(request.category, request.targetTier || this.config.targetTier);
    if (!benchmark) {
      return {
        optimal: request.basePrice,
        range: { min: request.basePrice * 0.8, max: request.basePrice * 1.2 },
        confidence: 0,
        reasoning: 'No benchmark available'
      };
    }

    // Calculate optimal price based on multiple factors
    const factors = [
      this.calculateBenchmarkFactor(request, benchmark),
      this.calculatePerformanceFactor(performance),
      this.calculateMarketFactor(request),
      this.calculateProfitabilityFactor(performance),
      this.calculateStrategicFactor(request, performance)
    ];

    const weightedAverage = factors.reduce((sum, factor) => sum + factor.value * factor.weight, 0);
    const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);
    const optimal = weightedAverage / totalWeight;

    const confidence = this.calculateConfidence(factors);
    const range = this.calculatePricingRange(optimal, confidence, benchmark);

    return {
      optimal,
      range,
      confidence,
      reasoning: this.generateOptimalPricingReasoning(factors, optimal, confidence)
    };
  }

  // Private helper methods

  private getBenchmarkForService(category: ServiceCategoryEnum, tier: SixFBTier): SixFBPricingBenchmark | null {
    return this.benchmarks.find(b => b.category === category && b.tier === tier) || null;
  }

  private generateBenchmarkRecommendation(
    request: PricingValidationRequest,
    benchmark: SixFBPricingBenchmark
  ): PricingRecommendation | null {
    const deviation = Math.abs(request.basePrice - benchmark.suggestedBasePrice) / benchmark.suggestedBasePrice;
    
    if (deviation < 0.1) return null; // Already aligned

    const type = request.basePrice < benchmark.suggestedBasePrice ? 'increase' : 'decrease';
    const recommendedPrice = benchmark.suggestedBasePrice;
    const expectedImpact = this.calculateBenchmarkImpact(request.basePrice, recommendedPrice, benchmark);

    return {
      type,
      currentPrice: request.basePrice,
      recommendedPrice,
      reasoning: `Align with 6FB methodology benchmark for ${benchmark.tier} tier ${benchmark.category} services.`,
      expectedImpact,
      implementationStrategy: this.generateBenchmarkImplementationStrategy(type, deviation),
      timeline: deviation > 0.3 ? '6-8 weeks' : '2-4 weeks',
      riskLevel: deviation > 0.5 ? 'high' : 'medium',
      confidence: Math.max(60, 100 - deviation * 100)
    };
  }

  private generatePerformanceRecommendation(
    request: PricingValidationRequest,
    performance: ServicePerformanceMetrics,
    benchmark: SixFBPricingBenchmark
  ): PricingRecommendation | null {
    // High performance services can command premium pricing
    if (performance.clientSatisfaction > 85 && performance.repeatBookingRate > 70) {
      const premiumMultiplier = 1.15;
      const recommendedPrice = Math.min(request.basePrice * premiumMultiplier, benchmark.suggestedMaxPrice);
      
      if (recommendedPrice > request.basePrice) {
        return {
          type: 'increase',
          currentPrice: request.basePrice,
          recommendedPrice,
          reasoning: 'High client satisfaction and repeat booking rates support premium pricing.',
          expectedImpact: {
            revenueChange: ((recommendedPrice - request.basePrice) / request.basePrice) * 100,
            demandChange: -5,
            profitMarginChange: 10
          },
          implementationStrategy: 'Gradually increase pricing while maintaining service quality.',
          timeline: '4-6 weeks',
          riskLevel: 'low',
          confidence: 85
        };
      }
    }

    // Poor performance may require price reduction or service improvement
    if (performance.clientSatisfaction < 60 || performance.bookingRate < 40) {
      return {
        type: 'restructure',
        currentPrice: request.basePrice,
        recommendedPrice: request.basePrice * 0.9,
        reasoning: 'Performance metrics suggest price reduction or service improvement needed.',
        expectedImpact: {
          revenueChange: -10,
          demandChange: 25,
          profitMarginChange: -5
        },
        implementationStrategy: 'Focus on service quality improvement before pricing adjustments.',
        timeline: '8-12 weeks',
        riskLevel: 'high',
        confidence: 70
      };
    }

    return null;
  }

  private generateMarketRecommendation(
    request: PricingValidationRequest,
    benchmark: SixFBPricingBenchmark
  ): PricingRecommendation | null {
    const marketTrend = this.marketIntelligence.demandTrends[request.category] || 0;
    const elasticity = this.marketIntelligence.priceElasticity[request.category] || 1;
    
    // Strong market demand supports price increases
    if (marketTrend > 0.1 && elasticity < 0.8) {
      const adjustmentFactor = 1 + (marketTrend * 0.5);
      const recommendedPrice = Math.min(request.basePrice * adjustmentFactor, benchmark.suggestedMaxPrice);
      
      if (recommendedPrice > request.basePrice) {
        return {
          type: 'increase',
          currentPrice: request.basePrice,
          recommendedPrice,
          reasoning: 'Strong market demand and low price elasticity support price increases.',
          expectedImpact: {
            revenueChange: ((recommendedPrice - request.basePrice) / request.basePrice) * 100,
            demandChange: -elasticity * 10,
            profitMarginChange: 12
          },
          implementationStrategy: 'Implement gradual price increases to test market response.',
          timeline: '6-8 weeks',
          riskLevel: 'medium',
          confidence: 75
        };
      }
    }

    return null;
  }

  private generateProfitabilityRecommendation(
    request: PricingValidationRequest,
    metrics: ProfitabilityMetrics,
    benchmark: SixFBPricingBenchmark
  ): PricingRecommendation | null {
    if (metrics.currentMargin < benchmark.profitMarginTarget) {
      const requiredPrice = metrics.costPerService / (1 - benchmark.profitMarginTarget / 100);
      
      if (requiredPrice > request.basePrice) {
        return {
          type: 'increase',
          currentPrice: request.basePrice,
          recommendedPrice: requiredPrice,
          reasoning: `Increase price to achieve target profit margin of ${benchmark.profitMarginTarget}%.`,
          expectedImpact: {
            revenueChange: ((requiredPrice - request.basePrice) / request.basePrice) * 100,
            demandChange: -10,
            profitMarginChange: benchmark.profitMarginTarget - metrics.currentMargin
          },
          implementationStrategy: 'Implement price increase with clear value communication.',
          timeline: '4-6 weeks',
          riskLevel: 'medium',
          confidence: 80
        };
      }
    }

    return null;
  }

  private generateStrategicRecommendation(
    request: PricingValidationRequest,
    performance: ServicePerformanceMetrics,
    benchmark: SixFBPricingBenchmark
  ): PricingRecommendation | null {
    // Strategic positioning based on business goals
    if (this.config.competitivePositioning === 'premium' && request.basePrice < benchmark.suggestedMaxPrice) {
      return {
        type: 'increase',
        currentPrice: request.basePrice,
        recommendedPrice: benchmark.suggestedMaxPrice,
        reasoning: 'Premium positioning strategy supports higher pricing.',
        expectedImpact: {
          revenueChange: ((benchmark.suggestedMaxPrice - request.basePrice) / request.basePrice) * 100,
          demandChange: -15,
          profitMarginChange: 15
        },
        implementationStrategy: 'Enhance service quality and brand positioning to support premium pricing.',
        timeline: '8-12 weeks',
        riskLevel: 'high',
        confidence: 65
      };
    }

    return null;
  }

  // Additional helper methods would continue here...
  // For brevity, I'll include placeholders for the remaining methods

  private shouldOptimizePricing(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): boolean {
    return Math.abs(request.basePrice - benchmark.suggestedBasePrice) / benchmark.suggestedBasePrice > 0.1;
  }

  private shouldCreatePackages(request: PricingValidationRequest, performance: ServicePerformanceMetrics): boolean {
    return !request.isPackage && performance.bookingRate > 50;
  }

  private shouldRepositionService(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): boolean {
    return performance.clientSatisfaction > 80 && request.basePrice < benchmark.suggestedMaxPrice;
  }

  private shouldFocusOnUpselling(request: PricingValidationRequest, performance: ServicePerformanceMetrics): boolean {
    return performance.upsellRate < 20 && performance.clientSatisfaction > 70;
  }

  private shouldOptimizeDuration(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): boolean {
    return Math.abs(request.duration - benchmark.durationMinutes) > 15;
  }

  private calculatePricingPriority(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): 'high' | 'medium' | 'low' {
    const deviation = Math.abs(request.basePrice - benchmark.suggestedBasePrice) / benchmark.suggestedBasePrice;
    if (deviation > 0.3) return 'high';
    if (deviation > 0.15) return 'medium';
    return 'low';
  }

  private calculateExpectedRevenue(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): number {
    return (benchmark.suggestedBasePrice - request.basePrice) * 0.8; // Simplified calculation
  }

  private calculateEffortLevel(type: string, request: PricingValidationRequest, performance: ServicePerformanceMetrics): 'low' | 'medium' | 'high' {
    return 'medium'; // Simplified
  }

  private calculateTimeframe(type: string, request: PricingValidationRequest, performance: ServicePerformanceMetrics): string {
    return '4-6 weeks'; // Simplified
  }

  private calculateBenchmarkImpact(currentPrice: number, recommendedPrice: number, benchmark: SixFBPricingBenchmark): {
    revenueChange: number;
    demandChange: number;
    profitMarginChange: number;
  } {
    const revenueChange = ((recommendedPrice - currentPrice) / currentPrice) * 100;
    return {
      revenueChange,
      demandChange: -revenueChange * 0.3, // Simplified elasticity
      profitMarginChange: revenueChange * 0.7
    };
  }

  private generateBenchmarkImplementationStrategy(type: 'increase' | 'decrease', deviation: number): string {
    if (type === 'increase') {
      return deviation > 0.3 ? 'Implement gradual price increases over 2-3 months' : 'Implement price increase with improved service communication';
    }
    return 'Review service offering and consider value enhancements';
  }

  private calculatePercentile(price: number, competitorPrices: number[]): number {
    const sorted = competitorPrices.sort((a, b) => a - b);
    const index = sorted.findIndex(p => p >= price);
    return index === -1 ? 100 : (index / sorted.length) * 100;
  }

  private generateMarketPositionRecommendations(
    position: 'premium' | 'competitive' | 'value',
    percentile: number,
    competitiveGap: number,
    request: PricingValidationRequest,
    performance: ServicePerformanceMetrics
  ): string[] {
    const recommendations: string[] = [];
    
    if (position === 'premium') {
      recommendations.push('Justify premium pricing with exceptional service quality');
      recommendations.push('Focus on building strong client relationships');
    } else if (position === 'value') {
      recommendations.push('Consider opportunities to increase pricing');
      recommendations.push('Evaluate service enhancements to support higher prices');
    } else {
      recommendations.push('Monitor competitive positioning regularly');
      recommendations.push('Look for differentiation opportunities');
    }
    
    return recommendations;
  }

  private calculateBenchmarkFactor(request: PricingValidationRequest, benchmark: SixFBPricingBenchmark): { value: number; weight: number } {
    return { value: benchmark.suggestedBasePrice, weight: 0.3 };
  }

  private calculatePerformanceFactor(performance: ServicePerformanceMetrics): { value: number; weight: number } {
    const performanceScore = (performance.clientSatisfaction + performance.bookingRate) / 2;
    return { value: performanceScore, weight: 0.25 };
  }

  private calculateMarketFactor(request: PricingValidationRequest): { value: number; weight: number } {
    const competitorPrices = this.marketIntelligence.competitorPricing[request.category] || [];
    const averagePrice = competitorPrices.reduce((a, b) => a + b, 0) / competitorPrices.length;
    return { value: averagePrice || request.basePrice, weight: 0.2 };
  }

  private calculateProfitabilityFactor(performance: ServicePerformanceMetrics): { value: number; weight: number } {
    return { value: performance.profitMargin, weight: 0.15 };
  }

  private calculateStrategicFactor(request: PricingValidationRequest, performance: ServicePerformanceMetrics): { value: number; weight: number } {
    // Strategic adjustment based on business goals
    let adjustment = 1.0;
    if (this.config.competitivePositioning === 'premium') adjustment = 1.1;
    if (this.config.competitivePositioning === 'value') adjustment = 0.9;
    
    return { value: request.basePrice * adjustment, weight: 0.1 };
  }

  private calculateConfidence(factors: { value: number; weight: number }[]): number {
    // Calculate confidence based on factor consistency
    const values = factors.map(f => f.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Lower standard deviation = higher confidence
    const normalizedStdDev = standardDeviation / mean;
    return Math.max(50, 100 - normalizedStdDev * 100);
  }

  private calculatePricingRange(optimal: number, confidence: number, benchmark: SixFBPricingBenchmark): { min: number; max: number } {
    const rangeFactor = (100 - confidence) / 100 * 0.2; // Max 20% range
    const min = Math.max(optimal * (1 - rangeFactor), benchmark.suggestedMinPrice);
    const max = Math.min(optimal * (1 + rangeFactor), benchmark.suggestedMaxPrice);
    
    return { min, max };
  }

  private generateOptimalPricingReasoning(factors: { value: number; weight: number }[], optimal: number, confidence: number): string {
    return `Optimal pricing calculated based on 6FB methodology (${Math.round(factors[0].weight * 100)}%), performance metrics (${Math.round(factors[1].weight * 100)}%), and market analysis (${Math.round(factors[2].weight * 100)}%). Confidence: ${Math.round(confidence)}%`;
  }

  private getDefaultMarketIntelligence(): MarketIntelligence {
    return {
      competitorPricing: {
        [ServiceCategoryEnum.HAIRCUT]: [25, 35, 45, 55, 65],
        [ServiceCategoryEnum.BEARD]: [15, 25, 35, 45],
        [ServiceCategoryEnum.SHAVE]: [35, 45, 55, 75],
        [ServiceCategoryEnum.PACKAGE]: [60, 80, 100, 120]
      },
      demandTrends: {
        [ServiceCategoryEnum.HAIRCUT]: 0.05,
        [ServiceCategoryEnum.BEARD]: 0.08,
        [ServiceCategoryEnum.SHAVE]: 0.03,
        [ServiceCategoryEnum.PACKAGE]: 0.12
      },
      priceElasticity: {
        [ServiceCategoryEnum.HAIRCUT]: 0.8,
        [ServiceCategoryEnum.BEARD]: 0.7,
        [ServiceCategoryEnum.SHAVE]: 0.6,
        [ServiceCategoryEnum.PACKAGE]: 0.5
      },
      customerSegments: [
        { segment: 'Budget', priceThreshold: 30, volumePercentage: 25 },
        { segment: 'Standard', priceThreshold: 60, volumePercentage: 50 },
        { segment: 'Premium', priceThreshold: 100, volumePercentage: 25 }
      ],
      seasonalMultipliers: {
        'January': 0.9,
        'February': 0.8,
        'March': 1.0,
        'April': 1.1,
        'May': 1.2,
        'June': 1.1,
        'July': 1.0,
        'August': 0.9,
        'September': 1.0,
        'October': 1.1,
        'November': 1.2,
        'December': 1.3
      },
      economicFactors: {
        inflation: 0.03,
        unemploymentRate: 0.05,
        disposableIncome: 45000
      }
    };
  }

  // Placeholder implementations for additional methods
  private generatePricingOptimizationDescription(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): string {
    return `Optimize pricing to align with 6FB methodology and improve revenue performance.`;
  }

  private generatePricingImplementationPlan(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): string {
    return `Implement gradual pricing adjustments over 4-6 weeks with clear value communication.`;
  }

  private calculateRepositioningPriority(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): 'high' | 'medium' | 'low' {
    return performance.clientSatisfaction > 85 ? 'high' : 'medium';
  }

  private generateRepositioningDescription(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): string {
    return `Reposition service as premium offering based on strong performance metrics.`;
  }

  private generateRepositioningPlan(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): string {
    return `Enhance service experience, update marketing materials, and gradually increase pricing.`;
  }

  private calculateRepositioningRevenue(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): number {
    return (benchmark.suggestedMaxPrice - request.basePrice) * 0.7;
  }

  private calculateDurationOptimizationRevenue(request: PricingValidationRequest, performance: ServicePerformanceMetrics, benchmark: SixFBPricingBenchmark): number {
    const currentRevenuePerHour = request.basePrice / (request.duration / 60);
    const benchmarkRevenuePerHour = benchmark.suggestedBasePrice / (benchmark.durationMinutes / 60);
    return (benchmarkRevenuePerHour - currentRevenuePerHour) * 0.5;
  }
}

// Factory function for creating pricing engine instances
export const createPricingEngine = (config: PricingEngineConfig, marketIntelligence?: MarketIntelligence): SixFBPricingEngine => {
  return new SixFBPricingEngine(config, marketIntelligence);
};

// Default configuration
export const DEFAULT_ENGINE_CONFIG: PricingEngineConfig = {
  aggressiveness: 'moderate',
  marketType: MarketType.URBAN,
  targetTier: SixFBTier.PROFESSIONAL,
  profitMarginTarget: 70,
  clientRetentionPriority: 70,
  revenuePriority: 80,
  competitivePositioning: 'leader',
  riskTolerance: 'medium'
};