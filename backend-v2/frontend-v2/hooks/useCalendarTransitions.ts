'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type ViewMode = 'day' | 'week' | 'month' | 'agenda'

interface TransitionConfig {
  duration: number
  easing: string
  blur: boolean
  scale: boolean
  fade: boolean
}

interface UseCalendarTransitionsOptions {
  onTransitionStart?: (from: ViewMode, to: ViewMode) => void
  onTransitionEnd?: (from: ViewMode, to: ViewMode) => void
  config?: Partial<TransitionConfig>
}

const defaultConfig: TransitionConfig = {
  duration: 400,
  easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // iOS easing
  blur: true,
  scale: true,
  fade: true
}

export function useCalendarTransitions(options: UseCalendarTransitionsOptions = {}) {
  const [currentView, setCurrentView] = useState<ViewMode>('month')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<'left' | 'right' | 'up' | 'down'>('right')
  const previousViewRef = useRef<ViewMode>('month')
  const transitionTimeoutRef = useRef<NodeJS.Timeout>()

  const config = { ...defaultConfig, ...options.config }

  // Define view hierarchy for smooth transitions
  const viewHierarchy: Record<ViewMode, number> = {
    day: 0,
    week: 1,
    month: 2,
    agenda: 3
  }

  // Calculate transition direction based on view hierarchy
  const getTransitionDirection = useCallback((from: ViewMode, to: ViewMode): 'left' | 'right' | 'up' | 'down' => {
    const fromIndex = viewHierarchy[from]
    const toIndex = viewHierarchy[to]

    if (fromIndex < toIndex) {
      return 'right' // Going to a broader view
    } else if (fromIndex > toIndex) {
      return 'left' // Going to a more detailed view
    } else {
      return 'down' // Same level (shouldn't happen but fallback)
    }
  }, [])

  // Main transition function
  const transitionToView = useCallback(async (newView: ViewMode) => {
    if (newView === currentView || isTransitioning) return

    const previousView = currentView
    const direction = getTransitionDirection(currentView, newView)

    setIsTransitioning(true)
    setTransitionDirection(direction)
    previousViewRef.current = currentView

    // Notify transition start
    options.onTransitionStart?.(currentView, newView)

    // Clear any existing timeout
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current)
    }

    // Add haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }

    // Smooth transition delay
    await new Promise(resolve => setTimeout(resolve, 50))

    setCurrentView(newView)

    // Complete transition after animation duration
    transitionTimeoutRef.current = setTimeout(() => {
      setIsTransitioning(false)
      options.onTransitionEnd?.(previousView, newView)
    }, config.duration)

  }, [currentView, isTransitioning, getTransitionDirection, options, config.duration])

  // Generate transition classes
  const getTransitionClasses = useCallback((viewMode: ViewMode) => {
    const baseClasses = 'transition-all transform-gpu will-change-transform'
    const duration = `duration-${config.duration}`
    const easing = 'ease-ios'

    if (!isTransitioning) {
      return `${baseClasses} ${duration} ${easing}`
    }

    const isEntering = viewMode === currentView
    const isExiting = viewMode === previousViewRef.current

    if (isEntering) {
      // Entering view
      const enterClasses = []
      
      if (config.fade) enterClasses.push('animate-in', 'fade-in-0')
      if (config.scale) enterClasses.push('zoom-in-95')
      
      switch (transitionDirection) {
        case 'left':
          enterClasses.push('slide-in-from-left-6')
          break
        case 'right':
          enterClasses.push('slide-in-from-right-6')
          break
        case 'up':
          enterClasses.push('slide-in-from-bottom-6')
          break
        case 'down':
          enterClasses.push('slide-in-from-top-6')
          break
      }

      return `${baseClasses} ${duration} ${easing} ${enterClasses.join(' ')}`
    }

    if (isExiting) {
      // Exiting view
      const exitClasses = []
      
      if (config.fade) exitClasses.push('animate-out', 'fade-out-0')
      if (config.scale) exitClasses.push('zoom-out-95')
      
      switch (transitionDirection) {
        case 'left':
          exitClasses.push('slide-out-to-right-6')
          break
        case 'right':
          exitClasses.push('slide-out-to-left-6')
          break
        case 'up':
          exitClasses.push('slide-out-to-top-6')
          break
        case 'down':
          exitClasses.push('slide-out-to-bottom-6')
          break
      }

      return `${baseClasses} ${duration} ${easing} ${exitClasses.join(' ')}`
    }

    return `${baseClasses} ${duration} ${easing} opacity-0 pointer-events-none`
  }, [isTransitioning, currentView, transitionDirection, config])

  // Generate container classes for the transition wrapper
  const getContainerClasses = useCallback(() => {
    const baseClasses = 'relative overflow-hidden'
    
    if (isTransitioning && config.blur) {
      return `${baseClasses} backdrop-blur-sm`
    }

    return baseClasses
  }, [isTransitioning, config.blur])

  // Preload transition styles for smooth animation
  const getPreloadStyles = useCallback(() => ({
    '--transition-duration': `${config.duration}ms`,
    '--transition-easing': config.easing,
  } as React.CSSProperties), [config])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  return {
    currentView,
    isTransitioning,
    transitionDirection,
    transitionToView,
    getTransitionClasses,
    getContainerClasses,
    getPreloadStyles,
    
    // Helper methods
    canTransition: !isTransitioning,
    isEntering: (viewMode: ViewMode) => isTransitioning && viewMode === currentView,
    isExiting: (viewMode: ViewMode) => isTransitioning && viewMode === previousViewRef.current,
    isVisible: (viewMode: ViewMode) => viewMode === currentView || (isTransitioning && viewMode === previousViewRef.current)
  }
}

// Enhanced transition variants for different scenarios
export const transitionVariants = {
  // Smooth cross-fade
  crossFade: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    blur: false,
    scale: false,
    fade: true
  },
  
  // iOS-style slide
  slide: {
    duration: 400,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    blur: true,
    scale: false,
    fade: true
  },
  
  // Zoom transition
  zoom: {
    duration: 350,
    easing: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    blur: false,
    scale: true,
    fade: true
  },
  
  // Quick snap
  snap: {
    duration: 200,
    easing: 'cubic-bezier(0.4, 0, 1, 1)',
    blur: false,
    scale: false,
    fade: true
  }
}

// Utility function for manual transition triggers
export function createTransitionTrigger(
  transitionFn: (view: ViewMode) => Promise<void>,
  options: { haptic?: boolean; delay?: number } = {}
) {
  return async (view: ViewMode) => {
    if (options.haptic && 'vibrate' in navigator) {
      navigator.vibrate(30)
    }
    
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay))
    }
    
    await transitionFn(view)
  }
}