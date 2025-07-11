'use client'

import React, { useRef, useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface ScrollableTableProps {
  children: React.ReactNode
  className?: string
  showIndicators?: boolean
}

export function ScrollableTable({ 
  children, 
  className,
  showIndicators = true 
}: ScrollableTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  const scrollToLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' })
    }
  }

  const scrollToRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' })
    }
  }

  return (
    <div className="relative">
      {/* Left Scroll Indicator */}
      {showIndicators && canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white dark:from-gray-900 to-transparent z-10 pointer-events-none">
          <button
            onClick={scrollToLeft}
            className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md pointer-events-auto hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronLeftIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}

      {/* Right Scroll Indicator */}
      {showIndicators && canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white dark:from-gray-900 to-transparent z-10 pointer-events-none">
          <button
            onClick={scrollToRight}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md pointer-events-auto hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronRightIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      )}

      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className={cn(
          'overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700',
          className
        )}
      >
        {children}
      </div>

      {/* Mobile Scroll Hint */}
      {showIndicators && (canScrollLeft || canScrollRight) && (
        <div className="sm:hidden text-center mt-2 text-xs text-gray-500 dark:text-gray-400">
          ← Swipe to scroll →
        </div>
      )}
    </div>
  )
}

// Table wrapper that adds responsive behavior
export function ResponsiveTable({ 
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <ScrollableTable className={className}>
      <div className="min-w-full inline-block align-middle">
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </ScrollableTable>
  )
}

// Enhanced table component with built-in scroll indicators
export function Table({ 
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <table 
      className={cn('min-w-full divide-y divide-gray-200 dark:divide-gray-700', className)}
      {...props}
    >
      {children}
    </table>
  )
}