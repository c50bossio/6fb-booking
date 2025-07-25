'use client'

import React, { useState, useEffect, useRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

/**
 * Global Modal Component with Universal Click-Outside-to-Exit
 * 
 * GLOBAL BEHAVIORS (enabled by default for ALL modals):
 * - Click outside modal overlay → closes modal
 * - Press ESC key → closes modal  
 * - Focus trapping within modal
 * - Body scroll prevention when open
 * 
 * To disable click-outside behavior, explicitly set closeOnOverlayClick={false}
 */

const modalVariants = cva(
  'relative bg-white dark:bg-gray-900 rounded-t-ios-2xl shadow-ios-2xl transform transition-all duration-300 ease-out',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
        '5xl': 'max-w-5xl',
        full: 'max-w-full',
        screen: 'w-screen h-screen rounded-none',
      },
      variant: {
        default: 'bg-white dark:bg-gray-900',
        glass: 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-ios border border-white/20 dark:border-white/10',
        gradient: 'bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800',
        premium: 'bg-gradient-to-br from-primary-50 to-accent-50 dark:from-primary-950 dark:to-accent-950',
      },
      position: {
        center: '',
        bottom: 'rounded-t-ios-2xl rounded-b-none',
        top: 'rounded-b-ios-2xl rounded-t-none',
        'header-aware': '', // No special border radius for header-aware position
      },
      overflow: {
        hidden: 'overflow-hidden',
        visible: 'overflow-visible',
        auto: 'overflow-auto',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
      position: 'bottom',
      overflow: 'visible',
    },
  }
)

const overlayVariants = cva(
  'fixed inset-0 flex items-end justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-all duration-300',
  {
    variants: {
      position: {
        center: 'items-center justify-center p-4',
        bottom: 'items-end justify-center',
        top: 'items-start justify-center pt-4',
        'adaptive': 'items-start justify-center p-4',
        'header-aware': 'items-start justify-center pt-48', // Position well below header with more spacing
      },
    },
    defaultVariants: {
      position: 'center',
    },
  }
)

