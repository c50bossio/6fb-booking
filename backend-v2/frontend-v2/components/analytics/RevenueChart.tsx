'use client'

import { useEffect, useState, useCallback } from 'react'
import { analyticsAPI, RevenueAnalytics } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageLoading, ErrorDisplay } from '@/components/ui/LoadingSystem'
import { LineChart } from './ChartComponents'
import { formatters } from '@/lib/formatters'

interface RevenueChartProps {
  userId?: number
  startDate?: string
  endDate?: string
  className?: string
  height?: number
  showHeader?: boolean
}

type TimePeriod = 'day' | 'week' | 'month' | 'year'

export default function RevenueChart({ 
  userId, 
  startDate, 
  endDate, 
  className = '',
  height = 400,
  showHeader = true 
}: RevenueChartProps) {
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('month')
  const [isAnimating, setIsAnimating] = useState(false)

  const fetchAnalytics = useCallback(async (groupBy: TimePeriod) => {
    try {
      setLoading(true)
      setError(null)
      setIsAnimating(true)
      
      const data = await analyticsAPI.revenue({
        userId,
        startDate,
        endDate,
        groupBy
      })
      
      // Simulate a brief animation delay for smooth transitions
      setTimeout(() => {
        setAnalytics(data)
        setIsAnimating(false)
      }, 150)
      
    } catch (err) {
      console.error('Failed to fetch revenue analytics:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load revenue data'
      setError(errorMessage)
      setIsAnimating(false)
    } finally {
      setLoading(false)
    }
  }, [userId, startDate, endDate])

  useEffect(() => {
    fetchAnalytics(selectedPeriod)
  }, [fetchAnalytics, selectedPeriod])

  const handlePeriodChange = useCallback((period: TimePeriod) => {
    if (period !== selectedPeriod) {
      setSelectedPeriod(period)
    }
  }, [selectedPeriod])

  if (loading && !analytics) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <PageLoading message="Loading revenue data..." />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <ErrorDisplay 
            error={error} 
            onRetry={() => fetchAnalytics(selectedPeriod)} 
          />
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return null
  }

  // Transform data for Chart.js
  const chartData = {
    labels: analytics.revenue_by_period.map(period => {
      const date = new Date(period.period)
      switch (selectedPeriod) {
        case 'day':
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        case 'week':
          return `Week ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
        case 'month':
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        case 'year':
          return date.getFullYear().toString()
        default:
          return period.period
      }
    }),
    datasets: [
      {
        label: 'Revenue',
        data: analytics.revenue_by_period.map(p => p.revenue),
        borderColor: '#0891b2',
        backgroundColor: 'rgba(8, 145, 178, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBorderWidth: 2,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#0891b2',
        pointHoverBorderColor: '#0891b2',
        pointHoverBackgroundColor: '#0891b2',
      },
      {
        label: 'Average Ticket',
        data: analytics.revenue_by_period.map(p => p.average_ticket),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        fill: false,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBorderWidth: 2,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#059669',
        yAxisID: 'y1',
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: '500',
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#0891b2',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        callbacks: {
          title: function(context: any) {
            return context[0]?.label || ''
          },
          label: function(context: any) {
            const label = context.dataset.label || ''
            const value = context.parsed.y
            if (label === 'Revenue') {
              return `Revenue: ${formatters.currency(value)}`
            } else if (label === 'Average Ticket') {
              return `Avg Ticket: ${formatters.currency(value)}`
            }
            return `${label}: ${formatters.currency(value)}`
          },
          afterBody: function(context: any) {
            const dataIndex = context[0]?.dataIndex
            if (dataIndex !== undefined && analytics.revenue_by_period[dataIndex]) {
              const period = analytics.revenue_by_period[dataIndex]
              return [
                '',
                `Appointments: ${period.appointments}`,
                `Revenue per Appt: ${formatters.currency(period.revenue / period.appointments)}`
              ]
            }
            return []
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280',
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        beginAtZero: true,
        grid: {
          color: 'rgba(107, 114, 128, 0.1)',
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280',
          callback: function(value: any) {
            return formatters.currency(value, { showCents: false })
          }
        },
        title: {
          display: true,
          text: 'Revenue',
          color: '#374151',
          font: {
            size: 12,
            weight: '500',
          }
        }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        beginAtZero: true,
        grid: {
          drawOnChartArea: false,
        },
        border: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
          },
          color: '#6b7280',
          callback: function(value: any) {
            return formatters.currency(value)
          }
        },
        title: {
          display: true,
          text: 'Avg Ticket',
          color: '#374151',
          font: {
            size: 12,
            weight: '500',
          }
        }
      }
    },
    animation: {
      duration: isAnimating ? 0 : 750,
      easing: 'easeInOutQuart' as const,
    }
  }

  // Calculate key metrics
  const totalRevenue = analytics.total_revenue
  const avgRevenue = analytics.revenue_by_period.length > 0 ? 
    analytics.revenue_by_period.reduce((sum, p) => sum + p.revenue, 0) / analytics.revenue_by_period.length : 0
  const maxRevenue = Math.max(...analytics.revenue_by_period.map(p => p.revenue))
  const currentPeriodRevenue = analytics.revenue_by_period[analytics.revenue_by_period.length - 1]?.revenue || 0

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Revenue Trends
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Total: {formatters.currency(totalRevenue)} • 
                Current Period: {formatters.currency(currentPeriodRevenue)}
              </p>
            </div>
            
            {/* Period Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['day', 'week', 'month', 'year'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                    selectedPeriod === period
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  disabled={loading}
                  aria-label={`View revenue by ${period}`}
                >
                  {period.charAt(0).toUpperCase() + period.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent>
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl border border-teal-100">
              <div className="text-2xl font-bold text-teal-700">
                {formatters.currency(totalRevenue, { showCents: false })}
              </div>
              <div className="text-sm text-teal-600 font-medium">Total Revenue</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-100">
              <div className="text-2xl font-bold text-emerald-700">
                {formatters.currency(avgRevenue, { showCents: false })}
              </div>
              <div className="text-sm text-emerald-600 font-medium">Avg per Period</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
              <div className="text-2xl font-bold text-blue-700">
                {formatters.currency(maxRevenue, { showCents: false })}
              </div>
              <div className="text-sm text-blue-600 font-medium">Peak Period</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-100">
              <div className="text-2xl font-bold text-amber-700">
                {analytics.growth_metrics.revenue_growth >= 0 ? '+' : ''}
                {formatters.percentage(analytics.growth_metrics.revenue_growth)}
              </div>
              <div className="text-sm text-amber-600 font-medium">Growth Rate</div>
            </div>
          </div>

          {/* Chart */}
          <div className="relative">
            {isAnimating && (
              <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10 rounded-lg">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
              </div>
            )}
            <div style={{ height }}>
              <LineChart
                data={chartData}
                options={chartOptions}
                height={height}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}