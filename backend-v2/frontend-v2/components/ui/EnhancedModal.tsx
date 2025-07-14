'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Modal, ModalProps } from './Modal'

// Mobile-specific enhancements
interface MobileFeatures {
  enableSwipeToClose?: boolean
  enableHaptics?: boolean
  swipeThreshold?: number
  velocityThreshold?: number
}

// Enhanced modal props extending base Modal
export interface EnhancedModalProps extends ModalProps, MobileFeatures {
  mobileOptimized?: boolean
}

const EnhancedModal = React.forwardRef<HTMLDivElement, EnhancedModalProps>(
  ({
    isOpen,
    onClose,
    children,
    enableSwipeToClose = true,
    enableHaptics = true,
    swipeThreshold = 150,
    velocityThreshold = 0.5,
    mobileOptimized = false,
    position = 'bottom',
    ...modalProps
  }, ref) => {
    // Mobile gesture state
    const [swipeDistance, setSwipeDistance] = useState(0)
    const [isDragging, setIsDragging] = useState(false)
    
    const modalRef = useRef<HTMLDivElement>(null)
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

    // Handle touch start for swipe to close
    const handleTouchStart = useCallback((e: TouchEvent) => {
      if (!enableSwipeToClose || !mobileOptimized || position === 'center') return
      
      startY.current = e.touches[0].clientY
      currentY.current = e.touches[0].clientY
      lastTimeRef.current = Date.now()
      setIsDragging(true)
    }, [enableSwipeToClose, mobileOptimized, position])

    // Handle touch move for swipe to close
    const handleTouchMove = useCallback((e: TouchEvent) => {
      if (!isDragging || !enableSwipeToClose || !mobileOptimized) return

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
      // Only allow upward swipe for top positioned modals  
      else if (position === 'top' && deltaY < 0) {
        setSwipeDistance(Math.abs(deltaY))
        e.preventDefault()
      }
    }, [isDragging, enableSwipeToClose, mobileOptimized, position])

    // Handle touch end for swipe to close
    const handleTouchEnd = useCallback(() => {
      if (!isDragging) return

      setIsDragging(false)
      
      // Close if swipe distance or velocity threshold is met
      if (swipeDistance > swipeThreshold || Math.abs(velocityRef.current) > velocityThreshold) {
        triggerHapticFeedback('medium')
        onClose()
      }
      
      // Reset swipe distance
      setSwipeDistance(0)
    }, [isDragging, swipeDistance, swipeThreshold, velocityThreshold, onClose, triggerHapticFeedback])

    // Set up touch event listeners for mobile
    useEffect(() => {
      const modal = modalRef.current
      if (!modal || !enableSwipeToClose || !mobileOptimized) return

      modal.addEventListener('touchstart', handleTouchStart, { passive: false })
      modal.addEventListener('touchmove', handleTouchMove, { passive: false })
      modal.addEventListener('touchend', handleTouchEnd, { passive: true })

      return () => {
        modal.removeEventListener('touchstart', handleTouchStart)
        modal.removeEventListener('touchmove', handleTouchMove)
        modal.removeEventListener('touchend', handleTouchEnd)
      }
    }, [handleTouchStart, handleTouchMove, handleTouchEnd, enableSwipeToClose, mobileOptimized])

    // Enhanced onClose with haptic feedback
    const handleClose = useCallback(() => {
      if (mobileOptimized && enableHaptics) {
        triggerHapticFeedback('light')
      }
      onClose()
    }, [onClose, mobileOptimized, enableHaptics, triggerHapticFeedback])

    // If mobile optimized, render with mobile enhancements
    if (mobileOptimized) {
      return (
        <Modal
          ref={ref}
          isOpen={isOpen}
          onClose={handleClose}
          position={position}
          {...modalProps}
          className={`${modalProps.className || ''} ${isDragging ? 'select-none' : ''}`}
          style={{
            transform: isDragging 
              ? `translateY(${position === 'bottom' ? swipeDistance : -swipeDistance}px)` 
              : undefined,
            ...modalProps.style
          }}
        >
          <div ref={modalRef} className="h-full">
            {/* Handle bar for swipe indication */}
            {enableSwipeToClose && position === 'bottom' && (
              <div className="flex justify-center py-2">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
            )}
            {children}
          </div>
        </Modal>
      )
    }

    // Standard modal for desktop
    return (
      <Modal
        ref={ref}
        isOpen={isOpen}
        onClose={onClose}
        position={position}
        {...modalProps}
      >
        {children}
      </Modal>
    )
  }
)

EnhancedModal.displayName = 'EnhancedModal'

export { EnhancedModal }

// Hook for detecting mobile devices
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkIsMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
      setIsMobile(mobileRegex.test(userAgent) || window.innerWidth < 768)
    }

    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  return isMobile
}

// Responsive modal component that automatically chooses mobile optimization
export const ResponsiveModal = React.forwardRef<HTMLDivElement, EnhancedModalProps>(
  (props, ref) => {
    const isMobile = useIsMobile()
    
    return (
      <EnhancedModal
        ref={ref}
        {...props}
        mobileOptimized={isMobile}
        position={isMobile ? 'bottom' : (props.position || 'center')}
      />
    )
  }
)

ResponsiveModal.displayName = 'ResponsiveModal'