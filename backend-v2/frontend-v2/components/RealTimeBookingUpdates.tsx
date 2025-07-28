'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import '../styles/six-figure-barber-theme.css'
import { 
  CheckCircle, 
  Clock, 
  Calendar,
  User,
  AlertCircle,
  Zap,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  X
} from 'lucide-react'

interface BookingUpdate {
  id: string
  type: 'new_booking' | 'cancellation' | 'reschedule' | 'check_in' | 'no_show' | 'completed'
  appointmentId: number
  barberName: string
  clientName: string
  serviceName: string
  originalTime?: string
  newTime?: string
  timestamp: Date
  message: string
  priority: 'low' | 'medium' | 'high'
}

interface RealTimeBookingUpdatesProps {
  barberId?: number
  onUpdateReceived?: (update: BookingUpdate) => void
  showNotifications?: boolean
}

export function RealTimeBookingUpdates({ 
  barberId, 
  onUpdateReceived,
  showNotifications = true 
}: RealTimeBookingUpdatesProps) {
  const [updates, setUpdates] = useState<BookingUpdate[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [notifications, setNotifications] = useState<BookingUpdate[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Simulate WebSocket connection (in production, this would be a real WebSocket)
  useEffect(() => {
    const connectWebSocket = () => {
      setConnectionStatus('connecting')
      
      // Simulate WebSocket connection delay
      setTimeout(() => {
        setIsConnected(true)
        setConnectionStatus('connected')
        
        // Simulate periodic updates
        const interval = setInterval(() => {
          if (Math.random() > 0.7) { // 30% chance of update every 10 seconds
            const mockUpdate = generateMockUpdate()
            handleNewUpdate(mockUpdate)
          }
        }, 10000)

        // Cleanup on unmount
        return () => {
          clearInterval(interval)
          setIsConnected(false)
          setConnectionStatus('disconnected')
        }
      }, 2000)
    }

    connectWebSocket()

    // Cleanup on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  const generateMockUpdate = (): BookingUpdate => {
    const types: BookingUpdate['type'][] = ['new_booking', 'cancellation', 'reschedule', 'check_in', 'completed']
    const barbers = ['Marcus Johnson', 'Diego Rivera', 'Aisha Thompson']
    const clients = ['John Smith', 'Sarah Wilson', 'Mike Chen', 'Lisa Rodriguez', 'David Park']
    const services = ['Premium Haircut', 'Beard Trim & Style', 'Hot Towel Treatment', 'Straight Razor Shave']
    
    const type = types[Math.floor(Math.random() * types.length)]
    const barberName = barbers[Math.floor(Math.random() * barbers.length)]
    const clientName = clients[Math.floor(Math.random() * clients.length)]
    const serviceName = services[Math.floor(Math.random() * services.length)]
    
    const messages = {
      new_booking: `New appointment booked with ${barberName}`,
      cancellation: `${clientName} cancelled their appointment`,
      reschedule: `${clientName} rescheduled their appointment`,
      check_in: `${clientName} checked in for their appointment`,
      no_show: `${clientName} did not show for their appointment`,
      completed: `${clientName}'s appointment with ${barberName} completed`
    }

    const priorities = {
      new_booking: 'medium' as const,
      cancellation: 'high' as const,
      reschedule: 'medium' as const,
      check_in: 'low' as const,
      no_show: 'high' as const,
      completed: 'low' as const
    }

    return {
      id: `update_${Date.now()}_${Math.random()}`,
      type,
      appointmentId: Math.floor(Math.random() * 1000) + 1,
      barberName,
      clientName,
      serviceName,
      originalTime: type === 'reschedule' ? '2:00 PM' : undefined,
      newTime: type === 'reschedule' ? '3:30 PM' : undefined,
      timestamp: new Date(),
      message: messages[type],
      priority: priorities[type]
    }
  }

  const handleNewUpdate = (update: BookingUpdate) => {
    setUpdates(prev => [update, ...prev.slice(0, 19)]) // Keep last 20 updates
    
    if (showNotifications) {
      setNotifications(prev => [update, ...prev])
      setUnreadCount(prev => prev + 1)
    }
    
    onUpdateReceived?.(update)
  }

  const dismissNotification = (updateId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== updateId))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const clearAllNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  const getUpdateIcon = (type: BookingUpdate['type']) => {
    switch (type) {
      case 'new_booking': return <Calendar className="w-4 h-4" />
      case 'cancellation': return <X className="w-4 h-4" />
      case 'reschedule': return <RefreshCw className="w-4 h-4" />
      case 'check_in': return <CheckCircle className="w-4 h-4" />
      case 'no_show': return <AlertCircle className="w-4 h-4" />
      case 'completed': return <CheckCircle className="w-4 h-4" />
      default: return <Bell className="w-4 h-4" />
    }
  }

  const getUpdateColor = (type: BookingUpdate['type']) => {
    switch (type) {
      case 'new_booking': return 'text-blue-600 bg-blue-50'
      case 'cancellation': return 'text-red-600 bg-red-50'
      case 'reschedule': return 'text-orange-600 bg-orange-50'
      case 'check_in': return 'text-green-600 bg-green-50'
      case 'no_show': return 'text-red-600 bg-red-50'
      case 'completed': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high': return <Badge className="bg-red-100 text-red-800">High</Badge>
      case 'medium': return <Badge className="bg-orange-100 text-orange-800">Medium</Badge>
      case 'low': return <Badge className="bg-green-100 text-green-800">Low</Badge>
      default: return null
    }
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card className="sfb-card-premium">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isConnected ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-red-600" />
              )}
              <div>
                <h3 className="sfb-heading-secondary font-medium">Real-Time Updates</h3>
                <p className="text-sm sfb-text-premium">
                  {connectionStatus === 'connected' && 'Connected - Live updates active'}
                  {connectionStatus === 'connecting' && 'Connecting to live updates...'}
                  {connectionStatus === 'disconnected' && 'Disconnected - Updates paused'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Badge className="sfb-badge-teal">
                  {unreadCount} new
                </Badge>
              )}
              <div className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live Notifications */}
      {notifications.length > 0 && (
        <Card className="sfb-card-premium border-teal-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" style={{ color: 'var(--sfb-teal)' }} />
                <h3 className="sfb-heading-secondary font-semibold">Live Notifications</h3>
              </div>
              <button
                onClick={clearAllNotifications}
                className="text-sm sfb-text-premium hover:text-teal-600 transition-colors"
              >
                Clear All
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications.slice(0, 3).map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${getUpdateColor(notification.type)}`}
              >
                {getUpdateIcon(notification.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{notification.message}</span>
                    {getPriorityBadge(notification.priority)}
                  </div>
                  <div className="flex items-center gap-2 text-xs opacity-75">
                    <User className="w-3 h-3" />
                    <span>{notification.clientName} • {notification.serviceName}</span>
                    <Clock className="w-3 h-3 ml-2" />
                    <span>{notification.timestamp.toLocaleTimeString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => dismissNotification(notification.id)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {notifications.length > 3 && (
              <div className="text-center pt-2">
                <span className="text-sm sfb-text-premium">
                  +{notifications.length - 3} more notifications
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Updates Feed */}
      <Card className="sfb-card-premium">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-5 h-5 ${isConnected ? 'animate-spin' : ''}`} style={{ color: 'var(--sfb-teal)' }} />
            <h3 className="sfb-heading-secondary font-semibold">Recent Activity Feed</h3>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {updates.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {updates.map((update) => (
                <div
                  key={update.id}
                  className="flex items-start gap-3 p-3 rounded-lg border transition-colors hover:bg-gray-50"
                >
                  <div className={`p-2 rounded-lg ${getUpdateColor(update.type)}`}>
                    {getUpdateIcon(update.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium sfb-text-premium">{update.message}</span>
                      {getPriorityBadge(update.priority)}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Client: {update.clientName}</span>
                        <span>Service: {update.serviceName}</span>
                      </div>
                      {update.type === 'reschedule' && update.originalTime && update.newTime && (
                        <div className="text-sm text-orange-600">
                          Moved from {update.originalTime} to {update.newTime}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {update.timestamp.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-2">
                <RefreshCw className="w-8 h-8 mx-auto" />
              </div>
              <p className="sfb-text-premium">No recent updates</p>
              <p className="text-sm text-gray-500">Live updates will appear here when they occur</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}