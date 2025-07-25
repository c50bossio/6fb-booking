'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ClockIcon, UserIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import MobileModal from './MobileModal'
import { touchTargets, mobileSpacing } from '@/hooks/useResponsiveCalendar'

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

interface MobileBookingOverlayProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  selectedTime: { hour: number; minute: number }
  services: Service[]
  barbers: Barber[]
  onBooking: (bookingData: any) => Promise<void>
  enableHaptics?: boolean
}

export default function MobileBookingOverlay({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  services,
  barbers,
  onBooking,
  enableHaptics = true
}: MobileBookingOverlayProps) {
  const [step, setStep] = useState(1)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null)
  const [clientInfo, setClientInfo] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Haptic feedback utility
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptics || typeof window === 'undefined') return
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [enableHaptics])

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setSelectedService(null)
      setSelectedBarber(null)
      setClientInfo({ name: '', phone: '', email: '', notes: '' })
      setErrors({})
      setIsSubmitting(false)
    }
  }, [isOpen])

  // Validate current step
  const validateStep = useCallback(() => {
    const newErrors: Record<string, string> = {}

    if (step === 1 && !selectedService) {
      newErrors.service = 'Please select a service'
    }
    
    if (step === 2 && !selectedBarber) {
      newErrors.barber = 'Please select a barber'
    }
    
    if (step === 3) {
      if (!clientInfo.name.trim()) {
        newErrors.name = 'Name is required'
      }
      if (!clientInfo.phone.trim()) {
        newErrors.phone = 'Phone number is required'
      }
      if (!clientInfo.email.trim()) {
        newErrors.email = 'Email is required'
      } else if (!/\S+@\S+\.\S+/.test(clientInfo.email)) {
        newErrors.email = 'Please enter a valid email'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }, [step, selectedService, selectedBarber, clientInfo])

  // Handle next step
  const handleNext = useCallback(() => {
    if (validateStep()) {
      triggerHapticFeedback('light')
      setStep(prev => prev + 1)
    } else {
      triggerHapticFeedback('heavy')
    }
  }, [validateStep, triggerHapticFeedback])

  // Handle previous step
  const handlePrevious = useCallback(() => {
    triggerHapticFeedback('light')
    setStep(prev => prev - 1)
  }, [triggerHapticFeedback])

  // Handle form submission
  const handleSubmit = useCallback(async () => {
    if (!validateStep() || !selectedService || !selectedBarber) return

    setIsSubmitting(true)
    triggerHapticFeedback('medium')

    try {
      const bookingData = {
        date: selectedDate,
        time: selectedTime,
        service: selectedService,
        barber: selectedBarber,
        client: clientInfo
      }

      await onBooking(bookingData)
      triggerHapticFeedback('heavy')
      onClose()
    } catch (error) {
      console.error('Booking failed:', error)
      setErrors({ submit: 'Failed to create booking. Please try again.' })
      triggerHapticFeedback('heavy')
    } finally {
      setIsSubmitting(false)
    }
  }, [validateStep, selectedService, selectedBarber, selectedDate, selectedTime, clientInfo, onBooking, onClose, triggerHapticFeedback])

  // Get modal title based on step
  const getModalTitle = () => {
    switch (step) {
      case 1:
        return 'Select Service'
      case 2:
        return 'Choose Barber'
      case 3:
        return 'Your Information'
      case 4:
        return 'Confirm Booking'
      default:
        return 'Book Appointment'
    }
  }

  // Format selected time
  const appointmentTime = new Date(selectedDate)
  appointmentTime.setHours(selectedTime.hour, selectedTime.minute, 0, 0)

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title={getModalTitle()}
      size="lg"
      position="bottom"
      enableSwipeToClose={step === 1}
      enableHaptics={enableHaptics}
    >
      <div className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center space-x-2">
          {[1, 2, 3, 4].map((stepNumber) => (
            <div
              key={stepNumber}
              className={`w-2 h-2 rounded-full transition-colors ${
                stepNumber <= step 
                  ? 'bg-primary-600' 
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Service Selection */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {format(appointmentTime, 'EEEE, MMMM d, yyyy')} at {format(appointmentTime, 'h:mm a')}
              </p>
            </div>
            
            <div className="space-y-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedService(service)
                    triggerHapticFeedback('light')
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedService?.id === service.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  style={{ minHeight: touchTargets.recommended }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {service.name}
                      </h3>
                      {service.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          {service.duration} min
                        </span>
                        <span className="font-medium">${service.price}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {errors.service && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.service}</p>
            )}
          </div>
        )}

        {/* Step 2: Barber Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {selectedService?.name} - {selectedService?.duration} min
              </p>
            </div>
            
            <div className="space-y-3">
              {barbers.map((barber) => (
                <button
                  key={barber.id}
                  onClick={() => {
                    setSelectedBarber(barber)
                    triggerHapticFeedback('light')
                  }}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    selectedBarber?.id === barber.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  style={{ minHeight: touchTargets.recommended }}
                >
                  <div className="flex items-center space-x-3">
                    {barber.avatar ? (
                      <img
                        src={barber.avatar}
                        alt={barber.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <UserIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {barber.name}
                      </h3>
                      {barber.specialties && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {barber.specialties.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            {errors.barber && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.barber}</p>
            )}
          </div>
        )}

        {/* Step 3: Client Information */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  style={{ minHeight: touchTargets.recommended }}
                  placeholder="Your full name"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  style={{ minHeight: touchTargets.recommended }}
                  placeholder="(555) 123-4567"
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  style={{ minHeight: touchTargets.recommended }}
                  placeholder="your.email@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Special Requests (Optional)
                </label>
                <textarea
                  value={clientInfo.notes}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  placeholder="Any special requests or notes..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Booking Summary</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Service:</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Barber:</span>
                  <span className="font-medium">{selectedBarber?.name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Date & Time:</span>
                  <span className="font-medium">
                    {format(appointmentTime, 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                  <span className="font-medium">{selectedService?.duration} minutes</span>
                </div>
                
                <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-600 dark:text-gray-400">Total:</span>
                  <span className="font-bold text-lg">${selectedService?.price}</span>
                </div>
              </div>
            </div>

            {errors.submit && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            )}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {step > 1 && (
            <button
              onClick={handlePrevious}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              style={{ minHeight: touchTargets.recommended }}
            >
              Previous
            </button>
          )}
          
          {step < 4 ? (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !selectedService) ||
                (step === 2 && !selectedBarber) ||
                (step === 3 && Object.keys(errors).length > 0)
              }
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ minHeight: touchTargets.recommended }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ minHeight: touchTargets.recommended }}
            >
              {isSubmitting ? 'Booking...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </MobileModal>
  )
}