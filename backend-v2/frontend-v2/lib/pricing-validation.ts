/**
 * Six Figure Barber Pricing Validation System
 * 
 * This module provides comprehensive pricing validation based on the 6FB methodology
 * to help barbers optimize their pricing strategies and maximize revenue.
 */

// Service categories for pricing validation
export enum ServiceCategoryEnum {
  HAIRCUT = 'haircut',
  BEARD = 'beard',
  HAIRCUT_BEARD = 'haircut_beard',
  STYLING = 'styling',
  WASH = 'wash',
  TREATMENT = 'treatment',
  CONSULTATION = 'consultation',
  PACKAGE = 'package',
  ADDON = 'addon'
}

// 6FB Pricing Tiers
export enum SixFBTier {
  STARTER = 'starter',
  PROFESSIONAL = 'professional', 
  PREMIUM = 'premium',
  LUXURY = 'luxury'
}

// Revenue Impact Levels
export enum RevenueImpact {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// Client Value Tiers
export enum ClientValueTier {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  LUXURY = 'luxury'
}

// Market Types
export enum MarketType {
  URBAN = 'urban',
  SUBURBAN = 'suburban',
  LUXURY = 'luxury',
  ECONOMY = 'economy'
}

// Pricing Strategy Types
export enum PricingStrategy {
  VALUE_BASED = 'value_based',
  VALUE_BASED_PREMIUM = 'value_based_premium',
  PACKAGE_VALUE = 'package_value',
  LUXURY_VALUE = 'luxury_value',
  EXPERIENTIAL_LUXURY = 'experiential_luxury',
  ULTIMATE_LUXURY = 'ultimate_luxury',
  CONSULTATION_VALUE = 'consultation_value'
}

// Validation Result Types
export enum ValidationLevel {
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  INFO = 'info'
}

// 6FB Pricing Benchmarks
export interface SixFBPricingBenchmark {
  category: ServiceCategoryEnum;
  tier: SixFBTier;
  suggestedBasePrice: number;
  suggestedMinPrice: number;
  suggestedMaxPrice: number;
  durationMinutes: number;
  profitMarginTarget: number;
  methodologyScore: number;
  revenueImpact: RevenueImpact;
  clientValueTier: ClientValueTier;
  targetMarket: MarketType;
  pricingStrategy: PricingStrategy;
  factors: string[];
  positioning: string;
  minimumViablePrice: number;
}

// Pricing Validation Result
export interface PricingValidationResult {
  isValid: boolean;
  level: ValidationLevel;
  message: string;
  suggestion?: string;
  recommendedPrice?: number;
  methodologyAlignment: number; // 0-100 score
  revenueOptimization: number; // 0-100 score
  details?: {
    pricingStrategy: PricingStrategy;
    profitMargin: number;
    marketPosition: string;
    valueProposition: string;
    upsellOpportunities: string[];
    competitiveAnalysis: string;
  };
}

// Comprehensive Pricing Analysis
export interface PricingAnalysis {
  serviceId?: number;
  serviceName: string;
  category: ServiceCategoryEnum;
  currentPrice: number;
  duration: number;
  validation: PricingValidationResult;
  recommendations: PricingRecommendation[];
  benchmarkComparison: BenchmarkComparison;
  optimizationOpportunities: OptimizationOpportunity[];
  marketAnalysis: MarketAnalysis;
  profitabilityMetrics: ProfitabilityMetrics;
  sixFBAlignment: SixFBAlignment;
}

// Pricing Recommendation
export interface PricingRecommendation {
  type: 'increase' | 'decrease' | 'maintain' | 'restructure';
  currentPrice: number;
  recommendedPrice: number;
  reasoning: string;
  expectedImpact: {
    revenueChange: number; // percentage
    demandChange: number; // percentage
    profitMarginChange: number; // percentage
  };
  implementationStrategy: string;
  timeline: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
}

// Benchmark Comparison
export interface BenchmarkComparison {
  tier: SixFBTier;
  benchmark: SixFBPricingBenchmark;
  comparison: {
    priceDifference: number;
    priceDifferencePercentage: number;
    positionRelativeToBenchmark: 'below' | 'within' | 'above';
    methodologyAlignmentScore: number;
  };
  suggestions: string[];
}

// Optimization Opportunity
export interface OptimizationOpportunity {
  type: 'pricing' | 'packaging' | 'positioning' | 'upsell' | 'duration';
  priority: 'high' | 'medium' | 'low';
  description: string;
  implementation: string;
  expectedRevenue: number;
  effortLevel: 'low' | 'medium' | 'high';
  timeframe: string;
}

// Market Analysis
export interface MarketAnalysis {
  marketType: MarketType;
  competitivePosition: 'premium' | 'competitive' | 'value';
  priceElasticity: number;
  demandForecast: {
    current: number;
    projected: number;
    trend: 'increasing' | 'stable' | 'decreasing';
  };
  seasonality: {
    peak: string[];
    low: string[];
    adjustmentSuggestions: string[];
  };
}

// Profitability Metrics
export interface ProfitabilityMetrics {
  currentMargin: number;
  targetMargin: number;
  revenuePerHour: number;
  costPerService: number;
  breakEvenPoint: number;
  profitabilityScore: number; // 0-100
  improvementAreas: string[];
}

// 6FB Methodology Alignment
export interface SixFBAlignment {
  overallScore: number; // 0-100
  categoryScores: {
    valueBasedPricing: number;
    clientRelationshipBuilding: number;
    premiumPositioning: number;
    revenueOptimization: number;
    businessGrowth: number;
  };
  recommendations: string[];
  nextSteps: string[];
}

// Pricing Validation Request
export interface PricingValidationRequest {
  serviceName: string;
  category: ServiceCategoryEnum;
  basePrice: number;
  minPrice?: number;
  maxPrice?: number;
  duration: number;
  isPackage?: boolean;
  packageDiscount?: number;
  marketType?: MarketType;
  targetTier?: SixFBTier;
  includeRecommendations?: boolean;
  includeMarketAnalysis?: boolean;
  barberId?: number;
  locationId?: number;
}

// Pricing Validation Response
export interface PricingValidationResponse {
  analysis: PricingAnalysis;
  quickValidation: PricingValidationResult;
  educationalContent: EducationalContent;
  actionItems: ActionItem[];
}

// Educational Content
export interface EducationalContent {
  title: string;
  methodology: string;
  pricingPrinciples: string[];
  bestPractices: string[];
  commonMistakes: string[];
  successStories: string[];
  resources: {
    title: string;
    url: string;
    type: 'article' | 'video' | 'guide' | 'tool';
  }[];
}

// Action Items
export interface ActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'pricing' | 'positioning' | 'marketing' | 'operations';
  estimatedImpact: number; // percentage revenue increase
  timeToImplement: string;
  resources: string[];
  dependencies: string[];
  completed: boolean;
}

