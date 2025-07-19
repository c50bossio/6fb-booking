'use client'

import { useCallback, useMemo } from 'react'
import { isSameDay } from 'date-fns'
import type { BookingResponse } from '@/lib/api'

interface Appointment extends BookingResponse {
  height?: number
}

interface DragState {
  draggedAppointment: Appointment | null
  dragOverSlot: { day: Date; hour: number; minute: number } | null
  dragOverDay: number | null
  isDragging: boolean
  dropSuccess: { day: Date; hour: number; minute: number } | null
}

interface UseDragAndDropProps {
  dragState: DragState
  updateDragState: (updates: Partial<DragState>) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => void
  checkAndUpdateAppointment: (appointmentId: number, newStartTime: string, isDragDrop: boolean) => void
}

export function useCalendarDragAndDrop({
  dragState,
  updateDragState,
  onAppointmentUpdate,
  checkAndUpdateAppointment
}: UseDragAndDropProps) {
  const handleDragOver = useCallback((e: React.DragEvent, day: Date, hour: number, minute: number) => {
    e.preventDefault() // Always prevent default to allow drop
    if (dragState.draggedAppointment) {
      e.dataTransfer.dropEffect = 'move'
      updateDragState({ dragOverSlot: { day, hour, minute } })
    }
  }, [dragState.draggedAppointment, updateDragState])

  const handleDragLeave = useCallback(() => {
    updateDragState({ dragOverSlot: null })
  }, [updateDragState])

  const handleDragStart = useCallback((e: React.DragEvent, appointment: Appointment) => {
    try {
      if (appointment.status !== 'completed' && appointment.status !== 'cancelled') {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', appointment.id.toString())
        
        // Add drag image
        const dragImage = e.currentTarget as HTMLElement
        e.dataTransfer.setDragImage(dragImage, dragImage.offsetWidth / 2, dragImage.offsetHeight / 2)
        
        updateDragState({ 
          draggedAppointment: appointment, 
          isDragging: true 
        })
      } else {
        e.preventDefault()
      }
    } catch (error) {
      }
  }, [updateDragState])

  const handleDragEnd = useCallback(() => {
    updateDragState({ 
      draggedAppointment: null, 
      dragOverSlot: null, 
      isDragging: false 
    })
  }, [updateDragState])

  const handleDrop = useCallback((e: React.DragEvent, day: Date, hour: number, minute: number) => {
    try {
      e.preventDefault()
      const draggedApp = dragState.draggedAppointment // Store reference before clearing
      
      if (draggedApp && onAppointmentUpdate) {
        const newDate = new Date(day)
        newDate.setHours(hour, minute, 0, 0)
        
        // Check if the new time is valid (not in the past for today)
        const now = new Date()
        const isToday = isSameDay(day, now)
        if (!isToday || newDate > now) {
          // Show success animation
          updateDragState({ 
            dropSuccess: { day, hour, minute },
            draggedAppointment: null,
            dragOverSlot: null,
            isDragging: false
          })
          
          setTimeout(() => {
            updateDragState({ dropSuccess: null })
          }, 600)
          
          // Use the stored reference for the update - this is a drag & drop operation
          checkAndUpdateAppointment(draggedApp.id, newDate.toISOString(), true)
        } else {
          // Clear drag state
          updateDragState({ 
            draggedAppointment: null,
            dragOverSlot: null,
            isDragging: false
          })
        }
      } else {
        // Clear drag state
        updateDragState({ 
          draggedAppointment: null,
          dragOverSlot: null,
          isDragging: false
        })
      }
    } catch (error) {
      // Clear drag state on error
      updateDragState({ 
        draggedAppointment: null,
        dragOverSlot: null,
        isDragging: false
      })
    }
  }, [dragState.draggedAppointment, onAppointmentUpdate, checkAndUpdateAppointment, updateDragState])

  return useMemo(() => ({
    handleDragOver,
    handleDragLeave,
    handleDragStart,
    handleDragEnd,
    handleDrop
  }), [handleDragOver, handleDragLeave, handleDragStart, handleDragEnd, handleDrop])
}