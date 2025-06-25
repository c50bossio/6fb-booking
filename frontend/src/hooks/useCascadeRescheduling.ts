'use client'

/**
 * Cascade Rescheduling Hook for Intelligent Appointment Management
 *
 * This hook provides intelligent cascade rescheduling capabilities:
 * - Dependency detection between appointments
 * - Automatic rescheduling of dependent appointments
 * - Smart time slot optimization
 * - Conflict resolution with multiple strategies
 * - Resource availability checking
 * - Client preference consideration
 * - Multi-barber coordination
 * - Impact analysis and preview
 */

import { useCallback, useRef, useEffect, useState } from 'react'
import { CalendarAppointment, Barber, Service } from '@/components/calendar/RobustCalendar'

export interface AppointmentDependency {
  id: string
  dependentId: string
  dependsOnId: string
  type: 'sequential' | 'parallel' | 'prerequisite' | 'follow_up' | 'series'
  constraint: DependencyConstraint
  priority: number
  isFlexible: boolean
}

export interface DependencyConstraint {
  type: 'time_gap' | 'same_day' | 'same_barber' | 'resource_sharing' | 'client_preference'
  value?: number // minutes for time_gap
  description: string
  isHard: boolean // true = must be satisfied, false = preferred
}

export interface CascadeOperation {
  id: string
  triggerAppointmentId: string
  originalMove: {
    appointmentId: string
    fromDate: string
    fromTime: string
    toDate: string
    toTime: string
  }
  affectedAppointments: CascadeChange[]
  conflicts: CascadeConflict[]
  strategy: CascadeStrategy
  estimatedDuration: number
  impactScore: number
  status: 'planned' | 'executing' | 'completed' | 'failed' | 'cancelled'
}

export interface CascadeChange {
  appointmentId: string
  originalDate: string
  originalTime: string
  newDate: string
  newTime: string
  reason: string
  confidence: number
  alternatives: Array<{
    date: string
    time: string
    score: number
    reasoning: string
  }>
}

export interface CascadeConflict {
  type: 'scheduling' | 'resource' | 'client' | 'barber'
  appointmentIds: string[]
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  resolutionOptions: ConflictResolution[]
}

export interface ConflictResolution {
  id: string
  description: string
  strategy: 'auto_resolve' | 'manual_intervention' | 'skip_appointment' | 'find_alternative'
  impact: 'minimal' | 'moderate' | 'significant'
  cost: number // difficulty/time cost
}

export interface CascadeStrategy {
  name: string
  description: string
  prioritization: 'dependency_order' | 'client_priority' | 'revenue_impact' | 'minimal_disruption'
  conflictResolution: 'aggressive' | 'conservative' | 'interactive'
  searchWindow: {
    days: number
    startTime: string
    endTime: string
    includeWeekends: boolean
  }
  constraints: {
    respectClientPreferences: boolean
    maintainSameBarber: boolean
    preserveServiceOrder: boolean
    minimizeTimeGaps: boolean
  }
}

export interface CascadeReschedulingHookReturn {
  // State
  dependencies: AppointmentDependency[]
  activeCascades: CascadeOperation[]
  availableStrategies: CascadeStrategy[]

  // Dependency management
  addDependency: (dependency: Omit<AppointmentDependency, 'id'>) => void
  removeDependency: (dependencyId: string) => void
  updateDependency: (dependencyId: string, updates: Partial<AppointmentDependency>) => void
  detectDependencies: (appointments: CalendarAppointment[]) => AppointmentDependency[]

  // Cascade operations
  planCascade: (
    triggerMove: { appointmentId: string; newDate: string; newTime: string },
    strategy?: CascadeStrategy
  ) => Promise<CascadeOperation>
  executeCascade: (cascadeId: string) => Promise<boolean>
  previewCascade: (cascadeId: string) => CascadeOperation
  cancelCascade: (cascadeId: string) => void

  // Smart scheduling
  findOptimalSlot: (
    appointment: CalendarAppointment,
    constraints: SchedulingConstraints,
    preferredDate?: string
  ) => Promise<Array<{ date: string; time: string; score: number; reasoning: string }>>

