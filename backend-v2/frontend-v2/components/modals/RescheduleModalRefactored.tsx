'use client'

import { useState, useEffect, useCallback } from 'react'
import { format, parseISO, addMinutes } from 'date-fns'
import { 
  ClockIcon, 
  ArrowRightIcon,
  CalendarDaysIcon,
  UserIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline'
import { PremiumModalLayout } from '@/components/calendar/shared/ModalLayout'
import { DateTimePicker } from '@/components/calendar/shared/DateTimePicker'
import { RecurringOptions } from '@/components/calendar/shared/RecurringOptions'
import { NotificationPreferences } from '@/components/calendar/shared/NotificationPreferences'
import { ErrorDisplay } from '@/components/ui/ErrorStates'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ButtonLoading } from '@/components/LoadingStates'
import { 
  SERVICE_STYLES, 
  getServiceConfig,
  type ServiceType
} from '@/lib/calendar-constants'
import { type Appointment, type AppointmentUpdate } from '@/types/calendar'
import { cn } from '@/lib/utils'
import { useTimeSlots } from '@/components/calendar/hooks/useAppointmentForm'

interface RescheduleModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment
  onReschedule: (updates: AppointmentUpdate) => Promise<void>
  isDarkMode?: boolean
}

export default function RescheduleModal({
  isOpen,
  onClose,
  appointment,
  onReschedule,
  isDarkMode = false
}: RescheduleModalProps) {
  // Form state
  const [newDate, setNewDate] = useState<Date | null>(null)
  const [newTime, setNewTime] = useState<string | null>(null)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly')
  const [sendSMS, setSendSMS] = useState(true)
  const [sendEmail, setSendEmail] = useState(true)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load available time slots
  const { slots, loading: loadingSlots, loadSlots } = useTimeSlots()

  // Service configuration
  const serviceType = appointment.service_name?.toLowerCase().includes('haircut') ? 'haircut' : 
                     appointment.service_name?.toLowerCase().includes('beard') ? 'beard' :
                     appointment.service_name?.toLowerCase().includes('color') ? 'color' : 
                     'haircut'
  const serviceConfig = getServiceConfig(serviceType as ServiceType)

  // Initialize form with current appointment data
  useEffect(() => {
    if (isOpen && appointment) {
      try {
        const appointmentDate = parseISO(appointment.start_time)
        setNewDate(appointmentDate)
        setNewTime(format(appointmentDate, 'HH:mm'))
        setIsRecurring(appointment.is_recurring || false)
        setNote('')
        setError(null)
      } catch (err) {
        console.error('Error parsing appointment date:', err)
        setError('Unable to load appointment data')
      }
    }
  }, [isOpen, appointment])

  // Load time slots when date changes
  useEffect(() => {
    if (newDate && appointment.service_id) {
      loadSlots(newDate, appointment.service_id, appointment.barber_id)
    }
  }, [newDate, appointment.service_id, appointment.barber_id, loadSlots])

  // Validation
  const validateForm = useCallback((): boolean => {
    if (!newDate) {
      setError('Please select a date')
      return false
    }
    
    if (!newTime) {
      setError('Please select a time')
      return false
    }

    if (newDate < new Date()) {
      setError('Date cannot be in the past')
      return false
    }

    if (note && note.length > 500) {
      setError('Note cannot exceed 500 characters')
      return false
    }

    return true
  }, [newDate, newTime, note])

  // Submit handler
  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Combine date and time
      const newStartTime = `${format(newDate!, 'yyyy-MM-dd')}T${newTime}:00.000Z`
      
      const updates: AppointmentUpdate = {
        id: appointment.id,
        start_time: newStartTime,
        notes: note || undefined
      }

      if (isRecurring) {
        updates.recurring_pattern = {
          type: recurringPattern,
          interval: 1,
          days_of_week: [newDate!.getDay()]
        }
      }

      await onReschedule(updates)
      onClose()
      
    } catch (err: any) {
      console.error('Error rescheduling appointment:', err)
      setError(err.message || 'Failed to reschedule appointment')
    } finally {
      setLoading(false)
    }
  }

  // Format times for display
  const formatTime = (timeString: string) => {
    try {
      return format(parseISO(timeString), 'MMM d, yyyy at h:mm a')
    } catch {
      return timeString
    }
  }

  // Calculate new end time
  const getNewEndTime = () => {
    if (!newDate || !newTime) return null
    try {
      const startDateTime = new Date(`${format(newDate, 'yyyy-MM-dd')}T${newTime}`)
      const duration = appointment.duration_minutes || 60
      return addMinutes(startDateTime, duration)
    } catch {
      return null
    }
  }

  if (!appointment) return null

  return (
    <PremiumModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Reschedule Appointment"
      description="Move your appointment to a new date and time"
      icon={<ClockIcon className="w-6 h-6 text-white" />}
      gradient={`bg-gradient-to-r ${serviceConfig.gradient.light}`}
      footer={
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
            onClick={handleSubmit}
            disabled={!newDate || !newTime || loading}
            variant="primary"
            size="lg"
            className={cn(
              "px-8 min-w-[140px]",
              `bg-gradient-to-r ${serviceConfig.gradient.from} ${serviceConfig.gradient.to}`,
              "shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            )}
          >
            {loading && <ButtonLoading size="sm" />}
            Reschedule
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-6">
        {/* Error Display */}
        {error && (
          <ErrorDisplay 
            error={error} 
            onRetry={() => setError(null)}
          />
        )}

        {/* Current → New Timeline */}
        <AppointmentTimeline
          currentTime={appointment.start_time}
          newDate={newDate}
          newTime={newTime}
          clientName={appointment.client_name}
          duration={appointment.duration_minutes}
        />

        {/* Date & Time Selection */}
        <DateTimePicker
          selectedDate={newDate}
          selectedTime={newTime}
          onDateChange={setNewDate}
          onTimeChange={setNewTime}
          availableSlots={slots}
          loadingSlots={loadingSlots}
        />

        {/* Available Slots Hint */}
        {slots.length > 0 && (
          <AvailableSlotsHint slots={slots} />
        )}

        {/* Recurring Options */}
        <RecurringOptions
          isRecurring={isRecurring}
          recurringPattern={recurringPattern}
          onRecurringChange={setIsRecurring}
          onPatternChange={setRecurringPattern}
        />

        {/* Notification Preferences */}
        <NotificationPreferences
          sendSMS={sendSMS}
          sendEmail={sendEmail}
          onSMSChange={setSendSMS}
          onEmailChange={setSendEmail}
        />

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
            className="resize-none"
            maxLength={500}
          />
          <div className="flex justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
      </div>
    </PremiumModalLayout>
  )
}

// Appointment timeline component
const AppointmentTimeline = ({ 
  currentTime, 
  newDate, 
  newTime, 
  clientName,
  duration 
}: {
  currentTime: string
  newDate: Date | null
  newTime: string | null
  clientName?: string
  duration?: number
}) => {
  const formatTime = (timeString: string) => {
    try {
      return format(parseISO(timeString), 'MMM d, yyyy at h:mm a')
    } catch {
      return timeString
    }
  }

  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <CalendarDaysIcon className="w-4 h-4" />
        Appointment Details
      </h3>
      
      <div className="flex items-center justify-between">
        {/* Current Time */}
        <div className="flex-1">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatTime(currentTime)}
          </div>
          {clientName && (
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <UserIcon className="w-3 h-3" />
              {clientName}
            </div>
          )}
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
              {format(new Date(`${format(newDate, 'yyyy-MM-dd')}T${newTime}`), 'MMM d, yyyy at h:mm a')}
            </div>
          ) : (
            <div className="text-gray-400 dark:text-gray-500">Select new time</div>
          )}
          {duration && (
            <div className="text-xs text-gray-500 mt-1">
              Duration: {duration} min
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Available slots hint component
const AvailableSlotsHint = ({ slots }: { slots: any[] }) => {
  const availableSlots = slots.filter(slot => slot.available).slice(0, 4)
  
  if (availableSlots.length === 0) return null

  return (
    <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-2">
        <InformationCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Available times today:</strong> {' '}
          {availableSlots.map(slot => slot.time).join(', ')}
          {slots.filter(slot => slot.available).length > 4 && ' and more...'}
        </div>
      </div>
    </div>
  )
}