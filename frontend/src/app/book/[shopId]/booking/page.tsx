'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Metadata } from 'next'
import {
  CalendarIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CreditCardIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'
import { bookingService } from '@/lib/api/bookings'
import { servicesService } from '@/lib/api/services'
import { barbersService } from '@/lib/api/barbers'
import { locationsService } from '@/lib/api/locations'
import ServiceSelector from '@/components/booking/ServiceSelector'
import TimeSlotSelector from '@/components/booking/TimeSlotSelector'
import BookingConfirmationModal from '@/components/booking/BookingConfirmationModal'
import SimplePaymentStep from '@/components/booking/SimplePaymentStep'
import type { Service, BarberProfile, Location } from '@/lib/api'

type BookingStep = 'service' | 'barber' | 'datetime' | 'details' | 'payment' | 'confirm'

interface BookingForm {
  service_id: number | null
  barber_id: number | null
  date: string
  time: string
  client_name: string
  client_email: string
  client_phone: string
  notes: string
  payment_method: 'full' | 'deposit'
  payment_details: any
}

interface BookingFlowData {
  location: Location | null
  services: Service[]
  barbers: BarberProfile[]
  availableSlots: any[]
  selectedService: Service | null
  selectedBarber: BarberProfile | null
}

function BookingFlowContent() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()

  const shopId = params.shopId as string
  const preselectedBarber = searchParams.get('barber')
  const preselectedService = searchParams.get('service')

  const [currentStep, setCurrentStep] = useState<BookingStep>('service')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null)

  const [flowData, setFlowData] = useState<BookingFlowData>({
    location: null,
    services: [],
    barbers: [],
    availableSlots: [],
    selectedService: null,
    selectedBarber: null
  })

  const [form, setForm] = useState<BookingForm>({
    service_id: preselectedService ? parseInt(preselectedService) : null,
    barber_id: preselectedBarber ? parseInt(preselectedBarber) : null,
    date: '',
    time: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    notes: '',
    payment_method: 'full',
    payment_details: null
  })

  const steps: { key: BookingStep; label: string; icon: React.ElementType }[] = [
    { key: 'service', label: 'Select Service', icon: UserIcon },
    { key: 'barber', label: 'Choose Barber', icon: UserIcon },
    { key: 'datetime', label: 'Pick Date & Time', icon: CalendarIcon },
    { key: 'details', label: 'Your Information', icon: UserIcon },
    { key: 'payment', label: 'Payment', icon: CreditCardIcon },
    { key: 'confirm', label: 'Confirm Booking', icon: CheckIcon }
  ]

  useEffect(() => {
    loadInitialData()
  }, [shopId])

  useEffect(() => {
    if (form.service_id) {
      loadBarbers()
    }
  }, [form.service_id])

  useEffect(() => {
    if (form.barber_id && form.date && form.service_id) {
      checkAvailability()
    }
  }, [form.barber_id, form.date, form.service_id])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load location
      const locationResponse = await locationsService.getLocation(parseInt(shopId))

      // Load services
      const servicesResponse = await servicesService.getServices({
        location_id: parseInt(shopId),
        is_active: true
      })

      const location = locationResponse.data
      const services = servicesResponse.data

      setFlowData(prev => ({
        ...prev,
        location,
        services
      }))

      // Pre-select service if provided
      if (preselectedService) {
        const selectedService = services.find(s => s.id === parseInt(preselectedService))
        if (selectedService) {
          setFlowData(prev => ({ ...prev, selectedService }))
          setCurrentStep('barber')
        }
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
      setError('Failed to load booking information. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const loadBarbers = async () => {
    if (!form.service_id) return

    try {
      setLoading(true)
      const response = await barbersService.getBarbers({
        location_id: parseInt(shopId),
        service_id: form.service_id,
        is_active: true
      })

      const barbers = Array.isArray(response) ? response : response.data
      setFlowData(prev => ({ ...prev, barbers }))

      // Pre-select barber if provided
      if (preselectedBarber) {
        const selectedBarber = barbers.find(b => b.id === parseInt(preselectedBarber))
        if (selectedBarber) {
          setFlowData(prev => ({ ...prev, selectedBarber }))
          setForm(prev => ({ ...prev, barber_id: selectedBarber.id }))
        }
      }
    } catch (error) {
      console.error('Failed to load barbers:', error)
      setError('Failed to load available barbers.')
    } finally {
      setLoading(false)
    }
  }

  const checkAvailability = async () => {
    if (!form.barber_id || !form.date || !flowData.selectedService) return

    try {
      setLoading(true)
      const response = await barbersService.getAvailability(
        form.barber_id,
        form.date,
        form.date,
        form.service_id!,
        flowData.selectedService.duration_minutes
      )

      const slots = response.data[form.date] || []
      setFlowData(prev => ({ ...prev, availableSlots: slots }))
    } catch (error) {
      console.error('Failed to check availability:', error)
      setError('Failed to check availability.')
    } finally {
      setLoading(false)
    }
  }

  const handleNext = () => {
    const stepIndex = steps.findIndex(s => s.key === currentStep)
    if (stepIndex < steps.length - 1) {
      setCurrentStep(steps[stepIndex + 1].key)
    }
  }

  const handleBack = () => {
    const stepIndex = steps.findIndex(s => s.key === currentStep)
    if (stepIndex > 0) {
      setCurrentStep(steps[stepIndex - 1].key)
    }
  }

  const handleServiceSelect = (service: Service) => {
    setFlowData(prev => ({ ...prev, selectedService: service }))
    setForm(prev => ({ ...prev, service_id: service.id }))
    handleNext()
  }

  const handleBarberSelect = (barber: BarberProfile) => {
    setFlowData(prev => ({ ...prev, selectedBarber: barber }))
    setForm(prev => ({ ...prev, barber_id: barber.id }))
    handleNext()
  }

  const handleDateTimeSelect = (date: string, time: string) => {
    setForm(prev => ({ ...prev, date, time }))
    handleNext()
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      const bookingData = {
        service_id: form.service_id!,
        barber_id: form.barber_id!,
        appointment_date: form.date,
        appointment_time: form.time,
        client_first_name: form.client_name.split(' ')[0],
        client_last_name: form.client_name.split(' ').slice(1).join(' ') || form.client_name.split(' ')[0],
        client_email: form.client_email,
        client_phone: form.client_phone,
        notes: form.notes
      }

      const response = await bookingService.createBooking(bookingData)

      // Redirect to standalone confirmation page using the booking token
      if (response.data.booking_token) {
        router.push(`/book/confirmation/${response.data.booking_token}`)
      } else {
        // Fallback to modal if no token (should not happen)
        setBookingConfirmation({
          ...response.data,
          service_name: flowData.selectedService?.name,
          barber_name: flowData.selectedBarber ?
            `${flowData.selectedBarber.first_name} ${flowData.selectedBarber.last_name}` : '',
          duration: flowData.selectedService?.duration_minutes,
          price: flowData.selectedService?.base_price,
          location: flowData.location
        })
        setShowConfirmation(true)
      }
    } catch (error: any) {
      console.error('Failed to create booking:', error)
      setError(error.response?.data?.detail || 'Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getStepContent = () => {
    switch (currentStep) {
      case 'service':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Choose Your Service</h2>
              <p className="text-gray-600 mt-2">Select the service you'd like to book</p>
            </div>
            <ServiceSelector
              services={flowData.services}
              selectedService={flowData.selectedService}
              onServiceSelect={handleServiceSelect}
              loading={loading}
            />
          </div>
        )

      case 'barber':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Choose Your Barber</h2>
              <p className="text-gray-600 mt-2">Select a barber for your appointment</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {flowData.barbers.map((barber) => (
                <button
                  key={barber.id}
                  onClick={() => handleBarberSelect(barber)}
                  className={`p-6 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    form.barber_id === barber.id
                      ? 'border-slate-700 bg-slate-50 shadow-md'
                      : 'border-gray-300 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                      <UserIcon className="h-6 w-6 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {barber.first_name} {barber.last_name}
                      </h3>
                      {barber.specialties && barber.specialties.length > 0 && (
                        <p className="text-sm text-gray-600 mt-1">{barber.specialties[0]}</p>
                      )}
                      {barber.average_rating && (
                        <div className="flex items-center mt-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(barber.average_rating || 0)
                                    ? 'text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-sm text-gray-600 ml-2">
                            {barber.average_rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )

      case 'datetime':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Pick Date & Time</h2>
              <p className="text-gray-600 mt-2">Select your preferred appointment slot</p>
            </div>

            {/* Date Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Date
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-lg"
              />
            </div>

            {/* Time Slots */}
            {form.date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Available Times
                </label>
                <TimeSlotSelector
                  slots={flowData.availableSlots.map(slot => ({
                    time: slot.start_time,
                    available: slot.is_available,
                    reason: slot.reason
                  }))}
                  selectedTime={form.time}
                  onTimeSelect={(time) => handleDateTimeSelect(form.date, time)}
                  loading={loading}
                />
              </div>
            )}
          </div>
        )

      case 'details':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Your Information</h2>
              <p className="text-gray-600 mt-2">Please provide your contact details</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.client_name}
                  onChange={(e) => setForm(prev => ({ ...prev, client_name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={form.client_email}
                  onChange={(e) => setForm(prev => ({ ...prev, client_email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={form.client_phone}
                  onChange={(e) => setForm(prev => ({ ...prev, client_phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Special Requests (Optional)
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                  placeholder="Any special requests or notes for your barber..."
                />
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={!form.client_name || !form.client_email}
              className="w-full px-6 py-3 bg-slate-700 text-white text-lg font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continue to Payment
            </button>
          </div>
        )

      case 'payment':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
              <p className="text-gray-600 mt-2">Choose your payment option</p>
            </div>

            <SimplePaymentStep
              service={flowData.selectedService}
              onPaymentSelect={(paymentMethod, paymentDetails) => {
                setForm(prev => ({
                  ...prev,
                  payment_method: paymentMethod,
                  payment_details: paymentDetails
                }))
                handleNext()
              }}
              selectedMethod={form.payment_method}
            />
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Confirm Your Booking</h2>
              <p className="text-gray-600 mt-2">Please review your appointment details</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 space-y-6">
              {/* Service Details */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 text-lg mb-3">Service Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service:</span>
                    <span className="font-medium">{flowData.selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{flowData.selectedService?.duration_minutes} minutes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price:</span>
                    <span className="font-medium text-lg">${flowData.selectedService?.base_price}</span>
                  </div>
                </div>
              </div>

              {/* Appointment Details */}
              <div className="border-b border-gray-200 pb-4">
                <h3 className="font-semibold text-gray-900 text-lg mb-3">Appointment Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Barber:</span>
                    <span className="font-medium">
                      {flowData.selectedBarber?.first_name} {flowData.selectedBarber?.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">
                      {new Date(form.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{form.time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium">{flowData.location?.name}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="font-semibold text-gray-900 text-lg mb-3">Contact Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{form.client_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Email:</span>
                    <span className="font-medium">{form.client_email}</span>
                  </div>
                  {form.client_phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{form.client_phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="flex items-center">
                <ShieldCheckIcon className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-sm text-gray-700">
                  Your booking is secure and will be confirmed immediately.
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full px-6 py-4 bg-slate-700 text-white text-lg font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Confirming Booking...
                </>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        )

      default:
        return null
    }
  }

  if (loading && !flowData.location) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking options...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => router.push(`/book/${shopId}`)}
            className="inline-flex items-center text-slate-600 hover:text-slate-800 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to {flowData.location?.name}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Book Your Appointment</h1>
          <p className="text-gray-600 mt-2">Follow the steps below to schedule your visit</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const stepIndex = steps.findIndex(s => s.key === currentStep)
              const isActive = index <= stepIndex
              const Icon = step.icon

              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="relative">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isActive
                          ? 'bg-slate-700 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className={`absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap text-center ${
                      isActive ? 'text-slate-700 font-medium' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 transition-colors ${
                        index < stepIndex ? 'bg-slate-700' : 'bg-gray-300'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mt-12">
          {getStepContent()}

          {/* Navigation */}
          {currentStep !== 'service' && currentStep !== 'confirm' && currentStep !== 'payment' && (
            <div className="mt-8 flex justify-between">
              <button
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                Back
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && bookingConfirmation && (
        <BookingConfirmationModal
          isOpen={showConfirmation}
          onClose={() => {
            setShowConfirmation(false)
            router.push(`/book/${shopId}`)
          }}
          booking={bookingConfirmation}
          onNewBooking={() => {
            setShowConfirmation(false)
            router.push(`/book/${shopId}/booking`)
          }}
        />
      )}
    </div>
  )
}

export default function BookingFlowPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking flow...</p>
        </div>
      </div>
    }>
      <BookingFlowContent />
    </Suspense>
  )
}
