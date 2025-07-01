'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ResponsiveCalendar from '@/components/ResponsiveCalendar'
import CreateAppointmentModal from '@/components/modals/CreateAppointmentModal'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingButton, ErrorDisplay } from '@/components/LoadingStates'
import { getMyBookings, cancelBooking, rescheduleBooking, getProfile, type BookingResponse } from '@/lib/api'
import { useCalendarOptimisticUpdates } from '@/lib/calendar-optimistic-updates'
import { useCalendarApiEnhanced } from '@/lib/calendar-api-enhanced'
import { toastError, toastSuccess, toastInfo } from '@/hooks/use-toast'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import { CalendarSkeleton, CalendarEmptyState } from '@/components/calendar/CalendarLoadingStates'
import { useResponsiveCalendar } from '@/hooks/useResponsiveCalendar'
import { CalendarNetworkStatus } from '@/components/calendar/CalendarNetworkStatus'
import type { User } from '@/types/calendar'
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

export default function ResponsiveCalendarPage() {
  const router = useRouter()
  const responsive = useResponsiveCalendar()
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [user, setUser] = useState<User | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedBarberId, setSelectedBarberId] = useState<number | 'all'>('all')
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [todayAppointmentCount, setTodayAppointmentCount] = useState(0)
  const [pendingCreateDate, setPendingCreateDate] = useState<Date | null>(null)

  // Enhanced API integration
  const {
    appointments: bookings,
    loading,
    error,
    refreshAppointments: refreshOptimistic
  } = useCalendarOptimisticUpdates()
  
  const {
    cancelAppointment: cancelOptimistic,
    rescheduleAppointment: rescheduleOptimistic,
    refreshAppointments
  } = useCalendarApiEnhanced()

  // Load user profile and appointments
  useEffect(() => {
    const loadData = async () => {
      try {
        const userData = await getProfile()
        setUser(userData)
        await refreshAppointments()
      } catch (error) {
        console.error('Failed to load data:', error)
        toastError('Failed to load calendar data')
      }
    }
    loadData()
  }, [])

  // Calculate today's stats
  useEffect(() => {
    const today = new Date()
    const todayBookings = bookings.filter(booking => {
      const bookingDate = new Date(booking.start_time)
      return bookingDate.toDateString() === today.toDateString()
    })
    
    setTodayAppointmentCount(todayBookings.length)
    setTodayRevenue(todayBookings.reduce((sum, booking) => sum + (booking.price || 0), 0))
  }, [bookings])

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) {
      return
    }

    try {
      await cancelOptimistic(bookingId)
      toastSuccess('Appointment cancelled successfully')
    } catch (error: any) {
      toastError(error.message || 'Failed to cancel appointment')
    }
  }

  const handleAppointmentUpdate = async (appointmentId: number, newStartTime: string) => {
    try {
      // Parse the date and time from newStartTime
      const newDate = new Date(newStartTime)
      const dateStr = format(newDate, 'yyyy-MM-dd')
      const timeStr = format(newDate, 'HH:mm')
      
      await rescheduleOptimistic(appointmentId, dateStr, timeStr)
      toastSuccess('Appointment rescheduled successfully')
    } catch (error: any) {
      toastError(error.message || 'Failed to reschedule appointment')
    }
  }

  const handleCreateAppointment = (date: Date) => {
    setPendingCreateDate(date)
    setShowCreateModal(true)
  }

  const handleAppointmentClick = (appointment: any) => {
    // Show appointment details modal or navigate to detail page
    console.log('Appointment clicked:', appointment)
  }

  return (
    <CalendarErrorBoundary>
      <div className="h-full flex flex-col">
        {/* Header - responsive sizing */}
        <div className={`${responsive.isMobile ? 'px-4 py-3' : 'px-6 py-4'} bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700`}>
          <div className="flex items-center justify-between">
            <h1 className={`${responsive.isMobile ? 'text-xl' : 'text-2xl'} font-bold text-gray-900 dark:text-white`}>
              Calendar
            </h1>
            
            {/* Desktop stats */}
            {!responsive.isMobile && (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Today: <strong className="text-gray-900 dark:text-white">{todayAppointmentCount}</strong> appointments
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Revenue: <strong className="text-gray-900 dark:text-white">${todayRevenue}</strong>
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile stats bar */}
          {responsive.isMobile && (
            <div className="mt-3 flex items-center justify-around py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Today</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{todayAppointmentCount}</p>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-600" />
              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">${todayRevenue}</p>
              </div>
              <div className="w-px h-8 bg-gray-200 dark:bg-gray-600" />
              <div className="text-center">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreateModal(true)}
                  className="text-xs"
                >
                  <PlusIcon className="w-4 h-4" />
                  New
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Network status indicator */}
        <CalendarNetworkStatus className="border-b border-gray-200 dark:border-gray-700" />

        {/* Main calendar content */}
        <div className={`flex-1 overflow-hidden ${responsive.isMobile ? 'px-0' : 'p-6'}`}>
          {loading ? (
            <CalendarSkeleton view={responsive.optimalView === 'agenda' ? 'day' : responsive.optimalView} />
          ) : error ? (
            <ErrorDisplay error={error} onRetry={refreshAppointments} />
          ) : bookings.length === 0 && !selectedDate ? (
            <CalendarEmptyState 
              view={responsive.optimalView === 'agenda' ? 'day' : responsive.optimalView} 
              onCreateAppointment={() => setShowCreateModal(true)} 
            />
          ) : (
            <ResponsiveCalendar
              appointments={bookings}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onAppointmentClick={handleAppointmentClick}
              onAppointmentUpdate={handleAppointmentUpdate}
              onCreateAppointment={handleCreateAppointment}
              selectedBarberId={selectedBarberId}
              className="h-full"
            />
          )}
        </div>

        {/* Create appointment modal */}
        <CreateAppointmentModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setPendingCreateDate(null)
          }}
          preselectedDate={pendingCreateDate || selectedDate || undefined}
          onSuccess={async () => {
            await refreshAppointments()
            setShowCreateModal(false)
            setPendingCreateDate(null)
            toastSuccess('Appointment created successfully')
          }}
        />
      </div>
    </CalendarErrorBoundary>
  )
}