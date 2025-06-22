'use client'

import React, { useState, useCallback, useRef } from 'react'
import PremiumCalendar, { CalendarAppointment, CalendarProps } from './PremiumCalendar'

interface DragDropData {
  appointmentId: string
  originalDate: string
  originalTime: string
}

interface DragState {
  isDragging: boolean
  draggedAppointment: CalendarAppointment | null
  dragOffset: { x: number; y: number }
  dropTarget: { date: string; time: string } | null
}

interface DragDropCalendarProps extends CalendarProps {
  onAppointmentMove?: (
    appointmentId: string,
    newDate: string,
    newTime: string,
    originalDate: string,
    originalTime: string
  ) => Promise<void>
  enableDragDrop?: boolean
}

export default function DragDropCalendar({
  onAppointmentMove,
  enableDragDrop = true,
  ...calendarProps
}: DragDropCalendarProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedAppointment: null,
    dragOffset: { x: 0, y: 0 },
    dropTarget: null
  })

  const dragImageRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  const handleAppointmentMouseDown = useCallback(
    (appointment: CalendarAppointment, event: React.MouseEvent) => {
      if (!enableDragDrop) return

      event.preventDefault()
      event.stopPropagation()

      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const offset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      }

      setDragState({
        isDragging: true,
        draggedAppointment: appointment,
        dragOffset: offset,
        dropTarget: null
      })

      // Add global mouse events for dragging
      const handleMouseMove = (e: MouseEvent) => {
        // Update cursor position or visual feedback here if needed
      }

      const handleMouseUp = async (e: MouseEvent) => {
        // Find the drop target element
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
        const timeSlot = elementBelow?.closest('[data-time-slot]')

        if (timeSlot && dragState.draggedAppointment && onAppointmentMove) {
          const newDate = timeSlot.getAttribute('data-date')
          const newTime = timeSlot.getAttribute('data-time')

          if (newDate && newTime &&
              (newDate !== dragState.draggedAppointment.date || newTime !== dragState.draggedAppointment.startTime)) {
            try {
              await onAppointmentMove(
                dragState.draggedAppointment.id,
                newDate,
                newTime,
                dragState.draggedAppointment.date,
                dragState.draggedAppointment.startTime
              )
            } catch (error) {
              console.error('Error moving appointment:', error)
            }
          }
        }

        // Clean up
        setDragState({
          isDragging: false,
          draggedAppointment: null,
          dragOffset: { x: 0, y: 0 },
          dropTarget: null
        })

        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [enableDragDrop, onAppointmentMove, dragState.draggedAppointment]
  )

  const handleTimeSlotMouseEnter = useCallback(
    (date: string, time: string) => {
      if (dragState.isDragging) {
        setDragState(prev => ({
          ...prev,
          dropTarget: { date, time }
        }))
      }
    },
    [dragState.isDragging]
  )

  const handleTimeSlotMouseLeave = useCallback(() => {
    if (dragState.isDragging) {
      setDragState(prev => ({
        ...prev,
        dropTarget: null
      }))
    }
  }, [dragState.isDragging])

  // Enhanced appointment click handler that includes drag support
  const enhancedAppointmentClick = useCallback(
    (appointment: CalendarAppointment) => {
      if (!dragState.isDragging) {
        calendarProps.onAppointmentClick?.(appointment)
      }
    },
    [calendarProps.onAppointmentClick, dragState.isDragging]
  )

  // Enhanced time slot click handler with drop target visual feedback
  const enhancedTimeSlotClick = useCallback(
    (date: string, time: string) => {
      if (!dragState.isDragging) {
        calendarProps.onTimeSlotClick?.(date, time)
      }
    },
    [calendarProps.onTimeSlotClick, dragState.isDragging]
  )

  return (
    <div
      ref={calendarRef}
      className={`relative ${dragState.isDragging ? 'select-none' : ''}`}
      style={{ cursor: dragState.isDragging ? 'grabbing' : 'default' }}
    >
      {/* Enhanced Calendar with Drag & Drop Support */}
      <div className="calendar-container">
        <PremiumCalendar
          {...calendarProps}
          onAppointmentClick={enhancedAppointmentClick}
          onTimeSlotClick={enhancedTimeSlotClick}
        />
      </div>

      {/* Drag Preview Ghost */}
      {dragState.isDragging && dragState.draggedAppointment && (
        <div
          ref={dragImageRef}
          className="fixed pointer-events-none z-50 opacity-80 transform scale-95"
          style={{
            left: dragState.dragOffset.x,
            top: dragState.dragOffset.y,
          }}
        >
          <div className="bg-violet-600 text-white p-3 rounded-lg shadow-2xl border border-violet-400 max-w-xs">
            <div className="font-semibold text-sm mb-1">
              {dragState.draggedAppointment.service}
            </div>
            <div className="text-xs opacity-90">
              {dragState.draggedAppointment.client}
            </div>
            <div className="text-xs opacity-75">
              {dragState.draggedAppointment.startTime} - {dragState.draggedAppointment.endTime}
            </div>
          </div>
        </div>
      )}

      {/* Global styles for drag and drop visual feedback */}
      <style jsx global>{`
        .calendar-container [data-time-slot] {
          transition: all 0.2s ease;
        }

        .calendar-container [data-time-slot]:hover {
          background-color: rgba(139, 92, 246, 0.1);
        }

        .calendar-container [data-time-slot].drop-target {
          background-color: rgba(139, 92, 246, 0.2);
          border-color: rgb(139, 92, 246);
          box-shadow: inset 0 0 0 2px rgba(139, 92, 246, 0.5);
        }

        .calendar-container .appointment-block {
          transition: all 0.2s ease;
          cursor: ${enableDragDrop ? 'grab' : 'pointer'};
        }

        .calendar-container .appointment-block:hover {
          transform: ${enableDragDrop ? 'scale(1.02)' : 'scale(1.05)'};
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .calendar-container .appointment-block:active {
          cursor: ${enableDragDrop ? 'grabbing' : 'pointer'};
          transform: scale(0.98);
        }

        .calendar-container .appointment-block.dragging {
          opacity: 0.5;
          transform: scale(0.95);
        }

        .calendar-container .time-slot.drag-over {
          background-color: rgba(139, 92, 246, 0.15);
          border: 2px dashed rgb(139, 92, 246);
        }

        /* Smooth drag animations */
        .calendar-container * {
          transition-property: background-color, border-color, transform, box-shadow;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 200ms;
        }
      `}</style>
    </div>
  )
}

