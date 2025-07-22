'use client'

import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useRef, 
  useMemo,
  useImperativeHandle,
  forwardRef
} from 'react'
import { useCalendarPerformance } from '@/hooks/useCalendarPerformance'
import { usePerformanceMonitor } from '@/lib/performance-utils'
import type { BookingResponse } from '@/lib/api'

interface VirtualListItem<T = any> {
  id: string | number
  data: T
  height?: number
  index: number
}

interface VirtualScrollProps<T> {
  items: T[]
  itemHeight: number | ((item: T, index: number) => number)
  containerHeight: number
  overscan?: number
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode
  onScroll?: (scrollTop: number, scrollDirection: 'up' | 'down') => void
  onVisibleRangeChange?: (startIndex: number, endIndex: number) => void
  className?: string
  style?: React.CSSProperties
  getItemId?: (item: T, index: number) => string | number
  estimatedItemHeight?: number
  horizontal?: boolean
  scrollToIndex?: number
  maintainScrollPosition?: boolean
  loadMoreThreshold?: number
  onLoadMore?: () => void
  isLoading?: boolean
  emptyMessage?: React.ReactNode
}

interface VirtualListRef {
  scrollToItem: (index: number, align?: 'auto' | 'smart' | 'center' | 'start' | 'end') => void
  scrollToTop: () => void
  scrollToOffset: (offset: number) => void
  getScrollElement: () => HTMLDivElement | null
}

