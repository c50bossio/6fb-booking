"use client"

/**
 * Smart Alerts Widget Component
 * 
 * A notification widget that displays intelligent business alerts
 * designed to integrate seamlessly into existing dashboard layouts.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bell, 
  AlertTriangle, 
  AlertCircle,
  Info,
  CheckCircle,
  RefreshCw,
  X,
  TrendingDown,
  TrendingUp,
  Activity,
  Target
} from 'lucide-react'

interface SmartAlert {
  title: string
  message: string
  priority: string
  category: string
  metric_name: string
  current_value: number
  threshold_value: number
  trend: string
  suggested_actions: string[]
  expires_at: string
}

interface SmartAlertsWidgetProps {
  userId?: number
  maxAlerts?: number
  compact?: boolean
  showActions?: boolean
  className?: string
  onAlertClick?: (alert: SmartAlert) => void
  onAlertDismiss?: (alert: SmartAlert) => void
}

const PRIORITY_CONFIG = {
  critical: { 
    icon: AlertTriangle, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50 border-red-200', 
    badgeVariant: 'destructive' as const,
    label: 'Critical'
  },
  high: { 
    icon: AlertCircle, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50 border-orange-200', 
    badgeVariant: 'default' as const,
    label: 'High'
  },
  medium: { 
    icon: Info, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50 border-blue-200', 
    badgeVariant: 'secondary' as const,
    label: 'Medium'
  },
  low: { 
    icon: CheckCircle, 
    color: 'text-green-600', 
    bgColor: 'bg-green-50 border-green-200', 
    badgeVariant: 'outline' as const,
    label: 'Low'
  }
}

const TREND_ICONS = {
  declining: TrendingDown,
  improving: TrendingUp,
  stable: Target,
  unknown: Activity
}

export function SmartAlertsWidget({ 
  userId, 
  maxAlerts = 5,
  compact = false,
  showActions = true,
  className = "",
  onAlertClick,
  onAlertDismiss
}: SmartAlertsWidgetProps) {
  const [alerts, setAlerts] = useState<SmartAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())

  const fetchAlerts = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true)
      else setLoading(true)
      
      setError(null)
      
      const response = await fetch('/api/v2/analytics/intelligence/alerts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`)
      }

      const data = await response.json()
      // Filter out dismissed alerts and limit to maxAlerts
      const filteredAlerts = data
        .filter((alert: SmartAlert) => !dismissedAlerts.has(alert.title))
        .slice(0, maxAlerts)
      
      setAlerts(filteredAlerts)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load alerts'
      setError(errorMessage)
      console.error('Failed to fetch smart alerts:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAlerts()
    
    // Auto-refresh alerts every 5 minutes
    const interval = setInterval(() => {
      fetchAlerts(true)
    }, 300000)
    
    return () => clearInterval(interval)
  }, [maxAlerts, dismissedAlerts])

  const handleDismissAlert = (alert: SmartAlert) => {
    const newDismissed = new Set(dismissedAlerts)
    newDismissed.add(alert.title)
    setDismissedAlerts(newDismissed)
    setAlerts(alerts.filter(a => a.title !== alert.title))
    onAlertDismiss?.(alert)
  }

  const formatValue = (value: number, metricName: string): string => {
    if (metricName.includes('rate') || metricName.includes('percentage')) {
      return `${value.toFixed(1)}%`
    }
    if (metricName.includes('revenue') || metricName.includes('amount')) {
      return `$${value.toFixed(2)}`
    }
    return value.toFixed(1)
  }

  const getTimeSinceExpiry = (expiresAt: string): string => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    
    if (diff < 0) return 'Expired'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }

  if (loading) {
    return (
      <Card className={`${className}`}>
        <CardHeader className={compact ? "pb-2" : ""}>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Smart Alerts
            </CardTitle>
          </div>
          {!compact && (
            <CardDescription>
              AI-powered business alerts and notifications
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: maxAlerts }).map((_, i) => (
            <div key={i} className="p-3 border rounded space-y-2">
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
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Smart Alerts
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <Button 
                onClick={() => fetchAlerts()} 
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

  const activeAlerts = alerts.filter(alert => new Date(alert.expires_at) > new Date())
  const criticalCount = activeAlerts.filter(alert => alert.priority === 'critical').length
  const highCount = activeAlerts.filter(alert => alert.priority === 'high').length

  return (
    <Card className={`${className}`}>
      <CardHeader className={compact ? "pb-2" : ""}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Bell className="h-5 w-5 text-blue-600" />
              {activeAlerts.length > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {activeAlerts.length}
                </div>
              )}
            </div>
            <CardTitle className={compact ? "text-lg" : "text-xl"}>
              Smart Alerts
            </CardTitle>
            {(criticalCount > 0 || highCount > 0) && (
              <div className="flex gap-1">
                {criticalCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {criticalCount} Critical
                  </Badge>
                )}
                {highCount > 0 && (
                  <Badge variant="default" className="text-xs">
                    {highCount} High
                  </Badge>
                )}
              </div>
            )}
          </div>
          <Button 
            onClick={() => fetchAlerts(true)} 
            variant="ghost" 
            size="sm"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {!compact && (
          <CardDescription>
            Real-time business performance alerts
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {activeAlerts.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              ✨ All clear! No active alerts at this time.
            </AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className={compact ? "h-64" : "h-80"}>
            <div className="space-y-3">
              {activeAlerts.map((alert, index) => {
                const priorityConfig = PRIORITY_CONFIG[alert.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium
                const PriorityIcon = priorityConfig.icon
                const TrendIcon = TREND_ICONS[alert.trend as keyof typeof TREND_ICONS] || TREND_ICONS.unknown
                
                return (
                  <div 
                    key={index}
                    className={`border-2 rounded-lg p-3 space-y-2 ${priorityConfig.bgColor} ${
                      onAlertClick ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''
                    }`}
                    onClick={() => onAlertClick?.(alert)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <PriorityIcon className={`h-4 w-4 ${priorityConfig.color} flex-shrink-0`} />
                        <h4 className={`font-semibold ${compact ? 'text-sm' : 'text-base'} truncate`}>
                          {alert.title}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={priorityConfig.badgeVariant} className="text-xs">
                          {priorityConfig.label}
                        </Badge>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDismissAlert(alert)
                          }}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <p className={`text-muted-foreground ${compact ? 'text-sm' : 'text-base'}`}>
                      {alert.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="capitalize">{alert.category}</span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <TrendIcon className="h-3 w-3" />
                          <span>{formatValue(alert.current_value, alert.metric_name)}</span>
                        </div>
                        <span>•</span>
                        <span>Expires in {getTimeSinceExpiry(alert.expires_at)}</span>
                      </div>
                    </div>
                    
                    {showActions && !compact && alert.suggested_actions.length > 0 && (
                      <div className="mt-2 p-2 bg-white/50 rounded">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          Suggested Action:
                        </p>
                        <p className="text-sm">
                          {alert.suggested_actions[0]}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
        
        {activeAlerts.length > 0 && !compact && (
          <div className="mt-3 pt-3 border-t text-center">
            <p className="text-xs text-muted-foreground">
              💡 Click alerts for detailed recommendations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}