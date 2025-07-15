'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  // Apple-quality base styles with premium feel
  'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation relative overflow-hidden',
  {
    variants: {
      variant: {
        primary: [
          'btn-apple-primary',
          'text-white font-semibold',
          'transition-all duration-250 cubic-bezier(0.4, 0, 0.2, 1)',
          'focus:ring-blue-500 focus:ring-offset-2',
          'active:scale-[0.98]'
        ],
        secondary: [
          'btn-apple-secondary',
          'transition-all duration-250 cubic-bezier(0.4, 0, 0.2, 1)',
          'focus:ring-gray-500 focus:ring-offset-2',
          'active:scale-[0.98]'
        ],
        outline: [
          'bg-transparent border-2 border-primary-500 dark:border-primary-400',
          'text-primary-600 dark:text-primary-400',
          'hover:bg-primary-50 dark:hover:bg-primary-900/10',
          'hover:border-primary-600 dark:hover:border-primary-300',
          'shadow-apple-sm hover:shadow-apple-md',
          'transition-all duration-250 cubic-bezier(0.4, 0, 0.2, 1)',
          'focus:ring-primary-500 focus:ring-offset-2',
          'active:scale-[0.98]'
        ],
        ghost: [
          'bg-transparent text-gray-700 dark:text-gray-200',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'hover:text-primary-600 dark:hover:text-primary-400',
          'transition-all duration-250 cubic-bezier(0.4, 0, 0.2, 1)',
          'focus:ring-gray-500 focus:ring-offset-1',
          'active:scale-[0.98]'
        ],
        destructive: [
          'bg-gradient-to-b from-red-500 to-red-600',
          'hover:from-red-600 hover:to-red-700',
          'text-white font-semibold',
          'shadow-apple-md hover:shadow-apple-lg',
          'border border-red-400/20',
          'transition-all duration-250 cubic-bezier(0.4, 0, 0.2, 1)',
          'focus:ring-red-500 focus:ring-offset-2',
          'active:scale-[0.98]'
        ],
        warning: [
          'bg-gradient-to-b from-yellow-500 to-amber-600',
          'hover:from-yellow-600 hover:to-amber-700',
          'text-white font-semibold',
          'shadow-apple-md hover:shadow-apple-lg',
          'border border-yellow-400/20',
          'transition-all duration-250 cubic-bezier(0.4, 0, 0.2, 1)',
          'focus:ring-yellow-500 focus:ring-offset-2',
          'active:scale-[0.98]'
        ]
      },
      size: {
        sm: 'text-sm px-5 py-3 min-h-[42px] rounded-lg gap-2',
        md: 'text-sm px-8 py-4 min-h-[48px] rounded-lg gap-2.5 font-medium',
        lg: 'text-base px-10 py-4.5 min-h-[52px] rounded-xl gap-3 font-medium',
        xl: 'text-base px-12 py-5 min-h-[56px] rounded-xl gap-3 font-medium',
        icon: 'p-3.5 min-h-[48px] min-w-[48px] rounded-lg'
      },
      fullWidth: {
        true: 'w-full',
        false: 'w-auto'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  href?: string
  target?: string
  asChild?: boolean
  elevated?: boolean
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
    href,
    target,
    onClick,
    type = 'button',
    asChild = false,
    elevated = false,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (onClick && !isDisabled) {
        onClick(e)
      }
    }

    const buttonContent = (
      <>
        {loading && (
          <div className="mr-2">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {leftIcon && !loading && (
          <span className="mr-2 flex-shrink-0">
            {leftIcon}
          </span>
        )}
        
        {children && (
          <span className={loading ? 'opacity-0' : ''}>
            {children}
          </span>
        )}
        
        {rightIcon && !loading && (
          <span className="ml-2 flex-shrink-0">
            {rightIcon}
          </span>
        )}
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
            buttonVariants({ variant, size, fullWidth }),
            'no-underline',
            className
          )}
          aria-label={loading ? loadingText : undefined}
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
          buttonVariants({ variant, size, fullWidth }),
          className
        )}
        aria-label={loading ? loadingText : undefined}
        {...props}
      >
        {buttonContent}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }