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
    setTimeout(() => {
      onDateChange(subDays(selectedDate, 1))
      setIsTransitioning(false)
    }, 150)
  }, [selectedDate, onDateChange, isTransitioning])

  const handleNextDay = useCallback(() => {
    if (isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      onDateChange(addDays(selectedDate, 1))
      setIsTransitioning(false)
    }, 150)
  }, [selectedDate, onDateChange, isTransitioning])

  // Reset transition state when date changes externally
  useEffect(() => {
    setIsTransitioning(false)
  }, [selectedDate])

  return (
    <div className={`relative w-full ${className}`}>
      {/* Navigation Header */}
      <div className="flex items-center justify-between py-4 px-2">
        <button
          onClick={handlePrevDay}
          disabled={isTransitioning}
          className="p-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous day"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
        </button>

        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(selectedDate, 'EEEE, MMMM d')}
          </h2>
          <p className="text-sm text-gray-500">
            {isToday(selectedDate) ? 'Today' : format(selectedDate, 'yyyy')}
          </p>
        </div>

        <button
          onClick={handleNextDay}
          disabled={isTransitioning}
          className="p-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next day"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Swipeable Day Container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`flex transition-transform duration-150 ease-out ${
            isTransitioning ? 'transform' : ''
          }`}
          style={{
            transform: `translateX(-33.333%)`, // Center the current day
            width: '300%' // Show 3 days total
          }}
        >
          {days.map((day, index) => (
            <div
              key={day.toISOString()}
              className="w-1/3 flex-shrink-0 px-1"
            >
              <div
                className={`text-center py-3 rounded-lg transition-colors ${
                  isSameDay(day, selectedDate)
                    ? 'bg-blue-100 text-blue-900 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="text-sm font-medium">
                  {format(day, 'EEE')}
                </div>
                <div className="text-lg">
                  {format(day, 'd')}
                </div>
                {isToday(day) && (
                  <div className="text-xs text-blue-600 font-medium">Today</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Touch gesture hint */}
      <div className="text-center text-xs text-gray-400 mt-2">
        Swipe left or right to change days
      </div>
    </div>
  )
}