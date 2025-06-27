/**
 * Client Segmentation Widget Component
 * Displays AI-identified client segments with engagement strategies
 */

import React from 'react'
import {
  Users,
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  Heart,
  Star,
  AlertTriangle,
  UserCheck
} from 'lucide-react'
import { Doughnut } from 'react-chartjs-2'
import { ClientSegment, AIAnalyticsUtils } from '@/lib/api/ai-analytics'

interface ClientSegmentationWidgetProps {
  segments: ClientSegment[]
  onViewSegment?: (segment: ClientSegment) => void
  onImplementStrategy?: (segment: ClientSegment, strategy: string) => void
}

function ClientSegmentCard({
  segment,
  onViewSegment,
  onImplementStrategy
}: {
  segment: ClientSegment
  onViewSegment?: (segment: ClientSegment) => void
  onImplementStrategy?: (segment: ClientSegment, strategy: string) => void
}) {
  const getSegmentColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'high_value': return 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
      case 'premium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
      case 'loyal': return 'border-green-500 bg-green-50 dark:bg-green-900/20'
      case 'churn_risk': return 'border-red-500 bg-red-50 dark:bg-red-900/20'
      case 'casual': return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
      default: return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getGrowthPotentialColor = (potential: string) => {
    if (potential.includes('High')) return 'text-green-600 dark:text-green-400'
    if (potential.includes('Risk')) return 'text-red-600 dark:text-red-400'
    return 'text-yellow-600 dark:text-yellow-400'
  }

  return (
    <div className={`border-2 rounded-xl p-6 shadow-sm ${getSegmentColor(segment.segment_type)}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{AIAnalyticsUtils.getSegmentIcon(segment.segment_type)}</span>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {segment.segment_name}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {segment.description}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
              <p className="text-gray-500 text-xs">Size</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {segment.size} clients
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
              <p className="text-gray-500 text-xs">Avg LTV</p>
              <p className="font-semibold text-green-600">
                {AIAnalyticsUtils.formatCurrency(segment.avg_lifetime_value)}
              </p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-teal-600">
            {segment.revenue_contribution_percentage.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-500">of revenue</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            Visit Frequency
          </span>
          <span className="font-medium text-gray-900 dark:text-white">
            {segment.avg_visit_frequency.toFixed(1)} per month
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            Growth Potential
          </span>
          <span className={`font-medium ${getGrowthPotentialColor(segment.growth_potential)}`}>
            {segment.growth_potential}
          </span>
        </div>
      </div>

      {segment.engagement_strategies.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-500" />
            Engagement Strategies
          </h4>
          <div className="space-y-2">
            {segment.engagement_strategies.slice(0, 3).map((strategy, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between bg-white dark:bg-gray-800 rounded-lg p-2"
              >
                <span className="text-xs text-gray-600 dark:text-gray-400 flex-1">
                  {strategy}
                </span>
                {onImplementStrategy && (
                  <button
                    onClick={() => onImplementStrategy(segment, strategy)}
                    className="text-xs text-teal-600 hover:text-teal-700 font-medium ml-2"
                  >
                    Apply
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500">
          Segment Type: {segment.segment_type.replace('_', ' ')}
        </div>
        {onViewSegment && (
          <button
            onClick={() => onViewSegment(segment)}
            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-lg transition-colors"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  )
}

export default function ClientSegmentationWidget({
  segments,
  onViewSegment,
  onImplementStrategy
}: ClientSegmentationWidgetProps) {
  if (segments.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Client Segments</h3>
          <p className="text-gray-600 dark:text-gray-400">
            Need more client data to perform segmentation analysis. Check back after serving more clients.
          </p>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const chartData = {
    labels: segments.map(s => s.segment_name),
    datasets: [
      {
        data: segments.map(s => s.revenue_contribution_percentage),
        backgroundColor: [
          'rgba(139, 92, 246, 0.8)', // Purple
          'rgba(245, 158, 11, 0.8)',  // Yellow
          'rgba(34, 197, 94, 0.8)',   // Green
          'rgba(239, 68, 68, 0.8)',   // Red
          'rgba(59, 130, 246, 0.8)',  // Blue
          'rgba(107, 114, 128, 0.8)'  // Gray
        ],
        borderWidth: 0
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: '#94a3b8',
          padding: 10,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            return `${context.label}: ${context.parsed.toFixed(1)}% of revenue`
          }
        }
      }
    }
  }

  const totalClients = segments.reduce((sum, s) => sum + s.size, 0)
  const avgLifetimeValue = segments.reduce((sum, s) => sum + (s.avg_lifetime_value * s.size), 0) / totalClients

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">Client Segmentation Analysis</h2>
            <p className="text-blue-100 mb-4">
              AI-identified {segments.length} distinct client segments
            </p>
            <div className="flex items-center gap-6">
              <div>
                <p className="text-sm text-blue-100">Total Clients</p>
                <p className="text-2xl font-bold">{totalClients}</p>
              </div>
              <div>
                <p className="text-sm text-blue-100">Avg Lifetime Value</p>
                <p className="text-2xl font-bold">
                  {AIAnalyticsUtils.formatCurrency(avgLifetimeValue)}
                </p>
              </div>
              <div>
                <p className="text-sm text-blue-100">Segments</p>
                <p className="text-2xl font-bold">{segments.length}</p>
              </div>
            </div>
          </div>
          <Users className="w-16 h-16 text-blue-200" />
        </div>
      </div>

      {/* Segmentation Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Distribution</h3>
          <div className="h-64">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Segment Overview</h3>
          <div className="space-y-4">
            {segments.map((segment, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{AIAnalyticsUtils.getSegmentIcon(segment.segment_type)}</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{segment.segment_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {segment.size} clients • {segment.revenue_contribution_percentage.toFixed(1)}% revenue
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    {AIAnalyticsUtils.formatCurrency(segment.avg_lifetime_value)}
                  </p>
                  <p className="text-xs text-gray-500">Avg LTV</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Segment Detail Cards */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Segment Details & Strategies</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {segments.map((segment, idx) => (
            <ClientSegmentCard
              key={idx}
              segment={segment}
              onViewSegment={onViewSegment}
              onImplementStrategy={onImplementStrategy}
            />
          ))}
        </div>
      </div>

      {/* Action Recommendations */}
      <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-500 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-teal-800 dark:text-teal-200 mb-2">
              Segmentation Insights & Next Steps
            </h4>
            <ul className="text-xs text-teal-700 dark:text-teal-300 space-y-1">
              <li>• Focus retention efforts on high-value segments to maximize LTV</li>
              <li>• Create targeted marketing campaigns for each segment type</li>
              <li>• Implement loyalty programs for frequent visitors</li>
              <li>• Address churn risks with personalized re-engagement strategies</li>
              <li>• Upsell premium services to high-value casual clients</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
