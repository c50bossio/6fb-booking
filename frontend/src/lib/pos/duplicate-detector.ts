/**
 * Duplicate Sale Detection for POS
 * Prevents accidental duplicate transactions
 */

import { createHash } from 'crypto'

export interface TransactionFingerprint {
  hash: string
  timestamp: Date
  total: number
  itemCount: number
  paymentMethod: string
}

export class DuplicateDetector {
  private static readonly STORAGE_KEY = 'pos_transaction_fingerprints'
  private static readonly DUPLICATE_WINDOW = 5 * 60 * 1000 // 5 minutes
  private static readonly MAX_STORED = 100 // Keep last 100 transactions

  /**
   * Generate a unique fingerprint for a transaction
   */
  static generateFingerprint(transaction: {
    items: Array<{ product_id: number; quantity: number; unit_price: number }>
    total: number
    paymentMethod: string
  }): string {
    // Sort items to ensure consistent hashing
    const sortedItems = [...transaction.items].sort((a, b) => a.product_id - b.product_id)

    const data = {
      items: sortedItems.map(item => ({
        id: item.product_id,
        qty: item.quantity,
        price: item.unit_price
      })),
      total: Math.round(transaction.total * 100), // Convert to cents to avoid float issues
      method: transaction.paymentMethod
    }

    // Create hash from transaction data
    const jsonString = JSON.stringify(data)

    // Simple hash function for browser environment
    let hash = 0
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36)
  }

  /**
   * Check if a transaction might be a duplicate
   */
  static async checkDuplicate(transaction: {
    items: Array<{ product_id: number; quantity: number; unit_price: number }>
    total: number
    paymentMethod: string
  }): Promise<{ isDuplicate: boolean; similarTransaction?: TransactionFingerprint }> {
    const fingerprint = this.generateFingerprint(transaction)
    const stored = this.getStoredFingerprints()
    const now = new Date()

    // Check for exact match within time window
    const exactMatch = stored.find(tf =>
      tf.hash === fingerprint &&
      (now.getTime() - tf.timestamp.getTime()) < this.DUPLICATE_WINDOW
    )

    if (exactMatch) {
      return { isDuplicate: true, similarTransaction: exactMatch }
    }

    // Check for similar transactions (same total and item count)
    const similarMatch = stored.find(tf =>
      Math.abs(tf.total - transaction.total) < 0.01 &&
      tf.itemCount === transaction.items.length &&
      tf.paymentMethod === transaction.paymentMethod &&
      (now.getTime() - tf.timestamp.getTime()) < this.DUPLICATE_WINDOW
    )

    if (similarMatch) {
      return { isDuplicate: true, similarTransaction: similarMatch }
    }

    return { isDuplicate: false }
  }

  /**
   * Record a completed transaction
   */
  static recordTransaction(transaction: {
    items: Array<{ product_id: number; quantity: number; unit_price: number }>
    total: number
    paymentMethod: string
  }) {
    const fingerprint: TransactionFingerprint = {
      hash: this.generateFingerprint(transaction),
      timestamp: new Date(),
      total: transaction.total,
      itemCount: transaction.items.length,
      paymentMethod: transaction.paymentMethod
    }

    const stored = this.getStoredFingerprints()
    stored.push(fingerprint)

    // Keep only recent transactions
    const sorted = stored.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    const trimmed = sorted.slice(0, this.MAX_STORED)

    this.saveFingerprints(trimmed)
  }

  /**
   * Clear old fingerprints
   */
  static cleanup() {
    const stored = this.getStoredFingerprints()
    const cutoff = new Date()
    cutoff.setHours(cutoff.getHours() - 24) // Keep 24 hours

    const filtered = stored.filter(tf => tf.timestamp > cutoff)
    this.saveFingerprints(filtered)
  }

  private static getStoredFingerprints(): TransactionFingerprint[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY)
      if (!data) return []

      const parsed = JSON.parse(data)
      // Convert timestamp strings back to Date objects
      return parsed.map((tf: any) => ({
        ...tf,
        timestamp: new Date(tf.timestamp)
      }))
    } catch {
      return []
    }
  }

  private static saveFingerprints(fingerprints: TransactionFingerprint[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fingerprints))
  }
}

/**
 * React hook for duplicate detection
 */
export function useDuplicateDetection() {
  const [isChecking, setIsChecking] = React.useState(false)

  const checkForDuplicate = React.useCallback(async (transaction: {
    items: Array<{ product_id: number; quantity: number; unit_price: number }>
    total: number
    paymentMethod: string
  }) => {
    setIsChecking(true)
    try {
      const result = await DuplicateDetector.checkDuplicate(transaction)
      return result
    } finally {
      setIsChecking(false)
    }
  }, [])

  const recordTransaction = React.useCallback((transaction: {
    items: Array<{ product_id: number; quantity: number; unit_price: number }>
    total: number
    paymentMethod: string
  }) => {
    DuplicateDetector.recordTransaction(transaction)
  }, [])

  return {
    checkForDuplicate,
    recordTransaction,
    isChecking
  }
}
