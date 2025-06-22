'use client'

import { useEffect, useState } from 'react'
import {
  BanknotesIcon,
  CurrencyDollarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  PlayIcon,
  PauseIcon,
  CogIcon,
  CalendarIcon,
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'

interface Payout {
  id: string
  barber_id: number
  barber_name: string
  amount: number
  fee: number
  net_amount: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  payment_method: 'stripe' | 'square' | 'tremendous' | 'manual'
  payout_date: string
  created_at: string
  failure_reason?: string
  transaction_id?: string
}

interface PayoutStats {
  total_pending: number
  total_processing: number
  total_completed: number
  total_failed: number
  total_amount_pending: number
  total_amount_completed: number
  next_payout_date: string
}

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [stats, setStats] = useState<PayoutStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterMethod, setFilterMethod] = useState<string>('all')

  useEffect(() => {
    fetchPayouts()
  }, [])

  const fetchPayouts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payouts`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      setPayouts(response.data.payouts || [])
      setStats(response.data.stats || {
        total_pending: 0,
        total_processing: 0,
        total_completed: 0,
        total_failed: 0,
        total_amount_pending: 0,
        total_amount_completed: 0,
        next_payout_date: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to fetch payouts:', error)
      // Use mock data
      setPayouts([
        {
          id: '1',
          barber_id: 1,
          barber_name: 'Marcus Johnson',
          amount: 850.00,
          fee: 8.50,
          net_amount: 841.50,
          status: 'completed',
          payment_method: 'stripe',
          payout_date: '2024-06-22',
          created_at: '2024-06-22T10:00:00Z',
          transaction_id: 'po_1234567890'
        },
        {
          id: '2',
          barber_id: 2,
          barber_name: 'Anthony Davis',
          amount: 720.00,
          fee: 7.20,
          net_amount: 712.80,
          status: 'processing',
          payment_method: 'stripe',
          payout_date: '2024-06-22',
          created_at: '2024-06-22T10:00:00Z'
        },
        {
          id: '3',
          barber_id: 3,
          barber_name: 'Jerome Williams',
          amount: 950.00,
          fee: 9.50,
          net_amount: 940.50,
          status: 'pending',
          payment_method: 'stripe',
          payout_date: '2024-06-23',
          created_at: '2024-06-22T10:00:00Z'
        }
      ])
      setStats({
        total_pending: 1,
        total_processing: 1,
        total_completed: 1,
        total_failed: 0,
        total_amount_pending: 950.00,
        total_amount_completed: 850.00,
        next_payout_date: '2024-06-23'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleProcessPayout = async (payoutId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payouts/${payoutId}/process`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchPayouts()
    } catch (error) {
      console.error('Failed to process payout:', error)
    }
  }

  const handleCancelPayout = async (payoutId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/payouts/${payoutId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchPayouts()
    } catch (error) {
      console.error('Failed to cancel payout:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'stripe':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.594-7.305h.003z"/>
          </svg>
        )
      case 'square':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.01 4.01v15.98h15.98V4.01H4.01zm7.99 12.99c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
          </svg>
        )
      case 'tremendous':
        return <BanknotesIcon className="w-5 h-5" />
      default:
        return <CurrencyDollarIcon className="w-5 h-5" />
    }
  }

  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = payout.barber_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payout.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || payout.status === filterStatus
    const matchesMethod = filterMethod === 'all' || payout.payment_method === filterMethod
    
    return matchesSearch && matchesStatus && matchesMethod
  })

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search payouts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="all">All Methods</option>
              <option value="stripe">Stripe</option>
              <option value="square">Square</option>
              <option value="tremendous">Tremendous</option>
              <option value="manual">Manual</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2">
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Export</span>
            </button>
            
            <button className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all flex items-center space-x-2">
              <PlayIcon className="h-5 w-5" />
              <span>Process Pending</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_pending || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats?.total_amount_pending || 0)}</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Processing</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_processing || 0}</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_completed || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{formatCurrency(stats?.total_amount_completed || 0)}</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl">
                <XCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Failed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total_failed || 0}</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Next Payout</p>
            <p className="text-lg font-bold text-gray-900 mt-1">
              {stats?.next_payout_date ? new Date(stats.next_payout_date).toLocaleDateString() : 'TBD'}
            </p>
          </div>
        </div>

        {/* Payouts List */}
        <div className="premium-card-modern overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200/50">
            <h3 className="text-lg font-semibold text-gray-900">Payout History</h3>
          </div>
          
          {filteredPayouts.length === 0 ? (
            <div className="p-12 text-center">
              <BanknotesIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No payouts found for the selected criteria</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200/50">
              {filteredPayouts.map((payout) => (
                <div key={payout.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                          {getMethodIcon(payout.payment_method)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{payout.barber_name}</span>
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm text-gray-500 capitalize">{payout.payment_method}</span>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-1">
                          {formatCurrency(payout.net_amount)}
                        </h4>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <CalendarIcon className="h-4 w-4 text-gray-400" />
                            <span>Payout: {new Date(payout.payout_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                            <span>Fee: {formatCurrency(payout.fee)}</span>
                          </div>
                          {payout.transaction_id && (
                            <span className="text-gray-500 font-mono text-xs">
                              {payout.transaction_id}
                            </span>
                          )}
                        </div>
                        {payout.failure_reason && (
                          <p className="text-sm text-red-600 mt-2 flex items-center space-x-1">
                            <ExclamationTriangleIcon className="h-4 w-4" />
                            <span>{payout.failure_reason}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 ml-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(payout.amount)}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(payout.status)}`}>
                          {payout.status}
                        </span>
                      </div>
                      
                      {payout.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <button 
                            onClick={() => handleProcessPayout(payout.id)}
                            className="text-emerald-600 hover:text-emerald-700 font-medium text-sm hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors"
                          >
                            Process
                          </button>
                          <button 
                            onClick={() => handleCancelPayout(payout.id)}
                            className="text-red-600 hover:text-red-700 font-medium text-sm hover:bg-red-50 px-3 py-1 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}