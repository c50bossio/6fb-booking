'use client'

import React, { useState, useMemo } from 'react'
import {
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'
import { format, addDays, isToday, isTomorrow } from 'date-fns'

export interface TimeSlotSuggestion {
  date: string
  time: string
  endTime: string
  score: number // Higher score = better suggestion
  reason: string
  priority: 'high' | 'medium' | 'low'
}

export interface ConflictingAppointment {
  id: string
  client: string
  service: string
  startTime: string
  endTime: string
  barber: string
  canBump?: boolean // Whether this appointment can be moved
}

export interface ConflictResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  conflictingAppointments: ConflictingAppointment[]
  draggedAppointment: {
    id: string
    client: string
    service: string
    barber: string
    duration: number
    originalDate: string
    originalTime: string
  }
  targetDate: string
  targetTime: string
  suggestions: TimeSlotSuggestion[]
  onResolveConflict: (resolution: ConflictResolution) => void
  isLoading?: boolean
}

export interface ConflictResolution {
  type: 'accept_suggestion' | 'bump_appointments' | 'allow_overlap' | 'cancel'
  selectedSuggestion?: TimeSlotSuggestion
  appointmentsToBump?: Array<{
    appointmentId: string
    newDate: string
    newTime: string
  }>
  note?: string
}

