import React from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline'

interface AnalyticsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  iconBgColor?: string
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
}

export function AnalyticsCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  iconBgColor = 'bg-primary-100 dark:bg-primary-900/30',
  trend = 'neutral',
  loading = false
}: AnalyticsCardProps) {
  if (loading) {
    return (
      <Card variant="elevated" animated>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getTrendIcon = () => {
    if (trend === 'up') return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />
    if (trend === 'down') return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />
    return null
  }

  const getChangeColor = () => {
    if (trend === 'up') return 'text-green-600 dark:text-green-400'
    if (trend === 'down') return 'text-red-600 dark:text-red-400'
    return 'text-gray-500 dark:text-gray-400'
  }

  return (
    <Card variant="elevated" animated>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          {icon && (
            <div className={`p-2 rounded-ios-lg ${iconBgColor}`}>
              {icon}
            </div>
          )}
          {change !== undefined && (
            <span className={`text-sm font-medium flex items-center gap-1 ${getChangeColor()}`}>
              {getTrendIcon()}
              {change > 0 ? '+' : ''}{change}%
              {changeLabel && <span className="text-xs ml-1">{changeLabel}</span>}
            </span>
          )}
        </div>
        <h3 className="text-2xl font-bold text-accent-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </h3>
        <p className="text-ios-caption text-ios-gray-600 dark:text-zinc-400 mt-1">
          {title}
        </p>
      </CardContent>
    </Card>
  )
}

interface MetricGroup {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon?: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
}

interface AnalyticsCardGridProps {
  metrics: MetricGroup[]
  loading?: boolean
}

export function AnalyticsCardGrid({ metrics, loading = false }: AnalyticsCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <AnalyticsCard
          key={index}
          title={metric.title}
          value={metric.value}
          change={metric.change}
          changeLabel={metric.changeLabel}
          icon={metric.icon}
          trend={metric.trend}
          loading={loading}
        />
      ))}
    </div>
  )
}