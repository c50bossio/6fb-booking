'use client'

import React, { useMemo, useCallback } from 'react'
import { format, isSameDay, startOfDay, addDays, isToday } from 'date-fns'
import { ClockIcon, UserIcon, ScissorsIcon } from '@heroicons/react/24/outline'
import { parseAPIDate } from '@/lib/timezone'
import { Button } from '@/components/ui/Button'

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
  client?: {
    id: number
    first_name: string
    last_name: string
    email?: string
    phone?: string
  }
  barber?: {
    id: number
    name: string
    email?: string
  }
}

interface CalendarAgendaViewProps {
  appointments?: Appointment[]
  selectedDate: Date | null
  onDateSelect: (date: Date) => void
  onAppointmentClick?: (appointment: Appointment) => void
  onCreateAppointment?: (date: Date) => void
  selectedBarberId?: number | 'all'
  daysToShow?: number
  className?: string
}

export default function CalendarAgendaView({
  appointments = [],
  selectedDate,
  onDateSelect,
  onAppointmentClick,
  onCreateAppointment,
  selectedBarberId = 'all',
  daysToShow = 7,
  className = ''
}: CalendarAgendaViewProps) {
  // Generate days to display
  const days = useMemo(() => {
    const startDate = selectedDate || new Date()
    return Array.from({ length: daysToShow }, (_, i) => addDays(startOfDay(startDate), i))
  }, [selectedDate, daysToShow])

  // Filter appointments by barber
  const filteredAppointments = useMemo(() => {
    if (selectedBarberId === 'all') return appointments
    return appointments.filter(apt => apt.barber_id === selectedBarberId)
  }, [appointments, selectedBarberId])

  // Group appointments by day
  const appointmentsByDay = useMemo(() => {
    const grouped = new Map<string, Appointment[]>()
    
    days.forEach(day => {
      const dayKey = format(day, 'yyyy-MM-dd')
      grouped.set(dayKey, [])
    })

    filteredAppointments.forEach(appointment => {
      const appointmentDate = parseAPIDate(appointment.start_time)
      const dayKey = format(appointmentDate, 'yyyy-MM-dd')
      
      if (grouped.has(dayKey)) {
        grouped.get(dayKey)!.push(appointment)
      }
    })

    // Sort appointments within each day
    grouped.forEach((dayAppointments) => {
      dayAppointments.sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )
    })

    return grouped
  }, [days, filteredAppointments])

  const getClientName = useCallback((appointment: Appointment): string => {
    if (appointment.client_name) return appointment.client_name
    if (appointment.client) {
      return `${appointment.client.first_name} ${appointment.client.last_name}`.trim()
    }
    return 'Client'
  }, [])

  const getBarberName = useCallback((appointment: Appointment): string => {
    if (appointment.barber_name) return appointment.barber_name
    if (appointment.barber) return appointment.barber.name
    return ''
  }, [])

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'bg-green-500'
      case 'pending':
        return 'bg-yellow-500'
      case 'cancelled':
        return 'bg-red-500'
      case 'completed':
        return 'bg-blue-500'
      default:
        return 'bg-gray-500'
    }
  }, [])

  const getStatusTextColor = useCallback((status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'text-green-600 dark:text-green-400'
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'cancelled':
        return 'text-red-600 dark:text-red-400'
      case 'completed':
        return 'text-blue-600 dark:text-blue-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }, [])

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile-optimized agenda list */}
      <div className="space-y-4 pb-20">
        {days.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayAppointments = appointmentsByDay.get(dayKey) || []
          const isSelectedDay = selectedDate && isSameDay(day, selectedDate)
          const isTodayDate = isToday(day)

          return (
            <div key={dayKey} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
              {/* Day header */}
              <div 
                className={`px-4 py-3 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-colors ${
                  isSelectedDay ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
                onClick={() => onDateSelect(day)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-semibold ${
                      isTodayDate ? 'text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-white'
                    }`}>
                      {format(day, 'EEEE')}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {format(day, 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dayAppointments.length > 0 && (
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
                      </span>
                    )}
                    {isTodayDate && (
                      <span className="px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
                        Today
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Appointments list */}
              {dayAppointments.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {dayAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => onAppointmentClick?.(appointment)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Status indicator */}
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getStatusColor(appointment.status)}`} />
                        
                        {/* Appointment details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">
                              {format(parseAPIDate(appointment.start_time), 'h:mm a')}
                              {appointment.duration_minutes && (
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                  ({appointment.duration_minutes}m)
                                </span>
                              )}
                            </span>
                          </div>
                          
                          <h4 className="font-medium text-gray-900 dark:text-white truncate">
                            {appointment.service_name}
                          </h4>
                          
                          <div className="mt-1 space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                              <UserIcon className="w-4 h-4" />
                              <span className="truncate">{getClientName(appointment)}</span>
                            </div>
                            
                            {getBarberName(appointment) && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <ScissorsIcon className="w-4 h-4" />
                                <span className="truncate">{getBarberName(appointment)}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-2 flex items-center justify-between">
                            <span className={`text-xs font-medium capitalize ${getStatusTextColor(appointment.status)}`}>
                              {appointment.status}
                            </span>
                            {appointment.price && (
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                ${appointment.price}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    No appointments scheduled
                  </p>
                  {onCreateAppointment && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCreateAppointment(day)}
                    >
                      Add Appointment
                    </Button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Floating action button for mobile */}
      {onCreateAppointment && (
        <div className="fixed bottom-20 right-4 z-30 md:hidden">
          <Button
            onClick={() => onCreateAppointment(selectedDate || new Date())}
            className="rounded-full w-14 h-14 shadow-lg"
            variant="primary"
          >
            <span className="text-2xl">+</span>
          </Button>
        </div>
      )}
    </div>
  )
}