'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const cardVariants = cva(
  'rounded-ios-xl transition-all duration-300 transform-gpu overflow-hidden relative',
  {
    variants: {
      variant: {
        default: 'bg-white dark:bg-zinc-900 border border-ios-gray-200 dark:border-zinc-700 shadow-ios hover:shadow-ios-md',
        elevated: 'bg-white dark:bg-zinc-800 shadow-ios-lg hover:shadow-ios-xl hover:-translate-y-1 border border-transparent dark:border-zinc-700',
        outlined: 'bg-transparent dark:bg-transparent border-2 border-ios-gray-300 dark:border-zinc-600 hover:border-primary-400 dark:hover:border-primary-500',
        premium: 'bg-gradient-to-br from-white to-ios-gray-50 dark:from-zinc-900 dark:to-zinc-800 border border-ios-gray-200 dark:border-zinc-700 shadow-premium hover:shadow-premium-colored',
        accent: 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-950 dark:to-primary-900 border border-primary-200 dark:border-primary-800 shadow-ios-md hover:shadow-ios-lg',
        glass: 'bg-white/10 dark:bg-white/5 backdrop-blur-ios border border-white/20 dark:border-white/10 shadow-glass hover:bg-white/20 dark:hover:bg-white/10',
        'glass-dark': 'bg-black/10 dark:bg-black/20 backdrop-blur-ios border border-black/20 dark:border-black/30 shadow-glass-dark hover:bg-black/20 dark:hover:bg-black/30',
        gradient: 'bg-gradient-to-br from-primary-500 to-accent-600 dark:from-primary-600 dark:to-accent-700 text-white shadow-premium',
        success: 'bg-gradient-to-br from-success-50 to-success-100 dark:from-success-950 dark:to-success-900 border border-success-200 dark:border-success-800 shadow-ios',
        warning: 'bg-gradient-to-br from-warning-50 to-warning-100 dark:from-warning-950 dark:to-warning-900 border border-warning-200 dark:border-warning-800 shadow-ios',
        error: 'bg-gradient-to-br from-error-50 to-error-100 dark:from-error-950 dark:to-error-900 border border-error-200 dark:border-error-800 shadow-ios',
      },
      padding: {
        none: 'p-0',
        xs: 'p-2',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
        xl: 'p-10',
      },
      interactive: {
        true: 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200',
        false: '',
      },
      animated: {
        true: 'animate-ios-fade',
        false: '',
      },
      glow: {
        true: 'shadow-glow-primary hover:shadow-glow-accent',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      interactive: false,
      animated: false,
      glow: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: React.ReactNode
  hoverEffect?: boolean
  backgroundPattern?: 'dots' | 'grid' | 'waves' | 'none'
  animationDelay?: number
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant, 
    padding, 
    interactive, 
    animated,
    glow,
    children, 
    hoverEffect = false,
    backgroundPattern = 'none',
    animationDelay = 0,
    style,
    ...props 
  }, ref) => {
    const backgroundPatterns = {
      dots: (
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <svg width="60" height="60" viewBox="0 0 60 60" className="w-full h-full">
            <defs>
              <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)"/>
          </svg>
        </div>
      ),
      grid: (
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <svg width="60" height="60" viewBox="0 0 60 60" className="w-full h-full">
            <defs>
              <pattern id="grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"/>
          </svg>
        </div>
      ),
      waves: (
        <div className="absolute inset-0 opacity-5 dark:opacity-10">
          <svg viewBox="0 0 400 400" className="w-full h-full">
            <defs>
              <pattern id="waves" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M0,50 Q25,25 50,50 T100,50" fill="none" stroke="currentColor" strokeWidth="2"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#waves)"/>
          </svg>
        </div>
      ),
      none: null
    }

    return (
      <div
        ref={ref}
        className={cardVariants({ variant, padding, interactive, animated, glow, className })}
        style={{ 
          animationDelay: `${animationDelay}ms`,
          ...style 
        }}
        {...props}
      >
        {/* Background pattern */}
        {backgroundPattern !== 'none' && backgroundPatterns[backgroundPattern]}
        
        {/* Glass morphism overlay for glass variants */}
        {(variant === 'glass' || variant === 'glass-dark') && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 dark:to-transparent pointer-events-none" />
        )}
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
        
        {/* Hover effect overlay */}
        {(hoverEffect || glow) && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        )}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Card Header component
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`border-b border-ios-gray-200 dark:border-ios-gray-700 pb-4 mb-6 ${className || ''}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardHeader.displayName = 'CardHeader'

// Card Title component
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
}

const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, as: Component = 'h3', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={`text-ios-headline font-semibold text-accent-900 dark:text-white tracking-tight ${className || ''}`}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

CardTitle.displayName = 'CardTitle'

// Card Description component
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode
}

const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={`text-ios-subheadline text-ios-gray-600 dark:text-ios-gray-400 mt-2 leading-relaxed ${className || ''}`}
        {...props}
      >
        {children}
      </p>
    )
  }
)

CardDescription.displayName = 'CardDescription'

// Card Content component
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={className}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardContent.displayName = 'CardContent'

// Card Footer component
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`border-t border-ios-gray-200 dark:border-ios-gray-700 pt-6 mt-6 flex items-center ${className || ''}`}
        {...props}
      >
        {children}
      </div>
    )
  }
)

CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants }