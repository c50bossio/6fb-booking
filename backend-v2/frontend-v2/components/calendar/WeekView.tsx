'use client'

import React, { useRef } from 'react'
import { format, startOfWeek, addDays, isSameDay } from 'date-fns'
import { AppointmentCard } from './AppointmentCard'
import type { BookingResponse } from '@/lib/api'

interface Appointment extends BookingResponse {
  height?: number
}

interface DragState {
  draggedAppointment: Appointment | null
  dragOverSlot: { day: Date; hour: number; minute: number } | null
  isDragging: boolean
  dropSuccess: { day: Date; hour: number; minute: number } | null
}

interface WeekViewProps {
  currentDate: Date
  appointments: Appointment[]
  startHour: number
  endHour: number
  slotDuration: number
  dragState: DragState
  optimisticUpdates: Map<number, { originalStartTime: string; newStartTime: string }>
  selectedAppointmentId: string | null
  onTimeSlotClick?: (date: Date) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string) => void
  onDragOver: (e: React.DragEvent, day: Date, hour: number, minute: number) => void
  onDragLeave: () => void
  onDragStart: (e: React.DragEvent, appointment: Appointment) => void
  onDragEnd: () => void
  onDrop: (e: React.DragEvent, day: Date, hour: number, minute: number) => void
  onSelectAppointment: (id: string | null) => void
  getStatusColor: (status: string) => string
}

