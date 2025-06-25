'use client'

/**
 * Mobile Bottom Sheet Component
 *
 * A native-feeling bottom sheet component optimized for mobile devices
 * with gesture support, elastic scrolling, and platform-specific behaviors.
 */

import React, { useCallback, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence, useAnimation, PanInfo, useMotionValue, useTransform } from 'framer-motion'
import { useTheme } from '@/contexts/ThemeContext'
import { XMarkIcon } from '@heroicons/react/24/outline'

export interface MobileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode

  // Appearance
  height?: 'auto' | 'full' | number
  maxHeight?: number
  minHeight?: number
  showHandle?: boolean
  showCloseButton?: boolean
  backgroundColor?: string
  borderRadius?: number

  // Behavior
  closeOnBackdrop?: boolean
  closeOnSwipeDown?: boolean
  enableDrag?: boolean
  dragElastic?: number
  dragThreshold?: number
  snapPoints?: number[]
  initialSnapPoint?: number

  // Platform
  platform?: 'ios' | 'android' | 'auto'
  safeAreaInsets?: boolean

  // Callbacks
  onSnapPointChange?: (index: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}

export function MobileBottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'auto',
  maxHeight = 90, // percentage of viewport
  minHeight = 100, // pixels
  showHandle = true,
  showCloseButton = true,
  backgroundColor,
  borderRadius = 20,
  closeOnBackdrop = true,
  closeOnSwipeDown = true,
  enableDrag = true,
  dragElastic = 0.2,
  dragThreshold = 50,
  snapPoints = [],
  initialSnapPoint = 0,
  platform = 'auto',
  safeAreaInsets = true,
  onSnapPointChange,
  onDragStart,
  onDragEnd
}: MobileBottomSheetProps) {

  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()

  const [currentSnapPoint, setCurrentSnapPoint] = useState(initialSnapPoint)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const sheetRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const dragY = useMotionValue(0)
  const controls = useAnimation()

  // Calculate sheet height
  const sheetHeight = useCallback(() => {
    if (height === 'full') {
      return viewportHeight
    } else if (height === 'auto') {
      const contentHeight = contentRef.current?.scrollHeight || 0
      const maxAllowed = (viewportHeight * maxHeight) / 100
      return Math.min(Math.max(contentHeight, minHeight), maxAllowed)
    } else {
      return height
    }
  }, [height, viewportHeight, maxHeight, minHeight])

  // Calculate snap points
  const calculatedSnapPoints = useCallback(() => {
    if (snapPoints.length > 0) {
      return snapPoints.map(point => viewportHeight - (viewportHeight * point) / 100)
    }

    const fullHeight = sheetHeight()
    if (height === 'auto') {
      return [viewportHeight - fullHeight, viewportHeight - minHeight]
    }

    return [viewportHeight - fullHeight]
  }, [snapPoints, viewportHeight, sheetHeight, height, minHeight])

  // Platform detection
  const detectedPlatform = platform === 'auto'
    ? (navigator.userAgent.toLowerCase().includes('android') ? 'android' : 'ios')
    : platform

  // Handle drag
  const handleDrag = useCallback((event: any, info: PanInfo) => {
    if (!enableDrag) return

    if (!isDragging && Math.abs(info.offset.y) > 5) {
      setIsDragging(true)
      onDragStart?.()
    }
  }, [enableDrag, isDragging, onDragStart])

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    if (!enableDrag) return

    setIsDragging(false)
    onDragEnd?.()

    const velocity = info.velocity.y
    const offset = info.offset.y

    // Close if swiped down past threshold
    if (closeOnSwipeDown && (offset > dragThreshold || velocity > 500)) {
      onClose()
      return
    }

    // Snap to nearest point
    const snapPointsArray = calculatedSnapPoints()
    if (snapPointsArray.length > 0) {
      const currentY = viewportHeight - sheetHeight() + offset
      let nearestPoint = snapPointsArray[0]
      let nearestIndex = 0

      snapPointsArray.forEach((point, index) => {
        if (Math.abs(currentY - point) < Math.abs(currentY - nearestPoint)) {
          nearestPoint = point
          nearestIndex = index
        }
      })

      controls.start({
        y: nearestPoint - (viewportHeight - sheetHeight()),
        transition: { type: 'spring', damping: 30, stiffness: 400 }
      })

      if (nearestIndex !== currentSnapPoint) {
        setCurrentSnapPoint(nearestIndex)
        onSnapPointChange?.(nearestIndex)
      }
    } else {
      // Snap back to original position
      controls.start({
        y: 0,
        transition: { type: 'spring', damping: 30, stiffness: 400 }
      })
    }
  }, [enableDrag, closeOnSwipeDown, dragThreshold, calculatedSnapPoints, viewportHeight, sheetHeight, controls, currentSnapPoint, onClose, onDragEnd, onSnapPointChange])

  // Update viewport height
  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(window.innerHeight)
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    window.addEventListener('orientationchange', updateHeight)

    return () => {
      window.removeEventListener('resize', updateHeight)
      window.removeEventListener('orientationchange', updateHeight)
    }
  }, [])

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      // iOS specific fix for background scrolling
      if (detectedPlatform === 'ios') {
        document.body.style.position = 'fixed'
        document.body.style.width = '100%'
      }

      return () => {
        document.body.style.overflow = originalStyle
        if (detectedPlatform === 'ios') {
          document.body.style.position = ''
          document.body.style.width = ''
        }
      }
    }
  }, [isOpen, detectedPlatform])

  const bgColor = backgroundColor || colors.cardBackground

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeOnBackdrop ? onClose : undefined}
            className="fixed inset-0 bg-black/50 z-50"
            style={{ touchAction: 'none' }}
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag={enableDrag ? 'y' : false}
            dragConstraints={{ top: 0 }}
            dragElastic={dragElastic}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{
              height: sheetHeight(),
              maxHeight: `${maxHeight}%`,
              backgroundColor: bgColor,
              borderTopLeftRadius: borderRadius,
              borderTopRightRadius: borderRadius,
              boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
              paddingBottom: safeAreaInsets ? 'env(safe-area-inset-bottom)' : 0,
              touchAction: isDragging ? 'none' : 'pan-y',
              cursor: enableDrag ? 'grab' : 'auto'
            }}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center py-2" style={{ touchAction: 'none' }}>
                <div
                  className="w-12 h-1 rounded-full"
                  style={{
                    backgroundColor: colors.border,
                    opacity: 0.4
                  }}
                />
              </div>
            )}

            {/* Header */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 pb-2 border-b" style={{ borderColor: colors.border }}>
                <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
                  {title}
                </h3>
                {showCloseButton && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full transition-colors"
                    style={{
                      backgroundColor: 'transparent',
                      color: colors.textSecondary
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = colors.background
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div
              ref={contentRef}
              className="overflow-y-auto"
              style={{
                maxHeight: title || showCloseButton
                  ? `calc(100% - ${showHandle ? '20px' : '0px'} - 48px)`
                  : `calc(100% - ${showHandle ? '20px' : '0px'})`,
                overscrollBehavior: 'contain',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Preset bottom sheet variants
export const MobileBottomSheetPresets = {
  appointment: {
    height: 'auto' as const,
    maxHeight: 80,
    showHandle: true,
    showCloseButton: true,
    closeOnSwipeDown: true,
    enableDrag: true,
    snapPoints: [25, 80]
  },

  filters: {
    height: 'auto' as const,
    maxHeight: 70,
    showHandle: true,
    showCloseButton: false,
    closeOnSwipeDown: true,
    enableDrag: true
  },

  form: {
    height: 'full' as const,
    showHandle: false,
    showCloseButton: true,
    closeOnSwipeDown: false,
    enableDrag: false,
    closeOnBackdrop: false
  },

  menu: {
    height: 'auto' as const,
    maxHeight: 50,
    showHandle: true,
    showCloseButton: false,
    closeOnSwipeDown: true,
    enableDrag: true,
    borderRadius: 24
  }
}

export default MobileBottomSheet
