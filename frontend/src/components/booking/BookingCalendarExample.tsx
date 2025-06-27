'use client'

import React, { useState, useEffect } from 'react'
import BookingCalendar from './BookingCalendar'

interface BookingCalendarExampleProps {
  barberId?: number
  serviceId?: number
  onDateSelected?: (date: string) => void
}

export default function BookingCalendarExample({
  barberId,
  serviceId,
  onDateSelected,
}: BookingCalendarExampleProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate fetching available dates from API
    const fetchAvailableDates = async () => {
      setLoading(true)
      try {
        // In a real implementation, this would be an API call like:
        // const response = await fetch(`/api/barbers/${barberId}/availability?service_id=${serviceId}`)
        // const data = await response.json()
        // setAvailableDates(data.availableDates)

        // For demo purposes, generate random available dates
        const dates: string[] = []
        const today = new Date()

        for (let i = 0; i < 90; i++) {
          const date = new Date(today)
          date.setDate(date.getDate() + i)

          // Skip Sundays and randomly skip some other days
          if (date.getDay() !== 0 && Math.random() > 0.3) {
            const dateString = formatDateString(date)
            dates.push(dateString)
          }
        }

        setAvailableDates(dates)
      } catch (error) {
        console.error('Error fetching available dates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailableDates()
  }, [barberId, serviceId])

  const formatDateString = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const handleDateSelect = (date: string) => {
    setSelectedDate(date)
    onDateSelected?.(date)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Select a Date
        </h2>
        <p className="text-gray-600">
          Choose an available date for your appointment
        </p>
      </div>

      <BookingCalendar
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        availableDates={availableDates}
      />

      {selectedDate && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 text-center">
            You selected: {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      )}
    </div>
  )
}
