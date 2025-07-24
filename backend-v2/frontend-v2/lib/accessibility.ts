/**
 * Accessibility utilities for error handling and form validation
 * Provides ARIA-compliant error messaging and screen reader support
 */

// ARIA Live Region Manager
class AriaLiveRegionManager {
  private static instance: AriaLiveRegionManager
  private politeRegion: HTMLElement | null = null
  private assertiveRegion: HTMLElement | null = null

  static getInstance(): AriaLiveRegionManager {
    if (!AriaLiveRegionManager.instance) {
      AriaLiveRegionManager.instance = new AriaLiveRegionManager()
    }
    return AriaLiveRegionManager.instance
  }

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initializeRegions()
    }
  }

  private initializeRegions() {
    // Create polite live region for non-critical announcements
    this.politeRegion = document.createElement('div')
    this.politeRegion.setAttribute('aria-live', 'polite')
    this.politeRegion.setAttribute('aria-atomic', 'true')
    this.politeRegion.className = 'sr-only'
    this.politeRegion.id = 'polite-live-region'
    document.body.appendChild(this.politeRegion)

    // Create assertive live region for critical announcements
    this.assertiveRegion = document.createElement('div')
    this.assertiveRegion.setAttribute('aria-live', 'assertive')
    this.assertiveRegion.setAttribute('aria-atomic', 'true')
    this.assertiveRegion.className = 'sr-only'
    this.assertiveRegion.id = 'assertive-live-region'
    document.body.appendChild(this.assertiveRegion)
  }

  announcePolitely(message: string, delay: number = 100) {
    if (!this.politeRegion) return

    setTimeout(() => {
      if (this.politeRegion) {
        this.politeRegion.textContent = message
        // Clear after announcement
        setTimeout(() => {
          if (this.politeRegion) {
            this.politeRegion.textContent = ''
          }
        }, 1000)
      }
    }, delay)
  }

  announceUrgently(message: string, delay: number = 100) {
    if (!this.assertiveRegion) return

    setTimeout(() => {
      if (this.assertiveRegion) {
        this.assertiveRegion.textContent = message
        // Clear after announcement
        setTimeout(() => {
          if (this.assertiveRegion) {
            this.assertiveRegion.textContent = ''
          }
        }, 1000)
      }
    }, delay)
  }
}

// Export singleton instance
export const liveRegionManager = AriaLiveRegionManager.getInstance()

// Error announcement utilities
export function announceError(message: string, urgent: boolean = true) {
  if (urgent) {
    liveRegionManager.announceUrgently(`Error: ${message}`)
  } else {
    liveRegionManager.announcePolitely(`Error: ${message}`)
  }
}

export function announceSuccess(message: string) {
  liveRegionManager.announcePolitely(`Success: ${message}`)
}

export function announceValidationError(fieldName: string, error: string) {
  liveRegionManager.announceUrgently(`Validation error in ${fieldName}: ${error}`)
}

export function announceFormSubmission(isSubmitting: boolean, formName?: string) {
  const formLabel = formName || 'form'
  if (isSubmitting) {
    liveRegionManager.announcePolitely(`Submitting ${formLabel}...`)
  } else {
    liveRegionManager.announcePolitely(`${formLabel} submission complete`)
  }
}

// Focus management utilities
export function trapFocus(element: HTMLElement): () => void {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>

  const firstElement = focusableElements[0]
  const lastElement = focusableElements[focusableElements.length - 1]

  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }
  }

  element.addEventListener('keydown', handleTabKey)

  // Return cleanup function
  return () => {
    element.removeEventListener('keydown', handleTabKey)
  }
}

export function restoreFocus(previousElement: HTMLElement | null) {
  if (previousElement && document.contains(previousElement)) {
    setTimeout(() => {
      previousElement.focus()
    }, 100)
  }
}

// Validation error utilities
export interface ValidationErrorAnnouncement {
  fieldId: string
  fieldLabel: string
  error: string
  errorId: string
}

export function createValidationErrorId(fieldId: string): string {
  return `${fieldId}-error`
}

export function createValidationDescriptionId(fieldId: string): string {
  return `${fieldId}-description`
}

export function getAriaDescribedBy(
  fieldId: string, 
  hasError: boolean, 
  hasDescription: boolean = false
): string {
  const parts: string[] = []
  
  if (hasDescription) {
    parts.push(createValidationDescriptionId(fieldId))
  }
  
  if (hasError) {
    parts.push(createValidationErrorId(fieldId))
  }
  
  return parts.join(' ')
}

// Screen reader utilities
export function announcePageChange(pageTitle: string) {
  liveRegionManager.announcePolitely(`Navigated to ${pageTitle}`)
}

export function announceStepChange(currentStep: number, totalSteps: number, stepTitle: string) {
  liveRegionManager.announcePolitely(
    `Step ${currentStep} of ${totalSteps}: ${stepTitle}`
  )
}

export function announceProgressUpdate(percentage: number, activity?: string) {
  const activityText = activity ? ` ${activity}` : ''
  liveRegionManager.announcePolitely(
    `Progress: ${percentage}% complete${activityText}`
  )
}

