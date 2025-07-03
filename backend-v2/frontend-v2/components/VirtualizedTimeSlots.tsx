'use client'

import React, { useMemo, useCallback } from 'react'
import VirtualList from './VirtualList'
import { formatTimeWithTimezone } from '@/lib/timezone'

interface TimeSlot {
  id: string
  time: string
  available: boolean
  is_next_available?: boolean
  appointment?: any
}

interface VirtualizedTimeSlotsProps {
  timeSlots: TimeSlot[]
  selectedTime: string | null
  onTimeSelect: (time: string) => void
  onAppointmentClick?: (appointment: any) => void
  containerHeight?: number
  slotHeight?: number
  showNextAvailableBadge?: boolean
}

// Memoized time slot item component
const TimeSlotItem = React.memo(function TimeSlotItem({
  slot,
  isSelected,
  onTimeSelect,
  onAppointmentClick,
  showNextAvailableBadge,
  style
}: {
  slot: TimeSlot
  isSelected: boolean
  onTimeSelect: (time: string) => void
  onAppointmentClick?: (appointment: any) => void
  showNextAvailableBadge: boolean
  style: React.CSSProperties
}) {
  const handleClick = useCallback(() => {
    if (slot.available) {
      onTimeSelect(slot.time)
    } else if (slot.appointment && onAppointmentClick) {
      onAppointmentClick(slot.appointment)
    }
  }, [slot, onTimeSelect, onAppointmentClick])

  // Memoize slot styling to prevent recalculation
  const slotClassName = useMemo(() => {
    const baseClasses = 'relative w-full px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border'
    
    if (!slot.available && slot.appointment) {
      return `${baseClasses} bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100`
    }
    
    if (!slot.available) {
      return `${baseClasses} bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed`
    }
    
    if (isSelected) {
      return `${baseClasses} bg-primary-600 border-primary-600 text-white shadow-md`
    }
    
    if (slot.is_next_available && showNextAvailableBadge) {
      return `${baseClasses} bg-gradient-to-r from-primary-500 to-primary-600 border-primary-500 text-white shadow-lg ring-2 ring-primary-300 hover:from-primary-600 hover:to-primary-700`
    }
    
    return `${baseClasses} bg-white border-gray-300 text-gray-700 hover:border-primary-400 hover:bg-primary-50`
  }, [slot.available, slot.appointment, slot.is_next_available, isSelected, showNextAvailableBadge])

  const formattedTime = useMemo(() => formatTimeWithTimezone(slot.time, false), [slot.time])

  return (
    <div className="px-2 py-1" style={style}>
      <button
        onClick={handleClick}
        disabled={!slot.available && !slot.appointment}
        className={slotClassName}
        title={slot.appointment ? `${slot.appointment.client_name} - ${slot.appointment.service_name}` : formattedTime}
      >
        <div className="flex items-center justify-between w-full">
          <span>{formattedTime}</span>
          
          {/* Appointment info */}
          {slot.appointment && (
            <div className="flex items-center gap-1 text-xs">
              <span className="truncate max-w-20">
                {slot.appointment.client_name || 'Client'}
              </span>
            </div>
          )}
          
          {/* Next available badge */}
          {slot.is_next_available && showNextAvailableBadge && slot.available && (
            <div className="absolute -top-1 -right-1 bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full font-semibold shadow-sm animate-pulse">
              ⚡
            </div>
          )}
        </div>
      </button>
    </div>
  )
})

const VirtualizedTimeSlots = React.memo(function VirtualizedTimeSlots({
  timeSlots,
  selectedTime,
  onTimeSelect,
  onAppointmentClick,
  containerHeight = 400,
  slotHeight = 56,
  showNextAvailableBadge = true
}: VirtualizedTimeSlotsProps) {
  // Transform time slots into virtual list items
  const virtualizedSlots = useMemo(() => {
    return timeSlots.map((slot, index) => ({
      ...slot,
      id: `${slot.time}-${index}`,
      height: slotHeight
    }))
  }, [timeSlots, slotHeight])

  // Render function for virtual list items
  const renderTimeSlot = useCallback((slot: TimeSlot & { height: number }, index: number, style: React.CSSProperties) => {
    const isSelected = selectedTime === slot.time
    
    return (
      <TimeSlotItem
        key={slot.id}
        slot={slot}
        isSelected={isSelected}
        onTimeSelect={onTimeSelect}
        onAppointmentClick={onAppointmentClick}
        showNextAvailableBadge={showNextAvailableBadge}
        style={style}
      />
    )
  }, [selectedTime, onTimeSelect, onAppointmentClick, showNextAvailableBadge])

  // Memoize next available count for badge display
  const nextAvailableCount = useMemo(() => {
    return timeSlots.filter(slot => slot.is_next_available && slot.available).length
  }, [timeSlots])

  if (timeSlots.length === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            <p className="text-gray-500">No available time slots for this date.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Available Time Slots</h2>
          {nextAvailableCount > 0 && showNextAvailableBadge && (
            <div className="flex items-center text-sm text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
              <span className="mr-1">⚡</span>
              {nextAvailableCount} Next Available
            </div>
          )}
        </div>
        
        <VirtualList
          items={virtualizedSlots}
          itemHeight={slotHeight}
          containerHeight={containerHeight}
          overscan={5}
          renderItem={renderTimeSlot}
          className="virtualized-time-slots"
        />
      </div>
    </div>
  )
})

VirtualizedTimeSlots.displayName = 'VirtualizedTimeSlots'

export default VirtualizedTimeSlots