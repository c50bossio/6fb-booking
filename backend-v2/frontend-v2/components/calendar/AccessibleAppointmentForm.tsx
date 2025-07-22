'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { format, addMinutes } from 'date-fns'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { 
  useAccessibilityAnnouncer, 
  useFocusManagement, 
  useKeyboardShortcuts,
  AccessibilityManager 
} from '@/lib/accessibility'
import type { BookingResponse } from '@/lib/api'

interface FormField {
  id: string
  label: string
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'datetime-local' | 'number'
  value: string | number
  required: boolean
  error?: string
  hint?: string
  options?: Array<{ value: string | number; label: string }>
  validation?: (value: any) => string | null
  ariaDescribedBy?: string
}

interface AccessibleAppointmentFormProps {
  appointment?: Partial<BookingResponse>
  onSubmit: (data: FormData) => Promise<void>
  onCancel: () => void
  isOpen: boolean
  mode: 'create' | 'edit'
  selectedDate?: Date
  selectedTime?: string
  availableTimeSlots?: string[]
  services?: Array<{ id: string; name: string; duration: number; price: number }>
  className?: string
}

interface FormData {
  clientName: string
  clientEmail: string
  clientPhone: string
  serviceId: string
  date: Date
  time: string
  duration: number
  price: number
  notes: string
  reminders: boolean
}

interface ValidationError {
  field: string
  message: string
}

/**
 * WCAG 2.1 AA compliant appointment form with comprehensive accessibility features
 */
