"use client"

/**
 * Intelligent Insights Card Component
 * 
 * A small, self-contained component that displays AI-powered business insights
 * designed to integrate seamlessly into existing dashboard layouts.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  Brain,
  Target,
  Zap
} from 'lucide-react'

interface PredictiveInsight {
  title: string
  description: string
  confidence: number
  impact_score: number
  category: string
  predicted_outcome: string
  recommended_actions: string[]
  time_horizon: string
}

interface IntelligentInsightsCardProps {
  userId?: number
  maxInsights?: number
  compact?: boolean
  className?: string
  onInsightClick?: (insight: PredictiveInsight) => void
}

const CATEGORY_ICONS = {
  revenue: TrendingUp,
  booking: Target,
  retention: CheckCircle,
  efficiency: Zap,
  growth: TrendingUp,
  default: Lightbulb
}

const CATEGORY_COLORS = {
  revenue: 'text-green-600 bg-green-50',
  booking: 'text-blue-600 bg-blue-50', 
  retention: 'text-purple-600 bg-purple-50',
  efficiency: 'text-orange-600 bg-orange-50',
  growth: 'text-indigo-600 bg-indigo-50',
  default: 'text-gray-600 bg-gray-50'
}

export function IntelligentInsightsCard({ 
  userId, 
  maxInsights = 5, 
  compact = false,
  className = "",
  onInsightClick 
}: IntelligentInsightsCardProps) {
  const [insights, setInsights] = useState<PredictiveInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchInsights = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)
      
      setError(null)
      
      const response = await fetch('/api/v2/analytics/intelligence/insights', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch insights: ${response.statusText}`)
      }

      const data = await response.json()
      setInsights(data.slice(0, maxInsights))
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load insights'
      setError(errorMessage)
      console.error('Failed to fetch intelligent insights:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchInsights()
  }, [maxInsights])

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-blue-600'
    if (confidence >= 0.4) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getImpactBadgeVariant = (impact: number) => {
    if (impact >= 8) return 'default' // High impact
    if (impact >= 6) return 'secondary' // Medium impact
    return 'outline' // Low impact
  }

  const formatConfidence = (confidence: number): string => {
    return `${Math.round(confidence * 100)}%`
  }

  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Intelligent Insights
            </CardTitle>
          </div>
          {!compact && (
            <CardDescription>
              AI-powered business insights and recommendations
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: maxInsights }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`${className}`}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Intelligent Insights
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                onClick={() => fetchInsights()} 
                variant="outline" 
                size="sm" 
                className="ml-4"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  if (insights.length === 0) {
    return (
      <Card className={`${className}`}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Intelligent Insights
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertDescription>
              Complete more appointments and business activities to unlock AI-powered insights.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Intelligent Insights
            </CardTitle>
          </div>
          <Button 
            onClick={() => fetchInsights(true)} 
            variant="ghost" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {!compact && (
          <CardDescription>
            AI-powered insights based on your business data
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => {
          const CategoryIcon = CATEGORY_ICONS[insight.category as keyof typeof CATEGORY_ICONS] || CATEGORY_ICONS.default
          const categoryColor = CATEGORY_COLORS[insight.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.default
          
          return (
            <div 
              key={index} 
              className={`border-l-4 border-blue-500 pl-4 space-y-2 ${
                onInsightClick ? 'cursor-pointer hover:bg-gray-50 rounded-r p-2' : ''
              }`}
              onClick={() => onInsightClick?.(insight)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={`p-1.5 rounded-full ${categoryColor}`}>
                    <CategoryIcon className="h-3 w-3" />
                  </div>
                  <h4 className={`font-semibold ${compact ? 'text-sm' : 'text-base'} truncate`}>
                    {insight.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={getImpactBadgeVariant(insight.impact_score)}>
                    Impact: {insight.impact_score.toFixed(1)}
                  </Badge>
                </div>
              </div>
              
              <p className={`text-muted-foreground ${compact ? 'text-sm' : 'text-base'}`}>
                {insight.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className={getConfidenceColor(insight.confidence)}>
                    {formatConfidence(insight.confidence)} confidence
                  </span>
                  <span>•</span>
                  <span>{insight.time_horizon}</span>
                  <span>•</span>
                  <span className="capitalize">{insight.category}</span>
                </div>
              </div>
              
              {!compact && insight.recommended_actions.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Top Recommendation:</p>
                  <p className="text-sm bg-blue-50 text-blue-700 p-2 rounded">
                    {insight.recommended_actions[0]}
                  </p>
                </div>
              )}
            </div>
          )
        })}
        
        {insights.length < maxInsights && (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">
              Complete more business activities to unlock additional insights
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}