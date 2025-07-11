'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useInView } from 'react-intersection-observer'

interface AnimatedListProps {
  children: React.ReactNode[]
  className?: string
  animation?: 'fadeIn' | 'slideUp' | 'slideLeft' | 'slideRight' | 'scaleIn'
  staggerDelay?: number
  duration?: number
  as?: keyof JSX.IntrinsicElements
}

export function AnimatedList({
  children,
  className,
  animation = 'slideUp',
  staggerDelay = 50,
  duration = 400,
  as: Component = 'div',
}: AnimatedListProps) {
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  })

  return (
    <Component ref={ref} className={className}>
      {React.Children.map(children, (child, index) => (
        <AnimatedListItem
          index={index}
          animation={animation}
          staggerDelay={staggerDelay}
          duration={duration}
          inView={inView}
        >
          {child}
        </AnimatedListItem>
      ))}
    </Component>
  )
}

interface AnimatedListItemProps {
  children: React.ReactNode
  index: number
  animation: string
  staggerDelay: number
  duration: number
  inView: boolean
}

function AnimatedListItem({
  children,
  index,
  animation,
  staggerDelay,
  duration,
  inView,
}: AnimatedListItemProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (inView) {
      const timeout = setTimeout(() => {
        setIsVisible(true)
      }, index * staggerDelay)

      return () => clearTimeout(timeout)
    }
  }, [inView, index, staggerDelay])

  const animationClass = isVisible ? `animate-${animation}` : 'opacity-0'
  
  const style = {
    animationDuration: `${duration}ms`,
    animationFillMode: 'both',
  }

  return (
    <div className={cn('transition-all', animationClass)} style={style}>
      {children}
    </div>
  )
}

// Grid variant for animated lists
interface AnimatedGridProps extends AnimatedListProps {
  columns?: number
  gap?: number
}

export function AnimatedGrid({
  children,
  className,
  columns = 3,
  gap = 4,
  ...props
}: AnimatedGridProps) {
  return (
    <AnimatedList
      className={cn(
        'grid',
        `grid-cols-1 md:grid-cols-2 lg:grid-cols-${columns}`,
        `gap-${gap}`,
        className
      )}
      {...props}
    >
      {children}
    </AnimatedList>
  )
}

// Masonry variant for animated lists
export function AnimatedMasonry({
  children,
  className,
  columns = 3,
  gap = 4,
  ...props
}: AnimatedGridProps) {
  const [columnChildren, setColumnChildren] = useState<React.ReactNode[][]>([])

  useEffect(() => {
    const childArray = React.Children.toArray(children)
    const cols: React.ReactNode[][] = Array(columns).fill(null).map(() => [])
    
    childArray.forEach((child, index) => {
      cols[index % columns].push(child)
    })
    
    setColumnChildren(cols)
  }, [children, columns])

  return (
    <div className={cn('flex', `gap-${gap}`, className)}>
      {columnChildren.map((column, colIndex) => (
        <AnimatedList
          key={colIndex}
          className={cn('flex-1 flex flex-col', `gap-${gap}`)}
          {...props}
        >
          {column}
        </AnimatedList>
      ))}
    </div>
  )
}

// Carousel variant for animated lists
interface AnimatedCarouselProps extends Omit<AnimatedListProps, 'as'> {
  itemsPerView?: number
  gap?: number
  autoPlay?: boolean
  autoPlayInterval?: number
}

export function AnimatedCarousel({
  children,
  className,
  itemsPerView = 3,
  gap = 4,
  autoPlay = false,
  autoPlayInterval = 3000,
  ...props
}: AnimatedCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const childrenArray = React.Children.toArray(children)
  const maxIndex = Math.max(0, childrenArray.length - itemsPerView)

  useEffect(() => {
    if (autoPlay && childrenArray.length > itemsPerView) {
      const interval = setInterval(() => {
        setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1))
      }, autoPlayInterval)

      return () => clearInterval(interval)
    }
  }, [autoPlay, autoPlayInterval, childrenArray.length, itemsPerView, maxIndex])

  const handlePrevious = () => {
    setCurrentIndex(prev => (prev <= 0 ? maxIndex : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex(prev => (prev >= maxIndex ? 0 : prev + 1))
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <AnimatedList
        className={cn(
          'flex transition-transform duration-500',
          `gap-${gap}`
        )}
        style={{
          transform: `translateX(-${currentIndex * (100 / itemsPerView)}%)`,
        }}
        {...props}
      >
        {children}
      </AnimatedList>
      
      {childrenArray.length > itemsPerView && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background shadow-lg transition-all hover:scale-110"
            aria-label="Previous"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 hover:bg-background shadow-lg transition-all hover:scale-110"
            aria-label="Next"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {Array.from({ length: maxIndex + 1 }).map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  index === currentIndex ? 'bg-primary w-6' : 'bg-primary/30'
                )}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}