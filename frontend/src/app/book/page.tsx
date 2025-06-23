'use client'

import { useState, useEffect } from 'react'
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
import { bookingService } from '@/lib/api/bookings'
import { servicesService } from '@/lib/api/services'
import { barbersService } from '@/lib/api/barbers'
import { locationsService } from '@/lib/api/locations'
import ServiceSelector from '@/components/booking/ServiceSelector'
import TimeSlotSelector from '@/components/booking/TimeSlotSelector'
import BookingConfirmationModal from '@/components/booking/BookingConfirmationModal'
import type { Service, BarberProfile, Location } from '@/lib/api'

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

export default function BookingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if specific barber or location is pre-selected
  const preselectedBarberId = searchParams.get('barber')
  const preselectedLocationId = searchParams.get('location')

  const [currentStep, setCurrentStep] = useState<BookingStep>('location')
  const [loading, setLoading] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [barbers, setBarbers] = useState<BarberProfile[]>([])
  const [availableSlots, setAvailableSlots] = useState<any[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedBarber, setSelectedBarber] = useState<BarberProfile | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [bookingConfirmation, setBookingConfirmation] = useState<any>(null)

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
    if (form.location_id || form.barber_id) {
      loadServices()
    }
  }, [form.location_id, form.barber_id])

  // Load barbers when service is selected
  useEffect(() => {
    if (form.service_id && form.location_id) {
      loadBarbers()
    }
  }, [form.service_id, form.location_id])

  // Check availability when barber and date are selected
  useEffect(() => {
    if (form.barber_id && form.date && form.service_id) {
      checkAvailability()
    }
  }, [form.barber_id, form.date, form.service_id])

  const loadLocations = async () => {
    try {
      const response = await locationsService.getLocations({ is_active: true })
      setLocations(response.data)

      // Auto-select if only one location
      if (response.data.length === 1) {
        setForm(prev => ({ ...prev, location_id: response.data[0].id }))
        setSelectedLocation(response.data[0])
      }
    } catch (error) {
      console.error('Failed to load locations:', error)
    }
  }

  const loadServices = async () => {
    setLoading(true)
    try {
      const params: any = { is_active: true }
      if (form.location_id) params.location_id = form.location_id
      if (form.barber_id) params.barber_id = form.barber_id

      const response = await servicesService.getServices(params)
      setServices(response.data)
    } catch (error) {
      console.error('Failed to load services:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBarbers = async () => {
    setLoading(true)
    try {
      const response = await barbersService.getBarbers({
        location_id: form.location_id!,
        service_id: form.service_id!,
        is_active: true
      })
      // Handle both paginated response and direct array response (for mock data)
      const barbersData = Array.isArray(response) ? response : (response?.data || [])
      setBarbers(Array.isArray(barbersData) ? barbersData : [])

      // If pre-selected barber, find and select them
      if (preselectedBarberId && Array.isArray(barbersData)) {
        const barber = barbersData.find(b => b.id === parseInt(preselectedBarberId))
        if (barber) {
          setSelectedBarber(barber)
          setForm(prev => ({ ...prev, barber_id: barber.id }))
        }
      }
    } catch (error) {
      console.error('Failed to load barbers:', error)
      setBarbers([])
    } finally {
      setLoading(false)
    }
  }

  const checkAvailability = async () => {
    if (!form.barber_id || !form.date || !selectedService) return

    setLoading(true)
    try {
      const response = await barbersService.getAvailability(
        form.barber_id,
        form.date,
        form.date,
        form.service_id!,
        selectedService.duration_minutes
      )

      const slots = response.data[form.date] || []
      setAvailableSlots(slots)
    } catch (error) {
      console.error('Failed to check availability:', error)
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

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const bookingData = {
        service_id: form.service_id!,
        barber_id: form.barber_id!,
        appointment_date: form.date,
        appointment_time: form.time,
        location_id: form.location_id,
        client_info: {
          name: form.client_name,
          email: form.client_email,
          phone: form.client_phone
        },
        notes: form.notes
      }

      const response = await bookingService.createBooking(bookingData)

      // Prepare confirmation data
      setBookingConfirmation({
        ...response.data,
        service_name: selectedService?.name,
        barber_name: selectedBarber ? `${selectedBarber.first_name} ${selectedBarber.last_name}` : '',
        duration: selectedService?.duration_minutes,
        price: selectedService?.base_price,
        location: selectedLocation
      })

      setShowConfirmation(true)
    } catch (error: any) {
      console.error('Failed to create booking:', error)
      alert(error.response?.data?.detail || 'Failed to create booking. Please try again.')
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
          </div>
        )

      case 'service':
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Select Service</h2>
            <ServiceSelector
              services={services}
              selectedService={selectedService}
              onServiceSelect={(service) => {
                setSelectedService(service)
                setForm(prev => ({ ...prev, service_id: service.id }))
              }}
              loading={loading}
            />
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
                  {barber.specialties && barber.specialties.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">{barber.specialties[0]}</p>
                  )}
                  {barber.average_rating && (
                    <p className="text-sm text-gray-500 mt-2">
                      ⭐ {barber.average_rating.toFixed(1)} rating
                    </p>
                  )}
                </button>
              ))}
            </div>
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
                <TimeSlotSelector
                  slots={availableSlots.map(slot => ({
                    time: slot.start_time,
                    available: slot.is_available,
                    reason: slot.reason
                  }))}
                  selectedTime={form.time}
                  onTimeSelect={(time) => setForm(prev => ({ ...prev, time }))}
                  loading={loading}
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
