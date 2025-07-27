'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ExclamationTriangleIcon, 
  ChartBarIcon, 
  ArrowTrendingUpIcon,
  BellIcon,
  ChevronRightIcon,
  ClockIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

/**
 * Types for Smart Insights
 */
interface InsightAction {
  type: string
  label: string
  description: string
  endpoint?: string
  params?: Record<string, any>
  icon?: string
}

interface ConsolidatedInsight {
  id: string
  title: string
  description: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  category: 'revenue' | 'retention' | 'efficiency' | 'growth' | 'quality' | 'opportunity' | 'risk'
  impact_score: number
  urgency_score: number
  confidence: number
  source: string
  metric_name: string
  current_value?: number
  target_value?: number
  trend?: string
  created_at: string
  expires_at?: string
  time_horizon: string
  actions: InsightAction[]
  recommended_action?: string
  tags: string[]
}

interface PriorityInsightResponse {
  priority_insight: ConsolidatedInsight | null
  has_critical_insights: boolean
  critical_count: number
  business_health_level: string
  last_updated: string
}

/**
 * Props for PriorityInsightWidget
 */
interface PriorityInsightWidgetProps {
  userId?: number
  className?: string
  onActionClick?: (action: InsightAction, insight: ConsolidatedInsight) => void
  autoRefresh?: boolean
  refreshInterval?: number // in seconds
}

/**
 * Priority Insight Widget - Displays the most critical insight requiring immediate attention
 * 
 * Features:
 * - Shows the highest priority insight with visual prominence
 * - Priority-based styling (critical = red, high = amber, etc.)
 * - Quick action buttons for immediate response
 * - Auto-refresh capability for real-time updates
 * - Loading and error states
 * - Responsive design for dashboard integration
 */
