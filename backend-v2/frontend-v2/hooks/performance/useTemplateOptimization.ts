/**
 * React hook for Template Optimization and A/B Testing
 * Manages A/B tests, template recommendations, and performance analytics
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { APIClient } from '@/lib/api/client'

const apiClient = new APIClient()

export interface ABTest {
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

export interface TestResults {
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
  recommendations: Array<{
    recommendation: string
    impact: string
    effort: string
  }>
}

export interface TemplateRecommendation {
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

export interface TemplatePerformance {
  template_id: string
  time_period: string
  total_sends: number
  total_responses: number
  total_confirmations: number
  response_rate: number
  confirmation_rate: number
  effectiveness_score: number
  revenue_protected: number
  improvement_vs_baseline: number
}

export interface OptimalTemplate {
  template_content: string
  metadata: {
    variant_id?: string
    test_id?: string
    is_test: boolean
    performance_score?: number
    ai_provider?: string
  }
  is_test_variant: boolean
  test_id?: string
  variant_id?: string
}

export interface CreateTestRequest {
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

export interface RecordInteractionRequest {
  template_id: string
  variant_id?: string
  interaction_type: string
  client_id: number
  appointment_id: number
  metadata?: Record<string, any>
}

export interface UseTemplateOptimizationOptions {
  autoRefresh?: boolean
  refreshInterval?: number
  includeCompleted?: boolean
  maxRecommendations?: number
}

export interface UseTemplateOptimizationReturn {
  // Data
  activeTests: ABTest[]
  recommendations: TemplateRecommendation[]
  testResults: TestResults | null
  selectedTest: ABTest | null
  
  // Loading states
  loading: boolean
  testsLoading: boolean
  recommendationsLoading: boolean
  resultsLoading: boolean
  
  // Error states
  error: string | null
  testError: string | null
  recommendationError: string | null
  
  // Actions
  createABTest: (request: CreateTestRequest) => Promise<ABTest>
  completeTest: (testId: string) => Promise<void>
  pauseTest: (testId: string) => Promise<void>
  getOptimalTemplate: (messageType: string, channel: string, context: Record<string, any>) => Promise<OptimalTemplate>
  recordInteraction: (request: RecordInteractionRequest) => Promise<void>
  getTemplatePerformance: (templateId: string, timePeriod?: string) => Promise<TemplatePerformance>
  
  // Data management
  refreshActiveTests: () => Promise<void>
  refreshRecommendations: () => Promise<void>
  selectTest: (test: ABTest | null) => void
  clearErrors: () => void
  
  // Utilities
  getTestProgress: (test: ABTest) => number
  getTestStatus: (test: ABTest) => { status: string; color: string; description: string }
  getRecommendationsByPriority: (priority?: 'high' | 'medium' | 'low') => TemplateRecommendation[]
  calculateTotalSampleSize: () => number
  
  // Meta
  lastUpdated: Date | null
  isRealTimeActive: boolean
}

export function useTemplateOptimization(options: UseTemplateOptimizationOptions = {}): UseTemplateOptimizationReturn {
  const {
    autoRefresh = true,
    refreshInterval = 60000, // 1 minute
    includeCompleted = true,
    maxRecommendations = 20
  } = options

  // State
  const [activeTests, setActiveTests] = useState<ABTest[]>([])
  const [recommendations, setRecommendations] = useState<TemplateRecommendation[]>([])
  const [testResults, setTestResults] = useState<TestResults | null>(null)
  const [selectedTest, setSelectedTest] = useState<ABTest | null>(null)
  
  // Loading states
  const [loading, setLoading] = useState(true)
  const [testsLoading, setTestsLoading] = useState(false)
  const [recommendationsLoading, setRecommendationsLoading] = useState(false)
  const [resultsLoading, setResultsLoading] = useState(false)
  
  // Error states
  const [error, setError] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [recommendationError, setRecommendationError] = useState<string | null>(null)
  
  // Meta state
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [isRealTimeActive, setIsRealTimeActive] = useState(false)
  
  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true)

  // Fetch active tests
  const refreshActiveTests = useCallback(async () => {
    if (!isActiveRef.current) return
    
    try {
      setTestsLoading(true)
      setTestError(null)
      
      const tests = await apiClient.get<ABTest[]>('/api/v1/template-optimization/ab-tests')
      setActiveTests(tests)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to fetch active tests:', err)
      setTestError(err instanceof Error ? err.message : 'Failed to load tests')
    } finally {
      setTestsLoading(false)
    }
  }, [])

  // Fetch recommendations
  const refreshRecommendations = useCallback(async () => {
    if (!isActiveRef.current) return
    
    try {
      setRecommendationsLoading(true)
      setRecommendationError(null)
      
      const recs = await apiClient.get<TemplateRecommendation[]>(
        `/api/v1/template-optimization/recommendations?limit=${maxRecommendations}`
      )
      setRecommendations(recs)
    } catch (err) {
      console.error('Failed to fetch recommendations:', err)
      setRecommendationError(err instanceof Error ? err.message : 'Failed to load recommendations')
    } finally {
      setRecommendationsLoading(false)
    }
  }, [maxRecommendations])

  // Fetch test results
  const fetchTestResults = useCallback(async (testId: string) => {
    if (!isActiveRef.current) return
    
    try {
      setResultsLoading(true)
      
      const results = await apiClient.get<TestResults>(
        `/api/v1/template-optimization/ab-tests/${testId}/results`
      )
      setTestResults(results)
    } catch (err) {
      console.error('Failed to fetch test results:', err)
      setTestResults(null)
    } finally {
      setResultsLoading(false)
    }
  }, [])

  // Create A/B test
  const createABTest = useCallback(async (request: CreateTestRequest): Promise<ABTest> => {
    try {
      const test = await apiClient.post<ABTest>('/api/v1/template-optimization/ab-tests', request)
      await refreshActiveTests()
      return test
    } catch (err) {
      console.error('Failed to create A/B test:', err)
      throw err
    }
  }, [refreshActiveTests])

  // Complete test
  const completeTest = useCallback(async (testId: string): Promise<void> => {
    try {
      await apiClient.post(`/api/v1/template-optimization/ab-tests/${testId}/complete`)
      await refreshActiveTests()
      
      // Refresh results if this is the selected test
      if (selectedTest?.id === testId) {
        await fetchTestResults(testId)
      }
    } catch (err) {
      console.error('Failed to complete test:', err)
      throw err
    }
  }, [refreshActiveTests, selectedTest, fetchTestResults])

  // Pause test (placeholder - would need API endpoint)
  const pauseTest = useCallback(async (testId: string): Promise<void> => {
    try {
      // This would need a pause endpoint in the API
      console.log('Pause test functionality not yet implemented:', testId)
      throw new Error('Pause functionality not yet implemented')
    } catch (err) {
      console.error('Failed to pause test:', err)
      throw err
    }
  }, [])

  // Get optimal template
  const getOptimalTemplate = useCallback(async (
    messageType: string,
    channel: string,
    context: Record<string, any>
  ): Promise<OptimalTemplate> => {
    try {
      const request = {
        message_type: messageType,
        channel: channel,
        client_context: context.client_context || {},
        appointment_context: context.appointment_context || {}
      }
      
      const template = await apiClient.post<OptimalTemplate>(
        '/api/v1/template-optimization/templates/optimal',
        request
      )
      
      return template
    } catch (err) {
      console.error('Failed to get optimal template:', err)
      throw err
    }
  }, [])

  // Record interaction
  const recordInteraction = useCallback(async (request: RecordInteractionRequest): Promise<void> => {
    try {
      await apiClient.post('/api/v1/template-optimization/interactions', request)
    } catch (err) {
      console.error('Failed to record interaction:', err)
      throw err
    }
  }, [])

  // Get template performance
  const getTemplatePerformance = useCallback(async (
    templateId: string,
    timePeriod: string = '30d'
  ): Promise<TemplatePerformance> => {
    try {
      const performance = await apiClient.get<TemplatePerformance>(
        `/api/v1/template-optimization/performance/${templateId}?time_period=${timePeriod}`
      )
      
      return performance
    } catch (err) {
      console.error('Failed to get template performance:', err)
      throw err
    }
  }, [])

  // Select test
  const selectTest = useCallback((test: ABTest | null) => {
    setSelectedTest(test)
  }, [])

  // Clear errors
  const clearErrors = useCallback(() => {
    setError(null)
    setTestError(null)
    setRecommendationError(null)
  }, [])

  // Utility functions
  const getTestProgress = useCallback((test: ABTest): number => {
    // Calculate progress based on sample size vs minimum required
    const minRequired = 100 // This would come from test configuration
    return Math.min(100, (test.current_sample_size / minRequired) * 100)
  }, [])

  const getTestStatus = useCallback((test: ABTest) => {
    switch (test.status) {
      case 'active':
        return {
          status: 'Running',
          color: 'green',
          description: 'Test is actively collecting data'
        }
      case 'completed':
        return {
          status: 'Completed',
          color: 'blue',
          description: 'Test has finished and winner determined'
        }
      case 'paused':
        return {
          status: 'Paused',
          color: 'yellow',
          description: 'Test is temporarily paused'
        }
      case 'cancelled':
        return {
          status: 'Cancelled',
          color: 'red',
          description: 'Test was cancelled before completion'
        }
      default:
        return {
          status: 'Unknown',
          color: 'gray',
          description: 'Unknown test status'
        }
    }
  }, [])

  const getRecommendationsByPriority = useCallback((priority?: 'high' | 'medium' | 'low') => {
    if (!priority) return recommendations
    return recommendations.filter(rec => rec.priority === priority)
  }, [recommendations])

  const calculateTotalSampleSize = useCallback(() => {
    return activeTests.reduce((total, test) => total + test.current_sample_size, 0)
  }, [activeTests])

  // Initial load
  useEffect(() => {
    isActiveRef.current = true
    
    const loadData = async () => {
      setLoading(true)
      await Promise.all([refreshActiveTests(), refreshRecommendations()])
      setLoading(false)
    }
    
    loadData()
  }, [refreshActiveTests, refreshRecommendations])

  // Load test results when test is selected
  useEffect(() => {
    if (selectedTest) {
      fetchTestResults(selectedTest.id)
    } else {
      setTestResults(null)
    }
  }, [selectedTest, fetchTestResults])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return

    setIsRealTimeActive(true)
    
    refreshIntervalRef.current = setInterval(async () => {
      if (isActiveRef.current) {
        await Promise.all([refreshActiveTests(), refreshRecommendations()])
      }
    }, refreshInterval)

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
      setIsRealTimeActive(false)
    }
  }, [autoRefresh, refreshInterval, refreshActiveTests, refreshRecommendations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isActiveRef.current = false
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
      }
    }
  }, [])

  // Set combined error state
  useEffect(() => {
    if (testError || recommendationError) {
      setError(testError || recommendationError || null)
    } else {
      setError(null)
    }
  }, [testError, recommendationError])

  return {
    // Data
    activeTests,
    recommendations,
    testResults,
    selectedTest,
    
    // Loading states
    loading,
    testsLoading,
    recommendationsLoading,
    resultsLoading,
    
    // Error states
    error,
    testError,
    recommendationError,
    
    // Actions
    createABTest,
    completeTest,
    pauseTest,
    getOptimalTemplate,
    recordInteraction,
    getTemplatePerformance,
    
    // Data management
    refreshActiveTests,
    refreshRecommendations,
    selectTest,
    clearErrors,
    
    // Utilities
    getTestProgress,
    getTestStatus,
    getRecommendationsByPriority,
    calculateTotalSampleSize,
    
    // Meta
    lastUpdated,
    isRealTimeActive
  }
}

export default useTemplateOptimization