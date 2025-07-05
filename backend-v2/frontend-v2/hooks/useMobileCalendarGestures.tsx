'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'

interface GestureState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  deltaX: number
  deltaY: number
  isGesturing: boolean
  gestureType: 'swipe' | 'pinch' | 'tap' | 'longPress' | null
  velocity: number
  direction: 'left' | 'right' | 'up' | 'down' | null
}

interface GestureCallbacks {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinchZoom?: (scale: number) => void
  onTap?: (x: number, y: number) => void
  onLongPress?: (x: number, y: number) => void
  onDoubleTap?: (x: number, y: number) => void
}

interface GestureOptions {
  swipeThreshold?: number
  velocityThreshold?: number
  longPressDelay?: number
  doubleTapDelay?: number
  enableHapticFeedback?: boolean
  enableSwipePreview?: boolean
  preventScroll?: boolean
}

const defaultOptions: GestureOptions = {
  swipeThreshold: 50,
  velocityThreshold: 0.3,
  longPressDelay: 500,
  doubleTapDelay: 300,
  enableHapticFeedback: true,
  enableSwipePreview: true,
  preventScroll: false
}

export function useMobileCalendarGestures(
  callbacks: GestureCallbacks,
  options: GestureOptions = {}
) {
  const opts = { ...defaultOptions, ...options }
  const [gestureState, setGestureState] = useState<GestureState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    isGesturing: false,
    gestureType: null,
    velocity: 0,
    direction: null
  })

  const gestureRef = useRef<HTMLElement | null>(null)
  const longPressTimeoutRef = useRef<NodeJS.Timeout>()
  const lastTapTimeRef = useRef(0)
  const tapCountRef = useRef(0)

  // Haptic feedback utility
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!opts.enableHapticFeedback || !('vibrate' in navigator)) return

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    }

    navigator.vibrate(patterns[type])
  }, [opts.enableHapticFeedback])

  // Calculate gesture velocity
  const calculateVelocity = useCallback((deltaX: number, deltaY: number, deltaTime: number): number => {
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    return deltaTime > 0 ? distance / deltaTime : 0
  }, [])

  // Determine swipe direction
  const getSwipeDirection = useCallback((deltaX: number, deltaY: number): 'left' | 'right' | 'up' | 'down' | null => {
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)

    if (absDeltaX < opts.swipeThreshold && absDeltaY < opts.swipeThreshold) {
      return null
    }

    if (absDeltaX > absDeltaY) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }, [opts.swipeThreshold])

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const now = Date.now()

      setGestureState(prev => ({
        ...prev,
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        deltaX: 0,
        deltaY: 0,
        isGesturing: true,
        gestureType: null,
        velocity: 0,
        direction: null
      }))

      // Handle double tap detection
      if (now - lastTapTimeRef.current < opts.doubleTapDelay) {
        tapCountRef.current += 1
        if (tapCountRef.current === 2) {
          triggerHaptic('medium')
          callbacks.onDoubleTap?.(touch.clientX, touch.clientY)
          tapCountRef.current = 0
        }
      } else {
        tapCountRef.current = 1
      }
      lastTapTimeRef.current = now

      // Start long press detection
      longPressTimeoutRef.current = setTimeout(() => {
        triggerHaptic('heavy')
        callbacks.onLongPress?.(touch.clientX, touch.clientY)
        setGestureState(prev => ({ ...prev, gestureType: 'longPress' }))
      }, opts.longPressDelay)

      if (opts.preventScroll) {
        e.preventDefault()
      }
    }
  }, [callbacks, opts, triggerHaptic])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0]
      
      setGestureState(prev => {
        const deltaX = touch.clientX - prev.startX
        const deltaY = touch.clientY - prev.startY
        const direction = getSwipeDirection(deltaX, deltaY)
        const velocity = calculateVelocity(deltaX, deltaY, Date.now() - lastTapTimeRef.current)

        // Clear long press if user moves too much
        if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
          if (longPressTimeoutRef.current) {
            clearTimeout(longPressTimeoutRef.current)
            longPressTimeoutRef.current = undefined
          }
        }

        return {
          ...prev,
          currentX: touch.clientX,
          currentY: touch.clientY,
          deltaX,
          deltaY,
          direction,
          velocity,
          gestureType: direction ? 'swipe' : prev.gestureType
        }
      })

      if (opts.preventScroll) {
        e.preventDefault()
      }
    }
  }, [getSwipeDirection, calculateVelocity, opts.preventScroll])

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
      longPressTimeoutRef.current = undefined
    }

    setGestureState(prev => {
      const { deltaX, deltaY, velocity, direction, gestureType } = prev

      // Process swipe gestures
      if (gestureType === 'swipe' && velocity > opts.velocityThreshold) {
        triggerHaptic('light')

        switch (direction) {
          case 'left':
            callbacks.onSwipeLeft?.()
            break
          case 'right':
            callbacks.onSwipeRight?.()
            break
          case 'up':
            callbacks.onSwipeUp?.()
            break
          case 'down':
            callbacks.onSwipeDown?.()
            break
        }
      }
      // Process tap gestures (only if not a long press and minimal movement)
      else if (
        gestureType !== 'longPress' &&
        Math.abs(deltaX) < 10 &&
        Math.abs(deltaY) < 10 &&
        tapCountRef.current === 1
      ) {
        setTimeout(() => {
          if (tapCountRef.current === 1) {
            triggerHaptic('light')
            callbacks.onTap?.(prev.startX, prev.startY)
            tapCountRef.current = 0
          }
        }, opts.doubleTapDelay)
      }

      return {
        ...prev,
        isGesturing: false,
        gestureType: null,
        deltaX: 0,
        deltaY: 0,
        velocity: 0,
        direction: null
      }
    })
  }, [callbacks, opts, triggerHaptic])

  // Attach event listeners
  useEffect(() => {
    const element = gestureRef.current
    if (!element) return

    const touchStartHandler = (e: TouchEvent) => handleTouchStart(e)
    const touchMoveHandler = (e: TouchEvent) => handleTouchMove(e)
    const touchEndHandler = (e: TouchEvent) => handleTouchEnd(e)

    element.addEventListener('touchstart', touchStartHandler, { passive: !opts.preventScroll })
    element.addEventListener('touchmove', touchMoveHandler, { passive: !opts.preventScroll })
    element.addEventListener('touchend', touchEndHandler, { passive: true })

    return () => {
      element.removeEventListener('touchstart', touchStartHandler)
      element.removeEventListener('touchmove', touchMoveHandler)
      element.removeEventListener('touchend', touchEndHandler)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, opts.preventScroll])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
      }
    }
  }, [])

  // Swipe preview styles for visual feedback
  const getSwipePreviewStyles = useCallback(() => {
    if (!opts.enableSwipePreview || !gestureState.isGesturing) {
      return {}
    }

    const { deltaX, deltaY, gestureType } = gestureState

    if (gestureType === 'swipe') {
      const opacity = Math.min(Math.abs(deltaX) / opts.swipeThreshold, 0.3)
      const scale = 1 + Math.min(Math.abs(deltaX) / 500, 0.02)

      return {
        transform: `translateX(${deltaX * 0.1}px) scale(${scale})`,
        opacity: 1 - opacity,
        transition: 'none'
      }
    }

    return {}
  }, [gestureState, opts])

  return {
    gestureRef,
    gestureState,
    getSwipePreviewStyles,
    triggerHaptic,
    
    // Utility methods
    isSwipingLeft: gestureState.direction === 'left' && gestureState.isGesturing,
    isSwipingRight: gestureState.direction === 'right' && gestureState.isGesturing,
    isSwipingUp: gestureState.direction === 'up' && gestureState.isGesturing,
    isSwipingDown: gestureState.direction === 'down' && gestureState.isGesturing,
    isLongPressing: gestureState.gestureType === 'longPress',
    
    // Manual trigger methods
    simulateSwipe: (direction: 'left' | 'right' | 'up' | 'down') => {
      triggerHaptic('light')
      switch (direction) {
        case 'left':
          callbacks.onSwipeLeft?.()
          break
        case 'right':
          callbacks.onSwipeRight?.()
          break
        case 'up':
          callbacks.onSwipeUp?.()
          break
        case 'down':
          callbacks.onSwipeDown?.()
          break
      }
    }
  }
}