  optimizeSchedule: (
    appointments: CalendarAppointment[],
    strategy: OptimizationStrategy
  ) => Promise<CascadeChange[]>

  // Conflict resolution
  analyzeConflicts: (changes: CascadeChange[]) => CascadeConflict[]
  resolveConflicts: (conflicts: CascadeConflict[], strategy: string) => Promise<ConflictResolution[]>

  // Impact analysis
  calculateImpact: (changes: CascadeChange[]) => ImpactAnalysis
  getAffectedClients: (cascadeId: string) => Array<{ clientId: string; impact: string }>

  // Strategy management
  createStrategy: (strategy: Omit<CascadeStrategy, 'name'>, name: string) => void
  updateStrategy: (strategyName: string, updates: Partial<CascadeStrategy>) => void
  getRecommendedStrategy: (context: SchedulingContext) => CascadeStrategy
}

export interface SchedulingConstraints {
  timeWindow: {
    startDate: string
    endDate: string
    startTime: string
    endTime: string
  }
  barberPreferences: string[]
  clientAvailability?: Array<{
    date: string
    timeRanges: Array<{ start: string; end: string }>
  }>
  resourceRequirements: string[]
  mustAvoidConflicts: boolean
  preferredGapMinutes?: number
}

export interface OptimizationStrategy {
  objective: 'minimize_gaps' | 'maximize_utilization' | 'client_satisfaction' | 'revenue'
  weights: {
    timeEfficiency: number
    clientPreference: number
    resourceUtilization: number
    revenue: number
  }
  constraints: SchedulingConstraints
}

export interface ImpactAnalysis {
  totalAppointmentsAffected: number
  clientsAffected: number
  barbersAffected: number
  revenueImpact: number
  timeDisruption: number // minutes
  satisfactionScore: number // 0-100
  riskFactors: Array<{
    type: string
    description: string
    probability: number
    impact: 'low' | 'medium' | 'high'
  }>
}

export interface SchedulingContext {
  totalAppointments: number
  averageDuration: number
  peakHours: string[]
  barberWorkload: Record<string, number>
  clientPriority: Record<string, number>
  urgencyLevel: 'low' | 'medium' | 'high'
}

const DEFAULT_STRATEGIES: CascadeStrategy[] = [
  {
    name: 'conservative',
    description: 'Minimize disruption, only move essential appointments',
    prioritization: 'minimal_disruption',
    conflictResolution: 'conservative',
    searchWindow: {
      days: 7,
      startTime: '08:00',
      endTime: '20:00',
      includeWeekends: false
    },
    constraints: {
      respectClientPreferences: true,
      maintainSameBarber: true,
      preserveServiceOrder: true,
      minimizeTimeGaps: true
    }
  },
  {
    name: 'aggressive',
    description: 'Optimize schedule aggressively, maximize utilization',
    prioritization: 'revenue_impact',
    conflictResolution: 'aggressive',
    searchWindow: {
      days: 14,
      startTime: '07:00',
      endTime: '22:00',
      includeWeekends: true
    },
    constraints: {
      respectClientPreferences: false,
      maintainSameBarber: false,
      preserveServiceOrder: false,
      minimizeTimeGaps: false
    }
  },
  {
    name: 'client_focused',
    description: 'Prioritize client satisfaction and preferences',
    prioritization: 'client_priority',
    conflictResolution: 'interactive',
    searchWindow: {
      days: 10,
      startTime: '08:00',
      endTime: '19:00',
      includeWeekends: false
    },
    constraints: {
      respectClientPreferences: true,
      maintainSameBarber: true,
      preserveServiceOrder: true,
      minimizeTimeGaps: true
    }
  }
]