export const WeekView = React.memo(function WeekView({
  currentDate,
  appointments,
  startHour,
  endHour,
  slotDuration,
  dragState,
  optimisticUpdates,
  selectedAppointmentId,
  onTimeSlotClick,
  onAppointmentClick,
  onAppointmentUpdate,
  onDragOver,
  onDragLeave,
  onDragStart,
  onDragEnd,
  onDrop,
  onSelectAppointment,
  getStatusColor
}: WeekViewProps) {
  const scheduleGridRef = useRef<HTMLDivElement>(null)
  
  const weekStart = startOfWeek(currentDate)
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  
  // Generate time slots
  const timeSlots: Array<{ hour: number; minute: number }> = []
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      timeSlots.push({ hour, minute })
    }
  }

  return (
    <div className="week-view h-full flex flex-col calendar-premium-background rounded-b-xl overflow-hidden">
      {/* Enhanced Week header */}
      <div className="week-header bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-b border-white/30 dark:border-gray-600/30">
        <div className="grid grid-cols-8 gap-px bg-gradient-to-r from-blue-100/50 to-purple-100/50 dark:from-blue-900/20 dark:to-purple-900/20">
          <div className="w-16 calendar-time-column bg-white/80 dark:bg-gray-800/80 flex items-center justify-center">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Time</div>
          </div>
          {weekDays.map(day => {
            const isToday = isSameDay(day, new Date())
            return (
              <div 
                key={day.toISOString()} 
                className={`
                  p-3 text-center bg-white/80 dark:bg-gray-800/80 border-r border-white/40 dark:border-gray-600/40 last:border-r-0
                  transition-all duration-200 hover:bg-white/90 dark:hover:bg-gray-700/80
                  ${isToday ? 'bg-gradient-to-b from-blue-50/90 to-purple-50/70 dark:from-blue-900/50 dark:to-purple-900/30' : ''}
                `}
              >
                <div className={`text-sm font-bold ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`
                  text-lg font-extrabold
                  ${isToday 
                    ? 'text-blue-700 dark:text-blue-300 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent' 
                    : 'text-gray-700 dark:text-gray-300'}
                `}>
                  {format(day, 'd')}
                </div>
                {isToday && (
                  <div className="mt-1 flex justify-center">
                    <div className="calendar-today-indicator w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-lg" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      
      {/* Enhanced Week grid with premium styling */}
      <div className="week-grid flex-1 overflow-auto relative calendar-scrollbar" ref={scheduleGridRef}>
        {timeSlots.map(({ hour, minute }) => (
          <div key={`${hour}-${minute}`} className="grid grid-cols-8 gap-px h-12 bg-gradient-to-r from-gray-50/30 to-gray-100/20 dark:from-gray-900/30 dark:to-gray-800/20">
            
            {/* Enhanced Time label */}
            <div className="calendar-time-column w-16 text-xs text-gray-600 dark:text-gray-400 bg-white/80 dark:bg-gray-800/80 flex items-start justify-end pr-3 pt-2 font-medium border-r border-white/40 dark:border-gray-600/40">
              {minute === 0 ? (
                <div className="text-center">
                  <div className="font-bold text-gray-700 dark:text-gray-300">
                    {format(new Date().setHours(hour, minute), 'h')}
                  </div>
                  <div className="text-xs opacity-70">
                    {format(new Date().setHours(hour, minute), 'a')}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 dark:text-gray-500 text-xs">
                  :{String(minute).padStart(2, '0')}
                </div>
              )}
            </div>
            
            {/* Enhanced Day columns */}
            {weekDays.map(day => {
              const slotDate = new Date(day)
              slotDate.setHours(hour, minute, 0, 0)
              
              const slotAppointments = appointments.filter(apt => {
                const aptTime = new Date(apt.start_time)
                return isSameDay(aptTime, day) && 
                       aptTime.getHours() === hour && 
                       aptTime.getMinutes() === minute
              })
              
              const isDragOver = dragState.dragOverSlot && 
                isSameDay(dragState.dragOverSlot.day, day) && 
                dragState.dragOverSlot.hour === hour && 
                dragState.dragOverSlot.minute === minute
              
              const isDropSuccess = dragState.dropSuccess &&
                isSameDay(dragState.dropSuccess.day, day) &&
                dragState.dropSuccess.hour === hour &&
                dragState.dropSuccess.minute === minute
              
              const isToday = isSameDay(day, new Date())
              const isAvailable = slotAppointments.length === 0
              
              return (
                <div 
                  key={day.toISOString()}
                  className={`
                    calendar-time-slot relative cursor-pointer transition-all duration-300
                    bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm
                    border-r border-white/30 dark:border-gray-600/30 last:border-r-0
                    ${isToday ? 'bg-blue-50/60 dark:bg-blue-900/20' : ''}
                    ${isDragOver
                      ? 'drop-target bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500 border-green-400 border-dashed'
                      : isDropSuccess
                      ? 'bg-green-200 dark:bg-green-800/40 ring-2 ring-green-400 animate-pulse'
                      : dragState.isDragging && isAvailable
                      ? 'slot-available hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 hover:border-dashed'
                      : isAvailable
                      ? 'slot-available hover:bg-white/90 hover:shadow-md'
                      : 'slot-booked'
                    }
                  `}
                  onClick={(e) => {
                    if (e.target === e.currentTarget && isAvailable) {
                      onTimeSlotClick?.(slotDate)
                    }
                  }}
                  onDragOver={(e) => onDragOver(e, day, hour, minute)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, day, hour, minute)}
                >
                  {/* Time slot hover effect */}
                  {isAvailable && !dragState.isDragging && (
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  )}
                  
                  {/* Appointments */}
                  {slotAppointments.map(appointment => {
                    const optimisticUpdate = optimisticUpdates.get(appointment.id)
                    const displayAppointment = optimisticUpdate ? 
                      { ...appointment, start_time: optimisticUpdate.newStartTime } : 
                      appointment
                    
                    const isDraggable = appointment.status !== 'completed' && appointment.status !== 'cancelled'
                    const isSelected = selectedAppointmentId === appointment.id.toString()
                    const isDragging = dragState.draggedAppointment?.id === appointment.id
                    
                    return (
                      <div
                        key={appointment.id}
                        className={`
                          calendar-appointment absolute inset-0 m-0.5 rounded-lg overflow-hidden
                          bg-gradient-to-r from-blue-500/95 to-purple-600/95 text-white
                          border border-white/30 shadow-lg
                          transition-all duration-300 ease-out
                          ${isDraggable ? 'cursor-move hover:shadow-xl hover:shadow-blue-500/30' : 'cursor-pointer'}
                          ${isSelected ? 'selected ring-2 ring-yellow-400/80 ring-offset-1' : ''}
                          ${isDragging ? 'dragging opacity-50 scale-95' : 'hover:scale-105'}
                        `}
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectAppointment(appointment.id.toString())
                          onAppointmentClick?.(appointment)
                        }}
                        onDragStart={isDraggable ? (e) => onDragStart(e, appointment) : undefined}
                        onDragEnd={onDragEnd}
                        draggable={isDraggable}
                      >
                        {/* Appointment content */}
                        <div className="p-1.5 h-full flex flex-col justify-center">
                          <div className="text-xs font-bold truncate leading-tight">
                            {displayAppointment.client_name || 'Client'}
                          </div>
                          <div className="text-xs opacity-90 truncate">
                            {format(new Date(displayAppointment.start_time), 'h:mm a')}
                          </div>
                        </div>
                        
                        {/* Appointment status indicator */}
                        <div className={`
                          absolute top-0 right-0 w-2 h-2 rounded-bl-lg
                          ${appointment.status === 'confirmed' ? 'bg-green-400' :
                            appointment.status === 'pending' ? 'bg-yellow-400' :
                            appointment.status === 'completed' ? 'bg-blue-400' :
                            'bg-gray-400'}
                        `} />
                        
                        {/* Premium shine effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
})

WeekView.displayName = 'WeekView'