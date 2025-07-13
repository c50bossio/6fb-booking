'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { ButtonLoading } from './LoadingStates'

const buttonVariants = cva(
  // Enhanced base styles with performance optimizations
  'inline-flex items-center justify-center font-medium transition-all duration-200 ease-ios focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation relative overflow-hidden',
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-500 hover:bg-primary-600 dark:bg-primary-400 dark:hover:bg-primary-300 text-white dark:text-gray-900 font-semibold',
          'shadow-premium hover:shadow-premium-colored dark:shadow-lg dark:hover:shadow-xl transition-all duration-200 ease-ios',
          'hover:-translate-y-0.5 active:translate-y-0 active:scale-95',
          'focus:ring-2 focus:ring-primary-500/50 dark:focus:ring-primary-300/50 focus:ring-offset-2',
          'transform-gpu will-change-transform relative overflow-hidden',
          'before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/20 before:to-transparent',
          'before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700',
        ],
        secondary: [
          'bg-white/90 dark:bg-gray-700/80 text-ios-gray-900 dark:text-gray-100 font-medium',
          'border border-ios-gray-200 dark:border-gray-500 shadow-card hover:shadow-card-hover dark:shadow-md',
          'hover:bg-white dark:hover:bg-gray-600/90 hover:border-ios-gray-300 dark:hover:border-gray-400',
          'focus:ring-2 focus:ring-primary-500/30 dark:focus:ring-primary-300/50 focus:ring-offset-2 focus:border-primary-300 dark:focus:border-primary-200',
          'active:scale-95 transform-gpu will-change-transform transition-all duration-200 ease-ios',
          'hover:-translate-y-0.5 active:translate-y-0 backdrop-blur-sm',
        ],
        outline: [
          'bg-white/10 dark:bg-gray-800/50 backdrop-blur-sm border-2 border-primary-500/60 dark:border-primary-300 text-primary-600 dark:text-primary-100 font-medium',
          'hover:bg-primary-50/80 dark:hover:bg-primary-900/40 hover:border-primary-600 dark:hover:border-primary-200 hover:shadow-glow-primary-subtle',
          'focus:ring-2 focus:ring-primary-500/50 dark:focus:ring-primary-300/50 focus:ring-offset-2 focus:border-primary-600 dark:focus:border-primary-200',
          'active:scale-95 transform-gpu will-change-transform transition-all duration-200 ease-ios',
          'shadow-glass hover:shadow-premium-soft backdrop-blur-md dark:shadow-md dark:hover:shadow-lg',
          'hover:-translate-y-0.5 active:translate-y-0',
        ],
        ghost: [
          'text-ios-gray-700 dark:text-gray-200 bg-transparent dark:bg-gray-800/20',
          'hover:bg-ios-gray-100 dark:hover:bg-gray-700/50',
          'hover:text-primary-600 dark:hover:text-primary-200',
          'focus:ring-ios-gray-300 dark:focus:ring-gray-500 active:scale-95 transform-gpu',
          'border border-transparent dark:border-gray-600/30 dark:hover:border-gray-500/50',
        ],
        destructive: [
          'bg-error-500 text-white shadow-button hover:shadow-button-hover',
          'hover:bg-error-600 active:bg-error-700 focus:ring-error-500',
          'active:scale-95 transform-gpu will-change-transform',
        ],
        success: [
          'bg-success-500 text-white shadow-button hover:shadow-button-hover',
          'hover:bg-success-600 active:bg-success-700 focus:ring-success-500',
          'active:scale-95 transform-gpu will-change-transform',
        ],
        warning: [
          'bg-warning-500 text-white shadow-button hover:shadow-button-hover',
          'hover:bg-warning-600 active:bg-warning-700 focus:ring-warning-500',
          'active:scale-95 transform-gpu will-change-transform',
        ],
        glass: [
          'bg-white/10 dark:bg-white/5 backdrop-blur-md border border-white/20 dark:border-white/10',
          'text-ios-gray-900 dark:text-white shadow-glass',
          'hover:bg-white/20 dark:hover:bg-white/10 hover:backdrop-blur-lg',
          'focus:ring-white/30 active:scale-95 transform-gpu',
        ],
        gradient: [
          'bg-gradient-to-r from-primary-500 to-secondary-500 text-white shadow-premium',
          'hover:from-primary-600 hover:to-secondary-600 hover:shadow-premium-colored',
          'focus:ring-primary-500 active:scale-95 transform-gpu will-change-transform',
        ],
      },
      size: {
        xs: 'text-xs px-3 py-1.5 min-h-[32px] rounded-ios-sm gap-1.5 tracking-wide',
        sm: 'text-sm px-4 py-2 min-h-[40px] rounded-ios gap-2 tracking-wide',
        md: 'text-sm px-6 py-3 min-h-[44px] rounded-ios-md gap-2 tracking-wide font-medium',
        lg: 'text-base px-8 py-3.5 min-h-[48px] rounded-ios-lg gap-2.5 tracking-wide font-medium',
        xl: 'text-lg px-10 py-4 min-h-[56px] rounded-ios-xl gap-3 tracking-wide font-semibold',
        icon: 'p-3 min-h-[44px] min-w-[44px] rounded-ios-md',
        'icon-sm': 'p-2.5 min-h-[40px] min-w-[40px] rounded-ios',
        'icon-lg': 'p-3.5 min-h-[48px] min-w-[48px] rounded-ios-lg',
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto',
      },
      loading: {
        true: 'cursor-wait',
        false: '',
      },
      elevated: {
        true: 'shadow-lg hover:shadow-xl',
        false: '',
      },
      rounded: {
        none: 'rounded-none',
        sm: 'rounded-sm',
        md: 'rounded-md',
        lg: 'rounded-lg',
        xl: 'rounded-xl',
        full: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
      loading: false,
      elevated: false,
      rounded: 'lg',
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
  iconOnly?: boolean
  tooltip?: string
  href?: string
  target?: string
  asChild?: boolean
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
    iconOnly = false,
    tooltip,
    href,
    target,
    elevated,
    rounded,
    onClick,
    type = 'button',
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading
    const isIconButton = iconOnly || (!children && (leftIcon || rightIcon))
    const effectiveSize = isIconButton ? (size === 'md' ? 'icon' : size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon-lg' : size) : size

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      console.log('[Button] handleClick called, isDisabled:', isDisabled, 'onClick:', !!onClick)
      if (onClick && !isDisabled) {
        // Add haptic feedback for mobile devices
        if (navigator.vibrate && 'ontouchstart' in window) {
          navigator.vibrate(1)
        }
        console.log('[Button] Calling onClick handler')
        onClick(e)
      }
    }

    const getLoadingSize = () => {
      switch (effectiveSize) {
        case 'xs': return 'xs'
        case 'sm': case 'icon-sm': return 'xs'
        case 'md': case 'icon': return 'sm'
        case 'lg': case 'icon-lg': return 'sm'
        case 'xl': return 'md'
        default: return 'sm'
      }
    }

    const buttonContent = (
      <>
        {/* Ripple effect overlay */}
        <span className="absolute inset-0 overflow-hidden rounded-inherit">
          <span className="absolute inset-0 bg-white/20 scale-0 rounded-full transition-transform duration-500 group-active:scale-100" />
        </span>
        
        {/* Loading state */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <ButtonLoading size={getLoadingSize()} />
          </span>
        )}
        
        {/* Button content */}
        <span className={cn(
          'relative z-10 flex items-center justify-center',
          loading && 'invisible',
          (leftIcon || rightIcon) && !isIconButton && 'gap-2'
        )}>
          {leftIcon && (
            <span className={cn(
              'flex-shrink-0',
              size === 'xs' && '[&>svg]:w-3 [&>svg]:h-3',
              size === 'sm' && '[&>svg]:w-4 [&>svg]:h-4',
              size === 'md' && '[&>svg]:w-4 [&>svg]:h-4',
              size === 'lg' && '[&>svg]:w-5 [&>svg]:h-5',
              size === 'xl' && '[&>svg]:w-6 [&>svg]:h-6'
            )}>
              {leftIcon}
            </span>
          )}
          {!isIconButton && children && (
            <span className="truncate">{children}</span>
          )}
          {isIconButton && !leftIcon && rightIcon && (
            <span className={cn(
              'flex-shrink-0',
              size === 'xs' && '[&>svg]:w-3 [&>svg]:h-3',
              size === 'sm' && '[&>svg]:w-4 [&>svg]:h-4',
              size === 'md' && '[&>svg]:w-5 [&>svg]:h-5',
              size === 'lg' && '[&>svg]:w-6 [&>svg]:h-6',
              size === 'xl' && '[&>svg]:w-7 [&>svg]:h-7'
            )}>
              {rightIcon}
            </span>
          )}
          {rightIcon && !isIconButton && (
            <span className={cn(
              'flex-shrink-0',
              size === 'xs' && '[&>svg]:w-3 [&>svg]:h-3',
              size === 'sm' && '[&>svg]:w-4 [&>svg]:h-4',
              size === 'md' && '[&>svg]:w-4 [&>svg]:h-4',
              size === 'lg' && '[&>svg]:w-5 [&>svg]:h-5',
              size === 'xl' && '[&>svg]:w-6 [&>svg]:h-6'
            )}>
              {rightIcon}
            </span>
          )}
        </span>
      </>
    )

    // If href is provided, render as link
    if (href && !isDisabled) {
      return (
        <a
          href={href}
          target={target}
          ref={ref as any}
          className={cn(
            buttonVariants({ variant, size: effectiveSize, fullWidth, loading, elevated, rounded }),
            'group no-underline',
            className
          )}
          aria-label={loading ? loadingText : ariaLabel || tooltip}
          aria-describedby={ariaDescribedBy}
          title={tooltip}
          {...(props as any)}
        >
          {buttonContent}
        </a>
      )
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        onClick={handleClick}
        className={cn(
          buttonVariants({ variant, size: effectiveSize, fullWidth, loading, elevated, rounded }),
          'group',
          className
        )}
        aria-label={loading ? loadingText : ariaLabel || tooltip}
        aria-describedby={ariaDescribedBy}
        aria-disabled={isDisabled}
        title={tooltip}
        {...props}
      >
        {buttonContent}
      </button>
    )
  }
)

