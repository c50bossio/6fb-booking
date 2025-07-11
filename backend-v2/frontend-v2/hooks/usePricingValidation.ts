/**
 * usePricingValidation - React Hook for 6FB Pricing Validation
 * 
 * Provides comprehensive pricing validation based on Six Figure Barber methodology
 * with real-time feedback, recommendations, and educational content.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import {
  PricingValidationRequest,
  PricingValidationResponse,
  PricingAnalysis,
  PricingValidationResult,
  SixFBPricingBenchmark,
  ValidationLevel,
  SixFBTier,
  ServiceCategoryEnum,
  MarketType,
  DEFAULT_6FB_BENCHMARKS,
  PRICING_MESSAGES,
  PricingRecommendation,
  OptimizationOpportunity,
  ProfitabilityMetrics,
  MarketData,
  PricingDashboardData
} from '../lib/pricing-validation';

// Hook Options
interface PricingValidationOptions {
  debounceMs?: number;
  includeRecommendations?: boolean;
  includeMarketAnalysis?: boolean;
  autoValidate?: boolean;
  marketType?: MarketType;
  targetTier?: SixFBTier;
}

// Hook Return Value
interface PricingValidationHook {
  // Validation State
  validationResult: PricingValidationResult | null;
  analysis: PricingAnalysis | null;
  isValidating: boolean;
  error: string | null;
  
  // Validation Functions
  validatePrice: (request: PricingValidationRequest) => Promise<void>;
  validatePriceSync: (request: PricingValidationRequest) => PricingValidationResult;
  
  // Recommendations
  recommendations: PricingRecommendation[];
  optimizationOpportunities: OptimizationOpportunity[];
  
  // Benchmarks
  benchmarks: SixFBPricingBenchmark[];
  getBenchmarkForService: (category: ServiceCategoryEnum, tier: SixFBTier) => SixFBPricingBenchmark | null;
  
  // Utilities
  calculateProfitMargin: (price: number, cost: number) => number;
  calculateRevenuePerHour: (price: number, duration: number) => number;
  formatPriceValidation: (result: PricingValidationResult) => string;
  
  // Real-time Validation
  liveValidation: (price: number, category: ServiceCategoryEnum, duration: number) => PricingValidationResult;
  
  // Clear State
  clearValidation: () => void;
}

// Custom Hook Implementation
export const usePricingValidation = (options: PricingValidationOptions = {}): PricingValidationHook => {
  const {
    debounceMs = 500,
    includeRecommendations = true,
    includeMarketAnalysis = false,
    autoValidate = true,
    marketType = MarketType.URBAN,
    targetTier = SixFBTier.PROFESSIONAL
  } = options;

  // State Management
  const [validationResult, setValidationResult] = useState<PricingValidationResult | null>(null);
  const [analysis, setAnalysis] = useState<PricingAnalysis | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<PricingRecommendation[]>([]);
  const [optimizationOpportunities, setOptimizationOpportunities] = useState<OptimizationOpportunity[]>([]);

  // Benchmarks
  const benchmarks = useMemo(() => DEFAULT_6FB_BENCHMARKS, []);

  // Debounced validation for real-time feedback
  const debouncedValidate = useDebounce(async (request: PricingValidationRequest) => {
    if (autoValidate) {
      await validatePrice(request);
    }
  }, debounceMs);

  // Get benchmark for specific service
  const getBenchmarkForService = useCallback((category: ServiceCategoryEnum, tier: SixFBTier): SixFBPricingBenchmark | null => {
    return benchmarks.find(b => b.category === category && b.tier === tier) || null;
  }, [benchmarks]);

  // Calculate profit margin
  const calculateProfitMargin = useCallback((price: number, cost: number): number => {
    if (price <= 0) return 0;
    return ((price - cost) / price) * 100;
  }, []);

  // Calculate revenue per hour
  const calculateRevenuePerHour = useCallback((price: number, duration: number): number => {
    if (duration <= 0) return 0;
    return (price / duration) * 60;
  }, []);

  // Synchronous validation for immediate feedback
  const validatePriceSync = useCallback((request: PricingValidationRequest): PricingValidationResult => {
    const benchmark = getBenchmarkForService(request.category, request.targetTier || targetTier);
    
    if (!benchmark) {
      return {
        isValid: false,
        level: ValidationLevel.ERROR,
        message: 'No benchmark found for this service category and tier',
        methodologyAlignment: 0,
        revenueOptimization: 0
      };
    }

    const { basePrice, duration, category } = request;
    const { suggestedMinPrice, suggestedMaxPrice, suggestedBasePrice, profitMarginTarget } = benchmark;

    // Price range validation
    if (basePrice < suggestedMinPrice) {
      return {
        isValid: false,
        level: ValidationLevel.ERROR,
        message: PRICING_MESSAGES.BELOW_MINIMUM,
        suggestion: `Consider increasing to at least $${suggestedMinPrice} for this service tier.`,
        recommendedPrice: suggestedMinPrice,
        methodologyAlignment: 25,
        revenueOptimization: 15,
        details: {
          pricingStrategy: benchmark.pricingStrategy,
          profitMargin: calculateProfitMargin(basePrice, basePrice * 0.3),
          marketPosition: 'Below market minimum',
          valueProposition: 'Price may signal lower quality',
          upsellOpportunities: ['Premium add-ons', 'Package deals'],
          competitiveAnalysis: 'Significantly underpriced compared to market'
        }
      };
    }

    if (basePrice > suggestedMaxPrice) {
      return {
        isValid: false,
        level: ValidationLevel.WARNING,
        message: PRICING_MESSAGES.ABOVE_MAXIMUM,
        suggestion: `Consider if premium positioning justifies pricing above $${suggestedMaxPrice}.`,
        recommendedPrice: suggestedMaxPrice,
        methodologyAlignment: 60,
        revenueOptimization: 40,
        details: {
          pricingStrategy: benchmark.pricingStrategy,
          profitMargin: calculateProfitMargin(basePrice, basePrice * 0.3),
          marketPosition: 'Premium positioning',
          valueProposition: 'Ensure value justifies premium pricing',
          upsellOpportunities: ['Luxury services', 'VIP experiences'],
          competitiveAnalysis: 'Premium pricing requires exceptional service'
        }
      };
    }

    // Duration validation
    const durationDifference = Math.abs(duration - benchmark.durationMinutes);
    if (durationDifference > 15) {
      return {
        isValid: false,
        level: ValidationLevel.WARNING,
        message: PRICING_MESSAGES.DURATION_MISMATCH,
        suggestion: `Consider adjusting duration to align with ${benchmark.durationMinutes} minutes for optimal pricing.`,
        methodologyAlignment: 70,
        revenueOptimization: 60
      };
    }

    // Optimal pricing range
    const priceOptimalityScore = 100 - (Math.abs(basePrice - suggestedBasePrice) / suggestedBasePrice) * 100;
    const methodologyAlignment = Math.max(60, Math.min(100, priceOptimalityScore));
    
    return {
      isValid: true,
      level: ValidationLevel.SUCCESS,
      message: PRICING_MESSAGES.VALID_PRICING,
      methodologyAlignment,
      revenueOptimization: Math.max(70, methodologyAlignment),
      details: {
        pricingStrategy: benchmark.pricingStrategy,
        profitMargin: calculateProfitMargin(basePrice, basePrice * 0.3),
        marketPosition: 'Well-positioned',
        valueProposition: 'Aligned with 6FB methodology',
        upsellOpportunities: benchmark.factors,
        competitiveAnalysis: 'Competitive and value-driven'
      }
    };
  }, [getBenchmarkForService, targetTier, calculateProfitMargin]);

  // Asynchronous validation with full analysis
  const validatePrice = useCallback(async (request: PricingValidationRequest): Promise<void> => {
    setIsValidating(true);
    setError(null);

    try {
      // Perform synchronous validation first
      const quickValidation = validatePriceSync(request);
      setValidationResult(quickValidation);

      // If full analysis is requested, perform additional processing
      if (includeRecommendations || includeMarketAnalysis) {
        const benchmark = getBenchmarkForService(request.category, request.targetTier || targetTier);
        
        if (benchmark) {
          // Generate recommendations
          const newRecommendations = generateRecommendations(request, benchmark, quickValidation);
          setRecommendations(newRecommendations);

          // Generate optimization opportunities
          const opportunities = generateOptimizationOpportunities(request, benchmark, quickValidation);
          setOptimizationOpportunities(opportunities);

          // Create full analysis
          const fullAnalysis: PricingAnalysis = {
            serviceName: request.serviceName,
            category: request.category,
            currentPrice: request.basePrice,
            duration: request.duration,
            validation: quickValidation,
            recommendations: newRecommendations,
            benchmarkComparison: {
              tier: request.targetTier || targetTier,
              benchmark,
              comparison: {
                priceDifference: request.basePrice - benchmark.suggestedBasePrice,
                priceDifferencePercentage: ((request.basePrice - benchmark.suggestedBasePrice) / benchmark.suggestedBasePrice) * 100,
                positionRelativeToBenchmark: request.basePrice < benchmark.suggestedMinPrice ? 'below' : 
                                           request.basePrice > benchmark.suggestedMaxPrice ? 'above' : 'within',
                methodologyAlignmentScore: quickValidation.methodologyAlignment
              },
              suggestions: generateBenchmarkSuggestions(request, benchmark)
            },
            optimizationOpportunities: opportunities,
            marketAnalysis: {
              marketType: request.marketType || marketType,
              competitivePosition: request.basePrice > benchmark.suggestedBasePrice ? 'premium' : 'competitive',
              priceElasticity: 0.8, // Mock data - would come from market analysis
              demandForecast: {
                current: 85,
                projected: 90,
                trend: 'increasing'
              },
              seasonality: {
                peak: ['December', 'May'],
                low: ['February', 'August'],
                adjustmentSuggestions: ['Increase prices during peak seasons', 'Offer promotions during low seasons']
              }
            },
            profitabilityMetrics: {
              currentMargin: calculateProfitMargin(request.basePrice, request.basePrice * 0.3),
              targetMargin: benchmark.profitMarginTarget,
              revenuePerHour: calculateRevenuePerHour(request.basePrice, request.duration),
              costPerService: request.basePrice * 0.3,
              breakEvenPoint: request.basePrice * 0.3,
              profitabilityScore: quickValidation.revenueOptimization,
              improvementAreas: ['Service efficiency', 'Premium positioning', 'Upselling']
            },
            sixFBAlignment: {
              overallScore: quickValidation.methodologyAlignment,
              categoryScores: {
                valueBasedPricing: quickValidation.methodologyAlignment,
                clientRelationshipBuilding: 85,
                premiumPositioning: request.basePrice > benchmark.suggestedBasePrice ? 90 : 70,
                revenueOptimization: quickValidation.revenueOptimization,
                businessGrowth: 80
              },
              recommendations: [
                'Focus on value-based pricing',
                'Build strong client relationships',
                'Consider premium positioning opportunities'
              ],
              nextSteps: [
                'Review pricing strategy monthly',
                'Track client feedback on pricing',
                'Monitor competitive landscape'
              ]
            }
          };

          setAnalysis(fullAnalysis);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsValidating(false);
    }
  }, [
    validatePriceSync,
    getBenchmarkForService,
    includeRecommendations,
    includeMarketAnalysis,
    targetTier,
    marketType,
    calculateProfitMargin,
    calculateRevenuePerHour
  ]);

  // Live validation for real-time feedback
  const liveValidation = useCallback((price: number, category: ServiceCategoryEnum, duration: number): PricingValidationResult => {
    const request: PricingValidationRequest = {
      serviceName: 'Live Validation',
      category,
      basePrice: price,
      duration,
      targetTier
    };
    
    return validatePriceSync(request);
  }, [validatePriceSync, targetTier]);

  // Format validation result for display
  const formatPriceValidation = useCallback((result: PricingValidationResult): string => {
    const alignment = result.methodologyAlignment;
    const optimization = result.revenueOptimization;
    
    return `${result.message} (6FB Alignment: ${alignment}%, Revenue Optimization: ${optimization}%)`;
  }, []);

  // Clear validation state
  const clearValidation = useCallback(() => {
    setValidationResult(null);
    setAnalysis(null);
    setRecommendations([]);
    setOptimizationOpportunities([]);
    setError(null);
  }, []);

  return {
    validationResult,
    analysis,
    isValidating,
    error,
    validatePrice,
    validatePriceSync,
    recommendations,
    optimizationOpportunities,
    benchmarks,
    getBenchmarkForService,
    calculateProfitMargin,
    calculateRevenuePerHour,
    formatPriceValidation,
    liveValidation,
    clearValidation
  };
};

// Helper Functions

function generateRecommendations(
  request: PricingValidationRequest,
  benchmark: SixFBPricingBenchmark,
  validation: PricingValidationResult
): PricingRecommendation[] {
  const recommendations: PricingRecommendation[] = [];
  
  if (request.basePrice < benchmark.suggestedMinPrice) {
    recommendations.push({
      type: 'increase',
      currentPrice: request.basePrice,
      recommendedPrice: benchmark.suggestedMinPrice,
      reasoning: '6FB methodology suggests this pricing level for sustainable business growth and proper value positioning.',
      expectedImpact: {
        revenueChange: ((benchmark.suggestedMinPrice - request.basePrice) / request.basePrice) * 100,
        demandChange: -10,
        profitMarginChange: 15
      },
      implementationStrategy: 'Gradual increase over 2-3 months with improved service quality communication.',
      timeline: '3 months',
      riskLevel: 'low',
      confidence: 85
    });
  }
  
  if (request.basePrice > benchmark.suggestedMaxPrice) {
    recommendations.push({
      type: 'restructure',
      currentPrice: request.basePrice,
      recommendedPrice: benchmark.suggestedMaxPrice,
      reasoning: 'Consider premium positioning justification or service enhancement to support higher pricing.',
      expectedImpact: {
        revenueChange: 0,
        demandChange: 20,
        profitMarginChange: 5
      },
      implementationStrategy: 'Enhance service quality and experience to justify premium pricing.',
      timeline: '6 months',
      riskLevel: 'medium',
      confidence: 70
    });
  }
  
  return recommendations;
}

function generateOptimizationOpportunities(
  request: PricingValidationRequest,
  benchmark: SixFBPricingBenchmark,
  validation: PricingValidationResult
): OptimizationOpportunity[] {
  const opportunities: OptimizationOpportunity[] = [];
  
  // Always suggest package opportunities
  opportunities.push({
    type: 'packaging',
    priority: 'high',
    description: 'Bundle with complementary services to increase average transaction value.',
    implementation: 'Create service packages with 10-15% discount to individual service total.',
    expectedRevenue: request.basePrice * 0.3,
    effortLevel: 'medium',
    timeframe: '1-2 months'
  });
  
  // Suggest upselling if validation shows opportunity
  if (validation.methodologyAlignment > 70) {
    opportunities.push({
      type: 'upsell',
      priority: 'medium',
      description: 'Add premium options or treatments during service delivery.',
      implementation: 'Train staff on consultative selling and premium add-ons.',
      expectedRevenue: request.basePrice * 0.2,
      effortLevel: 'low',
      timeframe: '2-4 weeks'
    });
  }
  
  return opportunities;
}

function generateBenchmarkSuggestions(
  request: PricingValidationRequest,
  benchmark: SixFBPricingBenchmark
): string[] {
  const suggestions: string[] = [];
  
  suggestions.push(`Consider ${benchmark.pricingStrategy} approach for optimal results`);
  suggestions.push(`Target ${benchmark.profitMarginTarget}% profit margin for sustainability`);
  suggestions.push(`Position service for ${benchmark.clientValueTier} client segment`);
  
  return suggestions;
}

// Export additional hooks for specific use cases

export const usePricingRecommendations = (serviceData: {
  price: number;
  category: ServiceCategoryEnum;
  duration: number;
  tier?: SixFBTier;
}) => {
  const { recommendations, validatePrice } = usePricingValidation({
    includeRecommendations: true,
    autoValidate: false
  });

  useEffect(() => {
    if (serviceData.price > 0) {
      validatePrice({
        serviceName: 'Service',
        category: serviceData.category,
        basePrice: serviceData.price,
        duration: serviceData.duration,
        targetTier: serviceData.tier
      });
    }
  }, [serviceData, validatePrice]);

  return recommendations;
};

export const usePricingBenchmarks = (category?: ServiceCategoryEnum, tier?: SixFBTier) => {
  const { benchmarks, getBenchmarkForService } = usePricingValidation();

  const filteredBenchmarks = useMemo(() => {
    let filtered = benchmarks;
    
    if (category) {
      filtered = filtered.filter(b => b.category === category);
    }
    
    if (tier) {
      filtered = filtered.filter(b => b.tier === tier);
    }
    
    return filtered;
  }, [benchmarks, category, tier]);

  const currentBenchmark = useMemo(() => {
    if (category && tier) {
      return getBenchmarkForService(category, tier);
    }
    return null;
  }, [category, tier, getBenchmarkForService]);

  return {
    benchmarks: filteredBenchmarks,
    currentBenchmark,
    getAllTiers: () => Object.values(SixFBTier),
    getAllCategories: () => Object.values(ServiceCategoryEnum)
  };
};