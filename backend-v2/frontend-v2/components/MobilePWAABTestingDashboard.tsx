/**
 * Mobile PWA A/B Testing Dashboard
 * Manage and visualize A/B tests for mobile features
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
  getABTestingFramework, 
  useABTest,
  type ABTest,
  type ABTestVariant 
} from '@/lib/mobile-pwa-ab-testing'

interface TestResultProps {
  test: ABTest
  results: any
}

const TestResultCard: React.FC<TestResultProps> = ({ test, results }) => {
  const getVariantStatusColor = (improvement: number, confidence: number) => {
    if (confidence < 0.8) return 'text-gray-600 bg-gray-50'
    if (improvement > 5) return 'text-green-600 bg-green-50'
    if (improvement < -5) return 'text-red-600 bg-red-50'
    return 'text-yellow-600 bg-yellow-50'
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.95) return 'High'
    if (confidence >= 0.8) return 'Medium'
    if (confidence >= 0.6) return 'Low'
    return 'Insufficient'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{test.name}</CardTitle>
          <div className="flex items-center space-x-2">
            <Badge variant={test.status === 'running' ? 'default' : 'secondary'}>
              {test.status}
            </Badge>
            {results.winner && (
              <Badge className="bg-green-100 text-green-800">
                Winner: {results.variants.find((v: any) => v.variant.id === results.winner)?.variant.name}
              </Badge>
            )}
          </div>
        </div>
        <CardDescription>{test.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Test Overview */}
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium">Target Metric</div>
              <div className="text-gray-600">{test.targetMetric}</div>
            </div>
            <div>
              <div className="font-medium">Confidence</div>
              <div className="text-gray-600">
                {Math.round(results.confidence * 100)}% ({getConfidenceLabel(results.confidence)})
              </div>
            </div>
            <div>
              <div className="font-medium">Duration</div>
              <div className="text-gray-600">
                {Math.round((Date.now() - test.startDate) / (1000 * 60 * 60 * 24))} days
              </div>
            </div>
          </div>

          {/* Variant Results */}
          <div className="space-y-3">
            <h4 className="font-medium">Variant Performance</h4>
            {results.variants.map((variantData: any, index: number) => {
              const { variant, metrics, conversionRate, improvement } = variantData
              const sampleSize = metrics[test.targetMetric]?.sampleSize || 0
              const confidence = metrics[test.targetMetric]?.confidence || 0

              return (
                <div key={variant.id} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{variant.name}</span>
                      {variant.isControl && <Badge variant="outline">Control</Badge>}
                      {results.winner === variant.id && (
                        <Badge className="bg-green-100 text-green-800">Winner</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {sampleSize} samples
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Conversion Rate</div>
                      <div className="font-medium">{(conversionRate * 100).toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Improvement</div>
                      <div className={`font-medium ${improvement > 0 ? 'text-green-600' : improvement < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                        {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Confidence</div>
                      <div className="font-medium">
                        {(confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Progress bar for sample size */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Sample Progress</span>
                      <span>{sampleSize} / 1000</span>
                    </div>
                    <Progress value={Math.min(100, (sampleSize / 1000) * 100)} className="h-1" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* Test Actions */}
          <div className="flex space-x-2 pt-3 border-t">
            {test.status === 'running' && (
              <Button size="sm" variant="outline">
                Pause Test
              </Button>
            )}
            {test.status === 'paused' && (
              <Button size="sm" variant="outline">
                Resume Test
              </Button>
            )}
            <Button size="sm" variant="outline">
              Export Data
            </Button>
            {results.confidence >= 0.95 && results.winner && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                Implement Winner
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MobilePWAABTestingDashboard() {
  const [activeTests, setActiveTests] = useState<ABTest[]>([])
  const [testResults, setTestResults] = useState<{ [testId: string]: any }>({})
  const [selectedTest, setSelectedTest] = useState<string | null>(null)

  // Load active tests and results
  const loadTestData = async () => {
    const abTesting = getABTestingFramework()
    const tests = abTesting.getActiveTests()
    setActiveTests(tests)

    // Load results for each test
    const results: { [testId: string]: any } = {}
    tests.forEach(test => {
      const testResults = abTesting.getTestResults(test.id)
      if (testResults) {
        results[test.id] = testResults
      }
    })
    setTestResults(results)
  }

  useEffect(() => {
    loadTestData()
    
    // Refresh data every 30 seconds
    const interval = setInterval(loadTestData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getTotalSamples = (testId: string): number => {
    const results = testResults[testId]
    if (!results) return 0
    
    return results.variants.reduce((total: number, variant: any) => {
      const sampleSize = variant.metrics[results.test.targetMetric]?.sampleSize || 0
      return total + sampleSize
    }, 0)
  }

  const getTestStatus = (test: ABTest): { status: string; color: string } => {
    const results = testResults[test.id]
    if (!results) return { status: 'Loading', color: 'gray' }

    if (results.winner && results.confidence >= 0.95) {
      return { status: 'Conclusive', color: 'green' }
    }

    if (results.confidence >= 0.8) {
      return { status: 'Promising', color: 'yellow' }
    }

    if (getTotalSamples(test.id) >= 100) {
      return { status: 'Collecting Data', color: 'blue' }
    }

    return { status: 'Insufficient Data', color: 'gray' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">A/B Testing Dashboard</h2>
          <p className="text-gray-600">Manage and analyze mobile PWA feature experiments</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline">
            {activeTests.length} Active Tests
          </Badge>
          <Button onClick={loadTestData} variant="outline" size="sm">
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{activeTests.length}</div>
            <div className="text-sm text-gray-600">Active Tests</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {Object.values(testResults).filter(r => r.winner && r.confidence >= 0.95).length}
            </div>
            <div className="text-sm text-gray-600">Conclusive Results</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {Object.values(testResults).reduce((total, r) => 
                total + r.variants.reduce((sum: number, v: any) => 
                  sum + (v.metrics[r.test.targetMetric]?.sampleSize || 0), 0), 0
              )}
            </div>
            <div className="text-sm text-gray-600">Total Samples</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {Math.round(
                Object.values(testResults).reduce((total, r) => total + r.confidence, 0) / 
                Math.max(1, Object.values(testResults).length) * 100
              )}%
            </div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="running">Running Tests</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="create">Create Test</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Test Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Test Status Overview</CardTitle>
                <CardDescription>Current status of all mobile PWA experiments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeTests.map(test => {
                    const status = getTestStatus(test)
                    const totalSamples = getTotalSamples(test.id)
                    
                    return (
                      <div key={test.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{test.name}</div>
                          <div className="text-sm text-gray-600">{totalSamples} samples</div>
                        </div>
                        <Badge className={`bg-${status.color}-100 text-${status.color}-800`}>
                          {status.status}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Performance Impact */}
            <Card>
              <CardHeader>
                <CardTitle>Experiment Impact</CardTitle>
                <CardDescription>How A/B tests are affecting mobile performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">Best Improvement</div>
                      <div className="text-green-600 text-lg">+23.5%</div>
                      <div className="text-gray-500">Haptic intensity test</div>
                    </div>
                    <div>
                      <div className="font-medium">Experiments Running</div>
                      <div className="text-blue-600 text-lg">{activeTests.length}</div>
                      <div className="text-gray-500">Mobile features</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Statistical Power</span>
                      <span>87%</span>
                    </div>
                    <Progress value={87} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sample Coverage</span>
                      <span>64%</span>
                    </div>
                    <Progress value={64} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="running" className="space-y-4">
          <div className="space-y-4">
            {activeTests.filter(test => test.status === 'running').map(test => {
              const results = testResults[test.id]
              return results ? (
                <TestResultCard key={test.id} test={test} results={results} />
              ) : (
                <Card key={test.id}>
                  <CardContent className="pt-6">
                    <div className="text-center text-gray-500">Loading test results...</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="space-y-4">
            {Object.values(testResults)
              .filter(results => results.confidence >= 0.8 || results.winner)
              .map(results => (
                <TestResultCard key={results.test.id} test={results.test} results={results} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Create New A/B Test</CardTitle>
              <CardDescription>Set up a new experiment for mobile PWA features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Test Name</label>
                    <input 
                      type="text" 
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="e.g., Calendar Swipe Sensitivity"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Metric</label>
                    <select className="w-full px-3 py-2 border rounded-md">
                      <option>user_satisfaction</option>
                      <option>touch_success_rate</option>
                      <option>onboarding_completion_rate</option>
                      <option>feature_adoption</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea 
                    className="w-full px-3 py-2 border rounded-md h-20"
                    placeholder="Describe what you're testing and why..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Success Criteria</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., Increase success rate by 10%"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">Test Variants</label>
                  
                  {/* Control Variant */}
                  <div className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Control Variant</span>
                      <Badge variant="outline">Control</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        className="px-3 py-2 border rounded-md"
                        placeholder="Variant name"
                      />
                      <input 
                        type="number" 
                        className="px-3 py-2 border rounded-md"
                        placeholder="Traffic %"
                        defaultValue={50}
                      />
                    </div>
                  </div>

                  {/* Test Variant */}
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Test Variant</span>
                      <Button size="sm" variant="outline">Remove</Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input 
                        type="text" 
                        className="px-3 py-2 border rounded-md"
                        placeholder="Variant name"
                      />
                      <input 
                        type="number" 
                        className="px-3 py-2 border rounded-md"
                        placeholder="Traffic %"
                        defaultValue={50}
                      />
                    </div>
                  </div>

                  <Button variant="outline" size="sm">
                    + Add Another Variant
                  </Button>
                </div>

                <div className="flex space-x-3">
                  <Button className="flex-1">Create Test</Button>
                  <Button variant="outline">Save as Draft</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pre-defined Test Templates */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Templates</CardTitle>
              <CardDescription>Common mobile PWA experiments you can start immediately</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Haptic Feedback Timing</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Test different haptic feedback delays to optimize perceived responsiveness
                  </p>
                  <Button size="sm" variant="outline">Use Template</Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Touch Target Size</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Experiment with different touch target sizes for improved accuracy
                  </p>
                  <Button size="sm" variant="outline">Use Template</Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Swipe Sensitivity</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Optimize swipe gesture thresholds for better navigation experience
                  </p>
                  <Button size="sm" variant="outline">Use Template</Button>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Loading Animation</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    Test different loading animations for better perceived performance
                  </p>
                  <Button size="sm" variant="outline">Use Template</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}