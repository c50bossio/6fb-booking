'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { 
  format, 
  parseISO, 
  isSameWeekday, 
  getDay, 
  getHours, 
  getMinutes,
  differenceInDays,
  addDays,
  addWeeks,
  addMonths,
  isWithinInterval,
  startOfDay,
  endOfDay
} from 'date-fns'

interface Appointment {
  id: number
  start_time: string
  service_name: string
  client_name?: string
  client_id?: number
  barber_id?: number
  duration_minutes?: number
  price?: number
}

export interface AppointmentPattern {
  id: string
  type: 'recurring' | 'client_preference' | 'service_pattern' | 'time_slot' | 'seasonal'
  confidence: number
  description: string
  suggestion: AppointmentSuggestion
  basedOn: Appointment[]
  frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
}

export interface AppointmentSuggestion {
  recommendedDate: Date
  recommendedTime: string
  serviceId?: number
  serviceName: string
  clientId?: number
  clientName?: string
  barberId?: number
  estimatedDuration: number
  estimatedPrice?: number
  reasoning: string
}

interface PatternAnalysisConfig {
  minimumOccurrences: number
  confidenceThreshold: number
  lookbackDays: number
  includeSeasonalPatterns: boolean
}

/**
 * Hook for analyzing appointment patterns and providing intelligent suggestions
 * Uses historical data to identify recurring patterns and client preferences
 */
