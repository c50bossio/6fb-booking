/**
 * Browser compatibility utilities for touch interactions
 * Provides polyfills and feature detection for consistent behavior across browsers
 */

// Browser feature detection
export const browserCompatibility = {
  // Touch support detection
  hasTouch: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
  
  // Pointer events support
  hasPointerEvents: typeof window !== 'undefined' && 'PointerEvent' in window,
  
  // Passive event listener support
  supportsPassive: (() => {
    if (typeof window === 'undefined') return false
    
    let supportsPassive = false
    try {
      const opts = Object.defineProperty({}, 'passive', {
        get: function() {
          supportsPassive = true
          return true
        }
      })
      window.addEventListener('testPassive', () => {}, opts)
      window.removeEventListener('testPassive', () => {}, opts)
    } catch (e) {
      supportsPassive = false
    }
    return supportsPassive
  })(),
  
  // Request animation frame support
  hasRAF: typeof window !== 'undefined' && 'requestAnimationFrame' in window,
  
  // User agent detection
  isIOS: typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent),
  isAndroid: typeof window !== 'undefined' && /Android/.test(navigator.userAgent),
  isMobile: typeof window !== 'undefined' && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)),
  
  // Performance API support
  hasPerformanceAPI: typeof window !== 'undefined' && 'performance' in window && 'now' in window.performance,
  
  // Get browser-specific optimizations (method on object)
  getBrowserOptimizations() {
    return {
      touch: this.hasTouch,
      pointer: this.hasPointerEvents,
      passive: this.supportsPassive,
      raf: this.hasRAF,
      performance: this.hasPerformanceAPI,
      mobile: this.isMobile,
      isIOS: this.isIOS,
      isAndroid: this.isAndroid,
      preferredTouchDelay: this.isIOS ? 10 : this.isMobile ? 20 : 30
    }
  }
}

// Safe requestAnimationFrame with fallback
export const safeRequestAnimationFrame = (callback: (time: number) => void): number => {
  if (browserCompatibility.hasRAF) {
    return requestAnimationFrame(callback)
  } else {
    return window.setTimeout(() => callback(Date.now()), 16) as any
  }
}

// Safe cancelAnimationFrame with fallback
export const safeCancelAnimationFrame = (id: number): void => {
  if (browserCompatibility.hasRAF) {
    cancelAnimationFrame(id)
  } else {
    clearTimeout(id)
  }
}

// Safe performance.now() with fallback
export const safePerformanceNow = (): number => {
  if (browserCompatibility.hasPerformanceAPI) {
    return performance.now()
  } else {
    return Date.now()
  }
}

// Event listener options with passive support
export const getEventOptions = (passive: boolean = true): AddEventListenerOptions | boolean => {
  if (browserCompatibility.supportsPassive) {
    return { passive }
  } else {
    return false
  }
}

// Touch event normalization
export const normalizeTouchEvent = (event: TouchEvent | PointerEvent | MouseEvent) => {
  if ('touches' in event && event.touches.length > 0) {
    // Touch event
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY,
      type: 'touch' as const
    }
  } else if ('clientX' in event) {
    // Mouse or pointer event
    return {
      x: event.clientX,
      y: event.clientY,
      type: 'pointer' as const
    }
  } else {
    return {
      x: 0,
      y: 0,
      type: 'unknown' as const
    }
  }
}

// Prevent default with compatibility
export const safePreventDefault = (event: Event): void => {
  if (event.preventDefault) {
    event.preventDefault()
  }
  if (event.cancelable !== false) {
    event.returnValue = false
  }
}

// Get browser-specific optimizations
export const getBrowserOptimizations = () => {
  return {
    touch: browserCompatibility.hasTouch,
    pointer: browserCompatibility.hasPointerEvents,
    passive: browserCompatibility.supportsPassive,
    raf: browserCompatibility.hasRAF,
    performance: browserCompatibility.hasPerformanceAPI,
    mobile: browserCompatibility.isMobile,
    isIOS: browserCompatibility.isIOS,
    isAndroid: browserCompatibility.isAndroid,
    preferredTouchDelay: browserCompatibility.isIOS ? 10 : browserCompatibility.isMobile ? 20 : 30
  }
}

// Feature support flags for conditional logic
export const features = {
  touch: browserCompatibility.hasTouch,
  pointer: browserCompatibility.hasPointerEvents,
  passive: browserCompatibility.supportsPassive,
  raf: browserCompatibility.hasRAF,
  performance: browserCompatibility.hasPerformanceAPI,
  mobile: browserCompatibility.isMobile
}