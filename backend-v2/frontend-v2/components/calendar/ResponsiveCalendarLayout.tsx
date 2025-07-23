'use client'

import React, { useState, useEffect } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useCalendarVisuals } from '@/hooks/useCalendarVisuals'

interface ResponsiveCalendarLayoutProps {
  children: React.ReactNode
  viewMode: 'day' | 'week' | 'month'
  mobileBreakpoint?: number
  tabletBreakpoint?: number
}

interface ResponsiveBreakpoints {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isTouchDevice: boolean
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * Hook for responsive calendar behavior based on device characteristics
 * Now uses the consolidated useCalendarVisuals hook
 */
function useResponsiveCalendar(
  mobileBreakpoint = 768,
  tabletBreakpoint = 1024
): ResponsiveBreakpoints {
  const { 
    isMobile, 
    isTablet, 
    isDesktop, 
    isTouch: isTouchDevice,
    viewportWidth 
  } = useCalendarVisuals({
    breakpoints: {
      mobile: mobileBreakpoint,
      tablet: tabletBreakpoint
    }
  })
  
  const [screenSize, setScreenSize] = useState<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('md')

  useEffect(() => {
    const updateScreenSize = () => {
      const width = viewportWidth || window.innerWidth
      if (width < 480) setScreenSize('xs')
      else if (width < 640) setScreenSize('sm')
      else if (width < mobileBreakpoint) setScreenSize('md')
      else if (width < tabletBreakpoint) setScreenSize('lg')
      else setScreenSize('xl')
    }

    updateScreenSize()
    window.addEventListener('resize', updateScreenSize)
    return () => window.removeEventListener('resize', updateScreenSize)
  }, [mobileBreakpoint, tabletBreakpoint, viewportWidth])

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    screenSize
  }
}

/**
 * Responsive calendar layout that adapts to different screen sizes and input methods
 */
