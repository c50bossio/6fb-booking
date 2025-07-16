'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { FixedSizeList as List, VariableSizeList, ListChildComponentProps } from 'react-window'
import { format, addDays, isSameDay, startOfWeek, endOfWeek, addMinutes } from 'date-fns'

export interface VirtualizedAppointment {
  id: number
  start_time: string
  end_time?: string
  duration_minutes: number
  client_name: string
  service_name: string
  barber_name?: string
  barber_id: number
  status: string
  location_id?: number
  height?: number
  top?: number
  gridColumn?: number
}

export interface VirtualScrollConfig {
  itemHeight: number
  bufferSize: number
  overscan: number
  dynamicHeight: boolean
  enableHorizontalScroll: boolean
  minColumnWidth: number
  maxVisibleColumns: number
}

export interface VirtualizedCalendarGridProps {
  appointments: VirtualizedAppointment[]
  startDate: Date
  endDate: Date
  view: 'day' | 'week' | 'month' | 'list'
  timeSlotHeight?: number
  timeSlotDuration?: number
  startHour?: number
  endHour?: number
  onAppointmentClick?: (appointment: VirtualizedAppointment) => void
  onTimeSlotClick?: (date: Date, hour: number, minute: number) => void
  onScroll?: (scrollTop: number, scrollLeft: number) => void
  config?: Partial<VirtualScrollConfig>
  className?: string
  renderAppointment?: (appointment: VirtualizedAppointment, style: React.CSSProperties) => React.ReactNode
  renderTimeSlot?: (date: Date, hour: number, minute: number, style: React.CSSProperties) => React.ReactNode
}

const DEFAULT_CONFIG: VirtualScrollConfig = {
  itemHeight: 40,
  bufferSize: 5,
  overscan: 3,
  dynamicHeight: true,
  enableHorizontalScroll: true,
  minColumnWidth: 200,
  maxVisibleColumns: 7
}

