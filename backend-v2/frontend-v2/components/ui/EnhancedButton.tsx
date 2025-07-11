import React from 'react'
import { cn } from '@/lib/utils'
import { AccessibleLoadingSpinner } from './AccessibilityEnhancements'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline' | 'link' | 'warning'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  fullWidth?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  rounded?: 'sm' | 'md' | 'lg' | 'full' | 'none'
  elevated?: boolean
  pulse?: boolean
  gradient?: boolean
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    loadingText,
    leftIcon,
    rightIcon,
    rounded = 'md',
    elevated = false,
    pulse = false,
    gradient = false,
    disabled,
    children,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading
    
    // Variant styles
    const variantStyles = {
      primary: cn(
        gradient 
          ? 'bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white'
          : 'bg-primary-600 hover:bg-primary-700 text-white',
        'focus:ring-primary-500'
      ),
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white focus:ring-gray-500',
      destructive: cn(
        gradient
          ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
          : 'bg-red-600 hover:bg-red-700 text-white',
        'focus:ring-red-500'
      ),
      ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-gray-500',
      outline: 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 focus:ring-gray-500',
      link: 'text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 underline-offset-4 hover:underline focus:ring-primary-500',
      warning: cn(
        gradient
          ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white'
          : 'bg-yellow-500 hover:bg-yellow-600 text-white',
        'focus:ring-yellow-400'
      )
    }
    
    // Size styles
    const sizeStyles = {
      xs: 'text-xs px-2 py-1',
      sm: 'text-sm px-3 py-1.5',
      md: 'text-sm px-4 py-2',
      lg: 'text-base px-6 py-3',
      xl: 'text-lg px-8 py-4'
    }
    
    // Icon spacing
    const iconSpacing = {
      xs: 'gap-1',
      sm: 'gap-1.5',
      md: 'gap-2',
      lg: 'gap-2.5',
      xl: 'gap-3'
    }
    
    // Rounded styles
    const roundedStyles = {
      none: 'rounded-none',
      sm: 'rounded',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full'
    }
    
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2',
          
          // Variant styles
          variantStyles[variant],
          
          // Size styles
          sizeStyles[size],
          iconSpacing[size],
          
          // Rounded styles
          roundedStyles[rounded],
          
          // Width
          fullWidth && 'w-full',
          
          // States
          isDisabled && 'opacity-50 cursor-not-allowed',
          !isDisabled && 'active:scale-[0.98]',
          
          // Effects
          elevated && 'shadow-lg hover:shadow-xl',
          pulse && !isDisabled && 'animate-pulse',
          
          className
        )}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* Left icon */}
        {leftIcon && !loading && (
          <span className="flex-shrink-0">{leftIcon}</span>
        )}
        
        {/* Loading spinner */}
        {loading && (
          <AccessibleLoadingSpinner 
            size={size === 'xs' || size === 'sm' ? 'sm' : 'md'} 
            label={loadingText || 'Loading...'}
          />
        )}
        
        {/* Content */}
        <span className={loading && loadingText ? 'ml-2' : ''}>
          {loading && loadingText ? loadingText : children}
        </span>
        
        {/* Right icon */}
        {rightIcon && !loading && (
          <span className="flex-shrink-0">{rightIcon}</span>
        )}
      </button>
    )
  }
)

EnhancedButton.displayName = 'EnhancedButton'

// Button group component
export function ButtonGroup({
  children,
  className,
  variant = 'outline',
  size = 'md',
  fullWidth = false
}: {
  children: React.ReactNode
  className?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  fullWidth?: boolean
}) {
  const childrenArray = React.Children.toArray(children)
  
  return (
    <div className={cn('inline-flex', fullWidth && 'w-full', className)}>
      {React.Children.map(childrenArray, (child, index) => {
        if (!React.isValidElement(child)) return child
        
        const isFirst = index === 0
        const isLast = index === childrenArray.length - 1
        
        return React.cloneElement(child as React.ReactElement<ButtonProps>, {
          variant,
          size,
          rounded: 'none',
          className: cn(
            child.props.className,
            'focus:z-10',
            isFirst && 'rounded-l-md',
            isLast && 'rounded-r-md',
            !isFirst && '-ml-px'
          )
        })
      })}
    </div>
  )
}

// Icon button variant
export function IconButton({
  icon,
  label,
  ...props
}: {
  icon: React.ReactNode
  label: string
} & ButtonProps) {
  return (
    <EnhancedButton
      {...props}
      className={cn(
        'p-2',
        props.size === 'xs' && 'p-1',
        props.size === 'sm' && 'p-1.5',
        props.size === 'lg' && 'p-3',
        props.size === 'xl' && 'p-4',
        props.className
      )}
      aria-label={label}
    >
      {icon}
    </EnhancedButton>
  )
}

// Floating action button
export function FAB({
  icon,
  label,
  position = 'bottom-right',
  extended = false,
  ...props
}: {
  icon: React.ReactNode
  label: string
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'top-left'
  extended?: boolean
} & ButtonProps) {
  const positionStyles = {
    'bottom-right': 'bottom-4 right-4 md:bottom-6 md:right-6',
    'bottom-left': 'bottom-4 left-4 md:bottom-6 md:left-6',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4 md:top-6 md:right-6',
    'top-left': 'top-4 left-4 md:top-6 md:left-6'
  }
  
  return (
    <EnhancedButton
      {...props}
      className={cn(
        'fixed z-40 shadow-lg hover:shadow-xl',
        positionStyles[position],
        extended ? 'px-6' : 'w-14 h-14 p-0',
        props.className
      )}
      rounded="full"
      elevated
      aria-label={label}
    >
      {icon}
      {extended && <span className="ml-2">{label}</span>}
    </EnhancedButton>
  )
}

export default EnhancedButton