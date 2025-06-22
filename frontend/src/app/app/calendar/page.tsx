'use client'

import { useState } from 'react'
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/outline'
import ModernCalendar from '@/components/ModernCalendar'

export default function CalendarPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">6FB Platform</h1>
              <nav className="ml-10 flex space-x-4">
                <a href="/app" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Dashboard
                </a>
                <a href="/app/calendar" className="text-gray-900 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Calendar
                </a>
                <a href="/app/analytics" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Analytics
                </a>
                <a href="/app/barbers" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Barbers
                </a>
                <a href="/app/payments" className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium">
                  Payments
                </a>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">Demo Mode</span>
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                D
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Calendar</h2>
              <p className="text-gray-600 mt-1">Manage appointments and schedules</p>
            </div>
            <button className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-violet-700 hover:to-purple-700 transition-all flex items-center space-x-2">
              <PlusIcon className="h-5 w-5" />
              <span>New Appointment</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <ModernCalendar />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm font-medium text-gray-600">Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">8 appointments</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm font-medium text-gray-600">This Week</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">42 appointments</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm font-medium text-gray-600">Available Slots</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">15 today</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <p className="text-sm font-medium text-gray-600">Cancellation Rate</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">2.3%</p>
          </div>
        </div>
      </main>
    </div>
  )
}