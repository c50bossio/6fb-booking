'use client'

import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'
import type { CalendarView } from '../types/calendar'

// Accessibility interfaces
export interface CalendarAccessibilityOptions {
  announceChanges?: boolean
  enableKeyboardNavigation?: boolean
  highContrastMode?: boolean
  reducedMotion?: boolean
  announceRegion?: string
}

export interface CalendarGridProps {
  role: 'grid'
  'aria-label': string
  'aria-rowcount': number
  'aria-colcount': number
  tabIndex: number
  onKeyDown: (event: React.KeyboardEvent) => void
}

export interface CalendarGridCellProps {
  role: 'gridcell'
  'aria-label': string
  'aria-selected'?: boolean
  'aria-current'?: 'date'
  tabIndex: number
  'data-date': string
}

// Keyboard shortcuts interfaces
interface KeyboardShortcutsConfig {
  onNavigateToday?: () => void
  onNavigateLeft?: () => void
  onNavigateRight?: () => void
  onNavigateUp?: () => void
  onNavigateDown?: () => void
  onChangeViewDay?: () => void
  onChangeViewWeek?: () => void
  onChangeViewMonth?: () => void
  onCreateAppointment?: () => void
  onQuickBooking?: () => void
  onToggleAnalytics?: () => void
  onToggleHeatmap?: () => void
  onRefresh?: () => void
  currentDate?: Date
  setCurrentDate?: (date: Date) => void
  currentView?: CalendarView
}

interface ShortcutInfo {
  key: string
  description: string
  combo?: string
}

// Mobile gestures interfaces
interface GestureState {
  startX: number
  startY: number
  currentX: number
  currentY: number
  deltaX: number
  deltaY: number
  isGesturing: boolean
  gestureType: 'swipe' | 'pinch' | 'tap' | 'longPress' | null
  velocity: number
  direction: 'left' | 'right' | 'up' | 'down' | null
}

interface GestureCallbacks {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinchZoom?: (scale: number) => void
  onTap?: (x: number, y: number) => void
  onLongPress?: (x: number, y: number) => void
  onDoubleTap?: (x: number, y: number) => void
}

interface GestureOptions {
  swipeThreshold?: number
  pinchThreshold?: number
  longPressDelay?: number
  doubleTapDelay?: number
  velocityThreshold?: number
}

// Main interaction options
interface UseCalendarInteractionOptions extends CalendarAccessibilityOptions, KeyboardShortcutsConfig, GestureCallbacks, GestureOptions {
  enableKeyboardShortcuts?: boolean
  enableMobileGestures?: boolean
  hapticFeedback?: boolean
}

/**
 * Consolidated calendar interaction hook that combines accessibility, keyboard shortcuts, and mobile gestures
 * Merges useCalendarAccessibility, useCalendarKeyboardShortcuts, and useMobileCalendarGestures
 */
