'use client'

import React, { useMemo, useState } from 'react'
import { format, addDays, startOfWeek, addMinutes, isSameDay, isToday, parseISO } from 'date-fns'
import { getTheme } from '@/lib/calendar-premium-theme'
import type { BookingResponse } from '@/lib/api'

interface TimeSlotDensity {
  time: string
  density: number // 0-1 scale
  appointmentCount: number
  totalSlots: number
  revenue: number
}

interface DayDensity {
  date: Date
  timeSlots: TimeSlotDensity[]
  totalDensity: number
  dayRevenue: number
  appointmentCount: number
}

interface AvailabilityHeatmapProps {
  appointments: BookingResponse[]
  startDate?: Date
  daysToShow?: number
  theme?: 'platinum' | 'pearl' | 'aurora'
  timeRange?: { start: string; end: string }
  showRevenue?: boolean
  showLegend?: boolean
  onTimeSlotClick?: (date: Date, time: string) => void
  className?: string
}

export default function AvailabilityHeatmap({
  appointments,
  startDate = new Date(),
  daysToShow = 7,
  theme = 'pearl',
  timeRange = { start: '09:00', end: '19:00' },
  showRevenue = false,
  showLegend = true,
  onTimeSlotClick,
  className = ''
}: AvailabilityHeatmapProps) {
  const [hoveredSlot, setHoveredSlot] = useState<{ date: Date; time: string } | null>(null)
  const themeConfig = getTheme(theme)

  // Generate time slots for the day
  const timeSlots = useMemo(() => {
    const slots: string[] = []
    const [startHour, startMin] = timeRange.start.split(':').map(Number)
    const [endHour, endMin] = timeRange.end.split(':').map(Number)
    
    let currentTime = new Date()
    currentTime.setHours(startHour, startMin, 0, 0)
    
    const endTime = new Date()
    endTime.setHours(endHour, endMin, 0, 0)
    
    while (currentTime < endTime) {
      slots.push(format(currentTime, 'HH:mm'))
      currentTime = addMinutes(currentTime, 30) // 30-minute intervals
    }
    
    return slots
  }, [timeRange])

  // Process appointment data into density map
  const densityData = useMemo((): DayDensity[] => {
    const days: DayDensity[] = []
    
    for (let i = 0; i < daysToShow; i++) {
      const date = addDays(startDate, i)
      const dayAppointments = appointments.filter(apt => 
        isSameDay(new Date(apt.start_time), date)
      )
      
      const timeSlotDensities: TimeSlotDensity[] = timeSlots.map(timeSlot => {
        const [hour, minute] = timeSlot.split(':').map(Number)
        const slotStart = new Date(date)
        slotStart.setHours(hour, minute, 0, 0)
        const slotEnd = addMinutes(slotStart, 30)
        
        // Count appointments in this time slot
        const slotAppointments = dayAppointments.filter(apt => {
          const aptStart = new Date(apt.start_time)
          const aptEnd = apt.end_time ? new Date(apt.end_time) : addMinutes(aptStart, 60)
          
          // Check if appointment overlaps with this slot
          return aptStart < slotEnd && aptEnd > slotStart
        })
        
        const appointmentCount = slotAppointments.length
        const maxSlotsPerHalfHour = 3 // Assuming max 3 barbers/slots
        const density = Math.min(appointmentCount / maxSlotsPerHalfHour, 1)
        
        const slotRevenue = slotAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0)
        
        return {
          time: timeSlot,
          density,
          appointmentCount,
          totalSlots: maxSlotsPerHalfHour,
          revenue: slotRevenue
        }
      })
      
      const totalDensity = timeSlotDensities.reduce((sum, slot) => sum + slot.density, 0) / timeSlotDensities.length
      const dayRevenue = dayAppointments.reduce((sum, apt) => sum + (apt.price || 0), 0)
      
      days.push({
        date,
        timeSlots: timeSlotDensities,
        totalDensity,
        dayRevenue,
        appointmentCount: dayAppointments.length
      })
    }
    
    return days
  }, [appointments, startDate, daysToShow, timeSlots])

  // Get heatmap color based on density
  const getHeatmapColor = (density: number): string => {
    if (density === 0) return 'bg-gray-50 border-gray-200'
    if (density <= 0.25) return 'bg-green-100 border-green-200'
    if (density <= 0.5) return 'bg-yellow-100 border-yellow-200'
    if (density <= 0.75) return 'bg-orange-100 border-orange-200'
    return 'bg-red-100 border-red-200'
  }

  // Get hover color
  const getHoverColor = (density: number): string => {
    if (density === 0) return 'hover:bg-gray-100'
    if (density <= 0.25) return 'hover:bg-green-200'
    if (density <= 0.5) return 'hover:bg-yellow-200'
    if (density <= 0.75) return 'hover:bg-orange-200'
    return 'hover:bg-red-200'
  }

  // Get density description
  const getDensityDescription = (density: number): string => {
    if (density === 0) return 'Available'
    if (density <= 0.25) return 'Light'
    if (density <= 0.5) return 'Moderate'
    if (density <= 0.75) return 'Busy'
    return 'Full'
  }

  return (
    <div className={`${themeConfig.calendar.surface} rounded-xl p-6 shadow-premium ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Availability Heatmap</h3>
          <p className="text-sm text-gray-600">
            Visual overview of booking density over {daysToShow} days
          </p>
        </div>
        
        {showLegend && (
          <div className="flex items-center gap-2 text-xs">
            <span>Density:</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-gray-100 border border-gray-200 rounded" title="Available" />
              <div className="w-4 h-4 bg-green-100 border border-green-200 rounded" title="Light" />
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-200 rounded" title="Moderate" />
              <div className="w-4 h-4 bg-orange-100 border border-orange-200 rounded" title="Busy" />
              <div className="w-4 h-4 bg-red-100 border border-red-200 rounded" title="Full" />
            </div>
          </div>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Day Headers */}
          <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `80px repeat(${daysToShow}, 1fr)` }}>
            <div className="text-xs font-medium text-gray-500 py-2">Time</div>
            {densityData.map((day) => (
              <div key={day.date.toISOString()} className="text-center">
                <div className={`text-xs font-medium py-1 rounded ${
                  isToday(day.date) ? 'bg-primary-100 text-primary-700' : 'text-gray-700'
                }`}>
                  {format(day.date, 'EEE')}
                </div>
                <div className="text-xs text-gray-500">
                  {format(day.date, 'MMM d')}
                </div>
                {showRevenue && (
                  <div className="text-xs text-green-600 font-medium mt-1">
                    ${day.dayRevenue.toFixed(0)}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {day.appointmentCount} apt{day.appointmentCount !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>

          {/* Heatmap Rows */}
          <div className="space-y-1">
            {timeSlots.map((timeSlot) => (
              <div key={timeSlot} className="grid gap-1" style={{ gridTemplateColumns: `80px repeat(${daysToShow}, 1fr)` }}>
                {/* Time Label */}
                <div className="text-xs text-gray-600 py-2 font-mono">
                  {timeSlot}
                </div>
                
                {/* Density Cells */}
                {densityData.map((day) => {
                  const slotData = day.timeSlots.find(slot => slot.time === timeSlot)
                  if (!slotData) return null
                  
                  const isHovered = hoveredSlot?.date === day.date && hoveredSlot?.time === timeSlot
                  
                  return (
                    <div
                      key={`${day.date.toISOString()}-${timeSlot}`}
                      className={`
                        h-8 border border-opacity-50 rounded cursor-pointer transition-all duration-200
                        ${getHeatmapColor(slotData.density)}
                        ${getHoverColor(slotData.density)}
                        ${isHovered ? 'scale-110 z-10 shadow-lg' : ''}
                        ${slotData.density > 0 ? 'animate-pulse-gentle' : ''}
                      `}
                      onClick={() => onTimeSlotClick?.(day.date, timeSlot)}
                      onMouseEnter={() => setHoveredSlot({ date: day.date, time: timeSlot })}
                      onMouseLeave={() => setHoveredSlot(null)}
                      title={`${format(day.date, 'MMM d')} at ${timeSlot}: ${getDensityDescription(slotData.density)} (${slotData.appointmentCount}/${slotData.totalSlots})`}
                    >
                      {/* Density indicator */}
                      {slotData.density > 0 && (
                        <div 
                          className="h-full bg-current rounded opacity-30"
                          style={{ width: `${slotData.density * 100}%` }}
                        />
                      )}
                      
                      {/* Appointment count */}
                      {slotData.appointmentCount > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-700">
                            {slotData.appointmentCount}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredSlot && (
        <div className="fixed z-50 pointer-events-none">
          <div className={`${themeConfig.calendar.elevated} rounded-lg p-3 shadow-lg border border-white/20 animate-in zoom-in-95 duration-200`}>
            {(() => {
              const day = densityData.find(d => d.date === hoveredSlot.date)
              const slot = day?.timeSlots.find(s => s.time === hoveredSlot.time)
              if (!slot) return null
              
              return (
                <div className="text-sm space-y-1">
                  <div className="font-medium">
                    {format(hoveredSlot.date, 'EEEE, MMM d')} at {hoveredSlot.time}
                  </div>
                  <div className="text-gray-600">
                    Density: {getDensityDescription(slot.density)} ({Math.round(slot.density * 100)}%)
                  </div>
                  <div className="text-gray-600">
                    Appointments: {slot.appointmentCount} / {slot.totalSlots}
                  </div>
                  {showRevenue && slot.revenue > 0 && (
                    <div className="text-green-600 font-medium">
                      Revenue: ${slot.revenue.toFixed(2)}
                    </div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Click to create appointment
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className={`${themeConfig.calendar.surface} rounded-lg p-3 text-center`}>
          <div className="text-lg font-bold text-primary-600">
            {densityData.reduce((sum, day) => sum + day.appointmentCount, 0)}
          </div>
          <div className="text-xs text-gray-600">Total Appointments</div>
        </div>
        
        {showRevenue && (
          <div className={`${themeConfig.calendar.surface} rounded-lg p-3 text-center`}>
            <div className="text-lg font-bold text-green-600">
              ${densityData.reduce((sum, day) => sum + day.dayRevenue, 0).toFixed(0)}
            </div>
            <div className="text-xs text-gray-600">Total Revenue</div>
          </div>
        )}
        
        <div className={`${themeConfig.calendar.surface} rounded-lg p-3 text-center`}>
          <div className="text-lg font-bold text-blue-600">
            {Math.round(densityData.reduce((sum, day) => sum + day.totalDensity, 0) / densityData.length * 100)}%
          </div>
          <div className="text-xs text-gray-600">Avg Density</div>
        </div>
        
        <div className={`${themeConfig.calendar.surface} rounded-lg p-3 text-center`}>
          <div className="text-lg font-bold text-purple-600">
            {densityData.filter(day => day.totalDensity > 0.7).length}
          </div>
          <div className="text-xs text-gray-600">Busy Days</div>
        </div>
      </div>
    </div>
  )
}