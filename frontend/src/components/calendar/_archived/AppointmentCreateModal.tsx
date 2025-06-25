'use client'

import React, { useState, useEffect } from 'react'
import {
  XMarkIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  ScissorsIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  EnvelopeIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'

export interface AppointmentFormData {
  clientName: string
  clientEmail: string
  clientPhone: string
  barberId: number
  serviceId: number
  date: string
  startTime: string
  duration: number
  price: number
  notes?: string
}

export interface Service {
  id: number
  name: string
  duration: number
  price: number
  description?: string
}

export interface Barber {
  id: number
  name: string
  specialties?: string[]
  rating?: number
}

interface AppointmentCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: AppointmentFormData) => Promise<void>
  initialDate?: string
  initialTime?: string
  barbers: Barber[]
  services: Service[]
  isLoading?: boolean
}

// Default services for demonstration
const defaultServices: Service[] = [
  { id: 1, name: 'Classic Haircut', duration: 45, price: 35, description: 'Traditional scissors cut with styling' },
  { id: 2, name: 'Fade Cut', duration: 60, price: 45, description: 'Modern fade with blend styling' },
  { id: 3, name: 'Beard Trim', duration: 30, price: 25, description: 'Professional beard shaping and styling' },
  { id: 4, name: 'Premium Cut & Beard', duration: 75, price: 65, description: 'Complete grooming experience' },
  { id: 5, name: 'Kids Cut', duration: 30, price: 20, description: 'Haircut for children under 12' },
  { id: 6, name: 'Buzz Cut', duration: 20, price: 18, description: 'Quick all-over clipper cut' },
  { id: 7, name: 'Wedding/Event Special', duration: 90, price: 85, description: 'Special occasion styling' }
]

// Default barbers for demonstration
const defaultBarbers: Barber[] = [
  { id: 1, name: 'Marcus Johnson', specialties: ['Fades', 'Beard Styling'], rating: 4.9 },
  { id: 2, name: 'Sarah Mitchell', specialties: ['Classic Cuts', 'Kids Cuts'], rating: 4.8 },
  { id: 3, name: 'David Rodriguez', specialties: ['Modern Styles', 'Color'], rating: 4.7 }
]

