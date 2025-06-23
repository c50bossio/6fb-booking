'use client'

import { useState, useEffect } from 'react'
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
  PhoneIcon,
  EnvelopeIcon,
  ScissorsIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { appointmentsService } from '../../lib/api/appointments'
import { barbersService } from '../../lib/api/barbers'
import { servicesService } from '../../lib/api/services'

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

interface BarberOption {
  id: number
  name: string
  rating?: number
  specialties?: string[]
  avatar?: string
  status?: 'online' | 'busy' | 'offline'
}

interface ServiceOption {
  id: number
  name: string
  description?: string
  category: string
  duration: number
  price: number
  popular?: boolean
}

interface NewAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate?: string
  selectedTime?: string
  selectedBarberId?: number
  onSuccess?: (appointment: any) => void
  initialData?: {
    clientName?: string
    clientEmail?: string
    clientPhone?: string
    serviceId?: number
    barberId?: number
    notes?: string
  }
}

export default function NewAppointmentModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  selectedBarberId,
  onSuccess,
  initialData
}: NewAppointmentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [services, setServices] = useState<ServiceOption[]>([])
  const [barbers, setBarbers] = useState<BarberOption[]>([])
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availableTimeSlots, setAvailableTimeSlots] = useState<string[]>([])
  const [searchingClients, setSearchingClients] = useState(false)
  const [clientSuggestions, setClientSuggestions] = useState<Array<{ name: string; email: string; phone?: string }>>([])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    clearErrors,
    formState: { errors, isValid, isDirty }
  } = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      client_name: initialData?.clientName || '',
      client_email: initialData?.clientEmail || '',
      client_phone: initialData?.clientPhone || '',
      appointment_date: selectedDate || '',
      appointment_time: selectedTime || '',
      service_id: initialData?.serviceId || 0,
      barber_id: selectedBarberId || initialData?.barberId || 0,
      notes: initialData?.notes || ''
    }
  })

  const watchedServiceId = watch('service_id')
  const watchedBarberId = watch('barber_id')
  const watchedClientName = watch('client_name')
  const watchedDate = watch('appointment_date')

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadInitialData()
    }
  }, [isOpen])

  // Update selected service when service_id changes
  useEffect(() => {
    if (watchedServiceId) {
      const service = services.find(s => s.id === watchedServiceId)
      setSelectedService(service || null)
    }
  }, [watchedServiceId, services])

  // Load available time slots when date or barber changes
  useEffect(() => {
    if (watchedDate && watchedBarberId && selectedService) {
      loadAvailableTimeSlots()
    }
  }, [watchedDate, watchedBarberId, selectedService])

  // Search for existing clients when name changes
  useEffect(() => {
    if (watchedClientName && watchedClientName.length > 2) {
      searchExistingClients(watchedClientName)
    } else {
      setClientSuggestions([])
    }
  }, [watchedClientName])

  const loadInitialData = async () => {
    setLoadingData(true)
    setError(null)
    
    try {
      // Load services and barbers in parallel
      const [servicesResponse, barbersResponse] = await Promise.all([
        servicesService.getServices({ is_active: true }),
        barbersService.getBarbers({ is_active: true })
      ])

      // Handle both paginated response and direct array response (for mock data)
      const servicesData = Array.isArray(servicesResponse) ? servicesResponse : (servicesResponse?.data || [])
      const barbersData = Array.isArray(barbersResponse) ? barbersResponse : (barbersResponse?.data || [])

      const serviceOptions: ServiceOption[] = Array.isArray(servicesData) ? servicesData.map(service => ({
        id: service.id,
        name: service.name,
        description: service.description,
        category: service.category || 'General',
        duration: service.duration || 60,
        price: service.price || 0,
        popular: service.popular
      })) : []

      const barberOptions: BarberOption[] = Array.isArray(barbersData) ? barbersData.map(barber => ({
        id: barber.id,
        name: `${barber.first_name} ${barber.last_name}`,
        rating: barber.rating,
        specialties: barber.specialties || [],
        status: barber.is_active ? 'online' : 'offline'
      })) : []

      setServices(serviceOptions)
      setBarbers(barberOptions)

      // Set form defaults after data is loaded
      if (selectedDate) setValue('appointment_date', selectedDate)
      if (selectedTime) setValue('appointment_time', selectedTime)
      if (selectedBarberId) setValue('barber_id', selectedBarberId)
      if (initialData?.serviceId) setValue('service_id', initialData.serviceId)
      
      setShowSuccess(false)
    } catch (err) {
      console.error('Error loading initial data:', err)
      setError('Failed to load services and barbers')
    } finally {
      setLoadingData(false)
    }
  }

  const loadAvailableTimeSlots = async () => {
    if (!watchedDate || !watchedBarberId || !selectedService) return

    try {
      // Generate time slots from 9 AM to 6 PM in 30-minute intervals
      const slots: string[] = []
      for (let hour = 9; hour <= 17; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (hour === 17 && minute > 0) break // Stop at 5:30 PM
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
          slots.push(timeString)
        }
      }
      setAvailableTimeSlots(slots)
    } catch (err) {
      console.error('Error loading time slots:', err)
    }
  }

  const searchExistingClients = async (searchTerm: string) => {
    setSearchingClients(true)
    try {
      // This would typically call an API to search for existing clients
      // For now, we'll use mock data
      const mockClients = [
        { name: 'John Smith', email: 'john.smith@example.com', phone: '(555) 123-4567' },
        { name: 'Jane Doe', email: 'jane.doe@example.com', phone: '(555) 987-6543' },
        { name: 'Mike Johnson', email: 'mike.johnson@example.com' }
      ]
      
      const filtered = mockClients.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setClientSuggestions(filtered)
    } catch (err) {
      console.error('Error searching clients:', err)
    } finally {
      setSearchingClients(false)
    }
  }

  const onSubmit = async (data: AppointmentFormData) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Create appointment via API
      const appointmentData = {
        barber_id: data.barber_id,
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        service_id: data.service_id,
        service_name: selectedService?.name || 'Service',
        service_duration: selectedService?.duration || 60,
        service_price: selectedService?.price || 0,
        notes: data.notes
      }

      const response = await appointmentsService.createAppointment(appointmentData)

      // Show success state
      setShowSuccess(true)
      
      // Call the onSuccess callback with the created appointment data
      // This will trigger the calendar refresh in the parent component
      if (onSuccess && response.data) {
        onSuccess(response.data)
      }

      // Auto-close after showing success
      setTimeout(() => {
        handleClose()
      }, 2000)

    } catch (error: any) {
      console.error('Failed to create appointment:', error)
      setError(error.response?.data?.detail || 'Failed to create appointment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    setSelectedService(null)
    setShowSuccess(false)
    setError(null)
    setClientSuggestions([])
    setAvailableTimeSlots([])
    onClose()
  }

  const selectClient = (client: { name: string; email: string; phone?: string }) => {
    setValue('client_name', client.name)
    setValue('client_email', client.email)
    setValue('client_phone', client.phone || '')
    setClientSuggestions([])
    clearErrors(['client_name', 'client_email', 'client_phone'])
  }

  if (showSuccess) {
    return (
      <BaseModal isOpen={isOpen} onClose={handleClose} size="md" showCloseButton={false}>
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <CheckCircleIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
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
      size="3xl"
    >
      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mr-3"></div>
          <span className="text-gray-600 dark:text-gray-300">Loading services and barbers...</span>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Data</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <button
            onClick={loadInitialData}
            className="premium-button text-sm"
          >
            Try Again
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Client Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <UserIcon className="h-5 w-5 text-teal-600" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Client Information</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <div className="relative">
                  <input
                    {...register('client_name')}
                    type="text"
                    className="premium-input w-full pr-10"
                    placeholder="Enter client name"
                    autoComplete="name"
                  />
                  {searchingClients && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
                    </div>
                  )}
                </div>
                
                {/* Client suggestions dropdown */}
                {clientSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {clientSuggestions.map((client, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectClient(client)}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900 dark:text-white">{client.name}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">{client.email}</div>
                        {client.phone && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">{client.phone}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                
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
                <div className="relative">
                  <input
                    {...register('client_email')}
                    type="email"
                    className="premium-input w-full pl-10"
                    placeholder="client@example.com"
                    autoComplete="email"
                  />
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
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
                <div className="relative">
                  <input
                    {...register('client_phone')}
                    type="tel"
                    className="premium-input w-full pl-10"
                    placeholder="(555) 123-4567"
                    autoComplete="tel"
                  />
                  <PhoneIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                </div>
                {errors.client_phone && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.client_phone.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Service and Barber Selection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Service Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <ScissorsIcon className="h-5 w-5 text-teal-600" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Service Selection</h4>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {services.map((service) => (
                  <label
                    key={service.id}
                    className={`
                      relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                      ${watchedServiceId === service.id
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                          <div className="flex items-center space-x-2 mt-2">
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {service.category}
                            </span>
                            {service.popular && (
                              <span className="text-xs bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300 px-2 py-1 rounded">
                                Popular
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900 dark:text-white">${service.price}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{service.duration} min</div>
                        </div>
                      </div>
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
              <div className="flex items-center space-x-2 mb-3">
                <UserIcon className="h-5 w-5 text-teal-600" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Select Barber</h4>
              </div>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {barbers.map((barber) => (
                  <label
                    key={barber.id}
                    className={`
                      relative flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
                      ${watchedBarberId === barber.id
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
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
                          <div className="flex items-center space-x-2">
                            <h5 className="font-semibold text-gray-900 dark:text-white">{barber.name}</h5>
                            <div className={`w-2 h-2 rounded-full ${
                              barber.status === 'online' ? 'bg-green-500' :
                              barber.status === 'busy' ? 'bg-yellow-500' : 'bg-gray-400'
                            }`}></div>
                          </div>
                          {barber.rating && (
                            <div className="flex items-center mt-1">
                              <div className="flex items-center">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < Math.floor(barber.rating!) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                                    }`}
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                ))}
                                <span className="ml-1 text-sm text-gray-600 dark:text-gray-300">{barber.rating}</span>
                              </div>
                            </div>
                          )}
                          {barber.specialties && barber.specialties.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {barber.specialties.slice(0, 3).map((specialty) => (
                                <span
                                  key={specialty}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                >
                                  {specialty}
                                </span>
                              ))}
                              {barber.specialties.length > 3 && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">+{barber.specialties.length - 3} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    {watchedBarberId === barber.id && (
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
          </div>

          {/* Date and Time Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-3">
              <CalendarDaysIcon className="h-5 w-5 text-teal-600" />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Date & Time</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  {...register('appointment_date')}
                  type="date"
                  className="premium-input w-full"
                  min={new Date().toISOString().split('T')[0]}
                />
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
                <select
                  {...register('appointment_time')}
                  className="premium-input w-full"
                >
                  <option value="">Select a time</option>
                  {availableTimeSlots.map((time) => (
                    <option key={time} value={time}>
                      {time}
                    </option>
                  ))}
                </select>
                {errors.appointment_time && (
                  <p className="mt-1 text-sm text-red-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    {errors.appointment_time.message}
                  </p>
                )}
                {availableTimeSlots.length === 0 && watchedDate && watchedBarberId && (
                  <p className="mt-1 text-sm text-amber-600 flex items-center">
                    <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                    No available time slots for selected date and barber
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
              <h5 className="font-semibold text-teal-900 dark:text-teal-300 mb-2">Appointment Summary</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-teal-700 dark:text-teal-400">Service:</span>
                  <span className="font-medium text-teal-900 dark:text-teal-300">{selectedService.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-700 dark:text-teal-400">Duration:</span>
                  <span className="font-medium text-teal-900 dark:text-teal-300">{selectedService.duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-teal-700 dark:text-teal-400">Price:</span>
                  <span className="font-medium text-teal-900 dark:text-teal-300">${selectedService.price}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 mr-2" />
                <span className="text-red-800 dark:text-red-300 font-medium">Error</span>
              </div>
              <p className="text-red-700 dark:text-red-400 mt-1">{error}</p>
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
      )}
    </BaseModal>
  )
}