Button.displayName = 'Button'

// Button group component
export const ButtonGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    orientation?: 'horizontal' | 'vertical'
    size?: ButtonProps['size']
    variant?: ButtonProps['variant']
    attached?: boolean
  }
>(({ className, orientation = 'horizontal', attached = false, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col',
        attached && orientation === 'horizontal' && '[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:last-child)]:border-r-0',
        attached && orientation === 'vertical' && '[&>button]:rounded-none [&>button:first-child]:rounded-t-lg [&>button:last-child]:rounded-b-lg [&>button:not(:last-child)]:border-b-0',
        !attached && (orientation === 'horizontal' ? 'gap-2' : 'gap-2'),
        className
      )}
      role="group"
      {...props}
    >
      {children}
    </div>
  )
})

ButtonGroup.displayName = 'ButtonGroup'

// Floating Action Button component
export const FloatingActionButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size = 'lg', variant = 'primary', rounded = 'full', elevated = true, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        className={cn(
          'fixed bottom-6 right-6 z-50 shadow-2xl hover:shadow-3xl',
          'backdrop-blur-sm bg-primary-500/90 hover:bg-primary-600/90',
          'border border-white/20',
          className
        )}
        size={size}
        variant={variant}
        rounded={rounded}
        elevated={elevated}
        iconOnly
        {...props}
      />
    )
  }
)

FloatingActionButton.displayName = 'FloatingActionButton'

export { Button, buttonVariants }