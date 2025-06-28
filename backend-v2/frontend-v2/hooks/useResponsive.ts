'use client'

import { useState, useEffect } from 'react'
import { breakpoints, type Breakpoint } from '@/lib/responsive'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const media = window.matchMedia(query)
    if (media.matches !== matches) {
      setMatches(media.matches)
    }

    const listener = () => setMatches(media.matches)
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [matches, query])

  return matches
}

export function useBreakpoint(): Breakpoint | 'xs' {
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint | 'xs'>('xs')

  useEffect(() => {
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

  return currentBreakpoint
}

export function useResponsive() {
  const breakpoint = useBreakpoint()
  
  const isMobile = useMediaQuery('(max-width: 639px)')
  const isTablet = useMediaQuery('(min-width: 640px) and (max-width: 1023px)')
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const isLargeDesktop = useMediaQuery('(min-width: 1536px)')
  
  return {
    breakpoint,
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isSmallScreen: isMobile || isTablet,
    isMediumScreen: isTablet,
    isLargeScreen: isDesktop || isLargeDesktop,
  }
}