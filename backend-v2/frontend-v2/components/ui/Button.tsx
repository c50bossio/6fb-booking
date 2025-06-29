'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const buttonVariants = cva(
  // Base styles with iOS-inspired design
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95',
  {
    variants: {
      variant: {
        primary: 'bg-primary-500 text-white hover:bg-primary-600 dark:hover:bg-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 shadow-ios hover:shadow-ios-md active:bg-primary-700 dark:active:bg-primary-300 active:shadow-ios-sm',
        secondary: 'bg-white dark:bg-zinc-800 text-accent-800 dark:text-zinc-200 border border-ios-gray-300 dark:border-zinc-600 hover:bg-ios-gray-50 dark:hover:bg-zinc-700 hover:border-primary-400 dark:hover:border-primary-500 focus:ring-primary-500 dark:focus:ring-primary-400 shadow-ios',
        accent: 'bg-accent-800 dark:bg-accent-700 text-white hover:bg-accent-900 dark:hover:bg-accent-600 focus:ring-accent-700 dark:focus:ring-accent-500 shadow-ios-md hover:shadow-ios-lg active:shadow-ios',
        ghost: 'text-accent-700 dark:text-zinc-300 hover:bg-ios-gray-100 dark:hover:bg-zinc-800 hover:text-primary-600 dark:hover:text-primary-400 focus:ring-ios-gray-300 dark:focus:ring-zinc-600 active:bg-ios-gray-200 dark:active:bg-zinc-700',
        outline: 'bg-transparent border-2 border-primary-500 dark:border-primary-400 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/50 hover:border-primary-600 dark:hover:border-primary-300 focus:ring-primary-500 dark:focus:ring-primary-400 active:bg-primary-100 dark:active:bg-primary-900/50',
        destructive: 'bg-error-500 text-white hover:bg-error-600 dark:hover:bg-error-400 focus:ring-error-500 dark:focus:ring-error-400 shadow-ios hover:shadow-ios-md active:bg-error-700 dark:active:bg-error-300',
        success: 'bg-success-500 text-white hover:bg-success-600 dark:hover:bg-success-400 focus:ring-success-500 dark:focus:ring-success-400 shadow-ios hover:shadow-ios-md active:bg-success-700 dark:active:bg-success-300',
        warning: 'bg-warning-500 text-white hover:bg-warning-600 dark:hover:bg-warning-400 focus:ring-warning-500 dark:focus:ring-warning-400 shadow-ios hover:shadow-ios-md active:bg-warning-700 dark:active:bg-warning-300',
        info: 'bg-info-500 text-white hover:bg-info-600 dark:hover:bg-info-400 focus:ring-info-500 dark:focus:ring-info-400 shadow-ios hover:shadow-ios-md active:bg-info-700 dark:active:bg-info-300',
        glass: 'bg-white/10 dark:bg-zinc-800/50 backdrop-blur-ios border border-white/20 dark:border-zinc-700/50 text-accent-800 dark:text-zinc-200 hover:bg-white/20 dark:hover:bg-zinc-700/60 focus:ring-primary-500 dark:focus:ring-primary-400 shadow-glass',
        gradient: 'bg-gradient-to-r from-primary-500 to-accent-600 dark:from-primary-400 dark:to-accent-500 text-white hover:from-primary-600 hover:to-accent-700 dark:hover:from-primary-300 dark:hover:to-accent-400 focus:ring-primary-500 dark:focus:ring-primary-400 shadow-premium',
        premium: 'bg-gradient-to-r from-gold-400 to-gold-600 dark:from-gold-300 dark:to-gold-500 text-white hover:from-gold-500 hover:to-gold-700 dark:hover:from-gold-200 dark:hover:to-gold-400 focus:ring-gold-500 dark:focus:ring-gold-400 shadow-premium-colored',
      },
      size: {
        xs: 'text-ios-caption1 px-2 py-1 rounded-md',
        sm: 'text-ios-footnote px-3 py-1.5 rounded-ios',
        md: 'text-ios-body px-4 py-2 rounded-ios',
        lg: 'text-ios-headline px-6 py-3 rounded-ios-lg',
        xl: 'text-ios-title3 px-8 py-4 rounded-ios-xl',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
      loading: {
        true: 'relative text-transparent cursor-wait',
      },
      elevated: {
        true: 'shadow-ios-lg hover:shadow-ios-xl transform-gpu hover:-translate-y-0.5',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false,
      elevated: false,
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
  hapticFeedback?: boolean
  animationDelay?: number
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    elevated,
    loading = false,
    loadingText = 'Loading...',
    disabled,
    children,
    leftIcon,
    rightIcon,
    hapticFeedback = false,
    animationDelay = 0,
    onClick,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // iOS-style haptic feedback simulation
      if (hapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(10)
      }
      
      if (onClick && !isDisabled) {
        onClick(e)
      }
    }

    const spinnerSize = React.useMemo(() => {
      switch (size) {
        case 'xs': return 'h-3 w-3'
        case 'sm': return 'h-4 w-4'
        case 'md': return 'h-5 w-5'
        case 'lg': return 'h-6 w-6'
        case 'xl': return 'h-7 w-7'
        default: return 'h-5 w-5'
      }
    }, [size])

    return (
      <button
        className={buttonVariants({ variant, size, fullWidth, elevated, loading, className })}
        ref={ref}
        disabled={isDisabled}
        onClick={handleClick}
        style={{ animationDelay: `${animationDelay}ms` }}
        {...props}
      >
        {/* Loading spinner overlay with iOS-style animation */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              <svg 
                className={`animate-spin ${spinnerSize} text-current opacity-90`}
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-20" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="3"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {/* iOS-style loading dots */}
              <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-1">
                <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1 h-1 bg-current rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </span>
        )}
        
        {/* Button content with enhanced spacing */}
        <span className={`${loading ? 'invisible' : 'flex items-center justify-center'} ${leftIcon || rightIcon ? 'gap-2' : ''}`}>
          {leftIcon && (
            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
              {leftIcon}
            </span>
          )}
          <span className="font-medium tracking-wide">{children}</span>
          {rightIcon && (
            <span className="flex-shrink-0 transition-transform duration-200 group-hover:scale-110">
              {rightIcon}
            </span>
          )}
        </span>

        {/* iOS-style pressed state overlay */}
        <span className="absolute inset-0 bg-black/5 dark:bg-white/10 opacity-0 active:opacity-100 transition-opacity duration-75 pointer-events-none rounded-inherit" />
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }