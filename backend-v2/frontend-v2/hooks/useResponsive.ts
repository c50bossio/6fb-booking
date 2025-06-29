'use client'

import { useState, useEffect } from 'react'
import { breakpoints, type Breakpoint } from '@/lib/responsive'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const media = window.matchMedia(query)
    setMatches(media.matches)

    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [query])

  // Return false during SSR to prevent hydration mismatch
  return mounted ? matches : false
}

export function useBreakpoint(): Breakpoint | 'xs' {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint | 'xs'>('lg') // Default to desktop for SSR
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const handleResize = () => {
      const width = window.innerWidth
      
      if (width < breakpoints.sm) {
        setCurrentBreakpoint('xs')
      } else if (width < breakpoints.md) {
        setCurrentBreakpoint('sm')
      } else if (width < breakpoints.lg) {
        setCurrentBreakpoint('md')
      } else if (width < breakpoints.xl) {
        setCurrentBreakpoint('lg')
      } else if (width < breakpoints['2xl']) {
        setCurrentBreakpoint('xl')
      } else {
        setCurrentBreakpoint('2xl')
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Return desktop breakpoint during SSR to match most common case
  return mounted ? currentBreakpoint : 'lg'
}

export function useResponsive() {
  const [mounted, setMounted] = useState(false)
  const breakpoint = useBreakpoint()
  
  const isMobile = useMediaQuery('(max-width: 639px)')
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isLargeDesktop = useMediaQuery('(min-width: 1536px)')
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // During SSR, assume desktop view to prevent layout shifts
  const ssrSafeValues = {
    breakpoint: mounted ? breakpoint : 'lg' as const,
    isMobile: mounted ? isMobile : false,
    isTablet: mounted ? isTablet : false,
    isDesktop: mounted ? isDesktop : true,
    isLargeDesktop: mounted ? isLargeDesktop : false,
    isSmallScreen: mounted ? (isMobile || isTablet) : false,
    isMediumScreen: mounted ? isTablet : false,
    isLargeScreen: mounted ? (isDesktop || isLargeDesktop) : true,
  }
  
  return ssrSafeValues
}