/**
 * Branded Spinners for BookedBarber V2
 * Premium Six Figure Barber themed loading spinners with sophisticated animations
 */

'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

// Enhanced branded spinner variants
const brandedSpinnerVariants = cva(
  'inline-block animate-spin',
  {
    variants: {
      variant: {
        // Premium teal spinner with gradient border
        premium: 'border-2 border-primary-200 border-t-primary-500 rounded-full',
        // Luxury gold accent spinner
        luxury: 'border-2 border-yellow-200 border-t-yellow-500 rounded-full',
        // Executive professional spinner
        executive: 'border-2 border-secondary-200 border-t-secondary-500 rounded-full',
        // Minimal clean spinner
        minimal: 'border border-ios-gray-300 border-t-ios-gray-600 rounded-full dark:border-ios-gray-600 dark:border-t-ios-gray-300',
        // Glass morphism spinner
        glass: 'border-2 border-white/30 border-t-white/80 rounded-full backdrop-blur-sm',
        // SVG-based premium spinner
        svg: '',
      },
      size: {
        xs: 'w-3 h-3 border-[1px]',
        sm: 'w-4 h-4',
        md: 'w-6 h-6',
        lg: 'w-8 h-8 border-[3px]',
        xl: 'w-12 h-12 border-[3px]',
        '2xl': 'w-16 h-16 border-4',
      },
      speed: {
        slow: 'animate-spin [animation-duration:2s]',
        normal: 'animate-spin [animation-duration:1s]',
        fast: 'animate-spin [animation-duration:0.5s]',
      }
    },
    defaultVariants: {
      variant: 'premium',
      size: 'md',
      speed: 'normal',
    },
  }
)

export interface BrandedSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof brandedSpinnerVariants> {
  label?: string
  showLabel?: boolean
}

// Premium branded spinner
export function BrandedSpinner({
  className,
  variant,
  size,
  speed,
  label,
  showLabel = false,
  ...props
}: BrandedSpinnerProps) {
  if (variant === 'svg') {
    return (
      <div className={cn('flex items-center justify-center', className)} {...props}>
        <SixFigureSVGSpinner size={size} speed={speed} />
        {showLabel && label && (
          <span className="ml-3 text-sm font-medium text-ios-gray-600 dark:text-ios-gray-400">
            {label}
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn('flex items-center justify-center', className)} {...props}>
      <div 
        className={cn(brandedSpinnerVariants({ variant, size, speed }))}
        role="status"
        aria-label={label || 'Loading'}
      />
      {showLabel && label && (
        <span className="ml-3 text-sm font-medium text-ios-gray-600 dark:text-ios-gray-400">
          {label}
        </span>
      )}
    </div>
  )
}

// Six Figure Barber custom SVG spinner
export function SixFigureSVGSpinner({
  size = 'md',
  speed = 'normal',
  className,
  ...props
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  speed?: 'slow' | 'normal' | 'fast'
  className?: string
}) {
  const sizeMap = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
    '2xl': 64,
  }

  const speedMap = {
    slow: '2s',
    normal: '1s',
    fast: '0.5s',
  }

  const dimension = sizeMap[size]

  return (
    <svg
      width={dimension}
      height={dimension}
      viewBox="0 0 24 24"
      className={cn('text-primary-500', className)}
      {...props}
    >
      {/* Outer ring */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeOpacity="0.25"
        fill="none"
      />
      
      {/* Animated arc */}
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="url(#sixfigure-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="31.416"
        strokeDashoffset="23.562"
        fill="none"
        transform-origin="center"
        style={{
          animation: `spin ${speedMap[speed]} linear infinite`,
        }}
      />
      
      {/* Premium gradient definition */}
      <defs>
        <linearGradient id="sixfigure-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgb(20, 184, 166)" />
          <stop offset="50%" stopColor="rgb(245, 158, 11)" />
          <stop offset="100%" stopColor="rgb(20, 184, 166)" />
        </linearGradient>
      </defs>
    </svg>
  )
}

// Barber pole inspired spinner
export function BarberPoleSpinner({
  size = 'md',
  className,
  ...props
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}) {
  const sizeMap = {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 48,
    '2xl': 64,
  }

  const dimension = sizeMap[size]

  return (
    <div className={cn('relative', className)} {...props}>
      <svg
        width={dimension}
        height={dimension}
        viewBox="0 0 24 24"
        className="animate-spin"
        style={{ animationDuration: '2s' }}
      >
        {/* Base circle */}
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="rgb(239, 68, 68)"
          strokeWidth="2"
        />
        
        {/* White stripes */}
        <path
          d="M 6 8 Q 12 10 18 8 Q 12 10 6 16 Q 12 14 18 16"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        
        {/* Blue accents */}
        <path
          d="M 8 6 Q 14 8 16 6 Q 14 8 8 18 Q 14 16 16 18"
          fill="none"
          stroke="rgb(59, 130, 246)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>
    </div>
  )
}

// Premium dots spinner with brand colors
export function PremiumDotsSpinner({
  size = 'md',
  count = 3,
  className,
  ...props
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  count?: number
  className?: string
}) {
  const dotSizeMap = {
    xs: 'w-1 h-1',
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  }

  const gapMap = {
    xs: 'gap-0.5',
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
    xl: 'gap-3',
  }

  return (
    <div className={cn('inline-flex items-center', gapMap[size], className)} {...props}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'rounded-full bg-gradient-to-r from-primary-500 to-yellow-500',
            dotSizeMap[size],
            'animate-bounce'
          )}
          style={{
            animationDelay: `${index * 0.15}s`,
            animationDuration: '1s',
          }}
        />
      ))}
    </div>
  )
}

