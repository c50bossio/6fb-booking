'use client'

import React, { useRef, useCallback, useEffect, useState } from 'react'
import { useCalendarInteractions } from '@/hooks/useCalendarInteractions'
import { useCalendarHaptics } from '@/hooks/useCalendarHaptics'
import { usePerformanceMonitor } from '@/lib/performance-utils'

interface GestureIndicator {
  id: string
  type: 'swipe' | 'pinch' | 'pan' | 'tap' | 'long-press'
  position: { x: number; y: number }
  progress: number
  direction?: 'up' | 'down' | 'left' | 'right'
  scale?: number
  opacity: number
}

interface CalendarGestureLayerProps {
  children: React.ReactNode
  onSwipeLeft?: (velocity: number) => void
  onSwipeRight?: (velocity: number) => void
  onSwipeUp?: (velocity: number) => void
  onSwipeDown?: (velocity: number) => void
  onPinchIn?: (scale: number, center: { x: number; y: number }) => void
  onPinchOut?: (scale: number, center: { x: number; y: number }) => void
  onDoubleTap?: (position: { x: number; y: number }) => void
  onLongPress?: (position: { x: number; y: number }) => void
  onPan?: (delta: { x: number; y: number }, velocity: { x: number; y: number }) => void
  enableVisualFeedback?: boolean
  enableHapticFeedback?: boolean
  enableGestureHints?: boolean
  swipeThreshold?: number
  longPressDelay?: number
  doubleTapDelay?: number
  className?: string
}

/**
 * Advanced gesture layer for calendar interactions with visual feedback
 * Provides comprehensive touch and mouse gesture recognition with animations
 */
