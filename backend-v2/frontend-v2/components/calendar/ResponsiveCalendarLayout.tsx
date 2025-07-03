'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useResponsiveCalendar, type CalendarViewMode } from '@/hooks/useResponsiveCalendar'
import CalendarDayViewMobile from './CalendarDayViewMobile'
import CalendarMobileNav from './CalendarMobileNav'
import MobileDatePicker from './MobileDatePicker'
import PullToRefresh from './PullToRefresh'
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks, isSameDay } from 'date-fns'

interface Appointment {
  id: number
  start_time: string
  end_time?: string
  service_name: string
  client_name?: string
  client_email?: string
  client_phone?: string
  barber_id?: number
  barber_name?: string
  status: string
  duration_minutes?: number
  price?: number
}

interface ResponsiveCalendarLayoutProps {
  appointments?: Appointment[]
  selectedDate: Date
  onDateChange: (date: Date) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: Date, hour: number, minute: number) => void
  onCreateAppointment?: () => void
  onRefresh?: () => Promise<void>
  selectedBarberId?: number | 'all'
  isLoading?: boolean
  className?: string
}

export default function ResponsiveCalendarLayout({
  appointments = [],
  selectedDate,
  onDateChange,
  onAppointmentClick,
  onTimeSlotClick,
  onCreateAppointment,
  onRefresh,
  selectedBarberId = 'all',
  isLoading = false,
  className = ''
}: ResponsiveCalendarLayoutProps) {
  const [currentView, setCurrentView] = useState<CalendarViewMode>('day')
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  const responsive = useResponsiveCalendar()

  // Update view based on device capabilities
  useEffect(() => {
    setCurrentView(responsive.optimalView)
  }, [responsive.optimalView])

  // Handle view change
  const handleViewChange = useCallback((view: CalendarViewMode) => {
    setCurrentView(view)
  }, [])

  // Handle date picker toggle
  const handleDatePickerToggle = useCallback(() => {
    setShowDatePicker(prev => !prev)
  }, [])

  // Render mobile phone layout (320px-768px)
  const renderMobileLayout = () => (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Mobile header with date picker toggle */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <button
          onClick={handleDatePickerToggle}
          className="w-full text-left"
        >
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {format(selectedDate, 'EEEE')}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {format(selectedDate, 'MMMM d, yyyy')}
          </p>
        </button>
      </div>

      {/* Date picker */}
      {showDatePicker && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <MobileDatePicker
            selectedDate={selectedDate}
            onDateChange={(date) => {
              onDateChange(date)
              setShowDatePicker(false)
            }}
          />
        </div>
      )}

      {/* Main calendar content with pull-to-refresh */}
      <div className="flex-1 overflow-hidden">
        {onRefresh ? (
          <PullToRefresh onRefresh={onRefresh} isRefreshing={isLoading}>
            <CalendarDayViewMobile
              selectedDate={selectedDate}
              appointments={appointments}
              onAppointmentClick={onAppointmentClick}
              onTimeSlotClick={onTimeSlotClick}
              onCreateAppointment={onCreateAppointment}
              onDateChange={onDateChange}
              selectedBarberId={selectedBarberId}
              className="h-full"
            />
          </PullToRefresh>
        ) : (
          <CalendarDayViewMobile
            selectedDate={selectedDate}
            appointments={appointments}
            onAppointmentClick={onAppointmentClick}
            onTimeSlotClick={onTimeSlotClick}
            onCreateAppointment={onCreateAppointment}
            onDateChange={onDateChange}
            selectedBarberId={selectedBarberId}
            className="h-full"
          />
        )}
      </div>

      {/* Mobile navigation */}
      <CalendarMobileNav
        currentView={currentView}
        onViewChange={handleViewChange}
      />
    </div>
  )

  // Render tablet layout (768px-1024px)
  const renderTabletLayout = () => (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Tablet header with navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {format(selectedDate, 'yyyy')}
            </p>
          </div>
          
          {/* View toggle buttons */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            {['day', 'week', 'month'].map((view) => (
              <button
                key={view}
                onClick={() => handleViewChange(view as CalendarViewMode)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                  currentView === view
                    ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date picker row */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <MobileDatePicker
          selectedDate={selectedDate}
          onDateChange={onDateChange}
          showWeekView={true}
        />
      </div>

      {/* Main calendar content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'day' && (
          <div className="flex h-full">
            {/* Time slots */}
            <div className="flex-1">
              {onRefresh ? (
                <PullToRefresh onRefresh={onRefresh} isRefreshing={isLoading}>
                  <CalendarDayViewMobile
                    selectedDate={selectedDate}
                    appointments={appointments}
                    onAppointmentClick={onAppointmentClick}
                    onTimeSlotClick={onTimeSlotClick}
                    onCreateAppointment={onCreateAppointment}
                    onDateChange={onDateChange}
                    selectedBarberId={selectedBarberId}
                    className="h-full"
                  />
                </PullToRefresh>
              ) : (
                <CalendarDayViewMobile
                  selectedDate={selectedDate}
                  appointments={appointments}
                  onAppointmentClick={onAppointmentClick}
                  onTimeSlotClick={onTimeSlotClick}
                  onCreateAppointment={onCreateAppointment}
                  onDateChange={onDateChange}
                  selectedBarberId={selectedBarberId}
                  className="h-full"
                />
              )}
            </div>
          </div>
        )}

        {currentView === 'week' && (
          <div className="p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Week View (Coming Soon)
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Week view is optimized for tablet landscape mode.
              </p>
            </div>
          </div>
        )}

        {currentView === 'month' && (
          <div className="p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Month View (Coming Soon)
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Month view provides a full calendar overview.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // Render desktop layout (1024px+)
  const renderDesktopLayout = () => (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Calendar
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>

        {/* Date picker */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <MobileDatePicker
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            showWeekView={true}
          />
        </div>

        {/* Quick actions */}
        <div className="p-4 space-y-2">
          <button
            onClick={onCreateAppointment}
            className="w-full px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            New Appointment
          </button>
          
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          )}
        </div>

        {/* View selector */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <div className="space-y-2">
            {['day', 'week', 'month', 'agenda'].map((view) => (
              <button
                key={view}
                onClick={() => handleViewChange(view as CalendarViewMode)}
                className={`w-full text-left px-3 py-2 rounded-lg transition-colors capitalize ${
                  currentView === view
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {view} View
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
              {currentView} View
            </h2>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onDateChange(subDays(selectedDate, 1))}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                ←
              </button>
              
              <button
                onClick={() => onDateChange(new Date())}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Today
              </button>
              
              <button
                onClick={() => onDateChange(addDays(selectedDate, 1))}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                →
              </button>
            </div>
          </div>
        </div>

        {/* Calendar content */}
        <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800">
          <CalendarDayViewMobile
            selectedDate={selectedDate}
            appointments={appointments}
            onAppointmentClick={onAppointmentClick}
            onTimeSlotClick={onTimeSlotClick}
            onCreateAppointment={onCreateAppointment}
            onDateChange={onDateChange}
            selectedBarberId={selectedBarberId}
            className="h-full"
          />
        </div>
      </div>
    </div>
  )

  return (
    <div className={`h-full ${className}`}>
      {responsive.isMobile && renderMobileLayout()}
      {responsive.isTablet && renderTabletLayout()}
      {responsive.isDesktop && renderDesktopLayout()}
    </div>
  )
}