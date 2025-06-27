'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  CalendarIcon,
  UserIcon,
  ClockIcon,
  MapPinIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline'
import { publicBookingService, PublicBookingApiError } from '@/lib/api/publicBooking'
import type { PublicLocationInfo, PublicBarberProfile, PublicServiceInfo, CreateBookingRequest } from '@/lib/api/publicBooking'
import ServiceSelector from '@/components/booking/ServiceSelector'
import TimeSlotSelector from '@/components/booking/TimeSlotSelector'
import BookingConfirmationModal from '@/components/booking/BookingConfirmationModal'

type BookingStep = 'location' | 'service' | 'barber' | 'datetime' | 'details' | 'confirm'

interface BookingForm {
  location_id: number | null
  service_id: number | null
  barber_id: number | null
  date: string
  time: string
  client_name: string
  client_email: string
  client_phone: string
  notes: string
}

interface ApiError {
  message: string
  status?: number
  details?: any
}

function BookingPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if specific barber or location is pre-selected
  const preselectedBarberId = searchParams.get('barber')
  const preselectedLocationId = searchParams.get('location')

  const [currentStep, setCurrentStep] = useState<BookingStep>('location')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<ApiError | null>(null)
  const [locations, setLocations] = useState<PublicLocationInfo[]>([])
  const [services, setServices] = useState<PublicServiceInfo[]>([])
  const [barbers, setBarbers] = useState<PublicBarberProfile[]>([])
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [selectedService, setSelectedService] = useState<PublicServiceInfo | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<PublicBarberProfile | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<PublicLocationInfo | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null)
  const [locationsLoading, setLocationsLoading] = useState(false)
  const [servicesLoading, setServicesLoading] = useState(false)
  const [barbersLoading, setBarbersLoading] = useState(false)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)

  const [form, setForm] = useState<BookingForm>({
    location_id: preselectedLocationId ? parseInt(preselectedLocationId) : null,
    service_id: null,
    barber_id: preselectedBarberId ? parseInt(preselectedBarberId) : null,
    date: '',
    time: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    notes: ''
  })

  const steps: { key: BookingStep; label: string; icon: React.ElementType }[] = [
    { key: 'location', label: 'Location', icon: MapPinIcon },
    { key: 'service', label: 'Service', icon: UserIcon },
    { key: 'barber', label: 'Barber', icon: UserIcon },
    { key: 'datetime', label: 'Date & Time', icon: CalendarIcon },
    { key: 'details', label: 'Your Details', icon: UserIcon },
    { key: 'confirm', label: 'Confirm', icon: CheckIcon }
  ]

  // Load initial data
  useEffect(() => {
    loadLocations()
    // Skip location step if pre-selected
    if (preselectedLocationId || preselectedBarberId) {
      setCurrentStep('service')
    }
  }, [])

  // Load services when location is selected
  useEffect(() => {
    if (form.location_id) {
      loadServices()
    }
  }, [form.location_id])

  // Load barbers when location is selected
  useEffect(() => {
    if (form.location_id) {
      loadBarbers()
    }
  }, [form.location_id])

  // Check availability when barber and date are selected
  useEffect(() => {
    if (form.barber_id && form.date && form.service_id) {
      checkAvailability()
    }
  }, [form.barber_id, form.date, form.service_id])

  const loadLocations = async () => {
    setLocationsLoading(true)
    setError(null)
    try {
      const locations = await publicBookingService.getShops({ is_active: true })
      setLocations(locations)

      // Auto-select if only one location
      if (locations.length === 1) {
        setForm(prev => ({ ...prev, location_id: locations[0].id }))
        setSelectedLocation(locations[0])
      }
    } catch (error) {
      console.error('Failed to load locations:', error)
      const apiError = error instanceof PublicBookingApiError
        ? { message: error.message, status: error.status, details: error.details }
        : { message: 'Failed to load locations. Please try again.' }
      setError(apiError)
    } finally {
      setLocationsLoading(false)
    }
  }

  const loadServices = async () => {
    setServicesLoading(true)
    setError(null)
    try {
      if (!form.location_id) {
        setError({ message: 'Please select a location first.' })
        return
      }

      const services = await publicBookingService.getShopServices(form.location_id)
      setServices(services)
    } catch (error) {
      console.error('Failed to load services:', error)
      const apiError = error instanceof PublicBookingApiError
        ? { message: error.message, status: error.status, details: error.details }
        : { message: 'Failed to load services. Please try again.' }
      setError(apiError)
    } finally {
      setServicesLoading(false)
    }
  }

  const loadBarbers = async () => {
    setBarbersLoading(true)
    setError(null)
    try {
      if (!form.location_id) {
        setError({ message: 'Please select a location first.' })
        return
      }

      const barbers = await publicBookingService.getShopBarbers(form.location_id)
      setBarbers(barbers)

      // If pre-selected barber, find and select them
      if (preselectedBarberId && barbers.length > 0) {
        const barber = barbers.find(b => b.id === parseInt(preselectedBarberId))
        if (barber) {
          setSelectedBarber(barber)
          setForm(prev => ({ ...prev, barber_id: barber.id }))
        }
      }
    } catch (error) {
      console.error('Failed to load barbers:', error)
      const apiError = error instanceof PublicBookingApiError
        ? { message: error.message, status: error.status, details: error.details }
        : { message: 'Failed to load barbers. Please try again.' }
      setError(apiError)
      setBarbers([])
    } finally {
      setBarbersLoading(false)
    }
  }

  const checkAvailability = async () => {
    if (!form.barber_id || !form.date || !selectedService) return

    setAvailabilityLoading(true)
    setError(null)
    try {
      const response = await publicBookingService.getBarberAvailability(
        form.barber_id,
        form.service_id!,
        form.date,
        form.date
      )

      setAvailableSlots(response.slots || [])
    } catch (error) {
      console.error('Failed to check availability:', error)
      const apiError = error instanceof PublicBookingApiError
        ? { message: error.message, status: error.status, details: error.details }
        : { message: 'Failed to check availability. Please try again.' }
      setError(apiError)
      setAvailableSlots([])
    } finally {
      setAvailabilityLoading(false)
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

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      // Split client name into first and last name
      const nameParts = form.client_name.trim().split(' ')
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''

      const bookingData: CreateBookingRequest = {
        service_id: form.service_id!,
        barber_id: form.barber_id!,
        appointment_date: form.date,
        appointment_time: form.time,
        location_id: form.location_id || undefined,
        client_first_name: firstName,
        client_last_name: lastName,
        client_email: form.client_email,
        client_phone: form.client_phone,
        notes: form.notes || undefined,
        timezone: 'America/New_York'
      }

      const response = await publicBookingService.createBooking(bookingData)

      // Prepare confirmation data
      setBookingConfirmation({
        confirmation_number: response.booking_token,
        service_name: selectedService?.name,
        barber_name: selectedBarber ? `${selectedBarber.first_name} ${selectedBarber.last_name}` : '',
        appointment_date: form.date,
        appointment_time: form.time,
        duration: selectedService?.duration_minutes,
        price: selectedService?.base_price,
        client_name: form.client_name,
        client_email: form.client_email,
        client_phone: form.client_phone,
        location: selectedLocation
      })

      setShowConfirmation(true)
    } catch (error: any) {
      console.error('Failed to create booking:', error)
      const apiError = error instanceof PublicBookingApiError
        ? { message: error.message, status: error.status, details: error.details }
        : { message: 'Failed to create booking. Please try again.' }
      setError(apiError)
    } finally {
      setLoading(false)
    }
  }

  const getStepContent = () => {
    switch (currentStep) {
      case 'location':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Location</h2>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error.message}</p>
                <button
                  onClick={loadLocations}
                  className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Loading State */}
            {locationsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {locations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => {
                      setForm(prev => ({ ...prev, location_id: location.id }))
                      setSelectedLocation(location)
                      handleNext()
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-left
                      ${form.location_id === location.id
                        ? 'border-slate-700 bg-slate-50'
                        : 'border-gray-300 hover:border-slate-400'}`}
                  >
                    <h3 className="font-medium text-gray-900">{location.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {location.address}, {location.city}, {location.state}
                    </p>
                    {location.phone && (
                      <p className="text-sm text-gray-500 mt-2">{location.phone}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!locationsLoading && !error && locations.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No locations available at the moment.</p>
                <button
                  onClick={loadLocations}
                  className="mt-2 text-slate-600 hover:text-slate-800 underline"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        )

      case 'service':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Service</h2>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error.message}</p>
                <button
                  onClick={loadServices}
                  className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Try again
                </button>
              </div>
            )}

            <ServiceSelector
              services={services}
              selectedService={selectedService}
              onServiceSelect={(service) => {
                setSelectedService(service)
                setForm(prev => ({ ...prev, service_id: service.id }))
              }}
              loading={servicesLoading}
            />

            {!servicesLoading && !error && services.length === 0 && selectedLocation && (
              <div className="text-center py-8 text-gray-500">
                <p>No services available at {selectedLocation.name}.</p>
                <button
                  onClick={loadServices}
                  className="mt-2 text-slate-600 hover:text-slate-800 underline"
                >
                  Refresh
                </button>
              </div>
            )}

            {selectedService && (
              <button
                onClick={handleNext}
                className="w-full mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Continue
              </button>
            )}
          </div>
        )

      case 'barber':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Barber</h2>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">{error.message}</p>
                <button
                  onClick={loadBarbers}
                  className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Try again
                </button>
              </div>
            )}

            {/* Loading State */}
            {barbersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-gray-200 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {barbers.map((barber) => (
                  <button
                    key={barber.id}
                    onClick={() => {
                      setSelectedBarber(barber)
                      setForm(prev => ({ ...prev, barber_id: barber.id }))
                      handleNext()
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-left
                      ${form.barber_id === barber.id
                        ? 'border-slate-700 bg-slate-50'
                        : 'border-gray-300 hover:border-slate-400'}`}
                  >
                    <h3 className="font-medium text-gray-900">
                      {barber.first_name} {barber.last_name}
                    </h3>
                    {barber.bio && (
                      <p className="text-sm text-gray-600 mt-1">{barber.bio}</p>
                    )}
                    {barber.average_rating && (
                      <p className="text-sm text-gray-500 mt-2">
                        ⭐ {barber.average_rating.toFixed(1)} rating ({barber.total_reviews} reviews)
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!barbersLoading && !error && barbers.length === 0 && selectedLocation && (
              <div className="text-center py-8 text-gray-500">
                <p>No barbers available at {selectedLocation.name}.</p>
                <button
                  onClick={loadBarbers}
                  className="mt-2 text-slate-600 hover:text-slate-800 underline"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        )

      case 'datetime':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Date & Time</h2>

            {/* Date Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
            </div>

            {/* Time Slots */}
            {form.date && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Available Times</label>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-800 text-sm">{error.message}</p>
                    <button
                      onClick={checkAvailability}
                      className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                    >
                      Try again
                    </button>
                  </div>
                )}

                <TimeSlotSelector
                  slots={availableSlots.map(slot => ({
                    time: slot.start_time,
                    available: slot.available,
                    reason: slot.reason
                  }))}
                  selectedTime={form.time}
                  onTimeSelect={(time) => setForm(prev => ({ ...prev, time }))}
                  loading={availabilityLoading}
                />
              </div>
            )}

            {form.time && (
              <button
                onClick={handleNext}
                className="w-full mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                Continue
              </button>
            )}
          </div>
        )

      case 'details':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Your Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={form.client_name}
                onChange={(e) => setForm(prev => ({ ...prev, client_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                placeholder="John Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                required
                value={form.client_email}
                onChange={(e) => setForm(prev => ({ ...prev, client_email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                placeholder="(555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Requests (optional)
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
                placeholder="Any special requests or notes..."
              />
            </div>

            <button
              onClick={handleNext}
              disabled={!form.client_name || !form.client_email}
              className="w-full mt-4 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Review Booking
            </button>
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Confirm Your Booking</h2>

            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600">Service</p>
                <p className="font-medium text-gray-900">{selectedService?.name}</p>
                <p className="text-sm text-gray-500">${selectedService?.base_price}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Barber</p>
                <p className="font-medium text-gray-900">
                  {selectedBarber?.first_name} {selectedBarber?.last_name}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Date & Time</p>
                <p className="font-medium text-gray-900">
                  {new Date(form.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
                <p className="text-sm text-gray-500">
                  {form.time} ({selectedService?.duration_minutes} minutes)
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Location</p>
                <p className="font-medium text-gray-900">{selectedLocation?.name}</p>
                <p className="text-sm text-gray-500">
                  {selectedLocation?.address}, {selectedLocation?.city}, {selectedLocation?.state}
                </p>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600">Contact Information</p>
                <p className="font-medium text-gray-900">{form.client_name}</p>
                <p className="text-sm text-gray-500">{form.client_email}</p>
                {form.client_phone && (
                  <p className="text-sm text-gray-500">{form.client_phone}</p>
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Booking...
                </>
              ) : (
                'Confirm Booking'
              )}
            </button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Book Your Appointment</h1>
          <p className="text-gray-600 mt-2">Schedule your next visit in just a few steps</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {steps.map((step, index) => {
              const stepIndex = steps.findIndex(s => s.key === currentStep)
              const isActive = index <= stepIndex
              const Icon = step.icon

              return (
                <div key={step.key} className="flex items-center flex-1">
                  <div className="relative">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors
                        ${isActive
                          ? 'bg-slate-700 border-slate-700 text-white'
                          : 'bg-white border-gray-300 text-gray-400'}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className={`absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs whitespace-nowrap
                      ${isActive ? 'text-slate-700 font-medium' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 transition-colors
                        ${index < stepIndex ? 'bg-slate-700' : 'bg-gray-300'}`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mt-8 sm:mt-12">
          {getStepContent()}

          {/* Navigation */}
          {currentStep !== 'location' && currentStep !== 'confirm' && (
            <div className="mt-6 flex justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
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
            router.push('/')
          }}
          booking={bookingConfirmation}
          onNewBooking={() => {
            setShowConfirmation(false)
            // Reset form
            setForm({
              location_id: null,
              service_id: null,
              barber_id: null,
              date: '',
              time: '',
              client_name: '',
              client_email: '',
              client_phone: '',
              notes: ''
            })
            setCurrentStep('location')
            setSelectedService(null)
            setSelectedBarber(null)
            setSelectedLocation(null)
          }}
        />
      )}
    </div>
  )
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking form...</p>
        </div>
      </div>
    }>
      <BookingPageContent />
    </Suspense>
  )
}
