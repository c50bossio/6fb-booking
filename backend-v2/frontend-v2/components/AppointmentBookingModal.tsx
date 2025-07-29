'use client'

import React, { useState, useEffect, useCallback, memo, useMemo } from 'react'
import { format, parseISO, addMinutes, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns'
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'

import { ModalLayout } from '@/components/calendar/shared/ModalLayout'
import { ServiceSelector } from '@/components/calendar/shared/ServiceSelector'
import { BarberSelector } from '@/components/calendar/shared/BarberSelector'
import { ClientSelector } from '@/components/calendar/shared/ClientSelector'
import { DateTimePicker } from '@/components/calendar/shared/DateTimePicker'
import { useAppointmentForm, useTimeSlots } from '@/components/calendar/hooks/useAppointmentForm'
import { useAppointmentServices } from '@/components/calendar/hooks/useAppointmentServices'
import { useConflictDetection } from '@/hooks/useBarberAvailability'
import { 
  appointmentsAPI, 
  type Service, 
  type Client, 
  type User, 
  type TimeSlot,
  type AppointmentCreate,
  type EnhancedAppointmentCreate
} from '@/lib/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/LoadingStates'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

// Enhanced interfaces for this component
interface AppointmentBookingModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: Date
  selectedTime?: string
  selectedBarber?: User
  existingAppointments?: any[]
  onAppointmentCreated?: (appointment: any) => void
  className?: string
  isDemo?: boolean
  isPublicBooking?: boolean
}

interface AvailableTimeSlot extends TimeSlot {
  id: string
  conflicts?: any[]
  isRecommended?: boolean
  nextAvailable?: boolean
}

interface FormValidationErrors {
  client?: string
  service?: string
  date?: string
  time?: string
  barber?: string
  notes?: string
  general?: string
}

