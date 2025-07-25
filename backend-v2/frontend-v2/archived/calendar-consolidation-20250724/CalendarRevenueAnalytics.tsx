'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import {
  DollarSignIcon,
  TrendingUpIcon,
  ClockIcon,
  StarIcon,
  LightBulbIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
  BoltIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  RefreshCwIcon
} from '@heroicons/react/24/outline'

interface RevenueMetrics {
  daily_revenue: number
  daily_target: number
  daily_progress: number
  weekly_revenue: number
  weekly_target: number
  weekly_progress: number
  monthly_revenue: number
  monthly_target: number
  monthly_progress: number
  annual_projection: number
  annual_target: number
  annual_progress: number
  average_ticket: number
  appointment_count: number
  high_value_service_count: number
  commission_earned: number
}

interface UpsellOpportunity {
  appointment_id: number
  client_name: string
  current_service: string
  current_price: number
  suggested_service: string
  suggested_price: number
  revenue_increase: number
  probability: number
  reasoning: string
  six_fb_principle: string
}

interface PeakHourAnalysis {
  hour: number
  average_revenue: number
  appointment_count: number
  average_ticket: number
  utilization_rate: number
  optimization_potential: number
}

interface OptimizationSuggestion {
  type: string
  title: string
  description: string
  expected_impact: number
  confidence: number
  implementation_difficulty: string
  six_fb_methodology: string
  action_items: string[]
}

interface CalendarRevenueAnalyticsProps {
  className?: string
  refreshTrigger?: number
  onUpsellApplied?: (appointmentId: number, revenueIncrease: number) => void
}

