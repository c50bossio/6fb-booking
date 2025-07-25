'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, subMonths, addMonths, startOfWeek, endOfWeek, subDays, addDays } from 'date-fns'
import {
  CurrencyDollarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  UserGroupIcon,
  ChartBarIcon,
  StarIcon,
  TargetIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  FireIcon,
  CogIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolid } from '@heroicons/react/24/solid'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'

interface Appointment {
  id: number
  client_id: number
  client_name: string
  service_name: string
  service_id: number
  barber_id: number
  start_time: string
  end_time: string
  price: number
  duration_minutes: number
  status: 'completed' | 'scheduled' | 'cancelled' | 'no_show'
  is_premium?: boolean
  add_ons?: string[]
  tips?: number
  notes?: string
}

interface Client {
  id: number
  first_name: string
  last_name: string
  total_revenue: number
  total_appointments: number
  average_rating?: number
  is_vip?: boolean
  lifetime_value?: number
  last_appointment?: string
  referral_count?: number
}

interface Service {
  id: number
  name: string
  base_price: number
  duration_minutes: number
  category: string
  is_premium?: boolean
  profit_margin?: number
}

interface RevenueMetrics {
  // Core 6FB Revenue Metrics
  daily_revenue: number
  weekly_revenue: number
  monthly_revenue: number
  revenue_growth_rate: number
  
  // Client Metrics
  average_revenue_per_client: number
  client_lifetime_value: number
  client_retention_rate: number
  
  // Service Metrics
  service_mix_optimization: number
  premium_service_adoption: number
  upsell_success_rate: number
  
  // Efficiency Metrics
  time_utilization: number
  profit_margin: number
  revenue_per_hour: number
  
  // Goals and Targets
  monthly_target: number
  annual_target: number
  six_figure_progress: number
}

interface RevenueOptimizationPanelProps {
  selectedDate?: Date
  appointments: Appointment[]
  clients: Client[]
  services?: Service[]
  onOptimizationAction?: (action: string, data: any) => void
  onViewDetails?: (type: string, id: string) => void
  className?: string
  isVisible?: boolean
}

