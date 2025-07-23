'use client'

import React, { useState, useEffect } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, isToday } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon } from '@heroicons/react/24/outline'
import { Button } from './ui/button'
import { Card } from './ui/card'

export type CalendarView = 'day' | 'week' | 'month'

interface Appointment {
  id: number
  start_time: string
  end_time?: string
  client_name: string
  service_name: string
  barber_name?: string
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  price?: number
  duration_minutes?: number
}

interface SimpleCalendarProps {
  view: CalendarView
  onViewChange?: (view: CalendarView) => void
  currentDate?: Date
  onDateChange?: (date: Date) => void
  appointments: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: Date) => void
  onDayClick?: (date: Date) => void
  isLoading?: boolean
  className?: string
}

export default function SimpleCalendar({
  view,
  onViewChange,
  currentDate = new Date(),
  onDateChange,
  appointments = [],
  onAppointmentClick,
  onTimeSlotClick,
  onDayClick,
  isLoading = false,
  className = ""
}: SimpleCalendarProps) {
  
  const [selectedDate, setSelectedDate] = useState(currentDate)

  useEffect(() => {
    setSelectedDate(currentDate)
  }, [currentDate])

  // Navigation functions
  const navigateDate = (direction: 'prev' | 'next') => {
    let newDate = new Date(selectedDate)
    
    switch (view) {
      case 'day':
        newDate = direction === 'prev' ? subDays(selectedDate, 1) : addDays(selectedDate, 1)
        break
      case 'week':
        newDate = direction === 'prev' ? subWeeks(selectedDate, 1) : addWeeks(selectedDate, 1)
        break
      case 'month':
        newDate = direction === 'prev' ? subMonths(selectedDate, 1) : addMonths(selectedDate, 1)
        break
    }
    
    setSelectedDate(newDate)
    onDateChange?.(newDate)
  }

  const goToToday = () => {
    const today = new Date()
    setSelectedDate(today)
    onDateChange?.(today)
  }

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date): Appointment[] => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointments.filter(apt => {
      try {
        const aptDate = format(new Date(apt.start_time), 'yyyy-MM-dd')
        return aptDate === dateStr
      } catch {
        return false
      }
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 border-green-300 text-green-800'
      case 'pending': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'cancelled': return 'bg-red-100 border-red-300 text-red-800'
      case 'completed': return 'bg-blue-100 border-blue-300 text-blue-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  // Render appointment card
  const renderAppointment = (appointment: Appointment) => (
    <div
      key={appointment.id}
      className={`p-2 mb-2 border rounded cursor-pointer hover:shadow-sm ${getStatusColor(appointment.status)}`}
      onClick={() => onAppointmentClick?.(appointment)}
    >
      <div className="text-sm font-medium">{appointment.client_name}</div>
      <div className="text-xs">{appointment.service_name}</div>
      <div className="text-xs">{format(new Date(appointment.start_time), 'h:mm a')}</div>
      {appointment.price && <div className="text-xs font-medium">${appointment.price}</div>}
    </div>
  )

  // Day View
  const renderDayView = () => {
    const dayAppointments = getAppointmentsForDate(selectedDate)
    const timeSlots = []
    
    // Generate time slots from 8 AM to 7 PM
    for (let hour = 8; hour < 19; hour++) {
      const slotTime = new Date(selectedDate)
      slotTime.setHours(hour, 0, 0, 0)
      timeSlots.push(slotTime)
    }

    return (
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          {dayAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No appointments scheduled for {format(selectedDate, 'MMMM d, yyyy')}
            </div>
          ) : (
            dayAppointments.map(renderAppointment)
          )}
        </div>
        
        {/* Time slots for booking */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium mb-2">Available Time Slots:</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {timeSlots.map(slot => (
              <Button
                key={slot.toISOString()}
                variant="outline"
                size="sm"
                className="h-10"
                onClick={() => onTimeSlotClick?.(slot)}
              >
                {format(slot, 'h:mm a')}
              </Button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Week View
  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate)
    const weekEnd = endOfWeek(selectedDate)
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    return (
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => {
          const dayAppointments = getAppointmentsForDate(day)
          return (
            <div key={day.toISOString()} className="border rounded p-2 min-h-[200px]">
              <div className={`text-center font-medium mb-2 ${isToday(day) ? 'text-blue-600' : ''}`}>
                <div className="text-xs">{format(day, 'EEE')}</div>
                <div className="text-lg">{format(day, 'd')}</div>
              </div>
              <div className="space-y-1">
                {dayAppointments.map(apt => (
                  <div
                    key={apt.id}
                    className={`text-xs p-1 rounded cursor-pointer ${getStatusColor(apt.status)}`}
                    onClick={() => onAppointmentClick?.(apt)}
                  >
                    <div className="font-medium truncate">{apt.client_name}</div>
                    <div className="truncate">{format(new Date(apt.start_time), 'h:mm a')}</div>
                  </div>
                ))}
              </div>
              {dayAppointments.length === 0 && (
                <button
                  className="w-full text-xs text-gray-400 hover:text-blue-600 mt-2"
                  onClick={() => onDayClick?.(day)}
                >
                  + Add appointment
                </button>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Month View
  const renderMonthView = () => {
    const monthStart = startOfMonth(selectedDate)
    const monthEnd = endOfMonth(selectedDate)
    const calendarStart = startOfWeek(monthStart)
    const calendarEnd = endOfWeek(monthEnd)
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

    return (
      <div className="grid grid-cols-7 gap-1">
        {/* Week day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium p-2 text-gray-600">
            {day}
          </div>
        ))}
        
        {/* Calendar days */}
        {calendarDays.map(day => {
          const dayAppointments = getAppointmentsForDate(day)
          const isCurrentMonth = format(day, 'M') === format(selectedDate, 'M')
          const isSelected = isSameDay(day, selectedDate)
          
          return (
            <div
              key={day.toISOString()}
              className={`border p-2 min-h-[100px] cursor-pointer hover:bg-gray-50 ${
                !isCurrentMonth ? 'text-gray-400 bg-gray-50' : ''
              } ${isSelected ? 'bg-blue-50 border-blue-300' : ''} ${isToday(day) ? 'font-bold' : ''}`}
              onClick={() => onDayClick?.(day)}
            >
              <div className="text-sm mb-1">{format(day, 'd')}</div>
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map(apt => (
                  <div
                    key={apt.id}
                    className={`text-xs p-1 rounded truncate ${getStatusColor(apt.status)}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onAppointmentClick?.(apt)
                    }}
                  >
                    {apt.client_name}
                  </div>
                ))}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500">+{dayAppointments.length - 3} more</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          
          <h2 className="text-xl font-semibold">
            {view === 'day' && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            {view === 'week' && `Week of ${format(startOfWeek(selectedDate), 'MMM d, yyyy')}`}
            {view === 'month' && format(selectedDate, 'MMMM yyyy')}
          </h2>
          
          <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
          
          {/* View switcher */}
          <div className="flex border rounded">
            {(['day', 'week', 'month'] as CalendarView[]).map(v => (
              <Button
                key={v}
                variant={view === v ? "default" : "ghost"}
                size="sm"
                className="rounded-none first:rounded-l last:rounded-r"
                onClick={() => onViewChange?.(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar content */}
      <div className="calendar-content">
        {view === 'day' && renderDayView()}
        {view === 'week' && renderWeekView()}
        {view === 'month' && renderMonthView()}
      </div>
    </Card>
  )
}