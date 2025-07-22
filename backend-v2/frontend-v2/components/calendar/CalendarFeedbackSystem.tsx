'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon,
  SparklesIcon,
  BoltIcon,
  HeartIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { useAnimation, animationPresets } from '@/lib/animations'

type FeedbackType = 'success' | 'error' | 'warning' | 'info'
type AnimationType = 'bounce' | 'pulse' | 'shake' | 'glow' | 'sparkle' | 'heart' | 'star'

interface ToastMessage {
  id: string
  type: FeedbackType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface FloatingFeedback {
  id: string
  x: number
  y: number
  type: FeedbackType
  message: string
  animation: AnimationType
  duration: number
}

interface CalendarToastProps {
  message: ToastMessage
  onDismiss: (id: string) => void
}

interface DragFeedbackProps {
  isDragging: boolean
  dragPreview?: React.ReactNode
  dropZones: Array<{
    id: string
    rect: DOMRect
    isValid: boolean
    message: string
  }>
  currentDropZone?: string | null
}

interface SuccessAnimationProps {
  isVisible: boolean
  message?: string
  onComplete?: () => void
  animation?: 'checkmark' | 'confetti' | 'ripple' | 'celebration'
}

interface InteractionFeedbackProps {
  children: React.ReactNode
  onHover?: () => void
  onFocus?: () => void
  onAction?: () => void
  feedbackType?: 'subtle' | 'medium' | 'strong'
  glowColor?: string
}

/**
 * Comprehensive feedback system for calendar interactions
 * Provides toast notifications, floating feedback, and interactive animations
 */
export function CalendarFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [floatingFeedbacks, setFloatingFeedbacks] = useState<FloatingFeedback[]>([])

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const newToast: ToastMessage = {
      ...toast,
      id,
      duration: toast.duration || 4000
    }
    
    setToasts(prev => [...prev, newToast])

