'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { getMyBookings, type BookingResponse, type BookingListResponse } from '@/lib/api'

/**
 * CLEAN CALENDAR IMPLEMENTATION
 * 
 * This is a minimal, reliable calendar without:
 * - Complex performance monitoring
 * - Multiple interconnected hooks
 * - Console overrides that cause stack overflow
 * - Memory monitoring that triggers cascading updates
 */

interface CalendarView {
  view: 'day' | 'week' | 'month'
  selectedDate: Date
}

export default function CleanCalendarPage() {
  // Simple, stable state management
  const [view, setView] = useState<CalendarView>({
    view: 'week',
    selectedDate: new Date()
  })
  const [bookings, setBookings] = useState<BookingResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load bookings - simple, no complex caching
  useEffect(() => {
    const loadBookings = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await getMyBookings()
        // Extract bookings array from the response object
        setBookings(response?.bookings || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bookings')
        setBookings([])
      } finally {
        setLoading(false)
      }
    }

    loadBookings()
  }, []) // No complex dependencies

  // Simple date navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(view.selectedDate)
    
    if (view.view === 'day') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    } else if (view.view === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    }
    
    setView(prev => ({ ...prev, selectedDate: newDate }))
  }

  // Simple view switching
  const switchView = (newView: 'day' | 'week' | 'month') => {
    setView(prev => ({ ...prev, view: newView }))
  }

  // Loading state
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="text-red-600 font-semibold mb-2">Calendar Error</div>
            <div className="text-red-700">{error}</div>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Calendar - {format(view.selectedDate, 'MMMM yyyy')}
        </h1>
        
        {/* View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border">
            {(['day', 'week', 'month'] as const).map((viewType) => (
              <Button
                key={viewType}
                onClick={() => switchView(viewType)}
                variant={view.view === viewType ? 'default' : 'ghost'}
                size="sm"
                className="capitalize"
              >
                {viewType}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button onClick={() => navigateDate('prev')} variant="outline">
          ← Previous
        </Button>
        
        <div className="text-lg font-semibold">
          {view.view === 'day' && format(view.selectedDate, 'EEEE, MMMM d, yyyy')}
          {view.view === 'week' && `Week of ${format(view.selectedDate, 'MMM d, yyyy')}`}
          {view.view === 'month' && format(view.selectedDate, 'MMMM yyyy')}
        </div>
        
        <Button onClick={() => navigateDate('next')} variant="outline">
          Next →
        </Button>
      </div>

      {/* Calendar Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Your Appointments ({bookings.length})
            </h2>
            <Button size="sm">
              + New Appointment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-lg mb-2">No appointments scheduled</div>
              <div>Book your first appointment to get started</div>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.slice(0, 10).map((booking) => (
                <div 
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <div className="font-semibold">{booking.service_name}</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(booking.start_time), 'MMM d, yyyy • h:mm a')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {booking.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simple Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{bookings.length}</div>
            <div className="text-sm text-gray-600">Total Appointments</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {bookings.filter(b => b.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {bookings.filter(b => b.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}