'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { format, parseISO, addMinutes } from 'date-fns'
import { 
  ClockIcon, 
  ArrowRightIcon, 
  CheckIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  ShieldCheckIcon,
  CalendarDaysIcon,
  UserIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ButtonLoading } from '@/components/ui/LoadingStates'
import { ErrorDisplay } from '@/components/ui/ErrorStates'
import { 
  SERVICE_STYLES, 
  PREMIUM_EFFECTS, 
  TIME_CONSTANTS,
  A11Y,
  getServiceConfig,
  getThemeClasses,
  type ServiceType
} from '@/lib/calendar-constants'
import { type Appointment, type AppointmentUpdate } from '@/types/calendar'
import { cn } from '@/lib/utils'

// CSRF token utility
const getCSRFToken = (): string => {
  const metaTag = document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement
  return metaTag?.content || ''
}

// Input validation utilities
const validateTimeFormat = (time: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
  return timeRegex.test(time)
}

const validateDateFormat = (date: string): boolean => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  return dateRegex.test(date) && !isNaN(Date.parse(date))
}

interface RescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment
  onReschedule: (updates: AppointmentUpdate) => Promise<void>
  availableSlots?: Array<{ time: string; available: boolean }>
  isDarkMode?: boolean
  className?: string
}

interface RecurringOption {
  value: 'weekly' | 'biweekly' | 'monthly'
  label: string
  description: string
  icon: string
}

interface ValidationErrors {
  date?: string
  time?: string
  note?: string
  general?: string
}

