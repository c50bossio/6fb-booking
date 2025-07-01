'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Calendar from '@/components/Calendar'
import CalendarWeekView from '@/components/CalendarWeekView'
import CalendarDayView from '@/components/CalendarDayView'
import CalendarMonthView from '@/components/CalendarMonthView'
import CalendarSync from '@/components/CalendarSync'
import CalendarConflictResolver from '@/components/CalendarConflictResolver'
import CreateAppointmentModal from '@/components/modals/CreateAppointmentModal'
import TimePickerModal from '@/components/modals/TimePickerModal'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingButton, ErrorDisplay } from '@/components/LoadingStates'
import { getMyBookings, cancelBooking, rescheduleBooking, getProfile, type BookingResponse } from '@/lib/api'
import { toastError, toastSuccess } from '@/hooks/use-toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import { CalendarSkeleton, CalendarEmptyState, CalendarErrorState } from '@/components/calendar/CalendarLoadingStates'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import type { Appointment, CalendarView, User } from '@/types/calendar'
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
  PlusIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

// Use CalendarUser type from our standardized types

export default function CalendarPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [filteredBookings, setFilteredBookings] = useState<BookingResponse[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelingId, setCancelingId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<CalendarView>('week')
  const [selectedBarberId, setSelectedBarberId] = useState<number | 'all'>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTimePickerModal, setShowTimePickerModal] = useState(false)
  const [preselectedTime, setPreselectedTime] = useState<string | undefined>(undefined)
  const [pendingDate, setPendingDate] = useState<Date | null>(null)
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [showConflictResolver, setShowConflictResolver] = useState(false)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [todayAppointmentCount, setTodayAppointmentCount] = useState(0)

  // Performance optimizations
  const { measureRender, optimizedAppointmentFilter } = useCalendarPerformance()

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
        setBookings(userBookings.bookings || [])
        setError(null)
      } catch (err) {
        console.error('Failed to load calendar data:', err)
        const errorMessage = 'Failed to load calendar data. Please try again.'
        setError(errorMessage)
        toastError('Loading Error', errorMessage)
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
        const bookingDate = new Date(booking.start_time)
        return formatDateForAPI(bookingDate) === selectedDateStr
      } catch {
        return false
      }
    })

    // Sort by time
    dayBookings.sort((a, b) => {
      const timeA = new Date(a.start_time).getTime()
      const timeB = new Date(b.start_time).getTime()
      return timeA - timeB
    })

    setFilteredBookings(dayBookings)
  }, [selectedDate, bookings])

  // Get all booking dates for calendar highlighting
  const bookingDates = (bookings || []).map(booking => {
    try {
      return new Date(booking.start_time)
    } catch {
      return null
    }
  }).filter(Boolean) as Date[]

  // Calculate today's revenue and appointment count
  useEffect(() => {
    const today = new Date()
    const todayStr = formatDateForAPI(today)
    
    const todayBookings = bookings.filter(booking => {
      try {
        const bookingDate = new Date(booking.start_time)
        return formatDateForAPI(bookingDate) === todayStr
      } catch {
        return false
      }
    })

    // Count all appointments for today
    setTodayAppointmentCount(todayBookings.length)

    // Calculate revenue from completed appointments
    const revenue = todayBookings
      .filter(booking => booking.status === 'completed')
      .reduce((sum, booking) => sum + (booking.price || 0), 0)

    setTodayRevenue(revenue)
  }, [bookings])

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    try {
      setCancelingId(bookingId)
      await cancelBooking(bookingId)
      
      // Refresh bookings
      const updatedBookings = await getMyBookings()
      setBookings(updatedBookings.bookings || [])
      toastSuccess('Appointment Canceled', 'Your appointment has been successfully canceled.')
    } catch (err) {
      console.error('Failed to cancel booking:', err)
      const errorMessage = 'Failed to cancel appointment. Please try again.'
      setError(errorMessage)
      toastError('Cancellation Failed', errorMessage)
    } finally {
      setCancelingId(null)
    }
  }

  const handleReschedule = (bookingId: number) => {
    router.push(`/bookings?reschedule=${bookingId}`)
  }

  const handleAppointmentUpdate = async (appointmentId: number, newStartTime: string) => {
    try {
      // Parse the date and time from newStartTime
      const newDate = new Date(newStartTime)
      const dateStr = format(newDate, 'yyyy-MM-dd')
      const timeStr = format(newDate, 'HH:mm')
      
      // Show confirmation dialog
      if (confirm(`Reschedule this appointment to ${format(newDate, 'MMM d, h:mm a')}?`)) {
        // Update the appointment via API with separate date and time parameters
        await rescheduleBooking(appointmentId, dateStr, timeStr)
        
        // Refresh the bookings
        const updatedBookings = await getMyBookings()
        setBookings(updatedBookings.bookings || [])
        
        toastSuccess('Appointment Rescheduled', 'Your appointment has been successfully rescheduled.')
      }
    } catch (err) {
      console.error('Failed to reschedule appointment:', err)
      const errorMessage = 'Failed to reschedule appointment. Please try again.'
      setError(errorMessage)
      toastError('Reschedule Failed', errorMessage)
    }
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
      <div className="p-6 space-y-6">
        <CalendarSkeleton view={viewMode} showStats={true} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <CalendarErrorState 
          error={error} 
          onRetry={() => window.location.reload()}
          context="calendar-page-load"
        />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your appointments and schedule
          </p>
        </div>
        
        {/* Today's Stats */}
        <div className="flex items-center gap-6 mr-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {todayAppointmentCount}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Today's Appointments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${todayRevenue.toFixed(2)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Today's Revenue</div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                viewMode === 'day' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                viewMode === 'week' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                viewMode === 'month' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Month
            </button>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              New Appointment
            </Button>
            
            {/* Google Calendar Sync Button - Only for barbers */}
            {user?.role === 'barber' && (
              <>
                <Button 
                  variant="outline"
                  onClick={() => setShowSyncPanel(!showSyncPanel)}
                  className="flex items-center gap-2"
                >
                  <ArrowsRightLeftIcon className="w-4 h-4" />
                  Sync
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setShowConflictResolver(!showConflictResolver)}
                  className="flex items-center gap-2"
                >
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  Conflicts
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => router.push('/barber-availability')}
                  className="flex items-center gap-2"
                >
                  <CalendarDaysIcon className="w-4 h-4" />
                  Availability
                </Button>
              </>
            )}
            
            {/* Recurring Appointments Button - For all users */}
            <Button 
              variant="outline"
              onClick={() => router.push('/recurring')}
              className="flex items-center gap-2"
            >
              <ClockIcon className="w-4 h-4" />
              Recurring
            </Button>
          </div>
        </div>
      </div>

      <CalendarErrorBoundary context={`calendar-${viewMode}-view`}>
        {viewMode === 'day' ? (
          // Day View
          <Card variant="glass" padding="none" className="col-span-full h-[800px]">
            <CalendarDayView
              appointments={bookings}
              selectedBarberId={selectedBarberId}
              onBarberSelect={setSelectedBarberId}
              onAppointmentClick={(appointment) => {
                // Set selected date to appointment date
                const appointmentDate = new Date(appointment.start_time)
                setSelectedDate(appointmentDate)
              }}
              onTimeSlotClick={(date) => {
                // Open modal with pre-selected date/time
                setSelectedDate(date)
                setPreselectedTime(format(date, 'HH:mm'))
                setShowCreateModal(true)
              }}
              onAppointmentUpdate={handleAppointmentUpdate}
              currentDate={selectedDate || new Date()}
              onDateChange={setSelectedDate}
            />
          </Card>
        ) : viewMode === 'week' ? (
          // Week View
          <Card variant="glass" padding="none" className="col-span-full">
            <CalendarWeekView
              appointments={bookings}
              selectedBarberId={selectedBarberId}
              onBarberSelect={setSelectedBarberId}
              onAppointmentClick={(appointment) => {
                // Set selected date to appointment date
                const appointmentDate = new Date(appointment.start_time)
                setSelectedDate(appointmentDate)
              }}
              onTimeSlotClick={(date) => {
                // Open modal with pre-selected date/time
                setSelectedDate(date)
                setPreselectedTime(format(date, 'HH:mm'))
                setShowCreateModal(true)
              }}
              onAppointmentUpdate={handleAppointmentUpdate}
              currentDate={selectedDate || new Date()}
              onDateChange={setSelectedDate}
            />
          </Card>
        ) : (
          // Enhanced Month View
          <Card variant="glass" padding="none" className="col-span-full">
            <CalendarMonthView
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              appointments={bookings}
              selectedBarberId={selectedBarberId}
              onAppointmentClick={(appointment) => {
                // Set selected date to appointment date and view details
                const appointmentDate = new Date(appointment.start_time)
                setSelectedDate(appointmentDate)
                // Could open appointment details modal here
              }}
              onAppointmentUpdate={handleAppointmentUpdate}
              onDayClick={(date) => {
                // Single click to create new appointment with time picker
                setPendingDate(date)
                setShowTimePickerModal(true)
              }}
              onDayDoubleClick={(date) => {
                // Double-click also creates appointment (backward compatibility)
                setSelectedDate(date)
                setPreselectedTime('09:00') // Default time
                setShowCreateModal(true)
              }}
            />
          </Card>
        )}
      </CalendarErrorBoundary>

      {/* Google Calendar Sync Panel */}
      {user?.role === 'barber' && showSyncPanel && (
        <div className="mt-6">
          <CalendarSync />
        </div>
      )}

      {/* Conflict Resolver Panel */}
      {user?.role === 'barber' && showConflictResolver && (
        <div className="mt-6">
          <CalendarConflictResolver />
        </div>
      )}

      {/* Calendar Integration Status */}
      {user?.role === 'barber' && !showSyncPanel && (
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
              Manage Calendar Settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setPreselectedTime(undefined)
        }}
        preselectedDate={selectedDate || undefined}
        preselectedTime={preselectedTime}
        onSuccess={async () => {
          // Refresh appointments after successful creation
          console.log('📅 Appointment created, refreshing calendar...')
          try {
            // Add a small delay to ensure database transaction is committed
            await new Promise(resolve => setTimeout(resolve, 200))
            
            const userBookings = await getMyBookings()
            console.log('📊 Fetched bookings:', userBookings)
            setBookings(userBookings.bookings || [])
            setPreselectedTime(undefined)
            console.log('✅ Calendar refreshed with', userBookings.bookings?.length || 0, 'appointments')
            
            // Show success notification
            toastSuccess('Appointment Created', 'Your appointment has been successfully created and added to the calendar.')
          } catch (err) {
            console.error('❌ Failed to refresh bookings:', err)
            toastError('Refresh Failed', 'Appointment was created but calendar refresh failed. Please refresh the page.')
          }
        }}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        isOpen={showTimePickerModal}
        onClose={() => {
          setShowTimePickerModal(false)
          setPendingDate(null)
        }}
        selectedDate={pendingDate || undefined}
        onSelectTime={(time) => {
          setSelectedDate(pendingDate)
          setPreselectedTime(time)
          setShowTimePickerModal(false)
          setShowCreateModal(true)
          setPendingDate(null)
        }}
      />
      </div>
    </ErrorBoundary>
  )
}