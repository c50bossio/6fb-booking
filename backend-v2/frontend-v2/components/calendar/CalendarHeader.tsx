'use client'

import React from 'react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { useResponsive } from '@/hooks/useResponsive'
import { getMobileTouchClass } from '@/lib/mobile-touch-enhancements'
import type { CalendarView } from '../UnifiedCalendar'

interface CalendarHeaderProps {
  view: CalendarView
  currentDate: Date
  onNavigate: (direction: 'prev' | 'next') => void
  onTodayClick: () => void
  onRefresh?: () => void
  isLoading?: boolean
}

export const CalendarHeader = React.memo(function CalendarHeader({
  view,
  currentDate,
  onNavigate,
  onTodayClick,
  onRefresh,
  isLoading = false
}: CalendarHeaderProps) {
  const { isMobile } = useResponsive()

  // Get current period title based on view
  const getPeriodTitle = () => {
    switch (view) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'week':
        const weekStart = startOfWeek(currentDate)
        const weekEnd = endOfWeek(currentDate)
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'month':
        return format(currentDate, 'MMMM yyyy')
      default:
        return ''
    }
  }

  return (
    <div 
      className="calendar-premium-grid calendar-navigation relative flex items-center justify-between p-3 sm:p-6 border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg rounded-t-xl shadow-lg border-b border-white/20 dark:border-gray-700/50"
      onClick={(e) => e.stopPropagation()}>
      
      {/* Background Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-pink-900/10 rounded-t-xl pointer-events-none" />
      
      {/* Left Navigation Section */}
      <div className="relative flex items-center gap-2 sm:gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('prev')}
          className={`
            calendar-smooth-transition bg-white/60 dark:bg-gray-800/60 border-white/30 dark:border-gray-600/30
            hover:bg-white/80 hover:border-blue-300/50 hover:shadow-lg hover:shadow-blue-500/20
            ${isMobile ? getMobileTouchClass('medium', 'ghost') : ''}
            transition-all duration-300 ease-out
          `}
          aria-label="Previous period"
          disabled={isLoading}
        >
          <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
        </Button>
        
        {/* Enhanced Period Title with Calendar Icon */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-[160px] sm:min-w-[240px]">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
            <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <h2 className="text-base sm:text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent select-none">
            {getPeriodTitle()}
          </h2>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('next')}
          className={`
            calendar-smooth-transition bg-white/60 dark:bg-gray-800/60 border-white/30 dark:border-gray-600/30
            hover:bg-white/80 hover:border-blue-300/50 hover:shadow-lg hover:shadow-blue-500/20
            ${isMobile ? getMobileTouchClass('medium', 'ghost') : ''}
            transition-all duration-300 ease-out
          `}
          aria-label="Next period"
          disabled={isLoading}
        >
          <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300" />
        </Button>
      </div>
      
      {/* Right Action Section */}
      <div className="relative flex items-center gap-2 sm:gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onTodayClick}
          className={`
            calendar-smooth-transition bg-gradient-to-r from-emerald-500 to-blue-600 text-white border-0
            hover:from-emerald-600 hover:to-blue-700 hover:shadow-lg hover:shadow-emerald-500/30
            ${isMobile ? `${getMobileTouchClass('small', 'secondary')} text-xs` : ''}
            font-semibold px-4 py-2 transition-all duration-300 ease-out
          `}
          disabled={isLoading}
        >
          Today
        </Button>
        
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="
              calendar-smooth-transition bg-white/60 dark:bg-gray-800/60 border-white/30 dark:border-gray-600/30
              hover:bg-white/80 hover:border-purple-300/50 hover:shadow-lg hover:shadow-purple-500/20
              transition-all duration-300 ease-out
            "
          >
            {isLoading ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
            ) : (
              <ArrowPathIcon className="w-4 h-4 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
})

CalendarHeader.displayName = 'CalendarHeader'