export default function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  onReschedule,
  availableSlots = [],
  isDarkMode = false,
  className
}: RescheduleModalProps) {
  // State management
  const [newDate, setNewDate] = useState<string>('')
  const [newTime, setNewTime] = useState<string>('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [sendSMSNotification, setSendSMSNotification] = useState(true)
  const [sendEmailNotification, setSendEmailNotification] = useState(true)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [csrfToken] = useState(getCSRFToken())
  
  // Refs for accessibility
  const modalRef = useRef<HTMLDivElement>(null)
  const firstInputRef = useRef<HTMLInputElement>(null)
  const submitButtonRef = useRef<HTMLButtonElement>(null)

  // Theme classes
  const theme = getThemeClasses(isDarkMode)
  
  // Service configuration
  const serviceType = appointment.service_name?.toLowerCase().includes('haircut') ? 'haircut' : 
                     appointment.service_name?.toLowerCase().includes('beard') ? 'beard' :
                     appointment.service_name?.toLowerCase().includes('color') ? 'color' : 
                     'haircut' // default fallback
  const serviceConfig = getServiceConfig(serviceType as ServiceType)

  // Recurring options
  const recurringOptions: RecurringOption[] = [
    {
      value: 'weekly',
      label: 'Weekly',
      description: 'Every week at the same time',
      icon: '📅'
    },
    {
      value: 'biweekly', 
      label: 'Bi-weekly',
      description: 'Every 2 weeks at the same time',
      icon: '📋'
    },
    {
      value: 'monthly',
      label: 'Monthly',
      description: 'Every month at the same time',
      icon: '🗓️'
    }
  ]

  // Initialize form with current appointment data
  useEffect(() => {
    if (isOpen && appointment) {
      try {
        const appointmentDate = parseISO(appointment.start_time)
        setNewDate(format(appointmentDate, 'yyyy-MM-dd'))
        setNewTime(format(appointmentDate, 'HH:mm'))
        setIsRecurring(appointment.is_recurring || false)
        setNote('')
        setErrors({})
      } catch (error) {
        setErrors({ general: 'Unable to load appointment data' })
      }
    }
  }, [isOpen, appointment])

  // Focus management for accessibility
  useEffect(() => {
    if (isOpen && firstInputRef.current) {
      setTimeout(() => {
        firstInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === A11Y.keys.escape) {
      onClose()
    } else if (event.key === A11Y.keys.enter && event.ctrlKey) {
      handleSubmit()
    }
  }, [onClose])

  // Validation
  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {}

    if (!newDate) {
      newErrors.date = 'Date is required'
    } else if (!validateDateFormat(newDate)) {
      newErrors.date = 'Invalid date format'
    } else if (new Date(newDate) < new Date()) {
      newErrors.date = 'Date cannot be in the past'
    }

    if (!newTime) {
      newErrors.time = 'Time is required'
    } else if (!validateTimeFormat(newTime)) {
      newErrors.time = 'Invalid time format (HH:MM)'
    }

    if (note && note.length > 500) {
      newErrors.note = 'Note cannot exceed 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Submit handler
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setErrors({})

      // Combine date and time
      const newStartTime = `${newDate}T${newTime}:00.000Z`
      
      const updates: AppointmentUpdate = {
        id: appointment.id,
        start_time: newStartTime,
        notes: note || undefined,
        // Add CSRF protection
        ...(csrfToken && { _token: csrfToken })
      }

      if (isRecurring) {
        updates.recurring_pattern = {
          type: recurringPattern,
          interval: 1,
          days_of_week: [new Date(newDate).getDay()]
        }
      }

      await onReschedule(updates)
      
      // Reset form
      resetForm()
      onClose()
      
      // Announce success to screen readers
      announceToScreenReader('Appointment successfully rescheduled')
      
    } catch (error: any) {
      setErrors({ 
        general: error.message || 'Failed to reschedule appointment. Please try again.' 
      })
    } finally {
      setLoading(false)
    }
  }

  // Reset form state
  const resetForm = () => {
    setNewDate('')
    setNewTime('')
    setIsRecurring(false)
    setRecurringPattern('weekly')
    setSendSMSNotification(true)
    setSendEmailNotification(true)
    setNote('')
    setErrors({})
  }

  // Screen reader announcements
  const announceToScreenReader = (message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    document.body.appendChild(announcement)
    setTimeout(() => document.body.removeChild(announcement), 1000)
  }

  // Format times for display
  const formatTime = (timeString: string) => {
    try {
      return format(parseISO(timeString), 'MMM d, yyyy at h:mm a')
    } catch {
      return timeString
    }
  }

  const formatTimeOnly = (timeString: string) => {
    try {
      return format(parseISO(timeString), 'h:mm a')
    } catch {
      return timeString
    }
  }

  // Calculate new end time
  const getNewEndTime = () => {
    if (!newDate || !newTime) return null
    try {
      const startDateTime = new Date(`${newDate}T${newTime}`)
      const duration = appointment.duration_minutes || 60
      return addMinutes(startDateTime, duration)
    } catch {
      return null
    }
  }

  if (!appointment) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      variant="premium"
      position="center"
      className={cn(
        "max-w-2xl w-full max-h-[95vh]",
        PREMIUM_EFFECTS.shadows.floating,
        className
      )}
      closeOnEscape={false} // We handle escape key manually
    >
      <div 
        ref={modalRef}
        className="flex flex-col h-full"
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-labelledby="reschedule-title"
        aria-describedby="reschedule-description"
      >
        {/* Premium Header */}
        <div className={cn(
          "relative p-6 border-b",
          theme.border,
          `bg-gradient-to-r ${serviceConfig.gradient.light}`,
          isDarkMode && `bg-gradient-to-r ${serviceConfig.gradient.dark}`
        )}>
          {/* Service badge */}
          <div className="absolute top-4 right-4">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium",
              serviceConfig.lightColor && `bg-white/20 ${serviceConfig.text.light}`,
              isDarkMode && `bg-black/20 ${serviceConfig.text.dark}`
            )}>
              <span>{serviceConfig.icon}</span>
              <span>{appointment.service_name}</span>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-xl",
              PREMIUM_EFFECTS.glass.light,
              isDarkMode && PREMIUM_EFFECTS.glass.dark
            )}>
              <ClockIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            
            <div className="flex-1">
              <h2 
                id="reschedule-title"
                className="text-xl font-bold text-gray-900 dark:text-white mb-1"
              >
                Reschedule Appointment
              </h2>
              <p 
                id="reschedule-description"
                className="text-sm text-gray-600 dark:text-gray-400"
              >
                Move your appointment to a new date and time
              </p>
            </div>

            <button
              onClick={onClose}
              className={cn(
                "p-2 rounded-lg transition-colors",
                "hover:bg-white/20 dark:hover:bg-black/20",
                A11Y.focus.ring
              )}
              aria-label="Close modal"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <ModalBody className={cn(
          "flex-1 overflow-y-auto p-6 space-y-6 relative",
          loading && "pointer-events-none"
        )}>
          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl animate-pulse" />
                  <ClockIcon className="w-12 h-12 text-primary-600 dark:text-primary-400 relative animate-bounce" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Rescheduling your appointment...
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Please wait while we update your booking
                </p>
              </div>
            </div>
          )}
          {/* Error Display */}
          {errors.general && (
            <ErrorDisplay 
              error={errors.general} 
              onRetry={() => setErrors({ ...errors, general: undefined })}
            />
          )}

          {/* Current → New Timeline */}
          <div className={cn(
            "p-4 rounded-lg border",
            theme.border,
            theme.background
          )}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CalendarDaysIcon className="w-4 h-4" />
              Appointment Details
            </h3>
            
            <div className="flex items-center justify-between">
              {/* Current Time */}
              <div className="flex-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {formatTime(appointment.start_time)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {appointment.client_name && (
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {appointment.client_name}
                    </span>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="px-4">
                <ArrowRightIcon className="w-5 h-5 text-gray-400" />
              </div>

              {/* New Time */}
              <div className="flex-1 text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">New</div>
                {newDate && newTime ? (
                  <div className="font-medium text-primary-600 dark:text-primary-400">
                    {format(new Date(`${newDate}T${newTime}`), 'MMM d, yyyy at h:mm a')}
                  </div>
                ) : (
                  <div className="text-gray-400 dark:text-gray-500">Select new time</div>
                )}
                {getNewEndTime() && (
                  <div className="text-xs text-gray-500 mt-1">
                    Duration: {appointment.duration_minutes || 60} min
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Date & Time Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900 dark:text-white">
                New Date *
              </label>
              <Input
                ref={firstInputRef}
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                error={errors.date}
                disabled={loading}
                className="w-full"
                aria-describedby="date-help"
                aria-required="true"
              />
              <p id="date-help" className="text-xs text-gray-500 dark:text-gray-400">
                Select a future date for your appointment
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900 dark:text-white">
                New Time *
              </label>
              <Input
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                error={errors.time}
                disabled={loading}
                className="w-full"
                aria-describedby="time-help"
                aria-required="true"
              />
              <p id="time-help" className="text-xs text-gray-500 dark:text-gray-400">
                Business hours: {TIME_CONSTANTS.businessHours.start}:00 AM - {TIME_CONSTANTS.businessHours.end}:00 PM
              </p>
            </div>
          </div>

          {/* Available Slots Hint */}
          {availableSlots.length > 0 && (
            <div className={cn(
              "p-3 rounded-lg border",
              "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            )}>
              <div className="flex items-start gap-2">
                <InformationCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Available times today:</strong> {' '}
                  {availableSlots
                    .filter(slot => slot.available)
                    .slice(0, 4)
                    .map(slot => slot.time)
                    .join(', ')
                  }
                  {availableSlots.filter(slot => slot.available).length > 4 && ' and more...'}
                </div>
              </div>
            </div>
          )}

          {/* Recurring Appointment Option */}
          <div className={cn(
            "p-4 rounded-lg border space-y-4",
            theme.border,
            "bg-gray-50 dark:bg-gray-800/50"
          )}>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-3 cursor-pointer">
                <Switch
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                  disabled={loading}
                  id="recurring-toggle"
                  aria-describedby="recurring-description"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Make this recurring
                  </span>
                  <p id="recurring-description" className="text-xs text-gray-500 dark:text-gray-400">
                    Automatically schedule future appointments
                  </p>
                </div>
              </label>
            </div>

            {isRecurring && (
              <div className="space-y-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Repeat pattern:
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {recurringOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setRecurringPattern(option.value)}
                      disabled={loading}
                      className={cn(
                        "p-3 rounded-lg border text-left transition-all duration-200",
                        recurringPattern === option.value
                          ? cn(
                              "border-primary-500 bg-primary-50 dark:bg-primary-900/20",
                              "ring-2 ring-primary-500/20"
                            )
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600",
                        A11Y.focus.ring
                      )}
                      aria-pressed={recurringPattern === option.value}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm">{option.icon}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {option.label}
                        </span>
                        {recurringPattern === option.value && (
                          <CheckIcon className="w-4 h-4 text-primary-600 dark:text-primary-400 ml-auto" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {option.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notification Preferences */}
          <div className={cn(
            "p-4 rounded-lg border space-y-3",
            theme.border,
            "bg-gray-50 dark:bg-gray-800/50"
          )}>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BellIcon className="w-4 h-4" />
              Notification Preferences
            </h3>
            
            <div className="space-y-3">
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400" />
                  <div>
                    <span className="text-sm text-gray-900 dark:text-white">SMS Notification</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Send confirmation via text message
                    </p>
                  </div>
                </div>
                <Switch
                  checked={sendSMSNotification}
                  onCheckedChange={setSendSMSNotification}
                  disabled={loading}
                  id="sms-notification"
                />
              </label>

              <label className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <div>
                    <span className="text-sm text-gray-900 dark:text-white">Email Notification</span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Send confirmation via email
                    </p>
                  </div>
                </div>
                <Switch
                  checked={sendEmailNotification}
                  onCheckedChange={setSendEmailNotification}
                  disabled={loading}
                  id="email-notification"
                />
              </label>
            </div>
          </div>

          {/* Note Field */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Note (optional)
            </label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about why you're rescheduling (optional)..."
              rows={3}
              error={errors.note}
              disabled={loading}
              className="resize-none"
              maxLength={500}
              aria-describedby="note-help"
            />
            <div className="flex justify-between">
              <p id="note-help" className="text-xs text-gray-500 dark:text-gray-400">
                This note will be visible to your barber
              </p>
              <span className={cn(
                "text-xs",
                note.length > 450 ? "text-warning-600" : "text-gray-500 dark:text-gray-400"
              )}>
                {note.length}/500
              </span>
            </div>
          </div>

          {/* Security Badge */}
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg",
            "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          )}>
            <ShieldCheckIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs text-green-800 dark:text-green-200">
              Your data is protected with industry-standard security
            </span>
          </div>
        </ModalBody>

        {/* Footer */}
        <ModalFooter className="border-t bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              onClick={onClose}
              disabled={loading}
              className="px-6"
            >
              Cancel
            </Button>
            
            <Button
              ref={submitButtonRef}
              onClick={handleSubmit}
              disabled={!newDate || !newTime || Object.keys(errors).length > 0 || loading}
              variant="primary"
              size="lg"
              className={cn(
                "px-8 min-w-[140px]",
                `bg-gradient-to-r ${serviceConfig.gradient.from} ${serviceConfig.gradient.to}`,
                "shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              )}
              aria-describedby="submit-help"
            >
              {loading && <ButtonLoading size="sm" />}
              Reschedule
            </Button>
          </div>
          <p id="submit-help" className="sr-only">
            Press Ctrl+Enter to quickly submit the form
          </p>
        </ModalFooter>
      </div>
    </Modal>
  )
}