'use client'

import { useState, useEffect } from 'react'
import { calendarAPI } from '@/lib/api'
import { RefreshCw, AlertCircle, CheckCircle, Clock, Calendar, Info } from 'lucide-react'
import { format } from 'date-fns'

interface SyncStatus {
  connected: boolean
  total_appointments: number
  synced_appointments: number
  unsynced_appointments: number
  sync_percentage: number
  last_sync?: string
  error?: string
}

interface SyncResult {
  success: number
  failed: number
  conflicts: number
  errors: string[]
}

export default function CalendarSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    fetchSyncStatus()
  }, [])

  const fetchSyncStatus = async () => {
    try {
      setLoading(true)
      const status = await calendarAPI.getSyncStatus()
      setSyncStatus(status)
    } catch (error) {
      console.error('Error fetching sync status:', error)
      setSyncStatus({
        connected: false,
        total_appointments: 0,
        synced_appointments: 0,
        unsynced_appointments: 0,
        sync_percentage: 0,
        error: 'Failed to fetch sync status'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      setSyncResult(null)
      
      const result = await calendarAPI.bulkSync({
        start_date: new Date(dateRange.start).toISOString(),
        end_date: new Date(dateRange.end).toISOString()
      })

      setSyncResult({
        success: result.results.synced || 0,
        failed: result.results.failed || 0,
        conflicts: result.results.conflicts || 0,
        errors: result.results.errors || []
      })

      // Refresh sync status
      await fetchSyncStatus()
    } catch (error) {
      console.error('Error syncing appointments:', error)
      setSyncResult({
        success: 0,
        failed: 0,
        conflicts: 0,
        errors: ['Failed to sync appointments']
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleCleanupOrphaned = async () => {
    if (!confirm('This will remove calendar events that no longer have matching appointments. Continue?')) {
      return
    }

    try {
      setSyncing(true)
      const result = await calendarAPI.cleanupOrphaned()
      
      // Show result in sync result format
      setSyncResult({
        success: result.results.deleted || 0,
        failed: 0,
        conflicts: 0,
        errors: result.results.errors || []
      })

      await fetchSyncStatus()
    } catch (error) {
      console.error('Error cleaning up orphaned events:', error)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="animate-spin h-6 w-6 text-primary-600" />
        </div>
      </div>
    )
  }

  if (!syncStatus) {
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Calendar Sync Status</h2>
        <button
          onClick={fetchSyncStatus}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          title="Refresh status"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Sync Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-600">Total Appointments</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{syncStatus.total_appointments}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">Synced</span>
          </div>
          <p className="text-2xl font-bold text-green-900">{syncStatus.synced_appointments}</p>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-600">Not Synced</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900">{syncStatus.unsynced_appointments}</p>
        </div>

        <div className="bg-primary-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-primary-600" />
            <span className="text-sm font-medium text-primary-600">Sync Rate</span>
          </div>
          <p className="text-2xl font-bold text-primary-900">{syncStatus.sync_percentage}%</p>
        </div>
      </div>

      {/* Progress Bar */}
      {syncStatus.total_appointments > 0 && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${syncStatus.sync_percentage}%` }}
            />
          </div>
          {syncStatus.last_sync && (
            <p className="text-sm text-gray-600 mt-2">
              Last sync: {format(new Date(syncStatus.last_sync), 'MMM d, yyyy h:mm a')}
            </p>
          )}
        </div>
      )}

      {/* Sync Controls */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900">Sync Appointments</h3>
        
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="bg-white dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {/* Sync Result */}
        {syncResult && (
          <div className={`mt-4 p-4 rounded-lg ${
            syncResult.errors.length > 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-green-50 border border-green-200'
          }`}>
            <h4 className="font-medium mb-2">Sync Complete</h4>
            <div className="space-y-1 text-sm">
              {syncResult.success > 0 && (
                <p className="text-green-700">✓ {syncResult.success} appointments synced successfully</p>
              )}
              {syncResult.conflicts > 0 && (
                <p className="text-yellow-700">⚠ {syncResult.conflicts} conflicts detected</p>
              )}
              {syncResult.failed > 0 && (
                <p className="text-red-700">✗ {syncResult.failed} appointments failed to sync</p>
              )}
              {syncResult.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-700 font-medium">Errors:</p>
                  <ul className="list-disc list-inside text-red-600">
                    {syncResult.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Additional Actions */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="font-medium text-gray-900 mb-3">Maintenance Actions</h3>
          
          <div className="flex gap-3">
            <button
              onClick={handleCleanupOrphaned}
              disabled={syncing}
              className="px-4 py-2 bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clean Up Orphaned Events
            </button>

            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-gray-100 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {showHistory ? 'Hide' : 'Show'} Sync History
            </button>
          </div>
        </div>

        {/* Sync History (placeholder for now) */}
        {showHistory && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Recent Sync History</h4>
            <p className="text-sm text-gray-600">
              Sync history will be displayed here in a future update.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}