export function ResponsiveCalendarLayout({
  children,
  viewMode,
  mobileBreakpoint = 768,
  tabletBreakpoint = 1024
}: ResponsiveCalendarLayoutProps) {
  const responsive = useResponsiveCalendar(mobileBreakpoint, tabletBreakpoint)

  const getLayoutClasses = () => {
    const baseClasses = 'calendar-responsive-layout transition-all duration-300'
    
    if (responsive.isMobile) {
      return `${baseClasses} mobile-layout p-2`
    } else if (responsive.isTablet) {
      return `${baseClasses} tablet-layout p-4`
    } else {
      return `${baseClasses} desktop-layout p-6`
    }
  }

  const getTouchTargetClasses = () => {
    if (responsive.isTouchDevice) {
      return 'touch-optimized min-touch-target-44'
    }
    return 'mouse-optimized'
  }

  const getFontSizeClasses = () => {
    switch (responsive.screenSize) {
      case 'xs':
        return 'text-xs'
      case 'sm':
        return 'text-sm'
      case 'md':
        return 'text-sm md:text-base'
      case 'lg':
        return 'text-base'
      case 'xl':
        return 'text-base lg:text-lg'
      default:
        return 'text-base'
    }
  }

  return (
    <div 
      className={`
        ${getLayoutClasses()}
        ${getTouchTargetClasses()}
        ${getFontSizeClasses()}
      `}
      style={{
        // CSS variables for responsive spacing
        '--calendar-spacing': responsive.isMobile ? '8px' : responsive.isTablet ? '12px' : '16px',
        '--calendar-border-radius': responsive.isMobile ? '8px' : '12px',
        '--calendar-touch-target': responsive.isTouchDevice ? '44px' : '32px'
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

/**
 * Touch-optimized calendar grid with proper spacing and sizing
 */
interface TouchOptimizedGridProps {
  children: React.ReactNode
  columns: number
  rows?: number
  gap?: 'sm' | 'md' | 'lg'
  minTouchTarget?: boolean
}

export function TouchOptimizedGrid({
  children,
  columns,
  rows,
  gap = 'md',
  minTouchTarget = true
}: TouchOptimizedGridProps) {
  const responsive = useResponsiveCalendar()

  const getGapClasses = () => {
    const gapSizes = {
      sm: responsive.isMobile ? 'gap-1' : 'gap-2',
      md: responsive.isMobile ? 'gap-2' : 'gap-3',
      lg: responsive.isMobile ? 'gap-3' : 'gap-4'
    }
    return gapSizes[gap]
  }

  const getGridClasses = () => {
    const baseClasses = `grid ${getGapClasses()}`
    
    // Responsive column adjustments
    if (responsive.isMobile && columns > 5) {
      return `${baseClasses} grid-cols-${Math.min(columns, 7)}`
    }
    
    return `${baseClasses} grid-cols-${columns}`
  }

  const getTouchTargetStyle = () => {
    if (!minTouchTarget || !responsive.isTouchDevice) return {}
    
    const targetSize = responsive.isMobile ? '44px' : '48px'
    return {
      minHeight: targetSize,
      minWidth: targetSize
    }
  }

  return (
    <div 
      className={getGridClasses()}
      style={{
        gridTemplateRows: rows ? `repeat(${rows}, 1fr)` : undefined,
        ...getTouchTargetStyle()
      }}
    >
      {children}
    </div>
  )
}

/**
 * Adaptive calendar cell that adjusts size and behavior based on device
 */
interface AdaptiveCalendarCellProps {
  children: React.ReactNode
  onClick?: () => void
  onLongPress?: () => void
  isSelected?: boolean
  isToday?: boolean
  isDisabled?: boolean
  hasEvents?: boolean
  className?: string
}

export function AdaptiveCalendarCell({
  children,
  onClick,
  onLongPress,
  isSelected = false,
  isToday = false,
  isDisabled = false,
  hasEvents = false,
  className = ''
}: AdaptiveCalendarCellProps) {
  const responsive = useResponsiveCalendar()
  const [isPressed, setIsPressed] = useState(false)

  const handleTouchStart = () => {
    setIsPressed(true)
  }

  const handleTouchEnd = () => {
    setIsPressed(false)
  }

  const getCellClasses = () => {
    const baseClasses = `
      adaptive-calendar-cell
      relative flex items-center justify-center
      transition-all duration-200 ease-out
      ${responsive.isTouchDevice ? 'select-none' : 'cursor-pointer'}
      ${className}
    `

    const sizeClasses = responsive.isMobile 
      ? 'min-h-[44px] min-w-[44px] p-2 text-sm' 
      : responsive.isTablet 
        ? 'min-h-[48px] min-w-[48px] p-3 text-base'
        : 'min-h-[40px] min-w-[40px] p-2 text-base'

    const stateClasses = `
      ${isSelected ? 'bg-blue-500 text-white shadow-lg ring-2 ring-blue-300' : ''}
      ${isToday && !isSelected ? 'bg-blue-50 text-blue-600 ring-2 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-400' : ''}
      ${isDisabled ? 'opacity-50 pointer-events-none' : ''}
      ${hasEvents && !isSelected ? 'font-semibold' : ''}
      ${isPressed ? 'scale-95 bg-gray-200 dark:bg-gray-600' : ''}
    `

    const interactionClasses = responsive.isTouchDevice
      ? 'active:scale-95 active:bg-gray-200 dark:active:bg-gray-600'
      : 'hover:bg-gray-100 hover:scale-105 dark:hover:bg-gray-700'

    return `${baseClasses} ${sizeClasses} ${stateClasses} ${interactionClasses}`.trim()
  }

  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick()
    }
  }

  return (
    <button
      className={getCellClasses()}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      disabled={isDisabled}
      aria-pressed={isSelected}
      aria-current={isToday ? 'date' : undefined}
    >
      {children}
      
      {/* Event indicator */}
      {hasEvents && !isSelected && (
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
          <div className="w-1 h-1 bg-blue-500 rounded-full" />
        </div>
      )}
      
      {/* Touch ripple effect */}
      {responsive.isTouchDevice && isPressed && (
        <div className="absolute inset-0 bg-current opacity-20 rounded-lg animate-ping" />
      )}
    </button>
  )
}

/**
 * Mobile-first appointment card with touch-optimized interactions
 */
interface MobileAppointmentCardProps {
  children: React.ReactNode
  onTap?: () => void
  onLongPress?: () => void
  onSwipe?: (direction: 'left' | 'right') => void
  isDraggable?: boolean
  className?: string
}

export function MobileAppointmentCard({
  children,
  onTap,
  onLongPress,
  onSwipe,
  isDraggable = false,
  className = ''
}: MobileAppointmentCardProps) {
  const responsive = useResponsiveCalendar()
  const [touchStart, setTouchStart] = useState<{ x: number; y: number; time: number } | null>(null)
  const [isPressed, setIsPressed] = useState(false)

  const handleTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0]
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    })
    setIsPressed(true)

    if (onLongPress) {
      setTimeout(() => {
        if (isPressed) {
          onLongPress()
        }
      }, 500)
    }
  }

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!touchStart) return

    const touch = event.touches[0]
    const dx = Math.abs(touch.clientX - touchStart.x)
    const dy = Math.abs(touch.clientY - touchStart.y)

    // Cancel long press if finger moves
    if (dx > 10 || dy > 10) {
      setIsPressed(false)
    }
  }

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (!touchStart) return

    const touch = event.changedTouches[0]
    const dx = touch.clientX - touchStart.x
    const dy = touch.clientY - touchStart.y
    const duration = Date.now() - touchStart.time

    setIsPressed(false)
    setTouchStart(null)

    // Detect swipe
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) && duration < 300 && onSwipe) {
      onSwipe(dx > 0 ? 'right' : 'left')
      return
    }

    // Detect tap
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && duration < 300 && onTap) {
      onTap()
    }
  }

  const getCardClasses = () => {
    const baseClasses = `
      mobile-appointment-card
      ${responsive.isMobile ? 'min-h-[52px] p-3 rounded-lg' : 'min-h-[48px] p-4 rounded-xl'}
      transition-all duration-200 ease-out
      ${isDraggable && responsive.isTouchDevice ? 'touch-manipulation' : ''}
      ${className}
    `

    const pressedClasses = isPressed ? 'scale-98 shadow-sm' : 'shadow-md hover:shadow-lg'

    return `${baseClasses} ${pressedClasses}`.trim()
  }

  return (
    <div
      className={getCardClasses()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: isDraggable ? 'manipulation' : 'auto'
      }}
    >
      {children}
      
      {/* Drag handle for touch devices */}
      {isDraggable && responsive.isTouchDevice && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="w-1 h-6 bg-gray-400 rounded-full opacity-50" />
        </div>
      )}
    </div>
  )
}

