'use client'

import React from 'react'
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'

interface Appointment {
  id: string
  title: string
  startTime: string
  endTime: string
  date: string
  client?: string
  status?: 'confirmed' | 'pending' | 'cancelled'
}

interface WeekViewProps {
  currentDate: Date
  appointments?: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  onDateClick?: (date: Date) => void
  onTimeSlotClick?: (date: Date, time: string) => void
  className?: string
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  appointments = [],
  onAppointmentClick,
  onDateClick,
  onTimeSlotClick,
  className = ''
}) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }) // Sunday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  
  // Generate time slots from 8 AM to 8 PM
  const timeSlots = []
  for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`)
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`)
  }

  const getAppointmentsForDateAndTime = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return appointments.filter(apt => apt.date === dateStr && apt.startTime === time)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 border-green-300 text-green-800'
      case 'pending': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'cancelled': return 'bg-red-100 border-red-300 text-red-800'
      default: return 'bg-blue-100 border-blue-300 text-blue-800'
    }
  }

  const isToday = (date: Date) => isSameDay(date, new Date())

  return (
    <div className={`week-view ${className}`}>
      {/* Week Header */}
      <div className="grid grid-cols-8 gap-1 mb-4">
        <div className="text-sm font-medium text-gray-500 p-2">Time</div>
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`text-center p-2 cursor-pointer rounded-md hover:bg-gray-50 ${
              isToday(day) ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
            }`}
            onClick={() => onDateClick?.(day)}
          >
            <div className="text-xs text-gray-500 uppercase">
              {format(day, 'EEE')}
            </div>
            <div className={`text-lg ${isToday(day) ? 'font-bold' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Week Grid */}
      <div className="space-y-1">
        {timeSlots.map((time) => (
          <div key={time} className="grid grid-cols-8 gap-1">
            {/* Time Label */}
            <div className="text-xs text-gray-500 font-medium p-2 text-right">
              {time}
            </div>
            
            {/* Day Columns */}
            {weekDays.map((day) => {
              const dayAppointments = getAppointmentsForDateAndTime(day, time)
              
              return (
                <div
                  key={`${day.toISOString()}-${time}`}
                  className="min-h-[40px] border border-gray-100 hover:bg-gray-50 cursor-pointer p-1"
                  onClick={() => {
                    if (dayAppointments.length > 0) {
                      onAppointmentClick?.(dayAppointments[0])
                    } else {
                      onTimeSlotClick?.(day, time)
                    }
                  }}
                >
                  {dayAppointments.length > 0 ? (
                    <div className="space-y-1">
                      {dayAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className={`text-xs p-1 rounded border ${getStatusColor(appointment.status || 'confirmed')}`}
                        >
                          <div className="font-medium truncate">{appointment.title}</div>
                          {appointment.client && (
                            <div className="truncate opacity-75">{appointment.client}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full w-full" />
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

export default WeekView