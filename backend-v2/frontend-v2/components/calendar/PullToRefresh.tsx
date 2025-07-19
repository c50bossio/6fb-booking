'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  isRefreshing?: boolean
  threshold?: number
  resistance?: number
  enableHaptics?: boolean
  children: React.ReactNode
  className?: string
}

export default function PullToRefresh({
  onRefresh,
  isRefreshing = false,
  threshold = 80,
  resistance = 0.5,
  enableHaptics = true,
  children,
  className = ''
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isPulling, setIsPulling] = useState(false)
  const [canRefresh, setCanRefresh] = useState(false)
  const [isRefreshingInternal, setIsRefreshingInternal] = useState(false)
  
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const isActiveRef = useRef(false)

  // Haptic feedback utility
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptics || typeof window === 'undefined') return
    
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30, 10, 30]
      }
      navigator.vibrate(patterns[type])
    }
  }, [enableHaptics])

  // Check if scroll is at top
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false
    return containerRef.current.scrollTop === 0
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isAtTop()) return
    
    startY.current = e.touches[0].clientY
    currentY.current = e.touches[0].clientY
    isActiveRef.current = true
  }, [isAtTop])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isActiveRef.current || !isAtTop()) return

    currentY.current = e.touches[0].clientY
    const deltaY = currentY.current - startY.current

    if (deltaY > 0) {
      // Apply resistance to the pull
      const distance = Math.min(deltaY * resistance, threshold * 1.5)
      setPullDistance(distance)
      setIsPulling(true)

      // Check if we've reached the threshold
      const newCanRefresh = distance >= threshold
      if (newCanRefresh !== canRefresh) {
        setCanRefresh(newCanRefresh)
        if (newCanRefresh) {
          triggerHapticFeedback('medium')
        }
      }

      // Prevent default scrolling when pulling
      if (distance > 10) {
        e.preventDefault()
      }
    } else {
      setPullDistance(0)
      setIsPulling(false)
      setCanRefresh(false)
    }
  }, [resistance, threshold, canRefresh, triggerHapticFeedback, isAtTop])

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (!isActiveRef.current) return

    isActiveRef.current = false

    if (canRefresh && !isRefreshing && !isRefreshingInternal) {
      setIsRefreshingInternal(true)
      triggerHapticFeedback('heavy')
      
      try {
        await onRefresh()
      } catch (error) {
        } finally {
        setIsRefreshingInternal(false)
      }
    }

    // Reset state
    setPullDistance(0)
    setIsPulling(false)
    setCanRefresh(false)
  }, [canRefresh, isRefreshing, isRefreshingInternal, onRefresh, triggerHapticFeedback])

  // Set up touch event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  // Calculate progress percentage
  const progress = Math.min(pullDistance / threshold, 1)
  const isCurrentlyRefreshing = isRefreshing || isRefreshingInternal

  return (
    <div ref={containerRef} className={`relative overflow-auto ${className}`}>
      {/* Pull indicator */}
      <div
        className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-center transition-all duration-200 ${
          isPulling || isCurrentlyRefreshing ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          height: Math.max(pullDistance, isCurrentlyRefreshing ? 60 : 0),
          transform: `translateY(${isCurrentlyRefreshing ? 0 : -20}px)`
        }}
      >
        <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-full shadow-lg px-4 py-2">
          {/* Icon */}
          <div className={`transition-transform duration-200 ${
            isCurrentlyRefreshing ? 'animate-spin' : canRefresh ? 'rotate-180' : ''
          }`}>
            <ArrowPathIcon className={`w-6 h-6 transition-colors duration-200 ${
              canRefresh || isCurrentlyRefreshing 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-gray-400'
            }`} />
          </div>
          
          {/* Progress indicator */}
          {isPulling && !isCurrentlyRefreshing && (
            <div className="mt-1 w-8 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-600 dark:bg-primary-400 transition-all duration-100 ease-out"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
          
          {/* Text */}
          <span className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {isCurrentlyRefreshing 
              ? 'Refreshing...' 
              : canRefresh 
              ? 'Release to refresh' 
              : 'Pull to refresh'
            }
          </span>
        </div>
      </div>

      {/* Content with offset during refresh */}
      <div 
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${
            isPulling ? pullDistance : isCurrentlyRefreshing ? 60 : 0
          }px)`
        }}
      >
        {children}
      </div>
    </div>
  )
}