'use client'

import React, { useMemo } from 'react'
import { CalendarAppointment } from './PremiumCalendar'

interface SmartSchedulerProps {
  appointments: CalendarAppointment[]
  workingHours: { start: string; end: string }
  preferredGapMinutes?: number
  barberPreferences?: Map<number, {
    preferredBreakTime?: string
    preferredBreakDuration?: number
    maxConsecutiveAppointments?: number
  }>
}

interface TimeSlotSuggestion {
  date: string
  time: string
  barberId: number
  score: number
  reasons: string[]
}

export function useSmartScheduler({
  appointments,
  workingHours,
  preferredGapMinutes = 15,
  barberPreferences = new Map()
}: SmartSchedulerProps) {

  // Find optimal time slots for a given duration
  const findOptimalTimeSlots = useMemo(() => {
    return (duration: number, barberId: number, preferredDate?: string): TimeSlotSuggestion[] => {
      const suggestions: TimeSlotSuggestion[] = []
      const today = new Date()
      const startDate = preferredDate ? new Date(preferredDate) : today

      // Check next 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const checkDate = new Date(startDate)
        checkDate.setDate(checkDate.getDate() + dayOffset)
        const dateStr = checkDate.toISOString().split('T')[0]

        // Get appointments for this barber on this date
        const dayAppointments = appointments.filter(
          apt => apt.barberId === barberId && apt.date === dateStr
        ).sort((a, b) => a.startTime.localeCompare(b.startTime))

        // Get barber preferences
        const prefs = barberPreferences.get(barberId) || {}

        // Find available slots
        const slots = findAvailableSlots(
          dateStr,
          dayAppointments,
          workingHours,
          duration,
          preferredGapMinutes,
          prefs
        )

        // Score each slot
        slots.forEach(slot => {
          const score = calculateSlotScore(
            slot,
            dayAppointments,
            prefs,
            preferredGapMinutes
          )

          suggestions.push({
            date: dateStr,
            time: slot.time,
            barberId,
            score: score.score,
            reasons: score.reasons
          })
        })
      }

      // Sort by score (highest first)
      return suggestions.sort((a, b) => b.score - a.score).slice(0, 5)
    }
  }, [appointments, workingHours, preferredGapMinutes, barberPreferences])

  // Find available slots for a specific day
  const findAvailableSlots = (
    date: string,
    dayAppointments: CalendarAppointment[],
    workingHours: { start: string; end: string },
    duration: number,
    gapMinutes: number,
    barberPrefs: any
  ): { time: string; duration: number }[] => {
    const slots: { time: string; duration: number }[] = []
    const [startHour, startMin] = workingHours.start.split(':').map(Number)
    const [endHour, endMin] = workingHours.end.split(':').map(Number)

    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    let currentMinutes = startMinutes

    while (currentMinutes + duration <= endMinutes) {
      const currentTime = `${Math.floor(currentMinutes / 60).toString().padStart(2, '0')}:${(currentMinutes % 60).toString().padStart(2, '0')}`
      const endTime = `${Math.floor((currentMinutes + duration) / 60).toString().padStart(2, '0')}:${((currentMinutes + duration) % 60).toString().padStart(2, '0')}`

      // Check if slot is available
      let isAvailable = true
      for (const apt of dayAppointments) {
        const aptStart = timeToMinutes(apt.startTime)
        const aptEnd = timeToMinutes(apt.endTime)

        // Check for overlap with gap
        if (currentMinutes < aptEnd + gapMinutes && currentMinutes + duration + gapMinutes > aptStart) {
          isAvailable = false
          break
        }
      }

      // Check if it overlaps with preferred break time
      if (barberPrefs.preferredBreakTime && barberPrefs.preferredBreakDuration) {
        const breakStart = timeToMinutes(barberPrefs.preferredBreakTime)
        const breakEnd = breakStart + barberPrefs.preferredBreakDuration

        if (currentMinutes < breakEnd && currentMinutes + duration > breakStart) {
          isAvailable = false
        }
      }

      if (isAvailable) {
        slots.push({ time: currentTime, duration })
      }

      // Move to next slot (15-minute intervals)
      currentMinutes += 15
    }

    return slots
  }

  // Calculate score for a time slot
  const calculateSlotScore = (
    slot: { time: string; duration: number },
    dayAppointments: CalendarAppointment[],
    barberPrefs: any,
    gapMinutes: number
  ): { score: number; reasons: string[] } => {
    let score = 100
    const reasons: string[] = []

    const slotMinutes = timeToMinutes(slot.time)

    // Prefer morning appointments (9-12)
    if (slotMinutes >= 9 * 60 && slotMinutes <= 12 * 60) {
      score += 20
      reasons.push('Morning slot (high demand)')
    }

    // Prefer slots that maintain good flow
    let hasGoodFlow = true
    for (const apt of dayAppointments) {
      const aptStart = timeToMinutes(apt.startTime)
      const aptEnd = timeToMinutes(apt.endTime)

      // Check if this creates a perfect gap
      if (Math.abs(aptEnd + gapMinutes - slotMinutes) < 5 ||
          Math.abs(slotMinutes + slot.duration + gapMinutes - aptStart) < 5) {
        score += 15
        reasons.push('Creates efficient schedule')
      }

      // Penalize if it creates awkward gaps
      const gapBefore = slotMinutes - aptEnd
      const gapAfter = aptStart - (slotMinutes + slot.duration)

      if ((gapBefore > 0 && gapBefore < gapMinutes * 2) ||
          (gapAfter > 0 && gapAfter < gapMinutes * 2)) {
        score -= 10
        hasGoodFlow = false
      }
    }

    if (hasGoodFlow) {
      reasons.push('Good schedule flow')
    }

    // Check consecutive appointments
    if (barberPrefs.maxConsecutiveAppointments) {
      const consecutiveCount = countConsecutiveAppointments(
        slotMinutes,
        dayAppointments,
        gapMinutes
      )

      if (consecutiveCount >= barberPrefs.maxConsecutiveAppointments) {
        score -= 25
        reasons.push('Too many consecutive appointments')
      }
    }

    // Prefer slots after break time
    if (barberPrefs.preferredBreakTime) {
      const breakTime = timeToMinutes(barberPrefs.preferredBreakTime)
      if (Math.abs(slotMinutes - breakTime - (barberPrefs.preferredBreakDuration || 30)) < 30) {
        score += 10
        reasons.push('After break time')
      }
    }

    return { score, reasons }
  }

  // Helper functions
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const countConsecutiveAppointments = (
    slotMinutes: number,
    appointments: CalendarAppointment[],
    gapMinutes: number
  ): number => {
    let count = 1 // Include the proposed appointment

    // Count backwards
    let currentTime = slotMinutes
    for (let i = appointments.length - 1; i >= 0; i--) {
      const apt = appointments[i]
      const aptEnd = timeToMinutes(apt.endTime)

      if (Math.abs(currentTime - aptEnd) <= gapMinutes + 5) {
        count++
        currentTime = timeToMinutes(apt.startTime)
      }
    }

    // Count forwards
    currentTime = slotMinutes + 60 // Assume 60-minute appointment
    for (const apt of appointments) {
      const aptStart = timeToMinutes(apt.startTime)

      if (Math.abs(aptStart - currentTime) <= gapMinutes + 5) {
        count++
        currentTime = timeToMinutes(apt.endTime)
      }
    }

    return count
  }

  return {
    findOptimalTimeSlots
  }
}

// Smart Scheduler UI Component
export default function SmartSchedulerPanel({
  suggestions,
  onSelectSuggestion
}: {
  suggestions: TimeSlotSuggestion[]
  onSelectSuggestion: (suggestion: TimeSlotSuggestion) => void
}) {
  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-3">
        Smart Time Suggestions
      </h3>

      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={`${suggestion.date}-${suggestion.time}-${index}`}
            className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 cursor-pointer transition-colors"
            onClick={() => onSelectSuggestion(suggestion)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-medium">
                {new Date(suggestion.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric'
                })} at {suggestion.time}
              </span>
              <span className="text-xs bg-violet-600 text-white px-2 py-1 rounded">
                Score: {suggestion.score}
              </span>
            </div>

            <div className="text-sm text-gray-400">
              {suggestion.reasons.slice(0, 2).join(' • ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
