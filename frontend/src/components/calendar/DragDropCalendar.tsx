'use client'

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PremiumCalendar, { CalendarAppointment, CalendarProps } from './PremiumCalendar'
import AppointmentMoveConfirmation from '../modals/AppointmentMoveConfirmation'
import ConflictResolutionModal, { ConflictResolution, TimeSlotSuggestion, ConflictingAppointment } from '../modals/ConflictResolutionModal'
import ConflictResolutionService from './ConflictResolutionService'

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
  isValidDrop: boolean
  snapGuides: { x: number; y: number; visible: boolean }
  dragHandle: { visible: boolean; appointmentId: string | null }
}

interface ConflictState {
  isResolutionOpen: boolean
  conflictingAppointments: ConflictingAppointment[]
  suggestions: TimeSlotSuggestion[]
  targetDate: string
  targetTime: string
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
  enableSmartConflictResolution?: boolean
  workingHours?: { start: string; end: string }
  onConflictResolution?: (resolution: ConflictResolution) => Promise<void>
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
  enableSmartConflictResolution = true,
  workingHours = { start: '08:00', end: '20:00' },
  onConflictResolution,
  ...calendarProps
}: DragDropCalendarProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedAppointment: null,
    dragOffset: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    dropTarget: null,
    conflictingAppointments: [],
    snapTarget: null,
    isValidDrop: true,
    snapGuides: { x: 0, y: 0, visible: false },
    dragHandle: { visible: false, appointmentId: null }
  })

  // Undo/Redo stacks
  const [undoStack, setUndoStack] = useState<MoveAction[]>([])
  const [redoStack, setRedoStack] = useState<MoveAction[]>([])
  const [pendingMove, setPendingMove] = useState<{
    appointment: CalendarAppointment
    newDate: string
    newTime: string
  } | null>(null)
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [successAnimation, setSuccessAnimation] = useState<{ visible: boolean; appointmentId: string | null }>({ visible: false, appointmentId: null })
  const [hoveredAppointment, setHoveredAppointment] = useState<string | null>(null)
  const [appointmentPreview, setAppointmentPreview] = useState<{
    visible: boolean
    appointment: CalendarAppointment | null
    position: { x: number; y: number }
  }>({ visible: false, appointment: null, position: { x: 0, y: 0 } })

  // Conflict resolution state
  const [conflictState, setConflictState] = useState<ConflictState>({
    isResolutionOpen: false,
    conflictingAppointments: [],
    suggestions: [],
    targetDate: '',
    targetTime: ''
  })

  // Initialize conflict resolution service
  const conflictService = useMemo(() =>
    new ConflictResolutionService(appointments, {
      workingHoursStart: workingHours.start,
      workingHoursEnd: workingHours.end,
      slotInterval: snapInterval,
      maxSuggestions: 12,
      prioritizeSameDay: true,
      prioritizeNearbyTimes: true
    }), [appointments, workingHours, snapInterval])

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

      // Store initial state for the drag operation
      let currentDragState = {
        isDragging: true,
        draggedAppointment: appointment,
        dragOffset: offset,
        currentPosition: { x: event.clientX, y: event.clientY },
        dropTarget: null,
        conflictingAppointments: [],
        snapTarget: null,
        isValidDrop: true,
        snapGuides: { x: 0, y: 0, visible: false },
        dragHandle: { visible: false, appointmentId: null }
      }

      setDragState(currentDragState)

      // Add drag class to the appointment element
      const appointmentElement = event.target as HTMLElement
      appointmentElement.classList.add('dragging')

      console.log('🐭 Drag started for:', appointment.client, appointment.service)

      // Global mouse events for dragging
      const handleMouseMove = (e: MouseEvent) => {
        setDragState(prev => {
          const newState = {
            ...prev,
            currentPosition: { x: e.clientX, y: e.clientY }
          }
          currentDragState = newState
          return newState
        })

        // Find potential drop target
        const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
        const timeSlot = elementBelow?.closest('[data-time-slot]')

        if (timeSlot) {
          const date = timeSlot.getAttribute('data-date')
          const time = timeSlot.getAttribute('data-time')

          if (date && time) {
            const snappedTime = snapToInterval(time)
            const conflicts = findConflicts(appointment, date, snappedTime)
            const isValidDrop = conflicts.length === 0 || allowConflicts

            // Calculate snap guides position
            const rect = timeSlot.getBoundingClientRect()
            const snapGuides = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              visible: true
            }

            setDragState(prev => {
              const newState = {
                ...prev,
                dropTarget: { date, time },
                snapTarget: { date, time: snappedTime },
                conflictingAppointments: conflicts,
                isValidDrop,
                snapGuides
              }
              currentDragState = newState
              return newState
            })

            // Update visual feedback with enhanced classes
            document.querySelectorAll('[data-time-slot]').forEach(slot => {
              slot.classList.remove('drop-target', 'conflict-target', 'drop-target-valid', 'drop-target-invalid')
            })

            if (isValidDrop) {
              timeSlot.classList.add('drop-target', 'drop-target-valid')
            } else {
              timeSlot.classList.add('conflict-target', 'drop-target-invalid')
            }
          }
        } else {
          // Clear snap guides when not over a valid drop target
          setDragState(prev => {
            const newState = {
              ...prev,
              snapGuides: { ...prev.snapGuides, visible: false }
            }
            currentDragState = newState
            return newState
          })
        }
      }

      const handleMouseUp = async (e: MouseEvent) => {
        console.log('🐭 Mouse up - checking drop target...')
        
        // Remove dragging class
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'))
        document.querySelectorAll('.drop-target, .conflict-target, .drop-target-valid, .drop-target-invalid').forEach(el => {
          el.classList.remove('drop-target', 'conflict-target', 'drop-target-valid', 'drop-target-invalid')
        })

        const elementBelow = document.elementFromPoint(e.clientX, e.clientY)
        const timeSlot = elementBelow?.closest('[data-time-slot]')

        if (timeSlot && currentDragState.draggedAppointment && onAppointmentMove) {
          const newDate = timeSlot.getAttribute('data-date')
          const newTime = timeSlot.getAttribute('data-time')

          console.log('🎯 Drop target found:', { newDate, newTime })

          if (newDate && newTime) {
            const snappedTime = snapToInterval(newTime)
            const conflicts = findConflicts(currentDragState.draggedAppointment, newDate, snappedTime)

            console.log('⚡ Processing drop:', {
              from: `${currentDragState.draggedAppointment.date} ${currentDragState.draggedAppointment.startTime}`,
              to: `${newDate} ${snappedTime}`,
              conflicts: conflicts.length
            })

            // Handle conflicts with smart resolution
            if (conflicts.length === 0) {
              // No conflicts - proceed with normal confirmation
              if (newDate !== currentDragState.draggedAppointment.date ||
                  snappedTime !== currentDragState.draggedAppointment.startTime) {
                setPendingMove({
                  appointment: currentDragState.draggedAppointment,
                  newDate,
                  newTime: snappedTime
                })
                setIsConfirmationOpen(true)
              }
            } else if (enableSmartConflictResolution) {
              // Show conflict resolution modal
              const conflictingAppointments = ConflictResolutionService.analyzeConflicts(
                appointments,
                currentDragState.draggedAppointment,
                newDate,
                snappedTime
              )

              const suggestions = conflictService.generateSuggestions(
                currentDragState.draggedAppointment,
                newDate,
                snappedTime,
                currentDragState.draggedAppointment.barberId
              )

              setConflictState({
                isResolutionOpen: true,
                conflictingAppointments,
                suggestions,
                targetDate: newDate,
                targetTime: snappedTime
              })
            } else if (allowConflicts) {
              // Allow conflicts if explicitly enabled
              if (newDate !== currentDragState.draggedAppointment.date ||
                  snappedTime !== currentDragState.draggedAppointment.startTime) {
                setPendingMove({
                  appointment: currentDragState.draggedAppointment,
                  newDate,
                  newTime: snappedTime
                })
                setIsConfirmationOpen(true)
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
          snapTarget: null,
          isValidDrop: true,
          snapGuides: { x: 0, y: 0, visible: false },
          dragHandle: { visible: false, appointmentId: null }
        })

        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [enableDragDrop, onAppointmentMove, snapToInterval, findConflicts, allowConflicts, enableSmartConflictResolution, appointments, conflictService]
  )

  // Touch event handlers for mobile support
  const handleAppointmentTouchStart = useCallback(
    (appointment: CalendarAppointment, event: React.TouchEvent) => {
      if (!enableDragDrop) return

      event.preventDefault()
      event.stopPropagation()

      const touch = event.touches[0]
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const offset = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }

      setDragState({
        isDragging: true,
        draggedAppointment: appointment,
        dragOffset: offset,
        currentPosition: { x: touch.clientX, y: touch.clientY },
        dropTarget: null,
        conflictingAppointments: [],
        snapTarget: null,
        isValidDrop: true,
        snapGuides: { x: 0, y: 0, visible: false },
        dragHandle: { visible: false, appointmentId: null }
      })

      // Add drag class to the appointment element
      const appointmentElement = event.target as HTMLElement
      appointmentElement.classList.add('dragging')

      // Prevent body scroll on mobile while dragging
      document.body.classList.add('dragging-active')

      // Global touch events for dragging
      const handleTouchMove = (e: TouchEvent) => {
        e.preventDefault() // Prevent scrolling while dragging
        const touch = e.touches[0]

        setDragState(prev => ({
          ...prev,
          currentPosition: { x: touch.clientX, y: touch.clientY }
        }))

        // Find potential drop target
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
        const timeSlot = elementBelow?.closest('[data-time-slot]')

        if (timeSlot) {
          const date = timeSlot.getAttribute('data-date')
          const time = timeSlot.getAttribute('data-time')

          if (date && time) {
            const snappedTime = snapToInterval(time)
            const conflicts = findConflicts(appointment, date, snappedTime)
            const isValidDrop = conflicts.length === 0 || allowConflicts

            // Calculate snap guides position
            const rect = timeSlot.getBoundingClientRect()
            const snapGuides = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              visible: true
            }

            setDragState(prev => ({
              ...prev,
              dropTarget: { date, time },
              snapTarget: { date, time: snappedTime },
              conflictingAppointments: conflicts,
              isValidDrop,
              snapGuides
            }))

            // Update visual feedback with enhanced classes
            document.querySelectorAll('[data-time-slot]').forEach(slot => {
              slot.classList.remove('drop-target', 'conflict-target', 'drop-target-valid', 'drop-target-invalid')
            })

            if (isValidDrop) {
              timeSlot.classList.add('drop-target', 'drop-target-valid')
            } else {
              timeSlot.classList.add('conflict-target', 'drop-target-invalid')
            }
          }
        } else {
          // Clear snap guides when not over a valid drop target
          setDragState(prev => ({
            ...prev,
            snapGuides: { ...prev.snapGuides, visible: false }
          }))
        }
      }

      const handleTouchEnd = async (e: TouchEvent) => {
        e.preventDefault()

        // Remove dragging class
        document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'))
        document.querySelectorAll('.drop-target, .conflict-target, .drop-target-valid, .drop-target-invalid').forEach(el => {
          el.classList.remove('drop-target', 'conflict-target', 'drop-target-valid', 'drop-target-invalid')
        })

        // Re-enable body scroll
        document.body.classList.remove('dragging-active')

        // Get the last touch position
        const touch = e.changedTouches[0]
        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY)
        const timeSlot = elementBelow?.closest('[data-time-slot]')

        if (timeSlot && dragState.draggedAppointment && onAppointmentMove) {
          const newDate = timeSlot.getAttribute('data-date')
          const newTime = timeSlot.getAttribute('data-time')

          if (newDate && newTime) {
            const snappedTime = snapToInterval(newTime)
            const conflicts = findConflicts(dragState.draggedAppointment, newDate, snappedTime)

            // Handle conflicts with smart resolution
            if (conflicts.length === 0) {
              // No conflicts - proceed with normal confirmation
              if (newDate !== dragState.draggedAppointment.date ||
                  snappedTime !== dragState.draggedAppointment.startTime) {
                setPendingMove({
                  appointment: dragState.draggedAppointment,
                  newDate,
                  newTime: snappedTime
                })
                setIsConfirmationOpen(true)
              }
            } else if (enableSmartConflictResolution) {
              // Show conflict resolution modal
              const conflictingAppointments = ConflictResolutionService.analyzeConflicts(
                appointments,
                dragState.draggedAppointment,
                newDate,
                snappedTime
              )

              const suggestions = conflictService.generateSuggestions(
                dragState.draggedAppointment,
                newDate,
                snappedTime,
                dragState.draggedAppointment.barberId
              )

              setConflictState({
                isResolutionOpen: true,
                conflictingAppointments,
                suggestions,
                targetDate: newDate,
                targetTime: snappedTime
              })
            } else if (allowConflicts) {
              // Allow conflicts if explicitly enabled
              if (newDate !== dragState.draggedAppointment.date ||
                  snappedTime !== dragState.draggedAppointment.startTime) {
                setPendingMove({
                  appointment: dragState.draggedAppointment,
                  newDate,
                  newTime: snappedTime
                })
                setIsConfirmationOpen(true)
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
          snapTarget: null,
          isValidDrop: true,
          snapGuides: { x: 0, y: 0, visible: false },
          dragHandle: { visible: false, appointmentId: null }
        })

        document.removeEventListener('touchmove', handleTouchMove, { passive: false } as EventListenerOptions)
        document.removeEventListener('touchend', handleTouchEnd)
        document.removeEventListener('touchcancel', handleTouchEnd)
      }

      document.addEventListener('touchmove', handleTouchMove, { passive: false })
      document.addEventListener('touchend', handleTouchEnd)
      document.addEventListener('touchcancel', handleTouchEnd)
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

  // Handle confirmed appointment move
  const handleConfirmedMove = useCallback(
    async (notifyCustomer: boolean, note?: string) => {
      if (!pendingMove || !onAppointmentMove) return

      setIsSaving(true)
      try {
        // Move the main appointment
        await onAppointmentMove(
          pendingMove.appointment.id,
          pendingMove.newDate,
          pendingMove.newTime,
          pendingMove.appointment.date,
          pendingMove.appointment.startTime
        )

        // Handle cascade rescheduling
        if (enableCascadeRescheduling) {
          const dependentIds = appointmentDependencies.get(pendingMove.appointment.id) || []
          if (dependentIds.length > 0) {
            await handleCascadeRescheduling(
              pendingMove.appointment,
              pendingMove.newDate,
              pendingMove.newTime,
              dependentIds
            )
          }
        }

        // Add to undo stack
        const moveAction: MoveAction = {
          appointmentId: pendingMove.appointment.id,
          fromDate: pendingMove.appointment.date,
          fromTime: pendingMove.appointment.startTime,
          toDate: pendingMove.newDate,
          toTime: pendingMove.newTime
        }
        setUndoStack(prev => [...prev, moveAction])
        setRedoStack([]) // Clear redo stack on new action

        // Show success animation
        setSuccessAnimation({ visible: true, appointmentId: pendingMove.appointment.id })
        setTimeout(() => {
          setSuccessAnimation({ visible: false, appointmentId: null })
        }, 2000)

        // Log notification preference and note
        console.log('Move confirmed:', {
          notifyCustomer,
          note,
          appointment: pendingMove.appointment.id
        })

        // Close modal and reset
        setIsConfirmationOpen(false)
        setPendingMove(null)
      } catch (error) {
        console.error('Error moving appointment:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [pendingMove, onAppointmentMove, enableCascadeRescheduling, appointmentDependencies, handleCascadeRescheduling]
  )

  // Handle conflict resolution
  const handleConflictResolution = useCallback(
    async (resolution: ConflictResolution) => {
      if (!dragState.draggedAppointment) return

      setIsSaving(true)
      try {
        switch (resolution.type) {
          case 'accept_suggestion':
            if (resolution.selectedSuggestion) {
              await onAppointmentMove?.(
                dragState.draggedAppointment.id,
                resolution.selectedSuggestion.date,
                resolution.selectedSuggestion.time,
                dragState.draggedAppointment.date,
                dragState.draggedAppointment.startTime
              )
            }
            break

          case 'bump_appointments':
            // First move the dragged appointment
            await onAppointmentMove?.(
              dragState.draggedAppointment.id,
              conflictState.targetDate,
              conflictState.targetTime,
              dragState.draggedAppointment.date,
              dragState.draggedAppointment.startTime
            )

            // Then move the bumped appointments
            if (resolution.appointmentsToBump) {
              for (const bump of resolution.appointmentsToBump) {
                const originalApt = appointments.find(apt => apt.id === bump.appointmentId)
                if (originalApt) {
                  await onAppointmentMove?.(
                    bump.appointmentId,
                    bump.newDate,
                    bump.newTime,
                    originalApt.date,
                    originalApt.startTime
                  )
                }
              }
            }
            break

          case 'allow_overlap':
            await onAppointmentMove?.(
              dragState.draggedAppointment.id,
              conflictState.targetDate,
              conflictState.targetTime,
              dragState.draggedAppointment.date,
              dragState.draggedAppointment.startTime
            )
            break
        }

        // Call custom conflict resolution handler if provided
        if (onConflictResolution) {
          await onConflictResolution(resolution)
        }

        // Close modal and reset
        setConflictState({
          isResolutionOpen: false,
          conflictingAppointments: [],
          suggestions: [],
          targetDate: '',
          targetTime: ''
        })
      } catch (error) {
        console.error('Error resolving conflict:', error)
      } finally {
        setIsSaving(false)
      }
    },
    [dragState.draggedAppointment, onAppointmentMove, onConflictResolution, conflictState, appointments]
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

  // Hover handlers for drag handle visibility and appointment preview
  const handleAppointmentMouseEnter = useCallback((appointmentId: string, event?: React.MouseEvent) => {
    if (enableDragDrop && !dragState.isDragging) {
      const appointment = appointments.find(apt => apt.id === appointmentId)
      setHoveredAppointment(appointmentId)
      setDragState(prev => ({
        ...prev,
        dragHandle: { visible: true, appointmentId }
      }))

      // Show appointment preview
      if (appointment && event) {
        setAppointmentPreview({
          visible: true,
          appointment,
          position: { x: event.clientX, y: event.clientY }
        })
      }
    }
  }, [enableDragDrop, dragState.isDragging, appointments])

  const handleAppointmentMouseLeave = useCallback(() => {
    if (enableDragDrop && !dragState.isDragging) {
      setHoveredAppointment(null)
      setDragState(prev => ({
        ...prev,
        dragHandle: { visible: false, appointmentId: null }
      }))

      // Hide appointment preview
      setAppointmentPreview({
        visible: false,
        appointment: null,
        position: { x: 0, y: 0 }
      })
    }
  }, [enableDragDrop, dragState.isDragging])

  const handleAppointmentMouseMove = useCallback((event: React.MouseEvent) => {
    if (appointmentPreview.visible && !dragState.isDragging) {
      setAppointmentPreview(prev => ({
        ...prev,
        position: { x: event.clientX, y: event.clientY }
      }))
    }
  }, [appointmentPreview.visible, dragState.isDragging])

  // Wrap appointments to add drag functionality
  const enhancedAppointments = useMemo(() => {
    return appointments.map(appointment => ({
      ...appointment,
      __dragProps: enableDragDrop ? {
        onMouseDown: (e: React.MouseEvent) => handleAppointmentMouseDown(appointment, e),
        onTouchStart: (e: React.TouchEvent) => handleAppointmentTouchStart(appointment, e),
        onMouseEnter: (e: React.MouseEvent) => handleAppointmentMouseEnter(appointment.id, e),
        onMouseLeave: handleAppointmentMouseLeave,
        onMouseMove: handleAppointmentMouseMove,
        onDragStart: (e: React.DragEvent) => e.preventDefault(), // Prevent HTML5 drag
        style: {
          cursor: 'grab',
          userSelect: 'none',
          touchAction: 'none' // Prevent default touch behaviors
        }
      } : null
    }))
  }, [appointments, handleAppointmentMouseDown, handleAppointmentTouchStart, handleAppointmentMouseEnter, handleAppointmentMouseLeave, handleAppointmentMouseMove, enableDragDrop])

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

      {/* Snap-to-grid guides */}
      <AnimatePresence>
        {dragState.snapGuides.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed pointer-events-none z-40"
            style={{
              left: dragState.snapGuides.x - 2,
              top: dragState.snapGuides.y - 2,
            }}
          >
            <div className="w-4 h-4 border-2 border-blue-400 bg-blue-100 rounded-full animate-pulse shadow-lg" />
            <div className="absolute -top-1 -left-1 w-6 h-6 border-2 border-blue-300 rounded-full animate-ping" />
            <div className="absolute -top-2 -left-2 w-8 h-8 border border-blue-200 rounded-full opacity-50" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Drag Preview with smooth animations */}
      <AnimatePresence>
        {dragState.isDragging && dragState.draggedAppointment && (
          <motion.div
            ref={dragImageRef}
            initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: 0,
              x: dragState.currentPosition.x + 10,
              y: dragState.currentPosition.y + 10
            }}
            exit={{ opacity: 0, scale: 0.9, rotate: 5 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed pointer-events-none z-50"
          >
            <motion.div
              animate={{
                scale: dragState.isValidDrop ? 1 : 0.95,
                rotate: dragState.isValidDrop ? 0 : [0, -2, 2, 0]
              }}
              transition={{ duration: 0.2 }}
              className={`${
                !dragState.isValidDrop
                  ? 'bg-red-600 border-red-400'
                  : 'bg-violet-600 border-violet-400'
              } text-white p-3 rounded-lg shadow-2xl border max-w-xs backdrop-blur-sm`}
            >
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
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 pt-2 border-t border-white/20"
                >
                  <div className="text-xs flex items-center gap-1">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                    <span>New time: {dragState.snapTarget.time}</span>
                  </div>
                  {dragState.conflictingAppointments.length > 0 && showConflicts && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-red-200 mt-1 flex items-center gap-1"
                    >
                      <motion.span
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                      >
                        ⚠️
                      </motion.span>
                      Conflicts with {dragState.conflictingAppointments.length} appointment(s)
                    </motion.div>
                  )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Appointment Preview Tooltip */}
      <AnimatePresence>
        {appointmentPreview.visible && appointmentPreview.appointment && !dragState.isDragging && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ duration: 0.2 }}
            className="fixed pointer-events-none z-50"
            style={{
              left: appointmentPreview.position.x + 10,
              top: appointmentPreview.position.y - 10,
              transform: 'translateY(-100%)'
            }}
          >
            <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-2xl border border-gray-700 max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                  appointmentPreview.appointment.status === 'confirmed' ? 'bg-green-500' :
                  appointmentPreview.appointment.status === 'pending' ? 'bg-yellow-500' :
                  appointmentPreview.appointment.status === 'completed' ? 'bg-blue-500' :
                  'bg-red-500'
                }`} />
                <span className="font-semibold text-sm">{appointmentPreview.appointment.service}</span>
              </div>

              <div className="space-y-1 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{appointmentPreview.appointment.client}</span>
                </div>

                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{appointmentPreview.appointment.startTime} - {appointmentPreview.appointment.endTime}</span>
                </div>

                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M13 16h-1a2 2 0 01-2-2V7a2 2 0 012-2h1m0 11V7m0 11a2 2 0 002-2V7a2 2 0 00-2-2m0 0H9a2 2 0 00-2 2v7a2 2 0 002 2" />
                  </svg>
                  <span>{appointmentPreview.appointment.barber}</span>
                </div>

                <div className="flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                  <span>${appointmentPreview.appointment.price}</span>
                </div>

                {appointmentPreview.appointment.notes && (
                  <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-700">
                    <svg className="w-3 h-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-gray-400">{appointmentPreview.appointment.notes}</span>
                  </div>
                )}
              </div>

              <div className="mt-2 text-xs text-gray-500">
                {appointmentPreview.appointment.duration} minutes
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Animation */}
      <AnimatePresence>
        {successAnimation.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{ type: "spring", damping: 15, stiffness: 300 }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", damping: 10 }}
                className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <span className="font-medium">Appointment moved successfully!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced global styles for drag and drop visual feedback */}
      <style jsx global>{`
        .calendar-container [data-time-slot] {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .calendar-container [data-time-slot]:hover {
          background-color: rgba(139, 92, 246, 0.1);
          transform: translateY(-1px);
        }

        .calendar-container [data-time-slot].drop-target-valid {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(139, 92, 246, 0.2));
          border: 2px solid rgb(34, 197, 94);
          box-shadow:
            inset 0 0 0 1px rgba(34, 197, 94, 0.5),
            0 4px 12px rgba(34, 197, 94, 0.3),
            0 0 0 4px rgba(34, 197, 94, 0.1);
          animation: validPulse 2s infinite;
        }

        .calendar-container [data-time-slot].drop-target-invalid {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2));
          border: 2px solid rgb(239, 68, 68);
          box-shadow:
            inset 0 0 0 1px rgba(239, 68, 68, 0.5),
            0 4px 12px rgba(239, 68, 68, 0.3),
            0 0 0 4px rgba(239, 68, 68, 0.1);
          animation: invalidShake 0.6s ease-in-out;
        }

        .calendar-container [data-time-slot].drop-target-valid::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(34, 197, 94, 0.4),
            transparent
          );
          animation: shimmer 2s infinite;
        }

        @keyframes validPulse {
          0%, 100% {
            box-shadow:
              inset 0 0 0 1px rgba(34, 197, 94, 0.5),
              0 4px 12px rgba(34, 197, 94, 0.3),
              0 0 0 4px rgba(34, 197, 94, 0.1);
          }
          50% {
            box-shadow:
              inset 0 0 0 1px rgba(34, 197, 94, 0.8),
              0 8px 20px rgba(34, 197, 94, 0.4),
              0 0 0 8px rgba(34, 197, 94, 0.2);
          }
        }

        @keyframes invalidShake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-3px) rotateZ(-1deg); }
          20%, 40%, 60%, 80% { transform: translateX(3px) rotateZ(1deg); }
        }

        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .calendar-container .appointment-block {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          cursor: ${enableDragDrop ? 'grab' : 'pointer'};
          touch-action: none;
          -webkit-touch-callout: none;
          -webkit-user-select: none;
          position: relative;
          overflow: hidden;
        }

        .calendar-container .appointment-block:hover {
          transform: ${enableDragDrop ? 'scale(1.02) translateY(-2px)' : 'scale(1.05) translateY(-2px)'};
          box-shadow:
            0 10px 30px rgba(0, 0, 0, 0.2),
            0 4px 8px rgba(0, 0, 0, 0.1);
          z-index: 10;
        }

        .calendar-container .appointment-block:hover::after {
          content: '';
          position: absolute;
          top: 50%;
          right: 4px;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          opacity: ${enableDragDrop ? 1 : 0};
          transition: opacity 0.2s ease;
        }

        .calendar-container .appointment-block:hover::before {
          content: '⋮⋮';
          position: absolute;
          top: 50%;
          right: 6px;
          transform: translateY(-50%);
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
          line-height: 1;
          opacity: ${enableDragDrop ? 1 : 0};
          transition: opacity 0.2s ease;
          z-index: 1;
        }

        .calendar-container .appointment-block {
          position: relative;
        }

        .calendar-container .appointment-block::after {
          content: '🖱️';
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 10px;
          opacity: ${enableDragDrop ? 0.7 : 0};
          transition: opacity 0.2s ease;
          pointer-events: none;
        }

        .calendar-container .appointment-block:active {
          cursor: ${enableDragDrop ? 'grabbing' : 'pointer'};
          transform: scale(0.98) translateY(1px);
        }

        .calendar-container .appointment-block.dragging {
          opacity: 0.3;
          transform: scale(0.95);
          touch-action: none;
          filter: blur(1px);
        }

        .calendar-container .appointment-block.dragging::after,
        .calendar-container .appointment-block.dragging::before {
          display: none;
        }

        /* Enhanced touch-specific styles */
        @media (pointer: coarse) {
          .calendar-container .appointment-block {
            min-height: 44px;
          }

          .calendar-container [data-time-slot] {
            min-height: 40px;
          }

          .calendar-container .appointment-block:hover {
            transform: ${enableDragDrop ? 'scale(1.05)' : 'scale(1.08)'};
          }
        }

        /* Prevent body scroll when dragging on mobile */
        body.dragging-active {
          overflow: hidden;
          position: fixed;
          width: 100%;
        }

        /* Loading state for appointments */
        .calendar-container .appointment-block.loading {
          opacity: 0.6;
          animation: loadingPulse 1.5s infinite;
        }

        @keyframes loadingPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        /* Success state animation */
        .calendar-container .appointment-block.success {
          animation: successBounce 0.6s ease-out;
        }

        @keyframes successBounce {
          0% { transform: scale(1); }
          25% { transform: scale(1.05); }
          50% { transform: scale(0.95); }
          75% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }

        /* Enhanced smooth animations */
        .calendar-container * {
          transition-property: background-color, border-color, transform, box-shadow, opacity;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 300ms;
        }
      `}</style>

      {/* Appointment Move Confirmation Modal */}
      {pendingMove && (
        <AppointmentMoveConfirmation
          isOpen={isConfirmationOpen}
          onClose={() => {
            setIsConfirmationOpen(false)
            setPendingMove(null)
          }}
          onConfirm={handleConfirmedMove}
          appointment={{
            id: pendingMove.appointment.id,
            client: pendingMove.appointment.client,
            clientPhone: pendingMove.appointment.clientPhone,
            clientEmail: pendingMove.appointment.clientEmail,
            service: pendingMove.appointment.service,
            barber: pendingMove.appointment.barber,
            originalDate: pendingMove.appointment.date,
            originalTime: pendingMove.appointment.startTime,
            newDate: pendingMove.newDate,
            newTime: pendingMove.newTime,
            duration: pendingMove.appointment.duration
          }}
          isLoading={isSaving}
        />
      )}

      {/* Conflict Resolution Modal */}
      {dragState.draggedAppointment && conflictState.isResolutionOpen && (
        <ConflictResolutionModal
          isOpen={conflictState.isResolutionOpen}
          onClose={() => setConflictState({ ...conflictState, isResolutionOpen: false })}
          conflictingAppointments={conflictState.conflictingAppointments}
          draggedAppointment={{
            id: dragState.draggedAppointment.id,
            client: dragState.draggedAppointment.client,
            service: dragState.draggedAppointment.service,
            barber: dragState.draggedAppointment.barber,
            duration: dragState.draggedAppointment.duration,
            originalDate: dragState.draggedAppointment.date,
            originalTime: dragState.draggedAppointment.startTime
          }}
          targetDate={conflictState.targetDate}
          targetTime={conflictState.targetTime}
          suggestions={conflictState.suggestions}
          onResolveConflict={handleConflictResolution}
          isLoading={isSaving}
        />
      )}
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
    currentPosition: { x: 0, y: 0 },
    dropTarget: null,
    conflictingAppointments: [],
    snapTarget: null,
    isValidDrop: true,
    snapGuides: { x: 0, y: 0, visible: false },
    dragHandle: { visible: false, appointmentId: null }
  })

  const startDrag = useCallback((appointment: CalendarAppointment, offset: { x: number; y: number }) => {
    setDragState({
      isDragging: true,
      draggedAppointment: appointment,
      dragOffset: offset,
      currentPosition: { x: 0, y: 0 },
      dropTarget: null,
      conflictingAppointments: [],
      snapTarget: null,
      isValidDrop: true,
      snapGuides: { x: 0, y: 0, visible: false },
      dragHandle: { visible: false, appointmentId: null }
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
      currentPosition: { x: 0, y: 0 },
      dropTarget: null,
      conflictingAppointments: [],
      snapTarget: null,
      isValidDrop: true,
      snapGuides: { x: 0, y: 0, visible: false },
      dragHandle: { visible: false, appointmentId: null }
    })
  }, [dragState.draggedAppointment, onAppointmentMove])

  return {
    dragState,
    startDrag,
    updateDrag,
    endDrag
  }
}
