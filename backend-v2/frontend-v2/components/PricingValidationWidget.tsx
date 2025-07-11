/**
 * PricingValidationWidget - 6FB Pricing Validation Component
 * 
 * Real-time pricing validation and recommendations based on Six Figure Barber methodology.
 * Provides educational content and optimization suggestions.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  usePricingValidation, 
  usePricingBenchmarks 
} from '../hooks/usePricingValidation';
import {
  ServiceCategoryEnum,
  SixFBTier,
  MarketType,
  ValidationLevel,
  PricingValidationResult,
  PricingRecommendation,
  OptimizationOpportunity
} from '../lib/pricing-validation';

// Component Props
interface PricingValidationWidgetProps {
  serviceName: string;
  category: ServiceCategoryEnum;
  basePrice: number;
  duration: number;
  minPrice?: number;
  maxPrice?: number;
  isPackage?: boolean;
  marketType?: MarketType;
  targetTier?: SixFBTier;
  onChange?: (validation: PricingValidationResult) => void;
  onRecommendationApply?: (recommendation: PricingRecommendation) => void;
  showRecommendations?: boolean;
  showBenchmarks?: boolean;
  showEducational?: boolean;
  compact?: boolean;
}

// Validation Status Badge
const ValidationBadge: React.FC<{ level: ValidationLevel; message: string }> = ({ level, message }) => {
  const getStatusColor = (level: ValidationLevel) => {
    switch (level) {
      case ValidationLevel.SUCCESS: return 'bg-green-100 text-green-800 border-green-200';
      case ValidationLevel.WARNING: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case ValidationLevel.ERROR: return 'bg-red-100 text-red-800 border-red-200';
      case ValidationLevel.INFO: return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (level: ValidationLevel) => {
    switch (level) {
      case ValidationLevel.SUCCESS: return '✓';
      case ValidationLevel.WARNING: return '⚠';
      case ValidationLevel.ERROR: return '✗';
      case ValidationLevel.INFO: return 'ℹ';
      default: return '•';
    }
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(level)}`}>
      <span className="mr-1">{getStatusIcon(level)}</span>
      {message}
    </div>
  );
};

// Methodology Score Display
const MethodologyScore: React.FC<{ score: number; label: string }> = ({ score, label }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="flex items-center space-x-2">
      <div className="flex-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{label}</span>
          <span className={`font-semibold ${getScoreColor(score)}`}>{score}%</span>
        </div>
        <div className="mt-1 bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getScoreBackground(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Benchmark Comparison
const BenchmarkComparison: React.FC<{ 
  currentPrice: number; 
  benchmark: { min: number; max: number; suggested: number }; 
  category: ServiceCategoryEnum;
  tier: SixFBTier;
}> = ({ currentPrice, benchmark, category, tier }) => {
  const isBelow = currentPrice < benchmark.min;
  const isAbove = currentPrice > benchmark.max;
  const isOptimal = currentPrice >= benchmark.min && currentPrice <= benchmark.max;

  return (
    <div className="bg-gray-50 rounded-lg p-4 mt-4">
      <h4 className="font-semibold text-gray-900 mb-3">6FB Benchmark Comparison</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-sm text-gray-600">Minimum</div>
          <div className="text-lg font-semibold">${benchmark.min}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600">Suggested</div>
          <div className="text-lg font-semibold text-blue-600">${benchmark.suggested}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-gray-600">Maximum</div>
          <div className="text-lg font-semibold">${benchmark.max}</div>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span>Your Price: ${currentPrice}</span>
          <span className={`font-semibold ${isOptimal ? 'text-green-600' : isBelow ? 'text-red-600' : 'text-yellow-600'}`}>
            {isOptimal ? 'Optimal' : isBelow ? 'Below Range' : 'Above Range'}
          </span>
        </div>
        
        <div className="relative bg-gray-200 rounded-full h-3">
          <div 
            className="absolute bg-green-400 h-3 rounded-full"
            style={{ 
              left: `${(benchmark.min / benchmark.max) * 100}%`,
              width: `${((benchmark.max - benchmark.min) / benchmark.max) * 100}%`
            }}
          />
          <div 
            className="absolute w-0.5 h-3 bg-blue-600 rounded-full"
            style={{ left: `${(benchmark.suggested / benchmark.max) * 100}%` }}
          />
          <div 
            className="absolute w-1 h-3 bg-gray-900 rounded-full"
            style={{ left: `${(currentPrice / benchmark.max) * 100}%` }}
          />
        </div>
      </div>

      <div className="text-sm text-gray-600">
        <span className="font-medium">{tier}</span> tier <span className="font-medium">{category}</span> service
      </div>
    </div>
  );
};

// Recommendation Card
const RecommendationCard: React.FC<{ 
  recommendation: PricingRecommendation; 
  onApply?: (recommendation: PricingRecommendation) => void;
}> = ({ recommendation, onApply }) => {
  const getRecommendationColor = (type: PricingRecommendation['type']) => {
    switch (type) {
      case 'increase': return 'border-green-200 bg-green-50';
      case 'decrease': return 'border-red-200 bg-red-50';
      case 'maintain': return 'border-blue-200 bg-blue-50';
      case 'restructure': return 'border-yellow-200 bg-yellow-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getRecommendationIcon = (type: PricingRecommendation['type']) => {
    switch (type) {
      case 'increase': return '↗️';
      case 'decrease': return '↘️';
      case 'maintain': return '→';
      case 'restructure': return '🔄';
      default: return '•';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getRecommendationColor(recommendation.type)}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <span className="text-lg mr-2">{getRecommendationIcon(recommendation.type)}</span>
          <div>
            <h4 className="font-semibold text-gray-900 capitalize">
              {recommendation.type} to ${recommendation.recommendedPrice}
            </h4>
            <p className="text-sm text-gray-600">
              Confidence: {recommendation.confidence}% • Risk: {recommendation.riskLevel}
            </p>
          </div>
        </div>
        {onApply && (
          <button
            onClick={() => onApply(recommendation)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            Apply
          </button>
        )}
      </div>

      <p className="text-sm text-gray-700 mb-3">{recommendation.reasoning}</p>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Revenue Impact</span>
          <div className={`font-semibold ${recommendation.expectedImpact.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {recommendation.expectedImpact.revenueChange >= 0 ? '+' : ''}{recommendation.expectedImpact.revenueChange.toFixed(1)}%
          </div>
        </div>
        <div>
          <span className="text-gray-600">Demand Impact</span>
          <div className={`font-semibold ${recommendation.expectedImpact.demandChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {recommendation.expectedImpact.demandChange >= 0 ? '+' : ''}{recommendation.expectedImpact.demandChange.toFixed(1)}%
          </div>
        </div>
        <div>
          <span className="text-gray-600">Margin Impact</span>
          <div className={`font-semibold ${recommendation.expectedImpact.profitMarginChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {recommendation.expectedImpact.profitMarginChange >= 0 ? '+' : ''}{recommendation.expectedImpact.profitMarginChange.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-sm text-gray-600">
          <span className="font-medium">Implementation:</span> {recommendation.implementationStrategy}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          <span className="font-medium">Timeline:</span> {recommendation.timeline}
        </p>
      </div>
    </div>
  );
};

// Educational Tooltip
const EducationalTooltip: React.FC<{ title: string; content: string; children: React.ReactNode }> = ({ 
  title, 
  content, 
  children 
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      
      {isVisible && (
        <div className="absolute z-10 w-80 p-3 bg-white border border-gray-200 rounded-lg shadow-lg -top-2 left-full ml-2">
          <h4 className="font-semibold text-gray-900 mb-2">{title}</h4>
          <p className="text-sm text-gray-700">{content}</p>
          <div className="absolute top-3 -left-1 w-2 h-2 bg-white border-l border-t border-gray-200 transform rotate-45" />
        </div>
      )}
    </div>
  );
};

// Main Component
export const PricingValidationWidget: React.FC<PricingValidationWidgetProps> = ({
  serviceName,
  category,
  basePrice,
  duration,
  minPrice,
  maxPrice,
  isPackage = false,
  marketType = MarketType.URBAN,
  targetTier = SixFBTier.PROFESSIONAL,
  onChange,
  onRecommendationApply,
  showRecommendations = true,
  showBenchmarks = true,
  showEducational = true,
  compact = false
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const {
    validationResult,
    analysis,
    isValidating,
    error,
    recommendations,
    optimizationOpportunities,
    validatePrice,
    liveValidation
  } = usePricingValidation({
    includeRecommendations: showRecommendations,
    includeMarketAnalysis: true,
    marketType,
    targetTier
  });

  const { currentBenchmark } = usePricingBenchmarks(category, targetTier);

  // Real-time validation when inputs change
  useEffect(() => {
    if (basePrice > 0 && duration > 0 && serviceName.trim()) {
      const request = {
        serviceName,
        category,
        basePrice,
        duration,
        minPrice,
        maxPrice,
        isPackage,
        marketType,
        targetTier
      };

      validatePrice(request);
    }
  }, [serviceName, category, basePrice, duration, minPrice, maxPrice, isPackage, marketType, targetTier, validatePrice]);

  // Notify parent of validation changes
  useEffect(() => {
    if (validationResult && onChange) {
      onChange(validationResult);
    }
  }, [validationResult, onChange]);

  // Handle recommendation application
  const handleRecommendationApply = useCallback((recommendation: PricingRecommendation) => {
    if (onRecommendationApply) {
      onRecommendationApply(recommendation);
    }
  }, [onRecommendationApply]);

  if (basePrice <= 0 || duration <= 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        Enter price and duration to see 6FB pricing validation
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        <span>Validating pricing...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
        Validation error: {error}
      </div>
    );
  }

  if (!validationResult) {
    return null;
  }

  return (
    <div className={`border border-gray-200 rounded-lg ${compact ? 'p-3' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {showEducational ? (
            <EducationalTooltip 
              title="6FB Pricing Validation" 
              content="This validation system analyzes your pricing against Six Figure Barber methodology benchmarks to help optimize revenue and client value."
            >
              <span className="cursor-help border-b border-dashed border-gray-400">
                6FB Pricing Validation
              </span>
            </EducationalTooltip>
          ) : (
            '6FB Pricing Validation'
          )}
        </h3>
        <ValidationBadge level={validationResult.level} message={validationResult.isValid ? 'Valid' : 'Needs Attention'} />
      </div>

      {/* Main Validation Result */}
      <div className="mb-4">
        <p className="text-sm text-gray-700 mb-3">{validationResult.message}</p>
        
        {validationResult.suggestion && (
          <p className="text-sm text-blue-700 bg-blue-50 p-3 rounded-md mb-3">
            <span className="font-medium">Suggestion:</span> {validationResult.suggestion}
          </p>
        )}

        {/* Methodology Scores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <MethodologyScore 
            score={validationResult.methodologyAlignment} 
            label="6FB Methodology Alignment" 
          />
          <MethodologyScore 
            score={validationResult.revenueOptimization} 
            label="Revenue Optimization" 
          />
        </div>
      </div>

      {/* Benchmark Comparison */}
      {showBenchmarks && currentBenchmark && (
        <BenchmarkComparison
          currentPrice={basePrice}
          benchmark={{
            min: currentBenchmark.suggestedMinPrice,
            max: currentBenchmark.suggestedMaxPrice,
            suggested: currentBenchmark.suggestedBasePrice
          }}
          category={category}
          tier={targetTier}
        />
      )}

      {/* Recommendations */}
      {showRecommendations && recommendations.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setExpandedSection(expandedSection === 'recommendations' ? null : 'recommendations')}
            className="flex items-center justify-between w-full text-left font-semibold text-gray-900 mb-3"
          >
            <span>Pricing Recommendations ({recommendations.length})</span>
            <span className="text-gray-500">
              {expandedSection === 'recommendations' ? '−' : '+'}
            </span>
          </button>
          
          {expandedSection === 'recommendations' && (
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((recommendation, index) => (
                <RecommendationCard
                  key={index}
                  recommendation={recommendation}
                  onApply={handleRecommendationApply}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Optimization Opportunities */}
      {optimizationOpportunities.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setExpandedSection(expandedSection === 'optimization' ? null : 'optimization')}
            className="flex items-center justify-between w-full text-left font-semibold text-gray-900 mb-3"
          >
            <span>Optimization Opportunities ({optimizationOpportunities.length})</span>
            <span className="text-gray-500">
              {expandedSection === 'optimization' ? '−' : '+'}
            </span>
          </button>
          
          {expandedSection === 'optimization' && (
            <div className="space-y-3">
              {optimizationOpportunities.map((opportunity, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 capitalize">
                      {opportunity.type} Optimization
                    </h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      opportunity.priority === 'high' ? 'bg-red-100 text-red-800' :
                      opportunity.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {opportunity.priority} priority
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{opportunity.description}</p>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Expected Revenue: +${opportunity.expectedRevenue}</span>
                    <span>Effort: {opportunity.effortLevel} • {opportunity.timeframe}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Educational Resources */}
      {showEducational && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-2">6FB Pricing Principles</h4>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• Price based on value delivered, not cost-plus</p>
            <p>• Higher prices can increase perceived value</p>
            <p>• Focus on client relationships over transactions</p>
            <p>• Consistent pricing builds trust and predictability</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingValidationWidget;