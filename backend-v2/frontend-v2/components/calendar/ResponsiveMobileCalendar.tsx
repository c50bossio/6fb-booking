'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useResponsive } from '@/hooks/useResponsive'

// Import desktop components
import AIEnhancedCalendarLayout from './AIEnhancedCalendarLayout'
import FreshaCalendarLayout from './FreshaCalendarLayout'

// Import mobile components
import MobileCalendarLayout from './MobileCalendarLayout'
import MobileAIDrawer from './MobileAIDrawer'
import SwipeNavigation from './SwipeNavigation'

// Import existing components
import SmartTimeSuggestions from './SmartTimeSuggestions'
import AIInsightsSidebar from './AIInsightsSidebar'

interface Barber {
  id: number
  name?: string
  first_name?: string
  last_name?: string
  email: string
  avatar?: string
  specialties?: string[]
  role?: string
}

interface Appointment {
  id: number
  client_name: string
  client_id?: number
  service_name: string
  service_id?: number
  start_time: string
  duration_minutes: number
  price: number
  status: 'confirmed' | 'pending' | 'completed' | 'cancelled' | 'no_show'
  client_tier?: 'new' | 'regular' | 'vip' | 'platinum'
  barber_id: number
  notes?: string
  is_recurring?: boolean
  created_at?: string
}

interface BarberAvailability {
  barber_id: number
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
}

interface ResponsiveMobileCalendarProps {
  // Data
  barbers: Barber[]
  appointments: Appointment[]
  availability: BarberAvailability[]
  currentDate: Date
  
  // View configuration
  view?: 'day' | 'week' | 'month'
  startHour?: number
  endHour?: number
  slotDuration?: number
  
  // Display options
  showRevenue?: boolean
  showAppointmentCount?: boolean
  colorScheme?: 'service-based' | 'status-based' | 'tier-based'
  
  // AI Features
  enableAIInsights?: boolean
  enableSmartSuggestions?: boolean
  
  // Responsive behavior
  forceDesktop?: boolean
  forceMobile?: boolean
  
  // Event handlers
  onDateChange?: (date: Date) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onTimeSlotClick?: (date: Date, barberId: number, hour: number, minute: number) => void
  onBarberSelect?: (barberId: number) => void
  onNewAppointment?: () => void
  onAIInsightAction?: (insight: any, action: string) => void
  
  // Selection state
  selectedBarberId?: number | null
  selectedAppointmentId?: number | null
  
  className?: string
}