export default function CalendarRevenueAnalytics({
  className = "",
  refreshTrigger = 0,
  onUpsellApplied
}: CalendarRevenueAnalyticsProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null)
  const [upsellOpportunities, setUpsellOpportunities] = useState<UpsellOpportunity[]>([])
  const [peakHours, setPeakHours] = useState<PeakHourAnalysis[]>([])
  const [optimizationSuggestions, setOptimizationSuggestions] = useState<OptimizationSuggestion[]>([])
  const [sixFigureProgress, setSixFigureProgress] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [targetIncome, setTargetIncome] = useState(100000)

  // Fetch all revenue analytics data
  const fetchAnalyticsData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [
        metricsRes,
        upsellRes,
        peakHoursRes,
        suggestionsRes,
        progressRes
      ] = await Promise.all([
        fetch('/api/v2/calendar-revenue/metrics'),
        fetch('/api/v2/calendar-revenue/upsell-opportunities?days_ahead=7'),
        fetch('/api/v2/calendar-revenue/peak-hours?days_back=30'),
        fetch(`/api/v2/calendar-revenue/optimization-suggestions?target_income=${targetIncome}`),
        fetch(`/api/v2/calendar-revenue/six-figure-progress?target_income=${targetIncome}`)
      ])

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json()
        setMetrics(metricsData)
      }

      if (upsellRes.ok) {
        const upsellData = await upsellRes.json()
        setUpsellOpportunities(upsellData)
      }

      if (peakHoursRes.ok) {
        const peakData = await peakHoursRes.json()
        setPeakHours(peakData)
      }

      if (suggestionsRes.ok) {
        const suggestionsData = await suggestionsRes.json()
        setOptimizationSuggestions(suggestionsData)
      }

      if (progressRes.ok) {
        const progressData = await progressRes.json()
        setSixFigureProgress(progressData)
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error)
      toast({
        title: "Error",
        description: "Failed to load revenue analytics data.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }, [targetIncome, toast])

  // Initial load and refresh on trigger
  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData, refreshTrigger])

  // Apply upsell suggestion
  const handleApplyUpsell = async (opportunity: UpsellOpportunity) => {
    try {
      const response = await fetch('/api/v2/calendar-revenue/apply-upsell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: opportunity.appointment_id,
          suggested_service: opportunity.suggested_service,
          suggested_price: opportunity.suggested_price
        })
      })

      if (response.ok) {
        const result = await response.json()
        
        toast({
          title: "Upsell Applied!",
          description: `${opportunity.client_name} upgraded to ${opportunity.suggested_service}`,
          variant: "default"
        })

        // Remove from opportunities list
        setUpsellOpportunities(prev => 
          prev.filter(opp => opp.appointment_id !== opportunity.appointment_id)
        )

        // Notify parent component
        onUpsellApplied?.(opportunity.appointment_id, opportunity.revenue_increase)

        // Refresh metrics
        fetchAnalyticsData()
      } else {
        throw new Error('Failed to apply upsell')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply upsell suggestion.",
        variant: "destructive"
      })
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Get progress color
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'text-green-600 bg-green-500'
    if (progress >= 75) return 'text-yellow-600 bg-yellow-500'
    if (progress >= 50) return 'text-blue-600 bg-blue-500'
    return 'text-red-600 bg-red-500'
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCwIcon className="w-6 h-6 animate-spin mr-2" />
            <span>Loading revenue analytics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`calendar-revenue-analytics space-y-4 ${className}`}>
      {/* Header with Target Selection */}
      <Card className="border-l-4 border-primary-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-6 h-6 text-primary-600" />
              <CardTitle className="text-xl">Six Figure Barber Analytics</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Annual Target:</label>
              <Select value={targetIncome.toString()} onValueChange={(value) => setTargetIncome(Number(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="75000">$75,000</SelectItem>
                  <SelectItem value="100000">$100,000</SelectItem>
                  <SelectItem value="125000">$125,000</SelectItem>
                  <SelectItem value="150000">$150,000</SelectItem>
                  <SelectItem value="200000">$200,000</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchAnalyticsData}>
                <RefreshCwIcon className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Key Metrics Cards */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Daily Progress */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSignIcon className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium">Today</span>
                    </div>
                    <Badge variant={metrics.daily_progress >= 100 ? "default" : "secondary"}>
                      {metrics.daily_progress.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{formatCurrency(metrics.daily_revenue)}</p>
                    <p className="text-xs text-gray-600">Target: {formatCurrency(metrics.daily_target)}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getProgressColor(metrics.daily_progress).split(' ')[1]}`}
                        style={{ width: `${Math.min(metrics.daily_progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Weekly Progress */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUpIcon className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium">This Week</span>
                    </div>
                    <Badge variant={metrics.weekly_progress >= 100 ? "default" : "secondary"}>
                      {metrics.weekly_progress.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{formatCurrency(metrics.weekly_revenue)}</p>
                    <p className="text-xs text-gray-600">Target: {formatCurrency(metrics.weekly_target)}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getProgressColor(metrics.weekly_progress).split(' ')[1]}`}
                        style={{ width: `${Math.min(metrics.weekly_progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Progress */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <ChartBarIcon className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium">This Month</span>
                    </div>
                    <Badge variant={metrics.monthly_progress >= 100 ? "default" : "secondary"}>
                      {metrics.monthly_progress.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{formatCurrency(metrics.monthly_revenue)}</p>
                    <p className="text-xs text-gray-600">Target: {formatCurrency(metrics.monthly_target)}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getProgressColor(metrics.monthly_progress).split(' ')[1]}`}
                        style={{ width: `${Math.min(metrics.monthly_progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Annual Projection */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StarIcon className="w-5 h-5 text-orange-600" />
                      <span className="text-sm font-medium">Projection</span>
                    </div>
                    <Badge variant={metrics.annual_progress >= 90 ? "default" : "secondary"}>
                      {metrics.annual_progress.toFixed(1)}%
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold">{formatCurrency(metrics.annual_projection)}</p>
                    <p className="text-xs text-gray-600">Target: {formatCurrency(metrics.annual_target)}</p>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${getProgressColor(metrics.annual_progress).split(' ')[1]}`}
                        style={{ width: `${Math.min(metrics.annual_progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Performance Summary */}
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Average Ticket</span>
                      <span className="font-semibold">{formatCurrency(metrics.average_ticket)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Total Appointments</span>
                      <span className="font-semibold">{metrics.appointment_count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">High-Value Services</span>
                      <span className="font-semibold">{metrics.high_value_service_count}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm text-gray-600">Commission Earned</span>
                      <span className="font-semibold text-green-600">{formatCurrency(metrics.commission_earned)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Peak Hours */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClockIcon className="w-5 h-5" />
                    Peak Revenue Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {peakHours.slice(0, 3).map((hour, index) => (
                      <div key={hour.hour} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                          <span className="text-sm font-medium">
                            {hour.hour === 0 ? 12 : hour.hour > 12 ? hour.hour - 12 : hour.hour}:00 
                            {hour.hour < 12 ? ' AM' : ' PM'}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{formatCurrency(hour.average_revenue)}</p>
                          <p className="text-xs text-gray-500">{hour.appointment_count} appts</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BoltIcon className="w-5 h-5 text-yellow-500" />
                Revenue Opportunities
                {upsellOpportunities.length > 0 && (
                  <Badge className="bg-orange-100 text-orange-800">
                    {upsellOpportunities.length} available
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upsellOpportunities.length > 0 ? (
                <div className="space-y-4">
                  {upsellOpportunities.map((opportunity) => (
                    <div key={opportunity.appointment_id} className="p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{opportunity.client_name}</h4>
                          <p className="text-sm text-gray-600 mb-2">
                            {opportunity.current_service} → {opportunity.suggested_service}
                          </p>
                          <p className="text-xs text-gray-700 mb-2">{opportunity.reasoning}</p>
                          
                          {/* Six Figure Barber Principle */}
                          <Alert className="border-blue-200 bg-blue-50">
                            <LightBulbIcon className="w-4 h-4" />
                            <AlertDescription className="text-xs text-blue-800">
                              <strong>6FB Principle:</strong> {opportunity.six_fb_principle}
                            </AlertDescription>
                          </Alert>
                        </div>
                        
                        <div className="text-right ml-4">
                          <Badge className="bg-green-100 text-green-800 mb-2">
                            +{formatCurrency(opportunity.revenue_increase)}
                          </Badge>
                          <p className="text-xs text-gray-500">
                            {Math.round(opportunity.probability * 100)}% likely
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {formatCurrency(opportunity.current_price)} → {formatCurrency(opportunity.suggested_price)}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleApplyUpsell(opportunity)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          Apply Upsell
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800 font-medium">
                      💡 Total Potential: {formatCurrency(upsellOpportunities.reduce((sum, opp) => sum + opp.revenue_increase, 0))}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Six Figure Barber Method: Every client interaction is an opportunity to increase lifetime value.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No immediate upsell opportunities identified.</p>
                  <p className="text-sm text-gray-500 mt-1">Check back as new appointments are scheduled.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-4">
          <div className="space-y-4">
            {optimizationSuggestions.map((suggestion, index) => (
              <Card key={index} className="border-l-4 border-purple-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <AdjustmentsHorizontalIcon className="w-5 h-5 text-purple-600" />
                      {suggestion.title}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.implementation_difficulty}
                      </Badge>
                      <Badge className="bg-green-100 text-green-800">
                        +{formatCurrency(suggestion.expected_impact)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 mb-3">{suggestion.description}</p>
                  
                  <Alert className="border-purple-200 bg-purple-50 mb-3">
                    <StarIcon className="w-4 h-4" />
                    <AlertDescription className="text-xs text-purple-800">
                      <strong>6FB Methodology:</strong> {suggestion.six_fb_methodology}
                    </AlertDescription>
                  </Alert>
                  
                  <div>
                    <h5 className="text-sm font-semibold mb-2">Action Items:</h5>
                    <ul className="space-y-1">
                      {suggestion.action_items.map((item, itemIndex) => (
                        <li key={itemIndex} className="text-sm text-gray-600 flex items-start gap-2">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Confidence: {Math.round(suggestion.confidence * 100)}%</span>
                    <span>Type: {suggestion.type}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          {sixFigureProgress && (
            <div className="space-y-4">
              {/* Progress Overview */}
              <Card className="border-l-4 border-green-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpIcon className="w-5 h-5 text-green-600" />
                    Six Figure Journey Progress
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(sixFigureProgress.ytd_revenue)}
                      </p>
                      <p className="text-sm text-gray-600">Year-to-Date</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600">
                        {sixFigureProgress.ytd_progress.toFixed(1)}%
                      </p>
                      <p className="text-sm text-gray-600">Progress to Goal</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-600">
                        {formatCurrency(sixFigureProgress.annual_projection)}
                      </p>
                      <p className="text-sm text-gray-600">Annual Projection</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress to {formatCurrency(sixFigureProgress.target_income)}</span>
                      <span>{sixFigureProgress.ytd_progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-blue-500 h-4 rounded-full transition-all flex items-center justify-end pr-2"
                        style={{ width: `${Math.min(sixFigureProgress.ytd_progress, 100)}%` }}
                      >
                        {sixFigureProgress.ytd_progress > 10 && (
                          <span className="text-white text-xs font-bold">🚀</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <Alert className={`${sixFigureProgress.on_track ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
                    <AlertDescription className={`text-sm ${sixFigureProgress.on_track ? 'text-green-800' : 'text-yellow-800'}`}>
                      {sixFigureProgress.coaching_insight}
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              {/* Daily Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Daily Performance Tracking</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <p className="text-lg font-bold">{formatCurrency(sixFigureProgress.daily_average)}</p>
                      <p className="text-xs text-gray-600">Daily Average</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{formatCurrency(sixFigureProgress.daily_target)}</p>
                      <p className="text-xs text-gray-600">Daily Target</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{sixFigureProgress.days_passed}</p>
                      <p className="text-xs text-gray-600">Days Passed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold">{sixFigureProgress.days_remaining}</p>
                      <p className="text-xs text-gray-600">Days Remaining</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}