export function VirtualizedCalendarGrid({
  appointments,
  startDate,
  endDate,
  view,
  timeSlotHeight = 40,
  timeSlotDuration = 30,
  startHour = 8,
  endHour = 18,
  onAppointmentClick,
  onTimeSlotClick,
  onScroll,
  config = {},
  className = '',
  renderAppointment,
  renderTimeSlot
}: VirtualizedCalendarGridProps) {
  const virtualConfig = { ...DEFAULT_CONFIG, ...config }
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const verticalListRef = useRef<List>(null)
  const horizontalListRef = useRef<VariableSizeList>(null)

  // Calculate time slots
  const timeSlots = useMemo(() => {
    const slots = []
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += timeSlotDuration) {
        slots.push({ hour, minute })
      }
    }
    return slots
  }, [startHour, endHour, timeSlotDuration])

  // Calculate date columns
  const dateColumns = useMemo(() => {
    const columns = []
    let currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      columns.push(new Date(currentDate))
      currentDate = addDays(currentDate, 1)
    }
    
    return columns
  }, [startDate, endDate])

  // Process appointments for virtualization
  const processedAppointments = useMemo(() => {
    const processed: Array<VirtualizedAppointment & { 
      virtualIndex: number
      columnIndex: number
      rowIndex: number
      renderTop: number
      renderHeight: number
    }> = []

    appointments.forEach((appointment, index) => {
      const appointmentDate = new Date(appointment.start_time)
      const columnIndex = dateColumns.findIndex(date => isSameDay(date, appointmentDate))
      
      if (columnIndex === -1) return // Appointment outside date range

      const hour = appointmentDate.getHours()
      const minute = appointmentDate.getMinutes()
      const slotIndex = timeSlots.findIndex(slot => slot.hour === hour && slot.minute === minute)
      
      if (slotIndex === -1) return // Appointment outside time range

      const renderTop = slotIndex * timeSlotHeight
      const renderHeight = Math.max(timeSlotHeight, (appointment.duration_minutes / timeSlotDuration) * timeSlotHeight)

      processed.push({
        ...appointment,
        virtualIndex: index,
        columnIndex,
        rowIndex: slotIndex,
        renderTop,
        renderHeight
      })
    })

    return processed
  }, [appointments, dateColumns, timeSlots, timeSlotHeight, timeSlotDuration])

  // Group appointments by time slots for efficient rendering
  const appointmentsBySlot = useMemo(() => {
    const slotMap = new Map<string, Array<typeof processedAppointments[0]>>()
    
    processedAppointments.forEach(appointment => {
      const slotKey = `${appointment.rowIndex}-${appointment.columnIndex}`
      if (!slotMap.has(slotKey)) {
        slotMap.set(slotKey, [])
      }
      slotMap.get(slotKey)!.push(appointment)
    })
    
    return slotMap
  }, [processedAppointments])

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const totalHeight = timeSlots.length * timeSlotHeight
    const visibleHeight = containerSize.height
    
    const startIndex = Math.max(0, Math.floor(scrollTop / timeSlotHeight) - virtualConfig.bufferSize)
    const endIndex = Math.min(
      timeSlots.length - 1,
      Math.ceil((scrollTop + visibleHeight) / timeSlotHeight) + virtualConfig.bufferSize
    )

    const visibleColumns = Math.min(
      dateColumns.length,
      Math.ceil(containerSize.width / virtualConfig.minColumnWidth)
    )

    const startColumn = Math.max(0, Math.floor(scrollLeft / virtualConfig.minColumnWidth) - 1)
    const endColumn = Math.min(dateColumns.length - 1, startColumn + visibleColumns + 1)

    return {
      startRow: startIndex,
      endRow: endIndex,
      startColumn,
      endColumn,
      totalHeight,
      visibleHeight,
      visibleColumns
    }
  }, [scrollTop, scrollLeft, containerSize, timeSlots.length, dateColumns.length, timeSlotHeight, virtualConfig])

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({ width: rect.width, height: rect.height })
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop: newScrollTop, scrollLeft: newScrollLeft } = event.currentTarget
    setScrollTop(newScrollTop)
    setScrollLeft(newScrollLeft)
    onScroll?.(newScrollTop, newScrollLeft)
  }, [onScroll])

  // Render time slot
  const renderTimeSlotDefault = useCallback((
    date: Date,
    hour: number,
    minute: number,
    style: React.CSSProperties,
    slotAppointments: Array<typeof processedAppointments[0]> = []
  ) => {
    const slotDate = new Date(date)
    slotDate.setHours(hour, minute, 0, 0)

    return (
      <div
        key={`${date.toDateString()}-${hour}-${minute}`}
        style={style}
        className="border-b border-r border-gray-200 dark:border-gray-700 relative hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
        onClick={() => onTimeSlotClick?.(slotDate, hour, minute)}
      >
        {/* Time label for first minute of hour */}
        {minute === 0 && (
          <div className="absolute left-2 top-1 text-xs text-gray-500 pointer-events-none">
            {format(slotDate, 'h:mm a')}
          </div>
        )}
        
        {/* Render appointments in this slot */}
        {slotAppointments.map((appointment, index) => (
          <div
            key={appointment.id}
            className="absolute inset-x-1 bg-blue-500 text-white text-xs p-1 rounded cursor-pointer hover:bg-blue-600 transition-colors z-10"
            style={{
              top: `${index * 2}px`,
              height: `${Math.min(style.height as number - 4, appointment.renderHeight - index * 2)}px`,
              left: `${index % 3 * 2}px`,
              right: `${(2 - (index % 3)) * 2}px`
            }}
            onClick={(e) => {
              e.stopPropagation()
              onAppointmentClick?.(appointment)
            }}
          >
            <div className="truncate font-medium">{appointment.client_name}</div>
            <div className="truncate text-xs opacity-90">{appointment.service_name}</div>
          </div>
        ))}
      </div>
    )
  }, [onTimeSlotClick, onAppointmentClick])

  // Virtual list item renderer
  const VirtualListItem = useCallback(({ index, style }: ListChildComponentProps) => {
    const slotIndex = index + visibleRange.startRow
    const { hour, minute } = timeSlots[slotIndex] || { hour: 0, minute: 0 }
    
    return (
      <div style={style} className="flex">
        {dateColumns.slice(visibleRange.startColumn, visibleRange.endColumn + 1).map((date, columnIndex) => {
          const actualColumnIndex = visibleRange.startColumn + columnIndex
          const slotKey = `${slotIndex}-${actualColumnIndex}`
          const slotAppointments = appointmentsBySlot.get(slotKey) || []
          
          const columnStyle: React.CSSProperties = {
            width: virtualConfig.minColumnWidth,
            height: timeSlotHeight,
            minWidth: virtualConfig.minColumnWidth
          }

          if (renderTimeSlot) {
            return renderTimeSlot(date, hour, minute, columnStyle)
          }

          return renderTimeSlotDefault(date, hour, minute, columnStyle, slotAppointments)
        })}
      </div>
    )
  }, [
    visibleRange,
    timeSlots,
    dateColumns,
    appointmentsBySlot,
    virtualConfig.minColumnWidth,
    timeSlotHeight,
    renderTimeSlot,
    renderTimeSlotDefault
  ])

  // Calculate item height for variable height lists
  const getItemHeight = useCallback((index: number) => {
    if (!virtualConfig.dynamicHeight) return timeSlotHeight
    
    const slotIndex = index + visibleRange.startRow
    const slotAppointments = Array.from(appointmentsBySlot.values())
      .flat()
      .filter(apt => apt.rowIndex === slotIndex)
    
    if (slotAppointments.length === 0) return timeSlotHeight
    
    const maxHeight = Math.max(...slotAppointments.map(apt => apt.renderHeight))
    return Math.max(timeSlotHeight, maxHeight)
  }, [virtualConfig.dynamicHeight, timeSlotHeight, visibleRange.startRow, appointmentsBySlot])

  // Header component for date columns
  const DateHeader = () => (
    <div 
      className="flex bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20"
      style={{ 
        transform: `translateX(-${scrollLeft}px)`,
        width: dateColumns.length * virtualConfig.minColumnWidth
      }}
    >
      {dateColumns.slice(visibleRange.startColumn, visibleRange.endColumn + 1).map((date, index) => (
        <div
          key={date.toISOString()}
          className="flex-shrink-0 p-3 text-center border-r border-gray-200 dark:border-gray-700 font-medium"
          style={{ width: virtualConfig.minColumnWidth }}
        >
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {format(date, 'EEE')}
          </div>
          <div className={`text-lg ${isSameDay(date, new Date()) ? 'text-blue-600 font-bold' : ''}`}>
            {format(date, 'd')}
          </div>
        </div>
      ))}
    </div>
  )

  // Time labels sidebar
  const TimeLabels = () => (
    <div 
      className="w-16 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 sticky left-0 z-10"
      style={{ 
        transform: `translateY(-${scrollTop}px)`,
        height: visibleRange.totalHeight
      }}
    >
      {timeSlots.slice(visibleRange.startRow, visibleRange.endRow + 1).map(({ hour, minute }, index) => (
        minute === 0 && (
          <div
            key={`${hour}-${minute}`}
            className="h-10 flex items-start justify-end pr-2 pt-1 text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700"
            style={{ 
              position: 'absolute',
              top: (visibleRange.startRow + index) * timeSlotHeight,
              width: 64,
              height: timeSlotHeight
            }}
          >
            {format(new Date().setHours(hour, minute), 'h:mm a')}
          </div>
        )
      ))}
    </div>
  )

  // Performance monitoring
  const [renderTime, setRenderTime] = useState(0)
  useEffect(() => {
    const startTime = performance.now()
    return () => {
      const endTime = performance.now()
      setRenderTime(endTime - startTime)
    }
  })

  return (
    <div 
      ref={containerRef}
      className={`virtualized-calendar-grid relative overflow-hidden ${className}`}
      style={{ height: '100%', width: '100%' }}
    >
      {/* Performance indicator (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 text-xs bg-black text-white px-2 py-1 rounded z-50">
          {renderTime.toFixed(1)}ms | {visibleRange.endRow - visibleRange.startRow + 1} rows
        </div>
      )}

      {/* Date header */}
      <DateHeader />

      {/* Main scrollable area */}
      <div className="flex h-full">
        {/* Time labels */}
        <TimeLabels />
        
        {/* Virtual calendar grid */}
        <div 
          className="flex-1 overflow-auto relative"
          onScroll={handleScroll}
          style={{ 
            height: containerSize.height - 60, // Subtract header height
            width: containerSize.width - 64 // Subtract time labels width
          }}
        >
          {virtualConfig.dynamicHeight ? (
            <VariableSizeList
              ref={horizontalListRef}
              height={containerSize.height - 60}
              itemCount={visibleRange.endRow - visibleRange.startRow + 1}
              itemSize={getItemHeight}
              overscanCount={virtualConfig.overscan}
              width={dateColumns.length * virtualConfig.minColumnWidth}
            >
              {VirtualListItem}
            </VariableSizeList>
          ) : (
            <List
              ref={verticalListRef}
              height={containerSize.height - 60}
              itemCount={visibleRange.endRow - visibleRange.startRow + 1}
              itemSize={timeSlotHeight}
              overscanCount={virtualConfig.overscan}
              width={dateColumns.length * virtualConfig.minColumnWidth}
            >
              {VirtualListItem}
            </List>
          )}
        </div>
      </div>

      {/* Current time indicator */}
      <CurrentTimeIndicator 
        startHour={startHour}
        timeSlotHeight={timeSlotHeight}
        containerWidth={containerSize.width}
        scrollLeft={scrollLeft}
      />
    </div>
  )
}

