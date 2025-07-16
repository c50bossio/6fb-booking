'use client'

import { useEffect, useState, useCallback } from 'react'
import { analyticsAPI, RevenueAnalytics } from '@/lib/api'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { PageLoading, ErrorDisplay } from '@/components/ui/LoadingSystem'
import { BarChart } from './ChartComponents'
import { formatters } from '@/lib/formatters'

interface ComparisonChartProps {
  userId?: number
  className?: string
  height?: number
  showHeader?: boolean
  comparisonType?: 'month-over-month' | 'year-over-year' | 'quarter-over-quarter'
}

type ComparisonType = 'month-over-month' | 'year-over-year' | 'quarter-over-quarter'

interface ComparisonData {
  label: string
  current: number
  previous: number
  growth: number
  growthPercentage: number
}

export default function ComparisonChart({ 
  userId, 
  className = '',
  height = 400,
  showHeader = true,
  comparisonType = 'month-over-month'
}: ComparisonChartProps) {
  const [currentAnalytics, setCurrentAnalytics] = useState<RevenueAnalytics | null>(null)
  const [previousAnalytics, setPreviousAnalytics] = useState<RevenueAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedComparison, setSelectedComparison] = useState<ComparisonType>(comparisonType)
  const [comparisonData, setComparisonData] = useState<ComparisonData[]>([])

  const calculateDateRanges = useCallback((type: ComparisonType) => {
    const now = new Date()
    let currentEnd = new Date(now)
    let currentStart = new Date(now)
    let previousEnd = new Date()
    let previousStart = new Date()

    switch (type) {
      case 'month-over-month':
        // Current month
        currentStart = new Date(now.getFullYear(), now.getMonth(), 1)
        currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        
        // Previous month
        previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        previousEnd = new Date(now.getFullYear(), now.getMonth(), 0)
        break
        
      case 'quarter-over-quarter':
        // Current quarter
        const currentQuarter = Math.floor(now.getMonth() / 3)
        currentStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
        currentEnd = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0)
        
        // Previous quarter
        const prevQuarter = currentQuarter - 1
        if (prevQuarter < 0) {
          previousStart = new Date(now.getFullYear() - 1, 9, 1) // Q4 of previous year
          previousEnd = new Date(now.getFullYear() - 1, 12, 0)
        } else {
          previousStart = new Date(now.getFullYear(), prevQuarter * 3, 1)
          previousEnd = new Date(now.getFullYear(), (prevQuarter + 1) * 3, 0)
        }
        break
        
      case 'year-over-year':
        // Current year
        currentStart = new Date(now.getFullYear(), 0, 1)
        currentEnd = new Date(now.getFullYear(), 11, 31)
        
        // Previous year
        previousStart = new Date(now.getFullYear() - 1, 0, 1)
        previousEnd = new Date(now.getFullYear() - 1, 11, 31)
        break
    }

    return {
      current: {
        start: currentStart.toISOString().split('T')[0],
        end: currentEnd.toISOString().split('T')[0]
      },
      previous: {
        start: previousStart.toISOString().split('T')[0],
        end: previousEnd.toISOString().split('T')[0]
      }
    }
  }, [])

  const fetchComparisonData = useCallback(async (type: ComparisonType) => {
    try {
      setLoading(true)
      setError(null)
      
      const dateRanges = calculateDateRanges(type)
      
      // Fetch current and previous period data in parallel
      const [current, previous] = await Promise.all([
        analyticsAPI.revenue({
          userId,
          startDate: dateRanges.current.start,
          endDate: dateRanges.current.end,
          groupBy: type === 'year-over-year' ? 'month' : 'day'
        }),
        analyticsAPI.revenue({
          userId,
          startDate: dateRanges.previous.start,
          endDate: dateRanges.previous.end,
          groupBy: type === 'year-over-year' ? 'month' : 'day'
        })
      ])
      
      setCurrentAnalytics(current)
      setPreviousAnalytics(previous)
      
      // Create comparison data
      const comparison: ComparisonData[] = [
        {
          label: 'Total Revenue',
          current: current.total_revenue,
          previous: previous.total_revenue,
          growth: current.total_revenue - previous.total_revenue,
          growthPercentage: previous.total_revenue > 0 
            ? ((current.total_revenue - previous.total_revenue) / previous.total_revenue) * 100 
            : 0
        },
        {
          label: 'Average Ticket',
          current: current.revenue_by_period.length > 0 
            ? current.revenue_by_period.reduce((sum, p) => sum + p.average_ticket, 0) / current.revenue_by_period.length
            : 0,
          previous: previous.revenue_by_period.length > 0 
            ? previous.revenue_by_period.reduce((sum, p) => sum + p.average_ticket, 0) / previous.revenue_by_period.length
            : 0,
          growth: 0, // Will calculate below
          growthPercentage: 0 // Will calculate below
        },
        {
          label: 'Total Appointments',
          current: current.revenue_by_period.reduce((sum, p) => sum + p.appointments, 0),
          previous: previous.revenue_by_period.reduce((sum, p) => sum + p.appointments, 0),
          growth: 0, // Will calculate below
          growthPercentage: 0 // Will calculate below
        }
      ]
      
      // Calculate growth for remaining metrics
      comparison.forEach((item, index) => {
        if (index > 0) {
          item.growth = item.current - item.previous
          item.growthPercentage = item.previous > 0 
            ? ((item.current - item.previous) / item.previous) * 100 
            : 0
        }
      })
      
      setComparisonData(comparison)
      
    } catch (err) {
      console.error('Failed to fetch comparison data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load comparison data'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [userId, calculateDateRanges])

  useEffect(() => {
    fetchComparisonData(selectedComparison)
  }, [fetchComparisonData, selectedComparison])

  const handleComparisonChange = useCallback((type: ComparisonType) => {
    setSelectedComparison(type)
  }, [])

  if (loading) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle>Period Comparison</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <PageLoading message="Loading comparison data..." />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle>Period Comparison</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <ErrorDisplay 
            error={error} 
            onRetry={() => fetchComparisonData(selectedComparison)} 
          />
        </CardContent>
      </Card>
    )
  }

  if (!currentAnalytics || !previousAnalytics || comparisonData.length === 0) {
    return (
      <Card className={className}>
        {showHeader && (
          <CardHeader>
            <CardTitle>Period Comparison</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            No comparison data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transform data for chart
  const chartData = {
    labels: comparisonData.map(item => item.label),
    datasets: [
      {
        label: getPeriodLabel(selectedComparison, 'previous'),
        data: comparisonData.map(item => {
          if (item.label === 'Total Revenue' || item.label === 'Average Ticket') {
            return item.previous
          }
          return item.previous
        }),
        backgroundColor: '#94a3b8', // Slate-400
        borderColor: '#64748b', // Slate-500
        borderWidth: 1,
        borderRadius: 6,
      },
      {
        label: getPeriodLabel(selectedComparison, 'current'),
        data: comparisonData.map(item => {
          if (item.label === 'Total Revenue' || item.label === 'Average Ticket') {
            return item.current
          }
          return item.current
        }),
        backgroundColor: '#0891b2', // Teal-600
        borderColor: '#0e7490', // Teal-700
        borderWidth: 1,
        borderRadius: 6,
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
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
          label: function(context: any) {
            const value = context.parsed.y
            const dataIndex = context.dataIndex
            const comparison = comparisonData[dataIndex]
            
            if (comparison.label === 'Total Appointments') {
              return `${context.dataset.label}: ${formatters.number(value)}`
            } else {
              return `${context.dataset.label}: ${formatters.currency(value)}`
            }
          },
          afterBody: function(context: any) {
            const dataIndex = context[0]?.dataIndex
            if (dataIndex !== undefined) {
              const comparison = comparisonData[dataIndex]
              const growthText = comparison.growthPercentage >= 0 ? '+' : ''
              return [
                '',
                `Growth: ${growthText}${formatters.percentage(comparison.growthPercentage)}`,
                `Change: ${comparison.label === 'Total Appointments' 
                  ? formatters.number(comparison.growth) 
                  : formatters.currency(comparison.growth)
                }`
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
            // Format based on the max value to determine if it's currency or number
            const maxValue = Math.max(...comparisonData.flatMap(d => [d.current, d.previous]))
            if (maxValue > 1000) {
              return formatters.currency(value, { showCents: false })
            }
            return formatters.number(value)
          }
        }
      }
    },
    animation: {
      duration: 750,
      easing: 'easeInOutQuart' as const,
    }
  }

  return (
    <Card className={className}>
      {showHeader && (
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>Period Comparison</CardTitle>
            
            {/* Comparison Type Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['month-over-month', 'quarter-over-quarter', 'year-over-year'] as ComparisonType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => handleComparisonChange(type)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                    selectedComparison === type
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  disabled={loading}
                >
                  {type === 'month-over-month' ? 'MoM' :
                   type === 'quarter-over-quarter' ? 'QoQ' : 'YoY'}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent>
        <div className="space-y-6">
          {/* Growth Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {comparisonData.map((item, index) => (
              <div 
                key={item.label}
                className={`p-4 rounded-xl border ${
                  item.growthPercentage >= 0 
                    ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-100' 
                    : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-100'
                }`}
              >
                <div className="text-center">
                  <div className={`text-2xl font-bold ${
                    item.growthPercentage >= 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}>
                    {item.growthPercentage >= 0 ? '+' : ''}
                    {formatters.percentage(item.growthPercentage)}
                  </div>
                  <div className={`text-sm font-medium ${
                    item.growthPercentage >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {item.label}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {item.label === 'Total Appointments' 
                      ? `${formatters.number(item.current)} vs ${formatters.number(item.previous)}`
                      : `${formatters.currency(item.current, { showCents: false })} vs ${formatters.currency(item.previous, { showCents: false })}`
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ height }}>
            <BarChart
              data={chartData}
              options={chartOptions}
              height={height}
            />
          </div>

          {/* Insights */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <span className="text-blue-600">📊</span>
              Comparison Insights
            </h4>
            <div className="space-y-2 text-sm text-blue-800">
              {comparisonData.map((item, index) => {
                if (Math.abs(item.growthPercentage) < 1) return null
                
                return (
                  <div key={index}>
                    <strong>{item.label}</strong> {item.growthPercentage >= 0 ? 'increased' : 'decreased'} by{' '}
                    <strong>{formatters.percentage(Math.abs(item.growthPercentage))}</strong>{' '}
                    {getComparisonInsight(item.growthPercentage, item.label)}
                  </div>
                )
              })}
              
              {comparisonData.every(item => Math.abs(item.growthPercentage) < 1) && (
                <div>Performance has remained relatively stable compared to the previous period</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function getPeriodLabel(type: ComparisonType, period: 'current' | 'previous'): string {
  const now = new Date()
  
  switch (type) {
    case 'month-over-month':
      if (period === 'current') {
        return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      } else {
        const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return prev.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      }
      
    case 'quarter-over-quarter':
      const quarter = Math.floor(now.getMonth() / 3) + 1
      if (period === 'current') {
        return `Q${quarter} ${now.getFullYear()}`
      } else {
        const prevQ = quarter === 1 ? 4 : quarter - 1
        const prevYear = quarter === 1 ? now.getFullYear() - 1 : now.getFullYear()
        return `Q${prevQ} ${prevYear}`
      }
      
    case 'year-over-year':
      if (period === 'current') {
        return now.getFullYear().toString()
      } else {
        return (now.getFullYear() - 1).toString()
      }
      
    default:
      return period
  }
}

function getComparisonInsight(growthPercentage: number, metric: string): string {
  if (Math.abs(growthPercentage) < 1) return ''
  
  if (growthPercentage > 20) {
    return '- excellent growth! 🚀'
  } else if (growthPercentage > 10) {
    return '- strong performance 📈'
  } else if (growthPercentage > 5) {
    return '- positive trend 👍'
  } else if (growthPercentage > 0) {
    return '- steady improvement'
  } else if (growthPercentage > -5) {
    return '- slight decline, monitor closely'
  } else if (growthPercentage > -10) {
    return '- notable decrease, review strategy'
  } else {
    return '- significant decline, action needed ⚠️'
  }
}