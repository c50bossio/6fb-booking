'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { Label } from "@/components/ui/Label"
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/Badge'
import {
  Smartphone,
  Bell,
  Download,
  WifiOff,
  CheckCircle,
  Info,
  RefreshCw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function PWASettingsPage() {
  const { toast } = useToast()
  const [isInstalled, setIsInstalled] = useState(false)
  const [isOfflineReady, setIsOfflineReady] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<'registered' | 'not-registered' | 'checking'>('checking')

  useEffect(() => {
    // Check if app is installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    // Check service worker status
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setServiceWorkerStatus('registered')
        setIsOfflineReady(true)
      }).catch(() => {
        setServiceWorkerStatus('not-registered')
      })
    } else {
      setServiceWorkerStatus('not-registered')
    }

    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      setNotificationsEnabled(Notification.permission === 'granted')
    }
  }, [])

  const handleInstallApp = async () => {
    // This would typically trigger the browser's install prompt
    // In a real implementation, you'd store the beforeinstallprompt event
    toast({
      title: 'Installation prompt',
      description: 'Look for the install prompt in your browser\'s address bar or menu.'
    })
  }

  const handleEnableNotifications = async () => {
    if (!('Notification' in window)) {
      toast({
        variant: 'destructive',
        title: 'Notifications not supported',
        description: 'Your browser doesn\'t support push notifications.'
      })
      return
    }

    try {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      setNotificationsEnabled(permission === 'granted')

      if (permission === 'granted') {
        toast({
          title: 'Notifications enabled',
          description: 'You\'ll now receive push notifications for important updates.'
        })
        
        // Show a test notification
        new Notification('BookedBarber', {
          body: 'Push notifications are now enabled!',
          icon: '/icon?size=192'
        })
      } else if (permission === 'denied') {
        toast({
          variant: 'destructive',
          title: 'Notifications blocked',
          description: 'Please enable notifications in your browser settings.'
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to enable notifications',
        description: 'Please try again later.'
      })
    }
  }

  const handleUpdateServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        await registration.update()
        toast({
          title: 'Checking for updates',
          description: 'The app will update if a new version is available.'
        })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Update check failed',
          description: 'Please try again later.'
        })
      }
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Progressive Web App</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage app installation and offline features
        </p>
      </div>

      {/* App Installation Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary-600" />
              <CardTitle>App Installation</CardTitle>
            </div>
            <Badge variant={isInstalled ? 'success' : 'secondary'}>
              {isInstalled ? 'Installed' : 'Not Installed'}
            </Badge>
          </div>
          <CardDescription>
            Install BookedBarber as an app for the best experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isInstalled ? (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                BookedBarber is installed and running as a standalone app
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Installing BookedBarber gives you a native app experience with faster loading, offline access, and push notifications
                </AlertDescription>
              </Alert>
              <Button onClick={handleInstallApp} className="w-full sm:w-auto">
                <Download className="h-4 w-4 mr-2" />
                Install App
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Offline Capabilities */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="h-5 w-5 text-primary-600" />
              <CardTitle>Offline Mode</CardTitle>
            </div>
            <Badge variant={isOfflineReady ? 'success' : 'secondary'}>
              {isOfflineReady ? 'Ready' : 'Not Available'}
            </Badge>
          </div>
          <CardDescription>
            Access key features even without an internet connection
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Service Worker Status</Label>
              <span className="text-sm text-muted-foreground">
                {serviceWorkerStatus === 'registered' ? 'Active' : 
                 serviceWorkerStatus === 'checking' ? 'Checking...' : 'Not Active'}
              </span>
            </div>
            {serviceWorkerStatus === 'registered' && (
              <div className="flex items-center justify-between">
                <Label>Offline Cache</Label>
                <Button variant="outline" size="sm" onClick={handleUpdateServiceWorker}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Check Updates
                </Button>
              </div>
            )}
          </div>
          
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              When offline, you can still view cached appointments, client information, and recent analytics
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary-600" />
              <CardTitle>Push Notifications</CardTitle>
            </div>
            <Badge variant={notificationsEnabled ? 'success' : 'secondary'}>
              {notificationsEnabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>
          <CardDescription>
            Get notified about appointments and important updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="notifications-toggle">Enable push notifications</Label>
            <Switch
              id="notifications-toggle"
              checked={notificationsEnabled}
              onCheckedChange={(checked) => {
                if (checked) {
                  handleEnableNotifications()
                } else {
                  setNotificationsEnabled(false)
                  toast({
                    title: 'Notifications disabled',
                    description: 'You can re-enable them anytime.'
                  })
                }
              }}
              disabled={notificationPermission === 'denied'}
            />
          </div>
          
          {notificationPermission === 'denied' && (
            <Alert variant="warning">
              <AlertDescription>
                Notifications are blocked. Please enable them in your browser settings to receive updates.
              </AlertDescription>
            </Alert>
          )}
          
          {notificationsEnabled && (
            <div className="space-y-2 pt-2 border-t">
              <p className="text-sm font-medium">You'll be notified about:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Upcoming appointments (30 minutes before)</li>
                <li>• New bookings and cancellations</li>
                <li>• Payment confirmations</li>
                <li>• Important system updates</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PWA Features */}
      <Card>
        <CardHeader>
          <CardTitle>Progressive Web App Features</CardTitle>
          <CardDescription>
            Advanced features available with BookedBarber PWA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Fast Loading</p>
                <p className="text-sm text-muted-foreground">
                  Instant loading with intelligent caching
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Background Sync</p>
                <p className="text-sm text-muted-foreground">
                  Automatically sync data when connection is restored
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Home Screen Access</p>
                <p className="text-sm text-muted-foreground">
                  Launch directly from your device home screen
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-sm">Native App Feel</p>
                <p className="text-sm text-muted-foreground">
                  Full-screen experience without browser UI
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}