"use client"

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/progress'
import { 
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  CalculatorIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

interface ROIMetrics {
  platform: string
  icon: string
  spend: number
  revenue: number
  profit: number
  roi_percentage: number
  roas: number // Return on Ad Spend
  cost_per_acquisition: number
  lifetime_value: number
  payback_period: number // in days
  margin_percentage: number
  profit_trend: number
  efficiency_score: number
}

interface ConversionGoals {
  target_roi: number
  target_bookings: number
  target_revenue: number
  target_cost_per_booking: number
}

interface ConversionMetricsPanelProps {
  platforms: any[]
  timeRange: '24h' | '7d' | '30d'
  goals?: ConversionGoals
}

const defaultGoals: ConversionGoals = {
  target_roi: 300, // 300% ROI target
  target_bookings: 100,
  target_revenue: 25000,
  target_cost_per_booking: 40
}

export default function ConversionMetricsPanel({ 
  platforms, 
  timeRange,
  goals = defaultGoals 
}: ConversionMetricsPanelProps) {
  const [selectedMetric, setSelectedMetric] = useState<'roi' | 'profit' | 'efficiency' | 'ltv'>('roi')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Calculate enhanced ROI metrics for each platform
  const roiMetrics = useMemo(() => {
    return platforms.map(platform => {
      // Simulate realistic business metrics
      const spend = platform.cost_per_booking * platform.bookings
      const revenue = platform.revenue
      const profit = revenue - spend
      const roi_percentage = spend > 0 ? ((profit / spend) * 100) : 0
      const roas = spend > 0 ? (revenue / spend) : 0
      const average_booking_value = platform.bookings > 0 ? revenue / platform.bookings : 0
      
      // Advanced metrics
      const lifetime_value = average_booking_value * 2.5 // Assume 2.5x repeat factor
      const payback_period = spend > 0 ? (spend / (revenue / 30)) : 0 // Days to break even
      const margin_percentage = revenue > 0 ? ((profit / revenue) * 100) : 0
      const profit_trend = Math.random() * 40 - 20 // Mock trend data
      
      // Efficiency score (0-100) based on multiple factors
      const roi_score = Math.min(roi_percentage / 300 * 40, 40) // ROI component (40%)
      const conversion_score = Math.min(platform.conversion_rate / 3 * 30, 30) // Conversion rate component (30%)
      const cost_score = Math.min((50 - platform.cost_per_booking) / 50 * 30, 30) // Cost efficiency component (30%)
      const efficiency_score = Math.max(0, roi_score + conversion_score + cost_score)

      return {
        platform: platform.platform,
        icon: platform.icon,
        spend,
        revenue,
        profit,
        roi_percentage,
        roas,
        cost_per_acquisition: platform.cost_per_booking,
        lifetime_value,
        payback_period,
        margin_percentage,
        profit_trend,
        efficiency_score: Math.round(efficiency_score)
      }
    }).filter(metric => metric.spend > 0) // Only show platforms with spend data
  }, [platforms])

  const aggregatedMetrics = useMemo(() => {
    const totals = roiMetrics.reduce((acc, metric) => ({
      total_spend: acc.total_spend + metric.spend,
      total_revenue: acc.total_revenue + metric.revenue,
      total_profit: acc.total_profit + metric.profit,
      total_bookings: acc.total_bookings + platforms.find(p => p.platform === metric.platform)?.bookings || 0
    }), { total_spend: 0, total_revenue: 0, total_profit: 0, total_bookings: 0 })

    const overall_roi = totals.total_spend > 0 ? ((totals.total_profit / totals.total_spend) * 100) : 0
    const overall_roas = totals.total_spend > 0 ? (totals.total_revenue / totals.total_spend) : 0
    const avg_cost_per_booking = totals.total_bookings > 0 ? (totals.total_spend / totals.total_bookings) : 0

    return {
      ...totals,
      overall_roi,
      overall_roas,
      avg_cost_per_booking,
      goal_progress: {
        roi: overall_roi / goals.target_roi * 100,
        bookings: totals.total_bookings / goals.target_bookings * 100,
        revenue: totals.total_revenue / goals.target_revenue * 100,
        cost_per_booking: avg_cost_per_booking <= goals.target_cost_per_booking ? 100 : (goals.target_cost_per_booking / avg_cost_per_booking * 100)
      }
    }
  }, [roiMetrics, goals, platforms])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number, decimals = 1) => {
    return `${value.toFixed(decimals)}%`
  }

  const getROIColor = (roi: number) => {
    if (roi >= 200) return 'text-green-600'
    if (roi >= 100) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getGoalProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const getEfficiencyBadge = (score: number) => {
    if (score >= 80) return { variant: 'success' as const, label: 'Excellent' }
    if (score >= 60) return { variant: 'default' as const, label: 'Good' }
    if (score >= 40) return { variant: 'secondary' as const, label: 'Fair' }
    return { variant: 'destructive' as const, label: 'Poor' }
  }

  if (roiMetrics.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <CalculatorIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Cost Data Available</h3>
          <p className="text-gray-500 mb-4">
            Add cost-per-booking data to your advertising platforms to see ROI analytics.
          </p>
          <Badge variant="secondary">Requires Advertising Platform Data</Badge>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total ROI</p>
                <p className={`text-2xl font-bold ${getROIColor(aggregatedMetrics.overall_roi)}`}>
                  {formatPercentage(aggregatedMetrics.overall_roi, 0)}
                </p>
              </div>
              <div className={`p-2 rounded-lg ${ 
                aggregatedMetrics.overall_roi >= 200 ? 'bg-green-100' : 
                aggregatedMetrics.overall_roi >= 100 ? 'bg-yellow-100' : 'bg-red-100'
              }`}>
                <ArrowTrendingUpIcon className="h-5 w-5 text-current" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                Goal: {formatPercentage(goals.target_roi, 0)}
              </p>
              <Progress 
                value={Math.min(aggregatedMetrics.goal_progress.roi, 100)} 
                className="mt-1 h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Profit</p>
                <p className={`text-2xl font-bold ${aggregatedMetrics.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(aggregatedMetrics.total_profit)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-blue-100">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                From {formatCurrency(aggregatedMetrics.total_spend)} spend
              </p>
              <p className="text-xs text-green-600">
                ROAS: {aggregatedMetrics.overall_roas.toFixed(2)}x
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg. Cost/Booking</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(aggregatedMetrics.avg_cost_per_booking)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-purple-100">
                <ArrowUpIcon className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                Goal: {formatCurrency(goals.target_cost_per_booking)}
              </p>
              <Progress 
                value={Math.min(aggregatedMetrics.goal_progress.cost_per_booking, 100)} 
                className="mt-1 h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Revenue Goal</p>
                <p className="text-2xl font-bold">
                  {formatPercentage(aggregatedMetrics.goal_progress.revenue, 0)}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-orange-100">
                <ArrowUpIcon className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                {formatCurrency(aggregatedMetrics.total_revenue)} / {formatCurrency(goals.target_revenue)}
              </p>
              <Progress 
                value={Math.min(aggregatedMetrics.goal_progress.revenue, 100)} 
                className="mt-1 h-2"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metric Selection */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {[
            { key: 'roi', label: 'ROI Analysis' },
            { key: 'profit', label: 'Profit Breakdown' },
            { key: 'efficiency', label: 'Efficiency Score' },
            { key: 'ltv', label: 'Lifetime Value' }
          ].map(metric => (
            <Button
              key={metric.key}
              variant={selectedMetric === metric.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedMetric(metric.key as any)}
            >
              {metric.label}
            </Button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <InformationCircleIcon className="h-4 w-4 mr-1" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </Button>
      </div>

      {/* Platform Details */}
      <div className="space-y-4">
        {roiMetrics.map((metric, index) => (
          <Card key={index}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center">
                  <span className="text-lg mr-2">{metric.icon}</span>
                  {metric.platform}
                </div>
                <Badge {...getEfficiencyBadge(metric.efficiency_score)}>
                  {getEfficiencyBadge(metric.efficiency_score).label} ({metric.efficiency_score}/100)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedMetric === 'roi' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className={`text-xl font-bold ${getROIColor(metric.roi_percentage)}`}>
                      {formatPercentage(metric.roi_percentage, 0)}
                    </div>
                    <div className="text-xs text-gray-500">ROI</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {metric.roas.toFixed(2)}x
                    </div>
                    <div className="text-xs text-gray-500">ROAS</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {formatCurrency(metric.cost_per_acquisition)}
                    </div>
                    <div className="text-xs text-gray-500">Cost/Acquisition</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {Math.round(metric.payback_period)}d
                    </div>
                    <div className="text-xs text-gray-500">Payback Period</div>
                  </div>
                </div>
              )}

              {selectedMetric === 'profit' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-lg font-bold text-red-600">
                        {formatCurrency(metric.spend)}
                      </div>
                      <div className="text-xs text-gray-500">Ad Spend</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(metric.revenue)}
                      </div>
                      <div className="text-xs text-gray-500">Revenue</div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${metric.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(metric.profit)}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center">
                        Profit
                        {metric.profit_trend !== 0 && (
                          <span className={`ml-1 text-xs ${metric.profit_trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ({metric.profit_trend > 0 ? '+' : ''}{metric.profit_trend.toFixed(1)}%)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Profit Margin</span>
                      <span>{formatPercentage(metric.margin_percentage)}</span>
                    </div>
                    <Progress value={Math.max(0, metric.margin_percentage)} className="h-2" />
                  </div>
                </div>
              )}

              {selectedMetric === 'efficiency' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Overall Efficiency Score</span>
                      <span className="font-medium">{metric.efficiency_score}/100</span>
                    </div>
                    <Progress 
                      value={metric.efficiency_score} 
                      className={`h-3 ${
                        metric.efficiency_score >= 80 ? '[&>div]:bg-green-500' :
                        metric.efficiency_score >= 60 ? '[&>div]:bg-yellow-500' :
                        '[&>div]:bg-red-500'
                      }`}
                    />
                  </div>
                  
                  {showAdvanced && (
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                      <div>
                        <div className="text-sm font-medium">ROI Component</div>
                        <div className="text-xs text-gray-500">40% of efficiency score</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Conversion Component</div>
                        <div className="text-xs text-gray-500">30% of efficiency score</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Cost Component</div>
                        <div className="text-xs text-gray-500">30% of efficiency score</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">Optimization Potential</div>
                        <div className="text-xs text-gray-500">{100 - metric.efficiency_score} points</div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedMetric === 'ltv' && (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xl font-bold text-purple-600">
                      {formatCurrency(metric.lifetime_value)}
                    </div>
                    <div className="text-xs text-gray-500">Customer LTV</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {(metric.lifetime_value / metric.cost_per_acquisition).toFixed(1)}x
                    </div>
                    <div className="text-xs text-gray-500">LTV/CAC Ratio</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">
                      {Math.round(metric.payback_period)}d
                    </div>
                    <div className="text-xs text-gray-500">Payback Period</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Performance Insights</CardTitle>
          <CardDescription>AI-powered recommendations based on your metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {aggregatedMetrics.overall_roi >= 300 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start">
                  <ArrowTrendingUpIcon className="h-5 w-5 text-green-600 mt-0.5 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-green-800">Excellent Performance</div>
                    <div className="text-xs text-green-600">
                      Your ROI of {formatPercentage(aggregatedMetrics.overall_roi, 0)} exceeds industry benchmarks. 
                      Consider scaling your ad spend to maximize returns.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {aggregatedMetrics.avg_cost_per_booking > goals.target_cost_per_booking && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <ArrowDownIcon className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-yellow-800">Cost Optimization Opportunity</div>
                    <div className="text-xs text-yellow-600">
                      Your cost per booking ({formatCurrency(aggregatedMetrics.avg_cost_per_booking)}) is above target. 
                      Consider improving ad targeting or landing page conversion rates.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {roiMetrics.some(m => m.efficiency_score < 60) && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start">
                  <InformationCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                  <div>
                    <div className="text-sm font-medium text-blue-800">Platform Optimization</div>
                    <div className="text-xs text-blue-600">
                      Some platforms have efficiency scores below 60. Review targeting, 
                      ad creative, and landing page experience for these channels.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}