export interface ModalProps extends VariantProps<typeof modalVariants> {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title?: string
  description?: string
  showCloseButton?: boolean
  /** Enable click outside modal to close. Defaults to true for all modals. */
  closeOnOverlayClick?: boolean
  /** Enable ESC key to close modal. Defaults to true. */
  closeOnEscape?: boolean
  preventScroll?: boolean
  trapFocus?: boolean
  className?: string
  overlayClassName?: string
  overflow?: 'hidden' | 'visible' | 'auto'
  /** Enable adaptive positioning to prevent cutoff. Defaults to false. */
  adaptivePositioning?: boolean
  /** Custom z-index for modal stacking. Defaults to 9999. */
  zIndex?: number
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({
    isOpen,
    onClose,
    children,
    title,
    description,
    size,
    variant,
    position,
    overflow,
    showCloseButton = true,
    closeOnOverlayClick = true, // Global default: clicking outside closes modal
    closeOnEscape = true,
    preventScroll = true,
    trapFocus = true,
    className,
    overlayClassName,
    adaptivePositioning = false,
    zIndex = 9999,
  }, ref) => {
    const [isVisible, setIsVisible] = useState(false)
    const [isAnimating, setIsAnimating] = useState(false)
    const modalRef = useRef<HTMLDivElement>(null)
    const previousFocus = useRef<HTMLElement | null>(null)
    const [adaptivePosition, setAdaptivePosition] = useState<'center' | 'top' | 'bottom' | 'adaptive'>(position || 'bottom')
    const [maxHeight, setMaxHeight] = useState<string>('80vh')

    // Adaptive positioning logic
    useEffect(() => {
      if (!adaptivePositioning || !isOpen) return

      const updatePosition = () => {
        if (!modalRef.current) return

        const viewportHeight = window.innerHeight
        const modalRect = modalRef.current.getBoundingClientRect()
        const modalHeight = modalRect.height

        // If modal is too tall for viewport, use adaptive positioning with scrolling
        if (modalHeight > viewportHeight * 0.9) {
          setAdaptivePosition('adaptive')
          setMaxHeight('90vh')
        } else if (modalHeight > viewportHeight * 0.7) {
          // Use center positioning with reduced max height
          setAdaptivePosition('center')
          setMaxHeight('80vh')
        } else {
          // Use original position
          setAdaptivePosition(position || 'center')
          setMaxHeight('80vh')
        }
      }

      // Update on mount and window resize
      updatePosition()
      window.addEventListener('resize', updatePosition)
      
      return () => window.removeEventListener('resize', updatePosition)
    }, [adaptivePositioning, isOpen, position])

    // Focus management
    useEffect(() => {
      if (isOpen && trapFocus) {
        previousFocus.current = document.activeElement as HTMLElement
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstFocusable = focusableElements?.[0] as HTMLElement
        firstFocusable?.focus()

        return () => {
          previousFocus.current?.focus()
        }
      }
    }, [isOpen, trapFocus])

    // Escape key handler
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && closeOnEscape && isOpen) {
          onClose()
        }
      }

      if (isOpen) {
        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
      }
    }, [isOpen, closeOnEscape, onClose])

    // Body scroll prevention
    useEffect(() => {
      if (isOpen && preventScroll) {
        const originalStyle = window.getComputedStyle(document.body).overflow
        document.body.style.overflow = 'hidden'
        return () => {
          document.body.style.overflow = originalStyle
        }
      }
    }, [isOpen, preventScroll])

    // Animation handling
    useEffect(() => {
      if (isOpen) {
        setIsVisible(true)
        setIsAnimating(true)
        // Allow time for the modal to mount before animating
        requestAnimationFrame(() => {
          setIsAnimating(false)
        })
      } else {
        setIsAnimating(true)
        const timer = setTimeout(() => {
          setIsVisible(false)
          setIsAnimating(false)
        }, 300) // Match transition duration
        return () => clearTimeout(timer)
      }
    }, [isOpen])

    // Focus trap
    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (!trapFocus) return

      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstFocusable = focusableElements?.[0] as HTMLElement
        const lastFocusable = focusableElements?.[focusableElements.length - 1] as HTMLElement

        if (event.shiftKey) {
          if (document.activeElement === firstFocusable) {
            event.preventDefault()
            lastFocusable?.focus()
          }
        } else {
          if (document.activeElement === lastFocusable) {
            event.preventDefault()
            firstFocusable?.focus()
          }
        }
      }
    }

    if (!isVisible) return null

    const effectivePosition = adaptivePositioning ? adaptivePosition : position
    const slideTransform = effectivePosition === 'bottom' 
      ? isAnimating ? 'translate-y-full' : 'translate-y-0'
      : effectivePosition === 'top' || effectivePosition === 'adaptive'
      ? isAnimating ? '-translate-y-full' : 'translate-y-0'
      : isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100'

    // Modal positioning debug (removed console.log for production)

    return (
      <div
        className={overlayVariants({ 
          position: effectivePosition, 
          className: `${isAnimating ? 'opacity-0' : 'opacity-100'} ${overlayClassName || ''}` 
        })}
        style={{ 
          zIndex: zIndex + 1000, // Much higher z-index to avoid conflicts
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0
        }}
        onClick={(e) => {
          // Robust click-outside detection
          if (closeOnOverlayClick) {
            const clickedElement = e.target as HTMLElement;
            const modalContent = clickedElement.closest('[role="dialog"]');
            
            // If click is outside modal content, close it
            if (!modalContent) {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }
          }
        }}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
      >
        <div
          ref={(node) => {
            if (node) {
              (modalRef as any).current = node
            }
            if (typeof ref === 'function') {
              ref(node)
            } else if (ref && node) {
              (ref as any).current = node
            }
          }}
          className={modalVariants({ 
            size, 
            variant, 
            position: effectivePosition,
            overflow,
            className: `${slideTransform} ${className || ''}` 
          })}
          style={{ 
            maxHeight: adaptivePositioning ? maxHeight : undefined,
            maxWidth: '90vw',
            width: 'auto'
          }}
          onClick={(e) => {
            e.stopPropagation()
            // Ensure clicks inside modal content don't close the modal
          }}
        >
          {/* Modal Handle (iOS-style) */}
          {effectivePosition === 'bottom' && (
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            </div>
          )}

          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1">
                {title && (
                  <h2 
                    id="modal-title" 
                    className="text-lg font-semibold text-gray-900 dark:text-white"
                  >
                    {title}
                  </h2>
                )}
                {description && (
                  <p 
                    id="modal-description" 
                    className="text-sm text-gray-600 dark:text-gray-400 mt-1"
                  >
                    {description}
                  </p>
                )}
              </div>
              
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="ml-4 p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className={`flex-1 ${adaptivePositioning && adaptivePosition === 'adaptive' ? 'overflow-y-auto' : ''}`}>
            {children}
          </div>
        </div>
      </div>
    )
  }
)

Modal.displayName = 'Modal'

// Modal Header Component
interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${className || ''}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ModalHeader.displayName = 'ModalHeader'

// Modal Body Component
interface ModalBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const ModalBody = React.forwardRef<HTMLDivElement, ModalBodyProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-6 py-4 overflow-visible ${className || ''}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ModalBody.displayName = 'ModalBody'

// Modal Footer Component
interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-end gap-3 ${className || ''}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

ModalFooter.displayName = 'ModalFooter'

export { Modal, ModalHeader, ModalBody, ModalFooter, modalVariants }