// Pulse ring spinner for premium loading
export function PulseRingSpinner({
  size = 'md',
  className,
  ...props
}: {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}) {
  const sizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20',
  }

  return (
    <div className={cn('relative', sizeMap[size], className)} {...props}>
      {/* Outer pulse ring */}
      <div className="absolute inset-0 rounded-full bg-primary-500/20 animate-ping" />
      
      {/* Middle pulse ring */}
      <div 
        className="absolute inset-1 rounded-full bg-primary-500/30 animate-ping"
        style={{ animationDelay: '0.3s' }}
      />
      
      {/* Inner solid circle */}
      <div className="absolute inset-2 rounded-full bg-gradient-to-r from-primary-500 to-yellow-500" />
    </div>
  )
}

// Loading button with integrated spinner
export function LoadingButton({
  loading = false,
  children,
  variant = 'premium',
  size = 'md',
  disabled,
  className,
  ...props
}: {
  loading?: boolean
  children: React.ReactNode
  variant?: 'premium' | 'luxury' | 'executive' | 'minimal'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  disabled?: boolean
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const variantStyles = {
    premium: 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white',
    luxury: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white',
    executive: 'bg-gradient-to-r from-secondary-500 to-secondary-600 hover:from-secondary-600 hover:to-secondary-700 text-white',
    minimal: 'bg-ios-gray-100 hover:bg-ios-gray-200 text-ios-gray-900 dark:bg-ios-gray-800 dark:hover:bg-ios-gray-700 dark:text-ios-gray-100',
  }

  const sizeStyles = {
    xs: 'px-2 py-1 text-xs h-6',
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-4 py-2 text-sm h-10',
    lg: 'px-6 py-3 text-base h-12',
    xl: 'px-8 py-4 text-lg h-14',
  }

  const spinnerSize = {
    xs: 'xs' as const,
    sm: 'xs' as const,
    md: 'sm' as const,
    lg: 'md' as const,
    xl: 'lg' as const,
  }

  return (
    <button
      className={cn(
        'relative inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 transform',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'active:scale-95',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <BrandedSpinner
            variant={variant === 'minimal' ? 'minimal' : 'glass'}
            size={spinnerSize[size]}
          />
        </div>
      )}
      
      <span className={cn('transition-opacity duration-200', loading ? 'opacity-0' : 'opacity-100')}>
        {children}
      </span>
    </button>
  )
}

// Inline loading spinner for text
export function InlineSpinner({
  variant = 'premium',
  size = 'sm',
  className,
  ...props
}: BrandedSpinnerProps) {
  return (
    <BrandedSpinner
      variant={variant}
      size={size}
      className={cn('inline-block align-middle', className)}
      {...props}
    />
  )
}

export default BrandedSpinner