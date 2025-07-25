'use client'

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react'
import { addDays, addWeeks, addMonths, format, isSameDay } from 'date-fns'
import { 
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  ViewColumnsIcon,
  Squares2X2Icon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  HandRaisedIcon,
  DevicePhoneMobileIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useCalendar, CalendarView } from '@/contexts/CalendarContext'
import { cn } from '@/lib/utils'

interface TouchEvent {
  clientX: number
  clientY: number
  timeStamp: number
}

interface GestureState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  startTime: number
  direction: 'left' | 'right' | 'up' | 'down' | null
  velocity: number
  isLongPress: boolean
  scale: number
  startScale: number
}

interface MobileGestureManagerProps {
  children: React.ReactNode
  className?: string
  enableSwipeNavigation?: boolean
  enablePinchZoom?: boolean
  enableLongPress?: boolean
  enablePullToRefresh?: boolean
  swipeThreshold?: number
  longPressThreshold?: number
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onLongPress?: (x: number, y: number) => void
  onPinchZoom?: (scale: number) => void
  onPullToRefresh?: () => void
}

export default function MobileGestureManager({
  children,
  className,
  enableSwipeNavigation = true,
  enablePinchZoom = true,
  enableLongPress = true,
  enablePullToRefresh = true,
  swipeThreshold = 50,
  longPressThreshold = 500,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onLongPress,
  onPinchZoom,
  onPullToRefresh
}: MobileGestureManagerProps) {
  const { state, actions } = useCalendar()
  const containerRef = useRef<HTMLDivElement>(null)
  const gestureStateRef = useRef<GestureState | null>(null)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  
  const [isGesturing, setIsGesturing] = useState(false)
  const [gestureVisual, setGestureVisual] = useState<{
    type: 'swipe' | 'longpress' | 'pinch' | null
    progress: number
    direction?: string
  }>({ type: null, progress: 0 })

  // Enhanced touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single finger - prepare for swipe or long press
      const touch = e.touches[0]
      gestureStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        startTime: e.timeStamp,
        direction: null,
        velocity: 0,
        isLongPress: false,
        scale: 1,
        startScale: 1
      }

      setIsGesturing(true)
      
      // Start long press detection
      if (enableLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          if (gestureStateRef.current) {
            gestureStateRef.current.isLongPress = true
            setGestureVisual({ type: 'longpress', progress: 100 })
            onLongPress?.(touch.clientX, touch.clientY)
            navigator.vibrate?.(50) // Haptic feedback if available
          }
        }, longPressThreshold)
      }
    } else if (e.touches.length === 2 && enablePinchZoom) {
      // Two fingers - pinch to zoom
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      gestureStateRef.current = {
        startX: (touch1.clientX + touch2.clientX) / 2,
        startY: (touch1.clientY + touch2.clientY) / 2,
        currentX: (touch1.clientX + touch2.clientX) / 2,
        currentY: (touch1.clientY + touch2.clientY) / 2,
        startTime: e.timeStamp,
        direction: null,
        velocity: 0,
        isLongPress: false,
        scale: 1,
        startScale: distance
      }
      
      setGestureVisual({ type: 'pinch', progress: 0 })
    }

    // Clear any existing long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
    }
  }, [enableLongPress, enablePinchZoom, longPressThreshold, onLongPress])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!gestureStateRef.current) return

    if (e.touches.length === 1) {
      // Single finger movement
      const touch = e.touches[0]
      const currentState = gestureStateRef.current
      
      currentState.currentX = touch.clientX
      currentState.currentY = touch.clientY
      
      const deltaX = currentState.currentX - currentState.startX
      const deltaY = currentState.currentY - currentState.startY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      const timeDelta = e.timeStamp - currentState.startTime
      
      // Calculate velocity
      currentState.velocity = distance / (timeDelta || 1)
      
      // Determine direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        currentState.direction = deltaX > 0 ? 'right' : 'left'
      } else {
        currentState.direction = deltaY > 0 ? 'down' : 'up'
      }
      
      // Cancel long press if moved too much
      if (distance > 10 && longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      
      // Update visual feedback for swipe
      if (enableSwipeNavigation && distance > 10) {
        const progress = Math.min(distance / swipeThreshold, 1) * 100
        setGestureVisual({ 
          type: 'swipe', 
          progress, 
          direction: currentState.direction 
        })
      }
      
    } else if (e.touches.length === 2 && enablePinchZoom) {
      // Two finger pinch
      const touch1 = e.touches[0]
      const touch2 = e.touches[1]
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      )
      
      if (gestureStateRef.current.startScale > 0) {
        const scale = distance / gestureStateRef.current.startScale
        gestureStateRef.current.scale = scale
        
        const progress = Math.abs(scale - 1) * 100
        setGestureVisual({ type: 'pinch', progress })
        
        onPinchZoom?.(scale)
      }
    }
  }, [enableSwipeNavigation, enablePinchZoom, swipeThreshold, onPinchZoom])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!gestureStateRef.current) return

    const currentState = gestureStateRef.current
    const deltaX = currentState.currentX - currentState.startX
    const deltaY = currentState.currentY - currentState.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    
    // Handle swipe gestures
    if (enableSwipeNavigation && !currentState.isLongPress && distance > swipeThreshold) {
      if (currentState.direction === 'left') {
        onSwipeLeft?.()
        handleDefaultSwipeLeft()
      } else if (currentState.direction === 'right') {
        onSwipeRight?.()
        handleDefaultSwipeRight()
      } else if (currentState.direction === 'up') {
        onSwipeUp?.()
        handleDefaultSwipeUp()
      } else if (currentState.direction === 'down') {
        onSwipeDown?.()
        handleDefaultSwipeDown()
      }
      
      // Haptic feedback for successful swipe
      navigator.vibrate?.(30)
    }
    
    // Reset state
    gestureStateRef.current = null
    setIsGesturing(false)
    setGestureVisual({ type: null, progress: 0 })
  }, [enableSwipeNavigation, swipeThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown])

  // Default swipe handlers
  const handleDefaultSwipeLeft = useCallback(() => {
    const newDate = (() => {
      switch (state.view) {
        case 'day': return addDays(state.currentDate, 1)
        case 'week': return addWeeks(state.currentDate, 1)
        case 'month': return addMonths(state.currentDate, 1)
        default: return addDays(state.currentDate, 1)
      }
    })()
    actions.setDate(newDate)
  }, [state.view, state.currentDate, actions])

  const handleDefaultSwipeRight = useCallback(() => {
    const newDate = (() => {
      switch (state.view) {
        case 'day': return addDays(state.currentDate, -1)
        case 'week': return addWeeks(state.currentDate, -1)
        case 'month': return addMonths(state.currentDate, -1)
        default: return addDays(state.currentDate, -1)
      }
    })()
    actions.setDate(newDate)
  }, [state.view, state.currentDate, actions])

  const handleDefaultSwipeUp = useCallback(() => {
    // Swipe up to switch to more detailed view
    if (state.view === 'month') {
      actions.setView('week')
    } else if (state.view === 'week') {
      actions.setView('day')
    }
  }, [state.view, actions])

  const handleDefaultSwipeDown = useCallback(() => {
    // Swipe down to switch to less detailed view or refresh
    if (state.view === 'day') {
      actions.setView('week')
    } else if (state.view === 'week') {
      actions.setView('month')
    } else if (enablePullToRefresh) {
      onPullToRefresh?.()
      window.location.reload()
    }
  }, [state.view, actions, enablePullToRefresh, onPullToRefresh])

  // Prevent default touch behaviors
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const preventDefault = (e: Event) => {
      if (isGesturing) {
        e.preventDefault()
      }
    }

    container.addEventListener('touchmove', preventDefault, { passive: false })
    return () => container.removeEventListener('touchmove', preventDefault)
  }, [isGesturing])

  // Gesture visual feedback component
  const GestureVisualFeedback = useMemo(() => {
    if (gestureVisual.type === null || gestureVisual.progress === 0) return null

    const getGestureIcon = () => {
      switch (gestureVisual.type) {
        case 'swipe':
          switch (gestureVisual.direction) {
            case 'left': return <ChevronLeftIcon className="h-6 w-6" />
            case 'right': return <ChevronRightIcon className="h-6 w-6" />
            case 'up': return <MagnifyingGlassPlusIcon className="h-6 w-6" />
            case 'down': return <MagnifyingGlassMinusIcon className="h-6 w-6" />
            default: return <HandRaisedIcon className="h-6 w-6" />
          }
        case 'longpress':
          return <HandRaisedIcon className="h-6 w-6" />
        case 'pinch':
          return <MagnifyingGlassMinusIcon className="h-6 w-6" />
        default:
          return <HandRaisedIcon className="h-6 w-6" />
      }
    }

    const getGestureText = () => {
      switch (gestureVisual.type) {
        case 'swipe':
          switch (gestureVisual.direction) {
            case 'left': return `Next ${state.view}`
            case 'right': return `Previous ${state.view}`
            case 'up': return 'Zoom in'
            case 'down': return 'Zoom out'
            default: return 'Swipe gesture'
          }
        case 'longpress':
          return 'Long press action'
        case 'pinch':
          return 'Pinch to zoom'
        default:
          return 'Gesture'
      }
    }

    return (
      <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
        <Card className="bg-black/75 border-0 text-white">
          <CardContent className="p-4 flex items-center space-x-3">
            {getGestureIcon()}
            <div>
              <div className="font-medium">{getGestureText()}</div>
              <div className="w-32 h-2 bg-white/20 rounded-full mt-1">
                <div 
                  className="h-2 bg-white rounded-full transition-all duration-100"
                  style={{ width: `${gestureVisual.progress}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }, [gestureVisual, state.view])

  return (
    <div
      ref={containerRef}
      className={cn("relative touch-pan-y", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
      
      {GestureVisualFeedback}
      
      {/* Mobile gesture hints */}
      <MobileGestureHints 
        view={state.view}
        className="fixed bottom-4 right-4 z-40"
      />
    </div>
  )
}

// Mobile gesture hints component
function MobileGestureHints({ 
  view, 
  className 
}: { 
  view: CalendarView
  className?: string 
}) {
  const [showHints, setShowHints] = useState(false)

  const gestureHints = useMemo(() => [
    { icon: ChevronLeftIcon, text: 'Swipe left for next', subtext: view },
    { icon: ChevronRightIcon, text: 'Swipe right for previous', subtext: view },
    { icon: MagnifyingGlassPlusIcon, text: 'Swipe up for detailed view', subtext: 'zoom in' },
    { icon: MagnifyingGlassMinusIcon, text: 'Swipe down for overview', subtext: 'zoom out' },
    { icon: HandRaisedIcon, text: 'Long press for actions', subtext: 'context menu' }
  ], [view])

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn("md:hidden bg-white/90 backdrop-blur-sm", className)}
        onClick={() => setShowHints(!showHints)}
      >
        <DevicePhoneMobileIcon className="h-4 w-4" />
      </Button>
      
      {showHints && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="max-w-sm w-full">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Touch Gestures</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowHints(false)}
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-3">
                {gestureHints.map((hint, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <hint.icon className="h-5 w-5 text-gray-600" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{hint.text}</div>
                      <div className="text-xs text-gray-600 capitalize">{hint.subtext}</div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-blue-800">
                  <strong>Tip:</strong> These gestures work throughout the calendar for quick navigation
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}

// Hook for using gesture events in other components
export function useCalendarGestures() {
  const { state, actions } = useCalendar()
  
  return {
    // Navigation helpers
    navigateNext: useCallback(() => {
      const newDate = (() => {
        switch (state.view) {
          case 'day': return addDays(state.currentDate, 1)
          case 'week': return addWeeks(state.currentDate, 1)
          case 'month': return addMonths(state.currentDate, 1)
          default: return addDays(state.currentDate, 1)
        }
      })()
      actions.setDate(newDate)
    }, [state.view, state.currentDate, actions]),
    
    navigatePrevious: useCallback(() => {
      const newDate = (() => {
        switch (state.view) {
          case 'day': return addDays(state.currentDate, -1)
          case 'week': return addWeeks(state.currentDate, -1)
          case 'month': return addMonths(state.currentDate, -1)
          default: return addDays(state.currentDate, -1)
        }
      })()
      actions.setDate(newDate)
    }, [state.view, state.currentDate, actions]),
    
    zoomIn: useCallback(() => {
      if (state.view === 'month') {
        actions.setView('week')
      } else if (state.view === 'week') {
        actions.setView('day')
      }
    }, [state.view, actions]),
    
    zoomOut: useCallback(() => {
      if (state.view === 'day') {
        actions.setView('week')
      } else if (state.view === 'week') {
        actions.setView('month')
      }
    }, [state.view, actions]),
    
    // Current state
    view: state.view,
    currentDate: state.currentDate
  }
}

// Component for gesture-aware calendar controls
export function MobileCalendarControls({ className }: { className?: string }) {
  const { navigateNext, navigatePrevious, zoomIn, zoomOut, view } = useCalendarGestures()
  
  return (
    <div className={cn("flex items-center space-x-2 md:hidden", className)}>
      <Button variant="outline" size="sm" onClick={navigatePrevious}>
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>
      
      <Button variant="outline" size="sm" onClick={zoomOut}>
        <MagnifyingGlassMinusIcon className="h-4 w-4" />
      </Button>
      
      <Badge variant="outline" className="capitalize">
        {view}
      </Badge>
      
      <Button variant="outline" size="sm" onClick={zoomIn}>
        <MagnifyingGlassPlusIcon className="h-4 w-4" />
      </Button>
      
      <Button variant="outline" size="sm" onClick={navigateNext}>
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  )
}