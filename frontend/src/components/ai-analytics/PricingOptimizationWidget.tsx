/**
 * Pricing Optimization Widget Component
 * Displays AI-powered pricing recommendations with implementation tips
 */

import React from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { PricingOptimization, AIAnalyticsUtils } from '@/lib/api/ai-analytics'

interface PricingOptimizationWidgetProps {
  optimizations: PricingOptimization[]
  onImplement?: (optimization: PricingOptimization) => void
}

function PricingOptimizationCard({
  optimization,
  onImplement
}: {
  optimization: PricingOptimization
  onImplement?: (optimization: PricingOptimization) => void
}) {
  const priceChange = optimization.recommended_price - optimization.current_price
  const priceChangePercent = (priceChange / optimization.current_price) * 100
  const isIncrease = priceChange > 0

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {optimization.service_name}
          </h3>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-center">
              <p className="text-xs text-gray-500">Current</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {AIAnalyticsUtils.formatCurrency(optimization.current_price)}
              </p>
            </div>
            <div className="flex items-center">
              {isIncrease ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-500" />
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500">Recommended</p>
              <p className={`text-lg font-semibold ${isIncrease ? 'text-green-600' : 'text-blue-600'}`}>
                {AIAnalyticsUtils.formatCurrency(optimization.recommended_price)}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-gray-600 dark:text-gray-400 mb-1">Price Change</p>
              <p className={`font-semibold ${isIncrease ? 'text-green-600' : 'text-blue-600'}`}>
                {priceChange > 0 ? '+' : ''}{AIAnalyticsUtils.formatCurrency(priceChange)}
                <span className="text-xs ml-1">
                  ({priceChangePercent > 0 ? '+' : ''}{priceChangePercent.toFixed(1)}%)
                </span>
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-gray-600 dark:text-gray-400 mb-1">Revenue Impact</p>
              <p className={`font-semibold ${optimization.expected_revenue_change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {optimization.expected_revenue_change > 0 ? '+' : ''}
                {AIAnalyticsUtils.formatCurrency(optimization.expected_revenue_change)}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${AIAnalyticsUtils.getConfidenceColor(optimization.confidence_score)} bg-opacity-10`}>
            {AIAnalyticsUtils.formatPercentage(optimization.confidence_score * 100)} confident
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          Recommendation Reason
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {optimization.recommendation_reason}
        </p>
      </div>

      {optimization.implementation_tips.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Implementation Tips:</h4>
          <ul className="space-y-1">
            {optimization.implementation_tips.map((tip, idx) => (
              <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Demand change: {optimization.expected_demand_change > 0 ? '+' : ''}{optimization.expected_demand_change.toFixed(1)}%</span>
        </div>
        {onImplement && (
          <button
            onClick={() => onImplement(optimization)}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm rounded-lg transition-colors"
          >
            Implement
          </button>
        )}
      </div>
    </div>
  )
}

export default function PricingOptimizationWidget({
  optimizations,
  onImplement
}: PricingOptimizationWidgetProps) {
  if (optimizations.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <div className="text-center py-8">
          <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Pricing Optimizations</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Your current pricing appears to be optimized. Check back later for new recommendations.
          </p>
        </div>
      </div>
    )
  }

  const totalPotentialRevenue = optimizations.reduce(
    (sum, opt) => sum + opt.expected_revenue_change,
    0
  )

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Pricing Optimization Opportunities</h2>
            <p className="text-teal-100 mb-4">
              {optimizations.length} services have optimization potential
            </p>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-sm text-teal-100">Total Revenue Impact</p>
                <p className="text-2xl font-bold">
                  {totalPotentialRevenue > 0 ? '+' : ''}
                  {AIAnalyticsUtils.formatCurrency(totalPotentialRevenue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-teal-100">Services to Optimize</p>
                <p className="text-2xl font-bold">{optimizations.length}</p>
              </div>
            </div>
          </div>
          <DollarSign className="w-16 h-16 text-teal-200" />
        </div>
      </div>

      {/* Optimization Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {optimizations.map((optimization, idx) => (
          <PricingOptimizationCard
            key={idx}
            optimization={optimization}
            onImplement={onImplement}
          />
        ))}
      </div>

      {/* Implementation Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
              Implementation Guidelines
            </h4>
            <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Test price changes gradually to measure customer response</li>
              <li>• Communicate value improvements when increasing prices</li>
              <li>• Monitor booking rates closely for the first 2-4 weeks</li>
              <li>• Consider seasonal factors and local competition</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
