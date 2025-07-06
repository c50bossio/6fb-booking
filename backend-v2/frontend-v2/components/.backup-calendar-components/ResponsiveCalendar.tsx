'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useResponsiveCalendar, type CalendarViewMode } from '@/hooks/useResponsiveCalendar'
import CalendarMonthView from './CalendarMonthView'
import CalendarWeekView from './CalendarWeekView'
import CalendarDayView from './CalendarDayView'
import CalendarAgendaView from './CalendarAgendaView'
import CalendarMobileNav from './calendar/CalendarMobileNav'
import CalendarDaySwiper from './calendar/CalendarDaySwiper'
import { Button } from './ui/Button'
import { CalendarIcon, CalendarDaysIcon, Squares2X2Icon, ListBulletIcon } from '@heroicons/react/24/outline'

interface ResponsiveCalendarProps {
  appointments?: any[]
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  onAppointmentClick?: (appointment: any) => void
  onAppointmentUpdate?: (appointmentId: number, newStartTime: string) => void
  onCreateAppointment?: (date: Date) => void
  selectedBarberId?: number | 'all'
  className?: string
}

export default function ResponsiveCalendar({
  appointments = [],
  selectedDate,
  onDateSelect,
  onAppointmentClick,
  onAppointmentUpdate,
  onCreateAppointment,
  selectedBarberId = 'all',
  className = ''
}: ResponsiveCalendarProps) {
  const responsive = useResponsiveCalendar()
  const [viewMode, setViewMode] = useState<CalendarViewMode>(responsive.optimalView)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Update view mode when device changes
  useEffect(() => {
    if (responsive.isMobile && viewMode === 'month') {
      setViewMode('agenda')
    } else if (responsive.isDesktop && viewMode === 'agenda') {
      setViewMode('month')
    }
  }, [responsive.isMobile, responsive.isDesktop])

  // Desktop view buttons
  const desktopViewButtons = [
    { view: 'day' as CalendarViewMode, label: 'Day', icon: CalendarIcon },
    { view: 'week' as CalendarViewMode, label: 'Week', icon: CalendarDaysIcon },
    { view: 'month' as CalendarViewMode, label: 'Month', icon: Squares2X2Icon },
    { view: 'agenda' as CalendarViewMode, label: 'Agenda', icon: ListBulletIcon }
  ]

  // Render the appropriate calendar view
  const renderCalendarView = () => {
    const commonProps = {
      appointments,
      selectedDate: selectedDate || new Date(),
      onDateSelect,
      onAppointmentClick,
      selectedBarberId,
      className: 'w-full'
    }

    switch (viewMode) {
      case 'day':
        return (
          <CalendarDayView
            {...commonProps}
            onTimeSlotClick={(date) => {
              onCreateAppointment?.(date)
            }}
          />
        )
      case 'week':
        return (
          <CalendarWeekView
            {...commonProps}
            onAppointmentUpdate={onAppointmentUpdate}
          />
        )
      case 'month':
        return (
          <CalendarMonthView
            {...commonProps}
            onAppointmentUpdate={onAppointmentUpdate}
            onDayClick={onCreateAppointment}
          />
        )
      case 'agenda':
        return (
          <CalendarAgendaView
            {...commonProps}
            onCreateAppointment={onCreateAppointment}
            daysToShow={responsive.isMobile ? 7 : 14}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Desktop header with view switcher */}
      {responsive.isDesktop && (
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Calendar
          </h2>
          <div className="flex items-center gap-2">
            {desktopViewButtons.map(({ view, label, icon: Icon }) => (
              <Button
                key={view}
                variant={viewMode === view ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode(view)}
                className="hidden sm:flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile day swiper for day view */}
      {responsive.isMobile && viewMode === 'day' && selectedDate && (
        <CalendarDaySwiper
          selectedDate={selectedDate}
          onDateChange={onDateSelect}
          className="mb-4"
        />
      )}

      {/* Calendar view with mobile optimizations */}
      <div className={`
        ${responsive.isMobile ? 'pb-20' : ''}
        ${responsive.isMobile && viewMode === 'month' ? 'text-sm' : ''}
      `}>
        {renderCalendarView()}
      </div>

      {/* Mobile bottom navigation */}
      {responsive.isMobile && (
        <CalendarMobileNav
          currentView={viewMode}
          onViewChange={setViewMode}
        />
      )}

      {/* Mobile-specific enhancements */}
      {responsive.isMobile && (
        <>
          {/* Pull-to-refresh indicator */}
          <div className="absolute top-0 left-0 right-0 flex justify-center pt-2 pointer-events-none">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Pull to refresh
            </div>
          </div>

          {/* Swipe hints */}
          {viewMode === 'week' && (
            <div className="absolute bottom-24 left-0 right-0 flex justify-center pointer-events-none">
              <div className="bg-gray-900/80 text-white text-xs px-3 py-1 rounded-full">
                Swipe left/right to change weeks
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}