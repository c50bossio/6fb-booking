'use client'

/**
 * Calendar Test Page - Standalone UnifiedCalendar Testing
 * This page allows testing the calendar component without authentication
 */

import React, { useState } from 'react'
import UnifiedCalendar from '@/components/UnifiedCalendar'
import type { CalendarView } from '@/components/UnifiedCalendar'

// This page uses a custom layout to avoid authentication requirements

// Mock appointment data for testing
const mockAppointments = [
  {
    id: 1,
    user_id: 1,
    start_time: '2024-07-14T09:00:00',
    end_time: '2024-07-14T10:00:00',
    status: 'confirmed' as const,
    price: 35.00,
    duration_minutes: 60,
    created_at: '2024-07-14T00:00:00',
    updated_at: '2024-07-14T00:00:00',
    service_name: 'Haircut',
    barber_name: 'John Doe',
    client_name: 'Test Client 1',
    client_email: 'test1@example.com',
    client_phone: '(555) 123-4567',
    notes: 'Regular haircut'
  },
  {
    id: 2,
    user_id: 2,
    start_time: '2024-07-14T14:30:00',
    end_time: '2024-07-14T15:30:00',
    status: 'confirmed' as const,
    price: 45.00,
    duration_minutes: 60,
    created_at: '2024-07-14T00:00:00',
    updated_at: '2024-07-14T00:00:00',
    service_name: 'Beard Trim',
    barber_name: 'Jane Smith',
    client_name: 'Test Client 2',
    client_email: 'test2@example.com',
    client_phone: '(555) 987-6543',
    notes: 'Beard styling'
  },
  {
    id: 3,
    user_id: 1,
    start_time: '2024-07-15T11:00:00',
    end_time: '2024-07-15T12:30:00',
    status: 'pending' as const,
    price: 65.00,
    duration_minutes: 90,
    created_at: '2024-07-14T00:00:00',
    updated_at: '2024-07-14T00:00:00',
    service_name: 'Haircut + Beard',
    barber_name: 'John Doe',
    client_name: 'Test Client 3',
    client_email: 'test3@example.com',
    client_phone: '(555) 456-7890',
    notes: 'Full service'
  }
]

// Mock barber data for testing
const mockBarbers = [
  {
    id: 1,
    name: 'John Doe',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@bookedbarber.com',
    avatar: '/avatars/john.jpg',
    role: 'barber'
  },
  {
    id: 2,
    name: 'Jane Smith',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@bookedbarber.com',
    avatar: '/avatars/jane.jpg',
    role: 'barber'
  }
]

export default function CalendarTestPage() {
  const [viewMode, setViewMode] = useState<CalendarView>('week')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedBarberId, setSelectedBarberId] = useState<number | 'all'>('all')
  const [appointments, setAppointments] = useState(mockAppointments)

  const handleAppointmentUpdate = (appointmentId: number, newStartTime: string) => {
    console.log('🔄 Appointment update:', { appointmentId, newStartTime })
    
    // Update appointment in mock data to test optimistic updates
    setAppointments(prev => prev.map(apt => 
      apt.id === appointmentId 
        ? { ...apt, start_time: newStartTime, end_time: new Date(new Date(newStartTime).getTime() + apt.duration_minutes * 60000).toISOString() }
        : apt
    ))
  }

  const handleTimeSlotClick = (date: Date, barberId?: number) => {
    console.log('⏰ Time slot clicked:', { date, barberId })
  }

  const handleAppointmentClick = (appointment: any) => {
    console.log('📅 Appointment clicked:', appointment)
  }

  const handleDayClick = (date: Date) => {
    console.log('📆 Day clicked:', date)
  }

  const handleDayDoubleClick = (date: Date) => {
    console.log('📆📆 Day double-clicked:', date)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Calendar Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing UnifiedCalendar component with drag-and-drop functionality
          </p>
        </div>

        {/* View Controls */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded ${viewMode === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Day
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded ${viewMode === 'week' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Week
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded ${viewMode === 'month' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            Month
          </button>
        </div>

        {/* Calendar Component */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
          <UnifiedCalendar
            view={viewMode}
            onViewChange={setViewMode}
            currentDate={selectedDate}
            onDateChange={setSelectedDate}
            appointments={appointments}
            barbers={mockBarbers}
            selectedBarberId={selectedBarberId}
            onBarberSelect={setSelectedBarberId}
            onAppointmentClick={handleAppointmentClick}
            onTimeSlotClick={handleTimeSlotClick}
            onAppointmentUpdate={handleAppointmentUpdate}
            onDayClick={handleDayClick}
            onDayDoubleClick={handleDayDoubleClick}
            startHour={8}
            endHour={19}
            slotDuration={30}
            isLoading={false}
            className="h-[800px]"
          />
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Test Instructions:
          </h3>
          <ul className="text-blue-800 dark:text-blue-200 space-y-1 text-sm">
            <li>• Try dragging appointments to different time slots</li>
            <li>• Click on time slots to create new appointments</li>
            <li>• Double-click days for quick appointment creation</li>
            <li>• Use keyboard navigation (arrow keys, Enter, Escape)</li>
            <li>• Test touch gestures on mobile devices</li>
            <li>• Check console for interaction logs</li>
          </ul>
        </div>
      </div>
    </div>
  )
}