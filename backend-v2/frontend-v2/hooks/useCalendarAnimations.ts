'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface AnimationConfig {
  duration?: number
  easing?: string
  delay?: number
}

interface CalendarAnimationState {
  isAnimating: boolean
  currentAnimation: string | null
  queuedAnimations: string[]
}

/**
 * Hook for managing smooth calendar animations
 * Provides animation state management and utility functions
 */
export function useCalendarAnimations() {
  const [animationState, setAnimationState] = useState<CalendarAnimationState>({
    isAnimating: false,
    currentAnimation: null,
    queuedAnimations: []
  })
  
  const animationTimeoutRef = useRef<NodeJS.Timeout>()
  const prefersReducedMotion = useRef(false)

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.current = mediaQuery.matches
    
    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const triggerAnimation = useCallback((
    animationName: string, 
    config: AnimationConfig = {}
  ) => {
    // Skip animations if user prefers reduced motion
    if (prefersReducedMotion.current) {
      return Promise.resolve()
    }

    const { duration = 300, delay = 0 } = config

    return new Promise<void>((resolve) => {
      setAnimationState(prev => ({
        ...prev,
        isAnimating: true,
        currentAnimation: animationName
      }))

      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }

      animationTimeoutRef.current = setTimeout(() => {
        setAnimationState(prev => ({
          ...prev,
          isAnimating: false,
          currentAnimation: null
        }))
        resolve()
      }, duration + delay)
    })
  }, [])

  const queueAnimation = useCallback((animationName: string) => {
    setAnimationState(prev => ({
      ...prev,
      queuedAnimations: [...prev.queuedAnimations, animationName]
    }))
  }, [])

  const clearAnimationQueue = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      queuedAnimations: []
    }))
  }, [])

  // Animation utility functions
  const animateViewTransition = useCallback((direction: 'forward' | 'backward' = 'forward') => {
    const animationName = direction === 'forward' ? 'view-transition-forward' : 'view-transition-backward'
    return triggerAnimation(animationName, { duration: 350 })
  }, [triggerAnimation])

  const animateAppointmentCreate = useCallback(() => {
    return triggerAnimation('appointment-create', { duration: 400 })
  }, [triggerAnimation])

  const animateAppointmentUpdate = useCallback(() => {
    return triggerAnimation('appointment-update', { duration: 250 })
  }, [triggerAnimation])

  const animateAppointmentDelete = useCallback(() => {
    return triggerAnimation('appointment-delete', { duration: 300 })
  }, [triggerAnimation])

  const animateDateNavigation = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    const animationName = `navigation-${direction}`
    return triggerAnimation(animationName, { duration: 300 })
  }, [triggerAnimation])

  const animateLoadingState = useCallback(() => {
    return triggerAnimation('loading', { duration: 1000 })
  }, [triggerAnimation])

  const animateSuccess = useCallback(() => {
    return triggerAnimation('success', { duration: 600 })
  }, [triggerAnimation])

  const animateError = useCallback(() => {
    return triggerAnimation('error', { duration: 400 })
  }, [triggerAnimation])

  // CSS class generators for animations
  const getAnimationClasses = useCallback((baseClasses: string = '') => {
    const classes = [baseClasses]
    
    if (animationState.isAnimating && animationState.currentAnimation) {
      classes.push(`animate-${animationState.currentAnimation}`)
    }
    
    return classes.filter(Boolean).join(' ')
  }, [animationState])

  const getTransitionClasses = useCallback((element: 'view' | 'appointment' | 'modal' = 'view') => {
    const baseClasses = {
      view: 'transition-all duration-300 ease-out',
      appointment: 'transition-all duration-200 ease-out',
      modal: 'transition-all duration-300 ease-out'
    }
    
    return baseClasses[element]
  }, [])

  // Touch-optimized animation functions
  const animateTouchStart = useCallback((element: HTMLElement) => {
    if (prefersReducedMotion.current) return
    
    element.style.transform = 'scale(0.98)'
    element.style.transition = 'transform 150ms ease-out'
  }, [])

  const animateTouchEnd = useCallback((element: HTMLElement) => {
    if (prefersReducedMotion.current) return
    
    element.style.transform = 'scale(1)'
    element.style.transition = 'transform 200ms ease-out'
  }, [])

  const animateTouchCancel = useCallback((element: HTMLElement) => {
    if (prefersReducedMotion.current) return
    
    element.style.transform = 'scale(1)'
    element.style.transition = 'transform 100ms ease-out'
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [])

  return {
    // State
    animationState,
    isAnimating: animationState.isAnimating,
    currentAnimation: animationState.currentAnimation,
    prefersReducedMotion: prefersReducedMotion.current,
    
    // Core animation functions
    triggerAnimation,
    queueAnimation,
    clearAnimationQueue,
    
    // Specific animation functions
    animateViewTransition,
    animateAppointmentCreate,
    animateAppointmentUpdate,
    animateAppointmentDelete,
    animateDateNavigation,
    animateLoadingState,
    animateSuccess,
    animateError,
    
    // CSS utilities
    getAnimationClasses,
    getTransitionClasses,
    
    // Touch animations
    animateTouchStart,
    animateTouchEnd,
    animateTouchCancel
  }
}

/**
 * Utility function to apply consistent loading animations
 */
export function useLoadingAnimation(isLoading: boolean) {
  const [loadingClass, setLoadingClass] = useState('')
  
  useEffect(() => {
    if (isLoading) {
      setLoadingClass('calendar-loading animate-pulse')
    } else {
      setLoadingClass('')
    }
  }, [isLoading])
  
  return loadingClass
}

/**
 * Utility function for staggered animations
 */
export function useStaggeredAnimation(items: any[], delay: number = 50) {
  const [visibleItems, setVisibleItems] = useState<number>(0)
  
  useEffect(() => {
    if (items.length === 0) return
    
    setVisibleItems(0)
    
    const timer = setInterval(() => {
      setVisibleItems(prev => {
        if (prev >= items.length) {
          clearInterval(timer)
          return prev
        }
        return prev + 1
      })
    }, delay)
    
    return () => clearInterval(timer)
  }, [items.length, delay])
  
  const getItemAnimationClass = useCallback((index: number) => {
    if (index < visibleItems) {
      return 'animate-fade-in-up opacity-100'
    }
    return 'opacity-0 translate-y-4'
  }, [visibleItems])
  
  return { visibleItems, getItemAnimationClass }
}