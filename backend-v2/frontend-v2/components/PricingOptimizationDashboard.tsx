/**
 * Pricing Optimization Dashboard - 6FB Pricing Analytics and Optimization
 * 
 * Comprehensive dashboard for analyzing pricing performance, identifying optimization
 * opportunities, and tracking 6FB methodology alignment across all services.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { usePricingValidation } from '../hooks/usePricingValidation';
import {
  PricingDashboardData,
  PricingAnalysis,
  OptimizationOpportunity,
  PricingExperiment,
  SixFBTier,
  ServiceCategoryEnum,
  ValidationLevel,
  PricingValidationResult
} from '../lib/pricing-validation';
import {
  PricingStrategyGuide,
  PricingMistakesWarning,
  PricingPsychologyTips,
  PricingImplementationChecklist,
  QuickReferenceGuide
} from './PricingEducationComponents';

// Mock data for demonstration - in real app, this would come from API
const mockDashboardData: PricingDashboardData = {
  overview: {
    totalServices: 12,
    averagePrice: 67.50,
    averageMargin: 72.5,
    sixFBAlignmentScore: 84,
    revenueOptimizationScore: 78
  },
  priceDistribution: [
    { tier: SixFBTier.STARTER, count: 3, averagePrice: 32.50, revenue: 1950 },
    { tier: SixFBTier.PROFESSIONAL, count: 6, averagePrice: 75.00, revenue: 9000 },
    { tier: SixFBTier.PREMIUM, count: 2, averagePrice: 125.00, revenue: 2500 },
    { tier: SixFBTier.LUXURY, count: 1, averagePrice: 200.00, revenue: 800 }
  ],
  validationSummary: {
    valid: 8,
    warnings: 3,
    errors: 1,
    needsOptimization: 4
  },
  topOpportunities: [
    {
      type: 'pricing',
      priority: 'high',
      description: 'Increase haircut pricing to align with 6FB Professional tier',
      implementation: 'Gradually increase over 2 months with value communication',
      expectedRevenue: 150,
      effortLevel: 'medium',
      timeframe: '6-8 weeks'
    },
    {
      type: 'packaging',
      priority: 'high',
      description: 'Create premium grooming packages',
      implementation: 'Bundle haircut + beard + hot towel services',
      expectedRevenue: 200,
      effortLevel: 'low',
      timeframe: '2-3 weeks'
    },
    {
      type: 'positioning',
      priority: 'medium',
      description: 'Reposition straight razor service as luxury experience',
      implementation: 'Enhance service delivery and pricing',
      expectedRevenue: 120,
      effortLevel: 'high',
      timeframe: '8-10 weeks'
    }
  ],
  recentAnalyses: [],
  experiments: [],
  performanceMetrics: {
    revenuePerService: 67.50,
    bookingConversionRate: 78.5,
    clientRetentionRate: 85.2,
    averageClientValue: 145.30
  }
};

// Dashboard Overview Cards
const OverviewCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: 'blue' | 'green' | 'yellow' | 'red';
}> = ({ title, value, subtitle, trend, color = 'blue' }) => {
  const getColorClasses = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-50 border-green-200 text-green-800';
      case 'yellow': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'red': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return '↗️';
      case 'down': return '↘️';
      case 'stable': return '→';
      default: return '';
    }
  };

  return (
    <div className={`p-6 rounded-lg border ${getColorClasses(color)}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium opacity-75">{title}</h3>
        {trend && <span className="text-lg">{getTrendIcon(trend)}</span>}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      {subtitle && <p className="text-sm opacity-75">{subtitle}</p>}
    </div>
  );
};

// Pricing Distribution Chart
const PricingDistributionChart: React.FC<{ data: PricingDashboardData['priceDistribution'] }> = ({ data }) => {
  const maxRevenue = Math.max(...data.map(d => d.revenue));

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Distribution by Tier</h3>
      
      <div className="space-y-4">
        {data.map((tier, index) => (
          <div key={index} className="flex items-center space-x-4">
            <div className="w-20 text-sm font-medium text-gray-600 capitalize">
              {tier.tier}
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">{tier.count} services</span>
                <span className="text-sm font-medium">${tier.revenue}</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(tier.revenue / maxRevenue) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Avg: ${tier.averagePrice}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Validation Summary Widget
const ValidationSummary: React.FC<{ data: PricingDashboardData['validationSummary'] }> = ({ data }) => {
  const total = data.valid + data.warnings + data.errors;
  
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing Validation Summary</h3>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-sm text-gray-600">Valid Pricing</span>
          </div>
          <span className="font-medium">{data.valid}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
            <span className="text-sm text-gray-600">Warnings</span>
          </div>
          <span className="font-medium">{data.warnings}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
            <span className="text-sm text-gray-600">Errors</span>
          </div>
          <span className="font-medium">{data.errors}</span>
        </div>
        
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
            <span className="text-sm text-gray-600">Needs Optimization</span>
          </div>
          <span className="font-medium">{data.needsOptimization}</span>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t">
        <div className="text-sm text-gray-600">
          Validation Rate: <span className="font-medium">{Math.round((data.valid / total) * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

// Optimization Opportunities List
const OptimizationOpportunities: React.FC<{ opportunities: OptimizationOpportunity[] }> = ({ opportunities }) => {
  const [expandedOpportunity, setExpandedOpportunity] = useState<number | null>(null);

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getTypeIcon = (type: OptimizationOpportunity['type']) => {
    switch (type) {
      case 'pricing': return '💰';
      case 'packaging': return '📦';
      case 'positioning': return '🎯';
      case 'upsell': return '⬆️';
      case 'duration': return '⏱️';
      default: return '🔧';
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Optimization Opportunities</h3>
      
      <div className="space-y-3">
        {opportunities.map((opportunity, index) => (
          <div key={index} className="border border-gray-200 rounded-lg">
            <button
              onClick={() => setExpandedOpportunity(expandedOpportunity === index ? null : index)}
              className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{getTypeIcon(opportunity.type)}</span>
                  <div>
                    <h4 className="font-medium text-gray-900 capitalize">
                      {opportunity.type} Optimization
                    </h4>
                    <p className="text-sm text-gray-600">{opportunity.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(opportunity.priority)}`}>
                    {opportunity.priority}
                  </span>
                  <span className="text-gray-400">
                    {expandedOpportunity === index ? '−' : '+'}
                  </span>
                </div>
              </div>
            </button>
            
            {expandedOpportunity === index && (
              <div className="px-4 pb-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3 text-sm">
                  <div>
                    <span className="text-gray-600">Expected Revenue:</span>
                    <span className="ml-2 font-medium text-green-600">+${opportunity.expectedRevenue}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Effort Level:</span>
                    <span className="ml-2 font-medium">{opportunity.effortLevel}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Timeframe:</span>
                    <span className="ml-2 font-medium">{opportunity.timeframe}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h5 className="font-medium text-gray-900 mb-1">Implementation Plan:</h5>
                  <p className="text-sm text-gray-700">{opportunity.implementation}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Performance Metrics Grid
const PerformanceMetrics: React.FC<{ metrics: PricingDashboardData['performanceMetrics'] }> = ({ metrics }) => {
  const metricCards = [
    {
      title: 'Revenue per Service',
      value: `$${metrics.revenuePerService.toFixed(2)}`,
      trend: 'up' as const,
      color: 'green' as const
    },
    {
      title: 'Booking Conversion',
      value: `${metrics.bookingConversionRate.toFixed(1)}%`,
      trend: 'stable' as const,
      color: 'blue' as const
    },
    {
      title: 'Client Retention',
      value: `${metrics.clientRetentionRate.toFixed(1)}%`,
      trend: 'up' as const,
      color: 'green' as const
    },
    {
      title: 'Average Client Value',
      value: `$${metrics.averageClientValue.toFixed(2)}`,
      trend: 'up' as const,
      color: 'green' as const
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metricCards.map((metric, index) => (
        <OverviewCard
          key={index}
          title={metric.title}
          value={metric.value}
          trend={metric.trend}
          color={metric.color}
        />
      ))}
    </div>
  );
};

// Main Dashboard Component
export const PricingOptimizationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'education' | 'experiments'>('overview');
  const [dashboardData, setDashboardData] = useState<PricingDashboardData>(mockDashboardData);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate overall scores
  const overallScore = useMemo(() => {
    const { sixFBAlignmentScore, revenueOptimizationScore } = dashboardData.overview;
    return Math.round((sixFBAlignmentScore + revenueOptimizationScore) / 2);
  }, [dashboardData.overview]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'yellow';
    return 'red';
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'analysis', label: 'Analysis' },
    { key: 'education', label: 'Education' },
    { key: 'experiments', label: 'Experiments' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pricing Optimization Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Analyze and optimize your pricing strategy with 6FB methodology
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Overall Score</div>
            <div className={`text-3xl font-bold ${
              overallScore >= 80 ? 'text-green-600' : 
              overallScore >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {overallScore}%
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <OverviewCard
              title="Total Services"
              value={dashboardData.overview.totalServices}
              subtitle="Active services"
              color="blue"
            />
            <OverviewCard
              title="Average Price"
              value={`$${dashboardData.overview.averagePrice.toFixed(2)}`}
              subtitle="Across all services"
              trend="up"
              color="green"
            />
            <OverviewCard
              title="6FB Alignment"
              value={`${dashboardData.overview.sixFBAlignmentScore}%`}
              subtitle="Methodology compliance"
              color={getScoreColor(dashboardData.overview.sixFBAlignmentScore)}
            />
            <OverviewCard
              title="Revenue Optimization"
              value={`${dashboardData.overview.revenueOptimizationScore}%`}
              subtitle="Optimization potential"
              color={getScoreColor(dashboardData.overview.revenueOptimizationScore)}
            />
          </div>

          {/* Charts and Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PricingDistributionChart data={dashboardData.priceDistribution} />
            <ValidationSummary data={dashboardData.validationSummary} />
          </div>

          {/* Optimization Opportunities */}
          <OptimizationOpportunities opportunities={dashboardData.topOpportunities} />

          {/* Performance Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
            <PerformanceMetrics metrics={dashboardData.performanceMetrics} />
          </div>
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="space-y-8">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Detailed Analysis</h2>
            <p className="text-gray-600 mb-6">
              Deep dive into your pricing performance with advanced analytics
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-blue-800">
                Advanced analytics features including service-by-service analysis, 
                competitive benchmarking, and predictive modeling will be available here.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'education' && (
        <div className="space-y-8">
          <PricingStrategyGuide />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PricingMistakesWarning />
            <PricingPsychologyTips />
          </div>
          <PricingImplementationChecklist />
          <QuickReferenceGuide />
        </div>
      )}

      {activeTab === 'experiments' && (
        <div className="space-y-8">
          <div className="text-center py-12">
            <div className="text-4xl mb-4">🧪</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Pricing Experiments</h2>
            <p className="text-gray-600 mb-6">
              A/B test your pricing strategies to optimize revenue
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-2xl mx-auto">
              <p className="text-yellow-800">
                Pricing experiment framework including A/B testing, statistical analysis, 
                and automated optimization will be available here.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingOptimizationDashboard;