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