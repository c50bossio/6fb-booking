'use client'

import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { 
  ClockIcon, 
  UserIcon, 
  ScissorsIcon,
  StarIcon,
  EllipsisHorizontalIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { 
  CheckCircleIcon as CheckCircleIconSolid,
  StarIcon as StarIconSolid 
} from '@heroicons/react/24/solid'
import { getTheme, enhanceAppointmentStyling, interactionStates } from '@/lib/calendar-premium-theme'
import type { BookingResponse } from '@/lib/api'

interface PremiumAppointmentCardProps {
  appointment: BookingResponse
  size?: 'compact' | 'normal' | 'expanded'
  theme?: 'platinum' | 'pearl' | 'aurora'
  showDetails?: boolean
  showActions?: boolean
  draggable?: boolean
  onClick?: (appointment: BookingResponse) => void
  onEdit?: (appointment: BookingResponse) => void
  onCancel?: (appointment: BookingResponse) => void
  onReschedule?: (appointment: BookingResponse) => void
  className?: string
}

const serviceIcons = {
  haircut: ScissorsIcon,
  styling: ScissorsIcon,
  beard: ScissorsIcon,
  color: ScissorsIcon,
  default: ScissorsIcon
}

const statusConfigs = {
  confirmed: {
    icon: CheckCircleIconSolid,
    color: 'text-green-600',
    bg: 'bg-green-50/80',
    border: 'border-green-200/60',
    glow: 'shadow-green-500/20'
  },
  pending: {
    icon: ClockIcon,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50/80',
    border: 'border-yellow-200/60',
    glow: 'shadow-yellow-500/20'
  },
  completed: {
    icon: CheckCircleIconSolid,
    color: 'text-blue-600',
    bg: 'bg-blue-50/80',
    border: 'border-blue-200/60',
    glow: 'shadow-blue-500/20'
  },
  cancelled: {
    icon: ExclamationTriangleIcon,
    color: 'text-red-600',
    bg: 'bg-red-50/80',
    border: 'border-red-200/60',
    glow: 'shadow-red-500/20'
  }
}

export default function PremiumAppointmentCard({
  appointment,
  size = 'normal',
  theme = 'pearl',
  showDetails = true,
  showActions = false,
  draggable = true,
  onClick,
  onEdit,
  onCancel,
  onReschedule,
  className = ''
}: PremiumAppointmentCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [rippleActive, setRippleActive] = useState(false)
  const [rippleCoords, setRippleCoords] = useState({ x: 0, y: 0 })
  const cardRef = useRef<HTMLDivElement>(null)
  const themeConfig = getTheme(theme)

  const startTime = new Date(appointment.start_time)
  const serviceType = appointment.service_name?.toLowerCase().includes('haircut') ? 'haircut' : 'default'
  const ServiceIcon = serviceIcons[serviceType as keyof typeof serviceIcons]
  const statusConfig = statusConfigs[appointment.status as keyof typeof statusConfigs] || statusConfigs.pending
  const StatusIcon = statusConfig.icon

  // Handle ripple effect on click
  const handleClick = (e: React.MouseEvent) => {
    if (!onClick) return

    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) {
      setRippleCoords({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      setRippleActive(true)
      setTimeout(() => setRippleActive(false), 600)
    }

    onClick(appointment)
  }

  // Enhanced drag handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!draggable || appointment.status === 'completed' || appointment.status === 'cancelled') {
      e.preventDefault()
      return
    }

    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', appointment.id.toString())
    
    // Add haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(100)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  // Size configurations
  const sizeConfigs = {
    compact: {
      padding: 'p-2',
      text: 'text-xs',
      spacing: 'space-y-1',
      height: 'min-h-[60px]',
      iconSize: 'w-3 h-3'
    },
    normal: {
      padding: 'p-3',
      text: 'text-sm',
      spacing: 'space-y-2',
      height: 'min-h-[80px]',
      iconSize: 'w-4 h-4'
    },
    expanded: {
      padding: 'p-4',
      text: 'text-base',
      spacing: 'space-y-3',
      height: 'min-h-[100px]',
      iconSize: 'w-5 h-5'
    }
  }

  const sizeConfig = sizeConfigs[size]

  const baseClasses = enhanceAppointmentStyling(
    `relative overflow-hidden rounded-xl border transition-all duration-300 transform-gpu cursor-pointer group ${sizeConfig.height} ${sizeConfig.padding}`,
    themeConfig
  )

  const cardClasses = `${baseClasses} ${statusConfig.bg} ${statusConfig.border} ${className} ${
    isHovered ? 'shadow-lg scale-[1.02] -translate-y-0.5' : 'shadow-md'
  } ${
    isDragging ? 'opacity-60 scale-95 rotate-2' : ''
  } ${
    draggable && appointment.status !== 'completed' && appointment.status !== 'cancelled' 
      ? 'cursor-move' 
      : 'cursor-pointer'
  } ${interactionStates.focus.appointment}`

  return (
    <div
      ref={cardRef}
      className={cardClasses}
      draggable={draggable && appointment.status !== 'completed' && appointment.status !== 'cancelled'}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowMenu(false)
      }}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.(appointment)
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Appointment: ${appointment.client_name} at ${format(startTime, 'h:mm a')} for ${appointment.service_name}`}
    >
      {/* Ripple effect */}
      {rippleActive && (
        <div
          className="absolute rounded-full bg-white/30 animate-ping pointer-events-none"
          style={{
            left: rippleCoords.x - 10,
            top: rippleCoords.y - 10,
            width: 20,
            height: 20,
          }}
        />
      )}

      {/* Background gradient overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-primary-500/5 to-primary-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
      />

      {/* Status indicator */}
      <div className="absolute top-2 right-2 flex items-center gap-1">
        <StatusIcon className={`${sizeConfig.iconSize} ${statusConfig.color}`} />
        {size === 'expanded' && (
          <span className={`text-xs font-medium ${statusConfig.color} capitalize`}>
            {appointment.status}
          </span>
        )}
      </div>

      {/* Action menu button */}
      {showActions && isHovered && (
        <div className="absolute top-2 right-8">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 rounded-full bg-white/80 shadow-sm hover:bg-white transition-colors duration-200"
          >
            <EllipsisHorizontalIcon className="w-4 h-4 text-gray-600" />
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute top-8 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-32">
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(appointment)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
              )}
              {onReschedule && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onReschedule(appointment)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 transition-colors"
                >
                  Reschedule
                </button>
              )}
              {onCancel && appointment.status !== 'cancelled' && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onCancel(appointment)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className={`${sizeConfig.spacing} relative z-10`}>
        {/* Time and service */}
        <div className="flex items-center gap-2">
          <ClockIcon className={`${sizeConfig.iconSize} text-gray-600 group-hover:text-primary-600 transition-colors duration-200`} />
          <span className={`${sizeConfig.text} font-medium text-gray-900`}>
            {format(startTime, 'h:mm a')}
          </span>
          {size !== 'compact' && (
            <>
              <span className="text-gray-400">•</span>
              <ServiceIcon className={`${sizeConfig.iconSize} text-gray-500`} />
              <span className={`${sizeConfig.text} text-gray-700 truncate`}>
                {appointment.service_name}
              </span>
            </>
          )}
        </div>

        {/* Client info */}
        <div className="flex items-center gap-2">
          <UserIcon className={`${sizeConfig.iconSize} text-gray-600 group-hover:text-primary-600 transition-colors duration-200`} />
          <span className={`${sizeConfig.text} font-medium text-gray-900 truncate`}>
            {appointment.client_name}
          </span>
        </div>

        {/* Additional details for expanded view */}
        {size === 'expanded' && showDetails && (
          <div className="mt-2 space-y-1">
            {appointment.barber_name && (
              <div className="flex items-center gap-2">
                <ScissorsIcon className={`${sizeConfig.iconSize} text-gray-500`} />
                <span className="text-sm text-gray-600">
                  {appointment.barber_name}
                </span>
              </div>
            )}
            
            {appointment.price && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Price:</span>
                <span className="text-sm font-medium text-green-600">
                  ${appointment.price.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress bar for ongoing appointments */}
      {appointment.status === 'confirmed' && size !== 'compact' && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary-500 to-primary-600 animate-pulse"
            style={{ width: '60%' }}
          />
        </div>
      )}

      {/* Drag indicator */}
      {isDragging && (
        <div className="absolute inset-0 border-2 border-dashed border-primary-400 rounded-xl bg-primary-50/50 flex items-center justify-center">
          <span className="text-primary-600 font-medium text-sm">Moving...</span>
        </div>
      )}

      {/* Premium glow effect on hover */}
      <div 
        className={`absolute inset-0 rounded-xl transition-all duration-300 pointer-events-none ${
          isHovered ? `shadow-lg ${statusConfig.glow}` : ''
        }`}
      />
    </div>
  )
}