export function PriorityInsightWidget({
  userId,
  className = '',
  onActionClick,
  autoRefresh = true,
  refreshInterval = 300 // 5 minutes default
}: PriorityInsightWidgetProps) {
  const [insightData, setInsightData] = useState<PriorityInsightResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const router = useRouter()

  // Fetch priority insight data
  const fetchPriorityInsight = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (userId) params.append('user_id', userId.toString())
      
      const response = await fetch(`/api/v2/smart-insights/priority?${params}`)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setInsightData(data)
      setLastRefresh(new Date())
    } catch (err) {
      console.error('Error fetching priority insight:', err)
      setError(err instanceof Error ? err.message : 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }, [userId])

  // Initial load
  useEffect(() => {
    fetchPriorityInsight()
  }, [userId, fetchPriorityInsight])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(fetchPriorityInsight, refreshInterval * 1000)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, userId, fetchPriorityInsight])

  // Get priority styling
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'critical':
        return {
          cardClass: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950',
          badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          iconClass: 'text-red-600 dark:text-red-400',
          titleClass: 'text-red-900 dark:text-red-100'
        }
      case 'high':
        return {
          cardClass: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950',
          badgeClass: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
          iconClass: 'text-amber-600 dark:text-amber-400',
          titleClass: 'text-amber-900 dark:text-amber-100'
        }
      case 'medium':
        return {
          cardClass: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
          badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          iconClass: 'text-blue-600 dark:text-blue-400',
          titleClass: 'text-blue-900 dark:text-blue-100'
        }
      default:
        return {
          cardClass: 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900',
          badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
          iconClass: 'text-gray-600 dark:text-gray-400',
          titleClass: 'text-gray-900 dark:text-gray-100'
        }
    }
  }

  // Get category icon
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'revenue':
        return ChartBarIcon
      case 'growth':
        return ArrowTrendingUpIcon
      case 'opportunity':
        return SparklesIcon
      case 'risk':
        return ExclamationTriangleIcon
      default:
        return BellIcon
    }
  }

  // Handle action click
  const handleActionClick = (action: InsightAction, insight: ConsolidatedInsight) => {
    if (onActionClick) {
      onActionClick(action, insight)
    } else if (action.endpoint) {
      router.push(action.endpoint)
    }
  }

  // Handle view all insights
  const handleViewAllInsights = () => {
    router.push('/analytics/insights')
  }

  // Loading state
  if (loading) {
    return (
      <Card className={`${className}`} variant="default" padding="lg">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={`border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950 ${className}`} variant="default" padding="lg">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-red-900 dark:text-red-100">
                Unable to Load Insights
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                {error}
              </p>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={fetchPriorityInsight}
                className="mt-2 text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900"
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No insights state
  if (!insightData?.priority_insight) {
    return (
      <Card className={`border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 ${className}`} variant="default" padding="lg">
        <CardContent className="p-4">
          <div className="flex items-center space-x-3">
            <SparklesIcon className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                All Systems Running Smoothly
              </h3>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                No critical insights requiring immediate attention. Your business is performing well!
              </p>
              {insightData?.business_health_level && (
                <Badge className="mt-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Health: {insightData.business_health_level}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const insight = insightData.priority_insight
  const priorityStyle = getPriorityStyle(insight.priority)
  const CategoryIcon = getCategoryIcon(insight.category)

  return (
    <Card className={`${priorityStyle.cardClass} ${className}`} variant="default" padding="lg">
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <CategoryIcon className={`w-8 h-8 ${priorityStyle.iconClass} flex-shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <Badge className={priorityStyle.badgeClass}>
                  {insight.priority.toUpperCase()}
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {insight.category}
                </span>
              </div>
              <h3 className={`text-sm font-semibold ${priorityStyle.titleClass} leading-tight`}>
                {insight.title}
              </h3>
            </div>
          </div>
          
          {/* Critical count indicator */}
          {insightData.has_critical_insights && (
            <Badge variant="destructive" className="ml-2 flex-shrink-0">
              {insightData.critical_count} critical
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-xs text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
          {insight.description}
        </p>

        {/* Metrics */}
        {(insight.current_value !== undefined || insight.trend) && (
          <div className="flex items-center space-x-4 mb-3 text-xs">
            {insight.current_value !== undefined && (
              <div className="flex items-center space-x-1">
                <span className="text-gray-500 dark:text-gray-400">Current:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {typeof insight.current_value === 'number' 
                    ? insight.current_value.toLocaleString() 
                    : insight.current_value}
                </span>
              </div>
            )}
            {insight.target_value !== undefined && (
              <div className="flex items-center space-x-1">
                <span className="text-gray-500 dark:text-gray-400">Target:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {typeof insight.target_value === 'number' 
                    ? insight.target_value.toLocaleString() 
                    : insight.target_value}
                </span>
              </div>
            )}
            {insight.trend && (
              <div className="flex items-center space-x-1">
                <span className="text-gray-500 dark:text-gray-400">Trend:</span>
                <span className={`font-medium ${
                  insight.trend === 'improving' ? 'text-green-600 dark:text-green-400' :
                  insight.trend === 'declining' ? 'text-red-600 dark:text-red-400' :
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {insight.trend}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            {insight.actions.slice(0, 2).map((action, index) => (
              <Button
                key={index}
                size="sm"
                variant="outline"
                onClick={() => handleActionClick(action, insight)}
                className="text-xs"
              >
                {action.label}
              </Button>
            ))}
            {insight.actions.length > 2 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                +{insight.actions.length - 2} more
              </span>
            )}
          </div>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleViewAllInsights}
            className="text-xs flex items-center space-x-1"
          >
            <span>View All</span>
            <ChevronRightIcon className="w-3 h-3" />
          </Button>
        </div>

        {/* Time info */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
            <ClockIcon className="w-3 h-3" />
            <span>Updated {new Date(insightData.last_updated).toLocaleTimeString()}</span>
          </div>
          
          {insight.confidence && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {Math.round(insight.confidence * 100)}% confidence
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default PriorityInsightWidget