'use client'

import React from 'react'
import { format } from 'date-fns'
import { 
  FreshaColors, 
  FreshaTypography, 
  FreshaSpacing,
  FreshaBorderRadius
} from '@/lib/fresha-design-system'

interface ProfessionalTimeAxisProps {
  startHour?: number
  endHour?: number
  slotDuration?: number // in minutes
  timeFormat?: '12h' | '24h'
  showMinutes?: boolean
  compact?: boolean
  className?: string
}

const ProfessionalTimeAxis: React.FC<ProfessionalTimeAxisProps> = ({
  startHour = 8,
  endHour = 19,
  slotDuration = 60, // Default to hourly slots
  timeFormat = '12h',
  showMinutes = false,
  compact = false,
  className = ''
}) => {
  // Generate time slots
  const generateTimeSlots = () => {
    const slots = []
    
    for (let hour = startHour; hour < endHour; hour++) {
      if (slotDuration >= 60) {
        // Hour-based slots
        slots.push({
          time: new Date().setHours(hour, 0, 0, 0),
          label: format(new Date().setHours(hour, 0, 0, 0), timeFormat === '12h' ? 'h a' : 'HH:00'),
          isMainHour: true,
          isPrimary: true
        })
      } else {
        // Sub-hour slots
        for (let minute = 0; minute < 60; minute += slotDuration) {
          const isMainHour = minute === 0
          slots.push({
            time: new Date().setHours(hour, minute, 0, 0),
            label: format(
              new Date().setHours(hour, minute, 0, 0), 
              timeFormat === '12h' 
                ? (showMinutes || !isMainHour ? 'h:mm a' : 'h a')
                : (showMinutes || !isMainHour ? 'HH:mm' : 'HH:00')
            ),
            isMainHour,
            isPrimary: isMainHour
          })
        }
      }
    }
    
    return slots
  }

  const timeSlots = generateTimeSlots()

  const getSlotHeight = () => {
    if (compact) return '40px'
    return slotDuration >= 60 ? '64px' : `${Math.max(32, slotDuration * 0.8)}px`
  }

  return (
    <div 
      className={`professional-time-axis flex flex-col border-r ${className}`}
      style={{
        backgroundColor: FreshaColors.background.secondary,
        borderColor: FreshaColors.border.light,
        width: compact ? '60px' : '80px',
        flexShrink: 0
      }}
    >
      {/* Header spacer to align with staff headers */}
      <div 
        className="border-b"
        style={{
          height: compact ? '60px' : '80px',
          borderColor: FreshaColors.border.light,
          backgroundColor: FreshaColors.background.secondary
        }}
      >
        {!compact && (
          <div className="h-full flex items-center justify-center">
            <span 
              className="text-xs font-medium uppercase tracking-wide"
              style={{
                color: FreshaColors.gray[500],
                fontSize: FreshaTypography.fontSize.xs,
                fontWeight: FreshaTypography.fontWeight.medium
              }}
            >
              Time
            </span>
          </div>
        )}
      </div>

      {/* Time slots */}
      {timeSlots.map((slot, index) => (
        <div
          key={index}
          className={`
            time-slot flex items-start justify-end pr-3 pt-2 border-b relative
            ${slot.isPrimary ? 'border-opacity-100' : 'border-opacity-50'}
          `}
          style={{
            height: getSlotHeight(),
            borderColor: slot.isPrimary 
              ? FreshaColors.border.light 
              : `${FreshaColors.border.light}80`,
            backgroundColor: FreshaColors.background.secondary
          }}
        >
          {/* Time label */}
          <span 
            className={`
              ${slot.isPrimary ? 'font-medium' : 'font-normal'}
              ${compact ? 'text-xs' : 'text-sm'}
            `}
            style={{
              color: slot.isPrimary ? FreshaColors.gray[700] : FreshaColors.gray[500],
              fontSize: compact ? FreshaTypography.fontSize.xs : FreshaTypography.fontSize.sm,
              fontWeight: slot.isPrimary 
                ? FreshaTypography.fontWeight.medium 
                : FreshaTypography.fontWeight.normal,
              lineHeight: '1'
            }}
          >
            {slot.label}
          </span>

          {/* Hour marker line for main hours */}
          {slot.isPrimary && (
            <div 
              className="absolute right-0 top-0 w-2 h-px"
              style={{ backgroundColor: FreshaColors.border.main }}
            />
          )}

          {/* Half-hour marker for 30-minute slots */}
          {!slot.isPrimary && slotDuration === 30 && (
            <div 
              className="absolute right-0 top-0 w-1 h-px"
              style={{ backgroundColor: FreshaColors.border.light }}
            />
          )}
        </div>
      ))}

      {/* Current time indicator */}
      <CurrentTimeIndicator 
        startHour={startHour}
        endHour={endHour}
        slotHeight={getSlotHeight()}
        compact={compact}
      />
    </div>
  )
}

// Current time indicator component
interface CurrentTimeIndicatorProps {
  startHour: number
  endHour: number
  slotHeight: string
  compact: boolean
}

const CurrentTimeIndicator: React.FC<CurrentTimeIndicatorProps> = ({
  startHour,
  endHour,
  slotHeight,
  compact
}) => {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // Only show during business hours
  if (currentHour < startHour || currentHour >= endHour) {
    return null
  }

  // Calculate position
  const headerHeight = compact ? 60 : 80
  const slotHeightNum = parseInt(slotHeight)
  const hoursFromStart = currentHour - startHour
  const minuteOffset = (currentMinute / 60) * slotHeightNum
  const topPosition = headerHeight + (hoursFromStart * slotHeightNum) + minuteOffset

  return (
    <div
      className="absolute right-0 z-10 flex items-center pointer-events-none"
      style={{
        top: `${topPosition}px`,
        transform: 'translateY(-50%)'
      }}
    >
      {/* Current time dot */}
      <div 
        className="w-2 h-2 rounded-full border-2 border-white shadow-sm"
        style={{ 
          backgroundColor: FreshaColors.status.confirmed.main,
          marginRight: '-4px'
        }}
      />
      
      {/* Time label */}
      {!compact && (
        <div 
          className="px-2 py-1 rounded shadow-sm ml-2"
          style={{
            backgroundColor: FreshaColors.status.confirmed.main,
            color: 'white',
            fontSize: FreshaTypography.fontSize.xs,
            fontWeight: FreshaTypography.fontWeight.medium
          }}
        >
          {format(now, 'h:mm a')}
        </div>
      )}
    </div>
  )
}

export default ProfessionalTimeAxis