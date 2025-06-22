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
  StarIcon
} from '@heroicons/react/24/outline'

interface Appointment {
  id: string
  title: string
  client: string
  barber: string
  startTime: string
  endTime: string
  service: string
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
  date: string
  clientEmail?: string
  clientPhone?: string
  notes?: string
  confirmationNumber?: string
}

// Edit form validation schema
const editAppointmentSchema = z.object({
  client_name: z.string().min(2, 'Client name must be at least 2 characters'),
  client_email: z.string().email('Please enter a valid email address').optional(),
  client_phone: z.string().optional(),
  appointment_date: z.string().min(1, 'Please select a date'),
  appointment_time: z.string().min(1, 'Please select a time'),
  notes: z.string().optional(),
  status: z.enum(['confirmed', 'pending', 'completed', 'cancelled'])
})

type EditAppointmentFormData = z.infer<typeof editAppointmentSchema>

interface AppointmentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: Appointment | null
  onUpdate?: (appointment: Appointment) => void
  onDelete?: (appointmentId: string) => void
}

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30'
]

const statusOptions = [
  { value: 'confirmed', label: 'Confirmed', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { value: 'pending', label: 'Pending', color: 'text-amber-600', bg: 'bg-amber-100' },
  { value: 'completed', label: 'Completed', color: 'text-blue-600', bg: 'bg-blue-100' },
  { value: 'cancelled', label: 'Cancelled', color: 'text-red-600', bg: 'bg-red-100' }
]

export default function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointment,
  onUpdate,
  onDelete
}: AppointmentDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<EditAppointmentFormData>({
    resolver: zodResolver(editAppointmentSchema)
  })

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
        status: appointment.status
      })
      setIsEditing(false)
    }
  }, [appointment, isOpen, reset])

  const onSubmit = async (data: EditAppointmentFormData) => {
    if (!appointment) return

    setIsLoading(true)
    try {
      // Mock API call
      const updatedAppointment: Appointment = {
        ...appointment,
        client: data.client_name,
        clientEmail: data.client_email,
        clientPhone: data.client_phone,
        date: data.appointment_date,
        startTime: data.appointment_time,
        endTime: calculateEndTime(data.appointment_time, 60), // Assume 60 min default
        notes: data.notes,
        status: data.status
      }

      onUpdate?.(updatedAppointment)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to update appointment:', error)
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

  const handleDelete = () => {
    if (!appointment) return
    onDelete?.(appointment.id)
    setShowDeleteConfirm(false)
    onClose()
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

  if (!appointment) return null

  const statusInfo = getStatusInfo(appointment.status)

  return (
    <>
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={isEditing ? 'Edit Appointment' : 'Appointment Details'}
        size="xl"
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
                  <span className="text-sm text-gray-500">
                    #{appointment.confirmationNumber}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                  title="Edit appointment"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Cancel appointment"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Service Information */}
            <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <CurrencyDollarIcon className="h-5 w-5 text-violet-600" />
                <h3 className="text-lg font-semibold text-violet-900">Service Details</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-violet-700">Service</p>
                  <p className="font-semibold text-violet-900">{appointment.service}</p>
                </div>
                <div>
                  <p className="text-sm text-violet-700">Price</p>
                  <p className="font-semibold text-violet-900">${appointment.price}</p>
                </div>
                <div>
                  <p className="text-sm text-violet-700">Duration</p>
                  <p className="font-semibold text-violet-900">
                    {appointment.startTime} - {appointment.endTime}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-violet-700">Barber</p>
                  <p className="font-semibold text-violet-900">{appointment.barber}</p>
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-900">Date</h4>
                </div>
                <p className="text-gray-700">{formatDate(appointment.date)}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <ClockIcon className="h-5 w-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-900">Time</h4>
                </div>
                <p className="text-gray-700">
                  {appointment.startTime} - {appointment.endTime}
                </p>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center space-x-2 mb-4">
                <UserIcon className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Client Information</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium text-gray-900">{appointment.client}</p>
                </div>
                {appointment.clientEmail && (
                  <div className="flex items-center space-x-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-500" />
                    <a 
                      href={`mailto:${appointment.clientEmail}`}
                      className="text-violet-600 hover:text-violet-700 underline"
                    >
                      {appointment.clientEmail}
                    </a>
                  </div>
                )}
                {appointment.clientPhone && (
                  <div className="flex items-center space-x-2">
                    <PhoneIcon className="h-4 w-4 text-gray-500" />
                    <a 
                      href={`tel:${appointment.clientPhone}`}
                      className="text-violet-600 hover:text-violet-700 underline"
                    >
                      {appointment.clientPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {appointment.notes && (
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{appointment.notes}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="premium-button-secondary text-sm"
              >
                Close
              </button>
              {appointment.status === 'confirmed' && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="premium-button text-sm"
                >
                  Edit Appointment
                </button>
              )}
            </div>
          </div>
        ) : (
          // Edit Mode
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Client Information */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 mb-3">
                <UserIcon className="h-5 w-5 text-violet-600" />
                <h4 className="text-lg font-semibold text-gray-900">Client Information</h4>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    {...register('client_name')}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                <CalendarDaysIcon className="h-5 w-5 text-violet-600" />
                <h4 className="text-lg font-semibold text-gray-900">Date & Time</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <p className="mt-1 text-sm text-red-600 flex items-center">
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

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
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
      </BaseModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Cancel Appointment"
        message="Are you sure you want to cancel this appointment? This action cannot be undone."
        confirmText="Cancel Appointment"
        confirmButtonClass="bg-red-600 hover:bg-red-700 text-white"
        icon={<TrashIcon className="h-6 w-6 text-red-600" />}
      />
    </>
  )
}