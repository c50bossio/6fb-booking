/**
 * One-handed mode for mobile calendar interactions on large screens
 * Automatically adjusts UI elements to be reachable with thumb navigation
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface OneHandedModeConfig {
  enabled: boolean
  position: 'left' | 'right' | 'center'
  reachableHeight: number
  adaptiveThreshold: number
  autoDetect: boolean
  hapticFeedback: boolean
  animationDuration: number
}

export interface ReachabilityZone {
  easy: { top: number; bottom: number; left: number; right: number }
  medium: { top: number; bottom: number; left: number; right: number }
  hard: { top: number; bottom: number; left: number; right: number }
}

export interface OneHandedModeState {
  isActive: boolean
  handPosition: 'left' | 'right' | 'center'
  reachabilityZones: ReachabilityZone
  screenSize: { width: number; height: number }
  thumbReach: number
  safeArea: { top: number; bottom: number; left: number; right: number }
}

const DEFAULT_CONFIG: OneHandedModeConfig = {
  enabled: true,
  position: 'right', // Most people are right-handed
  reachableHeight: 0.75, // 75% of screen height is comfortably reachable
  adaptiveThreshold: 5.5, // Screen size in inches where one-handed becomes difficult
  autoDetect: true,
  hapticFeedback: true,
  animationDuration: 300
}

export function useOneHandedMode(config: Partial<OneHandedModeConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const [state, setState] = useState<OneHandedModeState>({
    isActive: false,
    handPosition: fullConfig.position,
    reachabilityZones: calculateDefaultReachability(),
    screenSize: { width: 0, height: 0 },
    thumbReach: 0,
    safeArea: { top: 0, bottom: 0, left: 0, right: 0 }
  })

  const gestureStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const reachabilityMapRef = useRef<Map<HTMLElement, 'easy' | 'medium' | 'hard'>>(new Map())

  // Calculate device metrics
  const calculateDeviceMetrics = useCallback(() => {
    const screenWidth = window.screen.width
    const screenHeight = window.screen.height
    const dpr = window.devicePixelRatio || 1
    
    // Estimate physical size (approximate)
    const physicalWidth = screenWidth / (dpr * 160) // Assume ~160 DPI
    const physicalHeight = screenHeight / (dpr * 160)
    const diagonalInches = Math.sqrt(physicalWidth ** 2 + physicalHeight ** 2)
    
    return {
      screenSize: { width: screenWidth, height: screenHeight },
      physicalSize: { width: physicalWidth, height: physicalHeight },
      diagonalInches,
      isLargeScreen: diagonalInches > fullConfig.adaptiveThreshold
    }
  }, [fullConfig.adaptiveThreshold])

  // Calculate thumb reach based on hand position and screen size
  const calculateThumbReach = useCallback((handPosition: 'left' | 'right' | 'center', screenSize: { width: number; height: number }) => {
    // Average thumb reach is approximately 72mm (2.83 inches)
    // This translates to different pixel distances based on screen DPI
    const avgThumbReachMm = 72
    const dpi = window.devicePixelRatio * 160 // Approximate DPI
    const thumbReachPixels = (avgThumbReachMm / 25.4) * dpi // Convert mm to inches to pixels
    
    // Adjust based on screen size - larger screens are held differently
    const diagonal = Math.sqrt(screenSize.width ** 2 + screenSize.height ** 2)
    const sizeFactor = Math.min(1.2, diagonal / 1000) // Normalize and cap adjustment
    
    return thumbReachPixels * sizeFactor
  }, [])

  // Calculate reachability zones based on hand position
  const calculateReachabilityZones = useCallback((
    handPosition: 'left' | 'right' | 'center',
    screenSize: { width: number; height: number },
    thumbReach: number
  ): ReachabilityZone => {
    const { width, height } = screenSize
    
    // Base position where thumb naturally rests
    let baseX: number
    let baseY: number = height * 0.85 // Bottom 15% of screen
    
    switch (handPosition) {
      case 'left':
        baseX = width * 0.15 // 15% from left edge
        break
      case 'right':
        baseX = width * 0.85 // 15% from right edge
        break
      case 'center':
      default:
        baseX = width * 0.5 // Center of screen
        baseY = height * 0.9 // Bottom 10% for two-handed
        break
    }

    // Calculate zones based on thumb reach
    const easyReach = thumbReach * 0.6 // Very comfortable
    const mediumReach = thumbReach * 0.8 // Comfortable with slight stretch
    const hardReach = thumbReach // Maximum comfortable reach

    return {
      easy: {
        top: Math.max(0, baseY - easyReach),
        bottom: Math.min(height, baseY + easyReach * 0.3),
        left: Math.max(0, baseX - easyReach),
        right: Math.min(width, baseX + easyReach)
      },
      medium: {
        top: Math.max(0, baseY - mediumReach),
        bottom: Math.min(height, baseY + mediumReach * 0.4),
        left: Math.max(0, baseX - mediumReach),
        right: Math.min(width, baseX + mediumReach)
      },
      hard: {
        top: Math.max(0, baseY - hardReach),
        bottom: Math.min(height, baseY + hardReach * 0.5),
        left: Math.max(0, baseX - hardReach),
        right: Math.min(width, baseX + hardReach)
      }
    }
  }, [])

  // Default reachability calculation
  function calculateDefaultReachability(): ReachabilityZone {
    return {
      easy: { top: 400, bottom: 600, left: 100, right: 300 },
      medium: { top: 300, bottom: 700, left: 50, right: 350 },
      hard: { top: 200, bottom: 800, left: 0, right: 400 }
    }
  }

  // Auto-detect one-handed usage patterns
  const detectOneHandedUsage = useCallback(() => {
    if (!fullConfig.autoDetect) return

    // Analyze touch patterns to detect one-handed usage
    const touchHandler = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        const { clientX, clientY } = touch
        const { innerWidth, innerHeight } = window

        // Detect if touches are consistently in one area
        const isLeftSide = clientX < innerWidth * 0.4
        const isRightSide = clientX > innerWidth * 0.6
        const isBottomHalf = clientY > innerHeight * 0.5

        if (isBottomHalf && (isLeftSide || isRightSide)) {
          const detectedPosition = isLeftSide ? 'left' : 'right'
          
          // Only update if this represents a pattern change
          if (detectedPosition !== state.handPosition) {
            setState(prev => ({ ...prev, handPosition: detectedPosition }))
            
            // Haptic feedback for position detection
            if (fullConfig.hapticFeedback && 'vibrate' in navigator) {
              navigator.vibrate([25, 25])
            }
          }
        }
      }
    }

    document.addEventListener('touchstart', touchHandler, { passive: true })
    return () => document.removeEventListener('touchstart', touchHandler)
  }, [fullConfig.autoDetect, fullConfig.hapticFeedback, state.handPosition])

  // Initialize and update state
  useEffect(() => {
    const metrics = calculateDeviceMetrics()
    
    if (metrics.isLargeScreen && fullConfig.enabled) {
      const thumbReach = calculateThumbReach(state.handPosition, metrics.screenSize)
      const reachabilityZones = calculateReachabilityZones(
        state.handPosition,
        metrics.screenSize,
        thumbReach
      )

      setState(prev => ({
        ...prev,
        isActive: true,
        screenSize: metrics.screenSize,
        thumbReach,
        reachabilityZones,
        safeArea: {
          top: 44, // Status bar
          bottom: 34, // Home indicator
          left: 0,
          right: 0
        }
      }))
    } else {
      setState(prev => ({ ...prev, isActive: false }))
    }
  }, [fullConfig.enabled, state.handPosition, calculateDeviceMetrics, calculateThumbReach, calculateReachabilityZones])

  // Set up auto-detection
  useEffect(() => {
    if (state.isActive) {
      return detectOneHandedUsage()
    }
  }, [state.isActive, detectOneHandedUsage])

  // Manually toggle one-handed mode
  const toggleOneHandedMode = useCallback(() => {
    setState(prev => ({ ...prev, isActive: !prev.isActive }))
    
    if (fullConfig.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(state.isActive ? 30 : [50, 50]) // Different pattern for on/off
    }
  }, [fullConfig.hapticFeedback, state.isActive])

  // Switch hand position
  const switchHandPosition = useCallback((position: 'left' | 'right' | 'center') => {
    if (position === state.handPosition) return

    const thumbReach = calculateThumbReach(position, state.screenSize)
    const reachabilityZones = calculateReachabilityZones(position, state.screenSize, thumbReach)

    setState(prev => ({
      ...prev,
      handPosition: position,
      thumbReach,
      reachabilityZones
    }))

    if (fullConfig.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate([25, 25, 50]) // Triple tap for hand switch
    }
  }, [state.handPosition, state.screenSize, calculateThumbReach, calculateReachabilityZones, fullConfig.hapticFeedback])

  // Get reachability for a specific element
  const getElementReachability = useCallback((element: HTMLElement): 'easy' | 'medium' | 'hard' | 'unreachable' => {
    if (!state.isActive) return 'easy'

    const rect = element.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2

    const { easy, medium, hard } = state.reachabilityZones

    // Check if element center is within each zone
    if (centerX >= easy.left && centerX <= easy.right && 
        centerY >= easy.top && centerY <= easy.bottom) {
      return 'easy'
    } else if (centerX >= medium.left && centerX <= medium.right && 
               centerY >= medium.top && centerY <= medium.bottom) {
      return 'medium'
    } else if (centerX >= hard.left && centerX <= hard.right && 
               centerY >= hard.top && centerY <= hard.bottom) {
      return 'hard'
    } else {
      return 'unreachable'
    }
  }, [state.isActive, state.reachabilityZones])

  // Apply one-handed mode styles to an element
  const getOneHandedStyles = useCallback((reachability: 'easy' | 'medium' | 'hard' | 'unreachable' = 'easy') => {
    if (!state.isActive) return {}

    const baseStyles = {
      transition: `all ${fullConfig.animationDuration}ms ease-out`
    }

    switch (reachability) {
      case 'easy':
        return {
          ...baseStyles,
          transform: 'scale(1)',
          opacity: 1,
          zIndex: 10
        }
      case 'medium':
        return {
          ...baseStyles,
          transform: 'scale(0.95)',
          opacity: 0.9,
          zIndex: 5
        }
      case 'hard':
        return {
          ...baseStyles,
          transform: 'scale(0.9)',
          opacity: 0.7,
          zIndex: 1
        }
      case 'unreachable':
        return {
          ...baseStyles,
          transform: 'scale(0.8)',
          opacity: 0.5,
          pointerEvents: 'none' as const
        }
      default:
        return baseStyles
    }
  }, [state.isActive, fullConfig.animationDuration])

  // Get suggested improvements for better reachability
  const getReachabilityImprovements = useCallback((element: HTMLElement) => {
    const reachability = getElementReachability(element)
    const improvements: string[] = []

    if (reachability === 'hard' || reachability === 'unreachable') {
      const rect = element.getBoundingClientRect()
      const { reachabilityZones, handPosition } = state

      // Suggest moving element into easier reach zones
      if (rect.top < reachabilityZones.easy.top) {
        improvements.push('Move element lower on screen for easier thumb reach')
      }
      
      if (handPosition === 'right' && rect.left < reachabilityZones.medium.left) {
        improvements.push('Move element to right side for right-handed operation')
      }
      
      if (handPosition === 'left' && rect.right > reachabilityZones.medium.right) {
        improvements.push('Move element to left side for left-handed operation')
      }
      
      if (rect.width < 44 || rect.height < 44) {
        improvements.push('Increase touch target size (minimum 44px)')
      }
    }

    return improvements
  }, [getElementReachability, state])

  return {
    // State
    ...state,
    config: fullConfig,
    
    // Actions
    toggleOneHandedMode,
    switchHandPosition,
    
    // Utilities
    getElementReachability,
    getOneHandedStyles,
    getReachabilityImprovements,
    
    // Helper methods
    isElementReachable: (element: HTMLElement) => {
      const reachability = getElementReachability(element)
      return reachability === 'easy' || reachability === 'medium'
    },
    
    getReachabilityScore: (element: HTMLElement): number => {
      const reachability = getElementReachability(element)
      const scores = { easy: 1, medium: 0.7, hard: 0.4, unreachable: 0 }
      return scores[reachability]
    }
  }
}

export default useOneHandedMode