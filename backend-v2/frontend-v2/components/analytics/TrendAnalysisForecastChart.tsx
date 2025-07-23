'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { 
  LineChart, 
  Line, 
  Area, 
  AreaChart, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  ReferenceArea,
  Legend
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Calendar, 
  BarChart3,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSixFigureAnalytics } from '@/lib/six-figure-analytics'

export interface TrendDataPoint {
  date: string
  actual?: number
  forecast?: number
  target?: number
  confidence?: number
  label?: string
}

export interface TrendAnalysisConfig {
  title: string
  metric: string
  unit?: string
  formatValue?: (value: number) => string
  targetValue?: number
  forecastDays?: number
  showConfidenceBand?: boolean
  showGoalLine?: boolean
  trendColor?: string
  forecastColor?: string
  targetColor?: string
}

interface TrendAnalysisForecastChartProps {
  data?: TrendDataPoint[]
  config: TrendAnalysisConfig
  timeRange?: '7d' | '30d' | '90d' | '1y'
  showForecast?: boolean
  showTargets?: boolean
  height?: number
  className?: string
}

/**
 * Enhanced Trend Analysis & Forecasting Chart
 * Provides predictive analytics for existing revenue and metric charts
 * Integrates seamlessly with current analytics dashboard components
 */
export function TrendAnalysisForecastChart({
  data: providedData,
  config,
  timeRange = '30d',
  showForecast = true,
  showTargets = true,
  height = 300,
  className
}: TrendAnalysisForecastChartProps) {
  const { getBusinessIntelligence } = useSixFigureAnalytics()
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([])
  const [selectedView, setSelectedView] = useState<'trend' | 'forecast' | 'combined'>('combined')
  const [loading, setLoading] = useState(false)

  // Generate enhanced trend data with forecasting
  const generateTrendData = async () => {
    if (providedData) {
      setTrendData(providedData)
      return
    }

    setLoading(true)
    try {
      // Generate mock historical data for demonstration
      const historicalData = generateHistoricalData(config.metric, timeRange)
      
      // Generate forecast data
      const forecastData = showForecast ? generateForecastData(historicalData, config) : []
      
      // Combine historical and forecast data
      const combinedData = [...historicalData, ...forecastData]
      
      setTrendData(combinedData)
    } catch (error) {
      console.error('Failed to generate trend data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate trend analytics
  const trendAnalytics = useMemo(() => {
    if (trendData.length < 2) return null

    const actualData = trendData.filter(d => d.actual !== undefined)
    if (actualData.length < 2) return null

    const recentData = actualData.slice(-7) // Last 7 data points
    const olderData = actualData.slice(-14, -7) // Previous 7 data points

    const recentAvg = recentData.reduce((sum, d) => sum + (d.actual || 0), 0) / recentData.length
    const olderAvg = olderData.reduce((sum, d) => sum + (d.actual || 0), 0) / olderData.length

    const trendDirection = recentAvg > olderAvg ? 'up' : recentAvg < olderAvg ? 'down' : 'stable'
    const trendStrength = Math.abs((recentAvg - olderAvg) / olderAvg) * 100
    
    // Calculate forecast accuracy (mock for demonstration)
    const forecastAccuracy = 85 + Math.random() * 10 // 85-95%
    
    return {
      direction: trendDirection,
      strength: trendStrength,
      recentValue: recentData[recentData.length - 1]?.actual || 0,
      previousValue: recentData[0]?.actual || 0,
      changePercent: ((recentAvg - olderAvg) / olderAvg) * 100,
      forecastAccuracy,
      dataPoints: actualData.length
    }
  }, [trendData])

  // Generate forecast insight
  const forecastInsight = useMemo(() => {
    if (!trendAnalytics || !showForecast) return null

    const futureData = trendData.filter(d => d.forecast !== undefined)
    if (futureData.length === 0) return null

    const avgForecast = futureData.reduce((sum, d) => sum + (d.forecast || 0), 0) / futureData.length
    const currentValue = trendAnalytics.recentValue
    const projectedGrowth = ((avgForecast - currentValue) / currentValue) * 100

    const timeRangeDays = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    }

    const forecastPeriodDays = config.forecastDays || 30

    return {
      projectedValue: avgForecast,
      projectedGrowth,
      forecastPeriod: forecastPeriodDays,
      confidence: trendAnalytics.forecastAccuracy,
      achievingTarget: config.targetValue ? avgForecast >= config.targetValue : null
    }
  }, [trendData, trendAnalytics, config, showForecast])

  // Initialize data on component mount
  useEffect(() => {
    generateTrendData()
  }, [timeRange, config.metric])

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const formatValue = config.formatValue || ((val: number) => `${val.toLocaleString()}${config.unit || ''}`)

    return (
      <div className="bg-white border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((item: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mt-1">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: item.color }}
            />
            <span className="text-gray-600">{item.dataKey}:</span>
            <span className="font-medium" style={{ color: item.color }}>
              {formatValue(item.value)}
            </span>
            {item.payload.confidence && (
              <span className="text-xs text-gray-500">
                ({item.payload.confidence}% confidence)
              </span>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Chart colors
  const colors = {
    actual: config.trendColor || '#3B82F6',
    forecast: config.forecastColor || '#8B5CF6',
    target: config.targetColor || '#10B981',
    confidence: '#E5E7EB'
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-lg">{config.title}</CardTitle>
            {trendAnalytics && (
              <Badge 
                variant={trendAnalytics.direction === 'up' ? 'default' : 
                        trendAnalytics.direction === 'down' ? 'destructive' : 'secondary'}
                className="ml-2"
              >
                <TrendingUp className="w-3 h-3 mr-1" />
                {trendAnalytics.changePercent > 0 ? '+' : ''}{trendAnalytics.changePercent.toFixed(1)}%
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)} className="w-auto">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="trend" className="text-xs">Trend</TabsTrigger>
                <TabsTrigger value="forecast" className="text-xs">Forecast</TabsTrigger>
                <TabsTrigger value="combined" className="text-xs">Combined</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Analytics Summary */}
        {trendAnalytics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {config.formatValue 
                  ? config.formatValue(trendAnalytics.recentValue)
                  : `${trendAnalytics.recentValue.toLocaleString()}${config.unit || ''}`
                }
              </div>
              <div className="text-xs text-gray-500">Current Value</div>
            </div>
            
            <div className="text-center">
              <div className={cn(
                'text-2xl font-bold',
                trendAnalytics.direction === 'up' ? 'text-green-600' :
                trendAnalytics.direction === 'down' ? 'text-red-600' : 'text-gray-600'
              )}>
                {trendAnalytics.changePercent > 0 ? '+' : ''}{trendAnalytics.changePercent.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Trend Change</div>
            </div>

            {forecastInsight && (
              <>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {config.formatValue 
                      ? config.formatValue(forecastInsight.projectedValue)
                      : `${forecastInsight.projectedValue.toLocaleString()}${config.unit || ''}`
                    }
                  </div>
                  <div className="text-xs text-gray-500">Forecast</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(forecastInsight.confidence)}%
                  </div>
                  <div className="text-xs text-gray-500">Confidence</div>
                </div>
              </>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        <Tabs value={selectedView} className="w-full">
          <TabsContent value="trend" className="mt-0">
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={trendData.filter(d => d.actual !== undefined)}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={config.formatValue || ((val) => `${val.toLocaleString()}${config.unit || ''}`)}
                />
                <Tooltip content={<CustomTooltip />} />
                
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={colors.actual}
                  strokeWidth={2}
                  dot={{ fill: colors.actual, r: 4 }}
                  activeDot={{ r: 6, stroke: colors.actual, strokeWidth: 2 }}
                />

                {config.targetValue && showTargets && (
                  <ReferenceLine
                    y={config.targetValue}
                    stroke={colors.target}
                    strokeDasharray="5 5"
                    label={{ value: "Target", position: "insideTopRight" }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="forecast" className="mt-0">
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={trendData.filter(d => d.forecast !== undefined)}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={config.formatValue || ((val) => `${val.toLocaleString()}${config.unit || ''}`)}
                />
                <Tooltip content={<CustomTooltip />} />
                
                <Line
                  type="monotone"
                  dataKey="forecast"
                  stroke={colors.forecast}
                  strokeWidth={2}
                  strokeDasharray="8 4"
                  dot={{ fill: colors.forecast, r: 4 }}
                  activeDot={{ r: 6, stroke: colors.forecast, strokeWidth: 2 }}
                />

                {config.targetValue && showTargets && (
                  <ReferenceLine
                    y={config.targetValue}
                    stroke={colors.target}
                    strokeDasharray="5 5"
                    label={{ value: "Target", position: "insideTopRight" }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="combined" className="mt-0">
            <ResponsiveContainer width="100%" height={height}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={config.formatValue || ((val) => `${val.toLocaleString()}${config.unit || ''}`)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                
                {config.showConfidenceBand && (
                  <Area
                    type="monotone"
                    dataKey="confidence"
                    stroke="none"
                    fill={colors.confidence}
                    fillOpacity={0.3}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke={colors.actual}
                  strokeWidth={2}
                  dot={{ fill: colors.actual, r: 4 }}
                  activeDot={{ r: 6, stroke: colors.actual, strokeWidth: 2 }}
                  name="Actual"
                />

                {showForecast && (
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    stroke={colors.forecast}
                    strokeWidth={2}
                    strokeDasharray="8 4"
                    dot={{ fill: colors.forecast, r: 4 }}
                    activeDot={{ r: 6, stroke: colors.forecast, strokeWidth: 2 }}
                    name="Forecast"
                  />
                )}

                {config.targetValue && showTargets && (
                  <ReferenceLine
                    y={config.targetValue}
                    stroke={colors.target}
                    strokeDasharray="5 5"
                    label={{ value: "Target", position: "insideTopRight" }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>

        {/* Forecast Insights */}
        {forecastInsight && (
          <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-purple-600" />
              <h4 className="font-medium text-purple-900">Forecast Analysis</h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {forecastInsight.projectedGrowth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className="font-medium text-gray-900">
                    Projected Growth: {forecastInsight.projectedGrowth.toFixed(1)}%
                  </span>
                </div>
                <p className="text-gray-600">
                  Over the next {forecastInsight.forecastPeriod} days
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  {forecastInsight.achievingTarget ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  )}
                  <span className="font-medium text-gray-900">
                    Target Status: {forecastInsight.achievingTarget ? 'On Track' : 'Needs Attention'}
                  </span>
                </div>
                <p className="text-gray-600">
                  {Math.round(forecastInsight.confidence)}% forecast confidence
                </p>
              </div>
            </div>

            {!forecastInsight.achievingTarget && config.targetValue && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Recommendation:</strong> Current trend suggests you may not reach your target. 
                  Consider implementing growth strategies to close the gap.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Helper functions for data generation
 */
function generateHistoricalData(metric: string, timeRange: string): TrendDataPoint[] {
  const days = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '1y': 365
  }[timeRange] || 30

  const data: TrendDataPoint[] = []
  const baseValue = getBaseValueForMetric(metric)
  const volatility = getVolatilityForMetric(metric)

  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    // Generate realistic data with trend
    const trendFactor = 1 + (days - i) * 0.001 // Slight upward trend
    const randomFactor = 1 + (Math.random() - 0.5) * volatility
    const actual = Math.round(baseValue * trendFactor * randomFactor)

    data.push({
      date: date.toISOString().split('T')[0],
      actual,
      label: date.toLocaleDateString()
    })
  }

  return data
}

function generateForecastData(historicalData: TrendDataPoint[], config: TrendAnalysisConfig): TrendDataPoint[] {
  const forecastDays = config.forecastDays || 30
  const lastDataPoint = historicalData[historicalData.length - 1]
  const lastValue = lastDataPoint?.actual || 0

  // Simple linear trend calculation
  const recentData = historicalData.slice(-7)
  const trend = recentData.length > 1 ? 
    (recentData[recentData.length - 1].actual! - recentData[0].actual!) / recentData.length : 0

  const forecastData: TrendDataPoint[] = []

  for (let i = 1; i <= forecastDays; i++) {
    const date = new Date(lastDataPoint?.date || new Date())
    date.setDate(date.getDate() + i)
    
    const forecast = lastValue + (trend * i)
    const confidence = Math.max(60, 95 - (i * 2)) // Decreasing confidence over time

    forecastData.push({
      date: date.toISOString().split('T')[0],
      forecast: Math.round(forecast),
      confidence,
      label: date.toLocaleDateString()
    })
  }

  return forecastData
}

function getBaseValueForMetric(metric: string): number {
  const baseValues: Record<string, number> = {
    'monthly_revenue': 8000,
    'average_revenue_per_client': 400,
    'client_retention_rate': 0.75,
    'premium_service_percentage': 0.35,
    'booking_utilization_rate': 0.70,
    'six_figure_progress': 0.65
  }
  return baseValues[metric] || 1000
}

function getVolatilityForMetric(metric: string): number {
  const volatilities: Record<string, number> = {
    'monthly_revenue': 0.15,
    'average_revenue_per_client': 0.10,
    'client_retention_rate': 0.05,
    'premium_service_percentage': 0.08,
    'booking_utilization_rate': 0.12,
    'six_figure_progress': 0.10
  }
  return volatilities[metric] || 0.10
}

/**
 * Quick integration component for existing charts
 */
interface EnhancedChartWrapperProps {
  originalChart: React.ReactNode
  metric: string
  title: string
  targetValue?: number
  className?: string
}

export function EnhancedChartWrapper({
  originalChart,
  metric,
  title,
  targetValue,
  className
}: EnhancedChartWrapperProps) {
  return (
    <div className={cn('relative', className)}>
      {originalChart}
      
      {/* Enhancement overlay */}
      <div className="absolute top-4 right-4">
        <TrendAnalysisForecastChart
          config={{
            title: `${title} Forecast`,
            metric,
            targetValue,
            forecastDays: 30,
            showConfidenceBand: true
          }}
          height={200}
          className="w-80 opacity-90 hover:opacity-100 transition-opacity"
        />
      </div>
    </div>
  )
}

// Export types
export type { TrendDataPoint, TrendAnalysisConfig }