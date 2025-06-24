/**
 * React Hook for Optimistic Updates
 * Provides a simple interface for performing optimistic mutations with automatic rollback
 */

import { useCallback, useState, useRef, useEffect } from 'react'
import { optimisticUpdateManager, OptimisticMutation } from '@/lib/optimistic/OptimisticUpdateManager'
import { useCache } from '@/lib/cache/CacheManager'
import { toast } from 'sonner'

export interface OptimisticOptions<TInput = any, TResult = any> {
  mutationFn: (input: TInput) => Promise<TResult>
  getCacheKey: (input: TInput) => string
  optimisticUpdate?: (input: TInput, currentData?: any) => any
  rollbackUpdate?: (input: TInput, previousData: any, error: Error) => any
  invalidateKeys?: (input: TInput) => string[]
  onSuccess?: (data: TResult, input: TInput) => void
  onError?: (error: Error, input: TInput) => void
  onSettled?: (data: TResult | undefined, error: Error | null, input: TInput) => void
  retry?: {
    maxRetries?: number
    retryDelay?: (attempt: number) => number
    shouldRetry?: (error: Error, attempt: number) => boolean
  }
  conflictResolver?: (optimistic: any, server: any) => any
  showErrorToast?: boolean
  showSuccessToast?: boolean
  successMessage?: string | ((data: TResult) => string)
  errorMessage?: string | ((error: Error) => string)
}

export interface OptimisticMutationResult<TInput, TResult> {
  mutate: (input: TInput) => Promise<TResult | undefined>
  mutateAsync: (input: TInput) => Promise<TResult>
  isLoading: boolean
  isError: boolean
  isSuccess: boolean
  error: Error | null
  data: TResult | undefined
  reset: () => void
}

export function useOptimisticUpdate<TInput = any, TResult = any>(
  options: OptimisticOptions<TInput, TResult>
): OptimisticMutationResult<TInput, TResult> {
  const [state, setState] = useState({
    isLoading: false,
    isError: false,
    isSuccess: false,
    error: null as Error | null,
    data: undefined as TResult | undefined
  })

  const cache = useCache()
  const isMountedRef = useRef(true)
  const pendingMutationsRef = useRef(new Set<string>())

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isError: false,
      isSuccess: false,
      error: null,
      data: undefined
    })
  }, [])

  const mutateAsync = useCallback(async (input: TInput): Promise<TResult> => {
    const mutationId = Math.random().toString(36).substr(2, 9)
    pendingMutationsRef.current.add(mutationId)

    setState(prev => ({ ...prev, isLoading: true, isError: false, error: null }))

    try {
      // Create optimistic mutation configuration
      const mutation: OptimisticMutation<TInput, TResult> = {
        mutationFn: options.mutationFn,
        optimisticFn: options.optimisticUpdate || ((input) => input),
        rollbackFn: options.rollbackUpdate,
        getCacheKey: options.getCacheKey,
        invalidateKeys: options.invalidateKeys,
        conflictResolver: options.conflictResolver,
        retryStrategy: options.retry
      }

      // Perform optimistic mutation
      const result = await optimisticUpdateManager.mutate(mutation, input)

      if (isMountedRef.current) {
        setState({
          isLoading: false,
          isError: false,
          isSuccess: true,
          error: null,
          data: result
        })

        // Show success toast if enabled
        if (options.showSuccessToast) {
          const message = typeof options.successMessage === 'function'
            ? options.successMessage(result)
            : options.successMessage || 'Operation completed successfully'
          toast.success(message)
        }

        // Call success callback
        options.onSuccess?.(result, input)
        options.onSettled?.(result, null, input)
      }

      return result
    } catch (error) {
      const err = error as Error

      if (isMountedRef.current) {
        setState({
          isLoading: false,
          isError: true,
          isSuccess: false,
          error: err,
          data: undefined
        })

        // Show error toast if enabled
        if (options.showErrorToast !== false) {
          const message = typeof options.errorMessage === 'function'
            ? options.errorMessage(err)
            : options.errorMessage || err.message || 'An error occurred'
          toast.error(message)
        }

        // Call error callback
        options.onError?.(err, input)
        options.onSettled?.(undefined, err, input)
      }

      throw err
    } finally {
      pendingMutationsRef.current.delete(mutationId)
    }
  }, [options])

  const mutate = useCallback(async (input: TInput): Promise<TResult | undefined> => {
    try {
      const result = await mutateAsync(input)
      return result
    } catch {
      // Error is already handled and stored in state
      return undefined
    }
  }, [mutateAsync])

  return {
    mutate,
    mutateAsync,
    isLoading: state.isLoading,
    isError: state.isError,
    isSuccess: state.isSuccess,
    error: state.error,
    data: state.data,
    reset
  }
}

