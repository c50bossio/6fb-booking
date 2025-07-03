'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Play, 
  BarChart3, 
  Shield, 
  Users, 
  CreditCard,
  Calendar,
  Eye,
  Zap
} from 'lucide-react'
import { useGA4 } from '@/components/providers/GA4Provider'
import { useGA4Tracking } from '@/hooks/useGA4Tracking'
import useCookieConsent from '@/hooks/useCookieConsent'

interface TestResult {
  name: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  message?: string
  duration?: number
  details?: any
}

interface TestSuiteProps {
  onTestComplete?: (results: TestResult[]) => void
}

export function GA4TestSuite({ onTestComplete }: TestSuiteProps) {
  const { analytics, isInitialized, hasConsent } = useGA4()
  const tracking = useGA4Tracking()
  const { preferences, updateConsent } = useCookieConsent()
  const [results, setResults] = useState<TestResult[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)

  const updateTestResult = (name: string, update: Partial<TestResult>) => {
    setResults(prev => {
      const existing = prev.find(r => r.name === name)
      if (existing) {
        return prev.map(r => r.name === name ? { ...r, ...update } : r)
      } else {
        return [...prev, { name, status: 'pending', ...update }]
      }
    })
  }

  const runTest = async (name: string, testFn: () => Promise<void>) => {
    setCurrentTest(name)
    updateTestResult(name, { status: 'running' })
    
    const startTime = Date.now()
    
    try {
      await testFn()
      const duration = Date.now() - startTime
      updateTestResult(name, { 
        status: 'passed', 
        message: 'Test passed successfully',
        duration 
      })
    } catch (error) {
      const duration = Date.now() - startTime
      updateTestResult(name, { 
        status: 'failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        duration 
      })
    }
    
    setCurrentTest(null)
  }

  const testGA4Initialization = async () => {
    if (!analytics) {
      throw new Error('GA4 analytics not available')
    }
    
    if (!isInitialized) {
      throw new Error('GA4 not initialized')
    }

    const debugInfo = analytics.getDebugInfo()
    updateTestResult('GA4 Initialization', { details: debugInfo })
  }

  const testConsentManagement = async () => {
    if (!hasConsent) {
      throw new Error('Analytics consent not granted')
    }

    // Test consent status
    const canTrack = tracking.canTrack
    if (!canTrack) {
      throw new Error('Tracking not enabled despite consent')
    }

    updateTestResult('Consent Management', { 
      details: { 
        hasConsent, 
        canTrack, 
        preferences: preferences.categories 
      } 
    })
  }

  const testPageTracking = async () => {
    if (!tracking.canTrack) {
      throw new Error('Cannot track - no consent or GA4 not ready')
    }

    // Test page view tracking
    const testPage = `test-page-${Date.now()}`
    await tracking.business.serviceViewed(
      `service-${Date.now()}`,
      'Test Service',
      {
        userRole: 'test_user',
        locationId: 'test_location'
      }
    )

    updateTestResult('Page Tracking', { 
      details: { 
        pageName: testPage,
        tracked: true 
      } 
    })
  }

  const testAppointmentEvents = async () => {
    if (!tracking.canTrack) {
      throw new Error('Cannot track - no consent or GA4 not ready')
    }

    const appointmentId = `test-appt-${Date.now()}`
    const barberId = `test-barber-${Date.now()}`
    const serviceName = 'Test Premium Haircut'
    const price = 75.00

    // Test appointment booking flow
    await tracking.appointment.booked(appointmentId, {
      barberId,
      serviceName,
      price,
      duration: 60,
      userRole: 'customer',
      locationId: 'test_location'
    })

    // Small delay to ensure events are processed
    await new Promise(resolve => setTimeout(resolve, 100))

    await tracking.appointment.confirmed(appointmentId, barberId, 'customer', 'test_location')

    await new Promise(resolve => setTimeout(resolve, 100))

    await tracking.appointment.completed(appointmentId, {
      barberId,
      serviceName,
      actualDuration: 65,
      customerRating: 5.0,
      userRole: 'customer',
      locationId: 'test_location'
    })

    updateTestResult('Appointment Events', { 
      details: { 
        appointmentId,
        barberId,
        serviceName,
        eventsTracked: ['booked', 'confirmed', 'completed']
      } 
    })
  }

  const testPaymentEvents = async () => {
    if (!tracking.canTrack) {
      throw new Error('Cannot track - no consent or GA4 not ready')
    }

    const transactionId = `test-txn-${Date.now()}`
    const amount = 75.00
    const appointmentId = `test-appt-${Date.now()}`

    // Test payment flow
    await tracking.payment.started(transactionId, amount, {
      method: 'stripe',
      appointmentId,
      userRole: 'customer'
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    await tracking.payment.completed(transactionId, amount, {
      method: 'stripe',
      appointmentId,
      barberId: `test-barber-${Date.now()}`,
      serviceName: 'Test Service',
      userRole: 'customer'
    })

    updateTestResult('Payment Events', { 
      details: { 
        transactionId,
        amount,
        appointmentId,
        eventsTracked: ['started', 'completed']
      } 
    })
  }

  const testUserEvents = async () => {
    if (!tracking.canTrack) {
      throw new Error('Cannot track - no consent or GA4 not ready')
    }

    // Test user events
    await tracking.user.registered('customer', {
      method: 'email',
      source: 'organic',
      locationId: 'test_location'
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    await tracking.user.loggedIn('customer', 'email', 'test_location')

    const userId = `test-user-${Date.now()}`
    tracking.user.setProperties(userId, {
      role: 'customer',
      subscriptionTier: 'free',
      locationId: 'test_location'
    })

    updateTestResult('User Events', { 
      details: { 
        userId,
        eventsTracked: ['registered', 'loggedIn', 'setProperties']
      } 
    })
  }

  const testBusinessEvents = async () => {
    if (!tracking.canTrack) {
      throw new Error('Cannot track - no consent or GA4 not ready')
    }

    const serviceId = `test-service-${Date.now()}`
    const barberId = `test-barber-${Date.now()}`

    // Test business events
    await tracking.business.serviceViewed(serviceId, 'Test Service', {
      barberId,
      price: 50.00,
      userRole: 'customer',
      locationId: 'test_location'
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    await tracking.business.barberViewed(barberId, 'Test Barber', {
      locationId: 'test_location',
      userRole: 'customer'
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    await tracking.business.availabilityChecked(barberId, '2024-01-15', 5, 'customer')

    updateTestResult('Business Events', { 
      details: { 
        serviceId,
        barberId,
        eventsTracked: ['serviceViewed', 'barberViewed', 'availabilityChecked']
      } 
    })
  }

  const testConversionEvents = async () => {
    if (!tracking.canTrack) {
      throw new Error('Cannot track - no consent or GA4 not ready')
    }

    const barberId = `test-barber-${Date.now()}`
    const serviceName = 'Test Service'
    const appointmentId = `test-appt-${Date.now()}`

    // Test conversion tracking
    await tracking.conversion.appointmentBookingStarted(barberId, serviceName, 'customer')

    await new Promise(resolve => setTimeout(resolve, 100))

    await tracking.conversion.appointmentBookingCompleted(
      appointmentId, 
      75.00, 
      barberId, 
      serviceName, 
      'customer'
    )

    updateTestResult('Conversion Events', { 
      details: { 
        barberId,
        serviceName,
        appointmentId,
        eventsTracked: ['bookingStarted', 'bookingCompleted']
      } 
    })
  }

  const testErrorHandling = async () => {
    if (!tracking.canTrack) {
      throw new Error('Cannot track - no consent or GA4 not ready')
    }

    // Test error tracking
    await tracking.system.error('test_error', 'This is a test error', {
      component: 'GA4TestSuite',
      test: true
    })

    await new Promise(resolve => setTimeout(resolve, 100))

    await tracking.system.performanceIssue('page_load_time', 5000, 3000)

    await new Promise(resolve => setTimeout(resolve, 100))

    await tracking.system.featureUsed('ga4_test_suite', 'test_user', {
      testRun: true
    })

    updateTestResult('Error Handling', { 
      details: { 
        eventsTracked: ['error', 'performanceIssue', 'featureUsed']
      } 
    })
  }

  const runAllTests = async () => {
    setIsRunning(true)
    setResults([])

    const tests = [
      { name: 'GA4 Initialization', fn: testGA4Initialization },
      { name: 'Consent Management', fn: testConsentManagement },
      { name: 'Page Tracking', fn: testPageTracking },
      { name: 'Appointment Events', fn: testAppointmentEvents },
      { name: 'Payment Events', fn: testPaymentEvents },
      { name: 'User Events', fn: testUserEvents },
      { name: 'Business Events', fn: testBusinessEvents },
      { name: 'Conversion Events', fn: testConversionEvents },
      { name: 'Error Handling', fn: testErrorHandling }
    ]

    for (const test of tests) {
      await runTest(test.name, test.fn)
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    setIsRunning(false)
    
    if (onTestComplete) {
      onTestComplete(results)
    }
  }

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status: TestResult['status']) => {
    const variants = {
      passed: 'default',
      failed: 'destructive',
      running: 'secondary',
      pending: 'outline'
    } as const

    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const passedTests = results.filter(r => r.status === 'passed').length
  const failedTests = results.filter(r => r.status === 'failed').length
  const totalTests = results.length

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            GA4 Analytics Integration Test Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">GA4 Status</span>
                </div>
                <div className="mt-1">
                  <Badge variant={isInitialized ? 'default' : 'destructive'}>
                    {isInitialized ? 'Initialized' : 'Not Initialized'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Consent Status</span>
                </div>
                <div className="mt-1">
                  <Badge variant={hasConsent ? 'default' : 'destructive'}>
                    {hasConsent ? 'Granted' : 'Not Granted'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Can Track</span>
                </div>
                <div className="mt-1">
                  <Badge variant={tracking.canTrack ? 'default' : 'destructive'}>
                    {tracking.canTrack ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {!hasConsent && (
            <Alert className="mb-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Analytics consent is required to run tests. Please accept analytics cookies to proceed.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 mb-4">
            <Button 
              onClick={runAllTests} 
              disabled={isRunning || !hasConsent}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isRunning ? 'Running Tests...' : 'Run All Tests'}
            </Button>
            
            {!hasConsent && (
              <Button 
                variant="outline" 
                onClick={() => updateConsent({ analytics: true })}
              >
                Enable Analytics
              </Button>
            )}
          </div>

          {totalTests > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>Test Progress</span>
                <span>{passedTests + failedTests} / {totalTests}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${totalTests > 0 ? ((passedTests + failedTests) / totalTests) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-xs">
                <span className="text-green-600">{passedTests} passed</span>
                <span className="text-red-600">{failedTests} failed</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Tabs defaultValue="results" className="w-full">
          <TabsList>
            <TabsTrigger value="results">Test Results</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="results" className="space-y-2">
            {results.map((result, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(result.status)}
                      <span className="font-medium">{result.name}</span>
                      {currentTest === result.name && (
                        <Badge variant="secondary" className="animate-pulse">
                          Running...
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {result.duration && (
                        <span className="text-xs text-muted-foreground">
                          {result.duration}ms
                        </span>
                      )}
                      {getStatusBadge(result.status)}
                    </div>
                  </div>
                  {result.message && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {result.message}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {results.filter(r => r.details).map((result, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-base">{result.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                    {JSON.stringify(result.details, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      {tracking.debugInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-3 rounded overflow-auto">
              {JSON.stringify(tracking.debugInfo, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default GA4TestSuite