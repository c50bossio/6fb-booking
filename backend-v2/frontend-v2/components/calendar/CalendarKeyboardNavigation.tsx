'use client'

import React from 'react'

interface CalendarKeyboardNavigationProps {
  onNavigate?: (direction: 'prev' | 'next') => void
  onDateSelect?: (date: Date) => void
  currentDate?: Date
  className?: string
}

export const CalendarKeyboardNavigation: React.FC<CalendarKeyboardNavigationProps> = ({
  onNavigate,
  onDateSelect,
  currentDate,
  className = ''
}) => {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        onNavigate?.('prev')
        break
      case 'ArrowRight':
        event.preventDefault()
        onNavigate?.('next')
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (currentDate) {
          onDateSelect?.(currentDate)
        }
        break
    }
  }

  return (
    <div 
      className={`calendar-keyboard-navigation ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="navigation"
      aria-label="Calendar keyboard navigation"
    >
      <div className="sr-only">
        Use arrow keys to navigate between dates, Enter or Space to select
      </div>
    </div>
  )
}

export default CalendarKeyboardNavigation