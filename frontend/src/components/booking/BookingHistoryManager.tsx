'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline'
import {
  recurringBookingsService,
  type RecurringBookingSeries,
  type SeriesAppointment,
  SeriesStatus
} from '@/lib/api/recurring-bookings'
import { appointmentsService, type Appointment } from '@/lib/api/appointments'

interface BookingHistoryManagerProps {
  clientEmail?: string
  barberId?: number
  enableRecurringView?: boolean
  enableActions?: boolean
  theme?: 'light' | 'dark'
  onAppointmentClick?: (appointment: Appointment | SeriesAppointment) => void
  onSeriesClick?: (series: RecurringBookingSeries) => void
}

type BookingType = 'all' | 'single' | 'recurring'
type BookingStatus = 'all' | 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'

export default function BookingHistoryManager({
  clientEmail,
  barberId,
  enableRecurringView = true,
  enableActions = true,
  theme = 'light',
  onAppointmentClick,
  onSeriesClick
}: BookingHistoryManagerProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [recurringSeries, setRecurringSeries] = useState<RecurringBookingSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [bookingType, setBookingType] = useState<BookingType>('all')
  const [statusFilter, setStatusFilter] = useState<BookingStatus>('all')
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)

  useEffect(() => {
    loadBookingData()
  }, [clientEmail, barberId, dateRange, statusFilter])

  const loadBookingData = async () => {
    try {
      setLoading(true)
      setError(null)

      const promises: Promise<any>[] = []

      // Load single appointments
      if (bookingType === 'all' || bookingType === 'single') {
        promises.push(
          appointmentsService.getAppointments({
            start_date: dateRange.start,
            end_date: dateRange.end,
            status: statusFilter === 'all' ? undefined : statusFilter,
            barber_id: barberId,
            search: clientEmail,
            limit: 100
          })
        )
      }

      // Load recurring series
      if (enableRecurringView && (bookingType === 'all' || bookingType === 'recurring')) {
        promises.push(
          recurringBookingsService.getAllSeries({
            start_date: dateRange.start,
            end_date: dateRange.end,
            barber_id: barberId,
            client_email: clientEmail,
            limit: 50
          })
        )
      }

      const results = await Promise.all(promises)

      if (bookingType === 'all' || bookingType === 'single') {
        setAppointments(results[0]?.data || [])
      }

      if (enableRecurringView && (bookingType === 'all' || bookingType === 'recurring')) {
        const seriesIndex = bookingType === 'single' ? 0 : (bookingType === 'recurring' ? 0 : 1)
        setRecurringSeries(results[seriesIndex]?.data || [])
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load booking data')
      console.error('Error loading booking data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRescheduleAppointment = async (appointmentId: number, newDate: string, newTime: string) => {
    try {
      await appointmentsService.rescheduleAppointment(appointmentId, newDate, newTime, 'Rescheduled by customer')
      await loadBookingData()
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule appointment')
    }
  }

  const handleCancelAppointment = async (appointmentId: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    try {
      await appointmentsService.cancelAppointment(appointmentId, 'Cancelled by customer')
      await loadBookingData()
    } catch (err: any) {
      alert(err.message || 'Failed to cancel appointment')
    }
  }

  const handleManageSeries = (series: RecurringBookingSeries) => {
    // Open series management page in new tab
    window.open(`/subscription/${series.series_token}`, '_blank')
    onSeriesClick?.(series)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme === 'dark' ? 'bg-green-900/20 text-green-300' : 'bg-green-100 text-green-800'
      case 'confirmed':
      case 'scheduled':
        return theme === 'dark' ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return theme === 'dark' ? 'bg-red-900/20 text-red-300' : 'bg-red-100 text-red-800'
      case 'no_show':
        return theme === 'dark' ? 'bg-gray-900/20 text-gray-300' : 'bg-gray-100 text-gray-800'
      case SeriesStatus.ACTIVE:
        return theme === 'dark' ? 'bg-green-900/20 text-green-300' : 'bg-green-100 text-green-800'
      case SeriesStatus.PAUSED:
        return theme === 'dark' ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-100 text-yellow-800'
      case SeriesStatus.CANCELLED:
        return theme === 'dark' ? 'bg-red-900/20 text-red-300' : 'bg-red-100 text-red-800'
      default:
        return theme === 'dark' ? 'bg-gray-900/20 text-gray-300' : 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = !searchTerm ||
      apt.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.service_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      apt.barber_name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const filteredSeries = recurringSeries.filter(series => {
    const matchesSearch = !searchTerm ||
      series.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      series.service_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      series.barber_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (series.series_name && series.series_name.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  // Combine and sort all items by date
  const allItems = [
    ...filteredAppointments.map(apt => ({
      type: 'appointment' as const,
      data: apt,
      date: apt.appointment_date,
      time: apt.appointment_time || '00:00'
    })),
    ...filteredSeries.map(series => ({
      type: 'series' as const,
      data: series,
      date: series.created_at.split('T')[0],
      time: series.preferred_time
    }))
  ].sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.time}`)
    const dateB = new Date(`${b.date}T${b.time}`)
    return dateB.getTime() - dateA.getTime() // Most recent first
  })

  // Pagination
  const totalPages = Math.ceil(allItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedItems = allItems.slice(startIndex, startIndex + itemsPerPage)

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading booking history...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-6 text-center ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg`}>
        <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
          Error Loading Booking History
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>{error}</p>
        <button
          onClick={loadBookingData}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white'} rounded-lg shadow-sm border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* Header */}
      <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Booking History
            </h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage your appointments and recurring bookings
            </p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            theme === 'dark' ? 'bg-violet-900/30 text-violet-300' : 'bg-violet-100 text-violet-800'
          }`}>
            {allItems.length} Total Bookings
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} bg-gray-50 dark:bg-gray-800/50`}>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 text-sm border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            {/* Booking Type */}
            <select
              value={bookingType}
              onChange={(e) => setBookingType(e.target.value as BookingType)}
              className={`px-3 py-2 text-sm border rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Types</option>
              <option value="single">Single Appointments</option>
              {enableRecurringView && <option value="recurring">Recurring Series</option>}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as BookingStatus)}
              className={`px-3 py-2 text-sm border rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>

            {/* Date Range */}
            <div className="flex gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className={`px-3 py-2 text-sm border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className={`px-3 py-2 text-sm border rounded-lg ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {paginatedItems.length === 0 ? (
        <div className="p-12 text-center">
          <CalendarIcon className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
            No Bookings Found
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No bookings match your current filters. Try adjusting your search criteria.
          </p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedItems.map((item, index) => (
              <div
                key={`${item.type}-${item.type === 'appointment' ? (item.data as Appointment).id : (item.data as RecurringBookingSeries).id}`}
                className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors`}
              >
                {item.type === 'appointment' ? (
                  /* Single Appointment */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-2 h-16 rounded-full ${
                        (item.data as Appointment).status === 'completed' ? 'bg-green-500' :
                        ['confirmed', 'scheduled'].includes((item.data as Appointment).status) ? 'bg-blue-500' :
                        (item.data as Appointment).status === 'cancelled' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            {formatDate((item.data as Appointment).appointment_date)}
                          </span>
                          <ClockIcon className="h-4 w-4 text-gray-400" />
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {formatTime((item.data as Appointment).appointment_time || '00:00')}
                          </span>
                        </div>
                        <h4 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                          {(item.data as Appointment).service_name}
                        </h4>
                        <div className={`flex flex-wrap items-center gap-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          <div className="flex items-center space-x-1">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span>{(item.data as Appointment).client_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span>{(item.data as Appointment).barber_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                            <span>${(item.data as Appointment).service_revenue?.toFixed(2) || '0.00'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor((item.data as Appointment).status)}`}>
                        {(item.data as Appointment).status.replace('_', ' ').toUpperCase()}
                      </span>
                      {enableActions && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onAppointmentClick?.(item.data as Appointment)}
                            className={`p-1 rounded transition-colors ${
                              theme === 'dark'
                                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {['scheduled', 'confirmed'].includes((item.data as Appointment).status) && (
                            <>
                              <button
                                onClick={() => {
                                  // TODO: Open reschedule modal
                                  console.log('Reschedule appointment:', (item.data as Appointment).id)
                                }}
                                className={`p-1 rounded transition-colors ${
                                  theme === 'dark'
                                    ? 'text-blue-400 hover:text-blue-300 hover:bg-blue-900/30'
                                    : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                                }`}
                                title="Reschedule"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleCancelAppointment((item.data as Appointment).id)}
                                className={`p-1 rounded transition-colors ${
                                  theme === 'dark'
                                    ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30'
                                    : 'text-red-600 hover:text-red-700 hover:bg-red-50'
                                }`}
                                title="Cancel"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Recurring Series */
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-16 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <ArrowPathIcon className="h-4 w-4 text-violet-600" />
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                            Recurring Series
                          </span>
                          <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            {recurringBookingsService.formatRecurrenceFrequency((item.data as RecurringBookingSeries).recurrence_pattern)}
                          </span>
                        </div>
                        <h4 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-1`}>
                          {(item.data as RecurringBookingSeries).series_name || `${(item.data as RecurringBookingSeries).service_name} Series`}
                        </h4>
                        <div className={`flex flex-wrap items-center gap-4 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                          <div className="flex items-center space-x-1">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span>{(item.data as RecurringBookingSeries).client_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span>{(item.data as RecurringBookingSeries).barber_name}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-4 w-4 text-gray-400" />
                            <span>{formatTime((item.data as RecurringBookingSeries).preferred_time)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CurrencyDollarIcon className="h-4 w-4 text-gray-400" />
                            <span>${(item.data as RecurringBookingSeries).discounted_price.toFixed(2)}</span>
                            {(item.data as RecurringBookingSeries).series_discount_percent > 0 && (
                              <span className="text-xs bg-green-100 text-green-800 px-1 rounded">
                                {(item.data as RecurringBookingSeries).series_discount_percent}% OFF
                              </span>
                            )}
                          </div>
                          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            {(item.data as RecurringBookingSeries).total_appointments_completed}/{(item.data as RecurringBookingSeries).total_appointments_created} completed
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor((item.data as RecurringBookingSeries).status)}`}>
                        {(item.data as RecurringBookingSeries).status.toUpperCase()}
                      </span>
                      {enableActions && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleManageSeries(item.data as RecurringBookingSeries)}
                            className={`p-1 rounded transition-colors ${
                              theme === 'dark'
                                ? 'text-violet-400 hover:text-violet-300 hover:bg-violet-900/30'
                                : 'text-violet-600 hover:text-violet-700 hover:bg-violet-50'
                            }`}
                            title="Manage Series"
                          >
                            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, allItems.length)} of {allItems.length} bookings
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                  <span className={`px-3 py-1 text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                      theme === 'dark'
                        ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
