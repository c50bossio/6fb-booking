'use client'

import React, { useState } from 'react'
import { UnifiedCalendar } from '@/components/UnifiedCalendar'
import type { CalendarView } from '@/components/UnifiedCalendar'

// Mock appointment data for testing
const mockAppointments = [
  {
    id: 1,
    client_name: "John Doe",
    start_time: new Date(2024, 11, 15, 10, 0).toISOString(),
    end_time: new Date(2024, 11, 15, 11, 0).toISOString(),
    status: "confirmed",
    service_name: "Haircut",
    barber_id: 1,
    location_id: 1,
    client_id: 1,
    notes: "Regular customer"
  },
  {
    id: 2,
    client_name: "Jane Smith",
    start_time: new Date(2024, 11, 15, 14, 30).toISOString(),
    end_time: new Date(2024, 11, 15, 15, 30).toISOString(),
    status: "pending",
    service_name: "Color & Cut",
    barber_id: 1,
    location_id: 1,
    client_id: 2,
    notes: "First time client"
  },
  {
    id: 3,
    client_name: "Mike Johnson",
    start_time: new Date(2024, 11, 16, 9, 0).toISOString(),
    end_time: new Date(2024, 11, 16, 10, 0).toISOString(),
    status: "completed",
    service_name: "Beard Trim",
    barber_id: 1,
    location_id: 1,
    client_id: 3,
    notes: "VIP client"
  }
]

export default function CalendarTestPage() {
  const [view, setView] = useState<CalendarView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Enhanced Calendar Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Testing the premium calendar enhancements with mock data
          </p>
          
          {/* View Switcher */}
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setView('day')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'day' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'week' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border'
              }`}
            >
              Week View
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'month' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border'
              }`}
            >
              Month View
            </button>
          </div>
        </div>

        {/* Enhanced Calendar */}
        <div className="h-[800px] border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
          <UnifiedCalendar
            view={view}
            currentDate={currentDate}
            appointments={mockAppointments}
            selectedBarberId="all"
            startHour={8}
            endHour={18}
            slotDuration={30}
            onDateChange={setCurrentDate}
            onTimeSlotClick={(date) => {
              console.log('Time slot clicked:', date)
            }}
            onAppointmentClick={(appointment) => {
              console.log('Appointment clicked:', appointment)
            }}
            onAppointmentUpdate={async (id, newTime) => {
              console.log('Appointment update:', id, newTime)
            }}
            isLoading={false}
            className="h-full"
          />
        </div>

        {/* Testing Info */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Testing Features:
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Premium glassmorphism styling and gradients</li>
            <li>• Enhanced appointment cards with service-specific colors</li>
            <li>• Smooth hover animations and transitions</li>
            <li>• Modern calendar header with calendar icon</li>
            <li>• Today indicator with pulsing animation</li>
            <li>• Click appointments and time slots to test interactions</li>
            <li>• Switch between day/week/month views</li>
          </ul>
        </div>
      </div>
    </div>
  )
}