export default function RevenueOptimizationPanel({
  selectedDate = new Date(),
  appointments = [],
  clients = [],
  services = [],
  onOptimizationAction,
  onViewDetails,
  className,
  isVisible = true
}: RevenueOptimizationPanelProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [showOptimizationTips, setShowOptimizationTips] = useState(true)
  const [revenueTarget, setRevenueTarget] = useState(100000) // Six Figure Target

  // Calculate date ranges based on selected period
  const dateRanges = useMemo(() => {
    const today = selectedDate
    
    switch (selectedPeriod) {
      case 'day':
        return {
          current: { start: today, end: today },
          previous: { start: subDays(today, 1), end: subDays(today, 1) }
        }
      case 'week':
        const weekStart = startOfWeek(today)
        const weekEnd = endOfWeek(today)
        return {
          current: { start: weekStart, end: weekEnd },
          previous: { start: subDays(weekStart, 7), end: subDays(weekEnd, 7) }
        }
      case 'month':
        const monthStart = startOfMonth(today)
        const monthEnd = endOfMonth(today)
        return {
          current: { start: monthStart, end: monthEnd },
          previous: { start: startOfMonth(subMonths(today, 1)), end: endOfMonth(subMonths(today, 1)) }
        }
    }
  }, [selectedDate, selectedPeriod])

  // Calculate comprehensive revenue metrics aligned with 6FB methodology
  const revenueMetrics = useMemo((): RevenueMetrics => {
    const currentAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= dateRanges.current.start && aptDate <= dateRanges.current.end && apt.status === 'completed'
    })

    const previousAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= dateRanges.previous.start && aptDate <= dateRanges.previous.end && apt.status === 'completed'
    })

    // Core revenue calculations
    const currentRevenue = currentAppointments.reduce((sum, apt) => sum + apt.price + (apt.tips || 0), 0)
    const previousRevenue = previousAppointments.reduce((sum, apt) => sum + apt.price + (apt.tips || 0), 0)
    const revenueGrowthRate = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0

    // Client metrics
    const uniqueClients = new Set(currentAppointments.map(apt => apt.client_id)).size
    const averageRevenuePerClient = uniqueClients > 0 ? currentRevenue / uniqueClients : 0
    const totalClientRevenue = clients.reduce((sum, client) => sum + client.total_revenue, 0)
    const averageClientLifetimeValue = clients.length > 0 ? totalClientRevenue / clients.length : 0

    // Service mix analysis
    const premiumAppointments = currentAppointments.filter(apt => apt.is_premium || apt.price > 75)
    const premiumServiceAdoption = currentAppointments.length > 0 ? (premiumAppointments.length / currentAppointments.length) * 100 : 0
    
    const appointmentsWithAddOns = currentAppointments.filter(apt => apt.add_ons && apt.add_ons.length > 0)
    const upsellSuccessRate = currentAppointments.length > 0 ? (appointmentsWithAddOns.length / currentAppointments.length) * 100 : 0

    // Time utilization
    const totalBookedMinutes = currentAppointments.reduce((sum, apt) => sum + apt.duration_minutes, 0)
    const businessHours = selectedPeriod === 'day' ? 10 * 60 : selectedPeriod === 'week' ? 7 * 10 * 60 : 30 * 10 * 60 // Assuming 10 hours/day
    const timeUtilization = businessHours > 0 ? (totalBookedMinutes / businessHours) * 100 : 0

    // Revenue per hour
    const revenuePerHour = totalBookedMinutes > 0 ? (currentRevenue / (totalBookedMinutes / 60)) : 0

    // Six figure progress (annual projection)
    const monthlyRevenue = selectedPeriod === 'month' ? currentRevenue : 
                          selectedPeriod === 'week' ? currentRevenue * 4.33 :
                          currentRevenue * 30
    const annualProjection = monthlyRevenue * 12
    const sixFigureProgress = (annualProjection / revenueTarget) * 100

    return {
      daily_revenue: selectedPeriod === 'day' ? currentRevenue : currentRevenue / (selectedPeriod === 'week' ? 7 : 30),
      weekly_revenue: selectedPeriod === 'week' ? currentRevenue : currentRevenue * (selectedPeriod === 'day' ? 7 : 7/30),
      monthly_revenue: monthlyRevenue,
      revenue_growth_rate: revenueGrowthRate,
      average_revenue_per_client: averageRevenuePerClient,
      client_lifetime_value: averageClientLifetimeValue,
      client_retention_rate: 85, // This would come from more complex calculations
      service_mix_optimization: premiumServiceAdoption,
      premium_service_adoption: premiumServiceAdoption,
      upsell_success_rate: upsellSuccessRate,
      time_utilization: timeUtilization,
      profit_margin: 70, // This would be calculated based on costs
      revenue_per_hour: revenuePerHour,
      monthly_target: revenueTarget / 12,
      annual_target: revenueTarget,
      six_figure_progress: sixFigureProgress
    }
  }, [appointments, clients, dateRanges, selectedPeriod, revenueTarget])

  // Generate optimization recommendations based on 6FB methodology
  const optimizationRecommendations = useMemo(() => {
    const recommendations = []

    // Revenue growth analysis
    if (revenueMetrics.revenue_growth_rate < 5) {
      recommendations.push({
        type: 'revenue',
        priority: 'high',
        title: 'Revenue Growth Below Target',
        description: 'Consider increasing premium service offerings or raising prices',
        action: 'optimize_pricing',
        icon: TrendingUpIcon,
        color: 'text-red-600 bg-red-50'
      })
    }

    // Time utilization optimization
    if (revenueMetrics.time_utilization < 70) {
      recommendations.push({
        type: 'efficiency',
        priority: 'medium',
        title: 'Low Time Utilization',
        description: 'Fill gaps with shorter services or offer last-minute discounts',
        action: 'optimize_schedule',
        icon: ClockIcon,
        color: 'text-yellow-600 bg-yellow-50'
      })
    }

    // Service mix optimization
    if (revenueMetrics.premium_service_adoption < 30) {
      recommendations.push({
        type: 'services',
        priority: 'high',
        title: 'Low Premium Service Adoption',
        description: 'Train on upselling techniques and premium service benefits',
        action: 'improve_upselling',
        icon: StarIcon,
        color: 'text-purple-600 bg-purple-50'
      })
    }

    // Client value optimization
    if (revenueMetrics.average_revenue_per_client < 60) {
      recommendations.push({
        type: 'client',
        priority: 'medium',
        title: 'Low Revenue Per Client',
        description: 'Focus on building client relationships and offering packages',
        action: 'increase_client_value',
        icon: UserGroupIcon,
        color: 'text-blue-600 bg-blue-50'
      })
    }

    // Six figure progress
    if (revenueMetrics.six_figure_progress < 80) {
      recommendations.push({
        type: 'goal',
        priority: 'high',
        title: 'Behind Six Figure Goal',
        description: 'Need to accelerate growth to reach annual target',
        action: 'accelerate_growth',
        icon: TargetIcon,
        color: 'text-orange-600 bg-orange-50'
      })
    }

    return recommendations
  }, [revenueMetrics])

  const getPerformanceColor = (value: number, threshold: { good: number; average: number }) => {
    if (value >= threshold.good) return 'text-green-600 bg-green-50'
    if (value >= threshold.average) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getPerformanceIcon = (value: number, threshold: { good: number; average: number }) => {
    if (value >= threshold.good) return CheckCircleIcon
    if (value >= threshold.average) return ExclamationTriangleIcon
    return TrendingDownIcon
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number, decimals = 1) => {
    return `${value.toFixed(decimals)}%`
  }

  if (!isVisible) return null

  return (
    <div className={cn("flex flex-col h-full bg-gray-50", className)}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUpIcon className="h-5 w-5 mr-2 text-green-600" />
              Revenue Optimization
            </h2>
            <p className="text-sm text-gray-600">Six Figure Barber Performance Analytics</p>
          </div>
          <div className="flex items-center space-x-2">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOptimizationTips(!showOptimizationTips)}
            >
              <LightBulbIcon className="h-4 w-4 mr-1" />
              Tips
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Six Figure Progress */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              <TargetIcon className="h-5 w-5 mr-2 text-green-600" />
              Six Figure Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Annual Target: {formatCurrency(revenueTarget)}</span>
                <span className="text-lg font-bold text-green-600">
                  {formatPercentage(revenueMetrics.six_figure_progress)}
                </span>
              </div>
              <Progress value={Math.min(revenueMetrics.six_figure_progress, 100)} className="h-3" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>Current: {formatCurrency(revenueMetrics.monthly_revenue * 12)}</span>
                <span>Remaining: {formatCurrency(Math.max(0, revenueTarget - (revenueMetrics.monthly_revenue * 12)))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Core Revenue Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {selectedPeriod === 'day' ? 'Daily' : selectedPeriod === 'week' ? 'Weekly' : 'Monthly'} Revenue
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(
                      selectedPeriod === 'day' ? revenueMetrics.daily_revenue :
                      selectedPeriod === 'week' ? revenueMetrics.weekly_revenue :
                      revenueMetrics.monthly_revenue
                    )}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${revenueMetrics.revenue_growth_rate >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {revenueMetrics.revenue_growth_rate >= 0 ? (
                    <ArrowUpIcon className="h-5 w-5 text-green-600" />
                  ) : (
                    <ArrowDownIcon className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
              <div className="mt-2">
                <div className={`flex items-center text-sm ${revenueMetrics.revenue_growth_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span>{formatPercentage(Math.abs(revenueMetrics.revenue_growth_rate))} from last period</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Revenue Per Hour</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(revenueMetrics.revenue_per_hour)}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-blue-100">
                  <ClockIcon className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="mt-2">
                <div className="text-sm text-gray-600">
                  {formatPercentage(revenueMetrics.time_utilization)} time utilization
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Value Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Revenue Per Client</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(revenueMetrics.average_revenue_per_client)}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-purple-100">
                  <UserGroupIcon className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Premium Services</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatPercentage(revenueMetrics.premium_service_adoption)}
                  </p>
                </div>
                <div className="p-2 rounded-full bg-yellow-100">
                  <StarSolid className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Indicators</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Time Utilization', value: revenueMetrics.time_utilization, threshold: { good: 80, average: 60 }, suffix: '%' },
                { label: 'Upsell Success Rate', value: revenueMetrics.upsell_success_rate, threshold: { good: 40, average: 25 }, suffix: '%' },
                { label: 'Client Retention', value: revenueMetrics.client_retention_rate, threshold: { good: 90, average: 75 }, suffix: '%' },
                { label: 'Profit Margin', value: revenueMetrics.profit_margin, threshold: { good: 75, average: 60 }, suffix: '%' }
              ].map((metric, index) => {
                const PerformanceIcon = getPerformanceIcon(metric.value, metric.threshold)
                const colorClass = getPerformanceColor(metric.value, metric.threshold)
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${colorClass}`}>
                        <PerformanceIcon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-gray-900">{metric.label}</span>
                    </div>
                    <span className={`font-bold ${colorClass.split(' ')[0]}`}>
                      {metric.value.toFixed(1)}{metric.suffix}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Optimization Recommendations */}
        {showOptimizationTips && optimizationRecommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <LightBulbIcon className="h-5 w-5 mr-2 text-yellow-600" />
                Optimization Opportunities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {optimizationRecommendations.slice(0, 3).map((rec, index) => {
                  const IconComponent = rec.icon
                  return (
                    <Alert key={index} className={`border-l-4 ${rec.color.split(' ')[1]}`}>
                      <IconComponent className="h-4 w-4" />
                      <AlertDescription>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{rec.title}</div>
                            <div className="text-sm text-gray-600 mt-1">{rec.description}</div>
                          </div>
                          <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => onOptimizationAction?.(rec.action, rec)}
                        >
                          Take Action
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-auto p-3"
                onClick={() => onViewDetails?.('revenue_report', selectedPeriod)}
              >
                <div className="text-center">
                  <ChartBarIcon className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">Detailed Report</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-3"
                onClick={() => onOptimizationAction?.('set_goals', { current: revenueMetrics.monthly_revenue })}
              >
                <div className="text-center">
                  <TargetIcon className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">Set Goals</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-3"
                onClick={() => onOptimizationAction?.('price_optimization', {})}
              >
                <div className="text-center">
                  <CurrencyDollarIcon className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">Price Analysis</div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-3"
                onClick={() => onOptimizationAction?.('service_optimization', {})}
              >
                <div className="text-center">
                  <CogIcon className="h-5 w-5 mx-auto mb-1" />
                  <div className="text-sm font-medium">Service Mix</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}