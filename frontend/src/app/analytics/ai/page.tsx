'use client'

import { useState, useEffect } from 'react'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  DollarSign,
  Clock,
  Download,
  RefreshCw,
  AlertCircle,
  Lightbulb,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Award,
  ChevronRight,
  Eye,
  Calendar,
  Zap
} from 'lucide-react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, RadarChart, Radar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import {
  aiAnalyticsAPI,
  AIAnalyticsDashboard,
  AIAnalyticsUtils,
  RevenuePattern,
  RevenuePrediction,
  PricingOptimization,
  ClientSegment,
  RevenueInsight,
  PerformanceBenchmark,
  OptimizationGoal
} from '@/lib/api/ai-analytics'
import PricingOptimizationWidget from '@/components/ai-analytics/PricingOptimizationWidget'
import ClientSegmentationWidget from '@/components/ai-analytics/ClientSegmentationWidget'

// Using recharts - no registration needed

// Chart styling
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleColor: '#fff',
      bodyColor: '#94a3b8',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: {
        color: 'rgba(148, 163, 184, 0.1)'
      },
      ticks: {
        color: '#94a3b8'
      }
    },
    y: {
      grid: {
        color: 'rgba(148, 163, 184, 0.1)'
      },
      ticks: {
        color: '#94a3b8'
      }
    }
  }
}

// ====== COMPONENT INTERFACES ======

interface KPICardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ReactNode
  subtitle?: string
  color?: string
}

// ====== KPI CARD COMPONENT ======

