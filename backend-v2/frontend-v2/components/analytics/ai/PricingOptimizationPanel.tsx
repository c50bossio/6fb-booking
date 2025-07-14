import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  DollarSign, 
  Target,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Minus,
  Lightbulb,
  BarChart3,
  Info,
  CheckCircle
} from 'lucide-react'
import { aiAnalyticsApi } from '@/lib/api/ai-analytics'
import type { PricingOptimization, PredictionResponse } from '@/lib/api/ai-analytics'
import { useToast } from '@/hooks/use-toast'

interface PricingOptimizationPanelProps {
  className?: string
}

export const PricingOptimizationPanel: React.FC<PricingOptimizationPanelProps> = ({
  className = ''
}) => {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [optimizations, setOptimizations] = useState<PricingOptimization[] | null>(null)
  const [metadata, setMetadata] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const loadPricingOptimization = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response: PredictionResponse = await aiAnalyticsApi.getPricingOptimization()
      setOptimizations(response.data as PricingOptimization[])
      setMetadata(response.metadata)
    } catch (err) {
      console.error('Failed to load pricing optimization:', err)
      setError('Failed to load pricing optimization')
      toast({
        title: 'Error',
        description: 'Failed to load pricing optimization data',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPricingOptimization()
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getImpactIcon = (impact: number) => {
    if (impact > 0) return <ArrowUp className="h-4 w-4 text-green-500" />
    if (impact < 0) return <ArrowDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-gray-500" />
  }

  const getImpactColor = (impact: number) => {
    if (impact > 0) return 'text-green-600 bg-green-100 dark:bg-green-900/20'
    if (impact < 0) return 'text-red-600 bg-red-100 dark:bg-red-900/20'
    return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  }

  const totalRevenueImpact = optimizations?.reduce((sum, opt) => sum + opt.expected_revenue_impact, 0) || 0
  const avgConfidence = optimizations && optimizations.length > 0 ? optimizations.reduce((sum, opt) => sum + opt.confidence_score, 0) / optimizations.length : 0
  const positiveImpactServices = optimizations?.filter(opt => opt.expected_revenue_impact > 0) || []
  const highConfidenceRecommendations = optimizations?.filter(opt => opt.confidence_score >= 80) || []

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
              <Target className="h-5 w-5" />
              Pricing Optimization
            </CardTitle>
            <CardDescription>
              AI-powered pricing recommendations to maximize revenue
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={loadPricingOptimization}
            disabled={isLoading}
          >
            {isLoading ? 'Analyzing...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        {optimizations && (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Revenue Impact</p>
              <div className="flex items-center gap-2">
                <p className={`text-2xl font-bold ${totalRevenueImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {totalRevenueImpact >= 0 ? '+' : ''}{formatCurrency(totalRevenueImpact)}
                </p>
                {getImpactIcon(totalRevenueImpact)}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{avgConfidence.toFixed(0)}%</p>
                <Badge className={getConfidenceColor(avgConfidence)}>
                  {avgConfidence >= 80 ? 'High' : avgConfidence >= 60 ? 'Medium' : 'Low'}
                </Badge>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Services Analyzed</p>
              <p className="text-2xl font-bold">{optimizations.length}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">High Confidence</p>
              <p className="text-2xl font-bold">{highConfidenceRecommendations.length}</p>
            </div>
          </div>
        )}

        {/* High Impact Recommendations */}
        {positiveImpactServices.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <h4 className="font-medium text-green-700 dark:text-green-400">
                High Impact Recommendations
              </h4>
            </div>
            <div className="space-y-3">
              {positiveImpactServices
                .sort((a, b) => b.expected_revenue_impact - a.expected_revenue_impact)
                .slice(0, 5)
                .map((optimization, index) => {
                  const priceChange = optimization.recommended_price - optimization.current_price
                  const priceChangePercent = ((priceChange / optimization.current_price) * 100)
                  
                  return (
                    <Card key={index} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="font-medium">{optimization.service_name}</h5>
                            <p className="text-sm text-muted-foreground">Service ID: {optimization.service_id}</p>
                          </div>
                          <Badge className={getConfidenceColor(optimization.confidence_score)}>
                            {optimization.confidence_score}% confidence
                          </Badge>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3 mb-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Current Price</p>
                            <p className="text-lg font-bold">{formatCurrency(optimization.current_price)}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Recommended Price</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-bold">{formatCurrency(optimization.recommended_price)}</p>
                              <Badge className={getImpactColor(priceChange)}>
                                {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Revenue Impact</p>
                            <div className="flex items-center gap-2">
                              <p className="text-lg font-bold text-green-600">
                                +{formatCurrency(optimization.expected_revenue_impact)}
                              </p>
                              <span className="text-xs text-muted-foreground">per month</span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <h6 className="text-xs font-medium text-muted-foreground mb-1">
                              MARKET INSIGHTS
                            </h6>
                            <ul className="space-y-1">
                              {optimization.market_insights.slice(0, 3).map((insight, insightIndex) => (
                                <li key={insightIndex} className="text-xs flex items-start gap-2">
                                  <BarChart3 className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                                  {insight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
            </div>
          </div>
        )}

        {/* All Services Overview */}
        {optimizations && optimizations.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Complete Service Analysis
            </h4>
            <div className="space-y-2">
              {optimizations.map((optimization, index) => {
                const priceChange = optimization.recommended_price - optimization.current_price
                const priceChangePercent = ((priceChange / optimization.current_price) * 100)
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <h5 className="font-medium text-sm">{optimization.service_name}</h5>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {formatCurrency(optimization.current_price)} → {formatCurrency(optimization.recommended_price)}
                          </span>
                          <Badge className={getImpactColor(priceChange)}>
                            {priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${optimization.expected_revenue_impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {optimization.expected_revenue_impact >= 0 ? '+' : ''}{formatCurrency(optimization.expected_revenue_impact)}
                        </span>
                        {getImpactIcon(optimization.expected_revenue_impact)}
                      </div>
                      <Badge className={getConfidenceColor(optimization.confidence_score)}>
                        {optimization.confidence_score}%
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Implementation Tips */}
        {optimizations && optimizations.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Implementation Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Start with high-confidence recommendations (≥80% confidence)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Test price changes gradually to monitor client response</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Communicate value clearly when raising prices</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Monitor booking patterns after price adjustments</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Consider grandfathering existing clients for loyalty</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        )}

        {/* No optimizations state */}
        {optimizations && optimizations.length === 0 && (
          <div className="text-center py-8">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No pricing optimizations available</p>
            <p className="text-sm text-muted-foreground">
              Requires sufficient booking and revenue data to generate recommendations
            </p>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="animate-pulse">
              <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Analyzing pricing opportunities...</p>
            </div>
          </div>
        )}

        {/* Model Info */}
        {metadata && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Analysis generated using {metadata.model_version} with {metadata.data_points_used} data points.
              Confidence score: {metadata.confidence_score}%. Recommendations based on market analysis, 
              demand patterns, and competitor pricing data.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}