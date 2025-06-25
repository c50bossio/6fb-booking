'use client'

import React, { useState, useEffect } from 'react'
import CalendarSystem from './CalendarSystem'
import MobileCalendar from './MobileCalendar'
import type { CalendarAppointment } from './PremiumCalendar'

interface ResponsiveCalendarProps {
  initialView?: 'month' | 'week' | 'day'
  initialDate?: Date
  locationId?: number
  barberId?: number
  enableDragDrop?: boolean
  darkMode?: boolean
  onAppointmentCreate?: (appointment: CalendarAppointment) => void
  onAppointmentUpdate?: (appointment: CalendarAppointment) => void
  onAppointmentDelete?: (appointmentId: string) => void
  // Mobile-specific props
  forceMobile?: boolean
  breakpoint?: number
}

// Hook to detect screen size
const useScreenSize = (breakpoint: number = 768) => {
  const [isMobile, setIsMobile] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < breakpoint)
      setIsLoading(false)
    }

    // Check initial size
    checkScreenSize()

    // Add event listener for resize
    const handleResize = () => {
      checkScreenSize()
    }

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [breakpoint])

  return { isMobile, isLoading }
}

export default function ResponsiveCalendar({
  initialView = 'week',
  initialDate = new Date(),
  locationId,
  barberId,
  enableDragDrop = true,
  darkMode = true,
  onAppointmentCreate,
  onAppointmentUpdate,
  onAppointmentDelete,
  forceMobile = false,
  breakpoint = 768
}: ResponsiveCalendarProps) {
  const { isMobile, isLoading } = useScreenSize(breakpoint)
  const shouldUseMobile = forceMobile || isMobile

  // Show loading state while determining screen size
  if (isLoading) {
    return (
      <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-xl p-6 animate-pulse`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-700 rounded-lg"></div>
            <div className="w-32 h-6 bg-gray-700 rounded"></div>
          </div>
          <div className="w-24 h-8 bg-gray-700 rounded"></div>
        </div>

        <div className="space-y-4">
          <div className="h-48 bg-gray-800 rounded-lg"></div>
          <div className="h-48 bg-gray-800 rounded-lg"></div>
        </div>
      </div>
    )
  }

  // Render appropriate calendar version
  if (shouldUseMobile) {
    return (
      <MobileCalendar
        onAppointmentClick={(appointment) => {
          // Handle mobile appointment click - could open a mobile-optimized modal
          console.log('Mobile appointment clicked:', appointment)
        }}
        onTimeSlotClick={(date, time) => {
          // Handle mobile time slot click
          console.log('Mobile time slot clicked:', date, time)
        }}
        onCreateAppointment={(date, time) => {
          // Handle mobile appointment creation
          console.log('Mobile create appointment:', date, time)
        }}
        initialDate={initialDate}
        darkMode={darkMode}
      />
    )
  }

  return (
    <CalendarSystem
      initialView={initialView}
      initialDate={initialDate}
      locationId={locationId}
      barberId={barberId}
      enableDragDrop={enableDragDrop}
      darkMode={darkMode}
      onAppointmentCreate={onAppointmentCreate}
      onAppointmentUpdate={onAppointmentUpdate}
      onAppointmentDelete={onAppointmentDelete}
    />
  )
}

// Export additional responsive utilities
export const useResponsiveCalendar = (breakpoint: number = 768) => {
  const { isMobile, isLoading } = useScreenSize(breakpoint)

  const getOptimalView = () => {
    if (isMobile) {
      return 'day' // Mobile works best with day view
    }
    return 'week' // Desktop default to week view
  }

  const getOptimalProps = () => {
    if (isMobile) {
      return {
        enableDragDrop: false, // Disable drag & drop on mobile
        initialView: 'day' as const,
        timeSlotDuration: 60 // Larger time slots for mobile
      }
    }

    return {
      enableDragDrop: true,
      initialView: 'week' as const,
      timeSlotDuration: 30
    }
  }

  return {
    isMobile,
    isLoading,
    getOptimalView,
    getOptimalProps
  }
}

// Responsive breakpoint constants
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
  large: 1536
} as const

// Media query helpers for styled components
export const mediaQueries = {
  mobile: `(max-width: ${BREAKPOINTS.mobile - 1}px)`,
  tablet: `(min-width: ${BREAKPOINTS.mobile}px) and (max-width: ${BREAKPOINTS.tablet - 1}px)`,
  desktop: `(min-width: ${BREAKPOINTS.tablet}px)`,
  large: `(min-width: ${BREAKPOINTS.large}px)`
} as const

// CSS-in-JS responsive styles
export const responsiveStyles = {
  calendar: {
    mobile: {
      padding: '1rem',
      fontSize: '0.875rem'
    },
    tablet: {
      padding: '1.5rem',
      fontSize: '1rem'
    },
    desktop: {
      padding: '2rem',
      fontSize: '1rem'
    }
  },
  appointment: {
    mobile: {
      padding: '0.75rem',
      fontSize: '0.75rem',
      minHeight: '3rem'
    },
    tablet: {
      padding: '1rem',
      fontSize: '0.875rem',
      minHeight: '3.5rem'
    },
    desktop: {
      padding: '1rem',
      fontSize: '0.875rem',
      minHeight: '4rem'
    }
  },
  timeSlot: {
    mobile: {
      height: '4rem',
      fontSize: '0.75rem'
    },
    tablet: {
      height: '3.5rem',
      fontSize: '0.875rem'
    },
    desktop: {
      height: '3.75rem',
      fontSize: '0.875rem'
    }
  }
} as const
