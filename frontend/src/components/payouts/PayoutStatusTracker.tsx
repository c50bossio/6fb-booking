'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface PayoutStatus {
  id: string
  barberId: string
  barberName: string
  amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  paymentMethod: string
  initiatedAt: string
  completedAt?: string
  error?: string
  transactionId?: string
  estimatedArrival?: string
}

interface StatusUpdate {
  payoutId: string
  status: PayoutStatus['status']
  timestamp: string
  message: string
}

export default function PayoutStatusTracker() {
  const [payouts, setPayouts] = useState<PayoutStatus[]>([
    {
      id: 'pay_001',
      barberId: 'barber_1',
      barberName: 'Marcus Johnson',
      amount: 1176,
      status: 'processing',
      paymentMethod: 'Stripe',
      initiatedAt: '2024-06-26T10:00:00Z',
      estimatedArrival: '2024-06-26T14:00:00Z'
    },
    {
      id: 'pay_002',
      barberId: 'barber_2',
      barberName: 'Anthony Davis',
      amount: 936,
      status: 'completed',
      paymentMethod: 'PayPal',
      initiatedAt: '2024-06-26T09:30:00Z',
      completedAt: '2024-06-26T10:15:00Z',
      transactionId: 'TXN_123456789'
    },
    {
      id: 'pay_003',
      barberId: 'barber_3',
      barberName: 'Jerome Williams',
      amount: 1344,
      status: 'pending',
      paymentMethod: 'Stripe',
      initiatedAt: '2024-06-26T10:30:00Z'
    }
  ])

  const [recentUpdates, setRecentUpdates] = useState<StatusUpdate[]>([
    {
      payoutId: 'pay_002',
      status: 'completed',
      timestamp: '2024-06-26T10:15:00Z',
      message: 'Payout successfully transferred to PayPal account'
    },
    {
      payoutId: 'pay_001',
      status: 'processing',
      timestamp: '2024-06-26T10:05:00Z',
      message: 'Payment initiated with Stripe'
    }
  ])

  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Simulate status updates
      console.log('Refreshing payout statuses...')
    }, 5000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusIcon = (status: PayoutStatus['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />
      case 'processing':
        return <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-amber-600" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-600" />
      case 'cancelled':
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: PayoutStatus['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-amber-100 text-amber-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const retryPayout = (payoutId: string) => {
    console.log('Retrying payout:', payoutId)
    // API call to retry failed payout
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Real-Time Payout Status</h3>
          <p className="text-sm text-gray-600">Monitor ongoing payouts and transactions</p>
        </div>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="sr-only"
          />
          <div className="relative">
            <div className={`block w-14 h-8 rounded-full ${autoRefresh ? 'bg-violet-600' : 'bg-gray-300'}`}></div>
            <div className={`absolute left-1 top-1 w-6 h-6 rounded-full bg-white transition-transform ${autoRefresh ? 'translate-x-6' : ''}`}></div>
          </div>
          <span className="ml-3 text-sm font-medium text-gray-700">Auto-refresh</span>
        </label>
      </div>

      {/* Active Payouts */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Active Payouts</h4>
        </div>
        <div className="divide-y divide-gray-200">
          {payouts.map((payout) => (
            <div key={payout.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(payout.status)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-3">
                      <h5 className="font-medium text-gray-900">{payout.barberName}</h5>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                        {payout.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {formatCurrency(payout.amount)} via {payout.paymentMethod}
                    </p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Initiated: {formatTime(payout.initiatedAt)}</span>
                      {payout.completedAt && (
                        <span>Completed: {formatTime(payout.completedAt)}</span>
                      )}
                      {payout.estimatedArrival && payout.status === 'processing' && (
                        <span>ETA: {formatTime(payout.estimatedArrival)}</span>
                      )}
                    </div>
                    {payout.transactionId && (
                      <p className="text-xs text-gray-500 mt-1">
                        Transaction ID: {payout.transactionId}
                      </p>
                    )}
                    {payout.error && (
                      <div className="mt-2 p-2 bg-red-50 rounded-md">
                        <p className="text-sm text-red-700">{payout.error}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {payout.status === 'failed' && (
                    <button
                      onClick={() => retryPayout(payout.id)}
                      className="text-sm text-violet-600 hover:text-violet-700 font-medium"
                    >
                      Retry
                    </button>
                  )}
                  <button className="text-sm text-gray-500 hover:text-gray-700">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Updates */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="font-medium text-gray-900">Recent Updates</h4>
        </div>
        <div className="p-6">
          <div className="flow-root">
            <ul className="-mb-8">
              {recentUpdates.map((update, updateIdx) => (
                <li key={`${update.payoutId}-${update.timestamp}`}>
                  <div className="relative pb-8">
                    {updateIdx !== recentUpdates.length - 1 ? (
                      <span
                        className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                        aria-hidden="true"
                      />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="h-8 w-8 rounded-full bg-violet-100 flex items-center justify-center">
                          {getStatusIcon(update.status)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div>
                          <p className="text-sm text-gray-600">
                            {update.message}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {formatTime(update.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
