/**
 * Responsive design hook for detecting device type and screen size
 * Optimized for mobile-first calendar experience
 */

import { useState, useEffect, useMemo } from 'react'

export interface ResponsiveState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLargeDesktop: boolean
  screenWidth: number
  screenHeight: number
  orientation: 'portrait' | 'landscape'
  devicePixelRatio: number
  isTouchDevice: boolean
  isHighDPI: boolean
}

export interface BreakpointConfig {
  mobile: number
  tablet: number
  desktop: number
  largeDesktop: number
}

const DEFAULT_BREAKPOINTS: BreakpointConfig = {
  mobile: 640,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1280
}

export function useResponsive(customBreakpoints?: Partial<BreakpointConfig>) {
  const breakpoints = { ...DEFAULT_BREAKPOINTS, ...customBreakpoints }
  
  const [state, setState] = useState<ResponsiveState>(() => {
    // Server-side fallback
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
        screenWidth: 1024,
        screenHeight: 768,
        orientation: 'landscape',
        devicePixelRatio: 1,
        isTouchDevice: false,
        isHighDPI: false
      }
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const devicePixelRatio = window.devicePixelRatio || 1
    
    return {
      isMobile: width < breakpoints.tablet,
      isTablet: width >= breakpoints.tablet && width < breakpoints.desktop,
      isDesktop: width >= breakpoints.desktop && width < breakpoints.largeDesktop,
      isLargeDesktop: width >= breakpoints.largeDesktop,
      screenWidth: width,
      screenHeight: height,
      orientation: width > height ? 'landscape' : 'portrait',
      devicePixelRatio,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      isHighDPI: devicePixelRatio > 1.5
    }
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    let timeoutId: NodeJS.Timeout

    const updateState = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const devicePixelRatio = window.devicePixelRatio || 1

      setState({
        isMobile: width < breakpoints.tablet,
        isTablet: width >= breakpoints.tablet && width < breakpoints.desktop,
        isDesktop: width >= breakpoints.desktop && width < breakpoints.largeDesktop,
        isLargeDesktop: width >= breakpoints.largeDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation: width > height ? 'landscape' : 'portrait',
        devicePixelRatio,
        isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        isHighDPI: devicePixelRatio > 1.5
      })
    }

    // Throttle resize events
    const handleResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateState, 100)
    }

    const handleOrientationChange = () => {
      // Small delay to allow browser to update dimensions
      setTimeout(updateState, 150)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    // Initial call
    updateState()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
      clearTimeout(timeoutId)
    }
  }, [breakpoints.tablet, breakpoints.desktop, breakpoints.largeDesktop])

  // Device-specific utilities
  const utils = useMemo(() => ({
    // Check if specific breakpoint
    isBreakpoint: (breakpoint: keyof BreakpointConfig) => {
      switch (breakpoint) {
        case 'mobile':
          return state.isMobile
        case 'tablet':
          return state.isTablet
        case 'desktop':
          return state.isDesktop
        case 'largeDesktop':
          return state.isLargeDesktop
        default:
          return false
      }
    },

    // Check if at least a certain breakpoint
    isAtLeast: (breakpoint: keyof BreakpointConfig) => {
      const width = state.screenWidth
      return width >= breakpoints[breakpoint]
    },

    // Check if below a certain breakpoint
    isBelow: (breakpoint: keyof BreakpointConfig) => {
      const width = state.screenWidth
      return width < breakpoints[breakpoint]
    },

    // Get CSS media query string
    getMediaQuery: (breakpoint: keyof BreakpointConfig, direction: 'min' | 'max' = 'min') => {
      const value = breakpoints[breakpoint]
      return direction === 'min' 
        ? `(min-width: ${value}px)`
        : `(max-width: ${value - 1}px)`
    },

    // Calendar-specific utilities
    getCalendarLayout: () => {
      if (state.isMobile) {
        return {
          view: 'day' as const,
          slotsPerView: 8,
          showSidebar: false,
          compactMode: true,
          touchOptimized: true
        }
      }
      
      if (state.isTablet) {
        return {
          view: state.orientation === 'landscape' ? 'week' : 'day' as const,
          slotsPerView: 12,
          showSidebar: state.orientation === 'landscape',
          compactMode: false,
          touchOptimized: true
        }
      }

      return {
        view: 'week' as const,
        slotsPerView: 16,
        showSidebar: true,
        compactMode: false,
        touchOptimized: false
      }
    },

    // Touch target sizing
    getTouchTargetSize: () => {
      if (state.isMobile) {
        return {
          minHeight: 44, // iOS minimum
          minWidth: 44,
          padding: 12
        }
      }
      
      if (state.isTablet) {
        return {
          minHeight: 40,
          minWidth: 40,
          padding: 10
        }
      }

      return {
        minHeight: 32,
        minWidth: 32,
        padding: 8
      }
    },

    // Font sizing
    getFontScale: () => {
      if (state.isMobile) {
        return state.orientation === 'landscape' ? 0.9 : 1.0
      }
      
      if (state.isTablet) {
        return 1.1
      }

      return state.isLargeDesktop ? 1.2 : 1.1
    },

    // Animation preferences
    getAnimationSettings: () => {
      // Respect user's motion preferences
      const prefersReducedMotion = typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches

      return {
        enableAnimations: !prefersReducedMotion && !state.isMobile,
        duration: state.isMobile ? 200 : 300,
        easing: state.isMobile ? 'ease-out' : 'ease-in-out'
      }
    }
  }), [state, breakpoints])

  return {
    ...state,
    ...utils,
    breakpoints
  }
}

// Hook for specific device type checks
export function useDeviceType() {
  const { isMobile, isTablet, isDesktop, isLargeDesktop, isTouchDevice } = useResponsive()

  return useMemo(() => ({
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isTouchDevice,
    
    // Composite checks
    isMobileOrTablet: isMobile || isTablet,
    isDesktopOrLarger: isDesktop || isLargeDesktop,
    
    // Device category
    deviceCategory: isMobile ? 'mobile' : isTablet ? 'tablet' : isDesktop ? 'desktop' : 'large-desktop'
  }), [isMobile, isTablet, isDesktop, isLargeDesktop, isTouchDevice])
}

// Hook for media query matching
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

// Hook for container queries (future-proofing)
export function useContainerQuery(containerRef: React.RefObject<HTMLElement>, query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return

    // Polyfill for container queries (simplified)
    const checkContainerQuery = () => {
      if (!containerRef.current) return

      const rect = containerRef.current.getBoundingClientRect()
      
      // Simple width-based container query parsing
      const widthMatch = query.match(/\(min-width:\s*(\d+)px\)/)
      if (widthMatch) {
        const minWidth = parseInt(widthMatch[1])
        setMatches(rect.width >= minWidth)
        return
      }

      const maxWidthMatch = query.match(/\(max-width:\s*(\d+)px\)/)
      if (maxWidthMatch) {
        const maxWidth = parseInt(maxWidthMatch[1])
        setMatches(rect.width <= maxWidth)
        return
      }
    }

    checkContainerQuery()

    const resizeObserver = new ResizeObserver(checkContainerQuery)
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
    }
  }, [containerRef, query])

  return matches
}

export default useResponsive