// Pricing Experiment
export interface PricingExperiment {
  id: string;
  name: string;
  description: string;
  serviceId: number;
  controlPrice: number;
  testPrice: number;
  startDate: Date;
  endDate: Date;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  metrics: {
    bookings: number;
    revenue: number;
    conversionRate: number;
    clientSatisfaction: number;
  };
  results?: {
    winner: 'control' | 'test' | 'inconclusive';
    confidence: number;
    recommendations: string[];
  };
}

// Pricing Rule
export interface PricingRule {
  id: string;
  name: string;
  type: 'dynamic' | 'promotional' | 'seasonal' | 'demand-based';
  conditions: {
    timeOfDay?: { start: string; end: string };
    dayOfWeek?: number[];
    dateRange?: { start: Date; end: Date };
    demandLevel?: 'low' | 'medium' | 'high';
    clientType?: 'new' | 'returning' | 'vip';
  };
  adjustment: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  isActive: boolean;
  priority: number;
}

// Pricing Dashboard Data
export interface PricingDashboardData {
  overview: {
    totalServices: number;
    averagePrice: number;
    averageMargin: number;
    sixFBAlignmentScore: number;
    revenueOptimizationScore: number;
  };
  priceDistribution: {
    tier: SixFBTier;
    count: number;
    averagePrice: number;
    revenue: number;
  }[];
  validationSummary: {
    valid: number;
    warnings: number;
    errors: number;
    needsOptimization: number;
  };
  topOpportunities: OptimizationOpportunity[];
  recentAnalyses: PricingAnalysis[];
  experiments: PricingExperiment[];
  performanceMetrics: {
    revenuePerService: number;
    bookingConversionRate: number;
    clientRetentionRate: number;
    averageClientValue: number;
  };
}

// Pricing Optimization Settings
export interface PricingOptimizationSettings {
  autoOptimization: boolean;
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  marketType: MarketType;
  targetTier: SixFBTier;
  profitMarginTarget: number;
  clientRetentionPriority: number; // 0-100
  revenuePriority: number; // 0-100
  experimentDuration: number; // days
  minimumConfidence: number; // 0-100
  excludedServices: number[];
  notifications: {
    priceRecommendations: boolean;
    experimentResults: boolean;
    marketChanges: boolean;
  };
}

