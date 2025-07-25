/**
 * WCAG 2.1 AA Accessibility Utilities and Hooks
 * Comprehensive accessibility helpers for building inclusive applications
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'

// Focus management
export function useFocusTrap(isActive: boolean) {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    function handleTabKey(e: KeyboardEvent) {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    // Focus first element when trap becomes active
    if (firstElement) {
      firstElement.focus()
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isActive])

  return containerRef
}

// Auto-focus hook
export function useAutoFocus(condition: boolean = true) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (condition && ref.current) {
      ref.current.focus()
    }
  }, [condition])

  return ref
}

// Skip link functionality
export function useSkipToContent() {
  const skipToMain = () => {
    const main = document.querySelector('main')
    if (main) {
      main.setAttribute('tabindex', '-1')
      main.focus()
      main.addEventListener('blur', () => {
        main.removeAttribute('tabindex')
      }, { once: true })
    }
  }

  return skipToMain
}

// Screen reader announcements
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.setAttribute('aria-hidden', 'false')
  announcement.style.position = 'absolute'
  announcement.style.left = '-10000px'
  announcement.style.width = '1px'
  announcement.style.height = '1px'
  announcement.style.overflow = 'hidden'

  document.body.appendChild(announcement)
  announcement.textContent = message

  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

// Keyboard navigation utilities
export const keyboardNavigationKeys = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab'
} as const

export function handleKeyboardNavigation(
  event: KeyboardEvent,
  handlers: Partial<Record<keyof typeof keyboardNavigationKeys, () => void>>
) {
  const key = event.key
  const handler = Object.entries(keyboardNavigationKeys).find(
    ([, value]) => value === key
  )?.[0] as keyof typeof keyboardNavigationKeys

  if (handler && handlers[handler]) {
    event.preventDefault()
    handlers[handler]!()
  }
}

// ARIA utilities
export function generateId(prefix: string = 'id'): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

export function getAriaDescribedBy(...ids: (string | undefined)[]): string | undefined {
  const validIds = ids.filter(Boolean)
  return validIds.length > 0 ? validIds.join(' ') : undefined
}

// Color contrast validation
export function getContrastRatio(color1: string, color2: string): number {
  // Simplified contrast ratio calculation
  // In a real implementation, you'd want a more robust color parsing function
  const getLuminance = (color: string): number => {
    // This is a simplified version - you'd need proper color parsing
    const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0]
    const [r, g, b] = rgb.map(val => {
      val = val / 255
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const lum1 = getLuminance(color1)
  const lum2 = getLuminance(color2)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)

  return (lighter + 0.05) / (darker + 0.05)
}

export function meetsContrastRequirements(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  fontSize: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background)
  
  if (level === 'AAA') {
    return fontSize === 'large' ? ratio >= 4.5 : ratio >= 7
  } else {
    return fontSize === 'large' ? ratio >= 3 : ratio >= 4.5
  }
}

// Reduced motion detection
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = React.useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return reducedMotion
}

// Form accessibility helpers
export function getAriaInvalid(hasError: boolean): 'true' | 'false' | undefined {
  return hasError ? 'true' : undefined
}

export function getAriaRequired(required: boolean): 'true' | undefined {
  return required ? 'true' : undefined
}

// Touch target helpers
export function ensureTouchTarget(element: HTMLElement, minSize: number = 44): void {
  const rect = element.getBoundingClientRect()
  if (rect.width < minSize || rect.height < minSize) {
    console.warn(`Touch target is smaller than ${minSize}px:`, element)
  }
}

// High contrast mode detection
export function useHighContrastMode() {
  const [highContrast, setHighContrast] = React.useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setHighContrast(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setHighContrast(e.matches)
    mediaQuery.addEventListener('change', handler)
    
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return highContrast
}

// =============================================================================
// ENHANCED WCAG 2.1 AA COMPLIANCE UTILITIES
// =============================================================================

/**
 * Comprehensive ARIA attribute helpers
 */
