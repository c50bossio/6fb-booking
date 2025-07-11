'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface LoadingState {
  isLoading: boolean
  progress?: number
  message?: string
  stage?: 'initializing' | 'fetching' | 'processing' | 'finalizing'
  error?: string | null
  retryCount: number
  startTime?: number
  estimatedDuration?: number
}

interface LoadingOptions {
  estimatedDuration?: number
  stages?: Array<{
    stage: 'initializing' | 'fetching' | 'processing' | 'finalizing'
    duration: number
    message: string
  }>
  onProgress?: (progress: number) => void
  onStageChange?: (stage: string) => void
  onError?: (error: string) => void
  onRetry?: () => void
  maxRetries?: number
  retryDelay?: number
}

/**
 * Hook for managing calendar loading states with progress tracking
 */
export function useCalendarLoading(options: LoadingOptions = {}) {
  const {
    estimatedDuration = 3000,
    stages = [
      { stage: 'initializing', duration: 500, message: 'Initializing...' },
      { stage: 'fetching', duration: 1500, message: 'Loading data...' },
      { stage: 'processing', duration: 800, message: 'Processing...' },
      { stage: 'finalizing', duration: 200, message: 'Finalizing...' }
    ],
    onProgress,
    onStageChange,
    onError,
    onRetry,
    maxRetries = 3,
    retryDelay = 2000
  } = options

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    message: '',
    stage: undefined,
    error: null,
    retryCount: 0,
    startTime: undefined,
    estimatedDuration
  })

  const progressIntervalRef = useRef<NodeJS.Timeout>()
  const retryTimeoutRef = useRef<NodeJS.Timeout>()
  const stageTimeoutsRef = useRef<NodeJS.Timeout[]>([])

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current)
      }
      stageTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    }
  }, [])

  // Start loading with automatic progress simulation
  const startLoading = useCallback((message?: string) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      progress: 0,
      message: message || stages[0].message,
      stage: stages[0].stage,
      error: null,
      startTime: Date.now()
    }))

    // Clear any existing intervals
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    stageTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    stageTimeoutsRef.current = []

    // Set up stage transitions
    let accumulatedDuration = 0
    stages.forEach((stageConfig, index) => {
      const timeout = setTimeout(() => {
        setState(prev => ({
          ...prev,
          stage: stageConfig.stage,
          message: stageConfig.message
        }))
        onStageChange?.(stageConfig.stage)
      }, accumulatedDuration)
      
      stageTimeoutsRef.current.push(timeout)
      accumulatedDuration += stageConfig.duration
    })

    // Simulate progress
    const totalDuration = stages.reduce((sum, stage) => sum + stage.duration, 0)
    let elapsed = 0
    
    progressIntervalRef.current = setInterval(() => {
      elapsed += 50
      const progress = Math.min((elapsed / totalDuration) * 100, 100)
      
      setState(prev => ({
        ...prev,
        progress
      }))
      
      onProgress?.(progress)
      
      if (progress >= 100) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
        }
      }
    }, 50)
  }, [stages, onProgress, onStageChange])

  // Stop loading
  const stopLoading = useCallback((error?: string) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    stageTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    stageTimeoutsRef.current = []

    setState(prev => ({
      ...prev,
      isLoading: false,
      progress: error ? prev.progress : 100,
      error: error || null,
      stage: error ? prev.stage : 'finalizing'
    }))

    if (error) {
      onError?.(error)
      
      // Auto-retry logic
      if (state.retryCount < maxRetries && onRetry) {
        retryTimeoutRef.current = setTimeout(() => {
          retry()
        }, retryDelay)
      }
    }
  }, [state.retryCount, maxRetries, retryDelay, onError, onRetry])

  // Manual retry
  const retry = useCallback(() => {
    setState(prev => ({
      ...prev,
      retryCount: prev.retryCount + 1,
      error: null
    }))
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
    
    onRetry?.()
    startLoading('Retrying...')
  }, [onRetry, startLoading])

  // Update progress manually
  const updateProgress = useCallback((progress: number, message?: string) => {
    setState(prev => ({
      ...prev,
      progress: Math.min(Math.max(progress, 0), 100),
      message: message || prev.message
    }))
  }, [])

  // Update stage manually
  const updateStage = useCallback((stage: LoadingState['stage'], message?: string) => {
    setState(prev => ({
      ...prev,
      stage,
      message: message || prev.message
    }))
    onStageChange?.(stage || '')
  }, [onStageChange])

  // Reset loading state
  const reset = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
    }
    stageTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    stageTimeoutsRef.current = []

    setState({
      isLoading: false,
      progress: 0,
      message: '',
      stage: undefined,
      error: null,
      retryCount: 0,
      startTime: undefined,
      estimatedDuration
    })
  }, [estimatedDuration])

  // Get elapsed time
  const getElapsedTime = useCallback(() => {
    if (!state.startTime) return 0
    return Date.now() - state.startTime
  }, [state.startTime])

  // Get remaining time estimate
  const getRemainingTime = useCallback(() => {
    if (!state.isLoading || !state.progress) return 0
    const elapsed = getElapsedTime()
    const estimatedTotal = (elapsed / state.progress) * 100
    return Math.max(0, estimatedTotal - elapsed)
  }, [state.isLoading, state.progress, getElapsedTime])

  return {
    // State
    isLoading: state.isLoading,
    progress: state.progress,
    message: state.message,
    stage: state.stage,
    error: state.error,
    retryCount: state.retryCount,
    
    // Actions
    startLoading,
    stopLoading,
    retry,
    updateProgress,
    updateStage,
    reset,
    
    // Utilities
    getElapsedTime,
    getRemainingTime,
    canRetry: state.retryCount < maxRetries
  }
}

/**
 * Hook for tracking multiple loading operations
 */
export function useMultipleLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<Map<string, boolean>>(new Map())
  
  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => {
      const next = new Map(prev)
      if (isLoading) {
        next.set(key, true)
      } else {
        next.delete(key)
      }
      return next
    })
  }, [])
  
  const isAnyLoading = loadingStates.size > 0
  const loadingKeys = Array.from(loadingStates.keys())
  
  return {
    setLoading,
    isAnyLoading,
    loadingKeys,
    isLoading: (key: string) => loadingStates.has(key)
  }
}