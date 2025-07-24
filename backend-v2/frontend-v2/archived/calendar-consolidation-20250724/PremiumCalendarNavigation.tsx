'use client'

import React, { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, CalendarIcon } from '@heroicons/react/24/outline'
import { format, addMonths, subMonths } from 'date-fns'
import { getTheme, enhanceNavigationStyling, premiumAnimations, interactionStates } from '@/lib/calendar-premium-theme'

interface PremiumCalendarNavigationProps {
  currentDate: Date
  onDateChange: (date: Date) => void
  onTodayClick: () => void
  className?: string
  theme?: 'platinum' | 'pearl' | 'aurora'
  showMonthPicker?: boolean
}

export default function PremiumCalendarNavigation({
  currentDate,
  onDateChange,
  onTodayClick,
  className = '',
  theme = 'pearl',
  showMonthPicker = true
}: PremiumCalendarNavigationProps) {
  const [isNavigating, setIsNavigating] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const themeConfig = getTheme(theme)

  const handlePrevious = async () => {
    setIsNavigating(true)
    const newDate = subMonths(currentDate, 1)
    
    // Add a small delay for smooth animation
    setTimeout(() => {
      onDateChange(newDate)
      setIsNavigating(false)
    }, 150)
  }

  const handleNext = async () => {
    setIsNavigating(true)
    const newDate = addMonths(currentDate, 1)
    
    // Add a small delay for smooth animation  
    setTimeout(() => {
      onDateChange(newDate)
      setIsNavigating(false)
    }, 150)
  }

  const handleToday = () => {
    onTodayClick()
    // Add haptic feedback for mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
  }

  const baseButtonClasses = enhanceNavigationStyling(
    'relative inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-300 transform-gpu',
    themeConfig
  )

  const monthYearClasses = enhanceNavigationStyling(
    'relative inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-lg font-semibold transition-all duration-300 transform-gpu',
    themeConfig
  )

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {/* Left Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={handlePrevious}
          disabled={isNavigating}
          className={`${baseButtonClasses} group ${
            isNavigating ? 'animate-pulse opacity-70' : ''
          } ${interactionStates.hover.navButton} ${interactionStates.active.navButton} ${interactionStates.focus.navButton}`}
          aria-label="Previous month"
        >
          <ChevronLeftIcon 
            className={`w-5 h-5 transition-transform duration-200 ${
              isNavigating ? 'animate-bounce' : 'group-hover:-translate-x-0.5'
            }`} 
          />
          
          {/* Ripple effect */}
          <div className="absolute inset-0 rounded-xl bg-white/20 scale-0 group-active:scale-100 transition-transform duration-200 pointer-events-none" />
        </button>

        <button
          onClick={handleToday}
          className={`${baseButtonClasses} group ${interactionStates.hover.navButton} ${interactionStates.active.navButton} ${interactionStates.focus.navButton}`}
          aria-label="Go to today"
        >
          <CalendarIcon className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform duration-200" />
          <span className="hidden sm:inline">Today</span>
          <span className="sm:hidden">•</span>
          
          {/* Animated underline */}
          <div className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-primary-400 group-hover:w-3/4 -translate-x-1/2 transition-all duration-300" />
        </button>
      </div>

      {/* Center - Month/Year Display */}
      <div className="flex-1 flex justify-center">
        {showMonthPicker ? (
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`${monthYearClasses} group ${interactionStates.hover.navButton} ${interactionStates.focus.navButton}`}
            aria-label="Change month and year"
          >
            <span className="relative">
              {format(currentDate, 'MMMM yyyy')}
              
              {/* Gradient text effect on hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {format(currentDate, 'MMMM yyyy')}
              </span>
            </span>
            
            {/* Animated chevron */}
            <ChevronRightIcon 
              className={`w-4 h-4 ml-2 transition-transform duration-300 ${
                showDatePicker ? 'rotate-90' : 'group-hover:rotate-90'
              }`} 
            />
          </button>
        ) : (
          <div className={`${monthYearClasses} cursor-default`}>
            <span className="bg-gradient-to-r from-primary-600 to-primary-500 bg-clip-text text-transparent">
              {format(currentDate, 'MMMM yyyy')}
            </span>
          </div>
        )}
      </div>

      {/* Right Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleNext}
          disabled={isNavigating}
          className={`${baseButtonClasses} group ${
            isNavigating ? 'animate-pulse opacity-70' : ''
          } ${interactionStates.hover.navButton} ${interactionStates.active.navButton} ${interactionStates.focus.navButton}`}
          aria-label="Next month"
        >
          <ChevronRightIcon 
            className={`w-5 h-5 transition-transform duration-200 ${
              isNavigating ? 'animate-bounce' : 'group-hover:translate-x-0.5'
            }`} 
          />
          
          {/* Ripple effect */}
          <div className="absolute inset-0 rounded-xl bg-white/20 scale-0 group-active:scale-100 transition-transform duration-200 pointer-events-none" />
        </button>
      </div>

      {/* Enhanced Month/Year Picker Modal */}
      {showDatePicker && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in-0 duration-300"
          onClick={() => setShowDatePicker(false)}
        >
          <div 
            className={`${themeConfig.calendar.elevated} rounded-2xl p-6 m-4 w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-8 duration-300`}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4 text-center">Select Month & Year</h3>
            
            {/* Year selector */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Year</label>
              <select 
                value={currentDate.getFullYear()}
                onChange={(e) => {
                  const newDate = new Date(currentDate)
                  newDate.setFullYear(parseInt(e.target.value))
                  onDateChange(newDate)
                }}
                className={`w-full px-3 py-2 rounded-lg ${themeConfig.calendar.surface} border-0 focus:ring-2 focus:ring-primary-500 transition-all duration-200`}
              >
                {Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i
                  return (
                    <option key={year} value={year}>{year}</option>
                  )
                })}
              </select>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {Array.from({ length: 12 }, (_, i) => {
                const monthDate = new Date(currentDate.getFullYear(), i, 1)
                const isSelected = currentDate.getMonth() === i
                
                return (
                  <button
                    key={i}
                    onClick={() => {
                      const newDate = new Date(currentDate)
                      newDate.setMonth(i)
                      onDateChange(newDate)
                      setShowDatePicker(false)
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isSelected 
                        ? themeConfig.timeSlots.selected 
                        : themeConfig.timeSlots.available
                    } ${interactionStates.hover.timeSlot} ${interactionStates.active.timeSlot}`}
                  >
                    {format(monthDate, 'MMM')}
                  </button>
                )
              })}
            </div>

            {/* Close button */}
            <button
              onClick={() => setShowDatePicker(false)}
              className={`w-full ${baseButtonClasses} ${interactionStates.hover.navButton}`}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Navigation progress indicator */}
      {isNavigating && (
        <div className="absolute bottom-0 left-0 h-0.5 bg-primary-400 animate-pulse" 
             style={{ width: '100%' }} />
      )}
    </div>
  )
}