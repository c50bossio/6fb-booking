'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { format, isToday, isTomorrow, addDays, isAfter } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  StarIcon,
  ArrowLeftIcon,
  WifiIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { useRealTimeAvailability, useQuickRebookOptions } from '@/lib/api/realtime-availability'
import { useRealTimeBooking } from '@/hooks/useRealTimeBooking'
import { MobileCalendarOptimizations } from '../calendar/MobileCalendarOptimizations'

interface MobileBookingExperienceProps {
  barberId?: number
  serviceId?: number
  locationId?: number
  onBookingComplete?: (appointmentId: number, confirmationNumber: string) => void
  className?: string
}

export function MobileBookingExperience({
  barberId,
  serviceId,
  locationId,
  onBookingComplete,
  className = ""
}: MobileBookingExperienceProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'calendar' | 'rebook' | 'confirmation'>('calendar')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Real-time availability
  const { availability, loading: availabilityLoading, error: availabilityError } = useRealTimeAvailability(
    selectedDate,
    { 
      barber_id: barberId,
      service_id: serviceId,
      location_id: locationId,
      include_popular: true
    }
  )

  // Quick rebook options
  const { rebookOptions, loading: rebookLoading, refetch: refetchRebook } = useQuickRebookOptions()

  // Booking management
  const {
    bookingState,
    selectSlot,
    confirmBooking,
    quickRebook,
    cancelBooking,
    resetBooking,
    canBook,
    isBooking,
    isSuccess,
    hasError
  } = useRealTimeBooking({
    enableOptimisticUpdates: true,
    conflictRetryAttempts: 3,
    showSuccessFeedback: true,
    autoSelectSimilarSlots: true
  })

  // Real-time update indicator
  useEffect(() => {
    if (availability) {
      setLastUpdate(new Date(availability.last_updated))
    }
  }, [availability])

  // Handle successful booking
  useEffect(() => {
    if (isSuccess && bookingState.appointmentId && bookingState.confirmationNumber) {
      setViewMode('confirmation')
      onBookingComplete?.(bookingState.appointmentId, bookingState.confirmationNumber)
    }
  }, [isSuccess, bookingState.appointmentId, bookingState.confirmationNumber, onBookingComplete])

  // Smart date suggestions
  const suggestedDates = useMemo(() => {
    const today = new Date()
    const suggestions = []

    // Today (if available)
    if (availability && isToday(selectedDate)) {
      const availableSlots = availability.slots.filter(s => s.available).length
      if (availableSlots > 0) {
        suggestions.push({
          date: today,
          label: 'Today',
          slots: availableSlots,
          priority: 'high' as const
        })
      }
    }

    // Tomorrow
    const tomorrow = addDays(today, 1)
    suggestions.push({
      date: tomorrow,
      label: 'Tomorrow',
      slots: 0, // Would need separate query
      priority: 'medium' as const
    })

    // Next few days
    for (let i = 2; i <= 4; i++) {
      const futureDate = addDays(today, i)
      suggestions.push({
        date: futureDate,
        label: format(futureDate, 'EEE, MMM d'),
        slots: 0,
        priority: 'low' as const
      })
    }

    return suggestions
  }, [availability, selectedDate])

  // Handle slot selection
  const handleSlotSelect = async (slot: any) => {
    await selectSlot(slot)
  }

  // Handle quick rebook
  const handleQuickRebook = async (rebookOption: any) => {
    if (rebookOption.suggested_slots?.[0]) {
      await quickRebook(rebookOption, rebookOption.suggested_slots[0])
    }
  }

  // Render real-time status indicator
  const renderStatusIndicator = () => (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
      <div className="flex items-center space-x-2 text-xs text-gray-600">
        <motion.div
          className="w-2 h-2 bg-green-400 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <span>Live availability</span>
        <span>•</span>
        <span>Updated {format(lastUpdate, 'h:mm a')}</span>
      </div>
      
      {availability && (
        <div className="flex items-center space-x-2 text-xs text-gray-600">
          <WifiIcon className="w-3 h-3" />
          <span>{availability.available_slots} available</span>
        </div>
      )}
    </div>
  )

  // Loading state
  if (availabilityLoading && !availability) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        {renderStatusIndicator()}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <motion.div
              className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <p className="text-gray-600">Loading availability...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (availabilityError) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-red-400 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Availability</h3>
            <p className="text-gray-600 mb-4">{availabilityError}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-blue-500 hover:bg-blue-600"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Success confirmation view
  if (viewMode === 'confirmation') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="h-full flex flex-col bg-green-50"
      >
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
            >
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            
            {bookingState.confirmationNumber && (
              <div className="mb-4">
                <p className="text-gray-600 mb-2">Confirmation Number</p>
                <p className="text-lg font-mono font-semibold text-gray-900">
                  {bookingState.confirmationNumber}
                </p>
              </div>
            )}

            {bookingState.selectedSlot && (
              <Card className="mb-6 text-left">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {format(new Date(bookingState.selectedSlot.time), 'EEEE, MMMM d')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(bookingState.selectedSlot.time), 'h:mm a')} • 
                        {bookingState.selectedSlot.duration} min
                      </p>
                      <p className="text-sm text-gray-600">
                        with {bookingState.selectedSlot.barber_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${bookingState.selectedSlot.price}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <Button 
                onClick={resetBooking}
                className="w-full bg-green-500 hover:bg-green-600"
              >
                Book Another Appointment
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => setViewMode('calendar')}
                className="w-full"
              >
                View Calendar
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <div className={`mobile-booking-experience h-full flex flex-col bg-gray-50 ${className}`}>
      {renderStatusIndicator()}

      {/* Header with mode toggle */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Book Appointment</h2>
          
          {rebookOptions.length > 0 && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  viewMode === 'calendar' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                <CalendarIcon className="w-4 h-4 inline mr-1" />
                Book New
              </button>
              <button
                onClick={() => setViewMode('rebook')}
                className={`px-3 py-1 rounded-md text-sm transition-colors ${
                  viewMode === 'rebook' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600'
                }`}
              >
                <BoltIcon className="w-4 h-4 inline mr-1" />
                Quick Rebook
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'calendar' ? (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 overflow-hidden"
          >
            <MobileCalendarOptimizations
              availableSlots={availability?.slots || []}
              onSlotSelect={handleSlotSelect}
              recentAppointments={rebookOptions}
              isLoading={availabilityLoading}
            />
          </motion.div>
        ) : (
          <motion.div
            key="rebook"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
          >
            <div className="text-sm text-gray-600 mb-4">
              Book the same appointment again with one tap
            </div>

            {rebookLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="w-32 h-4 bg-gray-200 rounded mb-2"></div>
                        <div className="w-24 h-3 bg-gray-200 rounded mb-1"></div>
                        <div className="w-20 h-3 bg-gray-200 rounded"></div>
                      </div>
                      <div className="w-20 h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : rebookOptions.length > 0 ? (
              rebookOptions.map((option) => (
                <motion.div
                  key={option.appointment_id}
                  layout
                  className="bg-white rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {option.service_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {option.barber_name} • {option.duration} min • ${option.price}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Last: {format(new Date(option.original_date), 'MMM d, h:mm a')}
                      </div>
                      
                      {option.suggested_slots?.[0] && (
                        <div className="text-xs text-blue-600 mt-2 flex items-center">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          Next available: {format(new Date(option.suggested_slots[0].time), 'MMM d, h:mm a')}
                        </div>
                      )}
                    </div>

                    <Button
                      size="sm"
                      variant={option.can_rebook ? "default" : "secondary"}
                      onClick={() => handleQuickRebook(option)}
                      disabled={!option.can_rebook || isBooking}
                      className="ml-3"
                    >
                      {option.can_rebook ? (
                        <>
                          Rebook
                          <ArrowRightIcon className="w-4 h-4 ml-1" />
                        </>
                      ) : (
                        'Unavailable'
                      )}
                    </Button>
                  </div>

                  {!option.can_rebook && option.reason && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">{option.reason}</p>
                    </div>
                  )}
                </motion.div>
              ))
            ) : (
              <div className="text-center py-8">
                <CheckCircleIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No recent appointments</p>
                <p className="text-sm text-gray-400 mt-1">
                  Book your first appointment to enable quick rebooking
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking confirmation modal */}
      <AnimatePresence>
        {bookingState.step === 'confirming' && bookingState.selectedSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white rounded-t-lg w-full max-h-[70vh] overflow-y-auto"
            >
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Confirm Booking</h3>
                  <button
                    onClick={cancelBooking}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ArrowLeftIcon className="w-5 h-5" />
                  </button>
                </div>

                <Card className="mb-4">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(new Date(bookingState.selectedSlot.time), 'EEEE, MMMM d')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(bookingState.selectedSlot.time), 'h:mm a')} • 
                          {bookingState.selectedSlot.duration} min
                        </p>
                        <p className="text-sm text-gray-600">
                          with {bookingState.selectedSlot.barber_name}
                        </p>
                        {bookingState.selectedSlot.service_name && (
                          <p className="text-sm text-gray-600">
                            {bookingState.selectedSlot.service_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          ${bookingState.selectedSlot.price}
                        </p>
                        {bookingState.selectedSlot.is_popular && (
                          <Badge variant="secondary" className="text-xs mt-1">
                            <StarIcon className="w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {bookingState.error && (
                  <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">{bookingState.error}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    onClick={() => confirmBooking()}
                    disabled={!canBook}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    {isBooking ? (
                      <>
                        <motion.div
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        Booking...
                      </>
                    ) : (
                      'Confirm Booking'
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={cancelBooking}
                    disabled={isBooking}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {hasError && bookingState.error && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-lg z-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                <span className="text-sm">{bookingState.error}</span>
              </div>
              <button
                onClick={resetBooking}
                className="text-white hover:text-gray-200"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default MobileBookingExperience