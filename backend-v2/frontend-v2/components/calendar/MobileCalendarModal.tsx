'use client'

/**
 * Mobile-optimized modal for calendar interactions
 * Features sheet-style presentation, swipe-to-dismiss, and touch-friendly controls
 */

import React, { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence, useAnimation, PanInfo } from '@/lib/framer-motion'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { useTouchEnhancements, TOUCH_TARGET_SIZES } from '@/lib/mobile-touch-enhancements'
import { useResponsive } from '@/hooks/useResponsive'

interface MobileCalendarModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  fullHeight?: boolean
  showHandle?: boolean
  enableSwipeDown?: boolean
  className?: string
}

export function MobileCalendarModal({
  isOpen,
  onClose,
  title,
  children,
  fullHeight = false,
  showHandle = true,
  enableSwipeDown = true,
  className = ''
}: MobileCalendarModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const controls = useAnimation()
  const { isMobile } = useResponsive()
  const [isDragging, setIsDragging] = useState(false)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isOpen])

  // Handle swipe to dismiss
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false)
    
    if (enableSwipeDown && info.offset.y > 100 && info.velocity.y > 0) {
      onClose()
    } else {
      controls.start({ y: 0 })
    }
  }

  // Handle backdrop tap
  const handleBackdropTap = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const modalVariants = {
    hidden: {
      y: '100%',
      transition: {
        type: 'spring',
        damping: 30,
        stiffness: 300
      }
    },
    visible: {
      y: 0,
      transition: {
        type: 'spring',
        damping: 30,
        stiffness: 300
      }
    }
  }

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={backdropVariants}
            onClick={handleBackdropTap}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            drag={enableSwipeDown && isMobile ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            className={`
              fixed inset-x-0 bottom-0 z-50
              bg-white dark:bg-gray-900 
              rounded-t-3xl shadow-2xl
              ${fullHeight ? 'h-[90vh]' : 'max-h-[90vh]'}
              ${className}
            `}
            style={{
              paddingBottom: 'env(safe-area-inset-bottom, 0px)'
            }}
          >
            {/* Drag handle */}
            {showHandle && (
              <div className="flex justify-center pt-2 pb-1">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h2>
                <button
                  onClick={onClose}
                  className={`
                    p-2 rounded-lg
                    hover:bg-gray-100 dark:hover:bg-gray-800
                    transition-colors
                    min-w-[${TOUCH_TARGET_SIZES.MINIMUM}px]
                    min-h-[${TOUCH_TARGET_SIZES.MINIMUM}px]
                    flex items-center justify-center
                  `}
                  aria-label="Close modal"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Content */}
            <div 
              ref={contentRef}
              className={`
                overflow-y-auto overscroll-contain
                ${fullHeight ? 'flex-1' : ''}
                ${title ? '' : 'pt-2'}
              `}
              style={{
                WebkitOverflowScrolling: 'touch',
                maxHeight: fullHeight ? undefined : '80vh'
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

/**
 * Mobile action sheet component for quick actions
 */
interface MobileActionSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  actions: Array<{
    label: string
    icon?: React.ReactNode
    onClick: () => void
    variant?: 'default' | 'primary' | 'danger'
    disabled?: boolean
  }>
  cancelLabel?: string
  className?: string
}

export function MobileActionSheet({
  isOpen,
  onClose,
  title,
  actions,
  cancelLabel = 'Cancel',
  className = ''
}: MobileActionSheetProps) {
  const getActionStyles = (variant: string = 'default', disabled: boolean = false) => {
    if (disabled) {
      return 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
    }

    switch (variant) {
      case 'primary':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30'
      case 'danger':
        return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30'
      default:
        return 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
    }
  }

  return (
    <MobileCalendarModal
      isOpen={isOpen}
      onClose={onClose}
      showHandle={false}
      className={className}
    >
      <div className="p-4">
        {title && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">
            {title}
          </p>
        )}

        <div className="space-y-2">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={() => {
                if (!action.disabled) {
                  action.onClick()
                  onClose()
                }
              }}
              disabled={action.disabled}
              className={`
                w-full flex items-center justify-center gap-3
                px-4 py-4 rounded-xl
                font-medium transition-colors
                min-h-[${TOUCH_TARGET_SIZES.PREFERRED}px]
                ${getActionStyles(action.variant, action.disabled)}
              `}
            >
              {action.icon && <span className="text-xl">{action.icon}</span>}
              <span>{action.label}</span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className={`
            w-full mt-4 px-4 py-4 rounded-xl
            bg-gray-100 dark:bg-gray-800
            text-gray-700 dark:text-gray-300
            font-medium
            min-h-[${TOUCH_TARGET_SIZES.PREFERRED}px]
          `}
        >
          {cancelLabel}
        </button>
      </div>
    </MobileCalendarModal>
  )
}

/**
 * Mobile confirmation dialog with enhanced touch targets
 */
interface MobileConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  className?: string
}

export function MobileConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  className = ''
}: MobileConfirmDialogProps) {
  const confirmStyles = variant === 'danger' 
    ? 'bg-red-500 text-white hover:bg-red-600' 
    : 'bg-blue-500 text-white hover:bg-blue-600'

  return (
    <MobileCalendarModal
      isOpen={isOpen}
      onClose={onClose}
      showHandle={false}
      enableSwipeDown={false}
      className={className}
    >
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`
              flex-1 px-4 py-3 rounded-xl
              bg-gray-100 dark:bg-gray-800
              text-gray-700 dark:text-gray-300
              font-medium
              min-h-[${TOUCH_TARGET_SIZES.PREFERRED}px]
            `}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className={`
              flex-1 px-4 py-3 rounded-xl
              font-medium
              min-h-[${TOUCH_TARGET_SIZES.PREFERRED}px]
              ${confirmStyles}
            `}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </MobileCalendarModal>
  )
}