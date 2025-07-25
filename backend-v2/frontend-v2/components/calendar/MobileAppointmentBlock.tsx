'use client'

import React, { useCallback, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FreshaColors, 
  FreshaTypography, 
  FreshaBorderRadius,
  FreshaShadows 
} from '@/lib/fresha-design-system'
import {
  UserIcon,
  ClockIcon,
  CurrencyDollarIcon,
  StarIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline'

// Import mobile interactions
import { useMobileInteractions } from '@/hooks/useMobileInteractions'

interface Appointment {
  id: number
  client_name: string
  client_id?: number
  service_name: string
  service_id?: number
  start_time: string
  duration_minutes: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  client_tier?: 'new' | 'regular' | 'vip' | 'platinum'
  barber_id: number
  notes?: string
  is_recurring?: boolean
  created_at?: string
}

interface MobileAppointmentBlockProps {
  appointment: Appointment
  colorScheme?: 'service-based' | 'status-based' | 'tier-based'
  showPrice?: boolean
  showDuration?: boolean
  showClientTier?: boolean
  showQuickActions?: boolean
  isSelected?: boolean
  onClick?: (appointment: Appointment) => void
  onQuickAction?: (appointment: Appointment, action: 'call' | 'message' | 'menu') => void
  className?: string
}

const MobileAppointmentBlock: React.FC<MobileAppointmentBlockProps> = ({
  appointment,
  colorScheme = 'status-based',
  showPrice = true,
  showDuration = true,
  showClientTier = true,
  showQuickActions = true,
  isSelected = false,
  onClick,
  onQuickAction,
  className = ''
}) => {
  const { 
    triggerHapticFeedback, 
    useLongPress, 
    announceToScreenReader 
  } = useMobileInteractions()

  // Get color scheme based on appointment properties
  const colors = useMemo(() => {
    switch (colorScheme) {
      case 'service-based':
        // Color based on service type (simplified mapping)
        const serviceColors: Record<string, any> = {
          'haircut': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
          'beard': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
          'shave': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
          'styling': { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800' },
          'default': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800' }
        }
        const serviceKey = appointment.service_name.toLowerCase().includes('haircut') ? 'haircut' :
                          appointment.service_name.toLowerCase().includes('beard') ? 'beard' :
                          appointment.service_name.toLowerCase().includes('shave') ? 'shave' :
                          appointment.service_name.toLowerCase().includes('styling') ? 'styling' : 'default'
        return serviceColors[serviceKey]

      case 'tier-based':
        const tierColors = {
          'new': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
          'regular': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
          'vip': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800' },
          'platinum': { bg: 'bg-amber-100', border: 'border-amber-300', text: 'text-amber-800' }
        }
        return tierColors[appointment.client_tier || 'regular']

      case 'status-based':
      default:
        const statusColors = {
          'confirmed': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
          'pending': { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-800' },
          'completed': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800' },
          'cancelled': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
          'no_show': { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-800' }
        }
        return statusColors[appointment.status]
    }
  }, [appointment, colorScheme])

  // Handle appointment click with haptic feedback
  const handleClick = useCallback(() => {
    triggerHapticFeedback({ type: 'light' })
    onClick?.(appointment)
    announceToScreenReader(`Selected appointment with ${appointment.client_name}`)
  }, [appointment, onClick, triggerHapticFeedback, announceToScreenReader])

  // Handle quick actions with haptic feedback
  const handleQuickAction = useCallback((action: 'call' | 'message' | 'menu', event: React.MouseEvent) => {
    event.stopPropagation()
    triggerHapticFeedback({ type: 'medium' })
    onQuickAction?.(appointment, action)
    
    const actionMessages = {
      call: `Calling ${appointment.client_name}`,
      message: `Messaging ${appointment.client_name}`,
      menu: `Opening menu for ${appointment.client_name}`
    }
    announceToScreenReader(actionMessages[action])
  }, [appointment, onQuickAction, triggerHapticFeedback, announceToScreenReader])

  // Long press handlers for additional options
  const longPressHandlers = useLongPress({
    onPress: handleClick,
    onLongPress: () => {
      triggerHapticFeedback({ type: 'heavy' })
      onQuickAction?.(appointment, 'menu')
      announceToScreenReader(`Long pressed appointment with ${appointment.client_name}`)
    }
  }, {
    threshold: 500,
    enableHaptics: true
  })

  // Format appointment time
  const appointmentTime = useMemo(() => {
    const startTime = parseISO(appointment.start_time)
    const endTime = new Date(startTime.getTime() + appointment.duration_minutes * 60000)
    return {
      start: format(startTime, 'h:mm a'),
      end: format(endTime, 'h:mm a'),
      duration: appointment.duration_minutes
    }
  }, [appointment])

  // Get tier icon
  const getTierIcon = () => {
    switch (appointment.client_tier) {
      case 'vip':
      case 'platinum':
        return <StarIcon className="w-3 h-3" />
      default:
        return null
    }
  }

  // Get status badge variant
  const getStatusBadgeVariant = () => {
    switch (appointment.status) {
      case 'confirmed':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'completed':
        return 'outline'
      case 'cancelled':
      case 'no_show':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  return (
    <div
      {...longPressHandlers}
      className={`
        relative overflow-hidden rounded-lg border-l-4 p-3 m-1 
        ${colors.bg} ${colors.border} ${colors.text}
        ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        transition-all duration-200 ease-in-out
        touch-manipulation cursor-pointer
        hover:shadow-sm active:scale-95
        min-h-[80px] flex flex-col justify-between
        ${className}
      `}
      style={{
        minHeight: '80px',
        borderLeftWidth: '4px',
        ...FreshaShadows.sm
      }}
    >
      {/* Main Content */}
      <div className="flex-1">
        {/* Header Row */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            {/* Client Name with Tier Icon */}
            <div className="flex items-center space-x-1 mb-1">
              <UserIcon className="w-4 h-4 flex-shrink-0" />
              <h3 className="font-semibold text-sm truncate">
                {appointment.client_name}
              </h3>
              {showClientTier && getTierIcon() && (
                <div className="flex-shrink-0 text-amber-500">
                  {getTierIcon()}
                </div>
              )}
            </div>

            {/* Service Name */}
            <p className="text-xs font-medium truncate mb-1">
              {appointment.service_name}
            </p>
          </div>

          {/* Status Badge */}
          <Badge 
            variant={getStatusBadgeVariant()}
            className="text-xs flex-shrink-0 ml-2"
          >
            {appointment.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Details Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-3">
            {/* Time */}
            <div className="flex items-center space-x-1">
              <ClockIcon className="w-3 h-3" />
              <span>{appointmentTime.start}</span>
              {showDuration && (
                <span className="text-gray-500">
                  ({appointment.duration_minutes}m)
                </span>
              )}
            </div>

            {/* Price */}
            {showPrice && (
              <div className="flex items-center space-x-1">
                <CurrencyDollarIcon className="w-3 h-3" />
                <span className="font-medium">${appointment.price}</span>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          {showQuickActions && (
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6 rounded-full hover:bg-white/50"
                onClick={(e) => handleQuickAction('call', e)}
                aria-label={`Call ${appointment.client_name}`}
              >
                <PhoneIcon className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6 rounded-full hover:bg-white/50"
                onClick={(e) => handleQuickAction('message', e)}
                aria-label={`Message ${appointment.client_name}`}
              >
                <ChatBubbleLeftIcon className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="p-1 h-6 w-6 rounded-full hover:bg-white/50"
                onClick={(e) => handleQuickAction('menu', e)}
                aria-label={`More options for ${appointment.client_name}`}
              >
                <EllipsisHorizontalIcon className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Notes Indicator */}
      {appointment.notes && (
        <div className="mt-2 pt-2 border-t border-current border-opacity-20">
          <p className="text-xs opacity-75 truncate">
            💬 {appointment.notes}
          </p>
        </div>
      )}

      {/* Recurring Indicator */}
      {appointment.is_recurring && (
        <div className="absolute top-1 right-1">
          <div className="w-2 h-2 rounded-full bg-current opacity-60" />
        </div>
      )}

      {/* Touch Ripple Effect (for visual feedback) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 rounded-lg bg-white opacity-0 transition-opacity duration-150 peer-active:opacity-10" />
      </div>
    </div>
  )
}

export default MobileAppointmentBlock