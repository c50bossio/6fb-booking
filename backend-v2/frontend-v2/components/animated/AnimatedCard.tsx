'use client'

import React, { forwardRef } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { useInView } from 'react-intersection-observer'

interface AnimatedCardProps extends React.ComponentPropsWithoutRef<typeof Card> {
  animation?: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scaleIn'
  delay?: number
  duration?: number
  hover?: 'lift' | 'scale' | 'glow' | 'none'
  stagger?: boolean
  staggerIndex?: number
  className?: string
  children?: React.ReactNode
}

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ 
    animation = 'fadeIn',
    delay = 0,
    duration = 400,
    hover = 'lift',
    stagger = false,
    staggerIndex = 0,
    className,
    children,
    ...props 
  }, ref) => {
    const { ref: inViewRef, inView } = useInView({
      threshold: 0.1,
      triggerOnce: true,
    })

    // Combine refs
    const setRefs = React.useCallback(
      (node: HTMLDivElement) => {
        // @ts-ignore
        ref && (ref.current = node)
        inViewRef(node)
      },
      [inViewRef, ref]
    )

    const animationClass = inView ? `animate-${animation}` : 'opacity-0'
    const hoverClass = hover !== 'none' ? `hover-${hover}` : ''
    const staggerDelay = stagger ? staggerIndex * 50 : 0
    const totalDelay = delay + staggerDelay

    const style = {
      animationDelay: `${totalDelay}ms`,
      animationDuration: `${duration}ms`,
      animationFillMode: 'both',
    }

    return (
      <Card
        ref={setRefs}
        className={cn(
          'transition-all',
          animationClass,
          hoverClass,
          className
        )}
        style={style}
        {...props}
      >
        {children}
      </Card>
    )
  }
)

AnimatedCard.displayName = 'AnimatedCard'

// Animated sub-components
export const AnimatedCardHeader = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CardHeader>
>(({ className, ...props }, ref) => (
  <CardHeader ref={ref} className={cn('transition-all', className)} {...props} />
))

AnimatedCardHeader.displayName = 'AnimatedCardHeader'

export const AnimatedCardTitle = forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof CardTitle>
>(({ className, ...props }, ref) => (
  <CardTitle ref={ref} className={cn('transition-colors', className)} {...props} />
))

AnimatedCardTitle.displayName = 'AnimatedCardTitle'

export const AnimatedCardDescription = forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof CardDescription>
>(({ className, ...props }, ref) => (
  <CardDescription ref={ref} className={cn('transition-colors', className)} {...props} />
))

AnimatedCardDescription.displayName = 'AnimatedCardDescription'

export const AnimatedCardContent = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CardContent>
>(({ className, ...props }, ref) => (
  <CardContent ref={ref} className={cn('transition-all', className)} {...props} />
))

AnimatedCardContent.displayName = 'AnimatedCardContent'

export const AnimatedCardFooter = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof CardFooter>
>(({ className, ...props }, ref) => (
  <CardFooter ref={ref} className={cn('transition-all', className)} {...props} />
))

AnimatedCardFooter.displayName = 'AnimatedCardFooter'