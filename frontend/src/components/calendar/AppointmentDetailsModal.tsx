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
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import type { CalendarAppointment } from './PremiumCalendar'
import type { AppointmentFormData, Service, Barber } from './AppointmentCreateModal'

interface AppointmentDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  appointment: CalendarAppointment | null
  onUpdate?: (appointment: CalendarAppointment) => Promise<void>
  onDelete?: (appointmentId: string) => Promise<void>
  onStatusChange?: (appointmentId: string, status: CalendarAppointment['status']) => Promise<void>
  barbers?: Barber[]
  services?: Service[]
  isLoading?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

const statusOptions: Array<{ value: CalendarAppointment['status']; label: string; color: string }> = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-500' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-violet-600' },
  { value: 'completed', label: 'Completed', color: 'bg-emerald-600' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'no_show', label: 'No Show', color: 'bg-gray-500' }
]

export default function AppointmentDetailsModal({
  isOpen,
  onClose,
  appointment,
  onUpdate,
  onDelete,
  onStatusChange,
  barbers = [],
  services = [],
  isLoading = false,
  canEdit = true,
  canDelete = true
}: AppointmentDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editData, setEditData] = useState<Partial<AppointmentFormData>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && appointment) {
      setIsEditing(false)
      setShowDeleteConfirm(false)
      setEditData({
        clientName: appointment.client,
        clientEmail: appointment.clientEmail || '',
        clientPhone: appointment.clientPhone || '',
        barberId: appointment.barberId,
        serviceId: appointment.serviceId || 1,
        date: appointment.date,
        startTime: appointment.startTime,
        duration: appointment.duration,
        price: appointment.price,
        notes: appointment.notes || ''
      })
      setErrors({})
    }
  }, [isOpen, appointment])

  const getStatusBadge = (status: CalendarAppointment['status']) => {
    const statusInfo = statusOptions.find(s => s.value === status)
    return statusInfo ? {
      label: statusInfo.label,
      className: `${statusInfo.color} text-white px-3 py-1 rounded-full text-sm font-medium`
    } : { label: status, className: 'bg-gray-500 text-white px-3 py-1 rounded-full text-sm font-medium' }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setErrors({})
    // Reset edit data to original appointment data
    if (appointment) {
      setEditData({
        clientName: appointment.client,
        clientEmail: appointment.clientEmail || '',
        clientPhone: appointment.clientPhone || '',
        barberId: appointment.barberId,
        serviceId: appointment.serviceId || 1,
        date: appointment.date,
        startTime: appointment.startTime,
        duration: appointment.duration,
        price: appointment.price,
        notes: appointment.notes || ''
      })
    }
  }

  const validateEditForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!editData.clientName?.trim()) {
      newErrors.clientName = 'Client name is required'
    }

    if (!editData.clientEmail?.trim()) {
      newErrors.clientEmail = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.clientEmail)) {
      newErrors.clientEmail = 'Please enter a valid email address'
    }

    if (editData.clientPhone?.trim() && !/^[\+]?[\d\s\-\(\)]{10,}$/.test(editData.clientPhone.replace(/\s/g, ''))) {
      newErrors.clientPhone = 'Please enter a valid phone number'
    }

    if (!editData.date) {
      newErrors.date = 'Date is required'
    }

    if (!editData.startTime) {
      newErrors.startTime = 'Start time is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveEdit = async () => {
    if (!validateEditForm() || !appointment || !onUpdate) return

    setIsSubmitting(true)
    try {
      const selectedService = services.find(s => s.id === editData.serviceId)
      const selectedBarber = barbers.find(b => b.id === editData.barberId)

      const updatedAppointment: CalendarAppointment = {
        ...appointment,
        client: editData.clientName!,
        clientEmail: editData.clientEmail!,
        clientPhone: editData.clientPhone!,
        barberId: editData.barberId!,
        barber: selectedBarber?.name || appointment.barber,
        serviceId: editData.serviceId!,
        service: selectedService?.name || appointment.service,
        date: editData.date!,
        startTime: editData.startTime!,
        duration: editData.duration!,
        price: editData.price!,
        notes: editData.notes!,
        // Calculate end time
        endTime: calculateEndTime(editData.startTime!, editData.duration!)
      }

      await onUpdate(updatedAppointment)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating appointment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!appointment || !onDelete) return

    setIsSubmitting(true)
    try {
      await onDelete(appointment.id)
      setShowDeleteConfirm(false)
      onClose()
    } catch (error) {
      console.error('Error deleting appointment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: CalendarAppointment['status']) => {
    if (!appointment || !onStatusChange) return

    setIsSubmitting(true)
    try {
      await onStatusChange(appointment.id, newStatus)
    } catch (error) {
      console.error('Error updating appointment status:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startDate = new Date()
    startDate.setHours(hours, minutes, 0, 0)

    const endDate = new Date(startDate.getTime() + duration * 60000)
    return endDate.toTimeString().slice(0, 5)
  }

  const handleInputChange = (field: string, value: string | number) => {
    setEditData(prev => ({ ...prev, [field]: value }))

    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  // Update duration and price when service changes in edit mode
  useEffect(() => {
    if (isEditing && editData.serviceId) {
      const selectedService = services.find(s => s.id === editData.serviceId)
      if (selectedService) {
        setEditData(prev => ({
          ...prev,
          duration: selectedService.duration,
          price: selectedService.price
        }))
      }
    }
  }, [editData.serviceId, services, isEditing])

  if (!isOpen || !appointment) return null

  const statusBadge = getStatusBadge(appointment.status)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-700 rounded-lg">
              <CalendarDaysIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Appointment Details</h2>
              <div className="flex items-center space-x-2 mt-1">
                <span className={statusBadge.className}>{statusBadge.label}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {canEdit && !isEditing && (
              <button
                onClick={handleEdit}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <PencilIcon className="h-5 w-5" />
              </button>
            )}

            {canDelete && !isEditing && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Client Information */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-violet-400" />
              Client Information
            </h3>

            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Client Name *</label>
                  <input
                    type="text"
                    value={editData.clientName || ''}
                    onChange={(e) => handleInputChange('clientName', e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                      errors.clientName ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.clientName && <p className="text-red-400 text-sm mt-1">{errors.clientName}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                  <input
                    type="email"
                    value={editData.clientEmail || ''}
                    onChange={(e) => handleInputChange('clientEmail', e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                      errors.clientEmail ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.clientEmail && <p className="text-red-400 text-sm mt-1">{errors.clientEmail}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={editData.clientPhone || ''}
                    onChange={(e) => handleInputChange('clientPhone', e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                      errors.clientPhone ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.clientPhone && <p className="text-red-400 text-sm mt-1">{errors.clientPhone}</p>}
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <UserIcon className="h-5 w-5 text-gray-400" />
                  <span className="text-white font-medium">{appointment.client}</span>
                </div>

                {appointment.clientEmail && (
                  <div className="flex items-center space-x-3">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-300">{appointment.clientEmail}</span>
                  </div>
                )}

                {appointment.clientPhone && (
                  <div className="flex items-center space-x-3">
                    <PhoneIcon className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-300">{appointment.clientPhone}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Appointment Details */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <ScissorsIcon className="h-5 w-5 mr-2 text-violet-400" />
              Appointment Details
            </h3>

            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Barber</label>
                  <select
                    value={editData.barberId || ''}
                    onChange={(e) => handleInputChange('barberId', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                  >
                    {barbers.map((barber) => (
                      <option key={barber.id} value={barber.id}>
                        {barber.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Service</label>
                  <select
                    value={editData.serviceId || ''}
                    onChange={(e) => handleInputChange('serviceId', Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors"
                  >
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name} - ${service.price}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
                  <input
                    type="date"
                    value={editData.date || ''}
                    onChange={(e) => handleInputChange('date', e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                      errors.date ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.date && <p className="text-red-400 text-sm mt-1">{errors.date}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Start Time *</label>
                  <input
                    type="time"
                    value={editData.startTime || ''}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                    className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors ${
                      errors.startTime ? 'border-red-500' : 'border-gray-600'
                    }`}
                  />
                  {errors.startTime && <p className="text-red-400 text-sm mt-1">{errors.startTime}</p>}
                </div>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="text-gray-400 text-sm">Barber</span>
                      <div className="text-white font-medium">{appointment.barber}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <ScissorsIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="text-gray-400 text-sm">Service</span>
                      <div className="text-white font-medium">{appointment.service}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="text-gray-400 text-sm">Date</span>
                      <div className="text-white font-medium">
                        {new Date(appointment.date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <ClockIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="text-gray-400 text-sm">Time</span>
                      <div className="text-white font-medium">
                        {appointment.startTime} - {appointment.endTime} ({appointment.duration}min)
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 col-span-2">
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="text-gray-400 text-sm">Total</span>
                      <div className="text-white font-semibold text-lg">${appointment.price}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <DocumentTextIcon className="h-5 w-5 mr-2 text-violet-400" />
              Notes
            </h3>

            {isEditing ? (
              <textarea
                value={editData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition-colors resize-none"
                placeholder="Add any special instructions or notes..."
              />
            ) : (
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-300">
                  {appointment.notes || 'No notes added for this appointment.'}
                </p>
              </div>
            )}
          </div>

          {/* Status Management */}
          {!isEditing && onStatusChange && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Status Management</h3>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => handleStatusChange(status.value)}
                    disabled={appointment.status === status.value || isSubmitting}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      appointment.status === status.value
                        ? `${status.color} text-white cursor-default`
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-700">
          {isEditing ? (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center space-x-2"
              >
                <CheckIcon className="h-4 w-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-60">
          <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Delete Appointment</h3>
            </div>

            <p className="text-gray-300 mb-6">
              Are you sure you want to delete this appointment with {appointment.client}? This action cannot be undone.
            </p>

            <div className="flex space-x-4">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
