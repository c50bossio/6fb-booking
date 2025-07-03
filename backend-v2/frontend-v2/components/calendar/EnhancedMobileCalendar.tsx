'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import ResponsiveCalendarLayout from './ResponsiveCalendarLayout'
import MobileBookingOverlay from './MobileBookingOverlay'
import MobileTimeSlot from './MobileTimeSlot'
import { useMobileInteractions } from '@/hooks/useMobileInteractions'
import { useResponsiveCalendar } from '@/hooks/useResponsiveCalendar'

interface Appointment {
  id: number
  start_time: string
  end_time?: string
  service_name: string
  client_name?: string
  client_email?: string
  client_phone?: string
  barber_id?: number
  barber_name?: string
  status: string
  duration_minutes?: number
  price?: number
}

interface Service {
  id: number
  name: string
  duration: number
  price: number
  description?: string
}

interface Barber {
  id: number
  name: string
  avatar?: string
  specialties?: string[]
}

interface EnhancedMobileCalendarProps {
  appointments?: Appointment[]
  services?: Service[]
  barbers?: Barber[]
  selectedDate: Date
  onDateChange: (date: Date) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onBookingCreate?: (bookingData: any) => Promise<void>
  onAppointmentUpdate?: (appointment: Appointment) => Promise<void>
  onAppointmentDelete?: (appointmentId: number) => Promise<void>
  onRefresh?: () => Promise<void>
  selectedBarberId?: number | 'all'
  isLoading?: boolean
  enableAccessibility?: boolean
  className?: string
}