// Enhanced hook for handling drag and drop state
export const useDragDrop = (
  appointments: CalendarAppointment[],
  onAppointmentMove?: (
    appointmentId: string,
    newDate: string,
    newTime: string,
    originalDate: string,
    originalTime: string
  ) => Promise<void>
) => {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedAppointment: null,
    dragOffset: { x: 0, y: 0 },
    dropTarget: null
  })

  const startDrag = useCallback((appointment: CalendarAppointment, offset: { x: number; y: number }) => {
    setDragState({
      isDragging: true,
      draggedAppointment: appointment,
      dragOffset: offset,
      dropTarget: null
    })
  }, [])

  const updateDrag = useCallback((dropTarget: { date: string; time: string } | null) => {
    setDragState(prev => ({
      ...prev,
      dropTarget
    }))
  }, [])

  const endDrag = useCallback(async (finalDropTarget?: { date: string; time: string }) => {
    if (dragState.draggedAppointment && finalDropTarget && onAppointmentMove) {
      const { date: newDate, time: newTime } = finalDropTarget
      const { date: originalDate, startTime: originalTime } = dragState.draggedAppointment

      if (newDate !== originalDate || newTime !== originalTime) {
        try {
          await onAppointmentMove(
            dragState.draggedAppointment.id,
            newDate,
            newTime,
            originalDate,
            originalTime
          )
        } catch (error) {
          console.error('Error moving appointment:', error)
        }
      }
    }

    setDragState({
      isDragging: false,
      draggedAppointment: null,
      dragOffset: { x: 0, y: 0 },
      dropTarget: null
    })
  }, [dragState.draggedAppointment, onAppointmentMove])

  return {
    dragState,
    startDrag,
    updateDrag,
    endDrag
  }
}
