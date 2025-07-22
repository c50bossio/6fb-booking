"use client"

/**
 * Retention Overview Widget
 * =========================
 * 
 * Compact retention metrics widget for inclusion in main dashboard
 * and other pages that need quick retention insights.
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  AlertTriangleIcon, 
  TrendingUpIcon, 
  TrendingDownIcon,
  DollarSignIcon,
  UsersIcon,
  ArrowRightIcon,
  RefreshCwIcon
} from 'lucide-react'
import Link from 'next/link'

interface RetentionOverviewData {
  clientsAtRisk: number
  retentionRate: number
  monthlyRecoveryRevenue: number
  activeInterventions: number
  churnPrevented: number
  riskTrend: 'up' | 'down' | 'stable'
  revenueTrend: 'up' | 'down' | 'stable'
  criticalClients: Array<{
    id: number
    name: string
    riskScore: number
    daysActive: number
  }>
}

interface RetentionOverviewWidgetProps {
  showDetails?: boolean
  compact?: boolean
  className?: string
}

const RetentionOverviewWidget: React.FC<RetentionOverviewWidgetProps> = ({ 
  showDetails = true, 
  compact = false,
  className = ""
}) => {
  const [data, setData] = useState<RetentionOverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadOverviewData()
  }, [])

  const loadOverviewData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      // In a real implementation, this would call the retention analytics API
      // For now, we'll use mock data that matches the expected structure
      
      await new Promise(resolve => setTimeout(resolve, 800)) // Simulate API call
      
      const mockData: RetentionOverviewData = {
        clientsAtRisk: 24,
        retentionRate: 0.73,
        monthlyRecoveryRevenue: 4250,
        activeInterventions: 12,
        churnPrevented: 18,
        riskTrend: 'down', // Risk is decreasing (good)
        revenueTrend: 'up', // Recovery revenue is increasing (good)
        criticalClients: [
          { id: 45, name: "John Smith", riskScore: 92, daysActive: 42 },
          { id: 67, name: "Sarah Johnson", riskScore: 88, daysActive: 35 },
          { id: 23, name: "Mike Chen", riskScore: 85, daysActive: 60 }
        ]
      }
      
      setData(mockData)
    } catch (err) {
      setError('Failed to load retention data')
      console.error('Error loading retention overview:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDownIcon className="h-4 w-4 text-red-600" />
      default:
        return <div className="h-4 w-4" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable', isGoodWhenUp: boolean = true) => {
    if (trend === 'stable') return 'text-muted-foreground'
    if ((trend === 'up' && isGoodWhenUp) || (trend === 'down' && !isGoodWhenUp)) {
      return 'text-green-600'
    }
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UsersIcon className="h-5 w-5 mr-2" />
            Client Retention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCwIcon className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UsersIcon className="h-5 w-5 mr-2" />
            Client Retention
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangleIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button onClick={loadOverviewData} size="sm" variant="outline" className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <UsersIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Retention</span>
              </div>
              <div className="text-2xl font-bold">{formatPercentage(data.retentionRate)}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">At Risk</div>
              <div className="flex items-center">
                <Badge variant={data.clientsAtRisk > 20 ? "destructive" : "secondary"}>
                  {data.clientsAtRisk}
                </Badge>
                {getTrendIcon(data.riskTrend)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <UsersIcon className="h-5 w-5 mr-2" />
            Client Retention Overview
          </div>
          <Button variant="ghost" size="sm" onClick={loadOverviewData}>
            <RefreshCwIcon className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          Six Figure Barber retention intelligence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Retention Rate</span>
              {getTrendIcon(data.revenueTrend)}
            </div>
            <div className="text-2xl font-bold">{formatPercentage(data.retentionRate)}</div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Clients at Risk</span>
              {getTrendIcon(data.riskTrend)}
            </div>
            <div className="text-2xl font-bold text-orange-600">{data.clientsAtRisk}</div>
          </div>
        </div>

        {/* Recovery Revenue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Monthly Recovery Revenue</span>
            <DollarSignIcon className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-xl font-bold text-green-600">
            {formatCurrency(data.monthlyRecoveryRevenue)}
          </div>
          <div className="text-xs text-muted-foreground">
            {data.churnPrevented} clients retained • {data.activeInterventions} active interventions
          </div>
        </div>

        {showDetails && (
          <>
            {/* Critical Clients */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Critical Clients</span>
                <Badge variant="destructive" className="text-xs">
                  High Risk
                </Badge>
              </div>
              <div className="space-y-2">
                {data.criticalClients.slice(0, 3).map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <div>
                      <div className="text-sm font-medium">{client.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {client.daysActive} days dormant
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {client.riskScore}% risk
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t">
              <div className="flex space-x-2">
                <Link href="/dashboard/retention" className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <ArrowRightIcon className="h-4 w-4 mr-2" />
                    View Full Dashboard
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    // Trigger win-back detection
                    console.log('Triggering win-back detection...')
                  }}
                >
                  <AlertTriangleIcon className="h-4 w-4 mr-2" />
                  Run Analysis
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default RetentionOverviewWidget