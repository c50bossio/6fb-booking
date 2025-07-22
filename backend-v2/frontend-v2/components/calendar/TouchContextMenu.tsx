/**
 * Touch-optimized context menu for calendar appointments and time slots
 * Features premium animations, large touch targets, and Six Figure Barber branding
 */

'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { 
  PencilIcon, 
  TrashIcon, 
  DocumentDuplicateIcon, 
  ClockIcon, 
  UserIcon, 
  CalendarIcon,
  PhoneIcon,
  EnvelopeIcon,
  XMarkIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import type { BookingResponse } from '@/lib/api'

export interface ContextMenuAction {
  id: string
  label: string
  icon: React.ComponentType<any>
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray'
  disabled?: boolean
  destructive?: boolean
  premium?: boolean
  handler: () => void | Promise<void>
}

export interface TouchContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  appointment?: BookingResponse
  timeSlot?: { date: Date; hour: number; minute: number }
  actions: ContextMenuAction[]
  onClose: () => void
  onActionComplete?: (actionId: string) => void
}

const colorClasses = {
  blue: 'bg-blue-600 hover:bg-blue-700 text-white',
  green: 'bg-green-600 hover:bg-green-700 text-white',
  red: 'bg-red-600 hover:bg-red-700 text-white',
  yellow: 'bg-yellow-500 hover:bg-yellow-600 text-white',
  purple: 'bg-purple-600 hover:bg-purple-700 text-white',
  gray: 'bg-gray-600 hover:bg-gray-700 text-white'
}

const iconColorClasses = {
  blue: 'text-blue-600',
  green: 'text-green-600',
  red: 'text-red-600',
  yellow: 'text-yellow-600',
  purple: 'text-purple-600',
  gray: 'text-gray-600'
}