    // Auto-dismiss after duration
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, newToast.duration)
  }, [])

  const addFloatingFeedback = useCallback((
    x: number, 
    y: number, 
    message: string, 
    type: FeedbackType = 'success',
    animation: AnimationType = 'bounce'
  ) => {
    const id = `floating_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const duration = 2000
    
    const feedback: FloatingFeedback = {
      id,
      x,
      y,
      type,
      message,
      animation,
      duration
    }
    
    setFloatingFeedbacks(prev => [...prev, feedback])

    setTimeout(() => {
      setFloatingFeedbacks(prev => prev.filter(f => f.id !== id))
    }, duration)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // Provide feedback functions through context or global
  useEffect(() => {
    // Make feedback functions globally available
    ;(window as any).calendarFeedback = {
      addToast,
      addFloatingFeedback
    }
  }, [addToast, addFloatingFeedback])

  return (
    <div className="relative">
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map(toast => (
          <CalendarToast
            key={toast.id}
            message={toast}
            onDismiss={dismissToast}
          />
        ))}
      </div>
      
      {/* Floating Feedback Container */}
      <div className="fixed inset-0 pointer-events-none z-40">
        {floatingFeedbacks.map(feedback => (
          <FloatingFeedbackElement
            key={feedback.id}
            feedback={feedback}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Toast notification component with smooth animations
 */
function CalendarToast({ message, onDismiss }: CalendarToastProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 10)
  }, [])

  const handleDismiss = () => {
    if (isLeaving) return
    
    setIsLeaving(true)
    setTimeout(() => {
      onDismiss(message.id)
    }, prefersReducedMotion ? 0 : 200)
  }

  const getToastConfig = (type: FeedbackType) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircleIcon,
          bgColor: 'bg-green-50 dark:bg-green-900/30',
          borderColor: 'border-green-200 dark:border-green-800',
          iconColor: 'text-green-600 dark:text-green-400',
          titleColor: 'text-green-800 dark:text-green-200'
        }
      case 'error':
        return {
          icon: XCircleIcon,
          bgColor: 'bg-red-50 dark:bg-red-900/30',
          borderColor: 'border-red-200 dark:border-red-800',
          iconColor: 'text-red-600 dark:text-red-400',
          titleColor: 'text-red-800 dark:text-red-200'
        }
      case 'warning':
        return {
          icon: ExclamationTriangleIcon,
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/30',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          iconColor: 'text-yellow-600 dark:text-yellow-400',
          titleColor: 'text-yellow-800 dark:text-yellow-200'
        }
      case 'info':
        return {
          icon: InformationCircleIcon,
          bgColor: 'bg-blue-50 dark:bg-blue-900/30',
          borderColor: 'border-blue-200 dark:border-blue-800',
          iconColor: 'text-blue-600 dark:text-blue-400',
          titleColor: 'text-blue-800 dark:text-blue-200'
        }
    }
  }

  const config = getToastConfig(message.type)
  const Icon = config.icon

  return (
    <div
      className={`
        border rounded-lg shadow-lg p-4 backdrop-blur-sm transition-all duration-200 transform
        ${config.bgColor} ${config.borderColor}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${prefersReducedMotion ? '' : 'animate-in slide-in-from-right'}
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        
        <div className="ml-3 flex-1">
          <h4 className={`text-sm font-medium ${config.titleColor}`}>
            {message.title}
          </h4>
          {message.message && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {message.message}
            </p>
          )}
          
          {message.action && (
            <div className="mt-2">
              <button
                onClick={message.action.onClick}
                className={`text-sm font-medium underline ${config.iconColor} hover:no-underline`}
              >
                {message.action.label}
              </button>
            </div>
          )}
        </div>
        
        <button
          onClick={handleDismiss}
          className="ml-3 flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <XCircleIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

/**
 * Floating feedback element that appears at cursor position
 */
function FloatingFeedbackElement({ feedback }: { feedback: FloatingFeedback }) {
  const elementRef = useRef<HTMLDivElement>(null)
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    if (elementRef.current && !prefersReducedMotion) {
      const element = elementRef.current
      
      // Initial position
      element.style.left = `${feedback.x}px`
      element.style.top = `${feedback.y}px`
      
      // Animate based on animation type
      switch (feedback.animation) {
        case 'bounce':
          element.animate([
            { transform: 'translateY(0) scale(0.8)', opacity: 0 },
            { transform: 'translateY(-20px) scale(1)', opacity: 1 },
            { transform: 'translateY(-40px) scale(1)', opacity: 0.8 },
            { transform: 'translateY(-60px) scale(0.9)', opacity: 0 }
          ], {
            duration: feedback.duration,
            easing: animationPresets.easing.bounce
          })
          break
          
        case 'pulse':
          element.animate([
            { transform: 'scale(0.8)', opacity: 0 },
            { transform: 'scale(1.2)', opacity: 1 },
            { transform: 'scale(1)', opacity: 1 },
            { transform: 'scale(0.8)', opacity: 0 }
          ], {
            duration: feedback.duration,
            easing: animationPresets.easing.ios
          })
          break
          
        case 'shake':
          element.animate([
            { transform: 'translateX(0)' },
            { transform: 'translateX(-4px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(-4px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(0)' }
          ], {
            duration: 500,
            iterations: 2
          })
          break
          
        case 'glow':
          element.animate([
            { boxShadow: '0 0 0 rgba(59, 130, 246, 0)', opacity: 1 },
            { boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)', opacity: 1 },
            { boxShadow: '0 0 0 rgba(59, 130, 246, 0)', opacity: 0 }
          ], {
            duration: feedback.duration,
            easing: animationPresets.easing.ios
          })
          break
          
        case 'sparkle':
          element.animate([
            { transform: 'scale(0) rotate(0deg)', opacity: 0 },
            { transform: 'scale(1.2) rotate(180deg)', opacity: 1 },
            { transform: 'scale(1) rotate(360deg)', opacity: 1 },
            { transform: 'scale(0) rotate(540deg)', opacity: 0 }
          ], {
            duration: feedback.duration,
            easing: animationPresets.easing.bounce
          })
          break
      }
    }
  }, [feedback, prefersReducedMotion])

  const getTypeConfig = (type: FeedbackType) => {
    switch (type) {
      case 'success':
        return { 
          bgColor: 'bg-green-500', 
          textColor: 'text-white',
          icon: '✓'
        }
      case 'error':
        return { 
          bgColor: 'bg-red-500', 
          textColor: 'text-white',
          icon: '✗'
        }
      case 'warning':
        return { 
          bgColor: 'bg-yellow-500', 
          textColor: 'text-white',
          icon: '⚠'
        }
      case 'info':
        return { 
          bgColor: 'bg-blue-500', 
          textColor: 'text-white',
          icon: 'i'
        }
    }
  }

  const config = getTypeConfig(feedback.type)

  return (
    <div
      ref={elementRef}
      className={`
        absolute z-50 px-3 py-1 rounded-full text-sm font-medium shadow-lg pointer-events-none
        ${config.bgColor} ${config.textColor}
      `}
      style={{
        left: feedback.x,
        top: feedback.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      <span className="mr-1">{config.icon}</span>
      {feedback.message}
    </div>
  )
}

/**
 * Enhanced drag feedback system with visual indicators
 */
export function CalendarDragFeedback({
  isDragging,
  dragPreview,
  dropZones,
  currentDropZone
}: DragFeedbackProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        setMousePosition({ x: e.clientX, y: e.clientY })
      }

      document.addEventListener('mousemove', handleMouseMove)
      return () => document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [isDragging])

  if (!isDragging) return null

  return (
    <>
      {/* Drag preview following cursor */}
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          left: mousePosition.x + 10,
          top: mousePosition.y - 10,
          transform: prefersReducedMotion ? 'none' : 'rotate(5deg) scale(0.95)'
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3 max-w-xs">
          {dragPreview}
        </div>
      </div>

      {/* Drop zone indicators */}
      {dropZones.map(zone => (
        <div
          key={zone.id}
          className={`
            absolute pointer-events-none border-2 border-dashed rounded-lg transition-all duration-200
            ${zone.isValid 
              ? currentDropZone === zone.id 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                : 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-red-400 bg-red-50 dark:bg-red-900/20'
            }
          `}
          style={{
            left: zone.rect.left,
            top: zone.rect.top,
            width: zone.rect.width,
            height: zone.rect.height
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`
              text-sm font-medium px-2 py-1 rounded
              ${zone.isValid 
                ? 'text-green-700 dark:text-green-300' 
                : 'text-red-700 dark:text-red-300'
              }
            `}>
              {zone.message}
            </span>
          </div>
        </div>
      ))}
    </>
  )
}

