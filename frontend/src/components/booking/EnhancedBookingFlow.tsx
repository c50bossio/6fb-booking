'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  ScissorsIcon,
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  GiftIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import PaymentStep from './PaymentStep'
import SimplePaymentStep from './SimplePaymentStep'
import { PaymentSuccess, PaymentFailure } from '@/components/payments'
import { PaymentProcessor, PaymentValidator } from '@/lib/payment-utils'
import {
  recurringBookingsService,
  RecurrencePattern,
  type CreateSeriesRequest,
  type RecurrenceOptionConfig,
  RECURRENCE_OPTIONS
} from '@/lib/api/recurring-bookings'
import type { Service } from '@/lib/api/services'

interface Service {
  id: string
  name: string
  description: string
  duration: number
  price: number
  category: string
  image?: string
  isPopular?: boolean
  requirements?: string[]
}

interface Barber {
  id: string
  name: string
  avatar?: string
  rating: number
  reviewCount: number
  specialties: string[]
  experience: string
  availability: { [date: string]: string[] }
  isRecommended?: boolean
}

interface TimeSlot {
  time: string
  available: boolean
  barberId: string
  price?: number
}

interface BookingData {
  service?: Service
  barber?: Barber
  date?: string
  time?: string
  clientInfo?: {
    name: string
    email: string
    phone: string
    notes?: string
  }
  paymentMethod?: 'full' | 'deposit'
  paymentDetails?: {
    method: 'full' | 'deposit'
    amount: number
    currency: string
    status: string
    transaction_id: string
    payment_method_id: string
  }
  totalPrice?: number
  appointmentId?: number
  paymentId?: number
  paymentCompleted?: boolean
  paymentError?: string
  // Recurring booking data
  isRecurring?: boolean
  recurringData?: {
    pattern: RecurrencePattern
    preferredTime: string
    startDate: string
    endDate?: string
    maxAppointments?: number
    discountPercent: number
    seriesName?: string
    intervalWeeks?: number
    isFlexibleTime: boolean
  }
  seriesToken?: string
}

interface EnhancedBookingFlowProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (bookingData: BookingData) => void
  selectedDate?: string
  selectedTime?: string
  theme?: 'light' | 'dark'
  services?: Service[]
  barbers?: Barber[]
  workingHours?: { start: string; end: string }
  timeSlotDuration?: number
  enableRecurringBookings?: boolean
}

const STEPS = [
  { id: 'service', title: 'Choose Service', description: 'Select your desired service' },
  { id: 'barber', title: 'Select Barber', description: 'Choose your preferred barber' },
  { id: 'datetime', title: 'Pick Date & Time', description: 'Select your appointment slot' },
  { id: 'recurring', title: 'Recurring Options', description: 'Set up recurring appointments (optional)' },
  { id: 'details', title: 'Your Details', description: 'Provide contact information' },
  { id: 'payment', title: 'Payment', description: 'Secure payment' },
  { id: 'confirmation', title: 'Confirmation', description: 'Review and confirm booking' }
]