// Enhanced mobile calendar component that uses gestures
export function withMobileGestures<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  gestureCallbacks: GestureCallbacks,
  gestureOptions?: GestureOptions
) {
  return function MobileGestureWrapper(props: T) {
    const { gestureRef, getSwipePreviewStyles, gestureState } = useMobileCalendarGestures(
      gestureCallbacks,
      gestureOptions
    )

    return (
      <div
        ref={gestureRef}
        style={getSwipePreviewStyles()}
        className="touch-manipulation select-none"
      >
        <Component {...props} />
        
        {/* Swipe indicator */}
        {gestureState.isGesturing && gestureState.gestureType === 'swipe' && (
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
            <div className="bg-black/80 text-white px-4 py-2 rounded-full text-sm font-medium animate-pulse">
              {gestureState.direction === 'left' && <>← Swipe Left</>}
              {gestureState.direction === 'right' && <>Swipe Right →</>}
              {gestureState.direction === 'up' && <>↑ Swipe Up</>}
              {gestureState.direction === 'down' && <>↓ Swipe Down</>}
            </div>
          </div>
        )}
      </div>
    )
  }
}

// Preset gesture configurations for calendar views
export const calendarGesturePresets = {
  monthView: {
    swipeThreshold: 80,
    velocityThreshold: 0.5,
    enableSwipePreview: true,
    preventScroll: false
  },
  weekView: {
    swipeThreshold: 60,
    velocityThreshold: 0.4,
    enableSwipePreview: true,
    preventScroll: true
  },
  dayView: {
    swipeThreshold: 40,
    velocityThreshold: 0.3,
    enableSwipePreview: false,
    preventScroll: true
  }
}