/**
 * Success animation with multiple visual effects
 */
export function CalendarSuccessAnimation({
  isVisible,
  message = 'Success!',
  onComplete,
  animation = 'checkmark'
}: SuccessAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { prefersReducedMotion } = useAnimation()

  useEffect(() => {
    if (isVisible && !prefersReducedMotion) {
      const duration = animation === 'confetti' ? 3000 : 2000
      
      setTimeout(() => {
        onComplete?.()
      }, duration)

      if (animation === 'confetti' && containerRef.current) {
        // Create confetti particles
        for (let i = 0; i < 20; i++) {
          const particle = document.createElement('div')
          particle.className = 'absolute w-2 h-2 bg-yellow-400 rounded-full'
          particle.style.left = '50%'
          particle.style.top = '50%'
          
          containerRef.current.appendChild(particle)
          
          particle.animate([
            { 
              transform: 'translate(-50%, -50%) scale(0)',
              opacity: 1
            },
            { 
              transform: `translate(${(Math.random() - 0.5) * 200}px, ${(Math.random() - 0.5) * 200}px) scale(1)`,
              opacity: 1
            },
            { 
              transform: `translate(${(Math.random() - 0.5) * 400}px, ${(Math.random() - 0.5) * 400}px) scale(0)`,
              opacity: 0
            }
          ], {
            duration: 2000,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          }).onfinish = () => {
            particle.remove()
          }
        }
      }
    } else if (isVisible && prefersReducedMotion) {
      setTimeout(() => {
        onComplete?.()
      }, 1000)
    }
  }, [isVisible, animation, prefersReducedMotion, onComplete])

  if (!isVisible) return null

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
    >
      <div className={`
        bg-white dark:bg-gray-800 rounded-full p-8 shadow-2xl
        ${prefersReducedMotion ? '' : 'animate-bounce'}
      `}>
        {animation === 'checkmark' && (
          <div className="relative">
            <CheckCircleIcon className="w-16 h-16 text-green-500 animate-pulse" />
            {!prefersReducedMotion && (
              <div className="absolute inset-0 animate-ping">
                <CheckCircleIcon className="w-16 h-16 text-green-500 opacity-30" />
              </div>
            )}
          </div>
        )}
        
        {animation === 'celebration' && (
          <div className="relative">
            <SparklesIcon className="w-16 h-16 text-yellow-500 animate-spin" />
            {!prefersReducedMotion && (
              <div className="absolute -inset-4 animate-pulse">
                <div className="w-24 h-24 border-4 border-yellow-300 rounded-full opacity-30"></div>
              </div>
            )}
          </div>
        )}
        
        <p className="mt-4 text-center font-medium text-gray-800 dark:text-gray-200">
          {message}
        </p>
      </div>
    </div>
  )
}

/**
 * Interactive feedback for hover and focus states
 */
export function CalendarInteractionFeedback({
  children,
  onHover,
  onFocus,
  onAction,
  feedbackType = 'medium',
  glowColor = 'blue'
}: InteractionFeedbackProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [isPressed, setIsPressed] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)
  const { prefersReducedMotion } = useAnimation()

  const getFeedbackStyles = () => {
    const intensities = {
      subtle: { scale: '1.02', shadow: '0 2px 8px' },
      medium: { scale: '1.05', shadow: '0 4px 12px' },
      strong: { scale: '1.08', shadow: '0 6px 20px' }
    }

    const colors = {
      blue: 'rgba(59, 130, 246, 0.3)',
      green: 'rgba(34, 197, 94, 0.3)',
      purple: 'rgba(147, 51, 234, 0.3)',
      yellow: 'rgba(234, 179, 8, 0.3)'
    }

    const intensity = intensities[feedbackType]
    const shadowColor = colors[glowColor as keyof typeof colors] || colors.blue

    if (prefersReducedMotion) {
      return {
        transform: 'none',
        boxShadow: isHovered || isFocused ? `${intensity.shadow} ${shadowColor}` : 'none'
      }
    }

    return {
      transform: isPressed 
        ? `scale(0.98)` 
        : isHovered || isFocused 
          ? `scale(${intensity.scale})` 
          : 'scale(1)',
      boxShadow: isHovered || isFocused ? `${intensity.shadow} ${shadowColor}` : 'none',
      transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)'
    }
  }

  return (
    <div
      ref={elementRef}
      style={getFeedbackStyles()}
      onMouseEnter={() => {
        setIsHovered(true)
        onHover?.()
      }}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => {
        setIsFocused(true)
        onFocus?.()
      }}
      onBlur={() => setIsFocused(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onClick={() => onAction?.()}
      className="rounded-lg"
    >
      {children}
    </div>
  )
}

export default CalendarFeedbackProvider