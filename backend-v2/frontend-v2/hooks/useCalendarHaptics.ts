'use client'

import { useCallback, useRef, useEffect } from 'react'
import { useCalendarVisuals } from './useCalendarVisuals'

// Haptic feedback patterns based on iOS guidelines
const HAPTIC_PATTERNS = {
  // Selection feedback
  select: [10],
  deselect: [5],
  
  // Action feedback  
  success: [100, 50, 100],
  error: [200, 100, 200, 100, 200],
  warning: [150, 75, 150],
  
  // Navigation feedback
  navigate: [25],
  swipe: [15],
  bounce: [30, 20, 30],
  
  // Appointment interactions
  appointmentTap: [20],
  appointmentDrag: [40],
  appointmentDrop: [60, 30, 60],
  appointmentCreate: [80, 40, 80, 40, 80],
  appointmentDelete: [120, 60, 120],
  
  // Time-based feedback
  hourChange: [35],
  dayChange: [45],
  weekChange: [55],
  
  // Confirmation feedback
  confirm: [100, 50, 100, 50, 100],
  cancel: [80, 40, 80],
  
  // Notification feedback
  reminder: [60, 40, 60, 40, 60],
  alert: [150, 100, 150, 100, 150]
} as const

type HapticType = keyof typeof HAPTIC_PATTERNS

interface HapticOptions {
  enableHaptics?: boolean
  respectSystemSettings?: boolean
  fallbackToVibration?: boolean
  customPatterns?: Partial<Record<HapticType, number[]>>
}

interface HapticCapabilities {
  hasVibrationAPI: boolean
  hasHapticFeedback: boolean
  isMobile: boolean
  isIOS: boolean
  isAndroid: boolean
  supportsCustomPatterns: boolean
}

/**
 * Enhanced haptic feedback system for calendar interactions
 * Provides tactile feedback for mobile users with customizable patterns
 */
