'use client'

import React from 'react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
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
  onViewChange?: (view: CalendarView) => void
  showViewSwitcher?: boolean
}

export const CalendarHeader = React.memo(function CalendarHeader({
  view,
  currentDate,
  onNavigate,
  onTodayClick,
  onRefresh,
  isLoading = false,
  onViewChange,
  showViewSwitcher = false
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
      className="calendar-navigation flex items-center justify-between p-2 sm:p-4 border-b border-gray-200 dark:border-gray-700"
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('prev')}
          className={isMobile ? getMobileTouchClass('medium', 'ghost') : ''}
          aria-label="Previous period"
          disabled={isLoading}
        >
          <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
        
        <h2 className="text-base sm:text-lg font-semibold min-w-[140px] sm:min-w-[200px] text-center select-none">
          {getPeriodTitle()}
        </h2>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onNavigate('next')}
          className={isMobile ? getMobileTouchClass('medium', 'ghost') : ''}
          aria-label="Next period"
          disabled={isLoading}
        >
          <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </Button>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onTodayClick}
          className={isMobile ? `${getMobileTouchClass('small', 'secondary')} text-xs` : ''}
          disabled={isLoading}
        >
          Today
        </Button>
        
        {/* View Switcher */}
        {showViewSwitcher && onViewChange && (
          <div className="calendar-view-switcher flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => onViewChange('day')}
              className={`calendar-nav-button px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-colors ${
                view === 'day' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              disabled={isLoading}
            >
              Day
            </button>
            <button
              onClick={() => onViewChange('week')}
              className={`calendar-nav-button px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-colors ${
                view === 'week' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              disabled={isLoading}
            >
              Week
            </button>
            <button
              onClick={() => onViewChange('month')}
              className={`calendar-nav-button px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-colors ${
                view === 'month' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              disabled={isLoading}
            >
              Month
            </button>
          </div>
        )}
        
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            {isLoading ? (
              <ArrowPathIcon className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowPathIcon className="w-4 h-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
})

CalendarHeader.displayName = 'CalendarHeader'