export default function EnhancedBookingFlow({
  isOpen,
  onClose,
  onComplete,
  selectedDate,
  selectedTime,
  theme = 'dark',
  services = [],
  barbers = [],
  workingHours = { start: '08:00', end: '18:00' },
  timeSlotDuration = 30,
  enableRecurringBookings = true
}: EnhancedBookingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [bookingData, setBookingData] = useState<BookingData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [paymentStep, setPaymentStep] = useState<'selection' | 'processing' | 'success' | 'failure'>('selection')
  const [useSimplePayment, setUseSimplePayment] = useState(true)
  const [availableSlots, setAvailableSlots] = useState<{ [date: string]: TimeSlot[] }>({})
  const [showRecurringOption, setShowRecurringOption] = useState(false)

  // Skip recurring step if disabled
  const activeSteps = enableRecurringBookings ? STEPS : STEPS.filter(step => step.id !== 'recurring')

  // Initialize with selected date/time if provided
  useEffect(() => {
    if (selectedDate && selectedTime) {
      setBookingData(prev => ({
        ...prev,
        date: selectedDate,
        time: selectedTime
      }))
      // Skip to details step if coming from calendar
      const skipToStep = enableRecurringBookings ? 4 : 3
      setCurrentStep(skipToStep)
    }
  }, [selectedDate, selectedTime, enableRecurringBookings])

  // Generate available time slots for selected barber and dates
  useEffect(() => {
    if (bookingData.barber) {
      const slots: { [date: string]: TimeSlot[] } = {}
      const dates = getNext7Days()

      dates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0]
        const barberAvailability = bookingData.barber!.availability[dateStr] || []

        slots[dateStr] = generateTimeSlots().map(time => ({
          time,
          available: barberAvailability.includes(time),
          barberId: bookingData.barber!.id,
          price: bookingData.service?.price
        }))
      })

      setAvailableSlots(slots)
    }
  }, [bookingData.barber, bookingData.service])

  const getNext7Days = () => {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const generateTimeSlots = () => {
    const slots = []
    const start = new Date(`2024-01-01T${workingHours.start}:00`)
    const end = new Date(`2024-01-01T${workingHours.end}:00`)

    let current = new Date(start)
    while (current < end) {
      slots.push(current.toTimeString().slice(0, 5))
      current = new Date(current.getTime() + timeSlotDuration * 60000)
    }

    return slots
  }

  const validateStep = (step: number): boolean => {
    const newErrors: { [key: string]: string } = {}
    const currentStepData = activeSteps[step]

    switch (currentStepData.id) {
      case 'service':
        if (!bookingData.service) {
          newErrors.service = 'Please select a service'
        }
        break
      case 'barber':
        if (!bookingData.barber) {
          newErrors.barber = 'Please select a barber'
        }
        break
      case 'datetime':
        if (!bookingData.date) {
          newErrors.date = 'Please select a date'
        }
        if (!bookingData.time) {
          newErrors.time = 'Please select a time'
        }
        break
      case 'recurring':
        // Recurring step is optional, no validation needed
        break
      case 'details':
        if (!bookingData.clientInfo?.name) {
          newErrors.name = 'Name is required'
        }
        if (!bookingData.clientInfo?.email) {
          newErrors.email = 'Email is required'
        } else if (!/\S+@\S+\.\S+/.test(bookingData.clientInfo.email)) {
          newErrors.email = 'Please enter a valid email'
        }
        if (!bookingData.clientInfo?.phone) {
          newErrors.phone = 'Phone number is required'
        }
        // Validate recurring data if enabled
        if (bookingData.isRecurring && bookingData.recurringData) {
          const validation = recurringBookingsService.validateSeriesData({
            client_first_name: bookingData.clientInfo?.name?.split(' ')[0] || '',
            client_last_name: bookingData.clientInfo?.name?.split(' ').slice(1).join(' ') || '',
            client_email: bookingData.clientInfo?.email || '',
            client_phone: bookingData.clientInfo?.phone || '',
            barber_id: parseInt(bookingData.barber?.id || '0'),
            service_id: parseInt(bookingData.service?.id || '0'),
            location_id: 1, // Default location
            recurrence_pattern: bookingData.recurringData.pattern,
            preferred_time: bookingData.recurringData.preferredTime,
            start_date: bookingData.recurringData.startDate,
            end_date: bookingData.recurringData.endDate,
            max_appointments: bookingData.recurringData.maxAppointments,
            series_discount_percent: bookingData.recurringData.discountPercent
          })
          if (!validation.valid) {
            newErrors.recurring = validation.errors.join(', ')
          }
        }
        break
      case 'payment':
        // Payment validation is handled within the payment component
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      // If we're on the details step and moving to payment, create the appointment/series first
      if (activeSteps[currentStep].id === 'details') {
        setIsLoading(true)
        try {
          // Validate client information before creating appointment
          const validation = PaymentValidator.validateEmail(bookingData.clientInfo?.email)
          if (!validation.valid) {
            setErrors({ email: validation.error! })
            return
          }

          if (bookingData.isRecurring && bookingData.recurringData) {
            // Create recurring series
            const seriesData: CreateSeriesRequest = {
              client_first_name: bookingData.clientInfo?.name?.split(' ')[0] || '',
              client_last_name: bookingData.clientInfo?.name?.split(' ').slice(1).join(' ') || '',
              client_email: bookingData.clientInfo?.email || '',
              client_phone: bookingData.clientInfo?.phone || '',
              barber_id: parseInt(bookingData.barber?.id || '0'),
              service_id: parseInt(bookingData.service?.id || '0'),
              location_id: 1, // Default location
              recurrence_pattern: bookingData.recurringData.pattern,
              preferred_time: bookingData.recurringData.preferredTime,
              start_date: bookingData.recurringData.startDate,
              end_date: bookingData.recurringData.endDate,
              max_appointments: bookingData.recurringData.maxAppointments,
              series_discount_percent: bookingData.recurringData.discountPercent,
              series_name: bookingData.recurringData.seriesName,
              interval_weeks: bookingData.recurringData.intervalWeeks,
              is_flexible_time: bookingData.recurringData.isFlexibleTime,
              notes: bookingData.clientInfo?.notes
            }

            const response = await recurringBookingsService.createSeries(seriesData)
            updateBookingData({
              seriesToken: response.data.series_token,
              totalPrice: response.data.discounted_price
            })
          } else {
            // Create single appointment
            const mockAppointmentId = Math.floor(Math.random() * 10000) + 1
            const totalPrice = bookingData.service?.price || 0

            updateBookingData({
              appointmentId: mockAppointmentId,
              totalPrice
            })
          }

          setPaymentStep('selection')
          setCurrentStep(currentStep + 1)
        } catch (error) {
          console.error('Failed to create appointment/series:', error)
          setErrors({ general: 'Failed to create appointment. Please try again.' })
        } finally {
          setIsLoading(false)
        }
      } else if (currentStep < activeSteps.length - 1) {
        setCurrentStep(currentStep + 1)
      } else {
        handleComplete()
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      // Calculate total price
      const totalPrice = bookingData.isRecurring && bookingData.recurringData
        ? (bookingData.service?.price || 0) * (1 - bookingData.recurringData.discountPercent / 100)
        : bookingData.service?.price || 0

      const completeBookingData = {
        ...bookingData,
        totalPrice
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      onComplete(completeBookingData)
      onClose()
    } catch (error) {
      console.error('Booking failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateBookingData = (updates: Partial<BookingData>) => {
    setBookingData(prev => ({ ...prev, ...updates }))
    setErrors({})
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={`relative w-full max-w-4xl rounded-2xl shadow-2xl ${
          theme === 'dark' ? 'bg-[#1A1B23] border border-[#2C2D3A]' : 'bg-white border border-gray-200'
        }`}>
          {/* Header */}
          <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-[#2C2D3A]' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
                {bookingData.isRecurring ? 'Book Recurring Appointments' : 'Book Appointment'}
              </h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                  ? 'text-[#8B92A5] hover:text-[#FFFFFF] hover:bg-[#24252E]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Progress Steps */}
            <div className="mt-6 flex items-center justify-between">
              {activeSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                    index <= currentStep
                      ? 'bg-[#20D9D2] border-[#20D9D2] text-white'
                      : theme === 'dark'
                        ? 'border-[#2C2D3A] text-[#8B92A5]'
                        : 'border-gray-300 text-gray-500'
                  }`}>
                    {index < currentStep ? (
                      <CheckIcon className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  <div className="ml-2 hidden sm:block">
                    <div className={`text-sm font-medium ${
                      index <= currentStep
                        ? theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'
                        : theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-400'}`}>
                      {step.description}
                    </div>
                  </div>
                  {index < activeSteps.length - 1 && (
                    <div className={`mx-4 h-0.5 w-12 ${
                      index < currentStep ? 'bg-[#20D9D2]' : theme === 'dark' ? 'bg-[#2C2D3A]' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {activeSteps[currentStep]?.id === 'service' && (
              <ServiceSelection
                theme={theme}
                services={services}
                selectedService={bookingData.service}
                onServiceSelect={(service) => updateBookingData({ service })}
                error={errors.service}
              />
            )}

            {activeSteps[currentStep]?.id === 'barber' && (
              <BarberSelection
                theme={theme}
                barbers={barbers}
                selectedBarber={bookingData.barber}
                onBarberSelect={(barber) => updateBookingData({ barber })}
                error={errors.barber}
                selectedService={bookingData.service}
              />
            )}

            {activeSteps[currentStep]?.id === 'datetime' && (
              <DateTimeSelection
                theme={theme}
                selectedDate={bookingData.date}
                selectedTime={bookingData.time}
                availableSlots={availableSlots}
                onDateSelect={(date) => updateBookingData({ date })}
                onTimeSelect={(time) => updateBookingData({ time })}
                errors={{ date: errors.date, time: errors.time }}
              />
            )}

            {activeSteps[currentStep]?.id === 'recurring' && (
              <RecurringOptionsSelection
                theme={theme}
                service={bookingData.service}
                selectedDate={bookingData.date}
                selectedTime={bookingData.time}
                isRecurring={bookingData.isRecurring}
                recurringData={bookingData.recurringData}
                onRecurringToggle={(isRecurring) => updateBookingData({ isRecurring })}
                onRecurringDataUpdate={(recurringData) => updateBookingData({ recurringData })}
                error={errors.recurring}
              />
            )}

            {activeSteps[currentStep]?.id === 'details' && (
              <ClientDetails
                theme={theme}
                clientInfo={bookingData.clientInfo}
                onClientInfoUpdate={(clientInfo) => updateBookingData({ clientInfo })}
                errors={errors}
                isRecurring={bookingData.isRecurring}
                recurringData={bookingData.recurringData}
              />
            )}

            {activeSteps[currentStep]?.id === 'payment' && (bookingData.appointmentId || bookingData.seriesToken) && (
              <div className="space-y-6">
                {paymentStep === 'selection' && useSimplePayment && (
                  <SimplePaymentStep
                    service={bookingData.service}
                    onPaymentSelect={(method, details) => {
                      updateBookingData({
                        paymentMethod: method,
                        paymentDetails: details,
                        paymentCompleted: details.status === 'succeeded'
                      })
                      if (details.status === 'succeeded') {
                        setPaymentStep('success')
                      } else {
                        setPaymentStep('failure')
                      }
                    }}
                    selectedMethod={bookingData.paymentMethod || 'full'}
                    appointmentId={bookingData.appointmentId}
                    customerEmail={bookingData.clientInfo?.email}
                    onPaymentSuccess={(paymentId) => {
                      updateBookingData({ paymentId, paymentCompleted: true })
                      setPaymentStep('success')
                    }}
                    onPaymentError={(error) => {
                      updateBookingData({ paymentError: error })
                      setPaymentStep('failure')
                      setErrors({ payment: error })
                    }}
                    isRecurring={bookingData.isRecurring}
                    seriesToken={bookingData.seriesToken}
                  />
                )}

                {paymentStep === 'success' && bookingData.paymentCompleted && (
                  <div className="text-center space-y-6">
                    <PaymentSuccess
                      paymentDetails={{
                        id: bookingData.paymentId || 0,
                        amount: bookingData.totalPrice || 0,
                        currency: 'USD',
                        status: 'succeeded',
                        created_at: new Date().toISOString(),
                        transaction_id: bookingData.paymentDetails?.transaction_id || ''
                      }}
                      appointmentDetails={{
                        service_name: bookingData.service?.name || '',
                        barber_name: bookingData.barber?.name || '',
                        date: bookingData.date || '',
                        time: bookingData.time || '',
                        duration_minutes: bookingData.service?.duration || 0
                      }}
                      customerDetails={{
                        name: bookingData.clientInfo?.name || '',
                        email: bookingData.clientInfo?.email || '',
                        phone: bookingData.clientInfo?.phone || ''
                      }}
                      isRecurring={bookingData.isRecurring}
                      recurringData={bookingData.recurringData}
                    />
                    <button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Continue to Confirmation
                    </button>
                  </div>
                )}

                {paymentStep === 'failure' && (
                  <div className="space-y-6">
                    <PaymentFailure
                      error={{
                        type: 'payment_error',
                        message: bookingData.paymentError || 'Payment failed',
                        code: 'payment_failed'
                      }}
                      paymentAmount={bookingData.totalPrice || 0}
                      appointmentDetails={{
                        service_name: bookingData.service?.name || '',
                        date: bookingData.date || '',
                        time: bookingData.time || ''
                      }}
                      onRetryPayment={() => {
                        setPaymentStep('selection')
                        setErrors({})
                        updateBookingData({ paymentError: undefined })
                      }}
                      onBackToBooking={() => {
                        setCurrentStep(0)
                        setPaymentStep('selection')
                        setErrors({})
                        updateBookingData({ paymentError: undefined })
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {activeSteps[currentStep]?.id === 'confirmation' && (
              <BookingConfirmation
                theme={theme}
                bookingData={bookingData}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-[#2C2D3A]' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentStep === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : theme === 'dark'
                      ? 'text-[#8B92A5] hover:text-[#FFFFFF] hover:bg-[#24252E]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-500'}`}>
                Step {currentStep + 1} of {activeSteps.length}
              </div>

              <button
                onClick={handleNext}
                disabled={isLoading}
                className={`flex items-center space-x-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-[#20D9D2] hover:bg-[#20D9D2]/80 text-white'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : currentStep === activeSteps.length - 1 ? (
                  <>
                    <span>Confirm Booking</span>
                    <CheckIcon className="w-4 h-4" />
                  </>
                ) : activeSteps[currentStep]?.id === 'details' ? (
                  <>
                    <span>Proceed to Payment</span>
                    <CreditCardIcon className="w-4 h-4" />
                  </>
                ) : activeSteps[currentStep]?.id === 'payment' && paymentStep !== 'success' ? (
                  <>
                    <span>Complete Payment</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </>
                ) : activeSteps[currentStep]?.id === 'payment' && paymentStep === 'success' ? (
                  <>
                    <span>Continue</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Service Selection Component (same as original)
interface ServiceSelectionProps {
  theme: string
  services: Service[]
  selectedService?: Service
  onServiceSelect: (service: Service) => void
  error?: string
}

function ServiceSelection({ theme, services, selectedService, onServiceSelect, error }: ServiceSelectionProps) {
  const categories = Array.from(new Set(services.map(s => s.category)))

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
          Choose Your Service
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
          Select the service you'd like to book
        </p>
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {categories.map(category => (
        <div key={category}>
          <h4 className={`text-md font-medium mb-3 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-800'}`}>
            {category}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.filter(service => service.category === category).map(service => (
              <div
                key={service.id}
                onClick={() => onServiceSelect(service)}
                className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-102 ${
                  selectedService?.id === service.id
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : theme === 'dark'
                      ? 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                }`}
              >
                {service.isPopular && (
                  <div className="absolute -top-2 -right-2 bg-violet-600 text-white text-xs px-2 py-1 rounded-full">
                    Popular
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <ScissorsIcon className="w-5 h-5 text-violet-600" />
                      <h5 className={`font-semibold ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
                        {service.name}
                      </h5>
                    </div>
                    <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
                      {service.description}
                    </p>

                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4 text-gray-500" />
                        <span className={theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-500'}>
                          {service.duration} min
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CurrencyDollarIcon className="w-4 h-4 text-green-500" />
                        <span className={`font-semibold ${theme === 'dark' ? 'text-[#20D9D2]' : 'text-green-600'}`}>
                          ${service.price}
                        </span>
                      </div>
                    </div>

                    {service.requirements && service.requirements.length > 0 && (
                      <div className="mt-2">
                        <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          {service.requirements.join(' • ')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedService?.id === service.id && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-violet-600 text-white rounded-full flex items-center justify-center">
                    <CheckIcon className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// Barber Selection Component (same as original)
interface BarberSelectionProps {
  theme: string
  barbers: Barber[]
  selectedBarber?: Barber
  onBarberSelect: (barber: Barber) => void
  error?: string
  selectedService?: Service
}

function BarberSelection({ theme, barbers, selectedBarber, onBarberSelect, error, selectedService }: BarberSelectionProps) {
  // Filter barbers based on service specialties
  const relevantBarbers = selectedService
    ? barbers.filter(barber =>
        barber.specialties.some(specialty =>
          selectedService.category === 'Premium' ? specialty.includes('Premium') :
          selectedService.category === 'Grooming' ? specialty.includes('Beard') || specialty.includes('Shave') :
          true
        )
      )
    : barbers

  const sortedBarbers = [...relevantBarbers].sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1
    if (!a.isRecommended && b.isRecommended) return 1
    return b.rating - a.rating
  })

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
          Choose Your Barber
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
          Select your preferred barber for {selectedService?.name}
        </p>
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedBarbers.map(barber => (
          <div
            key={barber.id}
            onClick={() => onBarberSelect(barber)}
            className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:scale-102 ${
              selectedBarber?.id === barber.id
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                : theme === 'dark'
                  ? 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}
          >
            {barber.isRecommended && (
              <div className="absolute -top-2 -right-2 bg-green-600 text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1">
                <StarIcon className="w-3 h-3" />
                <span>Recommended</span>
              </div>
            )}

            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {barber.name.split(' ').map(n => n[0]).join('')}
              </div>

              <div className="flex-1">
                <h5 className={`font-semibold text-lg mb-1 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {barber.name}
                </h5>

                <div className="flex items-center space-x-2 mb-2">
                  <div className="flex items-center space-x-1">
                    <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {barber.rating}
                    </span>
                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      ({barber.reviewCount} reviews)
                    </span>
                  </div>
                </div>

                <p className={`text-sm mb-3 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {barber.experience} experience
                </p>

                <div className="flex flex-wrap gap-1 mb-3">
                  {barber.specialties.slice(0, 3).map(specialty => (
                    <span
                      key={specialty}
                      className={`text-xs px-2 py-1 rounded-full ${
                        theme === 'dark' ? 'bg-violet-900/50 text-violet-300' : 'bg-violet-100 text-violet-800'
                      }`}
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {selectedBarber?.id === barber.id && (
              <div className="absolute top-4 right-4 w-6 h-6 bg-violet-600 text-white rounded-full flex items-center justify-center">
                <CheckIcon className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// Date & Time Selection Component (same as original)
interface DateTimeSelectionProps {
  theme: string
  selectedDate?: string
  selectedTime?: string
  availableSlots: { [date: string]: TimeSlot[] }
  onDateSelect: (date: string) => void
  onTimeSelect: (time: string) => void
  errors: { date?: string; time?: string }
}

function DateTimeSelection({
  theme,
  selectedDate,
  selectedTime,
  availableSlots,
  onDateSelect,
  onTimeSelect,
  errors
}: DateTimeSelectionProps) {
  const getNext7Days = () => {
    const dates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date()
      date.setDate(date.getDate() + i)
      dates.push(date)
    }
    return dates
  }

  const dates = getNext7Days()
  const selectedDateSlots = selectedDate ? availableSlots[selectedDate] || [] : []
  const availableTimeSlots = selectedDateSlots.filter(slot => slot.available)

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
          Select Date & Time
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
          Choose your preferred appointment date and time
        </p>
      </div>

      {/* Date Selection */}
      <div>
        <h4 className={`text-md font-medium mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
          Available Dates
        </h4>
        {errors.date && <div className="text-red-500 text-sm mb-2">{errors.date}</div>}

        <div className="grid grid-cols-7 gap-2">
          {dates.map(date => {
            const dateStr = date.toISOString().split('T')[0]
            const hasAvailableSlots = availableSlots[dateStr]?.some(slot => slot.available)
            const isSelected = selectedDate === dateStr
            const isToday = date.toDateString() === new Date().toDateString()

            return (
              <button
                key={dateStr}
                onClick={() => hasAvailableSlots && onDateSelect(dateStr)}
                disabled={!hasAvailableSlots}
                className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-[#20D9D2] bg-violet-50 dark:bg-[#20D9D2]/10'
                    : hasAvailableSlots
                      ? theme === 'dark'
                        ? 'border-[#2C2D3A] bg-[#24252E] hover:border-[#20D9D2]/50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      : 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`text-xs font-medium ${
                  isSelected ? 'text-[#20D9D2]' :
                  hasAvailableSlots ? theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900' :
                  'text-gray-400'
                }`}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-bold ${
                  isSelected ? 'text-[#20D9D2]' :
                  hasAvailableSlots ? theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900' :
                  'text-gray-400'
                }`}>
                  {date.getDate()}
                </div>
                {isToday && (
                  <div className="text-xs text-[#20D9D2] font-medium">Today</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div>
          <h4 className={`text-md font-medium mb-3 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-800'}`}>
            Available Times
          </h4>
          {errors.time && <div className="text-red-500 text-sm mb-2">{errors.time}</div>}

          {availableTimeSlots.length === 0 ? (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-500'}`}>
              No available time slots for this date
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {availableTimeSlots.map(slot => (
                <button
                  key={slot.time}
                  onClick={() => onTimeSelect(slot.time)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                    selectedTime === slot.time
                      ? 'border-[#20D9D2] bg-[#20D9D2] text-white'
                      : theme === 'dark'
                        ? 'border-[#2C2D3A] bg-[#24252E] text-[#FFFFFF] hover:border-[#20D9D2]/50'
                        : 'border-gray-200 bg-gray-50 text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <div className="text-sm font-medium">{slot.time}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// New Recurring Options Selection Component
interface RecurringOptionsSelectionProps {
  theme: string
  service?: Service
  selectedDate?: string
  selectedTime?: string
  isRecurring?: boolean
  recurringData?: BookingData['recurringData']
  onRecurringToggle: (isRecurring: boolean) => void
  onRecurringDataUpdate: (data: BookingData['recurringData']) => void
  error?: string
}

function RecurringOptionsSelection({
  theme,
  service,
  selectedDate,
  selectedTime,
  isRecurring = false,
  recurringData,
  onRecurringToggle,
  onRecurringDataUpdate,
  error
}: RecurringOptionsSelectionProps) {
  const [selectedOption, setSelectedOption] = useState<RecurrenceOptionConfig>(RECURRENCE_OPTIONS[2]) // Monthly default
  const [customWeeks, setCustomWeeks] = useState(4)
  const [seriesName, setSeriesName] = useState('')
  const [maxAppointments, setMaxAppointments] = useState(12)
  const [isFlexibleTime, setIsFlexibleTime] = useState(true)

  useEffect(() => {
    if (recurringData) {
      const option = RECURRENCE_OPTIONS.find(opt => opt.id === recurringData.pattern) || RECURRENCE_OPTIONS[2]
      setSelectedOption(option)
      setCustomWeeks(recurringData.intervalWeeks || 4)
      setSeriesName(recurringData.seriesName || '')
      setMaxAppointments(recurringData.maxAppointments || 12)
      setIsFlexibleTime(recurringData.isFlexibleTime)
    }
  }, [recurringData])

  useEffect(() => {
    if (isRecurring) {
      const startDate = selectedDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      onRecurringDataUpdate({
        pattern: selectedOption.id,
        preferredTime: selectedTime || '09:00',
        startDate,
        endDate,
        maxAppointments,
        discountPercent: selectedOption.defaultDiscount,
        seriesName: seriesName || `${selectedOption.name} ${service?.name} Series`,
        intervalWeeks: selectedOption.id === RecurrencePattern.CUSTOM ? customWeeks : selectedOption.intervalWeeks,
        isFlexibleTime
      })
    }
  }, [isRecurring, selectedOption, customWeeks, seriesName, maxAppointments, isFlexibleTime, selectedDate, selectedTime, service, onRecurringDataUpdate])

  const handleOptionSelect = (option: RecurrenceOptionConfig) => {
    setSelectedOption(option)
  }

  const calculateSavings = () => {
    if (!service) return { regular: 0, discounted: 0, savings: 0, annualSavings: 0 }

    const basePrice = service.price
    const discountedPrice = basePrice * (1 - selectedOption.defaultDiscount / 100)
    const appointmentsPerYear = 52 / (selectedOption.id === RecurrencePattern.CUSTOM ? customWeeks : selectedOption.intervalWeeks)
    const annualSavings = (basePrice - discountedPrice) * appointmentsPerYear

    return {
      regular: basePrice,
      discounted: discountedPrice,
      savings: basePrice - discountedPrice,
      annualSavings
    }
  }

  const savings = calculateSavings()

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
          Recurring Appointments
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
          Save money and guarantee your preferred time slot with recurring appointments
        </p>
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {/* Toggle Recurring */}
      <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-[#2C2D3A] bg-[#24252E]' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h4 className={`font-medium ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
              Set up recurring appointments
            </h4>
            <p className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
              Save up to {selectedOption.defaultDiscount}% and never worry about booking again
            </p>
          </div>
          <button
            onClick={() => onRecurringToggle(!isRecurring)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isRecurring ? 'bg-[#20D9D2]' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                isRecurring ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {isRecurring && (
        <>
          {/* Recurrence Pattern Selection */}
          <div>
            <h4 className={`text-md font-medium mb-4 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-800'}`}>
              Choose Your Schedule
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RECURRENCE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option)}
                  className={`relative p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                    selectedOption.id === option.id
                      ? 'border-[#20D9D2] bg-[#20D9D2]/10 shadow-md'
                      : theme === 'dark'
                        ? 'border-[#2C2D3A] bg-[#24252E] hover:border-[#20D9D2]/50'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {option.popular && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center">
                      <StarIcon className="h-3 w-3 mr-1" />
                      Popular
                    </span>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <ArrowPathIcon className="w-5 h-5 text-[#20D9D2]" />
                      <h5 className={`font-medium ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
                        {option.name}
                      </h5>
                    </div>
                    <span className="text-[#20D9D2] font-bold text-sm">{option.defaultDiscount}% OFF</span>
                  </div>

                  <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
                    {option.description}
                  </p>
                  <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {option.frequency}
                  </p>

                  {service && (
                    <div className="mt-2 text-sm">
                      <span className={`line-through ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        ${service.price.toFixed(2)}
                      </span>
                      <span className="ml-2 font-bold text-[#20D9D2]">
                        ${(service.price * (1 - option.defaultDiscount / 100)).toFixed(2)}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom interval for CUSTOM pattern */}
          {selectedOption.id === RecurrencePattern.CUSTOM && (
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-700'}`}>
                Interval (weeks)
              </label>
              <input
                type="number"
                min={selectedOption.minInterval || 1}
                max={selectedOption.maxInterval || 12}
                value={customWeeks}
                onChange={(e) => setCustomWeeks(parseInt(e.target.value) || 4)}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#24252E] border-[#2C2D3A] text-[#FFFFFF] focus:border-[#20D9D2]'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-violet-500'
                }`}
              />
            </div>
          )}

          {/* Savings Summary */}
          {service && (
            <div className={`bg-gradient-to-r ${theme === 'dark' ? 'from-[#20D9D2]/10 to-green-900/10 border-[#20D9D2]/30' : 'from-green-50 to-blue-50 border-green-200'} border rounded-lg p-4`}>
              <div className="flex items-center space-x-2 mb-2">
                <GiftIcon className="w-5 h-5 text-[#20D9D2]" />
                <h4 className={`font-medium ${theme === 'dark' ? 'text-[#20D9D2]' : 'text-green-900'}`}>
                  Your Savings
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className={theme === 'dark' ? 'text-green-300' : 'text-green-700'}>Per appointment:</p>
                  <p className={`font-bold ${theme === 'dark' ? 'text-[#20D9D2]' : 'text-green-800'}`}>
                    Save ${savings.savings.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className={theme === 'dark' ? 'text-green-300' : 'text-green-700'}>Annual savings:</p>
                  <p className={`font-bold ${theme === 'dark' ? 'text-[#20D9D2]' : 'text-green-800'}`}>
                    Save ${savings.annualSavings.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Additional Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-700'}`}>
                Series Name (Optional)
              </label>
              <input
                type="text"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                placeholder={`${selectedOption.name} ${service?.name} Series`}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#24252E] border-[#2C2D3A] text-[#FFFFFF] focus:border-[#20D9D2]'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-violet-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-700'}`}>
                Max Appointments
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxAppointments}
                onChange={(e) => setMaxAppointments(parseInt(e.target.value) || 12)}
                className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-[#24252E] border-[#2C2D3A] text-[#FFFFFF] focus:border-[#20D9D2]'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-violet-500'
                }`}
              />
            </div>
          </div>

          {/* Flexible Time Option */}
          <div className={`p-3 rounded-lg border ${theme === 'dark' ? 'border-[#2C2D3A] bg-[#24252E]' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <div>
                <h5 className={`font-medium ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
                  Flexible Time Slots
                </h5>
                <p className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
                  Allow slight time adjustments if your preferred slot isn't available
                </p>
              </div>
              <button
                onClick={() => setIsFlexibleTime(!isFlexibleTime)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  isFlexibleTime ? 'bg-[#20D9D2]' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition ${
                    isFlexibleTime ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Benefits */}
          <div className={`bg-blue-50 ${theme === 'dark' ? 'bg-blue-900/20 border-blue-700/30' : 'border-blue-200'} border rounded-lg p-4`}>
            <div className="flex items-center space-x-2 mb-2">
              <SparklesIcon className="w-5 h-5 text-blue-600" />
              <h4 className={`font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-900'}`}>
                Benefits of Recurring Appointments
              </h4>
            </div>
            <ul className={`text-sm space-y-1 ${theme === 'dark' ? 'text-blue-200' : 'text-blue-800'}`}>
              <li>• Guaranteed time slots with your preferred barber</li>
              <li>• Automatic reminders so you never miss an appointment</li>
              <li>• Flexible rescheduling when needed</li>
              <li>• Consistent grooming schedule for best results</li>
              <li>• Cancel anytime without penalty</li>
              <li>• Priority booking during busy periods</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

// Enhanced Client Details Component
interface ClientDetailsProps {
  theme: string
  clientInfo?: {
    name: string
    email: string
    phone: string
    notes?: string
  }
  onClientInfoUpdate: (clientInfo: any) => void
  errors: { [key: string]: string }
  isRecurring?: boolean
  recurringData?: BookingData['recurringData']
}

function ClientDetails({
  theme,
  clientInfo,
  onClientInfoUpdate,
  errors,
  isRecurring = false,
  recurringData
}: ClientDetailsProps) {
  const handleInputChange = (field: string, value: string) => {
    onClientInfoUpdate({
      ...clientInfo,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
          Your Contact Information
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
          {isRecurring
            ? 'Provide your details for recurring appointment series confirmation'
            : 'Please provide your details for appointment confirmation'
          }
        </p>
      </div>

      {isRecurring && recurringData && (
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'border-[#20D9D2]/30 bg-[#20D9D2]/10' : 'border-green-200 bg-green-50'}`}>
          <div className="flex items-center space-x-2 mb-2">
            <ArrowPathIcon className="w-5 h-5 text-[#20D9D2]" />
            <h4 className={`font-medium ${theme === 'dark' ? 'text-[#20D9D2]' : 'text-green-900'}`}>
              Recurring Series Summary
            </h4>
          </div>
          <div className={`text-sm space-y-1 ${theme === 'dark' ? 'text-green-200' : 'text-green-800'}`}>
            <p><strong>Pattern:</strong> {recurringBookingsService.formatRecurrenceFrequency(recurringData.pattern, recurringData.intervalWeeks)}</p>
            <p><strong>Discount:</strong> {recurringData.discountPercent}% off each appointment</p>
            <p><strong>Max Appointments:</strong> {recurringData.maxAppointments}</p>
            {recurringData.seriesName && <p><strong>Series Name:</strong> {recurringData.seriesName}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-700'}`}>
            Full Name *
          </label>
          <div className="relative">
            <UserIcon className={`absolute left-3 top-3 w-5 h-5 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-500'}`} />
            <input
              type="text"
              value={clientInfo?.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
                errors.name
                  ? 'border-red-500 focus:border-red-500'
                  : theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white focus:border-violet-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-violet-500'
              }`}
              placeholder="Enter your full name"
            />
          </div>
          {errors.name && <div className="text-red-500 text-sm mt-1">{errors.name}</div>}
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-700'}`}>
            Email Address *
          </label>
          <div className="relative">
            <EnvelopeIcon className={`absolute left-3 top-3 w-5 h-5 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-500'}`} />
            <input
              type="email"
              value={clientInfo?.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
                errors.email
                  ? 'border-red-500 focus:border-red-500'
                  : theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white focus:border-violet-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-violet-500'
              }`}
              placeholder="Enter your email address"
            />
          </div>
          {errors.email && <div className="text-red-500 text-sm mt-1">{errors.email}</div>}
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-700'}`}>
            Phone Number *
          </label>
          <div className="relative">
            <PhoneIcon className={`absolute left-3 top-3 w-5 h-5 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-500'}`} />
            <input
              type="tel"
              value={clientInfo?.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
                errors.phone
                  ? 'border-red-500 focus:border-red-500'
                  : theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white focus:border-violet-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-violet-500'
              }`}
              placeholder="Enter your phone number"
            />
          </div>
          {errors.phone && <div className="text-red-500 text-sm mt-1">{errors.phone}</div>}
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-700'}`}>
            Special Requests
          </label>
          <textarea
            value={clientInfo?.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className={`w-full px-4 py-3 rounded-lg border transition-colors ${
              theme === 'dark'
                ? 'bg-[#24252E] border-[#2C2D3A] text-[#FFFFFF] focus:border-[#20D9D2]'
                : 'bg-white border-gray-300 text-gray-900 focus:border-violet-500'
            }`}
            placeholder={isRecurring
              ? "Any special requests for your recurring appointments..."
              : "Any special requests or notes for your appointment..."
            }
          />
        </div>
      </div>

      {errors.recurring && (
        <div className="text-red-500 text-sm">{errors.recurring}</div>
      )}
    </div>
  )
}

// Enhanced Booking Confirmation Component
interface BookingConfirmationProps {
  theme: string
  bookingData: BookingData
  isLoading: boolean
}

function BookingConfirmation({ theme, bookingData, isLoading }: BookingConfirmationProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
          {bookingData.isRecurring ? 'Confirm Your Recurring Appointment Series' : 'Confirm Your Appointment'}
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-gray-600'}`}>
          Please review your {bookingData.isRecurring ? 'series' : 'appointment'} details before confirming
        </p>
      </div>

      <div className={`rounded-lg border p-6 ${theme === 'dark' ? 'border-[#2C2D3A] bg-[#24252E]' : 'border-gray-200 bg-gray-50'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Service Details */}
          <div>
            <h4 className={`text-md font-semibold mb-3 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
              Service Details
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <ScissorsIcon className="w-5 h-5 text-violet-600" />
                <span className={`font-medium ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
                  {bookingData.service?.name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-gray-500" />
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  {bookingData.service?.duration} minutes
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
                <span className={`font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
                  ${bookingData.isRecurring && bookingData.recurringData
                    ? (bookingData.service?.price || 0) * (1 - bookingData.recurringData.discountPercent / 100)
                    : bookingData.service?.price
                  }
                  {bookingData.isRecurring && bookingData.recurringData && (
                    <>
                      <span className={`ml-2 text-xs line-through ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                        ${bookingData.service?.price}
                      </span>
                      <span className="ml-1 text-xs bg-[#20D9D2] text-white px-1 rounded">
                        {bookingData.recurringData.discountPercent}% OFF
                      </span>
                    </>
                  )}
                </span>
              </div>
              {bookingData.isRecurring && bookingData.recurringData && (
                <div className="flex items-center space-x-2">
                  <ArrowPathIcon className="w-5 h-5 text-[#20D9D2]" />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                    {recurringBookingsService.formatRecurrenceFrequency(
                      bookingData.recurringData.pattern,
                      bookingData.recurringData.intervalWeeks
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Barber Details */}
          <div>
            <h4 className={`text-md font-semibold mb-3 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
              Your Barber
            </h4>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {bookingData.barber?.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  {bookingData.barber?.name}
                </div>
                <div className="flex items-center space-x-1">
                  <StarIcon className="w-4 h-4 text-yellow-500 fill-current" />
                  <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {bookingData.barber?.rating} ({bookingData.barber?.reviewCount} reviews)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <h4 className={`text-md font-semibold mb-3 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
              {bookingData.isRecurring ? 'First Appointment' : 'Date & Time'}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CalendarDaysIcon className="w-5 h-5 text-violet-600" />
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  {bookingData.date && formatDate(bookingData.date)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <ClockIcon className="w-5 h-5 text-violet-600" />
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  {bookingData.time}
                </span>
              </div>
            </div>
          </div>

          {/* Client Details */}
          <div>
            <h4 className={`text-md font-semibold mb-3 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
              Contact Information
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-5 h-5 text-gray-500" />
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  {bookingData.clientInfo?.name}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <EnvelopeIcon className="w-5 h-5 text-gray-500" />
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  {bookingData.clientInfo?.email}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <PhoneIcon className="w-5 h-5 text-gray-500" />
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  {bookingData.clientInfo?.phone}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recurring Series Details */}
        {bookingData.isRecurring && bookingData.recurringData && (
          <div className="mt-6 pt-6 border-t border-gray-300 dark:border-gray-600">
            <h4 className={`text-md font-semibold mb-3 ${theme === 'dark' ? 'text-[#FFFFFF]' : 'text-gray-900'}`}>
              Recurring Series Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Pattern:</span>
                <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {recurringBookingsService.formatRecurrenceFrequency(
                    bookingData.recurringData.pattern,
                    bookingData.recurringData.intervalWeeks
                  )}
                </span>
              </div>
              <div>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Max Appointments:</span>
                <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {bookingData.recurringData.maxAppointments}
                </span>
              </div>
              <div>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Discount:</span>
                <span className={`ml-2 font-semibold text-[#20D9D2]`}>
                  {bookingData.recurringData.discountPercent}% off each appointment
                </span>
              </div>
              <div>
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Flexible Time:</span>
                <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {bookingData.recurringData.isFlexibleTime ? 'Yes' : 'No'}
                </span>
              </div>
            </div>
            {bookingData.recurringData.seriesName && (
              <div className="mt-2">
                <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>Series Name:</span>
                <span className={`ml-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {bookingData.recurringData.seriesName}
                </span>
              </div>
            )}
          </div>
        )}

        {bookingData.clientInfo?.notes && (
          <div className="mt-6 pt-6 border-t border-gray-300 dark:border-gray-600">
            <h4 className={`text-md font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Special Requests
            </h4>
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
              {bookingData.clientInfo.notes}
            </p>
          </div>
        )}
      </div>

      {/* Security Notice */}
      <div className={`flex items-start space-x-3 p-4 rounded-lg ${theme === 'dark' ? 'bg-[#20D9D2]/10 border border-[#20D9D2]/30' : 'bg-green-50 border border-green-200'}`}>
        <ShieldCheckIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h5 className={`font-medium mb-1 ${theme === 'dark' ? 'text-[#20D9D2]' : 'text-green-800'}`}>
            Secure Booking
          </h5>
          <p className={`text-sm ${theme === 'dark' ? 'text-[#8B92A5]' : 'text-green-700'}`}>
            Your {bookingData.isRecurring ? 'recurring appointment series' : 'appointment'} details are encrypted and secure.
            You'll receive a confirmation email shortly{bookingData.isRecurring ? ' with your series management link' : ''}.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
              Processing your {bookingData.isRecurring ? 'recurring series' : 'booking'}...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
