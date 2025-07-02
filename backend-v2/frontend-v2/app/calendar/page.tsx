'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Calendar from '@/components/Calendar'
import CalendarWeekView from '@/components/CalendarWeekView'
import CalendarDayView from '@/components/CalendarDayView'
import { useResponsiveCalendar } from '@/hooks/useResponsiveCalendar'
import ResponsiveCalendar from '@/components/ResponsiveCalendar'
import CalendarMonthView from '@/components/CalendarMonthView'
import CalendarSync from '@/components/CalendarSync'
import CalendarConflictResolver from '@/components/CalendarConflictResolver'
import CreateAppointmentModal from '@/components/modals/CreateAppointmentModal'
import TimePickerModal from '@/components/modals/TimePickerModal'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { LoadingButton, ErrorDisplay } from '@/components/LoadingStates'
import { getMyBookings, cancelBooking, rescheduleBooking, getProfile, getAllUsers, getLocations, type BookingResponse, type Location } from '@/lib/api'
import { useCalendarOptimisticUpdates } from '@/lib/calendar-optimistic-updates'
import { useCalendarApiEnhanced } from '@/lib/calendar-api-enhanced'
import { useRequestDeduplication } from '@/lib/request-deduplication'
import { toastError, toastSuccess, toastInfo } from '@/hooks/use-toast'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import { CalendarSkeleton, CalendarEmptyState, CalendarErrorState } from '@/components/calendar/CalendarLoadingStates'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { useCalendarInteractionManager } from '@/lib/calendar-interaction-manager'
import { CalendarVisualFeedback, useCalendarVisualFeedback } from '@/components/calendar/CalendarVisualFeedback'
import { CalendarMobileMenu } from '@/components/calendar/CalendarMobileMenu'
import { CalendarNetworkStatus, CalendarRequestQueue } from '@/components/calendar/CalendarNetworkStatus'
import { LocationSelector } from '@/components/navigation/LocationSelector'
import type { Appointment, CalendarView, User, CalendarInteraction } from '@/types/calendar'
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
  ExclamationTriangleIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline'

// Use CalendarUser type from our standardized types

