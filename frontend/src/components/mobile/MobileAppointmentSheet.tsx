'use client'

/**
 * Mobile Appointment Sheet Component
 *
 * A mobile-optimized appointment details and actions sheet
 * with native gestures and platform-specific UI patterns.
 */

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import MobileBottomSheet, { MobileBottomSheetPresets } from './MobileBottomSheet'
import { CalendarAppointment, Barber, Service } from '../calendar/RobustCalendar'
import { useTheme } from '@/contexts/ThemeContext'
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  ShareIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline'

interface MobileAppointmentSheetProps {
  isOpen: boolean
  onClose: () => void
  appointment: CalendarAppointment | null
  barbers?: Barber[]
  services?: Service[]

  // Actions
  onEdit?: (appointment: CalendarAppointment) => void
  onDelete?: (appointmentId: string) => void
  onReschedule?: (appointment: CalendarAppointment) => void
  onCall?: (phoneNumber: string) => void
  onEmail?: (email: string) => void
  onDirections?: (address: string) => void
  onShare?: (appointment: CalendarAppointment) => void

  // Features
  enableHapticFeedback?: boolean
  showPaymentStatus?: boolean
  showClientHistory?: boolean
}

const STATUS_CONFIG = {
  confirmed: {
    icon: CheckCircleIcon,
    color: '#10b981',
    bgColor: '#10b98120',
    label: 'Confirmed'
  },
  pending: {
    icon: ExclamationCircleIcon,
    color: '#f59e0b',
    bgColor: '#f59e0b20',
    label: 'Pending'
  },
  completed: {
    icon: CheckCircleIcon,
    color: '#3b82f6',
    bgColor: '#3b82f620',
    label: 'Completed'
  },
  cancelled: {
    icon: XCircleIcon,
    color: '#ef4444',
    bgColor: '#ef444420',
    label: 'Cancelled'
  },
  no_show: {
    icon: XCircleIcon,
    color: '#6b7280',
    bgColor: '#6b728020',
    label: 'No Show'
  }
}

