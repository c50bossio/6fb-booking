/**
 * Intelligent Scheduling React Hooks
 * React hooks for AI-powered appointment scheduling optimization
 * Version: 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getSchedulingEngine,
  AppointmentSlot,
  SchedulingPreference,
  SchedulingConstraint,
  SchedulingOptimization,
  SchedulingRecommendation,
  ClientPreference
} from '@/lib/intelligent-scheduling'

interface UseIntelligentSchedulingOptions {
  preferences?: SchedulingPreference
  autoOptimize?: boolean
  optimizationInterval?: number
}

interface UseIntelligentSchedulingResult {
  findOptimalSlots: (
    serviceId: number,
    duration: number,
    preferredDate: Date,
    clientId?: string,
    options?: {
      maxResults?: number
      timeRange?: { start: string; end: string }
      excludeBarbers?: number[]
      preferredBarbers?: number[]
    }
  ) => AppointmentSlot[]
  optimizeSchedule: (
    appointments: any[],
    date: Date,
    constraints?: SchedulingConstraint[]
  ) => SchedulingOptimization
  resolveConflicts: (conflictingAppointments: any[]) => SchedulingRecommendation[]
  predictDemand: (
    date: Date,
    serviceId?: number,
    barberId?: number,
    timeRange?: { start: string; end: string }
  ) => {
    expectedBookings: number
    peakHours: string[]
    recommendedStaffing: number
    confidenceScore: number
  }
  updateClientPreferences: (
    clientId: string,
    appointmentData: {
      barberId: number
      serviceId: number
      timeSlot: Date
      satisfaction?: number
      completed: boolean
    }
  ) => void
  preferences: SchedulingPreference
  updatePreferences: (newPreferences: Partial<SchedulingPreference>) => void
  isOptimizing: boolean
  lastOptimization: Date | null
}

export function useIntelligentScheduling(
  options: UseIntelligentSchedulingOptions = {}
): UseIntelligentSchedulingResult {
  const {
    preferences: initialPreferences = {},
    autoOptimize = false,
    optimizationInterval = 300000 // 5 minutes
  } = options

  const [preferences, setPreferences] = useState<SchedulingPreference>(initialPreferences)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [lastOptimization, setLastOptimization] = useState<Date | null>(null)

  const schedulingEngine = useMemo(() => getSchedulingEngine(preferences), [preferences])

  const findOptimalSlots = useCallback((
    serviceId: number,
    duration: number,
    preferredDate: Date,
    clientId?: string,
    options: {
      maxResults?: number
      timeRange?: { start: string; end: string }
      excludeBarbers?: number[]
      preferredBarbers?: number[]
    } = {}
  ): AppointmentSlot[] => {
    return schedulingEngine.findOptimalSlots(
      serviceId,
      duration,
      preferredDate,
      clientId,
      options
    )
  }, [schedulingEngine])

  const optimizeSchedule = useCallback((
    appointments: any[],
    date: Date,
    constraints: SchedulingConstraint[] = []
  ): SchedulingOptimization => {
    setIsOptimizing(true)
    
    try {
      const optimization = schedulingEngine.optimizeSchedule(appointments, date, constraints)
      setLastOptimization(new Date())
      return optimization
    } finally {
      setIsOptimizing(false)
    }
  }, [schedulingEngine])

  const resolveConflicts = useCallback((
    conflictingAppointments: any[]
  ): SchedulingRecommendation[] => {
    return schedulingEngine.resolveSchedulingConflicts(conflictingAppointments)
  }, [schedulingEngine])

  const predictDemand = useCallback((
    date: Date,
    serviceId?: number,
    barberId?: number,
    timeRange?: { start: string; end: string }
  ) => {
    return schedulingEngine.predictDemand(date, serviceId, barberId, timeRange)
  }, [schedulingEngine])

  const updateClientPreferences = useCallback((
    clientId: string,
    appointmentData: {
      barberId: number
      serviceId: number
      timeSlot: Date
      satisfaction?: number
      completed: boolean
    }
  ) => {
    schedulingEngine.updateClientPreferences(clientId, appointmentData)
  }, [schedulingEngine])

  const updatePreferences = useCallback((newPreferences: Partial<SchedulingPreference>) => {
    setPreferences(prev => ({ ...prev, ...newPreferences }))
  }, [])

  // Auto-optimization effect
  useEffect(() => {
    if (!autoOptimize) return

    const interval = setInterval(() => {
      // This would typically be triggered by calendar changes
      // For now, we just update the last optimization timestamp
      setLastOptimization(new Date())
    }, optimizationInterval)

    return () => clearInterval(interval)
  }, [autoOptimize, optimizationInterval])

  return {
    findOptimalSlots,
    optimizeSchedule,
    resolveConflicts,
    predictDemand,
    updateClientPreferences,
    preferences,
    updatePreferences,
    isOptimizing,
    lastOptimization
  }
}

interface UseOptimalSlotsOptions {
  serviceId: number
  duration: number
  preferredDate: Date
  clientId?: string
  maxResults?: number
  timeRange?: { start: string; end: string }
  excludeBarbers?: number[]
  preferredBarbers?: number[]
  autoRefresh?: boolean
  refreshInterval?: number
}

export function useOptimalSlots(options: UseOptimalSlotsOptions) {
  const {
    serviceId,
    duration,
    preferredDate,
    clientId,
    maxResults = 10,
    timeRange,
    excludeBarbers,
    preferredBarbers,
    autoRefresh = false,
    refreshInterval = 60000 // 1 minute
  } = options

  const { findOptimalSlots } = useIntelligentScheduling()
  
  const [slots, setSlots] = useState<AppointmentSlot[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const refreshSlots = useCallback(async () => {
    setIsLoading(true)
    try {
      const optimalSlots = findOptimalSlots(
        serviceId,
        duration,
        preferredDate,
        clientId,
        {
          maxResults,
          timeRange,
          excludeBarbers,
          preferredBarbers
        }
      )
      setSlots(optimalSlots)
      setLastUpdate(new Date())
    } finally {
      setIsLoading(false)
    }
  }, [
    findOptimalSlots,
    serviceId,
    duration,
    preferredDate,
    clientId,
    maxResults,
    timeRange,
    excludeBarbers,
    preferredBarbers
  ])

  // Initial load and dependency updates
  useEffect(() => {
    refreshSlots()
  }, [refreshSlots])

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(refreshSlots, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refreshSlots])

  return {
    slots,
    isLoading,
    lastUpdate,
    refreshSlots
  }
}

interface UseScheduleOptimizationOptions {
  appointments: any[]
  date: Date
  constraints?: SchedulingConstraint[]
  autoOptimize?: boolean
  optimizationTriggers?: ('appointments_change' | 'time_interval' | 'manual')[]
}

export function useScheduleOptimization(options: UseScheduleOptimizationOptions) {
  const {
    appointments,
    date,
    constraints = [],
    autoOptimize = true,
    optimizationTriggers = ['appointments_change', 'time_interval']
  } = options

  const { optimizeSchedule, isOptimizing: engineOptimizing } = useIntelligentScheduling({
    autoOptimize
  })

  const [optimization, setOptimization] = useState<SchedulingOptimization | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [lastOptimized, setLastOptimized] = useState<Date | null>(null)

  const runOptimization = useCallback(async () => {
    if (appointments.length === 0) return

    setIsOptimizing(true)
    try {
      const result = optimizeSchedule(appointments, date, constraints)
      setOptimization(result)
      setLastOptimized(new Date())
    } finally {
      setIsOptimizing(false)
    }
  }, [optimizeSchedule, appointments, date, constraints])

  // Trigger optimization when appointments change
  useEffect(() => {
    if (optimizationTriggers.includes('appointments_change')) {
      runOptimization()
    }
  }, [appointments, runOptimization, optimizationTriggers])

  // Trigger optimization on time interval
  useEffect(() => {
    if (!optimizationTriggers.includes('time_interval')) return

    const interval = setInterval(runOptimization, 300000) // 5 minutes
    return () => clearInterval(interval)
  }, [runOptimization, optimizationTriggers])

  return {
    optimization,
    isOptimizing: isOptimizing || engineOptimizing,
    lastOptimized,
    runOptimization
  }
}

interface UseConflictResolutionOptions {
  appointments: any[]
  onConflictDetected?: (conflicts: any[]) => void
  onResolutionApplied?: (recommendation: SchedulingRecommendation) => void
  autoDetect?: boolean
}

export function useConflictResolution(options: UseConflictResolutionOptions) {
  const {
    appointments,
    onConflictDetected,
    onResolutionApplied,
    autoDetect = true
  } = options

  const { resolveConflicts } = useIntelligentScheduling()
  
  const [conflicts, setConflicts] = useState<any[]>([])
  const [recommendations, setRecommendations] = useState<SchedulingRecommendation[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const detectConflicts = useCallback(() => {
    setIsAnalyzing(true)
    
    try {
      // Simple conflict detection - overlapping times
      const detectedConflicts: any[] = []
      
      for (let i = 0; i < appointments.length; i++) {
        for (let j = i + 1; j < appointments.length; j++) {
          const apt1 = appointments[i]
          const apt2 = appointments[j]
          
          const start1 = new Date(apt1.start_time)
          const end1 = new Date(start1.getTime() + (apt1.duration || 30) * 60000)
          const start2 = new Date(apt2.start_time)
          const end2 = new Date(start2.getTime() + (apt2.duration || 30) * 60000)
          
          // Check for overlap and same barber
          if (apt1.barber_id === apt2.barber_id && 
              start1 < end2 && start2 < end1) {
            detectedConflicts.push([apt1, apt2])
          }
        }
      }
      
      setConflicts(detectedConflicts.flat())
      
      if (detectedConflicts.length > 0) {
        onConflictDetected?.(detectedConflicts.flat())
        
        // Generate resolutions
        const resolutions = resolveConflicts(detectedConflicts.flat())
        setRecommendations(resolutions)
      } else {
        setRecommendations([])
      }
    } finally {
      setIsAnalyzing(false)
    }
  }, [appointments, onConflictDetected, resolveConflicts])

  const applyRecommendation = useCallback((recommendation: SchedulingRecommendation) => {
    // In a real implementation, this would apply the recommendation
    // For now, we just notify the parent component
    onResolutionApplied?.(recommendation)
    
    // Remove the applied recommendation from the list
    setRecommendations(prev => prev.filter(r => r !== recommendation))
  }, [onResolutionApplied])

  // Auto-detect conflicts when appointments change
  useEffect(() => {
    if (autoDetect && appointments.length > 0) {
      detectConflicts()
    }
  }, [appointments, autoDetect, detectConflicts])

  return {
    conflicts,
    recommendations,
    isAnalyzing,
    detectConflicts,
    applyRecommendation,
    hasConflicts: conflicts.length > 0
  }
}

interface UseDemandPredictionOptions {
  date: Date
  serviceId?: number
  barberId?: number
  timeRange?: { start: string; end: string }
  updateInterval?: number
}

export function useDemandPrediction(options: UseDemandPredictionOptions) {
  const {
    date,
    serviceId,
    barberId,
    timeRange,
    updateInterval = 3600000 // 1 hour
  } = options

  const { predictDemand } = useIntelligentScheduling()
  
  const [prediction, setPrediction] = useState<{
    expectedBookings: number
    peakHours: string[]
    recommendedStaffing: number
    confidenceScore: number
  } | null>(null)
  
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const updatePrediction = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = predictDemand(date, serviceId, barberId, timeRange)
      setPrediction(result)
      setLastUpdate(new Date())
    } finally {
      setIsLoading(false)
    }
  }, [predictDemand, date, serviceId, barberId, timeRange])

  // Initial prediction and date changes
  useEffect(() => {
    updatePrediction()
  }, [updatePrediction])

  // Periodic updates
  useEffect(() => {
    const interval = setInterval(updatePrediction, updateInterval)
    return () => clearInterval(interval)
  }, [updatePrediction, updateInterval])

  return {
    prediction,
    isLoading,
    lastUpdate,
    updatePrediction
  }
}

interface UseClientLearningOptions {
  onPreferencesUpdate?: (clientId: string, preferences: ClientPreference) => void
}

export function useClientLearning(options: UseClientLearningOptions = {}) {
  const { onPreferencesUpdate } = options
  const { updateClientPreferences } = useIntelligentScheduling()
  
  const recordAppointment = useCallback((
    clientId: string,
    appointmentData: {
      barberId: number
      serviceId: number
      timeSlot: Date
      satisfaction?: number
      completed: boolean
    }
  ) => {
    updateClientPreferences(clientId, appointmentData)
    
    // Notify parent component if callback provided
    if (onPreferencesUpdate) {
      // In a real implementation, we would fetch the updated preferences
      // For now, we just notify that an update occurred
      setTimeout(() => {
        onPreferencesUpdate(clientId, {
          clientId,
          appointmentHistory: [],
          loyaltyScore: 0.5
        })
      }, 100)
    }
  }, [updateClientPreferences, onPreferencesUpdate])

  return {
    recordAppointment
  }
}