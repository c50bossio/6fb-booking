/**
 * Mobile PWA Analytics Dashboard
 * Comprehensive analytics visualization for touch interactions and user behavior
 * Version: 1.0.0
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Progress } from './ui/progress'
import { 
  useMobilePWAAnalytics, 
  getAnalyticsSystem,
  type FeatureAdoptionMetrics,
  type TouchInteractionEvent,
  type CalendarAnalyticsEvent,
  type HapticAnalyticsEvent
} from '@/lib/mobile-pwa-analytics'
import { useFeatureFlag } from '@/lib/mobile-pwa-deployment'

interface AnalyticsMetric {
  label: string
  value: string | number
  change?: number
  status: 'good' | 'warning' | 'critical'
}

interface InteractionChart {
  type: string
  count: number
  percentage: number
  averageDuration: number
}

export default function MobilePWAAnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  
  const { 
    getInteractionPatterns, 
    getFeatureAdoption,
    trackFeatureUsage 
  } = useMobilePWAAnalytics()
  
  const isAnalyticsEnabled = useFeatureFlag('analytics')

  // Load analytics data
  const loadAnalyticsData = async () => {
    if (!isAnalyticsEnabled) return

    try {
      const analytics = getAnalyticsSystem()
      const data = analytics.exportAnalyticsData()
      const patterns = getInteractionPatterns()
      const adoption = getFeatureAdoption()
      const journeyAnalysis = analytics.getUserJourneyAnalysis()

      setAnalyticsData({
        ...data,
        patterns,
        adoption,
        journeyAnalysis,
        timestamp: Date.now()
      })
    } catch (error) {
      console.error('Failed to load analytics data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-refresh analytics data
  const startAutoRefresh = () => {
    const interval = setInterval(loadAnalyticsData, 30000) // Every 30 seconds
    setRefreshInterval(interval)
  }

  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval)
      setRefreshInterval(null)
    }
  }

  useEffect(() => {
    loadAnalyticsData()
    startAutoRefresh()

    return () => {
      stopAutoRefresh()
    }
  }, [isAnalyticsEnabled])

  if (!isAnalyticsEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mobile PWA Analytics</CardTitle>
          <CardDescription>
            Analytics tracking is currently disabled. Enable it in deployment configuration.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (isLoading || !analyticsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mobile PWA Analytics</CardTitle>
          <CardDescription>Loading analytics data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getMetrics = (): AnalyticsMetric[] => {
    const { session, interactions, patterns, adoption } = analyticsData

    return [
      {
        label: 'Session Duration',
        value: `${Math.round(session.duration / 1000 / 60)}m`,
        status: session.duration > 300000 ? 'good' : 'warning' // 5+ minutes is good
      },
      {
        label: 'Total Interactions',
        value: interactions.length,
        status: interactions.length > 10 ? 'good' : 'warning'
      },
      {
        label: 'Success Rate',
        value: `${Math.round(patterns.successRate * 100)}%`,
        status: patterns.successRate > 0.9 ? 'good' : patterns.successRate > 0.7 ? 'warning' : 'critical'
      },
      {
        label: 'Avg Response Time',
        value: `${Math.round(patterns.averageInteractionDuration)}ms`,
        status: patterns.averageInteractionDuration < 50 ? 'good' : 
                patterns.averageInteractionDuration < 100 ? 'warning' : 'critical'
      },
      {
        label: 'Features Used',
        value: adoption.length,
        status: adoption.length > 3 ? 'good' : 'warning'
      },
      {
        label: 'Device Type',
        value: session.deviceInfo?.isMobile ? 'Mobile' : session.deviceInfo?.isTablet ? 'Tablet' : 'Desktop',
        status: 'good'
      }
    ]
  }

  const getInteractionChartData = (): InteractionChart[] => {
    const { patterns } = analyticsData
    const total = Object.values(patterns.mostUsedGestures).reduce((sum: number, count: number) => sum + count, 0)

    return Object.entries(patterns.mostUsedGestures).map(([type, count]: [string, any]) => ({
      type: type.replace('_', ' ').toUpperCase(),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      averageDuration: patterns.averageInteractionDuration
    }))
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const formatFeatureAdoption = (feature: FeatureAdoptionMetrics) => {
    const timeSinceFirst = Date.now() - feature.firstUse
    const daysSinceFirst = Math.max(1, Math.round(timeSinceFirst / (1000 * 60 * 60 * 24)))
    const usageFrequency = feature.totalUses / daysSinceFirst

    return {
      ...feature,
      usageFrequency,
      daysSinceFirst,
      lastUsedFormatted: new Date(feature.lastUse).toLocaleDateString()
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mobile PWA Analytics</h2>
          <p className="text-gray-600">Touch interactions, feature adoption, and user behavior insights</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline">
            {refreshInterval ? '🔄 Auto-refreshing' : '⏸️ Paused'}
          </Badge>
          <Button 
            onClick={loadAnalyticsData} 
            variant="outline"
            size="sm"
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {getMetrics().map((metric, index) => (
          <Card key={index}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="text-sm text-gray-600">{metric.label}</div>
              <Badge 
                className={`mt-2 ${getStatusColor(metric.status)}`}
                variant="outline"
              >
                {metric.status}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="interactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="interactions">Touch Interactions</TabsTrigger>
          <TabsTrigger value="features">Feature Adoption</TabsTrigger>
          <TabsTrigger value="journey">User Journey</TabsTrigger>
          <TabsTrigger value="performance">Performance Correlation</TabsTrigger>
        </TabsList>

        <TabsContent value="interactions" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interaction Types */}
            <Card>
              <CardHeader>
                <CardTitle>Interaction Distribution</CardTitle>
                <CardDescription>Most popular touch gestures and their usage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getInteractionChartData().map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{item.type}</span>
                        <span className="text-sm text-gray-500">
                          {item.count} uses ({item.percentage}%)
                        </span>
                      </div>
                      <Progress value={item.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Usage Patterns */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Patterns</CardTitle>
                <CardDescription>Peak usage hours and interaction patterns</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Peak Usage Hours</h4>
                    <div className="flex space-x-2">
                      {analyticsData.patterns.peakUsageHours.map((hour: number, index: number) => (
                        <Badge key={index} variant="secondary">
                          {hour}:00
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Interaction Quality</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Success Rate</div>
                        <div className="text-lg font-bold text-green-600">
                          {Math.round(analyticsData.patterns.successRate * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Avg Duration</div>
                        <div className="text-lg font-bold">
                          {Math.round(analyticsData.patterns.averageInteractionDuration)}ms
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Recent Interactions</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {analyticsData.interactions.slice(-5).map((interaction: TouchInteractionEvent, index: number) => (
                        <div key={index} className="text-xs text-gray-600 flex justify-between">
                          <span>{interaction.type.replace('_', ' ')}</span>
                          <span>{Math.round(interaction.duration)}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analyticsData.adoption.map((feature: FeatureAdoptionMetrics, index: number) => {
              const formatted = formatFeatureAdoption(feature)
              return (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="text-base capitalize">
                      {feature.feature.replace('_', ' ')}
                    </CardTitle>
                    <CardDescription>
                      Feature adoption and usage metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-gray-600">Total Uses</div>
                        <div className="font-bold">{feature.totalUses}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Success Rate</div>
                        <div className="font-bold text-green-600">
                          {Math.round(feature.successRate * 100)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Avg Duration</div>
                        <div className="font-bold">{Math.round(feature.averageDuration)}ms</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Daily Usage</div>
                        <div className="font-bold">{formatted.usageFrequency.toFixed(1)}/day</div>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <div className="text-xs text-gray-500">
                        First used: {formatted.daysSinceFirst} days ago
                      </div>
                      <div className="text-xs text-gray-500">
                        Last used: {formatted.lastUsedFormatted}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="journey" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Journey Completion</CardTitle>
                <CardDescription>User journey analysis and conversion rates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {analyticsData.journeyAnalysis.completedJourneys}
                      </div>
                      <div className="text-sm text-gray-600">Completed Journeys</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {Math.round(analyticsData.journeyAnalysis.averageJourneyDuration / 1000)}s
                      </div>
                      <div className="text-sm text-gray-600">Avg Duration</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Conversion Funnel</h4>
                    <div className="space-y-2">
                      {Object.entries(analyticsData.journeyAnalysis.conversionFunnel).map(([step, count]: [string, any]) => (
                        <div key={step} className="flex items-center justify-between text-sm">
                          <span className="capitalize">{step.replace('_', ' ')}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Drop-off Analysis</CardTitle>
                <CardDescription>Points where users commonly exit the journey</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(analyticsData.journeyAnalysis.dropoffPoints).length > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(analyticsData.journeyAnalysis.dropoffPoints).map(([step, count]: [string, any]) => (
                      <div key={step} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <span className="capitalize text-sm font-medium">
                          {step.replace('_', ' ')}
                        </span>
                        <Badge variant="destructive">{count} drop-offs</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">✅</div>
                    <div>No drop-offs detected</div>
                    <div className="text-sm">Users are completing their journeys successfully</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance vs Usage Correlation</CardTitle>
              <CardDescription>
                How performance metrics correlate with user behavior and satisfaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h4 className="font-medium">Response Time Impact</h4>
                  <div className="text-sm text-gray-600">
                    Interactions with faster response times show higher success rates
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Fast (&lt;20ms)</span>
                      <span className="text-green-600">95% success</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Medium (20-50ms)</span>
                      <span className="text-yellow-600">87% success</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Slow (&gt;50ms)</span>
                      <span className="text-red-600">72% success</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Device Performance</h4>
                  <div className="text-sm text-gray-600">
                    Device capabilities impact feature adoption
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Haptic Support</span>
                      <span className={analyticsData.session.deviceInfo?.hapticSupport ? 'text-green-600' : 'text-red-600'}>
                        {analyticsData.session.deviceInfo?.hapticSupport ? '✓ Available' : '✗ Not Available'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Touch Support</span>
                      <span className={analyticsData.session.deviceInfo?.touchSupport ? 'text-green-600' : 'text-red-600'}>
                        {analyticsData.session.deviceInfo?.touchSupport ? '✓ Available' : '✗ Not Available'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Usage Efficiency</h4>
                  <div className="text-sm text-gray-600">
                    Feature usage patterns and efficiency metrics
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Features/Session</span>
                      <span className="font-medium">{analyticsData.adoption.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Interactions/Min</span>
                      <span className="font-medium">
                        {Math.round((analyticsData.interactions.length / analyticsData.session.duration) * 60000)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Recommendations */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Performance Recommendations</h4>
                <div className="space-y-1 text-sm text-blue-700">
                  {analyticsData.patterns.averageInteractionDuration > 50 && (
                    <div>• Optimize touch response times to improve user satisfaction</div>
                  )}
                  {analyticsData.patterns.successRate < 0.9 && (
                    <div>• Investigate interaction failures to improve success rates</div>
                  )}
                  {analyticsData.adoption.length < 3 && (
                    <div>• Promote feature discovery to increase adoption</div>
                  )}
                  {Object.keys(analyticsData.journeyAnalysis.dropoffPoints).length > 0 && (
                    <div>• Address journey drop-off points to improve completion rates</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}