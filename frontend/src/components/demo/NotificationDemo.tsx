'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useWebSocket } from '@/hooks/useWebSocket'
import { 
  Bell, 
  Trophy, 
  AlertCircle, 
  Calendar, 
  Users, 
  DollarSign,
  Zap,
  CheckCircle
} from 'lucide-react'

export function NotificationDemo() {
  const { isConnected, connectionStatus, lastMessage } = useWebSocket()
  const [notifications, setNotifications] = useState<any[]>([])

  // Add notification to local state when received
  if (lastMessage && !notifications.find(n => n.timestamp === lastMessage.timestamp)) {
    setNotifications(prev => [lastMessage, ...prev].slice(0, 5))
  }

  const triggerNotification = async (type: string) => {
    // In a real app, these would be triggered by backend events
    // For demo, we'll simulate by calling an API endpoint
    try {
      const response = await fetch('/api/demo/trigger-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ type })
      })
      
      if (response.ok) {
        console.log(`Triggered ${type} notification`)
      }
    } catch (error) {
      console.error('Error triggering notification:', error)
    }
  }

  const notificationTypes = [
    {
      type: 'appointment_booked',
      label: 'New Appointment',
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      type: 'revenue_milestone',
      label: 'Revenue Milestone',
      icon: Trophy,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50'
    },
    {
      type: 'performance_alert',
      label: 'Performance Alert',
      icon: AlertCircle,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      type: 'team_update',
      label: 'Team Update',
      icon: Users,
      color: 'text-teal-500',
      bgColor: 'bg-teal-50'
    },
    {
      type: 'payment_received',
      label: 'Payment Received',
      icon: DollarSign,
      color: 'text-green-500',
      bgColor: 'bg-green-50'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Real-Time Notifications Demo</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">WebSocket Status:</span>
            <div className="flex items-center space-x-1">
              <div className={`h-3 w-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm font-medium capitalize">
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Trigger Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {notificationTypes.map((notif) => {
            const Icon = notif.icon
            return (
              <Button
                key={notif.type}
                variant="outline"
                onClick={() => triggerNotification(notif.type)}
                disabled={!isConnected}
                className="flex flex-col items-center p-4 h-auto"
              >
                <Icon className={`h-6 w-6 mb-2 ${notif.color}`} />
                <span className="text-xs text-center">{notif.label}</span>
              </Button>
            )
          })}
        </div>
      </Card>

      {/* Recent Notifications */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Notifications</h3>
        
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No notifications received yet</p>
            <p className="text-sm mt-1">Click a button above to trigger a notification</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notif, index) => {
              const notifType = notificationTypes.find(
                t => t.type === notif.notification_type
              ) || notificationTypes[0]
              const Icon = notifType.icon
              
              return (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${notifType.bgColor} border-gray-200 animate-fade-in`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 ${notifType.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {notif.data?.title || notif.type}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {notif.data?.message || 'New notification received'}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notif.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    {notif.type === 'achievement' && (
                      <Zap className="h-6 w-6 text-yellow-500 animate-pulse" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Features */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <h3 className="text-lg font-semibold mb-4">WebSocket Features</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium">Real-Time Updates</h4>
              <p className="text-sm text-gray-600">
                Instant notifications without page refresh
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium">Auto-Reconnection</h4>
              <p className="text-sm text-gray-600">
                Automatically reconnects on connection loss
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium">Browser Notifications</h4>
              <p className="text-sm text-gray-600">
                Native browser notifications support
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium">Persistent Connection</h4>
              <p className="text-sm text-gray-600">
                Maintains connection with heartbeat
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}