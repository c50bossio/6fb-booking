'use client'

import { useState, useEffect } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { LoadingButton } from '@/components/LoadingStates'
import { 
  appointmentsAPI,
  getAvailableSlots,
  type BookingResponse,
  type TimeSlot,
  type AppointmentReschedule
} from '@/lib/api'
import { formatDateForAPI } from '@/lib/timezone'
import { 
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { useToast } from '@/hooks/use-toast'

interface QuickRescheduleProps {
  appointment: BookingResponse
  onSuccess?: (updatedAppointment: any) => void
  onCancel?: () => void
  inline?: boolean // For inline mode in calendar
}

interface SuggestedSlot {
  date: Date
  time: string
  label: string
  isNextAvailable?: boolean
}

export default function QuickReschedule({
  appointment,
  onSuccess,
  onCancel,
  inline = false
}: QuickRescheduleProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  
  // Parse appointment date
  const appointmentDate = parseISO(appointment.start_time)
  
  // State
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [suggestedSlots, setSuggestedSlots] = useState<SuggestedSlot[]>([])
  const [showAllDates, setShowAllDates] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  
  // Quick reschedule options
  const quickOptions = [
    { label: 'Tomorrow', days: 1 },
    { label: 'In 2 days', days: 2 },
    { label: 'Next week', days: 7 },
    { label: 'In 2 weeks', days: 14 }
  ]

  // Load suggested slots on mount
  useEffect(() => {
    loadSuggestedSlots()
  }, [])

  // Load available slots when date changes
  useEffect(() => {
    if (selectedDate) {
      loadTimeSlots(selectedDate)
    }
  }, [selectedDate])

  const loadSuggestedSlots = async () => {
    const suggestions: SuggestedSlot[] = []
    
    // Try to find slots for the next few days
    for (let i = 1; i <= 3; i++) {
      const checkDate = addDays(appointmentDate, i)
      try {
        const response = await getAvailableSlots({
          date: formatDateForAPI(checkDate),
          service_id: appointment.service_id,
          barber_id: appointment.barber_id
        })
        
        const available = response.slots?.filter(slot => slot.available) || []
        if (available.length > 0) {
          // Get same time if available, or first available
          const sameTime = available.find(slot => slot.time === format(appointmentDate, 'HH:mm'))
          const slot = sameTime || available[0]
          
          suggestions.push({
            date: checkDate,
            time: slot.time,
            label: i === 1 ? 'Tomorrow' : format(checkDate, 'EEE, MMM d'),
            isNextAvailable: slot.is_next_available
          })
          
          // Only need 3 suggestions
          if (suggestions.length >= 3) break
        }
      } catch (err) {
        console.error('Failed to load slots for date:', checkDate, err)
      }
    }
    
    setSuggestedSlots(suggestions)
  }

  const loadTimeSlots = async (date: Date) => {
    try {
      setLoadingSlots(true)
      const apiDate = formatDateForAPI(date)
      
      const response = await getAvailableSlots({
        date: apiDate,
        service_id: appointment.service_id,
        barber_id: appointment.barber_id
      })
      
      const available = response.slots?.filter(slot => slot.available) || []
      setAvailableSlots(available)
      
      // Auto-select same time if available
      const sameTime = available.find(slot => slot.time === format(appointmentDate, 'HH:mm'))
      if (sameTime) {
        setSelectedTime(sameTime.time)
      } else if (available.length === 1) {
        setSelectedTime(available[0].time)
      }
    } catch (err) {
      console.error('Failed to load time slots:', err)
      toast({
        title: 'Error',
        description: 'Failed to load available times.',
        variant: 'destructive',
      })
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleQuickReschedule = async (date: Date, time: string) => {
    try {
      setLoading(true)
      
      const rescheduleData: AppointmentReschedule = {
        date: formatDateForAPI(date),
        time: time
      }

      const result = await appointmentsAPI.reschedule(appointment.id, rescheduleData)
      
      toast({
        title: 'Success!',
        description: 'Appointment rescheduled successfully.',
      })
      
      onSuccess?.(result)
    } catch (err: any) {
      console.error('Failed to reschedule appointment:', err)
      toast({
        title: 'Error',
        description: err.message || 'Failed to reschedule appointment.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast({
        title: 'Missing Information',
        description: 'Please select both date and time.',
        variant: 'destructive',
      })
      return
    }

    await handleQuickReschedule(selectedDate, selectedTime)
  }

  if (inline) {
    // Inline mode for calendar integration
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-3">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" />
          Quick Reschedule
        </h4>
        
        {/* Suggested slots */}
        <div className="grid grid-cols-1 gap-2">
          {suggestedSlots.slice(0, 2).map((slot, index) => (
            <button
              key={index}
              onClick={() => handleQuickReschedule(slot.date, slot.time)}
              className="p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-primary-500 text-left text-sm"
            >
              <div className="font-medium">{slot.label}</div>
              <div className="text-gray-600 dark:text-gray-400">{slot.time}</div>
            </button>
          ))}
        </div>
        
        <button
          onClick={() => setShowAllDates(true)}
          className="text-sm text-primary-600 hover:text-primary-700"
        >
          More options →
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      {!showConfirmation ? (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reschedule Appointment</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Choose a new date and time</p>
          </div>

          {/* Current Appointment */}
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900 dark:text-yellow-100">Current Appointment</p>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                  {appointment.service_name} • {format(appointmentDate, 'EEEE, MMMM d')} at {format(appointmentDate, 'h:mm a')}
                </p>
                {appointment.barber_name && (
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    with {appointment.barber_name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Quick Suggestions */}
          {suggestedSlots.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Suggested Times
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestedSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedDate(slot.date)
                      setSelectedTime(slot.time)
                      setShowConfirmation(true)
                    }}
                    className="p-4 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg text-left transition-colors group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600">
                          {slot.label}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {slot.time}
                        </div>
                      </div>
                      <CalendarDaysIcon className="w-5 h-5 text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    {slot.isNextAvailable && (
                      <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                        Next available
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Date Selection */}
          <div className={showAllDates ? 'block' : 'hidden'}>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Select New Date
            </h3>
            
            {/* Quick date options */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {quickOptions.map((option) => {
                const date = addDays(new Date(), option.days)
                return (
                  <button
                    key={option.label}
                    onClick={() => setSelectedDate(date)}
                    className={`p-2 rounded-lg text-center transition-colors ${
                      selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
            
            {/* Date picker */}
            <input
              type="date"
              value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              min={format(addDays(new Date(), 1), 'yyyy-MM-dd')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4"
            />

            {/* Time slots */}
            {selectedDate && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Available Times
                </h3>
                
                {loadingSlots ? (
                  <div className="text-center py-8">
                    <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-500" />
                    <p className="text-gray-500">Loading available times...</p>
                  </div>
                ) : availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`p-2 rounded text-sm transition-colors ${
                          selectedTime === slot.time
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No available times for this date
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Show more dates button */}
          {!showAllDates && (
            <button
              onClick={() => setShowAllDates(true)}
              className="w-full py-3 text-center text-primary-600 hover:text-primary-700 font-medium"
            >
              Show more dates →
            </button>
          )}

          {/* Actions */}
          <div className="flex justify-between mt-6">
            <Button
              variant="outline"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <LoadingButton
              loading={loading}
              onClick={() => {
                if (selectedDate && selectedTime) {
                  setShowConfirmation(true)
                } else {
                  toast({
                    title: 'Select Date & Time',
                    description: 'Please select both a new date and time.',
                    variant: 'destructive',
                  })
                }
              }}
              disabled={!selectedDate || !selectedTime}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              Continue
            </LoadingButton>
          </div>
        </>
      ) : (
        /* Confirmation Screen */
        <div className="space-y-6">
          <div className="text-center">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Confirm Reschedule</h2>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            {/* Old appointment */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">From</p>
              <p className="font-medium">
                {format(appointmentDate, 'EEEE, MMMM d')} at {format(appointmentDate, 'h:mm a')}
              </p>
            </div>

            {/* Arrow */}
            <div className="text-center">
              <ArrowPathIcon className="w-6 h-6 text-gray-400 mx-auto" />
            </div>

            {/* New appointment */}
            <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border-2 border-primary-200 dark:border-primary-800">
              <p className="text-sm text-primary-600 dark:text-primary-400 mb-1">To</p>
              <p className="font-medium text-primary-900 dark:text-primary-100">
                {selectedDate && format(selectedDate, 'EEEE, MMMM d')} at {selectedTime}
              </p>
            </div>
          </div>

          {/* Service info */}
          <div className="text-center text-gray-600 dark:text-gray-400">
            <p>{appointment.service_name}</p>
            {appointment.barber_name && (
              <p className="text-sm">with {appointment.barber_name}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
            >
              Back
            </Button>
            <LoadingButton
              loading={loading}
              onClick={handleReschedule}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              <CheckCircleIcon className="w-5 h-5 mr-2" />
              Confirm Reschedule
            </LoadingButton>
          </div>
        </div>
      )}
    </div>
  )
}