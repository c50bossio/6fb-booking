'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { format, addDays, startOfWeek, isSameDay, isToday, startOfDay, endOfDay } from 'date-fns'
import StaffAvatarHeader from './calendar/StaffAvatarHeader'
import PremiumAppointmentBlock from './calendar/PremiumAppointmentBlock'
import ProfessionalTimeAxis from './calendar/ProfessionalTimeAxis'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { 
  FreshaColors, 
  FreshaTypography, 
  FreshaSpacing,
  FreshaBorderRadius,
  FreshaShadows,
  createFreshaStyles
} from '@/lib/fresha-design-system'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
  ViewColumnsIcon,
  CalendarDaysIcon
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

interface FreshaInspiredCalendarProps {
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

const FreshaInspiredCalendar: React.FC<FreshaInspiredCalendarProps> = ({
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
  const styles = createFreshaStyles()

  // Mobile swipe navigation
  const swipeContainerRef = useSwipeNavigation(
    () => navigateDate('next'),
    () => navigateDate('prev'),
    isMobile ? 30 : 50
  )

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
      return isSameDay(appointmentDate, date) && appointmentDate.getHours() === hour
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
    onTimeSlotClick?.(date, barberId, hour, minute)
  }, [onTimeSlotClick])

  // Render day/week view (main Fresha-inspired layout)
  const renderTimeBasedView = () => {
    return (
      <div className="calendar-grid flex flex-1 overflow-hidden">
        {/* Time Axis */}
        <ProfessionalTimeAxis
          startHour={startHour}
          endHour={endHour}
          slotDuration={slotDuration}
          compact={view === 'week' || isMobile}
        />

        {/* Staff Columns Container */}
        <div className="flex-1 flex overflow-x-auto">
          {barbers.map(barber => {
            const stats = barberStats[barber.id] || { 
              appointmentCount: 0, 
              todayRevenue: 0, 
              availability: 'available' 
            }
            
            return (
              <div 
                key={barber.id}
                className="barber-column flex-shrink-0 border-r last:border-r-0"
                style={{
                  minWidth: isMobile ? '280px' : view === 'week' ? '160px' : '240px',
                  borderColor: FreshaColors.border.light
                }}
              >
                {/* Staff Header */}
                <StaffAvatarHeader
                  barber={barber}
                  availability={stats.availability as any}
                  appointmentCount={stats.appointmentCount}
                  todayRevenue={stats.todayRevenue}
                  isSelected={selectedBarberId === barber.id}
                  onClick={() => onBarberSelect?.(barber.id)}
                  showRevenue={showRevenue}
                  showAppointmentCount={showAppointmentCount}
                />

                {/* Time Slots */}
                <div className="time-slots relative">
                  {Array.from({ length: endHour - startHour }, (_, hourIndex) => {
                    const hour = startHour + hourIndex
                    const slotDate = displayDates[0] // For now, use first date (day view)
                    const slotAppointments = getAppointmentsForSlot(barber.id, slotDate, hour)
                    
                    return (
                      <div
                        key={hour}
                        className="time-slot relative border-b hover:bg-gray-50 transition-colors group cursor-pointer"
                        style={{
                          height: slotDuration >= 60 ? '64px' : `${Math.max(32, slotDuration * 0.8)}px`,
                          borderColor: FreshaColors.border.light
                        }}
                        onClick={() => handleTimeSlotClick(slotDate, barber.id, hour, 0)}
                      >
                        {/* Hover Add Button */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 rounded-full"
                            style={{ 
                              backgroundColor: `${FreshaColors.primary[500]}15`,
                              color: FreshaColors.primary[600]
                            }}
                          >
                            <PlusIcon className="w-4 h-4" />
                          </Button>
                        </div>

                        {/* Appointments */}
                        {slotAppointments.map(appointment => (
                          <div
                            key={appointment.id}
                            style={getAppointmentStyle(appointment)}
                          >
                            <PremiumAppointmentBlock
                              appointment={appointment}
                              colorScheme={colorScheme}
                              showPrice={showRevenue}
                              showDuration={true}
                              showClientTier={true}
                              onClick={() => onAppointmentClick?.(appointment)}
                              isSelected={selectedAppointmentId === appointment.id}
                            />
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Render month view (simplified for now)
  const renderMonthView = () => {
    return (
      <div className="month-view p-6">
        <div className="text-center text-gray-500">
          <CalendarDaysIcon className="w-12 h-12 mx-auto mb-4" />
          <p>Month view coming soon...</p>
          <p className="text-sm mt-2">Switch to Day or Week view for full functionality.</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="fresha-calendar-error p-8 text-center">
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
      className={`fresha-inspired-calendar h-full ${className}`}
      style={styles.calendarContainer}
    >
      {/* Calendar Header */}
      <div 
        className="calendar-header flex items-center justify-between px-6 py-4 border-b bg-white"
        style={{ borderColor: FreshaColors.border.light }}
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
            <CalendarIcon className="w-5 h-5" style={{ color: FreshaColors.gray[600] }} />
            <h2 
              className="font-semibold"
              style={{
                fontSize: FreshaTypography.fontSize.lg,
                fontWeight: FreshaTypography.fontWeight.semibold,
                color: FreshaColors.gray[900]
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
                  backgroundColor: FreshaColors.status.confirmed.light,
                  color: FreshaColors.status.confirmed.main
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
          <div className="flex items-center border rounded-lg p-1" style={{ borderColor: FreshaColors.border.light }}>
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
            onClick={onNewAppointment}
            size="sm"
            className="flex items-center space-x-2"
            style={{ backgroundColor: FreshaColors.primary[500] }}
            disabled={isLoading}
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add</span>
          </Button>
        </div>
      </div>

      {/* Calendar Body */}
      <div className="calendar-body flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" 
                   style={{ borderColor: FreshaColors.primary[500] }}></div>
              <p style={{ color: FreshaColors.gray[600] }}>Loading calendar...</p>
            </div>
          </div>
        ) : filteredAppointments.length === 0 && !isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4" style={{ color: FreshaColors.gray[400] }} />
              <p style={{ color: FreshaColors.gray[600] }}>No appointments scheduled</p>
              <p className="text-sm mt-2" style={{ color: FreshaColors.gray[500] }}>
                Click on a time slot to create your first appointment
              </p>
            </div>
          </div>
        ) : (
          <>
            {view === 'month' ? renderMonthView() : renderTimeBasedView()}
          </>
        )}
      </div>

      {/* Current Time Indicator */}
      {(view === 'day' || view === 'week') && displayDates.some(date => isToday(date)) && (
        <div 
          className="absolute left-20 right-0 h-0.5 pointer-events-none z-20"
          style={{
            backgroundColor: FreshaColors.status.confirmed.main,
            top: `${80 + ((new Date().getHours() - startHour) * 64) + ((new Date().getMinutes() / 60) * 64)}px`,
            display: new Date().getHours() >= startHour && new Date().getHours() < endHour ? 'block' : 'none'
          }}
        >
          {/* Current time indicator dot */}
          <div 
            className="w-3 h-3 rounded-full border-2 border-white shadow-sm absolute -left-1 -top-1"
            style={{ backgroundColor: FreshaColors.status.confirmed.main }}
          />
        </div>
      )}
    </div>
  )
}

export default FreshaInspiredCalendar