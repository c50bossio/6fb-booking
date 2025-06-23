'use client'

import { useEffect, useState } from 'react'
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ScissorsIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'
import { format } from 'date-fns'

interface Appointment {
  id: string
  appointment_date: string
  appointment_time: string
  client_name: string
  client_email?: string
  client_phone?: string
  service_name: string
  barber_name: string
  duration: number
  price: number
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
}

interface AppointmentStats {
  total: number
  upcoming: number
  completed: number
  cancelled: number
  revenue: number
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [stats, setStats] = useState<AppointmentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    fetchAppointments()
  }, [selectedDate])

  const fetchAppointments = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('access_token')

      // Format date for API
      const dateStr = format(selectedDate, 'yyyy-MM-dd')

      // Fetch appointments
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/appointments`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { date: dateStr }
        }
      )

      setAppointments(response.data.appointments || [])
      setStats(response.data.stats || {
        total: 0,
        upcoming: 0,
        completed: 0,
        cancelled: 0,
        revenue: 0
      })
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
      // Use mock data if API fails
      setAppointments([
        {
          id: '1',
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: '09:00',
          client_name: 'John Smith',
          client_email: 'john@example.com',
          client_phone: '(555) 123-4567',
          service_name: 'Premium Fade',
          barber_name: 'Marcus Johnson',
          duration: 45,
          price: 45,
          status: 'completed',
          notes: 'Regular client, prefers low fade'
        },
        {
          id: '2',
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: '10:00',
          client_name: 'Mike Davis',
          service_name: 'Beard Trim & Shape',
          barber_name: 'Anthony Davis',
          duration: 30,
          price: 30,
          status: 'completed'
        },
        {
          id: '3',
          appointment_date: format(selectedDate, 'yyyy-MM-dd'),
          appointment_time: '14:00',
          client_name: 'Chris Johnson',
          service_name: 'Full Service Package',
          barber_name: 'Jerome Williams',
          duration: 90,
          price: 85,
          status: 'confirmed'
        }
      ])
      setStats({
        total: 3,
        upcoming: 1,
        completed: 2,
        cancelled: 0,
        revenue: 75
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (appointmentId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('access_token')
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/appointments/${appointmentId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Refresh appointments
      fetchAppointments()
    } catch (error) {
      console.error('Failed to update appointment status:', error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'confirmed':
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'no_show':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         apt.barber_name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesFilter = filterStatus === 'all' || apt.status === filterStatus

    return matchesSearch && matchesFilter
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
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>

            <button className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all flex items-center space-x-2">
              <PlusIcon className="h-5 w-5" />
              <span>New Appointment</span>
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
                <CalendarIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Total Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.total || 0}</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                <ClockIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Upcoming</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.upcoming || 0}</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl">
                <CheckCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Completed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.completed || 0}</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl">
                <XCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Cancelled</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats?.cancelled || 0}</p>
          </div>

          <div className="premium-card-modern p-6 hover-lift">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl">
                <ExclamationCircleIcon className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600">Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(stats?.revenue || 0)}</p>
          </div>
        </div>

        {/* Appointments List */}
        <div className="premium-card-modern overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200/50">
            <h3 className="text-lg font-semibold text-gray-900">Appointment Schedule</h3>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="p-12 text-center">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No appointments found for the selected criteria</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200/50">
              {filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="p-6 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <div className={`w-2 h-16 rounded-full ${
                          appointment.status === 'completed' ? 'bg-green-500' :
                          appointment.status === 'confirmed' || appointment.status === 'scheduled' ? 'bg-blue-500' :
                          appointment.status === 'cancelled' ? 'bg-red-500' :
                          'bg-gray-500'
                        }`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <ClockIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{formatTime(appointment.appointment_time)}</span>
                          <span className="text-sm text-gray-500">({appointment.duration} min)</span>
                        </div>
                        <h4 className="text-lg font-medium text-gray-900 mb-1">{appointment.client_name}</h4>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <ScissorsIcon className="h-4 w-4 text-gray-400" />
                            <span>{appointment.service_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span>{appointment.barber_name}</span>
                          </div>
                          {appointment.client_phone && (
                            <span className="text-gray-500">{appointment.client_phone}</span>
                          )}
                        </div>
                        {appointment.notes && (
                          <p className="text-sm text-gray-500 mt-2">{appointment.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 ml-4">
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(appointment.price)}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                          {appointment.status.replace('_', ' ')}
                        </span>
                      </div>

                      {(appointment.status === 'confirmed' || appointment.status === 'scheduled') && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleStatusUpdate(appointment.id, 'completed')}
                            className="text-emerald-600 hover:text-emerald-700 font-medium text-sm hover:bg-emerald-50 px-3 py-1 rounded-lg transition-colors"
                          >
                            Check In
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(appointment.id, 'cancelled')}
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