// Market Data
export interface MarketData {
  location: {
    city: string;
    state: string;
    zipCode: string;
  };
  demographics: {
    averageIncome: number;
    populationDensity: number;
    ageDistribution: { [key: string]: number };
  };
  competition: {
    averagePricing: { [key in ServiceCategoryEnum]?: number };
    marketSaturation: number;
    differentiationOpportunities: string[];
  };
  trends: {
    demandForecast: number;
    seasonalityIndex: number;
    priceElasticity: number;
  };
}

// Utility Types
export type PricingValidationFunction = (
  request: PricingValidationRequest,
  benchmarks: SixFBPricingBenchmark[],
  marketData?: MarketData
) => Promise<PricingValidationResponse>;

export type PricingRecommendationEngine = (
  currentPricing: number,
  benchmark: SixFBPricingBenchmark,
  marketData: MarketData,
  performance: ProfitabilityMetrics
) => PricingRecommendation[];

export type OptimizationScorer = (
  pricing: number,
  benchmark: SixFBPricingBenchmark,
  market: MarketData
) => number;

// Default 6FB Pricing Benchmarks
export const DEFAULT_6FB_BENCHMARKS: SixFBPricingBenchmark[] = [
  {
    category: ServiceCategoryEnum.HAIRCUT,
    tier: SixFBTier.STARTER,
    suggestedBasePrice: 35.0,
    suggestedMinPrice: 25.0,
    suggestedMaxPrice: 50.0,
    durationMinutes: 45,
    profitMarginTarget: 75.0,
    methodologyScore: 90.0,
    revenueImpact: RevenueImpact.HIGH,
    clientValueTier: ClientValueTier.STANDARD,
    targetMarket: MarketType.URBAN,
    pricingStrategy: PricingStrategy.VALUE_BASED,
    factors: ['expertise', 'experience', 'location', 'time_investment'],
    positioning: 'quality_foundation',
    minimumViablePrice: 25.0
  },
  {
    category: ServiceCategoryEnum.HAIRCUT,
    tier: SixFBTier.PROFESSIONAL,
    suggestedBasePrice: 65.0,
    suggestedMinPrice: 45.0,
    suggestedMaxPrice: 85.0,
    durationMinutes: 60,
    profitMarginTarget: 70.0,
    methodologyScore: 95.0,
    revenueImpact: RevenueImpact.HIGH,
    clientValueTier: ClientValueTier.PREMIUM,
    targetMarket: MarketType.URBAN,
    pricingStrategy: PricingStrategy.VALUE_BASED_PREMIUM,
    factors: ['consultation_time', 'advanced_techniques', 'personalization', 'experience'],
    positioning: 'premium_service',
    minimumViablePrice: 45.0
  },
  {
    category: ServiceCategoryEnum.HAIRCUT,
    tier: SixFBTier.PREMIUM,
    suggestedBasePrice: 120.0,
    suggestedMinPrice: 90.0,
    suggestedMaxPrice: 160.0,
    durationMinutes: 90,
    profitMarginTarget: 60.0,
    methodologyScore: 98.0,
    revenueImpact: RevenueImpact.HIGH,
    clientValueTier: ClientValueTier.LUXURY,
    targetMarket: MarketType.LUXURY,
    pricingStrategy: PricingStrategy.LUXURY_VALUE,
    factors: ['exclusivity', 'time_efficiency', 'premium_experience', 'expertise'],
    positioning: 'executive_service',
    minimumViablePrice: 90.0
  },
  {
    category: ServiceCategoryEnum.BEARD,
    tier: SixFBTier.STARTER,
    suggestedBasePrice: 25.0,
    suggestedMinPrice: 20.0,
    suggestedMaxPrice: 35.0,
    durationMinutes: 30,
    profitMarginTarget: 80.0,
    methodologyScore: 85.0,
    revenueImpact: RevenueImpact.MEDIUM,
    clientValueTier: ClientValueTier.STANDARD,
    targetMarket: MarketType.URBAN,
    pricingStrategy: PricingStrategy.VALUE_BASED,
    factors: ['precision', 'styling', 'maintenance_advice'],
    positioning: 'professional_grooming',
    minimumViablePrice: 20.0
  },
  {
    category: ServiceCategoryEnum.SHAVE,
    tier: SixFBTier.PREMIUM,
    suggestedBasePrice: 75.0,
    suggestedMinPrice: 55.0,
    suggestedMaxPrice: 100.0,
    durationMinutes: 50,
    profitMarginTarget: 70.0,
    methodologyScore: 95.0,
    revenueImpact: RevenueImpact.HIGH,
    clientValueTier: ClientValueTier.LUXURY,
    targetMarket: MarketType.LUXURY,
    pricingStrategy: PricingStrategy.EXPERIENTIAL_LUXURY,
    factors: ['craftsmanship', 'tradition', 'experience', 'time_investment'],
    positioning: 'luxury_experience',
    minimumViablePrice: 55.0
  },
  {
    category: ServiceCategoryEnum.PACKAGE,
    tier: SixFBTier.PROFESSIONAL,
    suggestedBasePrice: 80.0,
    suggestedMinPrice: 60.0,
    suggestedMaxPrice: 110.0,
    durationMinutes: 75,
    profitMarginTarget: 65.0,
    methodologyScore: 92.0,
    revenueImpact: RevenueImpact.HIGH,
    clientValueTier: ClientValueTier.PREMIUM,
    targetMarket: MarketType.URBAN,
    pricingStrategy: PricingStrategy.PACKAGE_VALUE,
    factors: ['convenience', 'value_bundle', 'comprehensive_service'],
    positioning: 'complete_grooming',
    minimumViablePrice: 60.0
  },
  {
    category: ServiceCategoryEnum.PACKAGE,
    tier: SixFBTier.LUXURY,
    suggestedBasePrice: 200.0,
    suggestedMinPrice: 150.0,
    suggestedMaxPrice: 280.0,
    durationMinutes: 120,
    profitMarginTarget: 55.0,
    methodologyScore: 100.0,
    revenueImpact: RevenueImpact.HIGH,
    clientValueTier: ClientValueTier.LUXURY,
    targetMarket: MarketType.LUXURY,
    pricingStrategy: PricingStrategy.ULTIMATE_LUXURY,
    factors: ['mastery', 'exclusivity', 'complete_experience', 'time_investment', 'luxury_positioning'],
    positioning: 'ultimate_experience',
    minimumViablePrice: 150.0
  }
];