export const ariaHelpers = {
  /**
   * Generate ARIA attributes for buttons
   */
  button: (options: {
    pressed?: boolean
    expanded?: boolean
    hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog'
    controls?: string
    describedBy?: string
    label?: string
    disabled?: boolean
  }) => ({
    'aria-pressed': options.pressed,
    'aria-expanded': options.expanded,
    'aria-haspopup': options.hasPopup,
    'aria-controls': options.controls,
    'aria-describedby': options.describedBy,
    'aria-label': options.label,
    'aria-disabled': options.disabled,
    ...(options.disabled && { tabIndex: -1 }),
  }),

  /**
   * Generate ARIA attributes for form inputs
   */
  input: (options: {
    required?: boolean
    invalid?: boolean
    describedBy?: string
    labelledBy?: string
    errorMessage?: string
    helpText?: string
  }) => ({
    'aria-required': options.required,
    'aria-invalid': options.invalid,
    'aria-describedby': [
      options.describedBy,
      options.errorMessage && `${options.describedBy || 'input'}-error`,
      options.helpText && `${options.describedBy || 'input'}-help`,
    ].filter(Boolean).join(' ') || undefined,
    'aria-labelledby': options.labelledBy,
  }),

  /**
   * Generate ARIA attributes for navigation
   */
  navigation: (options: {
    label?: string
    current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time'
    level?: number
  }) => ({
    'aria-label': options.label,
    'aria-current': options.current,
    'aria-level': options.level,
  }),

  /**
   * Generate ARIA attributes for dialogs/modals
   */
  dialog: (options: {
    modal?: boolean
    labelledBy?: string
    describedBy?: string
  }) => ({
    role: 'dialog',
    'aria-modal': options.modal,
    'aria-labelledby': options.labelledBy,
    'aria-describedby': options.describedBy,
  }),

  /**
   * Generate ARIA attributes for live regions
   */
  liveRegion: (options: {
    politeness?: 'polite' | 'assertive' | 'off'
    atomic?: boolean
    relevant?: 'additions' | 'removals' | 'text' | 'all'
  }) => ({
    'aria-live': options.politeness || 'polite',
    'aria-atomic': options.atomic,
    'aria-relevant': options.relevant,
  }),
}

/**
 * Enhanced focus management utilities
 */
export const focusHelpers = {
  /**
   * Get all focusable elements within a container
   */
  getFocusableElements: (container: HTMLElement): HTMLElement[] => {
    const selector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable="true"]'
    return Array.from(container.querySelectorAll(selector)) as HTMLElement[]
  },

  /**
   * Focus first focusable element in container
   */
  focusFirst: (container: HTMLElement) => {
    const focusable = focusHelpers.getFocusableElements(container)[0]
    focusable?.focus()
  },

  /**
   * Return focus to previously focused element
   */
  returnFocus: (element: HTMLElement | null) => {
    if (element && element.focus) {
      element.focus()
    }
  },

  /**
   * Check if element is focusable
   */
  isFocusable: (element: HTMLElement): boolean => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ]

    return focusableSelectors.some(selector => element.matches(selector))
  },

  /**
   * Enhanced focus trap with better keyboard navigation
   */
  createFocusTrap: (container: HTMLElement) => {
    const focusableElements = focusHelpers.getFocusableElements(container)
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    firstElement?.focus()

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
    }
  },
}

/**
 * Enhanced color contrast validation utilities
 */
export const colorHelpers = {
  /**
   * Calculate luminance of a color (RGB values 0-255)
   */
  getLuminance: (r: number, g: number, b: number): number => {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  },

  /**
   * Calculate contrast ratio between two colors
   */
  getContrastRatio: (color1: [number, number, number], color2: [number, number, number]): number => {
    const lum1 = colorHelpers.getLuminance(...color1)
    const lum2 = colorHelpers.getLuminance(...color2)
    const brightest = Math.max(lum1, lum2)
    const darkest = Math.min(lum1, lum2)
    return (brightest + 0.05) / (darkest + 0.05)
  },

  /**
   * Check if color combination meets WCAG AA standards
   */
  meetsWCAGAA: (foreground: [number, number, number], background: [number, number, number], isLargeText = false): boolean => {
    const ratio = colorHelpers.getContrastRatio(foreground, background)
    return isLargeText ? ratio >= 3 : ratio >= 4.5
  },

  /**
   * Check if color combination meets WCAG AAA standards
   */
  meetsWCAGAAA: (foreground: [number, number, number], background: [number, number, number], isLargeText = false): boolean => {
    const ratio = colorHelpers.getContrastRatio(foreground, background)
    return isLargeText ? ratio >= 4.5 : ratio >= 7
  },

  /**
   * Convert hex color to RGB
   */
  hexToRgb: (hex: string): [number, number, number] | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : null
  },

  /**
   * Validate color contrast and provide feedback
   */
  validateContrast: (
    foregroundHex: string, 
    backgroundHex: string, 
    isLargeText = false
  ): {
    ratio: number
    meetsAA: boolean
    meetsAAA: boolean
    recommendation?: string
  } => {
    const fg = colorHelpers.hexToRgb(foregroundHex)
    const bg = colorHelpers.hexToRgb(backgroundHex)
    
    if (!fg || !bg) {
      return { ratio: 0, meetsAA: false, meetsAAA: false, recommendation: 'Invalid color format' }
    }

    const ratio = colorHelpers.getContrastRatio(fg, bg)
    const meetsAA = colorHelpers.meetsWCAGAA(fg, bg, isLargeText)
    const meetsAAA = colorHelpers.meetsWCAGAAA(fg, bg, isLargeText)

    let recommendation = ''
    if (!meetsAA) {
      recommendation = `Contrast ratio ${ratio.toFixed(2)} is too low. Minimum required: ${isLargeText ? '3:1' : '4.5:1'}`
    } else if (!meetsAAA) {
      recommendation = `Meets AA standards but could be improved for AAA (${isLargeText ? '4.5:1' : '7:1'} required)`
    }

    return { ratio, meetsAA, meetsAAA, recommendation }
  },
}

