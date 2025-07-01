'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { 
  ExclamationTriangleIcon, 
  ClockIcon, 
  UserIcon, 
  CalendarIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { ConflictAnalysis, ConflictResolution, ConflictInfo } from '@/lib/appointment-conflicts'
import { parseAPIDate } from '@/lib/timezone'

interface ConflictResolutionModalProps {
  isOpen: boolean
  onClose: () => void
  analysis: ConflictAnalysis
  appointmentData: {
    client_name?: string
    service_name: string
    start_time: string
    duration_minutes?: number
    barber_name?: string
  }
  onResolveConflict: (resolution: ConflictResolution) => void
  onProceedAnyway: () => void
  onCancel: () => void
}

export default function ConflictResolutionModal({
  isOpen,
  onClose,
  analysis,
  appointmentData,
  onResolveConflict,
  onProceedAnyway,
  onCancel
}: ConflictResolutionModalProps) {
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution | null>(null)

  if (!isOpen) return null

  const getSeverityColor = (severity: ConflictInfo['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: ConflictInfo['severity']) => {
    switch (severity) {
      case 'critical':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />
      case 'info':
        return <ClockIcon className="w-5 h-5 text-blue-500" />
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />
    }
  }

  const getResolutionIcon = (type: ConflictResolution['type']) => {
    switch (type) {
      case 'reschedule':
        return <CalendarIcon className="w-5 h-5 text-primary-500" />
      case 'change_barber':
        return <UserIcon className="w-5 h-5 text-purple-500" />
      case 'adjust_duration':
        return <ClockIcon className="w-5 h-5 text-orange-500" />
      default:
        return <CheckIcon className="w-5 h-5 text-green-500" />
    }
  }

  const formatTime = (timeString: string) => {
    return format(parseAPIDate(timeString), 'MMM d, h:mm a')
  }

  const hasUnsafeConflicts = analysis.conflicts.some(c => c.severity === 'critical')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                hasUnsafeConflicts ? 'bg-red-100 dark:bg-red-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'
              }`}>
                <ExclamationTriangleIcon className={`w-6 h-6 ${
                  hasUnsafeConflicts ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                }`} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Scheduling Conflict Detected
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {appointmentData.client_name || 'Client'} • {appointmentData.service_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Risk Score */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Scheduling Risk Score
            </span>
            <div className="flex items-center gap-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                analysis.riskScore >= 70 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                  : analysis.riskScore >= 40
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              }`}>
                {analysis.riskScore}/100
              </div>
            </div>
          </div>
        </div>

        {/* Conflicts List */}
        <div className="p-6">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Detected Conflicts ({analysis.conflicts.length})
          </h4>
          <div className="space-y-3 mb-6">
            {analysis.conflicts.map((conflict, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getSeverityColor(conflict.severity)} dark:bg-opacity-20`}
              >
                <div className="flex items-start gap-3">
                  {getSeverityIcon(conflict.severity)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {conflict.message}
                    </p>
                    {conflict.conflictingAppointment.client_name && (
                      <div className="mt-2 text-xs opacity-75">
                        <p>Conflicts with: {conflict.conflictingAppointment.client_name}</p>
                        <p>
                          {format(parseAPIDate(conflict.conflictingAppointment.start_time), 'h:mm a')} - 
                          {conflict.conflictingAppointment.service_name}
                        </p>
                      </div>
                    )}
                    {conflict.overlapMinutes > 0 && (
                      <p className="text-xs mt-1 opacity-75">
                        Overlap: {conflict.overlapMinutes} minutes
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resolution Suggestions */}
          {analysis.resolutions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                Suggested Solutions
              </h4>
              <div className="space-y-3 mb-6">
                {analysis.resolutions.map((resolution, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedResolution === resolution
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                    onClick={() => setSelectedResolution(resolution)}
                  >
                    <div className="flex items-start gap-3">
                      {getResolutionIcon(resolution.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm text-gray-900 dark:text-white">
                            {resolution.message}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              resolution.confidence >= 80
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : resolution.confidence >= 60
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                              {resolution.confidence}% confidence
                            </span>
                            {selectedResolution === resolution && (
                              <CheckIcon className="w-4 h-4 text-primary-500" />
                            )}
                          </div>
                        </div>
                        
                        {/* Resolution Details */}
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          {resolution.suggestedStartTime && (
                            <p>New time: {formatTime(resolution.suggestedStartTime)}</p>
                          )}
                          {resolution.adjustedDuration && (
                            <p>Duration: {resolution.adjustedDuration} minutes</p>
                          )}
                          {resolution.suggestedBarberId && (
                            <p>Barber change required</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Appointment Details */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
            <h5 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Current Appointment
            </h5>
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p>Time: {formatTime(appointmentData.start_time)}</p>
              <p>Duration: {appointmentData.duration_minutes || 60} minutes</p>
              {appointmentData.barber_name && (
                <p>Barber: {appointmentData.barber_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancel
            </button>
            
            <div className="flex items-center gap-3">
              {!hasUnsafeConflicts && (
                <button
                  onClick={onProceedAnyway}
                  className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 rounded-lg transition-colors"
                >
                  Proceed Anyway
                </button>
              )}
              
              <button
                onClick={() => {
                  if (selectedResolution) {
                    onResolveConflict(selectedResolution)
                  }
                }}
                disabled={!selectedResolution}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  selectedResolution
                    ? 'bg-primary-600 hover:bg-primary-700 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                }`}
              >
                Apply Solution
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}