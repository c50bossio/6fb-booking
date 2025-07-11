'use client'

import { useState, useEffect, useCallback } from 'react'
import { breakpoints, type Breakpoint } from '@/lib/responsive'

export interface ResponsiveState {
  width: number
  height: number
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isWide: boolean
  currentBreakpoint: Breakpoint | null
  orientation: 'portrait' | 'landscape'
  isTouch: boolean
  isMobileDevice: boolean
  pixelRatio: number
}

export interface UseResponsiveOptions {
  debounceMs?: number
  enableTouch?: boolean
  enableOrientation?: boolean
}

const defaultOptions: UseResponsiveOptions = {
  debounceMs: 150,
  enableTouch: true,
  enableOrientation: true,
}

/**
 * Hook for responsive design and device detection
 * Provides current breakpoint, device type, and touch capabilities
 */
export function useResponsive(options: UseResponsiveOptions = {}): ResponsiveState {
  const { debounceMs, enableTouch, enableOrientation } = { ...defaultOptions, ...options }
  const [mounted, setMounted] = useState(false)
  
  const getInitialState = useCallback((): ResponsiveState => {
    if (typeof window === 'undefined' || !mounted) {
      return {
        width: 1200, // Default desktop width to prevent layout shifts
        height: 800,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        currentBreakpoint: 'lg',
        orientation: 'landscape',
        isTouch: false,
        isMobileDevice: false,
        pixelRatio: 1,
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const isMobile = width < breakpoints.md
    const isTablet = width >= breakpoints.md && width < breakpoints.lg
    const isDesktop = width >= breakpoints.lg
    const isWide = width >= breakpoints['2xl']
    const orientation = width > height ? 'landscape' : 'portrait'
    const isTouch = enableTouch ? 'ontouchstart' in window || navigator.maxTouchPoints > 0 : false
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    const pixelRatio = window.devicePixelRatio || 1

    // Determine current breakpoint
    let currentBreakpoint: Breakpoint | null = null
    if (width >= breakpoints['3xl']) currentBreakpoint = '3xl'
    else if (width >= breakpoints['2xl']) currentBreakpoint = '2xl'
    else if (width >= breakpoints.xl) currentBreakpoint = 'xl'
    else if (width >= breakpoints.lg) currentBreakpoint = 'lg'
    else if (width >= breakpoints.md) currentBreakpoint = 'md'
    else if (width >= breakpoints.sm) currentBreakpoint = 'sm'
    else if (width >= breakpoints.xs) currentBreakpoint = 'xs'

    return {
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      isWide,
      currentBreakpoint,
      orientation,
      isTouch,
      isMobileDevice,
      pixelRatio,
    }
  }, [enableTouch, mounted])

  const [state, setState] = useState<ResponsiveState>(getInitialState)

  // Mount effect to prevent hydration mismatches
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    
    let timeoutId: NodeJS.Timeout

    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        setState(getInitialState())
      }, debounceMs)
    }

    const handleOrientationChange = () => {
      // Small delay to ensure dimensions are updated
      setTimeout(() => {
        setState(getInitialState())
      }, 100)
    }

    // Initial state update after mounting
    setState(getInitialState())

    // Add event listeners
    window.addEventListener('resize', handleResize, { passive: true })
    
    if (enableOrientation) {
      window.addEventListener('orientationchange', handleOrientationChange, { passive: true })
      // Also listen for resize as a fallback
      window.addEventListener('resize', handleOrientationChange, { passive: true })
    }

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
      if (enableOrientation) {
        window.removeEventListener('orientationchange', handleOrientationChange)
        window.removeEventListener('resize', handleOrientationChange)
      }
    }
  }, [getInitialState, debounceMs, enableOrientation, mounted])

  return state
}

/**
 * Hook for media query matching
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    const handler = () => setMatches(mediaQuery.matches)

    // Set initial value
    setMatches(mediaQuery.matches)

    // Listen for changes
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handler)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler)
      } else {
        mediaQuery.removeListener(handler)
      }
    }
  }, [query])

  return matches
}

/**
 * Hook for breakpoint-specific values
 */
