'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'
import {
  recurringBookingsService,
  type RecurringBookingSeries,
  type SeriesAppointment,
  SeriesStatus,
  RecurrencePattern,
  type SeriesFilter
} from '@/lib/api/recurring-bookings'

interface RecurringBookingsCalendarViewProps {
  onSeriesClick?: (series: RecurringBookingSeries) => void
  onAppointmentClick?: (appointment: SeriesAppointment, series: RecurringBookingSeries) => void
  enableActions?: boolean
  theme?: 'light' | 'dark'
}

export default function RecurringBookingsCalendarView({
  onSeriesClick,
  onAppointmentClick,
  enableActions = true,
  theme = 'light'
}: RecurringBookingsCalendarViewProps) {
  const [series, setSeries] = useState<RecurringBookingSeries[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSeries, setSelectedSeries] = useState<RecurringBookingSeries | null>(null)
  const [seriesAppointments, setSeriesAppointments] = useState<SeriesAppointment[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filters, setFilters] = useState<SeriesFilter>({
    status: SeriesStatus.ACTIVE,
    limit: 50
  })

  useEffect(() => {
    loadRecurringSeries()
  }, [filters])

  const loadRecurringSeries = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await recurringBookingsService.getAllSeries(filters)
      setSeries(response.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load recurring series')
      console.error('Error loading recurring series:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSeriesAppointments = async (seriesToken: string) => {
    try {
      const response = await recurringBookingsService.getSeriesAppointments(seriesToken, true)
      setSeriesAppointments(response.data)
    } catch (err: any) {
      console.error('Error loading series appointments:', err)
    }
  }

  const handleSeriesSelect = useCallback(async (selectedSeries: RecurringBookingSeries) => {
    setSelectedSeries(selectedSeries)
    await loadSeriesAppointments(selectedSeries.series_token)
    onSeriesClick?.(selectedSeries)
  }, [onSeriesClick])

  const handleStatusUpdate = async (seriesToken: string, action: 'pause' | 'resume' | 'cancel', reason?: string) => {
    try {
      switch (action) {
        case 'pause':
          await recurringBookingsService.pauseSeries(seriesToken, reason)
          break
        case 'resume':
          await recurringBookingsService.resumeSeries(seriesToken, reason)
          break
        case 'cancel':
          await recurringBookingsService.cancelSeries(seriesToken, reason)
          break
      }
      await loadRecurringSeries()
      if (selectedSeries?.series_token === seriesToken) {
        const updatedSeries = series.find(s => s.series_token === seriesToken)
        if (updatedSeries) {
          setSelectedSeries(updatedSeries)
        }
      }
    } catch (err: any) {
      alert(err.message || `Failed to ${action} series`)
    }
  }

  const getStatusColor = (status: SeriesStatus) => {
    switch (status) {
      case SeriesStatus.ACTIVE:
        return theme === 'dark' ? 'bg-green-900/20 text-green-300 border-green-700' : 'bg-green-100 text-green-800 border-green-200'
      case SeriesStatus.PAUSED:
        return theme === 'dark' ? 'bg-yellow-900/20 text-yellow-300 border-yellow-700' : 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case SeriesStatus.CANCELLED:
        return theme === 'dark' ? 'bg-red-900/20 text-red-300 border-red-700' : 'bg-red-100 text-red-800 border-red-200'
      case SeriesStatus.EXPIRED:
        return theme === 'dark' ? 'bg-gray-900/20 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return theme === 'dark' ? 'bg-gray-900/20 text-gray-300 border-gray-700' : 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPatternIcon = (pattern: RecurrencePattern) => {
    switch (pattern) {
      case RecurrencePattern.DAILY:
        return '📅'
      case RecurrencePattern.WEEKLY:
        return '📊'
      case RecurrencePattern.BIWEEKLY:
        return '📈'
      case RecurrencePattern.MONTHLY:
        return '🗓️'
      case RecurrencePattern.CUSTOM:
        return '⚙️'
      default:
        return '🔄'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
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

  const getUpcomingAppointments = (appointments: SeriesAppointment[]) => {
    const now = new Date()
    return appointments
      .filter(apt => ['scheduled', 'confirmed'].includes(apt.status) && new Date(apt.appointment_date) >= now)
      .sort((a, b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime())
      .slice(0, 3)
  }

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600 mx-auto"></div>
          <p className={`mt-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
            Loading recurring bookings...
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
          Error Loading Recurring Bookings
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-4`}>{error}</p>
        <button
          onClick={loadRecurringSeries}
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
          <div className="flex items-center space-x-3">
            <ArrowPathIcon className="h-6 w-6 text-violet-600" />
            <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Recurring Bookings
            </h2>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              theme === 'dark' ? 'bg-violet-900/30 text-violet-300' : 'bg-violet-100 text-violet-800'
            }`}>
              {series.length} Active Series
            </span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Status Filter */}
            <select
              value={filters.status || 'all'}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                status: e.target.value === 'all' ? undefined : e.target.value as SeriesStatus
              }))}
              className={`px-3 py-1 text-sm border rounded-lg ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Status</option>
              <option value={SeriesStatus.ACTIVE}>Active</option>
              <option value={SeriesStatus.PAUSED}>Paused</option>
              <option value={SeriesStatus.CANCELLED}>Cancelled</option>
              <option value={SeriesStatus.EXPIRED}>Expired</option>
            </select>

            {/* View Mode Toggle */}
            <div className={`flex rounded-lg p-1 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow-sm'
                    : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === 'list'
                    ? theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 shadow-sm'
                    : theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {series.length === 0 ? (
        <div className="p-12 text-center">
          <ArrowPathIcon className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
          <h3 className={`text-lg font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
            No Recurring Bookings
          </h3>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            {filters.status && filters.status !== SeriesStatus.ACTIVE
              ? `No ${filters.status} recurring bookings found.`
              : 'Start creating recurring appointment series to see them here.'
            }
          </p>
        </div>
      ) : (
        <div className="p-6">
          {viewMode === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {series.map((seriesItem) => (
                <div
                  key={seriesItem.id}
                  onClick={() => handleSeriesSelect(seriesItem)}
                  className={`p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedSeries?.id === seriesItem.id
                      ? theme === 'dark' ? 'border-violet-500 bg-violet-900/20' : 'border-violet-500 bg-violet-50'
                      : theme === 'dark' ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getPatternIcon(seriesItem.recurrence_pattern)}</span>
                      <div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {seriesItem.series_name || `${seriesItem.service_name} Series`}
                        </h3>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                          {seriesItem.client_name}
                        </p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(seriesItem.status)}`}>
                      {seriesItem.status}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 mb-4">
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className="font-medium">Barber:</span> {seriesItem.barber_name}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className="font-medium">Schedule:</span> {recurringBookingsService.formatRecurrenceFrequency(seriesItem.recurrence_pattern)}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className="font-medium">Time:</span> {formatTime(seriesItem.preferred_time)}
                    </div>
                    <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      <span className="font-medium">Price:</span>
                      <span className="ml-1 font-semibold text-green-600">${seriesItem.discounted_price.toFixed(2)}</span>
                      {seriesItem.series_discount_percent > 0 && (
                        <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">
                          {seriesItem.series_discount_percent}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center justify-between text-sm mb-4">
                    <div>
                      <span className={`font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                        Progress:
                      </span>
                      <span className={`ml-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {seriesItem.total_appointments_completed}/{seriesItem.total_appointments_created}
                      </span>
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      Created {formatDate(seriesItem.created_at)}
                    </div>
                  </div>

                  {/* Next Appointment */}
                  {seriesItem.next_appointment_date && (
                    <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <div className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-1`}>
                        Next Appointment
                      </div>
                      <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {formatDate(seriesItem.next_appointment_date)}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {enableActions && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSeriesClick?.(seriesItem)
                        }}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          theme === 'dark'
                            ? 'text-violet-300 hover:bg-violet-900/30'
                            : 'text-violet-600 hover:bg-violet-50'
                        }`}
                      >
                        <EyeIcon className="h-3 w-3 inline mr-1" />
                        View
                      </button>

                      {seriesItem.status === SeriesStatus.ACTIVE && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusUpdate(seriesItem.series_token, 'pause', 'Paused from calendar view')
                          }}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            theme === 'dark'
                              ? 'text-yellow-300 hover:bg-yellow-900/30'
                              : 'text-yellow-600 hover:bg-yellow-50'
                          }`}
                        >
                          <PauseIcon className="h-3 w-3 inline mr-1" />
                          Pause
                        </button>
                      )}

                      {seriesItem.status === SeriesStatus.PAUSED && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusUpdate(seriesItem.series_token, 'resume', 'Resumed from calendar view')
                          }}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            theme === 'dark'
                              ? 'text-green-300 hover:bg-green-900/30'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                        >
                          <PlayIcon className="h-3 w-3 inline mr-1" />
                          Resume
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="space-y-4">
              {series.map((seriesItem) => (
                <div
                  key={seriesItem.id}
                  onClick={() => handleSeriesSelect(seriesItem)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-sm ${
                    selectedSeries?.id === seriesItem.id
                      ? theme === 'dark' ? 'border-violet-500 bg-violet-900/20' : 'border-violet-500 bg-violet-50'
                      : theme === 'dark' ? 'border-gray-700 hover:border-gray-600' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-2xl">{getPatternIcon(seriesItem.recurrence_pattern)}</span>
                      <div>
                        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {seriesItem.series_name || `${seriesItem.service_name} Series`}
                        </h3>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} flex items-center space-x-4`}>
                          <span>{seriesItem.client_name}</span>
                          <span>•</span>
                          <span>{seriesItem.barber_name}</span>
                          <span>•</span>
                          <span>{recurringBookingsService.formatRecurrenceFrequency(seriesItem.recurrence_pattern)}</span>
                          <span>•</span>
                          <span>{formatTime(seriesItem.preferred_time)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {seriesItem.total_appointments_completed}/{seriesItem.total_appointments_created} completed
                        </div>
                        <div className="text-sm font-semibold text-green-600">
                          ${seriesItem.discounted_price.toFixed(2)}
                          {seriesItem.series_discount_percent > 0 && (
                            <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">
                              {seriesItem.series_discount_percent}% OFF
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(seriesItem.status)}`}>
                        {seriesItem.status}
                      </span>
                      {enableActions && (
                        <div className="flex items-center space-x-2">
                          {seriesItem.status === SeriesStatus.ACTIVE && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusUpdate(seriesItem.series_token, 'pause', 'Paused from calendar view')
                              }}
                              className={`p-1 rounded transition-colors ${
                                theme === 'dark'
                                  ? 'text-yellow-300 hover:bg-yellow-900/30'
                                  : 'text-yellow-600 hover:bg-yellow-50'
                              }`}
                            >
                              <PauseIcon className="h-4 w-4" />
                            </button>
                          )}
                          {seriesItem.status === SeriesStatus.PAUSED && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusUpdate(seriesItem.series_token, 'resume', 'Resumed from calendar view')
                              }}
                              className={`p-1 rounded transition-colors ${
                                theme === 'dark'
                                  ? 'text-green-300 hover:bg-green-900/30'
                                  : 'text-green-600 hover:bg-green-50'
                              }`}
                            >
                              <PlayIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected Series Details Panel */}
      {selectedSeries && (
        <div className={`border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Series Appointments
            </h3>
            <button
              onClick={() => setSelectedSeries(null)}
              className={`p-1 rounded transition-colors ${
                theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {seriesAppointments.length === 0 ? (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No appointments found for this series</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {seriesAppointments
                .filter(apt => ['scheduled', 'confirmed'].includes(apt.status))
                .slice(0, 5)
                .map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => onAppointmentClick?.(appointment, selectedSeries)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    theme === 'dark'
                      ? 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-12 rounded-full ${
                        appointment.status === 'completed' ? 'bg-green-500' :
                        appointment.status === 'confirmed' || appointment.status === 'scheduled' ? 'bg-blue-500' :
                        'bg-gray-500'
                      }`} />
                      <div>
                        <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                          {formatDate(appointment.appointment_date)}
                        </div>
                        <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} flex items-center space-x-2`}>
                          <ClockIcon className="h-3 w-3" />
                          <span>{formatTime(appointment.appointment_time)}</span>
                          <span>•</span>
                          <span>{appointment.duration_minutes} min</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        ${appointment.service_revenue.toFixed(2)}
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        appointment.status === 'confirmed' || appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {appointment.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
