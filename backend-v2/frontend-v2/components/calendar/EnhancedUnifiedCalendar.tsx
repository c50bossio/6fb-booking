'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isToday } from 'date-fns'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarIcon,
  AdjustmentsHorizontalIcon,
  PlusIcon,
  ViewColumnsIcon,
  CalendarDaysIcon,
  Squares2X2Icon,
  LightBulbIcon
} from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCalendar, useCalendarSelectors, CalendarView, CalendarProvider } from '@/contexts/CalendarContext'
import { cn } from '@/lib/utils'

// Import new enhanced components
import SmartConflictResolver from './SmartConflictResolver'
import RevenueTrackingOverlay from './RevenueTrackingOverlay'
import UndoRedoControls from './UndoRedoControls'
import AISlotSuggestions from './AISlotSuggestions'
import MobileGestureManager from './MobileGestureManager'
import OfflineCalendarManager from './OfflineCalendarManager'
import PWAInstallManager from './PWAInstallManager'
import { CalendarHeader } from './CalendarHeader'
import { CalendarLoadingManager, CalendarEmptyState } from './CalendarLoadingStates'
import { CalendarErrorBoundary } from './CalendarErrorBoundary'

// Import existing optimized components
import { CalendarMemoizedComponents } from './optimized/CalendarMemoizedComponents'
import { PullToRefresh } from './PullToRefresh'
import { CalendarNetworkStatus } from './CalendarNetworkStatus'

interface EnhancedUnifiedCalendarProps {
  // Data props
  initialDate?: Date
  className?: string
  
  // Feature toggles
  showRevenue?: boolean
  showConflicts?: boolean
  showUndoRedo?: boolean
  enableMobileOptimizations?: boolean
  enableAISlotSuggestions?: boolean
  enableOfflineSupport?: boolean
  enablePWAFeatures?: boolean
  
  // Event handlers
  onAppointmentClick?: (appointmentId: number) => void
  onTimeSlotClick?: (date: Date, hour: number, barberId?: number) => void
  onAppointmentCreate?: () => void
  onAppointmentUpdate?: (appointmentId: number) => void
  
  // Customization
  theme?: 'default' | 'premium' | 'mobile'
  layout?: 'standard' | 'compact' | 'sidebar'
}