export function useBreakpointValue<T>(values: Partial<Record<Breakpoint, T>>, fallback: T): T {
  const { currentBreakpoint } = useResponsive()

  if (!currentBreakpoint) return fallback

  // Check from largest to smallest breakpoint
  const breakpointOrder: Breakpoint[] = ['3xl', '2xl', 'xl', 'lg', 'md', 'sm', 'xs']
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint)

  for (let i = currentIndex; i < breakpointOrder.length; i++) {
    const bp = breakpointOrder[i]
    if (values[bp] !== undefined) {
      return values[bp] as T
    }
  }

  return fallback
}

/**
 * Hook for container queries (experimental)
 */
export function useContainerQuery(containerRef: React.RefObject<HTMLElement>, query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        
        // Simple query parsing (extend as needed)
        if (query.includes('min-width:')) {
          const minWidth = parseInt(query.match(/min-width:\s*(\d+)px/)?.[1] || '0')
          setMatches(width >= minWidth)
        } else if (query.includes('max-width:')) {
          const maxWidth = parseInt(query.match(/max-width:\s*(\d+)px/)?.[1] || '0')
          setMatches(width <= maxWidth)
        }
      }
    })

    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [containerRef, query])

  return matches
}

/**
 * Hook for touch interactions
 */
export interface TouchState {
  isPressed: boolean
  isSwiping: boolean
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null
  touchCount: number
  lastTap: number
  isDoubleTap: boolean
}

export function useTouch(elementRef: React.RefObject<HTMLElement>) {
  const [touchState, setTouchState] = useState<TouchState>({
    isPressed: false,
    isSwiping: false,
    swipeDirection: null,
    touchCount: 0,
    lastTap: 0,
    isDoubleTap: false,
  })

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    let startX = 0
    let startY = 0
    let startTime = 0

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      startX = touch.clientX
      startY = touch.clientY
      startTime = Date.now()

      setTouchState(prev => ({
        ...prev,
        isPressed: true,
        touchCount: e.touches.length,
        isSwiping: false,
        swipeDirection: null,
      }))
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchState.isPressed) return

      const touch = e.touches[0]
      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      if (distance > 10) { // Minimum swipe distance
        let direction: 'left' | 'right' | 'up' | 'down'
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'right' : 'left'
        } else {
          direction = deltaY > 0 ? 'down' : 'up'
        }

        setTouchState(prev => ({
          ...prev,
          isSwiping: true,
          swipeDirection: direction,
        }))
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now()
      const isDoubleTap = now - touchState.lastTap < 300

      setTouchState(prev => ({
        ...prev,
        isPressed: false,
        isSwiping: false,
        swipeDirection: null,
        touchCount: 0,
        lastTap: now,
        isDoubleTap,
      }))
    }

    element.addEventListener('touchstart', handleTouchStart, { passive: true })
    element.addEventListener('touchmove', handleTouchMove, { passive: true })
    element.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      element.removeEventListener('touchstart', handleTouchStart)
      element.removeEventListener('touchmove', handleTouchMove)
      element.removeEventListener('touchend', handleTouchEnd)
    }
  }, [elementRef, touchState.isPressed, touchState.lastTap])

  return touchState
}

/**
 * Hook for safe area insets (iOS devices)
 */
export function useSafeArea() {
  const [safeArea, setSafeArea] = useState({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateSafeArea = () => {
      const style = getComputedStyle(document.documentElement)
      setSafeArea({
        top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0'),
        bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0'),
        right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0'),
      })
    }

    updateSafeArea()
    window.addEventListener('resize', updateSafeArea, { passive: true })
    window.addEventListener('orientationchange', updateSafeArea, { passive: true })

    return () => {
      window.removeEventListener('resize', updateSafeArea)
      window.removeEventListener('orientationchange', updateSafeArea)
    }
  }, [])

  return safeArea
}

// All hooks are exported individually above
export default useResponsive