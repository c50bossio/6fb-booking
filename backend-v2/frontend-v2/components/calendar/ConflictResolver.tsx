'use client'

import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { format, addMinutes, isWithinInterval, parseISO } from 'date-fns'
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowRightIcon,
  XCircleIcon,
  LightBulbIcon,
  UserGroupIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { getSmartSuggestions, optimizeExistingSchedule } from '@/lib/calendar-ai'
import { useCalendarSecurity } from '@/hooks/useCalendarSecurity'
import { useCalendarHaptics } from '@/hooks/useCalendarHaptics'
import type { BookingResponse } from '@/lib/api'

interface Conflict {
  id: string
  type: 'overlap' | 'insufficient_gap' | 'double_booking' | 'over_capacity' | 'break_conflict' | 'after_hours'
  severity: 'low' | 'medium' | 'high' | 'critical'
  affectedAppointments: BookingResponse[]
  description: string
  timeRange: {
    start: Date
    end: Date
  }
  suggestions: ConflictSolution[]
}

interface ConflictSolution {
  id: string
  type: 'reschedule' | 'extend_gap' | 'cancel' | 'move_to_another_day' | 'split_appointment' | 'delegate'
  description: string
  confidence: number // 0-1
  impact: 'minimal' | 'moderate' | 'significant'
  affectedAppointments: number[]
  proposedChanges: {
    appointmentId: number
    newStartTime?: Date
    newEndTime?: Date
    newDate?: Date
    action: 'reschedule' | 'cancel' | 'modify' | 'split'
  }[]
  alternativeTimes?: {
    date: Date
    time: string
    confidence: number
  }[]
}

interface ConflictResolverProps {
  appointments: BookingResponse[]
  workingHours: { start: string; end: string }
  workingDays: number[]
  breakTimes: { start: string; end: string }[]
  bufferTime: number
  onResolveConflicts: (solutions: ConflictSolution[]) => Promise<void>
  onClose: () => void
  isVisible: boolean
  autoDetect?: boolean
}

interface WorkingConstraints {
  workingHours: { start: string; end: string }
  workingDays: number[]
  breakTimes: { start: string; end: string }[]
  bufferTime: number
}

/**
 * Intelligent conflict detection and resolution system
 * Automatically identifies scheduling conflicts and suggests optimal solutions
 */
