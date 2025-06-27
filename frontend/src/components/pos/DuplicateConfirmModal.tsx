'use client'

import React from 'react'
import { AlertTriangle, Clock, DollarSign } from 'lucide-react'
import { TransactionFingerprint } from '@/lib/pos/duplicate-detector'

interface DuplicateConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  similarTransaction?: TransactionFingerprint
  currentTotal: number
}

export function DuplicateConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  similarTransaction,
  currentTotal
}: DuplicateConfirmModalProps) {
  if (!isOpen) return null

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)

    if (minutes < 1) return 'Less than a minute ago'
    if (minutes === 1) return '1 minute ago'
    if (minutes < 60) return `${minutes} minutes ago`

    const hours = Math.floor(minutes / 60)
    if (hours === 1) return '1 hour ago'
    return `${hours} hours ago`
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-orange-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Possible Duplicate Sale</h3>
            <p className="text-sm text-gray-600">Please confirm this transaction</p>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800 mb-3">
              A similar transaction was processed recently. This might be a duplicate.
            </p>

            {similarTransaction && (
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(similarTransaction.timestamp)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <DollarSign className="w-4 h-4" />
                  <span>Amount: ${similarTransaction.total.toFixed(2)}</span>
                </div>
                <div className="text-gray-700">
                  <span>Items: {similarTransaction.itemCount}</span>
                </div>
                <div className="text-gray-700">
                  <span>Payment: {similarTransaction.paymentMethod}</span>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 mb-1">Current Transaction</p>
            <p className="text-lg font-semibold">${currentTotal.toFixed(2)}</p>
          </div>

          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Common causes:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>Accidental double-click on payment button</li>
              <li>Customer requesting to split payment</li>
              <li>Network delay causing retry</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel Transaction
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors"
          >
            Process Anyway
          </button>
        </div>
      </div>
    </div>
  )
}
