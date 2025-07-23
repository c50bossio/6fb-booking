'use client'

import React, { useState, useEffect } from 'react'
import { format, addMinutes, addHours, isSameDay } from 'date-fns'
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ArrowRightIcon,
  XMarkIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { getTheme } from '@/lib/calendar-premium-theme'
import { aiTimeSuggestions } from '@/lib/ai-time-suggestions'
import type { BookingResponse } from '@/lib/api'

interface ConflictType {
  id: string
  type: 'overlap' | 'double-booking' | 'buffer-violation' | 'business-hours'
  severity: 'high' | 'medium' | 'low'
  description: string
  affectedAppointments: BookingResponse[]
  suggestedFixes: ConflictResolution[]
}

interface ConflictResolution {
  id: string
  type: 'reschedule' | 'extend-duration' | 'add-buffer' | 'change-barber'
  description: string
  impact: string
  confidence: number
  newStartTime?: string
  newEndTime?: string
  alternativeBarber?: string
  automatedFix: boolean
}

interface SmartConflictResolverProps {
  conflicts: ConflictType[]
  appointments: BookingResponse[]
  onResolveConflict: (conflictId: string, resolution: ConflictResolution) => Promise<void>
  onDismissConflict: (conflictId: string) => void
  theme?: 'platinum' | 'pearl' | 'aurora'
  className?: string
}