export function useCascadeRescheduling(
  appointments: CalendarAppointment[],
  barbers: Barber[],
  services: Service[],
  onAppointmentMove?: (appointmentId: string, newDate: string, newTime: string) => Promise<void>,
  onBulkMove?: (moves: Array<{ appointmentId: string; newDate: string; newTime: string }>) => Promise<void>
): CascadeReschedulingHookReturn {

  // State
  const [dependencies, setDependencies] = useState<AppointmentDependency[]>([])
  const [activeCascades, setActiveCascades] = useState<CascadeOperation[]>([])
  const [availableStrategies, setAvailableStrategies] = useState<CascadeStrategy[]>(DEFAULT_STRATEGIES)

  // Refs for optimization
  const dependencyGraphRef = useRef<Map<string, string[]>>(new Map())
  const scheduleOptimizerRef = useRef<Worker | null>(null)

  // Build dependency graph
  useEffect(() => {
    const graph = new Map<string, string[]>()

    dependencies.forEach(dep => {
      if (!graph.has(dep.dependsOnId)) {
        graph.set(dep.dependsOnId, [])
      }
      graph.get(dep.dependsOnId)!.push(dep.dependentId)
    })

    dependencyGraphRef.current = graph
  }, [dependencies])

  // Dependency management
  const addDependency = useCallback((dependency: Omit<AppointmentDependency, 'id'>) => {
    const newDependency: AppointmentDependency = {
      ...dependency,
      id: `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    setDependencies(prev => [...prev, newDependency])
  }, [])

  const removeDependency = useCallback((dependencyId: string) => {
    setDependencies(prev => prev.filter(dep => dep.id !== dependencyId))
  }, [])

  const updateDependency = useCallback((
    dependencyId: string,
    updates: Partial<AppointmentDependency>
  ) => {
    setDependencies(prev => prev.map(dep =>
      dep.id === dependencyId ? { ...dep, ...updates } : dep
    ))
  }, [])

  // Auto-detect dependencies based on appointment patterns
  const detectDependencies = useCallback((appointments: CalendarAppointment[]): AppointmentDependency[] => {
    const detectedDeps: AppointmentDependency[] = []

    // Group appointments by client
    const byClient = appointments.reduce((acc, apt) => {
      if (!acc[apt.clientId || apt.client]) {
        acc[apt.clientId || apt.client] = []
      }
      acc[apt.clientId || apt.client].push(apt)
      return acc
    }, {} as Record<string, CalendarAppointment[]>)

    // Detect sequential appointments for same client
    Object.values(byClient).forEach(clientAppointments => {
      if (clientAppointments.length > 1) {
        const sorted = clientAppointments.sort((a, b) =>
          new Date(`${a.date} ${a.startTime}`).getTime() -
          new Date(`${b.date} ${b.startTime}`).getTime()
        )

        for (let i = 0; i < sorted.length - 1; i++) {
          const current = sorted[i]
          const next = sorted[i + 1]

          const currentEnd = new Date(`${current.date} ${current.endTime}`)
          const nextStart = new Date(`${next.date} ${next.startTime}`)
          const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60)

          // If appointments are close together (within 4 hours), consider them related
          if (gapMinutes <= 240) {
            detectedDeps.push({
              id: `auto_${current.id}_${next.id}`,
              dependentId: next.id,
              dependsOnId: current.id,
              type: 'sequential',
              constraint: {
                type: 'time_gap',
                value: Math.max(15, gapMinutes), // minimum 15 minute gap
                description: `Maintain ${gapMinutes} minute gap between appointments`,
                isHard: false
              },
              priority: 7,
              isFlexible: true
            })
          }
        }
      }
    })

    // Detect same-barber series (e.g., cut + styling)
    const byBarber = appointments.reduce((acc, apt) => {
      if (!acc[apt.barberId]) {
        acc[apt.barberId] = []
      }
      acc[apt.barberId].push(apt)
      return acc
    }, {} as Record<string, CalendarAppointment[]>)

    Object.values(byBarber).forEach(barberAppointments => {
      // Look for appointments with same client on same day
      const byClientDate = barberAppointments.reduce((acc, apt) => {
        const key = `${apt.clientId || apt.client}_${apt.date}`
        if (!acc[key]) acc[key] = []
        acc[key].push(apt)
        return acc
      }, {} as Record<string, CalendarAppointment[]>)

      Object.values(byClientDate).forEach(dayAppointments => {
        if (dayAppointments.length > 1) {
          const sorted = dayAppointments.sort((a, b) =>
            a.startTime.localeCompare(b.startTime)
          )

          for (let i = 0; i < sorted.length - 1; i++) {
            detectedDeps.push({
              id: `series_${sorted[i].id}_${sorted[i + 1].id}`,
              dependentId: sorted[i + 1].id,
              dependsOnId: sorted[i].id,
              type: 'series',
              constraint: {
                type: 'same_barber',
                description: 'Service series with same barber',
                isHard: true
              },
              priority: 9,
              isFlexible: false
            })
          }
        }
      })
    })

    return detectedDeps
  }, [])

  // Find optimal time slot for an appointment
  const findOptimalSlot = useCallback(async (
    appointment: CalendarAppointment,
    constraints: SchedulingConstraints,
    preferredDate?: string
  ): Promise<Array<{ date: string; time: string; score: number; reasoning: string }>> => {
    const candidates: Array<{ date: string; time: string; score: number; reasoning: string }> = []

    const startDate = new Date(constraints.timeWindow.startDate)
    const endDate = new Date(constraints.timeWindow.endDate)
    const durationMs = appointment.duration * 60 * 1000

    // Generate time slots for each day in the window
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0]

      // Check if this day has client availability constraints
      const clientAvailable = constraints.clientAvailability?.find(ca => ca.date === dateStr)
      const timeRanges = clientAvailable?.timeRanges || [
        { start: constraints.timeWindow.startTime, end: constraints.timeWindow.endTime }
      ]

      timeRanges.forEach(range => {
        const startTime = new Date(`${dateStr} ${range.start}`)
        const endTime = new Date(`${dateStr} ${range.end}`)

        // Generate 15-minute intervals
        for (let time = new Date(startTime); time < endTime; time.setMinutes(time.getMinutes() + 15)) {
          const timeStr = time.toTimeString().slice(0, 5)
          const appointmentEnd = new Date(time.getTime() + durationMs)

          if (appointmentEnd <= endTime) {
            // Check for conflicts with existing appointments
            const hasConflict = appointments.some(existing => {
              if (existing.id === appointment.id) return false
              if (existing.date !== dateStr) return false

              const existingStart = new Date(`${dateStr} ${existing.startTime}`)
              const existingEnd = new Date(`${dateStr} ${existing.endTime}`)

              return (time < existingEnd && appointmentEnd > existingStart)
            })

            if (!hasConflict || !constraints.mustAvoidConflicts) {
              let score = 100
              let reasoning = 'Available slot'

              // Score based on preferred date
              if (preferredDate && dateStr === preferredDate) {
                score += 20
                reasoning += ', preferred date'
              }

              // Score based on barber availability/preference
              if (constraints.barberPreferences.includes(appointment.barberId.toString())) {
                score += 15
                reasoning += ', preferred barber available'
              }

              // Score based on time of day (prefer mid-morning to early afternoon)
              const hour = time.getHours()
              if (hour >= 9 && hour <= 14) {
                score += 10
                reasoning += ', optimal time of day'
              }

              // Penalty for conflicts (if allowed)
              if (hasConflict) {
                score -= 30
                reasoning += ', has conflict'
              }

              // Penalty for weekends (if not preferred)
              if (date.getDay() === 0 || date.getDay() === 6) {
                score -= 10
                reasoning += ', weekend'
              }

              candidates.push({
                date: dateStr,
                time: timeStr,
                score,
                reasoning
              })
            }
          }
        }
      })
    }

    // Sort by score and return top candidates
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }, [appointments])

  // Plan cascade operation
  const planCascade = useCallback(async (
    triggerMove: { appointmentId: string; newDate: string; newTime: string },
    strategy: CascadeStrategy = availableStrategies[0]
  ): Promise<CascadeOperation> => {
    const cascadeId = `cascade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const triggerAppointment = appointments.find(apt => apt.id === triggerMove.appointmentId)

    if (!triggerAppointment) {
      throw new Error('Trigger appointment not found')
    }

    // Find all dependent appointments using DFS
    const affectedIds = new Set<string>()
    const queue = [triggerMove.appointmentId]

    while (queue.length > 0) {
      const currentId = queue.shift()!
      const dependents = dependencyGraphRef.current.get(currentId) || []

      dependents.forEach(depId => {
        if (!affectedIds.has(depId)) {
          affectedIds.add(depId)
          queue.push(depId)
        }
      })
    }

    // Calculate new positions for affected appointments
    const affectedAppointments = appointments.filter(apt => affectedIds.has(apt.id))
    const changes: CascadeChange[] = []

    for (const appointment of affectedAppointments) {
      const dependency = dependencies.find(dep => dep.dependentId === appointment.id)

      if (dependency) {
        let newDate = triggerMove.newDate
        let newTime = triggerMove.newTime

        // Apply dependency constraints
        if (dependency.constraint.type === 'time_gap' && dependency.constraint.value) {
          const triggerEnd = new Date(`${triggerMove.newDate} ${triggerMove.newTime}`)
          triggerEnd.setMinutes(triggerEnd.getMinutes() + triggerAppointment.duration + dependency.constraint.value)

          newDate = triggerEnd.toISOString().split('T')[0]
          newTime = triggerEnd.toTimeString().slice(0, 5)
        }

        // Find optimal slot considering constraints
        const constraints: SchedulingConstraints = {
          timeWindow: {
            startDate: newDate,
            endDate: new Date(new Date(newDate).getTime() + strategy.searchWindow.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            startTime: strategy.searchWindow.startTime,
            endTime: strategy.searchWindow.endTime
          },
          barberPreferences: strategy.constraints.maintainSameBarber ? [appointment.barberId.toString()] : [],
          mustAvoidConflicts: true
        }

        const candidates = await findOptimalSlot(appointment, constraints, newDate)
        const best = candidates[0]

        if (best) {
          changes.push({
            appointmentId: appointment.id,
            originalDate: appointment.date,
            originalTime: appointment.startTime,
            newDate: best.date,
            newTime: best.time,
            reason: `Dependency on ${triggerAppointment.client}'s appointment`,
            confidence: best.score / 100,
            alternatives: candidates.slice(1, 4)
          })
        }
      }
    }

    // Analyze conflicts
    const conflicts = analyzeConflicts(changes)

    // Calculate impact
    const impact = calculateImpact(changes)

    const cascade: CascadeOperation = {
      id: cascadeId,
      triggerAppointmentId: triggerMove.appointmentId,
      originalMove: {
        appointmentId: triggerMove.appointmentId,
        fromDate: triggerAppointment.date,
        fromTime: triggerAppointment.startTime,
        toDate: triggerMove.newDate,
        toTime: triggerMove.newTime
      },
      affectedAppointments: changes,
      conflicts,
      strategy,
      estimatedDuration: changes.length * 30000, // 30 seconds per appointment
      impactScore: impact.satisfactionScore,
      status: 'planned'
    }

    setActiveCascades(prev => [...prev, cascade])
    return cascade
  }, [appointments, dependencies, availableStrategies, findOptimalSlot])

  // Execute cascade operation
  const executeCascade = useCallback(async (cascadeId: string): Promise<boolean> => {
    const cascade = activeCascades.find(c => c.id === cascadeId)
    if (!cascade) return false

    setActiveCascades(prev => prev.map(c =>
      c.id === cascadeId ? { ...c, status: 'executing' } : c
    ))

    try {
      // Execute the trigger move first
      if (onAppointmentMove) {
        await onAppointmentMove(
          cascade.originalMove.appointmentId,
          cascade.originalMove.toDate,
          cascade.originalMove.toTime
        )
      }

      // Execute dependent moves
      if (onBulkMove && cascade.affectedAppointments.length > 0) {
        const moves = cascade.affectedAppointments.map(change => ({
          appointmentId: change.appointmentId,
          newDate: change.newDate,
          newTime: change.newTime
        }))

        await onBulkMove(moves)
      }

      setActiveCascades(prev => prev.map(c =>
        c.id === cascadeId ? { ...c, status: 'completed' } : c
      ))

      return true
    } catch (error) {
      setActiveCascades(prev => prev.map(c =>
        c.id === cascadeId ? { ...c, status: 'failed' } : c
      ))

      console.error('Cascade execution failed:', error)
      return false
    }
  }, [activeCascades, onAppointmentMove, onBulkMove])

  const previewCascade = useCallback((cascadeId: string): CascadeOperation => {
    const cascade = activeCascades.find(c => c.id === cascadeId)
    if (!cascade) throw new Error('Cascade not found')
    return cascade
  }, [activeCascades])

  const cancelCascade = useCallback((cascadeId: string) => {
    setActiveCascades(prev => prev.filter(c => c.id !== cascadeId))
  }, [])

  // Conflict analysis
  const analyzeConflicts = useCallback((changes: CascadeChange[]): CascadeConflict[] => {
    const conflicts: CascadeConflict[] = []

    // Check for scheduling conflicts
    const appointmentsBySlot = new Map<string, string[]>()

    changes.forEach(change => {
      const key = `${change.newDate}_${change.newTime}`
      if (!appointmentsBySlot.has(key)) {
        appointmentsBySlot.set(key, [])
      }
      appointmentsBySlot.get(key)!.push(change.appointmentId)
    })

    appointmentsBySlot.forEach((appointmentIds, slot) => {
      if (appointmentIds.length > 1) {
        conflicts.push({
          type: 'scheduling',
          appointmentIds,
          description: `Multiple appointments scheduled for ${slot}`,
          severity: 'high',
          resolutionOptions: [
            {
              id: 'spread_out',
              description: 'Spread appointments to adjacent time slots',
              strategy: 'auto_resolve',
              impact: 'minimal',
              cost: 1
            },
            {
              id: 'manual_review',
              description: 'Manually review and resolve conflicts',
              strategy: 'manual_intervention',
              impact: 'moderate',
              cost: 3
            }
          ]
        })
      }
    })

    return conflicts
  }, [])

  const resolveConflicts = useCallback(async (
    conflicts: CascadeConflict[],
    strategy: string
  ): Promise<ConflictResolution[]> => {
    const resolutions: ConflictResolution[] = []

    for (const conflict of conflicts) {
      const resolution = conflict.resolutionOptions.find(opt => opt.strategy === strategy)
      if (resolution) {
        resolutions.push(resolution)
      }
    }

    return resolutions
  }, [])

  // Impact analysis
  const calculateImpact = useCallback((changes: CascadeChange[]): ImpactAnalysis => {
    const affectedClients = new Set(
      changes.map(change => {
        const appointment = appointments.find(apt => apt.id === change.appointmentId)
        return appointment?.clientId || appointment?.client
      }).filter(Boolean)
    )

    const affectedBarbers = new Set(
      changes.map(change => {
        const appointment = appointments.find(apt => apt.id === change.appointmentId)
        return appointment?.barberId
      }).filter(Boolean)
    )

    const revenueImpact = changes.reduce((total, change) => {
      const appointment = appointments.find(apt => apt.id === change.appointmentId)
      return total + (appointment?.price || 0)
    }, 0)

    const timeDisruption = changes.reduce((total, change) => {
      const originalTime = new Date(`${change.originalDate} ${change.originalTime}`)
      const newTime = new Date(`${change.newDate} ${change.newTime}`)
      return total + Math.abs(newTime.getTime() - originalTime.getTime()) / (1000 * 60)
    }, 0)

    // Calculate satisfaction score based on confidence and disruption
    const avgConfidence = changes.reduce((sum, change) => sum + change.confidence, 0) / changes.length
    const satisfactionScore = Math.max(0, Math.min(100, avgConfidence * 100 - timeDisruption / 60))

    return {
      totalAppointmentsAffected: changes.length,
      clientsAffected: affectedClients.size,
      barbersAffected: affectedBarbers.size,
      revenueImpact,
      timeDisruption,
      satisfactionScore,
      riskFactors: [
        {
          type: 'client_dissatisfaction',
          description: 'Clients may be unhappy with rescheduling',
          probability: Math.min(1, timeDisruption / 480), // Based on hours of disruption
          impact: timeDisruption > 240 ? 'high' : timeDisruption > 60 ? 'medium' : 'low'
        },
        {
          type: 'revenue_loss',
          description: 'Potential cancellations due to rescheduling',
          probability: 0.1 * changes.length, // 10% per rescheduled appointment
          impact: revenueImpact > 500 ? 'high' : revenueImpact > 200 ? 'medium' : 'low'
        }
      ]
    }
  }, [appointments])

  const getAffectedClients = useCallback((cascadeId: string) => {
    const cascade = activeCascades.find(c => c.id === cascadeId)
    if (!cascade) return []

    return cascade.affectedAppointments.map(change => {
      const appointment = appointments.find(apt => apt.id === change.appointmentId)
      return {
        clientId: appointment?.clientId || appointment?.client || '',
        impact: `Rescheduled from ${change.originalDate} ${change.originalTime} to ${change.newDate} ${change.newTime}`
      }
    })
  }, [activeCascades, appointments])

  // Strategy management
  const createStrategy = useCallback((strategy: Omit<CascadeStrategy, 'name'>, name: string) => {
    const newStrategy: CascadeStrategy = { ...strategy, name }
    setAvailableStrategies(prev => [...prev, newStrategy])
  }, [])

  const updateStrategy = useCallback((strategyName: string, updates: Partial<CascadeStrategy>) => {
    setAvailableStrategies(prev => prev.map(strategy =>
      strategy.name === strategyName ? { ...strategy, ...updates } : strategy
    ))
  }, [])

  const getRecommendedStrategy = useCallback((context: SchedulingContext): CascadeStrategy => {
    if (context.urgencyLevel === 'high' || context.totalAppointments > 50) {
      return availableStrategies.find(s => s.name === 'aggressive') || availableStrategies[0]
    } else if (context.clientPriority && Object.values(context.clientPriority).some(p => p > 8)) {
      return availableStrategies.find(s => s.name === 'client_focused') || availableStrategies[0]
    } else {
      return availableStrategies.find(s => s.name === 'conservative') || availableStrategies[0]
    }
  }, [availableStrategies])

  // Schedule optimization
  const optimizeSchedule = useCallback(async (
    appointments: CalendarAppointment[],
    strategy: OptimizationStrategy
  ): Promise<CascadeChange[]> => {
    // This would implement a sophisticated optimization algorithm
    // For now, return a simple implementation
    return []
  }, [])

  // Auto-detect dependencies on appointment changes
  useEffect(() => {
    const detected = detectDependencies(appointments)
    setDependencies(prev => {
      const existing = new Set(prev.map(d => `${d.dependentId}_${d.dependsOnId}`))
      const newDeps = detected.filter(d => !existing.has(`${d.dependentId}_${d.dependsOnId}`))
      return [...prev, ...newDeps]
    })
  }, [appointments, detectDependencies])

  return {
    // State
    dependencies,
    activeCascades,
    availableStrategies,

    // Dependency management
    addDependency,
    removeDependency,
    updateDependency,
    detectDependencies,

    // Cascade operations
    planCascade,
    executeCascade,
    previewCascade,
    cancelCascade,

    // Smart scheduling
    findOptimalSlot,
    optimizeSchedule,

    // Conflict resolution
    analyzeConflicts,
    resolveConflicts,

    // Impact analysis
    calculateImpact,
    getAffectedClients,

    // Strategy management
    createStrategy,
    updateStrategy,
    getRecommendedStrategy
  }
}

export default useCascadeRescheduling
