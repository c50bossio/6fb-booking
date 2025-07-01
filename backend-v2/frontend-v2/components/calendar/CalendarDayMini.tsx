'use client'

import React, { useMemo } from 'react'
import { format, isSameDay, parseISO } from 'date-fns'
import { ClockIcon, UserIcon } from '@heroicons/react/24/outline'
import { Button } from '../ui/Button'
import { useRouter } from 'next/navigation'

interface Appointment {
  id: number
  start_time: string
  end_time?: string
  service_name: string
  client_name?: string
  status: string
  duration_minutes?: number
  price?: number
}

interface CalendarDayMiniProps {
  appointments: Appointment[]
  selectedDate?: Date
  maxItems?: number
  onViewAll?: () => void
  className?: string
}

export default function CalendarDayMini({
  appointments = [],
  selectedDate = new Date(),
  maxItems = 5,
  onViewAll,
  className = ''
}: CalendarDayMiniProps) {
  const router = useRouter()

  // Filter and sort appointments for the selected date
  const dayAppointments = useMemo(() => {
    return appointments
      .filter(apt => {
        try {
          const aptDate = parseISO(apt.start_time)
          return isSameDay(aptDate, selectedDate)
        } catch {
          return false
        }
      })
      .sort((a, b) => {
        const timeA = new Date(a.start_time).getTime()
        const timeB = new Date(b.start_time).getTime()
        return timeA - timeB
      })
      .slice(0, maxItems)
  }, [appointments, selectedDate, maxItems])

  const remainingCount = appointments.filter(apt => {
    try {
      const aptDate = parseISO(apt.start_time)
      return isSameDay(aptDate, selectedDate)
    } catch {
      return false
    }
  }).length - dayAppointments.length

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'scheduled':
        return 'border-green-200 bg-green-50 text-green-700'
      case 'pending':
        return 'border-yellow-200 bg-yellow-50 text-yellow-700'
      case 'cancelled':
        return 'border-red-200 bg-red-50 text-red-700'
      case 'completed':
        return 'border-blue-200 bg-blue-50 text-blue-700'
      default:
        return 'border-gray-200 bg-gray-50 text-gray-700'
    }
  }

  const getStatusDot = (status: string) => {
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
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {format(selectedDate, 'EEEE, MMM d')}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/calendar')}
        >
          View Calendar
        </Button>
      </div>

      {dayAppointments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <ClockIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No appointments scheduled</p>
        </div>
      ) : (
        <div className="space-y-2">
          {dayAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className={`relative pl-4 pr-3 py-3 rounded-lg border transition-colors hover:shadow-sm cursor-pointer ${
                getStatusColor(appointment.status)
              }`}
              onClick={() => router.push(`/calendar?date=${selectedDate.toISOString()}`)}
            >
              {/* Status indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${
                getStatusDot(appointment.status)
              }`} />
              
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {format(parseISO(appointment.start_time), 'h:mm a')}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({appointment.duration_minutes || 30} min)
                    </span>
                  </div>
                  
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1 truncate">
                    {appointment.service_name}
                  </p>
                  
                  {appointment.client_name && (
                    <div className="flex items-center gap-1 mt-1">
                      <UserIcon className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {appointment.client_name}
                      </span>
                    </div>
                  )}
                </div>
                
                {appointment.price !== undefined && (
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    ${appointment.price.toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {remainingCount > 0 && (
        <div className="mt-3 text-center">
          <button
            onClick={onViewAll || (() => router.push('/calendar'))}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            +{remainingCount} more appointment{remainingCount !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}