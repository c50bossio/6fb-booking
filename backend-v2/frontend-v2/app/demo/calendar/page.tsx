'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { CalendarDaysIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import CalendarWeekView from '@/components/CalendarWeekView'
import CalendarDayView from '@/components/CalendarDayView'
import CalendarMonthView from '@/components/CalendarMonthView'
import CreateAppointmentModal from '@/components/modals/CreateAppointmentModal'
import { useDemoMode } from '@/components/demo/DemoModeProvider'
import { demoApi } from '@/lib/demo/demoApi'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import TimePickerModal from '@/components/modals/TimePickerModal'

export default function DemoCalendarPage() {
  const { mockData } = useDemoMode()
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedBarberId, setSelectedBarberId] = useState<string>('all')
  const [appointments, setAppointments] = useState(mockData.appointments)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; time: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showTimePickerModal, setShowTimePickerModal] = useState(false)
  const [pendingDate, setPendingDate] = useState<Date | null>(null)

  // Refresh appointments when date changes
  useEffect(() => {
    const loadAppointments = async () => {
      setIsLoading(true)
      try {
        const { appointments: data } = await demoApi.appointments.list({
          date: selectedDate.toISOString(),
          barber_id: selectedBarberId === 'all' ? undefined : parseInt(selectedBarberId)
        })
        setAppointments(data)
      } catch (error) {
        console.error('Error loading appointments:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAppointments()
  }, [selectedDate, selectedBarberId])

  const handleTimeSlotClick = (date: Date, barberId?: number) => {
    // Extract time from date object for week/day views
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    setSelectedTimeSlot({ date, time: `${hours}:${minutes}` })
    setIsCreateModalOpen(true)
  }

  const handleAppointmentClick = (appointment: any) => {
    // In real app, this would open edit modal
    console.log('Edit appointment:', appointment)
    alert(`Edit appointment for ${appointment.client_name} at ${format(new Date(appointment.start_time), 'h:mm a')}`)
  }

  const handleCreateAppointment = async (data: any) => {
    try {
      const newAppointment = await demoApi.appointments.create(data)
      setAppointments(prev => [...prev, newAppointment])
      setIsCreateModalOpen(false)
      setSelectedTimeSlot(null)
    } catch (error) {
      console.error('Error creating appointment:', error)
    }
  }

  const handleAppointmentUpdate = async (appointmentId: number, newStartTime: string) => {
    try {
      // Show confirmation dialog
      if (confirm(`Reschedule this appointment to ${format(new Date(newStartTime), 'MMM d, h:mm a')}?`)) {
        // Update appointment in demo
        await demoApi.appointments.update(appointmentId, { start_time: newStartTime })
        
        // Refresh appointments
        const { appointments: data } = await demoApi.appointments.list({
          date: selectedDate.toISOString(),
          barber_id: selectedBarberId === 'all' ? undefined : parseInt(selectedBarberId)
        })
        setAppointments(data)
      }
    } catch (error) {
      console.error('Failed to reschedule appointment:', error)
      alert('Failed to reschedule appointment. Please try again.')
    }
  }

  // Filter appointments for current view
  const filteredAppointments = selectedBarberId === 'all' 
    ? appointments 
    : appointments.filter(apt => apt.barber_id === parseInt(selectedBarberId))

  // Calculate stats
  const todayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.start_time)
    const today = new Date()
    return aptDate.toDateString() === today.toDateString()
  })

  const todayRevenue = todayAppointments
    .filter(apt => apt.status === 'completed')
    .reduce((sum, apt) => sum + (apt.price || 0), 0)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/demo">
                <Button variant="ghost" size="sm">
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Back to Demo Hub
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <CalendarDaysIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calendar</h1>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {todayAppointments.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Today's Appointments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${todayRevenue.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Today's Revenue</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* View Mode Selector */}
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'day' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('day')}
              >
                Day
              </Button>
              <Button
                variant={viewMode === 'week' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('week')}
              >
                Week
              </Button>
              <Button
                variant={viewMode === 'month' ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('month')}
              >
                Month
              </Button>
            </div>

            {/* Barber Filter */}
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Barber:
              </label>
              <select
                value={selectedBarberId}
                onChange={(e) => setSelectedBarberId(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Barbers</option>
                {mockData.barbers.map(barber => (
                  <option key={barber.id} value={barber.id.toString()}>
                    {barber.first_name} {barber.last_name}
                  </option>
                ))}
              </select>

              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add Appointment
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <h3 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">📅 Interactive Demo Tips:</h3>
          <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1">
            <li>• Click on any appointment to view/edit details</li>
            <li>• Click on empty time slots to create new appointments</li>
            <li>• <strong className="text-purple-900 dark:text-purple-300">Drag appointments to reschedule them!</strong></li>
            <li>• Switch between Day, Week, and Month views</li>
            <li>• Filter by specific barbers using the dropdown</li>
          </ul>
        </div>
      </div>

      {/* Calendar View */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-gray-500 dark:text-gray-400">Loading appointments...</div>
          </div>
        ) : (
          <>
            {viewMode === 'day' && (
              <CalendarDayView
                appointments={filteredAppointments}
                barbers={mockData.barbers}
                clients={mockData.clients}
                selectedBarberId={selectedBarberId === 'all' ? 'all' : parseInt(selectedBarberId)}
                onBarberSelect={(id) => setSelectedBarberId(id === 'all' ? 'all' : id.toString())}
                onAppointmentClick={handleAppointmentClick}
                onTimeSlotClick={handleTimeSlotClick}
                onAppointmentUpdate={handleAppointmentUpdate}
                currentDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}

            {viewMode === 'week' && (
              <CalendarWeekView
                appointments={filteredAppointments}
                clients={mockData.clients}
                onAppointmentClick={handleAppointmentClick}
                onTimeSlotClick={handleTimeSlotClick}
                onAppointmentUpdate={handleAppointmentUpdate}
                currentDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}

            {viewMode === 'month' && (
              <CalendarMonthView
                appointments={filteredAppointments}
                onAppointmentClick={handleAppointmentClick}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                onDayClick={(date) => {
                  // Show time picker for month view
                  setPendingDate(date)
                  setShowTimePickerModal(true)
                }}
              />
            )}
          </>
        )}
      </div>

      {/* Create Appointment Modal */}
      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          setSelectedTimeSlot(null)
        }}
        onSuccess={() => {
          // Refresh appointments after creation
          const loadAppointments = async () => {
            const { appointments: data } = await demoApi.appointments.list({
              date: selectedDate.toISOString(),
              barber_id: selectedBarberId === 'all' ? undefined : parseInt(selectedBarberId)
            })
            setAppointments(data)
          }
          loadAppointments()
        }}
        preselectedDate={selectedTimeSlot?.date}
        preselectedTime={selectedTimeSlot?.time}
      />

      {/* Time Picker Modal */}
      <TimePickerModal
        isOpen={showTimePickerModal}
        onClose={() => {
          setShowTimePickerModal(false)
          setPendingDate(null)
        }}
        selectedDate={pendingDate || undefined}
        onSelectTime={(time) => {
          if (pendingDate) {
            // Create a new date with the selected time
            const [hours, minutes] = time.split(':').map(Number)
            const dateWithTime = new Date(pendingDate)
            dateWithTime.setHours(hours, minutes, 0, 0)
            handleTimeSlotClick(dateWithTime)
          }
          setShowTimePickerModal(false)
          setPendingDate(null)
        }}
      />
    </div>
  )
}