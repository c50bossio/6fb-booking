'use client'

import React, { useState, useEffect, memo } from 'react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { PlusIcon, CalendarIcon } from '@heroicons/react/24/outline'

import AppointmentBookingModal from '@/components/AppointmentBookingModal'
import { useAppointmentBookingModal } from '@/hooks/useAppointmentBookingModal'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// Sample appointment interface
interface CalendarAppointment {
  id: number
  client_name: string
  service_name: string
  start_time: string
  end_time: string
  barber_name?: string
  status: string
}

interface CalendarWithBookingModalProps {
  currentDate: Date
  appointments: CalendarAppointment[]
  onAppointmentCreated?: (appointment: any) => void
  className?: string
}

export const CalendarWithBookingModal = memo(function CalendarWithBookingModal({
  currentDate,
  appointments,
  onAppointmentCreated,
  className
}: CalendarWithBookingModalProps) {
  // Get calendar week
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
  const daysInWeek = eachDayOfInterval({ start: weekStart, end: weekEnd })

  // Time slots (9 AM to 6 PM, 30-minute intervals)
  const timeSlots = Array.from({ length: 18 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9
    const minute = i % 2 * 30
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
  })

  // Modal state management
  const {
    modalState,
    openForTimeSlot,
    closeModal,
    handleAppointmentCreated,
    updateAppointments
  } = useAppointmentBookingModal({
    onAppointmentCreated
  })

  // Update appointments for conflict detection
  useEffect(() => {
    updateAppointments(appointments)
  }, [appointments, updateAppointments])

  // Check if a time slot has an appointment
  const getAppointmentForSlot = (date: Date, time: string) => {
    const slotDateTime = `${format(date, 'yyyy-MM-dd')}T${time}:00`
    return appointments.find(apt => {
      const aptStart = apt.start_time.split('T')[1].substring(0, 5)
      const aptDate = apt.start_time.split('T')[0]
      return aptDate === format(date, 'yyyy-MM-dd') && aptStart === time
    })
  }

  // Handle time slot click
  const handleTimeSlotClick = (date: Date, time: string) => {
    const existingAppointment = getAppointmentForSlot(date, time)
    if (existingAppointment) {
      // Handle existing appointment click (could open edit modal)
      return
    }

    // Open booking modal for empty slot
    openForTimeSlot(date, time)
  }

  return (
    <div className={cn('calendar-with-booking', className)}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Week of {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </h2>
        <Button
          onClick={() => openForTimeSlot(new Date(), '09:00')}
          className="flex items-center gap-2"
        >
          <PlusIcon className="w-4 h-4" />
          New Appointment
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px] bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
            <div className="p-4 bg-gray-50 dark:bg-gray-900">
              <span className="text-sm font-medium text-gray-500">Time</span>
            </div>
            {daysInWeek.map((day) => (
              <div key={day.toString()} className="p-4 bg-gray-50 dark:bg-gray-900 text-center">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {format(day, 'EEE')}
                </div>
                <div className={cn(
                  'text-lg font-bold mt-1',
                  isSameDay(day, new Date()) 
                    ? 'text-primary-600 dark:text-primary-400' 
                    : 'text-gray-700 dark:text-gray-300'
                )}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {timeSlots.map((time) => (
              <div key={time} className="grid grid-cols-8 min-h-[60px]">
                {/* Time Label */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900 flex items-center justify-center border-r border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {format(new Date(`2000-01-01T${time}:00`), 'h:mm a')}
                  </span>
                </div>

                {/* Day Columns */}
                {daysInWeek.map((day) => {
                  const appointment = getAppointmentForSlot(day, time)
                  const isToday = isSameDay(day, new Date())
                  const isPast = day < startOfWeek(new Date()) || (isToday && time < format(new Date(), 'HH:mm'))

                  return (
                    <div
                      key={`${day.toString()}-${time}`}
                      className={cn(
                        'relative border-r border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer',
                        isPast && 'bg-gray-100 dark:bg-gray-800 opacity-50',
                        isToday && 'bg-blue-50 dark:bg-blue-900/20'
                      )}
                      onClick={() => !isPast && handleTimeSlotClick(day, time)}
                    >
                      {appointment ? (
                        <div className="absolute inset-1 bg-primary-600 dark:bg-primary-500 rounded p-2 text-white text-xs overflow-hidden">
                          <div className="font-semibold truncate">
                            {appointment.client_name}
                          </div>
                          <div className="truncate opacity-90">
                            {appointment.service_name}
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <PlusIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Quick Actions */}
      <div className="lg:hidden mt-6 flex flex-wrap gap-3">
        <Button
          onClick={() => openForTimeSlot(new Date(), '09:00')}
          className="flex-1 min-w-[150px] py-3"
          size="lg"
        >
          <CalendarIcon className="w-5 h-5 mr-2" />
          Book Now
        </Button>
        <Button
          variant="outline"
          onClick={() => openForTimeSlot(new Date(), '14:00')}
          className="flex-1 min-w-[150px] py-3"
          size="lg"
        >
          <CalendarIcon className="w-5 h-5 mr-2" />
          Book Afternoon
        </Button>
      </div>

      {/* Appointment Booking Modal */}
      <AppointmentBookingModal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        selectedDate={modalState.selectedDate}
        selectedTime={modalState.selectedTime}
        selectedBarber={modalState.selectedBarber}
        existingAppointments={modalState.existingAppointments}
        onAppointmentCreated={handleAppointmentCreated}
      />
    </div>
  )
})

export default CalendarWithBookingModal