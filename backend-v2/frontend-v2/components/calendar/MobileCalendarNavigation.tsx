'use client'

import React, { useState, useEffect, useRef } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, SwatchIcon } from '@heroicons/react/24/outline'
import { useCalendarInteraction } from '@/hooks/useCalendarInteraction'
import { useCalendarVisuals } from '@/hooks/useCalendarVisuals'
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns'

interface MobileCalendarNavigationProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  viewMode: 'day' | 'week' | 'month'
  onViewModeChange: (mode: 'day' | 'week' | 'month') => void
  className?: string
}

/**
 * Mobile-optimized calendar navigation with touch gestures
 * Features swipe navigation, touch-friendly controls, and visual hints
 */
export function MobileCalendarNavigation({
  currentDate,
  onDateChange,
  viewMode,
  onViewModeChange,
  className = ''
}: MobileCalendarNavigationProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [showSwipeHint, setShowSwipeHint] = useState(false)
  const [swipeHint, setSwipeHint] = useState<'left' | 'right' | null>(null)
  
  // Use consolidated hooks
  const { prefersReducedMotion } = useCalendarInteraction()
  const { isMobile } = useCalendarVisuals()
  
  const elementRef = useRef<HTMLDivElement>(null)

  const handleNavigate = (direction: 'prev' | 'next' | 'up' | 'down') => {
    if (isTransitioning) return

    setIsTransitioning(true)
    
    let newDate = currentDate
    let animationDirection: 'forward' | 'backward' = 'forward'

    switch (direction) {
      case 'prev':
        animationDirection = 'backward'
        if (viewMode === 'day') {
          newDate = subDays(currentDate, 1)
        } else if (viewMode === 'week') {
          newDate = subWeeks(currentDate, 1)
        } else {
          newDate = subMonths(currentDate, 1)
        }
        break
      case 'next':
        animationDirection = 'forward'
        if (viewMode === 'day') {
          newDate = addDays(currentDate, 1)
        } else if (viewMode === 'week') {
          newDate = addWeeks(currentDate, 1)
        } else {
          newDate = addMonths(currentDate, 1)
        }
        break
      case 'up':
        // Zoom out to larger time period
        if (viewMode === 'day') {
          onViewModeChange('week')
        } else if (viewMode === 'week') {
          onViewModeChange('month')
        }
        return
      case 'down':
        // Zoom in to smaller time period
        if (viewMode === 'month') {
          onViewModeChange('week')
        } else if (viewMode === 'week') {
          onViewModeChange('day')
        }
        return
    }

    // Simple transition without complex animations
    setTimeout(() => {
      setIsTransitioning(false)
    }, prefersReducedMotion ? 0 : 200)

    onDateChange(newDate)
  }

  const dismissSwipeHint = () => setShowSwipeHint(false)
  
  // Touch gesture handling
  const { getTouchHandlers } = useCalendarInteraction({
    onSwipeLeft: () => handleNavigate('next'),
    onSwipeRight: () => handleNavigate('prev'),
    onSwipeUp: () => handleNavigate('up'),
    onSwipeDown: () => handleNavigate('down')
  })

  const getDateLabel = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'week':
        return `Week of ${format(currentDate, 'MMMM d, yyyy')}`
      case 'month':
        return format(currentDate, 'MMMM yyyy')
      default:
        return format(currentDate, 'MMMM yyyy')
    }
  }

  const getViewModeIcon = (mode: 'day' | 'week' | 'month') => {
    const isActive = viewMode === mode
    const baseClasses = `
      flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200
      ${isActive 
        ? 'bg-blue-500 text-white shadow-lg' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
      }
    `

    const icons = {
      day: (
        <div className="flex flex-col items-center">
          <div className="w-2 h-2 bg-current rounded-full" />
          <div className="text-xs font-medium mt-0.5">D</div>
        </div>
      ),
      week: (
        <div className="flex space-x-0.5">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="w-0.5 h-4 bg-current rounded" />
          ))}
        </div>
      ),
      month: (
        <div className="grid grid-cols-3 gap-0.5">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="w-1 h-1 bg-current rounded-full" />
          ))}
        </div>
      )
    }

    return (
      <button
        onClick={() => onViewModeChange(mode)}
        className={baseClasses}
        aria-label={`Switch to ${mode} view`}
      >
        {icons[mode]}
      </button>
    )
  }

  return (
    <div className={`mobile-calendar-navigation ${className}`}>
      {/* Swipe Hint Overlay */}
      {showSwipeHint && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={dismissSwipeHint}>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mx-4 max-w-sm text-center">
            <SwatchIcon className="w-12 h-12 text-blue-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Swipe to Navigate
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Swipe left/right to change dates, up/down to change views
            </p>
            <div className="flex justify-center space-x-4 mb-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <ChevronLeftIcon className="w-4 h-4 animate-bounce-left" />
                <span>Previous</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>Next</span>
                <ChevronRightIcon className="w-4 h-4 animate-bounce-right" />
              </div>
            </div>
            <button
              onClick={dismissSwipeHint}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium"
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {/* Main Navigation Header */}
      <div 
        ref={elementRef}
        className={`
          flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700
          ${isTransitioning ? 'pointer-events-none opacity-75' : ''}
          transition-opacity duration-200
        `}
        {...getTouchHandlers()}
      >
        {/* Previous Button */}
        <button
          onClick={() => handleNavigate('prev')}
          disabled={isTransitioning}
          className={`
            flex items-center justify-center w-10 h-10 rounded-lg
            bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300
            dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
            transition-all duration-200 disabled:opacity-50
            ${swipeHint === 'right' ? 'animate-pulse bg-blue-100 dark:bg-blue-900' : ''}
          `}
          aria-label="Previous period"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        {/* Date Display */}
        <div className="flex-1 text-center px-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {getDateLabel()}
          </h2>
          {viewMode === 'day' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(currentDate, 'EEEE')}
            </p>
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={() => handleNavigate('next')}
          disabled={isTransitioning}
          className={`
            flex items-center justify-center w-10 h-10 rounded-lg
            bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300
            dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
            transition-all duration-200 disabled:opacity-50
            ${swipeHint === 'left' ? 'animate-pulse bg-blue-100 dark:bg-blue-900' : ''}
          `}
          aria-label="Next period"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* View Mode Selector */}
      <div className="flex justify-center items-center space-x-2 p-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">View:</span>
        {getViewModeIcon('day')}
        {getViewModeIcon('week')}
        {getViewModeIcon('month')}
      </div>

      {/* Touch Gesture Feedback */}
      {swipeHint && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div 
            className={`
              px-4 py-2 rounded-lg bg-blue-500 text-white font-medium shadow-lg
              ${swipeHint === 'left' ? 'animate-slide-right' : 'animate-slide-left'}
            `}
          >
            {swipeHint === 'left' ? 'Next →' : '← Previous'}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Mobile-optimized touch targets for calendar interactions
 */
interface TouchFriendlyControlsProps {
  children: React.ReactNode
  onTap?: () => void
  onLongPress?: () => void
  className?: string
}

export function TouchFriendlyControls({
  children,
  onTap,
  onLongPress,
  className = ''
}: TouchFriendlyControlsProps) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const longPressTimeoutRef = useRef<NodeJS.Timeout>()

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }

    if (onLongPress) {
      longPressTimeoutRef.current = setTimeout(() => {
        onLongPress()
      }, 500)
    }
  }

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!touchStartRef.current) return

    const touch = event.touches[0]
    const dx = Math.abs(touch.clientX - touchStartRef.current.x)
    const dy = Math.abs(touch.clientY - touchStartRef.current.y)

    // Cancel long press if finger moves too much
    if ((dx > 10 || dy > 10) && longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current)
    }

    if (!touchStartRef.current) return

    const touch = event.changedTouches[0]
    const dx = Math.abs(touch.clientX - touchStartRef.current.x)
    const dy = Math.abs(touch.clientY - touchStartRef.current.y)
    const duration = Date.now() - touchStartRef.current.time

    // Treat as tap if movement is minimal and duration is short
    if (dx < 10 && dy < 10 && duration < 300 && onTap) {
      onTap()
    }

    touchStartRef.current = null
  }

  return (
    <div
      className={`
        touch-friendly-control
        min-h-[44px] min-w-[44px] // WCAG AAA touch target size
        flex items-center justify-center
        ${className}
      `}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}

/**
 * Swipe navigation indicator for visual feedback
 */
export function SwipeNavigationIndicator({ direction }: { direction: 'left' | 'right' }) {
  return (
    <div 
      className={`
        fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
        z-40 px-4 py-2 bg-blue-500 text-white rounded-lg shadow-lg
        flex items-center space-x-2 pointer-events-none
        ${direction === 'left' ? 'animate-slide-left' : 'animate-slide-right'}
      `}
    >
      {direction === 'right' && <ChevronLeftIcon className="w-5 h-5" />}
      <span className="font-medium">
        {direction === 'left' ? 'Next' : 'Previous'}
      </span>
      {direction === 'left' && <ChevronRightIcon className="w-5 h-5" />}
    </div>
  )
}