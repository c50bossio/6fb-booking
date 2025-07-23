'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'

// View and device types
export type DeviceType = 'mobile' | 'tablet' | 'desktop'
export type CalendarViewMode = 'day' | 'week' | 'month' | 'agenda'

// Animation configuration
interface AnimationConfig {
  duration?: number
  easing?: string
  delay?: number
}

// Transition configuration
interface TransitionConfig {
  duration: number
  easing: string
  blur: boolean
  scale: boolean
  fade: boolean
}

// Responsive configuration
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

// Options interface
interface UseCalendarVisualsOptions {
  // Animation options
  enableAnimations?: boolean
  defaultAnimationDuration?: number
  defaultAnimationEasing?: string
  
  // Transition options
  enableTransitions?: boolean
  transitionConfig?: Partial<TransitionConfig>
  onTransitionStart?: (from: CalendarViewMode, to: CalendarViewMode) => void
  onTransitionEnd?: (from: CalendarViewMode, to: CalendarViewMode) => void
  
  // Responsive options
  breakpoints?: {
    mobile?: number
    tablet?: number
    desktop?: number
  }
}

// Default configurations
const defaultTransitionConfig: TransitionConfig = {
  duration: 400,
  easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // iOS easing
  blur: true,
  scale: true,
  fade: true
}

const defaultBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200
}

/**
 * Consolidated calendar visuals hook that combines animations, transitions, and responsive behavior
 * Merges useCalendarAnimations, useCalendarTransitions, and useResponsiveCalendar
 */
