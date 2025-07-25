'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { format, addDays, addHours, startOfDay, endOfDay, isWithinInterval, parseISO } from 'date-fns'
import { 
  CalendarIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCalendar, CalendarAppointment } from '@/contexts/CalendarContext'
import { cn } from '@/lib/utils'

interface VirtualScrollItem {
  id: string
  type: 'time-header' | 'appointment' | 'empty-slot'
  startTime: Date
  endTime: Date
  appointment?: CalendarAppointment
  height: number
  index: number
}

interface VirtualScrollCalendarProps {
  className?: string
  date: Date
  timeSlotHeight?: number
  headerHeight?: number
  overscan?: number
  enableSearch?: boolean
  enableFiltering?: boolean
  onAppointmentClick?: (appointment: CalendarAppointment) => void
  onTimeSlotClick?: (startTime: Date, endTime: Date) => void
}

export default function VirtualScrollCalendar({
  className,
  date,
  timeSlotHeight = 60,
  headerHeight = 40,
  overscan = 5,
  enableSearch = true,
  enableFiltering = true,
  onAppointmentClick,
  onTimeSlotClick
}: VirtualScrollCalendarProps) {
  const { state } = useCalendar()
  const containerRef = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(600)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [barberFilter, setBarberFilter] = useState<string>('all')

  // Filter appointments based on search and filters
  const filteredAppointments = useMemo(() => {
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)
    
    return state.appointments.filter(appointment => {
      const appointmentDate = parseISO(appointment.start_time)
      
      // Date filter
      if (!isWithinInterval(appointmentDate, { start: dayStart, end: dayEnd })) {
        return false
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const searchFields = [
          appointment.client_name,
          appointment.service_name,
          appointment.notes
        ].filter(Boolean).join(' ').toLowerCase()
        
        if (!searchFields.includes(query)) {
          return false
        }
      }
      
      // Status filter
      if (statusFilter !== 'all' && appointment.status !== statusFilter) {
        return false
      }
      
      // Barber filter
      if (barberFilter !== 'all' && appointment.barber_id.toString() !== barberFilter) {
        return false
      }
      
      return true
    })
  }, [state.appointments, date, searchQuery, statusFilter, barberFilter])

  // Generate virtual scroll items
  const virtualItems = useMemo(() => {
    const items: VirtualScrollItem[] = []
    let currentIndex = 0
    
    // Generate time slots for the day (6 AM to 11 PM)
    for (let hour = 6; hour < 23; hour++) {
      const timeSlot = addHours(startOfDay(date), hour)
      const nextTimeSlot = addHours(timeSlot, 1)
      
      // Add time header
      items.push({
        id: `header-${hour}`,
        type: 'time-header',
        startTime: timeSlot,
        endTime: nextTimeSlot,
        height: headerHeight,
        index: currentIndex++
      })
      
      // Find appointments in this hour
      const hourAppointments = filteredAppointments.filter(apt => {
        const aptTime = parseISO(apt.start_time)
        return aptTime.getHours() === hour
      })
      
      if (hourAppointments.length > 0) {
        // Sort appointments by start time
        hourAppointments.sort((a, b) => 
          parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime()
        )
        
        hourAppointments.forEach(appointment => {
          const aptStart = parseISO(appointment.start_time)
          const aptEnd = addHours(aptStart, (appointment.duration_minutes || 60) / 60)
          
          items.push({
            id: `appointment-${appointment.id}`,
            type: 'appointment',
            startTime: aptStart,
            endTime: aptEnd,
            appointment,
            height: timeSlotHeight,
            index: currentIndex++
          })
        })
      } else {
        // Add empty slot
        items.push({
          id: `empty-${hour}`,
          type: 'empty-slot',
          startTime: timeSlot,
          endTime: nextTimeSlot,
          height: timeSlotHeight,
          index: currentIndex++
        })
      }
    }
    
    return items
  }, [filteredAppointments, date, headerHeight, timeSlotHeight])

  // Calculate total height
  const totalHeight = useMemo(() => {
    return virtualItems.reduce((sum, item) => sum + item.height, 0)
  }, [virtualItems])

  // Calculate visible range
  const visibleRange = useMemo(() => {
    let startIndex = 0
    let endIndex = virtualItems.length - 1
    let accumulatedHeight = 0
    
    // Find start index
    for (let i = 0; i < virtualItems.length; i++) {
      if (accumulatedHeight + virtualItems[i].height > scrollTop) {
        startIndex = Math.max(0, i - overscan)
        break
      }
      accumulatedHeight += virtualItems[i].height
    }
    
    // Find end index
    accumulatedHeight = 0
    for (let i = 0; i < virtualItems.length; i++) {
      accumulatedHeight += virtualItems[i].height
      if (accumulatedHeight > scrollTop + containerHeight) {
        endIndex = Math.min(virtualItems.length - 1, i + overscan)
        break
      }
    }
    
    return { startIndex, endIndex }
  }, [virtualItems, scrollTop, containerHeight, overscan])

  // Get visible items with positions
  const visibleItems = useMemo(() => {
    const items = []
    let topOffset = 0
    
    // Calculate top offset for visible range
    for (let i = 0; i < visibleRange.startIndex; i++) {
      topOffset += virtualItems[i].height
    }
    
    // Get visible items
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (virtualItems[i]) {
        items.push({
          ...virtualItems[i],
          topOffset: topOffset
        })
        topOffset += virtualItems[i].height
      }
    }
    
    return items
  }, [virtualItems, visibleRange])

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  // Handle container resize
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  // Scroll to specific time
  const scrollToTime = useCallback((hour: number) => {
    const targetItem = virtualItems.find(item => 
      item.type === 'time-header' && item.startTime.getHours() === hour
    )
    
    if (targetItem && containerRef.current) {
      let scrollTarget = 0
      for (let i = 0; i < targetItem.index; i++) {
        scrollTarget += virtualItems[i].height
      }
      
      containerRef.current.scrollTo({
        top: scrollTarget,
        behavior: 'smooth'
      })
    }
  }, [virtualItems])

  // Scroll to current time
  const scrollToCurrentTime = useCallback(() => {
    const currentHour = new Date().getHours()
    scrollToTime(currentHour)
  }, [scrollToTime])

  // Handle appointment click
  const handleAppointmentClick = useCallback((appointment: CalendarAppointment) => {
    onAppointmentClick?.(appointment)
  }, [onAppointmentClick])

  // Handle time slot click
  const handleTimeSlotClick = useCallback((startTime: Date, endTime: Date) => {
    onTimeSlotClick?.(startTime, endTime)
  }, [onTimeSlotClick])

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 border-green-300 text-green-800'
      case 'pending': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'completed': return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'cancelled': return 'bg-red-100 border-red-300 text-red-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Controls */}
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="h-5 w-5" />
              <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
              <Badge variant="outline">
                {filteredAppointments.length} appointments
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={scrollToCurrentTime}
              >
                <ClockIcon className="h-4 w-4 mr-1" />
                Now
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => scrollToTime(9)}
              >
                Start Day
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        {(enableSearch || enableFiltering) && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3">
              {/* Search */}
              {enableSearch && (
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search appointments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              )}
              
              {/* Filters */}
              {enableFiltering && (
                <>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={barberFilter} onValueChange={setBarberFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Barber" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Barbers</SelectItem>
                      {state.barbers.map(barber => (
                        <SelectItem key={barber.id} value={barber.id.toString()}>
                          {barber.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Virtual Scroll Container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto relative border rounded-lg bg-white"
        onScroll={handleScroll}
      >
        {/* Virtual content container */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Render visible items */}
          {visibleItems.map((item) => (
            <div
              key={item.id}
              style={{
                position: 'absolute',
                top: item.topOffset,
                left: 0,
                right: 0,
                height: item.height
              }}
            >
              {item.type === 'time-header' && (
                <div className="flex items-center h-full bg-gray-50 border-b border-gray-200 px-4">
                  <div className="font-semibold text-gray-900">
                    {format(item.startTime, 'h:mm a')}
                  </div>
                  <div className="ml-auto text-sm text-gray-500">
                    {format(item.startTime, 'h:mm')} - {format(item.endTime, 'h:mm')}
                  </div>
                </div>
              )}
              
              {item.type === 'appointment' && item.appointment && (
                <div
                  className={cn(
                    "flex items-center h-full border-b border-gray-200 px-4 cursor-pointer hover:bg-gray-50 transition-colors",
                    getStatusColor(item.appointment.status)
                  )}
                  onClick={() => handleAppointmentClick(item.appointment!)}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="font-semibold">
                        {item.appointment.client_name}
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {format(item.startTime, 'h:mm a')}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {item.appointment.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <UserIcon className="h-3 w-3" />
                        <span>{state.barbers.find(b => b.id === item.appointment!.barber_id)?.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <ClockIcon className="h-3 w-3" />
                        <span>{item.appointment.duration_minutes}min</span>
                      </div>
                      
                      {item.appointment.total_price && (
                        <div className="flex items-center space-x-1">
                          <CurrencyDollarIcon className="h-3 w-3" />
                          <span>${item.appointment.total_price}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-700 mt-1">
                      {item.appointment.service_name}
                    </div>
                  </div>
                  
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                </div>
              )}
              
              {item.type === 'empty-slot' && (
                <div
                  className="flex items-center justify-center h-full border-b border-gray-100 px-4 cursor-pointer hover:bg-blue-50 transition-colors text-gray-400"
                  onClick={() => handleTimeSlotClick(item.startTime, item.endTime)}
                >
                  <div className="text-sm">
                    Available - Click to book
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {/* Scroll indicators */}
        <div className="absolute top-4 right-4 flex flex-col space-y-1 pointer-events-none">
          <div className="bg-black/75 text-white px-2 py-1 rounded text-xs">
            {Math.round((scrollTop / Math.max(totalHeight - containerHeight, 1)) * 100)}%
          </div>
          <div className="bg-black/75 text-white px-2 py-1 rounded text-xs">
            {visibleRange.endIndex - visibleRange.startIndex + 1} of {virtualItems.length}
          </div>
        </div>
      </div>
      
      {/* Performance Stats */}
      <div className="mt-2 text-xs text-gray-500 flex justify-between">
        <span>
          Rendering {visibleItems.length} of {virtualItems.length} items
        </span>
        <span>
          Virtual height: {totalHeight}px
        </span>
      </div>
    </div>
  )
}

// Hook for virtual scroll performance optimization
export function useVirtualScrollPerformance() {
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    itemsRendered: 0,
    totalItems: 0,
    scrollPosition: 0
  })

  const updateMetrics = useCallback((newMetrics: Partial<typeof metrics>) => {
    setMetrics(prev => ({ ...prev, ...newMetrics }))
  }, [])

  return { metrics, updateMetrics }
}

// Optimized list item component
export const VirtualAppointmentItem = React.memo(({ 
  appointment, 
  onClick 
}: { 
  appointment: CalendarAppointment
  onClick: (appointment: CalendarAppointment) => void 
}) => {
  return (
    <div
      className="flex items-center p-3 border-b hover:bg-gray-50 cursor-pointer"
      onClick={() => onClick(appointment)}
    >
      <div className="flex-1">
        <div className="font-medium">{appointment.client_name}</div>
        <div className="text-sm text-gray-600">{appointment.service_name}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">
          {format(parseISO(appointment.start_time), 'h:mm a')}
        </div>
        <div className="text-xs text-gray-500">
          {appointment.duration_minutes}min
        </div>
      </div>
    </div>
  )
})

VirtualAppointmentItem.displayName = 'VirtualAppointmentItem'