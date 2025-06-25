import { useState, useEffect } from 'react'

interface MobileDetection {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  isIOS: boolean
  isAndroid: boolean
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  orientation: 'portrait' | 'landscape'
}

export function useMobileDetection(): MobileDetection {
  const [detection, setDetection] = useState<MobileDetection>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    isIOS: false,
    isAndroid: false,
    screenSize: 'lg',
    orientation: 'landscape'
  })

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      const userAgent = navigator.userAgent.toLowerCase()

      // Detect touch capability
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0

      // Detect OS
      const isIOS = /iphone|ipad|ipod/.test(userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
      const isAndroid = /android/.test(userAgent)

      // Detect device type based on screen width
      const isMobile = width < 768
      const isTablet = width >= 768 && width < 1024
      const isDesktop = width >= 1024

      // Detect screen size
      let screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'lg'
      if (width < 640) screenSize = 'xs'
      else if (width < 768) screenSize = 'sm'
      else if (width < 1024) screenSize = 'md'
      else if (width < 1280) screenSize = 'lg'
      else screenSize = 'xl'

      // Detect orientation
      const orientation = width > height ? 'landscape' : 'portrait'

      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        isIOS,
        isAndroid,
        screenSize,
        orientation
      })
    }

    detectDevice()

    window.addEventListener('resize', detectDevice)
    window.addEventListener('orientationchange', detectDevice)

    return () => {
      window.removeEventListener('resize', detectDevice)
      window.removeEventListener('orientationchange', detectDevice)
    }
  }, [])

  return detection
}

// Hook for handling touch gestures
export function useTouchGestures(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  onSwipeUp?: () => void,
  onSwipeDown?: () => void,
  threshold = 50
) {
  useEffect(() => {
    let touchStartX = 0
    let touchStartY = 0
    let touchEndX = 0
    let touchEndY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
    }

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].clientX
      touchEndY = e.changedTouches[0].clientY
      handleGesture()
    }

    const handleGesture = () => {
      const deltaX = touchEndX - touchStartX
      const deltaY = touchEndY - touchStartY

      // Horizontal swipes
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX > threshold && onSwipeRight) {
          onSwipeRight()
        } else if (deltaX < -threshold && onSwipeLeft) {
          onSwipeLeft()
        }
      }
      // Vertical swipes
      else {
        if (deltaY > threshold && onSwipeDown) {
          onSwipeDown()
        } else if (deltaY < -threshold && onSwipeUp) {
          onSwipeUp()
        }
      }
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold])
}

// Hook for haptic feedback
export function useHapticFeedback() {
  const triggerHaptic = (duration = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration)
    }
  }

  const lightImpact = () => triggerHaptic(10)
  const mediumImpact = () => triggerHaptic(20)
  const heavyImpact = () => triggerHaptic(30)
  const selectionChanged = () => triggerHaptic(5)
  const notificationOccurred = (type: 'success' | 'warning' | 'error') => {
    switch (type) {
      case 'success':
        triggerHaptic(10)
        break
      case 'warning':
        triggerHaptic(20)
        break
      case 'error':
        triggerHaptic([10, 10, 10])
        break
    }
  }

  return {
    lightImpact,
    mediumImpact,
    heavyImpact,
    selectionChanged,
    notificationOccurred
  }
}
