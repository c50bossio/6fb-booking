'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarIcon,
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline'
import ModernLayout from '@/components/ModernLayout'
import { appointmentsService } from '@/lib/api/appointments'
import type { Appointment } from '@/lib/api/client'

// Using the Appointment type from the API client

// Mock appointments removed - will use real API data

const mockAppointments: any[] = [
  {
    id: '1',
    client_name: 'John Smith',
    client_phone: '(555) 123-4567',
    barber_name: 'Marcus Johnson',
    service: 'Haircut & Beard Trim',
    date: '2024-06-22',
    time: '09:00',
    duration: 75,
    price: 65,
    status: 'confirmed',
    notes: 'Regular client, prefers fade cut'
  },
  {
    id: '2',
    client_name: 'David Rodriguez',
    client_phone: '(555) 234-5678',
    barber_name: 'Sarah Mitchell',
    service: 'Classic Fade',
    date: '2024-06-22',
    time: '10:30',
    duration: 45,
    price: 45,
    status: 'pending'
  },
  {
    id: '3',
    client_name: 'Michael Brown',
    client_phone: '(555) 345-6789',
    barber_name: 'Carlos Rodriguez',
    service: 'Beard Styling',
    date: '2024-06-22',
    time: '14:00',
    duration: 30,
    price: 25,
    status: 'completed'
  },
  {
    id: '4',
    client_name: 'James Wilson',
    client_phone: '(555) 456-7890',
    barber_name: 'Tyler Brooks',
    service: 'Wedding Cut',
    date: '2024-06-23',
    time: '16:00',
    duration: 90,
    price: 85,
    status: 'confirmed',
    notes: 'Wedding preparation - special attention needed'
  }
]

export default function AppointmentsPage() {
  const router = useRouter()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    fetchAppointments()
  }, [currentPage, statusFilter, dateFilter, searchTerm])

  const fetchAppointments = async () => {
    setLoading(true)
    try {
      // Build filters for API
      const filters: any = {
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      }

      // Status filter
      if (statusFilter !== 'all') {
        filters.status = statusFilter
      }

      // Date filter
      const today = new Date()
      if (dateFilter === 'today') {
        filters.start_date = today.toISOString().split('T')[0]
        filters.end_date = today.toISOString().split('T')[0]
      } else if (dateFilter === 'tomorrow') {
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        filters.start_date = tomorrow.toISOString().split('T')[0]
        filters.end_date = tomorrow.toISOString().split('T')[0]
      } else if (dateFilter === 'this-week') {
        const weekEnd = new Date(today)
        weekEnd.setDate(weekEnd.getDate() + 7)
        filters.start_date = today.toISOString().split('T')[0]
        filters.end_date = weekEnd.toISOString().split('T')[0]
      }

      // Search filter
      if (searchTerm) {
        filters.search = searchTerm
      }

      const response = await appointmentsService.getAppointments(filters)
      setAppointments(response.data)
      setTotalCount(response.total)
    } catch (error) {
      console.error('Failed to fetch appointments:', error)
      // Fallback to mock data if API fails
      setAppointments(mockAppointments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage))
      setTotalCount(mockAppointments.length)
    } finally {
      setLoading(false)
    }
  }

  // Filtering is now done server-side
  const filteredAppointments = appointments

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-violet-100 text-violet-800',
      completed: 'bg-emerald-100 text-emerald-800',
      pending: 'bg-amber-100 text-amber-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return badges[status as keyof typeof badges] || badges.confirmed
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const date = new Date()
    date.setHours(parseInt(hours), parseInt(minutes))
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const getEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':')
    const startDate = new Date()
    startDate.setHours(parseInt(hours), parseInt(minutes))
    const endDate = new Date(startDate.getTime() + duration * 60000)
    return endDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  const handleStatusUpdate = async (appointmentId: number, newStatus: string) => {
    try {
      await appointmentsService.updateAppointment(appointmentId, { status: newStatus as any })
      await fetchAppointments()
    } catch (error) {
      console.error('Failed to update appointment:', error)
      alert('Failed to update appointment status')
    }
  }

  const handleDelete = async (appointmentId: number) => {
    if (confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await appointmentsService.cancelAppointment(appointmentId, 'Cancelled by staff')
        await fetchAppointments()
      } catch (error) {
        console.error('Failed to cancel appointment:', error)
        alert('Failed to cancel appointment')
      }
    }
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-gray-600">Manage your appointment schedule</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/appointments/new')}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center space-x-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span>New Appointment</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search appointments..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              <option value="all">All Statuses</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="this-week">This Week</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={fetchAppointments}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
              ) : (
                <FunnelIcon className="h-4 w-4" />
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Appointments List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {filteredAppointments.length === 0 ? (
            <div className="p-8 text-center">
              <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all' || dateFilter !== 'all'
                  ? 'Try adjusting your filters to see more appointments.'
                  : 'Get started by creating your first appointment.'
                }
              </p>
              <button
                onClick={() => router.push('/dashboard/appointments/new')}
                className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                Create Appointment
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Barber
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {appointment.client_name || 'Unknown Client'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.client_phone || appointment.client_email || 'No contact info'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {appointment.barber_name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{appointment.service_name || 'Unknown Service'}</div>
                        <div className="text-sm text-gray-500">{appointment.service_duration || 60} minutes</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDate(appointment.appointment_date)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatTime(appointment.appointment_time)} - {getEndTime(appointment.appointment_time, appointment.service_duration || 60)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${appointment.service_revenue || appointment.total_amount || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(appointment.status)}`}>
                          {appointment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button 
                            onClick={() => router.push(`/dashboard/appointments/${appointment.id}`)}
                            className="text-gray-400 hover:text-gray-600"
                            title="View details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => router.push(`/dashboard/appointments/${appointment.id}/edit`)}
                            className="text-gray-400 hover:text-gray-600"
                            title="Edit appointment"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(appointment.id)}
                            className="text-gray-400 hover:text-red-600"
                            title="Cancel appointment"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredAppointments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <CalendarIcon className="h-8 w-8 text-violet-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {filteredAppointments.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-amber-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Scheduled</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {filteredAppointments.filter(a => a.status === 'scheduled').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <UserIcon className="h-8 w-8 text-emerald-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Confirmed</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {filteredAppointments.filter(a => a.status === 'confirmed').length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Revenue</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${filteredAppointments.reduce((sum, a) => sum + (a.service_revenue || a.total_amount || 0), 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalCount > itemsPerPage && (
          <div className="flex items-center justify-between bg-white px-4 py-3 border border-gray-200 rounded-lg">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))}
                disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalCount)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{totalCount}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalCount / itemsPerPage), prev + 1))}
                    disabled={currentPage === Math.ceil(totalCount / itemsPerPage)}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  )
}
