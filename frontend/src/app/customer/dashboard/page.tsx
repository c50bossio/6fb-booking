'use client'

import { useState, useEffect } from 'react'
import { useCustomerAuth } from '@/components/customer/CustomerAuthProvider'
import Link from 'next/link'
import { customerBookingService } from '@/lib/api/customer-booking'

interface Appointment {
  id: number
  barber_name: string
  service_name: string
  appointment_date: string
  appointment_time: string
  location_name: string
  status: 'confirmed' | 'pending' | 'cancelled'
  total_amount?: number
}

export default function CustomerDashboardPage() {
  const { customer, logout } = useCustomerAuth()
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalAppointments: 0,
    upcomingAppointments: 0,
    totalSpent: 0,
    favoriteBarber: 'None yet'
  })

  useEffect(() => {
    if (customer) {
      loadDashboardData()
    }
  }, [customer])

  const loadDashboardData = async () => {
    try {
      // Load upcoming appointments
      const appointments = await customerBookingService.getAppointments({
        status: 'confirmed',
        upcoming_only: true,
        limit: 3
      })
      setUpcomingAppointments(appointments.appointments || [])

      // Load stats
      const statsData = await customerBookingService.getCustomerStats()
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <span className="text-white font-bold text-lg">6</span>
              </div>
              <span className="text-2xl font-bold text-gray-900">6FB Booking</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Welcome back,</p>
                <p className="font-semibold text-gray-900">{customer.first_name}</p>
              </div>
              <button
                onClick={logout}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <Link href="/customer/dashboard" className="border-b-2 border-blue-500 py-4 px-1 text-blue-600 font-medium">
              Dashboard
            </Link>
            <Link href="/customer/appointments" className="border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors">
              My Appointments
            </Link>
            <Link href="/customer/history" className="border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors">
              History
            </Link>
            <Link href="/customer/profile" className="border-b-2 border-transparent py-4 px-1 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors">
              Profile
            </Link>
            <Link href="/book" className="border-b-2 border-transparent py-4 px-1 text-green-600 hover:text-green-700 hover:border-green-300 transition-colors font-medium">
              Book Appointment
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {customer.first_name}!
          </h1>
          <p className="text-gray-600">
            Here's what's happening with your appointments
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Appointments</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming</p>
                <p className="text-2xl font-bold text-gray-900">{stats.upcomingAppointments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Spent</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalSpent}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Favorite Barber</p>
                <p className="text-lg font-bold text-gray-900">{stats.favoriteBarber}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
                <Link href="/customer/appointments" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View all →
                </Link>
              </div>
            </div>
            <div className="p-6">
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900">{appointment.service_name}</h3>
                        <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          {appointment.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        With {appointment.barber_name}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
                      </p>
                      <p className="text-sm text-gray-500">
                        📍 {appointment.location_name}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming appointments</h3>
                  <p className="text-gray-500 mb-4">Book your next appointment to get started</p>
                  <Link href="/book" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Book Appointment
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <Link href="/book" className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-900">Book New Appointment</h3>
                    <p className="text-sm text-gray-500">Schedule your next visit</p>
                  </div>
                </Link>

                <Link href="/customer/appointments" className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group">
                  <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-900">Manage Appointments</h3>
                    <p className="text-sm text-gray-500">View, reschedule, or cancel</p>
                  </div>
                </Link>

                <Link href="/customer/profile" className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group">
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-900">Update Profile</h3>
                    <p className="text-sm text-gray-500">Edit personal information</p>
                  </div>
                </Link>

                <Link href="/customer/history" className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors group">
                  <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-gray-200">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="font-medium text-gray-900">View History</h3>
                    <p className="text-sm text-gray-500">See past appointments</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
