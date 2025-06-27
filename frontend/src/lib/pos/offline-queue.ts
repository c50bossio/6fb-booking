/**
 * Offline Queue Manager for POS
 * Handles offline transactions and syncs when connection is restored
 */

import apiClient from '@/lib/api/client'

export interface QueuedTransaction {
  id: string
  timestamp: string
  type: 'sale' | 'refund' | 'void'
  data: any
  status: 'pending' | 'syncing' | 'completed' | 'failed'
  retryCount: number
  lastError?: string
}

export class OfflineQueueManager {
  private static readonly QUEUE_KEY = 'pos_offline_queue'
  private static readonly MAX_RETRIES = 3
  private static syncInterval: NodeJS.Timer | null = null
  private static onlineListener: (() => void) | null = null

  static initialize() {
    // Start monitoring online status
    this.startOnlineMonitoring()

    // Check for pending transactions on startup
    if (navigator.onLine) {
      this.syncPendingTransactions()
    }
  }

  static destroy() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval)
      this.syncInterval = null
    }

    if (this.onlineListener) {
      window.removeEventListener('online', this.onlineListener)
      this.onlineListener = null
    }
  }

  private static startOnlineMonitoring() {
    // Listen for online events
    this.onlineListener = () => {
      console.log('Connection restored, syncing offline transactions...')
      this.syncPendingTransactions()
    }
    window.addEventListener('online', this.onlineListener)

    // Periodic sync check (every 30 seconds)
    this.syncInterval = setInterval(() => {
      if (navigator.onLine) {
        this.syncPendingTransactions()
      }
    }, 30000)
  }

  static async queueTransaction(type: QueuedTransaction['type'], data: any): Promise<string> {
    const transaction: QueuedTransaction = {
      id: this.generateTransactionId(),
      timestamp: new Date().toISOString(),
      type,
      data,
      status: 'pending',
      retryCount: 0
    }

    const queue = this.getQueue()
    queue.push(transaction)
    this.saveQueue(queue)

    // Try to sync immediately if online
    if (navigator.onLine) {
      setTimeout(() => this.syncTransaction(transaction.id), 100)
    }

    return transaction.id
  }

  private static async syncTransaction(transactionId: string) {
    const queue = this.getQueue()
    const transaction = queue.find(t => t.id === transactionId)

    if (!transaction || transaction.status !== 'pending') {
      return
    }

    // Update status
    transaction.status = 'syncing'
    this.saveQueue(queue)

    try {
      let response

      switch (transaction.type) {
        case 'sale':
          response = await apiClient.post('/sales', transaction.data)
          break
        case 'refund':
          response = await apiClient.post('/refunds', transaction.data)
          break
        case 'void':
          response = await apiClient.post('/voids', transaction.data)
          break
      }

      // Success - mark as completed
      transaction.status = 'completed'
      this.saveQueue(queue)

      // Clean up old completed transactions
      this.cleanupQueue()

      return response?.data
    } catch (error: any) {
      transaction.retryCount++
      transaction.lastError = error.message

      if (transaction.retryCount >= this.MAX_RETRIES) {
        transaction.status = 'failed'
      } else {
        transaction.status = 'pending'
      }

      this.saveQueue(queue)
      throw error
    }
  }

  static async syncPendingTransactions() {
    const queue = this.getQueue()
    const pending = queue.filter(t => t.status === 'pending')

    if (pending.length === 0) {
      return
    }

    console.log(`Syncing ${pending.length} offline transactions...`)

    for (const transaction of pending) {
      try {
        await this.syncTransaction(transaction.id)
      } catch (error) {
        console.error(`Failed to sync transaction ${transaction.id}:`, error)
      }
    }
  }

  static getQueue(): QueuedTransaction[] {
    try {
      const data = localStorage.getItem(this.QUEUE_KEY)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private static saveQueue(queue: QueuedTransaction[]) {
    localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue))
  }

  private static cleanupQueue() {
    const queue = this.getQueue()
    const cutoffDate = new Date()
    cutoffDate.setHours(cutoffDate.getHours() - 24) // Keep 24 hours of history

    const filtered = queue.filter(t => {
      if (t.status === 'completed' || t.status === 'failed') {
        const transactionDate = new Date(t.timestamp)
        return transactionDate > cutoffDate
      }
      return true
    })

    this.saveQueue(filtered)
  }

  static getPendingCount(): number {
    const queue = this.getQueue()
    return queue.filter(t => t.status === 'pending').length
  }

  static getFailedTransactions(): QueuedTransaction[] {
    const queue = this.getQueue()
    return queue.filter(t => t.status === 'failed')
  }

  static async retryFailed(transactionId: string) {
    const queue = this.getQueue()
    const transaction = queue.find(t => t.id === transactionId)

    if (transaction && transaction.status === 'failed') {
      transaction.status = 'pending'
      transaction.retryCount = 0
      this.saveQueue(queue)

      if (navigator.onLine) {
        await this.syncTransaction(transactionId)
      }
    }
  }

  static clearFailed() {
    const queue = this.getQueue()
    const filtered = queue.filter(t => t.status !== 'failed')
    this.saveQueue(filtered)
  }

  private static generateTransactionId(): string {
    return `pos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Check if a transaction might be a duplicate
  static async checkDuplicate(data: any): Promise<boolean> {
    const queue = this.getQueue()
    const recentCutoff = new Date()
    recentCutoff.setMinutes(recentCutoff.getMinutes() - 5) // Check last 5 minutes

    const recentTransactions = queue.filter(t => {
      const transactionDate = new Date(t.timestamp)
      return transactionDate > recentCutoff &&
             t.type === 'sale' &&
             (t.status === 'completed' || t.status === 'syncing' || t.status === 'pending')
    })

    // Check for duplicate based on amount and items
    for (const transaction of recentTransactions) {
      if (this.isSimilarTransaction(transaction.data, data)) {
        return true
      }
    }

    return false
  }

  private static isSimilarTransaction(data1: any, data2: any): boolean {
    // Check if total amounts match
    if (Math.abs(data1.total - data2.total) > 0.01) {
      return false
    }

    // Check if items match
    if (data1.items?.length !== data2.items?.length) {
      return false
    }

    // Check individual items
    const items1 = data1.items || []
    const items2 = data2.items || []

    for (let i = 0; i < items1.length; i++) {
      const item1 = items1[i]
      const item2 = items2.find((item: any) =>
        item.product_id === item1.product_id &&
        item.quantity === item1.quantity
      )

      if (!item2) {
        return false
      }
    }

    return true
  }
}
