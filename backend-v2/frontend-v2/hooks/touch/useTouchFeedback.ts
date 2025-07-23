/**
 * Enhanced touch feedback system with haptic patterns and visual effects
 * Provides premium touch experience with intelligent feedback timing
 */

import { useCallback, useRef, useState } from 'react'

export interface TouchFeedbackPattern {
  haptic?: number | number[]
  visual?: {
    type: 'ripple' | 'scale' | 'glow' | 'bounce'
    duration?: number
    intensity?: number
    color?: string
  }
  audio?: {
    type: 'click' | 'success' | 'error' | 'neutral'
    volume?: number
  }
}

export interface TouchFeedbackConfig {
  enableHaptics?: boolean
  enableVisualFeedback?: boolean
  enableAudioFeedback?: boolean
  adaptiveFeedback?: boolean
  feedbackDelay?: number
  maxFeedbackRate?: number
}

export interface FeedbackEvent {
  id: string
  type: 'tap' | 'longPress' | 'drag' | 'pinch' | 'swipe' | 'success' | 'error'
  element: HTMLElement
  position: { x: number; y: number }
  timestamp: number
  intensity?: number
}

const DEFAULT_CONFIG: Required<TouchFeedbackConfig> = {
  enableHaptics: true,
  enableVisualFeedback: true,
  enableAudioFeedback: false,
  adaptiveFeedback: true,
  feedbackDelay: 0,
  maxFeedbackRate: 10 // Max 10 feedback events per second
}

// Predefined feedback patterns for different actions
const FEEDBACK_PATTERNS: Record<string, TouchFeedbackPattern> = {
  tap: {
    haptic: 30,
    visual: { type: 'ripple', duration: 300, intensity: 0.3 }
  },
  longPress: {
    haptic: [50, 50, 50],
    visual: { type: 'glow', duration: 500, intensity: 0.5 }
  },
  drag: {
    haptic: 20,
    visual: { type: 'scale', duration: 200, intensity: 0.4 }
  },
  pinch: {
    haptic: [30, 30],
    visual: { type: 'scale', duration: 400, intensity: 0.6 }
  },
  swipe: {
    haptic: 40,
    visual: { type: 'bounce', duration: 250, intensity: 0.4 }
  },
  success: {
    haptic: [50, 0, 50, 0, 100],
    visual: { type: 'glow', duration: 600, intensity: 0.7, color: '#10b981' }
  },
  error: {
    haptic: [100, 50, 100],
    visual: { type: 'bounce', duration: 400, intensity: 0.8, color: '#ef4444' }
  },
  bookingConfirm: {
    haptic: [50, 100, 50, 100, 150],
    visual: { type: 'glow', duration: 800, intensity: 0.9, color: '#3b82f6' }
  },
  appointmentMove: {
    haptic: [30, 20, 40],
    visual: { type: 'scale', duration: 300, intensity: 0.5, color: '#6366f1' }
  },
  timeSlotSelect: {
    haptic: 25,
    visual: { type: 'ripple', duration: 350, intensity: 0.4, color: '#8b5cf6' }
  }
}

