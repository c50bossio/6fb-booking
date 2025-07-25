'use client'

import React, { useState, useMemo, useCallback } from 'react'
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns'
import StaffAvatarHeader from './StaffAvatarHeader'
import PremiumAppointmentBlock from './PremiumAppointmentBlock'
import ProfessionalTimeAxis from './ProfessionalTimeAxis'
import { Button } from '@/components/ui/button'
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
  PlusIcon
} from '@heroicons/react/24/outline'

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
}

interface FreshaCalendarLayoutProps {
  // Data
  barbers: Barber[]
  appointments: Appointment[]
  currentDate: Date
  
  // View configuration
  view?: 'day' | 'week'
  startHour?: number
  endHour?: number
  slotDuration?: number
  
  // Display options
  showRevenue?: boolean
  showAppointmentCount?: boolean
  colorScheme?: 'service-based' | 'status-based' | 'tier-based'
  
  // Event handlers
  onDateChange?: (date: Date) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: Date, barberId: number, hour: number, minute: number) => void
  onBarberSelect?: (barberId: number) => void
  onNewAppointment?: () => void
  
  // Selection state
  selectedBarberId?: number | null
  selectedAppointmentId?: number | null
  
  className?: string
}

const FreshaCalendarLayout: React.FC<FreshaCalendarLayoutProps> = ({
  barbers = [],
  appointments = [],
  currentDate,
  view = 'day',
  startHour = 8,
  endHour = 19,
  slotDuration = 60,
  showRevenue = true,
  showAppointmentCount = true,
  colorScheme = 'service-based',
  onDateChange,
  onAppointmentClick,
  onTimeSlotClick,
  onBarberSelect,
  onNewAppointment,
  selectedBarberId,
  selectedAppointmentId,
  className = ''
}) => {
  const styles = createFreshaStyles()

  // Get dates to display based on view
  const displayDates = useMemo(() => {
    if (view === 'day') {
      return [currentDate]
    } else {
      // Week view
      const weekStart = startOfWeek(currentDate)
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    }
  }, [currentDate, view])

  // Filter appointments for current view
  const filteredAppointments = useMemo(() => {
    return appointments.filter(appointment => 
      displayDates.some(date => isSameDay(new Date(appointment.start_time), date))
    )
  }, [appointments, displayDates])

  // Calculate stats for each barber
  const barberStats = useMemo(() => {
    const stats: Record<number, { appointmentCount: number; todayRevenue: number; availability: string }> = {}
    
    barbers.forEach(barber => {
      const barberAppointments = filteredAppointments.filter(apt => apt.barber_id === barber.id)
      const todayRevenue = barberAppointments
        .filter(apt => apt.status !== 'cancelled')
        .reduce((sum, apt) => sum + apt.price, 0)
      
      // Simple availability calculation (could be enhanced with real availability data)
      const hasAppointments = barberAppointments.length > 0
      const availability = hasAppointments ? 'busy' : 'available'
      
      stats[barber.id] = {
        appointmentCount: barberAppointments.length,
        todayRevenue,
        availability
      }
    })
    
    return stats
  }, [barbers, filteredAppointments])

  // Navigate dates
  const navigateDate = useCallback((direction: 'prev' | 'next') => {
    if (!onDateChange) return
    
    const days = view === 'day' ? 1 : 7
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

  // Calculate appointment position and height
  const getAppointmentStyle = useCallback((appointment: Appointment) => {
    const startTime = new Date(appointment.start_time)
    const minutes = startTime.getMinutes()
    const duration = appointment.duration_minutes
    
    const slotHeight = slotDuration >= 60 ? 64 : Math.max(32, slotDuration * 0.8)
    const topOffset = (minutes / 60) * slotHeight
    const height = Math.max(40, (duration / 60) * slotHeight - 4) // Minimum height with gap
    
    return {
      top: `${topOffset}px`,
      height: `${height}px`,
      position: 'absolute' as const,
      left: '4px',
      right: '4px',
      zIndex: 10
    }
  }, [slotDuration])

  return (
    <div 
      className={`fresha-calendar-layout ${className}`}
      style={styles.calendarContainer}
    >
      {/* Calendar Header */}
      <div 
        className="calendar-header flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: FreshaColors.border.light }}
      >
        {/* Date Navigation */}
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('prev')}
            className="p-2"
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
                : `Week of ${format(currentDate, 'MMMM d, yyyy')}`
              }
            </h2>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigateDate('next')}
            className="p-2"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-2"
          >
            <AdjustmentsHorizontalIcon className="w-4 h-4" />
            <span>Settings</span>
          </Button>
          
          <Button
            onClick={onNewAppointment}
            size="sm"
            className="flex items-center space-x-2"
            style={{ backgroundColor: FreshaColors.primary[500] }}
          >
            <PlusIcon className="w-4 h-4" />
            <span>New</span>
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid flex flex-1 overflow-hidden">
        {/* Time Axis */}
        <ProfessionalTimeAxis
          startHour={startHour}
          endHour={endHour}
          slotDuration={slotDuration}
          compact={view === 'week'}
        />

        {/* Staff Columns Container */}
        <div className="flex-1 flex overflow-x-auto">
          {barbers.map(barber => {
            const stats = barberStats[barber.id] || { appointmentCount: 0, todayRevenue: 0, availability: 'available' }
            
            return (
              <div 
                key={barber.id}
                className="barber-column flex-shrink-0 border-r"
                style={{
                  minWidth: view === 'week' ? '160px' : '240px',
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
                    const slotDate = view === 'day' ? currentDate : displayDates[0] // For week, we'd need to handle multiple days
                    const slotAppointments = getAppointmentsForSlot(barber.id, slotDate, hour)
                    
                    return (
                      <div
                        key={hour}
                        className="time-slot relative border-b hover:bg-gray-50 transition-colors group cursor-pointer"
                        style={{
                          height: slotDuration >= 60 ? '64px' : `${Math.max(32, slotDuration * 0.8)}px`,
                          borderColor: FreshaColors.border.light
                        }}
                        onClick={() => onTimeSlotClick?.(slotDate, barber.id, hour, 0)}
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

      {/* Today Indicator */}
      {displayDates.some(date => isToday(date)) && (
        <div 
          className="absolute left-20 right-0 h-0.5 pointer-events-none z-20"
          style={{
            backgroundColor: FreshaColors.status.confirmed.main,
            top: `${80 + ((new Date().getHours() - startHour) * 64) + ((new Date().getMinutes() / 60) * 64)}px`
          }}
        />
      )}
    </div>
  )
}

export default FreshaCalendarLayout