'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

interface AccessibilityPreferences {
  prefersReducedMotion: boolean
  prefersHighContrast: boolean
  prefersLargeFocus: boolean
  colorScheme: 'light' | 'dark' | 'auto'
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
}

interface ScreenReaderSettings {
  announcements: boolean
  verboseMode: boolean
  skipNavigation: boolean
  autoFocus: boolean
}

interface KeyboardNavigationConfig {
  enableShortcuts: boolean
  enableVimMode: boolean
  customShortcuts: Record<string, string>
}

interface AccessibilityContext {
  preferences: AccessibilityPreferences
  screenReader: ScreenReaderSettings
  keyboard: KeyboardNavigationConfig
  focusManagement: {
    trapFocus: boolean
    returnFocus: boolean
    skipLinks: boolean
  }
}

/**
 * Comprehensive accessibility utilities for calendar components
 * Provides WCAG 2.1 AA compliance features
 */
export class AccessibilityManager {
  private static instance: AccessibilityManager
  private preferences: AccessibilityPreferences
  private announcer: HTMLDivElement | null = null
  private focusHistory: HTMLElement[] = []
  private keyboardListeners: Map<string, Function> = new Map()

  constructor() {
    this.preferences = this.detectAccessibilityPreferences()
    this.initializeAnnouncer()
    this.setupGlobalKeyboardHandlers()
  }

