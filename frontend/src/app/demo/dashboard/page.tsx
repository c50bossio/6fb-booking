'use client'

import { useState } from 'react'
import {
  ChartBarIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import {
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/solid'

export default function DemoDashboard() {
  const [timeRange, setTimeRange] = useState('week')

  const stats = [
    {
      name: 'Total Revenue',
      value: '$12,495',
      change: '+15.2%',
      changeType: 'positive',
      icon: CurrencyDollarIcon,
      period: 'this month'
    },
    {
      name: 'Appointments',
      value: '324',
      change: '-2.1%',
      changeType: 'negative',
      icon: CalendarDaysIcon,
      period: 'this month'
    },
    {
      name: 'Active Barbers',
      value: '12',
      change: '+1',
      changeType: 'positive',
      icon: UserGroupIcon,
      period: 'this month'
    },
    {
      name: 'Completion Rate',
      value: '94.8%',
      change: '+3.2%',
      changeType: 'positive',
      icon: CheckCircleIcon,
      period: 'this month'
    }
  ]

  const recentBookings = [
    {
      id: 1,
      client: 'John Smith',
      barber: 'Marcus Johnson',
      service: 'Premium Cut',
      time: '10:00 AM',
      status: 'confirmed',
      price: '$65'
    },
    {
      id: 2,
      client: 'Sarah Davis',
      barber: 'Alex Williams',
      service: 'Color + Cut',
      time: '11:30 AM',
      status: 'in-progress',
      price: '$120'
    },
    {
      id: 3,
      client: 'Mike Johnson',
      barber: 'Marcus Johnson',
      service: 'Beard Trim',
      time: '1:00 PM',
      status: 'pending',
      price: '$35'
    },
    {
      id: 4,
      client: 'Emily Brown',
      barber: 'Jessica Lee',
      service: 'Full Service',
      time: '2:30 PM',
      status: 'confirmed',
      price: '$85'
    },
    {
      id: 5,
      client: 'David Wilson',
      barber: 'Alex Williams',
      service: 'Haircut',
      time: '4:00 PM',
      status: 'confirmed',
      price: '$45'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  return (
    <div className="relative min-h-full">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-20">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-violet-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>
      </div>

      <div className="relative z-10 p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-500">
              Welcome back! Here's what's happening with your business today.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.name}
                className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-500">{stat.name}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    {stat.changeType === 'positive' ? (
                      <TrendingUpIcon className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDownIcon className="h-4 w-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        stat.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {stat.change}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-500">{stat.period}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl shadow-lg">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Bookings</h2>
              <button className="premium-button-sm">
                View All
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Barber
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{booking.client}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900 dark:text-gray-400">{booking.barber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900 dark:text-gray-400">{booking.service}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-gray-900 dark:text-gray-400">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {booking.time}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900 dark:text-white">{booking.price}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg">
                <CalendarDaysIcon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Schedule Appointment</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-500 text-sm mb-4">
              Book a new appointment for your clients
            </p>
            <button className="w-full premium-button-sm">
              Create Appointment
            </button>
          </div>

          <div className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <UserGroupIcon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Barbers</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-500 text-sm mb-4">
              Add or update barber information
            </p>
            <button className="w-full premium-button-sm">
              Manage Team
            </button>
          </div>

          <div className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg">
                <ChartBarIcon className="h-5 w-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">View Analytics</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-500 text-sm mb-4">
              Analyze your business performance
            </p>
            <button className="w-full premium-button-sm">
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