// Pricing Validation Messages
export const PRICING_MESSAGES = {
  VALID_PRICING: 'Pricing aligns well with 6FB methodology and market standards.',
  BELOW_MINIMUM: 'Price is below the minimum viable price for this service tier.',
  ABOVE_MAXIMUM: 'Price exceeds recommended maximum for this market segment.',
  MARGIN_TOO_LOW: 'Profit margin is below 6FB recommended targets.',
  DURATION_MISMATCH: 'Duration doesn\'t align with typical requirements for this service.',
  TIER_MISMATCH: 'Pricing doesn\'t match the selected 6FB tier positioning.',
  MARKET_MISALIGNMENT: 'Pricing may not be optimal for your target market.',
  OPTIMIZATION_OPPORTUNITY: 'There\'s an opportunity to optimize this pricing for better revenue.',
  PREMIUM_POSITIONING: 'Consider premium positioning to maximize revenue potential.',
  VALUE_JUSTIFICATION: 'Ensure pricing is justified by value delivered to clients.',
  COMPETITIVE_ANALYSIS: 'Review competitive positioning in your market.',
  SEASONAL_ADJUSTMENT: 'Consider seasonal pricing adjustments for optimal revenue.',
  PACKAGE_OPPORTUNITY: 'Consider bundling with other services for increased value.',
  UPSELL_POTENTIAL: 'Identify upselling opportunities during service delivery.',
  CLIENT_RETENTION: 'Pricing strategy should balance revenue with client retention.',
  METHODOLOGY_ALIGNMENT: 'Align pricing with 6FB methodology for best results.'
};

// Educational Content Templates
export const EDUCATIONAL_CONTENT_TEMPLATES = {
  VALUE_BASED_PRICING: {
    title: 'Value-Based Pricing Strategy',
    methodology: 'Six Figure Barber methodology emphasizes pricing based on value delivered, not cost-plus or competitor-based pricing.',
    pricingPrinciples: [
      'Price reflects the value and experience you provide',
      'Higher prices can increase perceived value',
      'Focus on quality and service differentiation',
      'Build relationships that justify premium pricing'
    ],
    bestPractices: [
      'Communicate value clearly to clients',
      'Invest in skills and service quality',
      'Create memorable experiences',
      'Build strong client relationships'
    ],
    commonMistakes: [
      'Competing primarily on price',
      'Undervaluing your expertise',
      'Not communicating value effectively',
      'Inconsistent pricing strategy'
    ]
  },
  PREMIUM_POSITIONING: {
    title: 'Premium Positioning Strategy',
    methodology: 'Position your services as premium offerings that justify higher prices through superior quality and experience.',
    pricingPrinciples: [
      'Premium pricing reflects premium service',
      'Exclusivity increases perceived value',
      'Quality justifies higher prices',
      'Brand positioning drives pricing power'
    ],
    bestPractices: [
      'Invest in premium tools and products',
      'Create an upscale environment',
      'Offer exclusive services',
      'Build a strong personal brand'
    ],
    commonMistakes: [
      'Premium pricing without premium service',
      'Inconsistent brand experience',
      'Competing with discount providers',
      'Not investing in brand development'
    ]
  }
};