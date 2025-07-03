'use client'

import { useRef, useCallback, useEffect } from 'react'

interface LongPressHandlers {
  onLongPress?: () => void
  onPress?: () => void
  onPressStart?: () => void
  onPressEnd?: () => void
}

interface LongPressConfig {
  threshold?: number // milliseconds
  enableHaptics?: boolean
  cancelOnMove?: boolean
  moveThreshold?: number // pixels
}

interface HapticFeedbackOptions {
  type?: 'light' | 'medium' | 'heavy'
  pattern?: number[]
}

export function useMobileInteractions() {
  // Haptic feedback utility
  const triggerHapticFeedback = useCallback((options: HapticFeedbackOptions = {}) => {
    if (typeof window === 'undefined') return
    
    const { type = 'light', pattern } = options
    
    // Use custom pattern if provided
    if (pattern && 'vibrate' in navigator) {
      navigator.vibrate(pattern)
      return
    }
    
    // Use predefined patterns
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [])

  // Long press hook
  const useLongPress = useCallback((
    handlers: LongPressHandlers,
    config: LongPressConfig = {}
  ) => {
    const {
      threshold = 500,
      enableHaptics = true,
      cancelOnMove = true,
      moveThreshold = 10
    } = config

    const isLongPressActive = useRef(false)
    const isPressed = useRef(false)
    const longPressTimer = useRef<NodeJS.Timeout | null>(null)
    const startCoords = useRef<{ x: number; y: number }>({ x: 0, y: 0 })

    const startLongPress = useCallback((event: TouchEvent | MouseEvent) => {
      // Record starting position for move detection
      if ('touches' in event && event.touches.length > 0) {
        startCoords.current = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY
        }
      } else if ('clientX' in event) {
        startCoords.current = {
          x: event.clientX,
          y: event.clientY
        }
      }

      isPressed.current = true
      isLongPressActive.current = false

      handlers.onPressStart?.()

      longPressTimer.current = setTimeout(() => {
        if (isPressed.current) {
          isLongPressActive.current = true
          if (enableHaptics) {
            triggerHapticFeedback({ type: 'medium' })
          }
          handlers.onLongPress?.()
        }
      }, threshold)
    }, [threshold, enableHaptics, handlers, triggerHapticFeedback])

    const cancelLongPress = useCallback(() => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
      
      const wasPressed = isPressed.current
      const wasLongPress = isLongPressActive.current
      
      isPressed.current = false
      isLongPressActive.current = false

      handlers.onPressEnd?.()

      // Trigger onPress only if it wasn't a long press
      if (wasPressed && !wasLongPress && handlers.onPress) {
        if (enableHaptics) {
          triggerHapticFeedback({ type: 'light' })
        }
        handlers.onPress()
      }
    }, [handlers, enableHaptics, triggerHapticFeedback])

    const handleMove = useCallback((event: TouchEvent | MouseEvent) => {
      if (!cancelOnMove || !isPressed.current) return

      let currentX: number, currentY: number

      if ('touches' in event && event.touches.length > 0) {
        currentX = event.touches[0].clientX
        currentY = event.touches[0].clientY
      } else if ('clientX' in event) {
        currentX = event.clientX
        currentY = event.clientY
      } else {
        return
      }

      const deltaX = Math.abs(currentX - startCoords.current.x)
      const deltaY = Math.abs(currentY - startCoords.current.y)
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (distance > moveThreshold) {
        cancelLongPress()
      }
    }, [cancelOnMove, moveThreshold, cancelLongPress])

    // Touch event handlers
    const handleTouchStart = useCallback((event: TouchEvent) => {
      startLongPress(event)
    }, [startLongPress])

    const handleTouchEnd = useCallback(() => {
      cancelLongPress()
    }, [cancelLongPress])

    const handleTouchMove = useCallback((event: TouchEvent) => {
      handleMove(event)
    }, [handleMove])

    // Mouse event handlers (for testing)
    const handleMouseDown = useCallback((event: MouseEvent) => {
      startLongPress(event)
    }, [startLongPress])

    const handleMouseUp = useCallback(() => {
      cancelLongPress()
    }, [cancelLongPress])

    const handleMouseMove = useCallback((event: MouseEvent) => {
      handleMove(event)
    }, [handleMove])

    const handleMouseLeave = useCallback(() => {
      cancelLongPress()
    }, [cancelLongPress])

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
        }
      }
    }, [])

    return {
      onTouchStart: handleTouchStart,
      onTouchEnd: handleTouchEnd,
      onTouchMove: handleTouchMove,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onMouseMove: handleMouseMove,
      onMouseLeave: handleMouseLeave,
      onContextMenu: (e: Event) => e.preventDefault() // Prevent context menu on long press
    }
  }, [triggerHapticFeedback])

  // Accessibility utilities
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (typeof window === 'undefined') return

    // Create or get existing announcement element
    let announcer = document.getElementById('screen-reader-announcements')
    
    if (!announcer) {
      announcer = document.createElement('div')
      announcer.id = 'screen-reader-announcements'
      announcer.setAttribute('aria-live', priority)
      announcer.setAttribute('aria-atomic', 'true')
      announcer.className = 'sr-only'
      announcer.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `
      document.body.appendChild(announcer)
    }

    // Update the aria-live attribute if needed
    announcer.setAttribute('aria-live', priority)
    
    // Clear and then set the message to ensure it's announced
    announcer.textContent = ''
    setTimeout(() => {
      if (announcer) {
        announcer.textContent = message
      }
    }, 100)
  }, [])

  // Focus management
  const trapFocus = useCallback((element: HTMLElement) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    element.addEventListener('keydown', handleKeyDown)
    
    // Focus the first element
    firstElement?.focus()

    return () => {
      element.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Touch target size checker
  const checkTouchTargetSize = useCallback((element: HTMLElement) => {
    const rect = element.getBoundingClientRect()
    const minSize = 44 // iOS HIG minimum
    const recommendedSize = 48 // Material Design recommended

    const issues: string[] = []
    
    if (rect.width < minSize || rect.height < minSize) {
      issues.push(`Touch target too small: ${rect.width}x${rect.height}px (minimum: ${minSize}x${minSize}px)`)
    }
    
    if (rect.width < recommendedSize || rect.height < recommendedSize) {
      issues.push(`Touch target below recommended size: ${rect.width}x${rect.height}px (recommended: ${recommendedSize}x${recommendedSize}px)`)
    }

    return {
      isValid: issues.length === 0,
      issues,
      size: { width: rect.width, height: rect.height }
    }
  }, [])

  // Detect if user prefers reduced motion
  const prefersReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // Detect if user prefers high contrast
  const prefersHighContrast = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    return window.matchMedia('(prefers-contrast: high)').matches
  }, [])

  // Mobile-specific utilities
  const isIOSDevice = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    return /iPad|iPhone|iPod/.test(navigator.userAgent)
  }, [])

  const isAndroidDevice = useCallback(() => {
    if (typeof window === 'undefined') return false
    
    return /Android/.test(navigator.userAgent)
  }, [])

  const preventZoom = useCallback((element: HTMLElement) => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: false })
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
    }
  }, [])

  return {
    triggerHapticFeedback,
    useLongPress,
    announceToScreenReader,
    trapFocus,
    checkTouchTargetSize,
    prefersReducedMotion,
    prefersHighContrast,
    isIOSDevice,
    isAndroidDevice,
    preventZoom
  }
}

// Export types for external use
export type { LongPressHandlers, LongPressConfig, HapticFeedbackOptions }