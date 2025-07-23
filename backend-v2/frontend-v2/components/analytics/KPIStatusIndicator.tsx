'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type KPIStatus = 'excellent' | 'good' | 'warning' | 'critical'
export type KPITrend = 'up' | 'down' | 'stable'

export interface KPIStatusData {
  name: string
  currentValue: number
  targetValue: number
  trend: KPITrend
  status: KPIStatus
  unit?: string
  formatValue?: (value: number) => string
  description?: string
  recommendation?: string
}

interface KPIStatusIndicatorProps {
  data: KPIStatusData
  size?: 'sm' | 'md' | 'lg'
  showTrend?: boolean
  showDetails?: boolean
  className?: string
}

/**
 * KPI Status Indicator Component
 * Enhances existing analytics metrics with visual status indicators
 * Designed to integrate seamlessly with current dashboard components
 */
export function KPIStatusIndicator({
  data,
  size = 'md',
  showTrend = true,
  showDetails = false,
  className
}: KPIStatusIndicatorProps) {
  const { name, currentValue, targetValue, trend, status, unit = '', formatValue, description, recommendation } = data

  // Status color schemes aligned with existing design system
  const statusStyles = {
    excellent: {
      bg: 'bg-green-100 dark:bg-green-900/20',
      border: 'border-green-300 dark:border-green-700',
      text: 'text-green-800 dark:text-green-300',
      dot: 'bg-green-500',
      icon: CheckCircle
    },
    good: {
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      border: 'border-blue-300 dark:border-blue-700',
      text: 'text-blue-800 dark:text-blue-300',
      dot: 'bg-blue-500',
      icon: CheckCircle
    },
    warning: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      border: 'border-yellow-300 dark:border-yellow-700',
      text: 'text-yellow-800 dark:text-yellow-300',
      dot: 'bg-yellow-500',
      icon: AlertTriangle
    },
    critical: {
      bg: 'bg-red-100 dark:bg-red-900/20',
      border: 'border-red-300 dark:border-red-700',
      text: 'text-red-800 dark:text-red-300',
      dot: 'bg-red-500',
      icon: XCircle
    }
  }

  // Trend icons
  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    stable: Minus
  }

  // Size variants
  const sizeStyles = {
    sm: {
      container: 'p-2',
      dot: 'w-2 h-2',
      icon: 'w-3 h-3',
      text: 'text-xs',
      value: 'text-sm',
      trend: 'w-3 h-3'
    },
    md: {
      container: 'p-3',
      dot: 'w-3 h-3',
      icon: 'w-4 h-4',
      text: 'text-sm',
      value: 'text-base',
      trend: 'w-4 h-4'
    },
    lg: {
      container: 'p-4',
      dot: 'w-4 h-4',
      icon: 'w-5 h-5',
      text: 'text-base',
      value: 'text-lg',
      trend: 'w-5 h-5'
    }
  }

  const currentStyles = statusStyles[status]
  const currentSizes = sizeStyles[size]
  const TrendIcon = trendIcons[trend]
  const StatusIcon = currentStyles.icon

  // Format display value
  const displayValue = formatValue ? formatValue(currentValue) : `${currentValue.toLocaleString()}${unit}`
  const displayTarget = formatValue ? formatValue(targetValue) : `${targetValue.toLocaleString()}${unit}`

  // Calculate achievement percentage
  const achievementPercentage = targetValue > 0 ? (currentValue / targetValue) * 100 : 0

  // Status text mapping
  const statusText = {
    excellent: 'Exceeding Target',
    good: 'On Track',
    warning: 'Needs Attention',
    critical: 'Critical Issue'
  }

  // Trend text mapping
  const trendText = {
    up: 'Trending Up',
    down: 'Trending Down',
    stable: 'Stable'
  }

  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
      <div>
        <p className="font-medium">{name}</p>
        {description && <p className="text-xs opacity-90">{description}</p>}
      </div>
      
      <div className="space-y-1 text-xs">
        <div className="flex justify-between">
          <span>Current:</span>
          <span className="font-medium">{displayValue}</span>
        </div>
        <div className="flex justify-between">
          <span>Target:</span>
          <span className="font-medium">{displayTarget}</span>
        </div>
        <div className="flex justify-between">
          <span>Achievement:</span>
          <span className="font-medium">{Math.round(achievementPercentage)}%</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <div className={cn('rounded-full', currentStyles.dot, currentSizes.dot)} />
        <span>{statusText[status]}</span>
        {showTrend && (
          <>
            <TrendIcon className={cn(currentSizes.trend, currentStyles.text)} />
            <span>{trendText[trend]}</span>
          </>
        )}
      </div>

      {recommendation && (
        <div className="pt-2 border-t border-opacity-20">
          <p className="text-xs font-medium opacity-90">Recommendation:</p>
          <p className="text-xs opacity-80">{recommendation}</p>
        </div>
      )}
    </div>
  )

  if (showDetails) {
    return (
      <div className={cn(
        'rounded-lg border transition-all duration-200',
        currentStyles.bg,
        currentStyles.border,
        currentSizes.container,
        className
      )}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={cn('rounded-full', currentStyles.dot, currentSizes.dot)} />
            <span className={cn('font-medium', currentStyles.text, currentSizes.text)}>{name}</span>
          </div>
          {showTrend && (
            <TrendIcon className={cn(currentSizes.trend, currentStyles.text)} />
          )}
        </div>

        <div className={cn('font-bold', currentStyles.text, currentSizes.value)}>
          {displayValue}
        </div>

        <div className={cn('opacity-75', currentStyles.text, currentSizes.text)}>
          Target: {displayTarget} ({Math.round(achievementPercentage)}%)
        </div>

        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={cn('h-2 rounded-full transition-all duration-300', currentStyles.dot.replace('bg-', 'bg-'))}
            style={{ width: `${Math.min(100, achievementPercentage)}%` }}
          />
        </div>

        {recommendation && (
          <div className={cn('mt-2 text-xs opacity-90', currentStyles.text)}>
            <strong>Tip:</strong> {recommendation}
          </div>
        )}
      </div>
    )
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-200 cursor-help',
            currentStyles.bg,
            currentStyles.border,
            className
          )}>
            <div className={cn('rounded-full', currentStyles.dot, currentSizes.dot)} />
            
            <span className={cn('font-medium', currentStyles.text, currentSizes.text)}>
              {displayValue}
            </span>

            {showTrend && (
              <TrendIcon className={cn(currentSizes.trend, currentStyles.text)} />
            )}

            <StatusIcon className={cn(currentSizes.icon, currentStyles.text)} />
          </div>
        </TooltipTrigger>
        
        <TooltipContent side="bottom" className="bg-gray-900 text-white border-gray-700">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/**
 * Enhanced Metric Display Component
 * Wraps existing metric displays with KPI status indicators
 */
