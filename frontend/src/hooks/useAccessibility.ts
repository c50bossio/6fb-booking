import { useEffect, useCallback } from 'react'

/**
 * Custom hook for accessibility features
 */
export function useAccessibility() {
  // Handle keyboard navigation
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    // Skip to main content with Alt+M
    if (event.altKey && event.key === 'm') {
      const main = document.querySelector('main') || document.querySelector('[role="main"]')
      if (main instanceof HTMLElement) {
        main.focus()
        main.scrollIntoView({ behavior: 'smooth' })
      }
    }
    
    // Toggle high contrast mode with Alt+C
    if (event.altKey && event.key === 'c') {
      document.body.classList.toggle('high-contrast')
      localStorage.setItem(
        'highContrast', 
        document.body.classList.contains('high-contrast') ? 'true' : 'false'
      )
    }
  }, [])

  // Set up ARIA live regions for announcements
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const liveRegion = document.createElement('div')
    liveRegion.setAttribute('role', 'status')
    liveRegion.setAttribute('aria-live', priority)
    liveRegion.setAttribute('aria-atomic', 'true')
    liveRegion.className = 'sr-only'
    liveRegion.textContent = message
    
    document.body.appendChild(liveRegion)
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion)
    }, 1000)
  }, [])

  // Focus management utilities
  const focusTrap = useCallback((containerSelector: string) => {
    const container = document.querySelector(containerSelector)
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

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

    container.addEventListener('keydown', handleTabKey)
    
    return () => {
      container.removeEventListener('keydown', handleTabKey)
    }
  }, [])

  // Initialize accessibility features
  useEffect(() => {
    // Add keyboard navigation
    document.addEventListener('keydown', handleKeyboardNavigation)
    
    // Check for saved preferences
    const highContrast = localStorage.getItem('highContrast')
    if (highContrast === 'true') {
      document.body.classList.add('high-contrast')
    }
    
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (prefersReducedMotion.matches) {
      document.body.classList.add('reduce-motion')
    }
    
    // Listen for changes in motion preference
    const handleMotionPreference = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.body.classList.add('reduce-motion')
      } else {
        document.body.classList.remove('reduce-motion')
      }
    }
    
    prefersReducedMotion.addEventListener('change', handleMotionPreference)
    
    return () => {
      document.removeEventListener('keydown', handleKeyboardNavigation)
      prefersReducedMotion.removeEventListener('change', handleMotionPreference)
    }
  }, [handleKeyboardNavigation])

  return {
    announce,
    focusTrap
  }
}

// Screen reader only text component
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return (
    <span className="sr-only">
      {children}
    </span>
  )
}