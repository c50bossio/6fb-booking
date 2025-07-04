/**
 * Keyboard Navigation Enhancement Utilities
 * Provides improved keyboard accessibility across the application
 */

export interface KeyboardNavigationOptions {
  trapFocus?: boolean
  autoFocus?: boolean
  restoreFocus?: boolean
  escapeDeactivates?: boolean
  arrowNavigation?: boolean
  homeEndKeys?: boolean
}

/**
 * Focusable element selector
 */
const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  'details>summary:first-of-type',
  'details'
].join(',')

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll(FOCUSABLE_ELEMENTS))
}

/**
 * Trap focus within a container (for modals, dropdowns, etc.)
 */
export function trapFocus(container: HTMLElement, options: KeyboardNavigationOptions = {}) {
  const focusableElements = getFocusableElements(container)
  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]

  // Store currently focused element
  const previouslyFocused = document.activeElement as HTMLElement

  // Auto focus first element
  if (options.autoFocus && firstFocusable) {
    firstFocusable.focus()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }

    if (e.key === 'Escape' && options.escapeDeactivates) {
      releaseFocus()
    }
  }

  const releaseFocus = () => {
    container.removeEventListener('keydown', handleKeyDown)
    
    if (options.restoreFocus && previouslyFocused) {
      previouslyFocused.focus()
    }
  }

  container.addEventListener('keydown', handleKeyDown)

  return releaseFocus
}

/**
 * Enable arrow key navigation for lists, menus, etc.
 */
export function enableArrowNavigation(
  container: HTMLElement, 
  itemSelector: string = '[role="menuitem"], [role="option"], li > a, li > button'
) {
  const getNavigableItems = () => 
    Array.from(container.querySelectorAll(itemSelector)) as HTMLElement[]

  const handleKeyDown = (e: KeyboardEvent) => {
    const items = getNavigableItems()
    const currentIndex = items.findIndex(item => item === document.activeElement)

    let nextIndex = currentIndex

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0
        break
      case 'ArrowUp':
        e.preventDefault()
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1
        break
      case 'Home':
        e.preventDefault()
        nextIndex = 0
        break
      case 'End':
        e.preventDefault()
        nextIndex = items.length - 1
        break
      default:
        return
    }

    items[nextIndex]?.focus()
  }

  container.addEventListener('keydown', handleKeyDown)

  return () => container.removeEventListener('keydown', handleKeyDown)
}

/**
 * Announce content changes to screen readers
 */
export function announceToScreenReader(
  message: string, 
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.className = 'sr-only'
  announcement.textContent = message

  document.body.appendChild(announcement)

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Skip to main content link handler
 */
export function setupSkipLinks() {
  const skipLink = document.createElement('a')
  skipLink.href = '#main-content'
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-2 focus:rounded'
  skipLink.textContent = 'Skip to main content'

  document.body.insertBefore(skipLink, document.body.firstChild)

  skipLink.addEventListener('click', (e) => {
    e.preventDefault()
    const main = document.querySelector('#main-content, main, [role="main"]') as HTMLElement
    if (main) {
      main.tabIndex = -1
      main.focus()
      main.scrollIntoView()
    }
  })
}

/**
 * React hook for keyboard navigation
 */
export function useKeyboardNavigation(
  ref: React.RefObject<HTMLElement>,
  options: KeyboardNavigationOptions = {}
) {
  React.useEffect(() => {
    const element = ref.current
    if (!element) return

    let releaseFocus: (() => void) | undefined
    let removeArrowNav: (() => void) | undefined

    if (options.trapFocus) {
      releaseFocus = trapFocus(element, options)
    }

    if (options.arrowNavigation) {
      removeArrowNav = enableArrowNavigation(element)
    }

    return () => {
      releaseFocus?.()
      removeArrowNav?.()
    }
  }, [ref, options])
}

/**
 * React hook for keyboard shortcuts
 */
export function useKeyboardShortcut(
  key: string,
  callback: () => void,
  options: {
    ctrl?: boolean
    shift?: boolean
    alt?: boolean
    meta?: boolean
    preventDefault?: boolean
  } = {}
) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        !!e.ctrlKey === !!options.ctrl &&
        !!e.shiftKey === !!options.shift &&
        !!e.altKey === !!options.alt &&
        !!e.metaKey === !!options.meta
      ) {
        if (options.preventDefault !== false) {
          e.preventDefault()
        }
        callback()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [key, callback, options])
}

/**
 * Focus management utilities
 */
export const FocusManager = {
  /**
   * Move focus to the next focusable element
   */
  focusNext(currentElement: HTMLElement) {
    const focusables = getFocusableElements(document.body)
    const currentIndex = focusables.indexOf(currentElement)
    const nextElement = focusables[currentIndex + 1] || focusables[0]
    nextElement?.focus()
  },

  /**
   * Move focus to the previous focusable element
   */
  focusPrevious(currentElement: HTMLElement) {
    const focusables = getFocusableElements(document.body)
    const currentIndex = focusables.indexOf(currentElement)
    const prevElement = focusables[currentIndex - 1] || focusables[focusables.length - 1]
    prevElement?.focus()
  },

  /**
   * Save and restore focus
   */
  saveFocus() {
    const focused = document.activeElement as HTMLElement
    return () => focused?.focus()
  },

  /**
   * Focus first invalid form field
   */
  focusFirstInvalid(form: HTMLFormElement) {
    const firstInvalid = form.querySelector(':invalid') as HTMLElement
    firstInvalid?.focus()
  }
}

// Import React for hooks
import React from 'react'