/**
 * Keyboard navigation helpers
 */
export const keyboardHelpers = {
  /**
   * Handle arrow key navigation in a list
   */
  handleArrowNavigation: (
    event: KeyboardEvent,
    items: HTMLElement[],
    currentIndex: number,
    onIndexChange: (index: number) => void,
    options: {
      loop?: boolean
      horizontal?: boolean
      preventDefault?: boolean
    } = {}
  ) => {
    const { loop = true, horizontal = false, preventDefault = true } = options
    
    let newIndex = currentIndex
    const maxIndex = items.length - 1

    if (horizontal) {
      if (event.key === 'ArrowLeft') {
        newIndex = loop ? (currentIndex === 0 ? maxIndex : currentIndex - 1) : Math.max(0, currentIndex - 1)
      } else if (event.key === 'ArrowRight') {
        newIndex = loop ? (currentIndex === maxIndex ? 0 : currentIndex + 1) : Math.min(maxIndex, currentIndex + 1)
      }
    } else {
      if (event.key === 'ArrowUp') {
        newIndex = loop ? (currentIndex === 0 ? maxIndex : currentIndex - 1) : Math.max(0, currentIndex - 1)
      } else if (event.key === 'ArrowDown') {
        newIndex = loop ? (currentIndex === maxIndex ? 0 : currentIndex + 1) : Math.min(maxIndex, currentIndex + 1)
      }
    }

    if (newIndex !== currentIndex) {
      if (preventDefault) event.preventDefault()
      onIndexChange(newIndex)
      items[newIndex]?.focus()
    }
  },

  /**
   * Handle Home/End key navigation
   */
  handleHomeEndNavigation: (
    event: KeyboardEvent,
    items: HTMLElement[],
    onIndexChange: (index: number) => void
  ) => {
    if (event.key === 'Home') {
      event.preventDefault()
      onIndexChange(0)
      items[0]?.focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      const lastIndex = items.length - 1
      onIndexChange(lastIndex)
      items[lastIndex]?.focus()
    }
  },

  /**
   * Common keyboard event handlers
   */
  onEnterOrSpace: (callback: () => void) => (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      callback()
    }
  },

  onEscape: (callback: () => void) => (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      callback()
    }
  },
}

/**
 * Enhanced screen reader utilities
 */
export const screenReaderHelpers = {
  /**
   * Create a live region for announcements
   */
  createLiveRegion: (politeness: 'polite' | 'assertive' = 'polite'): HTMLElement => {
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('aria-live', politeness)
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;'
    document.body.appendChild(liveRegion)
    return liveRegion
  },

  /**
   * Enhanced announce function with cleanup
   */
  announce: (message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = screenReaderHelpers.createLiveRegion(politeness)
    liveRegion.textContent = message
    
    // Clean up after announcement
    setTimeout(() => {
      if (document.body.contains(liveRegion)) {
        document.body.removeChild(liveRegion)
      }
    }, 1000)
  },

  /**
   * Announce status changes
   */
  announceStatus: (status: string) => {
    screenReaderHelpers.announce(status, 'polite')
  },

  /**
   * Announce errors
   */
  announceError: (error: string) => {
    screenReaderHelpers.announce(`Error: ${error}`, 'assertive')
  },

  /**
   * Announce success messages
   */
  announceSuccess: (message: string) => {
    screenReaderHelpers.announce(`Success: ${message}`, 'polite')
  },

  /**
   * Announce navigation changes
   */
  announceNavigation: (location: string) => {
    screenReaderHelpers.announce(`Navigated to ${location}`, 'polite')
  },
}

/**
 * React hooks for enhanced accessibility
 */

/**
 * Hook for managing enhanced focus trap
 */
