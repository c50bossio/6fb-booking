'use client'

import { useState, useEffect } from 'react'
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  TrendingUpIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

interface PayoutMetrics {
  totalPaidOut: number
  totalPendingPayouts: number
  averagePayoutAmount: number
  payoutFrequency: number
  topEarningBarber: string
  paymentMethodBreakdown: { method: string; count: number; amount: number }[]
}

interface PayoutTrend {
  date: string
  amount: number
  count: number
}

export default function PayoutAnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')
  const [metrics, setMetrics] = useState<PayoutMetrics>({
    totalPaidOut: 127650,
    totalPendingPayouts: 4560,
    averagePayoutAmount: 1120,
    payoutFrequency: 52,
    topEarningBarber: 'Marcus Johnson',
    paymentMethodBreakdown: [
      { method: 'Stripe', count: 78, amount: 89550 },
      { method: 'PayPal', count: 32, amount: 28100 },
      { method: 'Bank Transfer', count: 4, amount: 10000 }
    ]
  })

  const [payoutTrends] = useState<PayoutTrend[]>([
    { date: 'Jan', amount: 18500, count: 12 },
    { date: 'Feb', amount: 21200, count: 14 },
    { date: 'Mar', amount: 19800, count: 13 },
    { date: 'Apr', amount: 23400, count: 15 },
    { date: 'May', amount: 22100, count: 14 },
    { date: 'Jun', amount: 24650, count: 16 }
  ])

  const [barberPayouts] = useState([
    { name: 'Marcus Johnson', amount: 42300, percentage: 33 },
    { name: 'Anthony Davis', amount: 35200, percentage: 28 },
    { name: 'Jerome Williams', amount: 31150, percentage: 24 },
    { name: 'Michael Brown', amount: 19000, percentage: 15 }
  ])

  const COLORS = ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd']

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const exportData = () => {
    // Simulate data export
    console.log('Exporting payout data...')
  }

  return (
    <div className="space-y-6">
      {/* Header with Time Range Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payout Analytics</h2>
          <p className="text-gray-600 mt-1">Track payout trends and barber earnings</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
          >
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          <button
            onClick={exportData}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
              <CurrencyDollarIcon className="h-6 w-6 text-white" />
            </div>
            <span className="text-sm font-medium text-emerald-600">+12.5%</span>
          </div>
          <p className="text-sm font-medium text-gray-600">Total Paid Out</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(metrics.totalPaidOut)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
              <CalendarDaysIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(metrics.totalPendingPayouts)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
              <ChartBarIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Average Payout</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(metrics.averagePayoutAmount)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
              <UserGroupIcon className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600">Top Earner</p>
          <p className="text-lg font-bold text-gray-900 mt-1">{metrics.topEarningBarber}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payout Trends Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={payoutTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={{ fill: '#7c3aed', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Method Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={metrics.paymentMethodBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, amount }) => `${method}: ${formatCurrency(amount)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {metrics.paymentMethodBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Barber Earnings Breakdown */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Barber Earnings Distribution</h3>
        <div className="space-y-4">
          {barberPayouts.map((barber, index) => (
            <div key={barber.name} className="flex items-center">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">{barber.name}</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(barber.amount)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${barber.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length]
                    }}
                  />
                </div>
              </div>
              <span className="ml-4 text-sm text-gray-600 w-12 text-right">{barber.percentage}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Payout Volume</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={payoutTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" tickFormatter={(value) => `$${value / 1000}k`} />
              <Tooltip
                formatter={(value: any) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}
              />
              <Bar dataKey="amount" fill="#7c3aed" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
