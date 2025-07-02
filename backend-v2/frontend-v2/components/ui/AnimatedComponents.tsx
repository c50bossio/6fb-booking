'use client'

import React, { useState, useEffect, useRef, forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { 
  useAnimation, 
  useInViewAnimation, 
  animationPresets, 
  createStaggeredAnimation,
  PerformantAnimations 
} from '@/lib/animations'

/**
 * Animated Components with Performance Optimizations
 * Smooth, accessible animations that respect user preferences
 */

// Fade in animation component
export const FadeIn = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    delay?: number
    duration?: string
    easing?: string
    triggerOnce?: boolean
  }
>(({ 
  children, 
  className, 
  delay = 0, 
  duration = animationPresets.duration.normal,
  easing = animationPresets.easing.ios,
  triggerOnce = true,
  ...props 
}, ref) => {
  const { elementRef, animationProps } = useInViewAnimation('fadeIn')
  
  return (
    <div
      ref={(node) => {
        elementRef.current = node
        if (ref) {
          if (typeof ref === 'function') ref(node)
          else ref.current = node
        }
      }}
      className={cn('opacity-0', className)}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: duration,
        animationTimingFunction: easing,
        ...animationProps.style,
      }}
      {...props}
    >
      {children}
    </div>
  )
})

FadeIn.displayName = 'FadeIn'

// Slide in animation component
export const SlideIn = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    direction?: 'up' | 'down' | 'left' | 'right'
    distance?: number
    delay?: number
    duration?: string
    easing?: string
  }
>(({ 
  children, 
  className, 
  direction = 'up',
  distance = 20,
  delay = 0,
  duration = animationPresets.duration.normal,
  easing = animationPresets.easing.ios,
  ...props 
}, ref) => {
  const { elementRef, isInView } = useInViewAnimation()
  const { getTransitionProps, prefersReducedMotion } = useAnimation()
  
  const getInitialTransform = () => {
    if (prefersReducedMotion) return 'none'
    
    switch (direction) {
      case 'up': return `translateY(${distance}px)`
      case 'down': return `translateY(-${distance}px)`
      case 'left': return `translateX(${distance}px)`
      case 'right': return `translateX(-${distance}px)`
      default: return `translateY(${distance}px)`
    }
  }

  const getFinalTransform = () => {
    return isInView ? 'translate3d(0, 0, 0)' : getInitialTransform()
  }

  const transitionProps = getTransitionProps(['transform', 'opacity'], duration, easing)

  return (
    <div
      ref={(node) => {
        elementRef.current = node
        if (ref) {
          if (typeof ref === 'function') ref(node)
          else ref.current = node
        }
      }}
      className={cn('transition-all', className)}
      style={{
        transform: getFinalTransform(),
        opacity: isInView ? 1 : 0,
        transitionDelay: `${delay}ms`,
        willChange: 'transform, opacity',
        ...transitionProps.style,
      }}
      {...props}
    >
      {children}
    </div>
  )
})

SlideIn.displayName = 'SlideIn'

// Scale in animation component
export const ScaleIn = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    scale?: number
    delay?: number
    duration?: string
    easing?: string
  }
>(({ 
  children, 
  className, 
  scale = 0.95,
  delay = 0,
  duration = animationPresets.duration.normal,
  easing = animationPresets.easing.spring,
  ...props 
}, ref) => {
  const { elementRef, isInView } = useInViewAnimation()
  const { getTransitionProps, prefersReducedMotion } = useAnimation()

  const transitionProps = getTransitionProps(['transform', 'opacity'], duration, easing)

  return (
    <div
      ref={(node) => {
        elementRef.current = node
        if (ref) {
          if (typeof ref === 'function') ref(node)
          else ref.current = node
        }
      }}
      className={cn('transition-all', className)}
      style={{
        transform: prefersReducedMotion 
          ? 'none' 
          : isInView 
            ? 'scale(1) translate3d(0, 0, 0)' 
            : `scale(${scale}) translate3d(0, 0, 0)`,
        opacity: isInView ? 1 : 0,
        transitionDelay: `${delay}ms`,
        willChange: 'transform, opacity',
        ...transitionProps.style,
      }}
      {...props}
    >
      {children}
    </div>
  )
})