/**
 * Responsive calendar header with adaptive sizing
 */
interface ResponsiveCalendarHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}

export function ResponsiveCalendarHeader({
  title,
  subtitle,
  actions,
  className = ''
}: ResponsiveCalendarHeaderProps) {
  const responsive = useResponsiveCalendar()

  const getTitleClasses = () => {
    if (responsive.isMobile) {
      return 'text-lg font-semibold truncate'
    } else if (responsive.isTablet) {
      return 'text-xl font-semibold'
    } else {
      return 'text-2xl font-bold'
    }
  }

  const getSubtitleClasses = () => {
    if (responsive.isMobile) {
      return 'text-sm text-gray-600 dark:text-gray-400'
    } else {
      return 'text-base text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className={`responsive-calendar-header flex items-center justify-between ${className}`}>
      <div className="flex-1 min-w-0">
        <h1 className={`${getTitleClasses()} text-gray-900 dark:text-white`}>
          {title}
        </h1>
        {subtitle && (
          <p className={getSubtitleClasses()}>
            {subtitle}
          </p>
        )}
      </div>
      
      {actions && (
        <div className={`flex items-center space-x-2 ${responsive.isMobile ? 'ml-4' : 'ml-6'}`}>
          {actions}
        </div>
      )}
    </div>
  )
}