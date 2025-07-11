import { useState, useCallback, useEffect } from 'react'
import { type Client, type Service, type User, type TimeSlot } from '@/lib/api'

interface AppointmentFormData {
  client: Client | null
  service: Service | null
  barber: User | null
  date: Date | null
  time: string | null
  notes: string
  isRecurring: boolean
  recurringPattern: 'weekly' | 'biweekly' | 'monthly'
  sendNotification: boolean
}

interface UseAppointmentFormProps {
  initialData?: Partial<AppointmentFormData>
  onValidationChange?: (isValid: boolean) => void
}

export function useAppointmentForm({
  initialData,
  onValidationChange
}: UseAppointmentFormProps = {}) {
  const [formData, setFormData] = useState<AppointmentFormData>({
    client: null,
    service: null,
    barber: null,
    date: initialData?.date || null,
    time: initialData?.time || null,
    notes: '',
    isRecurring: false,
    recurringPattern: 'weekly',
    sendNotification: true,
    ...initialData
  })

  const [errors, setErrors] = useState<Partial<Record<keyof AppointmentFormData, string>>>({})
  const [touched, setTouched] = useState<Partial<Record<keyof AppointmentFormData, boolean>>>({})

  // Update form field
  const updateField = useCallback(<K extends keyof AppointmentFormData>(
    field: K,
    value: AppointmentFormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setTouched(prev => ({ ...prev, [field]: true }))
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }, [errors])

  // Validate form
  const validate = useCallback(() => {
    const newErrors: Partial<Record<keyof AppointmentFormData, string>> = {}

    // Required fields validation
    if (!formData.service) {
      newErrors.service = 'Service is required'
    }

    if (!formData.date) {
      newErrors.date = 'Date is required'
    } else if (formData.date < new Date()) {
      newErrors.date = 'Date cannot be in the past'
    }

    if (!formData.time) {
      newErrors.time = 'Time is required'
    }

    // Notes validation
    if (formData.notes && formData.notes.length > 500) {
      newErrors.notes = 'Notes cannot exceed 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [formData])

  // Check if form is valid
  const isValid = useCallback(() => {
    return (
      formData.service !== null &&
      formData.date !== null &&
      formData.time !== null &&
      Object.keys(errors).length === 0
    )
  }, [formData, errors])

  // Notify parent about validation status
  useEffect(() => {
    onValidationChange?.(isValid())
  }, [isValid, onValidationChange])

  // Reset form
  const reset = useCallback(() => {
    setFormData({
      client: null,
      service: null,
      barber: null,
      date: initialData?.date || null,
      time: initialData?.time || null,
      notes: '',
      isRecurring: false,
      recurringPattern: 'weekly',
      sendNotification: true
    })
    setErrors({})
    setTouched({})
  }, [initialData])

  // Get error for a field
  const getError = useCallback((field: keyof AppointmentFormData) => {
    return touched[field] ? errors[field] : undefined
  }, [errors, touched])

  return {
    formData,
    errors,
    touched,
    updateField,
    validate,
    isValid: isValid(),
    reset,
    getError
  }
}

// Hook for managing available time slots
export function useTimeSlots() {
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSlots = useCallback(async (
    date: Date,
    serviceId: string,
    barberId?: string
  ) => {
    try {
      setLoading(true)
      setError(null)
      
      // This would call your API
      // const response = await getAvailableSlots({ date, service_id: serviceId, barber_id: barberId })
      // setSlots(response.slots || [])
      
      // For now, just set empty array
      setSlots([])
    } catch (err) {
      console.error('Failed to load time slots:', err)
      setError('Failed to load available times')
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    slots,
    loading,
    error,
    loadSlots
  }
}