export default function EnhancedMobileCalendar({
  appointments = [],
  services = [],
  barbers = [],
  selectedDate,
  onDateChange,
  onAppointmentClick,
  onBookingCreate,
  onAppointmentUpdate,
  onAppointmentDelete,
  onRefresh,
  selectedBarberId = 'all',
  isLoading = false,
  enableAccessibility = true,
  className = ''
}: EnhancedMobileCalendarProps) {
  const [showBookingOverlay, setShowBookingOverlay] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ hour: number; minute: number } | null>(null)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false)

  const { 
    triggerHapticFeedback, 
    useLongPress, 
    announceToScreenReader,
    checkTouchTargetSize,
    prefersReducedMotion
  } = useMobileInteractions()
  
  const responsive = useResponsiveCalendar()

  // Handle time slot click for booking
  const handleTimeSlotClick = useCallback((date: Date, hour: number, minute: number) => {
    setSelectedTimeSlot({ hour, minute })
    setShowBookingOverlay(true)
    
    if (enableAccessibility) {
      announceToScreenReader(
        `Opening booking form for ${format(date, 'EEEE, MMMM d')} at ${hour}:${minute.toString().padStart(2, '0')}`,
        'assertive'
      )
    }
    
    triggerHapticFeedback({ type: 'light' })
  }, [enableAccessibility, announceToScreenReader, triggerHapticFeedback])

  // Handle appointment click
  const handleAppointmentClick = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setShowAppointmentDetails(true)
    
    if (enableAccessibility) {
      announceToScreenReader(
        `Viewing details for ${appointment.service_name} appointment with ${appointment.client_name || 'client'}`,
        'polite'
      )
    }
    
    triggerHapticFeedback({ type: 'light' })
    onAppointmentClick?.(appointment)
  }, [enableAccessibility, announceToScreenReader, triggerHapticFeedback, onAppointmentClick])

  // Handle appointment long press for quick actions
  const handleAppointmentLongPress = useCallback((appointment: Appointment) => {
    setSelectedAppointment(appointment)
    
    if (enableAccessibility) {
      announceToScreenReader(
        `Quick actions menu opened for ${appointment.service_name} appointment`,
        'assertive'
      )
    }

    // Show quick action menu (could be implemented as a context menu)
    // For now, just show details
    setShowAppointmentDetails(true)
  }, [enableAccessibility, announceToScreenReader])

  // Handle booking creation
  const handleBookingCreate = useCallback(async (bookingData: any) => {
    try {
      await onBookingCreate?.(bookingData)
      
      if (enableAccessibility) {
        announceToScreenReader(
          `Appointment booked successfully for ${bookingData.service.name} on ${format(selectedDate, 'MMMM d')}`,
          'assertive'
        )
      }
      
      triggerHapticFeedback({ type: 'heavy' })
      setShowBookingOverlay(false)
      setSelectedTimeSlot(null)
    } catch (error) {
      if (enableAccessibility) {
        announceToScreenReader('Failed to book appointment. Please try again.', 'assertive')
      }
      
      triggerHapticFeedback({ type: 'heavy', pattern: [100, 50, 100] })
      throw error
    }
  }, [onBookingCreate, enableAccessibility, announceToScreenReader, triggerHapticFeedback, selectedDate])

  // Handle refresh with feedback
  const handleRefresh = useCallback(async () => {
    if (enableAccessibility) {
      announceToScreenReader('Refreshing calendar data', 'polite')
    }
    
    try {
      await onRefresh?.()
      
      if (enableAccessibility) {
        announceToScreenReader('Calendar refreshed successfully', 'polite')
      }
      
      triggerHapticFeedback({ type: 'light' })
    } catch (error) {
      if (enableAccessibility) {
        announceToScreenReader('Failed to refresh calendar data', 'assertive')
      }
      
      triggerHapticFeedback({ type: 'heavy' })
    }
  }, [onRefresh, enableAccessibility, announceToScreenReader, triggerHapticFeedback])

  // Handle date change with announcement
  const handleDateChange = useCallback((date: Date) => {
    onDateChange(date)
    
    if (enableAccessibility) {
      announceToScreenReader(
        `Calendar date changed to ${format(date, 'EEEE, MMMM d, yyyy')}`,
        'polite'
      )
    }
    
    triggerHapticFeedback({ type: 'light' })
  }, [onDateChange, enableAccessibility, announceToScreenReader, triggerHapticFeedback])

  // Handle create appointment button
  const handleCreateAppointment = useCallback(() => {
    // Default to current time or next available slot
    const now = new Date()
    const hour = now.getHours()
    const minute = Math.ceil(now.getMinutes() / 30) * 30
    
    setSelectedTimeSlot({ hour, minute: minute === 60 ? 0 : minute })
    setShowBookingOverlay(true)
    
    if (enableAccessibility) {
      announceToScreenReader('Opening new appointment booking form', 'assertive')
    }
    
    triggerHapticFeedback({ type: 'medium' })
  }, [enableAccessibility, announceToScreenReader, triggerHapticFeedback])

  // Handle appointment deletion
  const handleAppointmentDelete = useCallback(async (appointmentId: number) => {
    try {
      await onAppointmentDelete?.(appointmentId)
      
      if (enableAccessibility) {
        announceToScreenReader('Appointment deleted successfully', 'assertive')
      }
      
      triggerHapticFeedback({ type: 'medium' })
      setShowAppointmentDetails(false)
      setSelectedAppointment(null)
    } catch (error) {
      if (enableAccessibility) {
        announceToScreenReader('Failed to delete appointment', 'assertive')
      }
      
      triggerHapticFeedback({ type: 'heavy' })
    }
  }, [onAppointmentDelete, enableAccessibility, announceToScreenReader, triggerHapticFeedback])

  // Accessibility: Announce loading state changes
  useEffect(() => {
    if (enableAccessibility && isLoading) {
      announceToScreenReader('Loading calendar data', 'polite')
    }
  }, [isLoading, enableAccessibility, announceToScreenReader])

  // Accessibility: Set up screen reader announcements container
  useEffect(() => {
    if (!enableAccessibility || typeof window === 'undefined') return

    // Ensure screen reader announcement container exists
    let announcer = document.getElementById('screen-reader-announcements')
    if (!announcer) {
      announcer = document.createElement('div')
      announcer.id = 'screen-reader-announcements'
      announcer.setAttribute('aria-live', 'polite')
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-only'
      announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `
      document.body.appendChild(announcer)
    }

    return () => {
      // Cleanup on unmount
      const announcer = document.getElementById('screen-reader-announcements')
      if (announcer && announcer.parentNode) {
        announcer.parentNode.removeChild(announcer)
      }
    }
  }, [enableAccessibility])

  return (
    <div className={`h-full ${className}`}>
      {/* Main calendar layout */}
      <ResponsiveCalendarLayout
        appointments={appointments}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onAppointmentClick={handleAppointmentClick}
        onTimeSlotClick={handleTimeSlotClick}
        onCreateAppointment={handleCreateAppointment}
        onRefresh={handleRefresh}
        selectedBarberId={selectedBarberId}
        isLoading={isLoading}
      />

      {/* Booking overlay */}
      {showBookingOverlay && selectedTimeSlot && (
        <MobileBookingOverlay
          isOpen={showBookingOverlay}
          onClose={() => {
            setShowBookingOverlay(false)
            setSelectedTimeSlot(null)
            
            if (enableAccessibility) {
              announceToScreenReader('Booking form closed', 'polite')
            }
          }}
          selectedDate={selectedDate}
          selectedTime={selectedTimeSlot}
          services={services}
          barbers={barbers}
          onBooking={handleBookingCreate}
          enableHaptics={!prefersReducedMotion()}
        />
      )}

      {/* Appointment details overlay */}
      {showAppointmentDetails && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Appointment Details
              </h3>
              <button
                onClick={() => {
                  setShowAppointmentDetails(false)
                  setSelectedAppointment(null)
                  
                  if (enableAccessibility) {
                    announceToScreenReader('Appointment details closed', 'polite')
                  }
                }}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label="Close appointment details"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {selectedAppointment.service_name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedAppointment.client_name || 'Client'}
                </p>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>Status: <span className="capitalize">{selectedAppointment.status}</span></p>
                {selectedAppointment.duration_minutes && (
                  <p>Duration: {selectedAppointment.duration_minutes} minutes</p>
                )}
                {selectedAppointment.price && (
                  <p>Price: ${selectedAppointment.price}</p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    // Handle edit appointment
                    setShowAppointmentDetails(false)
                    // Could open edit form here
                  }}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Edit
                </button>
                
                <button
                  onClick={() => handleAppointmentDelete(selectedAppointment.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accessibility: Screen reader only content */}
      {enableAccessibility && (
        <>
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            Current view: Calendar for {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </div>
          
          <div className="sr-only">
            {appointments.length} appointments scheduled for this day
          </div>
        </>
      )}
    </div>
  )
}