ScaleIn.displayName = 'ScaleIn'

// Staggered children animation
export const StaggeredChildren = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    staggerDelay?: number
    animation?: 'fadeIn' | 'slideUp' | 'scaleIn'
    duration?: string
    easing?: string
  }
>(({ 
  children, 
  className, 
  staggerDelay = 100,
  animation = 'slideUp',
  duration = animationPresets.duration.normal,
  easing = animationPresets.easing.ios,
  ...props 
}, ref) => {
  const { elementRef, isInView } = useInViewAnimation()
  const { prefersReducedMotion } = useAnimation()

  return (
    <div
      ref={(node) => {
        elementRef.current = node
        if (ref) {
          if (typeof ref === 'function') ref(node)
          else ref.current = node
        }
      }}
      className={className}
      {...props}
    >
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child

        return React.cloneElement(child, {
          ...child.props,
          style: {
            ...child.props.style,
            animationDelay: prefersReducedMotion ? '0ms' : `${index * staggerDelay}ms`,
            animationDuration: duration,
            animationTimingFunction: easing,
            ...(isInView && !prefersReducedMotion && {
              animation: `${animation} ${duration} ${easing} both`,
            }),
          },
        })
      })}
    </div>
  )
})

StaggeredChildren.displayName = 'StaggeredChildren'

// Animated counter component
export const AnimatedCounter = ({
  value,
  duration = 1000,
  formatValue = (val: number) => Math.round(val).toString(),
  className,
  prefix = '',
  suffix = '',
}: {
  value: number
  duration?: number
  formatValue?: (value: number) => string
  className?: string
  prefix?: string
  suffix?: string
}) => {
  const [currentValue, setCurrentValue] = useState(0)
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    if (prefersReducedMotion) {
      setCurrentValue(value)
      return
    }

    const startTime = Date.now()
    const startValue = currentValue

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const newValue = startValue + (value - startValue) * easeOut

      setCurrentValue(newValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration, prefersReducedMotion])

  return (
    <span className={className}>
      {prefix}{formatValue(currentValue)}{suffix}
    </span>
  )
}

// Animated progress bar
export const AnimatedProgress = ({
  value,
  max = 100,
  duration = 1000,
  className,
  barClassName,
  showValue = false,
  label,
}: {
  value: number
  max?: number
  duration?: number
  className?: string
  barClassName?: string
  showValue?: boolean
  label?: string
}) => {
  const [currentValue, setCurrentValue] = useState(0)
  const { prefersReducedMotion } = useAnimation()
  const percentage = Math.min((currentValue / max) * 100, 100)

  useEffect(() => {
    if (prefersReducedMotion) {
      setCurrentValue(value)
      return
    }

    const startTime = Date.now()
    const startValue = currentValue

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const newValue = startValue + (value - startValue) * easeOut

      setCurrentValue(newValue)

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }, [value, duration, prefersReducedMotion])

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </span>
          {showValue && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={cn(
            'h-full bg-primary-600 transition-all duration-500 ease-out rounded-full',
            barClassName
          )}
          style={{
            width: `${percentage}%`,
            transform: 'translate3d(0, 0, 0)', // GPU acceleration
          }}
        />
      </div>
    </div>
  )
}

// Bouncy button component
export const BouncyButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    bounceScale?: number
    bounceDuration?: string
  }
