"use client"

/**
 * Trend Prediction Overlay Component
 * 
 * A reusable component that adds AI-powered trend predictions to existing charts
 * without disrupting the original chart functionality.
 */

import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Target,
  Eye,
  EyeOff,
  Brain,
  AlertTriangle
} from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic import for recharts to fix webpack issues
const Line = dynamic(() => import('recharts').then(mod => ({ default: mod.Line })), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => ({ default: mod.Area })), { ssr: false })

interface TrendPrediction {
  metric_name: string
  current_value: number
  predicted_values: Array<{
    date: string
    value: number
  }>
  confidence_interval: Array<{
    lower: number
    upper: number
  }>
  trend_strength: number
  seasonal_factor: number
}

interface TrendPredictionOverlayProps {
  /** The metric to predict trends for */
  metricName: string
  /** Number of days to predict ahead */
  daysAhead?: number
  /** Show/hide prediction by default */
  defaultVisible?: boolean
  /** Chart type to optimize overlay for */
  chartType?: 'line' | 'area' | 'bar'
  /** Color for prediction line */
  predictionColor?: string
  /** Color for confidence interval */
  confidenceColor?: string
  /** Compact mode for smaller charts */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
  /** Callback when prediction data is loaded */
  onPredictionLoaded?: (prediction: TrendPrediction) => void
}

export function TrendPredictionOverlay({
  metricName,
  daysAhead = 30,
  defaultVisible = true,
  chartType = 'line',
  predictionColor = '#8b5cf6',
  confidenceColor = '#c4b5fd',
  compact = false,
  className = "",
  onPredictionLoaded
}: TrendPredictionOverlayProps) {
  const [prediction, setPrediction] = useState<TrendPrediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [visible, setVisible] = useState(defaultVisible)

  const fetchPrediction = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/v2/analytics/intelligence/trends', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          metrics: [metricName],
          days_ahead: daysAhead
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch prediction: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.predictions && data.predictions.length > 0) {
        const predictionData = data.predictions[0]
        setPrediction(predictionData)
        onPredictionLoaded?.(predictionData)
      } else {
        throw new Error('No prediction data available')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load prediction'
      setError(errorMessage)
      console.error('Failed to fetch trend prediction:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPrediction()
  }, [metricName, daysAhead])

  const getTrendIcon = () => {
    if (!prediction) return Target
    
    if (prediction.trend_strength > 0.7) {
      return TrendingUp
    } else if (prediction.trend_strength < -0.7) {
      return TrendingDown
    }
    return Target
  }

  const getTrendColor = () => {
    if (!prediction) return 'text-gray-600'
    
    if (prediction.trend_strength > 0.3) {
      return 'text-green-600'
    } else if (prediction.trend_strength < -0.3) {
      return 'text-red-600'
    }
    return 'text-blue-600'
  }

  const getConfidenceLevel = () => {
    if (!prediction) return 'Unknown'
    
    // Calculate confidence based on trend strength and seasonal factor
    const confidence = Math.abs(prediction.trend_strength) * (1 - Math.abs(prediction.seasonal_factor) * 0.3)
    
    if (confidence > 0.8) return 'High'
    if (confidence > 0.6) return 'Medium'
    if (confidence > 0.4) return 'Low'
    return 'Very Low'
  }

  const getConfidenceColor = () => {
    const level = getConfidenceLevel()
    switch (level) {
      case 'High': return 'text-green-600'
      case 'Medium': return 'text-blue-600'
      case 'Low': return 'text-yellow-600'
      default: return 'text-red-600'
    }
  }

  const formatPredictionData = () => {
    if (!prediction || !prediction.predicted_values) return []
    
    return prediction.predicted_values.map((point, index) => ({
      ...point,
      date: new Date(point.date).toLocaleDateString(),
      confidence_lower: prediction.confidence_interval[index]?.lower || point.value * 0.9,
      confidence_upper: prediction.confidence_interval[index]?.upper || point.value * 1.1,
      isPrediction: true
    }))
  }

  // Generate chart elements for different chart types
  const generateChartElements = () => {
    if (!visible || !prediction) return null

    const predictionData = formatPredictionData()
    
    switch (chartType) {
      case 'line':
        return (
          <>
            <Line
              dataKey="value"
              stroke={predictionColor}
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              name="Predicted Trend"
              data={predictionData}
            />
            <Area
              dataKey="confidence_upper"
              stroke="none"
              fill={confidenceColor}
              fillOpacity={0.2}
              data={predictionData}
            />
            <Area
              dataKey="confidence_lower"
              stroke="none"
              fill={confidenceColor}
              fillOpacity={0.2}
              data={predictionData}
            />
          </>
        )
      
      case 'area':
        return (
          <>
            <Area
              dataKey="value"
              stroke={predictionColor}
              fill={predictionColor}
              fillOpacity={0.3}
              strokeDasharray="5 5"
              strokeWidth={2}
              name="Predicted Trend"
              data={predictionData}
            />
          </>
        )
      
      default:
        return null
    }
  }

  if (loading && !compact) {
    return (
      <div className={`flex items-center gap-2 p-2 ${className}`}>
        <Brain className="h-4 w-4 text-blue-600" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-16" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 p-2 ${className}`}>
        <Alert variant="destructive" className="py-1">
          <AlertTriangle className="h-3 w-3" />
          <AlertDescription className="text-xs">
            Prediction unavailable
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!prediction) return null

  const TrendIcon = getTrendIcon()
  const confidenceLevel = getConfidenceLevel()

  return (
    <div className={`flex items-center gap-2 ${compact ? 'text-xs' : 'text-sm'} ${className}`}>
      {/* Prediction Toggle */}
      <Button
        onClick={() => setVisible(!visible)}
        variant="ghost"
        size="sm"
        className={`h-auto p-1 ${compact ? 'text-xs' : ''}`}
      >
        {visible ? (
          <Eye className={`h-3 w-3 ${compact ? '' : 'mr-1'}`} />
        ) : (
          <EyeOff className={`h-3 w-3 ${compact ? '' : 'mr-1'}`} />
        )}
        {!compact && (visible ? 'Hide' : 'Show')} Prediction
      </Button>

      {visible && (
        <>
          {/* Trend Indicator */}
          <div className="flex items-center gap-1">
            <Brain className="h-3 w-3 text-blue-600" />
            <TrendIcon className={`h-3 w-3 ${getTrendColor()}`} />
            {!compact && (
              <span className={getTrendColor()}>
                {prediction.trend_strength > 0.3 ? 'Rising' :
                 prediction.trend_strength < -0.3 ? 'Falling' : 'Stable'}
              </span>
            )}
          </div>

          {/* Confidence Badge */}
          <Badge 
            variant={
              confidenceLevel === 'High' ? 'default' :
              confidenceLevel === 'Medium' ? 'secondary' : 'outline'
            }
            className={`text-xs ${getConfidenceColor()}`}
          >
            {compact ? confidenceLevel[0] : confidenceLevel} Confidence
          </Badge>

          {/* Next Value Prediction */}
          {!compact && prediction.predicted_values.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Next:</span>
              <span className="font-medium">
                {prediction.predicted_values[0].value.toFixed(1)}
              </span>
            </div>
          )}

          {/* Seasonal Factor */}
          {!compact && Math.abs(prediction.seasonal_factor) > 0.1 && (
            <Badge variant="outline" className="text-xs">
              {prediction.seasonal_factor > 0 ? '📈' : '📉'} Seasonal
            </Badge>
          )}
        </>
      )}

      {/* Chart Elements (returned separately for chart integration) */}
      <div style={{ display: 'none' }}>
        {generateChartElements()}
      </div>
    </div>
  )
}