interface EnhancedMetricProps {
  title: string
  value: number
  target: number
  unit?: string
  formatValue?: (value: number) => string
  trend?: KPITrend
  description?: string
  recommendation?: string
  children?: React.ReactNode
  className?: string
}

export function EnhancedMetric({
  title,
  value,
  target,
  unit,
  formatValue,
  trend = 'stable',
  description,
  recommendation,
  children,
  className
}: EnhancedMetricProps) {
  // Determine status based on Six Figure Barber methodology
  const getKPIStatus = (current: number, target: number): KPIStatus => {
    const ratio = current / target
    if (ratio >= 1.1) return 'excellent'
    if (ratio >= 0.9) return 'good'
    if (ratio >= 0.7) return 'warning'
    return 'critical'
  }

  const kpiData: KPIStatusData = {
    name: title,
    currentValue: value,
    targetValue: target,
    trend,
    status: getKPIStatus(value, target),
    unit,
    formatValue,
    description,
    recommendation
  }

  return (
    <div className={cn('relative', className)}>
      {/* Original metric content */}
      {children}
      
      {/* KPI Status Overlay */}
      <div className="absolute top-2 right-2">
        <KPIStatusIndicator 
          data={kpiData} 
          size="sm" 
          showTrend={true}
        />
      </div>
    </div>
  )
}

/**
 * KPI Grid Component
 * Display multiple KPIs in a responsive grid layout
 */
interface KPIGridProps {
  kpis: KPIStatusData[]
  columns?: 1 | 2 | 3 | 4
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function KPIGrid({ kpis, columns = 3, size = 'md', className }: KPIGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }

  return (
    <div className={cn(
      'grid gap-4',
      gridCols[columns],
      className
    )}>
      {kpis.map((kpi, index) => (
        <KPIStatusIndicator
          key={index}
          data={kpi}
          size={size}
          showDetails={true}
        />
      ))}
    </div>
  )
}

/**
 * KPI Summary Bar
 * Compact horizontal display of multiple KPI statuses
 */
interface KPISummaryBarProps {
  kpis: KPIStatusData[]
  className?: string
}

export function KPISummaryBar({ kpis, className }: KPISummaryBarProps) {
  // Count KPIs by status
  const statusCounts = kpis.reduce((acc, kpi) => {
    acc[kpi.status] = (acc[kpi.status] || 0) + 1
    return acc
  }, {} as Record<KPIStatus, number>)

  const totalKPIs = kpis.length

  return (
    <div className={cn('flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg', className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          KPI Health:
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {totalKPIs} indicators
        </span>
      </div>

      <div className="flex items-center gap-3 flex-1">
        {Object.entries(statusCounts).map(([status, count]) => {
          const styles = statusStyles[status as KPIStatus]
          return (
            <div key={status} className="flex items-center gap-1">
              <div className={cn('w-2 h-2 rounded-full', styles.dot)} />
              <span className={cn('text-xs font-medium', styles.text)}>
                {count}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex gap-1">
        {kpis.map((kpi, index) => (
          <KPIStatusIndicator
            key={index}
            data={kpi}
            size="sm"
            showTrend={false}
          />
        ))}
      </div>
    </div>
  )
}

// Export types for use in other components
export type { KPIStatusData }
export { statusStyles as kpiStatusStyles }