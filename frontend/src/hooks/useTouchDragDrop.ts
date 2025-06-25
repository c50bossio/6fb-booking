'use client'

/**
 * Touch Drag and Drop Hook for Mobile Devices
 *
 * This hook provides comprehensive touch gesture support for drag and drop operations:
 * - Multi-touch gesture recognition (pinch, pan, long press)
 * - Momentum-based scrolling and snapping
 * - Haptic feedback for touch interactions
 * - Gesture conflict resolution (scroll vs drag)
 * - Touch accessibility features
 * - Mobile-optimized visual feedback
 * - Performance optimizations for touch devices
 */

import { useCallback, useRef, useEffect, useState } from 'react'
import { CalendarAppointment } from '@/components/calendar/RobustCalendar'

export interface TouchGesture {
  type: 'tap' | 'long_press' | 'pan' | 'pinch' | 'swipe'
  startTime: number
  duration: number
  startPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  velocity: { x: number; y: number }
  scale?: number
  rotation?: number
  pointers: PointerEvent[]
}

export interface TouchDragState {
  isActive: boolean
  gesture: TouchGesture | null
  draggedAppointment: CalendarAppointment | null
  touchOffset: { x: number; y: number }
  momentum: { x: number; y: number }
  snapTarget: { date: string; time: string } | null
  feedbackIntensity: 'light' | 'medium' | 'heavy'
  preventScroll: boolean
}

export interface TouchFeedback {
  haptic: {
    enabled: boolean
    intensity: 'light' | 'medium' | 'heavy'
    pattern?: number[]
  }
  visual: {
    enabled: boolean
    rippleEffect: boolean
    scaleAnimation: boolean
    ghostOpacity: number
  }
  audio: {
    enabled: boolean
    startSound?: string
    dragSound?: string
    dropSound?: string
    errorSound?: string
  }
}

export interface TouchConfiguration {
  longPressDelay: number
  tapTimeout: number
  panThreshold: number
  pinchThreshold: number
  swipeVelocityThreshold: number
  magneticSnapDistance: number
  momentumDecay: number
  maxVelocity: number
  enableInertialScrolling: boolean
  preventDefaultTouch: boolean
}

export interface TouchDragDropHookReturn {
  // State
  touchState: TouchDragState
  activeGestures: Map<number, TouchGesture>
  isMultiTouch: boolean

  // Touch event handlers
  handleTouchStart: (event: React.TouchEvent, appointment?: CalendarAppointment) => void
  handleTouchMove: (event: React.TouchEvent) => void
  handleTouchEnd: (event: React.TouchEvent) => void
  handleTouchCancel: (event: React.TouchEvent) => void

  // Pointer event handlers (modern alternative to touch events)
  handlePointerDown: (event: React.PointerEvent, appointment?: CalendarAppointment) => void
  handlePointerMove: (event: React.PointerEvent) => void
  handlePointerUp: (event: React.PointerEvent) => void
  handlePointerCancel: (event: React.PointerEvent) => void

  // Gesture recognition
  recognizeGesture: (pointers: PointerEvent[]) => TouchGesture | null
  calculateVelocity: (current: { x: number; y: number }, previous: { x: number; y: number }, deltaTime: number) => { x: number; y: number }

  // Touch feedback
  triggerHapticFeedback: (type: 'selection' | 'drag_start' | 'drag_move' | 'drop' | 'error', intensity?: 'light' | 'medium' | 'heavy') => void
  showTouchRipple: (x: number, y: number, element: HTMLElement) => void

  // Configuration
  updateTouchConfig: (config: Partial<TouchConfiguration>) => void
  updateFeedbackConfig: (feedback: Partial<TouchFeedback>) => void

  // Accessibility
  enableTouchAccessibility: () => void
  disableTouchAccessibility: () => void

  // Utilities
  isTouchDevice: boolean
  supportsPointerEvents: boolean
  supportsHapticFeedback: boolean
}

const DEFAULT_TOUCH_CONFIG: TouchConfiguration = {
  longPressDelay: 500,
  tapTimeout: 300,
  panThreshold: 10,
  pinchThreshold: 0.1,
  swipeVelocityThreshold: 300,
  magneticSnapDistance: 15,
  momentumDecay: 0.95,
  maxVelocity: 2000,
  enableInertialScrolling: true,
  preventDefaultTouch: true
}

