'use client'

import { useState, useEffect, ReactNode } from 'react'
import { useConversionTracking, ConversionEventType } from '@/components/tracking/ConversionTracker'

interface ABVariant {
  id: string
  name: string
  weight: number // Percentage of traffic (0-100)
  component: ReactNode
}

interface ABTestingWrapperProps {
  testId: string
  variants: ABVariant[]
  fallbackVariant?: string
  persistSession?: boolean
  className?: string
}

interface ABTestResult {
  variantId: string
  testId: string
  timestamp: Date
}

// Local storage key for persisting A/B test assignments
const AB_TEST_STORAGE_KEY = 'bookedbarber_ab_tests'

// Get stored A/B test results
function getStoredABTests(): Record<string, ABTestResult> {
  if (typeof window === 'undefined') return {}
  
  try {
    const stored = localStorage.getItem(AB_TEST_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

// Store A/B test result
function storeABTest(testId: string, variantId: string) {
  if (typeof window === 'undefined') return
  
  try {
    const stored = getStoredABTests()
    stored[testId] = {
      variantId,
      testId,
      timestamp: new Date()
    }
    localStorage.setItem(AB_TEST_STORAGE_KEY, JSON.stringify(stored))
  } catch (error) {
    console.warn('Failed to store A/B test result:', error)
  }
}

// Weighted random selection algorithm
function selectVariant(variants: ABVariant[]): string {
  const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0)
  
  if (totalWeight === 0) {
    return variants[0]?.id || 'default'
  }
  
  let random = Math.random() * totalWeight
  
  for (const variant of variants) {
    random -= variant.weight
    if (random <= 0) {
      return variant.id
    }
  }
  
  return variants[0]?.id || 'default'
}

// Hash function for consistent assignment based on user identifier
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Get consistent variant assignment based on session/user
function getConsistentVariant(testId: string, variants: ABVariant[]): string {
  // Use a combination of test ID and session identifier for consistency
  const sessionId = typeof window !== 'undefined' 
    ? (sessionStorage.getItem('session_id') || 'anonymous')
    : 'anonymous'
  
  const seed = `${testId}_${sessionId}`
  const hash = hashCode(seed)
  const totalWeight = variants.reduce((sum, variant) => sum + variant.weight, 0)
  
  if (totalWeight === 0) {
    return variants[0]?.id || 'default'
  }
  
  const normalizedHash = hash % totalWeight
  let cumulativeWeight = 0
  
  for (const variant of variants) {
    cumulativeWeight += variant.weight
    if (normalizedHash < cumulativeWeight) {
      return variant.id
    }
  }
  
  return variants[0]?.id || 'default'
}

export function ABTestingWrapper({
  testId,
  variants,
  fallbackVariant,
  persistSession = true,
  className = ''
}: ABTestingWrapperProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { track } = useConversionTracking()
  
  useEffect(() => {
    if (!variants.length) {
      setIsLoading(false)
      return
    }
    
    let variantId: string
    
    if (persistSession) {
      // Check if user already has an assignment for this test
      const storedTests = getStoredABTests()
      const existingAssignment = storedTests[testId]
      
      if (existingAssignment && variants.some(v => v.id === existingAssignment.variantId)) {
        variantId = existingAssignment.variantId
      } else {
        // Get consistent assignment based on session
        variantId = getConsistentVariant(testId, variants)
        storeABTest(testId, variantId)
      }
    } else {
      // Random assignment for each page load
      variantId = selectVariant(variants)
    }
    
    setSelectedVariant(variantId)
    setIsLoading(false)
    
    // Track A/B test assignment
    track(ConversionEventType.SELECT_CONTENT, {
      content_type: 'ab_test',
      content_name: testId,
      content_id: variantId,
      value: 1
    })
    
    // Log for debugging in development (disabled for performance)
    // if (process.env.NODE_ENV === 'development') {
    //   console.log(`🧪 A/B Test "${testId}": Assigned variant "${variantId}"`)
    // }
  }, [testId, variants, persistSession, track])
  
  // Track conversion events with A/B test context
  const trackConversion = (eventType: ConversionEventType, params?: any) => {
    track(eventType, {
      ...params,
      ab_test_id: testId,
      ab_variant: selectedVariant,
    })
  }
  
  // Provide tracking function to child components
  useEffect(() => {
    if (selectedVariant && typeof window !== 'undefined') {
      (window as any).trackABConversion = trackConversion
    }
  }, [selectedVariant])
  
  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 min-h-[200px] rounded-lg ${className}`}>
        <div className="sr-only">Loading A/B test variant...</div>
      </div>
    )
  }
  
  if (!selectedVariant) {
    const fallback = variants.find(v => v.id === fallbackVariant) || variants[0]
    return (
      <div className={className}>
        {fallback?.component || <div>No variant available</div>}
      </div>
    )
  }
  
  const variant = variants.find(v => v.id === selectedVariant)
  
  if (!variant) {
    const fallback = variants.find(v => v.id === fallbackVariant) || variants[0]
    return (
      <div className={className}>
        {fallback?.component || <div>Variant not found</div>}
      </div>
    )
  }
  
  return (
    <div className={className} data-ab-test={testId} data-ab-variant={selectedVariant}>
      {variant.component}
    </div>
  )
}

// Higher-order component for easy A/B testing
export function withABTest<P extends object>(
  testId: string,
  variants: Omit<ABVariant, 'component'>[] & { component?: never }[],
  components: Record<string, React.ComponentType<P>>
) {
  return function ABTestedComponent(props: P) {
    const abVariants: ABVariant[] = variants.map(variant => ({
      ...variant,
      component: React.createElement(components[variant.id], props)
    }))
    
    return (
      <ABTestingWrapper
        testId={testId}
        variants={abVariants}
        fallbackVariant={variants[0]?.id}
      />
    )
  }
}

// Hook for tracking A/B test conversions
export function useABTestTracking(testId?: string) {
  const { track } = useConversionTracking()
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [currentVariant, setCurrentVariant] = useState<string | null>(null)
  
  useEffect(() => {
    if (testId) {
      const storedTests = getStoredABTests()
      const assignment = storedTests[testId]
      if (assignment) {
        setCurrentTest(testId)
        setCurrentVariant(assignment.variantId)
      }
    }
  }, [testId])
  
  const trackConversion = (eventType: ConversionEventType, params?: any) => {
    track(eventType, {
      ...params,
      ab_test_id: currentTest,
      ab_variant: currentVariant,
    })
  }
  
  return {
    trackConversion,
    currentTest,
    currentVariant
  }
}

// Debug component for development
export function ABTestDebugPanel() {
  const [tests, setTests] = useState<Record<string, ABTestResult>>({})
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const storedTests = getStoredABTests()
      setTests(storedTests)
    }
  }, [])
  
  if (process.env.NODE_ENV !== 'development') {
    return null
  }
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-mono shadow-lg hover:bg-purple-700"
      >
        🧪 A/B Tests ({Object.keys(tests).length})
      </button>
      
      {isVisible && (
        <div className="absolute bottom-12 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[300px] max-h-[400px] overflow-y-auto">
          <div className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">
            Active A/B Tests
          </div>
          {Object.entries(tests).length === 0 ? (
            <div className="text-gray-500 text-sm">No active tests</div>
          ) : (
            <div className="space-y-2">
              {Object.entries(tests).map(([testId, result]) => (
                <div key={testId} className="bg-gray-50 dark:bg-gray-700 p-2 rounded text-xs">
                  <div className="font-mono font-semibold text-gray-900 dark:text-white">
                    {testId}
                  </div>
                  <div className="text-gray-600 dark:text-gray-300">
                    Variant: <span className="font-mono">{result.variantId}</span>
                  </div>
                  <div className="text-gray-500 text-xs">
                    {new Date(result.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => {
              localStorage.removeItem(AB_TEST_STORAGE_KEY)
              setTests({})
              window.location.reload()
            }}
            className="mt-3 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Clear All Tests
          </button>
        </div>
      )}
    </div>
  )
}

export default ABTestingWrapper