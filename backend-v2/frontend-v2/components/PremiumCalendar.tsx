'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { format, addDays, startOfWeek, isSameDay, isToday, startOfDay, endOfDay, startOfMonth, endOfMonth, endOfWeek } from 'date-fns'
import StaffAvatarHeader from './calendar/StaffAvatarHeader'
import PremiumAppointmentBlock from './calendar/PremiumAppointmentBlock'
import ProfessionalTimeAxis from './calendar/ProfessionalTimeAxis'
import AppointmentModal from './calendar/AppointmentModal'
import AppointmentEditModal from './calendar/AppointmentEditModal'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  PremiumColors, 
  PremiumTypography, 
  PremiumSpacing,
  PremiumBorderRadius,
  PremiumShadows,
  createPremiumStyles
} from '@/lib/premium-design-system'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
  ViewColumnsIcon,
  CalendarDaysIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { useResponsive } from '@/hooks/useResponsive'
import { useSwipeNavigation } from '@/lib/mobile-touch-enhancements'

interface Barber {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar?: string
  specialties?: string[]
  role?: string
}

interface Appointment {
  id: number
  client_name: string
  service_name: string
  start_time: string
  duration_minutes: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  client_tier?: 'new' | 'regular' | 'vip' | 'platinum'
  barber_id: number
  notes?: string
  is_recurring?: boolean
  end_time?: string
}

export interface CalendarView {
  type: 'day' | 'week' | 'month'
}

interface PremiumCalendarProps {
  // Data
  barbers?: Barber[]
  appointments?: Appointment[]
  currentDate?: Date
  
  // View configuration
  view?: 'day' | 'week' | 'month'
  startHour?: number
  endHour?: number
  slotDuration?: number
  
  // Display options
  showRevenue?: boolean
  showAppointmentCount?: boolean
  colorScheme?: 'service-based' | 'status-based' | 'tier-based'
  
  // Event handlers
  onDateChange?: (date: Date) => void
  onViewChange?: (view: 'day' | 'week' | 'month') => void
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: Date, barberId?: number, hour?: number, minute?: number) => void
  onBarberSelect?: (barberId: number) => void
  onNewAppointment?: () => void
  onRefresh?: () => void
  
  // Selection state
  selectedBarberId?: number | null
  selectedAppointmentId?: number | null
  
  // Loading state
  isLoading?: boolean
  error?: string | null
  
  className?: string
}

