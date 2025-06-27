/**
 * Calendar Grid Usage Example
 *
 * This component demonstrates how to use the RobustCalendar grid system
 * with various configuration options and integration patterns.
 */

'use client'

import React, { useState, useCallback } from 'react'
import RobustCalendar, { CalendarAppointment, RobustCalendarProps } from './RobustCalendar'
import { formatDateString, generateTimeSlots, getWeekDays } from './CalendarGridTypes'

// Example barbers data
const exampleBarbers = [
  { id: 1, name: 'Marcus Johnson', color: '#8b5cf6', isActive: true },
  { id: 2, name: 'Sarah Mitchell', color: '#06b6d4', isActive: true },
  { id: 3, name: 'Tony Rodriguez', color: '#f59e0b', isActive: true }
]

// Example services data
const exampleServices = [
  { id: 1, name: 'Premium Cut & Beard', duration: 60, price: 85, category: 'Premium' },
  { id: 2, name: 'Classic Fade', duration: 45, price: 45, category: 'Standard' },
  { id: 3, name: 'Beard Trim', duration: 30, price: 35, category: 'Grooming' },
  { id: 4, name: 'Special Event', duration: 75, price: 95, category: 'Premium' }
]

// Example appointments data
const exampleAppointments: CalendarAppointment[] = [
  {
    id: '1',
    title: 'Premium Haircut & Beard Trim',
    client: 'John Smith',
    clientId: 1,
    barber: 'Marcus Johnson',
    barberId: 1,
    startTime: '09:00',
    endTime: '10:00',
    service: 'Premium Cut & Beard',
    serviceId: 1,
    price: 85,
    status: 'confirmed',
    date: '2024-06-25',
    duration: 60,
    clientPhone: '+1 (555) 123-4567',
    clientEmail: 'john.smith@email.com',
    notes: 'Regular client, prefers scissors over clippers',
    paymentStatus: 'paid'
  },
  {
    id: '2',
    title: 'Fade Cut',
    client: 'David Rodriguez',
    clientId: 2,
    barber: 'Sarah Mitchell',
    barberId: 2,
    startTime: '10:30',
    endTime: '11:15',
    service: 'Classic Fade',
    serviceId: 2,
    price: 45,
    status: 'pending',
    date: '2024-06-25',
    duration: 45,
    paymentStatus: 'unpaid'
  },
  {
    id: '3',
    title: 'Beard Styling',
    client: 'Michael Brown',
    clientId: 3,
    barber: 'Tony Rodriguez',
    barberId: 3,
    startTime: '14:00',
    endTime: '14:30',
    service: 'Beard Trim',
    serviceId: 3,
    price: 35,
    status: 'completed',
    date: '2024-06-25',
    duration: 30,
    paymentStatus: 'paid'
  }
]

interface CalendarGridExampleProps {
  initialView?: 'month' | 'week' | 'day'
  enableAdvancedFeatures?: boolean
  enablePerformanceMode?: boolean
  workingHours?: { start: string; end: string }
  timeSlotDuration?: number
}

