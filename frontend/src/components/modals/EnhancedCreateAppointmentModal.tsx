'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog } from '@headlessui/react'
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  UserIcon,
  CalendarDaysIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { useTheme } from '@/contexts/ThemeContext'

// Import enhanced systems
import { appointmentValidator } from '@/lib/validation/appointment-validation'
import { availabilityService, conflictResolver } from '@/lib/availability'
import { errorManager, ConflictError, ValidationError } from '@/lib/error-handling'
import { loadingManager } from '@/lib/loading/loading-manager'
import { useOptimisticUpdates } from '@/hooks/useOptimisticUpdates'
import { useAvailability, useConflictDetection } from '@/hooks/useAvailability'

// UI Components
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ProgressIndicator } from '@/components/ui/ProgressIndicator'
import { ErrorNotification } from '@/components/error/ErrorNotification'

interface EnhancedCreateAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: string
  selectedTime?: string
  services: Array<{ id: number; name: string; duration: number; price: number }>
  barbers: Array<{ id: number; name: string; first_name: string; last_name: string; is_active: boolean }>
  onSuccess: (appointment: any) => void
}

interface FormData {
  client_name: string
  client_email: string
  client_phone: string
  barberId: number | null
  serviceId: number | null
  date: string
  time: string
  notes: string
}

interface ValidationErrors {
  [key: string]: string[]
}

