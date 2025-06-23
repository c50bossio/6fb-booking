'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import BaseModal from './BaseModal'
import ConfirmationModal from './ConfirmationModal'
import {
  UserIcon,
  CalendarDaysIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  StarIcon,
  ScissorsIcon,
  BanknotesIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline'
import { appointmentsService } from '../../lib/api/appointments'
import { barbersService } from '../../lib/api/barbers'
import { servicesService } from '../../lib/api/services'

interface CalendarAppointment {
  id: string
  title: string
  client: string
  clientEmail?: string
  clientPhone?: string
  barber: string
  barberId: number
  startTime: string
  endTime: string
  service: string
  serviceId?: number
  price: number
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  date: string
  notes?: string
  confirmationNumber?: string
  serviceRevenue?: number
  tipAmount?: number
  productRevenue?: number
}

// Edit form validation schema
const editAppointmentSchema = z.object({
  client_name: z.string().min(2, 'Client name must be at least 2 characters'),
  client_email: z.string().email('Please enter a valid email address').optional().or(z.literal('')),
  client_phone: z.string().optional(),
  appointment_date: z.string().min(1, 'Please select a date'),
  appointment_time: z.string().min(1, 'Please select a time'),
  notes: z.string().optional(),
  status: z.enum(['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show']),
  service_id: z.number().optional(),
  barber_id: z.number().optional(),
  service_revenue: z.number().optional(),
  tip_amount: z.number().optional(),
  product_revenue: z.number().optional()
})

type EditAppointmentFormData = z.infer<typeof editAppointmentSchema>

interface EditAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: CalendarAppointment | null
  onUpdate?: (appointment: CalendarAppointment) => void
  onDelete?: (appointmentId: string) => void
  onReschedule?: (appointmentId: string, newDate: string, newTime: string) => void
  onComplete?: (appointmentId: string) => void
  onCancel?: (appointmentId: string) => void
}

interface ServiceOption {
  id: number
  name: string
  description?: string
  category: string
  duration: number
  price: number
}

interface BarberOption {
  id: number
  name: string
  rating?: number
  specialties?: string[]
}

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
]

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled', color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'confirmed', label: 'Confirmed', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { value: 'in_progress', label: 'In Progress', color: 'text-amber-600', bg: 'bg-amber-100' },
  { value: 'completed', label: 'Completed', color: 'text-green-600', bg: 'bg-green-100' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' },
  { value: 'no_show', label: 'No Show', color: 'text-gray-600', bg: 'bg-gray-100' }
]

