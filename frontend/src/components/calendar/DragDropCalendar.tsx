'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
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
  currentPosition: { x: number; y: number }
  dropTarget: { date: string; time: string } | null
  conflictingAppointments: CalendarAppointment[]
  snapTarget: { date: string; time: string } | null
}

// Undo/Redo action tracking
interface MoveAction {
  appointmentId: string
  fromDate: string
  fromTime: string
  toDate: string
  toTime: string
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
  snapInterval?: 15 | 30 // minutes
  showConflicts?: boolean
  allowConflicts?: boolean
  enableCascadeRescheduling?: boolean
  appointmentDependencies?: Map<string, string[]> // appointmentId -> dependentIds
}

export default function DragDropCalendar({
  appointments = [],
  onAppointmentMove,
  enableDragDrop = true,
  snapInterval = 15,
  showConflicts = true,
  allowConflicts = false,
  enableCascadeRescheduling = false,
  appointmentDependencies = new Map(),
  ...calendarProps
}: DragDropCalendarProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedAppointment: null,
    dragOffset: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    dropTarget: null,
    conflictingAppointments: [],
    snapTarget: null
  })

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<MoveAction[]>([])
  const [redoStack, setRedoStack] = useState<MoveAction[]>([])

  const dragImageRef = useRef<HTMLDivElement>(null)
  const calendarRef = useRef<HTMLDivElement>(null)

  // Helper function to check if two appointments conflict
  const checkAppointmentConflict = useCallback(
    (appointment1: CalendarAppointment, appointment2: CalendarAppointment, checkDate: string) => {
      if (appointment1.id === appointment2.id) return false
      if (appointment1.barberId !== appointment2.barberId) return false
      if (appointment2.date !== checkDate) return false

      const start1 = new Date(`${checkDate} ${appointment1.startTime}`)
      const end1 = new Date(`${checkDate} ${appointment1.endTime}`)
      const start2 = new Date(`${appointment2.date} ${appointment2.startTime}`)
      const end2 = new Date(`${appointment2.date} ${appointment2.endTime}`)

      return (start1 < end2 && end1 > start2)
    },
    []
  )

  // Find all conflicting appointments for a potential move
  const findConflicts = useCallback(
    (draggedAppointment: CalendarAppointment, targetDate: string, targetTime: string) => {
      const movedAppointment = {
        ...draggedAppointment,
        date: targetDate,
        startTime: targetTime,
        // Calculate new end time based on duration
        endTime: calculateEndTime(targetTime, draggedAppointment.duration)
      }

      return appointments.filter(appointment =>
        checkAppointmentConflict(movedAppointment, appointment, targetDate)
      )
    },
    [appointments, checkAppointmentConflict]
  )

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + duration
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  }

  // Snap time to nearest interval
  const snapToInterval = useCallback(
    (time: string): string => {
      const [hours, minutes] = time.split(':').map(Number)
      const snappedMinutes = Math.round(minutes / snapInterval) * snapInterval

      if (snappedMinutes === 60) {
        return `${(hours + 1).toString().padStart(2, '0')}:00`
      }

      return `${hours.toString().padStart(2, '0')}:${snappedMinutes.toString().padStart(2, '0')}`
    },
    [snapInterval]
  )

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
        currentPosition: { x: event.clientX, y: event.clientY },
        dropTarget: null,
        conflictingAppointments: [],
        snapTarget: null
      })

      // Add drag class to the appointment element
      const appointmentElement = event.target as HTMLElement
      appointmentElement.classList.add('dragging')

      // Global mouse events for dragging
      const handleMouseMove = (e: MouseEvent) => {
        setDragState(prev => ({
          ...prev,
          currentPosition: { x: e.clientX, y: e.clientY }
        }))

        // Find potential drop target
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
        const timeSlot = elementBelow?.closest('[data-time-slot]')

        if (timeSlot) {
          const date = timeSlot.getAttribute('data-date')
          const time = timeSlot.getAttribute('data-time')

          if (date && time) {
            const snappedTime = snapToInterval(time)
            const conflicts = findConflicts(appointment, date, snappedTime)

            setDragState(prev => ({
              ...prev,
              dropTarget: { date, time },
              snapTarget: { date, time: snappedTime },
              conflictingAppointments: conflicts
            }))

            // Update visual feedback
            document.querySelectorAll('[data-time-slot]').forEach(slot => {
              slot.classList.remove('drop-target', 'conflict-target')
            })

            timeSlot.classList.add(conflicts.length > 0 && !allowConflicts ? 'conflict-target' : 'drop-target')
          }
        }
      }

      const handleMouseUp = async (e: MouseEvent) => {
        // Remove dragging class
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'))
        document.querySelectorAll('.drop-target, .conflict-target').forEach(el => {
          el.classList.remove('drop-target', 'conflict-target')
        })

        const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
        const timeSlot = elementBelow?.closest('[data-time-slot]')

        if (timeSlot && dragState.draggedAppointment && onAppointmentMove) {
          const newDate = timeSlot.getAttribute('data-date')
          const newTime = timeSlot.getAttribute('data-time')

          if (newDate && newTime) {
            const snappedTime = snapToInterval(newTime)
            const conflicts = findConflicts(dragState.draggedAppointment, newDate, snappedTime)

            // Only allow move if no conflicts or conflicts are allowed
            if (conflicts.length === 0 || allowConflicts) {
              if (newDate !== dragState.draggedAppointment.date ||
                  snappedTime !== dragState.draggedAppointment.startTime) {
                try {
                  // Move the main appointment
                  await onAppointmentMove(
                    dragState.draggedAppointment.id,
                    newDate,
                    snappedTime,
                    dragState.draggedAppointment.date,
                    dragState.draggedAppointment.startTime
                  )

                  // Handle cascade rescheduling
                  if (enableCascadeRescheduling) {
                    const dependentIds = appointmentDependencies.get(dragState.draggedAppointment.id) || []
                    if (dependentIds.length > 0) {
                      await handleCascadeRescheduling(
                        dragState.draggedAppointment,
                        newDate,
                        snappedTime,
                        dependentIds
                      )
                    }
                  }

                  // Add to undo stack
                  const moveAction: MoveAction = {
                    appointmentId: dragState.draggedAppointment.id,
                    fromDate: dragState.draggedAppointment.date,
                    fromTime: dragState.draggedAppointment.startTime,
                    toDate: newDate,
                    toTime: snappedTime
                  }
                  setUndoStack(prev => [...prev, moveAction])
                  setRedoStack([]) // Clear redo stack on new action
                } catch (error) {
                  console.error('Error moving appointment:', error)
                }
              }
            }
          }
        }

        // Clean up
        setDragState({
          isDragging: false,
          draggedAppointment: null,
          dragOffset: { x: 0, y: 0 },
          currentPosition: { x: 0, y: 0 },
          dropTarget: null,
          conflictingAppointments: [],
          snapTarget: null
        })

        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [enableDragDrop, onAppointmentMove, snapToInterval, findConflicts, allowConflicts, dragState.draggedAppointment]
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

  // Undo functionality
  const undo = useCallback(async () => {
    if (undoStack.length === 0 || !onAppointmentMove) return

    const lastMove = undoStack[undoStack.length - 1]
    try {
      await onAppointmentMove(
        lastMove.appointmentId,
        lastMove.fromDate,
        lastMove.fromTime,
        lastMove.toDate,
        lastMove.toTime
      )

      setUndoStack(prev => prev.slice(0, -1))
      setRedoStack(prev => [...prev, lastMove])
    } catch (error) {
      console.error('Error undoing move:', error)
    }
  }, [undoStack, onAppointmentMove])

  // Redo functionality
  const redo = useCallback(async () => {
    if (redoStack.length === 0 || !onAppointmentMove) return

    const lastRedo = redoStack[redoStack.length - 1]
    try {
      await onAppointmentMove(
        lastRedo.appointmentId,
        lastRedo.toDate,
        lastRedo.toTime,
        lastRedo.fromDate,
        lastRedo.fromTime
      )

      setRedoStack(prev => prev.slice(0, -1))
      setUndoStack(prev => [...prev, lastRedo])
    } catch (error) {
      console.error('Error redoing move:', error)
    }
  }, [redoStack, onAppointmentMove])

  // Handle cascade rescheduling for dependent appointments
  const handleCascadeRescheduling = useCallback(
    async (
      movedAppointment: CalendarAppointment,
      newDate: string,
      newTime: string,
      dependentIds: string[]
    ) => {
      // Calculate time difference
      const originalDateTime = new Date(`${movedAppointment.date} ${movedAppointment.startTime}`)
      const newDateTime = new Date(`${newDate} ${newTime}`)
      const timeDiff = newDateTime.getTime() - originalDateTime.getTime()

      // Move each dependent appointment
      for (const dependentId of dependentIds) {
        const dependentApt = appointments.find(apt => apt.id === dependentId)
        if (!dependentApt) continue

        // Calculate new time for dependent appointment
        const dependentDateTime = new Date(`${dependentApt.date} ${dependentApt.startTime}`)
        const newDependentDateTime = new Date(dependentDateTime.getTime() + timeDiff)

        const newDependentDate = newDependentDateTime.toISOString().split('T')[0]
        const newDependentTime = `${newDependentDateTime.getHours().toString().padStart(2, '0')}:${newDependentDateTime.getMinutes().toString().padStart(2, '0')}`

        // Snap to interval
        const snappedDependentTime = snapToInterval(newDependentTime)

        // Check for conflicts
        const conflicts = findConflicts(dependentApt, newDependentDate, snappedDependentTime)
        if (conflicts.length === 0 || allowConflicts) {
          await onAppointmentMove?.(
            dependentId,
            newDependentDate,
            snappedDependentTime,
            dependentApt.date,
            dependentApt.startTime
          )
        }
      }
    },
    [appointments, findConflicts, snapToInterval, allowConflicts, onAppointmentMove]
  )

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

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

  // Wrap appointments to add drag functionality
  const enhancedAppointments = useMemo(() => {
    return appointments.map(appointment => ({
      ...appointment,
      __dragProps: enableDragDrop ? {
        onMouseDown: (e: React.MouseEvent) => handleAppointmentMouseDown(appointment, e),
        onDragStart: (e: React.DragEvent) => e.preventDefault(), // Prevent HTML5 drag
        style: { cursor: 'grab', userSelect: 'none' }
      } : null
    }))
  }, [appointments, handleAppointmentMouseDown, enableDragDrop])

  return (
    <div
      ref={calendarRef}
      className={`relative ${dragState.isDragging ? 'select-none' : ''}`}
      style={{ cursor: dragState.isDragging ? 'grabbing' : 'default' }}
    >
      {/* Undo/Redo controls - only buttons added, no style changes */}
      <div className="absolute top-4 right-4 z-20 flex gap-2">
        <button
          onClick={undo}
          disabled={undoStack.length === 0}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          title="Undo (Ctrl+Z)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          title="Redo (Ctrl+Y)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      {/* Enhanced Calendar with Drag & Drop Support */}
      <div className="calendar-container" data-drag-drop-enabled={enableDragDrop}>
        <PremiumCalendar
          {...calendarProps}
          appointments={enhancedAppointments as CalendarAppointment[]}
          onAppointmentClick={enhancedAppointmentClick}
          onTimeSlotClick={enhancedTimeSlotClick}
        />
      </div>

      {/* Enhanced Drag Preview with conflict info */}
      {dragState.isDragging && dragState.draggedAppointment && (
        <div
          ref={dragImageRef}
          className="fixed pointer-events-none z-50 transform"
          style={{
            left: dragState.currentPosition.x + 10,
            top: dragState.currentPosition.y + 10,
          }}
        >
          <div className={`${
            dragState.conflictingAppointments.length > 0 && !allowConflicts
              ? 'bg-red-600'
              : 'bg-violet-600'
          } text-white p-3 rounded-lg shadow-2xl border ${
            dragState.conflictingAppointments.length > 0 && !allowConflicts
              ? 'border-red-400'
              : 'border-violet-400'
          } max-w-xs`}>
            <div className="font-semibold text-sm mb-1">
              {dragState.draggedAppointment.service}
            </div>
            <div className="text-xs opacity-90">
              {dragState.draggedAppointment.client}
            </div>
            <div className="text-xs opacity-75">
              {dragState.draggedAppointment.startTime} - {dragState.draggedAppointment.endTime}
            </div>
            {dragState.snapTarget && (
              <div className="mt-2 pt-2 border-t border-white/20">
                <div className="text-xs">
                  New time: {dragState.snapTarget.time}
                </div>
                {dragState.conflictingAppointments.length > 0 && showConflicts && (
                  <div className="text-xs text-red-200 mt-1">
                    ⚠️ Conflicts with {dragState.conflictingAppointments.length} appointment(s)
                  </div>
                )}
              </div>
            )}
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

        .calendar-container [data-time-slot].conflict-target {
          background-color: rgba(239, 68, 68, 0.2);
          border-color: rgb(239, 68, 68);
          box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.5);
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