export function MobileAppointmentSheet({
  isOpen,
  onClose,
  appointment,
  barbers = [],
  services = [],
  onEdit,
  onDelete,
  onReschedule,
  onCall,
  onEmail,
  onDirections,
  onShare,
  enableHapticFeedback = true,
  showPaymentStatus = true,
  showClientHistory = false
}: MobileAppointmentSheetProps) {

  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!appointment) return null

  const statusConfig = STATUS_CONFIG[appointment.status]
  const StatusIcon = statusConfig.icon
  const barber = barbers.find(b => b.id === appointment.barberId)
  const service = services.find(s => s.id === appointment.serviceId)

  const handleAction = (action: () => void) => {
    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10)
    }
    action()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatTime = (startTime: string, endTime: string) => {
    return `${startTime} - ${endTime}`
  }

  return (
    <MobileBottomSheet
      {...MobileBottomSheetPresets.appointment}
      isOpen={isOpen}
      onClose={onClose}
      enableHapticFeedback={enableHapticFeedback}
    >
      <div className="px-4 py-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between mb-4">
          <div
            className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: statusConfig.bgColor,
              color: statusConfig.color
            }}
          >
            <StatusIcon className="h-4 w-4" />
            <span className="text-sm font-medium">{statusConfig.label}</span>
          </div>

          {showPaymentStatus && appointment.paymentStatus && (
            <div className={`text-sm font-medium px-3 py-1.5 rounded-full ${
              appointment.paymentStatus === 'paid'
                ? 'bg-green-100 text-green-700'
                : appointment.paymentStatus === 'unpaid'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-yellow-100 text-yellow-700'
            }`}>
              {appointment.paymentStatus.charAt(0).toUpperCase() + appointment.paymentStatus.slice(1)}
            </div>
          )}
        </div>

        {/* Service and Price */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-1" style={{ color: colors.textPrimary }}>
            {appointment.service}
          </h2>
          <div className="flex items-center space-x-4">
            <span className="text-3xl font-bold" style={{ color: theme === 'soft-light' ? '#7c9885' : '#8b5cf6' }}>
              ${appointment.price}
            </span>
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              {appointment.duration} minutes
            </span>
          </div>
        </div>

        {/* Details Section */}
        <div className="space-y-4 mb-6">
          {/* Date & Time */}
          <div className="flex items-start space-x-3">
            <CalendarDaysIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: colors.textSecondary }} />
            <div>
              <div className="font-medium" style={{ color: colors.textPrimary }}>
                {formatDate(appointment.date)}
              </div>
              <div className="text-sm" style={{ color: colors.textSecondary }}>
                {formatTime(appointment.startTime, appointment.endTime)}
              </div>
            </div>
          </div>

          {/* Client */}
          <div className="flex items-start space-x-3">
            <UserIcon className="h-5 w-5 mt-0.5 flex-shrink-0" style={{ color: colors.textSecondary }} />
            <div className="flex-1">
              <div className="font-medium" style={{ color: colors.textPrimary }}>
                {appointment.client}
              </div>
              <div className="space-y-1 mt-1">
                {appointment.clientPhone && (
                  <button
                    onClick={() => handleAction(() => onCall?.(appointment.clientPhone!))}
                    className="flex items-center space-x-2 text-sm touch-target"
                    style={{ color: theme === 'soft-light' ? '#7c9885' : '#8b5cf6' }}
                  >
                    <PhoneIcon className="h-4 w-4" />
                    <span>{appointment.clientPhone}</span>
                  </button>
                )}
                {appointment.clientEmail && (
                  <button
                    onClick={() => handleAction(() => onEmail?.(appointment.clientEmail!))}
                    className="flex items-center space-x-2 text-sm touch-target"
                    style={{ color: theme === 'soft-light' ? '#7c9885' : '#8b5cf6' }}
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    <span>{appointment.clientEmail}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Barber */}
          {barber && (
            <div className="flex items-start space-x-3">
              <div
                className="h-5 w-5 rounded-full mt-0.5 flex-shrink-0"
                style={{ backgroundColor: barber.color || '#8b5cf6' }}
              />
              <div>
                <div className="font-medium" style={{ color: colors.textPrimary }}>
                  {barber.name}
                </div>
                {barber.specialties && (
                  <div className="text-sm" style={{ color: colors.textSecondary }}>
                    {barber.specialties.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {appointment.notes && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: colors.background }}>
              <div className="text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
                Notes
              </div>
              <div className="text-sm" style={{ color: colors.textPrimary }}>
                {appointment.notes}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {onCall && appointment.clientPhone && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAction(() => onCall(appointment.clientPhone!))}
              className="flex items-center justify-center space-x-2 p-3 rounded-lg touch-target"
              style={{
                backgroundColor: colors.background,
                color: colors.textPrimary
              }}
            >
              <PhoneIcon className="h-5 w-5" />
              <span className="font-medium">Call</span>
            </motion.button>
          )}

          {onEmail && appointment.clientEmail && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAction(() => onEmail(appointment.clientEmail!))}
              className="flex items-center justify-center space-x-2 p-3 rounded-lg touch-target"
              style={{
                backgroundColor: colors.background,
                color: colors.textPrimary
              }}
            >
              <EnvelopeIcon className="h-5 w-5" />
              <span className="font-medium">Email</span>
            </motion.button>
          )}

          {onReschedule && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAction(() => onReschedule(appointment))}
              className="flex items-center justify-center space-x-2 p-3 rounded-lg touch-target"
              style={{
                backgroundColor: colors.background,
                color: colors.textPrimary
              }}
            >
              <ArrowPathIcon className="h-5 w-5" />
              <span className="font-medium">Reschedule</span>
            </motion.button>
          )}

          {onShare && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAction(() => onShare(appointment))}
              className="flex items-center justify-center space-x-2 p-3 rounded-lg touch-target"
              style={{
                backgroundColor: colors.background,
                color: colors.textPrimary
              }}
            >
              <ShareIcon className="h-5 w-5" />
              <span className="font-medium">Share</span>
            </motion.button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {onEdit && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAction(() => onEdit(appointment))}
              className="w-full flex items-center justify-between p-4 rounded-lg touch-target"
              style={{
                backgroundColor: colors.background,
                color: colors.textPrimary
              }}
            >
              <div className="flex items-center space-x-3">
                <PencilIcon className="h-5 w-5" />
                <span className="font-medium">Edit Appointment</span>
              </div>
              <ChevronRightIcon className="h-5 w-5" style={{ color: colors.textSecondary }} />
            </motion.button>
          )}

          {onDelete && (
            <>
              {!showDeleteConfirm ? (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center justify-between p-4 rounded-lg touch-target"
                  style={{
                    backgroundColor: '#ef444420',
                    color: '#ef4444'
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <TrashIcon className="h-5 w-5" />
                    <span className="font-medium">Delete Appointment</span>
                  </div>
                  <ChevronRightIcon className="h-5 w-5" />
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-lg border-2 border-red-500 bg-red-50 dark:bg-red-900/20"
                >
                  <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-3">
                    Are you sure you want to delete this appointment?
                  </p>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        handleAction(() => onDelete(appointment.id))
                        onClose()
                      }}
                      className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-medium touch-target"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      className="flex-1 py-2 px-4 rounded-lg font-medium touch-target"
                      style={{
                        backgroundColor: colors.background,
                        color: colors.textPrimary
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </div>
      </div>
    </MobileBottomSheet>
  )
}

export default MobileAppointmentSheet
