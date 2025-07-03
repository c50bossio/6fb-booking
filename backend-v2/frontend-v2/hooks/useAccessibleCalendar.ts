'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { format, isToday, isSameDay, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

interface UseAccessibleCalendarProps {
  selectedDate?: Date | null
  onDateSelect?: (date: Date) => void
  minDate?: Date
  maxDate?: Date
  disabled?: (date: Date) => boolean
  announceChanges?: boolean
}

interface AccessibilityState {
  // Screen reader support
  announceToScreenReader: (message: string) => void
  announcementText: string
  
  // Keyboard navigation
  focusedDate: Date | null
  setFocusedDate: (date: Date | null) => void
  handleKeyboardNavigation: (e: KeyboardEvent) => boolean
  
  // High contrast mode
  isHighContrastMode: boolean
  
  // Reduced motion
  prefersReducedMotion: boolean
  
  // Focus management
  shouldShowFocusRing: boolean
  isKeyboardNavigating: boolean
  
  // ARIA helpers
  getCalendarProps: () => Record<string, any>
  getDayProps: (date: Date) => Record<string, any>
  getNavigationProps: (direction: 'prev' | 'next') => Record<string, any>
}

export function useAccessibleCalendar({
  selectedDate,
  onDateSelect,
  minDate,
  maxDate,
  disabled,
  announceChanges = true
}: UseAccessibleCalendarProps): AccessibilityState {
  
  // State management
  const [announcementText, setAnnouncementText] = useState<string>('')
  const [focusedDate, setFocusedDate] = useState<Date | null>(selectedDate || new Date())
  const [isKeyboardNavigating, setIsKeyboardNavigating] = useState(false)
  const [shouldShowFocusRing, setShouldShowFocusRing] = useState(false)
  
  // Media queries for accessibility preferences
  const [isHighContrastMode, setIsHighContrastMode] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  
  // Setup media query listeners
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // High contrast detection
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    setIsHighContrastMode(highContrastQuery.matches)
    
    const handleHighContrastChange = (e: MediaQueryListEvent) => {
      setIsHighContrastMode(e.matches)
    }
    
    // Reduced motion detection
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(reducedMotionQuery.matches)
    
    const handleReducedMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    
    // Add listeners
    highContrastQuery.addEventListener('change', handleHighContrastChange)
    reducedMotionQuery.addEventListener('change', handleReducedMotionChange)
    
    return () => {
      highContrastQuery.removeEventListener('change', handleHighContrastChange)
      reducedMotionQuery.removeEventListener('change', handleReducedMotionChange)
    }
  }, [])
  
  // Mouse movement detection to reset keyboard navigation
  useEffect(() => {
    const handleMouseMove = () => {
      if (isKeyboardNavigating) {
        setIsKeyboardNavigating(false)
        setShouldShowFocusRing(false)
      }
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [isKeyboardNavigating])
  
  // Screen reader announcements
  const announceToScreenReader = useCallback((message: string) => {
    if (!announceChanges) return
    
    setAnnouncementText(message)
    
    // Clear announcement after a delay to prevent screen reader spam
    setTimeout(() => {
      setAnnouncementText('')
    }, 1000)
  }, [announceChanges])
  
  // Date validation helpers
  const isDateDisabled = useCallback((date: Date) => {
    if (disabled && disabled(date)) return true
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }, [disabled, minDate, maxDate])
  
  // Keyboard navigation handler
  const handleKeyboardNavigation = useCallback((e: KeyboardEvent): boolean => {
    if (!focusedDate) return false
    
    let newDate: Date | null = null
    let shouldPreventDefault = true
    let announcement = ''
    
    setIsKeyboardNavigating(true)
    setShouldShowFocusRing(true)
    
    switch (e.key) {
      case 'ArrowLeft':
        newDate = addDays(focusedDate, -1)
        announcement = 'Previous day'
        break
        
      case 'ArrowRight':
        newDate = addDays(focusedDate, 1)
        announcement = 'Next day'
        break
        
      case 'ArrowUp':
        newDate = addDays(focusedDate, -7)
        announcement = 'Previous week'
        break
        
      case 'ArrowDown':
        newDate = addDays(focusedDate, 7)
        announcement = 'Next week'
        break
        
      case 'Home':
        if (e.ctrlKey) {
          newDate = startOfMonth(focusedDate)
          announcement = 'First day of month'
        } else {
          newDate = startOfWeek(focusedDate, { weekStartsOn: 0 })
          announcement = 'First day of week'
        }
        break
        
      case 'End':
        if (e.ctrlKey) {
          newDate = endOfMonth(focusedDate)
          announcement = 'Last day of month'
        } else {
          newDate = endOfWeek(focusedDate, { weekStartsOn: 0 })
          announcement = 'Last day of week'
        }
        break
        
      case 'PageUp':
        newDate = addDays(focusedDate, e.shiftKey ? -365 : -30)
        announcement = e.shiftKey ? 'Previous year' : 'Previous month'
        break
        
      case 'PageDown':
        newDate = addDays(focusedDate, e.shiftKey ? 365 : 30)
        announcement = e.shiftKey ? 'Next year' : 'Next month'
        break
        
      case 'Enter':
      case ' ':
        if (!isDateDisabled(focusedDate)) {
          onDateSelect?.(focusedDate)
          const dateString = format(focusedDate, 'EEEE, MMMM do, yyyy')
          announceToScreenReader(`Selected ${dateString}`)
        } else {
          announceToScreenReader('Date is not available')
        }
        return true
        
      case 'Escape':
        setFocusedDate(selectedDate || new Date())
        announceToScreenReader('Calendar navigation cancelled')
        return true
        
      default:
        shouldPreventDefault = false
    }
    
    if (newDate && shouldPreventDefault) {
      // Check boundaries
      if (isDateDisabled(newDate)) {
        announceToScreenReader('Cannot navigate to disabled date')
        return true
      }
      
      setFocusedDate(newDate)
      
      // Create comprehensive announcement
      const dateString = format(newDate, 'EEEE, MMMM do, yyyy')
      const context = []
      
      if (isToday(newDate)) context.push('Today')
      if (selectedDate && isSameDay(newDate, selectedDate)) context.push('Selected')
      if (isDateDisabled(newDate)) context.push('Unavailable')
      
      const fullAnnouncement = `${announcement}, ${dateString}${context.length ? `, ${context.join(', ')}` : ''}`
      announceToScreenReader(fullAnnouncement)
      
      return true
    }
    
    return shouldPreventDefault
  }, [focusedDate, selectedDate, onDateSelect, isDateDisabled, announceToScreenReader])
  
  // ARIA property generators
  const getCalendarProps = useCallback(() => ({
    role: 'application',
    'aria-label': 'Calendar date picker',
    'aria-describedby': 'calendar-instructions',
    tabIndex: 0,
  }), [])
  
  const getDayProps = useCallback((date: Date) => {
    const isSelected = selectedDate ? isSameDay(date, selectedDate) : false
    const isFocused = focusedDate ? isSameDay(date, focusedDate) : false
    const isDisabled = isDateDisabled(date)
    const isCurrentDay = isToday(date)
    
    // Build comprehensive ARIA label
    const dateString = format(date, 'EEEE, MMMM do, yyyy')
    const labelParts = [dateString]
    
    if (isCurrentDay) labelParts.push('Today')
    if (isSelected) labelParts.push('Selected')
    if (isDisabled) labelParts.push('Unavailable')
    
    return {
      role: 'button',
      tabIndex: isFocused ? 0 : -1,
      'aria-label': labelParts.join(', '),
      'aria-pressed': isSelected,
      'aria-disabled': isDisabled,
      'aria-current': isCurrentDay ? 'date' : undefined,
      'data-focused': isFocused,
      'data-keyboard-nav': isKeyboardNavigating,
    }
  }, [selectedDate, focusedDate, isDateDisabled, isKeyboardNavigating])
  
  const getNavigationProps = useCallback((direction: 'prev' | 'next') => {
    const label = direction === 'prev' ? 'Previous month' : 'Next month'
    
    return {
      'aria-label': label,
      role: 'button',
      tabIndex: 0,
    }
  }, [])
  
  return {
    // Screen reader support
    announceToScreenReader,
    announcementText,
    
    // Keyboard navigation
    focusedDate,
    setFocusedDate,
    handleKeyboardNavigation,
    
    // Accessibility preferences
    isHighContrastMode,
    prefersReducedMotion,
    
    // Focus management
    shouldShowFocusRing,
    isKeyboardNavigating,
    
    // ARIA helpers
    getCalendarProps,
    getDayProps,
    getNavigationProps,
  }
}

// Hook for managing calendar keyboard shortcuts
export function useCalendarKeyboardShortcuts(onShortcut: (action: string) => void) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      
      // Calendar-specific shortcuts
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 't':
          case 'T':
            e.preventDefault()
            onShortcut('today')
            break
            
          case 'n':
          case 'N':
            e.preventDefault()
            onShortcut('nextMonth')
            break
            
          case 'p':
          case 'P':
            e.preventDefault()
            onShortcut('prevMonth')
            break
        }
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onShortcut])
}

// Hook for color contrast validation
export function useColorContrastValidation() {
  const [contrastIssues, setContrastIssues] = useState<string[]>([])
  
  const validateContrast = useCallback((element: HTMLElement) => {
    // This would typically use a contrast checking library
    // For now, we'll provide basic validation
    const issues: string[] = []
    
    const style = getComputedStyle(element)
    const bgColor = style.backgroundColor
    const textColor = style.color
    
    // Basic check for transparent backgrounds
    if (bgColor === 'transparent' || bgColor === 'rgba(0, 0, 0, 0)') {
      issues.push('Transparent background may cause contrast issues')
    }
    
    // Check for very light text on light backgrounds (basic heuristic)
    if (textColor.includes('rgb(255') && bgColor.includes('rgb(255')) {
      issues.push('Possible low contrast: light text on light background')
    }
    
    setContrastIssues(issues)
    return issues
  }, [])
  
  return { contrastIssues, validateContrast }
}

export default useAccessibleCalendar