export default function CalendarPage() {
  const router = useRouter()
  const responsive = useResponsiveCalendar()
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date())
  const [filteredBookings, setFilteredBookings] = useState<BookingResponse[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [barbers, setBarbers] = useState<User[]>([])
  const [cancelingId, setCancelingId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<CalendarView>('week')
  const [selectedBarberId, setSelectedBarberId] = useState<number | 'all'>('all')
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [filteredBarbers, setFilteredBarbers] = useState<User[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTimePickerModal, setShowTimePickerModal] = useState(false)
  const [preselectedTime, setPreselectedTime] = useState<string | undefined>(undefined)
  const [pendingDate, setPendingDate] = useState<Date | null>(null)
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [showConflictResolver, setShowConflictResolver] = useState(false)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [todayAppointmentCount, setTodayAppointmentCount] = useState(0)

  // Enhanced API integration with optimistic updates
  const {
    appointments: bookings,
    loading,
    error,
    setAppointments,
    refreshAppointments: refreshOptimistic
  } = useCalendarOptimisticUpdates()
  
  const {
    getAppointments,
    cancelAppointment: cancelOptimistic,
    rescheduleAppointment: rescheduleOptimistic,
    moveAppointment,
    refreshAppointments,
    getDebugStats
  } = useCalendarApiEnhanced()
  
  const { executeRequest, abortRequests, clearCache } = useRequestDeduplication()

  // Performance optimizations
  const { measureRender, optimizedAppointmentFilter } = useCalendarPerformance()
  
  // Visual feedback system
  const { 
    visualState, 
    dragState, 
    updateVisualState, 
    updateDragState,
    clearAllStates 
  } = useCalendarVisualFeedback()
  
  // Unified interaction management
  const { handlers: interactionHandlers } = useCalendarInteractionManager(
    {
      singleClickAction: 'select',
      doubleClickAction: 'create',
      enableTouchDrag: true,
      enableKeyboardNavigation: true,
      announceActions: true,
      showHoverStates: true,
      highlightDropZones: true,
      animateTransitions: true
    },
    handleCalendarInteraction,
    updateVisualState,
    (message, priority) => {
      // Announce to screen readers via toast system
      if (priority === 'assertive') {
        toastInfo('Calendar Action', message)
      }
    }
  )
  
  // Handle unified calendar interactions
  function handleCalendarInteraction(interaction: CalendarInteraction) {
    switch (interaction.type) {
      case 'select':
        if (interaction.target === 'date' && interaction.data instanceof Date) {
          setSelectedDate(interaction.data)
        } else if (interaction.target === 'appointment') {
          // Handle appointment selection
          const appointment = interaction.data as Appointment
          // Could show appointment details modal here
        }
        break
        
      case 'create':
        if (interaction.target === 'date' && interaction.data instanceof Date) {
          setSelectedDate(interaction.data)
          setPreselectedTime('09:00')
          setShowCreateModal(true)
        } else if (interaction.target === 'time-slot') {
          const date = interaction.data as Date
          setSelectedDate(date)
          setPreselectedTime(format(date, 'HH:mm'))
          setShowCreateModal(true)
        }
        break
        
      case 'edit':
        if (interaction.target === 'appointment') {
          const appointment = interaction.data as Appointment
          // Handle appointment editing
          console.log('Edit appointment:', appointment)
        }
        break
        
      case 'move':
        if (interaction.data?.appointment && interaction.data?.newDate) {
          const { appointment, newDate } = interaction.data
          handleAppointmentUpdate(appointment.id, newDate.toISOString())
        }
        break
        
      case 'delete':
        if (interaction.target === 'appointment') {
          const appointmentIds = Array.isArray(interaction.data) 
            ? interaction.data 
            : [interaction.data]
          
          // Handle bulk delete
          appointmentIds.forEach(id => {
            if (typeof id === 'number') {
              handleCancelBooking(id)
            }
          })
        }
        break
    }
  }

  // Load user profile, barbers, and bookings with enhanced API
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log('📅 Loading calendar data with enhanced API...')
        
        // Load user profile with request deduplication
        const userProfile = await executeRequest(
          {
            key: 'get-profile',
            endpoint: '/profile',
            method: 'GET'
          },
          () => getProfile()
        )
        
        setUser(userProfile)
        
        // Load locations for multi-location accounts
        try {
          if (userProfile.role === 'admin' || userProfile.role === 'enterprise_admin') {
            const userLocations = await executeRequest(
              {
                key: 'get-locations',
                endpoint: '/locations',
                method: 'GET'
              },
              () => getLocations()
            )
            console.log('📍 Loaded locations:', userLocations)
            setLocations(userLocations || [])
            
            // Set default location if we have locations
            if (userLocations && userLocations.length > 0) {
              setSelectedLocationId(userLocations[0].id)
            }
          }
        } catch (locationErr) {
          console.error('⚠️ Failed to load locations (non-critical):', locationErr)
          setLocations([])
        }
        
        // Load barbers for the filter (only for admin users or fetch all users with barber role)
        try {
          const allBarbers = await executeRequest(
            {
              key: 'get-barbers',
              endpoint: '/users?role=barber',
              method: 'GET'
            },
            () => getAllUsers('barber')
          )
          console.log('📊 Loaded barbers:', allBarbers)
          setBarbers(allBarbers || [])
        } catch (barberErr) {
          console.error('⚠️ Failed to load barbers (non-critical):', barberErr)
          // Don't fail the whole loading process if barbers can't be loaded
          setBarbers([])
        }
        
        // Load appointments with optimistic updates manager
        const userBookings = await getAppointments()
        console.log('📋 Appointments response:', userBookings)
        // The API returns { appointments: [...], total: N } not { bookings: [...] }
        setAppointments(userBookings.appointments || [])
        
        console.log('✅ Calendar data loaded successfully')
      } catch (err) {
        console.error('❌ Failed to load calendar data:', err)
        const errorMessage = 'Failed to load calendar data. Please try again.'
        toastError('Loading Error', errorMessage)
      }
    }

    loadData()
  }, [])

  // Filter bookings by selected date, location, and barber
  useEffect(() => {
    if (!selectedDate || !bookings.length) {
      setFilteredBookings([])
      return
    }

    const selectedDateStr = formatDateForAPI(selectedDate)
    const dayBookings = bookings.filter(booking => {
      try {
        const bookingDate = new Date(booking.start_time)
        const dateMatches = formatDateForAPI(bookingDate) === selectedDateStr
        
        // Apply location filter first - only show appointments from barbers in the selected location
        if (selectedLocationId && filteredBarbers.length > 0) {
          const locationBarberIds = filteredBarbers.map(barber => barber.id)
          // If booking has no barber_id, show it (could be a general appointment)
          // Otherwise, only show if barber is in the selected location
          if (booking.barber_id && !locationBarberIds.includes(booking.barber_id)) {
            return false
          }
        }
        
        // Apply barber filter
        if (selectedBarberId === 'all') {
          return dateMatches
        } else {
          return dateMatches && booking.barber_id === selectedBarberId
        }
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
  }, [selectedDate, bookings, selectedBarberId, selectedLocationId, filteredBarbers])

  // Filter barbers by selected location
  useEffect(() => {
    if (!selectedLocationId || !barbers.length) {
      setFilteredBarbers(barbers)
      return
    }

    // For now, we'll simulate location-aware barber filtering
    // In a real implementation, barbers would have location_id properties
    // For mock data, we'll filter based on barber IDs in ranges for different locations
    const locationBarbers = barbers.filter(barber => {
      // Mock location assignment based on barber ID
      const barberId = barber.id
      if (selectedLocationId === '1') return barberId <= 5        // Downtown: barbers 1-5
      if (selectedLocationId === '2') return barberId > 5 && barberId <= 8  // Uptown: barbers 6-8
      if (selectedLocationId === '3') return barberId > 8        // Westside: barbers 9+
      return true
    })

    setFilteredBarbers(locationBarbers)
    
    // Reset barber selection if current selection is not available in this location
    if (selectedBarberId !== 'all' && !locationBarbers.some(b => b.id === selectedBarberId)) {
      setSelectedBarberId('all')
    }
  }, [selectedLocationId, barbers, selectedBarberId])

  // Get all booking dates for calendar highlighting
  const bookingDates = (bookings || []).map(booking => {
    try {
      return new Date(booking.start_time)
    } catch {
      return null
    }
  }).filter(Boolean) as Date[]

  // Calculate today's revenue and appointment count (location-aware)
  useEffect(() => {
    const today = new Date()
    const todayStr = formatDateForAPI(today)
    
    const todayBookings = bookings.filter(booking => {
      try {
        const bookingDate = new Date(booking.start_time)
        const dateMatches = formatDateForAPI(bookingDate) === todayStr
        
        // Apply location filter if a location is selected
        if (selectedLocationId && filteredBarbers.length > 0) {
          const locationBarberIds = filteredBarbers.map(barber => barber.id)
          // If booking has no barber_id, include it (could be a general appointment)
          // Otherwise, only include if barber is in the selected location
          if (booking.barber_id && !locationBarberIds.includes(booking.barber_id)) {
            return false
          }
        }
        
        return dateMatches
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
  }, [bookings, selectedLocationId, filteredBarbers])

  const handleCancelBooking = async (bookingId: number) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return

    try {
      setCancelingId(bookingId)
      console.log(`🗑️ Canceling appointment ${bookingId} with optimistic update...`)
      
      // Use optimistic cancel with automatic rollback on failure
      await cancelOptimistic(bookingId)
      
      toastSuccess('Appointment Canceled', 'Your appointment has been successfully canceled.')
      console.log(`✅ Appointment ${bookingId} canceled successfully`)
    } catch (err) {
      console.error('❌ Failed to cancel booking:', err)
      const errorMessage = 'Failed to cancel appointment. Please try again.'
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
        console.log(`📅 Rescheduling appointment ${appointmentId} with optimistic update...`)
        
        // Use enhanced API with optimistic updates and automatic rollback
        await rescheduleOptimistic(appointmentId, dateStr, timeStr)
        
        toastSuccess('Appointment Rescheduled', 'Your appointment has been successfully rescheduled.')
        console.log(`✅ Appointment ${appointmentId} rescheduled successfully`)
      }
    } catch (err) {
      console.error('❌ Failed to reschedule appointment:', err)
      const errorMessage = 'Failed to reschedule appointment. Please try again.'
      toastError('Reschedule Failed', errorMessage)
    }
  }

  const handleLocationChange = (location: Location) => {
    console.log('📍 Location changed to:', location.name)
    setSelectedLocationId(location.id)
    
    // Reset barber selection when location changes to show all barbers in new location
    setSelectedBarberId('all')
    
    // Show info toast about location change with additional context
    const locationBarberCount = barbers.filter(barber => {
      // Apply same mock location assignment logic as in useEffect
      const barberId = barber.id
      if (location.id === '1') return barberId <= 5        // Downtown: barbers 1-5
      if (location.id === '2') return barberId > 5 && barberId <= 8  // Uptown: barbers 6-8
      if (location.id === '3') return barberId > 8        // Westside: barbers 9+
      return true
    }).length
    
    toastInfo('Location Changed', `Switched to ${location.name} (${locationBarberCount} barbers)`)
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
      <div className="calendar-page p-6 space-y-6 md:p-6 sm:p-4">
      {/* Header */}
      <div className="calendar-header flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="order-1 lg:order-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm lg:text-base">
            Manage your appointments and schedule
          </p>
          
          {/* Location Selector - Only show for multi-location accounts */}
          {locations.length > 1 && (
            <div className="mt-3 max-w-sm">
              <LocationSelector
                locations={locations}
                currentLocationId={selectedLocationId || undefined}
                onLocationChange={handleLocationChange}
                compact={true}
                showStats={false}
                placeholder={locations.length === 0 ? "Loading locations..." : "Select location"}
                className="w-full"
              />
            </div>
          )}
          
          {/* Show loading state for locations */}
          {(user?.role === 'admin' || user?.role === 'enterprise_admin') && locations.length === 0 && (
            <div className="mt-3 max-w-sm">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading locations...</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Current Location Indicator - Show even for single location */}
          {locations.length === 1 && selectedLocationId && (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <BuildingOfficeIcon className="w-4 h-4" />
              <span>{locations.find(loc => loc.id === selectedLocationId)?.name}</span>
            </div>
          )}
        </div>
        
        {/* Today's Stats - Responsive */}
        <div className="calendar-stats order-3 lg:order-2 flex flex-row lg:flex-row items-center justify-center lg:justify-start gap-4 lg:gap-6">
          <div className="calendar-stat-item text-center p-3 lg:p-0 bg-gray-50 dark:bg-gray-800 lg:bg-transparent rounded-lg lg:rounded-none flex-1 lg:flex-initial">
            <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              {todayAppointmentCount}
            </div>
            <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Today's Appointments</div>
          </div>
          <div className="calendar-stat-item text-center p-3 lg:p-0 bg-gray-50 dark:bg-gray-800 lg:bg-transparent rounded-lg lg:rounded-none flex-1 lg:flex-initial">
            <div className="text-xl lg:text-2xl font-bold text-green-600 dark:text-green-400">
              ${todayRevenue.toFixed(2)}
            </div>
            <div className="text-xs lg:text-sm text-gray-500 dark:text-gray-400">Today's Revenue</div>
          </div>
          
          {/* Network Status Indicator */}
          <div className="hidden lg:block">
            <CalendarNetworkStatus />
          </div>
        </div>
        
        <div className="order-2 lg:order-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* View Mode Switcher - Mobile Optimized */}
          <div className="calendar-view-switcher flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setViewMode('day')}
              className={`calendar-nav-button flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded transition-colors min-h-[44px] ${
                viewMode === 'day' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`calendar-nav-button flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded transition-colors min-h-[44px] ${
                viewMode === 'week' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`calendar-nav-button flex-1 sm:flex-initial px-4 py-2 text-sm font-medium rounded transition-colors min-h-[44px] ${
                viewMode === 'month' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Month
            </button>
          </div>
          
          {/* Action Buttons - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="calendar-action-button flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">New Appointment</span>
              <span className="sm:hidden">New</span>
            </Button>
            
            {/* Google Calendar Sync Button - Only for barbers - Mobile Responsive */}
            {user?.role === 'barber' && (
              <div className="hidden sm:flex items-center gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowSyncPanel(!showSyncPanel)}
                  className="calendar-action-button flex items-center gap-2 min-h-[44px]"
                >
                  <ArrowsRightLeftIcon className="w-4 h-4" />
                  <span className="hidden lg:inline">Sync</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => setShowConflictResolver(!showConflictResolver)}
                  className="calendar-action-button flex items-center gap-2 min-h-[44px]"
                >
                  <ExclamationTriangleIcon className="w-4 h-4" />
                  <span className="hidden lg:inline">Conflicts</span>
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => router.push('/barber-availability')}
                  className="calendar-action-button flex items-center gap-2 min-h-[44px]"
                >
                  <CalendarDaysIcon className="w-4 h-4" />
                  <span className="hidden lg:inline">Availability</span>
                </Button>
              </div>
            )}
            
            {/* Recurring Appointments Button - For all users */}
            <Button 
              variant="outline"
              onClick={() => router.push('/recurring')}
              className="calendar-action-button flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
            >
              <ClockIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Recurring</span>
              <span className="sm:hidden">Recurring</span>
            </Button>
            
            {/* Mobile menu for additional options */}
            <CalendarMobileMenu
              user={user}
              onSyncToggle={() => setShowSyncPanel(!showSyncPanel)}
              onConflictToggle={() => setShowConflictResolver(!showConflictResolver)}
            />
          </div>
        </div>
      </div>

      <CalendarErrorBoundary context={`calendar-${viewMode}-view`}>
        {viewMode === 'day' ? (
          // Day View
          <Card variant="glass" padding="none" className="col-span-full h-[800px]">
            <CalendarDayView
              appointments={bookings}
              barbers={filteredBarbers}
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
              barbers={filteredBarbers}
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
          // Refresh appointments after successful creation using enhanced API
          console.log('📅 Appointment created, refreshing calendar with enhanced API...')
          try {
            // Use enhanced refresh that automatically handles optimistic updates
            await refreshAppointments()
            setPreselectedTime(undefined)
            
            console.log('✅ Calendar refreshed successfully with optimistic updates')
            
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
      
      {/* Visual feedback overlay */}
      <CalendarVisualFeedback
        visualState={visualState}
        dragState={dragState}
        enableAnimations={true}
      />
      
      {/* Debug request queue (development only) */}
      <CalendarRequestQueue />
      
      </div>
    </ErrorBoundary>
  )
}