'use client'

import { useState } from 'react'
import BaseModal from './BaseModal'
import {
  ExclamationTriangleIcon,
  TrashIcon,
  CalendarDaysIcon,
  UserIcon,
  ClockIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline'
import { appointmentsService } from '../../lib/api/appointments'

interface AppointmentInfo {
  id: string
  client: string
  clientEmail?: string
  service: string
  date: string
  time: string
  barber: string
}

interface DeleteAppointmentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
  appointment: AppointmentInfo | null
  isLoading?: boolean
  sendNotification?: boolean
}

const cancellationReasons = [
  'Client requested cancellation',
  'Barber unavailable',
  'Client no-show',
  'Emergency scheduling conflict',
  'Equipment/facility issue',
  'Weather/safety concerns',
  'Other'
]

export default function DeleteAppointmentModal({
  isOpen,
  onClose,
  onConfirm,
  appointment,
  isLoading = false,
  sendNotification = true
}: DeleteAppointmentModalProps) {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [notifyClient, setNotifyClient] = useState(sendNotification)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    const finalReason = reason === 'Other' ? customReason : reason
    
    setIsDeleting(true)
    try {
      if (appointment) {
        await appointmentsService.cancelAppointment(
          parseInt(appointment.id),
          finalReason,
          notifyClient
        )
      }
      onConfirm(finalReason)
    } catch (error) {
      console.error('Error cancelling appointment:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleClose = () => {
    setReason('')
    setCustomReason('')
    setNotifyClient(sendNotification)
    onClose()
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

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      showCloseButton={false}
      closeOnOverlayClick={!isDeleting}
    >
      <div className="text-center">
        {/* Warning Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900 mb-4">
          <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Cancel Appointment
        </h3>

        {/* Warning Message */}
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Are you sure you want to cancel this appointment? This action cannot be undone.
        </p>

        {/* Appointment Details */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-6 text-left">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
            <CalendarDaysIcon className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-2" />
            Appointment Details
          </h4>
          
          <div className="space-y-2 text-sm">
            <div className="flex items-center">
              <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
              <span className="text-gray-700 dark:text-gray-300">Client:</span>
              <span className="font-medium text-gray-900 dark:text-white ml-1">{appointment.client}</span>
            </div>
            
            <div className="flex items-center">
              <TrashIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
              <span className="text-gray-700 dark:text-gray-300">Service:</span>
              <span className="font-medium text-gray-900 dark:text-white ml-1">{appointment.service}</span>
            </div>
            
            <div className="flex items-center">
              <CalendarDaysIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
              <span className="text-gray-700 dark:text-gray-300">Date:</span>
              <span className="font-medium text-gray-900 dark:text-white ml-1">{formatDate(appointment.date)}</span>
            </div>
            
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
              <span className="text-gray-700 dark:text-gray-300">Time:</span>
              <span className="font-medium text-gray-900 dark:text-white ml-1">{formatTime(appointment.time)}</span>
            </div>
            
            <div className="flex items-center">
              <UserIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
              <span className="text-gray-700 dark:text-gray-300">Barber:</span>
              <span className="font-medium text-gray-900 dark:text-white ml-1">{appointment.barber}</span>
            </div>
          </div>
        </div>

        {/* Cancellation Reason */}
        <div className="mb-6 text-left">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Reason for Cancellation *
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="premium-input w-full mb-3"
            required
          >
            <option value="">Select a reason...</option>
            {cancellationReasons.map((reasonOption) => (
              <option key={reasonOption} value={reasonOption}>
                {reasonOption}
              </option>
            ))}
          </select>

          {reason === 'Other' && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Please specify the reason..."
              className="premium-input w-full resize-none"
              rows={3}
              required
            />
          )}
        </div>

        {/* Client Notification Option */}
        {appointment.clientEmail && (
          <div className="mb-6 text-left">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifyClient}
                onChange={(e) => setNotifyClient(e.target.checked)}
                className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                Send cancellation email to client
              </span>
              <EnvelopeIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 ml-1" />
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
              Client will receive an email notification about the cancellation
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-center space-x-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="premium-button-secondary text-sm"
          >
            Keep Appointment
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting || !reason || (reason === 'Other' && !customReason.trim())}
            className="
              bg-red-600 hover:bg-red-700 text-white
              font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl
              transform hover:-translate-y-0.5 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              text-sm
            "
          >
            {isDeleting ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Cancelling...
              </div>
            ) : (
              <>
                <TrashIcon className="h-4 w-4 mr-2 inline" />
                Cancel Appointment
              </>
            )}
          </button>
        </div>

        {/* Warning Note */}
        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
            This action will permanently cancel the appointment and cannot be undone. 
            {notifyClient && appointment.clientEmail && ' The client will be notified via email.'}
          </p>
        </div>
      </div>
    </BaseModal>
  )
}