export default function AppointmentCreateModal({
  isOpen,
  onClose,
  onSubmit,
  initialDate = '',
  initialTime = '09:00',
  barbers = defaultBarbers,
  services = defaultServices,
  isLoading = false
}: AppointmentCreateModalProps) {
  const [formData, setFormData] = useState<AppointmentFormData>({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    barberId: barbers[0]?.id || 1,
    serviceId: services[0]?.id || 1,
    date: initialDate,
    startTime: initialTime,
    duration: services[0]?.duration || 45,
    price: services[0]?.price || 35,
    notes: ''
  })

  const [errors, setErrors] = useState<Partial<AppointmentFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update form data when modal opens with new initial values
  useEffect(() => {
    if (isOpen) {
      setFormData(prev => ({
        ...prev,
        date: initialDate,
        startTime: initialTime
      }))
      setErrors({})
    }
  }, [isOpen, initialDate, initialTime])

  // Update duration and price when service changes
  useEffect(() => {
    const selectedService = services.find(s => s.id === formData.serviceId)
    if (selectedService) {
      setFormData(prev => ({
        ...prev,
        duration: selectedService.duration,
        price: selectedService.price
      }))
    }
  }, [formData.serviceId, services])

  const validateForm = (): boolean => {
    const newErrors: Partial<AppointmentFormData> = {}

    // Client name validation
    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required'
    }

    // Email validation
    if (!formData.clientEmail.trim()) {
      newErrors.clientEmail = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address'
    }

    // Phone validation (optional but format check if provided)
    if (formData.clientPhone.trim() && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(formData.clientPhone.replace(/\s/g, ''))) {
      newErrors.clientPhone = 'Please enter a valid phone number'
    }

    // Date validation
    if (!formData.date) {
      newErrors.date = 'Date is required'
    } else {
      const selectedDate = new Date(formData.date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (selectedDate < today) {
        newErrors.date = 'Please select a future date'
      }
    }

    // Time validation
    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    try {
      await onSubmit(formData)

      // Reset form on successful submission
      setFormData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        barberId: barbers[0]?.id || 1,
        serviceId: services[0]?.id || 1,
        date: '',
        startTime: '09:00',
        duration: services[0]?.duration || 45,
        price: services[0]?.price || 35,
        notes: ''
      })

      onClose()
    } catch (error) {
      console.error('Error creating appointment:', error)
      // You could set a general error state here
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: keyof AppointmentFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const selectedService = services.find(s => s.id === formData.serviceId)
  const selectedBarber = barbers.find(b => b.id === formData.barberId)

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)

    const endDate = new Date(startDate.getTime() + duration * 60000)
    return endDate.toTimeString().slice(0, 5)
  }

  const endTime = calculateEndTime(formData.startTime, formData.duration)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-700 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white">Create New Appointment</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Client Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-violet-400" />
              Client Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => handleInputChange('clientName', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                    errors.clientName ? 'border-red-500' : 'border-gray-600'
                  }`}
                  placeholder="Enter client's full name"
                />
                {errors.clientName && (
                  <p className="text-red-400 text-sm mt-1">{errors.clientName}</p>
                )}
              </div>

              {/* Client Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={formData.clientEmail}
                    onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                    className={`w-full px-3 py-2 pl-10 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                      errors.clientEmail ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="client@example.com"
                  />
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                {errors.clientEmail && (
                  <p className="text-red-400 text-sm mt-1">{errors.clientEmail}</p>
                )}
              </div>

              {/* Client Phone */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.clientPhone}
                    onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                    className={`w-full px-3 py-2 pl-10 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                      errors.clientPhone ? 'border-red-500' : 'border-gray-600'
                    }`}
                    placeholder="+1 (555) 123-4567"
                  />
                  <PhoneIcon className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                {errors.clientPhone && (
                  <p className="text-red-400 text-sm mt-1">{errors.clientPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Appointment Details */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <ScissorsIcon className="h-5 w-5 mr-2 text-violet-400" />
              Appointment Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Barber Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Barber
                </label>
                <select
                  value={formData.barberId}
                  onChange={(e) => handleInputChange('barberId', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                >
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name} {barber.rating && `(${barber.rating}★)`}
                    </option>
                  ))}
                </select>
                {selectedBarber?.specialties && (
                  <p className="text-xs text-gray-400 mt-1">
                    Specialties: {selectedBarber.specialties.join(', ')}
                  </p>
                )}
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Service
                </label>
                <select
                  value={formData.serviceId}
                  onChange={(e) => handleInputChange('serviceId', Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} - ${service.price} ({service.duration}min)
                    </option>
                  ))}
                </select>
                {selectedService?.description && (
                  <p className="text-xs text-gray-400 mt-1">{selectedService.description}</p>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                    errors.date ? 'border-red-500' : 'border-gray-600'
                  }`}
                />
                {errors.date && (
                  <p className="text-red-400 text-sm mt-1">{errors.date}</p>
                )}
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                    errors.startTime ? 'border-red-500' : 'border-gray-600'
                  }`}
                />
                {errors.startTime && (
                  <p className="text-red-400 text-sm mt-1">{errors.startTime}</p>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-800 rounded-lg p-4">
            <h4 className="text-md font-semibold text-white mb-3">Appointment Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <ClockIcon className="h-4 w-4 text-violet-400" />
                <span className="text-gray-300">Duration:</span>
                <span className="text-white font-medium">{formData.duration} minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <CurrencyDollarIcon className="h-4 w-4 text-emerald-400" />
                <span className="text-gray-300">Total:</span>
                <span className="text-white font-semibold">${formData.price}</span>
              </div>
              <div className="flex items-center space-x-2 col-span-2">
                <ClockIcon className="h-4 w-4 text-violet-400" />
                <span className="text-gray-300">Time slot:</span>
                <span className="text-white font-medium">{formData.startTime} - {endTime}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center">
              <DocumentTextIcon className="h-4 w-4 mr-2 text-violet-400" />
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors resize-none"
              placeholder="Add any special instructions or notes for the barber..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isSubmitting ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
