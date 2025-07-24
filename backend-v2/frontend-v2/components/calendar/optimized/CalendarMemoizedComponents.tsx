'use client'

import React, { memo, useMemo, useCallback } from 'react'
import { format, isSameDay } from 'date-fns'
import type { BookingResponse } from '@/lib/api'

// Memoized appointment card to prevent unnecessary re-renders
export const MemoizedAppointmentCard = memo<{
  appointment: BookingResponse
  onClick: (appointment: BookingResponse) => void
  onUpdate: (id: number, newTime: string) => void
  className?: string
}>(function AppointmentCard({ appointment, onClick, onUpdate, className = '' }) {
  
  const handleClick = useCallback(() => {
    onClick(appointment)
  }, [appointment, onClick])
  
  const formattedTime = useMemo(() => {
    try {
      return format(new Date(appointment.start_time), 'h:mm a')
    } catch {
      return 'Invalid time'
    }
  }, [appointment.start_time])
  
  const statusColor = useMemo(() => {
    switch (appointment.status) {
      case 'confirmed':
        return 'bg-green-100 border-green-300 text-green-800'
      case 'pending':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'cancelled':
        return 'bg-red-100 border-red-300 text-red-800'
      case 'completed':
        return 'bg-blue-100 border-blue-300 text-blue-800'
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }, [appointment.status])
  
  return (
    <div
      className={`p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${statusColor} ${className}`}
      onClick={handleClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('appointment-id', appointment.id.toString())
      }}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="font-medium text-sm">{appointment.service_name || 'Service'}</div>
        <div className="text-xs font-mono">{formattedTime}</div>
      </div>
      <div className="text-sm text-gray-600">
        {appointment.client_name || 'Client'}
      </div>
      {appointment.barber_name && (
        <div className="text-xs text-gray-500 mt-1">
          with {appointment.barber_name}
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.appointment.id === nextProps.appointment.id &&
    prevProps.appointment.start_time === nextProps.appointment.start_time &&
    prevProps.appointment.status === nextProps.appointment.status &&
    prevProps.appointment.service_name === nextProps.appointment.service_name &&
    prevProps.appointment.client_name === nextProps.appointment.client_name &&
    prevProps.className === nextProps.className
  )
})

// Memoized time slot component for calendar grid
export const MemoizedTimeSlot = memo<{
  time: { hour: number; minute: number }
  date: Date
  appointments: BookingResponse[]
  onClick: (date: Date) => void
  onAppointmentClick: (appointment: BookingResponse) => void
  className?: string
}>(function TimeSlot({ time, date, appointments, onClick, onAppointmentClick, className = '' }) {
  
  const slotDateTime = useMemo(() => {
    const slotDate = new Date(date)
    slotDate.setHours(time.hour, time.minute, 0, 0)
    return slotDate
  }, [date, time.hour, time.minute])
  
  const slotAppointments = useMemo(() => {
    return appointments.filter(apt => {
      try {
        const aptDate = new Date(apt.start_time)
        return (
          isSameDay(aptDate, date) &&
          aptDate.getHours() === time.hour &&
          aptDate.getMinutes() === time.minute
        )
      } catch {
        return false
      }
    })
  }, [appointments, date, time.hour, time.minute])
  
  const handleClick = useCallback(() => {
    onClick(slotDateTime)
  }, [slotDateTime, onClick])
  
  const timeLabel = useMemo(() => {
    return format(slotDateTime, 'h:mm a')
  }, [slotDateTime])
  
  const isBusinessHour = useMemo(() => {
    return time.hour >= 8 && time.hour < 18
  }, [time.hour])
  
  return (
    <div
      className={`
        relative border border-gray-200 min-h-[60px] cursor-pointer
        hover:bg-blue-50 transition-colors duration-150
        ${!isBusinessHour ? 'bg-gray-50' : 'bg-white'}
        ${className}
      `}
      onClick={handleClick}
      onDrop={(e) => {
        e.preventDefault()
        const appointmentId = e.dataTransfer.getData('appointment-id')
        if (appointmentId) {
          // Handle appointment drop
          console.log(`Drop appointment ${appointmentId} at ${timeLabel}`)
        }
      }}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* Time label */}
      <div className="absolute top-1 left-1 text-xs text-gray-500 font-mono">
        {time.minute === 0 ? format(slotDateTime, 'h a') : ''}
      </div>
      
      {/* Appointments in this slot */}
      <div className="pt-5 px-1 space-y-1">
        {slotAppointments.map(appointment => (
          <MemoizedAppointmentCard
            key={appointment.id}
            appointment={appointment}
            onClick={onAppointmentClick}
            onUpdate={() => {}}
            className="text-xs"
          />
        ))}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.time.hour === nextProps.time.hour &&
    prevProps.time.minute === nextProps.time.minute &&
    prevProps.date.getTime() === nextProps.date.getTime() &&
    prevProps.appointments.length === nextProps.appointments.length &&
    prevProps.appointments.every((apt, index) => 
      apt.id === nextProps.appointments[index]?.id &&
      apt.start_time === nextProps.appointments[index]?.start_time
    )
  )
})

// Memoized day header component
export const MemoizedDayHeader = memo<{
  date: Date
  appointments: BookingResponse[]
  isSelected: boolean
  isToday: boolean
  onClick: (date: Date) => void
  className?: string
}>(function DayHeader({ date, appointments, isSelected, isToday, onClick, className = '' }) {
  
  const dayNumber = useMemo(() => date.getDate(), [date])
  const dayName = useMemo(() => format(date, 'EEE'), [date])
  
  const appointmentCount = useMemo(() => {
    return appointments.filter(apt => {
      try {
        return isSameDay(new Date(apt.start_time), date)
      } catch {
        return false
      }
    }).length
  }, [appointments, date])
  
  const handleClick = useCallback(() => {
    onClick(date)
  }, [date, onClick])
  
  return (
    <div
      className={`
        text-center p-2 cursor-pointer rounded-lg transition-all duration-200
        ${isSelected ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}
        ${isToday ? 'ring-2 ring-blue-300' : ''}
        ${className}
      `}
      onClick={handleClick}
    >
      <div className="text-sm font-medium">{dayName}</div>
      <div className={`text-2xl font-bold ${isToday ? 'text-blue-600' : ''}`}>
        {dayNumber}
      </div>
      {appointmentCount > 0 && (
        <div className="text-xs mt-1">
          <span className={`
            px-2 py-1 rounded-full text-xs font-medium
            ${isSelected ? 'bg-blue-300 text-blue-800' : 'bg-blue-100 text-blue-600'}
          `}>
            {appointmentCount}
          </span>
        </div>
      )}
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.date.getTime() === nextProps.date.getTime() &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isToday === nextProps.isToday &&
    prevProps.appointments.length === nextProps.appointments.length
  )
})

// Memoized barber filter component
export const MemoizedBarberFilter = memo<{
  barbers: Array<{ id: number; name?: string; first_name?: string; last_name?: string }>
  selectedBarberId: number | 'all'
  onSelect: (barberId: number | 'all') => void
  className?: string
}>(function BarberFilter({ barbers, selectedBarberId, onSelect, className = '' }) {
  
  const sortedBarbers = useMemo(() => {
    return barbers.sort((a, b) => {
      const nameA = a.name || `${a.first_name || ''} ${a.last_name || ''}`.trim()
      const nameB = b.name || `${b.first_name || ''} ${b.last_name || ''}`.trim()
      return nameA.localeCompare(nameB)
    })
  }, [barbers])
  
  const handleSelect = useCallback((barberId: number | 'all') => {
    onSelect(barberId)
  }, [onSelect])
  
  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      <button
        className={`
          px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
          ${selectedBarberId === 'all' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }
        `}
        onClick={() => handleSelect('all')}
      >
        All Barbers
      </button>
      
      {sortedBarbers.map(barber => {
        const barberName = barber.name || `${barber.first_name || ''} ${barber.last_name || ''}`.trim()
        
        return (
          <button
            key={barber.id}
            className={`
              px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200
              ${selectedBarberId === barber.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
            onClick={() => handleSelect(barber.id)}
          >
            {barberName || `Barber ${barber.id}`}
          </button>
        )
      })}
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.selectedBarberId === nextProps.selectedBarberId &&
    prevProps.barbers.length === nextProps.barbers.length &&
    prevProps.barbers.every((barber, index) => 
      barber.id === nextProps.barbers[index]?.id
    )
  )
})

// Memoized calendar stats component
export const MemoizedCalendarStats = memo<{
  appointments: BookingResponse[]
  selectedDate: Date
  className?: string
}>(function CalendarStats({ appointments, selectedDate, className = '' }) {
  
  const dayStats = useMemo(() => {
    const dayAppointments = appointments.filter(apt => {
      try {
        return isSameDay(new Date(apt.start_time), selectedDate)
      } catch {
        return false
      }
    })
    
    const totalAppointments = dayAppointments.length
    const completedAppointments = dayAppointments.filter(apt => apt.status === 'completed').length
    const totalRevenue = dayAppointments
      .filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + (apt.price || 0), 0)
    
    return {
      totalAppointments,
      completedAppointments,
      totalRevenue,
      averagePrice: completedAppointments > 0 ? totalRevenue / completedAppointments : 0
    }
  }, [appointments, selectedDate])
  
  const formattedDate = useMemo(() => {
    return format(selectedDate, 'EEEE, MMMM d, yyyy')
  }, [selectedDate])
  
  return (
    <div className={`bg-white rounded-lg shadow p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-3">{formattedDate}</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{dayStats.totalAppointments}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{dayStats.completedAppointments}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            ${dayStats.totalRevenue.toFixed(0)}
          </div>
          <div className="text-sm text-gray-500">Revenue</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            ${dayStats.averagePrice.toFixed(0)}
          </div>
          <div className="text-sm text-gray-500">Avg Price</div>
        </div>
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return (
    prevProps.selectedDate.getTime() === nextProps.selectedDate.getTime() &&
    prevProps.appointments.length === nextProps.appointments.length &&
    prevProps.appointments.every((apt, index) => 
      apt.id === nextProps.appointments[index]?.id &&
      apt.status === nextProps.appointments[index]?.status &&
      apt.price === nextProps.appointments[index]?.price
    )
  )
})

// Higher-order component for memoizing calendar views
export function withCalendarMemoization<T extends object>(
  Component: React.ComponentType<T>,
  compareProps?: (prevProps: T, nextProps: T) => boolean
) {
  const MemoizedComponent = memo(Component, compareProps)
  MemoizedComponent.displayName = `Memoized(${Component.displayName || Component.name})`
  return MemoizedComponent
}