// Internal calendar view components
const CalendarDayView = React.memo(({ appointments, barbers, currentDate }: any) => {
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = 8; hour < 19; hour++) {
      slots.push({
        hour,
        time: format(new Date().setHours(hour, 0), 'h:mm a'),
        appointments: appointments.filter((apt: any) => {
          const aptDate = new Date(apt.start_time)
          return aptDate.getHours() === hour && isSameDay(aptDate, currentDate)
        })
      })
    }
    return slots
  }, [appointments, currentDate])

  return (
    <div className="space-y-1">
      {timeSlots.map((slot) => (
        <div key={slot.hour} className="flex border-b border-gray-100 min-h-[60px]">
          <div className="w-20 p-2 text-sm text-gray-600 border-r">
            {slot.time}
          </div>
          <div className="flex-1 p-2">
            {slot.appointments.map((apt: any) => (
              <div
                key={apt.id}
                className="bg-blue-100 border border-blue-200 rounded p-2 mb-1 text-sm"
              >
                <div className="font-medium">{apt.client_name}</div>
                <div className="text-gray-600">{apt.service_name}</div>
                {apt.total_price && (
                  <div className="text-green-600 font-medium">
                    ${apt.total_price}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})

const CalendarWeekView = React.memo(({ appointments, barbers, currentDate }: any) => {
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate)
    const days = []
    for (let i = 0; i < 7; i++) {
      const day = addDays(start, i)
      days.push({
        date: day,
        isToday: isToday(day),
        appointments: appointments.filter((apt: any) => 
          isSameDay(new Date(apt.start_time), day)
        )
      })
    }
    return days
  }, [currentDate, appointments])

  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Header */}
      {weekDays.map((day) => (
        <div key={day.date.toISOString()} className="p-2 text-center border-b">
          <div className={cn(
            "text-sm font-medium",
            day.isToday && "text-blue-600"
          )}>
            {format(day.date, 'EEE')}
          </div>
          <div className={cn(
            "text-lg",
            day.isToday && "bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
          )}>
            {format(day.date, 'd')}
          </div>
        </div>
      ))}
      
      {/* Body */}
      {weekDays.map((day) => (
        <div key={`body-${day.date.toISOString()}`} className="p-1 min-h-[400px] border-r">
          {day.appointments.map((apt: any) => (
            <div
              key={apt.id}
              className="bg-blue-100 border border-blue-200 rounded p-1 mb-1 text-xs"
            >
              <div className="font-medium truncate">{apt.client_name}</div>
              <div className="text-gray-600 truncate">{apt.service_name}</div>
              <div className="text-xs">
                {format(new Date(apt.start_time), 'h:mm a')}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
})

const CalendarMonthView = React.memo(({ appointments, currentDate }: any) => {
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const startWeek = startOfWeek(start)
    const endWeek = endOfWeek(end)
    
    const days = []
    let current = startWeek
    
    while (current <= endWeek) {
      days.push({
        date: current,
        isCurrentMonth: current.getMonth() === currentDate.getMonth(),
        isToday: isToday(current),
        appointments: appointments.filter((apt: any) => 
          isSameDay(new Date(apt.start_time), current)
        )
      })
      current = addDays(current, 1)
    }
    
    return days
  }, [currentDate, appointments])

  return (
    <div className="grid grid-cols-7 gap-1">
      {/* Days of week header */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
        <div key={day} className="p-2 text-center text-sm font-medium text-gray-600 border-b">
          {day}
        </div>
      ))}
      
      {/* Calendar days */}
      {monthDays.map((day, index) => (
        <div
          key={index}
          className={cn(
            "p-1 min-h-[100px] border-r border-b",
            !day.isCurrentMonth && "bg-gray-50 text-gray-400",
            day.isToday && "bg-blue-50"
          )}
        >
          <div className={cn(
            "text-sm font-medium mb-1",
            day.isToday && "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
          )}>
            {format(day.date, 'd')}
          </div>
          
          {day.appointments.slice(0, 3).map((apt: any) => (
            <div
              key={apt.id}
              className="bg-blue-100 text-xs p-1 mb-1 rounded truncate"
            >
              {apt.client_name}
            </div>
          ))}
          
          {day.appointments.length > 3 && (
            <div className="text-xs text-gray-600">
              +{day.appointments.length - 3} more
            </div>
          )}
        </div>
      ))}
    </div>
  )
})

// Main Enhanced Unified Calendar Component
function EnhancedUnifiedCalendarCore({
  className,
  showRevenue = true,
  showConflicts = true,
  showUndoRedo = true,
  enableMobileOptimizations = true,
  enableAISlotSuggestions = true,
  enableOfflineSupport = true,
  enablePWAFeatures = true,
  onAppointmentClick,
  onTimeSlotClick,
  onAppointmentCreate,
  onAppointmentUpdate,
  theme = 'default',
  layout = 'standard'
}: EnhancedUnifiedCalendarProps) {
  const { state, actions } = useCalendar()
  const { 
    filteredAppointments, 
    viewAppointments, 
    criticalConflicts,
    selectedAppointment,
    canUndo,
    canRedo
  } = useCalendarSelectors()

  // Navigation handlers
  const navigateDate = (direction: 'prev' | 'next') => {
    const current = state.currentDate
    let newDate: Date

    switch (state.view) {
      case 'day':
        newDate = addDays(current, direction === 'next' ? 1 : -1)
        break
      case 'week':
        newDate = addDays(current, direction === 'next' ? 7 : -7)
        break
      case 'month':
        newDate = new Date(current.getFullYear(), current.getMonth() + (direction === 'next' ? 1 : -1), 1)
        break
      default:
        newDate = current
    }

    actions.setDate(newDate)
  }

  const handleViewChange = (view: CalendarView) => {
    actions.setView(view)
  }

  const getViewIcon = (view: CalendarView) => {
    switch (view) {
      case 'day': return CalendarIcon
      case 'week': return ViewColumnsIcon
      case 'month': return Squares2X2Icon
      default: return CalendarIcon
    }
  }

  const renderCalendarView = () => {
    const props = {
      appointments: viewAppointments,
      barbers: state.barbers,
      currentDate: state.currentDate
    }

    switch (state.view) {
      case 'day':
        return <CalendarDayView {...props} />
      case 'week':
        return <CalendarWeekView {...props} />
      case 'month':
        return <CalendarMonthView {...props} />
      default:
        return <CalendarWeekView {...props} />
    }
  }

  if (state.loading) {
    return (
      <div className={cn("h-full", className)}>
        <CalendarLoadingManager />
      </div>
    )
  }

  if (state.error) {
    return (
      <div className={cn("h-full flex items-center justify-center", className)}>
        <div className="text-center">
          <p className="text-red-600 mb-4">{state.error}</p>
          <Button onClick={() => actions.setError(null)}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  // Wrap the entire calendar in gesture and offline managers
  const calendarContent = (
    <div className={cn("h-full flex flex-col bg-white", className)}>
      {/* PWA Install Manager */}
      {enablePWAFeatures && (
        <div className="p-4 border-b">
          <PWAInstallManager autoPrompt={true} showFeatures={false} />
        </div>
      )}

      {/* Offline Manager */}
      {enableOfflineSupport && (
        <div className="px-4 pt-4">
          <OfflineCalendarManager 
            enableAutoSync={true}
            showNetworkStatus={true}
          />
        </div>
      )}

      {/* Header */}
      <div className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="p-4">
          {/* Main navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              {/* Date navigation */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('prev')}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                
                <div className="min-w-[180px] text-center">
                  <h2 className="text-lg font-semibold">
                    {format(state.currentDate, state.view === 'month' ? 'MMMM yyyy' : 'MMM d, yyyy')}
                  </h2>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateDate('next')}
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => actions.setDate(new Date())}
                >
                  Today
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* View selector */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                {(['day', 'week', 'month'] as CalendarView[]).map((view) => {
                  const IconComponent = getViewIcon(view)
                  return (
                    <Button
                      key={view}
                      variant={state.view === view ? "default" : "ghost"}
                      size="sm"
                      onClick={() => handleViewChange(view)}
                      className="capitalize"
                    >
                      <IconComponent className="h-4 w-4 mr-1" />
                      {view}
                    </Button>
                  )
                })}
              </div>

              {/* Undo/Redo Controls */}
              {showUndoRedo && (
                <UndoRedoControls position="inline" />
              )}

              {/* AI Slot Suggestions Button */}
              {enableAISlotSuggestions && (
                <Button variant="outline" size="sm">
                  <LightBulbIcon className="h-4 w-4 mr-1" />
                  AI Suggest
                </Button>
              )}

              {/* New appointment button */}
              <Button onClick={onAppointmentCreate}>
                <PlusIcon className="h-4 w-4 mr-1" />
                New Appointment
              </Button>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Conflict alerts */}
              {criticalConflicts.length > 0 && (
                <Badge variant="destructive">
                  {criticalConflicts.length} conflict{criticalConflicts.length > 1 ? 's' : ''}
                </Badge>
              )}
              
              {/* Appointment count */}
              <Badge variant="outline">
                {viewAppointments.length} appointment{viewAppointments.length !== 1 ? 's' : ''}
              </Badge>
              
              {/* Network status */}
              <CalendarNetworkStatus />
            </div>

            {/* Revenue summary for today */}
            {showRevenue && (
              <RevenueTrackingOverlay compact className="max-w-xs" />
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {layout === 'sidebar' ? (
          <div className="flex h-full">
            {/* Sidebar */}
            <div className="w-80 border-r bg-gray-50 overflow-y-auto">
              <div className="p-4 space-y-4">
                {/* AI Slot Suggestions */}
                {enableAISlotSuggestions && (
                  <AISlotSuggestions 
                    selectedDate={state.currentDate}
                    maxSuggestions={3}
                    onSlotSelect={(suggestion) => {
                      // Handle slot selection
                      console.log('Selected slot:', suggestion)
                    }}
                  />
                )}

                {/* Conflicts */}
                {showConflicts && (
                  <SmartConflictResolver />
                )}
                
                {/* Revenue tracking */}
                {showRevenue && (
                  <RevenueTrackingOverlay />
                )}
              </div>
            </div>
            
            {/* Calendar */}
            <div className="flex-1 overflow-auto">
              <PullToRefresh onRefresh={() => window.location.reload()}>
                <div className="p-4">
                  {viewAppointments.length === 0 ? (
                    <CalendarEmptyState />
                  ) : (
                    renderCalendarView()
                  )}
                </div>
              </PullToRefresh>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-auto">
            <PullToRefresh onRefresh={() => window.location.reload()}>
              <div className="p-4">
                {/* Inline conflicts and revenue */}
                <div className="mb-4 space-y-4">
                  {showConflicts && state.conflicts.length > 0 && (
                    <SmartConflictResolver />
                  )}
                </div>

                {/* Calendar view */}
                {viewAppointments.length === 0 ? (
                  <CalendarEmptyState />
                ) : (
                  renderCalendarView()
                )}
              </div>
            </PullToRefresh>
          </div>
        )}
      </div>

      {/* Floating undo/redo controls for mobile */}
      {showUndoRedo && enableMobileOptimizations && (
        <UndoRedoControls 
          position="bottom-right"
          className="md:hidden"
        />
      )}
    </div>
  )

  // Wrap with mobile gesture manager if enabled
  if (enableMobileOptimizations) {
    return (
      <MobileGestureManager
        enableSwipeNavigation={true}
        enablePinchZoom={false}
        enableLongPress={true}
        enablePullToRefresh={true}
        className={className}
      >
        {calendarContent}
      </MobileGestureManager>
    )
  }

  return calendarContent
}

// Wrapped component with context provider
export default function EnhancedUnifiedCalendar(props: EnhancedUnifiedCalendarProps) {
  return (
    <CalendarErrorBoundary>
      <CalendarProvider>
        <EnhancedUnifiedCalendarCore {...props} />
      </CalendarProvider>
    </CalendarErrorBoundary>
  )
}