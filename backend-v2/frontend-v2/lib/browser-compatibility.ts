/**
 * Browser Compatibility Layer for Touch Systems
 * Provides safe fallbacks for APIs that may not be available across all browsers
 */

import React from 'react'

// Feature detection results (cached for performance)
interface BrowserCapabilities {
  hasVibration: boolean
  hasTouchEvents: boolean
  hasPointerEvents: boolean
  hasPressureSensitivity: boolean
  hasDevicePixelRatio: boolean
  hasSpeechSynthesis: boolean
  hasMatchMedia: boolean
  hasRequestAnimationFrame: boolean
  maxTouchPoints: number
  userAgent: {
    isIOS: boolean
    isSafari: boolean
    isChrome: boolean
    isFirefox: boolean
    isEdge: boolean
    isMobile: boolean
    version: string | null
  }
}

class BrowserCompatibilityManager {
  private capabilities: BrowserCapabilities | null = null
  private readonly featureDetectionCache = new Map<string, boolean>()

  /**
   * Detect all browser capabilities on first use
   */
  private detectCapabilities(): BrowserCapabilities {
    if (this.capabilities) return this.capabilities

    const nav = typeof navigator !== 'undefined' ? navigator : null
    const win = typeof window !== 'undefined' ? window : null

    // User agent detection
    const userAgent = nav?.userAgent || ''
    const isIOS = /iPad|iPhone|iPod/.test(userAgent)
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent)
    const isChrome = /Chrome/.test(userAgent)
    const isFirefox = /Firefox/.test(userAgent)
    const isEdge = /Edg/.test(userAgent)
    const isMobile = /Mobi|Android/i.test(userAgent) || isIOS

    // Extract version information
    let version: string | null = null
    try {
      if (isChrome) {
        const match = userAgent.match(/Chrome\/(\d+\.\d+)/)
        version = match ? match[1] : null
      } else if (isSafari) {
        const match = userAgent.match(/Version\/(\d+\.\d+)/)
        version = match ? match[1] : null
      } else if (isFirefox) {
        const match = userAgent.match(/Firefox\/(\d+\.\d+)/)
        version = match ? match[1] : null
      }
    } catch {
      version = null
    }

    this.capabilities = {
      // Vibration API
      hasVibration: !!(nav && 'vibrate' in nav && typeof nav.vibrate === 'function'),
      
      // Touch and Pointer Events
      hasTouchEvents: !!(win && ('ontouchstart' in win || (nav && nav.maxTouchPoints > 0))),
      hasPointerEvents: !!(win && 'PointerEvent' in win),
      hasPressureSensitivity: !!(win && 'TouchEvent' in win && 'force' in TouchEvent.prototype),
      
      // Device capabilities
      hasDevicePixelRatio: !!(win && 'devicePixelRatio' in win && typeof win.devicePixelRatio === 'number'),
      maxTouchPoints: nav?.maxTouchPoints || 0,
      
      // Speech and Media
      hasSpeechSynthesis: !!(win && 'speechSynthesis' in win && win.speechSynthesis),
      hasMatchMedia: !!(win && 'matchMedia' in win && typeof win.matchMedia === 'function'),
      
      // Animation
      hasRequestAnimationFrame: !!(win && 'requestAnimationFrame' in win),
      
      // User agent info
      userAgent: {
        isIOS,
        isSafari,
        isChrome,
        isFirefox,
        isEdge,
        isMobile,
        version
      }
    }

