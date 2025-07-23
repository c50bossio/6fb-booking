/**
 * Swipe-to-reveal appointment actions with smooth animations and haptic feedback
 * Provides iOS-style swipe interactions for mobile calendar appointments
 */

'use client'

import React, { useRef, useState, useCallback, useEffect } from 'react'
import { 
  PencilIcon, 
  TrashIcon, 
  DocumentDuplicateIcon,
  ClockIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useTouchEnhancements } from '@/lib/mobile-touch-enhancements'
import type { BookingResponse } from '@/lib/api'

export interface SwipeAction {
  id: string
  label: string
  icon: React.ComponentType<any>
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  width: number
  handler: () => void | Promise<void>
}

export interface SwipeRevealAppointmentProps {
  appointment: BookingResponse
  children: React.ReactNode
  actions: SwipeAction[]
  onSwipeStart?: () => void
  onSwipeEnd?: () => void
  onActionExecute?: (actionId: string) => void
  disabled?: boolean
  className?: string
}

const actionColors = {
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-500 text-white',
  purple: 'bg-purple-500 text-white'
}

export function SwipeRevealAppointment({
  appointment,
  children,
  actions,
  onSwipeStart,
  onSwipeEnd,
  onActionExecute,
  disabled = false,
  className = ''
}: SwipeRevealAppointmentProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [executingAction, setExecutingAction] = useState<string | null>(null)
  const [canReveal, setCanReveal] = useState(true)

  // Calculate total actions width
  const totalActionsWidth = actions.reduce((sum, action) => sum + action.width, 0)
  const maxRevealDistance = Math.min(totalActionsWidth, 200) // Cap at 200px

  // Handle swipe gesture
  const handleGesture = useCallback((gesture: any) => {
    if (disabled || !canReveal) return

    switch (gesture.type) {
      case 'swipe':
        if (gesture.direction === 'left' && Math.abs(gesture.deltaX || 0) > 30) {
          // Reveal actions
          setSwipeOffset(-maxRevealDistance)
          setIsRevealed(true)
          onSwipeStart?.()
          
          // Haptic feedback
          if ('vibrate' in navigator) {
            navigator.vibrate(25)
          }
        } else if (gesture.direction === 'right' && isRevealed) {
          // Hide actions
          setSwipeOffset(0)
          setIsRevealed(false)
          onSwipeEnd?.()
        }
        break

      case 'drag':
        if (Math.abs(gesture.deltaX || 0) > 5) {
          const newOffset = Math.max(-maxRevealDistance, Math.min(0, -(gesture.deltaX || 0)))
          setSwipeOffset(newOffset)
          
          // Provide progressive feedback
          const revealPercentage = Math.abs(newOffset) / maxRevealDistance
          if (revealPercentage > 0.3 && !isRevealed) {
            setIsRevealed(true)
            onSwipeStart?.()
            
            if ('vibrate' in navigator) {
              navigator.vibrate(15)
            }
          } else if (revealPercentage <= 0.1 && isRevealed) {
            setIsRevealed(false)
            onSwipeEnd?.()
          }
        }
        break
    }
  }, [disabled, canReveal, maxRevealDistance, isRevealed, onSwipeStart, onSwipeEnd])

  // Set up touch enhancements
  useTouchEnhancements(containerRef, handleGesture, {
    enableSwipe: true,
    enableDoubleTap: false,
    enableLongPress: false,
    swipeThreshold: 20,
    preventDefaultOnSwipe: true
  })

  // Execute action
  const executeAction = useCallback(async (action: SwipeAction) => {
    if (executingAction) return

    setExecutingAction(action.id)
    setCanReveal(false)
    
    try {
      // Strong haptic feedback for action execution
      if ('vibrate' in navigator) {
        if (action.color === 'red') {
          navigator.vibrate([50, 50, 100]) // Destructive action pattern
        } else {
          navigator.vibrate(40)
        }
      }

      await action.handler()
      onActionExecute?.(action.id)

      // Success haptic
      if ('vibrate' in navigator) {
        navigator.vibrate([25, 25, 25])
      }
    } catch (error) {
      console.error(`Action ${action.id} failed:`, error)
      
      // Error haptic
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100])
      }
    } finally {
      setExecutingAction(null)
      setCanReveal(true)
      
      // Auto-hide after action
      setTimeout(() => {
        setSwipeOffset(0)
        setIsRevealed(false)
        onSwipeEnd?.()
      }, 500)
    }
  }, [executingAction, onActionExecute, onSwipeEnd])

  // Auto-hide on outside click
  useEffect(() => {
    if (!isRevealed) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSwipeOffset(0)
        setIsRevealed(false)
        onSwipeEnd?.()
      }
    }

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isRevealed, onSwipeEnd])

  // Render action button
  const renderAction = (action: SwipeAction, index: number) => {
    const isExecuting = executingAction === action.id
    const Icon = action.icon
    
    return (
      <button
        key={action.id}
        onClick={() => executeAction(action)}
        disabled={isExecuting || !canReveal}
        className={`
          flex flex-col items-center justify-center h-full transition-all duration-200
          ${actionColors[action.color]}
          ${isExecuting ? 'scale-110' : 'hover:scale-105 active:scale-95'}
          disabled:opacity-50
        `}
        style={{
          width: action.width,
          transform: `translateX(${Math.max(0, swipeOffset + totalActionsWidth)}px)`
        }}
      >
        {isExecuting ? (
          <div className="flex flex-col items-center space-y-1">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium">Processing...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-1">
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{action.label}</span>
          </div>
        )}
      </button>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        touchAction: disabled ? 'auto' : 'pan-y' // Allow vertical scroll, prevent horizontal
      }}
    >
      {/* Actions Background */}
      <div
        ref={actionsRef}
        className="absolute top-0 right-0 h-full flex"
        style={{
          width: totalActionsWidth,
          transform: `translateX(${Math.max(0, swipeOffset + totalActionsWidth)}px)`,
        }}
      >
        {actions.map(renderAction)}
      </div>

      {/* Main Content */}
      <div
        ref={contentRef}
        className={`relative z-10 transition-transform duration-200 ease-out ${
          isRevealed ? 'shadow-lg' : ''
        }`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          backgroundColor: 'white' // Ensure content covers actions
        }}
      >
        {children}

        {/* Swipe Indicator */}
        {!disabled && !isRevealed && (
          <div className="absolute top-1/2 right-4 transform -translate-y-1/2 opacity-30 pointer-events-none">
            <div className="flex items-center space-x-1">
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
              <div className="w-1 h-1 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        {/* Reveal Hint */}
        {isRevealed && (
          <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white/90 px-2 py-1 rounded-full">
            Swipe right to close
          </div>
        )}
      </div>

      {/* Success Overlay */}
      {executingAction && (
        <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center z-20">
          <div className="bg-green-500 text-white px-4 py-2 rounded-full flex items-center space-x-2">
            <CheckIcon className="w-4 h-4" />
            <span className="text-sm font-medium">Action Complete</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Predefined action sets for common use cases
export const createDefaultAppointmentActions = (
  appointment: BookingResponse,
  callbacks: {
    onEdit?: () => void
    onDelete?: () => void
    onDuplicate?: () => void
    onReschedule?: () => void
  }
): SwipeAction[] => {
  return [
    {
      id: 'edit',
      label: 'Edit',
      icon: PencilIcon,
      color: 'blue',
      width: 70,
      handler: callbacks.onEdit || (() => {})
    },
    {
      id: 'reschedule',
      label: 'Reschedule',
      icon: ClockIcon,
      color: 'purple',
      width: 70,
      handler: callbacks.onReschedule || (() => {})
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: DocumentDuplicateIcon,
      color: 'green',
      width: 70,
      handler: callbacks.onDuplicate || (() => {})
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: TrashIcon,
      color: 'red',
      width: 70,
      handler: callbacks.onDelete || (() => {})
    }
  ]
}

export const createQuickActions = (
  appointment: BookingResponse,
  callbacks: {
    onComplete?: () => void
    onEdit?: () => void
    onDelete?: () => void
  }
): SwipeAction[] => {
  return [
    {
      id: 'complete',
      label: 'Complete',
      icon: CheckIcon,
      color: 'green',
      width: 80,
      handler: callbacks.onComplete || (() => {})
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: PencilIcon,
      color: 'blue',
      width: 60,
      handler: callbacks.onEdit || (() => {})
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: TrashIcon,
      color: 'red',
      width: 60,
      handler: callbacks.onDelete || (() => {})
    }
  ]
}

export default SwipeRevealAppointment