'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CalendarIcon,
  ClockIcon,
  CurrencyDollarIcon,
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  PencilSquareIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import {
  recurringBookingsService,
  type RecurringBookingSeries,
  type SeriesAppointment,
  SeriesStatus,
  RecurrencePattern
} from '@/lib/api/recurring-bookings'

export default function SubscriptionManagementPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [series, setSeries] = useState<RecurringBookingSeries | null>(null)
  const [appointments, setAppointments] = useState<SeriesAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showPauseModal, setShowPauseModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showExclusionModal, setShowExclusionModal] = useState(false)
  const [pauseReason, setPauseReason] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [exclusionDate, setExclusionDate] = useState('')
  const [exclusionReason, setExclusionReason] = useState('')
  const [includePastAppointments, setIncludePastAppointments] = useState(false)

  useEffect(() => {
    if (token) {
      loadSeriesData()
    }
  }, [token])

  const loadSeriesData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load series info and appointments in parallel
      const [seriesResponse, appointmentsResponse] = await Promise.all([
        recurringBookingsService.getSeriesByToken(token),
        recurringBookingsService.getSeriesAppointments(token, includePastAppointments)
      ])

      setSeries(seriesResponse.data)
      setAppointments(appointmentsResponse.data)
    } catch (err: any) {
      setError(err.message || 'Failed to load subscription data')
      console.error('Error loading series data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePauseSeries = async () => {
    if (!pauseReason.trim()) {
      alert('Please provide a reason for pausing')
      return
    }

    try {
      setActionLoading('pause')
      await recurringBookingsService.pauseSeries(token, pauseReason)
      setShowPauseModal(false)
      setPauseReason('')
      await loadSeriesData()
    } catch (err: any) {
      alert(err.message || 'Failed to pause series')
    } finally {
      setActionLoading(null)
    }
  }

  const handleResumeSeries = async () => {
    try {
      setActionLoading('resume')
      await recurringBookingsService.resumeSeries(token, 'Resumed by customer')
      await loadSeriesData()
    } catch (err: any) {
      alert(err.message || 'Failed to resume series')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCancelSeries = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation')
      return
    }

    if (!confirm('Are you sure you want to cancel your recurring appointments? This action cannot be undone.')) {
      return
    }

    try {
      setActionLoading('cancel')
      await recurringBookingsService.cancelSeries(token, cancelReason)
      setShowCancelModal(false)
      setCancelReason('')
      await loadSeriesData()
    } catch (err: any) {
      alert(err.message || 'Failed to cancel series')
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddExclusion = async () => {
    if (!exclusionDate || !exclusionReason.trim()) {
      alert('Please provide both date and reason for exclusion')
      return
    }

    try {
      setActionLoading('exclusion')
      await recurringBookingsService.addSeriesExclusion(token, {
        exclusion_date: exclusionDate,
        reason: exclusionReason
      })
      setShowExclusionModal(false)
      setExclusionDate('')
      setExclusionReason('')
      await loadSeriesData()
    } catch (err: any) {
      alert(err.message || 'Failed to add exclusion')
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusColor = (status: SeriesStatus) => {
    switch (status) {
      case SeriesStatus.ACTIVE:
        return 'bg-green-100 text-green-800 border-green-200'
      case SeriesStatus.PAUSED:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case SeriesStatus.CANCELLED:
        return 'bg-red-100 text-red-800 border-red-200'
      case SeriesStatus.EXPIRED:
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getAppointmentStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'confirmed':
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      case 'no_show':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  const calculateCompletionRate = () => {
    if (!series || series.total_appointments_created === 0) return 0
    return Math.round((series.total_appointments_completed / series.total_appointments_created) * 100)
  }

  const upcomingAppointments = appointments.filter(apt =>
    ['scheduled', 'confirmed'].includes(apt.status) &&
    new Date(apt.appointment_date) >= new Date()
  )

  const pastAppointments = appointments.filter(apt =>
    new Date(apt.appointment_date) < new Date()
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your subscription...</p>
        </div>
      </div>
    )
  }

  if (error || !series) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Subscription Not Found</h1>
          <p className="text-gray-600 mb-6">
            {error || 'The subscription you\'re looking for doesn\'t exist or may have been removed.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {series.series_name || 'Recurring Appointments'}
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your recurring appointment series with {series.barber_name}
              </p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(series.status)}`}>
              {series.status.charAt(0).toUpperCase() + series.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Status Alert */}
        {series.status === SeriesStatus.PAUSED && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <PauseIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <h3 className="text-sm font-medium text-yellow-800">Your subscription is paused</h3>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              No new appointments will be created until you resume your subscription.
            </p>
            <button
              onClick={handleResumeSeries}
              disabled={actionLoading === 'resume'}
              className="mt-3 inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-yellow-800 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50"
            >
              {actionLoading === 'resume' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
                  Resuming...
                </>
              ) : (
                <>
                  <PlayIcon className="h-4 w-4 mr-1" />
                  Resume Subscription
                </>
              )}
            </button>
          </div>
        )}

        {series.status === SeriesStatus.CANCELLED && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <XMarkIcon className="h-5 w-5 text-red-600 mr-2" />
              <h3 className="text-sm font-medium text-red-800">Your subscription has been cancelled</h3>
            </div>
            <p className="text-sm text-red-700 mt-1">
              This subscription is no longer active. You can still view your appointment history below.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Series Overview */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-violet-50 to-purple-50">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <ArrowPathIcon className="h-5 w-5 mr-2 text-violet-600" />
                  Subscription Details
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Service Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className="w-24 text-gray-500">Service:</span>
                        <span className="font-medium">{series.service_name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-24 text-gray-500">Barber:</span>
                        <span className="font-medium">{series.barber_name}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-24 text-gray-500">Client:</span>
                        <span className="font-medium">{series.client_name}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Schedule & Pricing</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center">
                        <span className="w-24 text-gray-500">Pattern:</span>
                        <span className="font-medium">
                          {recurringBookingsService.formatRecurrenceFrequency(series.recurrence_pattern)}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-24 text-gray-500">Time:</span>
                        <span className="font-medium">{formatTime(series.preferred_time)}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="w-24 text-gray-500">Price:</span>
                        <div>
                          <span className="font-medium text-green-600">${series.discounted_price.toFixed(2)}</span>
                          {series.series_discount_percent > 0 && (
                            <>
                              <span className="ml-2 text-xs line-through text-gray-500">
                                ${series.service_price.toFixed(2)}
                              </span>
                              <span className="ml-1 text-xs bg-green-100 text-green-800 px-1 rounded">
                                {series.series_discount_percent}% OFF
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Progress</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-violet-600">{series.total_appointments_created}</div>
                      <div className="text-xs text-gray-500">Appointments Created</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{series.total_appointments_completed}</div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{calculateCompletionRate()}%</div>
                      <div className="text-xs text-gray-500">Completion Rate</div>
                    </div>
                  </div>
                </div>

                {series.next_appointment_date && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700">Next Appointment</h3>
                        <p className="text-lg font-semibold text-gray-900">{formatDate(series.next_appointment_date)}</p>
                      </div>
                      <CalendarIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Upcoming Appointments</h2>
              </div>
              <div className="divide-y divide-gray-200">
                {upcomingAppointments.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <CalendarIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p>No upcoming appointments scheduled</p>
                    {series.status === SeriesStatus.ACTIVE && (
                      <p className="text-sm mt-2">New appointments will be created automatically based on your schedule.</p>
                    )}
                  </div>
                ) : (
                  upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-2 h-16 bg-violet-500 rounded-full"></div>
                          <div>
                            <div className="font-medium text-gray-900">{formatDate(appointment.appointment_date)}</div>
                            <div className="text-sm text-gray-500 flex items-center space-x-4">
                              <span className="flex items-center">
                                <ClockIcon className="h-4 w-4 mr-1" />
                                {formatTime(appointment.appointment_time)}
                              </span>
                              <span className="flex items-center">
                                <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                                ${appointment.service_revenue.toFixed(2)}
                              </span>
                              <span>{appointment.duration_minutes} min</span>
                            </div>
                            {appointment.client_notes && (
                              <div className="text-sm text-gray-600 mt-1">{appointment.client_notes}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAppointmentStatusColor(appointment.status)}`}>
                            {appointment.status.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Past Appointments */}
            {pastAppointments.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Appointment History</h2>
                    <button
                      onClick={() => {
                        setIncludePastAppointments(!includePastAppointments)
                        loadSeriesData()
                      }}
                      className="text-sm text-violet-600 hover:text-violet-700"
                    >
                      {includePastAppointments ? 'Hide' : 'Show'} History
                    </button>
                  </div>
                </div>
                {includePastAppointments && (
                  <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                    {pastAppointments.map((appointment) => (
                      <div key={appointment.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-2 h-16 rounded-full ${
                              appointment.status === 'completed' ? 'bg-green-500' :
                              appointment.status === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                            }`}></div>
                            <div>
                              <div className="font-medium text-gray-900">{formatDate(appointment.appointment_date)}</div>
                              <div className="text-sm text-gray-500 flex items-center space-x-4">
                                <span className="flex items-center">
                                  <ClockIcon className="h-4 w-4 mr-1" />
                                  {formatTime(appointment.appointment_time)}
                                </span>
                                <span className="flex items-center">
                                  <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                                  ${appointment.service_revenue.toFixed(2)}
                                </span>
                                <span>{appointment.duration_minutes} min</span>
                              </div>
                              {appointment.client_notes && (
                                <div className="text-sm text-gray-600 mt-1">{appointment.client_notes}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAppointmentStatusColor(appointment.status)}`}>
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            {series.status === SeriesStatus.ACTIVE && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Manage Subscription</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowPauseModal(true)}
                    disabled={actionLoading === 'pause'}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <PauseIcon className="h-4 w-4 mr-2" />
                    Pause Subscription
                  </button>
                  <button
                    onClick={() => setShowExclusionModal(true)}
                    disabled={actionLoading === 'exclusion'}
                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Skip a Date
                  </button>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    disabled={actionLoading === 'cancel'}
                    className="w-full flex items-center justify-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
                  >
                    <XMarkIcon className="h-4 w-4 mr-2" />
                    Cancel Subscription
                  </button>
                </div>
              </div>
            )}

            {/* Benefits */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg border border-violet-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-violet-600" />
                Your Benefits
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  {series.series_discount_percent}% savings on every appointment
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Guaranteed time slot with {series.barber_name}
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Automatic appointment scheduling
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Flexible rescheduling options
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                  Priority booking during busy periods
                </li>
              </ul>
            </div>

            {/* Savings Summary */}
            {series.series_discount_percent > 0 && (
              <div className="bg-green-50 rounded-lg border border-green-200 p-6">
                <h3 className="text-lg font-semibold text-green-900 mb-4">Your Savings</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-2xl font-bold text-green-700">
                      ${((series.service_price - series.discounted_price) * series.total_appointments_completed).toFixed(2)}
                    </div>
                    <div className="text-sm text-green-600">Total saved so far</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-green-700">
                      ${(series.service_price - series.discounted_price).toFixed(2)}
                    </div>
                    <div className="text-sm text-green-600">Saved per appointment</div>
                  </div>
                </div>
              </div>
            )}

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-600" />
                Need Help?
              </h3>
              <div className="text-sm text-gray-600 space-y-2">
                <p>Questions about your subscription? Contact us:</p>
                <p>• Email: support@6fb.com</p>
                <p>• Phone: (555) 123-4567</p>
                <p>• Hours: Mon-Fri 9AM-6PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pause Modal */}
      {showPauseModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 text-center">
            <div className="fixed inset-0 bg-black opacity-30" onClick={() => setShowPauseModal(false)}></div>
            <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pause Subscription</h3>
              <p className="text-sm text-gray-600 mb-4">
                Pausing your subscription will stop new appointments from being created. You can resume anytime.
              </p>
              <textarea
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                placeholder="Please tell us why you're pausing (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={3}
              />
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePauseSeries}
                  disabled={actionLoading === 'pause'}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {actionLoading === 'pause' ? 'Pausing...' : 'Pause Subscription'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 text-center">
            <div className="fixed inset-0 bg-black opacity-30" onClick={() => setShowCancelModal(false)}></div>
            <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Cancel Subscription</h3>
              <p className="text-sm text-gray-600 mb-4">
                Are you sure you want to cancel your recurring appointments? This action cannot be undone.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Please tell us why you're cancelling (required)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                rows={3}
                required
              />
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSeries}
                  disabled={actionLoading === 'cancel' || !cancelReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel Subscription'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exclusion Modal */}
      {showExclusionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 text-center">
            <div className="fixed inset-0 bg-black opacity-30" onClick={() => setShowExclusionModal(false)}></div>
            <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Skip an Appointment</h3>
              <p className="text-sm text-gray-600 mb-4">
                Skip a specific date in your recurring schedule. No appointment will be created for this date.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date to Skip</label>
                  <input
                    type="date"
                    value={exclusionDate}
                    onChange={(e) => setExclusionDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <input
                    type="text"
                    value={exclusionReason}
                    onChange={(e) => setExclusionReason(e.target.value)}
                    placeholder="e.g., Vacation, Business trip"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowExclusionModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddExclusion}
                  disabled={actionLoading === 'exclusion' || !exclusionDate || !exclusionReason.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading === 'exclusion' ? 'Adding...' : 'Skip Date'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
