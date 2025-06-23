'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  PlusIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'
import { useTheme } from '@/contexts/ThemeContext'
import CreateAppointmentModal from './modals/CreateAppointmentModal'

interface Appointment {
  id: string
  title: string
  client: string
  barber: string
  startTime: string
  endTime: string
  service: string
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  date: string
}

interface CalendarProps {
  appointments?: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: string, time: string) => void
  onDateClick?: (date: string) => void
  view?: 'month' | 'week' | 'day'
  showCreateModal?: boolean
}

// Mock data for demonstration
const mockAppointments: Appointment[] = [
  {
    id: '1',
    title: 'Haircut & Beard Trim',
    client: 'John Smith',
    barber: 'Marcus Johnson',
    startTime: '09:00',
    endTime: '10:00',
    service: 'Premium Cut',
    price: 65,
    status: 'confirmed',
    date: '2024-06-21'
  },
  {
    id: '2',
    title: 'Fade Cut',
    client: 'David Rodriguez',
    barber: 'Marcus Johnson',
    startTime: '10:30',
    endTime: '11:30',
    service: 'Classic Fade',
    price: 45,
    status: 'pending',
    date: '2024-06-21'
  },
  {
    id: '3',
    title: 'Beard Styling',
    client: 'Michael Brown',
    barber: 'Sarah Mitchell',
    startTime: '14:00',
    endTime: '14:30',
    service: 'Beard Trim',
    price: 25,
    status: 'completed',
    date: '2024-06-21'
  },
  {
    id: '4',
    title: 'Wedding Cut',
    client: 'James Wilson',
    barber: 'Sarah Mitchell',
    startTime: '16:00',
    endTime: '17:00',
    service: 'Special Event',
    price: 85,
    status: 'confirmed',
    date: '2024-06-22'
  }
]

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
]

