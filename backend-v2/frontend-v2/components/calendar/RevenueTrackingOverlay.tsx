'use client'

import React, { useMemo, useState } from 'react'
import { format, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay } from 'date-fns'
import { 
  DollarSignIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  ClockIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useCalendar, CalendarAppointment, UpsellOpportunity } from '@/contexts/CalendarContext'
import { cn } from '@/lib/utils'

interface RevenueTrackingOverlayProps {
  className?: string
  showUpsellOpportunities?: boolean
  showTargetProgress?: boolean
  showClientTiers?: boolean
  compact?: boolean
}

export default function RevenueTrackingOverlay({
  className,
  showUpsellOpportunities = true,
  showTargetProgress = true,
  showClientTiers = true,
  compact = false
}: RevenueTrackingOverlayProps) {
  const { state, actions } = useCalendar()
  const [selectedMetric, setSelectedMetric] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  // Calculate revenue metrics
  const revenueMetrics = useMemo(() => {
    const now = new Date()
    const todayAppointments = state.appointments.filter(apt => 
      isToday(new Date(apt.start_time)) && apt.status === 'completed'
    )
    const thisWeekAppointments = state.appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= startOfWeek(now) && aptDate <= endOfWeek(now) && apt.status === 'completed'
    })
    const thisMonthAppointments = state.appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= startOfMonth(now) && aptDate <= endOfMonth(now) && apt.status === 'completed'
    })

    const dailyRevenue = todayAppointments.reduce((sum, apt) => sum + (apt.total_price || 0), 0)
    const weeklyRevenue = thisWeekAppointments.reduce((sum, apt) => sum + (apt.total_price || 0), 0)
    const monthlyRevenue = thisMonthAppointments.reduce((sum, apt) => sum + (apt.total_price || 0), 0)

    const dailyProgress = (dailyRevenue / state.revenueMetrics.dailyTarget) * 100
    const weeklyProgress = (weeklyRevenue / state.revenueMetrics.weeklyTarget) * 100
    const monthlyProgress = (monthlyRevenue / state.revenueMetrics.monthlyTarget) * 100

    return {
      daily: {
        current: dailyRevenue,
        target: state.revenueMetrics.dailyTarget,
        progress: dailyProgress,
        appointments: todayAppointments.length
      },
      weekly: {
        current: weeklyRevenue,
        target: state.revenueMetrics.weeklyTarget,
        progress: weeklyProgress,
        appointments: thisWeekAppointments.length
      },
      monthly: {
        current: monthlyRevenue,
        target: state.revenueMetrics.monthlyTarget,
        progress: monthlyProgress,
        appointments: thisMonthAppointments.length
      }
    }
  }, [state.appointments, state.revenueMetrics])

  // Calculate client tier distribution
  const clientTierStats = useMemo(() => {
    const appointments = state.appointments.filter(apt => 
      isToday(new Date(apt.start_time))
    )

    const tiers = {
      platinum: appointments.filter(apt => apt.clientTier === 'platinum'),
      vip: appointments.filter(apt => apt.clientTier === 'vip'),
      regular: appointments.filter(apt => apt.clientTier === 'regular'),
      new: appointments.filter(apt => apt.clientTier === 'new')
    }

    return {
      platinum: {
        count: tiers.platinum.length,
        revenue: tiers.platinum.reduce((sum, apt) => sum + (apt.total_price || 0), 0)
      },
      vip: {
        count: tiers.vip.length,
        revenue: tiers.vip.reduce((sum, apt) => sum + (apt.total_price || 0), 0)
      },
      regular: {
        count: tiers.regular.length,
        revenue: tiers.regular.reduce((sum, apt) => sum + (apt.total_price || 0), 0)
      },
      new: {
        count: tiers.new.length,
        revenue: tiers.new.reduce((sum, apt) => sum + (apt.total_price || 0), 0)
      }
    }
  }, [state.appointments])

  // Generate upsell opportunities
  const upsellOpportunities = useMemo((): UpsellOpportunity[] => {
    return state.appointments
      .filter(apt => isToday(new Date(apt.start_time)) && apt.status === 'confirmed')
      .map(apt => {
        // Basic upsell logic - this would be enhanced with AI in production
        const basePrice = apt.total_price || 50
        const suggestions = [
          {
            service: 'Beard Trim Add-on',
            increase: 25,
            probability: apt.clientTier === 'platinum' ? 0.8 : 0.6,
            reasoning: 'Client frequently books beard services'
          },
          {
            service: 'Premium Hair Wash',
            increase: 15,
            probability: apt.clientTier === 'new' ? 0.9 : 0.7,
            reasoning: 'New clients often appreciate premium services'
          },
          {
            service: 'Styling Product',
            increase: 30,
            probability: 0.5,
            reasoning: 'Retail opportunity for hair products'
          }
        ]

        const bestSuggestion = suggestions.sort((a, b) => 
          (b.increase * b.probability) - (a.increase * a.probability)
        )[0]

        return {
          appointmentId: apt.id,
          clientName: apt.client_name,
          currentService: apt.service_name,
          suggestedService: bestSuggestion.service,
          revenueIncrease: bestSuggestion.increase,
          probability: bestSuggestion.probability,
          reasoning: bestSuggestion.reasoning
        }
      })
      .filter(opp => opp.probability > 0.4) // Only show high-probability opportunities
      .sort((a, b) => (b.revenueIncrease * b.probability) - (a.revenueIncrease * a.probability))
      .slice(0, 5) // Top 5 opportunities
  }, [state.appointments])

  const getTrendIcon = (current: number, target: number) => {
    const progress = (current / target) * 100
    if (progress >= 100) return CheckCircleIcon
    if (progress >= 80) return TrendingUpIcon
    if (progress >= 50) return ClockIcon
    return AlertCircleIcon
  }

  const getTrendColor = (current: number, target: number) => {
    const progress = (current / target) * 100
    if (progress >= 100) return 'text-green-600'
    if (progress >= 80) return 'text-blue-600'
    if (progress >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 80) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (compact) {
    const current = revenueMetrics[selectedMetric]
    const TrendIcon = getTrendIcon(current.current, current.target)
    
    return (
      <Card className={cn("border-l-4 border-l-green-500", className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <TrendIcon className={cn("h-5 w-5", getTrendColor(current.current, current.target))} />
              <div>
                <p className="text-sm font-medium">{formatCurrency(current.current)}</p>
                <p className="text-xs text-gray-600">
                  {current.progress.toFixed(0)}% of {selectedMetric} target
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const next = selectedMetric === 'daily' ? 'weekly' : 
                           selectedMetric === 'weekly' ? 'monthly' : 'daily'
                setSelectedMetric(next)
              }}
            >
              <ChartBarIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Revenue Targets Progress */}
      {showTargetProgress && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <DollarSignIcon className="h-5 w-5 text-green-600" />
              <span>Revenue Tracking</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Metric Selector */}
            <div className="flex space-x-2">
              {(['daily', 'weekly', 'monthly'] as const).map((metric) => (
                <Button
                  key={metric}
                  variant={selectedMetric === metric ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMetric(metric)}
                  className="capitalize"
                >
                  {metric}
                </Button>
              ))}
            </div>

            {/* Current Metric Display */}
            <div className="space-y-3">
              {Object.entries(revenueMetrics).map(([period, data]) => {
                if (selectedMetric !== 'daily' && period !== selectedMetric) return null
                if (selectedMetric === 'daily' && period !== 'daily') return null

                const TrendIcon = getTrendIcon(data.current, data.target)
                const remaining = data.target - data.current

                return (
                  <div key={period} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TrendIcon className={cn("h-4 w-4", getTrendColor(data.current, data.target))} />
                        <span className="text-sm font-medium capitalize">{period} Progress</span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {data.appointments} appointments
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold">{formatCurrency(data.current)}</span>
                      <span className="text-gray-600">of {formatCurrency(data.target)}</span>
                    </div>
                    
                    <Progress 
                      value={Math.min(data.progress, 100)} 
                      className="h-2"
                    />
                    
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>{data.progress.toFixed(1)}% complete</span>
                      {remaining > 0 && (
                        <span>{formatCurrency(remaining)} remaining</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Tier Breakdown */}
      {showClientTiers && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <StarIcon className="h-5 w-5 text-yellow-500" />
              <span>Today's Client Mix</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(clientTierStats).map(([tier, stats]) => {
                const tierColors = {
                  platinum: 'border-purple-200 bg-purple-50',
                  vip: 'border-yellow-200 bg-yellow-50',
                  regular: 'border-blue-200 bg-blue-50',
                  new: 'border-green-200 bg-green-50'
                }

                return (
                  <div
                    key={tier}
                    className={cn(
                      "p-3 rounded-lg border",
                      tierColors[tier as keyof typeof tierColors]
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium capitalize">{tier}</span>
                      <Badge variant="outline" className="text-xs">
                        {stats.count}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatCurrency(stats.revenue)}
                    </p>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upsell Opportunities */}
      {showUpsellOpportunities && upsellOpportunities.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center space-x-2">
              <TrendingUpIcon className="h-5 w-5 text-blue-600" />
              <span>Upsell Opportunities</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upsellOpportunities.map((opportunity, index) => (
                <div
                  key={`${opportunity.appointmentId}-${index}`}
                  className="p-3 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <UserIcon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">
                          {opportunity.clientName}
                        </span>
                        <ArrowRightIcon className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-blue-700">
                          {opportunity.suggestedService}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">
                        {opportunity.reasoning}
                      </p>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline" className="text-xs">
                          +{formatCurrency(opportunity.revenueIncrease)}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {Math.round(opportunity.probability * 100)}% likely
                        </Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">
                      Suggest
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Six Figure Barber Methodology Insights */}
      <Card className="border-l-4 border-l-gold">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center space-x-2">
            <StarIcon className="h-5 w-5 text-yellow-500" />
            <span>6FB Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {revenueMetrics.daily.progress >= 100 && (
              <div className="flex items-center space-x-2 text-green-700">
                <CheckCircleIcon className="h-4 w-4" />
                <span>Daily target achieved! Focus on client experience and retention.</span>
              </div>
            )}
            
            {revenueMetrics.daily.progress < 50 && (
              <div className="flex items-center space-x-2 text-amber-700">
                <AlertCircleIcon className="h-4 w-4" />
                <span>Consider premium service upsells to reach daily target.</span>
              </div>
            )}
            
            {clientTierStats.new.count > 0 && (
              <div className="flex items-center space-x-2 text-blue-700">
                <UserIcon className="h-4 w-4" />
                <span>
                  {clientTierStats.new.count} new client{clientTierStats.new.count > 1 ? 's' : ''} today - 
                  perfect opportunity for relationship building.
                </span>
              </div>
            )}
            
            {upsellOpportunities.length > 0 && (
              <div className="flex items-center space-x-2 text-purple-700">
                <TrendingUpIcon className="h-4 w-4" />
                <span>
                  {upsellOpportunities.length} upsell opportunities worth 
                  {formatCurrency(upsellOpportunities.reduce((sum, opp) => sum + opp.revenueIncrease, 0))} potential revenue.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}