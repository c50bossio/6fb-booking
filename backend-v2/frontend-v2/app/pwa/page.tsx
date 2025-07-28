'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Download, 
  Settings, 
  Activity,
  Calendar,
  Users,
  BarChart3,
  Shield,
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  HardDrive,
  Bell
} from 'lucide-react'
import { MobilePWAManager } from '@/components/MobilePWAManager'
import { OfflineCalendarManager } from '@/components/OfflineCalendarManager'
import { useServiceWorker } from '@/components/PWAInstallPrompt'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { offlineDataManager } from '@/lib/offline-data-manager'
import { useToast } from '@/hooks/use-toast'

interface PWAHealth {
  serviceWorkerActive: boolean
  offlineCapable: boolean
  pushNotificationsEnabled: boolean
  installable: boolean
  networkOnline: boolean
  cacheHealth: 'good' | 'warning' | 'error'
  lastSync?: string
  dataIntegrity: 'good' | 'warning' | 'error'
}

export default function PWAPage() {
  const [pwaHealth, setPwaHealth] = useState<PWAHealth>({
    serviceWorkerActive: false,
    offlineCapable: false,
    pushNotificationsEnabled: false,
    installable: false,
    networkOnline: navigator.onLine,
    cacheHealth: 'good',
    dataIntegrity: 'good'
  })
  
  const [offlineStats, setOfflineStats] = useState({
    queuedActions: 0,
    cacheSize: 0,
    lastSync: null as string | null
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  const { toast } = useToast()
  const { isRegistered, isUpdateAvailable, updateServiceWorker } = useServiceWorker()
  const { isSupported, permission, isSubscribed } = usePushNotifications()

  useEffect(() => {
    checkPWAHealth()
    loadOfflineStats()
    
    // Set up listeners for network changes
    const handleOnline = () => setPwaHealth(prev => ({ ...prev, networkOnline: true }))
    const handleOffline = () => setPwaHealth(prev => ({ ...prev, networkOnline: false }))
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const checkPWAHealth = async () => {
    const health: PWAHealth = {
      serviceWorkerActive: isRegistered,
      offlineCapable: 'serviceWorker' in navigator && 'caches' in window,
      pushNotificationsEnabled: isSupported && permission === 'granted' && isSubscribed,
      installable: false, // Will be detected by beforeinstallprompt
      networkOnline: navigator.onLine,
      cacheHealth: 'good',
      dataIntegrity: 'good'
    }

    // Check cache health
    try {
      const cacheNames = await caches.keys()
      health.cacheHealth = cacheNames.length > 0 ? 'good' : 'warning'
    } catch (error) {
      health.cacheHealth = 'error'
    }

    // Check for installability
    if ('getInstalledRelatedApps' in navigator) {
      try {
        const relatedApps = await (navigator as any).getInstalledRelatedApps()
        health.installable = relatedApps.length === 0
      } catch (error) {
        // Assume installable if check fails
        health.installable = true
      }
    }

    setPwaHealth(health)
  }

  const loadOfflineStats = async () => {
    try {
      const stats = await offlineDataManager.getOfflineStats()
      setOfflineStats({
        queuedActions: stats.queuedActions,
        cacheSize: stats.cacheSize,
        lastSync: stats.lastSync ? new Date(stats.lastSync).toLocaleString() : null
      })
    } catch (error) {
      console.error('Failed to load offline stats:', error)
    }
  }

  const handleRefreshPWA = async () => {
    setIsRefreshing(true)
    try {
      // Clear caches and reload
      if ('caches' in window) {
        const cacheNames = await caches.keys()
        await Promise.all(cacheNames.map(name => caches.delete(name)))
      }
      
      // Update service worker
      if (isUpdateAvailable) {
        updateServiceWorker()
      }
      
      // Refresh stats
      await checkPWAHealth()
      await loadOfflineStats()
      
      toast({
        title: "PWA Refreshed",
        description: "All caches cleared and service worker updated"
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Refresh Failed",
        description: "Failed to refresh PWA. Please try again."
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSyncOfflineData = async () => {
    if (!pwaHealth.networkOnline) {
      toast({
        variant: "destructive",
        title: "Offline",
        description: "Cannot sync while offline"
      })
      return
    }

    try {
      const result = await offlineDataManager.syncWithServer()
      
      if (result.success) {
        toast({
          title: "Sync Complete",
          description: `Synced ${result.syncedCount} items successfully`
        })
        await loadOfflineStats()
      } else {
        toast({
          variant: "destructive",
          title: "Sync Incomplete",
          description: `${result.errorCount} items failed to sync`
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: "Failed to sync offline data"
      })
    }
  }

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'good':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (active: boolean, label: string) => (
    <Badge variant={active ? "default" : "secondary"} className="flex items-center gap-1">
      {active ? 
        <CheckCircle className="h-3 w-3" /> : 
        <XCircle className="h-3 w-3" />
      }
      {label}
    </Badge>
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Smartphone className="h-8 w-8 text-primary" />
            Progressive Web App Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitor and manage your BookedBarber PWA experience
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefreshPWA}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh PWA
          </Button>
          {pwaHealth.networkOnline && offlineStats.queuedActions > 0 && (
            <Button 
              onClick={handleSyncOfflineData}
              className="flex items-center gap-2"
            >
              <Wifi className="h-4 w-4" />
              Sync Data ({offlineStats.queuedActions})
            </Button>
          )}
        </div>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium">Service Worker</span>
              </div>
              {getHealthIcon(pwaHealth.serviceWorkerActive ? 'good' : 'error')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pwaHealth.serviceWorkerActive ? 'Active' : 'Inactive'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {pwaHealth.networkOnline ? 
                  <Wifi className="h-5 w-5 text-green-500" /> : 
                  <WifiOff className="h-5 w-5 text-red-500" />
                }
                <span className="text-sm font-medium">Network</span>
              </div>
              {getHealthIcon(pwaHealth.networkOnline ? 'good' : 'warning')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pwaHealth.networkOnline ? 'Online' : 'Offline'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-purple-500" />
                <span className="text-sm font-medium">Cache</span>
              </div>
              {getHealthIcon(pwaHealth.cacheHealth)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(offlineStats.cacheSize / 1024 / 1024).toFixed(1)} MB
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-500" />
                <span className="text-sm font-medium">Push</span>
              </div>
              {getHealthIcon(pwaHealth.pushNotificationsEnabled ? 'good' : 'warning')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pwaHealth.pushNotificationsEnabled ? 'Enabled' : 'Disabled'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="offline" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Offline</span>
          </TabsTrigger>
          <TabsTrigger value="mobile" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Mobile</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* PWA Features Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                PWA Features Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Service Worker Registration</span>
                    {getStatusBadge(pwaHealth.serviceWorkerActive, 'Active')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Offline Capability</span>
                    {getStatusBadge(pwaHealth.offlineCapable, 'Enabled')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Push Notifications</span>
                    {getStatusBadge(pwaHealth.pushNotificationsEnabled, 'Active')}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">App Installation</span>
                    {getStatusBadge(pwaHealth.installable, 'Available')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cache Management</span>
                    {getStatusBadge(pwaHealth.cacheHealth === 'good', 'Healthy')}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Integrity</span>
                    {getStatusBadge(pwaHealth.dataIntegrity === 'good', 'Good')}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sync Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Data Synchronization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Queued Actions</p>
                    <p className="text-sm text-muted-foreground">
                      {offlineStats.queuedActions} items waiting to sync
                    </p>
                  </div>
                  <Badge variant={offlineStats.queuedActions > 0 ? "secondary" : "default"}>
                    {offlineStats.queuedActions} pending
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Last Sync</p>
                    <p className="text-sm text-muted-foreground">
                      {offlineStats.lastSync || 'Never synced'}
                    </p>
                  </div>
                  {pwaHealth.networkOnline ? (
                    <Badge variant="default" className="text-green-700 bg-green-100">
                      Online
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-red-700 bg-red-100">
                      Offline
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Cache Size</span>
                  <span className="text-sm font-medium">
                    {(offlineStats.cacheSize / 1024 / 1024).toFixed(1)} MB
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Storage Usage</span>
                  <span className="text-sm font-medium">
                    {pwaHealth.offlineCapable ? 'Available' : 'Not Available'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Network Status</span>
                  <span className="text-sm font-medium">
                    {pwaHealth.networkOnline ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline" className="mt-6">
          <OfflineCalendarManager className="space-y-6" />
        </TabsContent>

        <TabsContent value="mobile" className="mt-6">
          <MobilePWAManager className="space-y-6" />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* PWA Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                PWA Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Clear All Cache</p>
                  <p className="text-sm text-muted-foreground">
                    Remove all cached data and force fresh downloads
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleRefreshPWA}
                  disabled={isRefreshing}
                >
                  Clear Cache
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Force Sync</p>
                  <p className="text-sm text-muted-foreground">
                    Manually trigger sync of offline data
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleSyncOfflineData}
                  disabled={!pwaHealth.networkOnline || offlineStats.queuedActions === 0}
                >
                  Sync Now
                </Button>
              </div>

              {isUpdateAvailable && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Update Available</p>
                    <p className="text-sm text-muted-foreground">
                      A new version of the app is ready to install
                    </p>
                  </div>
                  <Button onClick={updateServiceWorker}>
                    Update Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="h-5 w-5" />
                Data Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="font-medium mb-2">Storage Usage</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Cache Storage</span>
                      <span>{(offlineStats.cacheSize / 1024 / 1024).toFixed(1)} MB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>IndexedDB</span>
                      <span>~2.5 MB</span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="font-medium mb-2">Sync Status</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pending Actions</span>
                      <span>{offlineStats.queuedActions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Last Sync</span>
                      <span>{offlineStats.lastSync ? 'Recent' : 'Never'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}