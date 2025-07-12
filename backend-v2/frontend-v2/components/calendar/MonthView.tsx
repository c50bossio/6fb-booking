'use client'

import React from 'react'
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  format, 
  isSameDay, 
  isSameMonth,
  isToday 
} from 'date-fns'

interface Appointment {
  id: string
  title: string
  date: string
  startTime: string
  client?: string
  status?: 'confirmed' | 'pending' | 'cancelled'
}

interface MonthViewProps {
  currentDate: Date
  appointments?: Appointment[]
  onDateClick?: (date: Date) => void
  onAppointmentClick?: (appointment: Appointment) => void
  className?: string
}

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  appointments = [],
  onDateClick,
  onAppointmentClick,
  className = ''
}) => {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }) // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

  // Generate all calendar days
  const calendarDays = []
  let day = calendarStart
  while (day <= calendarEnd) {
    calendarDays.push(day)
    day = addDays(day, 1)
  }

  // Group days into weeks
  const weeks = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointments.filter(apt => apt.date === dateStr)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className={`month-view ${className}`}>
      {/* Week Days Header */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="space-y-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const dayAppointments = getAppointmentsForDate(day)
              const isCurrentMonth = isSameMonth(day, currentDate)
              const isSelectedDay = isSameDay(day, currentDate)
              const isTodayDate = isToday(day)

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[120px] border border-gray-200 p-2 cursor-pointer hover:bg-gray-50 ${
                    !isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'
                  } ${isSelectedDay ? 'ring-2 ring-blue-500' : ''} ${
                    isTodayDate ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => onDateClick?.(day)}
                >
                  {/* Date Number */}
                  <div className={`text-sm font-medium mb-1 ${
                    isTodayDate ? 'text-blue-600' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                  }`}>
                    {format(day, 'd')}
                  </div>

                  {/* Appointments */}
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 3).map((appointment) => (
                      <div
                        key={appointment.id}
                        className={`text-xs p-1 rounded truncate cursor-pointer ${getStatusColor(appointment.status || 'confirmed')}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          onAppointmentClick?.(appointment)
                        }}
                      >
                        <div className="font-medium truncate">
                          {appointment.startTime} {appointment.title}
                        </div>
                        {appointment.client && (
                          <div className="truncate opacity-75">{appointment.client}</div>
                        )}
                      </div>
                    ))}
                    
                    {/* Show more indicator */}
                    {dayAppointments.length > 3 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{dayAppointments.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export default MonthView