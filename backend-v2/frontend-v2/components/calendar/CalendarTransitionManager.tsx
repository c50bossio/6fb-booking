'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useAnimation, animationPresets } from '@/lib/animations'

type TransitionType = 
  | 'slide-left' 
  | 'slide-right' 
  | 'slide-up' 
  | 'slide-down'
  | 'fade' 
  | 'scale' 
  | 'flip'
  | 'zoom'

type TransitionDirection = 'in' | 'out'

interface CalendarTransitionManagerProps {
  children: React.ReactNode
  isVisible: boolean
  transitionType?: TransitionType
  duration?: number
  delay?: number
  onTransitionStart?: () => void
  onTransitionComplete?: () => void
  className?: string
  preserveSpace?: boolean
}

interface ViewTransitionProps {
  currentView: string
  children: React.ReactNode
  transitionKey: string
  direction?: 'forward' | 'backward'
  className?: string
}

interface StaggeredTransitionProps {
  children: React.ReactElement[]
  staggerDelay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
  className?: string
}

/**
 * Advanced transition manager for calendar components with smooth animations
 * Handles view changes, loading states, and micro-interactions
 */
export function CalendarTransitionManager({
  children,
  isVisible,
  transitionType = 'fade',
  duration = 300,
  delay = 0,
  onTransitionStart,
  onTransitionComplete,
  className = '',
  preserveSpace = false
}: CalendarTransitionManagerProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [shouldRender, setShouldRender] = useState(isVisible)
  const elementRef = useRef<HTMLDivElement>(null)
  const { prefersReducedMotion } = useAnimation()

  const getTransitionStyles = useCallback((type: TransitionType, direction: TransitionDirection) => {
    if (prefersReducedMotion) {
      return direction === 'in' 
        ? { opacity: 1, transform: 'none' }
        : { opacity: 0, transform: 'none' }
    }

    const transitions = {
      'slide-left': {
        in: { opacity: 1, transform: 'translateX(0)' },
        out: { opacity: 0, transform: 'translateX(-100%)' }
      },
      'slide-right': {
        in: { opacity: 1, transform: 'translateX(0)' },
        out: { opacity: 0, transform: 'translateX(100%)' }
      },
      'slide-up': {
        in: { opacity: 1, transform: 'translateY(0)' },
        out: { opacity: 0, transform: 'translateY(-20px)' }
      },
      'slide-down': {
        in: { opacity: 1, transform: 'translateY(0)' },
        out: { opacity: 0, transform: 'translateY(20px)' }
      },
      'fade': {
        in: { opacity: 1, transform: 'none' },
        out: { opacity: 0, transform: 'none' }
      },
      'scale': {
        in: { opacity: 1, transform: 'scale(1)' },
        out: { opacity: 0, transform: 'scale(0.95)' }
      },
      'flip': {
        in: { opacity: 1, transform: 'rotateY(0deg)' },
        out: { opacity: 0, transform: 'rotateY(90deg)' }
      },
      'zoom': {
        in: { opacity: 1, transform: 'scale(1)' },
        out: { opacity: 0, transform: 'scale(1.05)' }
      }
    }

    return transitions[type][direction]
  }, [prefersReducedMotion])

  const performTransition = useCallback(async (visible: boolean) => {
    if (!elementRef.current) return

    setIsTransitioning(true)
    onTransitionStart?.()

    const element = elementRef.current
    const targetStyles = getTransitionStyles(transitionType, visible ? 'in' : 'out')

    // Show element if transitioning in
    if (visible) {
      setShouldRender(true)
      // Apply initial out state before transitioning in
      const initialStyles = getTransitionStyles(transitionType, 'out')
      Object.assign(element.style, {
        ...initialStyles,
        transition: 'none'
      })

      // Force reflow
      element.offsetHeight

      // Add delay if specified
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    // Apply transition
    Object.assign(element.style, {
      ...targetStyles,
      transition: prefersReducedMotion 
        ? 'none' 
        : `all ${duration}ms ${animationPresets.easing.ios}`,
      willChange: 'transform, opacity'
    })

    // Wait for transition to complete
    await new Promise(resolve => setTimeout(resolve, prefersReducedMotion ? 0 : duration))

    // Clean up will-change and hide element if transitioning out
    element.style.willChange = 'auto'
    if (!visible && !preserveSpace) {
      setShouldRender(false)
    }

    setIsTransitioning(false)
    onTransitionComplete?.()
  }, [transitionType, duration, delay, getTransitionStyles, onTransitionStart, onTransitionComplete, prefersReducedMotion, preserveSpace])

  useEffect(() => {
    performTransition(isVisible)
  }, [isVisible, performTransition])

  if (!shouldRender && !preserveSpace) {
    return null
  }

  return (
    <div
      ref={elementRef}
      className={`${className} ${isTransitioning ? 'pointer-events-none' : ''}`}
      style={{
        opacity: preserveSpace && !shouldRender ? 0 : undefined,
        pointerEvents: isTransitioning ? 'none' : undefined
      }}
    >
      {children}
    </div>
  )
}

/**
 * Manages transitions between different calendar views with directional awareness
 */
export function CalendarViewTransition({
  currentView,
  children,
  transitionKey,
  direction = 'forward',
  className = ''
}: ViewTransitionProps) {
  const [displayView, setDisplayView] = useState(currentView)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { prefersReducedMotion } = useAnimation()

  const getViewTransition = useCallback((isForward: boolean) => {
    if (prefersReducedMotion) {
      return { transitionType: 'fade' as TransitionType, duration: 0 }
    }

    // Choose transition based on direction
    return {
      transitionType: isForward ? 'slide-left' : 'slide-right' as TransitionType,
      duration: 400
    }
  }, [prefersReducedMotion])

  useEffect(() => {
    if (displayView !== currentView) {
      const performViewTransition = async () => {
        setIsTransitioning(true)
        
        const { transitionType, duration } = getViewTransition(direction === 'forward')
        
        // Fade out current view
        if (containerRef.current) {
          const element = containerRef.current
          element.style.transition = `all ${duration}ms ${animationPresets.easing.ios}`
          element.style.opacity = '0'
          element.style.transform = direction === 'forward' ? 'translateX(-20px)' : 'translateX(20px)'
          
          await new Promise(resolve => setTimeout(resolve, duration / 2))
          
          // Switch view
          setDisplayView(currentView)
          
          // Fade in new view
          element.style.transform = direction === 'forward' ? 'translateX(20px)' : 'translateX(-20px)'
          
          // Force reflow
          element.offsetHeight
          
          element.style.opacity = '1'
          element.style.transform = 'translateX(0)'
          
          await new Promise(resolve => setTimeout(resolve, duration / 2))
          
          element.style.transition = 'none'
          element.style.willChange = 'auto'
        }
        
        setIsTransitioning(false)
      }

      performViewTransition()
    }
  }, [currentView, displayView, direction, getViewTransition])

  return (
    <div 
      ref={containerRef}
      className={`${className} ${isTransitioning ? 'pointer-events-none' : ''}`}
      key={transitionKey}
    >
      {children}
    </div>
  )
}

/**
 * Handles staggered animations for multiple calendar elements
 */
export function CalendarStaggeredTransition({
  children,
  staggerDelay = 100,
  direction = 'up',
  className = ''
}: StaggeredTransitionProps) {
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set())
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    if (prefersReducedMotion) {
      // Show all items immediately if motion is reduced
      setVisibleItems(new Set(children.map((_, index) => index)))
      return
    }

    // Stagger the appearance of items
    children.forEach((_, index) => {
      setTimeout(() => {
        setVisibleItems(prev => new Set([...prev, index]))
      }, index * staggerDelay)
    })

    // Cleanup function
    return () => {
      setVisibleItems(new Set())
    }
  }, [children, staggerDelay, prefersReducedMotion])

  const getStaggerTransition = (index: number) => {
    const isVisible = visibleItems.has(index)
    
    if (prefersReducedMotion) {
      return { opacity: 1, transform: 'none' }
    }

    const transforms = {
      up: isVisible ? 'translateY(0)' : 'translateY(20px)',
      down: isVisible ? 'translateY(0)' : 'translateY(-20px)',
      left: isVisible ? 'translateX(0)' : 'translateX(20px)',
      right: isVisible ? 'translateX(0)' : 'translateX(-20px)'
    }

    return {
      opacity: isVisible ? 1 : 0,
      transform: transforms[direction],
      transition: `all 300ms ${animationPresets.easing.ios}`,
      transitionDelay: '0ms'
    }
  }

  return (
    <div className={className}>
      {children.map((child, index) =>
        React.cloneElement(child, {
          key: child.key || index,
          style: {
            ...child.props.style,
            ...getStaggerTransition(index)
          }
        })
      )}
    </div>
  )
}

