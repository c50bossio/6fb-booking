'use client'

import React, { useCallback, useMemo } from 'react'
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
  CheckCircleIcon,
  ExclamationCircleIcon,
  BellIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline'

// Import mobile interactions
import { useMobileInteractions } from '@/hooks/useMobileInteractions'

interface Barber {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar?: string
  specialties?: string[]
  role?: string
}

interface MobileBarberHeaderProps {
  barber: Barber
  availability?: 'available' | 'busy' | 'break' | 'offline'
  appointmentCount?: number
  todayRevenue?: number
  isSelected?: boolean
  showRevenue?: boolean
  showAppointmentCount?: boolean
  showQuickActions?: boolean
  onClick?: (barberId: number) => void
  onQuickAction?: (barberId: number, action: 'call' | 'message' | 'schedule') => void
  className?: string
}

const MobileBarberHeader: React.FC<MobileBarberHeaderProps> = ({
  barber,
  availability = 'available',
  appointmentCount = 0,
  todayRevenue = 0,
  isSelected = false,
  showRevenue = true,
  showAppointmentCount = true,
  showQuickActions = true,
  onClick,
  onQuickAction,
  className = ''
}) => {
  const { 
    triggerHapticFeedback, 
    useLongPress, 
    announceToScreenReader 
  } = useMobileInteractions()

  // Get barber display name
  const displayName = useMemo(() => {
    return barber.name || `${barber.first_name || ''} ${barber.last_name || ''}`.trim() || 'Unknown Barber'
  }, [barber])

  // Get availability colors and icons
  const availabilityConfig = useMemo(() => {
    switch (availability) {
      case 'available':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-300',
          icon: <CheckCircleIcon className="w-3 h-3" />,
          label: 'Available'
        }
      case 'busy':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100', 
          borderColor: 'border-yellow-300',
          icon: <ExclamationCircleIcon className="w-3 h-3" />,
          label: 'Busy'
        }
      case 'break':
        return {
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-300', 
          icon: <ClockIcon className="w-3 h-3" />,
          label: 'On Break'
        }
      case 'offline':
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          icon: <UserIcon className="w-3 h-3" />,
          label: 'Offline'
        }
      default:
        return {
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-300',
          icon: <UserIcon className="w-3 h-3" />,
          label: 'Unknown'
        }
    }
  }, [availability])

  // Handle barber selection with haptic feedback
  const handleClick = useCallback(() => {
    triggerHapticFeedback({ type: 'light' })
    onClick?.(barber.id)
    announceToScreenReader(`Selected ${displayName}`)
  }, [barber.id, onClick, displayName, triggerHapticFeedback, announceToScreenReader])

  // Handle quick actions with haptic feedback
  const handleQuickAction = useCallback((action: 'call' | 'message' | 'schedule', event: React.MouseEvent) => {
    event.stopPropagation()
    triggerHapticFeedback({ type: 'medium' })
    onQuickAction?.(barber.id, action)
    
    const actionMessages = {
      call: `Calling ${displayName}`,
      message: `Messaging ${displayName}`,
      schedule: `Opening schedule for ${displayName}`
    }
    announceToScreenReader(actionMessages[action])
  }, [barber.id, onQuickAction, displayName, triggerHapticFeedback, announceToScreenReader])

  // Long press handlers for additional options
  const longPressHandlers = useLongPress({
    onPress: handleClick,
    onLongPress: () => {
      triggerHapticFeedback({ type: 'heavy' })
      onQuickAction?.(barber.id, 'schedule')
      announceToScreenReader(`Long pressed ${displayName} - opening options`)
    }
  }, {
    threshold: 500,
    enableHaptics: true
  })

  // Get specialties display
  const specialtiesDisplay = useMemo(() => {
    if (!barber.specialties || barber.specialties.length === 0) return null
    
    const maxDisplay = 2
    const displayed = barber.specialties.slice(0, maxDisplay)
    const remaining = barber.specialties.length - maxDisplay
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {displayed.map((specialty, index) => (
          <Badge 
            key={index}
            variant="outline" 
            className="text-xs px-1 py-0 h-4"
          >
            {specialty}
          </Badge>
        ))}
        {remaining > 0 && (
          <Badge variant="outline" className="text-xs px-1 py-0 h-4">
            +{remaining}
          </Badge>
        )}
      </div>
    )
  }, [barber.specialties])

  return (
    <div
      {...longPressHandlers}
      className={`
        relative overflow-hidden rounded-lg border p-3 m-2
        ${availabilityConfig.bgColor} ${availabilityConfig.borderColor}
        ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        transition-all duration-200 ease-in-out
        touch-manipulation cursor-pointer
        hover:shadow-sm active:scale-95
        min-h-[100px]
        ${className}
      `}
      style={{
        minHeight: '100px',
        ...FreshaShadows.sm
      }}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between mb-3">
        {/* Avatar and Name */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {barber.avatar ? (
              <img
                src={barber.avatar}
                alt={displayName}
                className="w-12 h-12 rounded-full object-cover border-2 border-white"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border-2 border-white">
                <UserIcon className="w-6 h-6 text-gray-400" />
              </div>
            )}
            
            {/* Availability Indicator */}
            <div className={`
              absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white
              flex items-center justify-center ${availabilityConfig.bgColor}
            `}>
              <div className={`w-2 h-2 rounded-full ${availabilityConfig.color.replace('text-', 'bg-')}`} />
            </div>
          </div>

          {/* Name and Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-gray-900 truncate">
              {displayName}
            </h3>
            <div className={`flex items-center space-x-1 text-xs ${availabilityConfig.color} mt-1`}>
              {availabilityConfig.icon}
              <span>{availabilityConfig.label}</span>
            </div>
            {barber.role && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                {barber.role}
              </p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {showQuickActions && (
          <div className="flex flex-col space-y-1 flex-shrink-0 ml-2">
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-7 w-7 rounded-full hover:bg-white/50"
              onClick={(e) => handleQuickAction('message', e)}
              aria-label={`Message ${displayName}`}
            >
              <ChatBubbleLeftRightIcon className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-7 w-7 rounded-full hover:bg-white/50"
              onClick={(e) => handleQuickAction('schedule', e)}
              aria-label={`View ${displayName}'s schedule`}
            >
              <ClockIcon className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Stats Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Appointment Count */}
          {showAppointmentCount && (
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <ClockIcon className="w-3 h-3" />
              <span className="font-medium">{appointmentCount}</span>
              <span>appointments</span>
            </div>
          )}

          {/* Revenue */}
          {showRevenue && (
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <CurrencyDollarIcon className="w-3 h-3" />
              <span className="font-medium">${todayRevenue}</span>
              <span>today</span>
            </div>
          )}
        </div>

        {/* VIP/Star Indicator */}
        {todayRevenue > 500 && (
          <div className="flex items-center space-x-1">
            <StarIcon className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-amber-600 font-medium">Top Performer</span>
          </div>
        )}
      </div>

      {/* Specialties */}
      {specialtiesDisplay}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 flex items-center justify-center">
            <CheckCircleIcon className="w-2 h-2 text-white" />
          </div>
        </div>
      )}

      {/* Touch Ripple Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 rounded-lg bg-white opacity-0 transition-opacity duration-150 peer-active:opacity-10" />
      </div>
    </div>
  )
}

export default MobileBarberHeader