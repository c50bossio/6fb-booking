import { errorManager } from '../error-handling/error-manager'
import { loadingManager } from '../loading/loading-manager'

export interface Transaction {
  id: string
  resourceType: string
  operation: string
  data: any
  compensationAction?: () => Promise<void>
  retryCount: number
  maxRetries: number
  status: 'pending' | 'executing' | 'committed' | 'failed' | 'rolled_back'
  createdAt: Date
  completedAt?: Date
  error?: any
}

export interface TransactionResult {
  success: boolean
  data?: any
  error?: any
  rollbackPerformed?: boolean
}

class TransactionManager {
  private transactions = new Map<string, Transaction>()
  private operationHistory: Transaction[] = []
  private isOnline = navigator.onLine

  constructor() {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnline = true
      this.retryPendingTransactions()
    })

    window.addEventListener('offline', () => {
      this.isOnline = false
    })
  }

  // Execute a transaction with automatic retry and rollback
  async executeTransaction<T>(
    resourceType: string,
    operation: string,
    data: any,
    operationFn: () => Promise<T>,
    compensationFn?: () => Promise<void>,
    maxRetries = 3
  ): Promise<TransactionResult> {
    const transactionId = `${resourceType}_${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const transaction: Transaction = {
      id: transactionId,
      resourceType,
      operation,
      data,
      compensationAction: compensationFn,
      retryCount: 0,
      maxRetries,
      status: 'pending',
      createdAt: new Date()
    }

    this.transactions.set(transactionId, transaction)
    loadingManager.startOperation(transactionId, resourceType, operation)

    try {
      transaction.status = 'executing'
      const result = await this.executeWithRetry(transaction, operationFn)

      transaction.status = 'committed'
      transaction.completedAt = new Date()

      loadingManager.completeOperation(transactionId)
      this.addToHistory(transaction)

      return {
        success: true,
        data: result
      }
    } catch (error) {
      transaction.status = 'failed'
      transaction.error = error
      transaction.completedAt = new Date()

      // Attempt rollback if compensation action is provided
      let rollbackPerformed = false
      if (compensationFn) {
        try {
          await compensationFn()
          transaction.status = 'rolled_back'
          rollbackPerformed = true
        } catch (rollbackError) {
          console.error('Rollback failed:', rollbackError)
          errorManager.reportError({
            code: 4001,
            message: `Rollback failed for transaction ${transactionId}`,
            severity: 'CRITICAL',
            context: { transactionId, originalError: error, rollbackError }
          })
        }
      }

      loadingManager.failOperation(transactionId, error)
      this.addToHistory(transaction)

      return {
        success: false,
        error,
        rollbackPerformed
      }
    } finally {
      this.transactions.delete(transactionId)
    }
  }

  // Execute operation with exponential backoff retry
  private async executeWithRetry<T>(
    transaction: Transaction,
    operationFn: () => Promise<T>
  ): Promise<T> {
    while (transaction.retryCount <= transaction.maxRetries) {
      try {
        return await operationFn()
      } catch (error) {
        transaction.retryCount++

        if (transaction.retryCount > transaction.maxRetries) {
          throw error
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error
        }

        // Wait with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, transaction.retryCount - 1), 10000)
        await new Promise(resolve => setTimeout(resolve, delay))

        console.log(`Retrying transaction ${transaction.id}, attempt ${transaction.retryCount}`)
      }
    }

    throw new Error('Max retries exceeded')
  }

  // Check if an error is retryable
  private isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR') {
      return true
    }

    // HTTP 5xx errors are retryable
    if (error.response?.status >= 500) {
      return true
    }

    // Rate limit errors are retryable
    if (error.response?.status === 429) {
      return true
    }

    // Timeout errors are retryable
    if (error.code === 'TIMEOUT' || error.name === 'TimeoutError') {
      return true
    }

    return false
  }

  // Retry all pending transactions (called when coming back online)
  private async retryPendingTransactions() {
    const pendingTransactions = Array.from(this.transactions.values())
      .filter(t => t.status === 'pending')

    console.log(`Retrying ${pendingTransactions.length} pending transactions`)

    for (const transaction of pendingTransactions) {
      // Note: This is a simplified retry - in a real implementation,
      // you'd need to store the original operation function
      console.log(`Would retry transaction ${transaction.id}`)
    }
  }

  // Add transaction to history for debugging/monitoring
  private addToHistory(transaction: Transaction) {
    this.operationHistory.push({ ...transaction })

    // Keep only last 100 transactions
    if (this.operationHistory.length > 100) {
      this.operationHistory.shift()
    }
  }

  // Simplified appointment operations with transactions
  async createAppointmentTransaction(appointmentData: any): Promise<TransactionResult> {
    return this.executeTransaction(
      'appointments',
      'create',
      appointmentData,
      async () => {
        // Simulate API call
        const response = await fetch('/api/appointments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(appointmentData)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
      },
      async () => {
        // Compensation: This would be called if we need to rollback
        console.log('Rolling back appointment creation')
        // In a real scenario, this might delete the created appointment
      }
    )
  }

  async updateAppointmentTransaction(appointmentId: string, updateData: any): Promise<TransactionResult> {
    // Store original data for rollback
    let originalData: any = null

    return this.executeTransaction(
      'appointments',
      'update',
      { appointmentId, updateData },
      async () => {
        // First, get the current data for potential rollback
        const getCurrentResponse = await fetch(`/api/appointments/${appointmentId}`)
        if (getCurrentResponse.ok) {
          originalData = await getCurrentResponse.json()
        }

        // Perform the update
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return response.json()
      },
      async () => {
        // Compensation: Restore original data
        if (originalData) {
          console.log('Rolling back appointment update')
          await fetch(`/api/appointments/${appointmentId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(originalData)
          })
        }
      }
    )
  }

  async deleteAppointmentTransaction(appointmentId: string): Promise<TransactionResult> {
    let deletedData: any = null

    return this.executeTransaction(
      'appointments',
      'delete',
      { appointmentId },
      async () => {
        // First, backup the data for potential restoration
        const getResponse = await fetch(`/api/appointments/${appointmentId}`)
        if (getResponse.ok) {
          deletedData = await getResponse.json()
        }

        // Perform the deletion
        const response = await fetch(`/api/appointments/${appointmentId}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return { deleted: true, appointmentId }
      },
      async () => {
        // Compensation: Restore the deleted appointment
        if (deletedData) {
          console.log('Rolling back appointment deletion')
          await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(deletedData)
          })
        }
      }
    )
  }

  // Get transaction statistics
  getTransactionStats() {
    const stats = {
      total: this.operationHistory.length,
      successful: 0,
      failed: 0,
      rolledBack: 0,
      averageRetries: 0,
      currentPending: this.transactions.size
    }

    let totalRetries = 0

    for (const transaction of this.operationHistory) {
      switch (transaction.status) {
        case 'committed':
          stats.successful++
          break
        case 'failed':
          stats.failed++
          break
        case 'rolled_back':
          stats.rolledBack++
          break
      }
      totalRetries += transaction.retryCount
    }

    if (stats.total > 0) {
      stats.averageRetries = totalRetries / stats.total
    }

    return stats
  }

  // Get recent transaction history
  getRecentTransactions(limit = 10): Transaction[] {
    return this.operationHistory
      .slice(-limit)
      .reverse()
  }

  // Check if system is in a healthy state
  isHealthy(): boolean {
    const recentTransactions = this.getRecentTransactions(20)
    if (recentTransactions.length === 0) return true

    const failureRate = recentTransactions.filter(t => t.status === 'failed').length / recentTransactions.length
    return failureRate < 0.5 // Less than 50% failure rate
  }
}

export const transactionManager = new TransactionManager()
