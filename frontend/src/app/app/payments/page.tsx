'use client'

import { useState } from 'react'
import { 
  CreditCardIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'

interface Payment {
  id: string
  date: string
  time: string
  client: string
  service: string
  barber: string
  amount: number
  tip: number
  method: 'card' | 'cash' | 'app'
  status: 'completed' | 'pending' | 'failed'
}

export default function PaymentsPage() {
  const [payments] = useState<Payment[]>([
    {
      id: '1',
      date: '2024-06-22',
      time: '2:30 PM',
      client: 'Michael Brown',
      service: 'Premium Fade + Beard',
      barber: 'Marcus Johnson',
      amount: 60,
      tip: 15,
      method: 'card',
      status: 'completed'
    },
    {
      id: '2',
      date: '2024-06-22',
      time: '1:45 PM',
      client: 'James Wilson',
      service: 'Classic Cut',
      barber: 'Anthony Davis',
      amount: 35,
      tip: 10,
      method: 'app',
      status: 'completed'
    },
    {
      id: '3',
      date: '2024-06-22',
      time: '12:00 PM',
      client: 'Robert Taylor',
      service: 'Full Service Package',
      barber: 'Jerome Williams',
      amount: 85,
      tip: 20,
      method: 'card',
      status: 'completed'
    },
    {
      id: '4',
      date: '2024-06-22',
      time: '11:15 AM',
      client: 'David Martinez',
      service: 'Kids Cut',
      barber: 'Marcus Johnson',
      amount: 25,
      tip: 5,
      method: 'cash',
      status: 'completed'
    },
    {
      id: '5',
      date: '2024-06-22',
      time: '10:30 AM',
      client: 'William Garcia',
      service: 'Beard Trim',
      barber: 'Anthony Davis',
      amount: 30,
      tip: 0,
      method: 'card',
      status: 'pending'
    }
  ])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount + p.tip, 0)
  const completedPayments = payments.filter(p => p.status === 'completed')
  const pendingPayments = payments.filter(p => p.status === 'pending')

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
                <a href="/app/payments" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Payments
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
              <h2 className="text-3xl font-bold text-gray-900">Payment Processing</h2>
              <p className="text-gray-600 mt-1">Track and manage all transactions</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="bg-white text-gray-700 px-4 py-2 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-all flex items-center space-x-2">
                <FunnelIcon className="h-5 w-5" />
                <span>Filter</span>
              </button>
              <button className="bg-white text-gray-700 px-4 py-2 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 transition-all flex items-center space-x-2">
                <ArrowDownTrayIcon className="h-5 w-5" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                <CreditCardIcon className="h-6 w-6 text-white" />
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                +12.5%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-600">Today's Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{completedPayments.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Pending</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{pendingPayments.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <CreditCardIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Avg Transaction</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {formatCurrency(totalRevenue / payments.length)}
            </p>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barber
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.client}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.service}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.barber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{formatCurrency(payment.amount)}</div>
                        {payment.tip > 0 && (
                          <div className="text-xs text-gray-500">+ {formatCurrency(payment.tip)} tip</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                        payment.method === 'card' ? 'bg-blue-100 text-blue-800' :
                        payment.method === 'cash' ? 'bg-gray-100 text-gray-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {payment.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
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