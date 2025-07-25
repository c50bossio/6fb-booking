'use client'

import React, { useMemo, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { 
  FreshaColors, 
  FreshaTypography 
} from '@/lib/fresha-design-system'
import { ClockIcon } from '@heroicons/react/24/outline'

interface MobileTimeAxisProps {
  startHour?: number
  endHour?: number
  slotDuration?: number // in minutes
  currentTime?: Date
  showCurrentTimeIndicator?: boolean
  compact?: boolean
  className?: string
}

const MobileTimeAxis: React.FC<MobileTimeAxisProps> = ({
  startHour = 8,
  endHour = 19,
  slotDuration = 60,
  currentTime = new Date(),
  showCurrentTimeIndicator = true,
  compact = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const currentTimeRef = useRef<HTMLDivElement>(null)

  // Generate time slots
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = startHour; hour < endHour; hour++) {
      // Always show the hour slot
      slots.push({
        hour,
        minute: 0,
        isMainHour: true,
        displayTime: format(new Date().setHours(hour, 0, 0, 0), 'h a').toLowerCase()
      })
      
      // Add 30-minute slot if needed
      if (slotDuration === 30) {
        slots.push({
          hour,
          minute: 30,
          isMainHour: false,
          displayTime: format(new Date().setHours(hour, 30, 0, 0), 'h:mm').toLowerCase()
        })
      }
    }
    return slots
  }, [startHour, endHour, slotDuration])

  // Calculate current time position
  const currentTimePosition = useMemo(() => {
    if (!showCurrentTimeIndicator) return null
    
    const currentHour = currentTime.getHours()
    const currentMinute = currentTime.getMinutes()
    
    // Check if current time is within our range
    if (currentHour < startHour || currentHour >= endHour) return null
    
    const slotHeight = compact ? 40 : (slotDuration === 30 ? 60 : 80)
    const hoursFromStart = currentHour - startHour
    const minuteOffset = (currentMinute / 60) * slotHeight
    
    // Account for 30-minute slots
    const slotsBeforeCurrent = slotDuration === 30 
      ? hoursFromStart * 2 + (currentMinute >= 30 ? 1 : 0)
      : hoursFromStart
    
    const baseOffset = slotsBeforeCurrent * slotHeight
    const finalOffset = slotDuration === 30 && currentMinute >= 30 
      ? baseOffset + ((currentMinute - 30) / 30) * slotHeight
      : baseOffset + minuteOffset
    
    return finalOffset
  }, [currentTime, startHour, endHour, slotDuration, compact, showCurrentTimeIndicator])

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (currentTimePosition !== null && containerRef.current && currentTimeRef.current) {
      const container = containerRef.current
      const scrollTop = Math.max(0, currentTimePosition - container.clientHeight / 2)
      container.scrollTop = scrollTop
    }
  }, [currentTimePosition])

  const renderTimeSlot = (slot: typeof timeSlots[0], index: number) => {
    const slotHeight = compact ? 40 : (slotDuration === 30 ? 60 : 80)
    const isCurrentTimeSlot = showCurrentTimeIndicator && 
      currentTime.getHours() === slot.hour && 
      (slotDuration === 60 || 
       (slotDuration === 30 && 
        ((slot.minute === 0 && currentTime.getMinutes() < 30) ||
         (slot.minute === 30 && currentTime.getMinutes() >= 30))))

    return (
      <div
        key={`${slot.hour}-${slot.minute}`}
        className={`
          relative flex items-start justify-center border-b border-gray-100
          ${isCurrentTimeSlot ? 'bg-blue-50' : ''}
          ${slot.isMainHour ? 'border-gray-200' : ''}
        `}
        style={{ 
          height: `${slotHeight}px`,
          minHeight: `${slotHeight}px`
        }}
      >
        {/* Time Label */}
        <div className={`
          sticky top-0 z-10 flex flex-col items-center justify-center
          ${compact ? 'px-1' : 'px-2'} py-1 bg-white rounded-md
          ${slot.isMainHour ? 'shadow-sm' : ''}
        `}>
          {/* Hour Display */}
          {slot.isMainHour ? (
            <div className="text-center">
              <div className={`
                font-bold text-gray-900
                ${compact ? 'text-xs' : 'text-sm'}
              `}>
                {format(new Date().setHours(slot.hour, 0, 0, 0), 'h')}
              </div>
              <div className={`
                text-gray-500 font-medium -mt-1
                ${compact ? 'text-xs' : 'text-xs'}
              `}>
                {format(new Date().setHours(slot.hour, 0, 0, 0), 'a').toLowerCase()}
              </div>
            </div>
          ) : (
            // 30-minute mark
            <div className={`
              text-gray-400 font-medium
              ${compact ? 'text-xs' : 'text-xs'}
            `}>
              :30
            </div>
          )}

          {/* Current Time Indicator */}
          {isCurrentTimeSlot && (
            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            </div>
          )}
        </div>

        {/* Hour Divider */}
        {slot.isMainHour && (
          <div className="absolute left-0 right-0 top-0 h-px bg-gray-200" />
        )}
      </div>
    )
  }

  return (
    <div className={`relative bg-gray-50 ${className}`}>
      {/* Header */}
      {!compact && (
        <div className="sticky top-0 z-20 bg-white border-b border-gray-200 p-2">
          <div className="flex items-center justify-center space-x-1 text-xs text-gray-500">
            <ClockIcon className="w-3 h-3" />
            <span>Time</span>
          </div>
        </div>
      )}

      {/* Time Slots Container */}
      <div 
        ref={containerRef}
        className="relative overflow-y-auto"
        style={{ 
          maxHeight: compact ? '400px' : '600px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {timeSlots.map((slot, index) => renderTimeSlot(slot, index))}

        {/* Current Time Line */}
        {showCurrentTimeIndicator && currentTimePosition !== null && (
          <div
            ref={currentTimeRef}
            className="absolute left-0 right-0 z-30 pointer-events-none"
            style={{ top: `${currentTimePosition}px` }}
          >
            {/* Time Line */}
            <div className="relative">
              <div className="h-0.5 bg-red-500 opacity-80" />
              
              {/* Time Label */}
              <div className="absolute left-1 -top-3 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {format(currentTime, 'h:mm a')}
              </div>
              
              {/* Arrow */}
              <div className="absolute -right-1 -top-1 w-0 h-0 border-l-2 border-l-red-500 border-t-2 border-t-transparent border-b-2 border-b-transparent" />
            </div>
          </div>
        )}
      </div>

      {/* Gradient Overlays for Visual Polish */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-gray-50 to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none z-10" />

      {/* Quick Jump to Current Time Button */}
      {showCurrentTimeIndicator && currentTimePosition !== null && (
        <button
          onClick={() => {
            if (containerRef.current && currentTimeRef.current) {
              const container = containerRef.current
              const scrollTop = Math.max(0, currentTimePosition - container.clientHeight / 2)
              container.scrollTo({ top: scrollTop, behavior: 'smooth' })
            }
          }}
          className="absolute bottom-4 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors z-20"
          style={{ minWidth: '40px', minHeight: '40px' }}
        >
          <ClockIcon className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

export default MobileTimeAxis