'use client'

import React from 'react'

interface Appointment {
  id: string
  title: string
  startTime: string
  endTime: string
  client?: string
  status?: 'confirmed' | 'pending' | 'cancelled'
}

interface DayViewProps {
  date: Date
  appointments?: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (time: string) => void
  className?: string
}

export const DayView: React.FC<DayViewProps> = ({
  date,
  appointments = [],
  onAppointmentClick,
  onTimeSlotClick,
  className = ''
}) => {
  // Generate time slots from 8 AM to 8 PM
  const timeSlots = []
  for (let hour = 8; hour <= 20; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`)
    timeSlots.push(`${hour.toString().padStart(2, '0')}:30`)
  }

  const getAppointmentAtTime = (time: string) => {
    return appointments.find(apt => apt.startTime === time)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 border-green-300 text-green-800'
      case 'pending': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'cancelled': return 'bg-red-100 border-red-300 text-red-800'
      default: return 'bg-blue-100 border-blue-300 text-blue-800'
    }
  }

  return (
    <div className={`day-view ${className}`}>
      <div className="text-lg font-semibold mb-4">
        {date.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>

      <div className="space-y-1">
        {timeSlots.map((time) => {
          const appointment = getAppointmentAtTime(time)
          
          return (
            <div
              key={time}
              className="flex items-center border-b border-gray-100 py-2 hover:bg-gray-50 cursor-pointer"
              onClick={() => {
                if (appointment) {
                  onAppointmentClick?.(appointment)
                } else {
                  onTimeSlotClick?.(time)
                }
              }}
            >
              <div className="w-16 text-sm text-gray-500 font-medium">
                {time}
              </div>
              
              <div className="flex-1 ml-4">
                {appointment ? (
                  <div className={`p-2 rounded-md border ${getStatusColor(appointment.status || 'confirmed')}`}>
                    <div className="font-medium">{appointment.title}</div>
                    {appointment.client && (
                      <div className="text-sm opacity-75">{appointment.client}</div>
                    )}
                    <div className="text-xs">
                      {appointment.startTime} - {appointment.endTime}
                    </div>
                  </div>
                ) : (
                  <div className="h-8 border border-dashed border-gray-200 rounded-md flex items-center justify-center text-xs text-gray-400 hover:border-gray-300">
                    Available
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default DayView