'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BeakerIcon,
  ChartBarIcon,
  ClockIcon,
  TrophyIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PlayIcon,
  StopIcon,
  LightBulbIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { APIClient } from '@/lib/api/client'

const apiClient = new APIClient()

interface ABTest {
  id: string
  test_name: string
  message_type: string
  channel: string
  optimization_goal: string
  status: 'active' | 'completed' | 'paused' | 'cancelled'
  start_date: string
  end_date?: string
  variants_count: number
  current_sample_size: number
  winner_variant_id?: string
  improvement_percentage?: number
}

interface TestResults {
  test_info: {
    id: string
    name: string
    status: string
    optimization_goal: string
    start_date: string
    end_date?: string
  }
  variants: Array<{
    id: string
    name: string
    variation_type: string
    performance: {
      sends: number
      responses: number
      confirmations: number
      response_rate: number
      confirmation_rate: number
      effectiveness_score: number
    }
  }>
  statistical_analysis: {
    winner?: string
    significance?: number
    improvement?: number
  }
}

interface TemplateRecommendation {
  template_id: string
  recommendation_type: string
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  expected_improvement: number
  confidence_score: number
  implementation_effort: 'easy' | 'moderate' | 'complex'
  current_performance: number
  benchmark_performance: number
}

interface CreateTestFormData {
  test_name: string
  message_type: string
  channel: string
  optimization_goal: string
  base_template: string
  variation_types: string[]
  target_segment?: string
  test_duration_days: number
  min_sample_size: number
}

interface TemplateOptimizationDashboardProps {
  className?: string
}

