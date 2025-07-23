'use client'

import React, { useState, useRef, useEffect } from 'react'
import { format } from 'date-fns'
import { UserIcon, ClockIcon, PhoneIcon, MapPinIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import type { BookingResponse } from '@/lib/api'

interface AppointmentTooltipProps {
  appointment: BookingResponse
  children: React.ReactNode
  delay?: number
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
}

interface TooltipPosition {
  top: number
  left: number
  position: 'top' | 'bottom' | 'left' | 'right'
}

/**
 * Lightweight tooltip that shows appointment details on hover
 * Automatically positions itself to stay within viewport
 */
export function AppointmentTooltip({ 
  appointment, 
  children, 
  delay = 500,
  position = 'auto' 
}: AppointmentTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()

  const calculatePosition = (preferredPosition: string): TooltipPosition => {
    if (!triggerRef.current || !tooltipRef.current) {
      return { top: 0, left: 0, position: 'top' }
    }

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    const positions = {
      top: {
        top: triggerRect.top - tooltipRect.height - 8,
        left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2),
        position: 'top' as const
      },
      bottom: {
        top: triggerRect.bottom + 8,
        left: triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2),
        position: 'bottom' as const
      },
      left: {
        top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2),
        left: triggerRect.left - tooltipRect.width - 8,
        position: 'left' as const
      },
      right: {
        top: triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2),
        left: triggerRect.right + 8,
        position: 'right' as const
      }
    }

    // Auto-position logic
    if (preferredPosition === 'auto') {
      // Try positions in order of preference
      const tryOrder: (keyof typeof positions)[] = ['top', 'bottom', 'right', 'left']
      
      for (const pos of tryOrder) {
        const candidate = positions[pos]
        const wouldFitHorizontally = candidate.left >= 0 && candidate.left + tooltipRect.width <= viewport.width
        const wouldFitVertically = candidate.top >= 0 && candidate.top + tooltipRect.height <= viewport.height
        
        if (wouldFitHorizontally && wouldFitVertically) {
          return candidate
        }
      }
      
      // Fallback to top if nothing fits
      return positions.top
    }

    return positions[preferredPosition as keyof typeof positions] || positions.top
  }

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      // Calculate position after tooltip becomes visible (for accurate measurements)
      setTimeout(() => {
        const pos = calculatePosition(position)
        setTooltipPosition(pos)
      }, 0)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
    setTooltipPosition(null)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      case 'completed':
        return 'text-blue-600 bg-blue-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'h:mm a')
    } catch {
      return 'Invalid time'
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy')
    } catch {
      return 'Invalid date'
    }
  }

  return (
    <div className="relative inline-block">
      {/* Trigger element */}
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="cursor-pointer"
      >
        {children}
      </div>

      {/* Tooltip */}
      {isVisible && (
        <>
          {/* Backdrop for mobile to dismiss tooltip */}
          <div 
            className="fixed inset-0 z-40 md:hidden" 
            onClick={hideTooltip}
          />
          
          <div
            ref={tooltipRef}
            className={`
              fixed z-50 w-80 max-w-xs bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4
              transition-all duration-200 ease-out
              ${isVisible && tooltipPosition ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}
            `}
            style={tooltipPosition ? {
              top: tooltipPosition.top,
              left: Math.max(8, Math.min(tooltipPosition.left, window.innerWidth - 320 - 8))
            } : { visibility: 'hidden' }}
          >
            {/* Arrow */}
            <div 
              className={`absolute w-2 h-2 bg-white dark:bg-gray-800 border transform rotate-45 ${
                tooltipPosition?.position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-b border-r border-gray-200 dark:border-gray-700' :
                tooltipPosition?.position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-t border-l border-gray-200 dark:border-gray-700' :
                tooltipPosition?.position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 border-t border-r border-gray-200 dark:border-gray-700' :
                'left-[-4px] top-1/2 -translate-y-1/2 border-b border-l border-gray-200 dark:border-gray-700'
              }`}
            />

            {/* Content */}
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {appointment.service_name}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(appointment.status)}`}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </span>
                </div>
                {appointment.price && (
                  <div className="flex items-center text-green-600 dark:text-green-400 font-semibold">
                    <CurrencyDollarIcon className="w-4 h-4 mr-1" />
                    {appointment.price}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-2 text-sm">
                {/* Client */}
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <UserIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{appointment.client_name}</span>
                </div>

                {/* Time */}
                <div className="flex items-center text-gray-600 dark:text-gray-300">
                  <ClockIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>
                    {formatTime(appointment.start_time)}
                    {appointment.duration_minutes && (
                      <span className="text-gray-400 dark:text-gray-500">
                        {' '}({appointment.duration_minutes}min)
                      </span>
                    )}
                  </span>
                </div>

                {/* Phone (if available) */}
                {appointment.client_phone && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <PhoneIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{appointment.client_phone}</span>
                  </div>
                )}

                {/* Barber (if available) */}
                {appointment.barber_name && (
                  <div className="flex items-center text-gray-600 dark:text-gray-300">
                    <MapPinIcon className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>with {appointment.barber_name}</span>
                  </div>
                )}

                {/* Notes (if available) */}
                {appointment.notes && (
                  <div className="text-gray-600 dark:text-gray-300 text-xs bg-gray-50 dark:bg-gray-700 p-2 rounded">
                    {appointment.notes}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-600 pt-2">
                {formatDate(appointment.start_time)}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Simplified version for mobile devices with reduced content
 */
export function MobileAppointmentTooltip({ appointment, children }: Omit<AppointmentTooltipProps, 'delay' | 'position'>) {
  return (
    <AppointmentTooltip
      appointment={appointment}
      delay={300}
      position="auto"
    >
      {children}
    </AppointmentTooltip>
  )
}