const PremiumCalendar: React.FC<PremiumCalendarProps> = ({
  barbers = [],
  appointments = [],
  currentDate = new Date(),
  view = 'day',
  startHour = 8,
  endHour = 19,
  slotDuration = 60,
  showRevenue = true,
  showAppointmentCount = true,
  colorScheme = 'service-based',
  onDateChange,
  onViewChange,
  onAppointmentClick,
  onTimeSlotClick,
  onBarberSelect,
  onNewAppointment,
  onRefresh,
  selectedBarberId,
  selectedAppointmentId,
  isLoading = false,
  error = null,
  className = ''
}) => {
  const { isMobile, isTablet } = useResponsive()
  const styles = createPremiumStyles()

  // Modal state
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedAppointmentData, setSelectedAppointmentData] = useState<Appointment | null>(null)
  const [modalData, setModalData] = useState<{
    date: Date
    time: { hour: number; minute: number }
    barberId: number
    barberName: string
  } | null>(null)

  // Interactive state for Phase 2 enhancements
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<{
    barberId: number
    hour: number
    date: Date
  } | null>(null)
  const [hoveredAppointment, setHoveredAppointment] = useState<number | null>(null)
  const [quickActionMenuOpen, setQuickActionMenuOpen] = useState<{
    barberId: number
    x: number
    y: number
  } | null>(null)
  const [draggedAppointment, setDraggedAppointment] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{
    barberId: number
    hour: number
    date: Date
  } | null>(null)

  // Mobile swipe navigation
  const swipeContainerRef = useSwipeNavigation(
    () => navigateDate('next'),
    () => navigateDate('prev'),
    isMobile ? 30 : 50
  )

  // Date utility functions
  const isToday = (date: Date) => {
    return format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  }

  const isTomorrow = (date: Date) => {
    const tomorrow = addDays(new Date(), 1)
    return format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')
  }

  const isYesterday = (date: Date) => {
    const yesterday = addDays(new Date(), -1)
    return format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')
  }

  // Get dates to display based on view
  const displayDates = useMemo(() => {
    if (view === 'day') {
      return [currentDate]
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate)
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    } else {
      // Month view - return dates for current month
      return [currentDate] // Simplified for now
    }
  }, [currentDate, view])

  // Filter appointments for current view
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => {
      const appointmentDate = new Date(appointment.start_time)
      return displayDates.some(date => isSameDay(appointmentDate, date))
    })
  }, [appointments, displayDates])

  // Calculate stats for each barber
  const barberStats = useMemo(() => {
    const stats: Record<number, { appointmentCount: number; todayRevenue: number; availability: string }> = {}
    
    barbers.forEach(barber => {
      const barberAppointments = filteredAppointments.filter(apt => apt.barber_id === barber.id)
      const todayRevenue = barberAppointments
        .filter(apt => apt.status !== 'cancelled')
        .reduce((sum, apt) => sum + apt.price, 0)
      
      // Calculate availability based on current time and appointments
      const now = new Date()
      const currentHour = now.getHours()
      const hasCurrentAppointment = barberAppointments.some(apt => {
        const aptStart = new Date(apt.start_time)
        const aptEnd = new Date(aptStart.getTime() + apt.duration_minutes * 60000)
        return now >= aptStart && now <= aptEnd
      })
      
      let availability = 'available'
      if (hasCurrentAppointment) {
        availability = 'busy'
      } else if (currentHour < startHour || currentHour >= endHour) {
        availability = 'off'
      }
      
      stats[barber.id] = {
        appointmentCount: barberAppointments.length,
        todayRevenue,
        availability
      }
    })
    
    return stats
  }, [barbers, filteredAppointments, startHour, endHour])

  // Navigate dates
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    if (!onDateChange) return
    
    const days = view === 'day' ? 1 : view === 'week' ? 7 : 30
    const newDate = new Date(currentDate)
    
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - days)
    } else {
      newDate.setDate(newDate.getDate() + days)
    }
    
    onDateChange(newDate)
  }, [currentDate, view, onDateChange])

  // Get appointments for a specific barber and time slot
  const getAppointmentsForSlot = useCallback((barberId: number, date: Date, hour: number) => {
    return filteredAppointments.filter(appointment => {
      if (appointment.barber_id !== barberId) return false
      
      const appointmentDate = new Date(appointment.start_time)
      // Use local date comparison to handle timezone issues
      const appointmentDateString = format(appointmentDate, 'yyyy-MM-dd')
      const slotDateString = format(date, 'yyyy-MM-dd')
      
      return appointmentDateString === slotDateString && appointmentDate.getHours() === hour
    })
  }, [filteredAppointments])

  // Calculate appointment position and height for time-based layouts
  const getAppointmentStyle = useCallback((appointment: Appointment) => {
    const startTime = new Date(appointment.start_time)
    const minutes = startTime.getMinutes()
    const duration = appointment.duration_minutes
    
    const slotHeight = slotDuration >= 60 ? 64 : Math.max(32, slotDuration * 0.8)
    const topOffset = (minutes / 60) * slotHeight
    const height = Math.max(40, (duration / 60) * slotHeight - 4)
    
    return {
      top: `${topOffset}px`,
      height: `${height}px`,
      position: 'absolute' as const,
      left: '4px',
      right: '4px',
      zIndex: 10
    }
  }, [slotDuration])

  // Handle view changes
  const handleViewChange = useCallback((newView: 'day' | 'week' | 'month') => {
    onViewChange?.(newView)
  }, [onViewChange])

  // Handle time slot clicks
  const handleTimeSlotClick = useCallback((date: Date, barberId: number, hour: number, minute: number = 0) => {
    // Find barber name
    const barber = barbers.find(b => b.id === barberId)
    const barberName = barber?.name || `${barber?.first_name || ''} ${barber?.last_name || ''}`.trim() || 'Barber'
    
    // Set modal data and open modal
    setModalData({
      date,
      time: { hour, minute },
      barberId,
      barberName
    })
    setAppointmentModalOpen(true)
    
    // Also call the parent handler if provided
    onTimeSlotClick?.(date, barberId, hour, minute)
  }, [onTimeSlotClick, barbers])

  // Enhanced interactive handlers for Phase 2
  const handleTimeSlotHover = useCallback((barberId: number, hour: number, date: Date, isEntering: boolean) => {
    if (isEntering && !isMobile) {
      setHoveredTimeSlot({ barberId, hour, date })
    } else {
      setHoveredTimeSlot(null)
    }
  }, [isMobile])

  const handleAppointmentHover = useCallback((appointmentId: number | null) => {
    if (!isMobile) {
      setHoveredAppointment(appointmentId)
    }
  }, [isMobile])

  const handleQuickAction = useCallback((barberId: number, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    setQuickActionMenuOpen({
      barberId,
      x: rect.right + 10,
      y: rect.top
    })
  }, [])

  const getConflictInfo = useCallback((barberId: number, hour: number, date: Date) => {
    const existingAppointments = getAppointmentsForSlot(barberId, date, hour)
    const conflicts = existingAppointments.length
    
    if (conflicts > 0) {
      return {
        hasConflict: true,
        conflictCount: conflicts,
        conflictNames: existingAppointments.map(apt => apt.client_name).join(', ')
      }
    }
    
    return { hasConflict: false, conflictCount: 0, conflictNames: '' }
  }, [getAppointmentsForSlot])

  const getTimeSlotSuggestions = useCallback((barberId: number, hour: number, date: Date) => {
    const barber = barbers.find(b => b.id === barberId)
    const isAvailable = getAppointmentsForSlot(barberId, date, hour).length === 0
    const isPeakHour = hour >= 10 && hour <= 15
    const isOffHour = hour < 9 || hour > 17
    
    return {
      isAvailable,
      isPeakHour,
      isOffHour,
      suggestedServices: isPeakHour ? ['Haircut', 'Haircut & Beard'] : ['Beard Trim', 'Touch-up'],
      estimatedDuration: isPeakHour ? 45 : 30,
      barberName: barber?.name || 'Barber'
    }
  }, [barbers, getAppointmentsForSlot])

  // Handle appointment clicks
  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    // Find the barber for this appointment
    const barber = barbers.find(b => b.id === appointment.barber_id)
    const barberName = barber?.name || `${barber?.first_name || ''} ${barber?.last_name || ''}`.trim() || 'Barber'
    
    // Set appointment data with barber name
    setSelectedAppointmentData({
      ...appointment,
      barber_name: barberName
    })
    setEditModalOpen(true)
    
    // Also call parent handler if provided
    onAppointmentClick?.(appointment)
  }, [barbers, onAppointmentClick])

  // Handle appointment confirmation from modal
  const handleAppointmentConfirm = useCallback((appointmentData: any) => {
    console.log('New appointment:', appointmentData)
    
    // Close modal
    setAppointmentModalOpen(false)
    setModalData(null)
    
    // In a real app, this would:
    // 1. Call an API to create the appointment
    // 2. Update the calendar state with the new appointment
    // 3. Show a success message
    
    // For now, just refresh the page to see the new appointment
    if (onRefresh) {
      onRefresh()
    }
  }, [onRefresh])

  // Handle appointment updates
  const handleAppointmentUpdate = useCallback((appointmentId: number, updates: Partial<Appointment>) => {
    console.log('Update appointment:', appointmentId, updates)
    
    // Close modal
    setEditModalOpen(false)
    setSelectedAppointmentData(null)
    
    // In a real app, this would call an API to update
    // For now, just refresh
    if (onRefresh) {
      onRefresh()
    }
  }, [onRefresh])

  // Handle appointment deletion
  const handleAppointmentDelete = useCallback((appointmentId: number) => {
    console.log('Delete appointment:', appointmentId)
    
    // Close modal
    setEditModalOpen(false)
    setSelectedAppointmentData(null)
    
    // In a real app, this would call an API to delete
    // For now, just refresh
    if (onRefresh) {
      onRefresh()
    }
  }, [onRefresh])

  // Handle appointment reschedule
  const handleAppointmentReschedule = useCallback((appointmentId: number, newDateTime: Date) => {
    console.log('Reschedule appointment:', appointmentId, newDateTime)
    
    // Close modal
    setEditModalOpen(false)
    setSelectedAppointmentData(null)
    
    // In a real app, this would call an API to reschedule
    // For now, just refresh
    if (onRefresh) {
      onRefresh()
    }
  }, [onRefresh])

  // Render day/week view (main Fresha-inspired layout)
  const renderTimeBasedView = () => {
    // Ensure we have at least one barber to display the calendar grid
    const displayBarbers = barbers.length > 0 ? barbers : [{
      id: 1,
      name: 'Demo Barber',
      first_name: 'Demo',
      last_name: 'Barber',
      email: 'demo@bookedbarber.com',
      role: 'barber'
    }]

    // Redesigned week view with better layout and usability
    if (view === 'week') {
      return (
        <div className="calendar-grid grid h-full" style={{
          gridTemplateColumns: '80px 1fr',
          overflow: 'hidden'
        }}>
          {/* Time Axis */}
          <div className="time-axis-container border-r sticky left-0 z-10 bg-white" style={{ borderColor: PremiumColors.border.light }}>
            <div className="h-20 border-b flex items-center justify-center text-xs text-gray-500" style={{ borderColor: PremiumColors.border.light }}>
              Time
            </div>
            <div className="overflow-hidden">
              {Array.from({ length: endHour - startHour }, (_, hourIndex) => {
                const hour = startHour + hourIndex
                return (
                  <div 
                    key={hour}
                    className="time-label flex items-center justify-center border-b text-xs text-gray-600"
                    style={{
                      height: '64px',
                      borderColor: PremiumColors.border.light
                    }}
                  >
                    {format(new Date().setHours(hour, 0, 0, 0), 'ha')}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Week Grid Container */}
          <div className="week-grid-container overflow-auto">
            <div className="week-grid grid grid-cols-7 min-w-fit" style={{ minWidth: '1000px' }}>
              {displayDates.map((date, dateIndex) => (
                <div 
                  key={dateIndex} 
                  className="day-column border-r last:border-r-0"
                  style={{ borderColor: PremiumColors.border.light }}
                >
                  {/* Day Header */}
                  <div 
                    className="day-header h-20 border-b px-2 py-2 text-center sticky top-0 bg-white z-10"
                    style={{ borderColor: PremiumColors.border.light }}
                  >
                    <div className="text-xs font-medium text-gray-600">
                      {format(date, 'EEE')}
                    </div>
                    <div className={`text-lg font-semibold ${isToday(date) ? 'text-blue-600' : 'text-gray-900'}`}>
                      {format(date, 'd')}
                    </div>
                    {isToday(date) && (
                      <div className="text-xs text-blue-600 font-medium">Today</div>
                    )}
                  </div>

                  {/* Time Slots for this day */}
                  <div className="time-slots-container">
                    {Array.from({ length: endHour - startHour }, (_, hourIndex) => {
                      const hour = startHour + hourIndex
                      const dayAppointments = filteredAppointments.filter(apt => {
                        const aptDate = new Date(apt.start_time)
                        const aptDateString = format(aptDate, 'yyyy-MM-dd')
                        const slotDateString = format(date, 'yyyy-MM-dd')
                        return aptDateString === slotDateString && aptDate.getHours() === hour
                      })
                      
                      return (
                        <div
                          key={hour}
                          className="time-slot relative border-b hover:bg-gray-50 transition-colors group"
                          style={{
                            height: '64px',
                            borderColor: PremiumColors.border.light
                          }}
                        >
                          {/* Current time indicator */}
                          {isToday(date) && new Date().getHours() === hour && (
                            <div 
                              className="absolute left-0 right-0 h-0.5 pointer-events-none z-20"
                              style={{
                                backgroundColor: PremiumColors.status.confirmed.main,
                                top: `${(new Date().getMinutes() / 60) * 64}px`
                              }}
                            />
                          )}

                          {/* Appointments Grid */}
                          <div className="appointments-grid h-full p-1 space-y-1">
                            {dayAppointments.map((appointment, idx) => {
                              const barber = barbers.find(b => b.id === appointment.barber_id)
                              const barberName = barber?.name || `${barber?.first_name || ''} ${barber?.last_name || ''}`.trim()
                              
                              return (
                                <div
                                  key={appointment.id}
                                  className="appointment-chip text-xs rounded px-2 py-1 cursor-pointer truncate transition-all hover:shadow-md"
                                  style={{
                                    backgroundColor: PremiumColors.services.haircut.light,
                                    color: PremiumColors.services.haircut.text,
                                    borderLeft: `3px solid ${PremiumColors.services.haircut.main}`
                                  }}
                                  onClick={() => handleAppointmentClick(appointment)}
                                  title={`${appointment.client_name} - ${appointment.service_name} with ${barberName}`}
                                >
                                  <div className="font-medium truncate">{appointment.client_name}</div>
                                  <div className="text-xs opacity-75 truncate">{barberName}</div>
                                </div>
                              )
                            })}
                            
                            {/* Add appointment button */}
                            <button
                              className="add-appointment-btn w-full h-8 rounded border-2 border-dashed border-gray-300 
                                       opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center
                                       hover:border-blue-400 hover:bg-blue-50"
                              onClick={() => {
                                const defaultBarber = barbers[0] || { id: 1 }
                                handleTimeSlotClick(date, defaultBarber.id, hour, 0)
                              }}
                            >
                              <PlusIcon className="w-4 h-4 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )
    }

    // Enhanced day view with professional design
    return (
      <div className="calendar-day-view h-full bg-gray-50">
        {/* Day Summary Bar */}
        <div className="day-summary bg-white border-b px-6 py-4" style={{ borderColor: PremiumColors.border.light }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div>
                <h3 className="text-sm font-medium text-gray-600">Today's Overview</h3>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredAppointments.filter(apt => isSameDay(new Date(apt.start_time), currentDate)).length} Appointments
                </p>
              </div>
              {showRevenue && (
                <div className="border-l pl-6" style={{ borderColor: PremiumColors.border.light }}>
                  <h3 className="text-sm font-medium text-gray-600">Expected Revenue</h3>
                  <p className="text-2xl font-bold" style={{ color: PremiumColors.status.confirmed.dark }}>
                    ${filteredAppointments
                      .filter(apt => isSameDay(new Date(apt.start_time), currentDate) && apt.status !== 'cancelled')
                      .reduce((sum, apt) => sum + apt.price, 0)}
                  </p>
                </div>
              )}
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                onClick={() => {
                  const now = new Date()
                  const currentHour = now.getHours()
                  const nextHour = currentHour < endHour ? currentHour : startHour
                  const defaultBarber = barbers[0] || { id: 1 }
                  
                  handleTimeSlotClick(currentDate, defaultBarber.id, nextHour, 0)
                }}
              >
                <PlusIcon className="w-4 h-4" />
                <span>Quick Add</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
                onClick={onRefresh}
              >
                <ArrowPathIcon className="w-4 h-4" />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Main Calendar Grid */}
        <div className="calendar-grid-container h-full" style={{ 
          display: 'grid',
          gridTemplateColumns: '120px 1fr',
          height: 'calc(100% - 88px)',
          backgroundColor: PremiumColors.background.tertiary
        }}>
          {/* Premium Time Axis */}
          <div className="time-axis bg-white border-r shadow-sm" style={{ borderColor: PremiumColors.border.light }}>
            <div className="sticky top-0 h-16 border-b flex items-center justify-center text-sm font-semibold text-gray-700" 
                 style={{ 
                   borderColor: PremiumColors.border.light,
                   background: `linear-gradient(to bottom, ${PremiumColors.background.primary}, ${PremiumColors.background.secondary})`
                 }}>
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-4 h-4" />
                <span>Time</span>
              </div>
            </div>
            <div className="time-labels">
              {Array.from({ length: endHour - startHour }, (_, hourIndex) => {
                const hour = startHour + hourIndex
                const isCurrentHour = isToday(currentDate) && new Date().getHours() === hour
                const isPeakHour = hour >= 10 && hour <= 15 // Peak business hours
                const currentTime = new Date()
                const currentMinute = currentTime.getMinutes()
                const showCurrentTimeIndicator = isCurrentHour && isToday(currentDate)
                
                return (
                  <div 
                    key={hour}
                    className="relative"
                  >
                    {/* Hour Block */}
                    <div 
                      className={`
                        time-label flex items-start justify-center border-b text-sm relative overflow-hidden
                        ${isCurrentHour ? 'bg-gradient-to-r from-blue-50 to-indigo-50 font-semibold text-blue-700' : 'text-gray-600 hover:bg-gray-50'}
                        ${isPeakHour ? 'border-l-2 border-l-amber-300' : ''}
                        transition-all duration-200
                      `}
                      style={{
                        height: '80px',
                        borderColor: PremiumColors.border.light
                      }}
                    >
                      <div className="text-center pt-2">
                        <div className="text-lg font-semibold leading-none">
                          {format(new Date().setHours(hour, 0, 0, 0), 'h')}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {format(new Date().setHours(hour, 0, 0, 0), 'a')}
                        </div>
                        {isPeakHour && (
                          <div className="text-xs text-amber-600 font-medium mt-1">
                            Peak
                          </div>
                        )}
                      </div>
                      
                      {/* Half-hour indicator */}
                      <div 
                        className="absolute left-0 w-full border-t border-dashed"
                        style={{ 
                          top: '40px',
                          borderColor: PremiumColors.border.light + '60' // Semi-transparent
                        }}
                      />
                      
                      {/* Current time indicator */}
                      {showCurrentTimeIndicator && (
                        <div 
                          className="absolute left-0 w-full bg-red-500 h-0.5 z-10"
                          style={{ 
                            top: `${(currentMinute / 60) * 80}px`,
                            boxShadow: `0 0 6px ${PremiumColors.status.cancelled.main}`
                          }}
                        >
                          <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Premium Staff Columns */}
          <div className="staff-grid overflow-x-auto w-full" style={{ backgroundColor: PremiumColors.background.tertiary }}>
            <div className="flex h-full w-full" style={{ minWidth: `${displayBarbers.length * 300}px` }}>
              {displayBarbers.map((barber, barberIndex) => {
                const stats = barberStats[barber.id] || { 
                  appointmentCount: 0, 
                  todayRevenue: 0, 
                  availability: 'available' 
                }
                
                // Generate avatar colors based on barber ID for consistency
                const avatarColors = [
                  { bg: PremiumColors.primary[500], ring: PremiumColors.primary[400] },
                  { bg: PremiumColors.services.beardTrim.main, ring: PremiumColors.services.beardTrim.light },
                  { bg: PremiumColors.services.styling.main, ring: PremiumColors.services.styling.light },
                  { bg: PremiumColors.services.coloring.main, ring: PremiumColors.services.coloring.light },
                  { bg: PremiumColors.services.shave.main, ring: PremiumColors.services.shave.light }
                ]
                const avatarColor = avatarColors[barber.id % avatarColors.length]
                
                return (
                  <div 
                    key={barber.id}
                    className="barber-column border-r last:border-r-0 flex-1 bg-white shadow-sm"
                    style={{
                      minWidth: '300px',
                      maxWidth: '500px',
                      borderColor: PremiumColors.border.light
                    }}
                  >
                    {/* Premium Staff Header */}
                    <div className="staff-header sticky top-0 z-20 h-20 border-b" 
                         style={{ 
                           borderColor: PremiumColors.border.light,
                           background: `linear-gradient(to bottom, ${PremiumColors.background.primary}, ${PremiumColors.background.secondary})`,
                           boxShadow: PremiumShadows.sm
                         }}>
                      <div className="h-full px-6 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {/* Professional Avatar */}
                          <div className="relative">
                            <div className={`
                              w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold shadow-md
                              ${selectedBarberId === barber.id ? 'ring-3 ring-offset-2' : 'ring-2 ring-white'}
                              transition-all duration-200 hover:scale-105
                            `} style={{ 
                              backgroundColor: avatarColor.bg,
                              ringColor: selectedBarberId === barber.id ? avatarColor.ring : 'white'
                            }}>
                              {barber.name ? barber.name.charAt(0).toUpperCase() : barber.first_name?.charAt(0)?.toUpperCase() || 'B'}
                            </div>
                            {/* Status indicator */}
                            <div className={`
                              absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white
                              ${stats.availability === 'available' ? 'bg-green-400' : 
                                stats.availability === 'busy' ? 'bg-red-400' : 
                                stats.availability === 'break' ? 'bg-yellow-400' : 'bg-gray-400'}
                            `} />
                          </div>
                          
                          {/* Staff Information */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate text-sm">
                              {barber.name || `${barber.first_name || ''} ${barber.last_name || ''}`.trim()}
                            </h3>
                            <div className="flex items-center space-x-3 mt-1">
                              <span className={`
                                inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                                ${stats.availability === 'available' ? 'bg-green-100 text-green-700' : 
                                  stats.availability === 'busy' ? 'bg-red-100 text-red-700' : 
                                  stats.availability === 'break' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'}
                              `}>
                                {stats.availability === 'available' ? '● Available' :
                                 stats.availability === 'busy' ? '● Busy' :
                                 stats.availability === 'break' ? '● On Break' : '● Offline'}
                              </span>
                              {showAppointmentCount && stats.appointmentCount > 0 && (
                                <span className="text-xs text-gray-500 font-medium">
                                  {stats.appointmentCount} appointments
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Revenue Display */}
                        {showRevenue && (
                          <div className="text-right">
                            <div className="text-xs text-gray-500 font-medium">Today</div>
                            <div className="text-lg font-bold" style={{ color: PremiumColors.status.confirmed.main }}>
                              ${stats.todayRevenue}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Premium Time Slots Grid */}
                    <div className="time-slots-grid relative" style={{ backgroundColor: PremiumColors.background.tertiary }}>
                      {/* Advanced Current Time Indicator */}
                      {isToday(currentDate) && new Date().getHours() >= startHour && new Date().getHours() < endHour && (
                        <div 
                          className="absolute left-0 right-0 h-0.5 pointer-events-none z-30 animate-pulse"
                          style={{
                            backgroundColor: '#ef4444',
                            top: `${((new Date().getHours() - startHour) * 80) + ((new Date().getMinutes() / 60) * 80)}px`,
                            boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)'
                          }}
                        >
                          <div 
                            className="w-3 h-3 rounded-full border-2 border-white shadow-lg absolute -left-1.5 -top-1.5 animate-pulse"
                            style={{ backgroundColor: '#ef4444' }}
                          />
                          <div className="absolute -right-20 -top-6 bg-red-500 text-white text-xs px-2 py-1 rounded shadow-md">
                            Now
                          </div>
                        </div>
                      )}
                      
                      {Array.from({ length: endHour - startHour }, (_, hourIndex) => {
                        const hour = startHour + hourIndex
                        const slotDate = displayDates[0]
                        const slotAppointments = getAppointmentsForSlot(barber.id, slotDate, hour)
                        const isCurrentHour = isToday(currentDate) && new Date().getHours() === hour
                        const isPeakHour = hour >= 10 && hour <= 15
                        const isOffHour = hour < 9 || hour > 17
                        
                        return (
                          <div
                            key={hour}
                            className={`
                              time-slot relative border-b transition-all duration-200 group
                              ${isCurrentHour ? 'bg-gradient-to-r from-blue-50/50 to-indigo-50/50' : 
                                isPeakHour ? 'bg-amber-50/20' :
                                isOffHour ? 'bg-gray-50/30' : 'bg-white'}
                              ${slotAppointments.length === 0 ? 'hover:bg-blue-50/30 cursor-pointer' : ''}
                              ${hoveredTimeSlot?.barberId === barber.id && hoveredTimeSlot?.hour === hour ? 'ring-2 ring-blue-300 ring-inset' : ''}
                            `}
                            style={{
                              height: '80px',
                              borderColor: PremiumColors.border.light
                            }}
                            onMouseEnter={() => handleTimeSlotHover(barber.id, hour, slotDate, true)}
                            onMouseLeave={() => handleTimeSlotHover(barber.id, hour, slotDate, false)}
                            title={slotAppointments.length === 0 ? 
                              `Available ${format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')} - Click to book` :
                              `${slotAppointments.length} appointment${slotAppointments.length > 1 ? 's' : ''}`}
                          >
                            {/* Half-hour divider line */}
                            <div 
                              className="absolute left-0 right-0 border-t border-dashed opacity-30"
                              style={{ 
                                top: '40px',
                                borderColor: PremiumColors.border.main
                              }}
                            />
                            
                            {/* Enhanced Empty Slot Interaction with Smart Suggestions */}
                            {slotAppointments.length === 0 && (
                              <div 
                                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer"
                                onClick={() => handleTimeSlotClick(slotDate, barber.id, hour, 0)}
                              >
                                <div className="h-full w-full flex items-center justify-center">
                                  <div 
                                    className="rounded-lg px-6 py-3 flex items-center space-x-3 shadow-sm border-2 border-dashed transition-all duration-200 hover:scale-105 relative"
                                    style={{
                                      backgroundColor: PremiumColors.primary[50],
                                      borderColor: PremiumColors.primary[200],
                                      color: PremiumColors.primary[700]
                                    }}
                                  >
                                    <PlusIcon className="w-5 h-5" />
                                    <div className="text-center">
                                      <div className="text-sm font-medium">Book Appointment</div>
                                      <div className="text-xs opacity-75">
                                        {format(new Date().setHours(hour, 0, 0, 0), 'h:mm a')}
                                        {isPeakHour && <span className="ml-1 text-amber-600">• Peak Time</span>}
                                        {isOffHour && <span className="ml-1 text-gray-500">• Off Hours</span>}
                                      </div>
                                    </div>
                                    
                                    {/* Advanced Tooltip */}
                                    {hoveredTimeSlot?.barberId === barber.id && hoveredTimeSlot?.hour === hour && (
                                      <div 
                                        className="absolute -top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg text-xs whitespace-nowrap"
                                        style={{ boxShadow: PremiumShadows.xl }}
                                      >
                                        <div className="space-y-1">
                                          <div className="font-medium">
                                            {getTimeSlotSuggestions(barber.id, hour, slotDate).barberName}
                                          </div>
                                          <div className="text-gray-300">
                                            Suggested: {getTimeSlotSuggestions(barber.id, hour, slotDate).suggestedServices.join(' or ')}
                                          </div>
                                          <div className="text-gray-400">
                                            Est. {getTimeSlotSuggestions(barber.id, hour, slotDate).estimatedDuration} minutes
                                          </div>
                                        </div>
                                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* Quick Time Indicators */}
                            <div className="absolute left-2 top-1 text-xs text-gray-400 font-medium">
                              {format(new Date().setHours(hour, 0, 0, 0), 'h:mm')}
                            </div>
                            <div className="absolute left-2 bottom-1 text-xs text-gray-400 font-medium">
                              {format(new Date().setHours(hour, 30, 0, 0), 'h:mm')}
                            </div>

                            {/* Premium Appointment Cards */}
                            {slotAppointments.map(appointment => {
                              const serviceColor = getServiceColor(appointment.service_name)
                              const statusColor = getStatusColor(appointment.status)
                              const clientTierColor = getClientTierColor(appointment.client_tier || 'new')
                              
                              return (
                                <div
                                  key={appointment.id}
                                  className="appointment-card absolute inset-x-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden transform hover:scale-[1.02] hover:-translate-y-0.5"
                                  style={{
                                    top: '6px',
                                    height: 'calc(100% - 12px)',
                                    backgroundColor: serviceColor.light,
                                    borderLeft: `6px solid ${serviceColor.main}`,
                                    boxShadow: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 0 0 1px ${serviceColor.main}20`
                                  }}
                                  onClick={() => handleAppointmentClick(appointment)}
                                >
                                  <div className="p-4 h-full flex flex-col justify-between">
                                    <div>
                                      <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-semibold text-sm truncate" style={{ color: serviceColor.text }}>
                                          {appointment.client_name}
                                        </h4>
                                        <div className="flex items-center space-x-1 ml-2">
                                          {appointment.client_tier && (
                                            <Badge 
                                              className="text-xs px-2 py-0.5 rounded-full font-medium border-0"
                                              style={{
                                                backgroundColor: clientTierColor.light,
                                                color: clientTierColor.dark
                                              }}
                                            >
                                              {appointment.client_tier === 'vip' ? '👑' : 
                                               appointment.client_tier === 'platinum' ? '💎' :
                                               appointment.client_tier === 'regular' ? '⭐' : '🆕'}
                                              {appointment.client_tier.toUpperCase()}
                                            </Badge>
                                          )}
                                          <div 
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: statusColor.main }}
                                            title={`Status: ${appointment.status}`}
                                          />
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-1">
                                        <p className="text-xs font-medium" style={{ color: serviceColor.dark }}>
                                          {appointment.service_name}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                          {appointment.duration_minutes}min • ${appointment.price}
                                        </p>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-end justify-between mt-2">
                                      <span className="text-xs font-medium" style={{ color: serviceColor.dark }}>
                                        {format(new Date(appointment.start_time), 'h:mm a')}
                                      </span>
                                      {appointment.paid && (
                                        <div className="flex items-center space-x-1">
                                          <div className="w-3 h-3 rounded-full bg-green-400 flex items-center justify-center">
                                            <span className="text-white text-xs">✓</span>
                                          </div>
                                          <span className="text-xs text-green-600 font-medium">Paid</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Service Type Indicator */}
                                  <div 
                                    className="absolute top-0 right-0 w-0 h-0 border-l-[20px] border-b-[20px]"
                                    style={{
                                      borderLeftColor: 'transparent',
                                      borderBottomColor: serviceColor.main
                                    }}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Enhanced Empty State
  if (filteredAppointments.length === 0 && !isLoading) {
    return (
      <div className="premium-calendar-empty h-full flex items-center justify-center" style={{ backgroundColor: PremiumColors.background.tertiary }}>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: PremiumColors.primary[100] }}>
            <CalendarIcon className="w-12 h-12" style={{ color: PremiumColors.primary[600] }} />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-3">No Appointments Scheduled</h3>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Your calendar is ready for new bookings. Click any time slot above to create your first appointment,
            or use the Quick Add button to get started.
          </p>
          <div className="space-y-3">
            <Button
              size="lg"
              className="w-full"
              style={{ backgroundColor: PremiumColors.primary[500] }}
              onClick={() => {
                const now = new Date()
                const roundedHour = Math.ceil(now.getHours())
                handleTimeSlotClick(currentDate, barbers[0]?.id || 1, roundedHour, 0)
              }}
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Book First Appointment
            </Button>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PremiumColors.services.haircut.main }} />
                <span>Haircut</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PremiumColors.services.beardTrim.main }} />
                <span>Beard Trim</span>
              </div>
              <div className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PremiumColors.services.styling.main }} />
                <span>Styling</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="premium-calendar-error p-8 text-center h-full flex items-center justify-center" style={{ backgroundColor: PremiumColors.background.tertiary }}>
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-red-100">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Calendar Error</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button 
            onClick={onRefresh} 
            variant="outline"
            size="lg"
            className="w-full"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div 
      ref={swipeContainerRef}
      className={`premium-calendar h-full ${className}`}
      style={styles.calendarContainer}
    >
      {/* Premium Info Banner */}
      {filteredAppointments.length === 0 && !isLoading && (
        <div className="border-b px-6 py-3" style={{ 
          backgroundColor: PremiumColors.primary[50], 
          borderColor: PremiumColors.primary[100] 
        }}>
          <div className="flex items-center justify-center space-x-3 text-sm">
            <CalendarIcon className="w-5 h-5" style={{ color: PremiumColors.primary[600] }} />
            <span style={{ color: PremiumColors.primary[700] }} className="font-medium">
              Ready to schedule appointments
            </span>
            <span style={{ color: PremiumColors.primary[600] }}>
              • Click any time slot to create an appointment
            </span>
          </div>
        </div>
      )}

      {/* Enhanced Calendar Header */}
      <div 
        className="calendar-header flex items-center justify-between px-6 py-5 border-b shadow-sm"
        style={{ 
          borderColor: PremiumColors.border.light,
          background: `linear-gradient(to right, ${PremiumColors.background.primary}, ${PremiumColors.background.secondary})`
        }}
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange?.(addDays(currentDate, -1))}
              className="h-10 w-10 p-0 rounded-full shadow-sm hover:shadow-md transition-all"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {format(currentDate, 'EEEE, MMMM d')}
              </h2>
              <p className="text-sm text-gray-600">
                {format(currentDate, 'yyyy')} • 
                {isToday(currentDate) ? ' Today' : 
                 isTomorrow(currentDate) ? ' Tomorrow' :
                 isYesterday(currentDate) ? ' Yesterday' : ''}
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDateChange?.(addDays(currentDate, 1))}
              className="h-10 w-10 p-0 rounded-full shadow-sm hover:shadow-md transition-all"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDateChange?.(new Date())}
            className="px-4 py-2 rounded-lg font-medium"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Controls */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1" style={{ backgroundColor: PremiumColors.background.secondary }}>
            {(['day', 'week', 'month'] as const).map((viewType) => (
              <Button
                key={viewType}
                variant={view === viewType ? 'default' : 'ghost'}
                size="sm"
                onClick={() => handleViewChange(viewType)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  view === viewType ? 'shadow-sm' : ''
                }`}
                style={view === viewType ? { 
                  backgroundColor: PremiumColors.primary[500],
                  color: 'white'
                } : {}}
              >
                {viewType === 'day' && <ViewColumnsIcon className="w-4 h-4 mr-1" />}
                {viewType === 'week' && <CalendarDaysIcon className="w-4 h-4 mr-1" />}
                {viewType === 'month' && <CalendarIcon className="w-4 h-4 mr-1" />}
                {viewType.charAt(0).toUpperCase() + viewType.slice(1)}
              </Button>
            ))}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date()
                handleTimeSlotClick(currentDate, barbers[0]?.id || 1, now.getHours(), 0)
              }}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg border-2 border-dashed hover:scale-105 transition-all"
              style={{ 
                borderColor: PremiumColors.primary[300],
                color: PremiumColors.primary[700]
              }}
            >
              <PlusIcon className="w-4 h-4" />
              <span className="font-medium">Quick Add</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              className="h-10 w-10 p-0 rounded-full"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              className="h-10 w-10 p-0 rounded-full"
            >
              <AdjustmentsHorizontalIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      {view === 'day' && renderDayView()}
      {view === 'week' && renderWeekView()}
      {view === 'month' && renderMonthView()}
    </div>
  )
}

export default PremiumCalendar
    
    while (day <= endDate) {
      days.push(new Date(day))
      day = addDays(day, 1)
    }
    
    const weeks = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    
    return (
      <div className="month-view p-6 h-full overflow-auto">
        <div className="month-grid max-w-7xl mx-auto">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {days.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth()
              const dayAppointments = filteredAppointments.filter(apt => {
                const aptDate = new Date(apt.start_time)
                return format(aptDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
              })
              
              const totalRevenue = dayAppointments
                .filter(apt => apt.status !== 'cancelled')
                .reduce((sum, apt) => sum + apt.price, 0)
              
              return (
                <div
                  key={index}
                  className={`
                    day-cell bg-white p-2 min-h-[100px] cursor-pointer transition-colors
                    ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}
                    ${isToday(day) ? 'bg-blue-50 ring-2 ring-blue-400 ring-inset' : ''}
                    hover:bg-gray-50
                  `}
                  onClick={() => {
                    onDateChange?.(day)
                    handleViewChange('day')
                  }}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-between mb-1">
                    <span className={`
                      text-sm font-medium
                      ${isToday(day) ? 'text-blue-600' : ''}
                      ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'}
                    `}>
                      {format(day, 'd')}
                    </span>
                    {dayAppointments.length > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="text-xs px-1.5 py-0"
                        style={{
                          backgroundColor: PremiumColors.primary[100],
                          color: PremiumColors.primary[700]
                        }}
                      >
                        {dayAppointments.length}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Appointment preview */}
                  {isCurrentMonth && dayAppointments.length > 0 && (
                    <div className="space-y-1">
                      {dayAppointments.slice(0, 3).map((apt, idx) => {
                        const barber = barbers.find(b => b.id === apt.barber_id)
                        const barberInitials = barber 
                          ? (barber.name ? barber.name.split(' ').map(n => n[0]).join('') 
                            : `${barber.first_name?.[0] || ''}${barber.last_name?.[0] || ''}`)
                          : 'B'
                        
                        return (
                          <div
                            key={apt.id}
                            className="text-xs truncate flex items-center gap-1"
                            style={{ color: PremiumColors.services.haircut.dark }}
                          >
                            <span className="font-medium">{barberInitials}:</span>
                            <span className="truncate">{apt.client_name}</span>
                          </div>
                        )
                      })}
                      {dayAppointments.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{dayAppointments.length - 3} more
                        </div>
                      )}
                      
                      {/* Revenue indicator */}
                      {showRevenue && totalRevenue > 0 && (
                        <div className="text-xs font-medium pt-1 border-t" style={{ color: PremiumColors.status.confirmed.dark }}>
                          ${totalRevenue}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          
          {/* Month summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="summary-card bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-600">Total Appointments</div>
              <div className="text-2xl font-bold text-gray-900">
                {filteredAppointments.filter(apt => {
                  const aptDate = new Date(apt.start_time)
                  return aptDate.getMonth() === currentDate.getMonth() && 
                         aptDate.getFullYear() === currentDate.getFullYear()
                }).length}
              </div>
            </div>
            
            <div className="summary-card bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-600">Confirmed</div>
              <div className="text-2xl font-bold" style={{ color: PremiumColors.status.confirmed.main }}>
                {filteredAppointments.filter(apt => {
                  const aptDate = new Date(apt.start_time)
                  return aptDate.getMonth() === currentDate.getMonth() && 
                         aptDate.getFullYear() === currentDate.getFullYear() &&
                         apt.status === 'confirmed'
                }).length}
              </div>
            </div>
            
            <div className="summary-card bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-2xl font-bold" style={{ color: PremiumColors.status.completed.main }}>
                {filteredAppointments.filter(apt => {
                  const aptDate = new Date(apt.start_time)
                  return aptDate.getMonth() === currentDate.getMonth() && 
                         aptDate.getFullYear() === currentDate.getFullYear() &&
                         apt.status === 'completed'
                }).length}
              </div>
            </div>
            
            {showRevenue && (
              <div className="summary-card bg-white rounded-lg border p-4">
                <div className="text-sm text-gray-600">Month Revenue</div>
                <div className="text-2xl font-bold" style={{ color: PremiumColors.status.confirmed.dark }}>
                  ${filteredAppointments.filter(apt => {
                    const aptDate = new Date(apt.start_time)
                    return aptDate.getMonth() === currentDate.getMonth() && 
                           aptDate.getFullYear() === currentDate.getFullYear() &&
                           apt.status !== 'cancelled'
                  }).reduce((sum, apt) => sum + apt.price, 0)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="premium-calendar-error p-8 text-center">
        <div className="text-red-500 mb-4">⚠️ Calendar Error</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={onRefresh} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div 
      ref={swipeContainerRef}
      className={`premium-calendar h-full ${className}`}
      style={styles.calendarContainer}
    >
      {/* Empty State Info Banner */}
      {filteredAppointments.length === 0 && !isLoading && (
        <div className="bg-blue-50 border-b border-blue-100 px-6 py-2">
          <div className="flex items-center justify-center space-x-2 text-sm">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            <span className="text-blue-700">No appointments scheduled</span>
            <span className="text-blue-600">• Click any time slot to create an appointment</span>
          </div>
        </div>
      )}

      {/* Calendar Header */}
      <div 
        className="calendar-header flex items-center justify-between px-6 py-4 border-b bg-white"
        style={{ borderColor: PremiumColors.border.light }}
      >
        {/* Date Navigation & Info */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('prev')}
            className="p-2"
            disabled={isLoading}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" style={{ color: PremiumColors.gray[600] }} />
            <h2 
              className="font-semibold"
              style={{
                fontSize: PremiumTypography.fontSize.lg,
                fontWeight: PremiumTypography.fontWeight.semibold,
                color: PremiumColors.gray[900]
              }}
            >
              {view === 'day' 
                ? format(currentDate, 'EEEE, MMMM d, yyyy')
                : view === 'week'
                ? `Week of ${format(displayDates[0], 'MMM d')} - ${format(displayDates[6], 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')
              }
            </h2>
            
            {/* Today indicator */}
            {displayDates.some(date => isToday(date)) && (
              <Badge 
                variant="secondary"
                style={{
                  backgroundColor: PremiumColors.status.confirmed.light,
                  color: PremiumColors.status.confirmed.main
                }}
              >
                Today
              </Badge>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('next')}
            className="p-2"
            disabled={isLoading}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* View Controls & Actions */}
        <div className="flex items-center space-x-2">
          {/* View Switcher */}
          <div className="flex items-center border rounded-lg p-1" style={{ borderColor: PremiumColors.border.light }}>
            <Button
              variant={view === 'day' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('day')}
              className="px-3 py-1 text-xs"
            >
              Day
            </Button>
            <Button
              variant={view === 'week' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('week')}
              className="px-3 py-1 text-xs"
            >
              Week
            </Button>
            <Button
              variant={view === 'month' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewChange('month')}
              className="px-3 py-1 text-xs"
            >
              Month
            </Button>
          </div>
          
          {/* Settings Button */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            {!isMobile && <span>View</span>}
          </Button>
          
          {/* New Appointment Button */}
          <Button
            onClick={() => {
              // Default to current date/time and first barber
              const now = new Date()
              const currentHour = now.getHours()
              const nextHour = currentHour < endHour ? currentHour + 1 : startHour
              const defaultBarber = barbers[0] || { id: 1, name: 'Barber' }
              
              handleTimeSlotClick(
                currentDate, 
                defaultBarber.id, 
                nextHour, 
                0
              )
            }}
            size="sm"
            className="flex items-center space-x-2"
            style={{ backgroundColor: PremiumColors.primary[500] }}
            disabled={isLoading || barbers.length === 0}
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add</span>
          </Button>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="calendar-body flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" 
                   style={{ borderColor: PremiumColors.primary[500] }}></div>
              <p style={{ color: PremiumColors.gray[600] }}>Loading calendar...</p>
            </div>
          </div>
        ) : (
          <>
            {view === 'month' ? renderMonthView() : renderTimeBasedView()}
          </>
        )}
      </div>


      {/* Appointment Creation Modal */}
      {modalData && (
        <AppointmentModal
          isOpen={appointmentModalOpen}
          onClose={() => {
            setAppointmentModalOpen(false)
            setModalData(null)
          }}
          selectedDate={modalData.date}
          selectedTime={modalData.time}
          barberId={modalData.barberId}
          barberName={modalData.barberName}
          existingAppointments={filteredAppointments}
          onConfirm={handleAppointmentConfirm}
        />
      )}

      {/* Appointment Edit Modal */}
      {selectedAppointmentData && (
        <AppointmentEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false)
            setSelectedAppointmentData(null)
          }}
          appointment={selectedAppointmentData}
          barbers={barbers}
          existingAppointments={filteredAppointments}
          onUpdate={handleAppointmentUpdate}
          onDelete={handleAppointmentDelete}
          onReschedule={handleAppointmentReschedule}
        />
      )}
    </div>
  )
}

export default PremiumCalendar