// Hook to get prediction data for chart integration
export function useTrendPrediction(metricName: string, daysAhead: number = 30) {
  const [prediction, setPrediction] = useState<TrendPrediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/v2/analytics/intelligence/trends', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            metrics: [metricName],
            days_ahead: daysAhead
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch prediction: ${response.statusText}`)
        }

        const data = await response.json()
        
        if (data.predictions && data.predictions.length > 0) {
          setPrediction(data.predictions[0])
        } else {
          setPrediction(null)
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load prediction'
        setError(errorMessage)
        setPrediction(null)
      } finally {
        setLoading(false)
      }
    }

    fetchPrediction()
  }, [metricName, daysAhead])

  return { prediction, loading, error }
}

// Utility function to merge prediction data with existing chart data
export function mergePredictionWithChartData(
  chartData: any[], 
  prediction: TrendPrediction | null,
  dateKey: string = 'date',
  valueKey: string = 'value'
) {
  if (!prediction || !prediction.predicted_values) return chartData

  const lastDataPoint = chartData[chartData.length - 1]
  const lastDate = lastDataPoint ? new Date(lastDataPoint[dateKey]) : new Date()

  const predictionData = prediction.predicted_values.map((point, index) => ({
    [dateKey]: point.date,
    [valueKey]: point.value,
    [`${valueKey}_predicted`]: point.value,
    confidence_lower: prediction.confidence_interval[index]?.lower || point.value * 0.9,
    confidence_upper: prediction.confidence_interval[index]?.upper || point.value * 1.1,
    isPrediction: true
  }))

  return [...chartData, ...predictionData]
}