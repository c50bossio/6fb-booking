import { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Comprehensive accessibility hooks for BookedBarber V2
 */

// Focus management hook
export function useFocusTrap(isActive: boolean = true) {
  const containerRef = useRef<HTMLElement>(null)
  
  useEffect(() => {
    if (!isActive || !containerRef.current) return
    
    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
    
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }
    
    // Focus first element on mount
    firstElement?.focus()
    
    container.addEventListener('keydown', handleTabKey)
    return () => container.removeEventListener('keydown', handleTabKey)
  }, [isActive])
  
  return containerRef
}

// Keyboard navigation hook
export function useKeyboardNavigation(
  items: any[],
  options: {
    onSelect?: (item: any, index: number) => void
    onCancel?: () => void
    orientation?: 'horizontal' | 'vertical' | 'grid'
    loop?: boolean
    gridColumns?: number
  } = {}
) {
  const {
    onSelect,
    onCancel,
    orientation = 'vertical',
    loop = true,
    gridColumns = 1,
  } = options
  
  const [focusedIndex, setFocusedIndex] = useState(-1)
  
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const lastIndex = items.length - 1
      let nextIndex = focusedIndex
      
      switch (e.key) {
        case 'ArrowDown':
          if (orientation === 'vertical' || orientation === 'grid') {
            e.preventDefault()
            nextIndex = orientation === 'grid' 
              ? Math.min(focusedIndex + gridColumns, lastIndex)
              : focusedIndex + 1
          }
          break
          
        case 'ArrowUp':
          if (orientation === 'vertical' || orientation === 'grid') {
            e.preventDefault()
            nextIndex = orientation === 'grid'
              ? Math.max(focusedIndex - gridColumns, 0)
              : focusedIndex - 1
          }
          break
          
        case 'ArrowRight':
          if (orientation === 'horizontal' || orientation === 'grid') {
            e.preventDefault()
            nextIndex = focusedIndex + 1
          }
          break
          
        case 'ArrowLeft':
          if (orientation === 'horizontal' || orientation === 'grid') {
            e.preventDefault()
            nextIndex = focusedIndex - 1
          }
          break
          
        case 'Home':
          e.preventDefault()
          nextIndex = 0
          break
          
        case 'End':
          e.preventDefault()
          nextIndex = lastIndex
          break
          
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (focusedIndex >= 0 && focusedIndex <= lastIndex) {
            onSelect?.(items[focusedIndex], focusedIndex)
          }
          break
          
        case 'Escape':
          e.preventDefault()
          onCancel?.()
          break
          
        default:
          return
      }
      
      // Handle wrapping
      if (loop) {
        if (nextIndex > lastIndex) nextIndex = 0
        if (nextIndex < 0) nextIndex = lastIndex
      } else {
        nextIndex = Math.max(0, Math.min(nextIndex, lastIndex))
      }
      
      if (nextIndex !== focusedIndex) {
        setFocusedIndex(nextIndex)
      }
    },
    [focusedIndex, items.length, onSelect, onCancel, orientation, loop, gridColumns]
  )
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
  
  return {
    focusedIndex,
    setFocusedIndex,
    resetFocus: () => setFocusedIndex(-1),
  }
}

// Announcements hook for screen readers
export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState('')
  const announcementRef = useRef<HTMLDivElement>(null)
  
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncement('')
    
    // Clear and re-announce to ensure it's read
    setTimeout(() => {
      setAnnouncement(message)
      if (announcementRef.current) {
        announcementRef.current.setAttribute('aria-live', priority)
      }
    }, 100)
    
    // Clear after announcement
    setTimeout(() => {
      setAnnouncement('')
    }, 1000)
  }, [])
  
  const getAnnouncementElement = () => (
    <div
      ref={announcementRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
  
  return { announce, getAnnouncementElement }
}

// Skip navigation hook
export function useSkipNavigation() {
  const [isVisible, setIsVisible] = useState(false)
  
  const handleFocus = () => setIsVisible(true)
  const handleBlur = () => setIsVisible(false)
  
  const getSkipLink = ({ href = '#main-content', children = 'Skip to main content' } = {}) => (
    <a
      href={href}
      className={`
        fixed top-4 left-4 z-50 px-4 py-2 bg-primary text-primary-foreground
        rounded-md transition-all duration-200
        ${isVisible ? 'translate-x-0' : '-translate-x-full'}
        focus:translate-x-0 focus:outline-none focus:ring-2 focus:ring-ring
      `}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </a>
  )
  
  return { getSkipLink }
}

// High contrast mode detection
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = useState(false)
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setIsHighContrast(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setIsHighContrast(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  return isHighContrast
}

// Reduced motion preference
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])
  
  return prefersReducedMotion
}

// ARIA live region for dynamic content
export function useLiveRegion() {
  const regionRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<Array<{ id: string; text: string }>>([])
  
  const announce = useCallback((message: string) => {
    const id = Date.now().toString()
    setMessages(prev => [...prev, { id, text: message }])
    
    // Remove message after announcement
    setTimeout(() => {
      setMessages(prev => prev.filter(msg => msg.id !== id))
    }, 5000)
  }, [])
  
  const getLiveRegion = () => (
    <div
      ref={regionRef}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {messages.map(msg => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  )
  
  return { announce, getLiveRegion }
}

// Accessible tooltip hook
export function useTooltip() {
  const [isOpen, setIsOpen] = useState(false)
  const tooltipId = useRef(`tooltip-${Date.now()}`).current
  
  const triggerProps = {
    'aria-describedby': isOpen ? tooltipId : undefined,
    onMouseEnter: () => setIsOpen(true),
    onMouseLeave: () => setIsOpen(false),
    onFocus: () => setIsOpen(true),
    onBlur: () => setIsOpen(false),
  }
  
  const tooltipProps = {
    id: tooltipId,
    role: 'tooltip',
    'aria-hidden': !isOpen,
  }
  
  return {
    isOpen,
    triggerProps,
    tooltipProps,
  }
}

// Form validation announcements
export function useFormValidation() {
  const { announce } = useAnnouncement()
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  const setFieldError = useCallback((field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }))
    announce(`Error in ${field}: ${error}`, 'assertive')
  }, [announce])
  
  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev }
      delete newErrors[field]
      return newErrors
    })
  }, [])
  
  const getFieldProps = (field: string) => ({
    'aria-invalid': !!errors[field],
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  })
  
  const getErrorProps = (field: string) => ({
    id: `${field}-error`,
    role: 'alert',
    'aria-live': 'assertive',
  })
  
  return {
    errors,
    setFieldError,
    clearFieldError,
    getFieldProps,
    getErrorProps,
  }
}

// Accessible dialog hook
export function useAccessibleDialog(isOpen: boolean) {
  const previousActiveElement = useRef<HTMLElement | null>(null)
  
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      previousActiveElement.current?.focus()
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])
  
  const dialogProps = {
    role: 'dialog',
    'aria-modal': true,
    'aria-hidden': !isOpen,
  }
  
  return dialogProps
}