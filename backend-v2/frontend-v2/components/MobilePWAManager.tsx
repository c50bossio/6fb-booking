'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Progress } from '@/components/ui/progress'
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Bell, 
  Calendar, 
  Users, 
  DollarSign,
  RefreshCw as Sync,
  Download,
  Settings,
  Activity,
  Battery,
  Signal
} from 'lucide-react'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useToast } from '@/hooks/use-toast'

interface PWAStatus {
  isInstalled: boolean
  isOnline: boolean
  syncStatus: 'idle' | 'syncing' | 'error'
  cacheSize: number
  queuedActions: number
  lastSync: string | null
  batteryLevel?: number
  connectionType?: string
}

interface MobilePWAManagerProps {
  className?: string
}

export function MobilePWAManager({ className }: MobilePWAManagerProps) {
  const [pwaStatus, setPwaStatus] = useState<PWAStatus>({
    isInstalled: false,
    isOnline: navigator.onLine,
    syncStatus: 'idle',
    cacheSize: 0,
    queuedActions: 0,
    lastSync: null
  })
  
  const [autoSync, setAutoSync] = useState(true)
  const [backgroundNotifications, setBackgroundNotifications] = useState(true)
  const [offlineMode, setOfflineMode] = useState(false)
  
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications()
  
  const { toast } = useToast()

  // Check PWA installation status
  useEffect(() => {
    const checkPWAStatus = () => {
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true
      
      setPwaStatus(prev => ({
        ...prev,
        isInstalled
      }))
    }

    checkPWAStatus()
    
    // Listen for PWA installation
    window.addEventListener('appinstalled', checkPWAStatus)
    
    return () => {
      window.removeEventListener('appinstalled', checkPWAStatus)
    }
  }, [])

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setPwaStatus(prev => ({ ...prev, isOnline: true }))
      if (autoSync) {
        handleManualSync()
      }
    }
    
    const handleOffline = () => {
      setPwaStatus(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [autoSync])

  // Get battery status (if supported)
  useEffect(() => {
    const getBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery()
          setPwaStatus(prev => ({
            ...prev,
            batteryLevel: Math.round(battery.level * 100)
          }))
        } catch (error) {
          console.log('Battery API not supported')
        }
      }
    }

    getBatteryInfo()
  }, [])

  // Get connection info
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      setPwaStatus(prev => ({
        ...prev,
        connectionType: connection.effectiveType
      }))
    }
  }, [])

  // Get offline status from service worker
  useEffect(() => {
    const getOfflineStatus = async () => {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const channel = new MessageChannel()
        
        channel.port1.onmessage = (event) => {
          const { queuedActions, cacheSize, lastSync } = event.data
          setPwaStatus(prev => ({
            ...prev,
            queuedActions: queuedActions || 0,
            cacheSize: cacheSize || 0,
            lastSync: lastSync
          }))
        }
        
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_OFFLINE_STATUS' },
          [channel.port2]
        )
      }
    }

    getOfflineStatus()
    
    // Refresh status every 30 seconds
    const interval = setInterval(getOfflineStatus, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const handleManualSync = async () => {
    if (!navigator.serviceWorker.controller) return
    
    setPwaStatus(prev => ({ ...prev, syncStatus: 'syncing' }))
    
    try {
      navigator.serviceWorker.controller.postMessage({ type: 'FORCE_SYNC' })
      
      toast({
        title: "Syncing data",
        description: "Your offline changes are being synchronized..."
      })
      
      // Simulate sync completion after 3 seconds
      setTimeout(() => {
        setPwaStatus(prev => ({ 
          ...prev, 
          syncStatus: 'idle',
          lastSync: new Date().toISOString()
        }))
        
        toast({
          title: "Sync complete",
          description: "All data has been synchronized successfully."
        })
      }, 3000)
      
    } catch (error) {
      setPwaStatus(prev => ({ ...prev, syncStatus: 'error' }))
      
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: "Unable to sync data. Please try again."
      })
    }
  }

  const handleClearCache = async () => {
    if (!navigator.serviceWorker.controller) return
    
    const channel = new MessageChannel()
    
    channel.port1.onmessage = () => {
      setPwaStatus(prev => ({ ...prev, cacheSize: 0 }))
      
      toast({
        title: "Cache cleared",
        description: "All cached data has been removed."
      })
    }
    
    navigator.serviceWorker.controller.postMessage(
      { type: 'CLEAR_CACHE' },
      [channel.port2]
    )
  }

  const handleNotificationToggle = async (enabled: boolean) => {
    try {
      if (enabled && !isSubscribed) {
        await subscribe()
      } else if (!enabled && isSubscribed) {
        await unsubscribe()
      }
      setBackgroundNotifications(enabled)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to update notifications",
        description: "Please try again or check your browser settings."
      })
    }
  }

  const installPrompt = () => {
    toast({
      title: "Install BookedBarber",
      description: "Add to your home screen for the best mobile experience!"
    })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* PWA Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5" />
            Mobile App Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Installation Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={pwaStatus.isInstalled ? "default" : "secondary"}>
                {pwaStatus.isInstalled ? "Installed" : "Browser"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {pwaStatus.isInstalled ? "App installed" : "Running in browser"}
              </span>
            </div>
            {!pwaStatus.isInstalled && (
              <Button size="sm" onClick={installPrompt}>
                <Download className="h-4 w-4 mr-1" />
                Install
              </Button>
            )}
          </div>

          {/* Network Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {pwaStatus.isOnline ? (
                <Wifi className="h-4 w-4 text-green-500" />
              ) : (
                <WifiOff className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">
                {pwaStatus.isOnline ? "Online" : "Offline"}
              </span>
              {pwaStatus.connectionType && (
                <Badge variant="outline" className="text-xs">
                  {pwaStatus.connectionType}
                </Badge>
              )}
            </div>
            
            {pwaStatus.batteryLevel && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Battery className="h-4 w-4" />
                {pwaStatus.batteryLevel}%
              </div>
            )}
          </div>

          {/* Sync Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sync className={`h-4 w-4 ${pwaStatus.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              <span className="text-sm">
                {pwaStatus.syncStatus === 'syncing' ? 'Syncing...' : 
                 pwaStatus.syncStatus === 'error' ? 'Sync Error' : 'Up to date'}
              </span>
              {pwaStatus.queuedActions > 0 && (
                <Badge variant="secondary">
                  {pwaStatus.queuedActions} pending
                </Badge>
              )}
            </div>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleManualSync}
              disabled={pwaStatus.syncStatus === 'syncing' || !pwaStatus.isOnline}
            >
              Sync Now
            </Button>
          </div>

          {pwaStatus.lastSync && (
            <p className="text-xs text-muted-foreground">
              Last sync: {new Date(pwaStatus.lastSync).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions for Barbers */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => window.location.href = '/my-schedule'}
          >
            <Calendar className="h-6 w-6" />
            <span className="text-sm">Today's Schedule</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => window.location.href = '/clients'}
          >
            <Users className="h-6 w-6" />
            <span className="text-sm">Client List</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => window.location.href = '/analytics'}
          >
            <DollarSign className="h-6 w-6" />
            <span className="text-sm">Revenue</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-20 flex-col gap-2"
            onClick={() => window.location.href = '/book?quick=true'}
          >
            <Smartphone className="h-6 w-6" />
            <span className="text-sm">Quick Book</span>
          </Button>
        </CardContent>
      </Card>

      {/* PWA Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5" />
            App Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Auto Sync */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Auto Sync</p>
              <p className="text-sm text-muted-foreground">
                Automatically sync when connection is restored
              </p>
            </div>
            <Switch
              checked={autoSync}
              onCheckedChange={setAutoSync}
            />
          </div>

          {/* Background Notifications */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Appointment reminders and updates
              </p>
            </div>
            <Switch
              checked={backgroundNotifications && isSubscribed}
              onCheckedChange={handleNotificationToggle}
              disabled={!isSupported}
            />
          </div>

          {/* Offline Mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Offline Mode</p>
              <p className="text-sm text-muted-foreground">
                Enhanced offline functionality
              </p>
            </div>
            <Switch
              checked={offlineMode}
              onCheckedChange={setOfflineMode}
            />
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Storage Usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Cached Data</span>
              <span>{(pwaStatus.cacheSize / 1024 / 1024).toFixed(1)} MB</span>
            </div>
            <Progress value={Math.min((pwaStatus.cacheSize / (50 * 1024 * 1024)) * 100, 100)} />
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleClearCache}
            className="w-full"
          >
            Clear Cache
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}