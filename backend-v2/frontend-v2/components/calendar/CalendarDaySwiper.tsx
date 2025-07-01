'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { format, addDays, subDays, isSameDay, isToday } from 'date-fns'
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

interface CalendarDaySwiperProps {
  selectedDate: Date
  onDateChange: (date: Date) => void
  className?: string
}

export default function CalendarDaySwiper({
  selectedDate,
  onDateChange,
  className = ''
}: CalendarDaySwiperProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50

  // Days to show (current + prev/next for smooth swiping)
  const days = [-1, 0, 1].map(offset => addDays(selectedDate, offset))

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > minSwipeDistance
    const isRightSwipe = distance < -minSwipeDistance

    if (isLeftSwipe) {
      handleNextDay()
    } else if (isRightSwipe) {
      handlePrevDay()
    }
  }

  const handlePrevDay = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    const newDate = subDays(selectedDate, 1)
    onDateChange(newDate)
    setTimeout(() => setIsTransitioning(false), 300)
  }, [selectedDate, onDateChange, isTransitioning])

  const handleNextDay = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    const newDate = addDays(selectedDate, 1)
    onDateChange(newDate)
    setTimeout(() => setIsTransitioning(false), 300)
  }, [selectedDate, onDateChange, isTransitioning])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevDay()
      } else if (e.key === 'ArrowRight') {
        handleNextDay()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlePrevDay, handleNextDay])

  return (
    <div className={`bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between px-4 py-3">
        {/* Previous day button */}
        <button
          onClick={handlePrevDay}
          disabled={isTransitioning}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Previous day"
        >
          <ChevronLeftIcon className="w-5 h-5" />
        </button>

        {/* Swipeable date display */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div 
            className={`flex transition-transform duration-300 ${
              isTransitioning ? '' : 'transition-none'
            }`}
            style={{
              transform: `translateX(-33.333%)`
            }}
          >
            {days.map((day, index) => {
              const isSelected = isSameDay(day, selectedDate)
              const isTodayDate = isToday(day)
              
              return (
                <div
                  key={day.toISOString()}
                  className={`w-full flex-shrink-0 text-center px-4 ${
                    isSelected ? 'opacity-100' : 'opacity-50'
                  }`}
                >
                  <div className="space-y-1">
                    <p className={`text-sm font-medium ${
                      isTodayDate ? 'text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {isTodayDate ? 'Today' : format(day, 'EEEE')}
                    </p>
                    <p className={`text-2xl font-bold ${
                      isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {format(day, 'd')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {format(day, 'MMMM yyyy')}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Next day button */}
        <button
          onClick={handleNextDay}
          disabled={isTransitioning}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          aria-label="Next day"
        >
          <ChevronRightIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Visual indicator for swipe */}
      <div className="flex justify-center gap-1 pb-2">
        {[-1, 0, 1].map((offset) => (
          <div
            key={offset}
            className={`h-1 rounded-full transition-all duration-300 ${
              offset === 0
                ? 'w-6 bg-primary-500'
                : 'w-1 bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>
    </div>
  )
}