export const useEnhancedFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const cleanup = focusHelpers.createFocusTrap(containerRef.current)
    return cleanup
  }, [isActive])

  return containerRef
}

/**
 * Hook for keyboard navigation in lists/menus
 */
export const useKeyboardNavigation = (
  items: HTMLElement[],
  options: {
    loop?: boolean
    horizontal?: boolean
  } = {}
) => {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    keyboardHelpers.handleArrowNavigation(
      event,
      items,
      currentIndex,
      setCurrentIndex,
      options
    )
    keyboardHelpers.handleHomeEndNavigation(event, items, setCurrentIndex)
  }, [items, currentIndex, options])

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown,
  }
}

/**
 * Hook for screen reader announcements
 */
export const useScreenReader = () => {
  const announce = useCallback((message: string, politeness: 'polite' | 'assertive' = 'polite') => {
    screenReaderHelpers.announce(message, politeness)
  }, [])

  return {
    announce,
    announceStatus: screenReaderHelpers.announceStatus,
    announceError: screenReaderHelpers.announceError,
    announceSuccess: screenReaderHelpers.announceSuccess,
    announceNavigation: screenReaderHelpers.announceNavigation,
  }
}

/**
 * Hook for accessibility preferences
 */
export const useAccessibilityPreferences = () => {
  const [preferences, setPreferences] = useState({
    reducedMotion: false,
    highContrast: false,
    darkMode: false,
  })

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updatePreferences = () => {
      setPreferences({
        reducedMotion: reducedMotionQuery.matches,
        highContrast: highContrastQuery.matches,
        darkMode: darkModeQuery.matches,
      })
    }

    updatePreferences()

    reducedMotionQuery.addEventListener('change', updatePreferences)
    highContrastQuery.addEventListener('change', updatePreferences)
    darkModeQuery.addEventListener('change', updatePreferences)

    return () => {
      reducedMotionQuery.removeEventListener('change', updatePreferences)
      highContrastQuery.removeEventListener('change', updatePreferences)
      darkModeQuery.removeEventListener('change', updatePreferences)
    }
  }, [])

  return preferences
}

/**
 * React components for accessibility
 */

/**
 * Skip link component for keyboard navigation
 */
export const SkipLink = ({ 
  href = '#main', 
  children = 'Skip to main content',
  className = ''
}: {
  href?: string
  children?: React.ReactNode
  className?: string
}) => (
  <a
    href={href}
    className={`skip-link ${className}`}
    onFocus={(e) => {
      // Ensure the target element exists and is focusable
      const target = document.querySelector(href)
      if (target && !target.getAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1')
      }
    }}
  >
    {children}
  </a>
)

/**
 * Visually hidden component for screen reader only content
 */
export const VisuallyHidden = ({ 
  children, 
  className = '',
  as: Component = 'span',
  ...props 
}: React.HTMLAttributes<HTMLElement> & {
  as?: keyof JSX.IntrinsicElements
}) => {
  const Element = Component as any
  return (
    <Element
      className={`sr-only ${className}`}
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
      {...props}
    >
      {children}
    </Element>
  )
}

/**
 * WCAG compliance validation utilities
 */
