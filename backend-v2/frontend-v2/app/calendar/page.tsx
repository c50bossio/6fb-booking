'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { handleAuthError } from '@/lib/auth-error-handler'
// Using UnifiedCalendar for all calendar views

// Import unified calendar component
import { Suspense, lazy } from 'react'
import UnifiedCalendar from '@/components/UnifiedCalendar'
const CalendarSync = lazy(() => import('@/components/CalendarSync'))
const CalendarConflictResolver = lazy(() => import('@/components/CalendarConflictResolver'))
const AvailabilityHeatmap = lazy(() => import('@/components/calendar/AvailabilityHeatmap'))
const EnhancedRevenueDisplay = lazy(() => import('@/components/calendar/EnhancedRevenueDisplay'))
const QuickBookingPanel = lazy(() => import('@/components/calendar/QuickBookingPanel'))
const QuickBookingFAB = lazy(() => import('@/components/calendar/QuickBookingFAB'))
const CalendarAnalyticsSidebar = lazy(() => import('@/components/calendar/CalendarAnalyticsSidebar'))
import CreateAppointmentModal from '@/components/modals/CreateAppointmentModal'
import TimePickerModal from '@/components/modals/TimePickerModal'
import RescheduleModal from '@/components/modals/RescheduleModal'
import { TimeSlotContextMenu } from '@/components/calendar/TimeSlotContextMenu'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingButton, ErrorDisplay } from '@/components/LoadingStates'
import { getMyBookings, cancelBooking, rescheduleBooking, getProfile, getAllUsers, getLocations, type BookingResponse, type Location } from '@/lib/api'
import { useCalendarOptimisticUpdates } from '@/lib/calendar-optimistic-updates'
import { useCalendarApiEnhanced } from '@/lib/calendar-api-enhanced'
import { useRequestDeduplication } from '@/lib/request-deduplication'
import { toastError, toastSuccess, toastInfo } from '@/hooks/use-toast'
import { CalendarErrorHandler, withTimeout, CALENDAR_TIMEOUTS } from '@/lib/calendar-error-handler'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CalendarErrorBoundary } from '@/components/calendar/CalendarErrorBoundary'
import { CalendarSkeleton, CalendarEmptyState, CalendarErrorState, CalendarSmartLoading } from '@/components/calendar/CalendarLoadingStates'
import { useCalendarLoading } from '@/hooks/useCalendarLoading'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { useCalendarInteractionManager } from '@/lib/calendar-interaction-manager'
import { CalendarVisualFeedback, useCalendarVisualFeedback } from '@/components/calendar/CalendarVisualFeedback'
import { CalendarMobileMenu } from '@/components/calendar/CalendarMobileMenu'
import { CalendarNetworkStatus, CalendarRequestQueue } from '@/components/calendar/CalendarNetworkStatus'
import { LocationSelector } from '@/components/navigation/LocationSelector'
import { LocationSelectorLoadingState, LocationSelectorErrorState } from '@/components/navigation/LocationSelectorSkeleton'
import { CalendarExport } from '@/components/calendar/CalendarExport'
import type { Appointment, AppointmentStatus, CalendarView, User, CalendarInteraction } from '@/types/calendar'
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
  const [locationLoadingError, setLocationLoadingError] = useState<string | null>(null)
  const [isLoadingLocations, setIsLoadingLocations] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showTimePickerModal, setShowTimePickerModal] = useState(false)
  const [preselectedTime, setPreselectedTime] = useState<string | undefined>(undefined)
  const [pendingDate, setPendingDate] = useState<Date | null>(null)
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  const [showConflictResolver, setShowConflictResolver] = useState(false)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [rescheduleModalData, setRescheduleModalData] = useState<{ appointmentId: number; newStartTime: string } | null>(null)
  const [todayRevenue, setTodayRevenue] = useState(0)
  const [todayAppointmentCount, setTodayAppointmentCount] = useState(0)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [revenueCollapsed, setRevenueCollapsed] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    timeSlot: { date: Date; hour: number; minute: number }
  }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    timeSlot: { date: new Date(), hour: 0, minute: 0 }
  })

  // Enhanced API integration with optimistic updates
  const {
    appointments: bookings,
    loading,
    error,
    setAppointments,
    refreshAppointments: refreshOptimistic
  } = useCalendarOptimisticUpdates()
  
  // Load locations with enhanced error handling and retry
  const loadLocations = async () => {
    try {
      setIsLoadingLocations(true)
      setLocationLoadingError(null)
      
      const userLocations = await CalendarErrorHandler.retryWithBackoff(
        async () => {
          return await withTimeout(
            executeRequest(
              {
                key: 'get-locations',
                endpoint: '/locations',
                method: 'GET'
              },
              () => getLocations()
            ),
            CALENDAR_TIMEOUTS.DEFAULT
          )
        },
        'location-load',
        { maxRetries: 2 }
      )
      
      // Locations loaded successfully
      setLocations(userLocations || [])
      
      // Set default location if we have locations
      if (userLocations && userLocations.length > 0) {
        setSelectedLocationId(userLocations[0].id)
      }
    } catch (locationErr) {
      // Enhanced error handling with specific messages
      const error = await CalendarErrorHandler.handleError(locationErr, 'location-load')
      setLocationLoadingError(error.message)
      setLocations([])
      
      // If it's a network error and we're offline, show a more helpful message
      if (!navigator.onLine) {
        setLocationLoadingError('You appear to be offline. Location features will be available when you reconnect.')
      }
    } finally {
      setIsLoadingLocations(false)
    }
  }
  
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

  // Keyboard shortcuts for quick booking
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd+B or Ctrl+B for quick booking
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault()
        
        if (e.shiftKey) {
          // Cmd+Shift+B for custom booking
          router.push('/book')
        } else {
          // Cmd+B for quick booking (open quick booking panel/modal)
          const quickBookButton = document.querySelector('[data-quick-book-trigger]')
          if (quickBookButton instanceof HTMLElement) {
            quickBookButton.click()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [router])
  
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
          // Edit appointment action initiated
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
        // Loading calendar data with enhanced API...
        
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
        if (userProfile.role === 'admin' || userProfile.role === 'enterprise_admin') {
          await loadLocations()
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
          // Barbers loaded successfully
          setBarbers(allBarbers || [])
        } catch (barberErr) {
          console.error('⚠️ Failed to load barbers (non-critical):', barberErr)
          // Don't fail the whole loading process if barbers can't be loaded
          setBarbers([])
        }
        
        // Load appointments with optimistic updates manager
        const userBookings = await getAppointments()
        // Appointments loaded successfully
        // The API returns { bookings: [...] } format
        setAppointments(userBookings.bookings || [])
        
        // Calendar data loaded successfully
      } catch (err) {
        console.error('❌ Failed to load calendar data:', err)
        
        // Check if it's an authentication error
        if (handleAuthError(err, router)) {
          // Auth error handled, redirect will happen
          return
        }
        
        // Non-auth error, show error state
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
      
      // Use optimistic cancel with timeout and retry
      await CalendarErrorHandler.retryWithBackoff(
        async () => {
          return await withTimeout(
            cancelOptimistic(bookingId),
            CALENDAR_TIMEOUTS.APPOINTMENT
          )
        },
        'appointment-cancel',
        { maxRetries: 2 }
      )
      
      toastSuccess('Appointment Canceled', 'Your appointment has been successfully canceled.')
      
      // Clear any error history on success
      CalendarErrorHandler.clearRetryHistory('appointment-cancel')
    } catch (err) {
      // Enhanced error handling
      const error = await CalendarErrorHandler.handleError(err, 'appointment-cancel')
      
      // If offline, show specific message
      if (!navigator.onLine) {
        toastError('Offline', 'Cannot cancel appointment while offline. Please reconnect and try again.')
      }
    } finally {
      setCancelingId(null)
    }
  }

  const handleReschedule = (bookingId: number) => {
    router.push(`/bookings?reschedule=${bookingId}`)
  }

  const handleModalReschedule = async (updates: any) => {
    try {
      // Parse the date and time from start_time
      const newDate = new Date(updates.start_time)
      const dateStr = format(newDate, 'yyyy-MM-dd')
      const timeStr = format(newDate, 'HH:mm')
      
      // Enhanced reschedule with timeout and retry
      await CalendarErrorHandler.retryWithBackoff(
        async () => {
          return await withTimeout(
            rescheduleOptimistic(updates.id, dateStr, timeStr),
            CALENDAR_TIMEOUTS.APPOINTMENT
          )
        },
        'appointment-reschedule',
        { maxRetries: 2 }
      )
      
      // Close modal and show success
      setShowRescheduleModal(false)
      setRescheduleModalData(null)
      toastSuccess('Appointment Rescheduled', 'Your appointment has been successfully rescheduled.')
      
      // Clear error history on success
      CalendarErrorHandler.clearRetryHistory('appointment-reschedule')
      
      // Handle recurring appointments with proper feedback
      if (updates.recurring_pattern) {
        toastInfo('Recurring Pattern', 'Recurring appointment pattern saved. This feature is coming soon!')
      }
      if (updates.notes) {
        // Notes are saved with the reschedule
      }
      
    } catch (err) {
      const error = await CalendarErrorHandler.handleError(err, 'appointment-reschedule')
      
      // Show specific error for conflicts
      if (error.type === 'CONFLICT_RESOLUTION_FAILED') {
        toastError('Time Conflict', 'The selected time slot is not available. Please choose another time.')
      } else if (!navigator.onLine) {
        toastError('Offline', 'Cannot reschedule while offline. Please reconnect and try again.')
      }
      
      // Don't close modal on error so user can try again
    }
  }

  const handleAppointmentUpdate = async (appointmentId: number, newStartTime: string, isDragDrop: boolean = false) => {
    try {
      // For drag & drop, update directly without modal
      if (isDragDrop) {
        // Parse the ISO timestamp to get date and time components
        const newDate = new Date(newStartTime)
        const dateStr = format(newDate, 'yyyy-MM-dd')
        const timeStr = format(newDate, 'HH:mm')
        
        // Find the appointment to get its duration
        const appointment = bookings.find(b => b.id === appointmentId)
        if (!appointment) {
          throw new Error('Appointment not found')
        }
        
        // Use the enhanced API to move the appointment
        await CalendarErrorHandler.retryWithBackoff(
          async () => {
            return await withTimeout(
              moveAppointment(appointmentId, newStartTime),
              CALENDAR_TIMEOUTS.APPOINTMENT
            )
          },
          'appointment-drag-drop',
          { maxRetries: 2 }
        )
        
        toastSuccess('Appointment Moved', `Appointment moved to ${format(newDate, 'MMM d, h:mm a')}`)
        
        // Clear error history on success
        CalendarErrorHandler.clearRetryHistory('appointment-drag-drop')
      } else {
        // For other interactions, show the reschedule modal
        setRescheduleModalData({ appointmentId, newStartTime })
        setShowRescheduleModal(true)
      }
    } catch (err) {
      console.error('❌ Failed to update appointment:', err)
      const error = await CalendarErrorHandler.handleError(err, isDragDrop ? 'appointment-drag-drop' : 'appointment-update')
      
      if (!navigator.onLine) {
        toastError('Offline', 'Cannot move appointment while offline. Please reconnect and try again.')
      } else if (error.type === 'CONFLICT_RESOLUTION_FAILED') {
        toastError('Time Conflict', 'That time slot is not available. Please choose another time.')
      } else {
        toastError('Update Failed', 'Failed to move appointment. Please try again.')
      }
    }
  }

  const handleLocationChange = (location: Location) => {
    // Location changed successfully
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

  // Context menu handler functions
  const handleContextMenuClose = () => {
    setContextMenu(prev => ({ ...prev, isOpen: false }))
  }

  const handleBlockSlot = async (date: Date, hour: number, minute: number) => {
    try {
      const blockDate = new Date(date)
      blockDate.setHours(hour, minute, 0, 0)
      
      const endTime = new Date(blockDate)
      endTime.setMinutes(endTime.getMinutes() + 30) // Default 30-minute block
      
      const blackoutData = {
        blackout_date: format(blockDate, 'yyyy-MM-dd'),
        start_time: format(blockDate, 'HH:mm'),
        end_time: format(endTime, 'HH:mm'),
        blackout_type: 'partial_day',
        reason: 'Manually blocked slot',
        description: `Blocked via calendar context menu on ${format(blockDate, 'PPpp')}`,
        is_recurring: false,
        allow_emergency_bookings: false,
        affects_existing_appointments: false,
        auto_reschedule: false
      }
      
      // Make API call to create blackout
      const response = await fetch('/api/v2/blackouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(blackoutData)
      })
      
      if (!response.ok) {
        throw new Error(`Failed to block slot: ${response.statusText}`)
      }
      
      toastSuccess('Slot Blocked', `Time slot ${format(blockDate, 'h:mm a')} has been blocked`)
      
      // Refresh calendar to show the blocked slot
      await refreshOptimistic(() => getMyBookings())
      
    } catch (error) {
      console.error('Failed to block slot:', error)
      toastError('Block Failed', 'Failed to block time slot. Please try again.')
    }
  }

  const handleContextMenuCreateAppointment = (date: Date) => {
    setSelectedDate(date)
    setPreselectedTime(format(date, 'HH:mm'))
    setShowCreateModal(true)
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <CalendarSmartLoading
          context="calendar"
          variant="detailed"
          autoProgress={true}
          onComplete={() => {
            // Loading animation complete
          }}
        />
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
      <div className="calendar-page p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="calendar-header flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="order-1 lg:order-1">
          <h1 className="text-ios-largeTitle font-bold text-accent-900 dark:text-white tracking-tight">Calendar</h1>
          <p className="text-accent-600 dark:text-gray-400 text-sm lg:text-base">
            Manage your appointments and schedule
          </p>
          
          {/* Location Selector - Only show for multi-location accounts */}
          {(user?.role === 'admin' || user?.role === 'enterprise_admin') && (
            <div className="mt-3 max-w-sm">
              {isLoadingLocations ? (
                <LocationSelectorLoadingState compact={true} />
              ) : locationLoadingError ? (
                <LocationSelectorErrorState 
                  compact={true}
                  error={locationLoadingError}
                  onRetry={loadLocations}
                />
              ) : locations.length > 1 ? (
                <LocationSelector
                  locations={locations}
                  currentLocationId={selectedLocationId || undefined}
                  onLocationChange={handleLocationChange}
                  compact={true}
                  showStats={false}
                  placeholder="Select location"
                  className="w-full"
                />
              ) : locations.length === 1 ? (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <BuildingOfficeIcon className="w-4 h-4" />
                  <span>{locations[0].name}</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
        
        {/* Enhanced Revenue Display - Desktop */}
        <div className="calendar-stats order-3 lg:order-2 hidden lg:block">
          <Suspense fallback={
            <div className="animate-pulse">
              <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>
          }>
            <EnhancedRevenueDisplay
              appointments={bookings}
              todayRevenue={todayRevenue}
              todayCount={todayAppointmentCount}
              selectedDate={selectedDate || new Date()}
              collapsed={false}
            />
          </Suspense>
        </div>
        
        <div className="order-2 lg:order-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          
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
            
            {/* Heatmap Toggle Button */}
            <Button 
              variant="outline"
              onClick={() => setShowHeatmap(!showHeatmap)}
              className="calendar-action-button flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
              title={showHeatmap ? "Hide availability heatmap" : "Show availability heatmap"}
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                />
              </svg>
              <span className="hidden sm:inline">Heatmap</span>
              <span className="sm:hidden">Heat</span>
            </Button>
            
            {/* Analytics Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="calendar-action-button flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto"
              title="View Analytics"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16"
                />
              </svg>
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </Button>
            
            {/* Export Button */}
            <CalendarExport 
              appointments={bookings as any}
              selectedAppointments={filteredBookings as any}
              onExport={(format) => {
                console.log(`Exported appointments in ${format} format`)
              }}
            />
            
            {/* Mobile menu for additional options */}
            <CalendarMobileMenu
              user={user}
              onSyncToggle={() => setShowSyncPanel(!showSyncPanel)}
              onConflictToggle={() => setShowConflictResolver(!showConflictResolver)}
            />
          </div>
        </div>
      </div>

      {/* Enhanced Revenue Display - Mobile (Collapsible) */}
      <div className="lg:hidden mb-4">
        <Suspense fallback={
          <div className="animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        }>
          <EnhancedRevenueDisplay
            appointments={bookings}
            todayRevenue={todayRevenue}
            todayCount={todayAppointmentCount}
            selectedDate={selectedDate || new Date()}
            collapsed={revenueCollapsed}
            onToggleCollapse={() => setRevenueCollapsed(!revenueCollapsed)}
          />
        </Suspense>
      </div>

      <CalendarErrorBoundary context={`calendar-${viewMode}-view`}>
        <div className="relative">
          <Card variant="default" className="col-span-full p-0">
            <Suspense fallback={<CalendarSkeleton view={viewMode} showStats={false} />}>
              <UnifiedCalendar
                view={viewMode}
                onViewChange={setViewMode}
                currentDate={selectedDate || new Date()}
                onDateChange={setSelectedDate}
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
                onTimeSlotContextMenu={(date, event) => {
                  // Calculate position adjustments to prevent menu from going off-screen
                  const menuWidth = 192 // min-w-48 = 12rem = 192px
                  const menuHeight = 120 // approximate height
                  const viewportWidth = window.innerWidth
                  const viewportHeight = window.innerHeight
                  
                  let x = event.clientX
                  let y = event.clientY
                  
                  // Adjust if menu would go off right edge
                  if (x + menuWidth > viewportWidth) {
                    x = viewportWidth - menuWidth - 10
                  }
                  
                  // Adjust if menu would go off bottom edge
                  if (y + menuHeight > viewportHeight) {
                    y = viewportHeight - menuHeight - 10
                  }
                  
                  setContextMenu({
                    isOpen: true,
                    position: { x, y },
                    timeSlot: {
                      date: date,
                      hour: date.getHours(),
                      minute: date.getMinutes()
                    }
                  })
                }}
                onAppointmentUpdate={handleAppointmentUpdate}
                onDayClick={(date) => {
                  // Single click to set selected date for time picker
                  setPendingDate(date)
                  setShowTimePickerModal(true)
                }}
                onDayDoubleClick={(date) => {
                  // Double-click creates appointment with default time
                  setSelectedDate(date)
                  setPreselectedTime('09:00')
                  setShowCreateModal(true)
                }}
                startHour={8}
                endHour={19}
                slotDuration={30}
                isLoading={loading}
                error={error}
                onRefresh={() => refreshOptimistic(() => getMyBookings())}
                onRetry={() => window.location.reload()}
                className="h-[800px]"
              />
            </Suspense>
          </Card>

          {/* Availability Heatmap Overlay */}
          {showHeatmap && (
            <div className="absolute inset-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm z-10 overflow-auto">
              <div className="p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Availability Heatmap
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHeatmap(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
                <Suspense fallback={<div className="animate-pulse bg-gray-200 h-96 rounded-lg"></div>}>
                  <AvailabilityHeatmap
                    appointments={bookings}
                    startDate={selectedDate || new Date()}
                    onTimeSlotClick={(date, time) => {
                      setShowHeatmap(false)
                      setSelectedDate(date)
                      setPreselectedTime(time)
                      setShowCreateModal(true)
                    }}
                  />
                </Suspense>
              </div>
            </div>
          )}
        </div>
      </CalendarErrorBoundary>

      {/* Google Calendar Sync Panel */}
      {user?.role === 'barber' && showSyncPanel && (
        <div className="mt-6">
          <Suspense fallback={<div className="animate-pulse bg-gray-200 h-40 rounded-lg"></div>}>
            <CalendarSync />
          </Suspense>
        </div>
      )}

      {/* Conflict Resolver Panel */}
      {user?.role === 'barber' && showConflictResolver && (
        <div className="mt-6">
          <Suspense fallback={<div className="animate-pulse bg-gray-200 h-40 rounded-lg"></div>}>
            <CalendarConflictResolver />
          </Suspense>
        </div>
      )}

      {/* Quick Booking Panel - Desktop Only */}
      <div className="hidden lg:block">
        <Suspense fallback={<div className="animate-pulse bg-gray-200 h-40 rounded-lg"></div>}>
          <QuickBookingPanel
            onBookingComplete={async () => {
              // Refresh appointments after quick booking
              try {
                await refreshOptimistic(() => getMyBookings())
                toastSuccess('Calendar Updated', 'Your new appointment has been added.')
              } catch (error) {
                console.error('Failed to refresh calendar:', error)
              }
            }}
          />
        </Suspense>
      </div>

      {/* Calendar Integration Status */}
      {user?.role === 'barber' && !showSyncPanel && (
        <Card variant="default" className="p-6">
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
          // Appointment created, refreshing calendar with enhanced API...
          try {
            // Use enhanced refresh that automatically handles optimistic updates
            await refreshAppointments()
            setPreselectedTime(undefined)
            
            // Calendar refreshed successfully with optimistic updates
            
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

      {/* Premium Reschedule Modal */}
      {showRescheduleModal && rescheduleModalData && (
        <RescheduleModal
          isOpen={showRescheduleModal}
          onClose={() => {
            setShowRescheduleModal(false)
            setRescheduleModalData(null)
          }}
          onReschedule={handleModalReschedule}
          appointment={
            (() => {
              const booking = bookings.find(booking => booking.id === rescheduleModalData.appointmentId)
              if (booking) {
                // Convert BookingResponse to Appointment with proper typing
                return {
                  ...booking,
                  status: (booking.status as 'pending' | 'confirmed' | 'cancelled' | 'completed') || 'pending',
                  end_time: booking.end_time || (() => {
                    const start = new Date(booking.start_time)
                    const end = new Date(start.getTime() + (booking.duration_minutes || 30) * 60000)
                    return end.toISOString()
                  })()
                } as Appointment
              } else {
                // Fallback appointment object
                return {
                  id: rescheduleModalData.appointmentId,
                  start_time: rescheduleModalData.newStartTime,
                  end_time: (() => {
                    const start = new Date(rescheduleModalData.newStartTime)
                    const end = new Date(start.getTime() + 30 * 60000) // Default 30 minutes
                    return end.toISOString()
                  })(),
                  service_name: 'Service',
                  client_name: 'Client',
                  barber_name: 'Barber',
                  status: 'pending' as 'pending',
                  duration_minutes: 30,
                  price: 0
                } as Appointment
              }
            })()
          }
        />
      )}
      
      {/* Visual feedback overlay - TODO: Re-enable without blocking drag events */}
      {/* <CalendarVisualFeedback
        visualState={visualState}
        dragState={dragState}
        enableAnimations={true}
      /> */}
      
      {/* Debug request queue (development only) */}
      <CalendarRequestQueue />
      
      {/* Quick Booking FAB - Mobile Only */}
      <Suspense fallback={null}>
        <QuickBookingFAB
          onBookingComplete={async () => {
            // Refresh appointments after quick booking
            try {
              await refreshOptimistic(() => getMyBookings())
              toastSuccess('Calendar Updated', 'Your new appointment has been added.')
            } catch (error) {
              console.error('Failed to refresh calendar:', error)
            }
          }}
        />
      </Suspense>
      
      {/* Calendar Analytics Sidebar */}
      <Suspense fallback={null}>
        <CalendarAnalyticsSidebar
          appointments={bookings}
          selectedDate={selectedDate || new Date()}
          userId={user?.id}
          isOpen={showAnalytics}
          onToggle={() => setShowAnalytics(!showAnalytics)}
          position="right"
        />
      </Suspense>

      {/* Time Slot Context Menu */}
      <TimeSlotContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        timeSlot={contextMenu.timeSlot}
        onClose={handleContextMenuClose}
        onBlockSlot={handleBlockSlot}
        onCreateAppointment={handleContextMenuCreateAppointment}
      />
      
      </div>
    </ErrorBoundary>
  )
}