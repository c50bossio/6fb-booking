/**
 * Calendar Loading States Hook
 * Manages loading states for calendar operations
 */

import { useState, useCallback } from 'react'

export interface CalendarLoadingState {
  isLoading: boolean
  error: string | null
  operation: string | null
  progress?: number
}

export interface CalendarLoadingHook {
  loadingState: CalendarLoadingState
  setLoading: (operation: string, progress?: number) => void
  setError: (error: string | null) => void
  clearLoading: () => void
  isOperationLoading: (operation: string) => boolean
}

export function useCalendarLoading(): CalendarLoadingHook {
  const [loadingState, setLoadingState] = useState<CalendarLoadingState>({
    isLoading: false,
    error: null,
    operation: null,
    progress: 0
  })

  const setLoading = useCallback((operation: string, progress?: number) => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: true,
      operation,
      progress: progress ?? prev.progress,
      error: null
    }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      error,
      operation: null,
      progress: 0
    }))
  }, [])

  const clearLoading = useCallback(() => {
    setLoadingState({
      isLoading: false,
      error: null,
      operation: null,
      progress: 0
    })
  }, [])

  const isOperationLoading = useCallback((operation: string) => {
    return loadingState.isLoading && loadingState.operation === operation
  }, [loadingState.isLoading, loadingState.operation])

  return {
    loadingState,
    setLoading,
    setError,
    clearLoading,
    isOperationLoading
  }
}