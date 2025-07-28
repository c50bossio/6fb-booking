'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff, RefreshCw, Calendar, Clock, Phone, Home, Zap } from 'lucide-react'
import Link from 'next/link'
import { offlineDataManager } from '@/lib/offline-data-manager'

interface OfflineStats {
  queuedActions: number
  offlineAppointments: number
  cacheSize: number
  lastSync?: number
}

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false)
  const [offlineStats, setOfflineStats] = useState<OfflineStats>({
    queuedActions: 0,
    offlineAppointments: 0,
    cacheSize: 0
  })
  const [isRetrying, setIsRetrying] = useState(false)
  const [upcomingAppointments, setUpcomingAppointments] = useState([])

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine)

    // Listen for online/offline events
    const handleOnline = () => {
      setIsOnline(true)
      // Auto-sync when coming back online
      handleSyncWhenOnline()
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Load offline data
    loadOfflineData()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadOfflineData = async () => {
    try {
      const stats = await offlineDataManager.getOfflineStats()
      setOfflineStats(stats)

      // Get offline appointments for today
      const today = new Date().toISOString().split('T')[0]
      const appointments = await offlineDataManager.getOfflineAppointments({ date: today })
      setUpcomingAppointments(appointments.slice(0, 3)) // Show next 3
    } catch (error) {
      console.error('Failed to load offline data:', error)
    }
  }

  const handleRetry = async () => {
    setIsRetrying(true)
    
    try {
      // Test connection with a simple fetch
      await fetch('/api/v2/auth/me', { method: 'HEAD' })
      
      // If successful, reload the page
      window.location.href = '/'
    } catch (error) {
      // Still offline, show feedback
      setTimeout(() => setIsRetrying(false), 1500)
    }
  }

  const handleSyncWhenOnline = async () => {
    if (!isOnline) return

    try {
      const result = await offlineDataManager.syncWithServer()
      
      if (result.success) {
        // Reload data after successful sync
        await loadOfflineData()
      }
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return 'Never'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            {isOnline ? (
              <div className="relative">
                <Wifi className="h-16 w-16 text-green-500" />
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-green-500 rounded-full flex items-center justify-center">
                  <Zap className="h-3 w-3 text-white" />
                </div>
              </div>
            ) : (
              <WifiOff className="h-16 w-16 text-red-500" />
            )}
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {isOnline ? 'Connection Restored!' : 'Working Offline'}
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg max-w-2xl mx-auto">
            {isOnline 
              ? 'Your connection has been restored. Data is syncing automatically.'
              : 'Your BookedBarber app continues to work offline. Essential barber tools remain available for uninterrupted service.'
            }
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button
            onClick={handleRetry}
            disabled={isRetrying}
            size="lg"
            className="flex items-center gap-2"
            variant={isOnline ? "outline" : "default"}
          >
            <RefreshCw className={`h-5 w-5 ${isRetrying ? 'animate-spin' : ''}`} />
            {isRetrying ? 'Checking...' : isOnline ? 'Refresh Page' : 'Retry Connection'}
          </Button>

          {isOnline && (
            <Button
              onClick={handleSyncWhenOnline}
              variant="default"
              size="lg"
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <RefreshCw className="h-5 w-5" />
              Sync Now
            </Button>
          )}
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className={isOnline ? "border-green-200 bg-green-50 dark:bg-green-900/20" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Queued Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offlineStats.queuedActions}</div>
              <p className="text-xs text-muted-foreground">
                {isOnline ? 'Syncing now...' : 'Will sync when online'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Offline Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{offlineStats.offlineAppointments}</div>
              <p className="text-xs text-muted-foreground">
                Created while offline
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Last Sync
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {formatLastSync(offlineStats.lastSync)}
              </div>
              <p className="text-xs text-muted-foreground">
                Data freshness
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Available Features */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Available Offline Features
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link 
                href="/calendar" 
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <Calendar className="h-8 w-8 mb-2 text-blue-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">View Calendar</span>
                <span className="text-xs text-muted-foreground text-center">
                  See your cached schedule
                </span>
              </Link>

              <Link 
                href="/clients" 
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <Phone className="h-8 w-8 mb-2 text-green-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Client Info</span>
                <span className="text-xs text-muted-foreground text-center">
                  Access contact details
                </span>
              </Link>

              <Link 
                href="/book" 
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <Clock className="h-8 w-8 mb-2 text-purple-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Book Offline</span>
                <span className="text-xs text-muted-foreground text-center">
                  Queue appointments
                </span>
              </Link>

              <Link 
                href="/dashboard" 
                className="flex flex-col items-center p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
              >
                <Home className="h-8 w-8 mb-2 text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Dashboard</span>
                <span className="text-xs text-muted-foreground text-center">
                  Cached analytics
                </span>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Today's Appointments */}
        {upcomingAppointments.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Today's Appointments (Offline Data)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingAppointments.map((appointment: any, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{appointment.clientName}</div>
                      <div className="text-sm text-muted-foreground">
                        {appointment.startTime} - {appointment.endTime}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{appointment.serviceName || 'Service'}</div>
                      <div className="text-xs text-muted-foreground">
                        {appointment.syncStatus === 'pending' ? 'Will sync' : 'Synced'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Six Figure Barber Messaging */}
        <Card className="bg-gradient-to-r from-black to-gray-800 text-white border-0">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <Zap className="h-6 w-6 text-yellow-400" />
              Six Figure Barber - Always Reliable
            </h3>
            <p className="text-gray-200 mb-4">
              Professional barbering never stops. This app ensures you maintain service excellence 
              even when connectivity is poor. Your business continuity is our priority.
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>View appointments offline</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Access client contact info</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Book appointments (syncs later)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span>Automatic sync when online</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}