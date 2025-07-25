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
    <div className="week-view h-full flex flex-col">
      {/* Week header */}
      <div className="week-header border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-8 gap-0">
          <div className="w-16"></div> {/* Time column spacer */}
          {weekDays.map(day => (
            <div key={day.toISOString()} className="p-2 text-center border-r border-gray-200 dark:border-gray-700">
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
              <div className={`text-lg ${isSameDay(day, new Date()) ? 'text-blue-600 font-bold' : ''}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Week grid */}
      <div className="week-grid flex-1 overflow-auto relative" ref={scheduleGridRef}>
        {timeSlots.map(({ hour, minute }) => (
          <div key={`${hour}-${minute}`} className="grid grid-cols-8 gap-0 h-10 border-b border-gray-100 dark:border-gray-800">
            {/* Time label */}
            <div className="w-16 text-xs text-gray-500 border-r border-gray-200 dark:border-gray-700 flex items-start justify-end pr-2 pt-1">
              {minute === 0 ? format(new Date().setHours(hour, minute), 'h:mm a') : ''}
            </div>
            
            {/* Day columns */}
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
              
              return (
                <div 
                  key={day.toISOString()}
                  className={`border-r border-gray-200 dark:border-gray-700 cursor-pointer relative transition-all ${
                    isDragOver
                      ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500 border-green-400 border-dashed'
                      : isDropSuccess
                      ? 'bg-green-200 dark:bg-green-800/40 ring-2 ring-green-400 animate-pulse'
                      : dragState.isDragging
                      ? 'hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 hover:border-dashed'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={(e) => {
                    // Only trigger if clicked on empty slot, not appointment
                    if (e.target === e.currentTarget) {
                      onTimeSlotClick?.(slotDate)
                    }
                  }}
                  onDragOver={(e) => onDragOver(e, day, hour, minute)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, day, hour, minute)}
                >
                  {slotAppointments.map(appointment => {
                    // Apply optimistic updates
                    const optimisticUpdate = optimisticUpdates.get(appointment.id)
                    const displayAppointment = optimisticUpdate ? 
                      { ...appointment, start_time: optimisticUpdate.newStartTime } : 
                      appointment
                    
                    const isDraggable = appointment.status !== 'completed' && appointment.status !== 'cancelled'
                    
                    return (
                      <AppointmentCard
                        key={appointment.id}
                        appointment={displayAppointment}
                        isDraggable={isDraggable}
                        isDragging={dragState.draggedAppointment?.id === appointment.id}
                        isSelected={selectedAppointmentId === appointment.id.toString()}
                        viewType="week"
                        onClick={(apt) => {
                          onSelectAppointment(apt.id.toString())
                          onAppointmentClick?.(apt)
                        }}
                        onDragStart={onDragStart}
                        onDragEnd={onDragEnd}
                        onMoveClick={onAppointmentUpdate ? (apt) => onAppointmentUpdate(apt.id, apt.start_time) : undefined}
                        showDropIndicator={dragState.isDragging && dragState.draggedAppointment?.id !== appointment.id}
                        getStatusColor={getStatusColor}
                      />
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