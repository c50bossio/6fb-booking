'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CalendarSync from '@/components/CalendarSync'
import { calendarAPI } from '@/lib/api'
import { CheckCircle, XCircle, Calendar, Link, Settings, RefreshCw } from 'lucide-react'

interface CalendarStatus {
  connected: boolean
  valid?: boolean
  calendar_count?: number
  selected_calendar_id?: string
  error?: string
}

interface GoogleCalendar {
  id: string
  summary: string
  primary: boolean
  accessRole: string
  timeZone?: string
}

export default function CalendarSettingsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkCalendarStatus()
  }, [])

  const checkCalendarStatus = async () => {
    try {
      setLoading(true)
      const response = await calendarAPI.getStatus()
      setStatus(response)
      
      if (response.connected && response.valid) {
        // Fetch available calendars
        const calendarList = await calendarAPI.listCalendars()
        setCalendars(calendarList.calendars)
        setSelectedCalendarId(response.selected_calendar_id || null)
      }
    } catch (err) {
      console.error('Error checking calendar status:', err)
      setError('Failed to check calendar connection status')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    try {
      setConnecting(true)
      setError(null)
      const { authorization_url } = await calendarAPI.initiateAuth()
      // Redirect to Google OAuth
      window.location.href = authorization_url
    } catch (err) {
      console.error('Error initiating calendar connection:', err)
      setError('Failed to start calendar connection')
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    if (confirm('Are you sure you want to disconnect your Google Calendar? This will stop all syncing.')) {
      try {
        await calendarAPI.disconnect()
        setStatus({ connected: false })
        setCalendars([])
        setSelectedCalendarId(null)
      } catch (err) {
        console.error('Error disconnecting calendar:', err)
        setError('Failed to disconnect calendar')
      }
    }
  }

  const handleSelectCalendar = async (calendarId: string) => {
    try {
      await calendarAPI.selectCalendar(calendarId)
      setSelectedCalendarId(calendarId)
      setError(null)
    } catch (err) {
      console.error('Error selecting calendar:', err)
      setError('Failed to select calendar')
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <RefreshCw className="animate-spin h-8 w-8 text-primary-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar Settings</h1>
        <p className="text-gray-600">Manage your Google Calendar integration and sync preferences</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Connection Status Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Google Calendar Connection</h2>
          <div className="flex items-center gap-2">
            {status?.connected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">Connected</span>
              </>
            ) : (
              <>
                <XCircle className="h-5 w-5 text-gray-400" />
                <span className="text-sm font-medium text-gray-600">Not Connected</span>
              </>
            )}
          </div>
        </div>

        {!status?.connected ? (
          <div className="space-y-4">
            <p className="text-gray-600">
              Connect your Google Calendar to enable two-way sync, prevent double-booking, 
              and keep all your appointments in one place.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Link className="h-4 w-4" />
              {connecting ? 'Connecting...' : 'Connect Google Calendar'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {status.valid ? (
              <p className="text-green-700 text-sm">
                Your Google Calendar is connected and working properly.
              </p>
            ) : (
              <p className="text-yellow-700 text-sm">
                Connection established but there may be an issue. Try reconnecting.
              </p>
            )}
            
            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Disconnect Calendar
            </button>
          </div>
        )}
      </div>

      {/* Calendar Selection */}
      {status?.connected && calendars.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Calendar for Syncing</h2>
          <p className="text-gray-600 mb-4">
            Choose which calendar to sync your appointments with:
          </p>
          
          <div className="space-y-2">
            {calendars.map((calendar) => (
              <label
                key={calendar.id}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedCalendarId === calendar.id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="calendar"
                  value={calendar.id}
                  checked={selectedCalendarId === calendar.id}
                  onChange={() => handleSelectCalendar(calendar.id)}
                  className="mt-1 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <span className="font-medium text-gray-900">{calendar.summary}</span>
                    {calendar.primary && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Primary</span>
                    )}
                  </div>
                  {calendar.timeZone && (
                    <p className="text-sm text-gray-500 mt-1">
                      Timezone: {calendar.timeZone}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    Access: {calendar.accessRole}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Sync Settings and Controls */}
      {status?.connected && selectedCalendarId && (
        <CalendarSync />
      )}

      {/* Sync Preferences */}
      {status?.connected && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sync Preferences</h2>
          
          <div className="space-y-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 text-primary-600 focus:ring-primary-500 rounded"
              />
              <div>
                <p className="font-medium text-gray-900">Auto-sync new appointments</p>
                <p className="text-sm text-gray-600">
                  Automatically add new bookings to your Google Calendar
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 text-primary-600 focus:ring-primary-500 rounded"
              />
              <div>
                <p className="font-medium text-gray-900">Sync cancellations</p>
                <p className="text-sm text-gray-600">
                  Remove cancelled appointments from your Google Calendar
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                defaultChecked
                className="mt-1 text-primary-600 focus:ring-primary-500 rounded"
              />
              <div>
                <p className="font-medium text-gray-900">Include client details</p>
                <p className="text-sm text-gray-600">
                  Add client name and service details to calendar events
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1 text-primary-600 focus:ring-primary-500 rounded"
              />
              <div>
                <p className="font-medium text-gray-900">Block busy times</p>
                <p className="text-sm text-gray-600">
                  Prevent bookings during times marked as busy in Google Calendar
                </p>
              </div>
            </label>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Save Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  )
}