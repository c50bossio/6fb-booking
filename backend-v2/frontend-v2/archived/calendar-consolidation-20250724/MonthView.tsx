'use client'

import React from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameDay } from 'date-fns'
import { AppointmentCard } from './AppointmentCard'
import type { BookingResponse } from '@/lib/api'

interface Appointment extends BookingResponse {
  height?: number
}

interface DragState {
  draggedAppointment: Appointment | null
  isDragging: boolean
}

interface MonthViewProps {
  currentDate: Date
  appointments: Appointment[]
  selectedDate: Date | null
  onDayClick?: (date: Date) => void
  onDayDoubleClick?: (date: Date) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onDragStart: (e: React.DragEvent, appointment: Appointment) => void
  onDragEnd: () => void
  onSelectDate: (date: Date | null) => void
  getStatusColor: (status: string) => string
  dragState: DragState
}

export const MonthView = React.memo(function MonthView({
  currentDate,
  appointments,
  selectedDate,
  onDayClick,
  onDayDoubleClick,
  onAppointmentClick,
  onDragStart,
  onDragEnd,
  onSelectDate,
  getStatusColor,
  dragState
}: MonthViewProps) {
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart)
  const calendarEnd = endOfWeek(monthEnd)
  
  const calendarDays = []
  let day = calendarStart
  while (day <= calendarEnd) {
    calendarDays.push(day)
    day = addDays(day, 1)
  }
  
  return (
    <div className="month-view h-full flex flex-col">
      {/* Month header */}
      <div className="month-header border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-7 gap-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
            <div key={dayName} className="p-2 text-center font-medium text-sm border-r border-gray-200 dark:border-gray-700">
              {dayName}
            </div>
          ))}
        </div>
      </div>
      
      {/* Month grid */}
      <div className="month-grid flex-1">
        <div className="grid grid-cols-7 gap-0 h-full">
          {calendarDays.map(day => {
            const dayAppointments = appointments.filter(apt => 
              isSameDay(new Date(apt.start_time), day)
            )
            
            const isCurrentMonth = day.getMonth() === currentDate.getMonth()
            const isToday = isSameDay(day, new Date())
            const isSelected = selectedDate && isSameDay(day, selectedDate)
            
            return (
              <div 
                key={day.toISOString()}
                className={`
                  border-r border-b border-gray-200 dark:border-gray-700 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800
                  ${!isCurrentMonth ? 'text-gray-400 bg-gray-50 dark:bg-gray-900' : ''}
                  ${isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                  ${isSelected ? 'ring-2 ring-blue-500' : ''}
                `}
                onClick={() => {
                  onSelectDate(day)
                  onDayClick?.(day)
                }}
                onDoubleClick={() => onDayDoubleClick?.(day)}
              >
                <div className={`text-sm font-medium mb-1 ${isToday ? 'text-blue-600 font-bold' : ''}`}>
                  {format(day, 'd')}
                </div>
                
                {/* Appointment indicators */}
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map(appointment => {
                    const isDraggable = appointment.status !== 'completed' && appointment.status !== 'cancelled'
                    
                    return (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={appointment}
                        isDraggable={isDraggable}
                        isDragging={dragState.draggedAppointment?.id === appointment.id}
                        isSelected={false}
                        viewType="month"
                        onClick={onAppointmentClick}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        getStatusColor={getStatusColor}
                      />
                    )
                  })}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

MonthView.displayName = 'MonthView'