// Preset hooks for common mutations

/**
 * Hook for optimistic appointment mutations
 */
export function useOptimisticAppointment() {
  return {
    create: useOptimisticUpdate({
      mutationFn: async (data: any) => {
        const { appointmentsService } = await import('@/lib/api')
        const response = await appointmentsService.createAppointment(data)
        return response.data
      },
      getCacheKey: () => 'api:appointments',
      optimisticUpdate: (input, currentList) => {
        if (!Array.isArray(currentList)) return [input]
        return [...currentList, { ...input, id: `temp-${Date.now()}`, status: 'scheduled' }]
      },
      rollbackUpdate: (input, previousData) => previousData,
      invalidateKeys: () => ['appointments'],
      showSuccessToast: true,
      successMessage: 'Appointment created successfully',
      retry: {
        maxRetries: 3,
        retryDelay: (attempt) => Math.min(1000 * Math.pow(2, attempt), 5000)
      }
    }),

    update: useOptimisticUpdate({
      mutationFn: async ({ id, data }: { id: number; data: any }) => {
        const { appointmentsService } = await import('@/lib/api')
        const response = await appointmentsService.updateAppointment(id, data)
        return response.data
      },
      getCacheKey: ({ id }) => `api:appointments:${id}`,
      optimisticUpdate: ({ data }, current) => ({ ...current, ...data }),
      invalidateKeys: () => ['appointments'],
      showSuccessToast: true,
      successMessage: 'Appointment updated successfully'
    }),

    cancel: useOptimisticUpdate({
      mutationFn: async ({ id, reason }: { id: number; reason?: string }) => {
        const { appointmentsService } = await import('@/lib/api')
        await appointmentsService.cancelAppointment(id, reason)
        return { id, status: 'cancelled' }
      },
      getCacheKey: ({ id }) => `api:appointments:${id}`,
      optimisticUpdate: (input, current) => ({ ...current, status: 'cancelled' }),
      invalidateKeys: () => ['appointments'],
      showSuccessToast: true,
      successMessage: 'Appointment cancelled'
    }),

    reschedule: useOptimisticUpdate({
      mutationFn: async ({ id, date, time, reason }: any) => {
        const { appointmentsService } = await import('@/lib/api')
        const response = await appointmentsService.rescheduleAppointment(id, date, time, reason)
        return response.data
      },
      getCacheKey: ({ id }) => `api:appointments:${id}`,
      optimisticUpdate: ({ date, time }, current) => ({
        ...current,
        appointment_date: date,
        appointment_time: time
      }),
      invalidateKeys: () => ['appointments', 'availability'],
      showSuccessToast: true,
      successMessage: 'Appointment rescheduled successfully'
    })
  }
}

/**
 * Hook for optimistic client mutations
 */