>(({ 
  children, 
  className, 
  bounceScale = 0.95,
  bounceDuration = '150ms',
  ...props 
}, ref) => {
  const [isPressed, setIsPressed] = useState(false)
  const { getTransitionProps, prefersReducedMotion } = useAnimation()

  const transitionProps = getTransitionProps('transform', bounceDuration, animationPresets.easing.spring)

  return (
    <button
      ref={ref}
      className={cn(
        'transition-transform duration-150 ease-spring',
        'active:scale-95 hover:scale-105',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        className
      )}
      style={{
        transform: prefersReducedMotion 
          ? 'none' 
          : isPressed 
            ? `scale(${bounceScale}) translate3d(0, 0, 0)` 
            : 'scale(1) translate3d(0, 0, 0)',
        willChange: 'transform',
        ...transitionProps.style,
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      {...props}
    >
      {children}
    </button>
  )
})

BouncyButton.displayName = 'BouncyButton'

// Parallax scroll component
export const ParallaxScroll = ({
  children,
  speed = 0.5,
  className,
}: {
  children: React.ReactNode
  speed?: number
  className?: string
}) => {
  const [offsetY, setOffsetY] = useState(0)
  const elementRef = useRef<HTMLDivElement>(null)
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    if (prefersReducedMotion) return

    const handleScroll = () => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect()
        const offset = window.pageYOffset - rect.top
        setOffsetY(offset * speed)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [speed, prefersReducedMotion])

  return (
    <div
      ref={elementRef}
      className={cn('relative overflow-hidden', className)}
      style={{
        transform: prefersReducedMotion 
          ? 'none' 
          : `translateY(${offsetY}px) translate3d(0, 0, 0)`,
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}

// Floating animation component
export const FloatingElement = ({
  children,
  duration = 3000,
  amplitude = 10,
  className,
}: {
  children: React.ReactNode
  duration?: number
  amplitude?: number
  className?: string
}) => {
  const [offset, setOffset] = useState(0)
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    if (prefersReducedMotion) return

    let startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = (elapsed % duration) / duration
      const newOffset = Math.sin(progress * Math.PI * 2) * amplitude

      setOffset(newOffset)
      requestAnimationFrame(animate)
    }

    const animationId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationId)
  }, [duration, amplitude, prefersReducedMotion])

  return (
    <div
      className={className}
      style={{
        transform: prefersReducedMotion 
          ? 'none' 
          : `translateY(${offset}px) translate3d(0, 0, 0)`,
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}

// Typewriter effect component
export const TypewriterEffect = ({
  text,
  speed = 50,
  className,
  cursor = true,
  onComplete,
}: {
  text: string
  speed?: number
  className?: string
  cursor?: boolean
  onComplete?: () => void
}) => {
  const [displayText, setDisplayText] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    if (prefersReducedMotion) {
      setDisplayText(text)
      onComplete?.()
      return
    }

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex])
        setCurrentIndex(prev => prev + 1)
      }, speed)

      return () => clearTimeout(timeout)
    } else {
      onComplete?.()
    }
  }, [currentIndex, text, speed, prefersReducedMotion, onComplete])

  useEffect(() => {
    if (!cursor) return

    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 500)

    return () => clearInterval(cursorInterval)
  }, [cursor])

  return (
    <span className={className}>
      {displayText}
      {cursor && (
        <span className={cn('ml-0.5', showCursor ? 'opacity-100' : 'opacity-0')}>
          |
        </span>
      )}
    </span>
  )
}

// Morphing background component
export const MorphingBackground = ({
  colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'],
  duration = 8000,
  className,
}: {
  colors?: string[]
  duration?: number
  className?: string
}) => {
  const [currentColorIndex, setCurrentColorIndex] = useState(0)
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    if (prefersReducedMotion) return

    const interval = setInterval(() => {
      setCurrentColorIndex(prev => (prev + 1) % colors.length)
    }, duration)

    return () => clearInterval(interval)
  }, [colors.length, duration, prefersReducedMotion])

  const currentColor = colors[currentColorIndex]
  const nextColor = colors[(currentColorIndex + 1) % colors.length]

  return (
    <div
      className={cn('absolute inset-0 transition-all duration-8000 ease-linear', className)}
      style={{
        background: prefersReducedMotion 
          ? currentColor 
          : `linear-gradient(45deg, ${currentColor}, ${nextColor})`,
        backgroundSize: '400% 400%',
        animation: prefersReducedMotion 
          ? 'none' 
          : `morphing-gradient ${duration}ms ease-in-out infinite`,
      }}
    >
      <style jsx>{`
        @keyframes morphing-gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  )
}

export {
  FadeIn,
  SlideIn,
  ScaleIn,
  StaggeredChildren,
  AnimatedCounter,
  AnimatedProgress,
  BouncyButton,
  ParallaxScroll,
  FloatingElement,
  TypewriterEffect,
  MorphingBackground,
}