export function ConflictResolver({
  appointments,
  workingHours,
  workingDays,
  breakTimes,
  bufferTime = 15,
  onResolveConflicts,
  onClose,
  isVisible,
  autoDetect = true
}: ConflictResolverProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([])
  const [selectedSolutions, setSelectedSolutions] = useState<Map<string, ConflictSolution>>(new Map())
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeTab, setActiveTab] = useState<'conflicts' | 'optimization' | 'preview'>('conflicts')
  const [optimizationResult, setOptimizationResult] = useState<any>(null)

  const { auditSecurityEvent } = useCalendarSecurity()
  const { smartHaptic } = useCalendarHaptics()

  const constraints: WorkingConstraints = {
    workingHours,
    workingDays,
    breakTimes,
    bufferTime
  }

  // Detect conflicts automatically
  const detectConflicts = useCallback(() => {
    const detectedConflicts: Conflict[] = []
    
    // Sort appointments by start time
    const sortedAppointments = [...appointments].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    // Check for overlaps and insufficient gaps
    for (let i = 0; i < sortedAppointments.length - 1; i++) {
      const current = sortedAppointments[i]
      const next = sortedAppointments[i + 1]
      
      const currentStart = new Date(current.start_time)
      const currentEnd = new Date(current.end_time || addMinutes(currentStart, current.duration || 60))
      const nextStart = new Date(next.start_time)
      const nextEnd = new Date(next.end_time || addMinutes(nextStart, next.duration || 60))

      // Check for overlap
      if (currentEnd > nextStart) {
        const overlapMinutes = (currentEnd.getTime() - nextStart.getTime()) / (1000 * 60)
        
        detectedConflicts.push({
          id: `overlap_${current.id}_${next.id}`,
          type: 'overlap',
          severity: overlapMinutes > 30 ? 'critical' : overlapMinutes > 15 ? 'high' : 'medium',
          affectedAppointments: [current, next],
          description: `${current.service_name} overlaps with ${next.service_name} by ${Math.round(overlapMinutes)} minutes`,
          timeRange: {
            start: nextStart,
            end: currentEnd
          },
          suggestions: generateOverlapSolutions(current, next, constraints)
        })
      }
      // Check for insufficient gap
      else if (currentEnd.getTime() + bufferTime * 60000 > nextStart.getTime()) {
        const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60)
        const shortfall = bufferTime - gapMinutes
        
        detectedConflicts.push({
          id: `gap_${current.id}_${next.id}`,
          type: 'insufficient_gap',
          severity: shortfall > 10 ? 'medium' : 'low',
          affectedAppointments: [current, next],
          description: `Only ${Math.round(gapMinutes)} minute gap between appointments (need ${bufferTime} minutes)`,
          timeRange: {
            start: currentEnd,
            end: nextStart
          },
          suggestions: generateGapSolutions(current, next, constraints, shortfall)
        })
      }
    }

    // Check for after-hours appointments
    sortedAppointments.forEach(appointment => {
      const startTime = new Date(appointment.start_time)
      const endTime = new Date(appointment.end_time || addMinutes(startTime, appointment.duration || 60))
      
      const dayOfWeek = startTime.getDay()
      const timeString = format(startTime, 'HH:mm')
      const endTimeString = format(endTime, 'HH:mm')

      // Check working days
      if (!workingDays.includes(dayOfWeek)) {
        detectedConflicts.push({
          id: `non_working_day_${appointment.id}`,
          type: 'after_hours',
          severity: 'high',
          affectedAppointments: [appointment],
          description: `Appointment scheduled on non-working day (${format(startTime, 'EEEE')})`,
          timeRange: {
            start: startTime,
            end: endTime
          },
          suggestions: generateAfterHoursSolutions(appointment, constraints)
        })
      }

      // Check working hours
      if (timeString < workingHours.start || endTimeString > workingHours.end) {
        detectedConflicts.push({
          id: `after_hours_${appointment.id}`,
          type: 'after_hours',
          severity: 'medium',
          affectedAppointments: [appointment],
          description: `Appointment scheduled outside working hours (${workingHours.start}-${workingHours.end})`,
          timeRange: {
            start: startTime,
            end: endTime
          },
          suggestions: generateAfterHoursSolutions(appointment, constraints)
        })
      }

      // Check break time conflicts
      breakTimes.forEach(breakTime => {
        const breakStart = new Date(startTime)
        const [breakStartHour, breakStartMinute] = breakTime.start.split(':').map(Number)
        breakStart.setHours(breakStartHour, breakStartMinute, 0, 0)
        
        const breakEnd = new Date(startTime)
        const [breakEndHour, breakEndMinute] = breakTime.end.split(':').map(Number)
        breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0)

        if (isWithinInterval(startTime, { start: breakStart, end: breakEnd }) ||
            isWithinInterval(endTime, { start: breakStart, end: breakEnd }) ||
            (startTime <= breakStart && endTime >= breakEnd)) {
          
          detectedConflicts.push({
            id: `break_conflict_${appointment.id}`,
            type: 'break_conflict',
            severity: 'medium',
            affectedAppointments: [appointment],
            description: `Appointment conflicts with break time (${breakTime.start}-${breakTime.end})`,
            timeRange: {
              start: breakStart,
              end: breakEnd
            },
            suggestions: generateBreakConflictSolutions(appointment, constraints, breakTime)
          })
        }
      })
    })

    // Check for double bookings (same client, same time)
    const clientTimeMap = new Map<string, BookingResponse[]>()
    sortedAppointments.forEach(appointment => {
      const key = `${appointment.client_name}_${appointment.start_time}`
      if (!clientTimeMap.has(key)) {
        clientTimeMap.set(key, [])
      }
      clientTimeMap.get(key)!.push(appointment)
    })

    clientTimeMap.forEach((appointments, key) => {
      if (appointments.length > 1) {
        detectedConflicts.push({
          id: `double_booking_${key}`,
          type: 'double_booking',
          severity: 'critical',
          affectedAppointments: appointments,
          description: `Double booking for ${appointments[0].client_name} at ${format(new Date(appointments[0].start_time), 'h:mm a')}`,
          timeRange: {
            start: new Date(appointments[0].start_time),
            end: new Date(appointments[0].end_time || addMinutes(new Date(appointments[0].start_time), appointments[0].duration || 60))
          },
          suggestions: generateDoubleBookingSolutions(appointments, constraints)
        })
      }
    })

    setConflicts(detectedConflicts)
    
    if (detectedConflicts.length > 0) {
      auditSecurityEvent('Conflicts Detected', {
        conflictCount: detectedConflicts.length,
        severityBreakdown: {
          critical: detectedConflicts.filter(c => c.severity === 'critical').length,
          high: detectedConflicts.filter(c => c.severity === 'high').length,
          medium: detectedConflicts.filter(c => c.severity === 'medium').length,
          low: detectedConflicts.filter(c => c.severity === 'low').length
        }
      })
    }
  }, [appointments, constraints, auditSecurityEvent])

  // Auto-detect conflicts when appointments change
  useEffect(() => {
    if (autoDetect && appointments.length > 0) {
      detectConflicts()
    }
  }, [appointments, detectConflicts, autoDetect])

  // Load optimization analysis
  useEffect(() => {
    if (appointments.length > 0) {
      try {
        const result = optimizeExistingSchedule(appointments, {
          workingHours,
          workingDays,
          breakTimes,
          minimumBookingNotice: 2,
          maximumBookingAdvance: 30,
          bufferTime,
          preferredAppointmentLength: 60
        })
        setOptimizationResult(result)
      } catch (error) {
        console.error('Error analyzing schedule optimization:', error)
      }
    }
  }, [appointments, workingHours, workingDays, breakTimes, bufferTime])

  // Handle solution selection
  const handleSolutionSelect = useCallback((conflictId: string, solution: ConflictSolution) => {
    setSelectedSolutions(prev => new Map(prev).set(conflictId, solution))
    smartHaptic('select')
    
    auditSecurityEvent('Conflict Solution Selected', {
      conflictId,
      solutionType: solution.type,
      confidence: solution.confidence
    })
  }, [smartHaptic, auditSecurityEvent])

  // Handle conflict resolution
  const handleResolveConflicts = useCallback(async () => {
    if (selectedSolutions.size === 0) return

    setIsProcessing(true)
    
    try {
      const solutionsArray = Array.from(selectedSolutions.values())
      await onResolveConflicts(solutionsArray)
      
      smartHaptic('success')
      auditSecurityEvent('Conflicts Resolved', {
        solutionCount: solutionsArray.length,
        solutionTypes: solutionsArray.map(s => s.type)
      })
      
      onClose()
    } catch (error) {
      smartHaptic('error')
      auditSecurityEvent('Conflict Resolution Failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsProcessing(false)
    }
  }, [selectedSolutions, onResolveConflicts, smartHaptic, auditSecurityEvent, onClose])

  // Render conflict severity badge
  const renderSeverityBadge = (severity: Conflict['severity']) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-800/20 dark:text-orange-400',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400',
      low: 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-400'
    }

    const icons = {
      critical: XCircleIcon,
      high: ExclamationTriangleIcon,
      medium: ExclamationTriangleIcon,
      low: ClockIcon
    }

    const Icon = icons[severity]

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[severity]}`}>
        <Icon className="w-3 h-3 mr-1" />
        {severity.toUpperCase()}
      </span>
    )
  }

  // Render confidence score
  const renderConfidenceScore = (confidence: number) => {
    const percentage = Math.round(confidence * 100)
    const color = confidence > 0.8 ? 'text-green-600' : confidence > 0.6 ? 'text-yellow-600' : 'text-red-600'
    
    return (
      <span className={`text-sm font-medium ${color}`}>
        {percentage}% confidence
      </span>
    )
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
              Conflict Resolver
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {conflicts.length > 0 
                ? `${conflicts.length} conflict${conflicts.length !== 1 ? 's' : ''} detected`
                : 'No conflicts detected'
              }
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Navigation Tabs */}
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('conflicts')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'conflicts' 
                  ? 'bg-white dark:bg-gray-700 shadow-sm' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <ExclamationTriangleIcon className="w-4 h-4 inline mr-2" />
              Conflicts ({conflicts.length})
            </button>
            <button
              onClick={() => setActiveTab('optimization')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'optimization' 
                  ? 'bg-white dark:bg-gray-700 shadow-sm' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <LightBulbIcon className="w-4 h-4 inline mr-2" />
              Optimization
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'preview' 
                  ? 'bg-white dark:bg-gray-700 shadow-sm' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <CalendarDaysIcon className="w-4 h-4 inline mr-2" />
              Preview Changes
            </button>
          </div>

          {/* Conflicts Tab */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              {conflicts.length > 0 ? (
                <>
                  {conflicts.map((conflict) => (
                    <Card key={conflict.id} className="border-l-4 border-orange-500">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {renderSeverityBadge(conflict.severity)}
                              <span className="text-sm text-gray-500 capitalize">
                                {conflict.type.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-sm font-medium">{conflict.description}</p>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            {format(conflict.timeRange.start, 'MMM d, h:mm a')}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        {/* Affected Appointments */}
                        <div className="mb-4">
                          <h4 className="text-sm font-medium mb-2">Affected Appointments:</h4>
                          <div className="space-y-2">
                            {conflict.affectedAppointments.map((apt) => (
                              <div key={apt.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded">
                                <div>
                                  <span className="font-medium">{apt.service_name}</span> - {apt.client_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {format(new Date(apt.start_time), 'h:mm a')}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Solution Options */}
                        <div>
                          <h4 className="text-sm font-medium mb-2">Suggested Solutions:</h4>
                          <div className="space-y-2">
                            {conflict.suggestions.map((solution) => {
                              const isSelected = selectedSolutions.get(conflict.id)?.id === solution.id
                              
                              return (
                                <div
                                  key={solution.id}
                                  onClick={() => handleSolutionSelect(conflict.id, solution)}
                                  className={`
                                    p-3 border rounded-lg cursor-pointer transition-all duration-200
                                    ${isSelected 
                                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                                    }
                                  `}
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      {isSelected && <CheckCircleIcon className="w-4 h-4 text-blue-600" />}
                                      <span className="font-medium text-sm capitalize">
                                        {solution.type.replace('_', ' ')}
                                      </span>
                                    </div>
                                    {renderConfidenceScore(solution.confidence)}
                                  </div>
                                  
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                    {solution.description}
                                  </p>
                                  
                                  <div className="flex items-center justify-between">
                                    <span className={`
                                      text-xs px-2 py-1 rounded-full
                                      ${solution.impact === 'minimal' ? 'bg-green-100 text-green-800' :
                                        solution.impact === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                                        'bg-red-100 text-red-800'}
                                    `}>
                                      {solution.impact} impact
                                    </span>
                                    
                                    {solution.alternativeTimes && solution.alternativeTimes.length > 0 && (
                                      <span className="text-xs text-gray-500">
                                        +{solution.alternativeTimes.length} alternatives
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-4 border-t">
                    <div className="text-sm text-gray-600">
                      {selectedSolutions.size} of {conflicts.length} conflicts have solutions selected
                    </div>
                    
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={onClose}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleResolveConflicts}
                        disabled={selectedSolutions.size === 0 || isProcessing}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isProcessing ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Resolving...
                          </>
                        ) : (
                          <>
                            <CheckCircleIcon className="w-4 h-4 mr-2" />
                            Apply Solutions ({selectedSolutions.size})
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <CheckCircleIcon className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <h3 className="text-lg font-medium text-green-600 mb-2">No Conflicts Detected</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Your schedule looks good! All appointments are properly spaced and within working hours.
                  </p>
                  
                  <Button
                    onClick={detectConflicts}
                    variant="outline"
                    className="mt-4"
                  >
                    <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                    Re-scan for Conflicts
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Optimization Tab */}
          {activeTab === 'optimization' && optimizationResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {optimizationResult.improvements.reducedGaps || 0}
                    </div>
                    <div className="text-sm text-gray-600">Minutes Saved</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Math.round((optimizationResult.improvements.betterUtilization || 0) * 100)}%
                    </div>
                    <div className="text-sm text-gray-600">Utilization</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {optimizationResult.originalSchedule.length}
                    </div>
                    <div className="text-sm text-gray-600">Appointments</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {conflicts.filter(c => c.severity === 'critical' || c.severity === 'high').length}
                    </div>
                    <div className="text-sm text-gray-600">Priority Issues</div>
                  </CardContent>
                </Card>
              </div>

              {optimizationResult.suggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <h3 className="font-medium">Optimization Suggestions</h3>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {optimizationResult.suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <LightBulbIcon className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              <div className="text-center text-gray-500 py-12">
                <CalendarDaysIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Preview of changes will be shown here after selecting solutions</p>
                <p className="text-sm mt-2">
                  Select conflict solutions from the Conflicts tab to see a preview
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Helper functions for generating solutions
function generateOverlapSolutions(apt1: BookingResponse, apt2: BookingResponse, constraints: WorkingConstraints): ConflictSolution[] {
  return [
    {
      id: `reschedule_${apt2.id}`,
      type: 'reschedule',
      description: `Reschedule ${apt2.service_name} to the next available slot`,
      confidence: 0.9,
      impact: 'minimal',
      affectedAppointments: [apt2.id],
      proposedChanges: [{
        appointmentId: apt2.id,
        action: 'reschedule',
        newStartTime: addMinutes(new Date(apt1.end_time || addMinutes(new Date(apt1.start_time), apt1.duration || 60)), constraints.bufferTime)
      }]
    },
    {
      id: `shorten_${apt1.id}`,
      type: 'reschedule',
      description: `Shorten ${apt1.service_name} to eliminate overlap`,
      confidence: 0.7,
      impact: 'moderate',
      affectedAppointments: [apt1.id],
      proposedChanges: [{
        appointmentId: apt1.id,
        action: 'modify',
        newEndTime: addMinutes(new Date(apt2.start_time), -constraints.bufferTime)
      }]
    }
  ]
}

function generateGapSolutions(apt1: BookingResponse, apt2: BookingResponse, constraints: WorkingConstraints, shortfall: number): ConflictSolution[] {
  return [
    {
      id: `extend_gap_${apt1.id}_${apt2.id}`,
      type: 'extend_gap',
      description: `Move ${apt2.service_name} ${Math.ceil(shortfall)} minutes later`,
      confidence: 0.8,
      impact: 'minimal',
      affectedAppointments: [apt2.id],
      proposedChanges: [{
        appointmentId: apt2.id,
        action: 'reschedule',
        newStartTime: addMinutes(new Date(apt2.start_time), Math.ceil(shortfall))
      }]
    }
  ]
}

function generateAfterHoursSolutions(apt: BookingResponse, constraints: WorkingConstraints): ConflictSolution[] {
  return [
    {
      id: `move_to_next_day_${apt.id}`,
      type: 'move_to_another_day',
      description: 'Move to next working day at the same time',
      confidence: 0.8,
      impact: 'moderate',
      affectedAppointments: [apt.id],
      proposedChanges: [{
        appointmentId: apt.id,
        action: 'reschedule',
        newDate: addMinutes(new Date(apt.start_time), 24 * 60) // Simplified
      }]
    }
  ]
}

function generateBreakConflictSolutions(apt: BookingResponse, constraints: WorkingConstraints, breakTime: { start: string; end: string }): ConflictSolution[] {
  return [
    {
      id: `reschedule_after_break_${apt.id}`,
      type: 'reschedule',
      description: `Reschedule to after break time (${breakTime.end})`,
      confidence: 0.9,
      impact: 'moderate',
      affectedAppointments: [apt.id],
      proposedChanges: [{
        appointmentId: apt.id,
        action: 'reschedule',
        newStartTime: new Date(`${format(new Date(apt.start_time), 'yyyy-MM-dd')}T${breakTime.end}:00`)
      }]
    }
  ]
}

function generateDoubleBookingSolutions(apts: BookingResponse[], constraints: WorkingConstraints): ConflictSolution[] {
  return [
    {
      id: `reschedule_second_${apts[1].id}`,
      type: 'reschedule',
      description: `Reschedule the second ${apts[1].service_name} appointment`,
      confidence: 0.9,
      impact: 'moderate',
      affectedAppointments: [apts[1].id],
      proposedChanges: [{
        appointmentId: apts[1].id,
        action: 'reschedule',
        newStartTime: addMinutes(new Date(apts[0].end_time || addMinutes(new Date(apts[0].start_time), apts[0].duration || 60)), constraints.bufferTime)
      }]
    }
  ]
}

export default ConflictResolver