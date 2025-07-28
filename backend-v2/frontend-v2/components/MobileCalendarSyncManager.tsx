/**
 * Mobile Calendar Sync Manager Component
 * UI for managing device calendar synchronization
 * Version: 1.0.0
 */

'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Switch } from './ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { useCalendarSync } from '@/lib/mobile-calendar-sync'

interface CalendarSyncManagerProps {
  className?: string
  onSyncComplete?: (results: any) => void
}

export default function MobileCalendarSyncManager({ 
  className, 
  onSyncComplete 
}: CalendarSyncManagerProps) {
  const { triggerSync, exportAppointment, getStatus, getDeviceCalendars, updateConfig } = useCalendarSync()
  
  const [status, setStatus] = useState({
    supported: false,
    enabled: false,
    lastSync: 0,
    conflictsCount: 0,
    calendarsCount: 0
  })
  
  const [deviceCalendars, setDeviceCalendars] = useState([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncConfig, setSyncConfig] = useState({
    enabled: true,
    autoSync: true,
    syncDirection: 'bidirectional' as 'import' | 'export' | 'bidirectional',
    syncInterval: 15,
    conflictResolution: 'ask-user' as 'device-wins' | 'app-wins' | 'ask-user'
  })

  // Load status and calendars on mount
  useEffect(() => {
    loadSyncStatus()
    loadDeviceCalendars()
    
    // Refresh status periodically
    const interval = setInterval(loadSyncStatus, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadSyncStatus = () => {
    try {
      const currentStatus = getStatus()
      setStatus(currentStatus)
    } catch (error) {
      console.error('Failed to load sync status:', error)
    }
  }

  const loadDeviceCalendars = () => {
    try {
      const calendars = getDeviceCalendars()
      setDeviceCalendars(calendars as any)
    } catch (error) {
      console.error('Failed to load device calendars:', error)
    }
  }

  const handleManualSync = async () => {
    if (!status.supported || isSyncing) return

    setIsSyncing(true)
    try {
      await triggerSync()
      loadSyncStatus()
      onSyncComplete?.({ success: true, message: 'Sync completed successfully' })
    } catch (error) {
      console.error('Manual sync failed:', error)
      onSyncComplete?.({ success: false, error: error.message })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...syncConfig, [key]: value }
    setSyncConfig(newConfig)
    updateConfig(newConfig)
  }

  const formatLastSync = (timestamp: number) => {
    if (!timestamp) return 'Never'
    
    const now = Date.now()
    const diffMinutes = Math.floor((now - timestamp) / (60 * 1000))
    
    if (diffMinutes < 1) return 'Just now'
    if (diffMinutes < 60) return `${diffMinutes} minutes ago`
    if (diffMinutes < 1440) return `${Math.floor(diffMinutes / 60)} hours ago`
    return `${Math.floor(diffMinutes / 1440)} days ago`
  }

  const getSyncDirectionDescription = (direction: string) => {
    switch (direction) {
      case 'import': return 'Device → App only'
      case 'export': return 'App → Device only'
      case 'bidirectional': return 'Two-way sync'
      default: return direction
    }
  }

  const getCalendarSourceIcon = (source: string) => {
    switch (source) {
      case 'icloud': return '☁️'
      case 'google': return '🔍'
      case 'exchange': return '📧'
      default: return '📱'
    }
  }

  if (!status.supported) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Alert>
          <AlertDescription className="flex items-center space-x-2">
            <span>📱</span>
            <span>Calendar sync is not supported on this device or browser. For best experience, use the native mobile app or enable calendar permissions in your browser.</span>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Sync Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>📅</span>
              <span>Calendar Sync</span>
            </div>
            <Badge variant={status.enabled ? 'default' : 'secondary'}>
              {status.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Synchronize appointments with your device calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Summary */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{deviceCalendars.length}</div>
              <div className="text-sm text-gray-600">Device Calendars</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatLastSync(status.lastSync)}</div>
              <div className="text-sm text-gray-600">Last Sync</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{status.conflictsCount}</div>
              <div className="text-sm text-gray-600">Conflicts</div>
            </div>
          </div>

          {/* Manual Sync Button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleManualSync}
              disabled={!status.enabled || isSyncing}
              className="flex items-center space-x-2"
            >
              <span>{isSyncing ? '🔄' : '↻'}</span>
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sync Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>Configure how appointments sync with your device calendar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Sync */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Calendar Sync</div>
              <div className="text-sm text-gray-600">Allow synchronization with device calendars</div>
            </div>
            <Switch 
              checked={syncConfig.enabled}
              onCheckedChange={(checked) => handleConfigChange('enabled', checked)}
            />
          </div>

          {/* Auto Sync */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Automatic Sync</div>
              <div className="text-sm text-gray-600">Sync automatically every {syncConfig.syncInterval} minutes</div>
            </div>
            <Switch 
              checked={syncConfig.autoSync}
              onCheckedChange={(checked) => handleConfigChange('autoSync', checked)}
              disabled={!syncConfig.enabled}
            />
          </div>

          {/* Sync Direction */}
          <div className="space-y-2">
            <div className="font-medium">Sync Direction</div>
            <Select 
              value={syncConfig.syncDirection}
              onValueChange={(value) => handleConfigChange('syncDirection', value)}
              disabled={!syncConfig.enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bidirectional">
                  <div className="flex items-center space-x-2">
                    <span>↔️</span>
                    <span>Two-way sync</span>
                  </div>
                </SelectItem>
                <SelectItem value="export">
                  <div className="flex items-center space-x-2">
                    <span>📤</span>
                    <span>App to Device only</span>
                  </div>
                </SelectItem>
                <SelectItem value="import">
                  <div className="flex items-center space-x-2">
                    <span>📥</span>
                    <span>Device to App only</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-gray-600">
              {getSyncDirectionDescription(syncConfig.syncDirection)}
            </div>
          </div>

          {/* Sync Interval */}
          <div className="space-y-2">
            <div className="font-medium">Sync Frequency</div>
            <Select 
              value={syncConfig.syncInterval.toString()}
              onValueChange={(value) => handleConfigChange('syncInterval', parseInt(value))}
              disabled={!syncConfig.enabled || !syncConfig.autoSync}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Every 5 minutes</SelectItem>
                <SelectItem value="15">Every 15 minutes</SelectItem>
                <SelectItem value="30">Every 30 minutes</SelectItem>
                <SelectItem value="60">Every hour</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conflict Resolution */}
          <div className="space-y-2">
            <div className="font-medium">Conflict Resolution</div>
            <Select 
              value={syncConfig.conflictResolution}
              onValueChange={(value) => handleConfigChange('conflictResolution', value)}
              disabled={!syncConfig.enabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ask-user">
                  <div className="flex items-center space-x-2">
                    <span>❓</span>
                    <span>Ask me each time</span>
                  </div>
                </SelectItem>
                <SelectItem value="app-wins">
                  <div className="flex items-center space-x-2">
                    <span>📱</span>
                    <span>App data wins</span>
                  </div>
                </SelectItem>
                <SelectItem value="device-wins">
                  <div className="flex items-center space-x-2">
                    <span>📅</span>
                    <span>Device calendar wins</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Device Calendars */}
      <Card>
        <CardHeader>
          <CardTitle>Device Calendars</CardTitle>
          <CardDescription>Available calendars on your device</CardDescription>
        </CardHeader>
        <CardContent>
          {deviceCalendars.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📅</div>
              <div>No device calendars found</div>
              <div className="text-sm mt-2">Check your calendar app permissions</div>
            </div>
          ) : (
            <div className="space-y-3">
              {deviceCalendars.map((calendar: any) => (
                <div key={calendar.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: calendar.color }}
                    />
                    <div>
                      <div className="font-medium flex items-center space-x-2">
                        <span>{calendar.name}</span>
                        {calendar.isDefault && <Badge variant="outline" className="text-xs">Default</Badge>}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center space-x-1">
                        <span>{getCalendarSourceIcon(calendar.source)}</span>
                        <span>{calendar.source}</span>
                        {!calendar.canWrite && <span>• Read-only</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge variant={calendar.canWrite ? 'default' : 'secondary'}>
                      {calendar.canWrite ? 'Read/Write' : 'Read-only'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* iOS Safari Instructions */}
      {navigator.userAgent.includes('Safari') && navigator.userAgent.includes('Mobile') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>📱</span>
              <span>iOS Integration</span>
            </CardTitle>
            <CardDescription>
              Special instructions for iOS Safari users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <div>For full calendar integration on iOS:</div>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Install the BookedBarber app from the App Store for native calendar sync</li>
                <li>Or use the "Export to Calendar" feature to generate .ics files</li>
                <li>Tap the downloaded .ics file to add events to your iOS Calendar</li>
              </ol>
            </div>
            
            <Alert>
              <AlertDescription>
                <strong>Tip:</strong> Add BookedBarber to your Home Screen for a native app-like experience with better calendar integration.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Help & Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
          <CardDescription>Common issues and solutions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <details className="cursor-pointer">
            <summary className="font-medium">Calendar sync not working?</summary>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <div>• Check calendar permissions in your device settings</div>
              <div>• Ensure the app has permission to access calendars</div>
              <div>• Try refreshing the page and sync again</div>
            </div>
          </details>
          
          <details className="cursor-pointer">
            <summary className="font-medium">Duplicate appointments appearing?</summary>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <div>• Switch to "Export only" mode to prevent importing duplicates</div>
              <div>• Clear duplicate events manually in your calendar app</div>
              <div>• Reset sync data and perform a fresh sync</div>
            </div>
          </details>
          
          <details className="cursor-pointer">
            <summary className="font-medium">Missing appointments?</summary>
            <div className="mt-2 text-sm text-gray-600 space-y-1">
              <div>• Check the date range - only future appointments sync by default</div>
              <div>• Verify the selected calendar allows write access</div>
              <div>• Try a manual sync to refresh data</div>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  )
}