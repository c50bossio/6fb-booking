'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import {
  CalendarIcon,
  ViewColumnsIcon,
  Squares2X2Icon
} from '@heroicons/react/24/solid'
import { useTheme } from '@/contexts/ThemeContext'

// Types for appointments and calendar
export interface CalendarAppointment {
  id: string
  title: string
  client: string
  clientId?: number
  barber: string
  barberId: number
  startTime: string
  endTime: string
  service: string
  serviceId?: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  date: string
  notes?: string
  duration: number // in minutes
  clientPhone?: string
  clientEmail?: string
}

export interface CalendarProps {
  appointments?: CalendarAppointment[]
  onAppointmentClick?: (appointment: CalendarAppointment) => void
  onTimeSlotClick?: (date: string, time: string) => void
  onCreateAppointment?: (date: string, time: string) => void
  onUpdateAppointment?: (appointment: CalendarAppointment) => void
  onDeleteAppointment?: (appointmentId: string) => void
  initialView?: 'month' | 'week' | 'day'
  initialDate?: Date
  workingHours?: { start: string; end: string }
  timeSlotDuration?: number // in minutes
  barbers?: Array<{ id: number; name: string; color?: string }>
  services?: Array<{ id: number; name: string; duration: number; price: number }>
  isLoading?: boolean
  darkMode?: boolean // Deprecated - use theme context instead
}

// Default working hours and time slots
const DEFAULT_WORKING_HOURS = { start: '08:00', end: '20:00' }
const DEFAULT_TIME_SLOT_DURATION = 30

