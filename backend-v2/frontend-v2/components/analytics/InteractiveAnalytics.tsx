'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
  Line,
  Bar,
  Doughnut
} from '@/lib/chartjs-dynamic'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProgressIndicator } from '@/components/ui/ProgressIndicator'
import { CalendarIcon, ArrowTrendingUpIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

interface AnalyticsData {
  revenue: {
    current: number
    target: number
    monthly: number[]
    labels: string[]
  }
  appointments: {
    total: number
    completed: number
    cancelled: number
    noShow: number
    daily: number[]
    labels: string[]
  }
  clients: {
    total: number
    new: number
    returning: number
    retention: number
  }
  performance: {
    avgServiceTime: number
    utilizationRate: number
    clientSatisfaction: number
  }
}

interface InteractiveAnalyticsProps {
  data?: AnalyticsData
  className?: string
  timeframe?: 'day' | 'week' | 'month' | 'year'
  sixFigureGoalEnabled?: boolean
}

// Default data for demonstration
const defaultData: AnalyticsData = {
  revenue: {
    current: 8450,
    target: 100000, // Six Figure Barber goal
    monthly: [5200, 6100, 7300, 8450, 7800, 9200, 10100, 8900, 9500, 10200, 8450, 0],
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  },
  appointments: {
    total: 45,
    completed: 38,
    cancelled: 4,
    noShow: 3,
    daily: [8, 12, 15, 18, 22, 25, 28],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  },
  clients: {
    total: 234,
    new: 12,
    returning: 22,
    retention: 85
  },
  performance: {
    avgServiceTime: 45,
    utilizationRate: 78,
    clientSatisfaction: 94
  }
}

export function InteractiveAnalytics({ 
  data = defaultData, 
  className,
  timeframe = 'month',
  sixFigureGoalEnabled = true
}: InteractiveAnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'appointments' | 'clients'>('overview')
  const [isAnimated, setIsAnimated] = useState(false)

  // Trigger animations after component mounts (tasteful restraint)
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 200)
    return () => clearTimeout(timer)
  }, [])

  // Six Figure Barber revenue progress calculation
  const revenueProgress = useMemo(() => {
    if (!sixFigureGoalEnabled) return null
    
    const currentYearRevenue = data.revenue.monthly.reduce((sum, month) => sum + month, 0)
    const progressPercentage = Math.min((currentYearRevenue / data.revenue.target) * 100, 100)
    const monthsRemaining = 12 - new Date().getMonth()
    const averageMonthlyNeeded = monthsRemaining > 0 
      ? (data.revenue.target - currentYearRevenue) / monthsRemaining 
      : 0

    return {
      current: currentYearRevenue,
      target: data.revenue.target,
      percentage: progressPercentage,
      monthlyTarget: averageMonthlyNeeded,
      onTrack: data.revenue.current >= averageMonthlyNeeded
    }
  }, [data, sixFigureGoalEnabled])

  // Chart configurations with tasteful design
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        border: {
          display: false
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        },
        border: {
          display: false
        }
      }
    },
    animation: {
      duration: isAnimated ? 300 : 0, // Respects tasteful restraint
      easing: 'easeOutCubic'
    }
  }

  const revenueChartData = {
    labels: data.revenue.labels,
    datasets: [
      {
        label: 'Revenue',
        data: data.revenue.monthly,
        borderColor: '#0891b2', // Primary color
        backgroundColor: 'rgba(8, 145, 178, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#0891b2',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  }

  const appointmentChartData = {
    labels: data.appointments.labels,
    datasets: [
      {
        label: 'Appointments',
        data: data.appointments.daily,
        backgroundColor: '#0891b2',
        borderColor: '#0891b2',
        borderWidth: 1,
        borderRadius: 4,
        borderSkipped: false
      }
    ]
  }

  const appointmentStatusData = {
    labels: ['Completed', 'Cancelled', 'No Show'],
    datasets: [
      {
        data: [data.appointments.completed, data.appointments.cancelled, data.appointments.noShow],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
        cutout: '70%'
      }
    ]
  }

  const TabButton = ({ id, label, icon: Icon, isActive }: {
    id: typeof activeTab
    label: string
    icon: React.ComponentType<{ className?: string }>
    isActive: boolean
  }) => (
    <Button
      onClick={() => setActiveTab(id)}
      variant={isActive ? 'primary' : 'ghost'}
      size="sm"
      className={cn(
        'transition-all duration-200 transform-gpu',
        isActive && 'shadow-sm'
      )}
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )

  return (
    <div className={cn('space-y-6', className)}>
      {/* Six Figure Barber Goal Tracking - Hero Element */}
      {sixFigureGoalEnabled && revenueProgress && (
        <Card variant="hero" borderAccent className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-1 h-12 bg-primary-500 rounded-full"></div>
                <div>
                  <CardTitle className="text-2xl">Six Figure Goal Progress</CardTitle>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    ${revenueProgress.current.toLocaleString()} of ${revenueProgress.target.toLocaleString()} annual target
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-primary-600">
                  {revenueProgress.percentage.toFixed(1)}%
                </div>
                <div className={cn(
                  'text-sm font-medium',
                  revenueProgress.onTrack ? 'text-green-600' : 'text-yellow-600'
                )}>
                  {revenueProgress.onTrack ? 'On Track' : 'Behind Target'}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <ProgressIndicator
                value={revenueProgress.percentage}
                variant="primary"
                size="lg"
                animated
                showGlow
                className="mb-4"
              />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-primary-50 dark:bg-primary-900/10 rounded-lg p-4">
                  <div className="text-sm font-medium text-primary-600 mb-1">Monthly Target</div>
                  <div className="text-2xl font-bold text-primary-700">
                    ${revenueProgress.monthlyTarget.toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-600 mb-1">Current Month</div>
                  <div className="text-2xl font-bold text-green-700">
                    ${data.revenue.current.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-600 mb-1">Remaining</div>
                  <div className="text-2xl font-bold text-gray-700">
                    ${(revenueProgress.target - revenueProgress.current).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center space-x-2 pb-4 border-b border-gray-200 dark:border-gray-700">
        <TabButton id="overview" label="Overview" icon={ArrowTrendingUpIcon} isActive={activeTab === 'overview'} />
        <TabButton id="revenue" label="Revenue" icon={ArrowTrendingUpIcon} isActive={activeTab === 'revenue'} />
        <TabButton id="appointments" label="Appointments" icon={CalendarIcon} isActive={activeTab === 'appointments'} />
        <TabButton id="clients" label="Clients" icon={UserIcon} isActive={activeTab === 'clients'} />
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Key Metrics Cards */}
            <Card variant="secondary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowTrendingUpIcon className="w-5 h-5" />
                  <span>Performance Metrics</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Client Satisfaction</span>
                    <div className="flex items-center space-x-2">
                      <ProgressIndicator
                        value={data.performance.clientSatisfaction}
                        size="sm"
                        variant="success"
                        className="w-16"
                      />
                      <span className="text-sm font-medium">{data.performance.clientSatisfaction}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Utilization Rate</span>
                    <div className="flex items-center space-x-2">
                      <ProgressIndicator
                        value={data.performance.utilizationRate}
                        size="sm"
                        variant="primary"
                        className="w-16"
                      />
                      <span className="text-sm font-medium">{data.performance.utilizationRate}%</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg Service Time</span>
                    <span className="text-sm font-medium">{data.performance.avgServiceTime} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appointment Status Breakdown */}
            <Card variant="secondary">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarIcon className="w-5 h-5" />
                  <span>Appointment Status</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48 relative">
                  <Doughnut data={appointmentStatusData} options={{
                    ...chartOptions,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        display: true,
                        position: 'bottom'
                      }
                    }
                  }} />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'revenue' && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monthly revenue progression toward six-figure goal
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Line data={revenueChartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'appointments' && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Appointment Activity</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Daily appointment volume for the current week
              </p>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <Bar data={appointmentChartData} options={chartOptions} />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'clients' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="default">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <UserIcon className="w-8 h-8 text-primary-600" />
                  <div>
                    <div className="text-2xl font-bold">{data.clients.total}</div>
                    <div className="text-sm text-gray-600">Total Clients</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="default">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold text-sm">+</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{data.clients.new}</div>
                    <div className="text-sm text-gray-600">New Clients</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="default">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-bold text-sm">↩</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{data.clients.returning}</div>
                    <div className="text-sm text-gray-600">Returning</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="default">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">%</span>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{data.clients.retention}%</div>
                    <div className="text-sm text-gray-600">Retention</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}

export default InteractiveAnalytics