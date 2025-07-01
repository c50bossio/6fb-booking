'use client'

import { useState, useEffect, useCallback } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'
export type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda'

interface ResponsiveConfig {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  deviceType: DeviceType
  viewportWidth: number
  viewportHeight: number
  isTouch: boolean
  isLandscape: boolean
  optimalView: CalendarViewMode
  touchEnabled: boolean
  dragEnabled: boolean
}

export function useResponsiveCalendar(): ResponsiveConfig {
  const [config, setConfig] = useState<ResponsiveConfig>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        deviceType: 'desktop',
        viewportWidth: 1200,
        viewportHeight: 800,
        isTouch: false,
        isLandscape: true,
        optimalView: 'month',
        touchEnabled: false,
        dragEnabled: true
      }
    }

    return getResponsiveConfig()
  })

  function getResponsiveConfig(): ResponsiveConfig {
    const width = window.innerWidth
    const height = window.innerHeight
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isLandscape = width > height

    // Device breakpoints
    const isMobile = width < 768
    const isTablet = width >= 768 && width < 1024
    const isDesktop = width >= 1024

    // Determine device type
    let deviceType: DeviceType = 'desktop'
    if (isMobile) deviceType = 'mobile'
    else if (isTablet) deviceType = 'tablet'

    // Optimal view based on device and orientation
    let optimalView: CalendarViewMode = 'month'
    if (isMobile) {
      optimalView = isLandscape ? 'week' : 'agenda'
    } else if (isTablet) {
      optimalView = isLandscape ? 'month' : 'week'
    }

    // Touch and drag capabilities
    const touchEnabled = isTouch || isMobile || isTablet
    const dragEnabled = !isMobile || isLandscape

    return {
      isMobile,
      isTablet,
      isDesktop,
      deviceType,
      viewportWidth: width,
      viewportHeight: height,
      isTouch,
      isLandscape,
      optimalView,
      touchEnabled,
      dragEnabled
    }
  }

  // Update on resize and orientation change
  useEffect(() => {
    const handleResize = () => {
      setConfig(getResponsiveConfig())
    }

    const handleOrientationChange = () => {
      // Delay to ensure accurate dimensions after orientation change
      setTimeout(handleResize, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    // Initial check
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [])

  return config
}

// Responsive breakpoint utilities
export const breakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280
} as const

// Touch target sizes for accessibility
export const touchTargets = {
  minimum: 44, // iOS Human Interface Guidelines minimum
  recommended: 48, // Material Design recommended
  comfortable: 56 // Comfortable for most users
} as const

// Mobile-optimized spacing
export const mobileSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24
} as const