export default function EditAppointmentModal({
  isOpen,
  onClose,
  appointment,
  onUpdate,
  onDelete,
  onReschedule,
  onComplete,
  onCancel
}: EditAppointmentModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [services, setServices] = useState<ServiceOption[]>([])
  const [barbers, setBarbers] = useState<BarberOption[]>([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm<EditAppointmentFormData>({
    resolver: zodResolver(editAppointmentSchema)
  })

  const watchedStatus = watch('status')
  const watchedServiceId = watch('service_id')

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen && isEditing) {
      loadEditingData()
    }
  }, [isOpen, isEditing])

  // Reset form when appointment changes
  useEffect(() => {
    if (appointment && isOpen) {
      reset({
        client_name: appointment.client,
        client_email: appointment.clientEmail || '',
        client_phone: appointment.clientPhone || '',
        appointment_date: appointment.date,
        appointment_time: appointment.startTime,
        notes: appointment.notes || '',
        status: appointment.status,
        service_id: appointment.serviceId || 0,
        barber_id: appointment.barberId || 0,
        service_revenue: appointment.serviceRevenue || appointment.price || 0,
        tip_amount: appointment.tipAmount || 0,
        product_revenue: appointment.productRevenue || 0
      })
      setIsEditing(false)
      setError(null)
    }
  }, [appointment, isOpen, reset])

  const loadEditingData = async () => {
    setLoadingData(true)
    try {
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
        price: service.price || 0
      })) : []

      const barberOptions: BarberOption[] = Array.isArray(barbersData) ? barbersData.map(barber => ({
        id: barber.id,
        name: `${barber.first_name} ${barber.last_name}`,
        rating: barber.rating,
        specialties: barber.specialties || []
      })) : []

      setServices(serviceOptions)
      setBarbers(barberOptions)
    } catch (err) {
      console.error('Error loading editing data:', err)
      setError('Failed to load services and barbers')
    } finally {
      setLoadingData(false)
    }
  }

  const onSubmit = async (data: EditAppointmentFormData) => {
    if (!appointment) return

    setIsLoading(true)
    setError(null)
    
    try {
      const updateData = {
        appointment_date: data.appointment_date,
        appointment_time: data.appointment_time,
        status: data.status,
        client_name: data.client_name,
        client_email: data.client_email,
        client_phone: data.client_phone,
        notes: data.notes,
        service_id: data.service_id,
        barber_id: data.barber_id,
        service_revenue: data.service_revenue,
        tip_amount: data.tip_amount,
        product_revenue: data.product_revenue
      }

      await appointmentsService.updateAppointment(parseInt(appointment.id), updateData)

      // Calculate end time based on start time and duration (assuming 60 min default)
      const endTime = calculateEndTime(data.appointment_time, 60)

      const updatedAppointment: CalendarAppointment = {
        ...appointment,
        client: data.client_name,
        clientEmail: data.client_email,
        clientPhone: data.client_phone,
        date: data.appointment_date,
        startTime: data.appointment_time,
        endTime: endTime,
        notes: data.notes,
        status: data.status,
        serviceRevenue: data.service_revenue,
        tipAmount: data.tip_amount,
        productRevenue: data.product_revenue
      }

      onUpdate?.(updatedAppointment)
      setIsEditing(false)
    } catch (error: any) {
      console.error('Failed to update appointment:', error)
      setError(error.response?.data?.detail || 'Failed to update appointment. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)
    const endDate = new Date(startDate.getTime() + duration * 60000)
    return endDate.toTimeString().slice(0, 5)
  }

  const handleDelete = async () => {
    if (!appointment) return
    setIsLoading(true)
    try {
      await appointmentsService.cancelAppointment(parseInt(appointment.id))
      onDelete?.(appointment.id)
      setShowDeleteConfirm(false)
      onClose()
    } catch (error: any) {
      console.error('Failed to delete appointment:', error)
      setError(error.response?.data?.detail || 'Failed to delete appointment')
    } finally {
      setIsLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!appointment) return
    setIsLoading(true)
    try {
      const updatedAppointment = { ...appointment, status: 'completed' as const }
      onComplete?.(appointment.id)
      onUpdate?.(updatedAppointment)
      setShowCompleteConfirm(false)
    } catch (error: any) {
      console.error('Failed to complete appointment:', error)
      setError(error.response?.data?.detail || 'Failed to complete appointment')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!appointment) return
    setIsLoading(true)
    try {
      onCancel?.(appointment.id)
      setShowCancelConfirm(false)
      onClose()
    } catch (error: any) {
      console.error('Failed to cancel appointment:', error)
      setError(error.response?.data?.detail || 'Failed to cancel appointment')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusInfo = (status: string) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0]
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const time = new Date()
    time.setHours(parseInt(hours), parseInt(minutes))
    return time.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  if (!appointment) return null

  const statusInfo = getStatusInfo(appointment.status)
  const selectedService = services.find(s => s.id === watchedServiceId)

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Edit Appointment' : 'Appointment Details'}
        size="2xl"
      >
        {!isEditing ? (
          // View Mode
          <div className="space-y-6">
            {/* Header with Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                {appointment.confirmationNumber && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    #{appointment.confirmationNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {appointment.status === 'confirmed' && (
                  <button
                    onClick={() => setShowCompleteConfirm(true)}
                    className="p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                    title="Mark as completed"
                  >
                    <CheckCircleIcon className="h-5 w-5" />
                  </button>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                  title="Edit appointment"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Cancel appointment"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Service Information */}
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <ScissorsIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Service Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Service</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{appointment.service}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Price</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">${appointment.price}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Duration</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">Barber</p>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{appointment.barber}</p>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Date</h4>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{formatDate(appointment.date)}</p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ClockIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Time</h4>
                </div>
                <p className="text-gray-700 dark:text-gray-300">
                  {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                </p>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <UserIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Client Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="font-medium text-gray-900 dark:text-white">{appointment.client}</p>
                </div>
                {appointment.clientEmail && (
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <a
                      href={`mailto:${appointment.clientEmail}`}
                      className="text-teal-600 hover:text-teal-700 underline"
                    >
                      {appointment.clientEmail}
                    </a>
                  </div>
                )}
                {appointment.clientPhone && (
                  <div className="flex items-center space-x-2">
                    <PhoneIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <a
                      href={`tel:${appointment.clientPhone}`}
                      className="text-teal-600 hover:text-teal-700 underline"
                    >
                      {appointment.clientPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Revenue Information */}
            {(appointment.serviceRevenue || appointment.tipAmount || appointment.productRevenue) && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <BanknotesIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">Revenue Breakdown</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">Service Revenue</p>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">${appointment.serviceRevenue || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">Tip Amount</p>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">${appointment.tipAmount || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">Product Revenue</p>
                    <p className="font-semibold text-emerald-900 dark:text-emerald-100">${appointment.productRevenue || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            {appointment.notes && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <DocumentTextIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <h4 className="font-semibold text-gray-900 dark:text-white">Notes</h4>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{appointment.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="premium-button-secondary text-sm"
              >
                Close
              </button>
              {appointment.status === 'scheduled' || appointment.status === 'confirmed' ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="premium-button text-sm"
                >
                  Edit Appointment
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          // Edit Mode
          <div>
            {loadingData ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600 mr-3"></div>
                <span className="text-gray-600 dark:text-gray-300">Loading editing options...</span>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Client Information */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <UserIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Client Information</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        {...register('client_name')}
                        type="text"
                        className="premium-input w-full"
                        placeholder="Enter client name"
                      />
                      {errors.client_name && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.client_name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Email Address
                      </label>
                      <input
                        {...register('client_email')}
                        type="email"
                        className="premium-input w-full"
                        placeholder="client@example.com"
                      />
                      {errors.client_email && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
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

                {/* Date and Time */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <CalendarDaysIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
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
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
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
                        {timeSlots.map((time) => (
                          <option key={time} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                      {errors.appointment_time && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                          {errors.appointment_time.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    {...register('status')}
                    className="premium-input w-full"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Revenue Information */}
                {watchedStatus === 'completed' && (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <BanknotesIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Revenue Information</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Service Revenue
                        </label>
                        <input
                          {...register('service_revenue', { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          className="premium-input w-full"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Tip Amount
                        </label>
                        <input
                          {...register('tip_amount', { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          className="premium-input w-full"
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Product Revenue
                        </label>
                        <input
                          {...register('product_revenue', { valueAsNumber: true })}
                          type="number"
                          step="0.01"
                          className="premium-input w-full"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    className="premium-input w-full resize-none"
                    placeholder="Any special requests or notes..."
                  />
                </div>

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
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="premium-button-secondary text-sm"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !isDirty}
                    className="premium-button text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating...
                      </div>
                    ) : (
                      'Update Appointment'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </BaseModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This action cannot be undone and the client will be notified."
        confirmText="Cancel Appointment"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        icon={<TrashIcon className="h-6 w-6 text-red-600" />}
        isLoading={isLoading}
      />

      {/* Complete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCompleteConfirm}
        onClose={() => setShowCompleteConfirm(false)}
        onConfirm={handleComplete}
        title="Mark as Completed"
        message="Mark this appointment as completed? You'll be able to add revenue information afterward."
        confirmText="Mark Completed"
        confirmButtonClass="bg-green-600 hover:bg-green-700 text-white"
        icon={<CheckCircleIcon className="h-6 w-6 text-green-600" />}
        isLoading={isLoading}
      />

      {/* Cancel Confirmation Modal */}
      <ConfirmationModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleCancel}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? The client will be notified of the cancellation."
        confirmText="Cancel Appointment"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        icon={<TrashIcon className="h-6 w-6 text-red-600" />}
        isLoading={isLoading}
      />
    </>
  )
}