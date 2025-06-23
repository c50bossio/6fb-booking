'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  Calendar, 
  DollarSign, 
  Trophy, 
  AlertCircle, 
  Users,
  X,
  Check
} from 'lucide-react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Button } from '@/components/ui/button'
import { notificationVariants, staggerContainer, staggerItem } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  type: 'appointment' | 'payment' | 'achievement' | 'alert' | 'team'
  title: string
  message: string
  timestamp: string
  read: boolean
  priority?: 'low' | 'medium' | 'high'
}

const notificationIcons = {
  appointment: Calendar,
  payment: DollarSign,
  achievement: Trophy,
  alert: AlertCircle,
  team: Users
}

const notificationColors = {
  appointment: 'text-blue-500 bg-blue-50',
  payment: 'text-green-500 bg-green-50',
  achievement: 'text-yellow-500 bg-yellow-50',
  alert: 'text-red-500 bg-red-50',
  team: 'text-teal-500 bg-teal-50'
}

export function AnimatedNotificationCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { lastMessage } = useWebSocket()

  // Add new notifications from WebSocket
  useEffect(() => {
    if (lastMessage?.type === 'notification') {
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: lastMessage.data.notification_type || 'alert',
        title: lastMessage.data.title,
        message: lastMessage.data.message,
        timestamp: new Date().toISOString(),
        read: false,
        priority: lastMessage.data.priority
      }
      
      setNotifications(prev => [newNotification, ...prev])
      
      // Play notification sound
      playNotificationSound()
      
      // Show browser notification if permitted
      showBrowserNotification(newNotification)
    }
  }, [lastMessage])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: true }))
    )
  }

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3')
    audio.volume = 0.5
    audio.play().catch(() => {})
  }

  const showBrowserNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png'
      })
    }
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <motion.button
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Bell className="h-6 w-6" />
        
        {/* Unread Badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Notification Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              variants={notificationVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute right-0 top-12 w-96 max-h-[600px] bg-white rounded-lg shadow-xl border overflow-hidden z-50"
            >
              {/* Header */}
              <div className="p-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs"
                      >
                        Mark all read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Notifications List */}
              <motion.div 
                className="overflow-y-auto max-h-[500px]"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      variants={staggerItem}
                      layout
                      className={cn(
                        "relative p-4 border-b hover:bg-gray-50 transition-colors",
                        !notification.read && "bg-blue-50"
                      )}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <motion.div
                          whileHover={{ rotate: 15 }}
                          className={cn(
                            "p-2 rounded-lg",
                            notificationColors[notification.type]
                          )}
                        >
                          {(() => {
                            const Icon = notificationIcons[notification.type]
                            return <Icon className="h-5 w-5" />
                          })()}
                        </motion.div>

                        {/* Content */}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTimestamp(notification.timestamp)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                          {!notification.read && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 bg-blue-500 rounded-full"
                            />
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              clearNotification(notification.id)
                            }}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </motion.button>
                        </div>
                      </div>

                      {/* Priority indicator */}
                      {notification.priority === 'high' && (
                        <motion.div
                          className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"
                          initial={{ scaleY: 0 }}
                          animate={{ scaleY: 1 }}
                          transition={{ delay: 0.2 }}
                        />
                      )}
                    </motion.div>
                  ))
                )}
              </motion.div>

              {/* Footer */}
              {notifications.length > 0 && (
                <motion.div 
                  className="p-3 border-t bg-gray-50 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setNotifications([])}
                  >
                    Clear all notifications
                  </Button>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)
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