    return this.capabilities
  }

  /**
   * Safe vibration with fallback
   */
  vibrate(pattern: number | number[]): boolean {
    const caps = this.detectCapabilities()
    
    if (!caps.hasVibration) {
      return false
    }

    try {
      return navigator.vibrate(pattern)
    } catch (error) {
      console.warn('Vibration failed:', error)
      return false
    }
  }

  /**
   * Safe speech synthesis check
   */
  isSpeechSynthesisActive(): boolean {
    const caps = this.detectCapabilities()
    
    if (!caps.hasSpeechSynthesis) {
      return false
    }

    try {
      return window.speechSynthesis?.speaking || false
    } catch (error) {
      console.warn('Speech synthesis check failed:', error)
      return false
    }
  }

  /**
   * Safe media query matching
   */
  matchMedia(query: string): MediaQueryList | null {
    const caps = this.detectCapabilities()
    
    if (!caps.hasMatchMedia) {
      // Return mock MediaQueryList for fallback
      return {
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
      } as MediaQueryList
    }

    try {
      return window.matchMedia(query)
    } catch (error) {
      console.warn('matchMedia failed:', error)
      return null
    }
  }

  /**
   * Safe device pixel ratio with fallback
   */
  getDevicePixelRatio(): number {
    const caps = this.detectCapabilities()
    
    if (!caps.hasDevicePixelRatio) {
      return 1 // Fallback to standard resolution
    }

    try {
      return window.devicePixelRatio || 1
    } catch (error) {
      console.warn('Device pixel ratio check failed:', error)
      return 1
    }
  }

  /**
   * Safe touch event detection
   */
  getTouchCapabilities(): {
    supportsTouchEvents: boolean
    supportsPointerEvents: boolean
    maxTouchPoints: number
    supportsPressure: boolean
  } {
    const caps = this.detectCapabilities()
    
    return {
      supportsTouchEvents: caps.hasTouchEvents,
      supportsPointerEvents: caps.hasPointerEvents,
      maxTouchPoints: caps.maxTouchPoints,
      supportsPressure: caps.hasPressureSensitivity
    }
  }

  /**
   * Safe animation frame request
   */
  requestAnimationFrame(callback: FrameRequestCallback): number {
    const caps = this.detectCapabilities()
    
    if (caps.hasRequestAnimationFrame) {
      try {
        return window.requestAnimationFrame(callback)
      } catch (error) {
        console.warn('requestAnimationFrame failed:', error)
      }
    }

    // Fallback using setTimeout
    return window.setTimeout(() => {
      callback(Date.now())
    }, 16) // ~60fps
  }

  /**
   * Browser-specific optimizations
   */
  getBrowserOptimizations(): {
    preferredTouchDelay: number
    preferredHapticIntensity: number
    requiresExplicitTouchStart: boolean
    supportsPassiveEvents: boolean
    preferredAnimationMethod: 'raf' | 'css' | 'timeout'
  } {
    const caps = this.detectCapabilities()
    const { userAgent } = caps

    // iOS Safari optimizations
    if (userAgent.isIOS && userAgent.isSafari) {
      return {
        preferredTouchDelay: 0, // iOS has good touch responsiveness
        preferredHapticIntensity: 0.8, // iOS haptics are sensitive
        requiresExplicitTouchStart: true,
        supportsPassiveEvents: true,
        preferredAnimationMethod: 'raf'
      }
    }

    // Chrome optimizations
    if (userAgent.isChrome) {
      return {
        preferredTouchDelay: 10,
        preferredHapticIntensity: 1.0,
        requiresExplicitTouchStart: false,
        supportsPassiveEvents: true,
        preferredAnimationMethod: 'raf'
      }
    }

    // Firefox optimizations
    if (userAgent.isFirefox) {
      return {
        preferredTouchDelay: 15,
        preferredHapticIntensity: 1.2, // Firefox haptics need more intensity
        requiresExplicitTouchStart: false,
        supportsPassiveEvents: true,
        preferredAnimationMethod: caps.hasRequestAnimationFrame ? 'raf' : 'timeout'
      }
    }

    // Default/fallback optimizations
    return {
      preferredTouchDelay: 20,
      preferredHapticIntensity: 1.0,
      requiresExplicitTouchStart: userAgent.isMobile,
      supportsPassiveEvents: true,
      preferredAnimationMethod: caps.hasRequestAnimationFrame ? 'raf' : 'css'
    }
  }

  /**
   * Get comprehensive browser info for debugging
   */
  getBrowserInfo(): BrowserCapabilities & {
    timestamp: number
    featureCacheSize: number
  } {
    const caps = this.detectCapabilities()
    return {
      ...caps,
      timestamp: Date.now(),
      featureCacheSize: this.featureDetectionCache.size
    }
  }

  /**
   * Test specific feature with caching
   */
  hasFeature(featureName: string, testFunction: () => boolean): boolean {
    if (this.featureDetectionCache.has(featureName)) {
      return this.featureDetectionCache.get(featureName)!
    }

    try {
      const result = testFunction()
      this.featureDetectionCache.set(featureName, result)
      return result
    } catch (error) {
      console.warn(`Feature test failed for ${featureName}:`, error)
      this.featureDetectionCache.set(featureName, false)
      return false
    }
  }

  /**
   * Clear cache and re-detect (useful for testing)
   */
  resetDetection(): void {
    this.capabilities = null
    this.featureDetectionCache.clear()
  }
}

// Singleton instance
export const browserCompatibility = new BrowserCompatibilityManager()

// Convenience functions for common use cases
export const safeVibrate = (pattern: number | number[]): boolean => {
  return browserCompatibility.vibrate(pattern)
}

export const isTouchDevice = (): boolean => {
  const caps = browserCompatibility.getTouchCapabilities()
  return caps.supportsTouchEvents && caps.maxTouchPoints > 0
}

export const getOptimalTouchDelay = (): number => {
  return browserCompatibility.getBrowserOptimizations().preferredTouchDelay
}

export const supportsHapticFeedback = (): boolean => {
  return browserCompatibility.detectCapabilities().hasVibration
}

export const getHapticIntensityMultiplier = (): number => {
  return browserCompatibility.getBrowserOptimizations().preferredHapticIntensity
}

export const supportsReducedMotion = (): boolean => {
  const mediaQuery = browserCompatibility.matchMedia('(prefers-reduced-motion: reduce)')
  return mediaQuery?.matches || false
}

export const supportsHighContrast = (): boolean => {
  const mediaQuery = browserCompatibility.matchMedia('(prefers-contrast: high)')
  return mediaQuery?.matches || false
}

export const safeRequestAnimationFrame = (callback: FrameRequestCallback): number => {
  return browserCompatibility.requestAnimationFrame(callback)
}

// React hook for browser compatibility
export function useBrowserCompatibility() {
  const [capabilities, setCapabilities] = React.useState<BrowserCapabilities | null>(null)

  React.useEffect(() => {
    setCapabilities(browserCompatibility.getBrowserInfo())
  }, [])

  return {
    capabilities,
    safeVibrate,
    isTouchDevice: isTouchDevice(),
    supportsHapticFeedback: supportsHapticFeedback(),
    getOptimalTouchDelay,
    getHapticIntensityMultiplier,
    supportsReducedMotion: supportsReducedMotion(),
    supportsHighContrast: supportsHighContrast(),
    browserInfo: browserCompatibility.getBrowserInfo()
  }
}

export default browserCompatibility