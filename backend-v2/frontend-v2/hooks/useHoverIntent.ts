'use client'

import { useState, useCallback, useRef } from 'react'

interface UseHoverIntentOptions {
  /** Delay in milliseconds before hover state activates (default: 150ms) */
  delay?: number
  /** Delay in milliseconds before hover state deactivates (default: 50ms) */
  exitDelay?: number
}

/**
 * Custom hook for implementing hover intent detection.
 * Only triggers hover state if the mouse stays over the element for a specified time.
 * This prevents accidental hover triggers during quick cursor movements.
 * 
 * @param options Configuration options for hover timing
 * @returns Object with hover state and event handlers
 */
export function useHoverIntent(options: UseHoverIntentOptions = {}) {
  const { delay = 150, exitDelay = 50 } = options
  
  const [isHovered, setIsHovered] = useState(false)
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = useCallback(() => {
    // Clear any existing exit timeout
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current)
      exitTimeoutRef.current = null
    }

    // Set enter timeout only if not already hovered
    if (!isHovered && !enterTimeoutRef.current) {
      enterTimeoutRef.current = setTimeout(() => {
        setIsHovered(true)
        enterTimeoutRef.current = null
      }, delay)
    }
  }, [delay, isHovered])

  const handleMouseLeave = useCallback(() => {
    // Clear any existing enter timeout
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current)
      enterTimeoutRef.current = null
    }

    // Set exit timeout
    exitTimeoutRef.current = setTimeout(() => {
      setIsHovered(false)
      exitTimeoutRef.current = null
    }, exitDelay)
  }, [exitDelay])

  // Cleanup timeouts on unmount
  const cleanup = useCallback(() => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current)
      enterTimeoutRef.current = null
    }
    if (exitTimeoutRef.current) {
      clearTimeout(exitTimeoutRef.current)
      exitTimeoutRef.current = null
    }
  }, [])

  return {
    isHovered,
    hoverProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
    cleanup
  }
}

export default useHoverIntent