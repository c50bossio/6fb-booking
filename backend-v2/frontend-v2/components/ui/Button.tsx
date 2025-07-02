'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  // Base styles with clean, modern design
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 rounded-lg',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 shadow-sm hover:shadow-md active:bg-primary-700',
        secondary: 'bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 border border-secondary-300 dark:border-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-700 focus:ring-primary-500 shadow-sm',
        outline: 'bg-transparent border border-primary-500 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/50 focus:ring-primary-500',
        ghost: 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-800 hover:text-primary-600 dark:hover:text-primary-400 focus:ring-secondary-300',
        destructive: 'bg-error-500 text-white hover:bg-error-600 focus:ring-error-500 shadow-sm hover:shadow-md active:bg-error-700',
      },
      size: {
        xs: 'text-xs px-3 py-2 min-h-[36px]',
        sm: 'text-sm px-4 py-2.5 min-h-[44px]',
        md: 'text-sm px-6 py-3 min-h-[44px]',
        lg: 'text-base px-8 py-4 min-h-[48px]',
        xl: 'text-lg px-10 py-5 min-h-[52px]',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
      loading: {
        true: 'relative text-transparent cursor-wait',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  'aria-label'?: string
  'aria-describedby'?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    loading = false,
    loadingText = 'Loading...',
    disabled,
    children,
    leftIcon,
    rightIcon,
    onClick,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick && !isDisabled) {
        onClick(e)
      }
    }

    const spinnerSize = React.useMemo(() => {
      switch (size) {
        case 'xs': return 'h-3 w-3'
        case 'sm': return 'h-4 w-4'
        case 'md': return 'h-4 w-4'
        case 'lg': return 'h-5 w-5'
        case 'xl': return 'h-6 w-6'
        default: return 'h-4 w-4'
      }
    }, [size])

    return (
      <button
        className={buttonVariants({ variant, size, fullWidth, loading, className })}
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        aria-label={loading ? loadingText : ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner overlay */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg 
              className={`animate-spin ${spinnerSize} text-current`}
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
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
                d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </span>
        )}
        
        {/* Button content */}
        <span className={`${loading ? 'invisible' : 'flex items-center justify-center'} ${leftIcon || rightIcon ? 'gap-2' : ''}`}>
          {leftIcon && (
            <span className="flex-shrink-0">
              {leftIcon}
            </span>
          )}
          <span>{children}</span>
          {rightIcon && (
            <span className="flex-shrink-0">
              {rightIcon}
            </span>
          )}
        </span>
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }