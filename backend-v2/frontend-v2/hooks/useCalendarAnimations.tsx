import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useSpring, animated, config } from '@react-spring/web'

interface AnimationConfig {
  duration?: number
  easing?: typeof config.default
  delay?: number
}

interface CalendarAnimationsHook {
  // Spring animations
  fadeIn: any
  slideIn: any
  scaleIn: any
  
  // Gesture animations
  dragAnimation: (isDragging: boolean) => any
  hoverAnimation: (isHovered: boolean) => any
  
  // Transition utilities
  staggerChildren: (index: number, total: number) => any
  pageTransition: (direction: 'left' | 'right') => any
  
  // Micro-interactions
  rippleEffect: (event: React.MouseEvent) => void
  pulseAnimation: any
  successAnimation: any
  
  // Loading animations
  shimmerAnimation: any
  skeletonPulse: any
  
  // View change animations
  viewChangeAnimation: (from: string, to: string) => any
}

export function useCalendarAnimations(): CalendarAnimationsHook {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])
  const rippleIdRef = useRef(0)

  // Fade in animation
  const fadeIn = useSpring({
    from: { opacity: 0 },
    to: { opacity: 1 },
    config: config.gentle
  })

  // Slide in animation
  const slideIn = useSpring({
    from: { transform: 'translateY(20px)', opacity: 0 },
    to: { transform: 'translateY(0px)', opacity: 1 },
    config: config.wobbly
  })

  // Scale in animation
  const scaleIn = useSpring({
    from: { transform: 'scale(0.9)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
    config: config.gentle
  })

  // Drag animation
  const dragAnimation = useCallback((isDragging: boolean) => {
    return useSpring({
      transform: isDragging ? 'scale(1.05)' : 'scale(1)',
      boxShadow: isDragging 
        ? '0 10px 30px -5px rgba(0, 0, 0, 0.3)' 
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      config: config.wobbly
    })
  }, [])

  // Hover animation
  const hoverAnimation = useCallback((isHovered: boolean) => {
    return useSpring({
      transform: isHovered ? 'translateY(-2px)' : 'translateY(0px)',
      boxShadow: isHovered 
        ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
        : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      config: config.gentle
    })
  }, [])

  // Stagger children animation
  const staggerChildren = useCallback((index: number, total: number) => {
    const delay = (index / total) * 100
    return useSpring({
      from: { opacity: 0, transform: 'translateY(20px)' },
      to: { opacity: 1, transform: 'translateY(0px)' },
      delay,
      config: config.gentle
    })
  }, [])

  // Page transition animation
  const pageTransition = useCallback((direction: 'left' | 'right') => {
    const translateX = direction === 'left' ? -100 : 100
    return useSpring({
      from: { 
        opacity: 0, 
        transform: `translateX(${translateX}px)` 
      },
      to: { 
        opacity: 1, 
        transform: 'translateX(0px)' 
      },
      config: config.slow
    })
  }, [])

  // Ripple effect
  const rippleEffect = useCallback((event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const id = rippleIdRef.current++

    setRipples(prev => [...prev, { x, y, id }])

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id))
    }, 600)
  }, [])

  // Pulse animation (for loading states)
  const pulseAnimation = useSpring({
    from: { opacity: 0.5 },
    to: { opacity: 1 },
    loop: { reverse: true },
    config: { duration: 1000 }
  })

  // Success animation
  const successAnimation = useSpring({
    from: { 
      transform: 'scale(0) rotate(0deg)',
      opacity: 0 
    },
    to: { 
      transform: 'scale(1) rotate(360deg)',
      opacity: 1 
    },
    config: config.wobbly
  })

  // Shimmer animation for loading
  const shimmerAnimation = useSpring({
    from: { backgroundPosition: '-200% 0' },
    to: { backgroundPosition: '200% 0' },
    loop: true,
    config: { duration: 1500 }
  })

  // Skeleton pulse
  const skeletonPulse = useSpring({
    from: { backgroundColor: 'rgba(0, 0, 0, 0.05)' },
    to: { backgroundColor: 'rgba(0, 0, 0, 0.1)' },
    loop: { reverse: true },
    config: { duration: 1000 }
  })

  // View change animation
  const viewChangeAnimation = useCallback((from: string, to: string) => {
    const viewOrder = ['day', 'week', 'month']
    const fromIndex = viewOrder.indexOf(from)
    const toIndex = viewOrder.indexOf(to)
    const direction = fromIndex < toIndex ? 'right' : 'left'

    return useSpring({
      from: { 
        opacity: 0,
        transform: `translateX(${direction === 'right' ? 50 : -50}px) scale(0.95)`
      },
      to: { 
        opacity: 1,
        transform: 'translateX(0px) scale(1)'
      },
      config: config.gentle
    })
  }, [])

  return {
    fadeIn,
    slideIn,
    scaleIn,
    dragAnimation,
    hoverAnimation,
    staggerChildren,
    pageTransition,
    rippleEffect,
    pulseAnimation,
    successAnimation,
    shimmerAnimation,
    skeletonPulse,
    viewChangeAnimation
  }
}

// Ripple component for micro-interactions
export function RippleContainer({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode
  className?: string 
}) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])
  const rippleIdRef = useRef(0)

  const createRipple = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const id = rippleIdRef.current++

    setRipples(prev => [...prev, { x, y, id }])

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id))
    }, 600)
  }

  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      onMouseDown={createRipple}
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/30 pointer-events-none animate-ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: 'translate(-50%, -50%)'
          }}
        />
      ))}
    </div>
  )
}

// Loading dots animation component
export function LoadingDots({ className = '' }: { className?: string }) {
  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-primary-500 rounded-full animate-bounce"
          style={{
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  )
}

// Skeleton loader component
export function Skeleton({ 
  className = '', 
  variant = 'text' 
}: { 
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
}) {
  const baseClass = 'animate-pulse bg-gray-200 dark:bg-gray-700'
  const variantClass = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md'
  }[variant]

  return <div className={`${baseClass} ${variantClass} ${className}`} />
}

// Success checkmark animation
export function SuccessCheckmark({ size = 24 }: { size?: number }) {
  const pathAnimation = useSpring({
    from: { strokeDashoffset: 100 },
    to: { strokeDashoffset: 0 },
    config: config.slow
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="text-green-500"
    >
      <animated.path
        d="M5 13l4 4L19 7"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={100}
        style={pathAnimation}
      />
    </svg>
  )
}