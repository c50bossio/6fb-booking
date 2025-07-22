'use client'

import { useEffect, useCallback } from 'react'
import { format, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths } from 'date-fns'
import type { CalendarView } from '../types/calendar'

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

/**
 * Comprehensive keyboard shortcuts for calendar navigation and actions
 * Provides intuitive keyboard navigation that doesn't interfere with form inputs
 */
export function useCalendarKeyboardShortcuts(config: KeyboardShortcutsConfig) {
  const {
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
    currentDate,
    setCurrentDate,
    currentView
  } = config

  // Smart date navigation based on current view
  const navigateDate = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (!currentDate || !setCurrentDate) return

    let newDate = currentDate

    switch (direction) {
      case 'left':
        if (currentView === 'day') {
          newDate = subDays(currentDate, 1)
        } else if (currentView === 'week') {
          newDate = subWeeks(currentDate, 1)
        } else if (currentView === 'month') {
          newDate = subMonths(currentDate, 1)
        }
        break
      case 'right':
        if (currentView === 'day') {
          newDate = addDays(currentDate, 1)
        } else if (currentView === 'week') {
          newDate = addWeeks(currentDate, 1)
        } else if (currentView === 'month') {
          newDate = addMonths(currentDate, 1)
        }
        break
      case 'up':
        if (currentView === 'day') {
          newDate = subDays(currentDate, 7) // Go up one week
        } else if (currentView === 'week') {
          newDate = subWeeks(currentDate, 4) // Go up one month
        } else if (currentView === 'month') {
          newDate = subMonths(currentDate, 12) // Go up one year
        }
        break
      case 'down':
        if (currentView === 'day') {
          newDate = addDays(currentDate, 7) // Go down one week
        } else if (currentView === 'week') {
          newDate = addWeeks(currentDate, 4) // Go down one month
        } else if (currentView === 'month') {
          newDate = addMonths(currentDate, 12) // Go down one year
        }
        break
    }

    setCurrentDate(newDate)
  }, [currentDate, setCurrentDate, currentView])

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Don't intercept keys when user is typing in form elements
    const activeElement = document.activeElement
    const isTyping = activeElement && [
      'INPUT', 
      'TEXTAREA', 
      'SELECT', 
      'BUTTON'
    ].includes(activeElement.tagName)

    // Allow some shortcuts even when focused on buttons
    const isButton = activeElement?.tagName === 'BUTTON'
    
    if (isTyping && !isButton) return

    const { key, ctrlKey, metaKey, shiftKey, altKey } = event
    const isCmd = ctrlKey || metaKey
    
    // Prevent default for handled shortcuts
    let handled = false

    switch (key.toLowerCase()) {
      // Navigation shortcuts
      case 't':
        if (!isCmd && !altKey && onNavigateToday) {
          onNavigateToday()
          handled = true
        }
        break
        
      case 'arrowleft':
        if (!isCmd && !altKey) {
          if (onNavigateLeft) {
            onNavigateLeft()
          } else {
            navigateDate('left')
          }
          handled = true
        }
        break
        
      case 'arrowright':
        if (!isCmd && !altKey) {
          if (onNavigateRight) {
            onNavigateRight()
          } else {
            navigateDate('right')
          }
          handled = true
        }
        break
        
      case 'arrowup':
        if (!isCmd && !altKey) {
          if (onNavigateUp) {
            onNavigateUp()
          } else {
            navigateDate('up')
          }
          handled = true
        }
        break
        
      case 'arrowdown':
        if (!isCmd && !altKey) {
          if (onNavigateDown) {
            onNavigateDown()
          } else {
            navigateDate('down')
          }
          handled = true
        }
        break

      // View switching shortcuts
      case '1':
        if (!isCmd && !altKey && onChangeViewDay) {
          onChangeViewDay()
          handled = true
        }
        break
        
      case '2':
        if (!isCmd && !altKey && onChangeViewWeek) {
          onChangeViewWeek()
          handled = true
        }
        break
        
      case '3':
        if (!isCmd && !altKey && onChangeViewMonth) {
          onChangeViewMonth()
          handled = true
        }
        break

      // Action shortcuts
      case 'n':
        if (!isCmd && !altKey && onCreateAppointment) {
          onCreateAppointment()
          handled = true
        }
        break
        
      case 'b':
        if (isCmd && !shiftKey && onQuickBooking) {
          onQuickBooking()
          handled = true
        }
        break
        
      case 'a':
        if (!isCmd && !altKey && onToggleAnalytics) {
          onToggleAnalytics()
          handled = true
        }
        break
        
      case 'h':
        if (!isCmd && !altKey && onToggleHeatmap) {
          onToggleHeatmap()
          handled = true
        }
        break
        
      case 'r':
        if (isCmd && onRefresh) {
          onRefresh()
          handled = true
        }
        break

      // Help shortcut (show shortcuts overlay)
      case '?':
        if (!isCmd && !altKey && shiftKey) {
          // Show shortcuts help (could trigger a modal or toast)
          console.log('Calendar Keyboard Shortcuts:', getShortcutList())
          handled = true
        }
        break
    }

    if (handled) {
      event.preventDefault()
      event.stopPropagation()
    }
  }, [
    onNavigateToday, onNavigateLeft, onNavigateRight, onNavigateUp, onNavigateDown,
    onChangeViewDay, onChangeViewWeek, onChangeViewMonth,
    onCreateAppointment, onQuickBooking, onToggleAnalytics, onToggleHeatmap, onRefresh,
    navigateDate
  ])

  // Get list of available shortcuts for help display
  const getShortcutList = useCallback((): ShortcutInfo[] => {
    const shortcuts: ShortcutInfo[] = []

    if (onNavigateToday) shortcuts.push({ key: 'T', description: 'Jump to today' })
    if (onNavigateLeft || setCurrentDate) shortcuts.push({ key: '←', description: 'Navigate left (prev day/week/month)' })
    if (onNavigateRight || setCurrentDate) shortcuts.push({ key: '→', description: 'Navigate right (next day/week/month)' })
    if (onNavigateUp || setCurrentDate) shortcuts.push({ key: '↑', description: 'Navigate up (prev week/month/year)' })
    if (onNavigateDown || setCurrentDate) shortcuts.push({ key: '↓', description: 'Navigate down (next week/month/year)' })
    
    if (onChangeViewDay) shortcuts.push({ key: '1', description: 'Switch to day view' })
    if (onChangeViewWeek) shortcuts.push({ key: '2', description: 'Switch to week view' })
    if (onChangeViewMonth) shortcuts.push({ key: '3', description: 'Switch to month view' })
    
    if (onCreateAppointment) shortcuts.push({ key: 'N', description: 'Create new appointment' })
    if (onQuickBooking) shortcuts.push({ key: 'Cmd+B', description: 'Quick booking', combo: 'cmd+b' })
    if (onToggleAnalytics) shortcuts.push({ key: 'A', description: 'Toggle analytics' })
    if (onToggleHeatmap) shortcuts.push({ key: 'H', description: 'Toggle heatmap' })
    if (onRefresh) shortcuts.push({ key: 'Cmd+R', description: 'Refresh calendar', combo: 'cmd+r' })
    
    shortcuts.push({ key: 'Shift+?', description: 'Show keyboard shortcuts', combo: 'shift+?' })

    return shortcuts
  }, [
    onNavigateToday, onNavigateLeft, onNavigateRight, onNavigateUp, onNavigateDown,
    onChangeViewDay, onChangeViewWeek, onChangeViewMonth,
    onCreateAppointment, onQuickBooking, onToggleAnalytics, onToggleHeatmap, onRefresh,
    setCurrentDate
  ])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress)
    }
  }, [handleKeyPress])

  return {
    shortcuts: getShortcutList()
  }
}

// KeyboardShortcutsHelp component moved to separate file to avoid JSX compilation issues