// Current time indicator component
const CurrentTimeIndicator = React.memo(({ 
  startHour, 
  timeSlotHeight, 
  containerWidth,
  scrollLeft 
}: { 
  startHour: number
  timeSlotHeight: number
  containerWidth: number
  scrollLeft: number
}) => {
  const [currentTime, setCurrentTime] = useState(new Date())
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000) // Update every minute
    
    return () => clearInterval(interval)
  }, [])
  
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  
  // Only show if current time is within visible hours
  if (currentHour < startHour || currentHour >= startHour + 12) {
    return null
  }
  
  const top = ((currentHour - startHour) * 60 + currentMinute) / 30 * timeSlotHeight + 60 // Add header height
  
  return (
    <div
      className="absolute z-30 pointer-events-none"
      style={{ 
        top: `${top}px`,
        left: `${64 - scrollLeft}px`, // Time labels width minus scroll
        right: 0,
        height: '2px'
      }}
    >
      <div className="h-full bg-red-500 relative">
        <div className="absolute -left-1 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
      </div>
    </div>
  )
})

CurrentTimeIndicator.displayName = 'CurrentTimeIndicator'

// Hook for managing virtual scroll state
export function useVirtualizedCalendar(
  appointments: VirtualizedAppointment[],
  config: Partial<VirtualScrollConfig> = {}
) {
  const [scrollPosition, setScrollPosition] = useState({ top: 0, left: 0 })
  const [visibleItems, setVisibleItems] = useState<VirtualizedAppointment[]>([])
  const virtualConfig = { ...DEFAULT_CONFIG, ...config }

  const updateVisibleItems = useCallback((scrollTop: number, scrollLeft: number, containerSize: { width: number; height: number }) => {
    const itemHeight = virtualConfig.itemHeight
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.ceil((scrollTop + containerSize.height) / itemHeight)
    
    const visible = appointments.slice(
      Math.max(0, startIndex - virtualConfig.bufferSize),
      Math.min(appointments.length, endIndex + virtualConfig.bufferSize)
    )
    
    setVisibleItems(visible)
    setScrollPosition({ top: scrollTop, left: scrollLeft })
  }, [appointments, virtualConfig])

  const scrollToAppointment = useCallback((appointmentId: number) => {
    const index = appointments.findIndex(apt => apt.id === appointmentId)
    if (index !== -1) {
      const scrollTop = index * virtualConfig.itemHeight
      setScrollPosition(prev => ({ ...prev, top: scrollTop }))
      return scrollTop
    }
    return null
  }, [appointments, virtualConfig.itemHeight])

  const scrollToTime = useCallback((hour: number, minute: number, startHour: number = 8) => {
    const totalMinutes = (hour - startHour) * 60 + minute
    const scrollTop = (totalMinutes / 30) * virtualConfig.itemHeight // Assuming 30-minute slots
    setScrollPosition(prev => ({ ...prev, top: scrollTop }))
    return scrollTop
  }, [virtualConfig.itemHeight])

  return {
    scrollPosition,
    visibleItems,
    updateVisibleItems,
    scrollToAppointment,
    scrollToTime
  }
}

export default VirtualizedCalendarGrid