'use client'

import React, { useState, useEffect } from 'react'
import { CalendarIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { format, isToday, isSameDay } from 'date-fns'

interface JumpToTodayButtonProps {
  currentDate: Date
  onJumpToToday: () => void
  className?: string
}

/**
 * Floating action button that appears when user navigates away from today
 * Provides quick way to jump back to current date
 */
export function JumpToTodayButton({ 
  currentDate, 
  onJumpToToday, 
  className = '' 
}: JumpToTodayButtonProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  
  // Show button when current date is not today
  useEffect(() => {
    const shouldShow = !isSameDay(currentDate, new Date())
    
    if (shouldShow !== isVisible) {
      setIsAnimating(true)
      setTimeout(() => {
        setIsVisible(shouldShow)
        setIsAnimating(false)
      }, 50)
    }
  }, [currentDate, isVisible])

  const handleClick = () => {
    // Add a subtle animation feedback
    setIsAnimating(true)
    setTimeout(() => {
      onJumpToToday()
      setIsAnimating(false)
    }, 100)
  }

  if (!isVisible && !isAnimating) {
    return null
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out ${
        isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2'
      } ${className}`}
    >
      <Button
        onClick={handleClick}
        className={`
          relative h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl
          transition-all duration-200 ease-out
          hover:scale-105 active:scale-95
          focus:ring-2 focus:ring-primary/50 focus:ring-offset-2
          ${isAnimating ? 'animate-pulse' : ''}
        `}
        size="sm"
        aria-label="Jump to today"
        title={`Jump to today (${format(new Date(), 'MMM d')})`}
      >
        {/* Icon with subtle animation */}
        <div className="relative">
          <CalendarIcon className="h-6 w-6" />
          {/* Today indicator dot */}
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-white shadow-sm">
            <div className="w-full h-full bg-accent rounded-full animate-pulse"></div>
          </div>
        </div>
        
        {/* Ripple effect on click */}
        {isAnimating && (
          <div className="absolute inset-0 rounded-full bg-white/20 animate-ping"></div>
        )}
      </Button>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          Today: {format(new Date(), 'MMM d')}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  )
}

/**
 * Enhanced version with keyboard shortcut support
 */
export function JumpToTodayButtonWithShortcut({ 
  currentDate, 
  onJumpToToday, 
  className = '' 
}: JumpToTodayButtonProps) {
  // Add keyboard shortcut (T key) for jump to today
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // T key to jump to today (not when user is typing in an input)
      if (e.key.toLowerCase() === 't' && 
          !e.ctrlKey && !e.metaKey && !e.altKey &&
          !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as any)?.tagName)) {
        e.preventDefault()
        onJumpToToday()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [onJumpToToday])

  return (
    <JumpToTodayButton 
      currentDate={currentDate}
      onJumpToToday={onJumpToToday}
      className={className}
    />
  )
}

/**
 * Lightweight version for mobile with minimal footprint
 */
export function MobileJumpToTodayButton({ 
  currentDate, 
  onJumpToToday, 
  className = '' 
}: JumpToTodayButtonProps) {
  const [isVisible, setIsVisible] = useState(false)
  
  useEffect(() => {
    setIsVisible(!isSameDay(currentDate, new Date()))
  }, [currentDate])

  if (!isVisible) {
    return null
  }

  return (
    <div className={`fixed bottom-20 right-4 z-40 sm:hidden ${className}`}>
      <Button
        onClick={onJumpToToday}
        className="h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200"
        size="sm"
        aria-label="Jump to today"
      >
        <ArrowUturnLeftIcon className="h-5 w-5" />
      </Button>
    </div>
  )
}