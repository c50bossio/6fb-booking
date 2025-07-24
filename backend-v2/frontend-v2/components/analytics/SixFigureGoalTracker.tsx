'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ProgressIndicator, CircularProgress } from '@/components/ui/ProgressIndicator'
import { ArrowTrendingUpIcon, CalendarIcon, CurrencyDollarIcon, TrophyIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface SixFigureGoalData {
  currentYearRevenue: number
  targetRevenue: number
  monthlyRevenue: number[]
  projectedRevenue: number
  averageServicePrice: number
  appointmentsNeeded: number
  clientRetentionRate: number
  upsellOpportunities: number
}

interface SixFigureGoalTrackerProps {
  data?: SixFigureGoalData
  className?: string
  variant?: 'hero' | 'compact' | 'detailed'
  showProjections?: boolean
  showActionables?: boolean
}

// Default data representing a barber progressing toward six figures
const defaultData: SixFigureGoalData = {
  currentYearRevenue: 68420,
  targetRevenue: 100000,
  monthlyRevenue: [7200, 6800, 7500, 8200, 7900, 8400, 8800, 7600, 8900, 0, 0, 0],
  projectedRevenue: 94500,
  averageServicePrice: 65,
  appointmentsNeeded: 485,
  clientRetentionRate: 78,
  upsellOpportunities: 23
}

export function SixFigureGoalTracker({ 
  data = defaultData,
  className,
  variant = 'hero',
  showProjections = true,
  showActionables = true
}: SixFigureGoalTrackerProps) {
  const [isAnimated, setIsAnimated] = useState(false)

  // Trigger tasteful animations
  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 300)
    return () => clearTimeout(timer)
  }, [])

  // Calculate Six Figure Barber metrics
  const metrics = useMemo(() => {
    const currentMonth = new Date().getMonth()
    const monthsCompleted = currentMonth + 1
    const monthsRemaining = 12 - monthsCompleted
    
    const monthlyAverage = data.currentYearRevenue / Math.max(monthsCompleted, 1)
    const projectedYear = monthlyAverage * 12
    const shortfall = Math.max(0, data.targetRevenue - data.currentYearRevenue)
    const monthlyNeeded = monthsRemaining > 0 ? shortfall / monthsRemaining : 0
    
    const progressPercentage = Math.min((data.currentYearRevenue / data.targetRevenue) * 100, 100)
    const onTrackForGoal = projectedYear >= data.targetRevenue * 0.95 // Within 5% of goal
    
    // Business insights based on Six Figure Barber methodology
    const clientsNeeded = Math.ceil(shortfall / (data.averageServicePrice * 12)) // Assuming monthly visits
    const servicesPerMonth = Math.ceil(monthlyNeeded / data.averageServicePrice)
    
    return {
      progressPercentage,
      monthlyAverage,
      projectedYear,
      shortfall,
      monthlyNeeded,
      onTrackForGoal,
      monthsRemaining,
      clientsNeeded,
      servicesPerMonth,
      daysIntoMonth: new Date().getDate(),
      targetDailyRevenue: monthlyNeeded / 30
    }
  }, [data])

  // Get progress status and color
  const getProgressStatus = () => {
    if (metrics.progressPercentage >= 90) return { status: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-50' }
    if (metrics.progressPercentage >= 75) return { status: 'On Track', color: 'text-blue-600', bgColor: 'bg-blue-50' }
    if (metrics.progressPercentage >= 50) return { status: 'Building', color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
    return { status: 'Opportunity', color: 'text-red-600', bgColor: 'bg-red-50' }
  }

  const progressStatus = getProgressStatus()

  if (variant === 'compact') {
    return (
      <Card variant="elevated" className={cn('overflow-hidden', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-8 bg-primary-500 rounded-full"></div>
              <div>
                <div className="text-lg font-bold">${data.currentYearRevenue.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Six Figure Progress</div>
              </div>
            </div>
            <div className="text-right">
              <CircularProgress
                value={metrics.progressPercentage}
                size={48}
                strokeWidth={4}
                variant="primary"
                showValue={false}
              />
              <div className="text-xs text-gray-500 mt-1">{metrics.progressPercentage.toFixed(0)}%</div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card variant={variant === 'hero' ? 'hero' : 'elevated'} borderAccent className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-1 h-12 bg-primary-500 rounded-full"></div>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrophyIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl">Six Figure Goal Tracker</CardTitle>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Building your six-figure barbering business
                </p>
              </div>
            </div>
          </div>
          <div className={cn('px-4 py-2 rounded-full text-sm font-medium', progressStatus.bgColor, progressStatus.color)}>
            {progressStatus.status}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Progress Display */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                ${data.currentYearRevenue.toLocaleString()}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                of ${data.targetRevenue.toLocaleString()} goal
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-primary-600">
                {metrics.progressPercentage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>
          
          <ProgressIndicator
            value={metrics.progressPercentage}
            variant="primary"
            size="lg"
            animated={isAnimated}
            showGlow
            label="Progress to Six Figures"
            showValue
            className="mb-4"
          />
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-primary-50 dark:bg-primary-900/10 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CurrencyDollarIcon className="w-5 h-5 text-primary-600" />
              <span className="text-sm font-medium text-primary-600">Monthly Target</span>
            </div>
            <div className="text-2xl font-bold text-primary-700">
              ${metrics.monthlyNeeded.toLocaleString()}
            </div>
            <div className="text-xs text-primary-600 mt-1">
              {metrics.monthsRemaining} months remaining
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/10 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Projected Total</span>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              ${metrics.projectedYear.toLocaleString()}
            </div>
            <div className={cn(
              'text-xs mt-1',
              metrics.onTrackForGoal ? 'text-green-600' : 'text-yellow-600'
            )}>
              {metrics.onTrackForGoal ? 'On track for goal!' : 'Needs acceleration'}
            </div>
          </div>

          <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CalendarIcon className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-600">Daily Target</span>
            </div>
            <div className="text-2xl font-bold text-green-700">
              ${metrics.targetDailyRevenue.toFixed(0)}
            </div>
            <div className="text-xs text-green-600 mt-1">
              To hit monthly goal
            </div>
          </div>
        </div>

        {/* Actionable Insights - Six Figure Barber Methodology */}
        {showActionables && (
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg p-6">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <TrophyIcon className="w-5 h-5 mr-2 text-primary-600" />
              Six Figure Strategy Insights
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Services needed monthly:</span>
                  <span className="font-medium">{metrics.servicesPerMonth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">New clients to acquire:</span>
                  <span className="font-medium">{metrics.clientsNeeded}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current retention rate:</span>
                  <span className="font-medium">{data.clientRetentionRate}%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Average service price:</span>
                  <span className="font-medium">${data.averageServicePrice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Upsell opportunities:</span>
                  <span className="font-medium">{data.upsellOpportunities}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Revenue gap:</span>
                  <span className="font-medium">${metrics.shortfall.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Action Recommendations */}
            <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <div className="text-sm text-primary-700 dark:text-primary-300">
                <strong>Recommended Focus Areas:</strong>
                {data.clientRetentionRate < 80 && (
                  <span className="block mt-1">• Improve client retention (current: {data.clientRetentionRate}%)</span>
                )}
                {data.averageServicePrice < 75 && (
                  <span className="block mt-1">• Consider premium service offerings</span>
                )}
                {data.upsellOpportunities > 15 && (
                  <span className="block mt-1">• Capitalize on {data.upsellOpportunities} upsell opportunities</span>
                )}
                <span className="block mt-1">• Target {Math.ceil(metrics.servicesPerMonth / 22)} services per day</span>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Revenue Trend (if showing projections) */}
        {showProjections && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900 dark:text-white">Monthly Revenue Progress</h4>
            <div className="grid grid-cols-6 gap-2">
              {data.monthlyRevenue.slice(0, 6).map((revenue, index) => {
                const monthTarget = data.targetRevenue / 12
                const percentage = revenue > 0 ? Math.min((revenue / monthTarget) * 100, 100) : 0
                const monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][index]
                
                return (
                  <div key={index} className="text-center">
                    <div className="text-xs text-gray-500 mb-1">{monthName}</div>
                    <ProgressIndicator
                      value={percentage}
                      size="sm"
                      variant={percentage >= 100 ? 'success' : percentage >= 80 ? 'primary' : 'warning'}
                      className="mb-1"
                    />
                    <div className="text-xs font-medium">
                      {revenue > 0 ? `$${(revenue / 1000).toFixed(0)}k` : '--'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SixFigureGoalTracker