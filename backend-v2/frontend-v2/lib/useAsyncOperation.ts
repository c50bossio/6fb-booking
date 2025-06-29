'use client'

import { useState, useCallback } from 'react'

interface AsyncOperationState {
  loading: boolean
  error: string | null
  data: any
}

interface AsyncOperationActions {
  execute: <T>(operation: () => Promise<T>) => Promise<T>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setData: (data: any) => void
  reset: () => void
}

export function useAsyncOperation(initialData: any = null): [AsyncOperationState, AsyncOperationActions] {
  const [state, setState] = useState<AsyncOperationState>({
    loading: false,
    error: null,
    data: initialData,
  })

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, loading: false }))
  }, [])

  const setData = useCallback((data: any) => {
    setState(prev => ({ ...prev, data, loading: false, error: null }))
  }, [])

  const reset = useCallback(() => {
    setState({ loading: false, error: null, data: initialData })
  }, [initialData])

  const execute = useCallback(async <T,>(operation: () => Promise<T>): Promise<T> => {
    setLoading(true)
    setError(null)

    try {
      const result = await operation()
      setData(result)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred'
      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }, [setLoading, setError, setData])

  const actions: AsyncOperationActions = {
    execute,
    setLoading,
    setError,
    setData,
    reset,
  }

  return [state, actions]
}