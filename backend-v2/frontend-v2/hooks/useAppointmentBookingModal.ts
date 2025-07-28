'use client'

import { useState, useCallback, useEffect } from 'react'
import { type User } from '@/lib/api'

export interface AppointmentBookingModalState {
  isOpen: boolean
  selectedDate?: Date
  selectedTime?: string
  selectedBarber?: User
  existingAppointments?: any[]
}

export interface UseAppointmentBookingModalOptions {
  onAppointmentCreated?: (appointment: any) => void
  defaultDate?: Date
  defaultBarber?: User
}

export function useAppointmentBookingModal({
  onAppointmentCreated,
  defaultDate,
  defaultBarber
}: UseAppointmentBookingModalOptions = {}) {
  const [modalState, setModalState] = useState<AppointmentBookingModalState>({
    isOpen: false,
    selectedDate: defaultDate,
    selectedBarber: defaultBarber,
    existingAppointments: []
  })

  // Open modal with optional pre-selected values
  const openModal = useCallback((options?: Partial<AppointmentBookingModalState>) => {
    setModalState(prev => ({
      ...prev,
      isOpen: true,
      ...options
    }))
  }, [])

  // Close modal and reset state
  const closeModal = useCallback(() => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
      selectedTime: undefined
    }))
  }, [])

  // Open modal for specific time slot
  const openForTimeSlot = useCallback((date: Date, time: string, barber?: User) => {
    openModal({
      selectedDate: date,
      selectedTime: time,
      selectedBarber: barber
    })
  }, [openModal])

  // Update existing appointments (for conflict detection)
  const updateAppointments = useCallback((appointments: any[]) => {
    setModalState(prev => ({
      ...prev,
      existingAppointments: appointments
    }))
  }, [])

  // Handle appointment creation success
  const handleAppointmentCreated = useCallback((appointment: any) => {
    onAppointmentCreated?.(appointment)
    closeModal()
  }, [onAppointmentCreated, closeModal])

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && modalState.isOpen) {
        closeModal()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [modalState.isOpen, closeModal])

  return {
    modalState,
    openModal,
    closeModal,
    openForTimeSlot,
    updateAppointments,
    handleAppointmentCreated,
    isOpen: modalState.isOpen
  }
}