export function useTouchFeedback(config: TouchFeedbackConfig = {}) {
  const options = { ...DEFAULT_CONFIG, ...config }
  const feedbackState = useRef({
    lastFeedbackTime: 0,
    feedbackCount: 0,
    resetTimer: null as NodeJS.Timeout | null,
    activeEffects: new Map<string, HTMLElement>()
  })
  
  const [isHapticSupported] = useState(() => 'vibrate' in navigator)

  // Rate limiting for feedback events
  const shouldAllowFeedback = useCallback(() => {
    const now = Date.now()
    const timeSinceReset = now - feedbackState.current.lastFeedbackTime
    
    if (timeSinceReset > 1000) {
      feedbackState.current.feedbackCount = 0
      feedbackState.current.lastFeedbackTime = now
    }
    
    return feedbackState.current.feedbackCount < options.maxFeedbackRate
  }, [options.maxFeedbackRate])

  // Haptic feedback with pattern support
  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (!options.enableHaptics || !isHapticSupported) return
    
    if (typeof pattern === 'number') {
      navigator.vibrate(pattern)
    } else {
      navigator.vibrate(pattern)
    }
  }, [options.enableHaptics, isHapticSupported])

  // Visual feedback effects
  const triggerVisualEffect = useCallback((
    element: HTMLElement,
    effect: TouchFeedbackPattern['visual'],
    position: { x: number; y: number },
    id: string
  ) => {
    if (!options.enableVisualFeedback || !effect) return

    const { type, duration = 300, intensity = 0.5, color = '#3b82f6' } = effect
    
    // Remove existing effect if present
    const existingEffect = feedbackState.current.activeEffects.get(id)
    if (existingEffect) {
      existingEffect.remove()
      feedbackState.current.activeEffects.delete(id)
    }

    // Create effect element
    const effectElement = document.createElement('div')
    effectElement.className = `touch-feedback-${type}`
    effectElement.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 9999;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      left: ${position.x}px;
      top: ${position.y}px;
    `

    // Apply effect-specific styles
    switch (type) {
      case 'ripple':
        effectElement.style.cssText += `
          width: 20px;
          height: 20px;
          background-color: ${color};
          opacity: ${intensity};
          animation: ripple-effect ${duration}ms ease-out forwards;
        `
        break
        
      case 'scale':
        effectElement.style.cssText += `
          width: 40px;
          height: 40px;
          background-color: ${color};
          opacity: ${intensity};
          animation: scale-effect ${duration}ms ease-out forwards;
        `
        break
        
      case 'glow':
        effectElement.style.cssText += `
          width: 30px;
          height: 30px;
          background-color: ${color};
          opacity: ${intensity};
          box-shadow: 0 0 20px ${color};
          animation: glow-effect ${duration}ms ease-out forwards;
        `
        break
        
      case 'bounce':
        effectElement.style.cssText += `
          width: 25px;
          height: 25px;
          background-color: ${color};
          opacity: ${intensity};
          animation: bounce-effect ${duration}ms ease-out forwards;
        `
        break
    }

    // Add to DOM
    document.body.appendChild(effectElement)
    feedbackState.current.activeEffects.set(id, effectElement)

    // Remove after animation
    setTimeout(() => {
      if (effectElement.parentNode) {
        effectElement.remove()
        feedbackState.current.activeEffects.delete(id)
      }
    }, duration)
  }, [options.enableVisualFeedback])

  // Main feedback trigger function
  const triggerFeedback = useCallback((event: FeedbackEvent, patternName?: keyof typeof FEEDBACK_PATTERNS) => {
    if (!shouldAllowFeedback()) return

    const pattern = patternName ? FEEDBACK_PATTERNS[patternName] : FEEDBACK_PATTERNS[event.type]
    if (!pattern) return

    feedbackState.current.feedbackCount++

    // Apply feedback delay if configured
    const applyFeedback = () => {
      // Haptic feedback
      if (pattern.haptic) {
        triggerHaptic(pattern.haptic)
      }

      // Visual feedback
      if (pattern.visual) {
        triggerVisualEffect(event.element, pattern.visual, event.position, event.id)
      }

      // Audio feedback (if implemented in the future)
      if (pattern.audio && options.enableAudioFeedback) {
        // Audio implementation would go here
      }
    }

    if (options.feedbackDelay > 0) {
      setTimeout(applyFeedback, options.feedbackDelay)
    } else {
      applyFeedback()
    }
  }, [shouldAllowFeedback, triggerHaptic, triggerVisualEffect, options.feedbackDelay, options.enableAudioFeedback])

  // Convenient feedback methods for common calendar actions
  const feedbackMethods = {
    // Basic touch interactions
    onTap: useCallback((element: HTMLElement, position: { x: number; y: number }) => {
      triggerFeedback({
        id: `tap-${Date.now()}`,
        type: 'tap',
        element,
        position,
        timestamp: Date.now()
      })
    }, [triggerFeedback]),

    onLongPress: useCallback((element: HTMLElement, position: { x: number; y: number }) => {
      triggerFeedback({
        id: `longPress-${Date.now()}`,
        type: 'longPress',
        element,
        position,
        timestamp: Date.now()
      })
    }, [triggerFeedback]),

    onDragStart: useCallback((element: HTMLElement, position: { x: number; y: number }) => {
      triggerFeedback({
        id: `drag-${element.id || Date.now()}`,
        type: 'drag',
        element,
        position,
        timestamp: Date.now()
      })
    }, [triggerFeedback]),

    onSwipe: useCallback((element: HTMLElement, position: { x: number; y: number }) => {
      triggerFeedback({
        id: `swipe-${Date.now()}`,
        type: 'swipe',
        element,
        position,
        timestamp: Date.now()
      })
    }, [triggerFeedback]),

    // Calendar-specific interactions
    onBookingConfirm: useCallback((element: HTMLElement, position: { x: number; y: number }) => {
      triggerFeedback({
        id: `bookingConfirm-${Date.now()}`,
        type: 'success',
        element,
        position,
        timestamp: Date.now()
      }, 'bookingConfirm')
    }, [triggerFeedback]),

    onAppointmentMove: useCallback((element: HTMLElement, position: { x: number; y: number }) => {
      triggerFeedback({
        id: `appointmentMove-${Date.now()}`,
        type: 'drag',
        element,
        position,
        timestamp: Date.now()
      }, 'appointmentMove')
    }, [triggerFeedback]),

    onTimeSlotSelect: useCallback((element: HTMLElement, position: { x: number; y: number }) => {
      triggerFeedback({
        id: `timeSlot-${Date.now()}`,
        type: 'tap',
        element,
        position,
        timestamp: Date.now()
      }, 'timeSlotSelect')
    }, [triggerFeedback]),

    onSuccess: useCallback((element: HTMLElement, position: { x: number; y: number }) => {
      triggerFeedback({
        id: `success-${Date.now()}`,
        type: 'success',
        element,
        position,
        timestamp: Date.now()
      })
    }, [triggerFeedback]),

    onError: useCallback((element: HTMLElement, position: { x: number; y: number }) => {
      triggerFeedback({
        id: `error-${Date.now()}`,
        type: 'error',
        element,
        position,
        timestamp: Date.now()
      })
    }, [triggerFeedback])
  }

  // Clean up active effects
  const clearAllEffects = useCallback(() => {
    feedbackState.current.activeEffects.forEach((element) => {
      if (element.parentNode) {
        element.remove()
      }
    })
    feedbackState.current.activeEffects.clear()
  }, [])

  return {
    ...feedbackMethods,
    triggerFeedback,
    clearAllEffects,
    isHapticSupported,
    
    // Configuration methods
    updateConfig: useCallback((newConfig: Partial<TouchFeedbackConfig>) => {
      Object.assign(options, newConfig)
    }, [options]),
    
    // Stats for debugging
    getStats: useCallback(() => ({
      feedbackCount: feedbackState.current.feedbackCount,
      activeEffectsCount: feedbackState.current.activeEffects.size,
      lastFeedbackTime: feedbackState.current.lastFeedbackTime
    }), [])
  }
}

// CSS for visual effects (should be added to calendar-animations.css)
export const TOUCH_FEEDBACK_CSS = `
@keyframes ripple-effect {
  0% {
    width: 20px;
    height: 20px;
    opacity: 0.8;
  }
  100% {
    width: 100px;
    height: 100px;
    opacity: 0;
  }
}

@keyframes scale-effect {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 0.8;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
    opacity: 0.6;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

@keyframes glow-effect {
  0% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(0.5);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(1.2);
  }
}

@keyframes bounce-effect {
  0% {
    transform: translate(-50%, -50%) scale(0.3);
    opacity: 0.8;
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
    opacity: 1;
  }
  70% {
    transform: translate(-50%, -50%) scale(0.9);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}
`

export default useTouchFeedback