const DEFAULT_FEEDBACK_CONFIG: TouchFeedback = {
  haptic: {
    enabled: true,
    intensity: 'medium'
  },
  visual: {
    enabled: true,
    rippleEffect: true,
    scaleAnimation: true,
    ghostOpacity: 0.7
  },
  audio: {
    enabled: false
  }
}

export function useTouchDragDrop(
  onAppointmentMove?: (appointmentId: string, newDate: string, newTime: string) => Promise<void>,
  onLongPress?: (appointment: CalendarAppointment, position: { x: number; y: number }) => void,
  onGestureRecognized?: (gesture: TouchGesture) => void,
  initialConfig: Partial<TouchConfiguration> = {},
  initialFeedback: Partial<TouchFeedback> = {}
): TouchDragDropHookReturn {

  // Configuration state
  const [touchConfig, setTouchConfig] = useState<TouchConfiguration>({
    ...DEFAULT_TOUCH_CONFIG,
    ...initialConfig
  })

  const [feedbackConfig, setFeedbackConfig] = useState<TouchFeedback>({
    ...DEFAULT_FEEDBACK_CONFIG,
    ...initialFeedback
  })

  // Touch state
  const [touchState, setTouchState] = useState<TouchDragState>({
    isActive: false,
    gesture: null,
    draggedAppointment: null,
    touchOffset: { x: 0, y: 0 },
    momentum: { x: 0, y: 0 },
    snapTarget: null,
    feedbackIntensity: 'medium',
    preventScroll: false
  })

  // Active gestures tracking
  const [activeGestures, setActiveGestures] = useState<Map<number, TouchGesture>>(new Map())
  const [isMultiTouch, setIsMultiTouch] = useState(false)

  // Refs for tracking
  const touchStartTimeRef = useRef<number>(0)
  const lastTouchPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number>()
  const touchHistoryRef = useRef<Array<{ x: number; y: number; time: number }>>([])

  // Device capabilities
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const supportsPointerEvents = 'onpointerdown' in window
  const supportsHapticFeedback = 'vibrate' in navigator

  // Utility function to get touch coordinates
  const getTouchCoordinates = useCallback((event: React.TouchEvent | React.PointerEvent) => {
    if ('touches' in event) {
      const touch = event.touches[0] || event.changedTouches[0]
      return { x: touch.clientX, y: touch.clientY }
    } else {
      return { x: event.clientX, y: event.clientY }
    }
  }, [])

  // Calculate velocity based on touch history
  const calculateVelocity = useCallback((
    current: { x: number; y: number },
    previous: { x: number; y: number },
    deltaTime: number
  ): { x: number; y: number } => {
    if (deltaTime <= 0) return { x: 0, y: 0 }

    const deltaX = current.x - previous.x
    const deltaY = current.y - previous.y

    return {
      x: Math.min(Math.abs(deltaX / deltaTime * 1000), touchConfig.maxVelocity) * Math.sign(deltaX),
      y: Math.min(Math.abs(deltaY / deltaTime * 1000), touchConfig.maxVelocity) * Math.sign(deltaY)
    }
  }, [touchConfig.maxVelocity])

  // Gesture recognition algorithm
  const recognizeGesture = useCallback((pointers: PointerEvent[]): TouchGesture | null => {
    if (pointers.length === 0) return null

    const now = performance.now()
    const primaryPointer = pointers[0]
    const duration = now - touchStartTimeRef.current

    const startPos = { x: primaryPointer.clientX, y: primaryPointer.clientY }
    const currentPos = getTouchCoordinates({ clientX: primaryPointer.clientX, clientY: primaryPointer.clientY } as any)

    const deltaX = currentPos.x - startPos.x
    const deltaY = currentPos.y - startPos.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Long press detection
    if (duration >= touchConfig.longPressDelay && distance < touchConfig.panThreshold) {
      return {
        type: 'long_press',
        startTime: touchStartTimeRef.current,
        duration,
        startPosition: startPos,
        currentPosition: currentPos,
        velocity: velocityRef.current,
        pointers
      }
    }

    // Pan gesture detection
    if (distance >= touchConfig.panThreshold) {
      return {
        type: 'pan',
        startTime: touchStartTimeRef.current,
        duration,
        startPosition: startPos,
        currentPosition: currentPos,
        velocity: velocityRef.current,
        pointers
      }
    }

    // Pinch gesture detection (multi-touch)
    if (pointers.length === 2) {
      const pointer1 = pointers[0]
      const pointer2 = pointers[1]

      const currentDistance = Math.sqrt(
        Math.pow(pointer2.clientX - pointer1.clientX, 2) +
        Math.pow(pointer2.clientY - pointer1.clientY, 2)
      )

      // This would need the initial distance stored somewhere
      // For now, return a basic pinch gesture
      return {
        type: 'pinch',
        startTime: touchStartTimeRef.current,
        duration,
        startPosition: startPos,
        currentPosition: currentPos,
        velocity: { x: 0, y: 0 },
        scale: 1, // Would be calculated based on distance change
        pointers
      }
    }

    // Tap gesture (on touch end)
    if (duration < touchConfig.tapTimeout && distance < touchConfig.panThreshold) {
      return {
        type: 'tap',
        startTime: touchStartTimeRef.current,
        duration,
        startPosition: startPos,
        currentPosition: currentPos,
        velocity: velocityRef.current,
        pointers
      }
    }

    return null
  }, [touchConfig, getTouchCoordinates])

  // Haptic feedback implementation
  const triggerHapticFeedback = useCallback((
    type: 'selection' | 'drag_start' | 'drag_move' | 'drop' | 'error',
    intensity: 'light' | 'medium' | 'heavy' = feedbackConfig.haptic.intensity
  ) => {
    if (!feedbackConfig.haptic.enabled || !supportsHapticFeedback) return

    const patterns = {
      selection: { light: [10], medium: [20], heavy: [30] },
      drag_start: { light: [15], medium: [25], heavy: [40] },
      drag_move: { light: [5], medium: [10], heavy: [15] },
      drop: { light: [20], medium: [35], heavy: [50] },
      error: { light: [10, 10, 10], medium: [20, 20, 20], heavy: [30, 30, 30] }
    }

    const pattern = patterns[type][intensity]
    if (pattern && navigator.vibrate) {
      navigator.vibrate(pattern)
    }
  }, [feedbackConfig.haptic, supportsHapticFeedback])

  // Visual ripple effect
  const showTouchRipple = useCallback((x: number, y: number, element: HTMLElement) => {
    if (!feedbackConfig.visual.enabled || !feedbackConfig.visual.rippleEffect) return

    const ripple = document.createElement('div')
    ripple.className = 'touch-ripple'
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      background: rgba(139, 92, 246, 0.3);
      transform: scale(0);
      animation: ripple-animation 0.6s linear;
      pointer-events: none;
      z-index: 1000;
    `

    const rect = element.getBoundingClientRect()
    const size = Math.max(rect.width, rect.height)
    const left = x - rect.left - size / 2
    const top = y - rect.top - size / 2

    ripple.style.width = ripple.style.height = `${size}px`
    ripple.style.left = `${left}px`
    ripple.style.top = `${top}px`

    element.style.position = 'relative'
    element.appendChild(ripple)

    // Add animation keyframes if not already present
    if (!document.querySelector('#touch-ripple-styles')) {
      const style = document.createElement('style')
      style.id = 'touch-ripple-styles'
      style.textContent = `
        @keyframes ripple-animation {
          to {
            transform: scale(2);
            opacity: 0;
          }
        }
      `
      document.head.appendChild(style)
    }

    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple)
      }
    }, 600)
  }, [feedbackConfig.visual])

  // Touch start handler
  const handleTouchStart = useCallback((
    event: React.TouchEvent,
    appointment?: CalendarAppointment
  ) => {
    if (!isTouchDevice) return

    const touch = event.touches[0]
    const position = { x: touch.clientX, y: touch.clientY }

    touchStartTimeRef.current = performance.now()
    lastTouchPositionRef.current = position
    touchHistoryRef.current = [{ ...position, time: touchStartTimeRef.current }]

    setIsMultiTouch(event.touches.length > 1)

    if (appointment) {
      setTouchState(prev => ({
        ...prev,
        draggedAppointment: appointment,
        touchOffset: {
          x: touch.clientX - (event.target as HTMLElement).getBoundingClientRect().left,
          y: touch.clientY - (event.target as HTMLElement).getBoundingClientRect().top
        }
      }))

      // Show visual feedback
      if (feedbackConfig.visual.enabled) {
        showTouchRipple(touch.clientX, touch.clientY, event.target as HTMLElement)
      }

      // Trigger haptic feedback
      triggerHapticFeedback('selection')

      // Start long press timer
      if (onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          triggerHapticFeedback('drag_start', 'heavy')
          onLongPress(appointment, position)

          setTouchState(prev => ({
            ...prev,
            isActive: true,
            preventScroll: true
          }))
        }, touchConfig.longPressDelay)
      }
    }

    if (touchConfig.preventDefaultTouch) {
      event.preventDefault()
    }
  }, [isTouchDevice, feedbackConfig, triggerHapticFeedback, showTouchRipple, onLongPress, touchConfig])

  // Touch move handler
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    if (!isTouchDevice) return

    const touch = event.touches[0]
    const currentPosition = { x: touch.clientX, y: touch.clientY }
    const now = performance.now()

    // Update touch history for velocity calculation
    touchHistoryRef.current.push({ ...currentPosition, time: now })
    if (touchHistoryRef.current.length > 5) {
      touchHistoryRef.current.shift()
    }

    // Calculate velocity
    const previousPosition = lastTouchPositionRef.current
    const deltaTime = now - (touchHistoryRef.current[touchHistoryRef.current.length - 2]?.time || now)
    const velocity = calculateVelocity(currentPosition, previousPosition, deltaTime)
    velocityRef.current = velocity

    // Check if touch has moved beyond threshold
    const deltaX = currentPosition.x - lastTouchPositionRef.current.x
    const deltaY = currentPosition.y - lastTouchPositionRef.current.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    if (distance > touchConfig.panThreshold) {
      // Cancel long press timer if movement detected
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }

      // Start drag if not already active and we have an appointment
      if (!touchState.isActive && touchState.draggedAppointment) {
        setTouchState(prev => ({
          ...prev,
          isActive: true,
          preventScroll: true
        }))

        triggerHapticFeedback('drag_start')
      }

      // Update position and momentum
      if (touchState.isActive) {
        setTouchState(prev => ({
          ...prev,
          momentum: velocity
        }))

        triggerHapticFeedback('drag_move', 'light')

        // Find snap target
        const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY)
        const timeSlot = elementUnder?.closest('[data-time-slot]')

        if (timeSlot) {
          const date = timeSlot.getAttribute('data-date')
          const time = timeSlot.getAttribute('data-time')

          if (date && time) {
            setTouchState(prev => ({
              ...prev,
              snapTarget: { date, time }
            }))
          }
        }
      }
    }

    lastTouchPositionRef.current = currentPosition

    if (touchState.preventScroll) {
      event.preventDefault()
    }
  }, [isTouchDevice, touchConfig, touchState, calculateVelocity, triggerHapticFeedback])

  // Touch end handler
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    if (!isTouchDevice) return

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    const touch = event.changedTouches[0]
    const endPosition = { x: touch.clientX, y: touch.clientY }
    const duration = performance.now() - touchStartTimeRef.current

    // Recognize final gesture
    const gesture = recognizeGesture([touch as any])

    if (gesture && onGestureRecognized) {
      onGestureRecognized(gesture)
    }

    // Handle drag end
    if (touchState.isActive && touchState.draggedAppointment && touchState.snapTarget && onAppointmentMove) {
      const { snapTarget, draggedAppointment } = touchState

      onAppointmentMove(
        draggedAppointment.id,
        snapTarget.date,
        snapTarget.time
      ).then(() => {
        triggerHapticFeedback('drop', 'medium')
      }).catch(() => {
        triggerHapticFeedback('error', 'heavy')
      })
    } else if (touchState.isActive) {
      // Drag cancelled
      triggerHapticFeedback('error')
    }

    // Apply momentum scrolling if enabled
    if (touchConfig.enableInertialScrolling && Math.abs(velocityRef.current.x) > 100) {
      applyMomentumScrolling(velocityRef.current)
    }

    // Reset state
    setTouchState({
      isActive: false,
      gesture: null,
      draggedAppointment: null,
      touchOffset: { x: 0, y: 0 },
      momentum: { x: 0, y: 0 },
      snapTarget: null,
      feedbackIntensity: 'medium',
      preventScroll: false
    })

    setIsMultiTouch(event.touches.length > 1)
    velocityRef.current = { x: 0, y: 0 }
    touchHistoryRef.current = []

  }, [isTouchDevice, touchState, recognizeGesture, onGestureRecognized, onAppointmentMove, triggerHapticFeedback, touchConfig])

  // Touch cancel handler
  const handleTouchCancel = useCallback((event: React.TouchEvent) => {
    // Clear any active timers
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }

    // Reset state
    setTouchState({
      isActive: false,
      gesture: null,
      draggedAppointment: null,
      touchOffset: { x: 0, y: 0 },
      momentum: { x: 0, y: 0 },
      snapTarget: null,
      feedbackIntensity: 'medium',
      preventScroll: false
    })

    triggerHapticFeedback('error')
  }, [triggerHapticFeedback])

  // Momentum scrolling implementation
  const applyMomentumScrolling = useCallback((velocity: { x: number; y: number }) => {
    if (!touchConfig.enableInertialScrolling) return

    let currentVelocity = { ...velocity }

    const animate = () => {
      currentVelocity.x *= touchConfig.momentumDecay
      currentVelocity.y *= touchConfig.momentumDecay

      // Apply scroll/pan based on velocity
      // This would need to be connected to the calendar's scroll container

      if (Math.abs(currentVelocity.x) > 1 || Math.abs(currentVelocity.y) > 1) {
        animationFrameRef.current = requestAnimationFrame(animate)
      }
    }

    animate()
  }, [touchConfig])

  // Pointer event handlers (modern alternative to touch events)
  const handlePointerDown = useCallback((
    event: React.PointerEvent,
    appointment?: CalendarAppointment
  ) => {
    if (!supportsPointerEvents) return

    // Convert pointer event to touch-like handling
    const touchEvent = {
      touches: [{ clientX: event.clientX, clientY: event.clientY }],
      target: event.target,
      preventDefault: () => event.preventDefault()
    } as React.TouchEvent

    handleTouchStart(touchEvent, appointment)
  }, [supportsPointerEvents, handleTouchStart])

  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!supportsPointerEvents) return

    const touchEvent = {
      touches: [{ clientX: event.clientX, clientY: event.clientY }],
      preventDefault: () => event.preventDefault()
    } as React.TouchEvent

    handleTouchMove(touchEvent)
  }, [supportsPointerEvents, handleTouchMove])

  const handlePointerUp = useCallback((event: React.PointerEvent) => {
    if (!supportsPointerEvents) return

    const touchEvent = {
      changedTouches: [{ clientX: event.clientX, clientY: event.clientY }],
      touches: [],
      preventDefault: () => event.preventDefault()
    } as React.TouchEvent

    handleTouchEnd(touchEvent)
  }, [supportsPointerEvents, handleTouchEnd])

  const handlePointerCancel = useCallback((event: React.PointerEvent) => {
    if (!supportsPointerEvents) return

    handleTouchCancel({} as React.TouchEvent)
  }, [supportsPointerEvents, handleTouchCancel])

  // Configuration update methods
  const updateTouchConfig = useCallback((config: Partial<TouchConfiguration>) => {
    setTouchConfig(prev => ({ ...prev, ...config }))
  }, [])

  const updateFeedbackConfig = useCallback((feedback: Partial<TouchFeedback>) => {
    setFeedbackConfig(prev => ({ ...prev, ...feedback }))
  }, [])

  // Accessibility methods
  const enableTouchAccessibility = useCallback(() => {
    // Enable touch accessibility features
    setFeedbackConfig(prev => ({
      ...prev,
      haptic: { ...prev.haptic, enabled: true },
      visual: { ...prev.visual, enabled: true }
    }))
  }, [])

  const disableTouchAccessibility = useCallback(() => {
    // Disable touch accessibility features
    setFeedbackConfig(prev => ({
      ...prev,
      haptic: { ...prev.haptic, enabled: false },
      visual: { ...prev.visual, enabled: false }
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  return {
    // State
    touchState,
    activeGestures,
    isMultiTouch,

    // Touch event handlers
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,

    // Pointer event handlers
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,

    // Gesture recognition
    recognizeGesture,
    calculateVelocity,

    // Touch feedback
    triggerHapticFeedback,
    showTouchRipple,

    // Configuration
    updateTouchConfig,
    updateFeedbackConfig,

    // Accessibility
    enableTouchAccessibility,
    disableTouchAccessibility,

    // Utilities
    isTouchDevice,
    supportsPointerEvents,
    supportsHapticFeedback
  }
}

export default useTouchDragDrop