export function useOptimisticClient() {
  return {
    create: useOptimisticUpdate({
      mutationFn: async (data: any) => {
        const response = await fetch('/api/v1/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!response.ok) throw new Error('Failed to create client')
        return response.json()
      },
      getCacheKey: () => 'api:clients',
      optimisticUpdate: (input, currentList) => {
        if (!Array.isArray(currentList)) return [input]
        return [...currentList, { ...input, id: `temp-${Date.now()}` }]
      },
      invalidateKeys: () => ['clients'],
      showSuccessToast: true,
      successMessage: 'Client added successfully'
    }),

    update: useOptimisticUpdate({
      mutationFn: async ({ id, data }: { id: string; data: any }) => {
        const response = await fetch(`/api/v1/clients/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        if (!response.ok) throw new Error('Failed to update client')
        return response.json()
      },
      getCacheKey: ({ id }) => `api:clients:${id}`,
      optimisticUpdate: ({ data }, current) => ({ ...current, ...data }),
      invalidateKeys: () => ['clients'],
      showSuccessToast: true,
      successMessage: 'Client updated successfully'
    }),

    delete: useOptimisticUpdate({
      mutationFn: async (id: string) => {
        const response = await fetch(`/api/v1/clients/${id}`, {
          method: 'DELETE'
        })
        if (!response.ok) throw new Error('Failed to delete client')
        return { id, deleted: true }
      },
      getCacheKey: () => 'api:clients',
      optimisticUpdate: (id, currentList) => {
        if (!Array.isArray(currentList)) return []
        return currentList.filter((client: any) => client.id !== id)
      },
      invalidateKeys: () => ['clients'],
      showSuccessToast: true,
      successMessage: 'Client removed successfully'
    })
  }
}

/**
 * Hook for optimistic service mutations
 */
export function useOptimisticService() {
  return {
    create: useOptimisticUpdate({
      mutationFn: async (data: any) => {
        const { servicesService } = await import('@/lib/api')
        const response = await servicesService.createService(data)
        return response.data
      },
      getCacheKey: () => 'api:services',
      optimisticUpdate: (input, currentList) => {
        if (!Array.isArray(currentList)) return [input]
        return [...currentList, { ...input, id: `temp-${Date.now()}`, is_active: true }]
      },
      invalidateKeys: () => ['services', 'categories'],
      showSuccessToast: true,
      successMessage: 'Service created successfully'
    }),

    update: useOptimisticUpdate({
      mutationFn: async ({ id, data }: { id: number; data: any }) => {
        const { servicesService } = await import('@/lib/api')
        const response = await servicesService.updateService(id, data)
        return response.data
      },
      getCacheKey: ({ id }) => `api:services:${id}`,
      optimisticUpdate: ({ data }, current) => ({ ...current, ...data }),
      invalidateKeys: () => ['services'],
      showSuccessToast: true,
      successMessage: 'Service updated successfully'
    }),

    toggleActive: useOptimisticUpdate({
      mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
        const { servicesService } = await import('@/lib/api')
        const response = await servicesService.updateService(id, { is_active: isActive })
        return response.data
      },
      getCacheKey: ({ id }) => `api:services:${id}`,
      optimisticUpdate: ({ isActive }, current) => ({ ...current, is_active: isActive }),
      invalidateKeys: () => ['services'],
      showSuccessToast: true,
      successMessage: (data) => `Service ${data.is_active ? 'activated' : 'deactivated'}`
    }),

    delete: useOptimisticUpdate({
      mutationFn: async (id: number) => {
        const { servicesService } = await import('@/lib/api')
        await servicesService.deleteService(id)
        return { id, deleted: true }
      },
      getCacheKey: () => 'api:services',
      optimisticUpdate: (id, currentList) => {
        if (!Array.isArray(currentList)) return []
        return currentList.filter((service: any) => service.id !== id)
      },
      invalidateKeys: () => ['services'],
      showSuccessToast: true,
      successMessage: 'Service deleted successfully'
    })
  }
}

/**
 * Hook for batch optimistic updates
 */
export function useOptimisticBatch<T = any>() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState<Array<{ item: T; error: Error }>>([])

  const processBatch = useCallback(async (
    items: T[],
    mutationFn: (item: T) => Promise<any>,
    options?: {
      concurrency?: number
      onProgress?: (completed: number, total: number) => void
      stopOnError?: boolean
    }
  ) => {
    const { concurrency = 3, onProgress, stopOnError = false } = options || {}

    setIsProcessing(true)
    setProgress(0)
    setErrors([])

    const results: any[] = []
    const batchErrors: Array<{ item: T; error: Error }> = []
    let completed = 0

    // Process items in chunks
    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency)
      
      const chunkResults = await Promise.allSettled(
        chunk.map(async (item) => {
          try {
            const result = await mutationFn(item)
            completed++
            const progressPercent = (completed / items.length) * 100
            setProgress(progressPercent)
            onProgress?.(completed, items.length)
            return result
          } catch (error) {
            const err = error as Error
            batchErrors.push({ item, error: err })
            
            if (stopOnError) {
              throw err
            }
            
            return null
          }
        })
      )

      results.push(...chunkResults)

      if (stopOnError && batchErrors.length > 0) {
        break
      }
    }

    setErrors(batchErrors)
    setIsProcessing(false)

    return {
      results,
      errors: batchErrors,
      successful: items.length - batchErrors.length,
      failed: batchErrors.length
    }
  }, [])

  return {
    processBatch,
    isProcessing,
    progress,
    errors
  }
}