'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { touchTargets, mobileSpacing } from '@/hooks/useResponsiveCalendar'

interface MobileModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'full'
  position?: 'center' | 'bottom' | 'fullscreen'
  enableSwipeToClose?: boolean
  enableHaptics?: boolean
  showCloseButton?: boolean
  className?: string
}

export default function MobileModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  position = 'bottom',
  enableSwipeToClose = true,
  enableHaptics = true,
  showCloseButton = true,
  className = ''
}: MobileModalProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [swipeDistance, setSwipeDistance] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  
  const modalRef = useRef<HTMLDivElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number>(0)
  const currentY = useRef<number>(0)
  const velocityRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

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

  // Get size classes
  const getSizeClasses = useCallback(() => {
    switch (size) {
      case 'sm':
        return 'max-w-sm max-h-96'
      case 'md':
        return 'max-w-md max-h-[70vh]'
      case 'lg':
        return 'max-w-lg max-h-[80vh]'
      case 'full':
        return 'max-w-full max-h-full'
      default:
        return 'max-w-md max-h-[70vh]'
    }
  }, [size])

  // Get position classes
  const getPositionClasses = useCallback(() => {
    switch (position) {
      case 'center':
        return 'items-center justify-center'
      case 'bottom':
        return 'items-end justify-center'
      case 'fullscreen':
        return 'items-stretch justify-stretch'
      default:
        return 'items-end justify-center'
    }
  }, [position])

  // Handle modal open/close animations
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setIsAnimating(true)
      triggerHapticFeedback('light')
      
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      
      setTimeout(() => setIsAnimating(false), 300)
    } else {
      setIsAnimating(true)
      
      setTimeout(() => {
        setIsVisible(false)
        setIsAnimating(false)
        document.body.style.overflow = ''
      }, 300)
    }
    
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, triggerHapticFeedback])

  // Handle touch start for swipe to close
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enableSwipeToClose || position === 'center') return
    
    startY.current = e.touches[0].clientY
    currentY.current = e.touches[0].clientY
    lastTimeRef.current = Date.now()
    setIsDragging(true)
  }, [enableSwipeToClose, position])

  // Handle touch move for swipe to close
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !enableSwipeToClose) return

    currentY.current = e.touches[0].clientY
    const deltaY = currentY.current - startY.current
    const now = Date.now()
    const timeDelta = now - lastTimeRef.current
    
    if (timeDelta > 0) {
      velocityRef.current = deltaY / timeDelta
    }
    lastTimeRef.current = now

    // Only allow downward swipe for bottom positioned modals
    if (position === 'bottom' && deltaY > 0) {
      setSwipeDistance(deltaY)
      e.preventDefault()
    }
    // Only allow upward swipe for fullscreen modals  
    else if (position === 'fullscreen' && deltaY < 0) {
      setSwipeDistance(Math.abs(deltaY))
      e.preventDefault()
    }
  }, [isDragging, enableSwipeToClose, position])

  // Handle touch end for swipe to close
  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return

    setIsDragging(false)
    
    const threshold = 150
    const velocityThreshold = 0.5
    
    // Close if swipe distance or velocity threshold is met
    if (swipeDistance > threshold || Math.abs(velocityRef.current) > velocityThreshold) {
      triggerHapticFeedback('medium')
      onClose()
    }
    
    // Reset swipe distance
    setSwipeDistance(0)
  }, [isDragging, swipeDistance, onClose, triggerHapticFeedback])

  // Set up touch event listeners
  useEffect(() => {
    const modal = modalRef.current
    if (!modal || !enableSwipeToClose) return

    modal.addEventListener('touchstart', handleTouchStart, { passive: false })
    modal.addEventListener('touchmove', handleTouchMove, { passive: false })
    modal.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      modal.removeEventListener('touchstart', handleTouchStart)
      modal.removeEventListener('touchmove', handleTouchMove)
      modal.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, enableSwipeToClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isVisible) return null

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-50 flex ${getPositionClasses()} transition-all duration-300 ${
        isOpen && !isAnimating 
          ? 'bg-black bg-opacity-50 backdrop-blur-sm' 
          : 'bg-black bg-opacity-0'
      }`}
      onClick={(e) => {
        if (e.target === backdropRef.current) {
          triggerHapticFeedback('light')
          onClose()
        }
      }}
    >
      <div
        ref={modalRef}
        className={`relative bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 ease-out ${
          position === 'fullscreen' 
            ? 'w-full h-full' 
            : `w-full mx-4 ${getSizeClasses()} ${
                position === 'bottom' ? 'rounded-t-2xl' : 'rounded-2xl'
              }`
        } ${className} ${
          isOpen && !isAnimating
            ? position === 'bottom' 
              ? 'translate-y-0' 
              : position === 'fullscreen'
              ? 'translate-y-0'
              : 'scale-100 opacity-100'
            : position === 'bottom'
            ? 'translate-y-full'
            : position === 'fullscreen' 
            ? 'translate-y-full'
            : 'scale-95 opacity-0'
        }`}
        style={{
          transform: isDragging 
            ? `translateY(${position === 'bottom' ? swipeDistance : -swipeDistance}px)` 
            : undefined
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Handle bar for swipe indication */}
        {enableSwipeToClose && position === 'bottom' && (
          <div className="flex justify-center py-2">
            <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
          </div>
        )}

        {/* Header */}
        {(title || showCloseButton) && (
          <div className={`flex items-center justify-between ${
            position === 'fullscreen' ? 'p-6' : 'p-4'
          } ${!enableSwipeToClose || position !== 'bottom' ? 'border-b border-gray-200 dark:border-gray-700' : ''}`}>
            {title && (
              <h2 
                id="modal-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                {title}
              </h2>
            )}
            
            {showCloseButton && (
              <button
                onClick={() => {
                  triggerHapticFeedback('light')
                  onClose()
                }}
                className="p-2 -m-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                style={{ minHeight: touchTargets.minimum, minWidth: touchTargets.minimum }}
                aria-label="Close modal"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`overflow-auto ${
          position === 'fullscreen' 
            ? 'flex-1 p-6' 
            : 'max-h-full'
        }`} style={{ padding: position !== 'fullscreen' ? mobileSpacing.lg : undefined }}>
          {children}
        </div>
      </div>
    </div>
  )
}