export default function ModernCalendar({
  appointments: propsAppointments,
  onAppointmentClick,
  onTimeSlotClick,
  onDateClick,
  view = 'month',
  showCreateModal = true
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedView, setSelectedView] = useState<'month' | 'week' | 'day'>(view)
  const [appointments, setAppointments] = useState<Appointment[]>(propsAppointments || mockAppointments)
  const [loading, setLoading] = useState(false)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedTime, setSelectedTime] = useState<string>('')
  const { theme } = useTheme()

  // Fetch calendar events from demo API
  useEffect(() => {
    if (!propsAppointments) {
      fetchCalendarEvents()
    }
  }, [currentDate, propsAppointments])

  const fetchCalendarEvents = async () => {
    setLoading(true)
    try {
      // Calculate week range
      const start = new Date(currentDate)
      const day = start.getDay()
      const diff = start.getDate() - day + (day === 0 ? -6 : 1)
      start.setDate(diff)

      const end = new Date(start)
      end.setDate(start.getDate() + 6)

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/dashboard/demo/calendar/events`,
        {
          params: {
            start_date: start.toISOString().split('T')[0],
            end_date: end.toISOString().split('T')[0]
          }
        }
      )

      if (response.data.events) {
        // Transform events to appointment format
        const transformedAppointments = response.data.events.map((event: any) => ({
          id: event.id.toString(),
          title: event.title,
          client: event.extendedProps.client,
          barber: event.extendedProps.barber,
          startTime: new Date(event.start).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          endTime: new Date(event.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          service: event.title,
          price: event.extendedProps.price,
          status: event.extendedProps.status,
          date: event.start.split('T')[0]
        }))
        setAppointments(transformedAppointments)
      }
    } catch (error) {
      console.error('Failed to fetch calendar events:', error)
      // Keep using mock data on error
    } finally {
      setLoading(false)
    }
  }

  // Get the current month dates for calendar grid
  const monthDates = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)

    // Calculate start date (may include days from previous month)
    const startDate = new Date(firstDay)
    const dayOfWeek = firstDay.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Monday = 0
    startDate.setDate(firstDay.getDate() - daysToSubtract)

    // Generate all dates for the calendar grid (6 weeks)
    const dates = []
    const currentIterDate = new Date(startDate)

    for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
      dates.push(new Date(currentIterDate))
      currentIterDate.setDate(currentIterDate.getDate() + 1)
    }

    return dates
  }, [currentDate])

  // Get the current week dates
  const weekDates = useMemo(() => {
    const start = new Date(currentDate)
    const day = start.getDay()
    const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Start from Monday
    start.setDate(diff)

    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(start)
      date.setDate(start.getDate() + i)
      dates.push(date)
    }
    return dates
  }, [currentDate])

  const getCurrentWeekRange = () => {
    const firstDay = weekDates[0]
    const lastDay = weekDates[6]
    return `${firstDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const getCurrentMonthYear = () => {
    return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return appointments.filter(apt => apt.date === dateStr)
  }

  const getAppointmentStyle = (status: string, theme?: string) => {
    const baseClasses = 'p-2 rounded-lg shadow-sm border'

    switch (status) {
      case 'confirmed':
        return `${baseClasses} ${theme === 'dark'
          ? 'bg-slate-800/50 border-slate-700 text-slate-200'
          : 'bg-slate-50 border-slate-200 text-slate-900'}`
      case 'completed':
        return `${baseClasses} ${theme === 'dark'
          ? 'bg-emerald-900/50 border-emerald-700 text-emerald-200'
          : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`
      case 'pending':
        return `${baseClasses} ${theme === 'dark'
          ? 'bg-amber-900/50 border-amber-700 text-amber-200'
          : 'bg-amber-50 border-amber-200 text-amber-900'}`
      case 'cancelled':
        return `${baseClasses} ${theme === 'dark'
          ? 'bg-red-900/50 border-red-700 text-red-200'
          : 'bg-red-50 border-red-200 text-red-900'}`
      default:
        return `${baseClasses} ${theme === 'dark'
          ? 'bg-slate-800/50 border-slate-700 text-slate-200'
          : 'bg-slate-50 border-slate-200 text-slate-900'}`
    }
  }

  const getAppointmentColorClass = (status: string, theme?: string) => {
    switch (status) {
      case 'confirmed':
        return theme === 'dark' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800'
      case 'completed':
        return theme === 'dark' ? 'bg-emerald-800 text-emerald-200' : 'bg-emerald-100 text-emerald-800'
      case 'pending':
        return theme === 'dark' ? 'bg-amber-800 text-amber-200' : 'bg-amber-100 text-amber-800'
      case 'cancelled':
        return theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-800'
      default:
        return theme === 'dark' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800'
    }
  }

  const getStatusBadge = (status: string, theme?: string) => {
    const badges = {
      confirmed: theme === 'dark' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-800',
      completed: theme === 'dark' ? 'bg-emerald-800 text-emerald-200' : 'bg-emerald-100 text-emerald-800',
      pending: theme === 'dark' ? 'bg-amber-800 text-amber-200' : 'bg-amber-100 text-amber-800',
      cancelled: theme === 'dark' ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-800'
    }
    return badges[status as keyof typeof badges] || badges.confirmed
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1))
    setCurrentDate(newDate)
  }

  const navigateToToday = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Event handlers that call parent callbacks
  const handleTimeSlotClick = (date: string, time: string) => {
    if (showCreateModal) {
      setSelectedDate(date)
      setSelectedTime(time)
      setShowAppointmentModal(true)
    }
    onTimeSlotClick?.(date, time)
  }

  const handleDateClick = (date: string) => {
    if (showCreateModal) {
      setSelectedDate(date)
      setSelectedTime('')
      setShowAppointmentModal(true)
    }
    onDateClick?.(date)
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    onAppointmentClick?.(appointment)
  }

  const handleAppointmentSuccess = (booking: any) => {
    // Refresh appointments or update state
    console.log('New appointment created:', booking)
    setShowAppointmentModal(false)
  }

  return (
    <>
      <div className={`rounded-xl shadow-sm border transition-all duration-200 ${
        theme === 'dark'
          ? 'bg-gray-900 border-gray-800 text-white'
          : 'bg-white border-gray-200 text-gray-900'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className="h-6 w-6 text-teal-600" />
              <h2 className={`text-2xl font-bold ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>Calendar</h2>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => selectedView === 'month' ? navigateMonth('prev') : navigateWeek('prev')}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>

              <span className={`text-lg font-semibold min-w-max ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {selectedView === 'month' ? getCurrentMonthYear() : getCurrentWeekRange()}
              </span>

              <button
                onClick={() => selectedView === 'month' ? navigateMonth('next') : navigateWeek('next')}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>

              <button
                onClick={navigateToToday}
                className={`ml-2 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Today
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className={`rounded-lg p-1 flex ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'
            }`}>
              <button
                onClick={() => setSelectedView('month')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 hover:scale-105 ${
                  selectedView === 'month'
                    ? theme === 'dark'
                      ? 'bg-gray-700 text-teal-400 shadow-sm'
                      : 'bg-white text-teal-600 shadow-sm'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setSelectedView('week')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 hover:scale-105 ${
                  selectedView === 'week'
                    ? theme === 'dark'
                      ? 'bg-gray-700 text-teal-400 shadow-sm'
                      : 'bg-white text-teal-600 shadow-sm'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setSelectedView('day')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 hover:scale-105 ${
                  selectedView === 'day'
                    ? theme === 'dark'
                      ? 'bg-gray-700 text-teal-400 shadow-sm'
                      : 'bg-white text-teal-600 shadow-sm'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:text-gray-200'
                      : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Day
              </button>
            </div>

            {showCreateModal && (
              <button
                onClick={() => handleTimeSlotClick('', '')}
                className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-all duration-200 shadow-sm text-sm"
              >
                <PlusIcon className="h-4 w-4" />
                <span>New Appointment</span>
              </button>
            )}
          </div>
        </div>

        {/* Calendar Content */}
        <div className="p-6">
          {selectedView === 'month' ? (
            /* Month View */
            <div className="space-y-4">
              {/* Month Grid Header */}
              <div className="grid grid-cols-7 gap-px">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                  <div
                    key={day}
                    className={`p-3 text-center text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Month Grid */}
              <div className={`grid grid-cols-7 gap-px rounded-lg overflow-hidden ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'
              }`}>
                {monthDates.map((date, index) => {
                  const dayAppointments = getAppointmentsForDate(date)
                  const isToday = new Date().toDateString() === date.toDateString()
                  const isCurrentMonthDate = isCurrentMonth(date)

                  return (
                    <div
                      key={index}
                      className={`min-h-[120px] p-2 cursor-pointer transition-all duration-200 group relative ${
                        theme === 'dark'
                          ? 'bg-gray-900 hover:bg-gray-800 hover:ring-2 hover:ring-teal-600/50'
                          : 'bg-white hover:bg-gray-50 hover:ring-2 hover:ring-teal-500/50'
                      } ${
                        isToday
                          ? theme === 'dark' ? 'ring-2 ring-teal-600' : 'ring-2 ring-teal-500'
                          : ''
                      } ${
                        !isCurrentMonthDate
                          ? theme === 'dark' ? 'opacity-50' : 'opacity-40'
                          : ''
                      }`}
                      onClick={() => handleDateClick(date.toISOString().split('T')[0])}
                    >
                      {/* Date Number */}
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-medium ${
                          isToday
                            ? 'text-white bg-teal-600 w-6 h-6 rounded-full flex items-center justify-center'
                            : isCurrentMonthDate
                              ? theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                              : theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          {date.getDate()}
                        </span>
                        {dayAppointments.length > 0 ? (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            theme === 'dark' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {dayAppointments.length}
                          </span>
                        ) : (
                          <div className={`opacity-0 group-hover:opacity-100 transition-opacity duration-200 ${
                            theme === 'dark' ? 'text-teal-400' : 'text-teal-600'
                          }`}>
                            <PlusIcon className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      {/* Appointments */}
                      <div className="space-y-1 relative">
                        {dayAppointments.length === 0 && (
                          <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            <span className="text-xs">Click to add</span>
                          </div>
                        )}
                        {dayAppointments.slice(0, 3).map((appointment, aptIndex) => (
                          <div
                            key={aptIndex}
                            className={`text-xs p-1.5 rounded cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${
                              getAppointmentColorClass(appointment.status, theme)
                            }`}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleAppointmentClick(appointment)
                            }}
                          >
                            <div className="font-medium truncate">
                              {appointment.startTime} {appointment.service}
                            </div>
                            <div className="truncate opacity-90">
                              {appointment.client}
                            </div>
                          </div>
                        ))}
                        {dayAppointments.length > 3 && (
                          <div className={`text-xs px-1.5 py-1 rounded text-center cursor-pointer transition-all duration-200 ${
                            theme === 'dark'
                              ? 'text-gray-400 bg-gray-800 hover:bg-gray-700 hover:text-gray-200'
                              : 'text-gray-600 bg-gray-100 hover:bg-gray-200 hover:text-gray-800'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDateClick(date.toISOString().split('T')[0])
                          }}
                          >
                            +{dayAppointments.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Week/Day View */
            <div className={`border rounded-xl overflow-hidden ${
              theme === 'dark' ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
            }`}>
              {/* Day Headers */}
              <div className={`grid grid-cols-8 border-b ${
                theme === 'dark' ? 'border-gray-800 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className={`p-4 text-sm font-medium border-r ${
                  theme === 'dark' ? 'text-gray-400 border-gray-800' : 'text-gray-600 border-gray-200'
                }`}>
                  Time
                </div>
                {weekDates.map((date, index) => (
                  <div
                    key={index}
                    className={`p-4 text-center border-r last:border-r-0 cursor-pointer transition-all duration-200 ${
                      theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
                    } ${
                      isToday(date)
                        ? theme === 'dark' ? 'bg-teal-900/20' : 'bg-teal-50'
                        : ''
                    } ${
                      theme === 'dark'
                        ? 'hover:bg-gray-800'
                        : 'hover:bg-gray-100'
                    }`}
                    onClick={() => handleDateClick(date.toISOString().split('T')[0])}
                  >
                    <div className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                    }`}>
                      {date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className={`text-lg font-bold mt-1 ${
                      isToday(date) ? 'text-teal-600' : theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {date.getDate()}
                    </div>
                    {isToday(date) && (
                      <div className="w-2 h-2 bg-teal-500 rounded-full mx-auto mt-1"></div>
                    )}
                  </div>
                ))}
              </div>

              {/* Time Slots and Appointments */}
              <div className="max-h-96 overflow-y-auto">
                {timeSlots.map((time) => (
                  <div key={time} className={`grid grid-cols-8 border-b transition-all duration-200 ${
                    theme === 'dark'
                      ? 'border-gray-800'
                      : 'border-gray-100'
                  }`}>
                    {/* Time Column */}
                    <div className={`p-3 text-sm font-medium border-r ${
                      theme === 'dark'
                        ? 'text-gray-400 border-gray-800 bg-gray-800/50'
                        : 'text-gray-600 border-gray-200 bg-gray-50/50'
                    }`}>
                      {time}
                    </div>

                    {/* Day Columns */}
                    {weekDates.map((date, dateIndex) => {
                      const dayAppointments = getAppointmentsForDate(date)
                      const appointmentForTime = dayAppointments.find(apt => apt.startTime === time)

                      return (
                        <div
                          key={dateIndex}
                          className={`relative p-2 border-r last:border-r-0 min-h-[60px] cursor-pointer transition-all duration-200 group ${
                            theme === 'dark'
                              ? 'border-gray-800 hover:bg-teal-900/20 hover:border-teal-600/50'
                              : 'border-gray-200 hover:bg-teal-50 hover:border-teal-500/50'
                          }`}
                          onClick={() => handleTimeSlotClick(date.toISOString().split('T')[0], time)}
                        >
                          {/* Empty slot indicator */}
                          {!appointmentForTime && (
                            <div className={`absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${
                              theme === 'dark' ? 'text-teal-400' : 'text-teal-600'
                            }`}>
                              <div className="flex flex-col items-center">
                                <PlusIcon className="h-5 w-5 mb-1" />
                                <span className="text-xs font-medium">Add</span>
                              </div>
                            </div>
                          )}

                          {appointmentForTime && (
                            <div
                              className={`${getAppointmentStyle(appointmentForTime.status, theme)} cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg hover:z-10`}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAppointmentClick(appointmentForTime)
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold truncate">
                                  {appointmentForTime.service}
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(appointmentForTime.status, theme)}`}>
                                  {appointmentForTime.status}
                                </span>
                              </div>

                              <div className="space-y-1">
                                <div className="flex items-center space-x-1">
                                  <UserIcon className="h-3 w-3 opacity-80" />
                                  <span className="text-xs truncate">{appointmentForTime.client}</span>
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
                                    <span className="text-xs font-medium">${appointmentForTime.price}</span>
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
          )}
        </div>

        {/* Legend */}
        <div className={`px-6 py-4 border-t flex items-center justify-center space-x-6 ${
          theme === 'dark' ? 'border-gray-800' : 'border-gray-200'
        }`}>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-slate-600"></div>
            <span className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Confirmed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-emerald-600"></div>
            <span className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-amber-600"></div>
            <span className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Pending</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-red-600"></div>
            <span className={`text-xs ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            }`}>Cancelled</span>
          </div>
        </div>
      </div>

      {/* Appointment Creation Modal */}
      <CreateAppointmentModal
        isOpen={showAppointmentModal}
        onClose={() => setShowAppointmentModal(false)}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        onSuccess={handleAppointmentSuccess}
      />
    </>
  )
}
