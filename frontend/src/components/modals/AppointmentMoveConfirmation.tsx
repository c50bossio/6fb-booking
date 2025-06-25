'use client'

import React, { useState } from 'react'
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon, BellIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

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

  if (!isOpen) return null

  const formatDate = (dateStr: string) => {
    try {
      // Parse date string directly without any Date object creation to avoid timezone issues
      const [year, month, day] = dateStr.split('-').map(Number)

      // Debug logging to verify correct date parsing
      console.log('🗓️ Formatting date:', { input: dateStr, parsed: { year, month, day } })

      // Manual date formatting to avoid timezone conversion
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ]

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

      // Calculate day of week using Zeller's congruence (timezone-safe)
      let m = month
      let y = year
      if (month < 3) {
        m += 12
        y -= 1
      }
      const dayOfWeek = (day + Math.floor((13 * (m + 1)) / 5) + y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)) % 7

      const formatted = `${dayNames[dayOfWeek]}, ${monthNames[month - 1]} ${day}, ${year}`
      console.log('📅 Formatted date result:', formatted)

      return formatted
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
        <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-md w-full p-6 transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">
              Confirm Appointment Change
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {/* Client Info */}
            <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center space-x-2 mb-2">
                <UserIcon className="h-5 w-5 text-violet-400" />
                <span className="font-medium text-white">{appointment.client}</span>
              </div>
              <p className="text-gray-400 text-sm">{appointment.service}</p>
              <p className="text-gray-500 text-xs">with {appointment.barber}</p>
            </div>

            {/* Time Change */}
            <div className="space-y-3">
              {/* Original Time */}
              <div className="flex items-start space-x-3">
                <div className="bg-red-900/20 p-2 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">From</p>
                  <p className="text-white font-medium">{formatDate(appointment.originalDate)}</p>
                  <p className="text-gray-300 text-sm">{formatTime(appointment.originalTime, appointment.duration)}</p>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center">
                <svg className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>

              {/* New Time */}
              <div className="flex items-start space-x-3">
                <div className="bg-green-900/20 p-2 rounded-lg">
                  <CalendarIcon className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">To</p>
                  <p className="text-white font-medium">{formatDate(appointment.newDate)}</p>
                  <p className="text-gray-300 text-sm">{formatTime(appointment.newTime, appointment.duration)}</p>
                </div>
              </div>
            </div>

            {/* Note Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Add a note (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for rescheduling..."
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Notification Option */}
            <div className="bg-violet-900/20 border border-violet-700/50 rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyCustomer}
                  onChange={(e) => setNotifyCustomer(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-600 bg-gray-700 text-violet-600 focus:ring-violet-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <BellIcon className="h-5 w-5 text-violet-400" />
                    <span className="font-medium text-white">Notify Customer</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    Send SMS and email notification about the appointment change
                  </p>
                  {appointment.clientPhone && (
                    <p className="text-xs text-gray-500 mt-1">SMS: {appointment.clientPhone}</p>
                  )}
                  {appointment.clientEmail && (
                    <p className="text-xs text-gray-500">Email: {appointment.clientEmail}</p>
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
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
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
