'use client'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Metadata } from 'next'
import {
  CalendarIcon,
  UserIcon,
  UsersIcon,
  ClockIcon,
  MapPinIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CreditCardIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { bookingService } from '@/lib/api/bookings'
import { servicesService } from '@/lib/api/services'
import { barbersService } from '@/lib/api/barbers'
import { publicBookingService } from '@/lib/api/publicBooking'
import ServiceSelector from '@/components/booking/ServiceSelector'
import TimeSlotSelector from '@/components/booking/TimeSlotSelector'
import BookingConfirmationModal from '@/components/booking/BookingConfirmationModal'
import EnhancedPaymentStep from '@/components/booking/EnhancedPaymentStep'
import BookingCalendar from '@/components/booking/BookingCalendar'
import AppointmentCreationFallback from '@/components/booking/AppointmentCreationFallback'
import { useLocationPaymentSettings } from '@/hooks/useLocationPaymentSettings'
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
  payment_method: 'full' | 'deposit' | 'in_person'
  payment_details: any
  create_account: boolean
  password?: string
}

interface BookingFlowData {
  location: Location | null
  services: Service[]
  barbers: BarberProfile[]
  availableSlots: any[]
  availableDates: string[]
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
  const [createdAppointment, setCreatedAppointment] = useState<any>(null)
  const [showAppointmentFallback, setShowAppointmentFallback] = useState(false)
  const [appointmentCreationRetries, setAppointmentCreationRetries] = useState(0)

  const [flowData, setFlowData] = useState<BookingFlowData>({
    location: null,
    services: [],
    barbers: [],
    availableSlots: [],
    availableDates: [],
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
    payment_details: null,
    create_account: false,
    password: ''
  })

  // Get payment settings for the location
  const { settings: paymentSettings, loading: paymentSettingsLoading } = useLocationPaymentSettings(
    flowData.location?.id
  )

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

  useEffect(() => {
    if (form.barber_id && form.service_id) {
      loadMonthlyAvailability()
    }
  }, [form.barber_id, form.service_id])

  // Debug logging for createdAppointment changes
  useEffect(() => {
    console.log('[BookingFlow] createdAppointment state changed:', {
      appointmentId: createdAppointment?.appointment_id,
      bookingToken: createdAppointment?.booking_token,
      appointmentKeys: createdAppointment ? Object.keys(createdAppointment) : [],
      timestamp: new Date().toISOString()
    })
  }, [createdAppointment])

  // Debug logging for current step changes
  useEffect(() => {
    console.log('[BookingFlow] Current step changed:', {
      currentStep,
      hasCreatedAppointment: !!createdAppointment,
      appointmentId: createdAppointment?.appointment_id,
      timestamp: new Date().toISOString()
    })
  }, [currentStep, createdAppointment])

  const loadInitialData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load location using public API
      const location = await publicBookingService.getShopInfo(parseInt(shopId))

      // Load services using public API
      const services = await publicBookingService.getShopServices(parseInt(shopId))

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
      // Use public API to get barbers
      const barbers = await publicBookingService.getShopBarbers(parseInt(shopId))
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