export function useCalendarVisuals(options: UseCalendarVisualsOptions = {}) {
  const {
    enableAnimations = true,
    defaultAnimationDuration = 300,
    defaultAnimationEasing = 'ease-in-out',
    enableTransitions = true,
    transitionConfig,
    onTransitionStart,
    onTransitionEnd,
    breakpoints = defaultBreakpoints
  } = options

  // Animation state
  const [isAnimating, setIsAnimating] = useState(false)
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null)
  const [queuedAnimations, setQueuedAnimations] = useState<string[]>([])

  // Transition state
  const [currentView, setCurrentView] = useState<CalendarViewMode>('month')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | 'up' | 'down'>('right')
  const previousViewRef = useRef<CalendarViewMode>('month')
  const transitionTimeoutRef = useRef<NodeJS.Timeout>()

  // Responsive state
  const [responsiveConfig, setResponsiveConfig] = useState<ResponsiveConfig>(() => {
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

  // Refs
  const animationTimeoutRef = useRef<NodeJS.Timeout>()

  // Merge transition config
  const finalTransitionConfig = { ...defaultTransitionConfig, ...transitionConfig }

  // Helper function to determine responsive config
  function getResponsiveConfig(): ResponsiveConfig {
    if (typeof window === 'undefined') {
      return responsiveConfig
    }

    const width = window.innerWidth
    const height = window.innerHeight
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
    const isLandscape = width > height

    const isMobile = width <= breakpoints.mobile!
    const isTablet = width > breakpoints.mobile! && width <= breakpoints.tablet!
    const isDesktop = width > breakpoints.tablet!

    let deviceType: DeviceType = 'desktop'
    if (isMobile) deviceType = 'mobile'
    else if (isTablet) deviceType = 'tablet'

    let optimalView: CalendarViewMode = 'month'
    if (isMobile) {
      optimalView = isLandscape ? 'week' : 'day'
    } else if (isTablet) {
      optimalView = 'week'
    }

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
      touchEnabled: isTouch,
      dragEnabled: !isMobile || isLandscape
    }
  }

  // Animation functions
  const fadeIn = useCallback((config: AnimationConfig = {}) => {
    if (!enableAnimations) return { opacity: 1 }

    const duration = config.duration || defaultAnimationDuration
    const easing = config.easing || defaultAnimationEasing
    const delay = config.delay || 0

    return {
      opacity: 1,
      transition: `opacity ${duration}ms ${easing}${delay ? ` ${delay}ms` : ''}`
    }
  }, [enableAnimations, defaultAnimationDuration, defaultAnimationEasing])

  const fadeOut = useCallback((config: AnimationConfig = {}) => {
    if (!enableAnimations) return { opacity: 0 }

    const duration = config.duration || defaultAnimationDuration
    const easing = config.easing || defaultAnimationEasing
    const delay = config.delay || 0

    return {
      opacity: 0,
      transition: `opacity ${duration}ms ${easing}${delay ? ` ${delay}ms` : ''}`
    }
  }, [enableAnimations, defaultAnimationDuration, defaultAnimationEasing])

  const slideIn = useCallback((direction: 'left' | 'right' | 'up' | 'down' = 'left', config: AnimationConfig = {}) => {
    if (!enableAnimations) return { transform: 'translateX(0)' }

    const duration = config.duration || defaultAnimationDuration
    const easing = config.easing || defaultAnimationEasing
    const delay = config.delay || 0

    const transforms = {
      left: 'translateX(-100%)',
      right: 'translateX(100%)',
      up: 'translateY(-100%)',
      down: 'translateY(100%)'
    }

    return {
      transform: transforms[direction],
      transition: `transform ${duration}ms ${easing}${delay ? ` ${delay}ms` : ''}`
    }
  }, [enableAnimations, defaultAnimationDuration, defaultAnimationEasing])

  const scaleIn = useCallback((config: AnimationConfig = {}) => {
    if (!enableAnimations) return { transform: 'scale(1)' }

    const duration = config.duration || defaultAnimationDuration
    const easing = config.easing || defaultAnimationEasing
    const delay = config.delay || 0

    return {
      transform: 'scale(1)',
      transition: `transform ${duration}ms ${easing}${delay ? ` ${delay}ms` : ''}`
    }
  }, [enableAnimations, defaultAnimationDuration, defaultAnimationEasing])

  const dragAnimation = useCallback((isDragging: boolean) => {
    if (!enableAnimations) return {}

    return {
      transform: isDragging ? 'scale(1.02) rotate(2deg)' : 'scale(1) rotate(0deg)',
      opacity: isDragging ? 0.9 : 1,
      transition: 'transform 150ms ease-out, opacity 150ms ease-out',
      zIndex: isDragging ? 1000 : 'auto',
      boxShadow: isDragging ? '0 8px 25px rgba(0,0,0,0.15)' : 'none'
    }
  }, [enableAnimations])

  const hoverAnimation = useCallback((isHovered: boolean) => {
    if (!enableAnimations) return {}

    return {
      transform: isHovered ? 'scale(1.02)' : 'scale(1)',
      transition: 'transform 200ms ease-out',
      boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
    }
  }, [enableAnimations])

  // Transition functions
  const viewHierarchy: Record<CalendarViewMode, number> = {
    day: 0,
    week: 1,
    month: 2,
    agenda: 3
  }

  const transitionToView = useCallback((newView: CalendarViewMode) => {
    if (!enableTransitions || newView === currentView) return

    const fromLevel = viewHierarchy[currentView]
    const toLevel = viewHierarchy[newView]
    
    // Determine transition direction based on view hierarchy
    const direction = toLevel > fromLevel ? 'right' : 'left'
    setTransitionDirection(direction)

    setIsTransitioning(true)
    onTransitionStart?.(currentView, newView)

    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
    }

    // Set the new view
    previousViewRef.current = currentView
    setCurrentView(newView)

    // End transition after duration
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false)
      onTransitionEnd?.(previousViewRef.current, newView)
    }, finalTransitionConfig.duration)
  }, [enableTransitions, currentView, onTransitionStart, onTransitionEnd, finalTransitionConfig.duration])

  const getTransitionClasses = useCallback(() => {
    if (!enableTransitions || !isTransitioning) return ''

    const baseClasses = 'transition-all'
    const durationClass = `duration-${Math.round(finalTransitionConfig.duration / 100) * 100}`
    const easingClass = 'ease-out'
    
    let transformClasses = ''
    if (finalTransitionConfig.scale) transformClasses += ' scale-95'
    if (finalTransitionConfig.fade) transformClasses += ' opacity-50'
    if (finalTransitionConfig.blur) transformClasses += ' blur-sm'

    return `${baseClasses} ${durationClass} ${easingClass}${transformClasses}`
  }, [enableTransitions, isTransitioning, finalTransitionConfig])

  const animateViewTransition = useCallback((fromView: CalendarViewMode, toView: CalendarViewMode) => {
    if (!enableAnimations || !enableTransitions) return

    setCurrentAnimation(`transition-${fromView}-to-${toView}`)
    setIsAnimating(true)

    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current)
    }

    animationTimeoutRef.current = setTimeout(() => {
      setIsAnimating(false)
      setCurrentAnimation(null)
    }, finalTransitionConfig.duration)
  }, [enableAnimations, enableTransitions, finalTransitionConfig.duration])

  // Responsive updates
  const updateResponsiveConfig = useCallback(() => {
    const newConfig = getResponsiveConfig()
    setResponsiveConfig(newConfig)
  }, [])

  // Setup responsive listener
  useEffect(() => {
    if (typeof window === 'undefined') return

    updateResponsiveConfig()
    
    const handleResize = () => {
      updateResponsiveConfig()
    }

    const handleOrientationChange = () => {
      // Add slight delay to allow for orientation change completion
      setTimeout(updateResponsiveConfig, 100)
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleOrientationChange)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleOrientationChange)
    }
  }, [updateResponsiveConfig])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  // Get optimal view based on device
  const getOptimalViewForDevice = useCallback((deviceType: DeviceType, isLandscape: boolean): CalendarViewMode => {
    switch (deviceType) {
      case 'mobile':
        return isLandscape ? 'week' : 'day'
      case 'tablet':
        return 'week'
      case 'desktop':
        return 'month'
      default:
        return 'month'
    }
  }, [])

  // Animation utilities
  const queueAnimation = useCallback((animationName: string) => {
    setQueuedAnimations(prev => [...prev, animationName])
  }, [])

  const processAnimationQueue = useCallback(() => {
    if (queuedAnimations.length > 0 && !isAnimating) {
      const nextAnimation = queuedAnimations[0]
      setQueuedAnimations(prev => prev.slice(1))
      setCurrentAnimation(nextAnimation)
      setIsAnimating(true)

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }

      animationTimeoutRef.current = setTimeout(() => {
        setIsAnimating(false)
        setCurrentAnimation(null)
      }, defaultAnimationDuration)
    }
  }, [queuedAnimations, isAnimating, defaultAnimationDuration])

  // Process animation queue when conditions change
  useEffect(() => {
    processAnimationQueue()
  }, [processAnimationQueue])

  // Responsive utilities
  const getResponsiveStyles = useCallback((styles: {
    mobile?: React.CSSProperties
    tablet?: React.CSSProperties
    desktop?: React.CSSProperties
  }) => {
    const { isMobile, isTablet, isDesktop } = responsiveConfig

    if (isMobile && styles.mobile) return styles.mobile
    if (isTablet && styles.tablet) return styles.tablet
    if (isDesktop && styles.desktop) return styles.desktop

    return {}
  }, [responsiveConfig])

  return {
    // Responsive config
    ...responsiveConfig,
    getOptimalViewForDevice,
    getResponsiveStyles,
    updateResponsiveConfig,

    // Animation functions
    fadeIn,
    fadeOut,
    slideIn,
    scaleIn,
    dragAnimation,
    hoverAnimation,
    
    // Animation state
    isAnimating,
    currentAnimation,
    queuedAnimations,
    queueAnimation,

    // Transition functions
    transitionToView,
    animateViewTransition,
    getTransitionClasses,
    
    // Transition state
    currentView,
    isTransitioning,
    transitionDirection,
    
    // Visual utilities
    enableAnimations,
    enableTransitions,
    transitionConfig: finalTransitionConfig,
    
    // Animation utilities
    createAnimation: (keyframes: Keyframe[], options?: KeyframeAnimationOptions) => {
      if (!enableAnimations) return null
      return { keyframes, options }
    },
    
    // Responsive breakpoints
    breakpoints,
    
    // Theme-aware animations (for potential dark mode support)
    getThemeAwareAnimation: (lightAnimation: any, darkAnimation?: any) => {
      // This could be extended to support theme-based animations
      return lightAnimation
    }
  }
}

// Type exports
export type {
  DeviceType,
  CalendarViewMode,
  AnimationConfig,
  TransitionConfig,
  ResponsiveConfig,
  UseCalendarVisualsOptions
}