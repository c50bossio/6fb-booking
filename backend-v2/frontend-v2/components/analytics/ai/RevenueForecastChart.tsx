import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { TrendingUp, Calendar, DollarSign, Info } from 'lucide-react'
import { aiAnalyticsApi } from '@/lib/api/ai-analytics'
import type { RevenueForecast, PredictionResponse } from '@/lib/api/ai-analytics'
import { useToast } from '@/hooks/use-toast'

interface RevenueForecastChartProps {
  timeHorizon?: string
  className?: string
}

export const RevenueForecastChart: React.FC<RevenueForecastChartProps> = ({
  timeHorizon = '6_months',
  className = ''
}) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [forecast, setForecast] = useState<RevenueForecast[] | null>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const loadForecast = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response: PredictionResponse = await aiAnalyticsApi.getRevenueForecast(timeHorizon)
      setForecast(response.data as RevenueForecast[])
      setMetadata(response.metadata)
    } catch (err) {
      console.error('Failed to load revenue forecast:', err)
      setError('Failed to load revenue forecast')
      toast({
        title: 'Error',
        description: 'Failed to load revenue forecast',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadForecast()
  }, [timeHorizon])

  const totalForecast = forecast?.reduce((sum, item) => sum + item.predicted_revenue, 0) || 0
  const avgConfidence = forecast?.reduce((sum, item) => 
    sum + ((item.confidence_interval.upper - item.confidence_interval.lower) / item.predicted_revenue), 0
  ) / (forecast?.length || 1) || 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatMonth = (monthStr: string) => {
    const date = new Date(monthStr + '-01')
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-6">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Forecast
            </CardTitle>
            <CardDescription>
              AI-powered revenue predictions for the next {timeHorizon.replace('_', ' ')}
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={loadForecast}
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Forecast</p>
            <p className="text-2xl font-bold">{formatCurrency(totalForecast)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Confidence Score</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{metadata?.confidence_score || 0}%</p>
              <Badge variant="outline">{metadata?.model_version}</Badge>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Data Points</p>
            <p className="text-2xl font-bold">{metadata?.data_points_used || 0}</p>
          </div>
        </div>

        {/* Forecast Chart (Simplified) */}
        {forecast && forecast.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">Monthly Projections</h4>
              <div className="space-y-2">
                {forecast.map((item, index) => {
                  const confidenceRange = item.confidence_interval.upper - item.confidence_interval.lower
                  const confidencePercent = (confidenceRange / item.predicted_revenue) * 100
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatMonth(item.month)}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{formatCurrency(item.predicted_revenue)}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatCurrency(item.confidence_interval.lower)} - {formatCurrency(item.confidence_interval.upper)}
                        </div>
                        <Badge 
                          variant={confidencePercent < 20 ? "default" : confidencePercent < 40 ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          ±{confidencePercent.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Factors */}
            {forecast[0]?.factors && forecast[0].factors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Key Factors
                </h4>
                <ul className="space-y-1">
                  {forecast[0].factors.map((factor, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0"></span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Generating revenue forecast...</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No forecast data available</p>
            <Button onClick={loadForecast}>Generate Forecast</Button>
          </div>
        )}

        {/* Model Info */}
        {metadata && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Forecast generated using {metadata.model_version} with {metadata.data_points_used} data points.
              Confidence score: {metadata.confidence_score}%. This prediction uses historical data, 
              seasonal patterns, and industry trends.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}