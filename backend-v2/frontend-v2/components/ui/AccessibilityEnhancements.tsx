import React from 'react'
import { cn } from '@/lib/utils'
import { ARIA_LABELS } from '@/lib/ui-constants'

// Skip to main content link
export function SkipToMainContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
    >
      Skip to main content
    </a>
  )
}

// Screen reader only text
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>
}

// Accessible icon button
export function IconButton({
  icon,
  label,
  onClick,
  variant = 'default',
  size = 'md',
  disabled = false,
  className = '',
  ...props
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  variant?: 'default' | 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  [key: string]: any
}) {
  const variantClasses = {
    default: 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600',
    primary: 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
    ghost: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
  }
  
  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      {...props}
    >
      {icon}
      <ScreenReaderOnly>{label}</ScreenReaderOnly>
    </button>
  )
}

// Accessible loading spinner
export function AccessibleLoadingSpinner({
  size = 'md',
  label = 'Loading...',
  className = ''
}: {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  className?: string
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  }
  
  return (
    <div role="status" aria-label={label} className={cn('inline-block', className)}>
      <svg
        className={cn('animate-spin text-current', sizeClasses[size])}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <ScreenReaderOnly>{label}</ScreenReaderOnly>
    </div>
  )
}

// Focus trap for modals
export function FocusTrap({
  children,
  active = true,
  returnFocus = true
}: {
  children: React.ReactNode
  active?: boolean
  returnFocus?: boolean
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const previousActiveElement = React.useRef<HTMLElement | null>(null)
  
  React.useEffect(() => {
    if (!active) return
    
    previousActiveElement.current = document.activeElement as HTMLElement
    
    const container = containerRef.current
    if (!container) return
    
    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    
    const firstFocusable = focusableElements[0] as HTMLElement
    const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement
    
    // Focus first element
    firstFocusable?.focus()
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault()
          lastFocusable?.focus()
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault()
          firstFocusable?.focus()
        }
      }
    }
    
    container.addEventListener('keydown', handleKeyDown)
    
    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      
      // Return focus to previous element
      if (returnFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [active, returnFocus])
  
  return (
    <div ref={containerRef}>
      {children}
    </div>
  )
}

// Accessible form field
export function AccessibleFormField({
  id,
  label,
  error,
  required = false,
  description,
  children
}: {
  id: string
  label: string
  error?: string
  required?: boolean
  description?: string
  children: React.ReactElement
}) {
  const descriptionId = description ? `${id}-description` : undefined
  const errorId = error ? `${id}-error` : undefined
  
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && (
          <span className="text-red-500 ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
      
      {React.cloneElement(children, {
        id,
        'aria-required': required,
        'aria-invalid': !!error,
        'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined
      })}
      
      {error && (
        <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// Keyboard navigation hook
export function useKeyboardNavigation(items: any[], options?: {
  onSelect?: (item: any, index: number) => void
  onEscape?: () => void
  wrap?: boolean
}) {
  const [focusedIndex, setFocusedIndex] = React.useState(-1)
  
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIndex(prev => {
          const next = prev + 1
          if (next >= items.length) {
            return options?.wrap ? 0 : items.length - 1
          }
          return next
        })
        break
        
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIndex(prev => {
          const next = prev - 1
          if (next < 0) {
            return options?.wrap ? items.length - 1 : 0
          }
          return next
        })
        break
        
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          options?.onSelect?.(items[focusedIndex], focusedIndex)
        }
        break
        
      case 'Escape':
        e.preventDefault()
        options?.onEscape?.()
        break
        
      case 'Home':
        e.preventDefault()
        setFocusedIndex(0)
        break
        
      case 'End':
        e.preventDefault()
        setFocusedIndex(items.length - 1)
        break
    }
  }, [items, focusedIndex, options])
  
  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown,
    getItemProps: (index: number) => ({
      tabIndex: focusedIndex === index ? 0 : -1,
      'data-focused': focusedIndex === index
    })
  }
}

// Live region for announcements
export function LiveRegion({
  message,
  type = 'polite',
  clearAfter = 3000
}: {
  message: string
  type?: 'polite' | 'assertive'
  clearAfter?: number
}) {
  const [currentMessage, setCurrentMessage] = React.useState(message)
  
  React.useEffect(() => {
    setCurrentMessage(message)
    
    if (message && clearAfter > 0) {
      const timer = setTimeout(() => {
        setCurrentMessage('')
      }, clearAfter)
      
      return () => clearTimeout(timer)
    }
  }, [message, clearAfter])
  
  return (
    <div
      role="status"
      aria-live={type}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  )
}

// Accessible progress bar
export function AccessibleProgressBar({
  value,
  max = 100,
  label,
  showLabel = true,
  className = ''
}: {
  value: number
  max?: number
  label: string
  showLabel?: boolean
  className?: string
}) {
  const percentage = Math.round((value / max) * 100)
  
  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300">{label}</span>
          <span className="text-gray-600 dark:text-gray-400">{percentage}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2"
      >
        <div
          className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}