'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import axios from 'axios'
import { loadStripe } from '@stripe/stripe-js'
import {
  ArrowLeftIcon,
  CreditCardIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  PlusIcon,
  TrashIcon,
  CurrencyDollarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Payment {
  id: string
  appointment_id?: string
  amount: number
  currency: string
  status: string
  payment_method: string
  created_at: string
  description: string
}

interface BarberPaymentModel {
  barber_id: number
  barber_name: string
  payment_type: string
  commission_rate: string
  stripe_connected: boolean
  square_connected: boolean
}

interface PaymentSplit {
  total: number
  barber_gets: number
  shop_gets: number
  commission_rate: string
  client_name?: string
  barber_name?: string
  service_name?: string
  tip_amount?: number
}

interface PaymentMethod {
  id: string
  type: string
  card?: {
    brand: string
    last4: string
    exp_month: number
    exp_year: number
  }
  is_default: boolean
}

interface PaymentStats {
  total_payments: number
  total_amount: number
  successful_payments: number
  failed_payments: number
  pending_payments: number
  total_tips: number
}

export default function PaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [stats, setStats] = useState<PaymentStats | null>(null)
  const [timeRange, setTimeRange] = useState('30')
  const [currentTime, setCurrentTime] = useState(new Date())
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchPaymentData()
  }, [timeRange])

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchPaymentData = async () => {
    try {
      const token = localStorage.getItem('access_token')
      if (!token) {
        router.push('/login')
        return
      }

      const headers = { Authorization: `Bearer ${token}` }
      const params = { days: timeRange, limit: 50 }

      const [paymentsRes, methodsRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/payments`, { headers, params }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/payments/payment-methods`, { headers })
      ])

      const paymentsData = paymentsRes.data.payments || []
      setPayments(paymentsData)
      setPaymentMethods(methodsRes.data.payment_methods || [])

      // Calculate stats
      const stats: PaymentStats = {
        total_payments: paymentsData.length,
        total_amount: paymentsData.reduce((sum: number, p: Payment) => sum + p.amount, 0),
        successful_payments: paymentsData.filter((p: Payment) => p.status === 'succeeded').length,
        failed_payments: paymentsData.filter((p: Payment) => p.status === 'failed').length,
        pending_payments: paymentsData.filter((p: Payment) => p.status === 'pending').length,
        total_tips: paymentsData.reduce((sum: number, p: Payment) => sum + (p.tip_amount || 0), 0)
      }
      setStats(stats)

    } catch (error) {
      console.error('Failed to fetch payment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount / 100) // Convert from cents
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'succeeded':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircleIcon className="h-5 w-5 text-red-500" />
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />
      default:
        return <ClockIcon className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      succeeded: 'bg-green-500/20 text-green-400 border-green-500/30',
      failed: 'bg-red-500/20 text-red-400 border-red-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    }

    return (
      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${styles[status as keyof typeof styles] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  const handleDeletePaymentMethod = async (methodId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/payment-methods/${methodId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchPaymentData() // Refresh data
    } catch (error) {
      console.error('Failed to delete payment method:', error)
    }
  }

  const handleSetDefaultPaymentMethod = async (methodId: string) => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/payments/payment-methods/${methodId}/default`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchPaymentData() // Refresh data
    } catch (error) {
      console.error('Failed to set default payment method:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading payments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4">
              <a
                href="/dashboard"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </a>
              <Image
                src="/6fb-logo.png"
                alt="6FB Logo"
                width={60}
                height={60}
                className="rounded-full"
              />
              <div>
                <h1 className="text-xl font-bold text-white">Payment Center</h1>
                <p className="text-xs text-gray-400">Secure Payment Processing</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
              >
                <option value="7">Last 7 Days</option>
                <option value="30">Last 30 Days</option>
                <option value="90">Last 90 Days</option>
                <option value="365">Last Year</option>
              </select>
              
              <div className="text-right">
                <p className="text-sm text-gray-400">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
                <p className="text-lg font-semibold text-white">
                  {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Payment Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(stats?.total_amount || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">{stats?.total_payments || 0} payments</p>
              </div>
              <BanknotesIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Successful</p>
                <p className="text-2xl font-bold text-green-400">{stats?.successful_payments || 0}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.total_payments ? ((stats.successful_payments / stats.total_payments) * 100).toFixed(1) : 0}% success rate
                </p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Tips Collected</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {formatCurrency(stats?.total_tips || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Extra earnings</p>
              </div>
              <CreditCardIcon className="h-8 w-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-400">Failed/Pending</p>
                <p className="text-2xl font-bold text-red-400">
                  {(stats?.failed_payments || 0) + (stats?.pending_payments || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">Need attention</p>
              </div>
              <XCircleIcon className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Payment Methods Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">Payment Methods</h3>
            <button
              onClick={() => setShowAddPaymentMethod(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Payment Method
            </button>
          </div>

          {paymentMethods.length === 0 ? (
            <div className="text-center py-8">
              <CreditCardIcon className="mx-auto h-12 w-12 text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-300">No payment methods</h3>
              <p className="mt-1 text-sm text-gray-500">Add a payment method to process payments.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentMethods.map((method) => (
                <div key={method.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CreditCardIcon className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-white">
                          {method.card?.brand?.toUpperCase()} •••• {method.card?.last4}
                        </p>
                        <p className="text-xs text-gray-400">
                          Expires {method.card?.exp_month}/{method.card?.exp_year}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {method.is_default && (
                        <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                          Default
                        </span>
                      )}
                      <button
                        onClick={() => !method.is_default && handleSetDefaultPaymentMethod(method.id)}
                        className="text-xs text-blue-400 hover:text-blue-300"
                        disabled={method.is_default}
                      >
                        {method.is_default ? 'Default' : 'Set Default'}
                      </button>
                      <button
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white">Recent Payments</h3>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center">
              <BanknotesIcon className="mx-auto h-12 w-12 text-gray-600" />
              <h3 className="mt-2 text-sm font-medium text-gray-300">No payments</h3>
              <p className="mt-1 text-sm text-gray-500">Payment history will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Tip
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{formatDate(payment.created_at)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white">{payment.description}</div>
                        {payment.client_name && (
                          <div className="text-xs text-gray-400">
                            {payment.client_name} • {payment.barber_name}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-green-400">
                          {formatCurrency(payment.amount)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-yellow-400">
                          {payment.tip_amount ? formatCurrency(payment.tip_amount) : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-300 capitalize">
                          {payment.payment_method}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button className="text-blue-400 hover:text-blue-300">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}