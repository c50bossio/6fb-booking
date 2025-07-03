'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useIntersectionObserver, useCalendarItemLazyLoading } from '@/hooks/useIntersectionObserver'
import { format } from 'date-fns'

interface CalendarEvent {
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
  notes?: string
  price?: number
}

interface LazyCalendarEventProps {
  event: CalendarEvent
  index: number
  onEventClick?: (event: CalendarEvent) => void
  onEventVisible?: (event: CalendarEvent, index: number) => void
  className?: string
  style?: React.CSSProperties
  lazy?: boolean
}

// Memoized skeleton component for loading state
const EventSkeleton = React.memo(function EventSkeleton({ 
  style 
}: { 
  style?: React.CSSProperties 
}) {
  return (
    <div 
      className="animate-pulse bg-gray-200 rounded-lg p-3 border border-gray-200"
      style={style}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="h-4 bg-gray-300 rounded w-20"></div>
        <div className="h-3 bg-gray-300 rounded w-16"></div>
      </div>
      <div className="h-3 bg-gray-300 rounded w-32 mb-1"></div>
      <div className="h-3 bg-gray-300 rounded w-24"></div>
    </div>
  )
})

// Optimized event content component
const EventContent = React.memo(function EventContent({
  event,
  onEventClick
}: {
  event: CalendarEvent
  onEventClick?: (event: CalendarEvent) => void
}) {
  // Memoize formatted time to prevent recalculation
  const formattedTime = useMemo(() => {
    try {
      const startTime = format(new Date(event.start_time), 'h:mm a')
      if (event.end_time) {
        const endTime = format(new Date(event.end_time), 'h:mm a')
        return `${startTime} - ${endTime}`
      }
      return startTime
    } catch {
      return 'Invalid time'
    }
  }, [event.start_time, event.end_time])

  // Memoize status styling
  const statusClasses = useMemo(() => {
    const baseClasses = 'inline-block px-2 py-1 text-xs font-medium rounded-full'
    
    switch (event.status) {
      case 'confirmed':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'pending':
        return `${baseClasses} bg-yellow-100 text-yellow-800`
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`
      case 'completed':
        return `${baseClasses} bg-blue-100 text-blue-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }, [event.status])

  // Memoize duration display
  const durationDisplay = useMemo(() => {
    if (event.duration_minutes) {
      const hours = Math.floor(event.duration_minutes / 60)
      const minutes = event.duration_minutes % 60
      
      if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
      }
      return `${minutes}m`
    }
    return null
  }, [event.duration_minutes])

  const handleClick = () => {
    onEventClick?.(event)
  }

  return (
    <div 
      className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="text-sm font-medium text-gray-900">
          {formattedTime}
        </div>
        <span className={statusClasses}>
          {event.status}
        </span>
      </div>
      
      <div className="text-sm text-gray-700 mb-1">
        {event.service_name}
      </div>
      
      {event.client_name && (
        <div className="text-sm text-gray-600 mb-1">
          {event.client_name}
        </div>
      )}
      
      {event.barber_name && (
        <div className="text-xs text-gray-500 mb-1">
          Barber: {event.barber_name}
        </div>
      )}
      
      <div className="flex justify-between items-center text-xs text-gray-500">
        {durationDisplay && (
          <span>{durationDisplay}</span>
        )}
        {event.price && (
          <span>${event.price.toFixed(2)}</span>
        )}
      </div>
      
      {event.notes && (
        <div className="mt-2 text-xs text-gray-500 border-t pt-1">
          {event.notes.length > 50 ? `${event.notes.substring(0, 50)}...` : event.notes}
        </div>
      )}
    </div>
  )
})

const LazyCalendarEvent = React.memo(function LazyCalendarEvent({
  event,
  index,
  onEventClick,
  onEventVisible,
  className = '',
  style,
  lazy = true
}: LazyCalendarEventProps) {
  const [hasLoaded, setHasLoaded] = useState(!lazy)
  
  // Use intersection observer for lazy loading
  const { ref, hasIntersected } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '50px',
    triggerOnce: true,
    enabled: lazy
  })

  // Load content when intersected or not lazy
  useEffect(() => {
    if (!lazy || hasIntersected) {
      setHasLoaded(true)
      
      // Notify parent about visibility
      if (onEventVisible && hasIntersected) {
        onEventVisible(event, index)
      }
    }
  }, [hasIntersected, lazy, onEventVisible, event, index])

  // Always render immediately if not lazy
  useEffect(() => {
    if (!lazy) {
      setHasLoaded(true)
    }
  }, [lazy])

  return (
    <div 
      ref={ref}
      className={`lazy-calendar-event ${className}`}
      style={style}
    >
      {hasLoaded ? (
        <EventContent 
          event={event} 
          onEventClick={onEventClick}
        />
      ) : (
        <EventSkeleton style={style} />
      )}
    </div>
  )
})

// Container component for multiple lazy events
interface LazyCalendarEventListProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onEventVisible?: (event: CalendarEvent, index: number) => void
  onLoadMore?: () => void
  loading?: boolean
  hasMore?: boolean
  className?: string
  lazy?: boolean
}

export const LazyCalendarEventList = React.memo(function LazyCalendarEventList({
  events,
  onEventClick,
  onEventVisible,
  onLoadMore,
  loading = false,
  hasMore = false,
  className = '',
  lazy = true
}: LazyCalendarEventListProps) {
  // Use intersection observer for load more functionality
  const { ref: loadMoreRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.1,
    rootMargin: '100px',
    enabled: hasMore && !loading
  })

  useEffect(() => {
    if (isIntersecting && hasMore && !loading && onLoadMore) {
      onLoadMore()
    }
  }, [isIntersecting, hasMore, loading, onLoadMore])

  // Batch visible event notifications
  const handleEventVisible = useMemo(() => {
    if (!onEventVisible) return undefined
    
    let visibleEvents: Array<{ event: CalendarEvent; index: number }> = []
    let timeoutId: NodeJS.Timeout | null = null
    
    return (event: CalendarEvent, index: number) => {
      visibleEvents.push({ event, index })
      
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      
      timeoutId = setTimeout(() => {
        // Batch process visible events
        visibleEvents.forEach(({ event: evt, index: idx }) => {
          onEventVisible(evt, idx)
        })
        visibleEvents = []
      }, 100)
    }
  }, [onEventVisible])

  return (
    <div className={`lazy-calendar-event-list space-y-2 ${className}`}>
      {events.map((event, index) => (
        <LazyCalendarEvent
          key={`${event.id}-${index}`}
          event={event}
          index={index}
          onEventClick={onEventClick}
          onEventVisible={handleEventVisible}
          lazy={lazy}
        />
      ))}
      
      {/* Load more trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {loading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          ) : (
            <div className="text-sm text-gray-500">Scroll to load more...</div>
          )}
        </div>
      )}
    </div>
  )
})

LazyCalendarEvent.displayName = 'LazyCalendarEvent'
LazyCalendarEventList.displayName = 'LazyCalendarEventList'

export default LazyCalendarEvent