export default function SmartConflictResolver({
  conflicts,
  appointments,
  onResolveConflict,
  onDismissConflict,
  theme = 'pearl',
  className = ''
}: SmartConflictResolverProps) {
  const [selectedConflict, setSelectedConflict] = useState<ConflictType | null>(null)
  const [processingResolution, setProcessingResolution] = useState<string | null>(null)
  const [autoResolveEnabled, setAutoResolveEnabled] = useState(false)
  const themeConfig = getTheme(theme)

  // Auto-resolve low severity conflicts if enabled
  useEffect(() => {
    if (autoResolveEnabled) {
      conflicts
        .filter(conflict => conflict.severity === 'low' && conflict.suggestedFixes.length > 0)
        .forEach(async (conflict) => {
          const automatedFix = conflict.suggestedFixes.find(fix => fix.automatedFix)
          if (automatedFix) {
            try {
              await onResolveConflict(conflict.id, automatedFix)
            } catch (error) {
              console.error('Auto-resolve failed:', error)
            }
          }
        })
    }
  }, [conflicts, autoResolveEnabled, onResolveConflict])

  const getSeverityIcon = (severity: ConflictType['severity']) => {
    switch (severity) {
      case 'high':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
      case 'medium':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />
      case 'low':
        return <LightBulbIcon className="w-5 h-5 text-blue-600" />
    }
  }

  const getSeverityClasses = (severity: ConflictType['severity']) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50/80 text-red-900'
      case 'medium':
        return 'border-yellow-200 bg-yellow-50/80 text-yellow-900'
      case 'low':
        return 'border-blue-200 bg-blue-50/80 text-blue-900'
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-blue-600'
    if (confidence >= 0.4) return 'text-yellow-600'
    return 'text-gray-600'
  }

  const handleResolveConflict = async (conflictId: string, resolution: ConflictResolution) => {
    setProcessingResolution(resolution.id)
    try {
      await onResolveConflict(conflictId, resolution)
      setSelectedConflict(null)
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    } finally {
      setProcessingResolution(null)
    }
  }

  if (conflicts.length === 0) {
    return (
      <div className={`${themeConfig.calendar.surface} rounded-xl p-6 ${className}`}>
        <div className="text-center">
          <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Conflicts Detected</h3>
          <p className="text-gray-600">Your calendar is optimally scheduled!</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${themeConfig.calendar.surface} rounded-xl overflow-hidden shadow-premium ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Schedule Conflicts</h3>
              <p className="text-sm text-gray-600">
                {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''} detected
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoResolveEnabled}
                onChange={(e) => setAutoResolveEnabled(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Auto-resolve low priority
            </label>
          </div>
        </div>
      </div>

      {/* Conflicts List */}
      <div className="divide-y divide-gray-200/50">
        {conflicts.map((conflict) => (
          <div key={conflict.id} className="p-6">
            <div 
              className={`rounded-lg border p-4 transition-all duration-200 hover:shadow-md cursor-pointer ${getSeverityClasses(conflict.severity)}`}
              onClick={() => setSelectedConflict(selectedConflict?.id === conflict.id ? null : conflict)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getSeverityIcon(conflict.severity)}
                  <div>
                    <h4 className="font-medium">{conflict.description}</h4>
                    <p className="text-sm opacity-80 mt-1">
                      Affects {conflict.affectedAppointments.length} appointment{conflict.affectedAppointments.length > 1 ? 's' : ''}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 rounded-full bg-white/50 capitalize">
                        {conflict.severity} priority
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-white/50">
                        {conflict.suggestedFixes.length} solution{conflict.suggestedFixes.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDismissConflict(conflict.id)
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="w-4 h-4" />
                </Button>
              </div>

              {/* Affected Appointments */}
              {selectedConflict?.id === conflict.id && (
                <div className="mt-4 space-y-3 animate-in slide-in-from-top-2 duration-300">
                  <div>
                    <h5 className="font-medium text-sm mb-2">Affected Appointments:</h5>
                    <div className="space-y-2">
                      {conflict.affectedAppointments.map((appointment) => (
                        <div key={appointment.id} className="flex items-center gap-3 p-2 bg-white/30 rounded">
                          <ClockIcon className="w-4 h-4" />
                          <span className="text-sm">
                            {format(new Date(appointment.start_time), 'MMM d, h:mm a')} - 
                            {appointment.client_name} ({appointment.service_name})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resolution Options */}
                  <div>
                    <h5 className="font-medium text-sm mb-3">Suggested Solutions:</h5>
                    <div className="space-y-2">
                      {conflict.suggestedFixes.map((fix) => (
                        <div 
                          key={fix.id}
                          className="flex items-center justify-between p-3 bg-white/40 rounded-lg border border-white/50"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{fix.description}</span>
                              <span className={`text-xs font-medium ${getConfidenceColor(fix.confidence)}`}>
                                {Math.round(fix.confidence * 100)}% confidence
                              </span>
                              {fix.automatedFix && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                                  Auto-fix
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{fix.impact}</p>
                            
                            {/* Show time changes */}
                            {fix.newStartTime && (
                              <div className="flex items-center gap-2 mt-2 text-xs">
                                <span>New time:</span>
                                <span className="font-mono bg-white/50 px-2 py-1 rounded">
                                  {fix.newStartTime}
                                </span>
                                {fix.newEndTime && (
                                  <>
                                    <ArrowRightIcon className="w-3 h-3" />
                                    <span className="font-mono bg-white/50 px-2 py-1 rounded">
                                      {fix.newEndTime}
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          
                          <Button
                            size="sm"
                            onClick={() => handleResolveConflict(conflict.id, fix)}
                            disabled={processingResolution === fix.id}
                            className="ml-3"
                          >
                            {processingResolution === fix.id ? 'Applying...' : 'Apply'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 bg-gray-50/50 border-t border-gray-200/50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center gap-4">
            <span>Priority: High ({conflicts.filter(c => c.severity === 'high').length})</span>
            <span>Medium ({conflicts.filter(c => c.severity === 'medium').length})</span>
            <span>Low ({conflicts.filter(c => c.severity === 'low').length})</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              conflicts.forEach(conflict => onDismissConflict(conflict.id))
            }}
          >
            Dismiss All
          </Button>
        </div>
      </div>
    </div>
  )
}

// Helper function to detect conflicts in appointments
export function detectConflicts(appointments: BookingResponse[]): ConflictType[] {
  const conflicts: ConflictType[] = []
  
  // Check for overlapping appointments
  for (let i = 0; i < appointments.length; i++) {
    for (let j = i + 1; j < appointments.length; j++) {
      const apt1 = appointments[i]
      const apt2 = appointments[j]
      
      const start1 = new Date(apt1.start_time)
      const end1 = apt1.end_time ? new Date(apt1.end_time) : addMinutes(start1, 60)
      const start2 = new Date(apt2.start_time)
      const end2 = apt2.end_time ? new Date(apt2.end_time) : addMinutes(start2, 60)
      
      // Check for overlap
      if (start1 < end2 && start2 < end1 && isSameDay(start1, start2)) {
        conflicts.push({
          id: `overlap-${apt1.id}-${apt2.id}`,
          type: 'overlap',
          severity: 'high',
          description: 'Overlapping appointments detected',
          affectedAppointments: [apt1, apt2],
          suggestedFixes: [
            {
              id: `reschedule-${apt2.id}`,
              type: 'reschedule',
              description: `Reschedule ${apt2.client_name}'s appointment`,
              impact: 'Move appointment to next available slot',
              confidence: 0.8,
              newStartTime: format(addHours(start2, 1), 'HH:mm'),
              automatedFix: false
            }
          ]
        })
      }
    }
  }
  
  return conflicts
}