export function useCalendarInteraction(options: UseCalendarInteractionOptions = {}) {
  const {
    // Accessibility options
    announceChanges = true,
    enableKeyboardNavigation = true,
    highContrastMode = false,
    reducedMotion = false,
    announceRegion = 'calendar-announcements',
    
    // Keyboard shortcuts options
    enableKeyboardShortcuts = true,
    
    // Mobile gestures options
    enableMobileGestures = true,
    hapticFeedback = false,
    swipeThreshold = 50,
    pinchThreshold = 0.2,
    longPressDelay = 500,
    doubleTapDelay = 300,
    velocityThreshold = 0.5,
    
    // Callback functions
    onNavigateToday,
    onNavigateLeft,
    onNavigateRight,
    onNavigateUp,
    onNavigateDown,
    onChangeViewDay,
    onChangeViewWeek,
    onChangeViewMonth,
    onCreateAppointment,
    onQuickBooking,
    onToggleAnalytics,
    onToggleHeatmap,
    onRefresh,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onPinchZoom,
    onTap,
    onLongPress,
    onDoubleTap,
    
    // State
    currentDate,
    setCurrentDate,
    currentView
  } = options

  // Accessibility state
  const [isHighContrast, setIsHighContrast] = useState(highContrastMode)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(reducedMotion)
  const [currentFocus, setCurrentFocus] = useState<string | null>(null)
  const [announcementText, setAnnouncementText] = useState('')

  // Mobile gesture state
  const [gestureState, setGestureState] = useState<GestureState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    deltaX: 0,
    deltaY: 0,
    isGesturing: false,
    gestureType: null,
    velocity: 0,
    direction: null
  })

  // Refs
  const announcementRef = useRef<HTMLDivElement>(null)
  const gestureTimeoutRef = useRef<NodeJS.Timeout>()
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout>()
  const lastTapTimeRef = useRef(0)
  const longPressTimeoutRef = useRef<NodeJS.Timeout>()

  // Accessibility functions
  const announceToScreenReader = useCallback((message: string) => {
    if (!announceChanges) return

    setAnnouncementText(message)
    
    // Clear the message after a brief moment to allow for re-announcements
    setTimeout(() => {
      setAnnouncementText('')
    }, 1000)
  }, [announceChanges])

  const moveFocus = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!enableKeyboardNavigation) return

    // Focus movement logic would be implemented based on calendar layout
    // This is a simplified version
    const focusableElements = document.querySelectorAll('[data-focusable="true"]')
    const currentIndex = Array.from(focusableElements).findIndex(el => 
      el.getAttribute('data-date') === currentFocus
    )

    let nextIndex = currentIndex
    switch (direction) {
      case 'right':
        nextIndex = Math.min(currentIndex + 1, focusableElements.length - 1)
        break
      case 'left':
        nextIndex = Math.max(currentIndex - 1, 0)
        break
      case 'down':
        nextIndex = Math.min(currentIndex + 7, focusableElements.length - 1) // Assuming 7-day week
        break
      case 'up':
        nextIndex = Math.max(currentIndex - 7, 0)
        break
    }

    const nextElement = focusableElements[nextIndex] as HTMLElement
    if (nextElement) {
      nextElement.focus()
      const dateValue = nextElement.getAttribute('data-date')
      setCurrentFocus(dateValue)
      announceToScreenReader(`Selected ${dateValue}`)
    }
  }, [enableKeyboardNavigation, currentFocus, announceToScreenReader])

  const selectFocused = useCallback(() => {
    if (currentFocus && onNavigateToday) {
      announceToScreenReader(`Activated ${currentFocus}`)
      // Trigger selection action
    }
  }, [currentFocus, onNavigateToday, announceToScreenReader])

  // Keyboard shortcuts
  const shortcuts: ShortcutInfo[] = useMemo(() => [
    { key: 't', description: 'Go to today', combo: 't' },
    { key: 'ArrowLeft', description: 'Previous day/week/month', combo: '←' },
    { key: 'ArrowRight', description: 'Next day/week/month', combo: '→' },
    { key: 'd', description: 'Day view', combo: 'd' },
    { key: 'w', description: 'Week view', combo: 'w' },
    { key: 'm', description: 'Month view', combo: 'm' },
    { key: 'n', description: 'New appointment', combo: 'n' },
    { key: 'q', description: 'Quick booking', combo: 'q' },
    { key: 'a', description: 'Toggle analytics', combo: 'a' },
    { key: 'h', description: 'Toggle heatmap', combo: 'h' },
    { key: 'r', description: 'Refresh', combo: 'r' }
  ], [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enableKeyboardShortcuts) return

    const { key, metaKey, ctrlKey, shiftKey, altKey } = e
    
    // Prevent shortcuts when typing in inputs
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
      return
    }

    const hasModifier = metaKey || ctrlKey || shiftKey || altKey

    switch (key.toLowerCase()) {
      case 't':
        if (!hasModifier && onNavigateToday) {
          e.preventDefault()
          onNavigateToday()
          announceToScreenReader('Navigated to today')
        }
        break
      case 'arrowleft':
        if (!hasModifier) {
          e.preventDefault()
          if (onNavigateLeft) {
            onNavigateLeft()
          } else if (currentDate && setCurrentDate) {
            const newDate = currentView === 'month' ? subMonths(currentDate, 1) :
                           currentView === 'week' ? subWeeks(currentDate, 1) :
                           subDays(currentDate, 1)
            setCurrentDate(newDate)
            announceToScreenReader(`Navigated to ${format(newDate, 'MMMM d, yyyy')}`)
          }
        }
        break
      case 'arrowright':
        if (!hasModifier) {
          e.preventDefault()
          if (onNavigateRight) {
            onNavigateRight()
          } else if (currentDate && setCurrentDate) {
            const newDate = currentView === 'month' ? addMonths(currentDate, 1) :
                           currentView === 'week' ? addWeeks(currentDate, 1) :
                           addDays(currentDate, 1)
            setCurrentDate(newDate)
            announceToScreenReader(`Navigated to ${format(newDate, 'MMMM d, yyyy')}`)
          }
        }
        break
      case 'arrowup':
        if (!hasModifier) {
          e.preventDefault()
          moveFocus('up')
        }
        break
      case 'arrowdown':
        if (!hasModifier) {
          e.preventDefault()
          moveFocus('down')
        }
        break
      case 'd':
        if (!hasModifier && onChangeViewDay) {
          e.preventDefault()
          onChangeViewDay()
          announceToScreenReader('Switched to day view')
        }
        break
      case 'w':
        if (!hasModifier && onChangeViewWeek) {
          e.preventDefault()
          onChangeViewWeek()
          announceToScreenReader('Switched to week view')
        }
        break
      case 'm':
        if (!hasModifier && onChangeViewMonth) {
          e.preventDefault()
          onChangeViewMonth()
          announceToScreenReader('Switched to month view')
        }
        break
      case 'n':
        if (!hasModifier && onCreateAppointment) {
          e.preventDefault()
          onCreateAppointment()
          announceToScreenReader('Opening appointment creation')
        }
        break
      case 'q':
        if (!hasModifier && onQuickBooking) {
          e.preventDefault()
          onQuickBooking()
          announceToScreenReader('Opening quick booking')
        }
        break
      case 'a':
        if (!hasModifier && onToggleAnalytics) {
          e.preventDefault()
          onToggleAnalytics()
          announceToScreenReader('Toggled analytics view')
        }
        break
      case 'h':
        if (!hasModifier && onToggleHeatmap) {
          e.preventDefault()
          onToggleHeatmap()
          announceToScreenReader('Toggled heatmap view')
        }
        break
      case 'r':
        if (!hasModifier && onRefresh) {
          e.preventDefault()
          onRefresh()
          announceToScreenReader('Refreshing calendar')
        }
        break
      case 'enter':
      case ' ':
        if (!hasModifier) {
          e.preventDefault()
          selectFocused()
        }
        break
    }
  }, [enableKeyboardShortcuts, onNavigateToday, onNavigateLeft, onNavigateRight, onChangeViewDay, onChangeViewWeek, onChangeViewMonth, onCreateAppointment, onQuickBooking, onToggleAnalytics, onToggleHeatmap, onRefresh, currentDate, setCurrentDate, currentView, moveFocus, selectFocused, announceToScreenReader])

  // Mobile gesture handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!enableMobileGestures) return

    const touch = e.touches[0]
    const startTime = Date.now()
    
    setGestureState(prev => ({
      ...prev,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      isGesturing: true,
      gestureType: null
    }))

    // Set up long press detection
    longPressTimeoutRef.current = setTimeout(() => {
      if (onLongPress) {
        onLongPress(touch.clientX, touch.clientY)
        if (hapticFeedback && 'vibrate' in navigator) {
          navigator.vibrate(50)
        }
      }
      setGestureState(prev => ({ ...prev, gestureType: 'longPress' }))
    }, longPressDelay)
  }, [enableMobileGestures, onLongPress, hapticFeedback, longPressDelay])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!enableMobileGestures || !gestureState.isGesturing) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - gestureState.startX
    const deltaY = touch.clientY - gestureState.startY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    setGestureState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      deltaX,
      deltaY,
      velocity: distance / (Date.now() - (gestureTimeoutRef.current ? 0 : Date.now()))
    }))

    // Cancel long press if moved too much
    if (distance > 10 && longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }

    // Determine gesture type
    if (distance > swipeThreshold) {
      const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * (180 / Math.PI)
      const isHorizontal = angle < 45
      const direction = isHorizontal 
        ? (deltaX > 0 ? 'right' : 'left')
        : (deltaY > 0 ? 'down' : 'up')

      setGestureState(prev => ({
        ...prev,
        gestureType: 'swipe',
        direction
      }))
    }
  }, [enableMobileGestures, gestureState.isGesturing, gestureState.startX, gestureState.startY, swipeThreshold])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!enableMobileGestures) return

    // Clear long press timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }

    const { gestureType, direction, deltaX, deltaY, velocity } = gestureState
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const currentTime = Date.now()

    // Handle different gesture types
    if (gestureType === 'swipe' && velocity > velocityThreshold) {
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(25)
      }

      switch (direction) {
        case 'left':
          onSwipeLeft?.()
          break
        case 'right':
          onSwipeRight?.()
          break
        case 'up':
          onSwipeUp?.()
          break
        case 'down':
          onSwipeDown?.()
          break
      }
    } else if (distance < 10 && gestureType !== 'longPress') {
      // Handle tap
      const touch = e.changedTouches[0]
      const timeSinceLastTap = currentTime - lastTapTimeRef.current

      if (timeSinceLastTap < doubleTapDelay) {
        // Double tap
        if (doubleTapTimeoutRef.current) {
          clearTimeout(doubleTapTimeoutRef.current)
        }
        onDoubleTap?.(touch.clientX, touch.clientY)
      } else {
        // Single tap (with delay to check for double tap)
        doubleTapTimeoutRef.current = setTimeout(() => {
          onTap?.(touch.clientX, touch.clientY)
        }, doubleTapDelay)
      }

      lastTapTimeRef.current = currentTime
    }

    // Reset gesture state
    setGestureState({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      deltaX: 0,
      deltaY: 0,
      isGesturing: false,
      gestureType: null,
      velocity: 0,
      direction: null
    })
  }, [enableMobileGestures, gestureState, velocityThreshold, hapticFeedback, doubleTapDelay, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDoubleTap, onTap])

  // Setup global event listeners
  useEffect(() => {
    if (enableKeyboardShortcuts) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enableKeyboardShortcuts, handleKeyDown])

  // Detect system preferences
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // High contrast detection
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
      setIsHighContrast(highContrastQuery.matches || highContrastMode)
      
      const handleHighContrastChange = (e: MediaQueryListEvent) => {
        setIsHighContrast(e.matches || highContrastMode)
      }
      highContrastQuery.addEventListener('change', handleHighContrastChange)

      // Reduced motion detection
      const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(reducedMotionQuery.matches || reducedMotion)
      
      const handleReducedMotionChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches || reducedMotion)
      }
      reducedMotionQuery.addEventListener('change', handleReducedMotionChange)

      return () => {
        highContrastQuery.removeEventListener('change', handleHighContrastChange)
        reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
      }
    }
  }, [highContrastMode, reducedMotion])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current)
      }
      if (doubleTapTimeoutRef.current) {
        clearTimeout(doubleTapTimeoutRef.current)
      }
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current)
      }
    }
  }, [])

  // Calendar grid props for accessibility
  const getCalendarGridProps = useCallback((label: string, rowCount: number, colCount: number): CalendarGridProps => ({
    role: 'grid',
    'aria-label': label,
    'aria-rowcount': rowCount,
    'aria-colcount': colCount,
    tabIndex: 0,
    onKeyDown: (e) => handleKeyDown(e.nativeEvent)
  }), [handleKeyDown])

  // Calendar grid cell props for accessibility
  const getCalendarGridCellProps = useCallback((
    date: string,
    label: string,
    selected?: boolean,
    current?: boolean
  ): CalendarGridCellProps => ({
    role: 'gridcell',
    'aria-label': label,
    'aria-selected': selected,
    'aria-current': current ? 'date' : undefined,
    tabIndex: current ? 0 : -1,
    'data-date': date
  }), [])

  // Touch event handlers for gesture recognition
  const getTouchHandlers = useCallback(() => ({
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }), [handleTouchStart, handleTouchMove, handleTouchEnd])

  return {
    // Accessibility
    isHighContrast,
    prefersReducedMotion,
    currentFocus,
    announcementText,
    announceToScreenReader,
    moveFocus,
    selectFocused,
    getCalendarGridProps,
    getCalendarGridCellProps,
    
    // Keyboard shortcuts
    shortcuts,
    enableKeyboardShortcuts,
    
    // Mobile gestures
    gestureState,
    getTouchHandlers,
    enableMobileGestures,
    
    // Announcement region props (for components to render)
    getAnnouncementRegionProps: () => ({
      ref: announcementRef,
      id: announceRegion,
      'aria-live': 'polite' as const,
      'aria-atomic': 'true' as const,
      className: 'sr-only',
      children: announcementText
    })
  }
}

// Type exports
export type { 
  CalendarAccessibilityOptions,
  CalendarGridProps,
  CalendarGridCellProps,
  KeyboardShortcutsConfig,
  ShortcutInfo,
  GestureState,
  GestureCallbacks,
  GestureOptions,
  UseCalendarInteractionOptions
}