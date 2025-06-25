'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import RobustCalendar from '@/components/calendar/RobustCalendar'
import { CalendarAppointment } from '@/components/calendar/PremiumCalendar'
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext'
import {
  CloudIcon,
  BoltIcon,
  ShieldCheckIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

// Demo appointments
const demoAppointments: CalendarAppointment[] = [
  {
    id: 'demo-1',
    title: 'Hair Cut & Style',
    client: 'Sarah Johnson',
    clientId: 1,
    barber: 'Marcus Williams',
    barberId: 1,
    startTime: '10:00',
    endTime: '11:00',
    service: 'Premium Cut',
    serviceId: 1,
    price: 75,
    status: 'confirmed',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    clientPhone: '+1 (555) 123-4567',
    clientEmail: 'sarah.j@email.com'
  },
  {
    id: 'demo-2',
    title: 'Beard Trim & Shape',
    client: 'Mike Davis',
    clientId: 2,
    barber: 'Marcus Williams',
    barberId: 1,
    startTime: '14:00',
    endTime: '14:30',
    service: 'Beard Maintenance',
    serviceId: 2,
    price: 35,
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    duration: 30
  }
]

export default function CalendarGoogleDemoPage() {
  const searchParams = useSearchParams()
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(demoAppointments)
  const [authCode, setAuthCode] = useState<string | null>(null)

  // Check for Google auth callback
  useEffect(() => {
    const code = searchParams.get('google_auth_code')
    const error = searchParams.get('auth_error')

    if (code) {
      setAuthCode(code)
      // Clean up URL
      window.history.replaceState({}, '', '/calendar-google-demo')
    }

    if (error) {
      console.error('Google auth error:', error)
      // Clean up URL
      window.history.replaceState({}, '', '/calendar-google-demo')
    }
  }, [searchParams])

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    console.log('Appointment clicked:', appointment)
    alert(`Appointment Details:\n\nClient: ${appointment.client}\nService: ${appointment.service}\nTime: ${appointment.startTime} - ${appointment.endTime}\n\nWith Google Calendar sync, this appointment is automatically synchronized!`)
  }

  const handleTimeSlotClick = (date: string, time: string) => {
    console.log('Time slot clicked:', date, time)
  }

  const handleCreateAppointment = (date: string, time: string) => {
    const newAppointment: CalendarAppointment = {
      id: `demo-${Date.now()}`,
      title: 'New Appointment',
      client: 'New Client',
      clientId: 999,
      barber: 'Marcus Williams',
      barberId: 1,
      startTime: time,
      endTime: `${parseInt(time.split(':')[0]) + 1}:${time.split(':')[1]}`,
      service: 'Consultation',
      serviceId: 999,
      price: 0,
      status: 'pending',
      date: date,
      duration: 60
    }

    setAppointments([...appointments, newAppointment])
    alert(`New appointment created for ${date} at ${time}.\n\nWith Google Calendar sync enabled, this would automatically appear in your Google Calendar!`)
  }

  const handleUpdateAppointment = (appointment: CalendarAppointment) => {
    setAppointments(appointments.map(apt =>
      apt.id === appointment.id ? appointment : apt
    ))
  }

  const handleDeleteAppointment = (appointmentId: string) => {
    setAppointments(appointments.filter(apt => apt.id !== appointmentId))
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-blue-900/20 to-gray-900 px-6 py-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Google Calendar Integration Demo
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Experience seamless two-way synchronization between your booking system and Google Calendar
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <CloudIcon className="h-10 w-10 text-blue-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Real-time Sync</h3>
              <p className="text-gray-400 text-sm">
                Appointments sync instantly between your booking platform and Google Calendar
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <ArrowsRightLeftIcon className="h-10 w-10 text-green-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Two-way Updates</h3>
              <p className="text-gray-400 text-sm">
                Changes made in either calendar are automatically reflected in both
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <ShieldCheckIcon className="h-10 w-10 text-purple-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Conflict Resolution</h3>
              <p className="text-gray-400 text-sm">
                Smart conflict detection ensures no double-bookings or scheduling issues
              </p>
            </div>
          </div>

          {/* Additional Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <BoltIcon className="h-10 w-10 text-amber-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Offline Support</h3>
              <p className="text-gray-400 text-sm">
                Queue sync operations when offline and automatically sync when connected
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <CalendarDaysIcon className="h-10 w-10 text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Multi-Calendar</h3>
              <p className="text-gray-400 text-sm">
                Sync with multiple Google Calendars for different services or locations
              </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <ClockIcon className="h-10 w-10 text-indigo-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Auto Sync</h3>
              <p className="text-gray-400 text-sm">
                Set automatic sync intervals or trigger manual syncs as needed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Demo */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-2xl font-bold mb-6">Try the Google Calendar Integration</h2>

          {/* Instructions */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-400 mb-2">How to test:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-300">
              <li>Click "Connect" in the Google Calendar panel to authenticate</li>
              <li>Select which calendars to sync and set sync direction</li>
              <li>Create or modify appointments to see real-time sync</li>
              <li>Check your Google Calendar to see synced appointments</li>
              <li>Make changes in Google Calendar and watch them appear here</li>
            </ol>
          </div>

          {/* Calendar Component with Google Sync */}
          <RobustCalendar
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
            onTimeSlotClick={handleTimeSlotClick}
            onCreateAppointment={handleCreateAppointment}
            onUpdateAppointment={handleUpdateAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            enableGoogleSync={true}
            initialView="week"
            barbers={[
              { id: 1, name: 'Marcus Williams', color: '#8b5cf6' },
              { id: 2, name: 'James Thompson', color: '#06b6d4' }
            ]}
          />
        </div>

        {/* Integration Details */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Sync Configuration</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Choose sync direction: two-way, to Google only, or from Google only</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Set automatic sync intervals from 5 minutes to hourly</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">Enable/disable specific calendars for targeted sync</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-400 mr-2">✓</span>
                <span className="text-gray-300">View sync statistics and monitor sync health</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Security & Privacy</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">🔒</span>
                <span className="text-gray-300">OAuth 2.0 secure authentication with Google</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">🔒</span>
                <span className="text-gray-300">Minimal permissions - only calendar access requested</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">🔒</span>
                <span className="text-gray-300">Encrypted token storage with automatic refresh</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-400 mr-2">🔒</span>
                <span className="text-gray-300">Disconnect anytime to revoke access immediately</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Auth Code Handler */}
        {authCode && (
          <GoogleAuthHandler authCode={authCode} />
        )}
      </div>
    </div>
  )
}

// Component to handle Google auth callback
function GoogleAuthHandler({ authCode }: { authCode: string }) {
  const { handleAuthCallback } = useGoogleCalendar()

  useEffect(() => {
    handleAuthCallback(authCode).catch(console.error)
  }, [authCode, handleAuthCallback])

  return null
}