/**
 * Loading state transition with smooth fade effects
 */
interface LoadingTransitionProps {
  isLoading: boolean
  children: React.ReactNode
  loadingComponent: React.ReactNode
  className?: string
}

export function CalendarLoadingTransition({
  isLoading,
  children,
  loadingComponent,
  className = ''
}: LoadingTransitionProps) {
  const [showLoading, setShowLoading] = useState(isLoading)
  const [showContent, setShowContent] = useState(!isLoading)

  useEffect(() => {
    if (isLoading) {
      // Show loading immediately
      setShowLoading(true)
      
      // Hide content after brief delay to allow for smooth transition
      setTimeout(() => {
        setShowContent(false)
      }, 150)
    } else {
      // Hide loading and show content
      setShowLoading(false)
      setTimeout(() => {
        setShowContent(true)
      }, 150)
    }
  }, [isLoading])

  return (
    <div className={`relative ${className}`}>
      <CalendarTransitionManager
        isVisible={showContent}
        transitionType="fade"
        duration={300}
      >
        {children}
      </CalendarTransitionManager>
      
      <CalendarTransitionManager
        isVisible={showLoading}
        transitionType="fade"
        duration={300}
        className="absolute inset-0"
      >
        {loadingComponent}
      </CalendarTransitionManager>
    </div>
  )
}

