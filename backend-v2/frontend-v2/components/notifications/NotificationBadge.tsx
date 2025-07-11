'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Bell, Calendar, DollarSign, Info, User, Check } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'appointment' | 'payment' | 'message' | 'system'
  title: string
  body: string
  timestamp: Date
  read: boolean
  actionUrl?: string
}

export function NotificationBadge() {
  const { user } = useAuth()
  const { isSubscribed, showNotification } = usePushNotifications()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // Mock notifications for demo
    if (user) {
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'appointment',
          title: 'New Booking',
          body: 'John Doe booked a haircut for tomorrow at 2:00 PM',
          timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
          read: false,
          actionUrl: '/calendar'
        },
        {
          id: '2',
          type: 'payment',
          title: 'Payment Received',
          body: 'You received $45.00 from Sarah Johnson',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
          read: false,
          actionUrl: '/payments'
        },
        {
          id: '3',
          type: 'system',
          title: 'New Feature Available',
          body: 'Check out our new calendar export feature!',
          timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
          read: true,
          actionUrl: '/calendar'
        }
      ]
      setNotifications(mockNotifications)
      setUnreadCount(mockNotifications.filter(n => !n.read).length)
    }
  }, [user])

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-4 w-4" />
      case 'payment':
        return <DollarSign className="h-4 w-4" />
      case 'message':
        return <User className="h-4 w-4" />
      case 'system':
        return <Info className="h-4 w-4" />
    }
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs text-primary hover:underline"
            >
              Mark all as read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="p-3 cursor-pointer"
                onClick={() => {
                  markAsRead(notification.id)
                  if (notification.actionUrl) {
                    setIsOpen(false)
                  }
                }}
              >
                <Link
                  href={notification.actionUrl || '#'}
                  className="flex items-start gap-3 w-full"
                >
                  <div className={`mt-0.5 ${notification.read ? 'opacity-50' : ''}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-medium ${notification.read ? 'text-muted-foreground' : ''}`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {notification.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimestamp(notification.timestamp)}
                    </p>
                  </div>
                </Link>
              </DropdownMenuItem>
            ))}
          </div>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link 
            href="/settings/notifications" 
            className="text-center text-sm text-primary hover:underline"
          >
            Notification Settings
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}