export function useCalendarHaptics(options: HapticOptions = {}) {
  const {
    enableHaptics = true,
    respectSystemSettings = true,
    fallbackToVibration = true,
    customPatterns = {}
  } = options

  const { isMobile, isTouch } = useCalendarVisuals()
  const lastHapticTimeRef = useRef<number>(0)
  const hapticCooldownRef = useRef<Map<HapticType, number>>(new Map())

  // Detect device capabilities
  const capabilities: HapticCapabilities = {
    hasVibrationAPI: typeof navigator !== 'undefined' && 'vibrate' in navigator,
    hasHapticFeedback: typeof navigator !== 'undefined' && 'haptic' in navigator,
    isMobile,
    isIOS: typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent),
    supportsCustomPatterns: typeof navigator !== 'undefined' && navigator.vibrate?.length !== undefined
  }

  // Merge custom patterns with defaults
  const patterns = { ...HAPTIC_PATTERNS, ...customPatterns }

  // Check if haptics are available and enabled
  const isHapticsAvailable = useCallback((): boolean => {
    if (!enableHaptics || !isTouch) return false
    
    // Check system settings (if we can access them)
    if (respectSystemSettings && typeof window !== 'undefined') {
      // This is a simplified check - in practice, you'd need more sophisticated detection
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reducedMotion) return false
    }
    
    return capabilities.hasVibrationAPI || capabilities.hasHapticFeedback
  }, [enableHaptics, isTouch, respectSystemSettings, capabilities])

  // Trigger haptic feedback with cooldown
  const triggerHaptic = useCallback((type: HapticType, force: boolean = false): boolean => {
    if (!isHapticsAvailable() && !force) return false

    const now = Date.now()
    const cooldownTime = hapticCooldownRef.current.get(type) || 0
    
    // Prevent rapid-fire haptics (minimum 50ms between same type)
    if (now - cooldownTime < 50 && !force) return false
    
    const pattern = patterns[type]
    if (!pattern) return false

    try {
      // iOS Haptic Feedback (if available)
      if (capabilities.isIOS && (window as any).DeviceMotionEvent && 'requestPermission' in (window as any).DeviceMotionEvent) {
        // Use iOS haptic feedback if available
        const intensity = Math.min(Math.max(pattern[0] / 100, 0.1), 1)
        if ('hapticFeedback' in navigator) {
          ;(navigator as any).hapticFeedback.impact(intensity > 0.7 ? 'heavy' : intensity > 0.4 ? 'medium' : 'light')
          hapticCooldownRef.current.set(type, now)
          return true
        }
      }

      // Fallback to Vibration API
      if (capabilities.hasVibrationAPI && fallbackToVibration) {
        navigator.vibrate(pattern)
        hapticCooldownRef.current.set(type, now)
        return true
      }

      return false
    } catch (error) {
      console.warn('Haptic feedback failed:', error)
      return false
    }
  }, [isHapticsAvailable, patterns, capabilities, fallbackToVibration])

  // Contextual haptic feedback functions
  const hapticFeedback = {
    // Selection feedback
    select: () => triggerHaptic('select'),
    deselect: () => triggerHaptic('deselect'),
    
    // Success/Error states
    success: () => triggerHaptic('success'),
    error: () => triggerHaptic('error'),
    warning: () => triggerHaptic('warning'),
    
    // Navigation
    navigate: () => triggerHaptic('navigate'),
    swipe: () => triggerHaptic('swipe'),
    bounce: () => triggerHaptic('bounce'),
    
    // Appointment interactions
    appointmentTap: () => triggerHaptic('appointmentTap'),
    appointmentDrag: () => triggerHaptic('appointmentDrag'),
    appointmentDrop: () => triggerHaptic('appointmentDrop'),
    appointmentCreate: () => triggerHaptic('appointmentCreate'),
    appointmentDelete: () => triggerHaptic('appointmentDelete'),
    
    // Time navigation
    hourChange: () => triggerHaptic('hourChange'),
    dayChange: () => triggerHaptic('dayChange'),
    weekChange: () => triggerHaptic('weekChange'),
    
    // Confirmations
    confirm: () => triggerHaptic('confirm'),
    cancel: () => triggerHaptic('cancel'),
    
    // Notifications
    reminder: () => triggerHaptic('reminder'),
    alert: () => triggerHaptic('alert'),
    
    // Custom pattern
    custom: (pattern: number[]) => {
      if (capabilities.hasVibrationAPI) {
        navigator.vibrate(pattern)
        return true
      }
      return false
    }
  }

  // Smart haptic feedback based on interaction context
  const smartHaptic = useCallback((context: string, data?: any): boolean => {
    switch (context) {
      case 'appointment_created':
        return hapticFeedback.appointmentCreate()
      
      case 'appointment_updated':
        return hapticFeedback.success()
      
      case 'appointment_deleted':
        return hapticFeedback.appointmentDelete()
      
      case 'appointment_drag_start':
        return hapticFeedback.appointmentDrag()
      
      case 'appointment_drag_end':
        return data?.success ? hapticFeedback.appointmentDrop() : hapticFeedback.error()
      
      case 'calendar_navigate':
        const navType = data?.type
        if (navType === 'week') return hapticFeedback.weekChange()
        if (navType === 'day') return hapticFeedback.dayChange()
        return hapticFeedback.navigate()
      
      case 'time_slot_select':
        return hapticFeedback.select()
      
      case 'bulk_operation':
        return hapticFeedback.confirm()
      
      case 'form_validation_error':
        return hapticFeedback.error()
      
      case 'form_submission_success':
        return hapticFeedback.success()
      
      case 'swipe_gesture':
        return hapticFeedback.swipe()
      
      case 'long_press':
        return hapticFeedback.appointmentTap()
      
      case 'boundary_reached':
        return hapticFeedback.bounce()
      
      default:
        return hapticFeedback.select()
    }
  }, [hapticFeedback])

  // Sequence of haptics for complex interactions
  const hapticSequence = useCallback(async (sequence: HapticType[], delays: number[] = []): Promise<void> => {
    for (let i = 0; i < sequence.length; i++) {
      triggerHaptic(sequence[i], true)
      
      if (i < sequence.length - 1) {
        const delay = delays[i] || 100
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }, [triggerHaptic])

  // Haptic feedback for gesture recognition
  const gestureHaptics = {
    swipeStart: () => hapticFeedback.swipe(),
    swipeEnd: (successful: boolean) => successful ? hapticFeedback.success() : hapticFeedback.error(),
    longPressStart: () => hapticFeedback.appointmentTap(),
    longPressEnd: () => hapticFeedback.confirm(),
    pinchStart: () => hapticFeedback.select(),
    pinchEnd: () => hapticFeedback.navigate(),
    tap: () => hapticFeedback.select(),
    doubleTap: () => hapticSequence(['select', 'select'], [50])
  }

  // Request haptics permission (iOS 13+)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!capabilities.isIOS) return true
    
    try {
      if ('DeviceMotionEvent' in window && 'requestPermission' in (window as any).DeviceMotionEvent) {
        const permission = await (window as any).DeviceMotionEvent.requestPermission()
        return permission === 'granted'
      }
    } catch (error) {
      console.warn('Failed to request haptic permission:', error)
    }
    
    return false
  }, [capabilities.isIOS])

  // Test haptic functionality
  const testHaptics = useCallback((): boolean => {
    if (!isHapticsAvailable()) return false
    
    triggerHaptic('success', true)
    setTimeout(() => triggerHaptic('navigate', true), 200)
    setTimeout(() => triggerHaptic('confirm', true), 400)
    
    return true
  }, [isHapticsAvailable, triggerHaptic])

  // Cleanup cooldown timers
  useEffect(() => {
    return () => {
      hapticCooldownRef.current.clear()
    }
  }, [])

  return {
    // Core functions
    triggerHaptic,
    smartHaptic,
    hapticSequence,
    
    // Contextual feedback
    hapticFeedback,
    gestureHaptics,
    
    // Capabilities and status
    capabilities,
    isHapticsAvailable: isHapticsAvailable(),
    
    // Utilities
    requestPermission,
    testHaptics,
    
    // Configuration
    patterns,
    
    // Debug information
    getLastHapticTime: () => lastHapticTimeRef.current,
    getCooldownStatus: () => Object.fromEntries(hapticCooldownRef.current)
  }
}