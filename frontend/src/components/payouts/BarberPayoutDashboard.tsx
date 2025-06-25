'use client'

import { useState } from 'react'
import {
  CurrencyDollarIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface BarberMetrics {
  totalEarnings: number
  pendingPayout: number
  lastPayout: {
    amount: number
    date: string
  }
  nextPayout: {
    amount: number
    date: string
  }
  commissionRate: number
  paymentMethod: string
  bankAccountLast4: string
}

interface PayoutHistory {
  id: string
  date: string
  period: string
  appointments: number
  grossRevenue: number
  commission: number
  netPayout: number
  status: 'paid' | 'pending' | 'processing'
  paymentMethod: string
}

interface EarningsTrend {
  week: string
  earnings: number
  appointments: number
}

export default function BarberPayoutDashboard({ barberId = 'barber_1' }: { barberId?: string }) {
  const [metrics] = useState<BarberMetrics>({
    totalEarnings: 24580,
    pendingPayout: 1176,
    lastPayout: {
      amount: 1092,
      date: '2024-06-19'
    },
    nextPayout: {
      amount: 1176,
      date: '2024-06-26'
    },
    commissionRate: 70,
    paymentMethod: 'Stripe',
    bankAccountLast4: '4242'
  })

  const [payoutHistory] = useState<PayoutHistory[]>([
    {
      id: '1',
      date: '2024-06-19',
      period: 'Jun 9-15, 2024',
      appointments: 26,
      grossRevenue: 1560,
      commission: 70,
      netPayout: 1092,
      status: 'paid',
      paymentMethod: 'Stripe'
    },
    {
      id: '2',
      date: '2024-06-12',
      period: 'Jun 2-8, 2024',
      appointments: 24,
      grossRevenue: 1440,
      commission: 70,
      netPayout: 1008,
      status: 'paid',
      paymentMethod: 'Stripe'
    },
    {
      id: '3',
      date: '2024-06-05',
      period: 'May 26 - Jun 1, 2024',
      appointments: 28,
      grossRevenue: 1680,
      commission: 70,
      netPayout: 1176,
      status: 'paid',
      paymentMethod: 'Stripe'
    }
  ])

  const [earningsTrend] = useState<EarningsTrend[]>([
    { week: 'Week 1', earnings: 1050, appointments: 25 },
    { week: 'Week 2', earnings: 1176, appointments: 28 },
    { week: 'Week 3', earnings: 1008, appointments: 24 },
    { week: 'Week 4', earnings: 1092, appointments: 26 },
    { week: 'Week 5', earnings: 1176, appointments: 28 },
    { week: 'Week 6', earnings: 1260, appointments: 30 }
  ])

  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month')

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const downloadStatement = () => {
    console.log('Downloading earnings statement...')
  }

  const updatePaymentMethod = () => {
    console.log('Opening payment method update modal...')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Payouts</h2>
          <p className="text-gray-600 mt-1">Track your earnings and payment history</p>
        </div>
        <button
          onClick={downloadStatement}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <DocumentArrowDownIcon className="h-4 w-4" />
          <span>Download Statement</span>
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Earnings (YTD)</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(metrics.totalEarnings)}</p>
          <p className="text-xs text-emerald-600 mt-1 flex items-center">
            <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
            +15% from last year
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
              <ClockIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Pending Payout</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(metrics.pendingPayout)}</p>
          <p className="text-xs text-amber-600 mt-1">Due {formatDate(metrics.nextPayout.date)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
              <BanknotesIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Last Payout</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(metrics.lastPayout.amount)}</p>
          <p className="text-xs text-gray-500 mt-1">{formatDate(metrics.lastPayout.date)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Commission Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.commissionRate}%</p>
          <p className="text-xs text-blue-600 mt-1">Professional tier</p>
        </div>
      </div>

      {/* Payment Method Card */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gray-100 rounded-xl">
              <CreditCardIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Payment Method</p>
              <p className="text-sm text-gray-600">
                {metrics.paymentMethod} ending in {metrics.bankAccountLast4}
              </p>
            </div>
          </div>
          <button
            onClick={updatePaymentMethod}
            className="text-sm text-violet-600 hover:text-violet-700 font-medium"
          >
            Update
          </button>
        </div>
      </div>

      {/* Earnings Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Earnings Trend</h3>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
          </select>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={earningsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => `$${value}`} />
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
              />
              <Line
                type="monotone"
                dataKey="earnings"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ fill: '#7c3aed', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Appointments vs Earnings */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Appointments & Earnings</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={earningsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="week" stroke="#6b7280" />
              <YAxis yAxisId="left" stroke="#6b7280" />
              <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
              <Tooltip
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
              />
              <Bar yAxisId="left" dataKey="appointments" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              <Bar yAxisId="left" dataKey="earnings" fill="#7c3aed" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
            <span className="text-xs text-gray-600">Appointments</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-violet-600 rounded-full"></div>
            <span className="text-xs text-gray-600">Earnings</span>
          </div>
        </div>
      </div>

      {/* Payout History Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Payout History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Appointments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Payout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payoutHistory.map((payout) => (
                <tr key={payout.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(payout.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payout.period}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payout.appointments}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(payout.grossRevenue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payout.commission}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {formatCurrency(payout.netPayout)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      payout.status === 'paid' ? 'bg-green-100 text-green-800' :
                      payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {payout.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
