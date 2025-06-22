'use client'

import { useState } from 'react'
import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline'

interface Payout {
  id: string
  barber: string
  period: string
  appointments: number
  grossRevenue: number
  commission: number
  netPayout: number
  status: 'paid' | 'pending' | 'processing'
  paymentMethod: string
  scheduledDate: string
}

export default function PayoutsPage() {
  const [payouts] = useState<Payout[]>([
    {
      id: '1',
      barber: 'Marcus Johnson',
      period: 'Jun 16-22, 2024',
      appointments: 28,
      grossRevenue: 1680,
      commission: 70,
      netPayout: 1176,
      status: 'pending',
      paymentMethod: 'Stripe',
      scheduledDate: '2024-06-26'
    },
    {
      id: '2',
      barber: 'Anthony Davis',
      period: 'Jun 16-22, 2024',
      appointments: 24,
      grossRevenue: 1440,
      commission: 65,
      netPayout: 936,
      status: 'pending',
      paymentMethod: 'PayPal',
      scheduledDate: '2024-06-26'
    },
    {
      id: '3',
      barber: 'Jerome Williams',
      period: 'Jun 16-22, 2024',
      appointments: 32,
      grossRevenue: 1920,
      commission: 70,
      netPayout: 1344,
      status: 'pending',
      paymentMethod: 'Stripe',
      scheduledDate: '2024-06-26'
    },
    {
      id: '4',
      barber: 'Marcus Johnson',
      period: 'Jun 9-15, 2024',
      appointments: 26,
      grossRevenue: 1560,
      commission: 70,
      netPayout: 1092,
      status: 'paid',
      paymentMethod: 'Stripe',
      scheduledDate: '2024-06-19'
    },
    {
      id: '5',
      barber: 'Anthony Davis',
      period: 'Jun 9-15, 2024',
      appointments: 22,
      grossRevenue: 1320,
      commission: 65,
      netPayout: 858,
      status: 'paid',
      paymentMethod: 'PayPal',
      scheduledDate: '2024-06-19'
    }
  ])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const pendingPayouts = payouts.filter(p => p.status === 'pending')
  const totalPending = pendingPayouts.reduce((sum, p) => sum + p.netPayout, 0)
  const paidPayouts = payouts.filter(p => p.status === 'paid')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">6FB Platform</h1>
              <nav className="ml-10 flex space-x-4">
                <a href="/app" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </a>
                <a href="/app/calendar" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Calendar
                </a>
                <a href="/app/analytics" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Analytics
                </a>
                <a href="/app/barbers" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Barbers
                </a>
                <a href="/app/payments" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Payments
                </a>
                <a href="/app/payouts" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Payouts
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Demo Mode</span>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                D
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Barber Payouts</h2>
              <p className="text-gray-600 mt-1">Manage commission payments to your team</p>
            </div>
            <button className="bg-gradient-to-r from-emerald-600 to-green-600 text-white px-4 py-2 rounded-lg font-medium hover:from-emerald-700 hover:to-green-700 transition-all flex items-center space-x-2">
              <BanknotesIcon className="h-5 w-5" />
              <span>Process All Payouts</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Pending Payouts</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalPending)}</p>
            <p className="text-xs text-amber-600 mt-1">Due Thursday</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Paid This Week</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(paidPayouts.reduce((sum, p) => sum + p.netPayout, 0))}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <UserGroupIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Active Barbers</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">3</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Payout Schedule</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">Weekly</p>
            <p className="text-xs text-blue-600 mt-1">Every Thursday</p>
          </div>
        </div>

        {/* Payouts Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Payout History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barber
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payout.barber}</div>
                      <div className="text-xs text-gray-500">{payout.paymentMethod}</div>
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {payout.status === 'pending' ? (
                        <button className="text-emerald-600 hover:text-emerald-700 font-medium">
                          Pay Now
                        </button>
                      ) : (
                        <button className="text-violet-600 hover:text-violet-700 font-medium">
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