export default function ConflictResolutionModal({
  isOpen,
  onClose,
  conflictingAppointments,
  draggedAppointment,
  targetDate,
  targetTime,
  suggestions,
  onResolveConflict,
  isLoading = false
}: ConflictResolutionModalProps) {
  const [selectedSuggestion, setSelectedSuggestion] = useState<TimeSlotSuggestion | null>(null)
  const [selectedResolution, setSelectedResolution] = useState<'suggestion' | 'bump' | 'overlap' | null>(null)
  const [bumpConfigurations, setBumpConfigurations] = useState<Map<string, TimeSlotSuggestion>>(new Map())
  const [note, setNote] = useState('')

  if (!isOpen) return null

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr)
      if (isToday(date)) return 'Today'
      if (isTomorrow(date)) return 'Tomorrow'
      return format(date, 'EEEE, MMM d')
    } catch {
      return dateStr
    }
  }

  const formatTime = (time: string, duration?: number) => {
    const [hours, minutes] = time.split(':').map(Number)
    const endHours = duration ? Math.floor((hours * 60 + minutes + duration) / 60) : hours + 1
    const endMinutes = duration ? (hours * 60 + minutes + duration) % 60 : minutes

    const formatHour = (h: number, m: number) => {
      const hour12 = h % 12 || 12
      const ampm = h < 12 ? 'AM' : 'PM'
      return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`
    }

    return duration
      ? `${formatHour(hours, minutes)} - ${formatHour(endHours, endMinutes)}`
      : formatHour(hours, minutes)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-green-400 bg-green-900/20 border-green-700'
      case 'medium': return 'text-yellow-400 bg-yellow-900/20 border-yellow-700'
      case 'low': return 'text-gray-400 bg-gray-900/20 border-gray-700'
      default: return 'text-gray-400 bg-gray-900/20 border-gray-700'
    }
  }

  const getSuggestionIcon = (reason: string) => {
    if (reason.includes('same day')) return '📅'
    if (reason.includes('nearby')) return '⏰'
    if (reason.includes('preferred')) return '⭐'
    if (reason.includes('available')) return '✅'
    return '💡'
  }

  const bumpableAppointments = conflictingAppointments.filter(apt => apt.canBump)
  const nonBumpableAppointments = conflictingAppointments.filter(apt => !apt.canBump)

  const handleBumpConfiguration = (appointmentId: string, suggestion: TimeSlotSuggestion) => {
    const newConfigurations = new Map(bumpConfigurations)
    newConfigurations.set(appointmentId, suggestion)
    setBumpConfigurations(newConfigurations)
  }

  const handleResolve = () => {
    if (!selectedResolution) return

    const resolution: ConflictResolution = { type: 'cancel' }

    switch (selectedResolution) {
      case 'suggestion':
        if (selectedSuggestion) {
          resolution.type = 'accept_suggestion'
          resolution.selectedSuggestion = selectedSuggestion
        }
        break
      case 'bump':
        resolution.type = 'bump_appointments'
        resolution.appointmentsToBump = Array.from(bumpConfigurations.entries()).map(([id, suggestion]) => ({
          appointmentId: id,
          newDate: suggestion.date,
          newTime: suggestion.time
        }))
        break
      case 'overlap':
        resolution.type = 'allow_overlap'
        break
    }

    if (note.trim()) {
      resolution.note = note.trim()
    }

    onResolveConflict(resolution)
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
        <div className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
                <h3 className="text-xl font-semibold text-white">
                  Scheduling Conflict Detected
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Conflict Overview */}
            <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
              <h4 className="text-lg font-medium text-white mb-3">Conflict Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Appointment Being Moved */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <ArrowPathIcon className="h-5 w-5 text-blue-400" />
                    <span className="font-medium text-blue-400">Moving Appointment</span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-white font-medium">{draggedAppointment.client}</p>
                    <p className="text-gray-300">{draggedAppointment.service}</p>
                    <p className="text-gray-400">with {draggedAppointment.barber}</p>
                    <div className="flex items-center space-x-2 text-gray-400 mt-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{formatDate(targetDate)}</span>
                      <ClockIcon className="h-4 w-4 ml-2" />
                      <span>{formatTime(targetTime, draggedAppointment.duration)}</span>
                    </div>
                  </div>
                </div>

                {/* Conflicting Appointments */}
                <div className="bg-gray-900/50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                    <span className="font-medium text-red-400">
                      Conflicts with {conflictingAppointments.length} appointment{conflictingAppointments.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {conflictingAppointments.map((appointment) => (
                      <div key={appointment.id} className="text-sm border-l-2 border-red-500 pl-3">
                        <p className="text-white font-medium">{appointment.client}</p>
                        <p className="text-gray-300">{appointment.service}</p>
                        <p className="text-gray-400">{formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}</p>
                        {appointment.canBump && (
                          <span className="inline-block mt-1 px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs rounded">
                            Can be moved
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Resolution Options */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-white">Choose a Resolution</h4>

              {/* Option 1: Accept Suggestion */}
              {suggestions.length > 0 && (
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setSelectedResolution(selectedResolution === 'suggestion' ? null : 'suggestion')}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                      selectedResolution === 'suggestion'
                        ? 'bg-green-900/30 border-green-700'
                        : 'bg-gray-900/30 hover:bg-gray-900/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedResolution === 'suggestion' ? 'border-green-400 bg-green-400' : 'border-gray-500'
                      }`}>
                        {selectedResolution === 'suggestion' && <CheckIcon className="h-3 w-3 text-gray-900" />}
                      </div>
                      <span className="font-medium text-white">Choose an Alternative Time</span>
                      <span className="text-sm text-green-400">✨ Recommended</span>
                    </div>
                    <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform ${
                      selectedResolution === 'suggestion' ? 'rotate-90' : ''
                    }`} />
                  </button>

                  {selectedResolution === 'suggestion' && (
                    <div className="border-t border-gray-700 p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {suggestions.slice(0, 6).map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedSuggestion(suggestion)}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              selectedSuggestion === suggestion
                                ? 'border-green-500 bg-green-900/20'
                                : `border-gray-600 hover:border-gray-500 ${getPriorityColor(suggestion.priority)}`
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-white">
                                {getSuggestionIcon(suggestion.reason)} {formatDate(suggestion.date)}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                suggestion.priority === 'high' ? 'bg-green-900/30 text-green-400' :
                                suggestion.priority === 'medium' ? 'bg-yellow-900/30 text-yellow-400' :
                                'bg-gray-900/30 text-gray-400'
                              }`}>
                                {suggestion.priority}
                              </span>
                            </div>
                            <div className="text-sm text-gray-300 mb-1">
                              {formatTime(suggestion.time, draggedAppointment.duration)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {suggestion.reason}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Option 2: Bump Other Appointments */}
              {bumpableAppointments.length > 0 && (
                <div className="border border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setSelectedResolution(selectedResolution === 'bump' ? null : 'bump')}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                      selectedResolution === 'bump'
                        ? 'bg-yellow-900/30 border-yellow-700'
                        : 'bg-gray-900/30 hover:bg-gray-900/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedResolution === 'bump' ? 'border-yellow-400 bg-yellow-400' : 'border-gray-500'
                      }`}>
                        {selectedResolution === 'bump' && <CheckIcon className="h-3 w-3 text-gray-900" />}
                      </div>
                      <span className="font-medium text-white">Move Conflicting Appointments</span>
                      <span className="text-sm text-yellow-400">⚠️ Requires customer notification</span>
                    </div>
                    <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform ${
                      selectedResolution === 'bump' ? 'rotate-90' : ''
                    }`} />
                  </button>

                  {selectedResolution === 'bump' && (
                    <div className="border-t border-gray-700 p-4 space-y-4">
                      {bumpableAppointments.map((appointment) => (
                        <div key={appointment.id} className="bg-gray-900/50 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="font-medium text-white">{appointment.client}</p>
                              <p className="text-sm text-gray-300">{appointment.service}</p>
                              <p className="text-sm text-gray-400">
                                Currently: {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {suggestions.slice(0, 3).map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => handleBumpConfiguration(appointment.id, suggestion)}
                                className={`p-2 rounded border text-left text-sm transition-all ${
                                  bumpConfigurations.get(appointment.id) === suggestion
                                    ? 'border-yellow-500 bg-yellow-900/20'
                                    : 'border-gray-600 hover:border-gray-500 bg-gray-900/30'
                                }`}
                              >
                                <div className="font-medium text-white">
                                  {formatDate(suggestion.date)}
                                </div>
                                <div className="text-gray-300">
                                  {formatTime(suggestion.time)}
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Option 3: Allow Overlap */}
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <button
                  onClick={() => setSelectedResolution(selectedResolution === 'overlap' ? null : 'overlap')}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors ${
                    selectedResolution === 'overlap'
                      ? 'bg-red-900/30 border-red-700'
                      : 'bg-gray-900/30 hover:bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedResolution === 'overlap' ? 'border-red-400 bg-red-400' : 'border-gray-500'
                    }`}>
                      {selectedResolution === 'overlap' && <CheckIcon className="h-3 w-3 text-gray-900" />}
                    </div>
                    <span className="font-medium text-white">Allow Double Booking</span>
                    <span className="text-sm text-red-400">❌ Not recommended</span>
                  </div>
                  <ChevronRightIcon className={`h-5 w-5 text-gray-400 transition-transform ${
                    selectedResolution === 'overlap' ? 'rotate-90' : ''
                  }`} />
                </button>

                {selectedResolution === 'overlap' && (
                  <div className="border-t border-gray-700 p-4">
                    <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-3">
                      <p className="text-sm text-red-300">
                        ⚠️ This will create overlapping appointments for the same barber. This may cause scheduling issues and customer dissatisfaction.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Add a note about this resolution (optional)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Explain the reason for this scheduling change..."
                className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="sticky bottom-0 bg-gray-800 border-t border-gray-700 px-6 py-4 rounded-b-2xl">
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={isLoading || !selectedResolution ||
                  (selectedResolution === 'suggestion' && !selectedSuggestion) ||
                  (selectedResolution === 'bump' && bumpConfigurations.size !== bumpableAppointments.length)
                }
                className="flex-2 px-6 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Resolving...</span>
                  </>
                ) : (
                  <span>Apply Resolution</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
