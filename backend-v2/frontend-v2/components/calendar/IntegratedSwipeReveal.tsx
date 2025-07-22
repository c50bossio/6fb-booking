/**
 * Integrated Swipe Reveal Component
 * Works harmoniously with the component integration manager to prevent gesture conflicts
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
import { browserCompatibility } from '@/lib/browser-compatibility'
import type { BookingResponse } from '@/lib/api'

export interface SwipeAction {
  id: string
  label: string
  icon: React.ComponentType<any>
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
  width: number
  handler: () => void | Promise<void>
}

export interface IntegratedSwipeRevealProps {
  appointment: BookingResponse
  children: React.ReactNode
  actions: SwipeAction[]
  onSwipeStart?: () => void
  onSwipeEnd?: () => void
  onActionExecute?: (actionId: string) => void
  disabled?: boolean
  className?: string
  // Integration manager coordination
  gestureManager?: {
    isGestureActive: boolean
    canStartGesture: (type: string) => boolean
    suppressOtherGestures: (type: string) => void
    allowAllGestures: () => void
    resetGestureState: () => void
  }
}

const actionColors = {
  blue: 'bg-blue-500 text-white',
  green: 'bg-green-500 text-white',
  red: 'bg-red-500 text-white',
  yellow: 'bg-yellow-500 text-white',
  purple: 'bg-purple-500 text-white'
}

export function IntegratedSwipeReveal({
  appointment,
  children,
  actions,
  onSwipeStart,
  onSwipeEnd,
  onActionExecute,
  disabled = false,
  className = '',
  gestureManager
}: IntegratedSwipeRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  
  const [swipeOffset, setSwipeOffset] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [executingAction, setExecutingAction] = useState<string | null>(null)
  const [canReveal, setCanReveal] = useState(true)
  const [isDragging, setIsDragging] = useState(false)

  // Touch tracking
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null)

  // Calculate total actions width
  const totalActionsWidth = actions.reduce((sum, action) => sum + action.width, 0)
  const maxRevealDistance = Math.min(totalActionsWidth, 200) // Cap at 200px

  // Check if gesture can start
  const canStartSwipe = useCallback(() => {
    if (disabled || !canReveal) return false
    if (gestureManager && !gestureManager.canStartGesture('swipe')) return false
    return true
  }, [disabled, canReveal, gestureManager])

  // Handle touch start
  const handleTouchStart = useCallback((event: TouchEvent) => {
    if (!canStartSwipe() || event.touches.length !== 1) return

    const touch = event.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }
    lastTouchRef.current = { x: touch.clientX, y: touch.clientY }
    setIsDragging(false)

    // Prevent text selection during swipe
    event.preventDefault()
  }, [canStartSwipe])

  // Handle touch move
  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchStartRef.current || !lastTouchRef.current || event.touches.length !== 1) return

    const touch = event.touches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    // Only handle horizontal swipes
    if (absDeltaY > absDeltaX || absDeltaX < 10) return

    if (!isDragging && absDeltaX > 15) {
      setIsDragging(true)
      
      // Notify gesture manager that swipe is starting
      if (gestureManager) {
        gestureManager.suppressOtherGestures('swipe')
      }
      
      onSwipeStart?.()
    }

    if (isDragging) {
      // Calculate new offset (only allow left swipe for reveal)
      const newOffset = deltaX < 0 ? Math.max(-maxRevealDistance, deltaX) : 0
      setSwipeOffset(newOffset)
      
      // Update reveal state based on offset
      const revealPercentage = Math.abs(newOffset) / maxRevealDistance
      if (revealPercentage > 0.3 && !isRevealed) {
        setIsRevealed(true)
        browserCompatibility.vibrate(15)
      } else if (revealPercentage <= 0.1 && isRevealed) {
        setIsRevealed(false)
      }

      // Prevent scrolling during swipe
      event.preventDefault()
    }

    lastTouchRef.current = { x: touch.clientX, y: touch.clientY }
  }, [isDragging, isRevealed, maxRevealDistance, onSwipeStart, gestureManager])

  // Handle touch end
  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!touchStartRef.current || !isDragging) {
      touchStartRef.current = null
      lastTouchRef.current = null
      return
    }

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const velocity = Math.abs(deltaX) / (Date.now() - touchStartRef.current.time)

    // Determine final state based on distance and velocity
    const shouldReveal = Math.abs(deltaX) > maxRevealDistance * 0.4 || velocity > 0.5

    if (shouldReveal && deltaX < 0) {
      // Snap to revealed state
      setSwipeOffset(-maxRevealDistance)
      setIsRevealed(true)
      browserCompatibility.vibrate(25)
    } else {
      // Snap back to hidden state
      setSwipeOffset(0)
      setIsRevealed(false)
      onSwipeEnd?.()
      
      // Re-allow other gestures
      if (gestureManager) {
        gestureManager.allowAllGestures()
      }
    }

    setIsDragging(false)
    touchStartRef.current = null
    lastTouchRef.current = null
  }, [isDragging, maxRevealDistance, onSwipeEnd, gestureManager])

  // Execute action
  const executeAction = useCallback(async (action: SwipeAction) => {
    if (executingAction) return

    setExecutingAction(action.id)
    setCanReveal(false)
    
    try {
      // Strong haptic feedback for action execution
      if (action.color === 'red') {
        browserCompatibility.vibrate([50, 50, 100]) // Destructive action pattern
      } else {
        browserCompatibility.vibrate(40)
      }

      await action.handler()
      onActionExecute?.(action.id)

      // Success haptic
      browserCompatibility.vibrate([25, 25, 25])
    } catch (error) {
      console.error(`Action ${action.id} failed:`, error)
      
      // Error haptic
      browserCompatibility.vibrate([100, 50, 100])
    } finally {
      setExecutingAction(null)
      setCanReveal(true)
      
      // Auto-hide after action
      setTimeout(() => {
        setSwipeOffset(0)
        setIsRevealed(false)
        onSwipeEnd?.()
        
        // Reset gesture manager state
        if (gestureManager) {
          gestureManager.resetGestureState()
        }
      }, 500)
    }
  }, [executingAction, onActionExecute, onSwipeEnd, gestureManager])

  // Auto-hide on outside click
  useEffect(() => {
    if (!isRevealed) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSwipeOffset(0)
        setIsRevealed(false)
        onSwipeEnd?.()
        
        if (gestureManager) {
          gestureManager.allowAllGestures()
        }
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
  }, [isRevealed, onSwipeEnd, gestureManager])

  // Set up native touch event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Use passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

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
        touchAction: disabled || gestureManager?.isGestureActive ? 'auto' : 'pan-y' // Allow vertical scroll, prevent horizontal
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
        {!disabled && !isRevealed && canStartSwipe() && (
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

export default IntegratedSwipeReveal