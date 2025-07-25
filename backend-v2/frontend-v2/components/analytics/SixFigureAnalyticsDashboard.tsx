'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { getSixFigureBarberMetrics, SixFigureBarberMetrics, getSixFBProgressTracking, SixFBProgressData } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PageLoading, ErrorDisplay } from '@/components/LoadingStates'
import { formatters } from '@/lib/formatters'
import { 
  ChatBubbleLeftEllipsisIcon, 
  ChartBarIcon, 
  BoltIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'

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
  const [progressData, setProgressData] = useState<SixFBProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [targetIncome, setTargetIncome] = useState(100000)
  const [retryCount, setRetryCount] = useState(0)
  const [insights, setInsights] = useState<CoachingInsight[]>([])
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0)
  const [activeCoachingTab, setActiveCoachingTab] = useState<'insights' | 'progress' | 'milestones'>('insights')
  const [isPriorityRecommendationsCollapsed, setIsPriorityRecommendationsCollapsed] = useState(true)

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
      if (metrics.recommendations.price_optimization.recommended_increase_percentage > 0) {
        insights.push({
          type: 'tip',
          title: 'Pricing Optimization',
          message: `Consider a ${metrics.recommendations.price_optimization.recommended_increase_percentage.toFixed(1)}% price increase to reach your six-figure goal faster.`,
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
      
      console.log('🔍 Fetching Six Figure Barber metrics and progress...', { targetIncome, userId })
      
      // Fetch both metrics and progress data in parallel
      const [metricsData, progressTracking] = await Promise.all([
        getSixFigureBarberMetrics(targetIncome, userId),
        getSixFBProgressTracking(targetIncome, userId).catch(err => {
          console.warn('Progress tracking failed:', err)
          return null
        })
      ])
      
      console.log('📊 Received metrics data:', metricsData)
      console.log('🎯 Received progress data:', progressTracking)
      
      // Validate metrics data structure before setting state
      if (!metricsData || typeof metricsData !== 'object') {
        throw new Error('Invalid metrics data structure received from API')
      }
      
      // Check for required fields
      const requiredFields: (keyof SixFigureBarberMetrics)[] = ['current_performance', 'targets', 'recommendations']
      const missingFields = requiredFields.filter(field => !metricsData[field])
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
      }
      
      setMetrics(metricsData)
      setProgressData(progressTracking)
      
      // Generate insights with the new data (with safety check)
      try {
        const newInsights = generateInsights(todayStats, metricsData)
        setInsights(newInsights)
      } catch (insightError) {
        console.warn('Failed to generate insights:', insightError)
        setInsights([])
      }
      
      setRetryCount(0)
    } catch (err) {
      console.error('Failed to fetch Six Figure Barber data:', err)
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

      {/* Enhanced 6FB AI Coach Section */}
      <Card variant="elevated" padding="lg">
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
                  {userName ? `Comprehensive coaching for ${userName}` : 'Your AI business advisor'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ChartBarIcon className="w-5 h-5 text-primary-500 dark:text-primary-400" />
              <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">Six Figure Method</span>
            </div>
          </div>

          {/* Coach Navigation Tabs */}
          <div className="flex space-x-1 mb-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {[
              { key: 'insights', label: 'AI Insights', icon: '🤖' },
              { key: 'progress', label: 'Progress', icon: '📈' },
              { key: 'milestones', label: 'Milestones', icon: '🏆' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveCoachingTab(tab.key as any)}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeCoachingTab === tab.key
                    ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* AI Insights Tab */}
          {activeCoachingTab === 'insights' && (
            <div className="space-y-4">
              {/* Six Figure Barber Methodology Overview */}
              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg p-4 border border-orange-100 dark:border-orange-800 mb-4">
                <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100 mb-2 flex items-center">
                  🏆 Six Figure Barber Methodology Status
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      ${metrics?.current_performance?.annual_revenue_projection?.toLocaleString() || '0'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Annual Projection</p>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {metrics?.current_performance?.utilization_rate?.toFixed(1) || '0'}%
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Utilization Rate</p>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">
                      ${metrics?.current_performance?.average_ticket?.toFixed(0) || '0'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Average Ticket</p>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3">
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {metrics?.current_performance?.total_active_clients || '0'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Active Clients</p>
                  </div>
                </div>
                
                {/* Six Figure Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Progress to Six Figures</span>
                    <span>{((metrics?.current_performance?.annual_revenue_projection || 0) / (metrics?.targets?.annual_income_target || 100000) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div 
                      className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(((metrics?.current_performance?.annual_revenue_projection || 0) / (metrics?.targets?.annual_income_target || 100000) * 100), 100)}%` 
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span>$0</span>
                    <span className="font-medium">${(metrics?.targets?.annual_income_target || 100000).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Professional Coaching Insights from Backend */}
              {metrics?.coaching_insights && metrics.coaching_insights.length > 0 ? (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg p-2 -m-2 transition-colors mb-3"
                    onClick={() => setIsPriorityRecommendationsCollapsed(!isPriorityRecommendationsCollapsed)}
                  >
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      🎯 Priority Recommendations
                    </h4>
                    {isPriorityRecommendationsCollapsed ? (
                      <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronUpIcon className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  {!isPriorityRecommendationsCollapsed && (
                    <div className="space-y-3">
                      {metrics.coaching_insights.slice(0, 3).map((insight, index) => (
                    <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${
                          insight.priority === 'critical' ? 'bg-red-100 dark:bg-red-900' :
                          insight.priority === 'high' ? 'bg-orange-100 dark:bg-orange-900' :
                          insight.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900' :
                          'bg-blue-100 dark:bg-blue-900'
                        }`}>
                          {insight.category === 'pricing' ? '💰' :
                           insight.category === 'client_acquisition' ? '👥' :
                           insight.category === 'retention' ? '🤝' :
                           insight.category === 'efficiency' ? '⚡' :
                           insight.category === 'service_mix' ? '🛠️' : '📊'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white text-sm">
                              {insight.title}
                            </h5>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              insight.priority === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              insight.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                              insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            }`}>
                              {insight.priority}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            {insight.message}
                          </p>
                          
                          <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-3">
                            💡 {insight.impact_description}
                          </p>

                          {/* Educational Section - Why This Matters */}
                          {insight.why_this_matters && (
                            <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 mb-3 border-l-4 border-blue-500">
                              <h6 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1 flex items-center">
                                🎓 Why This Matters
                              </h6>
                              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                {insight.why_this_matters}
                              </p>
                            </div>
                          )}

                          {/* Business Principle */}
                          {insight.business_principle && (
                            <div className="bg-purple-50/70 dark:bg-purple-900/20 rounded-lg p-3 mb-3 border-l-4 border-purple-500">
                              <h6 className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-1 flex items-center">
                                📈 Business Principle
                              </h6>
                              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                {insight.business_principle}
                              </p>
                            </div>
                          )}

                          {/* 6FB Methodology */}
                          {insight.six_fb_methodology && (
                            <div className="bg-orange-50/70 dark:bg-orange-900/20 rounded-lg p-3 mb-3 border-l-4 border-orange-500">
                              <h6 className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-1 flex items-center">
                                🏆 Six Figure Barber Method
                              </h6>
                              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                {insight.six_fb_methodology}
                              </p>
                            </div>
                          )}

                          {/* Market Context */}
                          {insight.market_context && (
                            <div className="bg-green-50/70 dark:bg-green-900/20 rounded-lg p-3 mb-3 border-l-4 border-green-500">
                              <h6 className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1 flex items-center">
                                🌍 Market Context
                              </h6>
                              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                                {insight.market_context}
                              </p>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="font-medium">Revenue impact:</span> +${insight.potential_revenue_increase.toLocaleString()}/year
                            <span className="mx-2">•</span>
                            <span className="font-medium">Timeline:</span> {insight.timeline}
                          </div>
                        </div>
                      </div>
                    </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Fallback to basic insights if backend coaching not available */}
                  {insights.length > 0 ? (
                    <>
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
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600 dark:text-gray-400">Loading coaching insights...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Daily Focus from Backend */}
              {metrics?.daily_focus && (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800 mt-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                    🎯 Today's Focus Areas
                  </h4>
                  <div className="space-y-2">
                    {metrics.daily_focus.daily_actions.slice(0, 2).map((action, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{action.action}</span>
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">({action.impact})</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-3 italic">
                    📊 Key metric: {metrics.daily_focus.key_metric_to_track}
                  </p>
                  <p className="text-sm text-primary-600 dark:text-primary-400 font-medium mt-2">
                    {metrics.daily_focus.motivational_message}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Progress Tab */}
          {activeCoachingTab === 'progress' && (
            <div className="space-y-4">
              {progressData ? (
                <>
                  {/* Six Figure Barber Methodology Progress Overview */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                      📊 Six Figure Barber Progress Tracking
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Annual Pace</p>
                        <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          ${progressData.progress_overview.current_annual_pace.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {progressData.progress_overview.current_annual_pace >= (progressData.progress_overview.monthly_target * 12) ? '🎯 On Track' : '⚠️ Behind'}
                        </p>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Progress</p>
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {progressData.progress_overview.progress_percentage.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          to Six Figures
                        </p>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Monthly Target</p>
                        <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          ${progressData.progress_overview.monthly_target.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          ${(progressData.progress_overview.monthly_target / 30).toFixed(0)}/day
                        </p>
                      </div>
                      <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 text-center">
                        <p className="text-xs text-gray-600 dark:text-gray-400">Trend</p>
                        <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                          {progressData.progress_overview.trend_direction === 'up' ? '📈' : 
                           progressData.progress_overview.trend_direction === 'down' ? '📉' : '➡️'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {progressData.progress_overview.trend_direction === 'up' ? 'Growing' : 
                           progressData.progress_overview.trend_direction === 'down' ? 'Declining' : 'Stable'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Methodology Implementation Progress */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        🎯 Core 6FB Metrics
                      </h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Average Ticket Value</span>
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              ${metrics?.current_performance?.average_ticket?.toFixed(0) || '0'}
                            </span>
                            <p className="text-xs text-gray-500">
                              Target: ${metrics?.targets?.ticket_increase?.target_average_ticket?.toFixed(0) || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Client Retention</span>
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {((metrics?.current_performance?.average_visits_per_client || 1) * 100 / 12).toFixed(1)}%
                            </span>
                            <p className="text-xs text-gray-500">
                              Monthly retention rate
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Utilization Rate</span>
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {metrics?.current_performance?.utilization_rate?.toFixed(1) || '0'}%
                            </span>
                            <p className="text-xs text-gray-500">
                              Target: {metrics?.targets?.utilization_increase?.target_utilization_rate?.toFixed(1) || '80'}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h5 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                        📈 Growth Trajectory
                      </h5>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Monthly Revenue</span>
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              ${metrics?.current_performance?.monthly_revenue?.toLocaleString() || '0'}
                            </span>
                            <p className="text-xs text-green-500">
                              Progress toward goal
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Client Base</span>
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {metrics?.current_performance?.total_active_clients || '0'}
                            </span>
                            <p className="text-xs text-gray-500">
                              Active clients
                            </p>
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Time to Goal</span>
                          <div className="text-right">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {progressData.progress_overview.months_to_goal?.toFixed(1) || 'N/A'} mo
                            </span>
                            <p className="text-xs text-gray-500">
                              at current rate
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Goal Analysis with 6FB Focus */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      🎯 Six Figure Barber Goal Analysis
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-700 dark:text-gray-300">Daily Targets</h5>
                        <div className="space-y-1 text-gray-600 dark:text-gray-400">
                          <p>• Revenue: ${progressData.progress_overview.daily_target.toFixed(0)}</p>
                          <p>• Clients: {Math.ceil((progressData.progress_overview.daily_target) / (metrics?.current_performance?.average_ticket || 50))} appointments</p>
                          <p>• Working days: {Math.ceil(progressData.progress_overview.monthly_target / progressData.progress_overview.daily_target)} per month</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-700 dark:text-gray-300">Monthly Breakdown</h5>
                        <div className="space-y-1 text-gray-600 dark:text-gray-400">
                          <p>• Target: ${progressData.progress_overview.monthly_target.toLocaleString()}</p>
                          <p>• Current: ${metrics?.current_performance?.monthly_revenue?.toLocaleString() || '0'}</p>
                          <p>• Gap: ${Math.max(0, progressData.progress_overview.monthly_target - (metrics?.current_performance?.monthly_revenue || 0)).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-700 dark:text-gray-300">6FB Success Factors</h5>
                        <div className="space-y-1 text-gray-600 dark:text-gray-400">
                          <p>• Premium pricing ✓</p>
                          <p>• Client relationships ✓</p>
                          <p>• Consistent quality ✓</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400">Loading progress data...</p>
                </div>
              )}
            </div>
          )}

          {/* Enhanced Milestones Tab */}
          {activeCoachingTab === 'milestones' && (
            <div className="space-y-4">
              {progressData ? (
                <>
                  {/* Enhanced Achievement Overview */}
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-yellow-100 dark:border-yellow-800">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                      🏆 Six Figure Journey Progress
                    </h4>
                    <div className="grid grid-cols-3 gap-4 text-center mb-4">
                      <div>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {progressData.achievement_summary.achieved_milestones}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Achieved</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {progressData.achievement_summary.achievement_percentage.toFixed(0)}%
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Complete</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {progressData.achievement_summary.priority_milestones.length}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">In Progress</p>
                      </div>
                    </div>
                    
                    {/* Overall Progress Bar */}
                    <div className="mb-2">
                      <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Journey to Six Figures</span>
                        <span>{progressData.achievement_summary.achievement_percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-yellow-500 h-3 rounded-full transition-all flex items-center justify-end"
                          style={{ width: `${Math.min(progressData.achievement_summary.achievement_percentage, 100)}%` }}
                        >
                          {progressData.achievement_summary.achievement_percentage > 10 && (
                            <span className="text-white text-xs font-bold mr-2">🚀</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Motivation Message */}
                    <div className="text-center mt-3">
                      <p className="text-sm font-medium text-orange-700 dark:text-orange-300">
                        {progressData.achievement_summary.achievement_percentage < 25 ? "🌱 Your journey has begun - every expert was once a beginner!" :
                         progressData.achievement_summary.achievement_percentage < 50 ? "📈 Building momentum - you're making real progress!" :
                         progressData.achievement_summary.achievement_percentage < 75 ? "🎯 You're hitting your stride - six figures is within reach!" :
                         progressData.achievement_summary.achievement_percentage < 95 ? "🔥 Almost there - the finish line is in sight!" :
                         "👑 Six Figure Barber achieved - time to set new goals!"}
                      </p>
                    </div>
                  </div>
                  
                  {/* Milestone Categories */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Active Milestones */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                        🎯 Priority Focus Areas
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-1 rounded-full">
                          Next 30 days
                        </span>
                      </h4>
                      {progressData.achievement_summary.priority_milestones.slice(0, 3).map((milestone, index) => (
                        <div key={milestone.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-lg">
                                  {milestone.type === 'revenue' ? '💰' :
                                   milestone.type === 'clients' ? '👥' :
                                   milestone.type === 'retention' ? '🤝' :
                                   milestone.type === 'efficiency' ? '⚡' :
                                   milestone.type === 'pricing' ? '🏷️' : '📊'}
                                </span>
                                <h5 className="font-medium text-gray-900 dark:text-white text-sm">
                                  {milestone.title}
                                </h5>
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                                {milestone.description || milestone.next_hint}
                              </p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              milestone.type === 'revenue' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                              milestone.type === 'clients' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              milestone.type === 'retention' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' :
                              milestone.type === 'efficiency' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                              {milestone.type}
                            </span>
                          </div>
                          
                          {/* Enhanced Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-gray-600 dark:text-gray-400">Progress</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {milestone.progress_percentage.toFixed(1)}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 relative">
                              <div 
                                className={`h-2 rounded-full transition-all ${
                                  milestone.progress_percentage >= 80 ? 'bg-green-500' :
                                  milestone.progress_percentage >= 60 ? 'bg-blue-500' :
                                  milestone.progress_percentage >= 40 ? 'bg-yellow-500' :
                                  'bg-red-500'
                                }`}
                                style={{ width: `${Math.min(milestone.progress_percentage, 100)}%` }}
                              />
                              {milestone.progress_percentage >= 90 && (
                                <div className="absolute right-1 top-0 h-2 flex items-center">
                                  <span className="text-xs">🎯</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Action Hint */}
                          {milestone.next_hint && (
                            <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-700 dark:text-blue-300">
                              💡 <span className="font-medium">Next Step:</span> {milestone.next_hint}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    
                    {/* Completed Milestones */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                        ✅ Recent Achievements
                        <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full">
                          This month
                        </span>
                      </h4>
                      
                      {/* Show completed milestones or encouragement */}
                      {progressData.achievement_summary.achieved_milestones > 0 ? (
                        <div className="space-y-2">
                          {/* Mock completed milestones - in real implementation, these would come from API */}
                          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-lg">🏆</span>
                              <span className="text-sm font-medium text-green-800 dark:text-green-300">
                                First $5K Month Achieved!
                              </span>
                            </div>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Completed 3 days ago • Revenue milestone
                            </p>
                          </div>
                          
                          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-lg">🎯</span>
                              <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                50 Regular Clients Goal
                              </span>
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              Completed 1 week ago • Client acquisition
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
                          <span className="text-2xl block mb-2">🌟</span>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            Your first milestone is waiting!
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Focus on the priority areas above to unlock your first achievement.
                          </p>
                        </div>
                      )}
                      
                      {/* Milestone Insights */}
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                        <h5 className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2 flex items-center">
                          📚 6FB Methodology Insight
                        </h5>
                        <p className="text-xs text-purple-700 dark:text-purple-300 leading-relaxed">
                          {progressData.achievement_summary.achievement_percentage < 30 ? 
                            "The Six Figure Barber method focuses on sustainable growth through value-based pricing and client relationship building. Each milestone builds the foundation for long-term success." :
                            progressData.achievement_summary.achievement_percentage < 70 ?
                            "You're applying the 6FB principles effectively. Remember: consistent premium service delivery creates loyal clients who become your best marketing asset." :
                            "Advanced 6FB implementation: You're now focused on optimization and scaling. Consider expanding your service offerings or exploring additional revenue streams."}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">Loading milestone data...</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Calculating your Six Figure Barber progress</p>
                </div>
              )}
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Monthly Progress</p>
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Average Ticket</p>
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Utilization Rate</p>
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Clients</p>
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