// Error boundary utilities
export function announceErrorBoundaryActivation(errorType: string, hasRecovery: boolean) {
  const recoveryText = hasRecovery ? ' Recovery options are available.' : ''
  liveRegionManager.announceUrgently(
    `Application error occurred: ${errorType}.${recoveryText}`
  )
}

// Network status utilities
export function announceNetworkStatusChange(isOnline: boolean) {
  if (isOnline) {
    liveRegionManager.announcePolitely('Internet connection restored')
  } else {
    liveRegionManager.announceUrgently('Internet connection lost. Some features may not be available.')
  }
}

// Keyboard shortcuts
export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  description: string
  action: () => void
}

export function registerKeyboardShortcuts(shortcuts: KeyboardShortcut[]): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    const shortcut = shortcuts.find(s => 
      s.key.toLowerCase() === e.key.toLowerCase() &&
      Boolean(s.ctrlKey) === e.ctrlKey &&
      Boolean(s.altKey) === e.altKey &&
      Boolean(s.shiftKey) === e.shiftKey
    )

    if (shortcut) {
      e.preventDefault()
      shortcut.action()
    }
  }

  document.addEventListener('keydown', handleKeyDown)

  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
}

// High contrast and reduced motion detection
export function detectAccessibilityPreferences() {
  if (typeof window === 'undefined') {
    return {
      prefersReducedMotion: false,
      prefersHighContrast: false,
      prefersDarkMode: false
    }
  }

  return {
    prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    prefersHighContrast: window.matchMedia('(prefers-contrast: high)').matches,
    prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches
  }
}

// Error message formatting for screen readers
export function formatErrorForScreenReader(error: string, context?: string): string {
  const contextText = context ? `in ${context}: ` : ''
  return `Error ${contextText}${error}. Please review and try again.`
}

export function formatValidationErrorsForScreenReader(errors: Array<{field: string, message: string}>): string {
  if (errors.length === 0) return ''
  
  if (errors.length === 1) {
    return formatErrorForScreenReader(errors[0].message, errors[0].field)
  }

  const errorList = errors.map((error, index) => 
    `${index + 1}. ${error.field}: ${error.message}`
  ).join('. ')

  return `${errors.length} validation errors found: ${errorList}. Please review all fields and try again.`
}

// Additional exports for compatibility with existing code
import { useState, useEffect } from 'react'

/**
 * Hook for screen reader detection and announcements
 */
export const useScreenReader = () => {
  const [isScreenReaderActive, setIsScreenReaderActive] = useState(false)

  useEffect(() => {
    // Detect if screen reader is likely active
    const detectScreenReader = () => {
      // Check for common screen reader indicators
      const hasAriaLive = document.querySelector('[aria-live]')
      const hasScreenReaderClass = document.querySelector('.sr-only')
      const hasAriaLabel = document.querySelector('[aria-label]')
      
      return !!(hasAriaLive || hasScreenReaderClass || hasAriaLabel)
    }

    setIsScreenReaderActive(detectScreenReader())

    // Listen for keyboard navigation patterns that indicate screen reader use
    const handleKeyDown = (event: KeyboardEvent) => {
      // Screen reader users often use Tab, Enter, Space, Arrow keys extensively
      if (['Tab', 'Enter', ' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
        setIsScreenReaderActive(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown as any)
    return () => document.removeEventListener('keydown', handleKeyDown as any)
  }, [])

  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      liveRegionManager.announceUrgently(message)
    } else {
      liveRegionManager.announcePolitely(message)
    }
  }

  const announceStatus = (message: string) => {
    liveRegionManager.announcePolitely(message)
  }

  const announceNavigation = (message: string) => {
    liveRegionManager.announceUrgently(message)
  }

  return {
    isScreenReaderActive,
    announce,
    announceStatus,
    announceNavigation
  }
}

/**
 * Generate unique IDs for accessibility
 */
export const generateId = (prefix: string = 'element') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

// Export keyboard helpers for compatibility
export const keyboardHelpers = {
  onEnterOrSpace: (callback: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      callback()
    }
  },
  
  handleArrowNavigation: (
    event: React.KeyboardEvent,
    elements: HTMLElement[],
    currentIndex: number,
    onIndexChange: (newIndex: number) => void
  ) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault()
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : elements.length - 1
        onIndexChange(prevIndex)
        elements[prevIndex]?.focus()
        break
      case 'ArrowDown':
        event.preventDefault()
        const nextIndex = currentIndex < elements.length - 1 ? currentIndex + 1 : 0
        onIndexChange(nextIndex)
        elements[nextIndex]?.focus()
        break
      case 'Home':
        event.preventDefault()
        onIndexChange(0)
        elements[0]?.focus()
        break
      case 'End':
        event.preventDefault()
        const lastIndex = elements.length - 1
        onIndexChange(lastIndex)
        elements[lastIndex]?.focus()
        break
    }
  }
}

export const screenReaderHelpers = {
  announce: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      liveRegionManager.announceUrgently(message)
    } else {
      liveRegionManager.announcePolitely(message)
    }
  }
}