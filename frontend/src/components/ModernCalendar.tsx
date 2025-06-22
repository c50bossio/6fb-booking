'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'

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
  view?: 'week' | 'day'
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
  view = 'week'
}: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedView, setSelectedView] = useState<'week' | 'day'>(view)
  const [appointments, setAppointments] = useState<Appointment[]>(propsAppointments || mockAppointments)
  const [loading, setLoading] = useState(false)

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
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/dashboard/demo/calendar/events`,
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

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return appointments.filter(apt => apt.date === dateStr)
  }

  const getAppointmentStyle = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'appointment-block primary'
      case 'completed':
        return 'appointment-block success'
      case 'pending':
        return 'appointment-block warning'
      case 'cancelled':
        return 'appointment-block danger'
      default:
        return 'appointment-block primary'
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      confirmed: 'bg-violet-100 text-violet-800',
      completed: 'bg-emerald-100 text-emerald-800',
      pending: 'bg-amber-100 text-amber-800',
      cancelled: 'bg-red-100 text-red-800'
    }
    return badges[status as keyof typeof badges] || badges.confirmed
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7))
    setCurrentDate(newDate)
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Event handlers that call parent callbacks
  const handleTimeSlotClick = (date: string, time: string) => {
    onTimeSlotClick?.(date, time)
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    onAppointmentClick?.(appointment)
  }

  return (
    <div className="premium-card-modern p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <CalendarDaysIcon className="h-6 w-6 text-violet-600" />
            <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>

            <span className="text-lg font-semibold text-gray-900 min-w-max">
              {getCurrentWeekRange()}
            </span>

            <button
              onClick={() => navigateWeek('next')}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* View Toggle */}
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setSelectedView('week')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedView === 'week'
                  ? 'bg-white text-violet-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setSelectedView('day')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                selectedView === 'day'
                  ? 'bg-white text-violet-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Day
            </button>
          </div>

          <button
            onClick={() => handleTimeSlotClick('', '')}
            className="premium-button text-sm"
          >
            New Appointment
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
        {/* Day Headers */}
        <div className="grid grid-cols-8 border-b border-gray-200 bg-gray-50">
          <div className="p-4 text-sm font-medium text-gray-600 border-r border-gray-200">
            Time
          </div>
          {weekDates.map((date, index) => (
            <div
              key={index}
              className={`p-4 text-center border-r border-gray-200 last:border-r-0 ${
                isToday(date) ? 'bg-violet-50' : ''
              }`}
            >
              <div className="text-sm font-medium text-gray-900">
                {date.toLocaleDateString('en-US', { weekday: 'short' })}
              </div>
              <div className={`text-lg font-bold mt-1 ${
                isToday(date) ? 'text-violet-600' : 'text-gray-700'
              }`}>
                {date.getDate()}
              </div>
              {isToday(date) && (
                <div className="w-2 h-2 bg-violet-500 rounded-full mx-auto mt-1"></div>
              )}
            </div>
          ))}
        </div>

        {/* Time Slots and Appointments */}
        <div className="max-h-96 overflow-y-auto">
          {timeSlots.map((time) => (
            <div key={time} className="grid grid-cols-8 border-b border-gray-100 hover:bg-gray-50 transition-colors">
              {/* Time Column */}
              <div className="p-3 text-sm font-medium text-gray-600 border-r border-gray-200 bg-gray-50/50">
                {time}
              </div>

              {/* Day Columns */}
              {weekDates.map((date, dateIndex) => {
                const dayAppointments = getAppointmentsForDate(date)
                const appointmentForTime = dayAppointments.find(apt => apt.startTime === time)

                return (
                  <div
                    key={dateIndex}
                    className="relative p-2 border-r border-gray-200 last:border-r-0 min-h-[60px] time-slot available"
                    onClick={() => handleTimeSlotClick(date.toISOString().split('T')[0], time)}
                  >
                    {appointmentForTime && (
                      <div
                        className={getAppointmentStyle(appointmentForTime.status)}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleAppointmentClick(appointmentForTime)
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold truncate">
                            {appointmentForTime.service}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(appointmentForTime.status)}`}>
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

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center space-x-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-violet-500 to-purple-600"></div>
          <span className="text-xs text-gray-600">Confirmed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-emerald-500 to-green-600"></div>
          <span className="text-xs text-gray-600">Completed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-amber-500 to-yellow-600"></div>
          <span className="text-xs text-gray-600">Pending</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded bg-gradient-to-r from-red-500 to-red-600"></div>
          <span className="text-xs text-gray-600">Cancelled</span>
        </div>
      </div>

    </div>
  )
}