/**
 * Page transition with slide effects for calendar navigation
 */
interface PageTransitionProps {
  children: React.ReactNode
  pageKey: string
  direction?: 'horizontal' | 'vertical'
  className?: string
}

export function CalendarPageTransition({
  children,
  pageKey,
  direction = 'horizontal',
  className = ''
}: PageTransitionProps) {
  const [currentKey, setCurrentKey] = useState(pageKey)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    if (currentKey !== pageKey) {
      const performPageTransition = async () => {
        if (!containerRef.current) return

        setIsTransitioning(true)
        const element = containerRef.current

        if (prefersReducedMotion) {
          setCurrentKey(pageKey)
          setIsTransitioning(false)
          return
        }

        // Slide out current page
        element.style.transition = `transform 250ms ${animationPresets.easing.ios}`
        element.style.transform = direction === 'horizontal' 
          ? 'translateX(-100%)' 
          : 'translateY(-100%)'
        
        await new Promise(resolve => setTimeout(resolve, 250))
        
        // Update content
        setCurrentKey(pageKey)
        
        // Reset position for slide in
        element.style.transition = 'none'
        element.style.transform = direction === 'horizontal'
          ? 'translateX(100%)'
          : 'translateY(100%)'
        
        // Force reflow
        element.offsetHeight
        
        // Slide in new page
        element.style.transition = `transform 300ms ${animationPresets.easing.ios}`
        element.style.transform = 'translate(0, 0)'
        
        await new Promise(resolve => setTimeout(resolve, 300))
        
        element.style.transition = 'none'
        setIsTransitioning(false)
      }

      performPageTransition()
    }
  }, [pageKey, currentKey, direction, prefersReducedMotion])

  return (
    <div 
      ref={containerRef}
      className={`${className} ${isTransitioning ? 'pointer-events-none' : ''}`}
      style={{
        willChange: isTransitioning ? 'transform' : 'auto'
      }}
    >
      {children}
    </div>
  )
}

/**
 * Modal transition with backdrop fade and content scale
 */
interface ModalTransitionProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  closeOnBackdropClick?: boolean
}

export function CalendarModalTransition({
  isOpen,
  onClose,
  children,
  className = '',
  closeOnBackdropClick = true
}: ModalTransitionProps) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const { prefersReducedMotion } = useAnimation()

  const performModalTransition = useCallback(async (show: boolean) => {
    if (!modalRef.current || !backdropRef.current) return

    const modal = modalRef.current
    const backdrop = backdropRef.current

    if (show) {
      setShouldRender(true)
      
      if (!prefersReducedMotion) {
        // Initial state
        modal.style.transform = 'scale(0.9)'
        modal.style.opacity = '0'
        backdrop.style.opacity = '0'
        
        // Force reflow
        modal.offsetHeight
        
        // Animate in
        modal.style.transition = `all 200ms ${animationPresets.easing.ios}`
        backdrop.style.transition = `opacity 200ms ${animationPresets.easing.ios}`
        
        modal.style.transform = 'scale(1)'
        modal.style.opacity = '1'
        backdrop.style.opacity = '1'
        
        await new Promise(resolve => setTimeout(resolve, 200))
        
        modal.style.transition = 'none'
        backdrop.style.transition = 'none'
      }
    } else {
      if (!prefersReducedMotion) {
        modal.style.transition = `all 150ms ${animationPresets.easing.ios}`
        backdrop.style.transition = `opacity 150ms ${animationPresets.easing.ios}`
        
        modal.style.transform = 'scale(0.95)'
        modal.style.opacity = '0'
        backdrop.style.opacity = '0'
        
        await new Promise(resolve => setTimeout(resolve, 150))
      }
      
      setShouldRender(false)
    }
  }, [prefersReducedMotion])

  useEffect(() => {
    performModalTransition(isOpen)
  }, [isOpen, performModalTransition])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!shouldRender) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        ref={backdropRef}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />
      
      <div
        ref={modalRef}
        className={`relative z-10 max-w-full max-h-full overflow-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export default CalendarTransitionManager