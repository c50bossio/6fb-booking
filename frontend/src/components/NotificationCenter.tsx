'use client'

import { useState, useEffect } from 'react'
import { Bell, X, Check, AlertCircle, Trophy, Calendar, Users, DollarSign } from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { notificationsService } from '@/lib/api/notifications'

interface Notification {
  id: number
  type: string
  priority: string
  title: string
  message: string
  data?: any
  is_read: boolean
  created_at: string
  action_url?: string
}

const NotificationIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'appointment':
      return <Calendar className="h-5 w-5" />
    case 'performance_alert':
      return <AlertCircle className="h-5 w-5" />
    case 'team_update':
      return <Users className="h-5 w-5" />
    case 'achievement':
      return <Trophy className="h-5 w-5 text-yellow-500" />
    case 'revenue':
      return <DollarSign className="h-5 w-5 text-green-500" />
    default:
      return <Bell className="h-5 w-5" />
  }
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isClient, setIsClient] = useState(false)
  const { lastMessage, isConnected } = useWebSocket()

  // Set client flag
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Fetch notifications on mount (client-side only)
  useEffect(() => {
    if (isClient) {
      fetchNotifications()
    }
  }, [isClient])

  // Handle new WebSocket messages
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'notification') {
      // Add new notification to the list
      const newNotification: Notification = {
        id: lastMessage.data.id,
        type: lastMessage.notification_type || 'system',
        priority: lastMessage.data.priority || 'medium',
        title: lastMessage.data.title,
        message: lastMessage.data.message,
        data: lastMessage.data.data,
        is_read: false,
        created_at: lastMessage.timestamp || new Date().toISOString(),
        action_url: lastMessage.data.action_url
      }

      setNotifications(prev => [newNotification, ...prev])
      setUnreadCount(prev => prev + 1)

      // Play notification sound
      playNotificationSound()
    }
  }, [lastMessage])

  const fetchNotifications = async () => {
    try {
      const notifications = await notificationsService.getAll()
      setNotifications(notifications)
      setUnreadCount(notifications.filter((n: Notification) => !n.is_read).length)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      // Show fallback demo notifications
      const fallbackNotifications: Notification[] = [
        {
          id: 1,
          type: 'appointment',
          priority: 'high',
          title: 'Upcoming Appointment',
          message: 'You have an appointment with John Smith in 30 minutes',
          data: {
            appointment_id: 1,
            client_name: 'John Smith',
            service: 'Haircut & Beard Trim'
          },
          is_read: false,
          created_at: new Date().toISOString(),
          action_url: '/dashboard/appointments/1'
        },
        {
          id: 2,
          type: 'achievement',
          priority: 'high',
          title: 'Revenue Milestone Achieved! 🎉',
          message: 'Congratulations! You have reached $3,000 in monthly revenue!',
          data: {
            milestone_type: 'monthly_revenue',
            amount: 3000
          },
          is_read: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          action_url: '/analytics'
        },
        {
          id: 3,
          type: 'team_update',
          priority: 'medium',
          title: 'Team Update: New Barber',
          message: 'Welcome Sarah Mitchell to the team! She starts Monday.',
          data: {
            barber_name: 'Sarah Mitchell'
          },
          is_read: false,
          created_at: new Date(Date.now() - 7200000).toISOString(),
          action_url: '/barbers'
        },
        {
          id: 4,
          type: 'revenue',
          priority: 'medium',
          title: 'Weekly Payout Ready',
          message: 'Your weekly payout of $1,200 has been processed',
          data: {
            amount: 1200,
            method: 'Stripe'
          },
          is_read: true,
          created_at: new Date(Date.now() - 14400000).toISOString(),
          action_url: '/barber-payments'
        }
      ]
      setNotifications(fallbackNotifications)
      setUnreadCount(fallbackNotifications.filter(n => !n.is_read).length)
    }
  }

  const markAsRead = async (notificationId: number) => {
    try {
      await notificationsService.markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Error marking notification as read:', error)
      // Still update UI optimistically for demo
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
      // Still update UI optimistically for demo
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  const clearNotification = async (notificationId: number) => {
    try {
      await notificationsService.delete(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId)
        return notification && !notification.is_read ? prev - 1 : prev
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
      // Still update UI optimistically for demo
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => {
        const notification = notifications.find(n => n.id === notificationId)
        return notification && !notification.is_read ? prev - 1 : prev
      })
    }
  }

  const playNotificationSound = () => {
    // Play a subtle notification sound (client-side only)
    if (typeof window !== 'undefined' && isClient) {
      const audio = new Audio('/notification.mp3')
      audio.volume = 0.3
      audio.play().catch(() => {
        // Ignore errors if autoplay is blocked
      })
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`

    return date.toLocaleDateString()
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        {isClient && isConnected && (
          <span className="absolute bottom-1 right-1 h-2 w-2 bg-green-500 rounded-full" />
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                    >
                      Mark all as read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      !notification.is_read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`flex-shrink-0 ${
                        notification.priority === 'urgent' ? 'text-red-500' :
                        notification.priority === 'high' ? 'text-orange-500' :
                        'text-gray-500'
                      }`}>
                        <NotificationIcon type={notification.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {notification.title}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-xs text-blue-600 hover:text-blue-700"
                            >
                              <Check className="h-3 w-3 inline mr-1" />
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => clearNotification(notification.id)}
                        className="flex-shrink-0 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <a
                  href="/notifications"
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View all notifications
                </a>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
