import { useEffect, useRef, useState, useCallback } from 'react'

// Minimum sizes for touch targets (WCAG 2.1 AAA compliance)
export const TOUCH_TARGET_SIZES = {
  MINIMUM: 44,    // iOS Human Interface Guidelines minimum
  PREFERRED: 48,  // Material Design recommended
  LARGE: 56       // Enhanced accessibility
}

// Touch gesture thresholds
export const TOUCH_THRESHOLDS = {
  TAP_DURATION: 200,      // Max ms for a tap
  SWIPE_DISTANCE: 50,     // Min pixels for swipe
  SWIPE_VELOCITY: 0.3,    // Min pixels/ms
  LONG_PRESS: 500,        // Min ms for long press
  DOUBLE_TAP: 300         // Max ms between taps
}

export interface TouchGesture {
  type: 'tap' | 'doubleTap' | 'longPress' | 'swipe' | 'drag' | 'pinch'
  startX: number
  startY: number
  endX?: number
  endY?: number
  deltaX?: number
  deltaY?: number
  velocity?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  scale?: number
  timestamp: number
}

export interface TouchEnhancementOptions {
  enableSwipe?: boolean
  enablePinch?: boolean
  enableDoubleTap?: boolean
  enableLongPress?: boolean
  preventDefaultOnSwipe?: boolean
  swipeThreshold?: number
  tapThreshold?: number
}

export function useTouchEnhancements(
  elementRef: React.RefObject<HTMLElement>,
  onGesture: (gesture: TouchGesture) => void,
  options: TouchEnhancementOptions = {}
) {
  const touchState = useRef({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    longPressTimer: null as NodeJS.Timeout | null,
    isPinching: false,
    initialPinchDistance: 0
  })

  const [isActive, setIsActive] = useState(false)

  const calculateSwipeDirection = (deltaX: number, deltaY: number): 'up' | 'down' | 'left' | 'right' => {
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    
    if (absX > absY) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    touchState.current.startX = touch.clientX
    touchState.current.startY = touch.clientY
    touchState.current.startTime = Date.now()
    setIsActive(true)

    // Handle pinch gesture
    if (options.enablePinch && e.touches.length === 2) {
      touchState.current.isPinching = true
      const touch2 = e.touches[1]
      const deltaX = touch2.clientX - touch.clientX
      const deltaY = touch2.clientY - touch.clientY
      touchState.current.initialPinchDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    }

    // Long press detection
    if (options.enableLongPress) {
      touchState.current.longPressTimer = setTimeout(() => {
        onGesture({
          type: 'longPress',
          startX: touch.clientX,
          startY: touch.clientY,
          timestamp: Date.now()
        })
      }, TOUCH_THRESHOLDS.LONG_PRESS)
    }
  }, [options, onGesture])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isActive) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - touchState.current.startX
    const deltaY = touch.clientY - touchState.current.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Cancel long press if moved too much
    if (distance > 10 && touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer)
      touchState.current.longPressTimer = null
    }

    // Handle pinch
    if (touchState.current.isPinching && e.touches.length === 2) {
      const touch2 = e.touches[1]
      const currentDeltaX = touch2.clientX - touch.clientX
      const currentDeltaY = touch2.clientY - touch.clientY
      const currentDistance = Math.sqrt(currentDeltaX * currentDeltaX + currentDeltaY * currentDeltaY)
      const scale = currentDistance / touchState.current.initialPinchDistance

      onGesture({
        type: 'pinch',
        startX: touch.clientX,
        startY: touch.clientY,
        scale,
        timestamp: Date.now()
      })
    }

    // Prevent default on swipe if requested
    if (options.preventDefaultOnSwipe && distance > (options.swipeThreshold || TOUCH_THRESHOLDS.SWIPE_DISTANCE)) {
      e.preventDefault()
    }
  }, [isActive, options, onGesture])

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isActive) return
    
    setIsActive(false)
    
    // Clear long press timer
    if (touchState.current.longPressTimer) {
      clearTimeout(touchState.current.longPressTimer)
      touchState.current.longPressTimer = null
    }

    const endTime = Date.now()
    const duration = endTime - touchState.current.startTime
    
    // Get the last touch position
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchState.current.startX
    const deltaY = touch.clientY - touchState.current.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = distance / duration

    // Detect tap
    if (duration < TOUCH_THRESHOLDS.TAP_DURATION && distance < (options.tapThreshold || 10)) {
      const timeSinceLastTap = endTime - touchState.current.lastTapTime
      
      // Double tap detection
      if (options.enableDoubleTap && timeSinceLastTap < TOUCH_THRESHOLDS.DOUBLE_TAP) {
        onGesture({
          type: 'doubleTap',
          startX: touch.clientX,
          startY: touch.clientY,
          timestamp: endTime
        })
        touchState.current.lastTapTime = 0
      } else {
        onGesture({
          type: 'tap',
          startX: touch.clientX,
          startY: touch.clientY,
          timestamp: endTime
        })
        touchState.current.lastTapTime = endTime
      }
    }
    // Detect swipe
    else if (
      options.enableSwipe &&
      distance > (options.swipeThreshold || TOUCH_THRESHOLDS.SWIPE_DISTANCE) &&
      velocity > TOUCH_THRESHOLDS.SWIPE_VELOCITY
    ) {
      onGesture({
        type: 'swipe',
        startX: touchState.current.startX,
        startY: touchState.current.startY,
        endX: touch.clientX,
        endY: touch.clientY,
        deltaX,
        deltaY,
        velocity,
        direction: calculateSwipeDirection(deltaX, deltaY),
        timestamp: endTime
      })
    }

    touchState.current.isPinching = false
  }, [isActive, options, onGesture])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    // Add passive: false for better control
    const touchOptions = { passive: !options.preventDefaultOnSwipe }
    
    element.addEventListener('touchstart', handleTouchStart, touchOptions)
    element.addEventListener('touchmove', handleTouchMove, touchOptions)
    element.addEventListener('touchend', handleTouchEnd, touchOptions)
    element.addEventListener('touchcancel', handleTouchEnd, touchOptions)

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
      element.removeEventListener('touchcancel', handleTouchEnd)
      
      if (touchState.current.longPressTimer) {
        clearTimeout(touchState.current.longPressTimer)
      }
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, options.preventDefaultOnSwipe])

  return { isActive }
}

