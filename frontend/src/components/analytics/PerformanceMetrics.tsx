'use client'

import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Star,
  Users,
  Calendar,
  DollarSign
} from 'lucide-react'

interface PerformanceMetricsProps {
  data: any
  dateRange: { from: Date; to: Date }
}

export function PerformanceMetrics({ data, dateRange }: PerformanceMetricsProps) {
  const metrics = [
    {
      title: 'Revenue Target',
      icon: Target,
      value: data.revenueProgress || 0,
      target: data.revenueTarget || 10000,
      current: data.currentRevenue || 0,
      format: 'currency',
      color: 'blue'
    },
    {
      title: 'Booking Rate',
      icon: Calendar,
      value: data.bookingRate || 0,
      target: 100,
      current: data.bookingRate || 0,
      format: 'percentage',
      color: 'green'
    },
    {
      title: 'Client Satisfaction',
      icon: Star,
      value: data.satisfaction || 0,
      target: 5,
      current: data.satisfaction || 0,
      format: 'rating',
      color: 'yellow'
    },
    {
      title: 'Utilization Rate',
      icon: Clock,
      value: data.utilizationRate || 0,
      target: 100,
      current: data.utilizationRate || 0,
      format: 'percentage',
      color: 'slate'
    }
  ]

  const getProgressColor = (value: number, target: number) => {
    const percentage = (value / target) * 100
    if (percentage >= 90) return 'bg-green-500'
    if (percentage >= 70) return 'bg-yellow-500'
    if (percentage >= 50) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const formatValue = (value: number, format: string) => {
    switch (format) {
      case 'currency':
        return `$${value.toLocaleString()}`
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'rating':
        return value.toFixed(1)
      default:
        return value.toLocaleString()
    }
  }

  const getIcon = (metric: any) => {
    const Icon = metric.icon
    const colors = {
      blue: 'text-teal-500',
      green: 'text-green-500',
      yellow: 'text-yellow-500',
      slate: 'text-slate-500'
    }
    return <Icon className={`h-5 w-5 ${colors[metric.color as keyof typeof colors]}`} />
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Performance Overview</h3>
        <div className="flex items-center text-sm text-gray-500">
          <Clock className="h-4 w-4 mr-1" />
          Real-time metrics
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const percentage = metric.target > 0 ? (metric.value / metric.target) * 100 : 0
          const isPositiveTrend = metric.value > (data[`${metric.title.toLowerCase()}_previous`] || 0)
          
          return (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getIcon(metric)}
                  <span className="text-sm font-medium text-gray-700">{metric.title}</span>
                </div>
                {isPositiveTrend ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-2xl font-bold">
                    {formatValue(metric.current, metric.format)}
                  </span>
                  <span className="text-sm text-gray-500">
                    / {formatValue(metric.target, metric.format)}
                  </span>
                </div>
                
                <Progress 
                  value={Math.min(percentage, 100)} 
                  className="h-2"
                  indicatorClassName={getProgressColor(metric.value, metric.target)}
                />
                
                <p className="text-xs text-gray-500 mt-1">
                  {percentage.toFixed(0)}% of target
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Key Insights */}
      <div className="mt-6 pt-6 border-t">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Key Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.insights?.map((insight: any, index: number) => (
            <div key={index} className="flex items-start space-x-2">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                insight.type === 'positive' ? 'bg-green-500' : 
                insight.type === 'negative' ? 'bg-red-500' : 
                'bg-yellow-500'
              }`} />
              <p className="text-sm text-gray-600">{insight.message}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}