export function useAppointmentPatterns(
  appointments: Appointment[] = [],
  config: PatternAnalysisConfig = {
    minimumOccurrences: 3,
    confidenceThreshold: 0.7,
    lookbackDays: 90,
    includeSeasonalPatterns: false
  }
) {
  const [patterns, setPatterns] = useState<AppointmentPattern[]>([])
  const [suggestions, setSuggestions] = useState<AppointmentSuggestion[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Filter recent appointments within lookback period
  const recentAppointments = useMemo(() => {
    const cutoffDate = addDays(new Date(), -config.lookbackDays)
    return appointments.filter(apt => 
      parseISO(apt.start_time) >= cutoffDate
    ).sort((a, b) => 
      parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
    )
  }, [appointments, config.lookbackDays])

  // Analyze recurring appointment patterns
  const analyzeRecurringPatterns = useCallback(() => {
    const recurringPatterns: AppointmentPattern[] = []
    
    // Group appointments by client
    const clientAppointments = new Map<number, Appointment[]>()
    recentAppointments.forEach(apt => {
      if (apt.client_id) {
        if (!clientAppointments.has(apt.client_id)) {
          clientAppointments.set(apt.client_id, [])
        }
        clientAppointments.get(apt.client_id)!.push(apt)
      }
    })

    // Analyze each client's patterns
    clientAppointments.forEach((apts, clientId) => {
      if (apts.length < config.minimumOccurrences) return

      // Check for weekly patterns
      const weeklyIntervals = apts
        .slice(1)
        .map((apt, i) => differenceInDays(parseISO(apt.start_time), parseISO(apts[i].start_time)))
        .filter(days => Math.abs(days - 7) <= 2) // Allow 2-day variance

      if (weeklyIntervals.length >= config.minimumOccurrences - 1) {
        const confidence = weeklyIntervals.length / (apts.length - 1)
        if (confidence >= config.confidenceThreshold) {
          const lastApt = apts[apts.length - 1]
          const nextDate = addWeeks(parseISO(lastApt.start_time), 1)
          
          recurringPatterns.push({
            id: `recurring-weekly-${clientId}`,
            type: 'recurring',
            confidence,
            description: `${lastApt.client_name || 'Client'} books weekly appointments`,
            frequency: 'weekly',
            basedOn: apts,
            suggestion: {
              recommendedDate: nextDate,
              recommendedTime: format(parseISO(lastApt.start_time), 'HH:mm'),
              serviceName: lastApt.service_name,
              clientId: lastApt.client_id,
              clientName: lastApt.client_name,
              barberId: lastApt.barber_id,
              estimatedDuration: lastApt.duration_minutes || 60,
              estimatedPrice: lastApt.price,
              reasoning: `Based on ${apts.length} weekly appointments`
            }
          })
        }
      }

      // Check for monthly patterns
      const monthlyIntervals = apts
        .slice(1)
        .map((apt, i) => differenceInDays(parseISO(apt.start_time), parseISO(apts[i].start_time)))
        .filter(days => Math.abs(days - 28) <= 7) // Allow 7-day variance for monthly

      if (monthlyIntervals.length >= Math.max(2, Math.floor(config.minimumOccurrences / 2))) {
        const confidence = monthlyIntervals.length / (apts.length - 1)
        if (confidence >= config.confidenceThreshold * 0.8) { // Lower threshold for monthly
          const lastApt = apts[apts.length - 1]
          const nextDate = addMonths(parseISO(lastApt.start_time), 1)
          
          recurringPatterns.push({
            id: `recurring-monthly-${clientId}`,
            type: 'recurring',
            confidence,
            description: `${lastApt.client_name || 'Client'} books monthly appointments`,
            frequency: 'monthly',
            basedOn: apts,
            suggestion: {
              recommendedDate: nextDate,
              recommendedTime: format(parseISO(lastApt.start_time), 'HH:mm'),
              serviceName: lastApt.service_name,
              clientId: lastApt.client_id,
              clientName: lastApt.client_name,
              barberId: lastApt.barber_id,
              estimatedDuration: lastApt.duration_minutes || 60,
              estimatedPrice: lastApt.price,
              reasoning: `Based on ${apts.length} monthly appointments`
            }
          })
        }
      }
    })

    return recurringPatterns
  }, [recentAppointments, config])

  // Analyze time slot preferences
  const analyzeTimeSlotPatterns = useCallback(() => {
    const timePatterns: AppointmentPattern[] = []
    
    // Group by hour
    const hourFrequency = new Map<number, Appointment[]>()
    recentAppointments.forEach(apt => {
      const hour = getHours(parseISO(apt.start_time))
      if (!hourFrequency.has(hour)) {
        hourFrequency.set(hour, [])
      }
      hourFrequency.get(hour)!.push(apt)
    })

    // Find popular time slots
    const sortedHours = Array.from(hourFrequency.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 3) // Top 3 time slots

    sortedHours.forEach(([hour, apts]) => {
      if (apts.length >= config.minimumOccurrences) {
        const confidence = apts.length / recentAppointments.length
        const timeStr = `${hour.toString().padStart(2, '0')}:00`
        
        timePatterns.push({
          id: `timeslot-${hour}`,
          type: 'time_slot',
          confidence,
          description: `Popular time slot: ${timeStr}`,
          basedOn: apts,
          suggestion: {
            recommendedDate: addDays(new Date(), 1), // Tomorrow
            recommendedTime: timeStr,
            serviceName: apts[0].service_name, // Most common service
            estimatedDuration: Math.round(
              apts.reduce((sum, apt) => sum + (apt.duration_minutes || 60), 0) / apts.length
            ),
            reasoning: `${apts.length} appointments typically booked at this time`
          }
        })
      }
    })

    return timePatterns
  }, [recentAppointments, config])

  // Analyze service patterns
  const analyzeServicePatterns = useCallback(() => {
    const servicePatterns: AppointmentPattern[] = []
    
    // Group by service and analyze follow-up patterns
    const serviceSequences = new Map<string, Appointment[]>()
    
    // Group appointments by client to find service sequences
    const clientAppointments = new Map<number, Appointment[]>()
    recentAppointments.forEach(apt => {
      if (apt.client_id) {
        if (!clientAppointments.has(apt.client_id)) {
          clientAppointments.set(apt.client_id, [])
        }
        clientAppointments.get(apt.client_id)!.push(apt)
      }
    })

    // Analyze service follow-up patterns
    clientAppointments.forEach(apts => {
      for (let i = 0; i < apts.length - 1; i++) {
        const current = apts[i]
        const next = apts[i + 1]
        const sequenceKey = `${current.service_name}->${next.service_name}`
        
        if (!serviceSequences.has(sequenceKey)) {
          serviceSequences.set(sequenceKey, [])
        }
        serviceSequences.get(sequenceKey)!.push(next)
      }
    })

    // Find common service follow-ups
    serviceSequences.forEach((followUps, sequence) => {
      if (followUps.length >= config.minimumOccurrences) {
        const [fromService, toService] = sequence.split('->')
        const confidence = followUps.length / recentAppointments.filter(apt => apt.service_name === fromService).length
        
        if (confidence >= config.confidenceThreshold) {
          servicePatterns.push({
            id: `service-followup-${sequence}`,
            type: 'service_pattern',
            confidence,
            description: `Clients often book ${toService} after ${fromService}`,
            basedOn: followUps,
            suggestion: {
              recommendedDate: addDays(new Date(), 7), // Next week
              recommendedTime: '10:00',
              serviceName: toService,
              estimatedDuration: Math.round(
                followUps.reduce((sum, apt) => sum + (apt.duration_minutes || 60), 0) / followUps.length
              ),
              estimatedPrice: followUps[0].price,
              reasoning: `${Math.round(confidence * 100)}% of ${fromService} clients book ${toService}`
            }
          })
        }
      }
    })

    return servicePatterns
  }, [recentAppointments, config])

  // Main pattern analysis function
  const analyzePatterns = useCallback(async () => {
    if (recentAppointments.length < config.minimumOccurrences) {
      setPatterns([])
      setSuggestions([])
      return
    }

    setIsAnalyzing(true)

    try {
      const recurringPatterns = analyzeRecurringPatterns()
      const timeSlotPatterns = analyzeTimeSlotPatterns()
      const servicePatterns = analyzeServicePatterns()

      const allPatterns = [
        ...recurringPatterns,
        ...timeSlotPatterns,
        ...servicePatterns
      ].sort((a, b) => b.confidence - a.confidence)

      setPatterns(allPatterns)
      setSuggestions(allPatterns.map(pattern => pattern.suggestion))
    } catch (error) {
      console.error('Error analyzing appointment patterns:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [
    recentAppointments,
    config,
    analyzeRecurringPatterns,
    analyzeTimeSlotPatterns,
    analyzeServicePatterns
  ])

  // Run analysis when appointments change
  useEffect(() => {
    analyzePatterns()
  }, [analyzePatterns])

  // Get suggestions for a specific date
  const getSuggestionsForDate = useCallback((targetDate: Date) => {
    return suggestions.filter(suggestion => {
      const suggestionDate = suggestion.recommendedDate
      return isSameWeekday(targetDate, suggestionDate) || 
             Math.abs(differenceInDays(targetDate, suggestionDate)) <= 7
    })
  }, [suggestions])

  // Get suggestions for a specific client
  const getSuggestionsForClient = useCallback((clientId: number) => {
    return suggestions.filter(suggestion => suggestion.clientId === clientId)
  }, [suggestions])

  // Get the most confident suggestion
  const getTopSuggestion = useCallback(() => {
    const topPattern = patterns.find(pattern => pattern.confidence >= config.confidenceThreshold)
    return topPattern?.suggestion || null
  }, [patterns, config.confidenceThreshold])

  return {
    patterns,
    suggestions,
    isAnalyzing,
    getSuggestionsForDate,
    getSuggestionsForClient,
    getTopSuggestion,
    reanalyzePatterns: analyzePatterns,
    stats: {
      totalPatterns: patterns.length,
      highConfidencePatterns: patterns.filter(p => p.confidence >= config.confidenceThreshold).length,
      recurringPatterns: patterns.filter(p => p.type === 'recurring').length,
      timeSlotPatterns: patterns.filter(p => p.type === 'time_slot').length,
      servicePatterns: patterns.filter(p => p.type === 'service_pattern').length
    }
  }
}