// Utility to ensure minimum touch target size
export function ensureTouchTargetSize(
  width: number,
  height: number,
  targetSize: number = TOUCH_TARGET_SIZES.PREFERRED
): { width: number; height: number; padding: string } {
  const widthDiff = Math.max(0, targetSize - width)
  const heightDiff = Math.max(0, targetSize - height)
  
  return {
    width: width + widthDiff,
    height: height + heightDiff,
    padding: `${heightDiff / 2}px ${widthDiff / 2}px`
  }
}

// Touch feedback styles
export const touchFeedbackStyles = {
  tap: 'active:scale-95 transition-transform duration-75',
  hover: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  focus: 'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
  disabled: 'opacity-50 cursor-not-allowed',
  touchTarget: 'relative before:absolute before:inset-0 before:-m-2 before:content-[""]'
}

// Mobile-optimized button styles
export function getMobileTouchClass(
  size: 'small' | 'medium' | 'large' = 'medium',
  variant: 'primary' | 'secondary' | 'ghost' = 'primary'
): string {
  const sizeClasses = {
    small: 'min-h-[44px] min-w-[44px] px-3 py-2 text-sm',
    medium: 'min-h-[48px] min-w-[48px] px-4 py-3 text-base',
    large: 'min-h-[56px] min-w-[56px] px-6 py-4 text-lg'
  }

  const variantClasses = {
    primary: 'bg-blue-600 text-white active:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-900 active:bg-gray-300 dark:bg-gray-700 dark:text-white',
    ghost: 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'
  }

  return `${sizeClasses[size]} ${variantClasses[variant]} ${touchFeedbackStyles.tap} ${touchFeedbackStyles.focus} rounded-lg font-medium`
}

// Swipe navigation helper
export function useSwipeNavigation(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold: number = TOUCH_THRESHOLDS.SWIPE_DISTANCE
) {
  const containerRef = useRef<HTMLDivElement>(null)
  
  useTouchEnhancements(containerRef, (gesture) => {
    if (gesture.type === 'swipe') {
      if (gesture.direction === 'left' && onSwipeLeft) {
        onSwipeLeft()
      } else if (gesture.direction === 'right' && onSwipeRight) {
        onSwipeRight()
      }
    }
  }, {
    enableSwipe: true,
    swipeThreshold: threshold,
    preventDefaultOnSwipe: true
  })
  
  return containerRef
}