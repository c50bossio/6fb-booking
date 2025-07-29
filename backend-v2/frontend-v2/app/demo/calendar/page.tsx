'use client'

import React, { useState } from 'react'
import { CalendarWithBookingModal } from '@/components/calendar/CalendarWithBookingModal'

// Mock appointment data for testing
const mockAppointments = [
  {
    id: 1,
    client_name: 'John Doe',
    service_name: 'Haircut',
    start_time: '2025-01-28T10:00:00',
    end_time: '2025-01-28T11:00:00',
    barber_name: 'Marcus',
    status: 'confirmed'
  },
  {
    id: 2,
    client_name: 'Jane Smith',
    service_name: 'Beard Trim',
    start_time: '2025-01-28T14:30:00',
    end_time: '2025-01-28T15:00:00',
    barber_name: 'Diego',
    status: 'confirmed'
  },
  {
    id: 3,
    client_name: 'Mike Johnson',
    service_name: 'Full Service',
    start_time: '2025-01-29T09:00:00',
    end_time: '2025-01-29T10:30:00',
    barber_name: 'Marcus',
    status: 'pending'
  }
]

export default function CalendarDemoPage() {
  // Use a stable date to prevent hydration errors
  const [currentDate, setCurrentDate] = useState(() => new Date('2025-07-28T12:00:00'))
  const [appointments, setAppointments] = useState(mockAppointments)
  
  // Stable today for demo mode to prevent hydration errors
  const stableToday = new Date('2025-07-28T12:00:00')

  const handleAppointmentCreated = (newAppointment: any) => {
    console.log('New appointment created:', newAppointment)
    // Add the new appointment to the list
    setAppointments(prev => [...prev, {
      ...newAppointment,
      id: Date.now() // Simple ID generation for demo
    }])
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Calendar System Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing calendar components without authentication
          </p>
        </div>

        {/* Date Controls */}
        <div className="mb-6 flex items-center gap-4">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000))}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg"
          >
            Previous Week
          </button>
          <span className="text-lg font-medium text-gray-900 dark:text-white">
            {currentDate.getFullYear()}-{String(currentDate.getMonth() + 1).padStart(2, '0')}-{String(currentDate.getDate()).padStart(2, '0')}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000))}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg"
          >
            Next Week
          </button>
          <button
            onClick={() => setCurrentDate(stableToday)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
          >
            Today
          </button>
        </div>

        {/* Appointment Count */}
        <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
          Total Appointments: {appointments.length}
        </div>

        {/* Calendar Component */}
        <CalendarWithBookingModal
          currentDate={currentDate}
          appointments={appointments}
          onAppointmentCreated={handleAppointmentCreated}
          className="shadow-lg"
          isDemo={true}
        />

        {/* Debug Info */}
        <div className="mt-8 p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Debug Information</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <p>Current Date: {currentDate.getFullYear()}-{String(currentDate.getMonth() + 1).padStart(2, '0')}-{String(currentDate.getDate()).padStart(2, '0')}</p>
            <p>Appointments Count: {appointments.length}</p>
            <p>Calendar Component: CalendarWithBookingModal</p>
          </div>
        </div>
      </div>
    </div>
  )
}