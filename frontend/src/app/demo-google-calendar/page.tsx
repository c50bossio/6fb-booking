'use client'

import React, { useState } from 'react'
import {
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XMarkIcon,
  CalendarIcon,
  Cog6ToothIcon,
  ClockIcon,
  EyeIcon,
  BellIcon
} from '@heroicons/react/24/outline'

// Mock data to show what the real interface looks like
const mockConnectionStatus = {
  connected: true,
  status: 'active',
  message: 'Google Calendar connected and active',
  google_email: 'demo@6fb.com',
  last_sync_date: new Date().toISOString(),
  calendar_id: 'primary'
}

const mockSettings = {
  auto_sync_enabled: true,
  sync_on_create: true,
  sync_on_update: true,
  sync_on_delete: false,
  sync_all_appointments: true,
  sync_only_confirmed: false,
  sync_only_paid: false,
  include_client_email: true,
  include_client_phone: true,
  include_service_price: false,
  include_notes: true,
  enable_reminders: true,
  reminder_email_minutes: 1440,
  reminder_popup_minutes: 15,
  event_visibility: 'private',
  show_client_name: true,
  show_service_details: true,
  timezone: 'America/New_York'
}

const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
]

const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Private' },
  { value: 'public', label: 'Public' },
  { value: 'default', label: 'Default' },
]

