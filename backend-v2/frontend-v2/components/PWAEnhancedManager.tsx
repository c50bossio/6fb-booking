'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { 
  Wifi, WifiOff, Download, Smartphone, Bell, BellOff, 
  RefreshCw, Calendar, Users, BarChart3, CheckCircle, AlertCircle,
  Clock, Zap, Settings, Database, Signal
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useServiceWorker } from '@/components/PWAInstallPrompt'
import { getPushNotificationSystem } from '@/lib/push-notifications'

interface OfflineBooking {
  id: string
  clientName: string
  serviceName: string
  date: string
  time: string
  status: 'pending_sync' | 'synced' | 'sync_failed'
  timestamp: number
  offline: boolean
}

interface OfflineStatus {
  isOnline: boolean
  queuedActions: number
  cacheSize: number
  lastSync: string | null
  pendingBookings: OfflineBooking[]
  syncInProgress: boolean
}

export function PWAEnhancedManager() {
  const { user } = useAuth()
  const { 
    isSupported: notificationsSupported, 
    permission, 
    isSubscribed, 
    subscribe, 
    unsubscribe,
    showNotification 
  } = usePushNotifications()
  
  const { 
    isRegistered: swRegistered, 
    isUpdateAvailable, 
    updateServiceWorker,
    clearCacheAndReload 
  } = useServiceWorker()

  // PWA State
  const [isInstalled, setIsInstalled] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<any>(null)
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>({
    isOnline: true,
    queuedActions: 0,
    cacheSize: 0,
    lastSync: null,
    pendingBookings: [],
    syncInProgress: false
  })

  // Feature toggles
  const [offlineMode, setOfflineMode] = useState(true)
  const [backgroundSync, setBackgroundSync] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(false)
  const [autoSync, setAutoSync] = useState(true)

  // Check if app is installed
  useEffect(() => {
    const checkInstallStatus = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true)
      }
    }

    checkInstallStatus()
    window.addEventListener('resize', checkInstallStatus)
    return () => window.removeEventListener('resize', checkInstallStatus)
  }, [])

  // Handle install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setInstallPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  // Monitor online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setOfflineStatus(prev => ({ ...prev, isOnline: navigator.onLine }))
    }

    const handleOnline = () => {
      updateOnlineStatus()
      if (autoSync) {
        triggerBackgroundSync()
      }
      showNotification({
        id: 'back-online',
        title: '🌐 Back Online',
        body: 'Connection restored. Syncing your data...',
        tag: 'connectivity'
      })
    }

    const handleOffline = () => {
      updateOnlineStatus()
      showNotification({
        id: 'offline-mode',
        title: '📱 Offline Mode',
        body: 'You\'re offline. Bookings will be saved locally.',
        tag: 'connectivity'
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    updateOnlineStatus()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [autoSync])

  // Get offline status from service worker
  const getOfflineStatus = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return

    try {
      const registration = await navigator.serviceWorker.ready
      const messageChannel = new MessageChannel()
      
      return new Promise<OfflineStatus>((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data)
        }
        
        registration.active?.postMessage(
          { type: 'GET_OFFLINE_STATUS' },
          [messageChannel.port2]
        )
      })
    } catch (error) {
      console.error('Failed to get offline status:', error)
      return offlineStatus
    }
  }, [offlineStatus])

  // Update offline status periodically
  useEffect(() => {
    const updateStatus = async () => {
      const status = await getOfflineStatus()
      if (status) {
        setOfflineStatus(prev => ({ ...prev, ...status }))
      }
    }

    updateStatus()
    const interval = setInterval(updateStatus, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [getOfflineStatus])

  // Install PWA
  const handleInstall = async () => {
    if (!installPrompt) return

    const result = await installPrompt.prompt()
    if (result.outcome === 'accepted') {
      setIsInstalled(true)
      setInstallPrompt(null)
      
      showNotification({
        id: 'pwa-installed',
        title: '🎉 App Installed!',
        body: 'BookedBarber is now installed on your device.',
        tag: 'installation'
      })
    }
  }

  // Toggle push notifications
  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      if (enabled) {
        await subscribe()
        setPushNotifications(true)
        
        // Setup notification system
        const notificationSystem = getPushNotificationSystem()
        await notificationSystem.requestPermission()
        
        showNotification({
          id: 'notifications-enabled',
          title: '🔔 Notifications Enabled',
          body: 'You\'ll receive appointment reminders and updates.',
          tag: 'notifications'
        })
      } else {
        await unsubscribe()
        setPushNotifications(false)
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error)
    }
  }

  // Trigger background sync
  const triggerBackgroundSync = async () => {
    if (!('serviceWorker' in navigator) || !backgroundSync) return

    try {
      const registration = await navigator.serviceWorker.ready
      registration.active?.postMessage({ type: 'FORCE_SYNC' })
      
      setOfflineStatus(prev => ({ ...prev, syncInProgress: true }))
      
      // Reset sync status after 5 seconds
      setTimeout(() => {
        setOfflineStatus(prev => ({ ...prev, syncInProgress: false }))
      }, 5000)
    } catch (error) {
      console.error('Failed to trigger sync:', error)
    }
  }

  // Clear all cache
  const handleClearCache = async () => {
    try {
      await clearCacheAndReload()
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  // Test offline booking
  const testOfflineBooking = async () => {
    const testBooking = {
      id: `test_${Date.now()}`,
      clientName: 'Test Client',
      serviceName: 'Haircut',
      date: new Date().toISOString().split('T')[0],
      time: '14:00',
      barberId: user?.id,
      offline: true,
      timestamp: Date.now()
    }

    try {
      const response = await fetch('/api/v2/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testBooking)
      })

      if (response.ok) {
        const result = await response.json()
        
        showNotification({
          id: 'test-booking',
          title: result.offline ? '📱 Offline Booking Saved' : '✅ Booking Created',
          body: result.offline 
            ? 'Test booking saved offline and will sync when online.'
            : 'Test booking created successfully.',
          tag: 'test-booking'
        })
      }
    } catch (error) {
      console.error('Test booking failed:', error)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">PWA Manager</h1>
          <p className="text-muted-foreground">
            Manage offline features and push notifications
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={offlineStatus.isOnline ? "default" : "secondary"}>
            {offlineStatus.isOnline ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </>
            )}
          </Badge>
          
          {offlineStatus.syncInProgress && (
            <Badge variant="outline">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Syncing
            </Badge>
          )}
        </div>
      </div>

      {/* Installation Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            App Installation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                BookedBarber is installed as a PWA on your device.
              </AlertDescription>
            </Alert>
          ) : installPrompt ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Install BookedBarber App</p>
                <p className="text-sm text-muted-foreground">
                  Install for faster access and offline features
                </p>
              </div>
              <Button onClick={handleInstall}>
                <Download className="h-4 w-4 mr-2" />
                Install
              </Button>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Install option will appear when criteria are met.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Push Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Enable Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive appointment reminders and updates
              </p>
            </div>
            <Switch
              checked={pushNotifications && isSubscribed}
              onCheckedChange={handleNotificationToggle}
              disabled={!notificationsSupported}
            />
          </div>
          
          {notificationsSupported ? (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <Badge variant={permission === 'granted' ? 'default' : 'secondary'}>
                  {permission === 'granted' ? 'Granted' : 
                   permission === 'denied' ? 'Denied' : 'Default'}
                </Badge>
                <p className="mt-1">Permission</p>
              </div>
              <div className="text-center">
                <Badge variant={isSubscribed ? 'default' : 'secondary'}>
                  {isSubscribed ? 'Active' : 'Inactive'}
                </Badge>
                <p className="mt-1">Subscription</p>
              </div>
              <div className="text-center">
                <Badge variant={swRegistered ? 'default' : 'secondary'}>
                  {swRegistered ? 'Ready' : 'Loading'}
                </Badge>
                <p className="mt-1">Service Worker</p>
              </div>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Push notifications are not supported in this browser.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Offline Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Offline Features
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Offline Mode</p>
                <p className="text-sm text-muted-foreground">
                  Save bookings when offline
                </p>
              </div>
              <Switch
                checked={offlineMode}
                onCheckedChange={setOfflineMode}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Background Sync</p>
                <p className="text-sm text-muted-foreground">
                  Auto-sync when online
                </p>
              </div>
              <Switch
                checked={backgroundSync}
                onCheckedChange={setBackgroundSync}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {offlineStatus.queuedActions}
              </div>
              <p className="text-sm text-muted-foreground">Queued Actions</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {offlineStatus.cacheSize}
              </div>
              <p className="text-sm text-muted-foreground">Cache Size</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {offlineStatus.pendingBookings.length}
              </div>
              <p className="text-sm text-muted-foreground">Pending Bookings</p>
            </div>
            
            <div className="text-center">
              <div className="text-sm font-medium text-orange-600">
                {offlineStatus.lastSync ? 
                  new Date(offlineStatus.lastSync).toLocaleTimeString() : 
                  'Never'
                }
              </div>
              <p className="text-sm text-muted-foreground">Last Sync</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              onClick={triggerBackgroundSync}
              disabled={offlineStatus.syncInProgress || !backgroundSync}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Force Sync
            </Button>
            
            <Button 
              variant="outline" 
              onClick={testOfflineBooking}
              disabled={!offlineMode}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Test Booking
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleClearCache}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Clear Cache
            </Button>
            
            {isUpdateAvailable && (
              <Button 
                onClick={updateServiceWorker}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Update App
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pending Offline Bookings */}
      {offlineStatus.pendingBookings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Pending Offline Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {offlineStatus.pendingBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{booking.clientName}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.serviceName} • {booking.date} at {booking.time}
                    </p>
                  </div>
                  <Badge variant={
                    booking.status === 'pending_sync' ? 'secondary' :
                    booking.status === 'synced' ? 'default' : 'destructive'
                  }>
                    {booking.status === 'pending_sync' ? 'Pending' :
                     booking.status === 'synced' ? 'Synced' : 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Status Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Signal className="h-8 w-8 text-blue-500" />
              <Badge variant={offlineStatus.isOnline ? "default" : "secondary"}>
                {offlineStatus.isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold">Connection</h3>
              <p className="text-sm text-muted-foreground">
                Network status
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Calendar className="h-8 w-8 text-green-500" />
              <Badge variant="default">Ready</Badge>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold">Offline Booking</h3>
              <p className="text-sm text-muted-foreground">
                Create appointments offline
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Bell className="h-8 w-8 text-purple-500" />
              <Badge variant={isSubscribed ? "default" : "secondary"}>
                {isSubscribed ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold">Push Notifications</h3>
              <p className="text-sm text-muted-foreground">
                Appointment reminders
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Zap className="h-8 w-8 text-orange-500" />
              <Badge variant={swRegistered ? "default" : "secondary"}>
                {swRegistered ? "Ready" : "Loading"}
              </Badge>
            </div>
            <div className="mt-4">
              <h3 className="font-semibold">Background Sync</h3>
              <p className="text-sm text-muted-foreground">
                Auto-sync offline data
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}