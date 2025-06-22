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
  MapPinIcon,
  CreditCardIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline'

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
  paymentMethod?: 'card' | 'cash' | 'online'
  totalPrice?: number
}

interface BookingFlowProps {
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
}

// Mock data
const mockServices: Service[] = [
  {
    id: 'premium-cut',
    name: 'Premium Haircut',
    description: 'Professional styling with wash, cut, and finish',
    duration: 60,
    price: 85,
    category: 'Haircuts',
    isPopular: true,
    requirements: ['Consultation included', 'Premium products']
  },
  {
    id: 'classic-fade',
    name: 'Classic Fade',
    description: 'Modern fade cut with precision styling',
    duration: 45,
    price: 65,
    category: 'Haircuts',
    isPopular: true
  },
  {
    id: 'beard-trim',
    name: 'Beard Trim & Styling',
    description: 'Professional beard grooming and shaping',
    duration: 30,
    price: 35,
    category: 'Grooming'
  },
  {
    id: 'special-event',
    name: 'Special Event Styling',
    description: 'Complete grooming for weddings and special occasions',
    duration: 90,
    price: 120,
    category: 'Premium',
    requirements: ['24hr advance booking', 'Consultation required']
  },
  {
    id: 'hot-towel',
    name: 'Hot Towel Shave',
    description: 'Traditional hot towel shave experience',
    duration: 45,
    price: 55,
    category: 'Grooming'
  },
  {
    id: 'hair-wash',
    name: 'Hair Wash & Style',
    description: 'Professional wash and styling service',
    duration: 30,
    price: 25,
    category: 'Basic'
  }
]

const mockBarbers: Barber[] = [
  {
    id: 'marcus',
    name: 'Marcus Johnson',
    avatar: '/avatars/marcus.jpg',
    rating: 4.9,
    reviewCount: 127,
    specialties: ['Premium Cuts', 'Fades', 'Styling'],
    experience: '8 years',
    isRecommended: true,
    availability: {
      [new Date().toISOString().split('T')[0]]: ['09:00', '09:30', '10:00', '11:00', '14:00', '15:00', '16:00'],
      [new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]]: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00']
    }
  },
  {
    id: 'sarah',
    name: 'Sarah Mitchell',
    avatar: '/avatars/sarah.jpg',
    rating: 4.8,
    reviewCount: 94,
    specialties: ['Special Events', 'Color', 'Treatments'],
    experience: '6 years',
    availability: {
      [new Date().toISOString().split('T')[0]]: ['10:00', '11:00', '14:00', '15:00', '16:00', '17:00'],
      [new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]]: ['09:00', '10:00', '13:00', '14:00', '16:00', '17:00']
    }
  },
  {
    id: 'alex',
    name: 'Alex Rodriguez',
    avatar: '/avatars/alex.jpg',
    rating: 4.7,
    reviewCount: 76,
    specialties: ['Beard Grooming', 'Traditional Shaves', 'Basic Cuts'],
    experience: '4 years',
    availability: {
      [new Date().toISOString().split('T')[0]]: ['08:00', '09:00', '13:00', '14:00', '15:00'],
      [new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]]: ['08:00', '09:00', '10:00', '15:00', '16:00']
    }
  }
]

const STEPS = [
  { id: 'service', title: 'Choose Service', description: 'Select your desired service' },
  { id: 'barber', title: 'Select Barber', description: 'Choose your preferred barber' },
  { id: 'datetime', title: 'Pick Date & Time', description: 'Select your appointment slot' },
  { id: 'details', title: 'Your Details', description: 'Provide contact information' },
  { id: 'confirmation', title: 'Confirmation', description: 'Review and confirm booking' }
]