export function AccessibleAppointmentForm({
  appointment,
  onSubmit,
  onCancel,
  isOpen,
  mode,
  selectedDate = new Date(),
  selectedTime = '09:00',
  availableTimeSlots = [],
  services = [],
  className = ''
}: AccessibleAppointmentFormProps) {
  const [formData, setFormData] = useState<FormData>({
    clientName: appointment?.client_name || '',
    clientEmail: appointment?.client_email || '',
    clientPhone: appointment?.client_phone || '',
    serviceId: appointment?.service_name || '',
    date: selectedDate,
    time: selectedTime,
    duration: appointment?.duration || 60,
    price: appointment?.price || 0,
    notes: appointment?.notes || '',
    reminders: true
  })

  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0)
  const [hasInteracted, setHasInteracted] = useState<Set<string>>(new Set())

  const formRef = useRef<HTMLFormElement>(null)
  const fieldRefs = useRef<Map<string, HTMLElement>>(new Map())
  const errorSummaryRef = useRef<HTMLDivElement>(null)
  
  const { announce } = useAccessibilityAnnouncer()
  const { trapFocus, saveFocus, restoreFocus } = useFocusManagement()
  const manager = AccessibilityManager.getInstance()

  // Field definitions with accessibility features
  const fields: FormField[] = [
    {
      id: 'clientName',
      label: 'Client Name',
      type: 'text',
      value: formData.clientName,
      required: true,
      hint: 'Enter the full name of the client',
      validation: (value: string) => {
        if (!value.trim()) return 'Client name is required'
        if (value.trim().length < 2) return 'Client name must be at least 2 characters'
        return null
      }
    },
    {
      id: 'clientEmail',
      label: 'Email Address',
      type: 'email',
      value: formData.clientEmail,
      required: false,
      hint: 'Optional. Used for appointment confirmations and reminders',
      validation: (value: string) => {
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Please enter a valid email address'
        }
        return null
      }
    },
    {
      id: 'clientPhone',
      label: 'Phone Number',
      type: 'tel',
      value: formData.clientPhone,
      required: false,
      hint: 'Optional. Used for SMS reminders and contact',
      validation: (value: string) => {
        if (value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
          return 'Please enter a valid phone number'
        }
        return null
      }
    },
    {
      id: 'serviceId',
      label: 'Service',
      type: 'select',
      value: formData.serviceId,
      required: true,
      hint: 'Select the service to be provided',
      options: services.map(service => ({
        value: service.id,
        label: `${service.name} (${service.duration} min - $${service.price})`
      })),
      validation: (value: string) => {
        if (!value) return 'Please select a service'
        return null
      }
    },
    {
      id: 'time',
      label: 'Time',
      type: 'select',
      value: formData.time,
      required: true,
      hint: 'Select from available time slots',
      options: availableTimeSlots.map(time => ({
        value: time,
        label: time
      })),
      validation: (value: string) => {
        if (!value) return 'Please select a time slot'
        if (!availableTimeSlots.includes(value)) return 'Selected time slot is not available'
        return null
      }
    },
    {
      id: 'notes',
      label: 'Additional Notes',
      type: 'textarea',
      value: formData.notes,
      required: false,
      hint: 'Optional. Any special requests or important information'
    }
  ]

  // Keyboard shortcuts
  const shortcuts = useKeyboardShortcuts({
    'alt+s': () => handleSubmit(),
    'escape': () => handleCancel(),
    'alt+1': () => focusField(0),
    'alt+2': () => focusField(1),
    'alt+3': () => focusField(2),
    'alt+4': () => focusField(3),
    'alt+5': () => focusField(4),
    'ctrl+shift+e': () => focusErrorSummary()
  })

  // Validation
  const validateForm = useCallback((): ValidationError[] => {
    const newErrors: ValidationError[] = []

    fields.forEach(field => {
      if (field.validation) {
        const error = field.validation(formData[field.id as keyof FormData])
        if (error) {
          newErrors.push({
            field: field.id,
            message: error
          })
        }
      }
    })

    return newErrors
  }, [formData, fields])

  // Update field value with validation
  const updateField = useCallback((fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }))
    setHasInteracted(prev => new Set([...prev, fieldId]))

    // Real-time validation for interacted fields
    if (hasInteracted.has(fieldId)) {
      const field = fields.find(f => f.id === fieldId)
      if (field?.validation) {
        const error = field.validation(value)
        setErrors(prev => {
          const filtered = prev.filter(e => e.field !== fieldId)
          return error ? [...filtered, { field: fieldId, message: error }] : filtered
        })
      }
    }
  }, [fields, hasInteracted])

  // Focus field by index
  const focusField = useCallback((index: number) => {
    const field = fields[index]
    if (field) {
      const element = fieldRefs.current.get(field.id)
      if (element) {
        element.focus()
        setCurrentFieldIndex(index)
        announce(`Focused ${field.label} field`)
      }
    }
  }, [fields, announce])

  // Focus error summary
  const focusErrorSummary = useCallback(() => {
    if (errorSummaryRef.current && errors.length > 0) {
      errorSummaryRef.current.focus()
      announce(`Error summary with ${errors.length} errors`)
    }
  }, [errors, announce])

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    const validationErrors = validateForm()
    setErrors(validationErrors)

    if (validationErrors.length > 0) {
      announce(`Form has ${validationErrors.length} error${validationErrors.length !== 1 ? 's' : ''}. Please review and correct.`, 'assertive')
      
      // Focus first error field
      const firstErrorField = validationErrors[0]?.field
      if (firstErrorField) {
        const element = fieldRefs.current.get(firstErrorField)
        if (element) {
          element.focus()
        }
      }
      
      // Focus error summary if available
      setTimeout(() => {
        if (errorSummaryRef.current) {
          errorSummaryRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        }
      }, 100)
      
      return
    }

    setIsSubmitting(true)
    
    try {
      await onSubmit(formData)
      announce('Appointment saved successfully!', 'assertive')
      restoreFocus()
    } catch (error) {
      announce('Error saving appointment. Please try again.', 'assertive')
    } finally {
      setIsSubmitting(false)
    }
  }, [validateForm, onSubmit, formData, announce, restoreFocus])

  // Handle cancel
  const handleCancel = useCallback(() => {
    onCancel()
    restoreFocus()
    announce('Form cancelled')
  }, [onCancel, restoreFocus, announce])

  // Render field with accessibility features
  const renderField = useCallback((field: FormField, index: number) => {
    const fieldError = errors.find(e => e.field === field.id)
    const fieldId = `appointment-${field.id}`
    const errorId = `${fieldId}-error`
    const hintId = `${fieldId}-hint`
    const hasError = !!fieldError
    
    const commonProps = {
      id: fieldId,
      name: field.id,
      'aria-required': field.required,
      'aria-invalid': hasError,
      'aria-describedby': [
        field.hint && hintId,
        hasError && errorId
      ].filter(Boolean).join(' ') || undefined,
      onFocus: () => setCurrentFieldIndex(index),
      className: `
        w-full px-3 py-2 border rounded-md shadow-sm transition-colors duration-200
        ${hasError 
          ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
          : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500'
        }
        bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
      `
    }

    let fieldElement: React.ReactNode

    switch (field.type) {
      case 'select':
        fieldElement = (
          <select
            {...commonProps}
            value={field.value as string}
            onChange={(e) => updateField(field.id, e.target.value)}
            ref={(el) => el && fieldRefs.current.set(field.id, el)}
          >
            <option value="">Select {field.label.toLowerCase()}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )
        break

      case 'textarea':
        fieldElement = (
          <textarea
            {...commonProps}
            value={field.value as string}
            onChange={(e) => updateField(field.id, e.target.value)}
            rows={3}
            ref={(el) => el && fieldRefs.current.set(field.id, el)}
          />
        )
        break

      default:
        fieldElement = (
          <input
            {...commonProps}
            type={field.type}
            value={field.value as string}
            onChange={(e) => updateField(field.id, field.type === 'number' ? Number(e.target.value) : e.target.value)}
            ref={(el) => el && fieldRefs.current.set(field.id, el)}
          />
        )
    }

    return (
      <div key={field.id} className="space-y-2">
        <label 
          htmlFor={fieldId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {field.label}
          {field.required && (
            <span className="text-red-500 ml-1" aria-label="required">*</span>
          )}
        </label>

        {fieldElement}

        {field.hint && (
          <p id={hintId} className="text-sm text-gray-600 dark:text-gray-400">
            {field.hint}
          </p>
        )}

        {hasError && (
          <div id={errorId} className="flex items-start space-x-2 text-sm text-red-600 dark:text-red-400" role="alert">
            <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{fieldError.message}</span>
          </div>
        )}
      </div>
    )
  }, [errors, updateField])

  // Setup focus trap when form opens
  useEffect(() => {
    if (isOpen && formRef.current) {
      saveFocus()
      const cleanup = trapFocus(formRef.current)
      
      // Focus first field
      setTimeout(() => {
        focusField(0)
      }, 100)

      return () => {
        cleanup()
        restoreFocus()
      }
    }
  }, [isOpen, saveFocus, trapFocus, restoreFocus, focusField])

  // Announce form mode on open
  useEffect(() => {
    if (isOpen) {
      announce(`${mode === 'create' ? 'Create new' : 'Edit'} appointment form opened. Form has ${fields.length} fields.`)
    }
  }, [isOpen, mode, fields.length, announce])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${className}`}>
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {mode === 'create' ? 'Create Appointment' : 'Edit Appointment'}
            </h2>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              aria-label="Close form"
            >
              ×
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {/* Error Summary */}
          {errors.length > 0 && (
            <div
              ref={errorSummaryRef}
              className="mb-6 p-4 border border-red-300 dark:border-red-700 rounded-md bg-red-50 dark:bg-red-900/20"
              role="alert"
              aria-labelledby="error-summary-title"
              tabIndex={-1}
            >
              <h3 id="error-summary-title" className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                Please correct the following {errors.length} error{errors.length !== 1 ? 's' : ''}:
              </h3>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {errors.map((error, index) => {
                  const field = fields.find(f => f.id === error.field)
                  return (
                    <li key={error.field}>
                      <button
                        type="button"
                        className="underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                        onClick={() => {
                          const element = fieldRefs.current.get(error.field)
                          if (element) {
                            element.focus()
                          }
                        }}
                      >
                        {field?.label}: {error.message}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Form */}
          <form
            ref={formRef}
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
            className="space-y-6"
            noValidate
          >
            {/* Form fields */}
            {fields.map((field, index) => renderField(field, index))}

            {/* Reminder checkbox */}
            <div className="flex items-center space-x-3">
              <input
                id="appointment-reminders"
                name="reminders"
                type="checkbox"
                checked={formData.reminders}
                onChange={(e) => updateField('reminders', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                ref={(el) => el && fieldRefs.current.set('reminders', el)}
              />
              <label htmlFor="appointment-reminders" className="text-sm text-gray-700 dark:text-gray-300">
                Send appointment reminders
              </label>
            </div>

            {/* Form actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>{mode === 'create' ? 'Create' : 'Update'} Appointment</span>
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Keyboard shortcuts help */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              Keyboard shortcuts
            </summary>
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <div>Alt+S: Submit form</div>
              <div>Escape: Cancel</div>
              <div>Alt+1-5: Jump to field</div>
              <div>Ctrl+Shift+E: Focus error summary</div>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* Screen reader only status updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        Current field: {fields[currentFieldIndex]?.label}
        {errors.length > 0 && `, ${errors.length} validation errors`}
      </div>
    </div>
  )
}

export default AccessibleAppointmentForm