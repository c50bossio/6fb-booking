'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import BaseModal from './BaseModal'
import {
  UserIcon,
  CalendarDaysIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { bookingService, type Service, type Booking } from '../../lib/api/bookings'

// Form validation schema
const appointmentSchema = z.object({
  client_name: z.string().min(2, 'Client name must be at least 2 characters'),
  client_email: z.string().email('Please enter a valid email address'),
  client_phone: z.string().optional(),
  service_id: z.number().min(1, 'Please select a service'),
  barber_id: z.number().min(1, 'Please select a barber'),
  appointment_date: z.string().min(1, 'Please select a date'),
  appointment_time: z.string().min(1, 'Please select a time'),
  notes: z.string().optional()
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

interface CreateAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: string
  selectedTime?: string
  onSuccess?: (booking: Booking) => void
}

// Mock data for demonstration
const mockServices: Service[] = [
  {
    id: 1,
    name: 'Premium Haircut',
    description: 'Complete styling with wash and finish',
    category: 'Haircuts',
    category_id: 1,
    duration: 60,
    price: 65,
    is_active: true,
    popular: true,
    timeOfDay: ['morning', 'afternoon']
  },
  {
    id: 2,
    name: 'Beard Trim',
    description: 'Professional beard styling and grooming',
    category: 'Grooming',
    category_id: 2,
    duration: 30,
    price: 25,
    is_active: true,
    timeOfDay: ['morning', 'afternoon', 'evening']
  },
  {
    id: 3,
    name: 'Fade Cut',
    description: 'Classic fade with modern styling',
    category: 'Haircuts',
    category_id: 1,
    duration: 45,
    price: 45,
    is_active: true,
    popular: true,
    timeOfDay: ['morning', 'afternoon']
  },
  {
    id: 4,
    name: 'Quick Touch-up',
    description: 'Fast styling for busy schedules',
    category: 'Haircuts',
    category_id: 1,
    duration: 30,
    price: 35,
    is_active: true,
    timeOfDay: ['morning', 'evening']
  }
]

const mockBarbers = [
  { id: 1, name: 'Marcus Johnson', rating: 4.8, specialties: ['Premium Cuts', 'Beard Styling'] },
  { id: 2, name: 'Sarah Mitchell', rating: 4.9, specialties: ['Fades', 'Color'] },
  { id: 3, name: 'David Rodriguez', rating: 4.7, specialties: ['Classic Cuts', 'Grooming'] }
]

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
]

// Helper function to get time of day
const getTimeOfDay = (time: string): string => {
  const hour = parseInt(time.split(':')[0])
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}

// Helper function to format date for display
const formatDateForDisplay = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// Helper function to format time for display
const formatTimeForDisplay = (timeString: string): string => {
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

export default function CreateAppointmentModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  onSuccess
}: CreateAppointmentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [services, setServices] = useState<Service[]>([])
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const clientNameRef = useRef<HTMLInputElement>(null)
  const [recommendedServices, setRecommendedServices] = useState<Service[]>([])
  const [isPreFilled, setIsPreFilled] = useState(false)
  const [loadingServices, setLoadingServices] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid }
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      appointment_date: selectedDate || '',
      appointment_time: selectedTime || ''
    }
  })

  const watchedServiceId = watch('service_id')

  // Update selected service when service_id changes
  useEffect(() => {
    if (watchedServiceId) {
      const service = services.find(s => s.id === watchedServiceId)
      setSelectedService(service || null)
    }
  }, [watchedServiceId, services])

  // Fetch services from API
  const fetchServices = async () => {
    setLoadingServices(true)
    try {
      // Try to get services for a specific barber (default to barber ID 1)
      const response = await bookingService.getServices({ barber_id: 1 })
      const apiServices = response.data.map((service: any) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        category: service.category_name,
        category_id: service.category_id,
        duration: service.duration_minutes,
        price: service.base_price,
        is_active: true,
        popular: service.id <= 2, // Mark first two services as popular
        timeOfDay: ['morning', 'afternoon', 'evening'] // Default to all times
      }))
      setServices(apiServices)
    } catch (error) {
      console.error('Failed to fetch services, using mock data:', error)
      // Fallback to mock services if API fails
      setServices(mockServices)
    } finally {
      setLoadingServices(false)
    }
  }

  // Set initial values when modal opens and handle auto-focus
  useEffect(() => {
    if (isOpen) {
      setValue('appointment_date', selectedDate || '')
      setValue('appointment_time', selectedTime || '')
      setShowSuccess(false)
      
      // Fetch services when modal opens
      fetchServices()
      
      // Check if date and time are pre-filled
      const hasPreFilledDateTime = !!(selectedDate && selectedTime)
      setIsPreFilled(hasPreFilledDateTime)
      
      // Auto-focus client name field if date/time are pre-filled
      if (hasPreFilledDateTime) {
        setTimeout(() => {
          clientNameRef.current?.focus()
        }, 100)
      }
    }
  }, [isOpen, selectedDate, selectedTime, setValue])

  // Update recommended services when services change or time is selected
  useEffect(() => {
    if (selectedTime && services.length > 0) {
      const timeOfDay = getTimeOfDay(selectedTime)
      const recommended = services.filter(service => 
        service.timeOfDay?.includes(timeOfDay)
      )
      setRecommendedServices(recommended.length > 0 ? recommended : services)
    } else {
      setRecommendedServices([])
    }
  }, [services, selectedTime])

  const onSubmit = async (data: AppointmentFormData) => {
    setIsLoading(true)
    try {
      // Create booking request
      const bookingRequest = {
        service_id: data.service_id,
        barber_id: data.barber_id,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        client_info: {
          name: data.client_name,
          email: data.client_email,
          phone: data.client_phone
        },
        notes: data.notes
      }

      // In a real app, this would call the API
      // const response = await bookingService.createBooking(bookingRequest)

      // Mock successful response
      const mockBooking: Booking = {
        id: Math.random().toString(36).substr(2, 9),
        confirmation_number: `BK${Date.now()}`,
        service: selectedService!,
        barber: mockBarbers.find(b => b.id === data.barber_id)!,
        location: {
          id: 1,
          name: 'Downtown Location',
          address: '123 Main St',
          city: 'City',
          state: 'ST',
          zip: '12345',
          phone: '(555) 123-4567'
        },
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        status: 'confirmed',
        payment_status: 'not_required',
        client_info: {
          name: data.client_name,
          email: data.client_email,
          phone: data.client_phone
        },
        notes: data.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      setShowSuccess(true)
      onSuccess?.(mockBooking)

      // Auto-close after showing success
      setTimeout(() => {
        handleClose()
      }, 2000)

    } catch (error) {
      console.error('Failed to create appointment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setSelectedService(null)
    setShowSuccess(false)
    onClose()
  }

  if (showSuccess) {
    return (
      <BaseModal isOpen={isOpen} onClose={handleClose} size="md" showCloseButton={false}>
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Appointment Created!
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Your appointment has been successfully scheduled. A confirmation email will be sent shortly.
          </p>
          <button
            onClick={handleClose}
            className="premium-button text-sm"
          >
            Close
          </button>
        </div>
      </BaseModal>
    )
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Appointment"
      size="2xl"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Pre-filled Date/Time Banner */}
        {isPreFilled && selectedDate && selectedTime && (
          <div className="bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                  <CalendarDaysIcon className="w-5 h-5 text-teal-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Selected Time Slot
                </h4>
                <div className="flex items-center space-x-4 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center space-x-1">
                    <CalendarDaysIcon className="w-4 h-4 text-teal-600" />
                    <span className="font-medium">{formatDateForDisplay(selectedDate)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <ClockIcon className="w-4 h-4 text-teal-600" />
                    <span className="font-medium">{formatTimeForDisplay(selectedTime)}</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="flex items-center text-xs font-medium text-teal-700 bg-teal-100 px-2 py-1 rounded-full">
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  Pre-selected
                </div>
              </div>
            </div>
            {recommendedServices.length > 0 && (
              <div className="mt-3 pt-3 border-t border-teal-200">
                <div className="flex items-center space-x-2 text-sm text-teal-700 dark:text-teal-300">
                  <SparklesIcon className="w-4 h-4" />
                  <span className="font-medium">Recommended for {getTimeOfDay(selectedTime)} appointments</span>
                </div>
              </div>
            )}
          </div>
        )}
        {/* Client Information */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-3">
            <UserIcon className="h-5 w-5 text-teal-600" />
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Client Information</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Name *
              </label>
              <input
                {...register('client_name')}
                ref={clientNameRef}
                type="text"
                className="premium-input w-full"
                placeholder="Enter client name"
              />
              {errors.client_name && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  {errors.client_name.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                {...register('client_email')}
                type="email"
                className="premium-input w-full"
                placeholder="client@example.com"
              />
              {errors.client_email && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  {errors.client_email.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <input
                {...register('client_phone')}
                type="tel"
                className="premium-input w-full"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Service Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <CurrencyDollarIcon className="h-5 w-5 text-teal-600" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Service Selection</h4>
            </div>
            {recommendedServices.length > 0 && (
              <div className="flex items-center text-xs font-medium text-teal-700 bg-teal-50 px-2 py-1 rounded-full">
                <SparklesIcon className="w-3 h-3 mr-1" />
                {recommendedServices.length} recommended
              </div>
            )}
          </div>

          {/* Recommended Services First */}
          {recommendedServices.length > 0 && (
            <>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Recommended for your time slot:</div>
              <div className="grid grid-cols-1 gap-3 mb-4">
                {recommendedServices.map((service) => (
                  <label
                    key={service.id}
                    className={`
                      relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                      ${watchedServiceId === service.id
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 ring-2 ring-teal-200 dark:ring-teal-800'
                        : 'border-teal-200 dark:border-teal-700 bg-teal-50/20 dark:bg-teal-900/10 hover:border-teal-300 dark:hover:border-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20'
                      }
                    `}
                  >
                    <input
                      {...register('service_id', { valueAsNumber: true })}
                      type="radio"
                      value={service.id}
                      className="sr-only"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white">{service.name}</h5>
                            <div className="flex items-center text-xs font-medium text-teal-700 bg-teal-100 px-2 py-1 rounded-full">
                              <SparklesIcon className="w-3 h-3 mr-1" />
                              Recommended
                            </div>
                          </div>
                          {service.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{service.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">${service.price}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{service.duration} min</div>
                        </div>
                      </div>
                      {service.popular && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 mt-2">
                          Popular
                        </span>
                      )}
                    </div>
                    {watchedServiceId === service.id && (
                      <CheckCircleIcon className="h-5 w-5 text-teal-600 ml-3" />
                    )}
                  </label>
                ))}
              </div>
              
              {services.filter(s => !recommendedServices.some(r => r.id === s.id)).length > 0 && (
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Other available services:</div>
              )}
            </>
          )}

          {/* All Services or Non-recommended Services */}
          <div className="grid grid-cols-1 gap-3">
            {(recommendedServices.length > 0 
              ? services.filter(s => !recommendedServices.some(r => r.id === s.id))
              : services
            ).map((service) => (
              <label
                key={service.id}
                className={`
                  relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                  ${watchedServiceId === service.id
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }
                `}
              >
                <input
                  {...register('service_id', { valueAsNumber: true })}
                  type="radio"
                  value={service.id}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-white">{service.name}</h5>
                      {service.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{service.description}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">${service.price}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{service.duration} min</div>
                    </div>
                  </div>
                  {service.popular && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 dark:bg-teal-900/50 text-teal-800 dark:text-teal-200 mt-2">
                      Popular
                    </span>
                  )}
                </div>
                {watchedServiceId === service.id && (
                  <CheckCircleIcon className="h-5 w-5 text-teal-600 ml-3" />
                )}
              </label>
            ))}
          </div>
          {errors.service_id && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              {errors.service_id.message}
            </p>
          )}
        </div>

        {/* Barber Selection */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Select Barber</h4>
          <div className="grid grid-cols-1 gap-3">
            {mockBarbers.map((barber) => (
              <label
                key={barber.id}
                className={`
                  relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                  ${watch('barber_id') === barber.id
                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }
                `}
              >
                <input
                  {...register('barber_id', { valueAsNumber: true })}
                  type="radio"
                  value={barber.id}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="font-semibold text-gray-900 dark:text-white">{barber.name}</h5>
                      <div className="flex items-center mt-1">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(barber.rating) ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                          <span className="ml-1 text-sm text-gray-600 dark:text-gray-400">{barber.rating}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {barber.specialties.map((specialty) => (
                          <span
                            key={specialty}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          >
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                {watch('barber_id') === barber.id && (
                  <CheckCircleIcon className="h-5 w-5 text-teal-600 ml-3" />
                )}
              </label>
            ))}
          </div>
          {errors.barber_id && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
              {errors.barber_id.message}
            </p>
          )}
        </div>

        {/* Date and Time Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <CalendarDaysIcon className="h-5 w-5 text-teal-600" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Date & Time</h4>
            </div>
            {isPreFilled && (
              <div className="flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full">
                <CheckCircleIcon className="w-3 h-3 mr-1" />
                Already selected
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date *
              </label>
              <div className="relative">
                <input
                  {...register('appointment_date')}
                  type="date"
                  className={`premium-input w-full ${
                    isPreFilled && selectedDate ? 'bg-green-50 border-green-200' : ''
                  }`}
                  min={new Date().toISOString().split('T')[0]}
                />
                {isPreFilled && selectedDate && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  </div>
                )}
              </div>
              {errors.appointment_date && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  {errors.appointment_date.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time *
              </label>
              <div className="relative">
                <select
                  {...register('appointment_time')}
                  className={`premium-input w-full ${
                    isPreFilled && selectedTime ? 'bg-green-50 border-green-200' : ''
                  }`}
                >
                  <option value="">Select a time</option>
                  {timeSlots.map((time) => (
                    <option key={time} value={time}>
                      {formatTimeForDisplay(time)}
                    </option>
                  ))}
                </select>
                {isPreFilled && selectedTime && (
                  <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                    <CheckCircleIcon className="w-4 h-4 text-green-600" />
                  </div>
                )}
              </div>
              {errors.appointment_time && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  {errors.appointment_time.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Additional Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            className="premium-input w-full resize-none"
            placeholder="Any special requests or notes..."
          />
        </div>

        {/* Summary */}
        {selectedService && (
          <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl p-4">
            <h5 className="font-semibold text-teal-900 dark:text-teal-100 mb-2">Appointment Summary</h5>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-teal-700 dark:text-teal-300">Service:</span>
                <span className="font-medium text-teal-900 dark:text-teal-100">{selectedService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-700 dark:text-teal-300">Duration:</span>
                <span className="font-medium text-teal-900 dark:text-teal-100">{selectedService.duration} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-teal-700 dark:text-teal-300">Price:</span>
                <span className="font-medium text-teal-900 dark:text-teal-100">${selectedService.price}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="premium-button-secondary text-sm"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !isValid}
            className="premium-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating...
              </div>
            ) : (
              'Create Appointment'
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  )
}
