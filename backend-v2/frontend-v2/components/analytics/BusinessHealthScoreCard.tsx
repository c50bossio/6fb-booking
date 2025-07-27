"use client"

/**
 * Business Health Score Card Component
 * 
 * A compact, self-contained component that displays AI-powered business health scoring
 * designed to integrate seamlessly into existing dashboard layouts.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Zap
} from 'lucide-react'

interface BusinessHealthScore {
  overall_score: number
  level: string
  components: Record<string, number>
  trends: Record<string, string>
  risk_factors: string[]
  opportunities: string[]
}

interface BusinessHealthScoreCardProps {
  userId?: number
  daysBack?: number
  compact?: boolean
  showComponents?: boolean
  className?: string
  onScoreClick?: (score: BusinessHealthScore) => void
}

const HEALTH_LEVELS = {
  critical: { color: 'text-red-600', bgColor: 'bg-red-50', icon: AlertTriangle, label: 'Critical' },
  warning: { color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: Shield, label: 'Warning' },
  good: { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: CheckCircle, label: 'Good' },
  excellent: { color: 'text-green-600', bgColor: 'bg-green-50', icon: Zap, label: 'Excellent' }
}

const COMPONENT_NAMES = {
  revenue_performance: 'Revenue',
  client_retention: 'Retention',
  booking_efficiency: 'Booking',
  service_quality: 'Quality',
  growth_momentum: 'Growth',
  operational_efficiency: 'Efficiency'
}

export function BusinessHealthScoreCard({ 
  userId, 
  daysBack = 30,
  compact = false,
  showComponents = true,
  className = "",
  onScoreClick 
}: BusinessHealthScoreCardProps) {
  const [healthScore, setHealthScore] = useState<BusinessHealthScore | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchHealthScore = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)
      
      setError(null)
      
      const response = await fetch(`/api/v2/analytics/intelligence/health-score?days_back=${daysBack}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch health score: ${response.statusText}`)
      }

      const data = await response.json()
      setHealthScore(data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load health score'
      setError(errorMessage)
      console.error('Failed to fetch business health score:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchHealthScore()
  }, [daysBack])

  const getHealthLevelInfo = (level: string) => {
    return HEALTH_LEVELS[level as keyof typeof HEALTH_LEVELS] || HEALTH_LEVELS.warning
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return TrendingUp
      case 'declining': return TrendingDown
      default: return Target
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving': return 'text-green-600'
      case 'declining': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Business Health Score
            </CardTitle>
          </div>
          {!compact && (
            <CardDescription>
              AI-powered assessment of business performance
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-3">
            <Skeleton className="h-12 w-20 mx-auto" />
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-6 w-24 mx-auto" />
          </div>
          {showComponents && (
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={`${className}`}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Business Health Score
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                onClick={() => fetchHealthScore()} 
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

  if (!healthScore) {
    return (
      <Card className={`${className}`}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Business Health Score
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>
              Complete more business activities to generate your health score.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const healthInfo = getHealthLevelInfo(healthScore.level)
  const HealthIcon = healthInfo.icon

  return (
    <Card className={`${className} ${onScoreClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Business Health Score
            </CardTitle>
          </div>
          <Button 
            onClick={() => fetchHealthScore(true)} 
            variant="ghost" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {!compact && (
          <CardDescription>
            {daysBack}-day AI assessment of business performance
          </CardDescription>
        )}
      </CardHeader>
      <CardContent 
        className="space-y-4"
        onClick={() => onScoreClick?.(healthScore)}
      >
        {/* Main Score Display */}
        <div className="text-center space-y-3">
          <div className={`text-4xl font-bold ${healthInfo.color}`}>
            {Math.round(healthScore.overall_score)}
            <span className="text-lg text-muted-foreground">/100</span>
          </div>
          <Progress value={healthScore.overall_score} className="w-full h-3" />
          <div className="flex items-center justify-center gap-2">
            <div className={`p-1.5 rounded-full ${healthInfo.bgColor}`}>
              <HealthIcon className={`h-4 w-4 ${healthInfo.color}`} />
            </div>
            <Badge variant={
              healthScore.level === 'excellent' ? 'default' :
              healthScore.level === 'good' ? 'secondary' :
              healthScore.level === 'warning' ? 'outline' : 'destructive'
            }>
              {healthInfo.label}
            </Badge>
          </div>
        </div>

        {/* Component Scores */}
        {showComponents && healthScore.components && Object.keys(healthScore.components).length > 0 && (
          <div className={`space-y-2 ${compact ? 'text-sm' : ''}`}>
            <h4 className="font-medium text-muted-foreground">Component Scores</h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(healthScore.components).map(([key, value]) => {
                const trend = healthScore.trends[key] || 'stable'
                const TrendIcon = getTrendIcon(trend)
                const trendColor = getTrendColor(trend)
                
                return (
                  <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium truncate">
                        {COMPONENT_NAMES[key as keyof typeof COMPONENT_NAMES] || key}
                      </span>
                      <TrendIcon className={`h-3 w-3 ${trendColor}`} />
                    </div>
                    <span className={`text-xs font-bold ${
                      value >= 80 ? 'text-green-600' :
                      value >= 70 ? 'text-blue-600' :
                      value >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {Math.round(value)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Risk Factors & Opportunities */}
        {!compact && (
          <div className="space-y-3">
            {healthScore.risk_factors.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-red-600">Top Risk</h4>
                <p className="text-sm text-muted-foreground bg-red-50 p-2 rounded">
                  {healthScore.risk_factors[0]}
                </p>
              </div>
            )}
            
            {healthScore.opportunities.length > 0 && (
              <div className="space-y-1">
                <h4 className="text-sm font-medium text-green-600">Top Opportunity</h4>
                <p className="text-sm text-muted-foreground bg-green-50 p-2 rounded">
                  {healthScore.opportunities[0]}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Score Interpretation */}
        <div className={`text-center ${compact ? 'text-xs' : 'text-sm'} text-muted-foreground`}>
          {healthScore.overall_score >= 90 && "🚀 Exceptional performance - you're on the Six Figure path!"}
          {healthScore.overall_score >= 80 && healthScore.overall_score < 90 && "✨ Excellent foundation - focus on optimization"}
          {healthScore.overall_score >= 70 && healthScore.overall_score < 80 && "📈 Good progress - identify key improvements"}
          {healthScore.overall_score >= 60 && healthScore.overall_score < 70 && "⚠️ Needs attention - focus on fundamentals"}
          {healthScore.overall_score < 60 && "🚨 Critical - immediate action required"}
        </div>
      </CardContent>
    </Card>
  )
}