const ResponsiveMobileCalendar: React.FC<ResponsiveMobileCalendarProps> = ({
  barbers = [],
  appointments = [],
  availability = [],
  currentDate,
  view = 'day',
  startHour = 8,
  endHour = 19,
  slotDuration = 60,
  showRevenue = true,
  showAppointmentCount = true,
  colorScheme = 'service-based',
  enableAIInsights = true,
  enableSmartSuggestions = true,
  forceDesktop = false,
  forceMobile = false,
  onDateChange,
  onAppointmentClick,
  onTimeSlotClick,
  onBarberSelect,
  onNewAppointment,
  onAIInsightAction,
  selectedBarberId,
  selectedAppointmentId,
  className = ''
}) => {
  const { isMobile, isTablet, isDesktop, width } = useResponsive()
  const [showMobileAIDrawer, setShowMobileAIDrawer] = useState(false)
  const [selectedDate, setSelectedDate] = useState(currentDate)

  // Determine which layout to use based on screen size and user preferences
  const layoutType = useMemo(() => {
    if (forceDesktop) return 'desktop'
    if (forceMobile) return 'mobile'
    
    // Breakpoint logic
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }, [width, forceDesktop, forceMobile])

  // Handle date changes with internal state sync
  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date)
    onDateChange?.(date)
  }, [onDateChange])

  // Handle AI drawer toggle for mobile
  const handleAIInsightAction = useCallback((insight: any, action: string) => {
    onAIInsightAction?.(insight, action)
    
    // Close drawer after action on mobile
    if (layoutType === 'mobile') {
      setTimeout(() => setShowMobileAIDrawer(false), 1000)
    }
  }, [onAIInsightAction, layoutType])

  // Sync internal date state with prop changes
  useEffect(() => {
    setSelectedDate(currentDate)
  }, [currentDate])

  // Mobile Layout (320px - 768px)
  if (layoutType === 'mobile') {
    return (
      <div className={`h-full bg-gray-50 ${className}`}>
        {/* Mobile Calendar with integrated navigation */}
        <MobileCalendarLayout
          barbers={barbers}
          appointments={appointments}
          availability={availability}
          currentDate={selectedDate}
          startHour={startHour}
          endHour={endHour}
          slotDuration={slotDuration}
          showRevenue={showRevenue}
          showAppointmentCount={showAppointmentCount}
          colorScheme={colorScheme}
          enableAIInsights={enableAIInsights}
          enableSmartSuggestions={enableSmartSuggestions}
          onDateChange={handleDateChange}
          onAppointmentClick={onAppointmentClick}
          onTimeSlotClick={onTimeSlotClick}
          onBarberSelect={onBarberSelect}
          onNewAppointment={onNewAppointment}
          onAIInsightAction={handleAIInsightAction}
          selectedBarberId={selectedBarberId}
          selectedAppointmentId={selectedAppointmentId}
        />

        {/* Mobile AI Drawer */}
        <MobileAIDrawer
          appointments={appointments}
          availability={availability}
          selectedDate={selectedDate}
          isOpen={showMobileAIDrawer}
          onOpenChange={setShowMobileAIDrawer}
          onInsightAction={handleAIInsightAction}
        />
      </div>
    )
  }

  // Tablet Layout (768px - 1024px)
  if (layoutType === 'tablet') {
    return (
      <div className={`h-full flex flex-col bg-gray-50 ${className}`}>
        {/* Tablet Navigation Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <SwipeNavigation
            currentDate={selectedDate}
            onDateChange={handleDateChange}
            showWeekView={view === 'week'}
            appointments={appointments}
          />
        </div>

        {/* Main Calendar Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Calendar */}
          <div className="flex-1">
            <AIEnhancedCalendarLayout
              barbers={barbers}
              appointments={appointments}
              availability={availability}
              currentDate={selectedDate}
              view={view}
              startHour={startHour}
              endHour={endHour}
              slotDuration={slotDuration}
              showRevenue={showRevenue}
              showAppointmentCount={showAppointmentCount}
              colorScheme={colorScheme}
              enableAIInsights={enableAIInsights}
              enableSmartSuggestions={enableSmartSuggestions}
              showAISidebar={false} // Hide sidebar, use modal
              onDateChange={handleDateChange}
              onAppointmentClick={onAppointmentClick}
              onTimeSlotClick={onTimeSlotClick}
              onBarberSelect={onBarberSelect}
              onNewAppointment={onNewAppointment}
              onAIInsightAction={handleAIInsightAction}
              selectedBarberId={selectedBarberId}
              selectedAppointmentId={selectedAppointmentId}
            />
          </div>

          {/* AI Sidebar (Collapsible) */}
          {enableAIInsights && (
            <div className="w-80 border-l border-gray-200 bg-white">
              <AIInsightsSidebar
                appointments={appointments}
                availability={availability}
                selectedDate={selectedDate}
                onInsightAction={handleAIInsightAction}
              />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Desktop Layout (1024px+)
  return (
    <div className={`h-full bg-gray-50 ${className}`}>
      <AIEnhancedCalendarLayout
        barbers={barbers}
        appointments={appointments}
        availability={availability}
        currentDate={selectedDate}
        view={view}
        startHour={startHour}
        endHour={endHour}
        slotDuration={slotDuration}
        showRevenue={showRevenue}
        showAppointmentCount={showAppointmentCount}
        colorScheme={colorScheme}
        enableAIInsights={enableAIInsights}
        enableSmartSuggestions={enableSmartSuggestions}
        showAISidebar={enableAIInsights}
        onDateChange={handleDateChange}
        onAppointmentClick={onAppointmentClick}
        onTimeSlotClick={onTimeSlotClick}
        onBarberSelect={onBarberSelect}
        onNewAppointment={onNewAppointment}
        onAIInsightAction={handleAIInsightAction}
        selectedBarberId={selectedBarberId}
        selectedAppointmentId={selectedAppointmentId}
      />
    </div>
  )
}

// Export additional components for individual use
export { 
  MobileCalendarLayout,
  MobileAIDrawer,
  SwipeNavigation
}

export default ResponsiveMobileCalendar