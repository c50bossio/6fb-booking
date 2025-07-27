'use client'

import * as React from 'react'
// Simple implementation without Radix UI Slot for now
// import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const accessibleButtonVariants = cva(
  // Base classes ensuring minimum 44x44px touch target and accessibility
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 min-h-[44px] min-w-[44px] relative',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline min-w-[44px] min-h-[44px] px-2'
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-11 px-3 text-xs', // Increased from h-9 to maintain 44px minimum
        lg: 'h-12 px-8',
        xl: 'h-14 px-10 text-base',
        icon: 'h-11 w-11', // Increased from h-10 w-10
        'icon-sm': 'h-11 w-11', // Maintained minimum size even for "small" icons
        'touch-target': 'h-12 w-12 p-0' // Explicit touch-friendly size
      },
      accessibility: {
        'high-contrast': 'border-2 border-foreground/20 hover:border-foreground/40',
        'motion-safe': 'transition-none',
        'focus-enhanced': 'focus-visible:ring-4 focus-visible:ring-primary/50'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof accessibleButtonVariants> {
  asChild?: boolean
  'aria-label'?: string
  loading?: boolean
  loadingText?: string
}

const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    accessibility,
    asChild = false, 
    loading = false,
    loadingText = 'Loading...',
    children,
    disabled,
    'aria-label': ariaLabel,
    ...props 
  }, ref) => {
    // For now, always use button element - can enhance with Slot later
    const Comp = 'button'
    
    // Ensure aria-label for icon-only buttons
    const needsAriaLabel = (size === 'icon' || size === 'icon-sm') && !ariaLabel && !children
    
    return (
      <Comp
        className={cn(accessibleButtonVariants({ variant, size, accessibility, className }))}
        ref={ref}
        disabled={disabled || loading}
        aria-label={ariaLabel || (needsAriaLabel ? 'Button' : undefined)}
        aria-busy={loading}
        aria-describedby={loading ? `${props.id}-loading` : undefined}
        {...props}
      >
        {loading ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
            </div>
            <span className="opacity-0">{children}</span>
            {loadingText && (
              <span id={`${props.id}-loading`} className="sr-only">
                {loadingText}
              </span>
            )}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
AccessibleButton.displayName = 'AccessibleButton'

export { AccessibleButton, accessibleButtonVariants }