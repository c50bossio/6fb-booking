/**
 * Accessibility-first touch interactions for mobile calendar
 * Ensures all touch gestures have keyboard and assistive technology equivalents
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface AccessibleTouchConfig {
  enableVoiceOver: boolean
  enableKeyboardAlternatives: boolean
  enableReducedMotion: boolean
  enableHighContrast: boolean
  enableLargerTouchTargets: boolean
  hapticIntensity: 'low' | 'medium' | 'high' | 'off'
  gestureTimeout: number
  minimumTouchTarget: number
}

export interface AccessibilityState {
  isVoiceOverActive: boolean
  isKeyboardUser: boolean
  prefersReducedMotion: boolean
  hasHighContrastPreference: boolean
  touchTargetMultiplier: number
  currentFocus: string | null
  announcements: string[]
}

export interface TouchAlternative {
  gesture: string
  keyboardShortcut: string
  description: string
  ariaLabel: string
  handler: () => void
}

const DEFAULT_CONFIG: AccessibleTouchConfig = {
  enableVoiceOver: true,
  enableKeyboardAlternatives: true,
  enableReducedMotion: false,
  enableHighContrast: false,
  enableLargerTouchTargets: true,
  hapticIntensity: 'medium',
  gestureTimeout: 3000,
  minimumTouchTarget: 44 // WCAG AA minimum
}

export function useAccessibleTouchInteractions(config: Partial<AccessibleTouchConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const [state, setState] = useState<AccessibilityState>({
    isVoiceOverActive: false,
    isKeyboardUser: false,
    prefersReducedMotion: false,
    hasHighContrastPreference: false,
    touchTargetMultiplier: 1,
    currentFocus: null,
    announcements: []
  })

  const announcementQueue = useRef<string[]>([])
  const lastAnnouncementTime = useRef<number>(0)
  const currentGestureTimeout = useRef<NodeJS.Timeout | null>(null)

  // Detect accessibility preferences
  useEffect(() => {
    const detectAccessibilityPreferences = () => {
      // Detect VoiceOver/screen reader
      const isVoiceOverActive = window.navigator.userAgent.includes('VoiceOver') ||
        window.speechSynthesis?.speaking ||
        document.querySelector('[aria-hidden="true"]') !== null

      // Detect keyboard navigation
      const isKeyboardUser = !('ontouchstart' in window) || 
        window.navigator.maxTouchPoints === 0

      // Detect motion preferences
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      // Detect contrast preferences
      const hasHighContrastPreference = window.matchMedia('(prefers-contrast: high)').matches

      // Calculate touch target multiplier based on preferences
      let touchTargetMultiplier = 1
      if (fullConfig.enableLargerTouchTargets) {
        touchTargetMultiplier = isVoiceOverActive ? 1.5 : 1.2
      }

      setState(prev => ({
        ...prev,
        isVoiceOverActive,
        isKeyboardUser,
        prefersReducedMotion,
        hasHighContrastPreference,
        touchTargetMultiplier
      }))
    }

    detectAccessibilityPreferences()

    // Listen for preference changes
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const contrastMediaQuery = window.matchMedia('(prefers-contrast: high)')

    motionMediaQuery.addEventListener('change', detectAccessibilityPreferences)
    contrastMediaQuery.addEventListener('change', detectAccessibilityPreferences)

    return () => {
      motionMediaQuery.removeEventListener('change', detectAccessibilityPreferences)
      contrastMediaQuery.removeEventListener('change', detectAccessibilityPreferences)
    }
  }, [fullConfig.enableLargerTouchTargets])

  // Announcement system for screen readers
  const announceToScreenReader = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const now = Date.now()
    
    // Throttle announcements to prevent spam
    if (now - lastAnnouncementTime.current < 1000) {
      announcementQueue.current.push(message)
      return
    }

    lastAnnouncementTime.current = now

    // Create or update ARIA live region
    let liveRegion = document.getElementById('touch-announcements')
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'touch-announcements'
      liveRegion.setAttribute('aria-live', priority)
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.style.position = 'absolute'
      liveRegion.style.left = '-10000px'
      liveRegion.style.width = '1px'
      liveRegion.style.height = '1px'
      liveRegion.style.overflow = 'hidden'
      document.body.appendChild(liveRegion)
    }

    liveRegion.textContent = message
    
    // Update state
    setState(prev => ({
      ...prev,
      announcements: [...prev.announcements.slice(-5), message] // Keep last 5 announcements
    }))

    // Process queued announcements
    setTimeout(() => {
      if (announcementQueue.current.length > 0) {
        const nextMessage = announcementQueue.current.shift()!
        announceToScreenReader(nextMessage, priority)
      }
    }, 1500)
  }, [])

  // Enhanced haptic feedback for accessibility
  const accessibleHapticFeedback = useCallback((pattern: 'success' | 'warning' | 'error' | 'info' | 'custom', customPattern?: number[]) => {
    if (fullConfig.hapticIntensity === 'off' || !('vibrate' in navigator)) {
      return
    }

    const intensityMultiplier = {
      low: 0.5,
      medium: 1,
      high: 1.5
    }[fullConfig.hapticIntensity]

    const patterns = {
      success: [50, 25, 50].map(v => Math.round(v * intensityMultiplier)),
      warning: [100, 50, 100, 50, 100].map(v => Math.round(v * intensityMultiplier)),
      error: [200, 100, 200].map(v => Math.round(v * intensityMultiplier)),
      info: [25].map(v => Math.round(v * intensityMultiplier)),
      custom: customPattern || [50]
    }

    navigator.vibrate(patterns[pattern])
  }, [fullConfig.hapticIntensity])

  // Gesture timeout for accessibility
  const startGestureTimeout = useCallback((gestureName: string, onTimeout: () => void) => {
    if (currentGestureTimeout.current) {
      clearTimeout(currentGestureTimeout.current)
    }

    currentGestureTimeout.current = setTimeout(() => {
      announceToScreenReader(`${gestureName} gesture timed out. Try using keyboard alternative.`, 'assertive')
      accessibleHapticFeedback('warning')
      onTimeout()
    }, fullConfig.gestureTimeout)
  }, [fullConfig.gestureTimeout, announceToScreenReader, accessibleHapticFeedback])

  const clearGestureTimeout = useCallback(() => {
    if (currentGestureTimeout.current) {
      clearTimeout(currentGestureTimeout.current)
      currentGestureTimeout.current = null
    }
  }, [])

  // Touch target enhancement
  const enhanceTouchTarget = useCallback((element: HTMLElement) => {
    if (!fullConfig.enableLargerTouchTargets) return

    const rect = element.getBoundingClientRect()
    const currentSize = Math.min(rect.width, rect.height)
    const targetSize = fullConfig.minimumTouchTarget * state.touchTargetMultiplier

    if (currentSize < targetSize) {
      const padding = (targetSize - currentSize) / 2
      element.style.padding = `${padding}px`
      element.style.margin = `-${padding}px`
      
      // Ensure the touch area is accessible
      if (!element.getAttribute('aria-label')) {
        element.setAttribute('aria-label', `Touch target (${Math.round(targetSize)}px)`)
      }
    }
  }, [fullConfig.enableLargerTouchTargets, fullConfig.minimumTouchTarget, state.touchTargetMultiplier])

  // Keyboard alternatives for touch gestures
  const createTouchAlternatives = useCallback((element: HTMLElement, gestures: string[]): TouchAlternative[] => {
    const alternatives: TouchAlternative[] = []

    gestures.forEach(gesture => {
      let shortcut = ''
      let description = ''
      let ariaLabel = ''
      let handler = () => {}

      switch (gesture) {
        case 'tap':
          shortcut = 'Enter or Space'
          description = 'Activate element'
          ariaLabel = 'Press Enter or Space to activate'
          handler = () => element.click()
          break
        case 'longPress':
          shortcut = 'Shift + Enter'
          description = 'Show context menu'
          ariaLabel = 'Press Shift + Enter for context menu'
          handler = () => {
            const event = new CustomEvent('contextmenu', { bubbles: true })
            element.dispatchEvent(event)
          }
          break
        case 'swipeLeft':
          shortcut = 'Left Arrow'
          description = 'Navigate left'
          ariaLabel = 'Press Left Arrow to navigate left'
          handler = () => {
            const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
            element.dispatchEvent(event)
          }
          break
        case 'swipeRight':
          shortcut = 'Right Arrow'
          description = 'Navigate right'
          ariaLabel = 'Press Right Arrow to navigate right'
          handler = () => {
            const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
            element.dispatchEvent(event)
          }
          break
        case 'pinch':
          shortcut = 'Ctrl + Plus/Minus'
          description = 'Zoom in/out'
          ariaLabel = 'Press Ctrl + Plus or Minus to zoom'
          handler = () => {
            announceToScreenReader('Use Ctrl + Plus to zoom in, Ctrl + Minus to zoom out')
          }
          break
        case 'drag':
          shortcut = 'Ctrl + Arrow Keys'
          description = 'Move element'
          ariaLabel = 'Press Ctrl + Arrow keys to move'
          handler = () => {
            announceToScreenReader('Use Ctrl + Arrow keys to move this element')
          }
          break
      }

      if (shortcut) {
        alternatives.push({
          gesture,
          keyboardShortcut: shortcut,
          description,
          ariaLabel,
          handler
        })
      }
    })

    return alternatives
  }, [announceToScreenReader])

  // Focus management for touch interactions
  const manageFocus = useCallback((element: HTMLElement, action: 'focus' | 'blur' | 'trap') => {
    switch (action) {
      case 'focus':
        element.focus()
        setState(prev => ({ ...prev, currentFocus: element.id || element.tagName }))
        announceToScreenReader(`Focused on ${element.getAttribute('aria-label') || element.textContent || 'element'}`)
        break
      case 'blur':
        element.blur()
        setState(prev => ({ ...prev, currentFocus: null }))
        break
      case 'trap':
        // Implement focus trapping for modal-like interactions
        const focusableElements = element.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusableElements.length > 0) {
          (focusableElements[0] as HTMLElement).focus()
        }
        break
    }
  }, [announceToScreenReader])

  // Accessible gesture feedback
  const provideGestureFeedback = useCallback((
    gesture: string, 
    success: boolean, 
    context?: string
  ) => {
    const contextMessage = context ? ` on ${context}` : ''
    
    if (success) {
      announceToScreenReader(`${gesture} completed successfully${contextMessage}`)
      accessibleHapticFeedback('success')
    } else {
      announceToScreenReader(`${gesture} failed${contextMessage}. Try using keyboard alternative.`)
      accessibleHapticFeedback('error')
    }
  }, [announceToScreenReader, accessibleHapticFeedback])

  // Motion preferences handling
  const respectMotionPreferences = useCallback((
    animation: () => void,
    alternativeAction?: () => void
  ) => {
    if (state.prefersReducedMotion && alternativeAction) {
      alternativeAction()
    } else if (!state.prefersReducedMotion) {
      animation()
    }
  }, [state.prefersReducedMotion])

  // High contrast adjustments
  const getContrastAdjustedStyles = useCallback((baseStyles: React.CSSProperties): React.CSSProperties => {
    if (!state.hasHighContrastPreference) {
      return baseStyles
    }

    return {
      ...baseStyles,
      border: '2px solid currentColor',
      backgroundColor: 'ButtonFace',
      color: 'ButtonText',
      outline: '1px solid currentColor'
    }
  }, [state.hasHighContrastPreference])

  // Cleanup
  useEffect(() => {
    return () => {
      if (currentGestureTimeout.current) {
        clearTimeout(currentGestureTimeout.current)
      }
    }
  }, [])

  return {
    // State
    ...state,
    config: fullConfig,

    // Core functions
    announceToScreenReader,
    accessibleHapticFeedback,
    provideGestureFeedback,

    // Touch target enhancement
    enhanceTouchTarget,
    getTouchTargetSize: () => fullConfig.minimumTouchTarget * state.touchTargetMultiplier,

    // Keyboard alternatives
    createTouchAlternatives,
    
    // Focus management
    manageFocus,
    
    // Gesture timeout
    startGestureTimeout,
    clearGestureTimeout,

    // Motion and styling
    respectMotionPreferences,
    getContrastAdjustedStyles,

    // Utility functions
    isAccessibilityEnabled: () => state.isVoiceOverActive || state.isKeyboardUser,
    shouldProvideAlternatives: () => fullConfig.enableKeyboardAlternatives,
    getAccessibilityScore: (): number => {
      let score = 0
      if (fullConfig.enableVoiceOver) score += 20
      if (fullConfig.enableKeyboardAlternatives) score += 25
      if (fullConfig.enableLargerTouchTargets) score += 20
      if (fullConfig.enableReducedMotion || state.prefersReducedMotion) score += 15
      if (fullConfig.enableHighContrast || state.hasHighContrastPreference) score += 20
      return score
    }
  }
}

export default useAccessibleTouchInteractions