// Helper function to format date as YYYY-MM-DD without timezone conversion
const formatDateString = (date: Date): string => {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Generate time slots based on working hours and duration
const generateTimeSlots = (start: string, end: string, duration: number = 30): string[] => {
  const slots: string[] = []
  const startTime = new Date(`2024-01-01 ${start}`)
  const endTime = new Date(`2024-01-01 ${end}`)

  let current = new Date(startTime)
  while (current < endTime) {
    slots.push(current.toTimeString().slice(0, 5))
    current.setMinutes(current.getMinutes() + duration)
  }

  return slots
}

// Mock appointments for demonstration
const mockAppointments: CalendarAppointment[] = [
  {
    id: '1',
    title: 'Premium Haircut & Beard Trim',
    client: 'John Smith',
    clientId: 1,
    barber: 'Marcus Johnson',
    barberId: 1,
    startTime: '09:00',
    endTime: '10:00',
    service: 'Premium Cut & Beard',
    serviceId: 1,
    price: 85,
    status: 'confirmed',
    date: '2024-06-22',
    duration: 60,
    clientPhone: '+1 (555) 123-4567',
    clientEmail: 'john.smith@email.com',
    notes: 'Regular client, prefers scissors over clippers'
  },
  {
    id: '2',
    title: 'Fade Cut',
    client: 'David Rodriguez',
    clientId: 2,
    barber: 'Marcus Johnson',
    barberId: 1,
    startTime: '10:30',
    endTime: '11:30',
    service: 'Classic Fade',
    serviceId: 2,
    price: 45,
    status: 'pending',
    date: '2024-06-22',
    duration: 60
  },
  {
    id: '3',
    title: 'Beard Styling',
    client: 'Michael Brown',
    clientId: 3,
    barber: 'Sarah Mitchell',
    barberId: 2,
    startTime: '14:00',
    endTime: '14:30',
    service: 'Beard Trim',
    serviceId: 3,
    price: 35,
    status: 'completed',
    date: '2024-06-22',
    duration: 30
  },
  {
    id: '4',
    title: 'Wedding Cut',
    client: 'James Wilson',
    clientId: 4,
    barber: 'Sarah Mitchell',
    barberId: 2,
    startTime: '16:00',
    endTime: '17:00',
    service: 'Special Event',
    serviceId: 4,
    price: 95,
    status: 'confirmed',
    date: '2024-06-23',
    duration: 60,
    notes: 'Wedding tomorrow, wants perfect cut'
  }
]

export default function PremiumCalendar({
  appointments = mockAppointments,
  onAppointmentClick,
  onTimeSlotClick,
  onCreateAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  initialView = 'week',
  initialDate = new Date(),
  workingHours = DEFAULT_WORKING_HOURS,
  timeSlotDuration = DEFAULT_TIME_SLOT_DURATION,
  barbers = [
    { id: 1, name: 'Marcus Johnson', color: '#8b5cf6' },
    { id: 2, name: 'Sarah Mitchell', color: '#06b6d4' }
  ],
  services = [],
  isLoading = false,
  darkMode = true // Deprecated - now using theme context
}: CalendarProps) {
  // Use theme context for dynamic theming
  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()

  // Debug theme integration
  console.log('🎨 PremiumCalendar Theme Debug:', { theme, colors })

  const [currentDate, setCurrentDate] = useState<Date>(initialDate)
  const [selectedView, setSelectedView] = useState<'month' | 'week' | 'day'>(initialView)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [hoveredTimeSlot, setHoveredTimeSlot] = useState<{ date: string; time: string } | null>(null)

  // Generate time slots based on working hours
  const timeSlots = useMemo(() =>
    generateTimeSlots(workingHours.start, workingHours.end, timeSlotDuration),
    [workingHours, timeSlotDuration]
  )

  // Get the current week dates (timezone-safe version)
  const weekDates = useMemo(() => {
    // Use a more robust method that avoids setDate() issues
    const baseDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())
    const day = baseDate.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day // Get Monday of this week

    const dates = []
    for (let i = 0; i < 7; i++) {
      // Create each date explicitly to avoid setDate() timezone issues
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + mondayOffset + i)
      dates.push(date)
    }

    // Debug logging to see what dates are being generated
    console.log('📅 Week dates generated:', dates.map(d => ({
      date: d,
      formatted: formatDateString(d),
      dayName: d.toLocaleDateString('en-US', { weekday: 'long' }),
      dayOfWeek: d.getDay()
    })))

    return dates
  }, [currentDate])

  // Get month dates for month view
  const monthDates = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)

    // Start from Monday of the week containing the first day
    const startDayOfWeek = firstDay.getDay()
    const mondayOffset = startDayOfWeek === 0 ? -6 : 1 - startDayOfWeek
    startDate.setDate(firstDay.getDate() + mondayOffset)

    const dates = []
    const current = new Date(startDate)

    // Generate 6 weeks (42 days) to fill the calendar grid
    for (let i = 0; i < 42; i++) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return dates
  }, [currentDate])

  const getCurrentPeriodText = () => {
    switch (selectedView) {
      case 'month':
        return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      case 'week':
        const firstDay = weekDates[0]
        const lastDay = weekDates[6]
        return `${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
      case 'day':
        return currentDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric'
        })
      default:
        return ''
    }
  }

  const getAppointmentsForDate = useCallback((date: Date) => {
    const dateStr = formatDateString(date)
    return appointments.filter(apt => apt.date === dateStr)
  }, [appointments])

  const getAppointmentStyle = (status: string, barberId?: number) => {
    const barber = barbers.find(b => b.id === barberId)
    const baseClasses = 'appointment-block transition-all duration-200 hover:scale-105 hover:shadow-lg'

    switch (status) {
      case 'confirmed':
        return `${baseClasses} bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-500/25`
      case 'completed':
        return `${baseClasses} bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-lg shadow-emerald-500/25`
      case 'pending':
        return `${baseClasses} bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25`
      case 'cancelled':
        return `${baseClasses} bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25`
      case 'no_show':
        return `${baseClasses} bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-lg shadow-gray-500/25`
      default:
        return `${baseClasses} bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-lg shadow-violet-500/25`
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      confirmed: 'bg-violet-100 text-violet-800 border border-violet-200',
      completed: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      pending: 'bg-amber-100 text-amber-800 border border-amber-200',
      cancelled: 'bg-red-100 text-red-800 border border-red-200',
      no_show: 'bg-gray-100 text-gray-800 border border-gray-200'
    }
    return badges[status as keyof typeof badges] || badges.confirmed
  }

  const navigatePeriod = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)

    switch (selectedView) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
        break
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
        break
      case 'day':
        newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1))
        break
    }

    setCurrentDate(newDate)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth()
  }

  const handleTimeSlotClick = (date: Date, time: string) => {
    const dateStr = formatDateString(date)
    onTimeSlotClick?.(dateStr, time)
    onCreateAppointment?.(dateStr, time)
  }

  const handleTimeSlotHover = (date: Date, time: string, isHovering: boolean) => {
    if (isHovering) {
      setHoveredTimeSlot({ date: formatDateString(date), time })
    } else {
      setHoveredTimeSlot(null)
    }
  }

  // Month View Component
  const MonthView = () => (
    <div className="grid grid-cols-7 gap-0 border rounded-xl overflow-hidden backdrop-blur-sm transition-colors duration-200" style={{
      borderColor: colors.border,
      backgroundColor: colors.cardBackground
    }}>
      {/* Day Headers */}
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
        <div key={day} className="p-4 text-center border-b transition-colors duration-200" style={{
          backgroundColor: theme === 'light' || theme === 'soft-light' ? '#f9fafb' : '#374151',
          borderColor: colors.border
        }}>
          <div className="text-sm font-semibold" style={{ color: colors.textSecondary }}>{day}</div>
        </div>
      ))}

      {/* Month Days */}
      {monthDates.map((date, index) => {
        const dayAppointments = getAppointmentsForDate(date)
        const isCurrentMonthDate = isCurrentMonth(date)
        const isTodayDate = isToday(date)

        return (
          <div
            key={index}
            className="min-h-[120px] p-2 border-b border-r last:border-r-0 transition-colors cursor-pointer"
            style={{
              borderColor: colors.border,
              backgroundColor: isTodayDate
                ? (theme === 'soft-light' ? '#7c9885' + '20' : theme === 'charcoal' ? '#4b5563' + '30' : '#8b5cf6' + '20')
                : !isCurrentMonthDate
                  ? (theme === 'light' || theme === 'soft-light' ? '#f9fafb' : colors.background)
                  : colors.cardBackground,
              color: !isCurrentMonthDate ? colors.textSecondary + '80' : colors.textPrimary
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#f3f4f6' : '#374151'
            }}
            onMouseLeave={(e) => {
              const bgColor = isTodayDate
                ? (theme === 'soft-light' ? '#7c9885' + '20' : theme === 'charcoal' ? '#4b5563' + '30' : '#8b5cf6' + '20')
                : !isCurrentMonthDate
                  ? (theme === 'light' || theme === 'soft-light' ? '#f9fafb' : colors.background)
                  : colors.cardBackground
              e.currentTarget.style.backgroundColor = bgColor
            }}
            data-time-slot="true"
            data-date={formatDateString(date)}
            data-time="all-day"
            onClick={() => setSelectedDate(date)}
          >
            <div className="text-sm font-medium mb-2" style={{
              color: isTodayDate
                ? (theme === 'soft-light' ? '#7c9885' : theme === 'charcoal' ? '#9ca3af' : '#8b5cf6')
                : isCurrentMonthDate
                  ? colors.textPrimary
                  : colors.textSecondary
            }}>
              {date.getDate()}
              {isTodayDate && (
                <div className="w-2 h-2 rounded-full mt-1" style={{
                  backgroundColor: theme === 'soft-light' ? '#7c9885' : theme === 'charcoal' ? '#9ca3af' : '#8b5cf6'
                }}></div>
              )}
            </div>

            <div className="space-y-1">
              {dayAppointments.slice(0, 3).map((appointment) => (
                <div
                  key={appointment.id}
                  className={`text-xs p-1 rounded cursor-pointer hover:scale-105 transition-transform ${getAppointmentStyle(appointment.status)}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    // Only trigger click if not dragging
                    if (!(appointment as any).__dragProps) {
                      onAppointmentClick?.(appointment)
                    }
                  }}
                  {...((appointment as any).__dragProps || {})}
                  draggable={!!(appointment as any).__dragProps}
                >
                  <div className="font-medium truncate">{appointment.service}</div>
                  <div className="opacity-90 truncate">{appointment.client}</div>
                  <div className="opacity-75">{appointment.startTime}</div>
                </div>
              ))}

              {dayAppointments.length > 3 && (
                <div className="text-xs text-gray-400 font-medium">
                  +{dayAppointments.length - 3} more
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  // Week/Day View Component
  const WeekDayView = () => {
    const displayDates = selectedView === 'week' ? weekDates : [currentDate]

    return (
      <div className="border rounded-xl overflow-hidden backdrop-blur-sm transition-colors duration-200" style={{
        borderColor: colors.border,
        backgroundColor: colors.cardBackground
      }}>
        {/* Day Headers */}
        <div className={`grid ${selectedView === 'week' ? 'grid-cols-8' : 'grid-cols-2'} border-b transition-colors duration-200`} style={{
          borderColor: colors.border,
          backgroundColor: theme === 'light' || theme === 'soft-light' ? '#f9fafb' : '#374151'
        }}>
          <div className="p-4 text-sm font-semibold border-r transition-colors duration-200" style={{
            color: colors.textSecondary,
            borderColor: colors.border
          }}>
            Time
          </div>
          {displayDates.map((date, index) => (
            <div
              key={index}
              className="p-4 text-center border-r last:border-r-0 transition-colors duration-200"
              style={{
                borderColor: colors.border,
                backgroundColor: isToday(date)
                  ? (theme === 'soft-light' ? '#7c9885' + '20' : theme === 'charcoal' ? '#4b5563' + '30' : '#8b5cf6' + '20')
                  : 'transparent'
              }}
            >
              <div className="text-sm font-semibold" style={{ color: colors.textPrimary }}>
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className="text-lg font-bold mt-1" style={{
                color: isToday(date)
                  ? (theme === 'soft-light' ? '#7c9885' : theme === 'charcoal' ? '#9ca3af' : '#8b5cf6')
                  : colors.textPrimary
              }}>
                {date.getDate()}
              </div>
              {isToday(date) && (
                <div className="w-2 h-2 rounded-full mx-auto mt-1" style={{
                  backgroundColor: theme === 'soft-light' ? '#7c9885' : theme === 'charcoal' ? '#9ca3af' : '#8b5cf6'
                }}></div>
              )}
            </div>
          ))}
        </div>

        {/* Time Slots and Appointments */}
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          {timeSlots.map((time) => (
            <div key={time} className={`grid ${selectedView === 'week' ? 'grid-cols-8' : 'grid-cols-2'} border-b transition-colors`} style={{
              borderColor: colors.border + '80'
            }}>
              {/* Time Column */}
              <div className="p-3 text-sm font-medium border-r flex items-center transition-colors duration-200" style={{
                color: colors.textSecondary,
                borderColor: colors.border,
                backgroundColor: theme === 'light' || theme === 'soft-light' ? '#f9fafb' : '#374151'
              }}>
                {time}
              </div>

              {/* Day Columns */}
              {displayDates.map((date, dateIndex) => {
                const dayAppointments = getAppointmentsForDate(date)
                const appointmentForTime = dayAppointments.find(apt => apt.startTime === time)
                const dateStr = formatDateString(date)
                const isHovered = hoveredTimeSlot?.date === dateStr && hoveredTimeSlot?.time === time

                return (
                  <div
                    key={dateIndex}
                    className="relative p-2 border-r last:border-r-0 min-h-[60px] cursor-pointer transition-all duration-200"
                    style={{
                      borderColor: colors.border,
                      backgroundColor: isHovered
                        ? (theme === 'soft-light' ? '#7c9885' + '20' : theme === 'charcoal' ? '#4b5563' + '30' : '#8b5cf6' + '20')
                        : 'transparent'
                    }}
                    onMouseEnter={() => {
                      setHoveredTimeSlot({ date: dateStr, time })
                    }}
                    onMouseLeave={() => {
                      setHoveredTimeSlot(null)
                    }}
                    data-time-slot="true"
                    data-date={dateStr}
                    data-time={time}
                    onClick={() => handleTimeSlotClick(date, time)}
                    onMouseEnter={() => handleTimeSlotHover(date, time, true)}
                    onMouseLeave={() => handleTimeSlotHover(date, time, false)}
                  >
                    {/* Add appointment hint on hover */}
                    {isHovered && !appointmentForTime && (
                      <div className="absolute inset-0 flex items-center justify-center bg-violet-900/20 border border-violet-500 rounded-lg">
                        <PlusIcon className="h-6 w-6 text-violet-400" />
                      </div>
                    )}

                    {appointmentForTime && (
                      <div
                        className={`${getAppointmentStyle(appointmentForTime.status, appointmentForTime.barberId)} p-3 rounded-lg h-full`}
                        onClick={(e) => {
                          e.stopPropagation()
                          // Only trigger click if not dragging
                          if (!(appointmentForTime as any).__dragProps) {
                            onAppointmentClick?.(appointmentForTime)
                          }
                        }}
                        {...((appointmentForTime as any).__dragProps || {})}
                        draggable={!!(appointmentForTime as any).__dragProps}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-xs font-bold truncate">
                            {appointmentForTime.service}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBadge(appointmentForTime.status)}`}>
                            {appointmentForTime.status}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center space-x-1">
                            <UserIcon className="h-3 w-3 opacity-80" />
                            <span className="text-xs truncate font-medium">{appointmentForTime.client}</span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-3 w-3 opacity-80" />
                            <span className="text-xs">
                              {appointmentForTime.startTime} - {appointmentForTime.endTime}
                            </span>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1">
                              <CurrencyDollarIcon className="h-3 w-3 opacity-80" />
                              <span className="text-xs font-semibold">${appointmentForTime.price}</span>
                            </div>
                            <span className="text-xs opacity-80 truncate">
                              {appointmentForTime.barber}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 rounded-xl transition-colors duration-300" style={{
      backgroundColor: colors.cardBackground,
      color: colors.textPrimary,
      boxShadow: colors.shadow
    }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-700 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
              Premium Calendar
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigatePeriod('prev')}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
              style={{
                color: colors.textSecondary,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.textPrimary
                e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#f3f4f6' : '#374151'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.textSecondary
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <span className="text-lg font-semibold min-w-max px-4" style={{ color: colors.textPrimary }}>
              {getCurrentPeriodText()}
            </span>

            <button
              onClick={() => navigatePeriod('next')}
              className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
              style={{
                color: colors.textSecondary,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = colors.textPrimary
                e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#f3f4f6' : '#374151'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = colors.textSecondary
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="rounded-lg p-1 flex border transition-colors duration-200" style={{
            backgroundColor: theme === 'light' || theme === 'soft-light' ? '#f3f4f6' : '#374151',
            borderColor: colors.border
          }}>
            <button
              onClick={() => setSelectedView('month')}
              className="px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-2"
              style={{
                backgroundColor: selectedView === 'month'
                  ? (theme === 'soft-light' ? '#7c9885' : theme === 'charcoal' ? '#4b5563' : '#8b5cf6')
                  : 'transparent',
                color: selectedView === 'month'
                  ? '#ffffff'
                  : colors.textSecondary,
                boxShadow: selectedView === 'month' ? colors.shadow : 'none'
              }}
            >
              <Squares2X2Icon className="h-4 w-4" />
              <span>Month</span>
            </button>
            <button
              onClick={() => setSelectedView('week')}
              className="px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-2"
              style={{
                backgroundColor: selectedView === 'week'
                  ? (theme === 'soft-light' ? '#7c9885' : theme === 'charcoal' ? '#4b5563' : '#8b5cf6')
                  : 'transparent',
                color: selectedView === 'week'
                  ? '#ffffff'
                  : colors.textSecondary,
                boxShadow: selectedView === 'week' ? colors.shadow : 'none'
              }}
            >
              <ViewColumnsIcon className="h-4 w-4" />
              <span>Week</span>
            </button>
            <button
              onClick={() => setSelectedView('day')}
              className="px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center space-x-2"
              style={{
                backgroundColor: selectedView === 'day'
                  ? (theme === 'soft-light' ? '#7c9885' : theme === 'charcoal' ? '#4b5563' : '#8b5cf6')
                  : 'transparent',
                color: selectedView === 'day'
                  ? '#ffffff'
                  : colors.textSecondary,
                boxShadow: selectedView === 'day' ? colors.shadow : 'none'
              }}
            >
              <CalendarIcon className="h-4 w-4" />
              <span>Day</span>
            </button>
          </div>

          <button
            className="font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 flex items-center space-x-2"
            style={{
              backgroundColor: theme === 'soft-light' ? '#7c9885' : theme === 'charcoal' ? '#4b5563' : '#8b5cf6',
              color: '#ffffff',
              boxShadow: colors.shadow
            }}
            onClick={() => onCreateAppointment?.(formatDateString(new Date()), '09:00')}
          >
            <PlusIcon className="h-4 w-4" />
            <span>New Appointment</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {selectedView === 'month' ? <MonthView /> : <WeekDayView />}

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-violet-600 to-purple-700"></div>
          <span className="text-xs text-gray-400">Confirmed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-emerald-600 to-green-700"></div>
          <span className="text-xs text-gray-400">Completed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-amber-500 to-orange-600"></div>
          <span className="text-xs text-gray-400">Pending</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-red-600"></div>
          <span className="text-xs text-gray-400">Cancelled</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-gray-500 to-gray-600"></div>
          <span className="text-xs text-gray-400">No Show</span>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgb(31 41 55);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgb(139 92 246);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgb(124 58 237);
        }
      `}</style>
    </div>
  )
}
