'use client'

import React, { useState } from 'react'
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon, BellIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'
import { useTheme } from '@/contexts/ThemeContext'

interface AppointmentMoveConfirmationProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (notifyCustomer: boolean, note?: string) => void
  appointment: {
    id: string
    client: string
    clientPhone?: string
    clientEmail?: string
    service: string
    barber: string
    originalDate: string
    originalTime: string
    newDate: string
    newTime: string
    duration: number
  }
  isLoading?: boolean
}

export default function AppointmentMoveConfirmation({
  isOpen,
  onClose,
  onConfirm,
  appointment,
  isLoading = false
}: AppointmentMoveConfirmationProps) {
  const [notifyCustomer, setNotifyCustomer] = useState(true)
  const [note, setNote] = useState('')
  const { theme } = useTheme()

  if (!isOpen) return null

  const formatDate = (dateStr: string) => {
    try {
      // Parse the date string as UTC to avoid timezone issues
      // Since the date is in YYYY-MM-DD format, we append 'T00:00:00' to make it a valid ISO string
      const date = new Date(dateStr + 'T00:00:00')

      // Use date-fns format which handles dates correctly
      return format(date, 'EEEE, MMMM d, yyyy')
    } catch (error) {
      console.error('❌ Date formatting error:', error, 'for input:', dateStr)
      return dateStr
    }
  }

  const formatTime = (time: string, duration: number) => {
    const [hours, minutes] = time.split(':').map(Number)
    const endHours = Math.floor((hours * 60 + minutes + duration) / 60)
    const endMinutes = (hours * 60 + minutes + duration) % 60

    const formatHour = (h: number) => {
      const hour12 = h % 12 || 12
      const ampm = h < 12 ? 'AM' : 'PM'
      return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`
    }

    return `${formatHour(hours)} - ${formatHour(endHours)}:${endMinutes.toString().padStart(2, '0')}`
  }

  const handleConfirm = () => {
    onConfirm(notifyCustomer, note.trim() || undefined)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative rounded-2xl shadow-2xl border max-w-md w-full p-6 transform transition-all"
          style={{
            backgroundColor: theme === 'light' || theme === 'soft-light' ? '#ffffff' : '#1f2937',
            borderColor: theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'
          }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold"
              style={{ color: theme === 'light' || theme === 'soft-light' ? '#111827' : '#ffffff' }}>
              Confirm Appointment Change
            </h3>
            <button
              onClick={onClose}
              className="transition-colors"
              style={{ color: theme === 'light' || theme === 'soft-light' ? '#6b7280' : '#9ca3af' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = theme === 'light' || theme === 'soft-light' ? '#111827' : '#ffffff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = theme === 'light' || theme === 'soft-light' ? '#6b7280' : '#9ca3af'
              }}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Client Info */}
            <div className="rounded-lg p-4 border"
              style={{
                backgroundColor: theme === 'light' || theme === 'soft-light' ? '#f9fafb' : 'rgba(17, 24, 39, 0.5)',
                borderColor: theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'
              }}>
              <div className="flex items-center space-x-2 mb-2">
                <UserIcon className="h-5 w-5 text-violet-400" />
                <span className="font-medium"
                  style={{ color: theme === 'light' || theme === 'soft-light' ? '#111827' : '#ffffff' }}>{appointment.client}</span>
              </div>
              <p className="text-sm"
                style={{ color: theme === 'light' || theme === 'soft-light' ? '#6b7280' : '#9ca3af' }}>{appointment.service}</p>
              <p className="text-xs"
                style={{ color: theme === 'light' || theme === 'soft-light' ? '#9ca3af' : '#6b7280' }}>with {appointment.barber}</p>
            </div>

            {/* Time Change */}
            <div className="space-y-3">
              {/* Original Time */}
              <div className="flex items-start space-x-3">
                <div className="bg-red-900/20 p-2 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm"
                    style={{ color: theme === 'light' || theme === 'soft-light' ? '#6b7280' : '#9ca3af' }}>From</p>
                  <p className="font-medium"
                    style={{ color: theme === 'light' || theme === 'soft-light' ? '#111827' : '#ffffff' }}>{formatDate(appointment.originalDate)}</p>
                  <p className="text-sm"
                    style={{ color: theme === 'light' || theme === 'soft-light' ? '#374151' : '#d1d5db' }}>{formatTime(appointment.originalTime, appointment.duration)}</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                style={{ color: theme === 'light' || theme === 'soft-light' ? '#9ca3af' : '#4b5563' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              {/* New Time */}
              <div className="flex items-start space-x-3">
                <div className="bg-green-900/20 p-2 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm"
                    style={{ color: theme === 'light' || theme === 'soft-light' ? '#6b7280' : '#9ca3af' }}>To</p>
                  <p className="font-medium"
                    style={{ color: theme === 'light' || theme === 'soft-light' ? '#111827' : '#ffffff' }}>{formatDate(appointment.newDate)}</p>
                  <p className="text-sm"
                    style={{ color: theme === 'light' || theme === 'soft-light' ? '#374151' : '#d1d5db' }}>{formatTime(appointment.newTime, appointment.duration)}</p>
                </div>
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-sm font-medium mb-2"
                style={{ color: theme === 'light' || theme === 'soft-light' ? '#374151' : '#d1d5db' }}>
                Add a note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for rescheduling..."
                className="w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                style={{
                  backgroundColor: theme === 'light' || theme === 'soft-light' ? '#f9fafb' : '#111827',
                  borderColor: theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151',
                  color: theme === 'light' || theme === 'soft-light' ? '#111827' : '#ffffff',
                  border: `1px solid ${theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'}`
                }}
                rows={3}
              />
            </div>

            {/* Notification Option */}
            <div className="rounded-lg p-4"
              style={{
                backgroundColor: theme === 'soft-light' ? 'rgba(124, 152, 133, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                borderColor: theme === 'soft-light' ? 'rgba(124, 152, 133, 0.5)' : 'rgba(139, 92, 246, 0.5)',
                border: '1px solid'
              }}>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded focus:ring-violet-500"
                  style={{
                    backgroundColor: theme === 'light' || theme === 'soft-light' ? '#ffffff' : '#374151',
                    borderColor: theme === 'light' || theme === 'soft-light' ? '#d1d5db' : '#4b5563',
                    accentColor: theme === 'soft-light' ? '#7c9885' : '#8b5cf6'
                  }}
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <BellIcon className="h-5 w-5 text-violet-400" />
                    <span className="font-medium"
                      style={{ color: theme === 'light' || theme === 'soft-light' ? '#111827' : '#ffffff' }}>Notify Customer</span>
                  </div>
                  <p className="text-sm mt-1"
                    style={{ color: theme === 'light' || theme === 'soft-light' ? '#6b7280' : '#9ca3af' }}>
                    Send SMS and email notification about the appointment change
                  </p>
                  {appointment.clientPhone && (
                    <p className="text-xs mt-1"
                      style={{ color: theme === 'light' || theme === 'soft-light' ? '#9ca3af' : '#6b7280' }}>SMS: {appointment.clientPhone}</p>
                  )}
                  {appointment.clientEmail && (
                    <p className="text-xs"
                      style={{ color: theme === 'light' || theme === 'soft-light' ? '#9ca3af' : '#6b7280' }}>Email: {appointment.clientEmail}</p>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex space-x-3">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              style={{
                backgroundColor: theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151',
                color: theme === 'light' || theme === 'soft-light' ? '#111827' : '#ffffff'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#d1d5db' : '#4b5563'
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#e5e7eb' : '#374151'
                }
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Confirm Change</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