export function TouchContextMenu({
  isOpen,
  position,
  appointment,
  timeSlot,
  actions,
  onClose,
  onActionComplete
}: TouchContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [executingAction, setExecutingAction] = useState<string | null>(null)

  // Handle clicks outside menu
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    // Add slight delay to prevent immediate closing
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  // Animation control
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
    } else {
      setIsAnimating(false)
    }
  }, [isOpen])

  // Handle action execution
  const executeAction = useCallback(async (action: ContextMenuAction) => {
    if (action.disabled || executingAction) return

    setExecutingAction(action.id)
    
    try {
      // Provide haptic feedback
      if ('vibrate' in navigator) {
        if (action.destructive) {
          navigator.vibrate([50, 50, 100])
        } else {
          navigator.vibrate(30)
        }
      }

      await action.handler()
      onActionComplete?.(action.id)
    } catch (error) {
      console.error(`Action ${action.id} failed:`, error)
      
      // Error haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
    } finally {
      setExecutingAction(null)
      onClose()
    }
  }, [executingAction, onActionComplete, onClose])

  // Calculate menu position
  const calculatePosition = useCallback(() => {
    if (!menuRef.current) return { left: position.x, top: position.y }

    const menu = menuRef.current
    const menuRect = menu.getBoundingClientRect()
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight
    }

    let left = position.x
    let top = position.y

    // Adjust horizontal position
    if (left + menuRect.width > viewport.width - 20) {
      left = viewport.width - menuRect.width - 20
    }
    if (left < 20) {
      left = 20
    }

    // Adjust vertical position
    if (top + menuRect.height > viewport.height - 20) {
      top = position.y - menuRect.height - 10
    }
    if (top < 20) {
      top = 20
    }

    return { left, top }
  }, [position])

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-200 ${
          isAnimating ? 'opacity-30' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        className={`
          absolute bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-600
          p-2 min-w-[280px] max-w-[320px] transform transition-all duration-300 ease-out
          ${isAnimating ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}
        `}
        style={calculatePosition()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              {appointment ? (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    {appointment.client_name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {new Date(appointment.start_time).toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              ) : timeSlot ? (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                    New Appointment
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {timeSlot.date.toLocaleString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })} at {timeSlot.hour.toString().padStart(2, '0')}:{timeSlot.minute.toString().padStart(2, '0')}
                  </p>
                </div>
              ) : (
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  Quick Actions
                </h3>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="p-2 space-y-1">
          {actions.map((action, index) => {
            const Icon = action.icon
            const isExecuting = executingAction === action.id
            const color = action.color || 'blue'
            
            return (
              <button
                key={action.id}
                onClick={() => executeAction(action)}
                disabled={action.disabled || isExecuting}
                className={`
                  w-full flex items-center space-x-3 px-4 py-4 rounded-xl transition-all duration-150
                  ${action.disabled ? 
                    'opacity-50 cursor-not-allowed' : 
                    'hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-98'
                  }
                  ${action.destructive ? 'hover:bg-red-50 dark:hover:bg-red-900/20' : ''}
                  ${action.premium ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20' : ''}
                  relative overflow-hidden min-h-[56px]
                `}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                {/* Icon */}
                <div className={`
                  flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                  ${action.disabled ? 'bg-gray-200 dark:bg-gray-600' : 
                    action.destructive ? 'bg-red-100 dark:bg-red-900/30' :
                    action.premium ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                    'bg-blue-100 dark:bg-blue-900/30'
                  }
                `}>
                  {isExecuting ? (
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Icon className={`w-5 h-5 ${
                      action.disabled ? 'text-gray-400' :
                      action.destructive ? 'text-red-600' :
                      action.premium ? 'text-white' :
                      iconColorClasses[color]
                    }`} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {action.label}
                  </div>
                  {action.premium && (
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                      Premium Feature
                    </div>
                  )}
                </div>

                {/* Success indicator */}
                {isExecuting && (
                  <CheckIcon className="w-5 h-5 text-green-600 opacity-0 animate-pulse" />
                )}

                {/* Ripple effect on touch */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -translate-x-full transition-transform duration-300 group-active:translate-x-full" />
              </button>
            )
          })}
        </div>

        {/* Footer */}
        {(appointment || timeSlot) && (
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Hold and drag to move • Double tap to edit
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// Predefined action creators for common use cases
export const createAppointmentActions = (
  appointment: BookingResponse,
  callbacks: {
    onEdit?: () => void
    onDelete?: () => void
    onDuplicate?: () => void
    onCall?: () => void
    onEmail?: () => void
    onReschedule?: () => void
  }
): ContextMenuAction[] => {
  return [
    {
      id: 'edit',
      label: 'Edit Appointment',
      icon: PencilIcon,
      color: 'blue',
      handler: callbacks.onEdit || (() => {})
    },
    {
      id: 'reschedule',
      label: 'Reschedule',
      icon: ClockIcon,
      color: 'purple',
      handler: callbacks.onReschedule || (() => {})
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: DocumentDuplicateIcon,
      color: 'green',
      handler: callbacks.onDuplicate || (() => {})
    },
    {
      id: 'call',
      label: 'Call Client',
      icon: PhoneIcon,
      color: 'blue',
      disabled: !appointment.client_phone,
      handler: callbacks.onCall || (() => {
        if (appointment.client_phone) {
          window.location.href = `tel:${appointment.client_phone}`
        }
      })
    },
    {
      id: 'email',
      label: 'Email Client',
      icon: EnvelopeIcon,
      color: 'gray',
      disabled: !appointment.client_email,
      handler: callbacks.onEmail || (() => {
        if (appointment.client_email) {
          window.location.href = `mailto:${appointment.client_email}`
        }
      })
    },
    {
      id: 'delete',
      label: 'Delete Appointment',
      icon: TrashIcon,
      color: 'red',
      destructive: true,
      handler: callbacks.onDelete || (() => {})
    }
  ]
}

export const createTimeSlotActions = (
  timeSlot: { date: Date; hour: number; minute: number },
  callbacks: {
    onBookNew?: () => void
    onBlockTime?: () => void
    onSetBreak?: () => void
  }
): ContextMenuAction[] => {
  return [
    {
      id: 'book-new',
      label: 'Book Appointment',
      icon: CalendarIcon,
      color: 'blue',
      premium: true,
      handler: callbacks.onBookNew || (() => {})
    },
    {
      id: 'set-break',
      label: 'Set Break Time',
      icon: ClockIcon,
      color: 'yellow',
      handler: callbacks.onSetBreak || (() => {})
    },
    {
      id: 'block-time',
      label: 'Block Time Slot',
      icon: XMarkIcon,
      color: 'red',
      handler: callbacks.onBlockTime || (() => {})
    }
  ]
}

export default TouchContextMenu