  static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager()
    }
    return AccessibilityManager.instance
  }

  /**
   * Detect user accessibility preferences from browser
   */
  private detectAccessibilityPreferences(): AccessibilityPreferences {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
    const colorScheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

    return {
      prefersReducedMotion,
      prefersHighContrast,
      prefersLargeFocus: false, // Custom preference
      colorScheme: colorScheme as 'light' | 'dark',
      fontSize: 'medium'
    }
  }

  /**
   * Initialize screen reader announcer
   */
  private initializeAnnouncer() {
    if (this.announcer) return

    this.announcer = document.createElement('div')
    this.announcer.setAttribute('aria-live', 'polite')
    this.announcer.setAttribute('aria-atomic', 'true')
    this.announcer.setAttribute('id', 'calendar-announcer')
    this.announcer.style.position = 'absolute'
    this.announcer.style.left = '-10000px'
    this.announcer.style.width = '1px'
    this.announcer.style.height = '1px'
    this.announcer.style.overflow = 'hidden'
    
    document.body.appendChild(this.announcer)
  }

  /**
   * Announce text to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.announcer) return

    // Clear previous message
    this.announcer.textContent = ''
    
    // Set priority
    this.announcer.setAttribute('aria-live', priority)
    
    // Announce new message with slight delay to ensure it's read
    setTimeout(() => {
      if (this.announcer) {
        this.announcer.textContent = message
      }
    }, 100)
  }

  /**
   * Setup global keyboard handlers
   */
  private setupGlobalKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      // Skip navigation shortcut
      if (e.key === 'Tab' && e.altKey && e.shiftKey) {
        e.preventDefault()
        this.focusMainContent()
      }

      // Help shortcut
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault()
        this.showKeyboardHelp()
      }

      // Calendar-specific shortcuts
      if (e.altKey) {
        switch (e.key) {
          case 'c':
            e.preventDefault()
            this.focusCalendar()
            break
          case 'n':
            e.preventDefault()
            this.navigateToToday()
            break
          case 'p':
            e.preventDefault()
            this.toggleDatePicker()
            break
        }
      }
    })
  }

  /**
   * Focus management utilities
   */
  saveFocus() {
    const activeElement = document.activeElement as HTMLElement
    if (activeElement && activeElement !== document.body) {
      this.focusHistory.push(activeElement)
    }
  }

  restoreFocus() {
    const lastFocused = this.focusHistory.pop()
    if (lastFocused && document.contains(lastFocused)) {
      lastFocused.focus()
    }
  }

  focusMainContent() {
    const main = document.querySelector('main') || document.querySelector('[role="main"]')
    if (main) {
      (main as HTMLElement).focus()
    }
  }

  focusCalendar() {
    const calendar = document.querySelector('[role="grid"]') || 
                    document.querySelector('.calendar-grid') ||
                    document.querySelector('[data-testid="calendar"]')
    if (calendar) {
      (calendar as HTMLElement).focus()
      this.announce('Calendar focused. Use arrow keys to navigate dates.')
    }
  }

  navigateToToday() {
    const todayButton = document.querySelector('[data-testid="today-button"]') ||
                       document.querySelector('.today-button')
    if (todayButton) {
      (todayButton as HTMLElement).click()
      this.announce('Navigated to today')
    }
  }

  toggleDatePicker() {
    const datePicker = document.querySelector('[data-testid="date-picker"]') ||
                      document.querySelector('.date-picker-trigger')
    if (datePicker) {
      (datePicker as HTMLElement).click()
      this.announce('Date picker toggled')
    }
  }

  showKeyboardHelp() {
    // This would show a modal or tooltip with keyboard shortcuts
    this.announce('Keyboard shortcuts: Alt+C for calendar, Alt+N for today, Alt+P for date picker, Shift+? for help')
  }

  /**
   * Color contrast utilities
   */
  checkColorContrast(foreground: string, background: string): {
    ratio: number
    passesAA: boolean
    passesAAA: boolean
  } {
    const luminance1 = this.getLuminance(foreground)
    const luminance2 = this.getLuminance(background)
    
    const ratio = (Math.max(luminance1, luminance2) + 0.05) / (Math.min(luminance1, luminance2) + 0.05)
    
    return {
      ratio,
      passesAA: ratio >= 4.5,
      passesAAA: ratio >= 7
    }
  }

  private getLuminance(color: string): number {
    // Convert color to RGB and calculate relative luminance
    const rgb = this.hexToRgb(color)
    if (!rgb) return 0
    
    const { r, g, b } = rgb
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  /**
   * Generate accessible descriptions for calendar elements
   */
  generateDateDescription(date: Date, hasAppointments: boolean = false, appointmentCount: number = 0): string {
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    const monthName = date.toLocaleDateString('en-US', { month: 'long' })
    const dayNumber = date.getDate()
    const year = date.getFullYear()
    
    let description = `${dayName}, ${monthName} ${dayNumber}, ${year}`
    
    if (hasAppointments) {
      description += `, ${appointmentCount} appointment${appointmentCount !== 1 ? 's' : ''}`
    } else {
      description += ', no appointments'
    }
    
    return description
  }

  generateAppointmentDescription(appointment: {
    time: string
    duration: number
    service: string
    client: string
    status: string
  }): string {
    return `${appointment.time}, ${appointment.duration} minutes, ${appointment.service} with ${appointment.client}, status: ${appointment.status}`
  }

  /**
   * Focus trap for modals and dropdowns
   */
  trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input, select, details, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          lastFocusable.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          firstFocusable.focus()
          e.preventDefault()
        }
      }
    }

    container.addEventListener('keydown', handleTabKey)
    
    // Focus first element
    if (firstFocusable) {
      firstFocusable.focus()
    }

    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }

  /**
   * Get accessibility preferences
   */
  getPreferences(): AccessibilityPreferences {
    return { ...this.preferences }
  }

  /**
   * Update accessibility preferences
   */
  updatePreferences(updates: Partial<AccessibilityPreferences>) {
    this.preferences = { ...this.preferences, ...updates }
    
    // Apply updates to document
    this.applyPreferences()
  }

  private applyPreferences() {
    const root = document.documentElement
    
    // Apply font size
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px',
      'extra-large': '20px'
    }
    root.style.fontSize = fontSizeMap[this.preferences.fontSize]
    
    // Apply high contrast
    if (this.preferences.prefersHighContrast) {
      root.classList.add('high-contrast')
    } else {
      root.classList.remove('high-contrast')
    }
    
    // Apply reduced motion
    if (this.preferences.prefersReducedMotion) {
      root.classList.add('reduce-motion')
    } else {
      root.classList.remove('reduce-motion')
    }
    
    // Apply color scheme
    root.setAttribute('data-theme', this.preferences.colorScheme)
  }
}

/**
 * React hooks for accessibility features
 */

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

export function useHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setPrefersHighContrast(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersHighContrast
}

