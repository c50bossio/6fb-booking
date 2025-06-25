'use client'

import React, { useState, useEffect } from 'react'
import { useGoogleCalendar } from '@/contexts/GoogleCalendarContext'
import {
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  CalendarIcon,
  ArrowsRightLeftIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline'
import { GoogleCalendar } from '@/lib/google-calendar/types'

export default function GoogleCalendarSync() {
  const {
    authState,
    syncState,
    signIn,
    signOut,
    syncNow,
    startAutoSync,
    stopAutoSync,
    getCalendars,
    enableCalendarSync,
    disableCalendarSync,
    resolveConflict
  } = useGoogleCalendar()

  const [isExpanded, setIsExpanded] = useState(false)
  const [availableCalendars, setAvailableCalendars] = useState<GoogleCalendar[]>([])
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [syncInterval, setSyncInterval] = useState(5)
  const [showConflicts, setShowConflicts] = useState(false)

  // Load calendars when authenticated
  useEffect(() => {
    if (authState.isSignedIn) {
      getCalendars().then(setAvailableCalendars)
    }
  }, [authState.isSignedIn, getCalendars])

  const handleAutoSyncToggle = () => {
    if (autoSyncEnabled) {
      stopAutoSync()
      setAutoSyncEnabled(false)
    } else {
      startAutoSync(syncInterval)
      setAutoSyncEnabled(true)
    }
  }

  const getSyncStatusIcon = () => {
    if (syncState.isSyncing) {
      return <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-400" />
    }
    if (syncState.syncError) {
      return <XCircleIcon className="h-5 w-5 text-red-400" />
    }
    if (syncState.conflictQueue.length > 0) {
      return <ExclamationTriangleIcon className="h-5 w-5 text-amber-400" />
    }
    if (syncState.lastSyncTime) {
      return <CheckCircleIcon className="h-5 w-5 text-green-400" />
    }
    return <CloudArrowUpIcon className="h-5 w-5 text-gray-400" />
  }

  const getSyncStatusText = () => {
    if (syncState.isSyncing) return 'Syncing...'
    if (syncState.syncError) return 'Sync failed'
    if (syncState.conflictQueue.length > 0) return `${syncState.conflictQueue.length} conflicts`
    if (syncState.lastSyncTime) {
      const timeDiff = Date.now() - syncState.lastSyncTime.getTime()
      const minutes = Math.floor(timeDiff / 60000)
      if (minutes < 1) return 'Just synced'
      if (minutes < 60) return `Synced ${minutes}m ago`
      const hours = Math.floor(minutes / 60)
      return `Synced ${hours}h ago`
    }
    return 'Not synced'
  }

  if (!authState.isSignedIn) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-700 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Google Calendar Sync</h3>
              <p className="text-xs text-gray-400">Connect to sync your appointments</p>
            </div>
          </div>
          <button
            onClick={signIn}
            disabled={authState.isLoading}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authState.isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-700 rounded-lg">
              <CalendarIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-100">Google Calendar</h3>
              <div className="flex items-center space-x-2 text-xs">
                {getSyncStatusIcon()}
                <span className="text-gray-400">{getSyncStatusText()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={syncNow}
              disabled={syncState.isSyncing}
              className="p-2 text-gray-400 hover:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Sync now"
            >
              <ArrowPathIcon className={`h-5 w-5 ${syncState.isSyncing ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-400 hover:text-gray-100 transition-colors"
            >
              {isExpanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700">
          {/* User Info */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {authState.user?.imageUrl && (
                  <img
                    src={authState.user.imageUrl}
                    alt={authState.user.name}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-100">{authState.user?.name}</p>
                  <p className="text-xs text-gray-400">{authState.user?.email}</p>
                </div>
              </div>
              <button
                onClick={signOut}
                className="text-xs text-gray-400 hover:text-gray-100 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>

          {/* Auto Sync Settings */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-100">Auto Sync</label>
              <button
                onClick={handleAutoSyncToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoSyncEnabled ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {autoSyncEnabled && (
              <div className="mt-2">
                <label className="text-xs text-gray-400">Sync interval (minutes)</label>
                <select
                  value={syncInterval}
                  onChange={(e) => {
                    const newInterval = parseInt(e.target.value)
                    setSyncInterval(newInterval)
                    if (autoSyncEnabled) {
                      stopAutoSync()
                      startAutoSync(newInterval)
                    }
                  }}
                  className="mt-1 block w-full rounded-md bg-gray-700 border-gray-600 text-gray-100 text-sm"
                >
                  <option value="5">Every 5 minutes</option>
                  <option value="10">Every 10 minutes</option>
                  <option value="15">Every 15 minutes</option>
                  <option value="30">Every 30 minutes</option>
                  <option value="60">Every hour</option>
                </select>
              </div>
            )}
          </div>

          {/* Calendars */}
          <div className="p-4 border-b border-gray-700">
            <h4 className="text-sm font-medium text-gray-100 mb-3">Synced Calendars</h4>
            <div className="space-y-2">
              {availableCalendars.map((calendar) => {
                const syncedCalendar = syncState.syncedCalendars.find(c => c.id === calendar.id)
                const isEnabled = syncedCalendar?.isEnabled || false
                const syncDirection = syncedCalendar?.syncDirection || 'both'

                return (
                  <div key={calendar.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-700/50">
                    <div className="flex items-center space-x-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: calendar.backgroundColor || '#4285f4' }}
                      />
                      <span className="text-sm text-gray-100">{calendar.summary}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isEnabled && (
                        <select
                          value={syncDirection}
                          onChange={(e) => enableCalendarSync(calendar.id!, e.target.value as any)}
                          className="text-xs rounded bg-gray-700 border-gray-600 text-gray-300"
                        >
                          <option value="both">↔ Both ways</option>
                          <option value="to-google">→ To Google</option>
                          <option value="from-google">← From Google</option>
                        </select>
                      )}

                      <button
                        onClick={() => {
                          if (isEnabled) {
                            disableCalendarSync(calendar.id!)
                          } else {
                            enableCalendarSync(calendar.id!, 'both')
                          }
                        }}
                        className={`text-xs px-2 py-1 rounded transition-colors ${
                          isEnabled
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {isEnabled ? 'Enabled' : 'Enable'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sync Stats */}
          <div className="p-4 border-b border-gray-700">
            <h4 className="text-sm font-medium text-gray-100 mb-3">Sync Statistics</h4>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-400">{syncState.syncStats.created}</p>
                <p className="text-xs text-gray-400">Created</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-400">{syncState.syncStats.updated}</p>
                <p className="text-xs text-gray-400">Updated</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{syncState.syncStats.deleted}</p>
                <p className="text-xs text-gray-400">Deleted</p>
              </div>
            </div>
          </div>

          {/* Conflicts */}
          {syncState.conflictQueue.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-100">Conflicts ({syncState.conflictQueue.length})</h4>
                <button
                  onClick={() => setShowConflicts(!showConflicts)}
                  className="text-xs text-gray-400 hover:text-gray-100"
                >
                  {showConflicts ? 'Hide' : 'Show'}
                </button>
              </div>

              {showConflicts && (
                <div className="space-y-2">
                  {syncState.conflictQueue.map((conflict) => (
                    <div key={conflict.id} className="p-3 rounded-lg bg-amber-900/20 border border-amber-700/50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-100">
                            {conflict.localData.title}
                          </p>
                          <p className="text-xs text-amber-300 mt-1">
                            Local: {conflict.localData.date} {conflict.localData.startTime}
                          </p>
                          <p className="text-xs text-amber-300">
                            Google: {new Date(conflict.googleData.start?.dateTime || '').toLocaleString()}
                          </p>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={() => resolveConflict(conflict.id, 'local')}
                            className="text-xs px-2 py-1 bg-amber-600 text-white rounded hover:bg-amber-700"
                          >
                            Use Local
                          </button>
                          <button
                            onClick={() => resolveConflict(conflict.id, 'google')}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Use Google
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
