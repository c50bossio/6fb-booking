'use client'

import { useState } from 'react'
import BookingCalendar from '@/components/booking/BookingCalendar'

export default function BookingCalendarDemo() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Generate some sample available dates
  const availableDates = generateAvailableDates()

  function generateAvailableDates() {
    const dates: string[] = []
    const today = new Date()
    
    // Add some random dates in the next 90 days
    for (let i = 0; i < 30; i++) {
      const randomDaysAhead = Math.floor(Math.random() * 90) + 1
      const date = new Date(today)
      date.setDate(date.getDate() + randomDaysAhead)
      
      const dateString = formatDateString(date)
      if (!dates.includes(dateString)) {
        dates.push(dateString)
      }
    }
    
    return dates.sort()
  }

  function formatDateString(date: Date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Booking Calendar Demo
        </h1>

        <div className="mb-8 text-center">
          <p className="text-gray-600 mb-2">
            Selected Date: {selectedDate || 'None'}
          </p>
          <p className="text-sm text-gray-500">
            Green dots indicate available dates
          </p>
        </div>

        <BookingCalendar
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          availableDates={availableDates}
        />

        <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Component Props</h2>
          <pre className="bg-gray-50 p-4 rounded-lg text-sm overflow-x-auto">
{`<BookingCalendar
  selectedDate={selectedDate}
  onDateSelect={setSelectedDate}
  availableDates={availableDates}
  minDate={new Date()} // optional
  maxDate={new Date(...)} // optional
/>`}
          </pre>

          <h3 className="text-lg font-semibold mt-6 mb-2">Features:</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            <li>Month navigation with arrow buttons</li>
            <li>Today's date highlighted with a ring</li>
            <li>Past dates are grayed out and unclickable</li>
            <li>Selected date has slate-700 background</li>
            <li>Green dots indicate available dates</li>
            <li>Mobile responsive design</li>
            <li>Customizable min/max date range</li>
          </ul>
        </div>
      </div>
    </div>
  )
}