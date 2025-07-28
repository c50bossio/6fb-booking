'use client'

/**
 * Calendar Drag & Drop Utilities
 * Provides drag-and-drop functionality for appointment scheduling and rescheduling
 */

import { useState, useRef, useCallback } from 'react'

export interface DraggedAppointment {
  id: number
  service_name: string
  client_name: string
  appointment_date: string
  start_time: string
  end_time?: string
  duration?: number
  barber_name?: string
}

export interface DropZone {
  date: Date
  time: string
  isValid: boolean
  conflicts?: DraggedAppointment[]
}

export interface DragDropState {
  isDragging: boolean
  draggedAppointment: DraggedAppointment | null
  dragOffset: { x: number; y: number }
  dropZones: DropZone[]
  hoveredDropZone: DropZone | null
}

export interface DragDropCallbacks {
  onDragStart: (appointment: DraggedAppointment, event: React.DragEvent) => void
  onDragEnd: (appointment: DraggedAppointment, dropZone: DropZone | null) => void
  onDrop: (appointment: DraggedAppointment, newDate: Date, newTime: string) => Promise<boolean>
  onConflictDetected: (appointment: DraggedAppointment, conflicts: DraggedAppointment[]) => void
}

/**
 * Hook for managing calendar drag and drop state
 */
export function useCalendarDragDrop(
  appointments: DraggedAppointment[],
  callbacks: DragDropCallbacks
) {
  const [dragState, setDragState] = useState<DragDropState>({
    isDragging: false,
    draggedAppointment: null,
    dragOffset: { x: 0, y: 0 },
    dropZones: [],
    hoveredDropZone: null
  })

  const dragImageRef = useRef<HTMLDivElement>(null)

  // Start dragging an appointment
  const handleDragStart = useCallback((appointment: DraggedAppointment, event: React.DragEvent) => {
    // Create drag image
    if (dragImageRef.current) {
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const dragImage = dragImageRef.current
      dragImage.innerHTML = `
        <div class="bg-teal-100 text-teal-800 p-2 rounded shadow-lg border border-teal-300 max-w-xs">
          <div class="font-medium text-sm">${appointment.service_name}</div>
          <div class="text-xs">${appointment.client_name}</div>
        </div>
      `
      event.dataTransfer.setDragImage(dragImage, 50, 25)
    }

    // Set drag data
    event.dataTransfer.setData('application/json', JSON.stringify(appointment))
    event.dataTransfer.effectAllowed = 'move'

    setDragState(prev => ({
      ...prev,
      isDragging: true,
      draggedAppointment: appointment,
      dragOffset: {
        x: event.clientX - (event.target as HTMLElement).getBoundingClientRect().left,
        y: event.clientY - (event.target as HTMLElement).getBoundingClientRect().top
      }
    }))

    callbacks.onDragStart(appointment, event)
  }, [callbacks])

  // Handle drag over (for visual feedback)
  const handleDragOver = useCallback((event: React.DragEvent, dropZone: DropZone) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = dropZone.isValid ? 'move' : 'none'

    setDragState(prev => ({
      ...prev,
      hoveredDropZone: dropZone
    }))
  }, [])

  // Handle drop
  const handleDrop = useCallback(async (event: React.DragEvent, dropZone: DropZone) => {
    event.preventDefault()

    const appointmentData = event.dataTransfer.getData('application/json')
    if (!appointmentData) return

    const appointment: DraggedAppointment = JSON.parse(appointmentData)

    // Check if drop zone is valid
    if (!dropZone.isValid) {
      console.warn('Invalid drop zone')
      return
    }

    // Check for conflicts
    if (dropZone.conflicts && dropZone.conflicts.length > 0) {
      callbacks.onConflictDetected(appointment, dropZone.conflicts)
      return
    }

    // Attempt to reschedule appointment
    const success = await callbacks.onDrop(appointment, dropZone.date, dropZone.time)

    if (success) {
      console.log('Appointment rescheduled successfully')
    } else {
      console.error('Failed to reschedule appointment')
    }

    // Reset drag state
    setDragState(prev => ({
      ...prev,
      isDragging: false,
      draggedAppointment: null,
      hoveredDropZone: null
    }))
  }, [callbacks])

  // Handle drag end
  const handleDragEnd = useCallback((event: React.DragEvent) => {
    const appointment = dragState.draggedAppointment
    const dropZone = dragState.hoveredDropZone

    callbacks.onDragEnd(appointment!, dropZone)

    setDragState(prev => ({
      ...prev,
      isDragging: false,
      draggedAppointment: null,
      hoveredDropZone: null
    }))
  }, [callbacks, dragState.draggedAppointment, dragState.hoveredDropZone])

  // Generate valid drop zones based on current calendar view
  const generateDropZones = useCallback((
    viewType: 'month' | 'week' | 'day',
    currentDate: Date,
    workingHours: { start: string; end: string } = { start: '09:00', end: '17:00' }
  ): DropZone[] => {
    const dropZones: DropZone[] = []

    switch (viewType) {
      case 'month':
        // Generate drop zones for each day in the month view
        const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        
        for (let date = new Date(monthStart); date <= monthEnd; date.setDate(date.getDate() + 1)) {
          // Skip weekends if needed
          if (date.getDay() === 0 || date.getDay() === 6) continue

          dropZones.push({
            date: new Date(date),
            time: workingHours.start,
            isValid: true,
            conflicts: checkTimeSlotConflicts(new Date(date), workingHours.start, appointments)
          })
        }
        break

      case 'week':
        // Generate drop zones for each time slot in the week
        const weekStart = new Date(currentDate)
        weekStart.setDate(currentDate.getDate() - currentDate.getDay())

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          const date = new Date(weekStart)
          date.setDate(weekStart.getDate() + dayOffset)

          // Skip weekends if needed
          if (date.getDay() === 0 || date.getDay() === 6) continue

          // Generate time slots for the day
          const timeSlots = generateTimeSlots(workingHours.start, workingHours.end, 30)
          timeSlots.forEach(time => {
            dropZones.push({
              date: new Date(date),
              time,
              isValid: true,
              conflicts: checkTimeSlotConflicts(new Date(date), time, appointments)
            })
          })
        }
        break

      case 'day':
        // Generate drop zones for each time slot in the day
        const timeSlots = generateTimeSlots(workingHours.start, workingHours.end, 30)
        timeSlots.forEach(time => {
          dropZones.push({
            date: new Date(currentDate),
            time,
            isValid: true,
            conflicts: checkTimeSlotConflicts(new Date(currentDate), time, appointments)
          })
        })
        break
    }

    return dropZones
  }, [appointments])

  return {
    dragState,
    dragImageRef,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    generateDropZones
  }
}

