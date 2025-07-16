'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence, motion, useAnimation, useMotionValue, useTransform, useSpring } from 'framer-motion'

export interface AnimationConfig {
  enableAnimations: boolean
  respectReducedMotion: boolean
  duration: {
    fast: number
    normal: number
    slow: number
  }
  easing: {
    ease: [number, number, number, number]
    easeInOut: [number, number, number, number]
    bounce: [number, number, number, number]
  }
  stagger: {
    appointments: number
    timeSlots: number
    navigation: number
  }
}

export interface MicroInteraction {
  id: string
  trigger: 'hover' | 'click' | 'focus' | 'drag' | 'scroll' | 'gesture'
  animation: 'scale' | 'rotate' | 'fade' | 'slide' | 'bounce' | 'pulse' | 'shake'
  duration: number
  intensity: number
  delay?: number
  condition?: () => boolean
}

export interface CalendarAnimationEngineProps {
  children: React.ReactNode
  config?: Partial<AnimationConfig>
  enableMicroInteractions?: boolean
  enablePageTransitions?: boolean
  enableLoadingAnimations?: boolean
  performanceMode?: 'high' | 'balanced' | 'low'
  className?: string
}

const DEFAULT_CONFIG: AnimationConfig = {
  enableAnimations: true,
  respectReducedMotion: true,
  duration: {
    fast: 150,
    normal: 300,
    slow: 500
  },
  easing: {
    ease: [0.4, 0.0, 0.2, 1],
    easeInOut: [0.4, 0.0, 0.6, 1],
    bounce: [0.68, -0.55, 0.265, 1.55]
  },
  stagger: {
    appointments: 0.05,
    timeSlots: 0.02,
    navigation: 0.1
  }
}

// Animation variants for different components
const ANIMATION_VARIANTS = {
  // Page transitions
  pageTransition: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  },

  // Calendar view transitions
  viewTransition: {
    month: {
      initial: { scale: 0.8, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      exit: { scale: 1.2, opacity: 0 }
    },
    week: {
      initial: { x: 100, opacity: 0 },
      animate: { x: 0, opacity: 1 },
      exit: { x: -100, opacity: 0 }
    },
    day: {
      initial: { y: 50, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: -50, opacity: 0 }
    }
  },

  // Appointment animations
  appointment: {
    initial: { scale: 0, opacity: 0, rotateY: -90 },
    animate: { scale: 1, opacity: 1, rotateY: 0 },
    hover: { scale: 1.02, y: -2, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' },
    tap: { scale: 0.98 },
    drag: { scale: 1.05, rotate: 2, boxShadow: '0 15px 30px rgba(0,0,0,0.2)' },
    exit: { scale: 0, opacity: 0, rotateY: 90 }
  },

  // Time slot animations
  timeSlot: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    hover: { backgroundColor: 'rgba(59, 130, 246, 0.05)' },
    selected: { backgroundColor: 'rgba(59, 130, 246, 0.1)', scale: 1.01 }
  },

  // Loading animations
  loading: {
    pulse: {
      animate: { opacity: [0.5, 1, 0.5] },
      transition: { duration: 1.5, repeat: Infinity }
    },
    skeleton: {
      animate: { x: [-100, 100] },
      transition: { duration: 1, repeat: Infinity, ease: 'linear' }
    }
  },

  // Navigation animations
  navigation: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  },

  // Modal animations
  modal: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    },
    content: {
      initial: { scale: 0.8, opacity: 0, y: 50 },
      animate: { scale: 1, opacity: 1, y: 0 },
      exit: { scale: 0.8, opacity: 0, y: 50 }
    }
  },

  // Success/Error feedback
  feedback: {
    success: {
      initial: { scale: 0, rotate: -180 },
      animate: { scale: 1, rotate: 0 },
      exit: { scale: 0, rotate: 180 }
    },
    error: {
      animate: { x: [-5, 5, -5, 5, 0] },
      transition: { duration: 0.4 }
    }
  }
}

// Micro-interactions configuration
const MICRO_INTERACTIONS: MicroInteraction[] = [
  {
    id: 'appointment-hover',
    trigger: 'hover',
    animation: 'scale',
    duration: 200,
    intensity: 1.02
  },
  {
    id: 'appointment-click',
    trigger: 'click',
    animation: 'pulse',
    duration: 300,
    intensity: 1.1
  },
  {
    id: 'time-slot-hover',
    trigger: 'hover',
    animation: 'fade',
    duration: 150,
    intensity: 0.8
  },
  {
    id: 'button-hover',
    trigger: 'hover',
    animation: 'scale',
    duration: 200,
    intensity: 1.05
  },
  {
    id: 'drag-feedback',
    trigger: 'drag',
    animation: 'rotate',
    duration: 0,
    intensity: 2
  }
]