export default function EnhancedCreateAppointmentModal({
  isOpen,
  onClose,
  selectedDate = '',
  selectedTime = '',
  services = [],
  barbers = [],
  onSuccess
}: EnhancedCreateAppointmentModalProps) {
  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()

  // Form state
  const [formData, setFormData] = useState<FormData>({
    client_name: '',
    client_email: '',
    client_phone: '',
    barberId: null,
    serviceId: null,
    date: selectedDate,
    time: selectedTime,
    notes: ''
  })

  // Validation and error state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})
  const [isValidating, setIsValidating] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Availability state
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [availabilityStatus, setAvailabilityStatus] = useState<'checking' | 'available' | 'unavailable' | null>(null)

  // Enhanced hooks
  const { createOptimistic } = useOptimisticUpdates('appointments')

  // Availability checking
  const availabilityRequest = formData.barberId && formData.date && formData.time && formData.serviceId ? {
    barberId: formData.barberId,
    date: formData.date,
    serviceId: formData.serviceId,
    duration: services.find(s => s.id === formData.serviceId)?.duration || 60
  } : null

  const {
    availability,
    isLoading: availabilityLoading,
    error: availabilityError,
    refreshAvailability
  } = useAvailability(availabilityRequest, {
    autoRefresh: true,
    refreshInterval: 30000,
    onError: (error) => console.error('Availability error:', error)
  })

  // Conflict detection
  const conflictContext = formData.barberId && formData.date && formData.time && formData.serviceId ? {
    barberId: formData.barberId,
    date: formData.date,
    time: formData.time,
    duration: services.find(s => s.id === formData.serviceId)?.duration || 60,
    serviceId: formData.serviceId,
    priority: 'normal' as const,
    isRescheduling: false
  } : null

  const { conflicts, isChecking: conflictChecking } = useConflictDetection(conflictContext, {
    onConflict: (detectedConflicts) => {
      if (detectedConflicts.length > 0) {
        setAvailabilityStatus('unavailable')
        generateSuggestions()
      }
    }
  })

  // Update form when props change
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      date: selectedDate,
      time: selectedTime
    }))
  }, [selectedDate, selectedTime])

  // Real-time validation
  useEffect(() => {
    const validateField = async () => {
      if (formData.date && formData.time && formData.barberId && formData.serviceId) {
        setIsValidating(true)

        try {
          const validation = await appointmentValidator.validateAppointment(
            formData.date,
            formData.time,
            formData.barberId,
            formData.serviceId,
            services.find(s => s.id === formData.serviceId)?.duration || 60
          )

          if (!validation.isValid) {
            const fieldErrors: ValidationErrors = {}
            validation.errors.forEach(error => {
              if (!fieldErrors[error.field]) {
                fieldErrors[error.field] = []
              }
              fieldErrors[error.field].push(error.message)
            })
            setValidationErrors(fieldErrors)
          } else {
            setValidationErrors({})
          }
        } catch (error) {
          console.error('Validation error:', error)
        } finally {
          setIsValidating(false)
        }
      }
    }

    const timeoutId = setTimeout(validateField, 500) // Debounce validation
    return () => clearTimeout(timeoutId)
  }, [formData.date, formData.time, formData.barberId, formData.serviceId, services])

  // Check availability in real-time
  useEffect(() => {
    const checkAvailability = async () => {
      if (formData.barberId && formData.date && formData.time) {
        setAvailabilityStatus('checking')

        try {
          const duration = services.find(s => s.id === formData.serviceId)?.duration || 60
          const isAvailable = await availabilityService.isSlotAvailable(
            formData.barberId,
            formData.date,
            formData.time,
            duration
          )

          setAvailabilityStatus(isAvailable ? 'available' : 'unavailable')

          if (!isAvailable) {
            generateSuggestions()
          } else {
            setShowSuggestions(false)
          }
        } catch (error) {
          console.error('Availability check failed:', error)
          setAvailabilityStatus('unavailable')
        }
      }
    }

    const timeoutId = setTimeout(checkAvailability, 300) // Debounce availability check
    return () => clearTimeout(timeoutId)
  }, [formData.barberId, formData.date, formData.time, formData.serviceId, services])

  // Generate alternative suggestions
  const generateSuggestions = async () => {
    if (!formData.barberId || !formData.date || !formData.serviceId) return

    try {
      const alternatives = await availabilityService.getAlternativeSuggestions({
        barberId: formData.barberId,
        date: formData.date,
        serviceId: formData.serviceId,
        duration: services.find(s => s.id === formData.serviceId)?.duration || 60,
        preferredTimes: [formData.time]
      })

      setSuggestions(alternatives.slice(0, 3)) // Show top 3 suggestions
      setShowSuggestions(alternatives.length > 0)
    } catch (error) {
      console.error('Failed to generate suggestions:', error)
    }
  }

  // Handle form field changes
  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear field-specific errors
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // Apply suggestion
  const applySuggestion = (suggestion: any) => {
    setFormData(prev => ({
      ...prev,
      date: suggestion.alternativeDate || prev.date,
      time: suggestion.slot.time,
      barberId: suggestion.slot.barberId
    }))
    setShowSuggestions(false)
  }

  // Form submission with optimistic updates
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setGlobalError(null)

    try {
      // Final validation
      const validation = await appointmentValidator.validateAppointment(
        formData.date,
        formData.time,
        formData.barberId!,
        formData.serviceId!,
        services.find(s => s.id === formData.serviceId)?.duration || 60
      )

      if (!validation.isValid) {
        const fieldErrors: ValidationErrors = {}
        validation.errors.forEach(error => {
          if (!fieldErrors[error.field]) {
            fieldErrors[error.field] = []
          }
          fieldErrors[error.field].push(error.message)
        })
        setValidationErrors(fieldErrors)
        return
      }

      // Create appointment with optimistic update
      const selectedService = services.find(s => s.id === formData.serviceId)!
      const selectedBarber = barbers.find(b => b.id === formData.barberId)!

      const appointmentData = {
        client_name: formData.client_name,
        client_email: formData.client_email,
        client_phone: formData.client_phone,
        barberId: formData.barberId,
        serviceId: formData.serviceId,
        date: formData.date,
        time: formData.time,
        notes: formData.notes,
        service_duration: selectedService.duration
      }

      // Optimistic appointment object
      const optimisticAppointment = {
        id: `temp_${Date.now()}`,
        client: formData.client_name,
        barber: `${selectedBarber.first_name} ${selectedBarber.last_name}`,
        service: selectedService.name,
        startTime: formData.time,
        endTime: calculateEndTime(formData.time, selectedService.duration),
        price: selectedService.price,
        status: 'confirmed' as const,
        date: formData.date,
        serviceRevenue: selectedService.price,
        tipAmount: 0,
        productRevenue: 0
      }

      // Use optimistic updates
      const result = await createOptimistic(
        async () => {
          // Here you would call your actual API
          // For now, simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000))

          return {
            ...optimisticAppointment,
            id: Math.random().toString(36).substr(2, 9) // Real ID from API
          }
        },
        optimisticAppointment,
        {
          onSuccess: (result) => {
            console.log('Appointment created successfully:', result)
            onSuccess(result)
            resetForm()
            onClose()
          },
          onError: (error) => {
            console.error('Failed to create appointment:', error)
            setGlobalError('Failed to create appointment. Please try again.')
          }
        }
      )

    } catch (error: any) {
      console.error('Submission error:', error)
      const managedError = errorManager.handleError(error, 'createAppointment')

      if (managedError instanceof ConflictError || managedError instanceof ValidationError) {
        setGlobalError(managedError.message)
      } else {
        setGlobalError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Helper functions
  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(startDate.getTime() + duration * 60000)
    return endDate.toTimeString().slice(0, 5)
  }

  const resetForm = () => {
    setFormData({
      client_name: '',
      client_email: '',
      client_phone: '',
      barberId: null,
      serviceId: null,
      date: selectedDate,
      time: selectedTime,
      notes: ''
    })
    setValidationErrors({})
    setGlobalError(null)
    setSuggestions([])
    setShowSuggestions(false)
    setAvailabilityStatus(null)
  }

  const getAvailabilityIndicator = () => {
    switch (availabilityStatus) {
      case 'checking':
        return (
          <div className="flex items-center text-yellow-600">
            <LoadingSpinner size="sm" />
            <span className="ml-2 text-sm">Checking availability...</span>
          </div>
        )
      case 'available':
        return (
          <div className="flex items-center text-green-600">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="ml-2 text-sm">Time slot available</span>
          </div>
        )
      case 'unavailable':
        return (
          <div className="flex items-center text-red-600">
            <ExclamationTriangleIcon className="h-5 w-5" />
            <span className="ml-2 text-sm">Time slot unavailable</span>
          </div>
        )
      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel
          className="w-full max-w-2xl rounded-xl shadow-xl"
          style={{
            backgroundColor: colors.cardBackground,
            borderColor: colors.border
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: colors.border }}>
            <div className="flex items-center space-x-3">
              <CalendarDaysIcon className={`h-6 w-6 ${
                theme === 'soft-light' ? 'text-[#7c9885]' : 'text-teal-600'
              }`} />
              <Dialog.Title
                className="text-xl font-semibold"
                style={{ color: colors.textPrimary }}
              >
                Create New Appointment
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <XMarkIcon className="h-5 w-5" style={{ color: colors.textSecondary }} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* Global Error */}
            {globalError && (
              <ErrorNotification
                error={{ message: globalError, severity: 'error' } as any}
                variant="inline"
                className="mb-6"
                onDismiss={() => setGlobalError(null)}
              />
            )}

            {/* Real-time availability status */}
            {formData.barberId && formData.date && formData.time && (
              <div className="mb-6 p-4 rounded-lg border" style={{ borderColor: colors.border }}>
                {getAvailabilityIndicator()}

                {/* Conflict information */}
                {conflicts.length > 0 && (
                  <div className="mt-3 text-sm text-red-600">
                    <div className="font-medium">Scheduling Conflicts:</div>
                    <ul className="mt-1 space-y-1">
                      {conflicts.map((conflict, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2">•</span>
                          <span>{conflict.message}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client Information */}
              <div>
                <h3 className="text-lg font-medium mb-4" style={{ color: colors.textPrimary }}>
                  Client Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                      Client Name *
                    </label>
                    <input
                      type="text"
                      value={formData.client_name}
                      onChange={(e) => handleFieldChange('client_name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        validationErrors.client_name ? 'border-red-300' : ''
                      }`}
                      style={{
                        backgroundColor: colors.background,
                        borderColor: validationErrors.client_name ? '#fca5a5' : colors.border,
                        color: colors.textPrimary
                      }}
                      placeholder="Enter client name"
                    />
                    {validationErrors.client_name && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.client_name[0]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.client_phone}
                      onChange={(e) => handleFieldChange('client_phone', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        validationErrors.client_phone ? 'border-red-300' : ''
                      }`}
                      style={{
                        backgroundColor: colors.background,
                        borderColor: validationErrors.client_phone ? '#fca5a5' : colors.border,
                        color: colors.textPrimary
                      }}
                      placeholder="(555) 123-4567"
                    />
                    {validationErrors.client_phone && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.client_phone[0]}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => handleFieldChange('client_email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        validationErrors.client_email ? 'border-red-300' : ''
                      }`}
                      style={{
                        backgroundColor: colors.background,
                        borderColor: validationErrors.client_email ? '#fca5a5' : colors.border,
                        color: colors.textPrimary
                      }}
                      placeholder="client@example.com"
                    />
                    {validationErrors.client_email && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.client_email[0]}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div>
                <h3 className="text-lg font-medium mb-4" style={{ color: colors.textPrimary }}>
                  Appointment Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                      Service *
                    </label>
                    <select
                      value={formData.serviceId || ''}
                      onChange={(e) => handleFieldChange('serviceId', parseInt(e.target.value) || null)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        validationErrors.serviceId ? 'border-red-300' : ''
                      }`}
                      style={{
                        backgroundColor: colors.background,
                        borderColor: validationErrors.serviceId ? '#fca5a5' : colors.border,
                        color: colors.textPrimary
                      }}
                    >
                      <option value="">Select a service</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} - ${service.price} ({service.duration}min)
                        </option>
                      ))}
                    </select>
                    {validationErrors.serviceId && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.serviceId[0]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                      Barber *
                    </label>
                    <select
                      value={formData.barberId || ''}
                      onChange={(e) => handleFieldChange('barberId', parseInt(e.target.value) || null)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        validationErrors.barberId ? 'border-red-300' : ''
                      }`}
                      style={{
                        backgroundColor: colors.background,
                        borderColor: validationErrors.barberId ? '#fca5a5' : colors.border,
                        color: colors.textPrimary
                      }}
                    >
                      <option value="">Select a barber</option>
                      {barbers.filter(barber => barber.is_active).map(barber => (
                        <option key={barber.id} value={barber.id}>
                          {barber.first_name} {barber.last_name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.barberId && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.barberId[0]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleFieldChange('date', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        validationErrors.date ? 'border-red-300' : ''
                      }`}
                      style={{
                        backgroundColor: colors.background,
                        borderColor: validationErrors.date ? '#fca5a5' : colors.border,
                        color: colors.textPrimary
                      }}
                    />
                    {validationErrors.date && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.date[0]}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                      Time *
                    </label>
                    <input
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleFieldChange('time', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                        validationErrors.time ? 'border-red-300' : ''
                      }`}
                      style={{
                        backgroundColor: colors.background,
                        borderColor: validationErrors.time ? '#fca5a5' : colors.border,
                        color: colors.textPrimary
                      }}
                    />
                    {validationErrors.time && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.time[0]}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2" style={{ color: colors.textPrimary }}>
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => handleFieldChange('notes', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      style={{
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.textPrimary
                      }}
                      placeholder="Any special requests or notes..."
                    />
                  </div>
                </div>
              </div>

              {/* Alternative Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="border rounded-lg p-4" style={{ borderColor: colors.border }}>
                  <div className="flex items-center mb-3">
                    <SparklesIcon className="h-5 w-5 text-yellow-500 mr-2" />
                    <h4 className="text-lg font-medium" style={{ color: colors.textPrimary }}>
                      Alternative Suggestions
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                        style={{ borderColor: colors.border }}
                        onClick={() => applySuggestion(suggestion)}
                      >
                        <div>
                          <div className="font-medium" style={{ color: colors.textPrimary }}>
                            {suggestion.alternativeDate || formData.date} at {suggestion.slot.time}
                          </div>
                          <div className="text-sm" style={{ color: colors.textSecondary }}>
                            with {suggestion.slot.barberName} • Score: {suggestion.score}%
                          </div>
                          <div className="text-xs" style={{ color: colors.textSecondary }}>
                            {suggestion.reasons.join(', ')}
                          </div>
                        </div>
                        <button
                          type="button"
                          className={`px-3 py-1 text-sm rounded-md ${
                            theme === 'soft-light'
                              ? 'bg-[#7c9885] text-white hover:bg-[#6a8574]'
                              : 'bg-teal-600 text-white hover:bg-teal-700'
                          }`}
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t" style={{ borderColor: colors.border }}>
            <div className="flex items-center space-x-4">
              {isValidating && (
                <div className="flex items-center text-yellow-600">
                  <LoadingSpinner size="sm" />
                  <span className="ml-2 text-sm">Validating...</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={
                  isSubmitting ||
                  isValidating ||
                  Object.keys(validationErrors).length > 0 ||
                  availabilityStatus === 'unavailable' ||
                  !formData.client_name ||
                  !formData.client_phone ||
                  !formData.barberId ||
                  !formData.serviceId ||
                  !formData.date ||
                  !formData.time
                }
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center ${
                  isSubmitting || isValidating || Object.keys(validationErrors).length > 0 || availabilityStatus === 'unavailable'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : theme === 'soft-light'
                    ? 'bg-[#7c9885] text-white hover:bg-[#6a8574]'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
                {isSubmitting ? 'Creating...' : 'Create Appointment'}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  )
}
