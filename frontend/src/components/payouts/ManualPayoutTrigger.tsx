'use client'

import { useState } from 'react'
import {
  BanknotesIcon,
  UserIcon,
  CalendarIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

interface Barber {
  id: string
  name: string
  email: string
  paymentMethod: string
  pendingAmount: number
  lastPayout: string
}

interface PayoutRequest {
  barberId: string
  amount: number
  paymentMethod: string
  reason: string
  urgent: boolean
}

export default function ManualPayoutTrigger() {
  const [barbers] = useState<Barber[]>([
    {
      id: 'barber_1',
      name: 'Marcus Johnson',
      email: 'marcus@example.com',
      paymentMethod: 'Stripe',
      pendingAmount: 1176,
      lastPayout: '2024-06-19'
    },
    {
      id: 'barber_2',
      name: 'Anthony Davis',
      email: 'anthony@example.com',
      paymentMethod: 'PayPal',
      pendingAmount: 936,
      lastPayout: '2024-06-19'
    },
    {
      id: 'barber_3',
      name: 'Jerome Williams',
      email: 'jerome@example.com',
      paymentMethod: 'Stripe',
      pendingAmount: 1344,
      lastPayout: '2024-06-19'
    }
  ])

  const [selectedBarbers, setSelectedBarbers] = useState<string[]>([])
  const [payoutRequest, setPayoutRequest] = useState<PayoutRequest>({
    barberId: '',
    amount: 0,
    paymentMethod: '',
    reason: '',
    urgent: false
  })
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [processing, setProcessing] = useState(false)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const handleSelectAll = () => {
    if (selectedBarbers.length === barbers.length) {
      setSelectedBarbers([])
    } else {
      setSelectedBarbers(barbers.map(b => b.id))
    }
  }

  const calculateTotalPayout = () => {
    return selectedBarbers.reduce((total, barberId) => {
      const barber = barbers.find(b => b.id === barberId)
      return total + (barber?.pendingAmount || 0)
    }, 0)
  }

  const handleProcessPayout = async () => {
    setProcessing(true)
    try {
      // API call to process manual payouts
      await new Promise(resolve => setTimeout(resolve, 2000)) // Simulated
      console.log('Processing payouts for:', selectedBarbers)
      setShowConfirmation(false)
      setSelectedBarbers([])
      // Show success notification
    } catch (error) {
      console.error('Error processing payouts:', error)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Bulk Payout Section */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BanknotesIcon className="h-5 w-5 mr-2 text-violet-600" />
            Manual Payout Trigger
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Process payouts outside of the regular schedule
          </p>
        </div>

        {/* Barber Selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-medium text-gray-900">Select Barbers</h4>
            <button
              onClick={handleSelectAll}
              className="text-sm text-violet-600 hover:text-violet-700 font-medium"
            >
              {selectedBarbers.length === barbers.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-3">
            {barbers.map((barber) => (
              <label
                key={barber.id}
                className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedBarbers.includes(barber.id)
                    ? 'border-violet-600 bg-violet-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedBarbers.includes(barber.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedBarbers([...selectedBarbers, barber.id])
                      } else {
                        setSelectedBarbers(selectedBarbers.filter(id => id !== barber.id))
                      }
                    }}
                    className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                  />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{barber.name}</p>
                    <p className="text-xs text-gray-500">{barber.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(barber.pendingAmount)}</p>
                  <p className="text-xs text-gray-500">via {barber.paymentMethod}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Summary and Actions */}
        {selectedBarbers.length > 0 && (
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600">Total Payout Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(calculateTotalPayout())}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{selectedBarbers.length} barbers selected</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Manual Payout
              </label>
              <textarea
                value={payoutRequest.reason}
                onChange={(e) => setPayoutRequest({ ...payoutRequest, reason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                rows={2}
                placeholder="e.g., Early payout request, special circumstances..."
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={payoutRequest.urgent}
                  onChange={(e) => setPayoutRequest({ ...payoutRequest, urgent: e.target.checked })}
                  className="h-4 w-4 text-violet-600 focus:ring-violet-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Mark as urgent</span>
              </label>

              <button
                onClick={() => setShowConfirmation(true)}
                className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all"
              >
                Process Payouts
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h4 className="text-sm font-medium text-gray-900 mb-4">Quick Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-violet-300 hover:bg-violet-50 transition-all text-left">
            <CalendarIcon className="h-5 w-5 text-violet-600 mb-2" />
            <p className="text-sm font-medium text-gray-900">Process Weekly Payouts</p>
            <p className="text-xs text-gray-500 mt-1">Run scheduled payouts now</p>
          </button>

          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-amber-300 hover:bg-amber-50 transition-all text-left">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mb-2" />
            <p className="text-sm font-medium text-gray-900">Emergency Payout</p>
            <p className="text-xs text-gray-500 mt-1">Process urgent single payout</p>
          </button>

          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all text-left">
            <CreditCardIcon className="h-5 w-5 text-emerald-600 mb-2" />
            <p className="text-sm font-medium text-gray-900">Retry Failed</p>
            <p className="text-xs text-gray-500 mt-1">Retry all failed payouts</p>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="mb-4">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-violet-100">
                <BanknotesIcon className="h-6 w-6 text-violet-600" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Confirm Manual Payout
            </h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              You are about to process {selectedBarbers.length} payout(s) totaling {formatCurrency(calculateTotalPayout())}
            </p>
            {payoutRequest.urgent && (
              <div className="mb-4 p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-700 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                  This payout is marked as urgent
                </p>
              </div>
            )}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleProcessPayout}
                disabled={processing}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Confirm & Process'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