function KPICard({ title, value, change, trend, icon, subtitle, color = 'teal' }: KPICardProps) {
  const colorClasses = {
    teal: 'bg-teal-500/10 text-teal-500',
    green: 'bg-green-500/10 text-green-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    orange: 'bg-orange-500/10 text-orange-500'
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className="flex items-center mt-2">
              {trend === 'up' ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : trend === 'down' ? (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              ) : null}
              <span className={`text-sm ${
                trend === 'up' ? 'text-green-500' :
                trend === 'down' ? 'text-red-500' :
                'text-gray-500'
              }`}>
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

// ====== PATTERN VISUALIZATION COMPONENT ======

function RevenuePatternCard({ pattern }: { pattern: RevenuePattern }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            {pattern.pattern_name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {pattern.pattern_description}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs font-medium px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded-full">
              {AIAnalyticsUtils.formatPatternType(pattern.pattern_type)}
            </span>
            <span className={`text-xs font-medium ${AIAnalyticsUtils.getConfidenceColor(pattern.confidence_score)}`}>
              {AIAnalyticsUtils.formatPercentage(pattern.confidence_score * 100)} confidence
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-500">
            {AIAnalyticsUtils.formatCurrency(pattern.avg_revenue_impact)}
          </p>
          <p className="text-xs text-gray-500">Impact potential</p>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recommendations:</h4>
        <ul className="space-y-1">
          {pattern.recommendations.slice(0, 3).map((rec, idx) => (
            <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
              <span className="text-teal-500 mt-0.5">•</span>
              {rec}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ====== PREDICTION CHART COMPONENT ======

function PredictionChart({ predictions }: { predictions: RevenuePrediction[] }) {
  const chartData = {
    labels: predictions.map(p => new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    datasets: [
      {
        label: 'Predicted Revenue',
        data: predictions.map(p => p.predicted_revenue),
        borderColor: 'rgb(20, 184, 166)',
        backgroundColor: 'rgba(20, 184, 166, 0.1)',
        fill: true,
        tension: 0.4
      },
      {
        label: 'Upper Bound',
        data: predictions.map(p => p.confidence_interval_high),
        borderColor: 'rgba(20, 184, 166, 0.3)',
        borderDash: [5, 5],
        fill: false
      },
      {
        label: 'Lower Bound',
        data: predictions.map(p => p.confidence_interval_low),
        borderColor: 'rgba(20, 184, 166, 0.3)',
        borderDash: [5, 5],
        fill: false
      }
    ]
  }

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Predictions</h3>
      <div className="h-64">
        <Line data={chartData} options={{
          ...chartOptions,
          plugins: {
            ...chartOptions.plugins,
            legend: {
              display: true,
              position: 'bottom' as const,
              labels: {
                color: '#94a3b8',
                padding: 10
              }
            }
          }
        }} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">Avg Confidence</p>
          <p className="text-lg font-semibold text-teal-500">
            {AIAnalyticsUtils.formatPercentage(
              predictions.reduce((sum, p) => sum + p.confidence_score, 0) / predictions.length * 100
            )}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">7-Day Total</p>
          <p className="text-lg font-semibold text-green-500">
            {AIAnalyticsUtils.formatCurrency(
              predictions.reduce((sum, p) => sum + p.predicted_revenue, 0)
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

// ====== INSIGHTS WIDGET COMPONENT ======

function InsightsWidget({ insights }: { insights: RevenueInsight[] }) {
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  const sortedInsights = insights.sort((a, b) =>
    priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
  )

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          AI Insights
        </h3>
        <span className="text-xs text-gray-500">{insights.length} insights</span>
      </div>

      <div className="space-y-3">
        {sortedInsights.slice(0, 5).map((insight, idx) => (
          <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">{insight.title}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${AIAnalyticsUtils.getPriorityColor(insight.priority)}`}>
                    {insight.priority}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{insight.description}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-green-500">
                  {AIAnalyticsUtils.formatCurrency(insight.potential_impact)}
                </p>
                <p className="text-xs text-gray-500">potential</p>
              </div>
            </div>

            {insight.recommendations.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-2">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Key Action:</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {insight.recommendations[0]}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ====== MAIN DASHBOARD COMPONENT ======

export default function AIAnalyticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Data states
  const [dashboardData, setDashboardData] = useState<AIAnalyticsDashboard | null>(null)
  const [patterns, setPatterns] = useState<RevenuePattern[]>([])
  const [predictions, setPredictions] = useState<RevenuePrediction[]>([])
  const [insights, setInsights] = useState<RevenueInsight[]>([])
  const [benchmarks, setBenchmarks] = useState<PerformanceBenchmark[]>([])
  const [goals, setGoals] = useState<OptimizationGoal[]>([])
  const [pricingOptimizations, setPricingOptimizations] = useState<PricingOptimization[]>([])
  const [clientSegments, setClientSegments] = useState<ClientSegment[]>([])

  // Fetch all AI analytics data
  const fetchData = async () => {
    if (!loading) setRefreshing(true)
    setLoading(true)
    setError(null)
    try {
      // Fetch comprehensive dashboard first
      const dashboard = await aiAnalyticsAPI.getDashboard()
      setDashboardData(dashboard)

      // Set individual data from dashboard
      setPatterns(dashboard.revenue_patterns)
      setPredictions(dashboard.predictions)
      setInsights(dashboard.insights)

      // Fetch additional detailed data
      const [benchmarkData, goalData, pricingData, segmentData] = await Promise.all([
        aiAnalyticsAPI.getPerformanceBenchmark(),
        aiAnalyticsAPI.getOptimizationGoals(),
        aiAnalyticsAPI.getPricingOptimization(),
        aiAnalyticsAPI.getClientSegments()
      ])

      setBenchmarks(benchmarkData)
      setGoals(goalData)
      setPricingOptimizations(pricingData)
      setClientSegments(segmentData)
      setLastUpdated(new Date())

    } catch (err: any) {
      console.error('Failed to fetch AI analytics:', err)
      setError(err.message || 'Failed to load AI analytics data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Export functionality
  const handleExport = async (format: 'csv' | 'pdf' | 'excel') => {
    try {
      const blob = await aiAnalyticsAPI.exportData(format)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `ai-analytics-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading AI Analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Unable to Load AI Analytics</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Brain className="w-8 h-8 text-teal-500" />
              AI Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Intelligent insights and optimization recommendations powered by machine learning
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-gray-500">
              {lastUpdated && (
                <>Last updated: {lastUpdated.toLocaleTimeString()}</>
              )}
            </div>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <div className="relative group">
              <button className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Export
              </button>
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
                >
                  Export as CSV
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Export as Excel
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg"
                >
                  Export as PDF
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <KPICard
              title="AI Performance Score"
              value={dashboardData.performance_score.toFixed(1)}
              icon={<Brain className="w-6 h-6" />}
              subtitle="Overall optimization"
              color="purple"
            />
            <KPICard
              title="Revenue Percentile"
              value={`${dashboardData.key_metrics.revenue_percentile.toFixed(0)}th`}
              icon={<Award className="w-6 h-6" />}
              subtitle="vs peers"
              color="green"
            />
            <KPICard
              title="Predicted Weekly Revenue"
              value={AIAnalyticsUtils.formatCurrency(dashboardData.key_metrics.predicted_weekly_revenue)}
              icon={<DollarSign className="w-6 h-6" />}
              subtitle="Next 7 days"
              color="teal"
            />
            <KPICard
              title="Growth Rate"
              value={`${(dashboardData.key_metrics.growth_rate * 100).toFixed(1)}%`}
              trend={dashboardData.key_metrics.growth_rate > 0 ? 'up' : 'down'}
              icon={<TrendingUp className="w-6 h-6" />}
              subtitle="Monthly"
              color="blue"
            />
            <KPICard
              title="Utilization Rate"
              value={`${dashboardData.key_metrics.utilization_rate.toFixed(1)}%`}
              icon={<Clock className="w-6 h-6" />}
              subtitle="Capacity usage"
              color="orange"
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white dark:bg-gray-900 rounded-lg p-1 mb-8 border border-gray-200 dark:border-gray-800">
          {[
            { key: 'overview', label: 'Overview', icon: Activity },
            { key: 'patterns', label: 'Patterns', icon: BarChart3 },
            { key: 'predictions', label: 'Predictions', icon: TrendingUp },
            { key: 'insights', label: 'Insights', icon: Lightbulb },
            { key: 'pricing', label: 'Pricing', icon: DollarSign },
            { key: 'segments', label: 'Segments', icon: Users },
            { key: 'benchmarks', label: 'Benchmarks', icon: Target }
          ].map((tab) => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-teal-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Revenue Predictions and Patterns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {predictions.length > 0 && <PredictionChart predictions={predictions} />}
              {insights.length > 0 && <InsightsWidget insights={insights} />}
            </div>

            {/* Revenue Patterns */}
            {patterns.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Revenue Patterns</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {patterns.slice(0, 3).map((pattern, idx) => (
                    <RevenuePatternCard key={idx} pattern={pattern} />
                  ))}
                </div>
              </div>
            )}

            {/* Optimization Goals */}
            {goals.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Optimization Goals</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {goals.slice(0, 3).map((goal, idx) => (
                    <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{goal.goal_name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{goal.description}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full ${AIAnalyticsUtils.getDifficultyColor(goal.estimated_difficulty)}`}>
                              {goal.estimated_difficulty}
                            </span>
                            <span className="text-xs text-gray-500">
                              {AIAnalyticsUtils.getDaysUntilTarget(goal.target_date)} days left
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-500">Progress</p>
                          <p className="text-2xl font-bold text-teal-500">
                            {goal.progress_percentage.toFixed(0)}%
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Current</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {typeof goal.current_value === 'number' && goal.goal_type === 'revenue'
                              ? AIAnalyticsUtils.formatCurrency(goal.current_value)
                              : goal.current_value}
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, goal.progress_percentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Target</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {typeof goal.target_value === 'number' && goal.goal_type === 'revenue'
                              ? AIAnalyticsUtils.formatCurrency(goal.target_value)
                              : goal.target_value}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'patterns' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Revenue Patterns Analysis</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {patterns.map((pattern, idx) => (
                <RevenuePatternCard key={idx} pattern={pattern} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'predictions' && predictions.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Revenue Predictions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <PredictionChart predictions={predictions} />
              </div>
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Prediction Details</h3>
                <div className="space-y-4">
                  {predictions.slice(0, 7).map((prediction, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(prediction.date).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {prediction.predicted_appointments} appointments
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-teal-600">
                          {AIAnalyticsUtils.formatCurrency(prediction.predicted_revenue)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {AIAnalyticsUtils.formatPercentage(prediction.confidence_score * 100)} confidence
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">AI Insights & Recommendations</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <InsightsWidget insights={insights} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Pricing Optimization</h2>
            <PricingOptimizationWidget
              optimizations={pricingOptimizations}
              onImplement={(optimization) => {
                console.log('Implementing pricing optimization:', optimization)
                // TODO: Implement pricing change logic
              }}
            />
          </div>
        )}

        {activeTab === 'segments' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Client Segmentation</h2>
            <ClientSegmentationWidget
              segments={clientSegments}
              onViewSegment={(segment) => {
                console.log('Viewing segment details:', segment)
                // TODO: Implement segment detail view
              }}
              onImplementStrategy={(segment, strategy) => {
                console.log('Implementing strategy:', strategy, 'for segment:', segment.segment_name)
                // TODO: Implement strategy application logic
              }}
            />
          </div>
        )}

        {activeTab === 'benchmarks' && benchmarks.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Performance Benchmarks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benchmarks.map((benchmark, idx) => (
                <div key={idx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{benchmark.metric}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Your Value</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {typeof benchmark.your_value === 'number' && benchmark.metric.includes('Revenue')
                              ? AIAnalyticsUtils.formatCurrency(benchmark.your_value)
                              : benchmark.your_value}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Peer Average</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {typeof benchmark.peer_average === 'number' && benchmark.metric.includes('Revenue')
                              ? AIAnalyticsUtils.formatCurrency(benchmark.peer_average)
                              : benchmark.peer_average}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${AIAnalyticsUtils.getBenchmarkStatusColor(benchmark.status)}`}>
                        {benchmark.percentile.toFixed(0)}th
                      </p>
                      <p className="text-xs text-gray-500">percentile</p>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-4">
                    <div
                      className={`h-2 rounded-full ${
                        benchmark.status === 'above_average' ? 'bg-green-500' :
                        benchmark.status === 'average' ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${benchmark.percentile}%` }}
                    />
                  </div>

                  {benchmark.improvement_tips.length > 0 && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Improvement Tips:</h4>
                      <ul className="space-y-1">
                        {benchmark.improvement_tips.slice(0, 2).map((tip, tipIdx) => (
                          <li key={tipIdx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="text-teal-500 mt-0.5">•</span>
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
