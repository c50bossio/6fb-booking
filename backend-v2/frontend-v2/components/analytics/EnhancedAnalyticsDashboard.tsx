'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LineChart, BarChart, DoughnutChart } from '@/components/analytics/ChartComponents'
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  ArrowRightIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ClockIcon,
  StarIcon,
  BoltIcon,
  LightBulbIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

// Import AI Components
import AIInsightsPanel from '@/components/ai/AIInsightsPanel'
import BenchmarkWidget from '@/components/ai/BenchmarkWidget'

// No registration needed for lightweight chart components

interface EnhancedAnalyticsDashboardProps {
  userId: number
  timeRange: string
}

interface RevenueData {
  labels: string[]
  current: number[]
  target: number[]
  previous: number[]
}

interface PerformanceScore {
  overall: number
  revenue: number
  efficiency: number
  clients: number
  growth: number
  consistency: number
}

interface ClientSegment {
  name: string
  count: number
  value: number
  color: string
}

export default function EnhancedAnalyticsDashboard({ userId, timeRange }: EnhancedAnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [performanceScore, setPerformanceScore] = useState<PerformanceScore | null>(null)
  const [clientSegments, setClientSegments] = useState<ClientSegment[]>([])
  const [realTimeMetrics, setRealTimeMetrics] = useState<any>(null)
  const [insights, setInsights] = useState<any[]>([])

  useEffect(() => {
    loadAnalyticsData()
  }, [userId, timeRange])

  const loadAnalyticsData = async () => {
    setLoading(true)
    
    // Mock data - in production this would come from API
    const mockRevenueData: RevenueData = {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      current: [2100, 2450, 2800, 3200],
      target: [2500, 2500, 2500, 2500],
      previous: [1900, 2200, 2100, 2400]
    }

    const mockPerformanceScore: PerformanceScore = {
      overall: 78,
      revenue: 82,
      efficiency: 75,
      clients: 80,
      growth: 85,
      consistency: 68
    }

    const mockClientSegments: ClientSegment[] = [
      { name: 'VIP Clients', count: 25, value: 12500, color: '#10B981' },
      { name: 'Regular Clients', count: 45, value: 18000, color: '#3B82F6' },
      { name: 'Returning Clients', count: 30, value: 9000, color: '#F59E0B' },
      { name: 'New Clients', count: 20, value: 4000, color: '#EF4444' }
    ]

    const mockRealTimeMetrics = {
      today: { revenue: 420, appointments: 8, target_progress: 68 },
      week: { revenue: 1890, appointments: 32, avg_per_day: 270 },
      month: { revenue: 8240, appointments: 142, target_progress: 82 }
    }

    const mockInsights = [
      {
        type: 'success',
        title: 'Revenue Target Exceeded',
        message: 'You exceeded your weekly revenue target by 15%!',
        icon: 'trending-up'
      },
      {
        type: 'opportunity',
        title: 'Pricing Optimization',
        message: 'Consider increasing prices for your premium services by 10%.',
        icon: 'lightbulb'
      },
      {
        type: 'warning',
        title: 'Client Retention Alert',
        message: '5 VIP clients haven\'t booked in 30+ days.',
        icon: 'exclamation'
      }
    ]

    // Simulate API delay
    setTimeout(() => {
      setRevenueData(mockRevenueData)
      setPerformanceScore(mockPerformanceScore)
      setClientSegments(mockClientSegments)
      setRealTimeMetrics(mockRealTimeMetrics)
      setInsights(mockInsights)
      setLoading(false)
    }, 1000)
  }

  const getPerformanceColor = (score: number): string => {
    if (score >= 85) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 55) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getPerformanceLevel = (score: number): string => {
    if (score >= 85) return 'Excellent'
    if (score >= 70) return 'Good'
    if (score >= 55) return 'Fair'
    return 'Needs Improvement'
  }

  const getInsightIcon = (iconType: string) => {
    switch (iconType) {
      case 'trending-up':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
      case 'lightbulb':
        return <LightBulbIcon className="w-5 h-5 text-blue-500" />
      case 'exclamation':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      default:
        return <CheckCircleIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const revenueChartData = revenueData ? {
    labels: revenueData.labels,
    datasets: [
      {
        label: 'Current Period',
        data: revenueData.current,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 6
      },
      {
        label: 'Target',
        data: revenueData.target,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderDash: [5, 5],
        fill: false,
        tension: 0
      },
      {
        label: 'Previous Period',
        data: revenueData.previous,
        borderColor: 'rgb(156, 163, 175)',
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        fill: false,
        tension: 0.4
      }
    ]
  } : null

  const clientSegmentChartData = {
    labels: clientSegments.map(segment => segment.name),
    datasets: [
      {
        data: clientSegments.map(segment => segment.value),
        backgroundColor: clientSegments.map(segment => segment.color),
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  }

  const performanceChartData = performanceScore ? {
    labels: ['Revenue', 'Efficiency', 'Clients', 'Growth', 'Consistency'],
    datasets: [
      {
        label: 'Performance Score',
        data: [
          performanceScore.revenue,
          performanceScore.efficiency,
          performanceScore.clients,
          performanceScore.growth,
          performanceScore.consistency
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        borderRadius: 4
      }
    ]
  } : null

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        },
        ticks: {
          callback: function(value: any) {
            return '$' + value.toLocaleString()
          }
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const segment = clientSegments[context.dataIndex]
            return `${segment.name}: $${segment.value.toLocaleString()} (${segment.count} clients)`
          }
        }
      }
    },
    cutout: '60%'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Tab Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Enhanced Analytics Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced Six Figure Barber analytics with real-time insights
          </p>
        </div>
        
        <div className="flex space-x-2">
          {['overview', 'revenue', 'performance', 'clients'].map((tab) => (
            <Button
              key={tab}
              variant={activeTab === tab ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab(tab)}
              className="capitalize"
            >
              {tab}
            </Button>
          ))}
        </div>
      </div>

      {/* AI Insights Panel - Revolutionary Feature */}
      <div className="mb-8">
        <AIInsightsPanel 
          userId={userId} 
          className="w-full"
          onInsightClick={(insight) => {
            console.log('Insight clicked:', insight)
            // You can add custom insight handling here
          }}
        />
      </div>

      {/* AI-Enhanced Metrics Cards with Industry Benchmarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Benchmark Widget */}
        <BenchmarkWidget
          metric="revenue"
          label="Monthly Revenue"
          value={realTimeMetrics?.month.revenue || 0}
          unit=""
          icon={<CurrencyDollarIcon className="w-5 h-5 text-blue-600" />}
          showDetails={true}
          className="border-l-4 border-blue-500"
        />

        {/* Appointment Volume Benchmark Widget */}
        <BenchmarkWidget
          metric="appointments"
          label="Monthly Appointments"
          value={realTimeMetrics?.month.appointments || 0}
          icon={<ClockIcon className="w-5 h-5 text-green-600" />}
          showDetails={true}
          className="border-l-4 border-green-500"
        />

        {/* Efficiency Benchmark Widget */}
        <BenchmarkWidget
          metric="efficiency"
          label="Revenue per Appointment"
          value={realTimeMetrics?.week.avg_per_appointment || 0}
          unit=""
          icon={<BoltIcon className="w-5 h-5 text-purple-600" />}
          showDetails={true}
          className="border-l-4 border-purple-500"
        />

        {/* Traditional Today's Revenue Card */}
        <Card className="border-l-4 border-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${realTimeMetrics?.today.revenue.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  {realTimeMetrics?.today.target_progress}% of daily target
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <StarIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Performance Score</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {performanceScore?.overall}%
                </p>
                <p className={`text-sm ${getPerformanceColor(performanceScore?.overall || 0)}`}>
                  {getPerformanceLevel(performanceScore?.overall || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <StarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Progress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {realTimeMetrics?.month.target_progress}%
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ${realTimeMetrics?.month.revenue.toLocaleString()} revenue
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <ArrowTrendingUpIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BoltIcon className="w-5 h-5 text-purple-500" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {insights.map((insight, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                <div className="flex items-start gap-3">
                  {getInsightIcon(insight.icon)}
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {insight.title}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {insight.message}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {revenueChartData && (
                  <LineChart data={revenueChartData} height={300} className="w-full" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Segments */}
          <Card>
            <CardHeader>
              <CardTitle>Client Value Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <DoughnutChart data={clientSegmentChartData} height={300} className="w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Breakdown Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                {performanceChartData && (
                  <BarChart data={performanceChartData} height={300} className="w-full" />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics Details */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {performanceScore && Object.entries({
                  'Revenue Performance': performanceScore.revenue,
                  'Operational Efficiency': performanceScore.efficiency,
                  'Client Relationships': performanceScore.clients,
                  'Growth Trajectory': performanceScore.growth,
                  'Business Consistency': performanceScore.consistency
                }).map(([metric, score]) => (
                  <div key={metric} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {metric}
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getPerformanceColor(score).includes('green') ? 'bg-green-500' : 
                            getPerformanceColor(score).includes('blue') ? 'bg-blue-500' :
                            getPerformanceColor(score).includes('yellow') ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${score}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-semibold ${getPerformanceColor(score)}`}>
                        {score}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium">Optimize High-Demand Services</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Increase prices by 10-15% for services with 95%+ completion rates
                </div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium">Launch VIP Loyalty Program</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Target your top 25 clients with exclusive benefits
                </div>
              </div>
            </Button>
            
            <Button variant="outline" className="h-auto p-4 justify-start">
              <div className="text-left">
                <div className="font-medium">Reduce No-Show Rate</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Implement SMS reminders and booking deposits
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}