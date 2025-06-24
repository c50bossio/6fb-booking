import { useState, useCallback } from 'react'
import { transactionManager, TransactionResult } from '../lib/transactions/transaction-manager'

export interface TransactionState {
  isExecuting: boolean
  lastResult: TransactionResult | null
  error: any
  retryCount: number
}

export function useTransactions() {
  const [transactionState, setTransactionState] = useState<TransactionState>({
    isExecuting: false,
    lastResult: null,
    error: null,
    retryCount: 0
  })

  const executeTransaction = useCallback(async (
    resourceType: string,
    operation: string,
    data: any,
    operationFn: () => Promise<any>,
    compensationFn?: () => Promise<void>
  ) => {
    setTransactionState(prev => ({
      ...prev,
      isExecuting: true,
      error: null
    }))

    try {
      const result = await transactionManager.executeTransaction(
        resourceType,
        operation,
        data,
        operationFn,
        compensationFn
      )

      setTransactionState(prev => ({
        ...prev,
        isExecuting: false,
        lastResult: result,
        error: result.success ? null : result.error,
        retryCount: 0
      }))

      return result
    } catch (error) {
      setTransactionState(prev => ({
        ...prev,
        isExecuting: false,
        error,
        retryCount: prev.retryCount + 1
      }))

      return {
        success: false,
        error
      }
    }
  }, [])

  // Convenience methods for appointment operations
  const createAppointment = useCallback(async (appointmentData: any) => {
    return executeTransaction(
      'appointments',
      'create',
      appointmentData,
      async () => {
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData)
        })

        if (!response.ok) {
          throw new Error(`Failed to create appointment: ${response.statusText}`)
        }

        return response.json()
      }
    )
  }, [executeTransaction])

  const updateAppointment = useCallback(async (appointmentId: string, updateData: any) => {
    return executeTransaction(
      'appointments',
      'update',
      { appointmentId, updateData },
      async () => {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          throw new Error(`Failed to update appointment: ${response.statusText}`)
        }

        return response.json()
      }
    )
  }, [executeTransaction])

  const deleteAppointment = useCallback(async (appointmentId: string) => {
    return executeTransaction(
      'appointments',
      'delete',
      { appointmentId },
      async () => {
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error(`Failed to delete appointment: ${response.statusText}`)
        }

        return { deleted: true, appointmentId }
      }
    )
  }, [executeTransaction])

  return {
    ...transactionState,
    executeTransaction,
    createAppointment,
    updateAppointment,
    deleteAppointment
  }
}

// Hook for transaction monitoring
export function useTransactionMonitor() {
  const [stats, setStats] = useState(transactionManager.getTransactionStats())
  const [recentTransactions, setRecentTransactions] = useState(
    transactionManager.getRecentTransactions()
  )

  const refreshStats = useCallback(() => {
    setStats(transactionManager.getTransactionStats())
    setRecentTransactions(transactionManager.getRecentTransactions())
  }, [])

  const isSystemHealthy = useCallback(() => {
    return transactionManager.isHealthy()
  }, [])

  return {
    stats,
    recentTransactions,
    refreshStats,
    isSystemHealthy
  }
}