export function CalendarGestureLayer({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinchIn,
  onPinchOut,
  onDoubleTap,
  onLongPress,
  onPan,
  enableVisualFeedback = true,
  enableHapticFeedback = true,
  enableGestureHints = true,
  swipeThreshold = 50,
  longPressDelay = 500,
  doubleTapDelay = 300,
  className = ''
}: CalendarGestureLayerProps) {
  const [indicators, setIndicators] = useState<GestureIndicator[]>([])
  const [showHints, setShowHints] = useState(false)
  const [currentGesture, setCurrentGesture] = useState<string | null>(null)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number>()
  const hintTimeoutRef = useRef<NodeJS.Timeout>()

  const { hapticFeedback, gestureHaptics } = useCalendarHaptics({
    enableHaptics: enableHapticFeedback
  })

  const { trackRender } = usePerformanceMonitor()

  // Create visual indicator for gesture
  const createIndicator = useCallback((
    type: GestureIndicator['type'],
    position: { x: number; y: number },
    extra: Partial<GestureIndicator> = {}
  ): string => {
    const id = `gesture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const indicator: GestureIndicator = {
      id,
      type,
      position,
      progress: 0,
      opacity: 1,
      ...extra
    }

    setIndicators(prev => [...prev, indicator])
    return id
  }, [])

  // Update indicator
  const updateIndicator = useCallback((id: string, updates: Partial<GestureIndicator>) => {
    setIndicators(prev => prev.map(indicator => 
      indicator.id === id ? { ...indicator, ...updates } : indicator
    ))
  }, [])

  // Remove indicator
  const removeIndicator = useCallback((id: string) => {
    setIndicators(prev => prev.filter(indicator => indicator.id !== id))
  }, [])

  // Animate indicators
  useEffect(() => {
    const animate = () => {
      setIndicators(prev => prev.map(indicator => {
        const newOpacity = Math.max(0, indicator.opacity - 0.02)
        const newProgress = Math.min(1, indicator.progress + 0.05)
        
        if (newOpacity <= 0) {
          return { ...indicator, opacity: 0 }
        }
        
        return {
          ...indicator,
          opacity: newOpacity,
          progress: newProgress
        }
      }).filter(indicator => indicator.opacity > 0))

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    if (enableVisualFeedback && indicators.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [indicators.length, enableVisualFeedback])

  // Interaction callbacks with visual feedback
  const interactionCallbacks = {
    onSwipeLeft: (startX: number, endX: number, velocity: number) => {
      if (enableVisualFeedback) {
        const indicatorId = createIndicator('swipe', { x: startX, y: window.innerHeight / 2 }, {
          direction: 'left',
          progress: Math.min(1, (startX - endX) / swipeThreshold)
        })
        
        setTimeout(() => removeIndicator(indicatorId), 1000)
      }
      
      if (enableHapticFeedback) {
        gestureHaptics.swipeEnd(true)
      }
      
      setCurrentGesture('swipe-left')
      onSwipeLeft?.(velocity)
      
      setTimeout(() => setCurrentGesture(null), 500)
    },

    onSwipeRight: (startX: number, endX: number, velocity: number) => {
      if (enableVisualFeedback) {
        const indicatorId = createIndicator('swipe', { x: startX, y: window.innerHeight / 2 }, {
          direction: 'right',
          progress: Math.min(1, (endX - startX) / swipeThreshold)
        })
        
        setTimeout(() => removeIndicator(indicatorId), 1000)
      }
      
      if (enableHapticFeedback) {
        gestureHaptics.swipeEnd(true)
      }
      
      setCurrentGesture('swipe-right')
      onSwipeRight?.(velocity)
      
      setTimeout(() => setCurrentGesture(null), 500)
    },

    onSwipeUp: (startY: number, endY: number, velocity: number) => {
      if (enableVisualFeedback) {
        const indicatorId = createIndicator('swipe', { x: window.innerWidth / 2, y: startY }, {
          direction: 'up',
          progress: Math.min(1, (startY - endY) / swipeThreshold)
        })
        
        setTimeout(() => removeIndicator(indicatorId), 1000)
      }
      
      if (enableHapticFeedback) {
        gestureHaptics.swipeEnd(true)
      }
      
      setCurrentGesture('swipe-up')
      onSwipeUp?.(velocity)
      
      setTimeout(() => setCurrentGesture(null), 500)
    },

    onSwipeDown: (startY: number, endY: number, velocity: number) => {
      if (enableVisualFeedback) {
        const indicatorId = createIndicator('swipe', { x: window.innerWidth / 2, y: startY }, {
          direction: 'down',
          progress: Math.min(1, (endY - startY) / swipeThreshold)
        })
        
        setTimeout(() => removeIndicator(indicatorId), 1000)
      }
      
      if (enableHapticFeedback) {
        gestureHaptics.swipeEnd(true)
      }
      
      setCurrentGesture('swipe-down')
      onSwipeDown?.(velocity)
      
      setTimeout(() => setCurrentGesture(null), 500)
    },

    onPinchStart: (scale: number, center: { x: number; y: number }) => {
      if (enableVisualFeedback) {
        createIndicator('pinch', center, { scale, progress: 0 })
      }
      
      if (enableHapticFeedback) {
        gestureHaptics.pinchStart()
      }
      
      setCurrentGesture('pinch')
    },

    onPinchMove: (scale: number, center: { x: number; y: number }) => {
      if (enableVisualFeedback) {
        setIndicators(prev => prev.map(indicator => 
          indicator.type === 'pinch' ? { ...indicator, scale, position: center } : indicator
        ))
      }
      
      // Determine pinch direction and call appropriate handler
      if (scale > 1.1 && onPinchOut) {
        onPinchOut(scale, center)
      } else if (scale < 0.9 && onPinchIn) {
        onPinchIn(scale, center)
      }
    },

    onPinchEnd: (scale: number, center: { x: number; y: number }) => {
      if (enableHapticFeedback) {
        gestureHaptics.pinchEnd()
      }
      
      // Remove pinch indicators
      setIndicators(prev => prev.filter(indicator => indicator.type !== 'pinch'))
      setCurrentGesture(null)
    },

    onDoubleTap: (position: { x: number; y: number }) => {
      if (enableVisualFeedback) {
        const indicatorId = createIndicator('tap', position, { progress: 1 })
        setTimeout(() => removeIndicator(indicatorId), 500)
        
        // Create second tap indicator
        setTimeout(() => {
          const secondId = createIndicator('tap', position, { progress: 1 })
          setTimeout(() => removeIndicator(secondId), 500)
        }, 100)
      }
      
      if (enableHapticFeedback) {
        gestureHaptics.doubleTap()
      }
      
      setCurrentGesture('double-tap')
      onDoubleTap?.(position)
      
      setTimeout(() => setCurrentGesture(null), 500)
    },

    onLongPress: (position: { x: number; y: number }) => {
      if (enableVisualFeedback) {
        const indicatorId = createIndicator('long-press', position, { progress: 1 })
        setTimeout(() => removeIndicator(indicatorId), 1000)
      }
      
      if (enableHapticFeedback) {
        gestureHaptics.longPressEnd()
      }
      
      setCurrentGesture('long-press')
      onLongPress?.(position)
      
      setTimeout(() => setCurrentGesture(null), 1000)
    }
  }

  // Initialize gesture recognition
  const { handlers, gestureState } = useCalendarInteractions(interactionCallbacks, {
    enableGestures: true,
    enableDragAndDrop: false,
    minimumSwipeDistance: swipeThreshold,
    longPressDelay,
    doubleTapDelay
  })

  // Show gesture hints on first interaction
  const showGestureHints = useCallback(() => {
    if (enableGestureHints && !showHints) {
      setShowHints(true)
      
      hintTimeoutRef.current = setTimeout(() => {
        setShowHints(false)
      }, 3000)
    }
  }, [enableGestureHints, showHints])

  // Handle first touch to show hints
  const handleInteractionStart = useCallback((event: React.TouchEvent | React.MouseEvent) => {
    showGestureHints()
    handlers.onTouchStart?.(event as any)
  }, [showGestureHints, handlers])

  // Track render performance
  useEffect(() => {
    trackRender('CalendarGestureLayer', indicators.length)
  }, [trackRender, indicators.length])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  // Render gesture indicator
  const renderIndicator = useCallback((indicator: GestureIndicator) => {
    const baseClasses = "pointer-events-none absolute transition-all duration-300 z-50"
    
    switch (indicator.type) {
      case 'swipe':
        return (
          <div
            key={indicator.id}
            className={`${baseClasses} flex items-center justify-center`}
            style={{
              left: indicator.position.x - 25,
              top: indicator.position.y - 25,
              opacity: indicator.opacity,
              transform: `scale(${0.5 + indicator.progress * 0.5})`
            }}
          >
            <div className="w-12 h-12 bg-blue-500/30 rounded-full flex items-center justify-center">
              <div className={`w-6 h-6 text-white transform ${
                indicator.direction === 'left' ? 'rotate-180' :
                indicator.direction === 'right' ? 'rotate-0' :
                indicator.direction === 'up' ? 'rotate-90' :
                'rotate-270'
              }`}>
                →
              </div>
            </div>
          </div>
        )
        
      case 'pinch':
        return (
          <div
            key={indicator.id}
            className={`${baseClasses} flex items-center justify-center`}
            style={{
              left: indicator.position.x - 30,
              top: indicator.position.y - 30,
              opacity: indicator.opacity,
              transform: `scale(${indicator.scale || 1})`
            }}
          >
            <div className="w-16 h-16 border-4 border-blue-500/40 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-500/30 rounded-full animate-pulse"></div>
            </div>
          </div>
        )
        
      case 'tap':
        return (
          <div
            key={indicator.id}
            className={`${baseClasses} flex items-center justify-center`}
            style={{
              left: indicator.position.x - 20,
              top: indicator.position.y - 20,
              opacity: indicator.opacity
            }}
          >
            <div className="w-10 h-10 bg-blue-500/40 rounded-full animate-ping"></div>
          </div>
        )
        
      case 'long-press':
        return (
          <div
            key={indicator.id}
            className={`${baseClasses} flex items-center justify-center`}
            style={{
              left: indicator.position.x - 25,
              top: indicator.position.y - 25,
              opacity: indicator.opacity
            }}
          >
            <div className="w-12 h-12 border-4 border-orange-500/40 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 bg-orange-500/30 rounded-full animate-pulse"></div>
            </div>
          </div>
        )
        
      default:
        return null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={`calendar-gesture-layer relative ${className}`}
      onTouchStart={handleInteractionStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
      onMouseDown={handleInteractionStart}
    >
      {children}
      
      {/* Visual indicators */}
      {enableVisualFeedback && (
        <div className="gesture-indicators">
          {indicators.map(renderIndicator)}
        </div>
      )}
      
      {/* Current gesture indicator */}
      {currentGesture && enableVisualFeedback && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-medium animate-fade-in-out">
          {currentGesture.replace('-', ' ').toUpperCase()}
        </div>
      )}
      
      {/* Gesture hints overlay */}
      {showHints && enableGestureHints && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-sm mx-4 text-center">
            <h3 className="text-lg font-semibold mb-4">Calendar Gestures</h3>
            
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-center justify-between">
                <span>Swipe left/right</span>
                <span className="text-blue-600 dark:text-blue-400">Navigate dates</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Swipe up/down</span>
                <span className="text-blue-600 dark:text-blue-400">Navigate weeks</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Pinch in/out</span>
                <span className="text-blue-600 dark:text-blue-400">Change view</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Double tap</span>
                <span className="text-blue-600 dark:text-blue-400">Quick create</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span>Long press</span>
                <span className="text-blue-600 dark:text-blue-400">Show details</span>
              </div>
            </div>
            
            <button
              onClick={() => setShowHints(false)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
      
      {/* Debug gesture state (development only) */}
      {process.env.NODE_ENV === 'development' && gestureState.isGesturing && (
        <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-50">
          <div>Type: {gestureState.gestureType}</div>
          <div>Scale: {gestureState.scale.toFixed(2)}</div>
          <div>Velocity: {Math.round(Math.sqrt(
            gestureState.velocity.x ** 2 + gestureState.velocity.y ** 2
          ))} px/s</div>
        </div>
      )}
    </div>
  )
}

export default CalendarGestureLayer