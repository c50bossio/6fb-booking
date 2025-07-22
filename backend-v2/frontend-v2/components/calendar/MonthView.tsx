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
    <div className="month-view h-full flex flex-col calendar-premium-background rounded-b-xl overflow-hidden">
      {/* Enhanced Month header with premium styling */}
      <div className="month-header bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-b border-white/30 dark:border-gray-600/30">
        <div className="grid grid-cols-7 gap-px bg-gradient-to-r from-blue-100/50 to-purple-100/50 dark:from-blue-900/20 dark:to-purple-900/20">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName, index) => (
            <div 
              key={dayName} 
              className={`
                p-3 text-center font-bold text-sm bg-white/80 dark:bg-gray-800/80
                ${index === 0 || index === 6 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-700 dark:text-gray-300'}
                border-r border-white/40 dark:border-gray-600/40 last:border-r-0
                transition-colors duration-200
              `}
            >
              {dayName}
            </div>
          ))}
        </div>
      </div>
      
      {/* Premium Month grid with glassmorphism */}
      <div className="month-grid flex-1 calendar-scrollbar overflow-auto">
        <div className="grid grid-cols-7 gap-px h-full bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-900/50 dark:to-gray-800/30">
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
                  min-h-[120px] p-3 cursor-pointer calendar-smooth-transition relative
                  bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm
                  hover:bg-white/90 hover:shadow-lg hover:shadow-blue-500/10
                  dark:hover:bg-gray-700/80 border border-white/30 dark:border-gray-600/30
                  ${!isCurrentMonth 
                    ? 'text-gray-400 bg-gray-50/50 dark:bg-gray-900/50 opacity-60' 
                    : ''}
                  ${isToday 
                    ? 'bg-gradient-to-br from-blue-50/80 to-purple-50/60 dark:from-blue-900/40 dark:to-purple-900/30 ring-2 ring-blue-400/50 shadow-lg' 
                    : ''}
                  ${isSelected 
                    ? 'ring-2 ring-purple-500/60 bg-gradient-to-br from-purple-50/80 to-pink-50/60 dark:from-purple-900/40 dark:to-pink-900/30' 
                    : ''}
                `}
                onClick={() => {
                  onSelectDate(day)
                  onDayClick?.(day)
                }}
                onDoubleClick={() => onDayDoubleClick?.(day)}
              >
                {/* Enhanced Day Number */}
                <div className={`
                  text-sm font-bold mb-2 flex items-center justify-between
                  ${isToday 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-gray-700 dark:text-gray-300'}
                `}>
                  <span className={`
                    ${isToday 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white px-2 py-1 rounded-full text-xs font-extrabold shadow-md' 
                      : ''}
                  `}>
                    {format(day, 'd')}
                  </span>
                  
                  {/* Today indicator */}
                  {isToday && (
                    <div className="calendar-today-indicator w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg" />
                  )}
                </div>
                
                {/* Enhanced Appointment indicators */}
                <div className="space-y-1.5">
                  {dayAppointments.slice(0, 3).map((appointment, index) => {
                    const isDraggable = appointment.status !== 'completed' && appointment.status !== 'cancelled'
                    
                    return (
                      <div
                        key={appointment.id}
                        className={`
                          calendar-appointment calendar-smooth-transition
                          bg-gradient-to-r from-blue-500/90 to-purple-600/90 text-white
                          p-2 rounded-lg text-xs font-medium shadow-md
                          hover:shadow-lg hover:shadow-blue-500/30
                          border border-white/20
                          ${isDraggable ? 'cursor-move' : 'cursor-pointer'}
                        `}
                        style={{
                          transform: `translateY(${index * 2}px)`,
                          zIndex: 10 + index
                        }}
                        onClick={(e) => {
                          e.stopPropagation()
                          onAppointmentClick?.(appointment)
                        }}
                        onDragStart={isDraggable ? (e) => onDragStart(e, appointment) : undefined}
                        onDragEnd={onDragEnd}
                        draggable={isDraggable}
                      >
                        <div className="truncate font-semibold">
                          {appointment.client_name || 'Client'}
                        </div>
                        <div className="truncate text-xs opacity-90">
                          {format(new Date(appointment.start_time), 'h:mm a')}
                        </div>
                      </div>
                    )
                  })}
                  
                  {/* More appointments indicator */}
                  {dayAppointments.length > 3 && (
                    <div className="
                      text-xs text-gray-600 dark:text-gray-400 bg-gray-100/80 dark:bg-gray-700/80
                      px-2 py-1 rounded-md backdrop-blur-sm border border-gray-200/50 dark:border-gray-600/50
                      font-medium text-center
                    ">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
                
                {/* Subtle hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none" />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})

MonthView.displayName = 'MonthView'