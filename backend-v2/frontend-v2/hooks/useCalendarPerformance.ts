import React, { useCallback, useMemo, useRef } from 'react'

interface FilterOptions {
  barberId?: number | 'all'
  startDate?: Date
  endDate?: Date
  status?: string
  serviceId?: number
}

interface CalendarPerformanceHook {
  optimizedAppointmentFilter: (appointments: any[], filters: FilterOptions) => any[]
  memoizedDateCalculations: (date: Date) => {
    startOfWeek: Date
    endOfWeek: Date
    monthDays: Date[]
    timeSlots: { hour: number; minute: number }[]
  }
  optimizedAppointmentsByDay: (appointments: any[], dateRange: { start: Date; end: Date }) => Map<string, any[]>
  memoizedStatusColor: (status: string) => string
}

export function useCalendarPerformance(): CalendarPerformanceHook {
  // Simple cache without complex management
  const cacheRef = useRef<Map<string, any>>(new Map())

  // Simplified appointment filtering without excessive caching
  const optimizedAppointmentFilter = useCallback((appointments: any[], filters: FilterOptions) => {
    const filtered = appointments.filter(appointment => {
      // Quick status check first (most common filter)
      if (filters.status && appointment.status !== filters.status) return false
      
      // Barber filtering
      if (filters.barberId && filters.barberId !== 'all') {
        if (appointment.barber_id !== filters.barberId) return false
      }
      
      // Service filtering
      if (filters.serviceId && appointment.service_id !== filters.serviceId) return false
      
      // Date filtering (most expensive, do last)
      if (filters.startDate || filters.endDate) {
        const appointmentDate = new Date(appointment.start_time)
        if (filters.startDate && appointmentDate < filters.startDate) return false
        if (filters.endDate && appointmentDate >= filters.endDate) return false
      }
      
      return true
    })
    
    // Simple sort by start time
    return filtered.sort((a, b) => {
      const timeA = new Date(a.start_time).getTime()
      const timeB = new Date(b.start_time).getTime()
      return timeA - timeB
    })
  }, [])

  // Simplified date calculations with minimal caching
  const memoizedDateCalculations = useCallback((date: Date) => {
    const dateKey = date.toDateString()
    
    if (cacheRef.current.has(dateKey)) {
      return cacheRef.current.get(dateKey)
    }
    
    // Calculate week boundaries (Monday start)
    const dayOfWeek = date.getDay()
    const startOfWeek = new Date(date)
    startOfWeek.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    // Calculate month days
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const monthDays: Date[] = []
    
    for (let day = 1; day <= daysInMonth; day++) {
      monthDays.push(new Date(year, month, day))
    }
    
    // Simple time slots
    const timeSlots: { hour: number; minute: number }[] = []
    for (let hour = 6; hour < 22; hour++) {
      timeSlots.push({ hour, minute: 0 })
      timeSlots.push({ hour, minute: 30 })
    }
    
    const calculations = {
      startOfWeek,
      endOfWeek,
      monthDays,
      timeSlots
    }
    
    // Simple cache management - clear if too large
    if (cacheRef.current.size > 10) {
      cacheRef.current.clear()
    }
    
    cacheRef.current.set(dateKey, calculations)
    return calculations
  }, [])

  // Simplified appointments by day grouping
  const optimizedAppointmentsByDay = useCallback((appointments: any[], dateRange: { start: Date; end: Date }) => {
    const dayMap = new Map<string, any[]>()
    
    appointments.forEach(appointment => {
      try {
        const appointmentDate = new Date(appointment.start_time)
        if (appointmentDate >= dateRange.start && appointmentDate <= dateRange.end) {
          const dayKey = appointmentDate.toDateString()
          
          if (!dayMap.has(dayKey)) {
            dayMap.set(dayKey, [])
          }
          dayMap.get(dayKey)!.push(appointment)
        }
      } catch {
        // Skip invalid dates
      }
    })
    
    // Sort appointments within each day
    dayMap.forEach((dayAppointments) => {
      dayAppointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    })
    
    return dayMap
  }, [])

  // Simple status color mapping
  const memoizedStatusColor = useMemo(() => {
    const statusColors = {
      'confirmed': 'bg-green-500 border-green-600 text-white',
      'scheduled': 'bg-green-500 border-green-600 text-white', 
      'pending': 'bg-yellow-500 border-yellow-600 text-white',
      'cancelled': 'bg-red-500 border-red-600 text-white',
      'completed': 'bg-blue-500 border-blue-600 text-white'
    }
    
    return (status: string) => {
      return statusColors[status as keyof typeof statusColors] || 'bg-purple-500 border-purple-600 text-white'
    }
  }, [])

  return {
    optimizedAppointmentFilter,
    memoizedDateCalculations,
    optimizedAppointmentsByDay,
    memoizedStatusColor
  }
}