/**
 * Mobile PWA Monitoring Demo Page
 * Demonstrates real-time monitoring capabilities and system health
 * Version: 1.0.0
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MobilePWAMonitoringDashboard from '@/components/MobilePWAMonitoringDashboard'
import MobilePWAAnalyticsDashboard from '@/components/MobilePWAAnalyticsDashboard'
import { 
  usePerformanceMonitoring, 
  trackTouchPerformance, 
  trackGestureSuccess, 
  trackHapticFeedback,
  trackCalendarPerformance 
} from '@/lib/mobile-pwa-monitoring'
import { useHapticFeedback } from '@/lib/haptic-feedback-system'

export default function MobileMonitoringDemoPage() {
  const [demoMetrics, setDemoMetrics] = useState<any[]>([])
  const [testInProgress, setTestInProgress] = useState(false)
  
  const { recordMetric, recordGestureMetric, recordHapticMetric } = usePerformanceMonitoring()
  const { feedback } = useHapticFeedback()

  // Simulate various performance scenarios for demo
  const runPerformanceTest = async (testType: string) => {
    setTestInProgress(true)
    
    try {
      switch (testType) {
        case 'touch-response':
          await simulateTouchInteractions()
          break
        case 'haptic-feedback':
          await simulateHapticFeedback()
          break
        case 'gesture-recognition':
          await simulateGestureInteractions()
          break
        case 'memory-stress':
          await simulateMemoryUsage()
          break
        case 'frame-rate':
          await simulateFrameRateTest()
          break
        case 'error-simulation':
          await simulateErrors()
          break
      }
    } catch (error) {
      console.error('Test failed:', error)
    } finally {
      setTestInProgress(false)
    }
  }

  const simulateTouchInteractions = async () => {
    console.log('🖱️ Simulating touch interactions...')
    
    // Simulate various touch response times
    const responseTypes = [
      { name: 'Fast Touch', time: 12 },
      { name: 'Normal Touch', time: 25 },
      { name: 'Slow Touch', time: 45 },
      { name: 'Very Slow Touch', time: 80 }
    ]

    for (const type of responseTypes) {
      await new Promise(resolve => setTimeout(resolve, 500))
      trackTouchPerformance(type.name.toLowerCase().replace(' ', '_'), type.time)
      
      setDemoMetrics(prev => [...prev, {
        type: 'Touch Response',
        value: `${type.time}ms`,
        status: type.time < 30 ? 'good' : type.time < 50 ? 'warning' : 'critical',
        timestamp: Date.now()
      }])
    }
  }

  const simulateHapticFeedback = async () => {
    console.log('📳 Simulating haptic feedback...')
    
    const hapticPatterns = [
      { name: 'appointment_select', success: true },
      { name: 'drag_start', success: true },
      { name: 'booking_success', success: true },
      { name: 'error_pattern', success: false }
    ]

    for (const pattern of hapticPatterns) {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      if (pattern.success) {
        await feedback(pattern.name)
      }
      
      trackHapticFeedback(pattern.name, pattern.success)
      
      setDemoMetrics(prev => [...prev, {
        type: 'Haptic Feedback',
        value: pattern.name,
        status: pattern.success ? 'good' : 'critical',
        timestamp: Date.now()
      }])
    }
  }

  const simulateGestureInteractions = async () => {
    console.log('👆 Simulating gesture recognition...')
    
    const gestures = [
      { type: 'swipe_left', success: true },
      { type: 'double_tap', success: true },
      { type: 'long_press', success: false },
      { type: 'drag_drop', success: true }
    ]

    for (const gesture of gestures) {
      await new Promise(resolve => setTimeout(resolve, 600))
      
      trackGestureSuccess(gesture.type, gesture.success)
      
      setDemoMetrics(prev => [...prev, {
        type: 'Gesture Recognition',
        value: gesture.type.replace('_', ' '),
        status: gesture.success ? 'good' : 'warning',
        timestamp: Date.now()
      }])
    }
  }

  const simulateMemoryUsage = async () => {
    console.log('💾 Simulating memory usage...')
    
    // Create temporary arrays to simulate memory usage
    const memoryTest = []
    for (let i = 0; i < 5; i++) {
      const chunk = new Array(100000).fill(Math.random())
      memoryTest.push(chunk)
      
      // Record memory usage
      if ('memory' in performance) {
        const memoryInfo = (performance as any).memory
        const usedMB = Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024)
        
        recordMetric('memory_usage', usedMB, {
          test: 'memory_stress',
          iteration: i + 1
        })
        
        setDemoMetrics(prev => [...prev, {
          type: 'Memory Usage',
          value: `${usedMB}MB`,
          status: usedMB < 50 ? 'good' : usedMB < 100 ? 'warning' : 'critical',
          timestamp: Date.now()
        }])
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    // Clean up memory
    memoryTest.length = 0
  }

  const simulateFrameRateTest = async () => {
    console.log('🎬 Simulating frame rate test...')
    
    // Simulate different frame rates
    const frameRates = [60, 55, 45, 30, 15]
    
    for (const fps of frameRates) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      recordMetric('frame_rate', fps, {
        test: 'frame_rate_simulation'
      })
      
      setDemoMetrics(prev => [...prev, {
        type: 'Frame Rate',
        value: `${fps} FPS`,
        status: fps >= 55 ? 'good' : fps >= 45 ? 'warning' : 'critical',
        timestamp: Date.now()
      }])
    }
  }

  const simulateErrors = async () => {
    console.log('🚨 Simulating error conditions...')
    
    const errorTypes = [
      { type: 'JavaScript Error', severity: 'medium' },
      { type: 'Touch Response Timeout', severity: 'high' },
      { type: 'Haptic Failure', severity: 'low' },
      { type: 'Memory Leak', severity: 'critical' }
    ]

    for (const error of errorTypes) {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      recordMetric('error_count', 1, {
        errorType: error.type,
        severity: error.severity
      })
      
      setDemoMetrics(prev => [...prev, {
        type: 'Error Event',
        value: error.type,
        status: error.severity === 'critical' ? 'critical' : 
                error.severity === 'high' ? 'warning' : 'good',
        timestamp: Date.now()
      }])
    }
  }

  const clearDemoMetrics = () => {
    setDemoMetrics([])
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString()
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-100 text-green-800'
      case 'warning': return 'bg-yellow-100 text-yellow-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mobile PWA Monitoring Demo
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore the comprehensive monitoring and alerting system for Mobile PWA features. 
            Run performance tests, view real-time metrics, and experience the monitoring dashboard.
          </p>
        </div>

        <Tabs defaultValue="dashboard" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard">Live Monitoring</TabsTrigger>
            <TabsTrigger value="analytics">User Analytics</TabsTrigger>
            <TabsTrigger value="testing">Performance Testing</TabsTrigger>
            <TabsTrigger value="documentation">Documentation</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-4">
            <MobilePWAMonitoringDashboard />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <MobilePWAAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="testing" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance Test Controls */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Test Suite</CardTitle>
                  <CardDescription>
                    Run various performance tests to generate monitoring data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      onClick={() => runPerformanceTest('touch-response')}
                      disabled={testInProgress}
                      variant="outline"
                      className="justify-start"
                    >
                      🖱️ Touch Response Test
                    </Button>
                    <Button 
                      onClick={() => runPerformanceTest('haptic-feedback')}
                      disabled={testInProgress}
                      variant="outline"
                      className="justify-start"
                    >
                      📳 Haptic Feedback Test
                    </Button>
                    <Button 
                      onClick={() => runPerformanceTest('gesture-recognition')}
                      disabled={testInProgress}
                      variant="outline"
                      className="justify-start"
                    >
                      👆 Gesture Recognition Test
                    </Button>
                    <Button 
                      onClick={() => runPerformanceTest('memory-stress')}
                      disabled={testInProgress}
                      variant="outline"
                      className="justify-start"
                    >
                      💾 Memory Stress Test
                    </Button>
                    <Button 
                      onClick={() => runPerformanceTest('frame-rate')}
                      disabled={testInProgress}
                      variant="outline"
                      className="justify-start"
                    >
                      🎬 Frame Rate Test
                    </Button>
                    <Button 
                      onClick={() => runPerformanceTest('error-simulation')}
                      disabled={testInProgress}
                      variant="outline"
                      className="justify-start"
                    >
                      🚨 Error Simulation
                    </Button>
                  </div>
                  
                  {testInProgress && (
                    <div className="flex items-center justify-center p-4 bg-blue-50 rounded-lg">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                      <span className="text-blue-700">Running performance test...</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <Button 
                      onClick={clearDemoMetrics}
                      variant="outline"
                      size="sm"
                    >
                      Clear Results
                    </Button>
                    <Badge variant="secondary">
                      {demoMetrics.length} test results
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Test Results */}
              <Card>
                <CardHeader>
                  <CardTitle>Test Results</CardTitle>
                  <CardDescription>
                    Live results from performance tests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {demoMetrics.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {demoMetrics.slice().reverse().map((metric, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <div className="font-medium text-sm">{metric.type}</div>
                            <div className="text-xs text-gray-500">{metric.value}</div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusBadgeColor(metric.status)}>
                              {metric.status}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {formatTime(metric.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🧪</div>
                      <div>No test results yet</div>
                      <div className="text-sm">Run a performance test to see results</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="documentation" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monitoring Features</CardTitle>
                  <CardDescription>Comprehensive monitoring capabilities</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <div className="text-green-600 font-bold">✓</div>
                      <div>
                        <div className="font-medium">Real-time Performance Tracking</div>
                        <div className="text-sm text-gray-600">Monitor touch response times, frame rates, and memory usage</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-green-600 font-bold">✓</div>
                      <div>
                        <div className="font-medium">Haptic Feedback Monitoring</div>
                        <div className="text-sm text-gray-600">Track haptic pattern success rates and failure modes</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-green-600 font-bold">✓</div>
                      <div>
                        <div className="font-medium">Gesture Recognition Analytics</div>
                        <div className="text-sm text-gray-600">Monitor gesture success rates and interaction patterns</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-green-600 font-bold">✓</div>
                      <div>
                        <div className="font-medium">Alert System</div>
                        <div className="text-sm text-gray-600">Configurable thresholds with automatic notifications</div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="text-green-600 font-bold">✓</div>
                      <div>
                        <div className="font-medium">Battery Usage Tracking</div>
                        <div className="text-sm text-gray-600">Monitor battery drain from mobile features</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Thresholds</CardTitle>
                  <CardDescription>Monitoring alert thresholds and targets</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Touch Response Time</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-green-600">Good</span>
                          <span>&lt; 20ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Warning</span>
                          <span>20-50ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Critical</span>
                          <span>&gt; 50ms</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Frame Rate</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-green-600">Good</span>
                          <span>&gt; 55 FPS</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Warning</span>
                          <span>45-55 FPS</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Critical</span>
                          <span>&lt; 45 FPS</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Memory Usage</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-green-600">Good</span>
                          <span>&lt; 50MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Warning</span>
                          <span>50-100MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Critical</span>
                          <span>&gt; 100MB</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Error Rate</h4>
                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span className="text-green-600">Good</span>
                          <span>&lt; 1%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Warning</span>
                          <span>1-5%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-red-600">Critical</span>
                          <span>&gt; 5%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Integration Guide</CardTitle>
                <CardDescription>How to integrate monitoring into your components</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Basic Usage</h4>
                    <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
{`import { usePerformanceMonitoring } from '@/lib/mobile-pwa-monitoring'

function MyComponent() {
  const { recordMetric, recordGestureMetric } = usePerformanceMonitoring()
  
  const handleTouch = () => {
    const startTime = performance.now()
    // ... handle touch interaction
    const duration = performance.now() - startTime
    recordMetric('touch_response_time', duration)
  }
  
  return <button onTouchStart={handleTouch}>Touch me</button>
}`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Convenience Functions</h4>
                    <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
{`import { 
  trackTouchPerformance, 
  trackGestureSuccess, 
  trackHapticFeedback 
} from '@/lib/mobile-pwa-monitoring'

// Track touch performance
trackTouchPerformance('button_click', 25)

// Track gesture success
trackGestureSuccess('swipe_left', true)

// Track haptic feedback
trackHapticFeedback('appointment_select', true)`}
                    </pre>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}