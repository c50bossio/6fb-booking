'use client'

import React from 'react'
import { format, startOfWeek, endOfWeek } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon, ArrowPathIcon, SparklesIcon, UsersIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import { Button } from '../ui/button'
import { useResponsive } from '@/hooks/useResponsive'
import { getMobileTouchClass } from '@/lib/mobile-touch-enhancements'
import type { CalendarView } from '@/types/calendar'

interface CalendarHeaderProps {
  view: CalendarView
  currentDate: Date
  onNavigate: (direction: 'prev' | 'next') => void
  onTodayClick: () => void
  onRefresh?: () => void
  isLoading?: boolean
  onToggleSmartPanel?: () => void
  showSmartPanel?: boolean
  onToggleClientManager?: () => void
  showClientManager?: boolean
  onToggleRevenuePanel?: () => void
  showRevenuePanel?: boolean
}

export const CalendarHeader = React.memo(function CalendarHeader({
  view,
  currentDate,
  onNavigate,
  onTodayClick,
  onRefresh,
  isLoading = false,
  onToggleSmartPanel,
  showSmartPanel = false,
  onToggleClientManager,
  showClientManager = false,
  onToggleRevenuePanel,
  showRevenuePanel = false
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
      className={`
        calendar-navigation flex items-center justify-between 
        px-4 py-3 md:px-6 md:py-4
        bg-white dark:bg-gray-900
        border-b border-gray-200 dark:border-gray-700
        rounded-t-lg
      `}
      onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 md:gap-3">
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
        
        <h2 className={`
          text-base md:text-lg font-semibold 
          min-w-[140px] md:min-w-[200px] text-center select-none
          text-gray-900 dark:text-gray-100
          px-2
        `}>
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
      
      <div className="flex items-center gap-2 md:gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onTodayClick}
          className={isMobile ? `${getMobileTouchClass('small', 'secondary')} text-xs` : ''}
          disabled={isLoading}
        >
          Today
        </Button>
        
        {onToggleSmartPanel && (
          <Button
            variant={showSmartPanel ? "default" : "outline"}
            size="sm"
            onClick={onToggleSmartPanel}
            className={`${isMobile ? getMobileTouchClass('small', 'secondary') : ''} ${showSmartPanel ? 'bg-blue-600 text-white' : ''}`}
            disabled={isLoading}
          >
            <SparklesIcon className="w-4 h-4 mr-1" />
            {!isMobile && 'Smart'}
          </Button>
        )}

        {onToggleClientManager && (
          <Button
            variant={showClientManager ? "default" : "outline"}
            size="sm"
            onClick={onToggleClientManager}
            className={`${isMobile ? getMobileTouchClass('small', 'secondary') : ''} ${showClientManager ? 'bg-purple-600 text-white' : ''}`}
            disabled={isLoading}
          >
            <UsersIcon className="w-4 h-4 mr-1" />
            {!isMobile && 'Clients'}
          </Button>
        )}

        {onToggleRevenuePanel && (
          <Button
            variant={showRevenuePanel ? "default" : "outline"}
            size="sm"
            onClick={onToggleRevenuePanel}
            className={`${isMobile ? getMobileTouchClass('small', 'secondary') : ''} ${showRevenuePanel ? 'bg-green-600 text-white' : ''}`}
            disabled={isLoading}
          >
            <ChartBarIcon className="w-4 h-4 mr-1" />
            {!isMobile && 'Revenue'}
          </Button>
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