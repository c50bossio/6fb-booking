'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Calendar from '@/components/Calendar'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingButton, ErrorDisplay } from '@/components/LoadingStates'
import { getMyBookings, cancelBooking, rescheduleBooking, getProfile, type BookingResponse } from '@/lib/api'
import { 
  formatDateForAPI, 
  parseAPIDate, 
  formatTimeWithTimezone, 
  getTimezoneDisplayName,
  getFriendlyDateLabel 
} from '@/lib/timezone'
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  UserIcon, 
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  role: string
  timezone?: string
}

export default function CalendarPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingResponse[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<number | null>(null)

  // Load user profile and bookings
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const [userProfile, userBookings] = await Promise.all([
          getProfile(),
          getMyBookings()
        ])
        
        setUser(userProfile)
        setBookings(userBookings)
        setError(null)
      } catch (err) {
        console.error('Failed to load calendar data:', err)
        setError('Failed to load calendar data. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Filter bookings by selected date
  useEffect(() => {
    if (!selectedDate || !bookings.length) {
      setFilteredBookings([])
      return
    }

    const selectedDateStr = formatDateForAPI(selectedDate)
    const dayBookings = bookings.filter(booking => {
      try {
        const bookingDate = parseAPIDate(booking.start_time)
        return formatDateForAPI(bookingDate) === selectedDateStr
      } catch {
        return false
      }
    })

    // Sort by time
    dayBookings.sort((a, b) => {
      const timeA = parseAPIDate(a.start_time).getTime()
      const timeB = parseAPIDate(b.start_time).getTime()
      return timeA - timeB
    })

    setFilteredBookings(dayBookings)
  }, [selectedDate, bookings])

  // Get all booking dates for calendar highlighting
  const bookingDates = bookings.map(booking => {
    try {
      return parseAPIDate(booking.start_time)
    } catch {
      return null
    }
  }).filter(Boolean) as Date[]

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    try {
      setCancelingId(bookingId)
      await cancelBooking(bookingId)
      
      // Refresh bookings
      const updatedBookings = await getMyBookings()
      setBookings(updatedBookings)
    } catch (err) {
      console.error('Failed to cancel booking:', err)
      setError('Failed to cancel appointment. Please try again.')
    } finally {
      setCancelingId(null)
    }
  }

  const handleReschedule = (bookingId: number) => {
    router.push(`/bookings?reschedule=${bookingId}`)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'completed':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return <ErrorDisplay message={error} onRetry={() => window.location.reload()} />
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your appointments and schedule
          </p>
        </div>
        <Button 
          onClick={() => router.push('/book')}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          New Appointment
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <Card variant="glass" padding="lg">
          <CardHeader>
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CalendarDaysIcon className="w-5 h-5" />
              Calendar View
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a date to view appointments
            </p>
          </CardHeader>
          <CardContent>
            <Calendar
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              bookingDates={bookingDates}
            />
          </CardContent>
        </Card>

        {/* Appointments for Selected Date */}
        <Card variant="glass" padding="lg">
          <CardHeader>
            <h2 className="text-lg font-semibold">
              {selectedDate 
                ? `Appointments for ${getFriendlyDateLabel(selectedDate)}`
                : 'Select a Date'
              }
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredBookings.length} appointment{filteredBookings.length !== 1 ? 's' : ''}
              {user?.timezone && ` in ${getTimezoneDisplayName(user.timezone)}`}
            </p>
          </CardHeader>
          <CardContent>
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDaysIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedDate 
                    ? 'No appointments scheduled for this date'
                    : 'Select a date to view appointments'
                  }
                </p>
                {selectedDate && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => router.push('/book')}
                  >
                    Schedule Appointment
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => (
                  <div 
                    key={booking.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
                  >
                    {/* Time and Service */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                          <ClockIcon className="w-5 h-5 text-primary-600" />
                          {formatTimeWithTimezone(parseAPIDate(booking.start_time), user?.timezone)}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 font-medium">
                          {booking.service_name}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(booking.status)}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>

                    {/* Client Info */}
                    {(booking.client_name || booking.client_email || booking.client_phone) && (
                      <div className="space-y-1">
                        {booking.client_name && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <UserIcon className="w-4 h-4" />
                            {booking.client_name}
                          </div>
                        )}
                        {booking.client_email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <EnvelopeIcon className="w-4 h-4" />
                            {booking.client_email}
                          </div>
                        )}
                        {booking.client_phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <PhoneIcon className="w-4 h-4" />
                            {booking.client_phone}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-600">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReschedule(booking.id)}
                          className="flex-1"
                        >
                          <PencilIcon className="w-4 h-4 mr-1" />
                          Reschedule
                        </Button>
                        <LoadingButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelBooking(booking.id)}
                          loading={cancelingId === booking.id}
                          className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <TrashIcon className="w-4 h-4 mr-1" />
                          Cancel
                        </LoadingButton>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar Integration Status */}
      {user?.role === 'barber' && (
        <Card variant="glass" padding="lg">
          <CardHeader>
            <h2 className="text-lg font-semibold">Calendar Integration</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Sync your appointments with Google Calendar
            </p>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => router.push('/settings/calendar')}
              className="flex items-center gap-2"
            >
              <CalendarDaysIcon className="w-4 h-4" />
              Manage Calendar Sync
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}