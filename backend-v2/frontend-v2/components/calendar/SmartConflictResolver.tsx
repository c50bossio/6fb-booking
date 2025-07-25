'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { format, addMinutes, addHours, isSameDay, parseISO, isAfter, isBefore } from 'date-fns'
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  ClockIcon,
  ArrowRightIcon,
  XMarkIcon,
  LightBulbIcon,
  CalendarIcon,
  UserIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCalendar, CalendarConflict, ConflictResolution, CalendarAppointment } from '@/contexts/CalendarContext'
import { cn } from '@/lib/utils'

interface SmartConflictResolverProps {
  className?: string
  showAutoResolve?: boolean
  onConflictResolved?: (conflictId: string, resolution: ConflictResolution) => void
}

export default function SmartConflictResolver({
  className,
  showAutoResolve = true,
  onConflictResolved
}: SmartConflictResolverProps) {
  const { state, actions } = useCalendar()
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null)
  const [resolvingConflict, setResolvingConflict] = useState<string | null>(null)

  // Auto-detect conflicts from appointments
  const detectedConflicts = useMemo(() => {
    const conflicts: CalendarConflict[] = []
    const appointments = state.appointments

    // Check for overlapping appointments
    for (let i = 0; i < appointments.length; i++) {
      for (let j = i + 1; j < appointments.length; j++) {
        const apt1 = appointments[i]
        const apt2 = appointments[j]

        // Skip if different barbers
        if (apt1.barber_id !== apt2.barber_id) continue

        const start1 = parseISO(apt1.start_time)
        const end1 = addMinutes(start1, apt1.duration_minutes || 60)
        const start2 = parseISO(apt2.start_time)
        const end2 = addMinutes(start2, apt2.duration_minutes || 60)

        // Check for overlap
        if ((isAfter(start1, start2) && isBefore(start1, end2)) ||
            (isAfter(start2, start1) && isBefore(start2, end1))) {
          
          const conflict: CalendarConflict = {
            id: `overlap-${apt1.id}-${apt2.id}`,
            type: 'overlap',
            severity: 'high',
            description: `${apt1.client_name} and ${apt2.client_name} have overlapping appointments`,
            affectedAppointments: [apt1.id.toString(), apt2.id.toString()],
            suggestedResolutions: generateResolutions(apt1, apt2, appointments),
            autoResolvable: true
          }

          conflicts.push(conflict)
        }
      }
    }

    // Check for business hours violations
    appointments.forEach(apt => {
      const startTime = parseISO(apt.start_time)
      const hour = startTime.getHours()
      
      if (hour < state.settings.startHour || hour >= state.settings.endHour) {
        conflicts.push({
          id: `business-hours-${apt.id}`,
          type: 'business-hours',
          severity: 'medium',
          description: `${apt.client_name}'s appointment is outside business hours`,
          affectedAppointments: [apt.id.toString()],
          suggestedResolutions: generateBusinessHoursResolutions(apt),
          autoResolvable: false
        })
      }
    })

    return conflicts
  }, [state.appointments, state.settings])

  // Update conflicts in state when detected
  useEffect(() => {
    if (detectedConflicts.length !== state.conflicts.length) {
      actions.setConflicts(detectedConflicts)
    }
  }, [detectedConflicts, state.conflicts.length, actions])

  // Generate resolution suggestions
  const generateResolutions = useCallback((
    apt1: CalendarAppointment, 
    apt2: CalendarAppointment, 
    allAppointments: CalendarAppointment[]
  ): ConflictResolution[] => {
    const resolutions: ConflictResolution[] = []
    const start1 = parseISO(apt1.start_time)
    const start2 = parseISO(apt2.start_time)
    const duration1 = apt1.duration_minutes || 60
    const duration2 = apt2.duration_minutes || 60

    // Option 1: Move later appointment after the first one
    const laterApt = isAfter(start2, start1) ? apt2 : apt1
    const earlierApt = isAfter(start2, start1) ? apt1 : apt2
    const earlierDuration = isAfter(start2, start1) ? duration1 : duration2
    
    const newStartTime = addMinutes(parseISO(earlierApt.start_time), earlierDuration + 15) // 15 min buffer
    
    resolutions.push({
      id: `reschedule-${laterApt.id}`,
      type: 'reschedule',
      description: `Move ${laterApt.client_name} to ${format(newStartTime, 'h:mm a')}`,
      impact: `15 minutes later than current time`,
      confidence: 0.85,
      newStartTime: newStartTime.toISOString(),
      cost: 0,
      automatedFix: true
    })

    // Option 2: Reduce duration of first appointment
    if (duration1 > 30) {
      resolutions.push({
        id: `reduce-duration-${apt1.id}`,
        type: 'extend-duration',
        description: `Reduce ${apt1.client_name}'s appointment by 15 minutes`,
        impact: `Shorter service time, may affect quality`,
        confidence: 0.6,
        cost: apt1.total_price ? apt1.total_price * 0.1 : 0,
        automatedFix: false
      })
    }

    // Option 3: Find alternative barber
    const availableBarbers = state.barbers.filter(barber => 
      barber.id !== apt1.barber_id && 
      !isBarberBusy(barber.id, start1, duration1, allAppointments)
    )

    if (availableBarbers.length > 0) {
      resolutions.push({
        id: `change-barber-${apt1.id}`,
        type: 'change-barber',
        description: `Assign ${apt1.client_name} to ${availableBarbers[0].name || 'available barber'}`,
        impact: `Different barber, maintain same time`,
        confidence: 0.75,
        alternativeBarber: availableBarbers[0].id,
        cost: 0,
        automatedFix: true
      })
    }

    return resolutions.sort((a, b) => b.confidence - a.confidence)
  }, [state.barbers])

  const generateBusinessHoursResolutions = useCallback((apt: CalendarAppointment): ConflictResolution[] => {
    const startTime = parseISO(apt.start_time)
    const hour = startTime.getHours()
    const resolutions: ConflictResolution[] = []

    if (hour < state.settings.startHour) {
      // Move to opening time
      const newTime = new Date(startTime)
      newTime.setHours(state.settings.startHour, 0, 0, 0)
      
      resolutions.push({
        id: `move-to-opening-${apt.id}`,
        type: 'reschedule',
        description: `Move to opening time (${state.settings.startHour}:00 AM)`,
        impact: `${state.settings.startHour - hour} hours later`,
        confidence: 0.9,
        newStartTime: newTime.toISOString(),
        cost: 0,
        automatedFix: true
      })
    }

    if (hour >= state.settings.endHour) {
      // Move to next day
      const newTime = new Date(startTime)
      newTime.setDate(newTime.getDate() + 1)
      newTime.setHours(state.settings.startHour, 0, 0, 0)
      
      resolutions.push({
        id: `move-to-next-day-${apt.id}`,
        type: 'reschedule',
        description: `Move to next day at opening time`,
        impact: `Next business day`,
        confidence: 0.7,
        newStartTime: newTime.toISOString(),
        cost: 0,
        automatedFix: false
      })
    }

    return resolutions
  }, [state.settings])

  const isBarberBusy = useCallback((
    barberId: number, 
    startTime: Date, 
    duration: number, 
    appointments: CalendarAppointment[]
  ): boolean => {
    const endTime = addMinutes(startTime, duration)
    
    return appointments.some(apt => {
      if (apt.barber_id !== barberId) return false
      
      const aptStart = parseISO(apt.start_time)
      const aptEnd = addMinutes(aptStart, apt.duration_minutes || 60)
      
      return (isAfter(startTime, aptStart) && isBefore(startTime, aptEnd)) ||
             (isAfter(endTime, aptStart) && isBefore(endTime, aptEnd)) ||
             (isBefore(startTime, aptStart) && isAfter(endTime, aptEnd))
    })
  }, [])

  const handleResolveConflict = async (conflictId: string, resolution: ConflictResolution) => {
    setResolvingConflict(conflictId)
    
    try {
      // Save state before making changes
      actions.saveState()

      // Apply resolution
      switch (resolution.type) {
        case 'reschedule':
          if (resolution.newStartTime) {
            const affectedAppointments = state.conflicts
              .find(c => c.id === conflictId)?.affectedAppointments || []
            
            // Update the appointment that needs to be moved
            for (const aptId of affectedAppointments) {
              actions.updateAppointment(parseInt(aptId), {
                start_time: resolution.newStartTime
              })
            }
          }
          break
          
        case 'change-barber':
          if (resolution.alternativeBarber) {
            const affectedAppointments = state.conflicts
              .find(c => c.id === conflictId)?.affectedAppointments || []
            
            actions.updateAppointment(parseInt(affectedAppointments[0]), {
              barber_id: resolution.alternativeBarber
            })
          }
          break
      }

      // Remove the resolved conflict
      actions.resolveConflict(conflictId, resolution)
      
      // Notify parent component
      onConflictResolved?.(conflictId, resolution)
      
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
      actions.setError('Failed to resolve conflict. Please try again.')
    } finally {
      setResolvingConflict(null)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive'
      case 'medium': return 'warning'
      case 'low': return 'secondary'
      default: return 'secondary'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return ExclamationTriangleIcon
      case 'medium': return ClockIcon
      case 'low': return LightBulbIcon
      default: return LightBulbIcon
    }
  }

  if (state.conflicts.length === 0) {
    return (
      <Alert className={className}>
        <CheckCircleIcon className="h-4 w-4" />
        <AlertDescription>
          No scheduling conflicts detected. All appointments are properly scheduled.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Scheduling Conflicts ({state.conflicts.length})
        </h3>
        {showAutoResolve && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Auto-resolve all conflicts with highest confidence
              state.conflicts.forEach(conflict => {
                const bestResolution = conflict.suggestedResolutions
                  .filter(r => r.automatedFix)
                  .sort((a, b) => b.confidence - a.confidence)[0]
                
                if (bestResolution) {
                  handleResolveConflict(conflict.id, bestResolution)
                }
              })
            }}
          >
            Auto-Resolve All
          </Button>
        )}
      </div>

      {state.conflicts.map((conflict) => {
        const SeverityIcon = getSeverityIcon(conflict.severity)
        const isExpanded = expandedConflict === conflict.id
        const isResolving = resolvingConflict === conflict.id

        return (
          <Card key={conflict.id} className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <SeverityIcon className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <CardTitle className="text-sm font-medium text-gray-900">
                      {conflict.description}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={getSeverityColor(conflict.severity)}>
                        {conflict.severity} priority
                      </Badge>
                      <Badge variant="outline">
                        {conflict.type.replace('-', ' ')}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedConflict(isExpanded ? null : conflict.id)}
                >
                  {isExpanded ? 'Hide' : 'Resolve'}
                </Button>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="text-sm text-gray-600">
                    <strong>Affected appointments:</strong>
                    <div className="mt-1 space-y-1">
                      {conflict.affectedAppointments.map(aptId => {
                        const appointment = state.appointments.find(a => a.id.toString() === aptId)
                        if (!appointment) return null
                        
                        return (
                          <div key={aptId} className="flex items-center space-x-2 text-xs">
                            <UserIcon className="h-3 w-3" />
                            <span>{appointment.client_name}</span>
                            <span>•</span>
                            <span>{format(parseISO(appointment.start_time), 'MMM d, h:mm a')}</span>
                            <span>•</span>
                            <span>{appointment.service_name}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Suggested Resolutions:
                    </h4>
                    <div className="space-y-2">
                      {conflict.suggestedResolutions.map((resolution, index) => (
                        <div
                          key={resolution.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {resolution.description}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {Math.round(resolution.confidence * 100)}% confidence
                              </Badge>
                              {resolution.automatedFix && (
                                <Badge variant="secondary" className="text-xs">
                                  Auto-fix
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {resolution.impact}
                            </p>
                            {resolution.cost > 0 && (
                              <div className="flex items-center space-x-1 mt-1">
                                <CurrencyDollarIcon className="h-3 w-3 text-red-500" />
                                <span className="text-xs text-red-600">
                                  Revenue impact: ${resolution.cost.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={index === 0 ? "default" : "outline"}
                            disabled={isResolving}
                            onClick={() => handleResolveConflict(conflict.id, resolution)}
                            className="ml-3"
                          >
                            {isResolving ? 'Resolving...' : 'Apply'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}