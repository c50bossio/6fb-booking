'use client'

import React, { useState, useMemo } from 'react'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  PlusIcon,
  EllipsisVerticalIcon
} from '@heroicons/react/24/outline'
import type { CalendarAppointment } from './PremiumCalendar'

interface MobileCalendarProps {
  appointments?: CalendarAppointment[]
  onAppointmentClick?: (appointment: CalendarAppointment) => void
  onTimeSlotClick?: (date: string, time: string) => void
  onCreateAppointment?: (date: string, time: string) => void
  initialDate?: Date
  barbers?: Array<{ id: number; name: string; color?: string }>
  darkMode?: boolean
}

export default function MobileCalendar({
  appointments = [],
  onAppointmentClick,
  onTimeSlotClick,
  onCreateAppointment,
  initialDate = new Date(),
  barbers = [],
  darkMode = true
}: MobileCalendarProps) {
  const [currentDate, setCurrentDate] = useState<Date>(initialDate)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'agenda'>('agenda')

  // Get week dates for mobile week view
  const weekDates = useMemo(() => {
    const start = new Date(currentDate)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
    
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [currentDate])

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return appointments.filter(apt => apt.date === dateStr)
  }

  const getTodayAppointments = () => {
    return getAppointmentsForDate(selectedDate).sort((a, b) => 
      a.startTime.localeCompare(b.startTime)
    )
  }

  const getUpcomingAppointments = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    return appointments
      .filter(apt => new Date(apt.date) >= today)
      .sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date)
        if (dateCompare === 0) {
          return a.startTime.localeCompare(b.startTime)
        }
        return dateCompare
      })
      .slice(0, 10) // Show next 10 appointments
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-violet-500'
      case 'completed':
        return 'bg-emerald-500'
      case 'pending':
        return 'bg-amber-500'
      case 'cancelled':
        return 'bg-red-500'
      case 'no_show':
        return 'bg-gray-500'
      default:
        return 'bg-violet-500'
    }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
  }

  const navigateDay = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate)
    newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1))
    setSelectedDate(newDate)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour24 = parseInt(hours)
    const ampm = hour24 >= 12 ? 'PM' : 'AM'
    const hour12 = hour24 % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} min-h-screen`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-700 rounded-lg">
              <CalendarDaysIcon className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-lg font-bold">Calendar</h1>
          </div>
          
          <button
            onClick={() => onCreateAppointment?.(selectedDate.toISOString().split('T')[0], '09:00')}
            className="p-2 bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors"
          >
            <PlusIcon className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* View Toggle */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('week')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'week'
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('agenda')}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
              viewMode === 'agenda'
                ? 'bg-violet-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Agenda
          </button>
        </div>
      </div>

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="p-4">
          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <span className="text-sm font-medium text-gray-300">
              {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {' '}
              {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Week Days */}
          <div className="grid grid-cols-7 gap-1 mb-4">
            {weekDates.map((date, index) => {
              const dayAppointments = getAppointmentsForDate(date)
              const isSelectedDate = date.toDateString() === selectedDate.toDateString()
              const isTodayDate = isToday(date)
              
              return (
                <div
                  key={index}
                  onClick={() => setSelectedDate(date)}
                  className={`p-2 rounded-lg text-center cursor-pointer transition-colors ${
                    isSelectedDate 
                      ? 'bg-violet-600 text-white'
                      : isTodayDate
                        ? 'bg-violet-900/30 text-violet-400'
                        : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <div className="text-xs font-medium">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold">
                    {date.getDate()}
                  </div>
                  {dayAppointments.length > 0 && (
                    <div className="flex justify-center mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        isSelectedDate ? 'bg-white' : 'bg-violet-500'
                      }`}></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Selected Day's Appointments */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                {formatFullDate(selectedDate)}
              </h2>
              <button
                onClick={() => navigateDay('next')}
                className="text-sm text-violet-400 hover:text-violet-300"
              >
                Next Day →
              </button>
            </div>

            <div className="space-y-2">
              {getTodayAppointments().map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => onAppointmentClick?.(appointment)}
                  className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(appointment.status)}`}></div>
                        <span className="font-medium text-white">{appointment.service}</span>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</span>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <UserIcon className="h-4 w-4" />
                          <span>{appointment.client}</span>
                        </div>
                      </div>
                      
                      <div className="mt-2 text-sm text-gray-300">
                        {appointment.barber} • ${appointment.price}
                      </div>
                    </div>
                    
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              ))}

              {getTodayAppointments().length === 0 && (
                <div className="text-center py-8">
                  <CalendarDaysIcon className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">No appointments for this day</p>
                  <button
                    onClick={() => onCreateAppointment?.(selectedDate.toISOString().split('T')[0], '09:00')}
                    className="mt-2 text-violet-400 hover:text-violet-300 text-sm"
                  >
                    Create Appointment
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Agenda View */}
      {viewMode === 'agenda' && (
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4">Upcoming Appointments</h2>
          
          <div className="space-y-3">
            {getUpcomingAppointments().map((appointment) => {
              const appointmentDate = new Date(appointment.date)
              const isAppointmentToday = isToday(appointmentDate)
              
              return (
                <div
                  key={appointment.id}
                  onClick={() => onAppointmentClick?.(appointment)}
                  className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(appointment.status)}`}></div>
                        <span className="font-medium text-white">{appointment.service}</span>
                        {isAppointmentToday && (
                          <span className="bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-400 mb-2">
                        {formatDate(appointmentDate)} • {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 text-sm text-gray-300">
                          <div className="flex items-center space-x-1">
                            <UserIcon className="h-4 w-4" />
                            <span>{appointment.client}</span>
                          </div>
                          
                          <span>{appointment.barber}</span>
                        </div>
                        
                        <span className="text-sm font-medium text-emerald-400">${appointment.price}</span>
                      </div>
                    </div>
                    
                    <EllipsisVerticalIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
              )
            })}

            {getUpcomingAppointments().length === 0 && (
              <div className="text-center py-12">
                <CalendarDaysIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg mb-2">No upcoming appointments</p>
                <p className="text-gray-500 text-sm mb-4">
                  Create your first appointment to get started
                </p>
                <button
                  onClick={() => onCreateAppointment?.(new Date().toISOString().split('T')[0], '09:00')}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Create Appointment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Add FAB */}
      <div className="fixed bottom-6 right-6 z-20">
        <button
          onClick={() => onCreateAppointment?.(selectedDate.toISOString().split('T')[0], '09:00')}
          className="w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center transform hover:scale-105"
        >
          <PlusIcon className="h-6 w-6" />
        </button>
      </div>
    </div>
  )
}