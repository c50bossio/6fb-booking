'use client'

import React, { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import ServiceSelector from './ServiceSelector'
import AvailabilityCalendar from './AvailabilityCalendar'
import { bookingService } from '@/lib/api/bookings'
import { cn } from '@/lib/utils'

export interface BookingWidgetProps {
  barberId?: number
  locationId?: number
  serviceId?: number
  onBookingComplete?: (bookingData: any) => void
  className?: string
  embedded?: boolean
}

interface BookingState {
  step: 'service' | 'datetime' | 'confirm'
  selectedService: any | null
  selectedDate: Date | null
  selectedTime: string | null
  selectedBarber: any | null
}

const BookingWidget: React.FC<BookingWidgetProps> = ({
  barberId,
  locationId,
  serviceId,
  onBookingComplete,
  className,
  embedded = false
}) => {
  const [bookingState, setBookingState] = useState<BookingState>({
    step: 'service',
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    selectedBarber: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (serviceId) {
      // Load service details if serviceId is provided
      loadService(serviceId)
    }
  }, [serviceId])

  const loadService = async (id: number) => {
    try {
      setLoading(true)
      const response = await bookingService.getService(id)
      setBookingState(prev => ({
        ...prev,
        selectedService: response.data,
        step: 'datetime'
      }))
    } catch (err) {
      setError('Failed to load service details')
    } finally {
      setLoading(false)
    }
  }

  const handleServiceSelect = (service: any) => {
    setBookingState(prev => ({
      ...prev,
      selectedService: service,
      step: 'datetime'
    }))
  }

  const handleDateTimeSelect = (date: Date, time: string, barber: any) => {
    setBookingState(prev => ({
      ...prev,
      selectedDate: date,
      selectedTime: time,
      selectedBarber: barber,
      step: 'confirm'
    }))
  }

  const handleBookingConfirm = async () => {
    try {
      setLoading(true)
      setError(null)

      const bookingData = {
        service_id: bookingState.selectedService?.id,
        barber_id: bookingState.selectedBarber?.id || barberId,
        appointment_date: bookingState.selectedDate?.toISOString().split('T')[0],
        appointment_time: bookingState.selectedTime,
        location_id: locationId || bookingState.selectedBarber?.location_id,
        client_info: {
          name: 'Demo User', // In real app, this would come from form or auth
          email: 'demo@example.com',
          phone: '555-0123'
        }
      }

      const response = await bookingService.createBooking(bookingData)
      
      if (onBookingComplete) {
        onBookingComplete(response.data)
      }

      // Reset state after successful booking
      setBookingState({
        step: 'service',
        selectedService: null,
        selectedDate: null,
        selectedTime: null,
        selectedBarber: null
      })
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create booking')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setBookingState(prev => ({
      ...prev,
      step: prev.step === 'confirm' ? 'datetime' : 'service'
    }))
  }

  const containerClass = cn(
    'w-full max-w-4xl mx-auto',
    embedded ? 'p-0' : 'p-6',
    className
  )

  if (loading && !bookingState.selectedService) {
    return (
      <div className={containerClass}>
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <LoadingSpinner />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={containerClass}>
      <Card className="overflow-hidden">
        {/* Progress Indicator */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                bookingState.step === 'service' ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
              )}>
                1
              </div>
              <span className={cn(
                'text-sm font-medium',
                bookingState.step === 'service' ? 'text-gray-900' : 'text-gray-500'
              )}>
                Select Service
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                bookingState.step === 'datetime' ? 'bg-blue-600 text-white' : 
                bookingState.selectedService ? 'bg-gray-300 text-gray-600' : 'bg-gray-200 text-gray-400'
              )}>
                2
              </div>
              <span className={cn(
                'text-sm font-medium',
                bookingState.step === 'datetime' ? 'text-gray-900' : 'text-gray-500'
              )}>
                Choose Date & Time
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className={cn(
                'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                bookingState.step === 'confirm' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'
              )}>
                3
              </div>
              <span className={cn(
                'text-sm font-medium',
                bookingState.step === 'confirm' ? 'text-gray-900' : 'text-gray-500'
              )}>
                Confirm Booking
              </span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 m-6 mb-0">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {bookingState.step === 'service' && (
            <ServiceSelector
              locationId={locationId}
              barberId={barberId}
              onServiceSelect={handleServiceSelect}
              selectedService={bookingState.selectedService}
            />
          )}

          {bookingState.step === 'datetime' && bookingState.selectedService && (
            <AvailabilityCalendar
              service={bookingState.selectedService}
              barberId={barberId}
              locationId={locationId}
              onDateTimeSelect={handleDateTimeSelect}
            />
          )}

          {bookingState.step === 'confirm' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold">Booking Summary</h3>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{bookingState.selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Barber:</span>
                  <span className="font-medium">{bookingState.selectedBarber?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {bookingState.selectedDate?.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">{bookingState.selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">{bookingState.selectedService?.duration} min</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-gray-900 font-semibold">Total:</span>
                  <span className="font-semibold text-lg">${bookingState.selectedService?.price}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6">
          <div className="flex justify-between">
            {bookingState.step !== 'service' && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={loading}
              >
                Back
              </Button>
            )}
            
            {bookingState.step === 'confirm' && (
              <Button
                type="button"
                onClick={handleBookingConfirm}
                disabled={loading}
                className="ml-auto"
              >
                {loading ? <LoadingSpinner /> : 'Confirm Booking'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default BookingWidget