export const AppointmentBookingModal = memo(function AppointmentBookingModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  selectedBarber,
  existingAppointments = [],
  onAppointmentCreated,
  className,
  isDemo = false,
  isPublicBooking = false
}: AppointmentBookingModalProps) {
  // Form state management
  const {
    formData,
    updateField,
    validate,
    isValid,
    reset,
    getError
  } = useAppointmentForm({
    initialData: {
      date: selectedDate || null,
      time: selectedTime || null,
      barber: selectedBarber || null
    }
  })

  // Services and barbers data - Use public booking mode for demo
  const { services: apiServices, loadingServices: apiLoadingServices, loadServices } = useAppointmentServices({
    isPublicBooking: isDemo || isPublicBooking,
    isDemo: isDemo
  })
  
  // Mock data for demo mode
  const mockServices = useMemo(() => [
    { id: 1, name: 'Haircut', duration_minutes: 30, base_price: 25, description: 'Classic haircut' },
    { id: 2, name: 'Beard Trim', duration_minutes: 15, base_price: 15, description: 'Professional beard trimming' },
    { id: 3, name: 'Full Service', duration_minutes: 45, base_price: 40, description: 'Haircut + beard trim' }
  ], [])
  
  // Use mock data in demo mode, API data otherwise
  const services = isDemo ? mockServices : apiServices
  const loadingServices = isDemo ? false : apiLoadingServices
  
  const [barbers, setBarbers] = useState<User[]>([])
  const [loadingBarbers, setLoadingBarbers] = useState(false)

  // Available time slots
  const { slots: availableSlots, loading: loadingSlots, loadSlots } = useTimeSlots()
  const [enhancedSlots, setEnhancedSlots] = useState<AvailableTimeSlot[]>([])

  // Conflict detection - Stabilize existingAppointments to prevent infinite re-renders
  const stableExistingAppointments = useMemo(() => existingAppointments || [], [existingAppointments?.length, existingAppointments])
  const { detectConflictsForAppointment, wouldCreateConflict } = useConflictDetection(stableExistingAppointments)

  // Form validation and submission
  const [validationErrors, setValidationErrors] = useState<FormValidationErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)

  // Stable functions to prevent infinite re-renders
  const stableLoadServices = useCallback(() => {
    // For demo mode, we use mock data above, no API calls needed
    if (!isDemo) {
      loadServices()
    }
  }, [isDemo, loadServices])

  const stableLoadBarbers = useCallback(async () => {
    if (isDemo || isPublicBooking) {
      // Use mock barbers for demo
      setBarbers([
        { id: 1, name: 'Marcus Rodriguez', email: 'marcus@demo.com', role: 'barber' },
        { id: 2, name: 'Diego Santos', email: 'diego@demo.com', role: 'barber' }
      ])
      return
    }
    
    // Real API call for authenticated mode - implement actual barber loading
    try {
      setLoadingBarbers(true)
      // This would be your actual API call to get barbers
      // const response = await fetchAPI('/api/v2/users/barbers')
      // setBarbers(response.barbers || [])
      setBarbers([]) // Placeholder for now
    } catch (error) {
      console.error('Failed to load barbers:', error)
      setBarbers([])
    } finally {
      setLoadingBarbers(false)
    }
  }, [isDemo, isPublicBooking])

  // Load initial data - Stabilized to prevent infinite loops
  useEffect(() => {
    if (isOpen) {
      stableLoadServices()
      stableLoadBarbers()
    }
  }, [isOpen, stableLoadServices, stableLoadBarbers])

  // Load available slots when date/service changes - Stabilized dependency array
  useEffect(() => {
    if (formData.date && formData.service) {
      loadSlots(formData.date, formData.service.id.toString(), formData.barber?.id?.toString())
    }
  }, [formData.date, formData.service?.id, formData.barber?.id])

  // Enhance slots with conflict detection - Optimized to prevent infinite re-renders
  const enhancedSlotsData = useMemo(() => {
    if (availableSlots.length === 0 || !formData.date || !formData.service) {
      return []
    }

    return availableSlots.map((slot, index) => {
      const slotDateTime = new Date(`${format(formData.date!, 'yyyy-MM-dd')}T${slot.time}`)
      const conflicts = wouldCreateConflict(
        Date.now(), // temporary ID
        slotDateTime,
        slot.time,
        formData.service?.duration_minutes || 60
      )

      return {
        ...slot,
        id: `slot-${index}`,
        conflicts,
        isRecommended: slot.is_next_available || (index < 3 && conflicts.length === 0),
        nextAvailable: slot.is_next_available
      }
    })
  }, [
    availableSlots, 
    formData.date, 
    formData.service?.id, 
    formData.service?.duration_minutes,
    stableExistingAppointments
  ])

  // Update enhanced slots when data changes
  useEffect(() => {
    setEnhancedSlots(enhancedSlotsData)
  }, [enhancedSlotsData])

  // Load barbers
  const loadBarbers = useCallback(async () => {
    try {
      setLoadingBarbers(true)
      // This would be your actual API call to get barbers
      // const response = await fetchAPI('/api/v2/users/barbers')
      // setBarbers(response.barbers || [])
      setBarbers([]) // Placeholder
    } catch (error) {
      console.error('Failed to load barbers:', error)
      toast({
        title: 'Error',
        description: 'Failed to load available barbers',
        variant: 'destructive'
      })
    } finally {
      setLoadingBarbers(false)
    }
  }, [])

  // Form validation - Optimized with stable dependencies
  const validateForm = useCallback((): boolean => {
    const errors: FormValidationErrors = {}

    if (!formData.service) {
      errors.service = 'Please select a service'
    }

    if (!formData.date) {
      errors.date = 'Please select a date'
    } else if (isBefore(formData.date, startOfDay(new Date()))) {
      errors.date = 'Date cannot be in the past'
    }

    if (!formData.time) {
      errors.time = 'Please select a time'
    }

    if (!formData.client) {
      errors.client = 'Please select or create a client'
    }

    if (formData.notes && formData.notes.length > 500) {
      errors.notes = 'Notes cannot exceed 500 characters'
    }

    // Check for conflicts
    if (formData.date && formData.time && formData.service) {
      const appointmentDateTime = new Date(`${format(formData.date, 'yyyy-MM-dd')}T${formData.time}`)
      const conflicts = wouldCreateConflict(
        Date.now(),
        appointmentDateTime,
        formData.time,
        formData.service.duration_minutes
      )

      if (conflicts.length > 0) {
        const criticalConflicts = conflicts.filter(c => c.severity === 'critical')
        if (criticalConflicts.length > 0) {
          errors.time = 'This time slot conflicts with existing appointments'
        }
      }
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }, [
    formData.service?.id,
    formData.date,
    formData.time,
    formData.client?.id,
    formData.notes,
    formData.service?.duration_minutes,
    wouldCreateConflict
  ])

  // Handle modal close (moved before handleSubmit to avoid TDZ issue)
  const handleClose = useCallback(() => {
    reset()
    setValidationErrors({})
    setShowAdvancedOptions(false)
    onClose()
  }, [reset, onClose])

  // Handle form submission - Optimized with stable dependencies
  const handleSubmit = useCallback(async () => {
    if (!validateForm()) {
      return
    }

    try {
      setSubmitting(true)

      if (isDemo) {
        // Demo mode - simulate successful appointment creation
        const demoAppointment = {
          id: Date.now(),
          client_name: formData.client?.name || 'Demo Client',
          service_name: formData.service!.name,
          start_time: `${format(formData.date!, 'yyyy-MM-dd')}T${formData.time!}:00`,
          end_time: `${format(formData.date!, 'yyyy-MM-dd')}T${formData.time!}:00`,
          barber_name: formData.barber?.name || 'Demo Barber',
          status: 'confirmed'
        }

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000))

        toast({
          title: 'Demo Success',
          description: 'Demo appointment created successfully (not saved)',
          variant: 'default'
        })

        onAppointmentCreated?.(demoAppointment)
        handleClose()
        return
      }

      // Real API call for non-demo mode
      const appointmentData: EnhancedAppointmentCreate = {
        client_id: formData.client!.id,
        service_id: formData.service!.id,
        barber_id: formData.barber?.id,
        appointment_date: format(formData.date!, 'yyyy-MM-dd'),
        appointment_time: formData.time!,
        duration_minutes: formData.service!.duration_minutes,
        price: formData.service!.base_price,
        notes: formData.notes || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }

      const response = await appointmentsAPI.createEnhanced(appointmentData)

      toast({
        title: 'Success',
        description: 'Appointment created successfully',
        variant: 'default'
      })

      onAppointmentCreated?.(response)
      handleClose()

    } catch (error: any) {
      console.error('Failed to create appointment:', error)
      
      const errorMessage = error?.response?.data?.detail || 
                          error?.message || 
                          'Failed to create appointment'
      
      setValidationErrors({
        general: errorMessage
      })

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }, [
    isDemo,
    formData.client?.id,
    formData.service?.id,
    formData.service?.duration_minutes,
    formData.service?.base_price,
    formData.barber?.id,
    formData.date,
    formData.time,
    formData.notes,
    validateForm,
    onAppointmentCreated,
    handleClose
  ])

  // Time slot selection (moved before useEffect to avoid TDZ issue)
  const handleTimeSlotSelect = useCallback((slot: AvailableTimeSlot) => {
    updateField('time', slot.time)
  }, [updateField])

  // Keyboard navigation for time slots - Optimized to prevent re-renders
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen || enhancedSlots.length === 0) return

    const currentIndex = enhancedSlots.findIndex(slot => slot.time === formData.time)
    let newIndex = -1

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault()
        newIndex = currentIndex < enhancedSlots.length - 1 ? currentIndex + 1 : 0
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault()
        newIndex = currentIndex > 0 ? currentIndex - 1 : enhancedSlots.length - 1
        break
      case 'Enter':
      case ' ':
        if (currentIndex >= 0) {
          event.preventDefault()
          const slot = enhancedSlots[currentIndex]
          if (slot.available && !slot.conflicts?.some(c => c.severity === 'critical')) {
            handleTimeSlotSelect(slot)
          }
        }
        break
    }

    if (newIndex >= 0) {
      const newSlot = enhancedSlots[newIndex]
      if (newSlot.available && !newSlot.conflicts?.some(c => c.severity === 'critical')) {
        updateField('time', newSlot.time)
      }
    }
  }, [isOpen, enhancedSlots, formData.time, updateField, handleTimeSlotSelect])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Computed values
  const selectedSlot = useMemo(() => {
    return enhancedSlots.find(slot => slot.time === formData.time)
  }, [enhancedSlots, formData.time])

  const hasConflicts = useMemo(() => {
    return selectedSlot?.conflicts && selectedSlot.conflicts.length > 0
  }, [selectedSlot])

  const canSubmit = useMemo(() => {
    return isValid && !submitting && Object.keys(validationErrors).length === 0
  }, [isValid, submitting, validationErrors])

  // Render time slots grid
  const renderTimeSlots = () => {
    if (loadingSlots) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-2 text-gray-600">Loading available times...</span>
        </div>
      )
    }

    if (enhancedSlots.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <ClockIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
          <p>No available time slots</p>
          <p className="text-sm">Try selecting a different date or service</p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
        {enhancedSlots.map((slot) => {
          const isSelected = slot.time === formData.time
          const hasConflicts = slot.conflicts && slot.conflicts.length > 0
          const criticalConflicts = slot.conflicts?.filter(c => c.severity === 'critical') || []
          const isDisabled = !slot.available || criticalConflicts.length > 0

          return (
            <button
              key={slot.id}
              type="button"
              role="radio"
              onClick={() => !isDisabled && handleTimeSlotSelect(slot)}
              disabled={isDisabled}
              aria-checked={isSelected}
              aria-label={`Time slot ${format(parseISO(`2000-01-01T${slot.time}`), 'h:mm a')}${isSelected ? ' (selected)' : ''}${isDisabled ? ' (unavailable)' : ''}${slot.isRecommended ? ' (recommended)' : ''}`}
              tabIndex={isSelected ? 0 : -1}
              className={cn(
                'relative p-3 text-sm font-medium rounded-lg border-2 transition-all duration-200',
                'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'touch-manipulation', // iOS optimization
                'min-h-[48px]', // Minimum touch target size
                isSelected && 'border-primary-600 bg-primary-600 text-white shadow-lg',
                !isSelected && !isDisabled && slot.isRecommended && 'border-green-300 bg-green-50 text-green-700 hover:border-green-400',
                !isSelected && !isDisabled && !slot.isRecommended && 'border-gray-300 bg-white text-gray-700 hover:border-gray-400',
                isDisabled && 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-50',
                hasConflicts && !isDisabled && 'border-yellow-300 bg-yellow-50 text-yellow-700'
              )}
            >
              <div className="flex flex-col items-center">
                <span className="font-semibold">
                  {format(parseISO(`2000-01-01T${slot.time}`), 'h:mm a')}
                </span>
                
                {slot.nextAvailable && (
                  <span className="text-xs mt-1 px-2 py-0.5 bg-green-100 text-green-600 rounded-full">
                    Next
                  </span>
                )}
                
                {hasConflicts && !criticalConflicts.length && (
                  <ExclamationTriangleIcon className="w-4 h-4 mt-1 text-yellow-500" aria-hidden="true" />
                )}
                
                {criticalConflicts.length > 0 && (
                  <XMarkIcon className="w-4 h-4 mt-1 text-red-500" aria-hidden="true" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={handleClose}
      title="Book New Appointment"
      description="Schedule an appointment for your client"
      size="3xl"
      className={cn('booking-modal', className)}
      onSubmit={handleSubmit}
      submitLabel="Book Appointment"
      submitDisabled={!canSubmit}
      loading={submitting}
    >
      {/* Screen reader announcement region */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        role="status"
      >
        {loadingSlots && 'Loading available appointment times'}
        {validationErrors.general && `Error: ${validationErrors.general}`}
        {formData.time && formData.date && formData.service && 
          `Selected ${format(parseISO(`2000-01-01T${formData.time}`), 'h:mm a')} on ${format(formData.date, 'MMMM d')} for ${formData.service.name}`
        }
      </div>

      <div className="space-y-6">
        {/* General Error */}
        {validationErrors.general && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-400">
              {validationErrors.general}
            </span>
          </div>
        )}

        {/* Client Selection */}
        <ClientSelector
          selectedClient={formData.client}
          onSelectClient={(client) => updateField('client', client)}
          className={validationErrors.client ? 'border-red-300' : ''}
        />
        {validationErrors.client && (
          <p className="text-sm text-red-600 mt-1">{validationErrors.client}</p>
        )}

        {/* Service Selection */}
        <ServiceSelector
          selectedService={formData.service}
          onSelectService={(service) => updateField('service', service)}
          services={services}
          loadingServices={loadingServices}
          className={validationErrors.service ? 'border-red-300' : ''}
        />
        {validationErrors.service && (
          <p className="text-sm text-red-600 mt-1">{validationErrors.service}</p>
        )}

        {/* Date Selection */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-900 dark:text-white">
            Date *
          </label>
          <DateTimePicker
            selectedDate={formData.date}
            onDateChange={(date) => updateField('date', date)}
            minDate={new Date()}
            className={validationErrors.date ? 'border-red-300' : ''}
          />
          {validationErrors.date && (
            <p className="text-sm text-red-600 mt-1">{validationErrors.date}</p>
          )}
        </div>

        {/* Time Selection */}
        {formData.date && formData.service && (
          <div className="space-y-3">
            <div>
              <label 
                className="text-sm font-semibold text-gray-900 dark:text-white"
                id="time-slots-label"
              >
                Available Times *
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Use arrow keys to navigate, Enter or Space to select
              </p>
            </div>
            <div 
              role="radiogroup" 
              aria-labelledby="time-slots-label"
              aria-describedby={validationErrors.time ? 'time-error' : undefined}
            >
              {renderTimeSlots()}
            </div>
            {validationErrors.time && (
              <p id="time-error" className="text-sm text-red-600 mt-1" role="alert">
                {validationErrors.time}
              </p>
            )}
          </div>
        )}

        {/* Conflict Warning */}
        {hasConflicts && selectedSlot && (
          <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Scheduling Conflicts Detected
              </h4>
              <div className="mt-2 space-y-1">
                {selectedSlot.conflicts?.map((conflict, index) => (
                  <p key={index} className="text-sm text-yellow-700 dark:text-yellow-300">
                    {conflict.description}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Options Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <InformationCircleIcon className="w-4 h-4" />
          {showAdvancedOptions ? 'Hide' : 'Show'} Advanced Options
        </button>

        {/* Advanced Options */}
        {showAdvancedOptions && (
          <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Barber Selection */}
            <BarberSelector
              selectedBarber={formData.barber}
              onSelectBarber={(barber) => updateField('barber', barber)}
              barbers={barbers}
              loadingBarbers={loadingBarbers}
              className={validationErrors.barber ? 'border-red-300' : ''}
            />
            {validationErrors.barber && (
              <p className="text-sm text-red-600 mt-1">{validationErrors.barber}</p>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900 dark:text-white">
                Notes (Optional)
              </label>
              <Input
                as="textarea"
                rows={3}
                placeholder="Add any special notes or requests..."
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                className={cn(
                  'resize-none',
                  validationErrors.notes ? 'border-red-300' : ''
                )}
                maxLength={500}
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>{validationErrors.notes}</span>
                <span>{formData.notes?.length || 0}/500</span>
              </div>
            </div>
          </div>
        )}

        {/* Service Summary */}
        {formData.service && (
          <div className="flex items-center justify-between p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {formData.service.name}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formData.service.duration_minutes} minutes
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
                ${formData.service.base_price}
              </p>
              <p className="text-sm text-gray-500">Base price</p>
            </div>
          </div>
        )}
      </div>
    </ModalLayout>
  )
})

export default AppointmentBookingModal