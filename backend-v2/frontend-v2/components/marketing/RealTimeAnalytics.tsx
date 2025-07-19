'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  EyeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ChartBarIcon,
  WifiIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface RealTimeMetrics {
  last_24_hours: {
    total_conversions: number
    total_revenue: number
    conversion_rate: number
    average_order_value: number
  }
  integration_status: {
    status: string
    healthy_integrations: number
    total_integrations: number
  }
  active_campaigns: number
  recent_conversions: Array<{
    date: string
    conversions: number
    revenue: number
  }>
  updated_at: string
}

interface RealTimeAnalyticsProps {
  organizationId?: string
  refreshInterval?: number // milliseconds
}

export default function RealTimeAnalytics({ 
  organizationId, 
  refreshInterval = 30000 // 30 seconds default
}: RealTimeAnalyticsProps) {
  const [metrics, setMetrics] = useState<RealTimeMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const fetchRealTimeMetrics = async () => {
    try {
      const response = await fetch('/api/v1/marketing/analytics/realtime', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      setMetrics(data)
      setLastUpdate(new Date())
      setIsConnected(true)
      setError(null)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
      setIsConnected(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch
    fetchRealTimeMetrics()
    
    // Set up interval for real-time updates
    const interval = setInterval(fetchRealTimeMetrics, refreshInterval)
    
    // Cleanup on unmount
    return () => {
      clearInterval(interval)
    }
  }, [refreshInterval])

  const getConnectionStatusColor = () => {
    if (error) return 'text-red-500'
    return isConnected ? 'text-green-500' : 'text-yellow-500'
  }

  const getConnectionStatusText = () => {
    if (error) return 'Disconnected'
    return isConnected ? 'Connected' : 'Connecting...'
  }

  const getIntegrationStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800'
      case 'good':
        return 'bg-yellow-100 text-yellow-800'
      case 'needs_attention':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}s ago`
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}m ago`
    } else {
      return `${Math.floor(diffInSeconds / 3600)}h ago`
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" aria-hidden="true" />
            Real-Time Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8" role="status" aria-live="polite">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" aria-hidden="true"></div>
            <span className="sr-only">Loading real-time analytics data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" aria-hidden="true" />
            Real-Time Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8" role="alert" aria-live="assertive">
            <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-500 mb-4" aria-hidden="true" />
            <p className="text-red-600 mb-2">Connection Error</p>
            <p className="text-sm text-gray-600">{error || 'Failed to load real-time data'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" aria-hidden="true" />
            <h2 className="text-base font-semibold">Real-Time Analytics</h2>
          </div>
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <WifiIcon className={`w-4 h-4 ${getConnectionStatusColor()}`} aria-hidden="true" />
            <span className={`text-sm ${getConnectionStatusColor()}`} aria-label={`Connection status: ${getConnectionStatusText()}`}>
              {getConnectionStatusText()}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Last 24 Hours Summary */}
        <section aria-labelledby="last-24-hours-heading">
          <h3 id="last-24-hours-heading" className="text-sm font-medium text-gray-700 mb-3">Last 24 Hours</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center" role="group" aria-labelledby="conversions-label">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mx-auto mb-2" aria-hidden="true">
                <UserGroupIcon className="w-6 h-6 text-blue-600" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-gray-900" aria-describedby="conversions-label">{metrics.last_24_hours.total_conversions}</p>
              <p id="conversions-label" className="text-sm text-gray-600">Conversions</p>
            </div>
            
            <div className="text-center" role="group" aria-labelledby="revenue-label">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mx-auto mb-2" aria-hidden="true">
                <CurrencyDollarIcon className="w-6 h-6 text-green-600" aria-hidden="true" />
              </div>
              <p className="text-2xl font-bold text-gray-900" aria-describedby="revenue-label">${metrics.last_24_hours.total_revenue.toLocaleString()}</p>
              <p id="revenue-label" className="text-sm text-gray-600">Revenue</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2">
                <ChartBarIcon className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{metrics.last_24_hours.conversion_rate}%</p>
              <p className="text-sm text-gray-600">Conv. Rate</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mx-auto mb-2">
                <EyeIcon className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">${metrics.last_24_hours.average_order_value.toLocaleString()}</p>
              <p className="text-sm text-gray-600">Avg Order</p>
            </div>
          </div>
        </section>

        {/* Integration Status */}
        <section aria-labelledby="integration-status-heading">
          <h3 id="integration-status-heading" className="text-sm font-medium text-gray-700 mb-3">Integration Status</h3>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg" role="status" aria-live="polite">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {metrics.integration_status.status === 'excellent' || metrics.integration_status.status === 'good' ? (
                  <CheckCircleIcon className="w-5 h-5 text-green-500" aria-label="Integrations healthy" />
                ) : (
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" aria-label="Integrations need attention" />
                )}
                <span className="font-medium text-gray-900">
                  {metrics.integration_status.healthy_integrations} / {metrics.integration_status.total_integrations} Healthy
                </span>
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className={getIntegrationStatusColor(metrics.integration_status.status)}
            >
              {metrics.integration_status.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </section>

        {/* Active Campaigns */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">Campaign Activity</h3>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-gray-900">
                {metrics.active_campaigns} Active Campaigns
              </span>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              Live
            </Badge>
          </div>
        </div>

        {/* Recent Activity */}
        {metrics.recent_conversions.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Recent Activity</h3>
            <div className="space-y-2">
              {metrics.recent_conversions.map((conversion, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-900">
                      {conversion.conversions} conversions today
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    ${conversion.revenue.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Last Update */}
        <div className="text-center pt-4 border-t">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <ClockIcon className="w-4 h-4" />
            <span>
              Last updated: {lastUpdate ? formatTimeAgo(lastUpdate) : 'Never'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}