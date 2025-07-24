'use client'

/**
 * Mobile-enhanced version of UnifiedCalendar with improved touch interactions
 * Wraps the existing UnifiedCalendar with mobile-specific enhancements
 */

import React, { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { format, addHours, startOfDay } from 'date-fns'
import { useRouter } from 'next/navigation'
import { CalendarMobileEnhancements, MobileFAB } from './CalendarMobileEnhancements'
import { MobileCalendarModal, MobileActionSheet, MobileConfirmDialog } from './MobileCalendarModal'
import { MobileTimePicker } from './MobileTimePicker'
import { CalendarMobileMenu } from './CalendarMobileMenu'
import { useResponsive } from '@/hooks/useResponsive'
import { useToast } from '@/hooks/use-toast'
import type { CalendarView } from '@/types/calendar'

// Dynamically import UnifiedCalendar to avoid SSR issues
const UnifiedCalendar = dynamic(() => import('../UnifiedCalendar'), {
  ssr: false,
  loading: () => <div className="animate-pulse h-96 bg-gray-100 dark:bg-gray-800 rounded-lg" />
})

interface UnifiedCalendarMobileProps {
  // Pass through all UnifiedCalendar props
  view: CalendarView
  onViewChange?: (view: CalendarView) => void
  currentDate?: Date
  onDateChange?: (date: Date) => void
  appointments: any[]
  barbers?: any[]
  clients?: any[]
  selectedBarberId?: number | 'all'
  onBarberSelect?: (barberId: number | 'all') => void
  onAppointmentClick?: (appointment: any) => void
  onClientClick?: (client: any) => void
  onTimeSlotClick?: (date: Date, barberId?: number) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => void
  onDayClick?: (date: Date) => void
  onDayDoubleClick?: (date: Date) => void
  startHour?: number
  endHour?: number
  slotDuration?: number
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onRetry?: () => void
  onPreloadDate?: (date: Date) => void
  className?: string
  
  // Additional mobile props
  user?: any
  onSyncToggle?: () => void
  onConflictToggle?: () => void
}

export default function UnifiedCalendarMobile(props: UnifiedCalendarMobileProps) {
  const router = useRouter()
  const { isMobile } = useResponsive()
  const { toast } = useToast()
  
  // Mobile-specific state
  const [showQuickBooking, setShowQuickBooking] = useState(false)
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<Date | null>(null)
  const [showActions, setShowActions] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)

  // Enhanced navigation handlers
  const handleSwipeLeft = useCallback(() => {
    if (props.onDateChange && props.currentDate) {
      const newDate = new Date(props.currentDate)
      switch (props.view) {
        case 'day':
          newDate.setDate(newDate.getDate() + 1)
          break
        case 'week':
          newDate.setDate(newDate.getDate() + 7)
          break
        case 'month':
          newDate.setMonth(newDate.getMonth() + 1)
          break
      }
      props.onDateChange(newDate)
    }
  }, [props])

  const handleSwipeRight = useCallback(() => {
    if (props.onDateChange && props.currentDate) {
      const newDate = new Date(props.currentDate)
      switch (props.view) {
        case 'day':
          newDate.setDate(newDate.getDate() - 1)
          break
        case 'week':
          newDate.setDate(newDate.getDate() - 7)
          break
        case 'month':
          newDate.setMonth(newDate.getMonth() - 1)
          break
      }
      props.onDateChange(newDate)
    }
  }, [props])

  // Handle pinch zoom
  const handlePinchZoom = useCallback((scale: number) => {
    if (scale > 1.2 && props.view !== 'day') {
      // Zoom in - switch to more detailed view
      if (props.view === 'month') {
        props.onViewChange?.('week')
      } else if (props.view === 'week') {
        props.onViewChange?.('day')
      }
    } else if (scale < 0.8 && props.view !== 'month') {
      // Zoom out - switch to less detailed view
      if (props.view === 'day') {
        props.onViewChange?.('week')
      } else if (props.view === 'week') {
        props.onViewChange?.('month')
      }
    }
    setZoomLevel(scale)
  }, [props])

  // Handle double tap for quick booking
  const handleDoubleTap = useCallback((position: { x: number; y: number }) => {
    if (props.view === 'day' || props.view === 'week') {
      // Calculate time based on position
      const now = new Date()
      const timeSlot = addHours(startOfDay(props.currentDate || now), 10) // Default to 10 AM
      setSelectedTimeSlot(timeSlot)
      setShowQuickBooking(true)
    }
  }, [props])

  // Handle long press on appointments
  const handleLongPress = useCallback((position: { x: number; y: number }) => {
    // Find appointment at position (this would need actual position detection)
    // For now, we'll use the selected appointment from props
    if (selectedAppointment) {
      setShowActions(true)
    }
  }, [selectedAppointment])

  // Enhanced appointment click handler
  const handleAppointmentClick = useCallback((appointment: any) => {
    setSelectedAppointment(appointment)
    if (isMobile) {
      setShowActions(true)
    } else if (props.onAppointmentClick) {
      props.onAppointmentClick(appointment)
    }
  }, [isMobile, props])

  // Handle time slot selection
  const handleTimeSlotClick = useCallback((date: Date, barberId?: number) => {
    setSelectedTimeSlot(date)
    if (isMobile) {
      setShowTimePicker(true)
    } else if (props.onTimeSlotClick) {
      props.onTimeSlotClick(date, barberId)
    }
  }, [isMobile, props])

  // Handle quick booking
  const handleQuickBooking = useCallback(() => {
    if (selectedTimeSlot) {
      router.push(`/bookings/new?date=${selectedTimeSlot.toISOString()}`)
    }
    setShowQuickBooking(false)
  }, [selectedTimeSlot, router])

  // Handle appointment actions
  const appointmentActions = selectedAppointment ? [
    {
      label: 'View Details',
      icon: '👁️',
      onClick: () => {
        if (props.onAppointmentClick) {
          props.onAppointmentClick(selectedAppointment)
        }
        setShowActions(false)
      }
    },
    {
      label: 'Reschedule',
      icon: '📅',
      onClick: () => {
        router.push(`/appointments/${selectedAppointment.id}/reschedule`)
        setShowActions(false)
      },
      variant: 'primary' as const
    },
    {
      label: 'Cancel Appointment',
      icon: '❌',
      onClick: () => {
        setShowCancelConfirm(true)
        setShowActions(false)
      },
      variant: 'danger' as const,
      disabled: selectedAppointment.status === 'cancelled' || selectedAppointment.status === 'completed'
    }
  ] : []

  // Handle appointment cancellation
  const handleCancelAppointment = useCallback(async () => {
    if (!selectedAppointment) return

    try {
      // Call API to cancel appointment
      const response = await fetch(`/api/v2/appointments/${selectedAppointment.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        toast({
          title: 'Appointment Cancelled',
          description: 'The appointment has been cancelled successfully.',
          variant: 'default'
        })
        
        // Refresh appointments
        if (props.onRefresh) {
          props.onRefresh()
        }
      } else {
        throw new Error('Failed to cancel appointment')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel appointment. Please try again.',
        variant: 'destructive'
      })
    }

    setShowCancelConfirm(false)
    setSelectedAppointment(null)
  }, [selectedAppointment, props, toast])

  // Wrap the calendar with mobile enhancements
  return (
    <>
      <CalendarMobileEnhancements
        onSwipeLeft={handleSwipeLeft}
        onSwipeRight={handleSwipeRight}
        onPinchZoom={handlePinchZoom}
        onDoubleTap={handleDoubleTap}
        onLongPress={handleLongPress}
        className="relative"
      >
        {/* Mobile menu */}
        {isMobile && props.user && (
          <div className="absolute top-2 right-2 z-20">
            <CalendarMobileMenu
              user={props.user}
              onSyncToggle={props.onSyncToggle || (() => {})}
              onConflictToggle={props.onConflictToggle || (() => {})}
            />
          </div>
        )}

        {/* Main calendar */}
        <UnifiedCalendar
          {...props}
          onAppointmentClick={handleAppointmentClick}
          onTimeSlotClick={handleTimeSlotClick}
          className={`${props.className} ${isMobile ? 'mobile-optimized' : ''}`}
        />
      </CalendarMobileEnhancements>

      {/* Mobile FAB for quick booking */}
      {isMobile && (
        <MobileFAB 
          onClick={() => setShowQuickBooking(true)}
        />
      )}

      {/* Quick booking modal */}
      <MobileCalendarModal
        isOpen={showQuickBooking}
        onClose={() => setShowQuickBooking(false)}
        title="Quick Booking"
      >
        <div className="p-4">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {selectedTimeSlot 
              ? `Book an appointment for ${format(selectedTimeSlot, 'EEEE, MMMM d at h:mm a')}`
              : 'Select a time for your appointment'
            }
          </p>
          <button
            onClick={handleQuickBooking}
            className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium"
          >
            Continue to Booking
          </button>
        </div>
      </MobileCalendarModal>

      {/* Time picker modal */}
      {selectedTimeSlot && (
        <MobileTimePicker
          selectedTime={selectedTimeSlot}
          onTimeChange={(time) => {
            setSelectedTimeSlot(time)
            if (props.onTimeSlotClick) {
              props.onTimeSlotClick(time)
            }
          }}
          onClose={() => setShowTimePicker(false)}
        />
      )}

      {/* Appointment actions sheet */}
      <MobileActionSheet
        isOpen={showActions}
        onClose={() => setShowActions(false)}
        title={selectedAppointment ? `${selectedAppointment.client_name} - ${selectedAppointment.service_name}` : ''}
        actions={appointmentActions}
      />

      {/* Cancel confirmation dialog */}
      <MobileConfirmDialog
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancelAppointment}
        title="Cancel Appointment?"
        message={`Are you sure you want to cancel the appointment with ${selectedAppointment?.client_name}?`}
        confirmLabel="Yes, Cancel"
        variant="danger"
      />

      {/* Mobile-specific styles */}
      <style jsx global>{`
        .mobile-optimized {
          /* Ensure proper touch scrolling */
          -webkit-overflow-scrolling: touch;
          
          /* Optimize for mobile rendering */
          will-change: transform;
          
          /* Prevent text selection during swipe */
          user-select: none;
          -webkit-user-select: none;
        }
        
        /* Ensure all interactive elements have proper touch targets */
        .mobile-optimized button,
        .mobile-optimized a,
        .mobile-optimized [role="button"] {
          min-height: 44px;
          min-width: 44px;
        }
        
        /* Improve tap highlight */
        .mobile-optimized * {
          -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
        }
        
        /* Safe area padding for notched devices */
        .mobile-optimized {
          padding-left: env(safe-area-inset-left);
          padding-right: env(safe-area-inset-right);
        }
      `}</style>
    </>
  )
}