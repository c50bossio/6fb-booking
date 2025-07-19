'use client'

import React, { useRef } from 'react'
import { format, isSameDay } from 'date-fns'
import { useResponsive } from '@/hooks/useResponsive'
import { AppointmentCard } from './AppointmentCard'
import { CurrentTimeIndicator } from './CurrentTimeIndicator'
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

interface DayViewProps {
  currentDate: Date
  appointments: Appointment[]
  startHour: number
  endHour: number
  slotDuration: number
  dragState: DragState
  optimisticUpdates: Map<number, { originalStartTime: string; newStartTime: string }>
  selectedAppointmentId: string | null
  onTimeSlotClick?: (date: Date) => void
  onTimeSlotContextMenu?: (date: Date, event: React.MouseEvent) => void
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

export const DayView = React.memo(function DayView({
  currentDate,
  appointments,
  startHour,
  endHour,
  slotDuration,
  dragState,
  optimisticUpdates,
  selectedAppointmentId,
  onTimeSlotClick,
  onTimeSlotContextMenu,
  onAppointmentClick,
  onAppointmentUpdate,
  onDragOver,
  onDragLeave,
  onDragStart,
  onDragEnd,
  onDrop,
  onSelectAppointment,
  getStatusColor
}: DayViewProps) {
  const { isMobile } = useResponsive()
  const scheduleGridRef = useRef<HTMLDivElement>(null)

  // Filter appointments for the current day
  const dayAppointments = appointments.filter(apt => 
    isSameDay(new Date(apt.start_time), currentDate)
  )

  // Generate time slots
  const timeSlots = []
  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += slotDuration) {
      timeSlots.push({ hour, minute })
    }
  }

  return (
    <div className="day-view h-full flex flex-col">
      <div className="day-header border-b border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-semibold text-lg">{format(currentDate, 'EEEE, MMMM d')}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {dayAppointments.length} appointments
        </p>
      </div>
      
      <div className="day-grid flex-1 overflow-auto relative" ref={scheduleGridRef}>
        {/* Time labels */}
        <div className="absolute left-0 top-0 w-16 z-10">
          {timeSlots.map(({ hour, minute }) => (
            minute === 0 ? (
              <div 
                key={`${hour}-${minute}`}
                className={`${isMobile ? 'h-12' : 'h-10'} text-xs text-gray-500 border-r border-gray-200 dark:border-gray-700 flex items-start justify-end pr-2 pt-1`}
              >
                {format(new Date().setHours(hour, minute), 'h:mm a')}
              </div>
            ) : null
          ))}
        </div>
        
        {/* Time slots */}
        <div className="ml-16">
          {timeSlots.map(({ hour, minute }) => {
            const slotDate = new Date(currentDate)
            slotDate.setHours(hour, minute, 0, 0)
            
            const isDragOver = dragState.dragOverSlot && 
              isSameDay(dragState.dragOverSlot.day, currentDate) && 
              dragState.dragOverSlot.hour === hour && 
              dragState.dragOverSlot.minute === minute
            
            const isDropSuccess = dragState.dropSuccess &&
              isSameDay(dragState.dropSuccess.day, currentDate) &&
              dragState.dropSuccess.hour === hour &&
              dragState.dropSuccess.minute === minute
            
            return (
              <div 
                key={`${hour}-${minute}`}
                className={`${isMobile ? 'h-12' : 'h-10'} border-b border-gray-100 dark:border-gray-800 cursor-pointer relative transition-all ${
                  isDragOver
                    ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-500 border-green-400 border-dashed'
                    : isDropSuccess
                    ? 'bg-green-200 dark:bg-green-800/40 ring-2 ring-green-400 animate-pulse'
                    : dragState.isDragging
                    ? 'hover:bg-green-50 dark:hover:bg-green-900/10 hover:border-green-300 hover:border-dashed'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                onClick={() => onTimeSlotClick?.(slotDate)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  onTimeSlotContextMenu?.(slotDate, e)
                }}
                onDragOver={(e) => onDragOver(e, currentDate, hour, minute)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, currentDate, hour, minute)}
              >
                {/* Render appointments for this time slot */}
                {dayAppointments
                  .filter(apt => {
                    const aptTime = new Date(apt.start_time)
                    return aptTime.getHours() === hour && aptTime.getMinutes() === minute
                  })
                  .map(appointment => {
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
                        viewType="day"
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
                  })
                }
              </div>
            )
          })}
        </div>
        
        {/* Current time indicator for today */}
        {isSameDay(currentDate, new Date()) && (
          <CurrentTimeIndicator startHour={startHour} slotDuration={slotDuration} />
        )}
      </div>
    </div>
  )
})

DayView.displayName = 'DayView'