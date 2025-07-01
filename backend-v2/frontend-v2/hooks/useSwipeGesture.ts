'use client'

import { useRef, useEffect } from 'react'

interface SwipeHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
}

interface SwipeConfig {
  threshold?: number // Minimum distance for swipe
  allowMouseEvents?: boolean // Allow mouse events for testing
  preventDefaultTouchMove?: boolean // Prevent scrolling during swipe
}

export function useSwipeGesture(
  handlers: SwipeHandlers,
  config: SwipeConfig = {}
) {
  const {
    threshold = 50,
    allowMouseEvents = false,
    preventDefaultTouchMove = true
  } = config

  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const touchEndY = useRef<number | null>(null)

  const handleTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX
    touchStartY.current = e.changedTouches[0].screenY
  }

  const handleTouchMove = (e: TouchEvent) => {
    if (preventDefaultTouchMove) {
      e.preventDefault()
    }
    touchEndX.current = e.changedTouches[0].screenX
    touchEndY.current = e.changedTouches[0].screenY
  }

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchStartY.current || !touchEndX.current || !touchEndY.current) {
      return
    }

    const deltaX = touchEndX.current - touchStartX.current
    const deltaY = touchEndY.current - touchStartY.current
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    // Horizontal swipe
    if (absX > absY && absX > threshold) {
      if (deltaX > 0) {
        handlers.onSwipeRight?.()
      } else {
        handlers.onSwipeLeft?.()
      }
    }
    // Vertical swipe
    else if (absY > absX && absY > threshold) {
      if (deltaY > 0) {
        handlers.onSwipeDown?.()
      } else {
        handlers.onSwipeUp?.()
      }
    }

    // Reset values
    touchStartX.current = null
    touchStartY.current = null
    touchEndX.current = null
    touchEndY.current = null
  }

  // Mouse events for testing
  const handleMouseDown = (e: MouseEvent) => {
    if (!allowMouseEvents) return
    touchStartX.current = e.screenX
    touchStartY.current = e.screenY
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!allowMouseEvents || touchStartX.current === null) return
    touchEndX.current = e.screenX
    touchEndY.current = e.screenY
  }

  const handleMouseUp = () => {
    if (!allowMouseEvents) return
    handleTouchEnd()
  }

  const attachToElement = (element: HTMLElement | null) => {
    if (!element) return

    // Touch events
    element.addEventListener('touchstart', handleTouchStart)
    element.addEventListener('touchmove', handleTouchMove, { passive: false })
    element.addEventListener('touchend', handleTouchEnd)

    // Mouse events (for testing)
    if (allowMouseEvents) {
      element.addEventListener('mousedown', handleMouseDown)
      element.addEventListener('mousemove', handleMouseMove)
      element.addEventListener('mouseup', handleMouseUp)
      element.addEventListener('mouseleave', handleMouseUp)
    }

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)

      if (allowMouseEvents) {
        element.removeEventListener('mousedown', handleMouseDown)
        element.removeEventListener('mousemove', handleMouseMove)
        element.removeEventListener('mouseup', handleMouseUp)
        element.removeEventListener('mouseleave', handleMouseUp)
      }
    }
  }

  return { attachToElement }
}