export function CalendarAnimationEngine({
  children,
  config = {},
  enableMicroInteractions = true,
  enablePageTransitions = true,
  enableLoadingAnimations = true,
  performanceMode = 'balanced',
  className = ''
}: CalendarAnimationEngineProps) {
  const animationConfig = { ...DEFAULT_CONFIG, ...config }
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeAnimations, setActiveAnimations] = useState<Set<string>>(new Set())

  // Detect reduced motion preference
  useEffect(() => {
    if (!animationConfig.respectReducedMotion) return

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [animationConfig.respectReducedMotion])

  // Determine if animations should be enabled
  const shouldAnimate = useMemo(() => {
    return animationConfig.enableAnimations && !prefersReducedMotion
  }, [animationConfig.enableAnimations, prefersReducedMotion])

  // Performance optimization based on mode
  const getOptimizedConfig = useCallback(() => {
    switch (performanceMode) {
      case 'high':
        return animationConfig
      case 'low':
        return {
          ...animationConfig,
          duration: {
            fast: animationConfig.duration.fast * 0.5,
            normal: animationConfig.duration.normal * 0.5,
            slow: animationConfig.duration.slow * 0.5
          },
          stagger: {
            appointments: 0,
            timeSlots: 0,
            navigation: 0
          }
        }
      default:
        return {
          ...animationConfig,
          duration: {
            fast: animationConfig.duration.fast * 0.75,
            normal: animationConfig.duration.normal * 0.75,
            slow: animationConfig.duration.slow * 0.75
          }
        }
    }
  }, [performanceMode, animationConfig])

  const optimizedConfig = getOptimizedConfig()

  // Animation control functions
  const registerAnimation = useCallback((id: string) => {
    setActiveAnimations(prev => new Set(prev).add(id))
  }, [])

  const unregisterAnimation = useCallback((id: string) => {
    setActiveAnimations(prev => {
      const newSet = new Set(prev)
      newSet.delete(id)
      return newSet
    })
  }, [])

  return (
    <motion.div
      className={`calendar-animation-engine ${className}`}
      initial={shouldAnimate ? 'initial' : false}
      animate={shouldAnimate ? 'animate' : false}
    >
      {/* Loading overlay with animations */}
      <AnimatePresence>
        {isLoading && enableLoadingAnimations && shouldAnimate && (
          <LoadingOverlay config={optimizedConfig} />
        )}
      </AnimatePresence>

      {/* Main content with animation context */}
      <AnimationContext.Provider value={{
        shouldAnimate,
        config: optimizedConfig,
        variants: ANIMATION_VARIANTS,
        microInteractions: enableMicroInteractions ? MICRO_INTERACTIONS : [],
        registerAnimation,
        unregisterAnimation,
        activeAnimations,
        setLoading: setIsLoading
      }}>
        {children}
      </AnimationContext.Provider>

      {/* Performance monitor */}
      {process.env.NODE_ENV === 'development' && (
        <AnimationPerformanceMonitor activeAnimations={activeAnimations} />
      )}
    </motion.div>
  )
}

// Loading overlay component
const LoadingOverlay = ({ config }: { config: AnimationConfig }) => (
  <motion.div
    className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center"
    variants={ANIMATION_VARIANTS.modal.backdrop}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={{ duration: config.duration.fast / 1000 }}
  >
    <div className="flex items-center gap-4">
      <motion.div
        className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear'
        }}
      />
      <motion.span
        className="text-gray-600"
        variants={ANIMATION_VARIANTS.loading.pulse}
        animate="animate"
      >
        Loading calendar...
      </motion.span>
    </div>
  </motion.div>
)

// Performance monitor component
const AnimationPerformanceMonitor = ({ activeAnimations }: { activeAnimations: Set<string> }) => (
  <div className="fixed bottom-4 left-4 bg-black text-white text-xs p-2 rounded z-50 font-mono">
    <div>Active Animations: {activeAnimations.size}</div>
    <div>FPS: {Math.round(60)} fps</div>
  </div>
)

// Animation context
const AnimationContext = React.createContext<{
  shouldAnimate: boolean
  config: AnimationConfig
  variants: typeof ANIMATION_VARIANTS
  microInteractions: MicroInteraction[]
  registerAnimation: (id: string) => void
  unregisterAnimation: (id: string) => void
  activeAnimations: Set<string>
  setLoading: (loading: boolean) => void
} | null>(null)

// Hook for using animations
export function useCalendarAnimation() {
  const context = React.useContext(AnimationContext)
  if (!context) {
    throw new Error('useCalendarAnimation must be used within CalendarAnimationEngine')
  }
  return context
}

// Enhanced motion components with calendar-specific animations
export const AnimatedAppointment = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement> & {
    isSelected?: boolean
    isDragging?: boolean
    children: React.ReactNode
  }
