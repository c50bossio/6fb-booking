import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Clock, 
  Calendar,
  TrendingUp,
  Users,
  BarChart3,
  Zap,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react'
import { aiAnalyticsApi } from '@/lib/api/ai-analytics'
import type { DemandPattern, PredictionResponse } from '@/lib/api/ai-analytics'
import { useToast } from '@/hooks/use-toast'

interface DemandForecastPanelProps {
  className?: string
}

export const DemandForecastPanel: React.FC<DemandForecastPanelProps> = ({
  className = ''
}) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [patterns, setPatterns] = useState<DemandPattern[] | null>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'hourly'>('daily')

  const loadDemandPatterns = async (timeframe: string = 'daily') => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response: PredictionResponse = await aiAnalyticsApi.getDemandPatterns({
        timeframe,
        include_recommendations: true
      })
      setPatterns(response.data as DemandPattern[])
      setMetadata(response.metadata)
    } catch (err) {
      console.error('Failed to load demand patterns:', err)
      setError('Failed to load demand patterns')
      toast({
        title: 'Error',
        description: 'Failed to load demand forecast',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDemandPatterns(selectedTimeframe)
  }, [selectedTimeframe])

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600 bg-red-100 dark:bg-red-900/20'
    if (utilization >= 75) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
    if (utilization >= 50) return 'text-green-600 bg-green-100 dark:bg-green-900/20'
    return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20'
  }

  const getUtilizationIcon = (utilization: number) => {
    if (utilization >= 90) return <AlertCircle className="h-4 w-4" />
    if (utilization >= 75) return <TrendingUp className="h-4 w-4" />
    return <CheckCircle className="h-4 w-4" />
  }

  const formatTimeSlot = (timeSlot: string) => {
    if (selectedTimeframe === 'hourly') {
      const hour = parseInt(timeSlot)
      return new Date(0, 0, 0, hour).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        hour12: true 
      })
    }
    if (selectedTimeframe === 'weekly') {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      return days[parseInt(timeSlot)] || timeSlot
    }
    return timeSlot
  }

  const avgUtilization = patterns && patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.capacity_utilization, 0) / patterns.length : 0
  const peakDemand = Math.max(...(patterns?.map(p => p.predicted_demand) || [0]))
  const totalRecommendations = patterns?.reduce((sum, p) => sum + p.recommendations.length, 0) || 0

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
              <Clock className="h-5 w-5" />
              Demand Forecast
            </CardTitle>
            <CardDescription>
              AI predictions for appointment demand and capacity optimization
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={selectedTimeframe} onValueChange={(value: any) => setSelectedTimeframe(value)} defaultValue="weekly">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="hourly">Hourly</TabsTrigger>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button 
              variant="outline" 
              onClick={() => loadDemandPatterns(selectedTimeframe)}
              disabled={isLoading}
            >
              {isLoading ? 'Analyzing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {patterns && (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Utilization</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{avgUtilization.toFixed(0)}%</p>
                {getUtilizationIcon(avgUtilization)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Peak Demand</p>
              <p className="text-2xl font-bold">{peakDemand} appts</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Time Periods</p>
              <p className="text-2xl font-bold">{patterns.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Recommendations</p>
              <p className="text-2xl font-bold">{totalRecommendations}</p>
            </div>
          </div>
        )}

        {/* Demand Pattern Visualization */}
        {patterns && patterns.length > 0 ? (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {selectedTimeframe.charAt(0).toUpperCase() + selectedTimeframe.slice(1)} Demand Patterns
            </h4>
            
            <div className="space-y-3">
              {patterns.map((pattern, index) => {
                const utilizationLevel = pattern.capacity_utilization
                
                return (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{formatTimeSlot(pattern.time_slot)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getUtilizationColor(utilizationLevel)}>
                          {utilizationLevel.toFixed(0)}% capacity
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {pattern.predicted_demand} appointments
                        </span>
                      </div>
                    </div>

                    {/* Visual capacity bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Capacity Utilization</span>
                        <span>{utilizationLevel.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            utilizationLevel >= 90 ? 'bg-red-500' :
                            utilizationLevel >= 75 ? 'bg-yellow-500' :
                            utilizationLevel >= 50 ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(utilizationLevel, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Recommendations */}
                    {pattern.recommendations.length > 0 && (
                      <div className="space-y-2">
                        <h6 className="text-xs font-medium text-muted-foreground">
                          OPTIMIZATION RECOMMENDATIONS
                        </h6>
                        <ul className="space-y-1">
                          {pattern.recommendations.map((rec, recIndex) => (
                            <li key={recIndex} className="text-xs flex items-start gap-2">
                              <Zap className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Insights Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Key Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="p-3 border rounded-lg">
                    <h5 className="font-medium text-sm mb-1">Peak Period</h5>
                    <p className="text-xs text-muted-foreground">
                      {patterns.reduce((peak, current) => 
                        current.predicted_demand > peak.predicted_demand ? current : peak
                      ).time_slot} - {peakDemand} appointments
                    </p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <h5 className="font-medium text-sm mb-1">Low Demand</h5>
                    <p className="text-xs text-muted-foreground">
                      {patterns.reduce((low, current) => 
                        current.predicted_demand < low.predicted_demand ? current : low
                      ).time_slot} - {Math.min(...patterns.map(p => p.predicted_demand))} appointments
                    </p>
                  </div>
                </div>

                {/* Global recommendations */}
                <div className="space-y-2">
                  <h6 className="text-sm font-medium">Capacity Optimization Tips</h6>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      Consider dynamic pricing during peak hours to balance demand
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      Offer promotions during low-demand periods to increase bookings
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                      Adjust staff schedules to match predicted demand patterns
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : isLoading ? (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Analyzing demand patterns...</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No demand data available</p>
            <Button onClick={() => loadDemandPatterns(selectedTimeframe)}>
              Generate Forecast
            </Button>
          </div>
        )}

        {/* Model Info */}
        {metadata && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Forecast generated using {metadata.model_version} with {metadata.data_points_used} data points.
              Confidence score: {metadata.confidence_score}%. Analysis includes historical booking patterns, 
              seasonal trends, and market conditions.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}