export default function BookingFlow({
  isOpen,
  onClose,
  onComplete,
  selectedDate,
  selectedTime,
  theme = 'dark',
  services = mockServices,
  barbers = mockBarbers,
  workingHours = { start: '08:00', end: '18:00' },
  timeSlotDuration = 30
}: BookingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [bookingData, setBookingData] = useState<BookingData>({})
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [availableSlots, setAvailableSlots] = useState<{ [date: string]: TimeSlot[] }>({})

  // Initialize with selected date/time if provided
  useEffect(() => {
    if (selectedDate && selectedTime) {
      setBookingData(prev => ({
        ...prev,
        date: selectedDate,
        time: selectedTime
      }))
      setCurrentStep(3) // Skip to details step
    }
  }, [selectedDate, selectedTime])

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

    switch (step) {
      case 0: // Service
        if (!bookingData.service) {
          newErrors.service = 'Please select a service'
        }
        break
      case 1: // Barber
        if (!bookingData.barber) {
          newErrors.barber = 'Please select a barber'
        }
        break
      case 2: // Date & Time
        if (!bookingData.date) {
          newErrors.date = 'Please select a date'
        }
        if (!bookingData.time) {
          newErrors.time = 'Please select a time'
        }
        break
      case 3: // Details
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
        break
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < STEPS.length - 1) {
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
      const totalPrice = bookingData.service?.price || 0
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
          theme === 'dark' ? 'bg-gray-900 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          {/* Header */}
          <div className={`px-6 py-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Book Appointment
              </h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${theme === 'dark'
                  ? 'text-gray-400 hover:text-white hover:bg-gray-800'
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
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all ${
                    index <= currentStep
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : theme === 'dark'
                        ? 'border-gray-600 text-gray-400'
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
                        ? theme === 'dark' ? 'text-white' : 'text-gray-900'
                        : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {step.description}
                    </div>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`mx-4 h-0.5 w-12 ${
                      index < currentStep ? 'bg-violet-600' : theme === 'dark' ? 'bg-gray-700' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {currentStep === 0 && (
              <ServiceSelection
                theme={theme}
                services={services}
                selectedService={bookingData.service}
                onServiceSelect={(service) => updateBookingData({ service })}
                error={errors.service}
              />
            )}

            {currentStep === 1 && (
              <BarberSelection
                theme={theme}
                barbers={barbers}
                selectedBarber={bookingData.barber}
                onBarberSelect={(barber) => updateBookingData({ barber })}
                error={errors.barber}
                selectedService={bookingData.service}
              />
            )}

            {currentStep === 2 && (
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

            {currentStep === 3 && (
              <ClientDetails
                theme={theme}
                clientInfo={bookingData.clientInfo}
                onClientInfoUpdate={(clientInfo) => updateBookingData({ clientInfo })}
                errors={errors}
              />
            )}

            {currentStep === 4 && (
              <BookingConfirmation
                theme={theme}
                bookingData={bookingData}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Footer */}
          <div className={`px-6 py-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentStep === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : theme === 'dark'
                      ? 'text-gray-300 hover:text-white hover:bg-gray-800'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <ChevronLeftIcon className="w-4 h-4" />
                <span>Previous</span>
              </button>

              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                Step {currentStep + 1} of {STEPS.length}
              </div>

              <button
                onClick={handleNext}
                disabled={isLoading}
                className={`flex items-center space-x-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isLoading
                    ? 'opacity-50 cursor-not-allowed'
                    : 'bg-violet-600 hover:bg-violet-700 text-white'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : currentStep === STEPS.length - 1 ? (
                  <>
                    <span>Confirm Booking</span>
                    <CheckIcon className="w-4 h-4" />
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

// Service Selection Component
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
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Choose Your Service
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Select the service you'd like to book
        </p>
      </div>

      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {categories.map(category => (
        <div key={category}>
          <h4 className={`text-md font-medium mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
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
                      <h5 className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        {service.name}
                      </h5>
                    </div>
                    <p className={`text-sm mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {service.description}
                    </p>

                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="w-4 h-4 text-gray-500" />
                        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
                          {service.duration} min
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CurrencyDollarIcon className="w-4 h-4 text-green-500" />
                        <span className={`font-semibold ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>
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

// Barber Selection Component
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
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Choose Your Barber
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
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

// Date & Time Selection Component
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
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Select Date & Time
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
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
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : hasAvailableSlots
                      ? theme === 'dark'
                        ? 'border-gray-700 bg-gray-800/30 hover:border-gray-600'
                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                      : 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`text-xs font-medium ${
                  isSelected ? 'text-violet-600' :
                  hasAvailableSlots ? theme === 'dark' ? 'text-white' : 'text-gray-900' :
                  'text-gray-400'
                }`}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-lg font-bold ${
                  isSelected ? 'text-violet-600' :
                  hasAvailableSlots ? theme === 'dark' ? 'text-white' : 'text-gray-900' :
                  'text-gray-400'
                }`}>
                  {date.getDate()}
                </div>
                {isToday && (
                  <div className="text-xs text-violet-600 font-medium">Today</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time Selection */}
      {selectedDate && (
        <div>
          <h4 className={`text-md font-medium mb-3 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
            Available Times
          </h4>
          {errors.time && <div className="text-red-500 text-sm mb-2">{errors.time}</div>}

          {availableTimeSlots.length === 0 ? (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
                      ? 'border-violet-500 bg-violet-600 text-white'
                      : theme === 'dark'
                        ? 'border-gray-700 bg-gray-800/30 text-white hover:border-gray-600'
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

// Client Details Component
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
}

function ClientDetails({ theme, clientInfo, onClientInfoUpdate, errors }: ClientDetailsProps) {
  const handleInputChange = (field: string, value: string) => {
    onClientInfoUpdate({
      ...clientInfo,
      [field]: value
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Your Contact Information
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Please provide your details for appointment confirmation
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Full Name *
          </label>
          <div className="relative">
            <UserIcon className={`absolute left-3 top-3 w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
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
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Email Address *
          </label>
          <div className="relative">
            <EnvelopeIcon className={`absolute left-3 top-3 w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
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
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Phone Number *
          </label>
          <div className="relative">
            <PhoneIcon className={`absolute left-3 top-3 w-5 h-5 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} />
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
          <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
            Special Requests
          </label>
          <textarea
            value={clientInfo?.notes || ''}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className={`w-full px-4 py-3 rounded-lg border transition-colors ${
              theme === 'dark'
                ? 'bg-gray-800 border-gray-700 text-white focus:border-violet-500'
                : 'bg-white border-gray-300 text-gray-900 focus:border-violet-500'
            }`}
            placeholder="Any special requests or notes for your appointment..."
          />
        </div>
      </div>
    </div>
  )
}

// Booking Confirmation Component
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
        <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Confirm Your Appointment
        </h3>
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          Please review your appointment details before confirming
        </p>
      </div>

      <div className={`rounded-lg border p-6 ${theme === 'dark' ? 'border-gray-700 bg-gray-800/30' : 'border-gray-200 bg-gray-50'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Service Details */}
          <div>
            <h4 className={`text-md font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Service Details
            </h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <ScissorsIcon className="w-5 h-5 text-violet-600" />
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
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
                  ${bookingData.service?.price}
                </span>
              </div>
            </div>
          </div>

          {/* Barber Details */}
          <div>
            <h4 className={`text-md font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
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
            <h4 className={`text-md font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Date & Time
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
            <h4 className={`text-md font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
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
      <div className={`flex items-start space-x-3 p-4 rounded-lg ${theme === 'dark' ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'}`}>
        <ShieldCheckIcon className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <h5 className={`font-medium mb-1 ${theme === 'dark' ? 'text-green-400' : 'text-green-800'}`}>
            Secure Booking
          </h5>
          <p className={`text-sm ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>
            Your appointment details are encrypted and secure. You'll receive a confirmation email shortly.
          </p>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center space-x-2">
            <div className="w-6 h-6 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
              Processing your booking...
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