/**
 * Generate time slots for a given time range
 */
function generateTimeSlots(startTime: string, endTime: string, intervalMinutes: number): string[] {
  const slots: string[] = []
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  let currentHour = startHour
  let currentMinute = startMinute

  while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
    slots.push(`${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`)

    currentMinute += intervalMinutes
    if (currentMinute >= 60) {
      currentMinute -= 60
      currentHour += 1
    }
  }

  return slots
}

/**
 * Check for appointment conflicts in a specific time slot
 */
function checkTimeSlotConflicts(
  date: Date,
  time: string,
  appointments: DraggedAppointment[]
): DraggedAppointment[] {
  const targetDateTime = new Date(date)
  const [hour, minute] = time.split(':').map(Number)
  targetDateTime.setHours(hour, minute, 0, 0)

  return appointments.filter(apt => {
    const aptDate = new Date(apt.appointment_date)
    const aptStartTime = new Date(apt.start_time)
    
    // Check if appointment is on the same date
    if (aptDate.toDateString() !== date.toDateString()) {
      return false
    }

    // Check if there's a time conflict (within 30 minutes)
    const timeDiff = Math.abs(aptStartTime.getTime() - targetDateTime.getTime())
    return timeDiff < 30 * 60 * 1000 // 30 minutes in milliseconds
  })
}

/**
 * Utility for creating draggable appointment props
 */
export function createDraggableProps(
  appointment: DraggedAppointment,
  onDragStart: (appointment: DraggedAppointment, event: React.DragEvent) => void
) {
  return {
    draggable: true,
    onDragStart: (event: React.DragEvent) => onDragStart(appointment, event),
    className: 'cursor-move hover:opacity-80 transition-opacity',
    title: `Drag to reschedule: ${appointment.service_name} - ${appointment.client_name}`
  }
}

/**
 * Utility for creating drop zone props
 */
export function createDropZoneProps(
  dropZone: DropZone,
  onDragOver: (event: React.DragEvent, dropZone: DropZone) => void,
  onDrop: (event: React.DragEvent, dropZone: DropZone) => void,
  isHovered: boolean = false
) {
  return {
    onDragOver: (event: React.DragEvent) => onDragOver(event, dropZone),
    onDrop: (event: React.DragEvent) => onDrop(event, dropZone),
    className: `
      transition-colors duration-200
      ${dropZone.isValid ? 'cursor-copy' : 'cursor-not-allowed'}
      ${isHovered && dropZone.isValid ? 'bg-teal-50 border-teal-300' : ''}
      ${isHovered && !dropZone.isValid ? 'bg-red-50 border-red-300' : ''}
      ${dropZone.conflicts && dropZone.conflicts.length > 0 ? 'border-yellow-300 bg-yellow-50' : ''}
    `.trim(),
    'data-drop-zone': true,
    'data-date': dropZone.date.toISOString(),
    'data-time': dropZone.time,
    'data-valid': dropZone.isValid
  }
}