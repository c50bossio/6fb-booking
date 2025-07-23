'use client'

import { useState, useEffect } from 'react'

/**
 * Hook for responsive design based on CSS media queries
 * Provides real-time updates when screen size or device characteristics change
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return
    }

    const mediaQuery = window.matchMedia(query)
    
    // Set initial value
    setMatches(mediaQuery.matches)

    // Create listener function
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // Add listener
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange)
    }

    // Cleanup function
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [query])

  return matches
}

/**
 * Hook for common responsive breakpoints
 */
export function useResponsiveBreakpoints() {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isLarge = useMediaQuery('(min-width: 1280px)')
  const isXLarge = useMediaQuery('(min-width: 1536px)')
  
  // Device characteristics
  const isTouchDevice = useMediaQuery('(hover: none) and (pointer: coarse)')
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const isLandscape = useMediaQuery('(orientation: landscape)')
  const isPortrait = useMediaQuery('(orientation: portrait)')
  
  return {
    // Screen sizes
    isMobile,
    isTablet,
    isDesktop,
    isLarge,
    isXLarge,
    
    // Device characteristics
    isTouchDevice,
    prefersReducedMotion,
    prefersDarkMode,
    isLandscape,
    isPortrait,
    
    // Current breakpoint as string
    currentBreakpoint: isMobile ? 'mobile' : isTablet ? 'tablet' : isDesktop ? 'desktop' : isLarge ? 'large' : 'xlarge'
  }
}

/**
 * Hook for container queries (when supported)
 */
export function useContainerQuery(query: string, fallback: boolean = false): boolean {
  const [matches, setMatches] = useState(fallback)

  useEffect(() => {
    // Check if container queries are supported
    if (typeof window === 'undefined' || !window.CSS?.supports?.('container-type: inline-size')) {
      setMatches(fallback)
      return
    }

    // For now, fall back to regular media queries
    // Container queries would need specific implementation
    setMatches(fallback)
  }, [query, fallback])

  return matches
}

/**
 * Hook for detecting viewport dimensions
 */
export function useViewportSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  })

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    
    // Set initial size
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return size
}