export function useAccessibilityAnnouncer() {
  const manager = AccessibilityManager.getInstance()
  
  return {
    announce: (message: string, priority?: 'polite' | 'assertive') => 
      manager.announce(message, priority)
  }
}

export function useFocusManagement() {
  const manager = AccessibilityManager.getInstance()
  
  return {
    saveFocus: () => manager.saveFocus(),
    restoreFocus: () => manager.restoreFocus(),
    trapFocus: (container: HTMLElement) => manager.trapFocus(container)
  }
}

export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = [
        e.ctrlKey && 'ctrl',
        e.altKey && 'alt', 
        e.shiftKey && 'shift',
        e.key.toLowerCase()
      ].filter(Boolean).join('+')

      const handler = shortcuts[key]
      if (handler) {
        e.preventDefault()
        handler()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}

export function useAccessibilityPreferences() {
  const manager = AccessibilityManager.getInstance()
  const [preferences, setPreferences] = useState(manager.getPreferences())

  const updatePreferences = useCallback((updates: Partial<AccessibilityPreferences>) => {
    manager.updatePreferences(updates)
    setPreferences(manager.getPreferences())
  }, [manager])

  return {
    preferences,
    updatePreferences
  }
}

/**
 * Accessibility validation utilities
 */
export const AccessibilityValidation = {
  /**
   * Check if element has proper ARIA labels
   */
  validateAriaLabels(element: HTMLElement): {
    hasLabel: boolean
    hasDescription: boolean
    hasRole: boolean
    suggestions: string[]
  } {
    const hasLabel = element.hasAttribute('aria-label') || 
                    element.hasAttribute('aria-labelledby') ||
                    element.querySelector('label')

    const hasDescription = element.hasAttribute('aria-describedby')
    const hasRole = element.hasAttribute('role') || element.tagName.toLowerCase() in ['button', 'input', 'select', 'textarea']

    const suggestions: string[] = []
    
    if (!hasLabel) {
      suggestions.push('Add aria-label or aria-labelledby attribute')
    }
    
    if (!hasDescription && element.hasAttribute('aria-expanded')) {
      suggestions.push('Consider adding aria-describedby for additional context')
    }
    
    if (!hasRole && element.onclick) {
      suggestions.push('Add role="button" for clickable elements')
    }

    return {
      hasLabel,
      hasDescription, 
      hasRole,
      suggestions
    }
  },

  /**
   * Check keyboard navigation support
   */
  validateKeyboardNavigation(element: HTMLElement): {
    isFocusable: boolean
    hasKeyHandler: boolean
    suggestions: string[]
  } {
    const tabIndex = element.getAttribute('tabindex')
    const isFocusable = tabIndex !== '-1' && 
                       (element.tabIndex >= 0 || 
                        ['input', 'button', 'select', 'textarea', 'a'].includes(element.tagName.toLowerCase()))

    const hasKeyHandler = element.onkeydown !== null || 
                         element.onkeyup !== null ||
                         element.onkeypress !== null

    const suggestions: string[] = []
    
    if (!isFocusable && element.onclick) {
      suggestions.push('Make clickable elements focusable with tabindex="0"')
    }
    
    if (!hasKeyHandler && element.onclick && element.tagName.toLowerCase() !== 'button') {
      suggestions.push('Add keyboard event handlers for space and enter keys')
    }

    return {
      isFocusable,
      hasKeyHandler,
      suggestions
    }
  },

  /**
   * Generate accessibility report for element
   */
  generateReport(element: HTMLElement): {
    score: number
    issues: string[]
    suggestions: string[]
  } {
    const ariaValidation = this.validateAriaLabels(element)
    const keyboardValidation = this.validateKeyboardNavigation(element)
    
    let score = 100
    const issues: string[] = []
    const suggestions: string[] = []

    if (!ariaValidation.hasLabel) {
      score -= 30
      issues.push('Missing accessible label')
    }

    if (!keyboardValidation.isFocusable && element.onclick) {
      score -= 25
      issues.push('Not keyboard accessible')
    }

    suggestions.push(...ariaValidation.suggestions, ...keyboardValidation.suggestions)

    return {
      score: Math.max(0, score),
      issues,
      suggestions
    }
  }
}

export default AccessibilityManager