'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { LoadingButton, ErrorDisplay } from '@/components/LoadingStates'
import { formatDateForAPI } from '@/lib/timezone'
import { appointmentsAPI, type AppointmentCreate } from '@/lib/api'

// Shared components
import { ClientSelector } from '@/components/calendar/shared/ClientSelector'
import { ServiceSelector } from '@/components/calendar/shared/ServiceSelector'
import { BarberSelector } from '@/components/calendar/shared/BarberSelector'
import { DateTimePicker } from '@/components/calendar/shared/DateTimePicker'
import { RecurringOptions } from '@/components/calendar/shared/RecurringOptions'
import { CompactNotificationPreferences } from '@/components/calendar/shared/NotificationPreferences'

// Hooks
import { useAppointmentForm } from '@/components/calendar/hooks/useAppointmentForm'
import { useAppointmentServices } from '@/components/calendar/hooks/useAppointmentServices'
import { useTimeSlots } from '@/components/calendar/hooks/useAppointmentForm'

interface CreateAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  preselectedDate?: Date
  preselectedTime?: string
  onSuccess?: () => void
  isPublicBooking?: boolean
}

export default function CreateAppointmentModal({
  isOpen,
  onClose,
  preselectedDate,
  preselectedTime,
  onSuccess,
  isPublicBooking = false
}: CreateAppointmentModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form with preselected values
  const {
    formData,
    updateField,
    validate,
    isValid,
    reset
  } = useAppointmentForm({
    initialData: {
      date: preselectedDate || (() => {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        return tomorrow
      })(),
      time: preselectedTime || null
    }
  })

  // Load services and barbers
  const {
    services,
    barbers,
    loadingServices,
    loadingBarbers,
    servicesError,
    reload: reloadServices
  } = useAppointmentServices({ isPublicBooking })

  // Load time slots
  const { slots, loading: loadingSlots, loadSlots } = useTimeSlots()

  // Load services and barbers when modal opens
  useEffect(() => {
    if (isOpen) {
      reloadServices()
    }
  }, [isOpen, reloadServices])

  // Load time slots when date, service, or barber changes
  useEffect(() => {
    if (formData.date && formData.service) {
      loadSlots(formData.date, formData.service.id, formData.barber?.id)
    }
  }, [formData.date, formData.service, formData.barber, loadSlots])

  // Reset modal state
  const resetModal = () => {
    reset()
    setError(null)
  }

  // Handle form submission
  const handleSubmit = async () => {
    if (!validate()) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Create appointment data
      const appointmentData: AppointmentCreate = {
        date: formatDateForAPI(formData.date!),
        time: formData.time!,
        service: formData.service!.name,
        notes: formData.notes || undefined,
        barber_id: formData.barber?.id
      }

      console.log('Creating appointment:', appointmentData)
      const result = await appointmentsAPI.create(appointmentData)
      console.log('Appointment created:', result)

      // TODO: Handle recurring appointments
      if (formData.isRecurring) {
        console.log('Creating recurring pattern:', formData.recurringPattern)
      }

      onSuccess?.()
      onClose()
      resetModal()
    } catch (err: any) {
      console.error('Failed to create appointment:', err)
      setError(err.response?.data?.detail || err.message || 'Failed to create appointment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetModal()
        onClose()
      }}
      title="Add appointment"
      size="2xl"
      variant="default"
      position="center"
      className="max-h-[95vh] min-h-[700px] w-full max-w-3xl"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {error && (
            <ErrorDisplay 
              error={error} 
              onRetry={() => {
                setError(null)
                if (servicesError) {
                  reloadServices()
                }
              }} 
            />
          )}

          {/* Client Selection (only for admin/barber users) */}
          {!isPublicBooking && (
            <ClientSelector
              selectedClient={formData.client}
              onSelectClient={(client) => updateField('client', client)}
              isPublicBooking={isPublicBooking}
            />
          )}

          {/* Service Selection */}
          <ServiceSelector
            selectedService={formData.service}
            onSelectService={(service) => updateField('service', service)}
            services={services}
            loadingServices={loadingServices}
          />

          {/* Barber Selection */}
          <BarberSelector
            selectedBarber={formData.barber}
            onSelectBarber={(barber) => updateField('barber', barber)}
            barbers={barbers}
            loadingBarbers={loadingBarbers}
            isPublicBooking={isPublicBooking}
          />

          {/* Date & Time Selection */}
          <DateTimePicker
            selectedDate={formData.date}
            selectedTime={formData.time}
            onDateChange={(date) => updateField('date', date)}
            onTimeChange={(time) => updateField('time', time)}
            availableSlots={slots}
            loadingSlots={loadingSlots}
          />

          {/* Notes/Comments */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Add any special instructions or notes for this appointment..."
              rows={3}
              className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          {/* Recurring Appointment Option */}
          <RecurringOptions
            isRecurring={formData.isRecurring}
            recurringPattern={formData.recurringPattern}
            onRecurringChange={(value) => updateField('isRecurring', value)}
            onPatternChange={(pattern) => updateField('recurringPattern', pattern)}
          />

          {/* Notification Option */}
          <CompactNotificationPreferences
            sendNotification={formData.sendNotification}
            onNotificationChange={(value) => updateField('sendNotification', value)}
          />
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-8 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => {
                resetModal()
                onClose()
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <LoadingButton
              onClick={handleSubmit}
              loading={loading}
              disabled={!isValid}
              className="min-w-[180px] bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:transform-none disabled:shadow-none"
            >
              Create Appointment
            </LoadingButton>
          </div>
        </div>
      </div>
    </Modal>
  )
}