    // For "Any Professional", we would need a different API endpoint
    // For now, we'll skip availability check and show all time slots
    if (form.barber_id === -1) {
      // Generate standard time slots for "Any Professional"
      const standardSlots = [];
      const startHour = 9; // 9 AM
      const endHour = 18; // 6 PM

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          standardSlots.push({
            start_time: time,
            available: true,
            date: form.date
          });
        }
      }

      setFlowData(prev => ({ ...prev, availableSlots: standardSlots }))
      return;
    }

    try {
      setLoading(true)
      // Use public API for availability
      const response = await publicBookingService.getBarberAvailability(
        form.barber_id,
        form.service_id!,
        form.date,
        form.date
      )

      // The response has a slots array, not indexed by date
      const slots = response.slots || []
      setFlowData(prev => ({ ...prev, availableSlots: slots }))
    } catch (error) {
      console.error('Failed to check availability:', error)
      setError('Failed to check availability.')
    } finally {
      setLoading(false)
    }
  }

  const loadMonthlyAvailability = async () => {
    if (!form.barber_id || !form.service_id) return

    // For "Any Professional", show all dates as available
    if (form.barber_id === -1) {
      const today = new Date();
      const availableDates = [];

      // Generate dates for the next 3 months
      for (let i = 0; i < 90; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        availableDates.push(date.toISOString().split('T')[0]);
      }

      setFlowData(prev => ({
        ...prev,
        availableDates: availableDates
      }));
      return;
    }

    try {
      // Get the start and end of the current month
      const today = new Date()
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 3, 0) // Next 3 months

      const startDate = startOfMonth.toISOString().split('T')[0]
      const endDate = endOfMonth.toISOString().split('T')[0]

      // Use public API for availability
      const response = await publicBookingService.getBarberAvailability(
        form.barber_id,
        form.service_id,
        startDate,
        endDate
      )

      // Extract unique dates that have available slots
      const availableDates = new Set<string>()

      if (response.slots && Array.isArray(response.slots)) {
        response.slots.forEach((slot: any) => {
          if (slot.available && slot.date) {
            availableDates.add(slot.date)
          }
        })
      }

      setFlowData(prev => ({
        ...prev,
        availableDates: Array.from(availableDates).sort()
      }))
    } catch (error) {
      console.error('Failed to load monthly availability:', error)
      // Don't show error for this background operation
    }
  }

  const handleNext = async () => {
    const stepIndex = steps.findIndex(s => s.key === currentStep)

    // If moving from details to payment, create the appointment first
    if (currentStep === 'details' && stepIndex < steps.length - 1 && steps[stepIndex + 1].key === 'payment') {
      console.log('[BookingFlow] Transitioning from details to payment step')

      // Validate form fields before creating appointment
      if (!form.client_name || !form.client_email || (form.create_account && (!form.password || form.password.length < 8))) {
        console.warn('[BookingFlow] Form validation failed before appointment creation')
        return // Don't proceed if validation fails
      }

      try {
        console.log('[BookingFlow] Creating appointment before payment step')
        const appointmentData = await createAppointmentForPayment()
        console.log('[BookingFlow] Appointment created, proceeding to payment:', {
          appointmentId: appointmentData?.appointment_id,
          timestamp: new Date().toISOString()
        })
        setCurrentStep(steps[stepIndex + 1].key)
      } catch (error) {
        console.error('[BookingFlow] Failed to create appointment, staying on details step:', error)
        setAppointmentCreationRetries(prev => prev + 1)

        // Show fallback after 2 failed attempts
        if (appointmentCreationRetries >= 1) {
          console.log('[BookingFlow] Showing appointment creation fallback after multiple failures')
          setShowAppointmentFallback(true)
        }
        // Error is already handled in createAppointmentForPayment
        return
      }
    } else if (stepIndex < steps.length - 1) {
      console.log('[BookingFlow] Regular step progression:', {
        from: currentStep,
        to: steps[stepIndex + 1].key
      })
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

  const handleBarberSelect = (barber: BarberProfile | null) => {
    if (barber === null) {
      // "Any Professional" selected
      setFlowData(prev => ({ ...prev, selectedBarber: null }))
      setForm(prev => ({ ...prev, barber_id: -1 }))
    } else {
      setFlowData(prev => ({ ...prev, selectedBarber: barber }))
      setForm(prev => ({ ...prev, barber_id: barber.id }))
    }
    handleNext()
  }

  const handleDateTimeSelect = (date: string, time: string) => {
    setForm(prev => ({ ...prev, date, time }))
    handleNext()
  }

  const createAppointmentForPayment = async () => {
    console.log('[BookingFlow] createAppointmentForPayment started:', {
      formData: {
        service_id: form.service_id,
        barber_id: form.barber_id,
        date: form.date,
        time: form.time,
        client_name: form.client_name,
        client_email: form.client_email
      },
      timestamp: new Date().toISOString()
    })

    try {
      setLoading(true)
      setError(null)

      // Validate required fields
      if (!form.service_id || !form.date || !form.time || !form.client_name || !form.client_email) {
        const missingFields = []
        if (!form.service_id) missingFields.push('service')
        if (!form.date) missingFields.push('date')
        if (!form.time) missingFields.push('time')
        if (!form.client_name) missingFields.push('name')
        if (!form.client_email) missingFields.push('email')

        console.error('[BookingFlow] Validation failed - missing fields:', missingFields)
        throw new Error(`Please fill in all required fields: ${missingFields.join(', ')}`)
      }

      const bookingData = {
        service_id: form.service_id!,
        barber_id: form.barber_id === -1 ? null : form.barber_id!,  // Send null for "Any Professional"
        appointment_date: form.date,
        appointment_time: form.time,
        client_first_name: form.client_name.split(' ')[0],
        client_last_name: form.client_name.split(' ').slice(1).join(' ') || form.client_name.split(' ')[0],
        client_email: form.client_email,
        client_phone: form.client_phone,
        notes: form.notes,
        any_professional: form.barber_id === -1,  // Flag to indicate "Any Professional" was selected
        location_id: form.barber_id === -1 ? parseInt(shopId) : undefined  // Required for "Any Professional"
      }

      console.log('[BookingFlow] Calling bookingService.createBooking with data:', bookingData)
      const response = await bookingService.createBooking(bookingData)

      console.log('[BookingFlow] Appointment created successfully:', {
        appointmentId: response.data?.appointment_id,
        bookingToken: response.data?.booking_token,
        responseKeys: Object.keys(response.data || {}),
        timestamp: new Date().toISOString()
      })

      setCreatedAppointment(response.data)
      return response.data
    } catch (error: any) {
      console.error('[BookingFlow] Failed to create appointment:', {
        error,
        errorMessage: error.message,
        errorResponse: error.response?.data,
        errorStatus: error.response?.status,
        timestamp: new Date().toISOString()
      })

      // Handle specific error types
      let errorMessage = 'Failed to create appointment. Please try again.'

      if (error.response?.status === 409) {
        errorMessage = 'The selected time slot is no longer available. Please choose a different time.'
      } else if (error.response?.status === 404) {
        errorMessage = 'The selected service or barber is not available. Please refresh and try again.'
      } else if (error.response?.data?.detail) {
        if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail
        } else if (error.response.data.detail.message) {
          errorMessage = error.response.data.detail.message
        }
      } else if (error.message) {
        errorMessage = error.message
      }

      setError(errorMessage)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(null)

      // If customer wants to create an account, do it after booking is successful
      if (form.create_account && form.password) {
        try {
          const customerData = {
            email: form.client_email,
            password: form.password,
            first_name: form.client_name.split(' ')[0],
            last_name: form.client_name.split(' ').slice(1).join(' ') || '',
            phone: form.client_phone,
            newsletter_subscription: true,
            preferred_location_id: parseInt(shopId)
          }

          // Create customer account
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/customer/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(customerData),
          })

          // We don't need to handle the response as the customer will log in later
          // The important thing is the booking was successful
        } catch (accountError) {
          // Don't fail the booking if account creation fails
          console.error('Failed to create customer account:', accountError)
          // Could show a non-blocking notification here
        }
      }

      // Redirect to standalone confirmation page using the booking token
      if (createdAppointment?.booking_token) {
        router.push(`/book/confirmation/${createdAppointment.booking_token}`)
      } else {
        // Fallback to modal if no token
        setBookingConfirmation({
          ...createdAppointment,
          service_name: flowData.selectedService?.name,
          barber_name: form.barber_id === -1
            ? 'Any Professional'
            : flowData.selectedBarber
              ? `${flowData.selectedBarber.first_name} ${flowData.selectedBarber.last_name}`
              : '',
          duration: flowData.selectedService?.duration_minutes,
          price: flowData.selectedService?.base_price,
          location: flowData.location
        })
        setShowConfirmation(true)
      }
    } catch (error: any) {
      console.error('Failed to finalize booking:', error)
      setError(error.response?.data?.detail || 'Failed to finalize booking. Please try again.')
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
              {/* "Any Professional" card */}
              <button
                onClick={() => handleBarberSelect(null)}
                className={`p-6 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                  form.barber_id === -1
                    ? 'border-purple-600 bg-purple-50 shadow-md'
                    : 'border-purple-300 hover:border-purple-400 bg-gradient-to-br from-purple-50 to-indigo-50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <UsersIcon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      Any Professional
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Let us match you with the best available barber
                    </p>
                    {form.barber_id === -1 && (
                      <div className="mt-2 inline-flex items-center text-xs font-medium text-purple-600">
                        <CheckIcon className="h-3 w-3 mr-1" />
                        Selected
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* Regular barber cards */}
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
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Pick Date & Time</h2>
              <p className="text-gray-600 mt-2">Select your preferred appointment slot</p>
            </div>

            {/* Desktop: Side-by-side layout, Mobile: Stacked */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Calendar */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Date</h3>
                <BookingCalendar
                  selectedDate={form.date}
                  onDateSelect={(date) => setForm(prev => ({ ...prev, date }))}
                  availableDates={flowData.availableDates}
                />
              </div>

              {/* Time Slots */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {form.date ? 'Available Times' : 'Select a date first'}
                </h3>
                {form.date ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
                    <TimeSlotSelector
                      slots={flowData.availableSlots.map(slot => ({
                        time: slot.start_time,
                        available: slot.available,
                        reason: slot.reason
                      }))}
                      selectedTime={form.time}
                      onTimeSelect={(time) => handleDateTimeSelect(form.date, time)}
                      loading={loading}
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">Please select a date to view available time slots</p>
                  </div>
                )}
              </div>
            </div>

            {/* Continue button for time selection */}
            {form.date && form.time && (
              <div className="mt-6">
                <button
                  onClick={handleNext}
                  className="w-full px-6 py-3 bg-slate-700 text-white text-lg font-semibold rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Continue to Details
                </button>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-gray-900 bg-white placeholder:text-gray-400"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-gray-900 bg-white placeholder:text-gray-400"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-gray-900 bg-white placeholder:text-gray-400"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-gray-900 bg-white placeholder:text-gray-400"
                  placeholder="Any special requests or notes for your barber..."
                />
              </div>

              {/* Optional Account Creation */}
              <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="create-account"
                    checked={form.create_account}
                    onChange={(e) => setForm(prev => ({ ...prev, create_account: e.target.checked }))}
                    className="mt-1 h-4 w-4 text-slate-600 border-gray-300 rounded focus:ring-slate-500"
                  />
                  <div className="ml-3 flex-1">
                    <label htmlFor="create-account" className="text-sm font-medium text-gray-900 cursor-pointer">
                      Create an account for faster future bookings
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      Save your information, view booking history, and get exclusive offers
                    </p>
                  </div>
                </div>

                {/* Password field if creating account */}
                {form.create_account && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Choose a Password
                    </label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-gray-900 bg-white"
                      placeholder="••••••••"
                      minLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum 8 characters
                    </p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleNext}
              disabled={!form.client_name || !form.client_email || (form.create_account && (!form.password || form.password.length < 8)) || loading}
              className="w-full px-6 py-3 bg-slate-700 text-white text-lg font-semibold rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Appointment...
                  {appointmentCreationRetries > 0 && (
                    <span className="ml-2 text-sm opacity-75">(Retry {appointmentCreationRetries + 1})</span>
                  )}
                </>
              ) : (
                'Continue to Payment'
              )}
            </button>

            {/* Retry info */}
            {appointmentCreationRetries > 0 && !loading && (
              <div className="mt-3 text-center">
                <p className="text-sm text-gray-600">
                  Previous attempt failed. Click to try again or go back to modify your selection.
                </p>
              </div>
            )}
          </div>
        )

      case 'payment':
        // Show fallback if appointment creation failed multiple times
        if (showAppointmentFallback) {
          return (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900">Booking Issue</h2>
                <p className="text-gray-600 mt-2">We need to resolve an appointment creation issue</p>
              </div>

              <AppointmentCreationFallback
                error={error || undefined}
                customerEmail={form.client_email}
                locationName={flowData.location?.name}
                onRetry={async () => {
                  console.log('[BookingFlow] Retrying appointment creation from fallback')
                  setShowAppointmentFallback(false)
                  setError(null)
                  try {
                    const appointmentData = await createAppointmentForPayment()
                    console.log('[BookingFlow] Retry successful, appointment created:', appointmentData?.appointment_id)
                  } catch (retryError) {
                    console.error('[BookingFlow] Retry failed:', retryError)
                    setShowAppointmentFallback(true)
                  }
                }}
                onGoBack={() => {
                  console.log('[BookingFlow] Going back from appointment creation fallback')
                  setShowAppointmentFallback(false)
                  setCurrentStep('details')
                  setError(null)
                  setAppointmentCreationRetries(0)
                }}
                isRetrying={loading}
              />
            </div>
          )
        }

        // Normal payment flow
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Payment</h2>
              <p className="text-gray-600 mt-2">Complete your booking with payment</p>
            </div>

            {/* Appointment validation warning */}
            {(!createdAppointment?.appointment_id) && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-600 mt-0.5 mr-3" />
                  <div className="text-sm">
                    <p className="text-orange-800 font-medium">Appointment Setup Verification</p>
                    <p className="text-orange-700 mt-1">
                      Verifying appointment creation... If payment options don't appear, please refresh the page.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <EnhancedPaymentStep
              service={flowData.selectedService}
              appointmentId={createdAppointment?.appointment_id}
              customerEmail={form.client_email}
              locationId={flowData.location?.id}
              payInPersonEnabled={paymentSettings?.pay_in_person_enabled ?? true}
              payInPersonMessage={paymentSettings?.pay_in_person_message}
              onPaymentSelect={(paymentMethod, paymentDetails) => {
                console.log('[BookingFlow] Payment method selected:', {
                  paymentMethod,
                  paymentDetails,
                  appointmentId: createdAppointment?.appointment_id,
                  timestamp: new Date().toISOString()
                })
                setForm(prev => ({
                  ...prev,
                  payment_method: paymentMethod,
                  payment_details: paymentDetails
                }))
                handleNext()
              }}
              onPaymentSuccess={(paymentId) => {
                console.log('[BookingFlow] Payment successful:', {
                  paymentId,
                  appointmentId: createdAppointment?.appointment_id,
                  timestamp: new Date().toISOString()
                })
                // Payment successful, go to confirmation
                setCurrentStep('confirm')
              }}
              onPaymentError={(error) => {
                console.error('[BookingFlow] Payment error received:', {
                  error,
                  appointmentId: createdAppointment?.appointment_id,
                  timestamp: new Date().toISOString()
                })
                setError(`Payment failed: ${error}`)
              }}
              selectedMethod={form.payment_method}
            />
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Booking Complete!</h2>
              <p className="text-gray-600 mt-2">Your appointment has been successfully created and payment processed</p>
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
                      {form.barber_id === -1
                        ? "Any Professional"
                        : `${flowData.selectedBarber?.first_name} ${flowData.selectedBarber?.last_name}`}
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
              className="w-full px-6 py-4 bg-green-600 text-white text-lg font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Finalizing...
                </>
              ) : (
                'View Confirmation Details'
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
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
              <div className="text-sm">
                <p className="text-red-800 font-medium">Booking Error</p>
                <p className="text-red-700 mt-1">{error}</p>
                {currentStep === 'payment' && (
                  <div className="mt-3">
                    <p className="text-red-600 text-xs">
                      Debug info: Step = {currentStep}, Appointment ID = {createdAppointment?.appointment_id || 'not created'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 mt-12">
          {getStepContent()}

          {/* Navigation */}
          {currentStep === 'barber' && (
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
          {currentStep === 'datetime' && (
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
          {currentStep === 'payment' && (
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => {
                  if (showAppointmentFallback) {
                    setShowAppointmentFallback(false)
                    setCurrentStep('details')
                    setError(null)
                    setAppointmentCreationRetries(0)
                  } else {
                    setError('To make changes to your appointment details, please start a new booking.')
                  }
                }}
                className={`px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center ${
                  showAppointmentFallback ? '' : 'opacity-50 cursor-not-allowed'
                }`}
                disabled={!showAppointmentFallback}
              >
                <ArrowLeftIcon className="h-4 w-4 mr-2" />
                {showAppointmentFallback ? 'Back to Details' : 'Back (Disabled - Appointment Created)'}
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