export default function DemoGoogleCalendarPage() {
  const [connectionStatus] = useState(mockConnectionStatus)
  const [settings, setSettings] = useState(mockSettings)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState({
    success: true,
    message: 'Successfully synced 5 appointments',
    synced_count: 5,
    failed_count: 0,
    errors: []
  })

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => {
      setSyncing(false)
      setSyncResult({
        success: true,
        message: 'Successfully synced 5 appointments',
        synced_count: 5,
        failed_count: 0,
        errors: []
      })
    }, 2000)
  }

  const handleSettingsChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const getStatusBadge = () => {
    if (!connectionStatus) return null

    switch (connectionStatus.status) {
      case 'active':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            <CheckIcon className="w-4 h-4 mr-1" />
            Connected
          </div>
        )
      case 'expired':
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
            <ExclamationTriangleIcon className="w-4 h-4 mr-1" />
            Needs Refresh
          </div>
        )
      default:
        return (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
            <XMarkIcon className="w-4 h-4 mr-1" />
            Error
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Google Calendar Integration - Full Demo
          </h1>
          <p className="text-gray-600">
            This is what the complete Google Calendar settings interface looks like when properly authenticated.
          </p>
        </div>

        <div className="space-y-6">
          {/* Connection Status Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" />
                Google Calendar Connection
              </h3>
              {getStatusBadge()}
            </div>

            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                {connectionStatus?.message}
              </div>

              {connectionStatus?.google_email && (
                <div className="text-sm">
                  <strong className="text-gray-900">Connected Account:</strong> {connectionStatus.google_email}
                </div>
              )}

              {connectionStatus?.last_sync_date && (
                <div className="text-sm">
                  <strong className="text-gray-900">Last Sync:</strong> {new Date(connectionStatus.last_sync_date).toLocaleString()}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {syncing ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="w-4 h-4 mr-2" />
                      Sync Now
                    </>
                  )}
                </button>
                <button className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                  <XMarkIcon className="w-4 h-4 mr-2" />
                  Disconnect
                </button>
              </div>
            </div>

            {/* Sync Result */}
            {syncResult && (
              <div className={`mt-4 p-4 rounded-lg border ${syncResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="text-sm">
                  <strong>Sync Result:</strong> {syncResult.message}
                  <br />
                  <strong>Synced:</strong> {syncResult.synced_count} appointments
                  {syncResult.failed_count > 0 && (
                    <>
                      <br />
                      <strong>Failed:</strong> {syncResult.failed_count} appointments
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sync Settings Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Cog6ToothIcon className="w-5 h-5 mr-2 text-gray-600" />
                Sync Settings
              </h3>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                Save Settings
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Sync Options */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <ArrowPathIcon className="w-4 h-4 mr-2" />
                  Automatic Sync
                </h4>
                <div className="space-y-3 ml-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.auto_sync_enabled}
                      onChange={(e) => handleSettingsChange('auto_sync_enabled', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable automatic sync</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.sync_on_create}
                      onChange={(e) => handleSettingsChange('sync_on_create', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Sync when appointments are created</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.sync_on_update}
                      onChange={(e) => handleSettingsChange('sync_on_update', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Sync when appointments are updated</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.sync_on_delete}
                      onChange={(e) => handleSettingsChange('sync_on_delete', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Remove from calendar when appointments are deleted</span>
                  </label>
                </div>
              </div>

              {/* What to Sync */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">What to Sync</h4>
                <div className="space-y-2 ml-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="sync_filter"
                      checked={settings.sync_all_appointments}
                      onChange={() => {
                        handleSettingsChange('sync_all_appointments', true)
                        handleSettingsChange('sync_only_confirmed', false)
                        handleSettingsChange('sync_only_paid', false)
                      }}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">All appointments</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="sync_filter"
                      checked={settings.sync_only_confirmed}
                      onChange={() => {
                        handleSettingsChange('sync_all_appointments', false)
                        handleSettingsChange('sync_only_confirmed', true)
                        handleSettingsChange('sync_only_paid', false)
                      }}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Only confirmed appointments</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="sync_filter"
                      checked={settings.sync_only_paid}
                      onChange={() => {
                        handleSettingsChange('sync_all_appointments', false)
                        handleSettingsChange('sync_only_confirmed', false)
                        handleSettingsChange('sync_only_paid', true)
                      }}
                      className="border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Only paid appointments</span>
                  </label>
                </div>
              </div>

              {/* Event Information */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <EyeIcon className="w-4 h-4 mr-2" />
                  Event Information
                </h4>
                <div className="space-y-3 ml-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.show_client_name}
                      onChange={(e) => handleSettingsChange('show_client_name', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Show client name in event title</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.include_client_email}
                      onChange={(e) => handleSettingsChange('include_client_email', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Include client email in event</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.include_service_price}
                      onChange={(e) => handleSettingsChange('include_service_price', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Include service price in description</span>
                  </label>
                </div>
              </div>

              {/* Reminders */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <BellIcon className="w-4 h-4 mr-2" />
                  Reminders
                </h4>
                <div className="space-y-3 ml-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.enable_reminders}
                      onChange={(e) => handleSettingsChange('enable_reminders', e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Enable reminders</span>
                  </label>
                  {settings.enable_reminders && (
                    <div className="ml-6 space-y-3">
                      <div className="flex items-center space-x-3">
                        <label className="text-sm text-gray-700 w-32">Email reminder:</label>
                        <select
                          value={settings.reminder_email_minutes}
                          onChange={(e) => handleSettingsChange('reminder_email_minutes', parseInt(e.target.value))}
                          className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value={1440}>1 day before</option>
                          <option value={720}>12 hours before</option>
                          <option value={240}>4 hours before</option>
                          <option value={60}>1 hour before</option>
                        </select>
                      </div>
                      <div className="flex items-center space-x-3">
                        <label className="text-sm text-gray-700 w-32">Popup reminder:</label>
                        <select
                          value={settings.reminder_popup_minutes}
                          onChange={(e) => handleSettingsChange('reminder_popup_minutes', parseInt(e.target.value))}
                          className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value={30}>30 minutes before</option>
                          <option value={15}>15 minutes before</option>
                          <option value={10}>10 minutes before</option>
                          <option value={5}>5 minutes before</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Privacy & Display */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Privacy & Display</h4>
                <div className="space-y-3 ml-6">
                  <div className="flex items-center space-x-3">
                    <label className="text-sm text-gray-700 w-32">Event visibility:</label>
                    <select
                      value={settings.event_visibility}
                      onChange={(e) => handleSettingsChange('event_visibility', e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {VISIBILITY_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center space-x-3">
                    <label className="text-sm text-gray-700 w-32">Timezone:</label>
                    <select
                      value={settings.timezone}
                      onChange={(e) => handleSettingsChange('timezone', e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {TIMEZONE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Demo Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  This is what the real Google Calendar interface looks like!
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>When properly authenticated, users see:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Complete connection status with email and sync info</li>
                    <li>Comprehensive sync settings and controls</li>
                    <li>Reminder configuration options</li>
                    <li>Privacy and timezone settings</li>
                    <li>Manual sync and disconnect functionality</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
