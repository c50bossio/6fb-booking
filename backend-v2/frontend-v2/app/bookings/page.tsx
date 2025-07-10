'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getMyBookings, cancelBooking, updateBooking, rescheduleBooking, appointmentsAPI, type BookingResponse, type SlotsResponse, type TimeSlot } from '../../lib/api'
import { format } from 'date-fns'
import { Calendar, Clock, DollarSign, MapPin, User, XCircle, CheckCircle, AlertCircle, Edit2 } from 'lucide-react'
import VirtualList from '@/components/VirtualList'
import { EmptyState } from '@/components/ui/EmptyState'
import { CancelConfirmationDialog } from '@/components/ui/ConfirmationDialog'
import { LoadingSpinner, ErrorDisplay } from '@/components/LoadingStates'

export default function MyBookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [reschedulingId, setReschedulingId] = useState<number | null>(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<BookingResponse | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    loadBookings()
  }, [])

  const loadBookings = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getMyBookings()
      // Sort bookings by start time, upcoming first
      const sorted = response.bookings.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
      setBookings(sorted)
    } catch (err: any) {
      setError(err.message || 'Failed to load bookings')
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const [cancelConfirmation, setCancelConfirmation] = useState<{ isOpen: boolean; bookingId: number | null }>({
    isOpen: false,
    bookingId: null
  })

  const handleCancelBooking = async (bookingId: number) => {
    setCancelConfirmation({ isOpen: true, bookingId })
  }

  const confirmCancelBooking = async () => {
    if (!cancelConfirmation.bookingId) return
    
    setCancellingId(cancelConfirmation.bookingId)
    try {
      await cancelBooking(cancelConfirmation.bookingId)
      setCancelConfirmation({ isOpen: false, bookingId: null })
      // Reload bookings after successful cancellation
      await loadBookings()
    } catch (err: any) {
      // TODO: Show error in toast instead of alert
      alert(err.message || 'Failed to cancel booking')
    } finally {
      setCancellingId(null)
    }
  }

  const handleRescheduleClick = (booking: BookingResponse) => {
    setSelectedBooking(booking)
    setRescheduleDate('')
    setRescheduleTime('')
    setAvailableSlots([])
    setShowRescheduleModal(true)
  }

  const loadAvailableSlots = async (date: string) => {
    if (!date) return
    
    setLoadingSlots(true)
    try {
      const response = await appointmentsAPI.getAvailableSlots(date)
      setAvailableSlots(response.slots)
    } catch (err: any) {
      console.error('Failed to load available slots:', err)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleDateChange = (date: string) => {
    setRescheduleDate(date)
    setRescheduleTime('')
    if (date) {
      loadAvailableSlots(date)
    } else {
      setAvailableSlots([])
    }
  }

  const handleRescheduleSubmit = async () => {
    if (!selectedBooking || !rescheduleDate || !rescheduleTime) {
      alert('Please select both date and time')
      return
    }

    setReschedulingId(selectedBooking.id)
    try {
      await rescheduleBooking(selectedBooking.id, rescheduleDate, rescheduleTime)
      setShowRescheduleModal(false)
      setSelectedBooking(null)
      setRescheduleDate('')
      setRescheduleTime('')
      setAvailableSlots([])
      // Reload bookings after successful reschedule
      await loadBookings()
    } catch (err: any) {
      alert(err.message || 'Failed to reschedule booking')
    } finally {
      setReschedulingId(null)
    }
  }

  const closeRescheduleModal = () => {
    setShowRescheduleModal(false)
    setSelectedBooking(null)
    setRescheduleDate('')
    setRescheduleTime('')
    setAvailableSlots([])
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) > new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" className="text-primary-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorDisplay 
            error={error} 
            onRetry={() => loadBookings()} 
          />
        </div>
      </div>
    )
  }

  const upcomingBookings = bookings.filter(b => isUpcoming(b.start_time) && b.status !== 'cancelled')
  const pastBookings = bookings.filter(b => !isUpcoming(b.start_time) || b.status === 'cancelled')
  
  // Virtual scrolling thresholds
  const VIRTUAL_SCROLLING_THRESHOLD = 20
  const shouldUseVirtualScrollingUpcoming = upcomingBookings.length > VIRTUAL_SCROLLING_THRESHOLD
  const shouldUseVirtualScrollingPast = pastBookings.length > VIRTUAL_SCROLLING_THRESHOLD

  // Prepare bookings with heights for virtual scrolling
  const upcomingBookingsWithHeights = upcomingBookings.map(booking => ({
    ...booking,
    height: 180 // Standard booking card height
  }))
  
  const pastBookingsWithHeights = pastBookings.map(booking => ({
    ...booking,
    height: 120 // Smaller height for past bookings
  }))

  // Virtual upcoming booking item renderer
  const renderUpcomingBooking = (booking: BookingResponse & { height?: number }, index: number, style: React.CSSProperties) => {
    return (
      <div style={style} className="p-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-lg font-medium text-gray-900">{booking.service_name}</h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                  {getStatusIcon(booking.status)}
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    {format(new Date(booking.start_time), 'h:mm a')} 
                    ({booking.duration_minutes} mins)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>${booking.price.toFixed(2)}</span>
                </div>
                {(booking as any).barber_name && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{(booking as any).barber_name}</span>
                  </div>
                )}
              </div>

              {(booking as any).notes && (
                <p className="mt-3 text-sm text-gray-600 italic">
                  Note: {(booking as any).notes}
                </p>
              )}
            </div>

            {booking.status === 'confirmed' && isUpcoming(booking.start_time) && (
              <div className="ml-4 flex gap-2">
                <button
                  onClick={() => handleRescheduleClick(booking)}
                  disabled={reschedulingId === booking.id}
                  className="flex items-center gap-1 px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Edit2 className="w-4 h-4" />
                  {reschedulingId === booking.id ? 'Rescheduling...' : 'Reschedule'}
                </button>
                <button
                  onClick={() => handleCancelBooking(booking.id)}
                  disabled={cancellingId === booking.id}
                  className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Virtual past booking item renderer
  const renderPastBooking = (booking: BookingResponse & { height?: number }, index: number, style: React.CSSProperties) => {
    return (
      <div style={style} className="p-2">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">{booking.service_name}</h3>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                  {getStatusIcon(booking.status)}
                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{format(new Date(booking.start_time), 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{format(new Date(booking.start_time), 'h:mm a')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>${booking.price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {booking.status === 'confirmed' && (
              <button
                onClick={() => router.push('/book')}
                className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                Book Again
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-gray-600 mt-2">
          View and manage your appointments
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8">
          <EmptyState
            type="bookings"
            action={{
              label: 'Book Now',
              onClick: () => router.push('/book')
            }}
          />
        </div>
      ) : (
        <>
          {/* Upcoming Bookings */}
          {upcomingBookings.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Upcoming Appointments
                {shouldUseVirtualScrollingUpcoming && (
                  <span className="ml-3 text-sm text-blue-600 font-normal">
                    📊 Virtual scrolling active
                  </span>
                )}
              </h2>
              {shouldUseVirtualScrollingUpcoming ? (
                <VirtualList
                  items={upcomingBookingsWithHeights}
                  containerHeight={600}
                  itemHeight={180}
                  renderItem={renderUpcomingBooking}
                  className="border border-gray-200 rounded-lg"
                  overscan={3}
                />
              ) : (
                <div className="grid gap-4">
                  {upcomingBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-lg font-medium text-gray-900">{booking.service_name}</h3>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                              {getStatusIcon(booking.status)}
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{format(new Date(booking.start_time), 'EEEE, MMMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>
                                {format(new Date(booking.start_time), 'h:mm a')} 
                                ({booking.duration_minutes} mins)
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              <span>${booking.price.toFixed(2)}</span>
                            </div>
                            {(booking as any).barber_name && (
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>{(booking as any).barber_name}</span>
                              </div>
                            )}
                          </div>

                          {(booking as any).notes && (
                            <p className="mt-3 text-sm text-gray-600 italic">
                              Note: {(booking as any).notes}
                            </p>
                          )}
                        </div>

                        {booking.status === 'confirmed' && isUpcoming(booking.start_time) && (
                          <div className="ml-4 flex gap-2">
                            <button
                              onClick={() => handleRescheduleClick(booking)}
                              disabled={reschedulingId === booking.id}
                              className="flex items-center gap-1 px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Edit2 className="w-4 h-4" />
                              {reschedulingId === booking.id ? 'Rescheduling...' : 'Reschedule'}
                            </button>
                            <button
                              onClick={() => handleCancelBooking(booking.id)}
                              disabled={cancellingId === booking.id}
                              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Past Bookings */}
          {pastBookings.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Past Appointments
                {shouldUseVirtualScrollingPast && (
                  <span className="ml-3 text-sm text-blue-600 font-normal">
                    📊 Virtual scrolling active
                  </span>
                )}
              </h2>
              {shouldUseVirtualScrollingPast ? (
                <VirtualList
                  items={pastBookingsWithHeights}
                  containerHeight={400}
                  itemHeight={120}
                  renderItem={renderPastBooking}
                  className="border border-gray-200 rounded-lg"
                  overscan={3}
                />
              ) : (
                <div className="grid gap-4">
                  {pastBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-gray-50 rounded-lg border border-gray-200 p-6"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">{booking.service_name}</h3>
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                              {getStatusIcon(booking.status)}
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{format(new Date(booking.start_time), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{format(new Date(booking.start_time), 'h:mm a')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4" />
                              <span>${booking.price.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => router.push('/book')}
                            className="px-4 py-2 text-sm text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
                          >
                            Book Again
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Reschedule Appointment
                </h3>
                <button
                  onClick={closeRescheduleModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Current appointment:</p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-900">{selectedBooking.service_name}</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(selectedBooking.start_time), 'EEEE, MMMM d, yyyy')} at{' '}
                    {format(new Date(selectedBooking.start_time), 'h:mm a')}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="reschedule-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select New Date
                  </label>
                  <input
                    type="date"
                    id="reschedule-date"
                    value={rescheduleDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>

                {rescheduleDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select New Time
                    </label>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="text-sm text-gray-500">Loading available times...</div>
                      </div>
                    ) : availableSlots.length > 0 ? (
                      <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                        {availableSlots
                          .filter(slot => slot.available)
                          .map((slot) => (
                            <button
                              key={slot.time}
                              onClick={() => setRescheduleTime(slot.time)}
                              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                                rescheduleTime === slot.time
                                  ? 'bg-primary-100 border-primary-300 text-primary-700'
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              {slot.time}
                            </button>
                          ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 p-4 text-center">
                        No available times for this date
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeRescheduleModal}
                  className="flex-1 px-4 py-2 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRescheduleSubmit}
                  disabled={!rescheduleDate || !rescheduleTime || reschedulingId === selectedBooking.id}
                  className="flex-1 px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reschedulingId === selectedBooking.id ? 'Rescheduling...' : 'Reschedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Cancel Confirmation Dialog */}
      <CancelConfirmationDialog
        isOpen={cancelConfirmation.isOpen}
        onClose={() => setCancelConfirmation({ isOpen: false, bookingId: null })}
        onConfirm={confirmCancelBooking}
        loading={cancellingId !== null}
      />
    </div>
  )
}