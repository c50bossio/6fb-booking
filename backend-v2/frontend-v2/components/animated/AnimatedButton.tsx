'use client'

import React, { forwardRef, useState } from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AnimatedButtonProps extends ButtonProps {
  animation?: 'scale' | 'ripple' | 'shine' | 'pulse'
  hover?: 'lift' | 'scale' | 'glow'
  loading?: boolean
  success?: boolean
  error?: boolean
}

export const AnimatedButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ 
    animation = 'scale',
    hover = 'scale',
    loading = false,
    success = false,
    error = false,
    className,
    children,
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const [isAnimating, setIsAnimating] = useState(false)
    const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([])

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (animation === 'ripple') {
        const button = e.currentTarget
        const rect = button.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        const id = Date.now()

        setRipples(prev => [...prev, { x, y, id }])
        setTimeout(() => {
          setRipples(prev => prev.filter(ripple => ripple.id !== id))
        }, 600)
      }

      if (animation === 'scale') {
        setIsAnimating(true)
        setTimeout(() => setIsAnimating(false), 200)
      }

      onClick?.(e)
    }

    const animationClasses = cn(
      // Base transitions
      'transition-all duration-200 relative overflow-hidden',
      
      // Hover effects
      hover === 'lift' && 'hover:-translate-y-0.5 hover:shadow-lg',
      hover === 'scale' && 'hover:scale-105 active:scale-95',
      hover === 'glow' && 'hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]',
      
      // Animation states
      isAnimating && animation === 'scale' && 'animate-pulse',
      animation === 'pulse' && !disabled && 'animate-pulse',
      
      // Status states
      success && 'bg-green-500 hover:bg-green-600 text-white',
      error && 'bg-red-500 hover:bg-red-600 text-white',
      
      // Loading state
      loading && 'cursor-wait',
      
      className
    )

    return (
      <Button
        ref={ref}
        className={animationClasses}
        disabled={disabled || loading}
        onClick={handleClick}
        {...props}
      >
        {/* Ripple effect */}
        {animation === 'ripple' && ripples.map(ripple => (
          <span
            key={ripple.id}
            className="absolute bg-white/30 rounded-full pointer-events-none animate-ripple"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 0,
              height: 0,
              transform: 'translate(-50%, -50%)',
              animation: 'ripple 600ms ease-out',
            }}
          />
        ))}

        {/* Shine effect */}
        {animation === 'shine' && (
          <span className="absolute inset-0 -left-full animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        )}

        {/* Loading spinner */}
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center bg-inherit">
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </span>
        )}

        {/* Button content */}
        <span className={cn(
          'relative z-10 flex items-center justify-center gap-2',
          loading && 'invisible'
        )}>
          {children}
        </span>
      </Button>
    )
  }
)

AnimatedButton.displayName = 'AnimatedButton'

// Additional animation styles (add to global CSS)
const animationStyles = `
  @keyframes ripple {
    to {
      width: 300px;
      height: 300px;
      opacity: 0;
    }
  }

  @keyframes shine {
    to {
      left: 100%;
    }
  }

  .animate-ripple {
    animation: ripple 600ms ease-out;
  }

  .animate-shine {
    animation: shine 1s ease-in-out;
  }
`

// Icon button variant
export const AnimatedIconButton = forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, ...props }, ref) => (
    <AnimatedButton
      ref={ref}
      size="icon"
      className={cn('rounded-full', className)}
      {...props}
    />
  )
)

AnimatedIconButton.displayName = 'AnimatedIconButton'