// Enhanced virtual list component with performance optimizations
export const VirtualCalendarList = forwardRef<VirtualListRef, VirtualScrollProps<any>>(function VirtualCalendarList<T>(
  {
    items,
    itemHeight,
    containerHeight,
    overscan = 5,
    renderItem,
    onScroll,
    onVisibleRangeChange,
    className = '',
    style = {},
    getItemId = (item: T, index: number) => index,
    estimatedItemHeight = 50,
    horizontal = false,
    scrollToIndex,
    maintainScrollPosition = true,
    loadMoreThreshold = 0.8,
    onLoadMore,
    isLoading = false,
    emptyMessage = null
  }: VirtualScrollProps<T>,
  ref
) {
  const [scrollTop, setScrollTop] = useState(0)
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down'>('down')
  const [isScrolling, setIsScrolling] = useState(false)
  
  const scrollElementRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const lastScrollTop = useRef(0)
  const itemHeightCache = useRef<Map<number, number>>(new Map())
  const offsetCache = useRef<Map<number, number>>(new Map())
  
  const { trackCalendarRender, calculateVirtualScrollParams } = useCalendarPerformance({
    enableVirtualScrolling: true,
    chunkSize: 50
  })
  
  const { startBenchmark, endBenchmark } = usePerformanceMonitor()

  // Calculate item heights and offsets
  const getItemHeight = useCallback((index: number): number => {
    if (itemHeightCache.current.has(index)) {
      return itemHeightCache.current.get(index)!
    }
    
    const height = typeof itemHeight === 'function' 
      ? itemHeight(items[index], index)
      : itemHeight
    
    itemHeightCache.current.set(index, height)
    return height
  }, [items, itemHeight])

  const getItemOffset = useCallback((index: number): number => {
    if (offsetCache.current.has(index)) {
      return offsetCache.current.get(index)!
    }
    
    let offset = 0
    for (let i = 0; i < index; i++) {
      offset += getItemHeight(i)
    }
    
    offsetCache.current.set(index, offset)
    return offset
  }, [getItemHeight])

  // Calculate total list height
  const totalHeight = useMemo(() => {
    let height = 0
    for (let i = 0; i < items.length; i++) {
      height += getItemHeight(i)
    }
    return height
  }, [items.length, getItemHeight])

  // Calculate visible range with performance monitoring
  const visibleRange = useMemo(() => {
    const benchmarkId = `calculateVisibleRange_${Date.now()}`
    startBenchmark(benchmarkId, 'Calculate Visible Range')
    
    try {
      if (items.length === 0) {
        return { startIndex: 0, endIndex: 0, visibleItems: [] }
      }

      let startIndex = 0
      let endIndex = items.length - 1
      let startOffset = 0
      let endOffset = totalHeight

      // Find start index
      for (let i = 0; i < items.length; i++) {
        const itemOffset = getItemOffset(i)
        const itemHeightValue = getItemHeight(i)
        
        if (itemOffset + itemHeightValue > scrollTop) {
          startIndex = Math.max(0, i - overscan)
          startOffset = getItemOffset(startIndex)
          break
        }
      }

      // Find end index
      for (let i = startIndex; i < items.length; i++) {
        const itemOffset = getItemOffset(i)
        
        if (itemOffset > scrollTop + containerHeight) {
          endIndex = Math.min(items.length - 1, i + overscan)
          endOffset = getItemOffset(endIndex) + getItemHeight(endIndex)
          break
        }
      }

      // Create visible items
      const visibleItems: VirtualListItem<T>[] = []
      for (let i = startIndex; i <= endIndex; i++) {
        if (i < items.length) {
          visibleItems.push({
            id: getItemId(items[i], i),
            data: items[i],
            height: getItemHeight(i),
            index: i
          })
        }
      }

      return {
        startIndex,
        endIndex,
        visibleItems,
        startOffset,
        endOffset
      }
    } finally {
      endBenchmark(benchmarkId)
    }
  }, [
    items, 
    scrollTop, 
    containerHeight, 
    overscan, 
    getItemId, 
    getItemHeight, 
    getItemOffset, 
    totalHeight,
    startBenchmark,
    endBenchmark
  ])

  // Handle scroll with performance optimizations
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget
    const newScrollTop = horizontal ? element.scrollLeft : element.scrollTop
    
    // Determine scroll direction
    const direction = newScrollTop > lastScrollTop.current ? 'down' : 'up'
    setScrollDirection(direction)
    lastScrollTop.current = newScrollTop
    
    setScrollTop(newScrollTop)
    setIsScrolling(true)
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    // Set isScrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 150)
    
    // Call scroll callbacks
    onScroll?.(newScrollTop, direction)
    onVisibleRangeChange?.(visibleRange.startIndex, visibleRange.endIndex)
    
    // Load more data if needed
    if (onLoadMore && !isLoading) {
      const scrollPercentage = horizontal
        ? newScrollTop / (element.scrollWidth - element.clientWidth)
        : newScrollTop / (element.scrollHeight - element.clientHeight)
      
      if (scrollPercentage >= loadMoreThreshold) {
        onLoadMore()
      }
    }
  }, [
    horizontal, 
    onScroll, 
    onVisibleRangeChange, 
    visibleRange.startIndex, 
    visibleRange.endIndex,
    onLoadMore,
    isLoading,
    loadMoreThreshold
  ])

  // Scroll to specific item
  const scrollToItem = useCallback((
    index: number, 
    align: 'auto' | 'smart' | 'center' | 'start' | 'end' = 'auto'
  ) => {
    if (!scrollElementRef.current || index < 0 || index >= items.length) {
      return
    }

    const itemOffset = getItemOffset(index)
    const itemHeightValue = getItemHeight(index)
    
    let targetOffset = itemOffset

    switch (align) {
      case 'center':
        targetOffset = itemOffset - (containerHeight - itemHeightValue) / 2
        break
      case 'end':
        targetOffset = itemOffset - containerHeight + itemHeightValue
        break
      case 'smart':
        if (itemOffset < scrollTop) {
          targetOffset = itemOffset
        } else if (itemOffset + itemHeightValue > scrollTop + containerHeight) {
          targetOffset = itemOffset - containerHeight + itemHeightValue
        } else {
          return // Item is already visible
        }
        break
      case 'auto':
        if (itemOffset < scrollTop || itemOffset + itemHeightValue > scrollTop + containerHeight) {
          targetOffset = itemOffset
        } else {
          return // Item is already visible
        }
        break
    }

    targetOffset = Math.max(0, Math.min(targetOffset, totalHeight - containerHeight))

    if (horizontal) {
      scrollElementRef.current.scrollLeft = targetOffset
    } else {
      scrollElementRef.current.scrollTop = targetOffset
    }
  }, [items.length, getItemOffset, getItemHeight, containerHeight, scrollTop, totalHeight, horizontal])

  // Scroll to top
  const scrollToTop = useCallback(() => {
    if (scrollElementRef.current) {
      if (horizontal) {
        scrollElementRef.current.scrollLeft = 0
      } else {
        scrollElementRef.current.scrollTop = 0
      }
    }
  }, [horizontal])

  // Scroll to offset
  const scrollToOffset = useCallback((offset: number) => {
    if (scrollElementRef.current) {
      const clampedOffset = Math.max(0, Math.min(offset, totalHeight - containerHeight))
      if (horizontal) {
        scrollElementRef.current.scrollLeft = clampedOffset
      } else {
        scrollElementRef.current.scrollTop = clampedOffset
      }
    }
  }, [horizontal, totalHeight, containerHeight])

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    scrollToItem,
    scrollToTop,
    scrollToOffset,
    getScrollElement: () => scrollElementRef.current
  }), [scrollToItem, scrollToTop, scrollToOffset])

  // Handle scroll to index prop
  useEffect(() => {
    if (scrollToIndex !== undefined) {
      scrollToItem(scrollToIndex)
    }
  }, [scrollToIndex, scrollToItem])

  // Clear caches when items change significantly
  useEffect(() => {
    if (items.length === 0) {
      itemHeightCache.current.clear()
      offsetCache.current.clear()
    }
  }, [items.length])

  // Track render performance
  useEffect(() => {
    trackCalendarRender('VirtualCalendarList', visibleRange.visibleItems.length)
  }, [trackCalendarRender, visibleRange.visibleItems.length])

  // Cleanup timeouts
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [])

  // Render empty state
  if (items.length === 0 && emptyMessage) {
    return (
      <div 
        className={`flex items-center justify-center ${className}`}
        style={{ ...style, height: containerHeight }}
      >
        {emptyMessage}
      </div>
    )
  }

  // Calculate container style
  const containerStyle: React.CSSProperties = {
    ...style,
    height: horizontal ? '100%' : containerHeight,
    width: horizontal ? containerHeight : '100%',
    overflow: 'auto',
    position: 'relative'
  }

  // Calculate inner style
  const innerStyle: React.CSSProperties = {
    height: horizontal ? '100%' : totalHeight,
    width: horizontal ? totalHeight : '100%',
    position: 'relative'
  }

  return (
    <div
      ref={scrollElementRef}
      className={`virtual-calendar-list ${className} ${isScrolling ? 'is-scrolling' : ''}`}
      style={containerStyle}
      onScroll={handleScroll}
      role="grid"
      aria-rowcount={items.length}
      aria-label="Virtual calendar list"
    >
      <div style={innerStyle}>
        {/* Spacer before visible items */}
        {visibleRange.startOffset > 0 && (
          <div 
            style={{
              height: horizontal ? '100%' : visibleRange.startOffset,
              width: horizontal ? visibleRange.startOffset : '100%'
            }}
            aria-hidden="true"
          />
        )}

        {/* Visible items */}
        {visibleRange.visibleItems.map((virtualItem) => {
          const itemStyle: React.CSSProperties = {
            position: 'absolute',
            [horizontal ? 'left' : 'top']: getItemOffset(virtualItem.index),
            [horizontal ? 'height' : 'width']: '100%',
            [horizontal ? 'width' : 'height']: virtualItem.height
          }

          return (
            <div
              key={virtualItem.id}
              style={itemStyle}
              role="gridcell"
              aria-rowindex={virtualItem.index + 1}
            >
              {renderItem(virtualItem.data, virtualItem.index, itemStyle)}
            </div>
          )
        })}

        {/* Spacer after visible items */}
        {visibleRange.endOffset && visibleRange.endOffset < totalHeight && (
          <div 
            style={{
              position: 'absolute',
              [horizontal ? 'left' : 'top']: visibleRange.endOffset,
              [horizontal ? 'width' : 'height']: totalHeight - visibleRange.endOffset,
              [horizontal ? 'height' : 'width']: '100%'
            }}
            aria-hidden="true"
          />
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div 
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center p-4 bg-white dark:bg-gray-800 border-t"
            style={{
              [horizontal ? 'left' : 'top']: totalHeight - 60,
              [horizontal ? 'width' : 'height']: 60
            }}
          >
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Loading more...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

// Specialized calendar appointment list component
interface CalendarAppointmentListProps {
  appointments: BookingResponse[]
  containerHeight: number
  onAppointmentClick?: (appointment: BookingResponse) => void
  onAppointmentEdit?: (appointment: BookingResponse) => void
  onAppointmentDelete?: (appointment: BookingResponse) => void
  selectedAppointmentId?: number
  className?: string
  emptyMessage?: React.ReactNode
}

export function VirtualCalendarAppointmentList({
  appointments,
  containerHeight,
  onAppointmentClick,
  onAppointmentEdit,
  onAppointmentDelete,
  selectedAppointmentId,
  className = '',
  emptyMessage = (
    <div className="text-center text-gray-500 dark:text-gray-400 p-8">
      <p className="text-lg font-medium mb-2">No appointments scheduled</p>
      <p className="text-sm">Create your first appointment to get started</p>
    </div>
  )
}: CalendarAppointmentListProps) {
  const listRef = useRef<VirtualListRef>(null)

  // Calculate dynamic item height based on appointment content
  const getAppointmentHeight = useCallback((appointment: BookingResponse, index: number): number => {
    // Base height for appointment item
    let height = 80
    
    // Add height for additional information
    if (appointment.notes && appointment.notes.length > 50) {
      height += 20 // Extra height for long notes
    }
    
    if (appointment.client_email || appointment.client_phone) {
      height += 16 // Extra height for contact info
    }
    
    return height
  }, [])

  // Render individual appointment item
  const renderAppointmentItem = useCallback((
    appointment: BookingResponse,
    index: number,
    style: React.CSSProperties
  ) => {
    const isSelected = selectedAppointmentId === appointment.id
    const startTime = new Date(appointment.start_time)
    const endTime = new Date(appointment.end_time)
    
    return (
      <div
        className={`
          border-b border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 
          transition-colors duration-150 cursor-pointer
          ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''}
        `}
        onClick={() => onAppointmentClick?.(appointment)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {appointment.service_name}
              </h3>
              <span className={`
                px-2 py-1 rounded-full text-xs font-medium
                ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-400' :
                  appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-400' :
                  appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-400' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-800/20 dark:text-gray-400'}
              `}>
                {appointment.status}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
              <p className="font-medium">{appointment.client_name}</p>
              <p>
                {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {' '}
                {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              
              {appointment.client_email && (
                <p className="text-xs">{appointment.client_email}</p>
              )}
              
              {appointment.client_phone && (
                <p className="text-xs">{appointment.client_phone}</p>
              )}
              
              {appointment.notes && (
                <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                  {appointment.notes}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-4">
            {appointment.price && (
              <span className="text-lg font-semibold text-green-600 dark:text-green-400">
                ${appointment.price}
              </span>
            )}
            
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onAppointmentEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAppointmentEdit(appointment)
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                  aria-label="Edit appointment"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              
              {onAppointmentDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onAppointmentDelete(appointment)
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                  aria-label="Delete appointment"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }, [onAppointmentClick, onAppointmentEdit, onAppointmentDelete, selectedAppointmentId])

  return (
    <VirtualCalendarList
      ref={listRef}
      items={appointments}
      itemHeight={getAppointmentHeight}
      containerHeight={containerHeight}
      renderItem={renderAppointmentItem}
      getItemId={(appointment) => appointment.id}
      className={className}
      emptyMessage={emptyMessage}
      estimatedItemHeight={80}
    />
  )
}

export type { VirtualListRef, VirtualScrollProps }
export default VirtualCalendarList