export function TemplateOptimizationDashboard({
  className = ""
}: TemplateOptimizationDashboardProps) {
  const [activeTests, setActiveTests] = useState<ABTest[]>([])
  const [recommendations, setRecommendations] = useState<TemplateRecommendation[]>([])
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null)
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('tests')

  // Form state for creating new tests
  const [createFormData, setCreateFormData] = useState<CreateTestFormData>({
    test_name: '',
    message_type: 'appointment_reminder',
    channel: 'sms',
    optimization_goal: 'confirmation_rate',
    base_template: '',
    variation_types: ['tone'],
    test_duration_days: 14,
    min_sample_size: 100
  })

  // Fetch active tests
  const fetchActiveTests = useCallback(async () => {
    try {
      const tests = await apiClient.get<ABTest[]>('/api/v1/template-optimization/ab-tests')
      setActiveTests(tests)
    } catch (err) {
      console.error('Failed to fetch active tests:', err)
      setError('Failed to load active tests')
    }
  }, [])

  // Fetch recommendations
  const fetchRecommendations = useCallback(async () => {
    try {
      const recs = await apiClient.get<TemplateRecommendation[]>(
        '/api/v1/template-optimization/recommendations?limit=10'
      )
      setRecommendations(recs)
    } catch (err) {
      console.error('Failed to fetch recommendations:', err)
    }
  }, [])

  // Fetch test results
  const fetchTestResults = useCallback(async (testId: string) => {
    try {
      const results = await apiClient.get<TestResults>(
        `/api/v1/template-optimization/ab-tests/${testId}/results`
      )
      setTestResults(results)
    } catch (err) {
      console.error('Failed to fetch test results:', err)
    }
  }, [])

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchActiveTests(), fetchRecommendations()])
      setLoading(false)
    }
    loadData()
  }, [fetchActiveTests, fetchRecommendations])

  // Load test results when test is selected
  useEffect(() => {
    if (selectedTest) {
      fetchTestResults(selectedTest.id)
    } else {
      setTestResults(null)
    }
  }, [selectedTest, fetchTestResults])

  // Create new A/B test
  const createABTest = async () => {
    try {
      setLoading(true)
      await apiClient.post('/api/v1/template-optimization/ab-tests', createFormData)
      
      // Reset form and refresh data
      setCreateFormData({
        test_name: '',
        message_type: 'appointment_reminder',
        channel: 'sms',
        optimization_goal: 'confirmation_rate',
        base_template: '',
        variation_types: ['tone'],
        test_duration_days: 14,
        min_sample_size: 100
      })
      setShowCreateForm(false)
      await fetchActiveTests()
    } catch (err) {
      console.error('Failed to create A/B test:', err)
      setError('Failed to create A/B test')
    } finally {
      setLoading(false)
    }
  }

  // Complete test manually
  const completeTest = async (testId: string) => {
    try {
      await apiClient.post(`/api/v1/template-optimization/ab-tests/${testId}/complete`)
      await fetchActiveTests()
      if (selectedTest?.id === testId) {
        await fetchTestResults(testId)
      }
    } catch (err) {
      console.error('Failed to complete test:', err)
      setError('Failed to complete test')
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700 border-green-200'
      case 'completed': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'paused': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200'
      case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-green-50 text-green-700 border-green-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  if (loading && activeTests.length === 0) {
    return (
      <div className={`template-optimization-dashboard h-full flex items-center justify-center bg-gray-50 ${className}`}>
        <div className="text-center">
          <motion.div
            className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-gray-600">Loading optimization dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`template-optimization-dashboard h-full bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Template Optimization</h1>
            <p className="text-sm text-gray-600">
              AI-powered A/B testing and template optimization
            </p>
          </div>
          
          <Button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New A/B Test
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tests" className="flex items-center">
              <BeakerIcon className="w-4 h-4 mr-2" />
              A/B Tests
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex items-center">
              <LightBulbIcon className="w-4 h-4 mr-2" />
              Recommendations
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center">
              <ChartBarIcon className="w-4 h-4 mr-2" />
              Performance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tests" className="space-y-6 mt-6">
            {/* Active tests overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Active Tests</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {activeTests.filter(t => t.status === 'active').length}
                      </p>
                    </div>
                    <BeakerIcon className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Total Sample Size</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {activeTests.reduce((sum, test) => sum + test.current_sample_size, 0)}
                      </p>
                    </div>
                    <ChartBarIcon className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Completed Tests</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {activeTests.filter(t => t.status === 'completed').length}
                      </p>
                    </div>
                    <TrophyIcon className="w-8 h-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tests list and details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tests list */}
              <Card>
                <CardHeader>
                  <CardTitle>A/B Tests</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {activeTests.length > 0 ? (
                    activeTests.map((test) => (
                      <div
                        key={test.id}
                        onClick={() => setSelectedTest(test)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-gray-50 ${
                          selectedTest?.id === test.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{test.test_name}</h3>
                          <Badge className={getStatusColor(test.status)}>
                            {test.status}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-gray-600">
                          <p>{test.message_type} • {test.channel} • {test.optimization_goal}</p>
                          <p>{test.variants_count} variants • {test.current_sample_size} samples</p>
                          {test.improvement_percentage && (
                            <p className="text-green-600 font-medium">
                              +{(test.improvement_percentage * 100).toFixed(1)}% improvement
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <BeakerIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">No A/B tests yet</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Create your first test to start optimizing templates
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Test details */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {selectedTest ? 'Test Results' : 'Select a Test'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTest && testResults ? (
                    <div className="space-y-4">
                      {/* Test info */}
                      <div className="border-b border-gray-200 pb-4">
                        <h3 className="font-medium text-gray-900 mb-2">
                          {testResults.test_info.name}
                        </h3>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Goal: {testResults.test_info.optimization_goal}</p>
                          <p>Started: {format(parseISO(testResults.test_info.start_date), 'MMM d, yyyy')}</p>
                          {testResults.test_info.end_date && (
                            <p>Ended: {format(parseISO(testResults.test_info.end_date), 'MMM d, yyyy')}</p>
                          )}
                        </div>
                      </div>

                      {/* Variants performance */}
                      <div className="space-y-3">
                        <h4 className="font-medium text-gray-900">Variant Performance</h4>
                        {testResults.variants.map((variant) => (
                          <div key={variant.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900">{variant.name}</span>
                              <Badge variant="outline">{variant.variation_type}</Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-600">Sends: {variant.performance.sends}</p>
                                <p className="text-gray-600">Responses: {variant.performance.responses}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">
                                  Response Rate: {(variant.performance.response_rate * 100).toFixed(1)}%
                                </p>
                                <p className="text-gray-600">
                                  Confirmation Rate: {(variant.performance.confirmation_rate * 100).toFixed(1)}%
                                </p>
                              </div>
                            </div>
                            
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">Effectiveness Score</span>
                                <span className="font-medium">
                                  {(variant.performance.effectiveness_score * 100).toFixed(1)}%
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full"
                                  style={{ width: `${variant.performance.effectiveness_score * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Statistical analysis */}
                      {testResults.statistical_analysis.winner && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center mb-2">
                            <TrophyIcon className="w-5 h-5 text-green-600 mr-2" />
                            <span className="font-medium text-green-900">Winner Identified</span>
                          </div>
                          <p className="text-sm text-green-700">
                            {testResults.statistical_analysis.improvement && 
                              `${(testResults.statistical_analysis.improvement * 100).toFixed(1)}% improvement`
                            }
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      {selectedTest.status === 'active' && (
                        <div className="pt-4 border-t border-gray-200">
                          <Button
                            onClick={() => completeTest(selectedTest.id)}
                            className="w-full"
                            variant="outline"
                          >
                            <StopIcon className="w-4 h-4 mr-2" />
                            Complete Test
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : selectedTest ? (
                    <div className="flex items-center justify-center py-8">
                      <motion.div
                        className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Select a test to view details</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LightBulbIcon className="w-5 h-5 mr-2" />
                  AI Optimization Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recommendations.length > 0 ? (
                  <div className="space-y-4">
                    {recommendations.map((rec, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Badge className={getPriorityColor(rec.priority)}>
                              {rec.priority} priority
                            </Badge>
                            <Badge variant="outline">
                              {rec.implementation_effort}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600">
                            +{(rec.expected_improvement * 100).toFixed(1)}% expected
                          </div>
                        </div>
                        
                        <h3 className="font-medium text-gray-900 mb-2">
                          {rec.recommendation_type.replace('_', ' ').toUpperCase()}
                        </h3>
                        
                        <p className="text-gray-700 mb-3">{rec.suggestion}</p>
                        
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>
                            Current: {(rec.current_performance * 100).toFixed(1)}% → 
                            Target: {(rec.benchmark_performance * 100).toFixed(1)}%
                          </span>
                          <span>
                            Confidence: {(rec.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <LightBulbIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No recommendations available</p>
                    <p className="text-sm text-gray-400 mt-1">
                      More data needed to generate insights
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Performance analytics coming soon</p>
                  <p className="text-sm text-gray-400 mt-1">
                    View detailed template performance metrics and trends
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create test modal */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Create A/B Test</h2>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Test name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Test Name
                    </label>
                    <input
                      type="text"
                      value={createFormData.test_name}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, test_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Reminder Message Tone Test"
                    />
                  </div>

                  {/* Message type and channel */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message Type
                      </label>
                      <select
                        value={createFormData.message_type}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, message_type: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="appointment_reminder">Appointment Reminder</option>
                        <option value="appointment_confirmation">Appointment Confirmation</option>
                        <option value="no_show_follow_up">No-Show Follow Up</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Channel
                      </label>
                      <select
                        value={createFormData.channel}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, channel: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                      </select>
                    </div>
                  </div>

                  {/* Optimization goal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Optimization Goal
                    </label>
                    <select
                      value={createFormData.optimization_goal}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, optimization_goal: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="confirmation_rate">Confirmation Rate</option>
                      <option value="response_rate">Response Rate</option>
                      <option value="no_show_reduction">No-Show Reduction</option>
                      <option value="engagement_score">Engagement Score</option>
                    </select>
                  </div>

                  {/* Base template */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base Template
                    </label>
                    <textarea
                      value={createFormData.base_template}
                      onChange={(e) => setCreateFormData(prev => ({ ...prev, base_template: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your base template content..."
                    />
                  </div>

                  {/* Test parameters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Test Duration (days)
                      </label>
                      <input
                        type="number"
                        value={createFormData.test_duration_days}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, test_duration_days: parseInt(e.target.value) }))}
                        min="1"
                        max="90"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Sample Size
                      </label>
                      <input
                        type="number"
                        value={createFormData.min_sample_size}
                        onChange={(e) => setCreateFormData(prev => ({ ...prev, min_sample_size: parseInt(e.target.value) }))}
                        min="50"
                        max="1000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-6">
                    <Button
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createABTest}
                      disabled={!createFormData.test_name || !createFormData.base_template}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      <PlayIcon className="w-4 h-4 mr-2" />
                      Start Test
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                <span className="text-sm">{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-white hover:text-gray-200 ml-4"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TemplateOptimizationDashboard