export const wcagComplianceCheck = {
  /**
   * Validate form accessibility
   */
  validateForm: (form: HTMLFormElement): Array<{ element: HTMLElement; issue: string }> => {
    const issues: Array<{ element: HTMLElement; issue: string }> = []
    const inputs = form.querySelectorAll('input, select, textarea')

    inputs.forEach(input => {
      const htmlInput = input as HTMLInputElement
      
      // Check for labels
      if (!htmlInput.labels?.length && !htmlInput.getAttribute('aria-label') && !htmlInput.getAttribute('aria-labelledby')) {
        issues.push({ element: htmlInput, issue: 'Missing label' })
      }

      // Check required fields have aria-required
      if (htmlInput.required && !htmlInput.getAttribute('aria-required')) {
        issues.push({ element: htmlInput, issue: 'Required field missing aria-required' })
      }

      // Check error states
      if (htmlInput.getAttribute('aria-invalid') === 'true' && !htmlInput.getAttribute('aria-describedby')) {
        issues.push({ element: htmlInput, issue: 'Invalid field missing error description' })
      }
    })

    return issues
  },

  /**
   * Validate heading hierarchy
   */
  validateHeadings: (): Array<{ element: HTMLElement; issue: string }> => {
    const issues: Array<{ element: HTMLElement; issue: string }> = []
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    let previousLevel = 0

    headings.forEach(heading => {
      const currentLevel = parseInt(heading.tagName.charAt(1))
      
      if (currentLevel > previousLevel + 1) {
        issues.push({ 
          element: heading as HTMLElement, 
          issue: `Heading level skipped from h${previousLevel} to h${currentLevel}` 
        })
      }

      previousLevel = currentLevel
    })

    return issues
  },

  /**
   * Validate interactive elements
   */
  validateInteractiveElements: (): Array<{ element: HTMLElement; issue: string }> => {
    const issues: Array<{ element: HTMLElement; issue: string }> = []
    const interactive = document.querySelectorAll('button, a, input, select, textarea, [role="button"], [role="link"]')

    interactive.forEach(element => {
      const htmlElement = element as HTMLElement
      
      // Check for accessible names
      const hasAccessibleName = htmlElement.textContent?.trim() || 
                               htmlElement.getAttribute('aria-label') || 
                               htmlElement.getAttribute('aria-labelledby') ||
                               htmlElement.getAttribute('title')

      if (!hasAccessibleName) {
        issues.push({ element: htmlElement, issue: 'Interactive element missing accessible name' })
      }

      // Check focus visibility
      const computedStyle = window.getComputedStyle(htmlElement, ':focus')
      if (computedStyle.outline === 'none' && computedStyle.boxShadow === 'none') {
        issues.push({ element: htmlElement, issue: 'Interactive element missing focus indicator' })
      }
    })

    return issues
  },

  /**
   * Run complete accessibility audit
   */
  runAudit: (): { 
    passed: boolean
    issues: Array<{ element: HTMLElement; issue: string; severity: 'error' | 'warning' }>
  } => {
    const forms = document.querySelectorAll('form')
    const formIssues = Array.from(forms).flatMap(form => 
      wcagComplianceCheck.validateForm(form as HTMLFormElement)
    )

    const allIssues = [
      ...formIssues,
      ...wcagComplianceCheck.validateHeadings(),
      ...wcagComplianceCheck.validateInteractiveElements(),
    ]

    return {
      passed: allIssues.length === 0,
      issues: allIssues.map(issue => ({ ...issue, severity: 'error' as const })),
    }
  },
}

/**
 * Accessibility testing utilities for development
 */
export const a11yTestUtils = {
  /**
   * Log accessibility violations to console
   */
  logViolations: () => {
    const audit = wcagComplianceCheck.runAudit()
    if (audit.issues.length > 0) {
      console.group('🚨 Accessibility Violations Found')
      audit.issues.forEach(({ element, issue, severity }) => {
        console.warn(`[${severity.toUpperCase()}] ${issue}`, element)
      })
      console.groupEnd()
    } else {
    }
  },

  /**
   * Check color contrast for all text elements
   */
  checkColorContrast: () => {
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6, button, a, label')
    const violations: Array<{ element: HTMLElement; ratio: number; required: number }> = []

    textElements.forEach(element => {
      const computedStyle = window.getComputedStyle(element as HTMLElement)
      const color = computedStyle.color
      const backgroundColor = computedStyle.backgroundColor
      
      // Skip if background is transparent
      if (backgroundColor === 'rgba(0, 0, 0, 0)' || backgroundColor === 'transparent') return

      // This is a simplified check - in production you'd want more robust color parsing
      const colorMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
      const bgMatch = backgroundColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)

      if (colorMatch && bgMatch) {
        const fg: [number, number, number] = [
          parseInt(colorMatch[1]),
          parseInt(colorMatch[2]),
          parseInt(colorMatch[3])
        ]
        const bg: [number, number, number] = [
          parseInt(bgMatch[1]),
          parseInt(bgMatch[2]),
          parseInt(bgMatch[3])
        ]

        const fontSize = parseFloat(computedStyle.fontSize)
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && computedStyle.fontWeight === 'bold')

        if (!colorHelpers.meetsWCAGAA(fg, bg, isLargeText)) {
          violations.push({
            element: element as HTMLElement,
            ratio: colorHelpers.getContrastRatio(fg, bg),
            required: isLargeText ? 3 : 4.5
          })
        }
      }
    })

    if (violations.length > 0) {
      console.group('🎨 Color Contrast Violations')
      violations.forEach(({ element, ratio, required }) => {
        console.warn(`Contrast ratio ${ratio.toFixed(2)} is below required ${required}:1`, element)
      })
      console.groupEnd()
    } else {
    }
  },
}

// Development mode accessibility warnings
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Run accessibility checks after DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        a11yTestUtils.logViolations()
        a11yTestUtils.checkColorContrast()
      }, 1000)
    })
  } else {
    setTimeout(() => {
      a11yTestUtils.logViolations()
      a11yTestUtils.checkColorContrast()
    }, 1000)
  }
}