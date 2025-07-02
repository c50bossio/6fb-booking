'use client'

import { useReducedMotion } from '@/lib/accessibility'

/**
 * Comprehensive Animation and Transition System
 * Respects user motion preferences and provides smooth, performant animations
 */

// Animation presets following iOS design principles
export const animationPresets = {
  // Easing curves
  easing: {
    ios: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
    linear: 'linear',
  },

  // Duration scales
  duration: {
    instant: '0ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '400ms',
    slowest: '600ms',
  },

  // Spring configurations for react-spring
  spring: {
    gentle: { tension: 120, friction: 14 },
    wobbly: { tension: 180, friction: 12 },
    stiff: { tension: 210, friction: 20 },
    slow: { tension: 280, friction: 60 },
    molasses: { tension: 280, friction: 120 },
  },

  // Keyframe animations
  keyframes: {
    fadeIn: {
      from: { opacity: 0 },
      to: { opacity: 1 },
    },
    fadeOut: {
      from: { opacity: 1 },
      to: { opacity: 0 },
    },
    slideUp: {
      from: { transform: 'translateY(20px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    slideDown: {
      from: { transform: 'translateY(-20px)', opacity: 0 },
      to: { transform: 'translateY(0)', opacity: 1 },
    },
    slideLeft: {
      from: { transform: 'translateX(20px)', opacity: 0 },
      to: { transform: 'translateX(0)', opacity: 1 },
    },
    slideRight: {
      from: { transform: 'translateX(-20px)', opacity: 0 },
      to: { transform: 'translateX(0)', opacity: 1 },
    },
    scaleIn: {
      from: { transform: 'scale(0.95)', opacity: 0 },
      to: { transform: 'scale(1)', opacity: 1 },
    },
    scaleOut: {
      from: { transform: 'scale(1)', opacity: 1 },
      to: { transform: 'scale(0.95)', opacity: 0 },
    },
    bounce: {
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
      '100%': { transform: 'scale(1)' },
    },
    pulse: {
      '0%': { opacity: 1 },
      '50%': { opacity: 0.5 },
      '100%': { opacity: 1 },
    },
    shimmer: {
      '0%': { transform: 'translateX(-100%)' },
      '100%': { transform: 'translateX(100%)' },
    },
    shake: {
      '0%, 100%': { transform: 'translateX(0)' },
      '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-2px)' },
      '20%, 40%, 60%, 80%': { transform: 'translateX(2px)' },
    },
    wiggle: {
      '0%, 100%': { transform: 'rotate(0deg)' },
      '25%': { transform: 'rotate(-3deg)' },
      '75%': { transform: 'rotate(3deg)' },
    },
    heartbeat: {
      '0%': { transform: 'scale(1)' },
      '14%': { transform: 'scale(1.1)' },
      '28%': { transform: 'scale(1)' },
      '42%': { transform: 'scale(1.1)' },
      '70%': { transform: 'scale(1)' },
    },
  },
}

// CSS-in-JS animation utilities
export const createAnimation = (
  keyframes: Record<string, any>,
  duration: string = animationPresets.duration.normal,
  easing: string = animationPresets.easing.ios,
  fillMode: string = 'both'
) => ({
  animation: `${duration} ${easing} ${fillMode}`,
  '@keyframes': keyframes,
})

// Transition utilities
export const createTransition = (
  properties: string | string[],
  duration: string = animationPresets.duration.normal,
  easing: string = animationPresets.easing.ios,
  delay: string = '0ms'
) => {
  const props = Array.isArray(properties) ? properties.join(', ') : properties
  return `${props} ${duration} ${easing} ${delay}`
}

// Animation classes generator
export const generateAnimationClasses = () => {
  const classes: Record<string, any> = {}

  // Duration classes
  Object.entries(animationPresets.duration).forEach(([name, duration]) => {
    classes[`.duration-${name}`] = { animationDuration: duration }
    classes[`.transition-${name}`] = { transitionDuration: duration }
  })

  // Easing classes
  Object.entries(animationPresets.easing).forEach(([name, easing]) => {
    classes[`.ease-${name}`] = { 
      animationTimingFunction: easing,
      transitionTimingFunction: easing 
    }
  })

  // Animation classes
  Object.entries(animationPresets.keyframes).forEach(([name, keyframes]) => {
    classes[`.animate-${name}`] = {
      animation: `${name} ${animationPresets.duration.normal} ${animationPresets.easing.ios} both`,
      '@keyframes': { [name]: keyframes }
    }
  })

  return classes
}

