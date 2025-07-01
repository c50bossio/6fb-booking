'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import CalendarSync from '@/components/CalendarSync'
import CalendarConflictResolver from '@/components/CalendarConflictResolver'
import { calendarAPI, getProfile, type User as ApiUser } from '@/lib/api'
import { CheckCircle, XCircle, Calendar, Link, Settings, RefreshCw, AlertTriangle, Repeat } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'

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

// Use the imported User type from API
type User = ApiUser

export default function CalendarSettingsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<CalendarStatus | null>(null)
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'connection' | 'sync' | 'conflicts' | 'preferences'>('connection')

  useEffect(() => {
    checkCalendarStatus()
    checkUserAuth()
  }, [])

  const checkUserAuth = async () => {
    try {
      const userData = await getProfile()
      setUser(userData)
      
      // Check if user has barber role
      if (!userData || userData.role !== 'barber') {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error checking user auth:', error)
      router.push('/login')
    }
  }

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
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar Settings</h1>
            <p className="text-gray-600">Manage your calendar integration, sync preferences, and conflict resolution</p>
          </div>
          <button
            onClick={() => router.push('/recurring')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Repeat className="h-4 w-4" />
            Recurring Appointments
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('connection')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'connection'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Connection
            </div>
          </button>
          
          {status?.connected && (
            <>
              <button
                onClick={() => setActiveTab('sync')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'sync'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Sync Status
                </div>
              </button>

              <button
                onClick={() => setActiveTab('conflicts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'conflicts'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Conflicts
                </div>
              </button>

              <button
                onClick={() => setActiveTab('preferences')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'preferences'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Preferences
                </div>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Connection Tab */}
        {activeTab === 'connection' && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Google Calendar Connection</CardTitle>
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
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>

            {/* Calendar Selection */}
            {status?.connected && calendars.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Calendar for Syncing</CardTitle>
                  <CardDescription>Choose which calendar to sync your appointments with</CardDescription>
                </CardHeader>
                <CardContent>
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
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Sync Status Tab */}
        {activeTab === 'sync' && status?.connected && selectedCalendarId && (
          <CalendarSync />
        )}

        {/* Conflicts Tab */}
        {activeTab === 'conflicts' && status?.connected && (
          <CalendarConflictResolver />
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && status?.connected && (
          <Card>
            <CardHeader>
              <CardTitle>Sync Preferences</CardTitle>
              <CardDescription>Configure how appointments sync with your calendar</CardDescription>
            </CardHeader>
            <CardContent>
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

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="mt-1 text-primary-600 focus:ring-primary-500 rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Add reminders</p>
                    <p className="text-sm text-gray-600">
                      Include default reminders for appointments (15 minutes before)
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 text-primary-600 focus:ring-primary-500 rounded"
                  />
                  <div>
                    <p className="font-medium text-gray-900">Color-code by service</p>
                    <p className="text-sm text-gray-600">
                      Use different colors for different service types in Google Calendar
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200 flex items-center justify-between">
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Save Preferences
                </button>
                
                <button
                  onClick={() => router.push('/recurring')}
                  className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-2"
                >
                  <Repeat className="h-4 w-4" />
                  Manage Recurring Appointments
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Show message when not connected for tabs that require connection */}
        {(activeTab === 'sync' || activeTab === 'conflicts' || activeTab === 'preferences') && !status?.connected && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Connect Your Calendar First</h3>
                <p className="text-gray-600 mb-4">
                  You need to connect your Google Calendar to access {activeTab} settings.
                </p>
                <button
                  onClick={() => setActiveTab('connection')}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  Go to Connection Settings
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}