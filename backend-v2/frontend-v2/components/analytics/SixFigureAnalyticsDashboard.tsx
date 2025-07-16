'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { getSixFigureBarberMetrics, SixFigureBarberMetrics } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/Button'
import { PageLoading, ErrorDisplay } from '@/components/ui/LoadingSystem'
import { formatters } from '@/lib/formatters'
import { 
  ChatBubbleLeftEllipsisIcon, 
  ChartBarIcon, 
  BoltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { InformationCircleIcon } from '@heroicons/react/24/outline'
import { MetricExplanations } from '@/lib/metric-explanations'

interface SixFigureAnalyticsDashboardProps {
  userId: number
  timeRange: string
  userName?: string
  todayStats?: {
    appointments: number
    revenue: number
    newClients: number
    completionRate: number
  }
}

interface CoachingInsight {
  type: 'success' | 'warning' | 'tip' | 'action'
  title: string
  message: string
  actionText?: string
  actionUrl?: string
}

export default function SixFigureAnalyticsDashboard({ 
  userId, 
  timeRange, 
  userName,
  todayStats = { appointments: 0, revenue: 0, newClients: 0, completionRate: 0 }
}: SixFigureAnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<SixFigureBarberMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetIncome, setTargetIncome] = useState(100000)
  const [retryCount, setRetryCount] = useState(0)
  const [insights, setInsights] = useState<CoachingInsight[]>([])
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0)

  // Generate coaching insights based on today's performance and metrics (memoized for performance)
  const generateInsights = useCallback((stats: typeof todayStats, metrics: SixFigureBarberMetrics | null): CoachingInsight[] => {
    const insights: CoachingInsight[] = []

    // Revenue coaching based on today's stats
    if (stats.revenue === 0) {
      insights.push({
        type: 'action',
        title: 'Revenue Opportunity',
        message: 'No revenue recorded today. Focus on booking high-value services or upselling existing clients.',
        actionText: 'View Services',
        actionUrl: '/admin/services'
      })
    } else if (stats.revenue < 200) {
      insights.push({
        type: 'tip',
        title: 'Revenue Growth',
        message: `$${stats.revenue} today - consider premium services or add-ons to increase per-client value.`,
        actionText: 'Pricing Strategy'
      })
    } else {
      insights.push({
        type: 'success',
        title: 'Strong Revenue Day',
        message: `Excellent! $${stats.revenue} today shows your Six Figure Barber methods are working.`
      })
    }

    // Six Figure Barber methodology insights
    if (metrics) {
      if (!metrics.targets.on_track) {
        insights.push({
          type: 'action',
          title: 'Six Figure Goal Focus',
          message: `You're ${Math.round(100 - (metrics.current_performance.monthly_revenue / metrics.targets.monthly_revenue_target) * 100)}% away from your monthly target. Consider the recommendations below.`,
          actionText: 'View Action Items'
        })
      }

      // Price optimization insight
      const increasePercentage = metrics.recommendations.price_optimization.recommended_increase_percentage
      if (increasePercentage && increasePercentage > 0) {
        // Safely format percentage with null checks
        const formattedPercentage = typeof increasePercentage === 'number' && !isNaN(increasePercentage) 
          ? increasePercentage.toFixed(1) 
          : '0'
        
        insights.push({
          type: 'tip',
          title: 'Pricing Optimization',
          message: `Consider a ${formattedPercentage}% price increase to reach your six-figure goal faster.`,
          actionText: 'Update Pricing'
        })
      }

      // Client acquisition insight
      const additionalClients = metrics?.recommendations?.client_acquisition?.additional_clients_needed || 0
      if (additionalClients > 0) {
        insights.push({
          type: 'action',
          title: 'Client Acquisition',
          message: `Acquire ${Math.round(additionalClients)} more clients per month to hit your target.`,
          actionText: 'Marketing Tools'
        })
      }
    }

    // Completion rate coaching
    if (stats.completionRate < 80) {
      insights.push({
        type: 'warning',
        title: 'Improve Show-up Rate',
        message: `${stats.completionRate}% completion rate. Send reminder texts and follow up with no-shows.`,
        actionText: 'Notification Settings',
        actionUrl: '/notifications'
      })
    }

    // Motivational Six Figure tips
    const motivationalTips = [
      {
        type: 'tip' as const,
        title: 'Six Figure Mindset',
        message: 'Every client interaction is an opportunity to build your brand and increase lifetime value.'
      },
      {
        type: 'tip' as const,
        title: 'Premium Positioning',
        message: 'Price your services based on value, not time. Quality work commands premium prices.'
      },
      {
        type: 'tip' as const,
        title: 'Client Relationships',
        message: 'Focus on retention over acquisition. A loyal client is worth 10x a one-time customer.'
      }
    ]
    
    insights.push(motivationalTips[Math.floor(Math.random() * motivationalTips.length)])

    return insights
  }, [])

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔍 Fetching Six Figure Barber metrics...', { targetIncome, userId })
      const data = await getSixFigureBarberMetrics(targetIncome, userId)
      
      console.log('📊 Received metrics data:', data)
      
      // Validate data structure before setting state
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data structure received from API')
      }
      
      // Check for required fields
      const requiredFields = ['current_performance', 'targets', 'recommendations'] as const
      const missingFields = requiredFields.filter(field => !data[field as keyof SixFigureBarberMetrics])
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
      }
      
      setMetrics(data)
      
      // Generate insights with the new data (with safety check)
      try {
        const newInsights = generateInsights(todayStats, data)
        setInsights(newInsights)
      } catch (insightError) {
        console.warn('Failed to generate insights:', insightError)
        setInsights([])
      }
      
      setRetryCount(0)
    } catch (err) {
      console.error('Failed to fetch Six Figure Barber metrics:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
  }, [userId, timeRange, targetIncome])

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    fetchMetrics()
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      case 'tip':
        return <LightBulbIcon className="w-5 h-5 text-blue-500" />
      case 'action':
        return <BoltIcon className="w-5 h-5 text-purple-500" />
      default:
        return <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const nextInsight = () => {
    setCurrentInsightIndex((prev) => (prev + 1) % insights.length)
  }

  const prevInsight = () => {
    setCurrentInsightIndex((prev) => (prev - 1 + insights.length) % insights.length)
  }

  // Memoize expensive calculations for performance - must be before conditional returns
  const progressPercentage = useMemo(() => {
    if (!metrics) return 0
    return (metrics.current_performance.monthly_revenue / metrics.targets.monthly_revenue_target) * 100
  }, [metrics])

  if (loading) {
    return (
      <div className="space-y-6">
        <PageLoading message="Loading Six Figure Barber analytics..." />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorDisplay 
        error={error}
        onRetry={handleRetry}
      />
    )
  }

  if (!metrics) {
    return null
  }

  const { current_performance, targets, recommendations, action_items } = metrics

  return (
    <div className="space-y-6">
      {/* Header Card with Goal Setting */}
      <Card className="border-l-4 border-primary-500">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl text-primary-900 dark:text-primary-100">
                Six Figure Barber Analytics
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Track your progress toward six-figure income with data-driven insights
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Annual Target:
              </label>
              <select
                value={targetIncome}
                onChange={(e) => setTargetIncome(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={75000}>$75,000</option>
                <option value={100000}>$100,000</option>
                <option value={125000}>$125,000</option>
                <option value={150000}>$150,000</option>
                <option value={200000}>$200,000</option>
              </select>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* AI Coach Section */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-800/30 rounded-lg">
                <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  6FB AI Coach
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {userName ? `Personalized insights for ${userName}` : 'Your daily business coaching'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="w-5 h-5 text-primary-500 dark:text-primary-400" />
              <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Six Figure Method</span>
            </div>
          </div>

          {insights.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-white/70 dark:bg-zinc-800/70 rounded-lg p-4 border border-primary-100 dark:border-zinc-600">
                <div className="flex items-start space-x-3">
                  {getIconForType(insights[currentInsightIndex].type)}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                      {insights[currentInsightIndex].title}
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {insights[currentInsightIndex].message}
                    </p>
                    {insights[currentInsightIndex].actionText && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (insights[currentInsightIndex].actionUrl) {
                            window.location.href = insights[currentInsightIndex].actionUrl!
                          }
                        }}
                        className="text-xs"
                      >
                        {insights[currentInsightIndex].actionText}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {insights.length > 1 && (
                <div className="flex items-center justify-between">
                  <button
                    onClick={prevInsight}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    ← Previous
                  </button>
                  <div className="flex space-x-1">
                    {insights.map((_, index) => (
                      <div
                        key={index}
                        className={`w-2 h-2 rounded-full ${
                          index === currentInsightIndex 
                            ? 'bg-primary-600 dark:bg-primary-400' 
                            : 'bg-primary-200 dark:bg-primary-600/30'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={nextInsight}
                    className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    Next →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-600 dark:text-gray-400">Loading coaching insights...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className={`${targets.on_track ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/30' : 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/30'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Progress</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        type="button" 
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200" 
                        aria-label="Metric explanation"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <InformationCircleIcon className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 dark:text-white">{MetricExplanations.monthlyProgress.explanation}</p>
                        {MetricExplanations.monthlyProgress.details && (
                          <p className="text-gray-600 dark:text-gray-400 text-xs">{MetricExplanations.monthlyProgress.details}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.round(progressPercentage)}%
                </p>
              </div>
              <div className={`p-3 rounded-full ${targets.on_track ? 'bg-green-100 dark:bg-green-800' : 'bg-yellow-100 dark:bg-yellow-800'}`}>
                {targets.on_track ? '🎯' : '⚡'}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
                <span>{formatters.currency(current_performance.monthly_revenue, { showCents: false })}</span>
                <span>{formatters.currency(targets.monthly_revenue_target, { showCents: false })}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${targets.on_track ? 'bg-green-500' : 'bg-yellow-500'}`}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Average Ticket</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        type="button" 
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200" 
                        aria-label="Metric explanation"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <InformationCircleIcon className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 dark:text-white">{MetricExplanations.averageTicket.explanation}</p>
                        {MetricExplanations.averageTicket.details && (
                          <p className="text-gray-600 dark:text-gray-400 text-xs">{MetricExplanations.averageTicket.details}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatters.currency(current_performance.average_ticket)}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-full">
                💰
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Target: {formatters.currency(recommendations?.price_optimization?.recommended_average_ticket || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Booking Rate</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        type="button" 
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200" 
                        aria-label="Metric explanation"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <InformationCircleIcon className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 dark:text-white">{MetricExplanations.bookingRate.explanation}</p>
                        {MetricExplanations.bookingRate.details && (
                          <p className="text-gray-600 dark:text-gray-400 text-xs">{MetricExplanations.bookingRate.details}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatters.percentage(current_performance.utilization_rate)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-800 rounded-full">
                ⏰
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Efficiency measure
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Clients</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        type="button" 
                        className="text-gray-400 hover:text-gray-600 transition-colors duration-200" 
                        aria-label="Metric explanation"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <InformationCircleIcon className="w-5 h-5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs p-3 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium text-gray-900 dark:text-white">{MetricExplanations.activeClients.explanation}</p>
                        {MetricExplanations.activeClients.details && (
                          <p className="text-gray-600 dark:text-gray-400 text-xs">{MetricExplanations.activeClients.details}</p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {current_performance.total_active_clients}
                </p>
              </div>
              <div className="p-3 bg-indigo-100 dark:bg-indigo-800 rounded-full">
                👥
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {formatters.number(current_performance.average_visits_per_client, 1)} visits/client avg
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              💡 Price Optimization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Current Average</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{formatters.currency(recommendations.price_optimization.current_average_ticket)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Recommended</span>
                <span className="text-lg font-bold text-green-700 dark:text-green-300">
                  {formatters.currency(recommendations?.price_optimization?.recommended_average_ticket || 0)}
                </span>
              </div>
              {recommendations.price_optimization.recommended_increase_percentage > 0 && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Recommendation:</strong> Consider increasing prices by{' '}
                    <span className="font-bold">
                      {recommendations.price_optimization.recommended_increase_percentage.toFixed(1)}%
                    </span>{' '}
                    to reach your income target.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📈 Client Acquisition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Current Monthly</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">{Math.round(recommendations?.client_acquisition?.current_monthly_clients || 0)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">Target Monthly</span>
                <span className="text-lg font-bold text-green-700 dark:text-green-300">
                  {Math.round(recommendations?.client_acquisition?.target_monthly_clients || 0)}
                </span>
              </div>
              {(recommendations?.client_acquisition?.additional_clients_needed || 0) > 0 && (
                <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    <strong>Goal:</strong> Acquire{' '}
                    <span className="font-bold">
                      {Math.round(recommendations?.client_acquisition?.additional_clients_needed || 0)} more clients per month
                    </span>{' '}
                    to reach your target.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Action Items to Reach Six Figures
          </CardTitle>
        </CardHeader>
        <CardContent>
          {action_items && action_items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {action_items.map((item, index) => (
                <div key={`action-item-${index}`} className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {typeof item === 'string' ? item : item.title || item.description || 'Action item'}
                    </p>
                    {typeof item === 'object' && item.description && item.title !== item.description && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {item.description}
                      </p>
                    )}
                    {typeof item === 'object' && item.expected_impact && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Expected impact: {item.expected_impact}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              Great job! You're on track to reach your six-figure goal. Keep up the excellent work!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Revenue Gap Analysis */}
      {targets.revenue_gap > 0 && (
        <Card className="border-l-4 border-orange-500 dark:border-orange-400">
          <CardHeader>
            <CardTitle className="text-orange-900 dark:text-orange-100">Revenue Gap Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  {formatters.currency(targets.revenue_gap, { showCents: false })}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Monthly Gap</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {formatters.currency(targets.daily_revenue_target, { showCents: false })}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Daily Target</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {formatters.number(targets.daily_clients_target, 1)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">Daily Clients Needed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}