// React hooks for animations
export const useAnimation = () => {
  const prefersReducedMotion = useReducedMotion()

  const getAnimationProps = (
    animation: string,
    duration: string = animationPresets.duration.normal,
    easing: string = animationPresets.easing.ios
  ) => {
    if (prefersReducedMotion) {
      return { style: {} } // No animation for reduced motion users
    }

    return {
      style: {
        animation: `${animation} ${duration} ${easing} both`,
      },
    }
  }

  const getTransitionProps = (
    properties: string | string[],
    duration: string = animationPresets.duration.normal,
    easing: string = animationPresets.easing.ios
  ) => {
    if (prefersReducedMotion) {
      return { style: {} }
    }

    const transition = createTransition(properties, duration, easing)
    return { style: { transition } }
  }

  return {
    getAnimationProps,
    getTransitionProps,
    prefersReducedMotion,
  }
}

// Intersection Observer animation hook
export const useInViewAnimation = (
  animation: string = 'fadeIn',
  options: IntersectionObserverInit = {}
) => {
  const [isInView, setIsInView] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)
  const elementRef = useRef<HTMLElement>(null)
  const { getAnimationProps, prefersReducedMotion } = useAnimation()

  useEffect(() => {
    const element = elementRef.current
    if (!element || prefersReducedMotion) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setIsInView(true)
          setHasAnimated(true)
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    )

    observer.observe(element)

    return () => observer.unobserve(element)
  }, [hasAnimated, options, prefersReducedMotion])

  return {
    elementRef,
    isInView,
    animationProps: isInView ? getAnimationProps(animation) : {},
  }
}

// Stagger animation utilities
export const createStaggeredAnimation = (
  children: number,
  baseDelay: number = 100,
  animation: string = 'slideUp'
) => {
  return Array.from({ length: children }, (_, index) => ({
    ...animationPresets.keyframes[animation as keyof typeof animationPresets.keyframes],
    animationDelay: `${index * baseDelay}ms`,
  }))
}

// Page transition animations
export const pageTransitions = {
  slideRight: {
    initial: { x: -300, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 300, opacity: 0 },
  },
  slideLeft: {
    initial: { x: 300, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -300, opacity: 0 },
  },
  slideUp: {
    initial: { y: 300, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -300, opacity: 0 },
  },
  slideDown: {
    initial: { y: -300, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 300, opacity: 0 },
  },
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  scale: {
    initial: { scale: 0.8, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 },
  },
}

// Utility functions for common animations
export const AnimationUtils = {
  /**
   * Create a CSS animation string
   */
  createCSSAnimation: (
    name: string,
    duration: string = '200ms',
    easing: string = 'ease-ios',
    fillMode: string = 'both'
  ) => `${name} ${duration} ${easing} ${fillMode}`,

  /**
   * Get safe animation duration (respects reduced motion)
   */
  getSafeDuration: (
    duration: string,
    reducedMotion: boolean = false
  ) => reducedMotion ? '0ms' : duration,

  /**
   * Create transform string
   */
  createTransform: (transforms: Record<string, string | number>) => {
    return Object.entries(transforms)
      .map(([key, value]) => `${key}(${value})`)
      .join(' ')
  },

  /**
   * Interpolate between values for animations
   */
  interpolate: (
    progress: number,
    from: number,
    to: number
  ) => from + (to - from) * progress,

  /**
   * Easing functions
   */
  easingFunctions: {
    easeInOut: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    easeOut: (t: number) => t * (2 - t),
    easeIn: (t: number) => t * t,
    bounce: (t: number) => {
      if (t < 1 / 2.75) return 7.5625 * t * t
      if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
      if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
    },
  },
}

// Performance optimizations
export const PerformantAnimations = {
  /**
   * Use transform and opacity for better performance
   */
  optimizedProperties: [
    'transform',
    'opacity',
    'filter',
    'backdrop-filter',
  ],

  /**
   * Properties that trigger layout recalculation (avoid animating these)
   */
  expensiveProperties: [
    'width',
    'height',
    'top',
    'left',
    'right',
    'bottom',
    'margin',
    'padding',
    'border-width',
  ],

  /**
   * Enable GPU acceleration
   */
  enableGPU: {
    transform: 'translate3d(0, 0, 0)',
    willChange: 'transform',
  },

  /**
   * Clean up GPU layers after animation
   */
  disableGPU: {
    transform: 'none',
    willChange: 'auto',
  },
}

// Add missing imports
import React, { useState, useEffect, useRef } from 'react'

// Export everything
export default {
  animationPresets,
  createAnimation,
  createTransition,
  generateAnimationClasses,
  useAnimation,
  useInViewAnimation,
  createStaggeredAnimation,
  pageTransitions,
  AnimationUtils,
  PerformantAnimations,
}