export default function CalendarGridExample({
  initialView = 'week',
  enableAdvancedFeatures = true,
  enablePerformanceMode = false,
  workingHours = { start: '08:00', end: '20:00' },
  timeSlotDuration = 30
}: CalendarGridExampleProps) {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(exampleAppointments)
  const [isLoading, setIsLoading] = useState(false)

  // Event handlers
  const handleAppointmentClick = useCallback((appointment: CalendarAppointment) => {
    console.log('Appointment clicked:', appointment)
    alert(`Appointment Details:\nClient: ${appointment.client}\nService: ${appointment.service}\nTime: ${appointment.startTime} - ${appointment.endTime}`)
  }, [])

  const handleTimeSlotClick = useCallback((date: string, time: string) => {
    console.log('Time slot clicked:', { date, time })
    alert(`Create new appointment for ${date} at ${time}?`)
  }, [])

  const handleCreateAppointment = useCallback(async (appointmentData: Partial<CalendarAppointment>) => {
    console.log('Creating appointment:', appointmentData)
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      const newAppointment: CalendarAppointment = {
        id: Date.now().toString(),
        title: appointmentData.service || 'New Appointment',
        client: appointmentData.client || 'New Client',
        clientId: appointmentData.clientId || 999,
        barber: appointmentData.barber || 'Available Barber',
        barberId: appointmentData.barberId || 1,
        startTime: appointmentData.startTime || '09:00',
        endTime: appointmentData.endTime || '10:00',
        service: appointmentData.service || 'General Service',
        serviceId: appointmentData.serviceId || 1,
        price: appointmentData.price || 50,
        status: 'pending',
        date: appointmentData.date || formatDateString(new Date()),
        duration: appointmentData.duration || 60,
        paymentStatus: 'unpaid'
      }

      setAppointments(prev => [...prev, newAppointment])
      console.log('Appointment created successfully')
    } catch (error) {
      console.error('Failed to create appointment:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleUpdateAppointment = useCallback(async (appointment: CalendarAppointment) => {
    console.log('Updating appointment:', appointment)
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800))

      setAppointments(prev =>
        prev.map(apt => apt.id === appointment.id ? appointment : apt)
      )
      console.log('Appointment updated successfully')
    } catch (error) {
      console.error('Failed to update appointment:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleDeleteAppointment = useCallback(async (appointmentId: string) => {
    console.log('Deleting appointment:', appointmentId)
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))

      setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
      console.log('Appointment deleted successfully')
    } catch (error) {
      console.error('Failed to delete appointment:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleAppointmentMove = useCallback(async (
    appointmentId: string,
    newDate: string,
    newTime: string,
    originalDate: string,
    originalTime: string
  ) => {
    console.log('Moving appointment:', { appointmentId, from: { originalDate, originalTime }, to: { newDate, newTime } })
    setIsLoading(true)

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      setAppointments(prev =>
        prev.map(apt => {
          if (apt.id === appointmentId) {
            const duration = apt.duration
            const startTime = new Date(`2024-01-01 ${newTime}`)
            const endTime = new Date(startTime.getTime() + duration * 60000)

            return {
              ...apt,
              date: newDate,
              startTime: newTime,
              endTime: endTime.toTimeString().slice(0, 5)
            }
          }
          return apt
        })
      )
      console.log('Appointment moved successfully')
    } catch (error) {
      console.error('Failed to move appointment:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Calendar configuration
  const calendarProps: RobustCalendarProps = {
    appointments,
    barbers: exampleBarbers,
    services: exampleServices,
    onAppointmentClick: handleAppointmentClick,
    onTimeSlotClick: handleTimeSlotClick,
    onCreateAppointment: handleCreateAppointment,
    onUpdateAppointment: handleUpdateAppointment,
    onDeleteAppointment: handleDeleteAppointment,
    onAppointmentMove: handleAppointmentMove,
    initialView,
    initialDate: new Date(),
    workingHours,
    timeSlotDuration,
    enableDragDrop: enableAdvancedFeatures,
    enableSearch: enableAdvancedFeatures,
    enableFilters: enableAdvancedFeatures,
    enableExport: enableAdvancedFeatures,
    enableKeyboardNavigation: enableAdvancedFeatures,
    enableStatistics: enableAdvancedFeatures,
    enablePayments: enableAdvancedFeatures,
    showConflicts: true,
    allowConflicts: false,
    enableSmartConflictResolution: enableAdvancedFeatures,
    isLoading,
    showWeekends: true,
    showTimeSlotGrid: true,
    compactMode: enablePerformanceMode,
    showAppointmentDetails: !enablePerformanceMode
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Calendar Grid Example
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Demonstration of the RobustCalendar grid rendering system
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Grid Features</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>✅ Month/Week/Day views</li>
            <li>✅ Drag & drop appointments</li>
            <li>✅ Conflict detection</li>
            <li>✅ Keyboard navigation</li>
            <li>✅ Responsive design</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Performance</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>✅ Virtualized scrolling</li>
            <li>✅ Memoized calculations</li>
            <li>✅ Efficient re-renders</li>
            <li>✅ Performance monitoring</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Accessibility</h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>✅ ARIA labels</li>
            <li>✅ Focus management</li>
            <li>✅ Screen reader support</li>
            <li>✅ High contrast mode</li>
          </ul>
        </div>
      </div>

      {/* The main calendar component */}
      <RobustCalendar {...calendarProps} />

      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          Integration Instructions
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>
            <strong>Basic Usage:</strong> Import RobustCalendar and pass appointments, barbers, and services data.
          </p>
          <p>
            <strong>Event Handling:</strong> Implement onAppointmentClick, onTimeSlotClick, and CRUD handlers.
          </p>
          <p>
            <strong>Customization:</strong> Configure working hours, time slots, and enable/disable features as needed.
          </p>
          <p>
            <strong>Theme Integration:</strong> The calendar automatically uses your theme context for consistent styling.
          </p>
        </div>
      </div>
    </div>
  )
}

// Export for easier importing
export { exampleBarbers, exampleServices, exampleAppointments }
export type { CalendarGridExampleProps }
