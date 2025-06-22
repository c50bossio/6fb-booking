'use client'

import { useState } from 'react'
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ScissorsIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline'

interface Appointment {
  id: string
  time: string
  client: string
  service: string
  barber: string
  duration: number
  price: number
  status: 'confirmed' | 'completed' | 'cancelled' | 'no-show'
  phone: string
}

export default function AppointmentsPage() {
  const [selectedDate] = useState(new Date())
  const [appointments] = useState<Appointment[]>([
    {
      id: '1',
      time: '09:00 AM',
      client: 'John Smith',
      service: 'Premium Fade',
      barber: 'Marcus Johnson',
      duration: 45,
      price: 45,
      status: 'completed',
      phone: '(555) 123-4567'
    },
    {
      id: '2',
      time: '10:00 AM',
      client: 'Mike Davis',
      service: 'Beard Trim & Shape',
      barber: 'Anthony Davis',
      duration: 30,
      price: 30,
      status: 'completed',
      phone: '(555) 234-5678'
    },
    {
      id: '3',
      time: '11:00 AM',
      client: 'Chris Johnson',
      service: 'Full Service Package',
      barber: 'Jerome Williams',
      duration: 90,
      price: 85,
      status: 'completed',
      phone: '(555) 345-6789'
    },
    {
      id: '4',
      time: '01:00 PM',
      client: 'David Wilson',
      service: 'Classic Cut',
      barber: 'Marcus Johnson',
      duration: 30,
      price: 35,
      status: 'confirmed',
      phone: '(555) 456-7890'
    },
    {
      id: '5',
      time: '02:00 PM',
      client: 'Tom Brown',
      service: 'Kids Cut',
      barber: 'Anthony Davis',
      duration: 30,
      price: 25,
      status: 'confirmed',
      phone: '(555) 567-8901'
    },
    {
      id: '6',
      time: '03:00 PM',
      client: 'James Miller',
      service: 'Premium Fade + Beard',
      barber: 'Jerome Williams',
      duration: 60,
      price: 60,
      status: 'confirmed',
      phone: '(555) 678-9012'
    },
    {
      id: '7',
      time: '04:00 PM',
      client: 'Robert Garcia',
      service: 'Buzz Cut',
      barber: 'Marcus Johnson',
      duration: 20,
      price: 20,
      status: 'cancelled',
      phone: '(555) 789-0123'
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

  const completedCount = appointments.filter(a => a.status === 'completed').length
  const upcomingCount = appointments.filter(a => a.status === 'confirmed').length
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length
  const totalRevenue = appointments
    .filter(a => a.status === 'completed')
    .reduce((sum, a) => sum + a.price, 0)

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
                <a href="/app/appointments" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Appointments
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
              <h2 className="text-3xl font-bold text-gray-900">Today's Appointments</h2>
              <p className="text-gray-600 mt-1">Saturday, June 22, 2024</p>
            </div>
            <button className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all">
              Book Appointment
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Total Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{appointments.length}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{completedCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Upcoming</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{upcomingCount}</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <ExclamationCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Appointment Schedule</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {appointments.map((appointment) => (
              <div key={appointment.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`w-2 h-16 rounded-full ${
                        appointment.status === 'completed' ? 'bg-green-500' :
                        appointment.status === 'confirmed' ? 'bg-blue-500' :
                        appointment.status === 'cancelled' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <ClockIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{appointment.time}</span>
                        <span className="text-sm text-gray-500">({appointment.duration} min)</span>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-1">{appointment.client}</h4>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                          <ScissorsIcon className="h-4 w-4 text-gray-400" />
                          <span>{appointment.service}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <UserIcon className="h-4 w-4 text-gray-400" />
                          <span>{appointment.barber}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(appointment.price)}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                        appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                    {appointment.status === 'confirmed' && (
                      <div className="flex items-center space-x-2">
                        <button className="text-emerald-600 hover:text-emerald-700 font-medium text-sm">
                          Check In
                        </button>
                        <span className="text-gray-300">|</span>
                        <button className="text-red-600 hover:text-red-700 font-medium text-sm">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
