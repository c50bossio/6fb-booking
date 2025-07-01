'use client'

/**
 * Mobile-optimized menu for calendar actions and settings
 * Provides easy access to barber tools and settings on mobile devices
 */

import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  EllipsisVerticalIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ClockIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/Button'

interface CalendarMobileMenuProps {
  user: any
  onSyncToggle: () => void
  onConflictToggle: () => void
  className?: string
}

export function CalendarMobileMenu({ 
  user, 
  onSyncToggle, 
  onConflictToggle,
  className = '' 
}: CalendarMobileMenuProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  
  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])
  
  const menuItems = [
    ...(user?.role === 'barber' ? [
      {
        icon: ArrowsRightLeftIcon,
        label: 'Calendar Sync',
        action: () => {
          onSyncToggle()
          setIsOpen(false)
        },
        description: 'Sync with Google Calendar'
      },
      {
        icon: ExclamationTriangleIcon,
        label: 'Resolve Conflicts',
        action: () => {
          onConflictToggle()
          setIsOpen(false)
        },
        description: 'Check scheduling conflicts'
      },
      {
        icon: CalendarDaysIcon,
        label: 'Availability',
        action: () => {
          router.push('/barber-availability')
          setIsOpen(false)
        },
        description: 'Manage your availability'
      }
    ] : []),
    {
      icon: ClockIcon,
      label: 'Recurring',
      action: () => {
        router.push('/recurring')
        setIsOpen(false)
      },
      description: 'Recurring appointments'
    },
    {
      icon: Cog6ToothIcon,
      label: 'Settings',
      action: () => {
        router.push('/settings/calendar')
        setIsOpen(false)
      },
      description: 'Calendar preferences'
    }
  ]
  
  return (
    <div className={`relative ${className}`} ref={menuRef}>
      {/* Menu trigger button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="calendar-action-button flex items-center justify-center min-h-[44px] min-w-[44px] p-2 sm:hidden"
        aria-label="Calendar menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {isOpen ? (
          <XMarkIcon className="w-5 h-5" />
        ) : (
          <EllipsisVerticalIcon className="w-5 h-5" />
        )}
      </Button>
      
      {/* Mobile menu overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black bg-opacity-25 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Menu panel */}
          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
            {/* Menu header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Calendar Actions</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Quick access to calendar tools</p>
            </div>
            
            {/* Menu items */}
            <div className="py-2">
              {menuItems.map((item, index) => {
                const Icon = item.icon
                return (
                  <button
                    key={index}
                    onClick={item.action}
                    className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            
            {/* Menu footer */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                💡 Tip: Swipe left/right on appointments to see more options
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Hook for swipe gestures on calendar views
export function useCalendarSwipeGestures(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold: number = 50
) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
    setTouchEnd(null)
  }
  
  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.targetTouches[0]
    setTouchEnd({ x: touch.clientX, y: touch.clientY })
  }
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const deltaX = touchStart.x - touchEnd.x
    const deltaY = touchStart.y - touchEnd.y
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY)
    
    if (isHorizontalSwipe && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swiped left
        onSwipeLeft?.()
      } else {
        // Swiped right
        onSwipeRight?.()
      }
    }
    
    setTouchStart(null)
    setTouchEnd(null)
  }
  
  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  }
}

// Mobile-specific loading indicator
export function CalendarMobileLoading() {
  return (
    <div className="calendar-skeleton-mobile">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton-item" />
      ))}
      
      {/* Swipe hint */}
      <div className="swipe-indicator">
        <span>← Swipe to navigate →</span>
      </div>
    </div>
  )
}

// Mobile empty state with helpful tips
export function CalendarMobileEmptyState({ viewMode }: { viewMode: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <CalendarDaysIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        No appointments {viewMode === 'day' ? 'today' : `this ${viewMode}`}
      </h3>
      <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm">
        Tap the + button to create a new appointment, or double-tap any time slot to get started.
      </p>
      
      {/* Mobile tips */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 max-w-sm">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
          📱 Mobile Tips
        </h4>
        <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
          <li>• Double-tap dates to create appointments</li>
          <li>• Long-press appointments to move them</li>
          <li>• Swipe left/right to navigate weeks/months</li>
        </ul>
      </div>
    </div>
  )
}