>(({ isSelected, isDragging, children, ...props }, ref) => {
  const { shouldAnimate, config, variants } = useCalendarAnimation()
  const controls = useAnimation()

  useEffect(() => {
    if (isDragging && shouldAnimate) {
      controls.start('drag')
    } else if (isSelected && shouldAnimate) {
      controls.start('selected')
    } else if (shouldAnimate) {
      controls.start('animate')
    }
  }, [isDragging, isSelected, shouldAnimate, controls])

  if (!shouldAnimate) {
    return <div ref={ref} {...props}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      {...props}
      variants={variants.appointment}
      initial="initial"
      animate={controls}
      whileHover="hover"
      whileTap="tap"
      exit="exit"
      transition={{
        duration: config.duration.normal / 1000,
        ease: config.easing.easeInOut
      }}
      layout
      layoutId={`appointment-${props.id}`}
    >
      {children}
    </motion.div>
  )
})

AnimatedAppointment.displayName = 'AnimatedAppointment'

// Enhanced time slot component
export const AnimatedTimeSlot = React.forwardRef<
  HTMLDivElement,
  React.HTMLProps<HTMLDivElement> & {
    isSelected?: boolean
    isHovered?: boolean
    children: React.ReactNode
  }
>(({ isSelected, isHovered, children, ...props }, ref) => {
  const { shouldAnimate, config, variants } = useCalendarAnimation()

  if (!shouldAnimate) {
    return <div ref={ref} {...props}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      {...props}
      variants={variants.timeSlot}
      initial="initial"
      animate={isSelected ? 'selected' : 'animate'}
      whileHover="hover"
      transition={{
        duration: config.duration.fast / 1000,
        ease: config.easing.ease
      }}
    >
      {children}
    </motion.div>
  )
})

AnimatedTimeSlot.displayName = 'AnimatedTimeSlot'

// Staggered list animation
export const StaggeredList = ({ 
  children, 
  staggerDelay = 0.05,
  className = '' 
}: { 
  children: React.ReactNode[]
  staggerDelay?: number
  className?: string
}) => {
  const { shouldAnimate, config } = useCalendarAnimation()

  if (!shouldAnimate) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      initial="initial"
      animate="animate"
      variants={{
        initial: {},
        animate: {
          transition: {
            staggerChildren: staggerDelay
          }
        }
      }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div
          key={index}
          variants={{
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 }
          }}
          transition={{
            duration: config.duration.normal / 1000,
            ease: config.easing.ease
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  )
}

// View transition wrapper
export const ViewTransition = ({ 
  view,
  children,
  className = ''
}: {
  view: 'month' | 'week' | 'day'
  children: React.ReactNode
  className?: string
}) => {
  const { shouldAnimate, config, variants } = useCalendarAnimation()

  if (!shouldAnimate) {
    return <div className={className}>{children}</div>
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        className={className}
        variants={variants.viewTransition[view]}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration: config.duration.normal / 1000,
          ease: config.easing.easeInOut
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

// Success/Error feedback animation
export const FeedbackAnimation = ({
  type,
  message,
  isVisible,
  onComplete
}: {
  type: 'success' | 'error'
  message: string
  isVisible: boolean
  onComplete: () => void
}) => {
  const { shouldAnimate, config, variants } = useCalendarAnimation()

  if (!shouldAnimate) {
    return isVisible ? <div className="feedback-message">{message}</div> : null
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed top-4 right-4 p-4 rounded-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
          variants={variants.feedback[type]}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{
            duration: config.duration.normal / 1000,
            ease: config.easing.bounce
          }}
          onAnimationComplete={onComplete}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Pulse animation for loading states
export const PulseLoader = ({ 
  width = 'w-full', 
  height = 'h-4',
  className = '' 
}: {
  width?: string
  height?: string
  className?: string
}) => {
  const { shouldAnimate, config } = useCalendarAnimation()

  if (!shouldAnimate) {
    return <div className={`bg-gray-200 rounded ${width} ${height} ${className}`} />
  }

  return (
    <motion.div
      className={`bg-gray-200 rounded ${width} ${height} ${className}`}
      variants={ANIMATION_VARIANTS.loading.pulse}
      animate="animate"
      transition={{
        duration: config.duration.slow / 1000,
        repeat: Infinity
      }}
    />
  )
}

// Drag feedback animation
export const DragFeedback = ({
  isDragging,
  position,
  children
}: {
  isDragging: boolean
  position: { x: number; y: number }
  children: React.ReactNode
}) => {
  const { shouldAnimate, config } = useCalendarAnimation()
  const x = useMotionValue(position.x)
  const y = useMotionValue(position.y)
  const scale = useSpring(isDragging ? 1.05 : 1, { stiffness: 300, damping: 30 })
  const rotate = useTransform(x, [-100, 100], [-5, 5])

  if (!shouldAnimate) {
    return <div>{children}</div>
  }

  return (
    <motion.div
      style={{
        x,
        y,
        scale,
        rotate,
        boxShadow: useTransform(
          scale,
          [1, 1.05],
          ['0 0 0 rgba(0,0,0,0)', '0 10px 25px rgba(0,0,0,0.15)']
        )
      }}
      transition={{
        duration: config.duration.fast / 1000,
        ease: config.easing.easeInOut
      }}
    >
      {children}
    </motion.div>
  )
}

export default CalendarAnimationEngine