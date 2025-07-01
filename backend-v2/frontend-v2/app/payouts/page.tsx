'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getProfile, getPaymentHistory, type User } from '../../lib/api'
import { format } from 'date-fns'
import { DollarSign, Calendar, Clock, TrendingUp, AlertCircle } from 'lucide-react'

interface PayoutSummary {
  total_paid_out: number
  pending_payout: number
  last_payout_date?: string
  next_payout_date?: string
}

export default function PayoutsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [payouts, setPayouts] = useState<any[]>([])
  const [summary, setSummary] = useState<PayoutSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Start of year
    end: new Date().toISOString().split('T')[0], // Today
  })

  useEffect(() => {
    loadData()
  }, [dateRange])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      
      // Check if user is authenticated and is a barber
      const userProfile = await getProfile()
      if (userProfile.role !== 'barber' && userProfile.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setUser(userProfile)

      // Load payment history (which includes payouts)
      const paymentData = await getPaymentHistory({
        barber_id: userProfile.id,
        start_date: dateRange.start,
        end_date: dateRange.end,
        page: 1,
        page_size: 100,
      })

      // Filter for payout-related transactions
      const payoutTransactions = paymentData.payments.filter((payment: any) => 
        payment.type === 'payout' || payment.description?.includes('Payout')
      )
      setPayouts(payoutTransactions)

      // Calculate summary
      const totalPaidOut = payoutTransactions
        .filter((p: any) => p.status === 'completed')
        .reduce((sum: number, p: any) => sum + p.amount, 0)
      
      const pendingAmount = payoutTransactions
        .filter((p: any) => p.status === 'pending')
        .reduce((sum: number, p: any) => sum + p.amount, 0)

      const lastPayout = payoutTransactions
        .filter((p: any) => p.status === 'completed')
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]

      setSummary({
        total_paid_out: totalPaidOut,
        pending_payout: pendingAmount,
        last_payout_date: lastPayout?.created_at,
        next_payout_date: undefined, // Would need backend support
      })
    } catch (err: any) {
      setError(err.message || 'Failed to load payout data')
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
      processing: 'bg-blue-100 text-blue-800',
    }
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusStyles[status as keyof typeof statusStyles] || 'bg-gray-100 text-gray-800'
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading payout data...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payouts</h1>
        <p className="text-gray-600 mt-2">
          Track your earnings and payout history
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Paid Out</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  ${summary.total_paid_out.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Payout</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  ${summary.pending_payout.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Last Payout</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {summary.last_payout_date 
                    ? format(new Date(summary.last_payout_date), 'MMM d, yyyy')
                    : 'No payouts yet'
                  }
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Payout History</h2>
        </div>
        
        {payouts.length === 0 ? (
          <div className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No payouts found for the selected period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(payout.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${payout.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(payout.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {payout.period_start && payout.period_end
                        ? `${format(new Date(payout.period_start), 'MMM d')} - ${format(new Date(payout.period_end), 'MMM d')}`
                        : 'N/A'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {payout.reference_id || payout.stripe_payout_id || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">About Payouts</h3>
            <p className="mt-1 text-sm text-blue-700">
              Payouts are processed weekly. Your earnings from completed appointments are automatically 
              transferred to your connected bank account. Processing usually takes 2-3 business days.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}