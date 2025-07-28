/**
 * Mobile PWA Monitoring Dashboard
 * Real-time performance monitoring and alerting interface
 * Version: 1.0.0
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Switch } from './ui/switch'
import { usePerformanceMonitoring, getMonitoringSystem } from '@/lib/mobile-pwa-monitoring'
import { useFeatureFlag } from '@/lib/mobile-pwa-deployment'

interface MetricDisplayProps {
  name: string
  value: number
  unit: string
  status: 'good' | 'warning' | 'critical'
  threshold?: number
}

interface AlertItemProps {
  alert: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
}

const MetricDisplay: React.FC<MetricDisplayProps> = ({ name, value, unit, status, threshold }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'critical': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'good': return '✅'
      case 'warning': return '⚠️'
      case 'critical': return '🚨'
      default: return '📊'
    }
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{name}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">{value.toFixed(1)}</span>
            <span className="text-sm text-gray-500">{unit}</span>
          </div>
          <Badge className={getStatusColor(status)}>
            {getStatusIcon(status)} {status}
          </Badge>
        </div>
        {threshold && (
          <div className="text-xs text-gray-400 mt-1">
            Threshold: {threshold}{unit}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const AlertItem: React.FC<AlertItemProps> = ({ alert, severity, timestamp }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'border-blue-200 bg-blue-50'
      case 'medium': return 'border-yellow-200 bg-yellow-50'
      case 'high': return 'border-orange-200 bg-orange-50'
      case 'critical': return 'border-red-200 bg-red-50'
      default: return 'border-gray-200 bg-gray-50'
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  return (
    <div className={`p-3 rounded-lg border ${getSeverityColor(severity)} mb-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Badge variant={severity === 'critical' ? 'destructive' : 'secondary'}>
            {severity.toUpperCase()}
          </Badge>
          <span className="text-sm font-medium">{alert}</span>
        </div>
        <span className="text-xs text-gray-500">{formatTime(timestamp)}</span>
      </div>
    </div>
  )
}

export default function MobilePWAMonitoringDashboard() {
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [alertHistory, setAlertHistory] = useState<AlertItemProps[]>([])
  
  const { getHealthStatus } = usePerformanceMonitoring()
  const isMonitoringEnabled = useFeatureFlag('performance-monitoring')

  // Real-time health status updates
  const updateHealthStatus = useCallback(() => {
    if (!isMonitoringEnabled) return
    
    try {
      const status = getHealthStatus()
      setHealthStatus(status)
      
      // Add new alerts to history
      status.alerts.forEach(alert => {
        const alertItem: AlertItemProps = {
          alert,
          severity: 'medium', // Default severity, could be enhanced
          timestamp: Date.now()
        }
        
        setAlertHistory(prev => {
          const exists = prev.some(a => a.alert === alert && Date.now() - a.timestamp < 60000)
          if (!exists) {
            return [alertItem, ...prev.slice(0, 9)] // Keep last 10 alerts
          }
          return prev
        })
      })
    } catch (error) {
      console.error('Failed to update health status:', error)
    }
  }, [getHealthStatus, isMonitoringEnabled])

  // Start/stop auto-refresh
  const toggleAutoRefresh = (enabled: boolean) => {
    if (enabled) {
      setRefreshInterval(setInterval(updateHealthStatus, 5000)) // Every 5 seconds
      updateHealthStatus() // Initial update
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }
  }

  // Manual refresh
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    await new Promise(resolve => setTimeout(resolve, 500)) // Small delay for UX
    updateHealthStatus()
    setIsRefreshing(false)
  }

  // Initialize dashboard
  useEffect(() => {
    if (isMonitoringEnabled) {
      updateHealthStatus()
      toggleAutoRefresh(true)
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [isMonitoringEnabled, updateHealthStatus])

  if (!isMonitoringEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mobile PWA Monitoring</CardTitle>
          <CardDescription>
            Performance monitoring is currently disabled. Enable it in deployment configuration.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!healthStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mobile PWA Monitoring</CardTitle>
          <CardDescription>Loading monitoring data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getMetricStatus = (metricName: string, value: number): 'good' | 'warning' | 'critical' => {
    const monitoring = getMonitoringSystem()
    const config = monitoring['config'] // Access private config for thresholds
    
    // Define status based on common thresholds
    switch (metricName) {
      case 'frame_rate':
        return value >= 55 ? 'good' : value >= 45 ? 'warning' : 'critical'
      case 'touch_response_time':
        return value <= 20 ? 'good' : value <= 50 ? 'warning' : 'critical'
      case 'memory_usage':
        return value <= 50 ? 'good' : value <= 100 ? 'warning' : 'critical'
      case 'battery_drain_rate':
        return value <= 2 ? 'good' : value <= 5 ? 'warning' : 'critical'
      case 'haptic_failure_rate':
        return value <= 0.01 ? 'good' : value <= 0.05 ? 'warning' : 'critical'
      case 'gesture_error_rate':
        return value <= 0.05 ? 'good' : value <= 0.1 ? 'warning' : 'critical'
      default:
        return 'good'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mobile PWA Monitoring</h2>
          <p className="text-gray-600">Real-time performance and health monitoring</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm">Auto-refresh</span>
            <Switch 
              checked={refreshInterval !== null} 
              onCheckedChange={toggleAutoRefresh}
            />
          </div>
          <Button 
            onClick={handleManualRefresh} 
            disabled={isRefreshing}
            variant="outline"
          >
            {isRefreshing ? '🔄' : '🔄'} Refresh
          </Button>
        </div>
      </div>

      {/* Overall Status */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">System Status</h3>
              <p className="text-sm text-gray-600">
                Last updated: {new Date(healthStatus.lastUpdate).toLocaleTimeString()}
              </p>
            </div>
            <Badge className={`${getOverallStatusColor(healthStatus.status)} px-4 py-2 text-lg`}>
              {healthStatus.status.toUpperCase()}
            </Badge>
          </div>
          
          {healthStatus.alerts.length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Active Alerts ({healthStatus.alerts.length})</h4>
              <div className="space-y-1">
                {healthStatus.alerts.slice(0, 3).map((alert, index) => (
                  <div key={index} className="text-sm text-red-700">• {alert}</div>
                ))}
                {healthStatus.alerts.length > 3 && (
                  <div className="text-sm text-red-600">... and {healthStatus.alerts.length - 3} more</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alert History</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(healthStatus.metrics).map(([name, value]) => (
              <MetricDisplay
                key={name}
                name={name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                value={value}
                unit={name.includes('time') ? 'ms' : 
                      name.includes('rate') ? '%' : 
                      name.includes('usage') ? 'MB' : 
                      name.includes('fps') || name.includes('frame') ? 'fps' : ''}
                status={getMetricStatus(name, value)}
                threshold={name === 'frame_rate' ? 45 : 
                          name === 'touch_response_time' ? 50 :
                          name === 'memory_usage' ? 100 : undefined}
              />
            ))}
          </div>

          {/* Performance Charts Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Historical performance data over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                📈 Performance charts will be implemented in future version
                <br />
                <span className="text-sm mt-2">
                  Integration with charting library (Chart.js, Recharts, etc.)
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>
                Alert history and system notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertHistory.length > 0 ? (
                <div className="space-y-2">
                  {alertHistory.map((alert, index) => (
                    <AlertItem key={index} {...alert} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✅</div>
                  <div>No alerts in the last hour</div>
                  <div className="text-sm">System is operating normally</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring Configuration</CardTitle>
              <CardDescription>
                Adjust monitoring settings and alert thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Alert Thresholds</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Touch Response Time (ms)</label>
                      <input 
                        type="number" 
                        defaultValue={50} 
                        className="w-full px-3 py-2 border rounded-md"
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Frame Rate (fps)</label>
                      <input 
                        type="number" 
                        defaultValue={45} 
                        className="w-full px-3 py-2 border rounded-md"
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Memory Usage (MB)</label>
                      <input 
                        type="number" 
                        defaultValue={100} 
                        className="w-full px-3 py-2 border rounded-md"
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Error Rate (%)</label>
                      <input 
                        type="number" 
                        defaultValue={5} 
                        step="0.1"
                        className="w-full px-3 py-2 border rounded-md"
                        disabled
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Configuration editing will be implemented in future version
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Data Collection</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Performance Monitoring</span>
                      <Switch checked={true} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Error Tracking</span>
                      <Switch checked={true} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Battery Monitoring</span>
                      <Switch checked={true} disabled />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Frame Rate Monitoring</span>
                      <Switch checked={true} disabled />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Sample Rate</h4>
                  <div className="flex items-center space-x-4">
                    <input 
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.1" 
                      defaultValue={0.1}
                      className="flex-1"
                      disabled
                    />
                    <span className="text-sm w-12">10%</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Percentage of events to sample for performance monitoring
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}