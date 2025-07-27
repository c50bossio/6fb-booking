import React, { memo, useMemo, useCallback, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Clock, User, DollarSign, MapPin } from 'lucide-react'
import { useVirtualizedList, useMemoWithCache, useThrottledCallback } from '@/hooks/usePerformanceOptimization'
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns'

interface Appointment {
  id: number
  client_name: string
  client_email?: string
  client_phone?: string
  client_avatar?: string
  service_name: string
  service_id: number
  appointment_time: string
  end_time: string
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show'
  price: number
  barber_name?: string
  location?: string
  notes?: string
}

interface OptimizedAppointmentListProps {
  appointments: Appointment[]
  onSelectAppointment?: (appointment: Appointment) => void
  onStatusChange?: (id: number, status: Appointment['status']) => void
  containerHeight?: number
  className?: string
}

// Memoized status colors
const getStatusColor = (status: Appointment['status']) => {
  switch (status) {
    case 'confirmed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
    case 'cancelled':
      return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
    case 'completed':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
    case 'no_show':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
  }
}

// Memoized date formatter
const formatAppointmentDate = (dateString: string) => {
  const date = parseISO(dateString)
  
  if (isToday(date)) {
    return `Today at ${format(date, 'h:mm a')}`
  } else if (isTomorrow(date)) {
    return `Tomorrow at ${format(date, 'h:mm a')}`
  } else if (isPast(date)) {
    return format(date, 'MMM d, yyyy at h:mm a')
  } else {
    return format(date, 'EEE, MMM d at h:mm a')
  }
}

// Memoized appointment item component
const AppointmentItem = memo(({ 
  appointment, 
  onSelect,
  onStatusChange 
}: {
  appointment: Appointment
  onSelect?: () => void
  onStatusChange?: (status: Appointment['status']) => void
}) => {
  const formattedDate = useMemo(
    () => formatAppointmentDate(appointment.appointment_time),
    [appointment.appointment_time]
  )
  
  const duration = useMemo(() => {
    const start = parseISO(appointment.appointment_time)
    const end = parseISO(appointment.end_time)
    const minutes = Math.round((end.getTime() - start.getTime()) / 60000)
    return `${minutes} min`
  }, [appointment.appointment_time, appointment.end_time])
  
  const isPastAppointment = useMemo(
    () => isPast(parseISO(appointment.end_time)),
    [appointment.end_time]
  )
  
  const handleStatusChange = useCallback((status: Appointment['status']) => {
    onStatusChange?.(status)
  }, [onStatusChange])
  
  return (
    <Card 
      className={`transition-all duration-200 hover:shadow-md cursor-pointer ${
        isPastAppointment ? 'opacity-60' : ''
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-10 w-10">
            {appointment.client_avatar && <AvatarImage src={appointment.client_avatar} />}
            <AvatarFallback>
              {appointment.client_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h4 className="font-medium truncate">{appointment.client_name}</h4>
                <p className="text-sm text-muted-foreground">{appointment.service_name}</p>
              </div>
              <Badge className={`${getStatusColor(appointment.status)} shrink-0`}>
                {appointment.status}
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{duration}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                <span className="font-medium">${appointment.price}</span>
              </div>
              {appointment.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>{appointment.location}</span>
                </div>
              )}
            </div>
            
            {appointment.notes && (
              <p className="text-sm text-muted-foreground mt-2 line-clamp-1">
                Note: {appointment.notes}
              </p>
            )}
            
            {onStatusChange && appointment.status === 'confirmed' && !isPastAppointment && (
              <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('cancelled')}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('completed')}
                >
                  Complete
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

AppointmentItem.displayName = 'AppointmentItem'

// Virtualized appointment list
const VirtualizedAppointmentList = memo(({ 
  appointments, 
  onSelectAppointment,
  onStatusChange,
  containerHeight = 600 
}: {
  appointments: Appointment[]
  onSelectAppointment?: (appointment: Appointment) => void
  onStatusChange?: (id: number, status: Appointment['status']) => void
  containerHeight: number
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  
  const {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  } = useVirtualizedList({
    items: appointments,
    itemHeight: 140, // Approximate height of each appointment card
    containerHeight,
    overscan: 3,
    getItemKey: (item) => item.id,
  })
  
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])
  
  return (
    <div 
      ref={scrollContainerRef}
      className="overflow-auto"
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          <div className="space-y-3">
            {visibleItems.map(({ item, key }) => (
              <AppointmentItem
                key={key}
                appointment={item}
                onSelect={() => onSelectAppointment?.(item)}
                onStatusChange={(status) => onStatusChange?.(item.id, status)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
})

VirtualizedAppointmentList.displayName = 'VirtualizedAppointmentList'

// Main optimized appointment list component
export const OptimizedAppointmentList = memo(function OptimizedAppointmentList({
  appointments,
  onSelectAppointment,
  onStatusChange,
  containerHeight = 600,
  className = '',
}: OptimizedAppointmentListProps) {
  // Group appointments by date for better organization
  const groupedAppointments = useMemoWithCache(
    () => {
      const groups: Record<string, Appointment[]> = {}
      const today = format(new Date(), 'yyyy-MM-dd')
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')
      
      appointments.forEach(appointment => {
        const date = format(parseISO(appointment.appointment_time), 'yyyy-MM-dd')
        let groupKey: string
        
        if (date === today) {
          groupKey = 'Today'
        } else if (date === tomorrow) {
          groupKey = 'Tomorrow'
        } else if (isPast(parseISO(appointment.appointment_time))) {
          groupKey = 'Past'
        } else {
          groupKey = format(parseISO(appointment.appointment_time), 'EEEE, MMM d')
        }
        
        if (!groups[groupKey]) {
          groups[groupKey] = []
        }
        groups[groupKey].push(appointment)
      })
      
      // Sort appointments within each group
      Object.keys(groups).forEach(key => {
        groups[key].sort((a, b) => 
          parseISO(a.appointment_time).getTime() - parseISO(b.appointment_time).getTime()
        )
      })
      
      return groups
    },
    [appointments],
    'grouped-appointments'
  )
  
  // If we have many appointments, use virtualization
  const shouldVirtualize = appointments.length > 20
  
  if (shouldVirtualize) {
    return (
      <div className={className}>
        <VirtualizedAppointmentList
          appointments={appointments}
          onSelectAppointment={onSelectAppointment}
          onStatusChange={onStatusChange}
          containerHeight={containerHeight}
        />
      </div>
    )
  }
  
  // For smaller lists, render normally with grouping
  return (
    <div className={`space-y-6 ${className}`}>
      {Object.entries(groupedAppointments).map(([date, dateAppointments]) => (
        <div key={date}>
          <h3 className="text-lg font-semibold mb-3 sticky top-0 bg-background/95 backdrop-blur py-2">
            {date}
            <Badge variant="secondary" className="ml-2">
              {dateAppointments.length}
            </Badge>
          </h3>
          <div className="space-y-3">
            {dateAppointments.map(appointment => (
              <AppointmentItem
                key={appointment.id}
                appointment={appointment}
                onSelect={() => onSelectAppointment?.(appointment)}
                onStatusChange={(status) => onStatusChange?.(appointment.id, status)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
})

import { addDays } from 'date-fns'