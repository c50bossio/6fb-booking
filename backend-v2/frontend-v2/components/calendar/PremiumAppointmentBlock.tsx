'use client'

import React from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { 
  FreshaColors, 
  getServiceColor, 
  getStatusColor, 
  getClientTierColor,
  FreshaTypography,
  FreshaSpacing,
  FreshaBorderRadius,
  FreshaShadows
} from '@/lib/fresha-design-system'
import { 
  ClockIcon, 
  CurrencyDollarIcon,
  UserIcon,
  StarIcon
} from '@heroicons/react/24/outline'

interface AppointmentData {
  id: number
  client_name: string
  service_name: string
  start_time: string
  duration_minutes: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  client_tier?: 'new' | 'regular' | 'vip' | 'platinum'
  barber_id: number
  notes?: string
  is_recurring?: boolean
}

interface PremiumAppointmentBlockProps {
  appointment: AppointmentData
  colorScheme?: 'service-based' | 'status-based' | 'tier-based'
  showPrice?: boolean
  showDuration?: boolean
  showClientTier?: boolean
  onClick?: () => void
  onDoubleClick?: () => void
  isDragging?: boolean
  isSelected?: boolean
  style?: React.CSSProperties
  className?: string
}

const PremiumAppointmentBlock: React.FC<PremiumAppointmentBlockProps> = ({
  appointment,
  colorScheme = 'service-based',
  showPrice = true,
  showDuration = true,
  showClientTier = true,
  onClick,
  onDoubleClick,
  isDragging = false,
  isSelected = false,
  style,
  className = ''
}) => {
  // Get color scheme based on selection
  const getColorScheme = () => {
    switch (colorScheme) {
      case 'service-based':
        return getServiceColor(appointment.service_name)
      case 'status-based':
        return getStatusColor(appointment.status)
      case 'tier-based':
        return getClientTierColor(appointment.client_tier || 'regular')
      default:
        return getServiceColor(appointment.service_name)
    }
  }

  const colors = getColorScheme()
  const statusColors = getStatusColor(appointment.status)
  const tierColors = getClientTierColor(appointment.client_tier || 'regular')

  // Format time
  const startTime = format(new Date(appointment.start_time), 'h:mm a')
  const endTime = format(
    new Date(new Date(appointment.start_time).getTime() + appointment.duration_minutes * 60000),
    'h:mm a'
  )

  // Get status icon and text
  const getStatusDisplay = () => {
    switch (appointment.status) {
      case 'confirmed':
        return { icon: '✓', text: 'Confirmed' }
      case 'pending':
        return { icon: '⏳', text: 'Pending' }
      case 'completed':
        return { icon: '✅', text: 'Completed' }
      case 'cancelled':
        return { icon: '❌', text: 'Cancelled' }
      case 'no_show':
        return { icon: '❌', text: 'No Show' }
      default:
        return { icon: '●', text: 'Unknown' }
    }
  }

  const statusDisplay = getStatusDisplay()

  // Get client tier display
  const getTierDisplay = () => {
    switch (appointment.client_tier) {
      case 'new':
        return { icon: '👤', text: 'New', color: tierColors.main }
      case 'regular':
        return { icon: '👥', text: 'Regular', color: tierColors.main }
      case 'vip':
        return { icon: '⭐', text: 'VIP', color: tierColors.main }
      case 'platinum':
        return { icon: '💎', text: 'Platinum', color: tierColors.main }
      default:
        return { icon: '👤', text: 'Regular', color: tierColors.main }
    }
  }

  const tierDisplay = getTierDisplay()

  return (
    <div
      className={`
        premium-appointment-block relative group cursor-pointer transition-all duration-200
        ${isDragging ? 'shadow-xl scale-105 z-50' : ''}
        ${isSelected ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}
        ${className}
      `}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        backgroundColor: colors.light,
        borderLeft: `4px solid ${colors.main}`,
        borderRadius: FreshaBorderRadius.md,
        padding: FreshaSpacing[3],
        boxShadow: isDragging ? FreshaShadows.xl : FreshaShadows.sm,
        border: `1px solid ${colors.main}20`,
        minHeight: '60px',
        ...style
      }}
    >
      {/* Service Type Badge */}
      <div className="absolute top-2 right-2">
        <div
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: colors.main }}
          title={appointment.service_name}
        />
      </div>

      {/* Client Name */}
      <div className="flex items-start justify-between mb-1">
        <h4 
          className="font-semibold truncate pr-4"
          style={{
            color: FreshaColors.gray[900],
            fontSize: FreshaTypography.fontSize.sm,
            fontWeight: FreshaTypography.fontWeight.semibold,
            lineHeight: FreshaTypography.lineHeight.tight
          }}
        >
          {appointment.client_name}
        </h4>
        
        {/* Client Tier Badge */}
        {showClientTier && appointment.client_tier && appointment.client_tier !== 'new' && (
          <Badge 
            variant="secondary"
            className="text-xs px-1 py-0 ml-1"
            style={{
              backgroundColor: `${tierDisplay.color}15`,
              color: tierDisplay.color,
              border: `1px solid ${tierDisplay.color}30`,
              fontSize: '9px'
            }}
          >
            {tierDisplay.icon}
          </Badge>
        )}
      </div>

      {/* Service Name */}
      <p 
        className="text-xs mb-2 truncate"
        style={{
          color: colors.text,
          fontSize: FreshaTypography.fontSize.xs,
          fontWeight: FreshaTypography.fontWeight.medium
        }}
      >
        {appointment.service_name}
      </p>

      {/* Time and Duration Row */}
      <div className="flex items-center justify-between text-xs mb-1">
        <div className="flex items-center space-x-1">
          <ClockIcon className="w-3 h-3" style={{ color: FreshaColors.gray[500] }} />
          <span style={{ color: FreshaColors.gray[600] }}>
            {startTime}
            {showDuration && ` - ${endTime}`}
          </span>
        </div>

        {/* Duration Badge */}
        {showDuration && (
          <Badge 
            variant="outline"
            className="text-xs px-1 py-0"
            style={{
              fontSize: '9px',
              color: FreshaColors.gray[600],
              borderColor: FreshaColors.gray[300],
              backgroundColor: 'transparent'
            }}
          >
            {appointment.duration_minutes}m
          </Badge>
        )}
      </div>

      {/* Price and Status Row */}
      <div className="flex items-center justify-between">
        {/* Price */}
        {showPrice && (
          <div className="flex items-center space-x-1">
            <CurrencyDollarIcon className="w-3 h-3" style={{ color: FreshaColors.services.styling.main }} />
            <span 
              className="font-semibold"
              style={{
                color: FreshaColors.services.styling.dark,
                fontSize: FreshaTypography.fontSize.xs,
                fontWeight: FreshaTypography.fontWeight.semibold
              }}
            >
              ${appointment.price.toFixed(0)}
            </span>
          </div>
        )}

        {/* Status Badge */}
        <Badge 
          variant="secondary"
          className="text-xs px-2 py-0"
          style={{
            backgroundColor: statusColors.light,
            color: statusColors.main,
            border: `1px solid ${statusColors.main}30`,
            fontSize: '9px',
            fontWeight: FreshaTypography.fontWeight.medium
          }}
        >
          <span className="mr-1">{statusDisplay.icon}</span>
          {statusDisplay.text}
        </Badge>
      </div>

      {/* Notes (if present) */}
      {appointment.notes && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p 
            className="text-xs italic truncate"
            style={{
              color: FreshaColors.gray[500],
              fontSize: '10px'
            }}
          >
            {appointment.notes}
          </p>
        </div>
      )}

      {/* Recurring Indicator */}
      {appointment.is_recurring && (
        <div 
          className="absolute top-1 left-1 w-2 h-2 rounded-full"
          style={{ backgroundColor: FreshaColors.primary[400] }}
          title="Recurring Appointment"
        />
      )}

      {/* Hover Overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-200 pointer-events-none"
        style={{ borderRadius: FreshaBorderRadius.md }}
      />

      {/* Drag Handle (when dragging) */}
      {isDragging && (
        <div 
          className="absolute inset-0 border-2 border-dashed border-blue-400 bg-blue-50 bg-opacity-50 flex items-center justify-center"
          style={{ borderRadius: FreshaBorderRadius.md }}
        >
          <span className="text-blue-600 font-medium text-xs">Moving...</span>
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div 
          className="absolute inset-0 border-2 border-blue-400 bg-blue-50 bg-opacity-20"
          style={{ borderRadius: FreshaBorderRadius.md }}
        />
      )}
    </div>
  )
}

export default PremiumAppointmentBlock