'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'
import {
  isPushNotificationSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isSubscribedToPushNotifications,
  showLocalNotification,
  NotificationOptions
} from '@/lib/push-notifications'

interface UsePushNotificationsReturn {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  isLoading: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  showNotification: (options: NotificationOptions) => void
  requestPermission: () => Promise<NotificationPermission>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check notification support and status
  useEffect(() => {
    const checkStatus = async () => {
      setIsLoading(true)
      try {
        const supported = isPushNotificationSupported()
        setIsSupported(supported)

        if (supported) {
          const perm = getNotificationPermission()
          setPermission(perm)

          const subscribed = await isSubscribedToPushNotifications()
          setIsSubscribed(subscribed)
        }
      } catch (error) {
        console.error('Failed to check notification status:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkStatus()
  }, [])

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication required',
        description: 'Please log in to enable push notifications.'
      })
      throw new Error('User not authenticated')
    }

    if (!isSupported) {
      toast({
        variant: 'destructive',
        title: 'Not supported',
        description: 'Push notifications are not supported in your browser.'
      })
      throw new Error('Push notifications not supported')
    }

    setIsLoading(true)
    try {
      const subscription = await subscribeToPushNotifications(user.id)
      if (subscription) {
        setIsSubscribed(true)
        setPermission('granted')
        toast({
          title: 'Notifications enabled',
          description: 'You will now receive push notifications.'
        })
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to enable notifications',
        description: error.message || 'Please try again later.'
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user, isSupported, toast])

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!user) throw new Error('User not authenticated')

    setIsLoading(true)
    try {
      await unsubscribeFromPushNotifications(user.id)
      setIsSubscribed(false)
      toast({
        title: 'Notifications disabled',
        description: 'You will no longer receive push notifications.'
      })
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to disable notifications',
        description: error.message || 'Please try again later.'
      })
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [user, toast])

  // Show a notification
  const showNotification = useCallback((options: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.warn('Cannot show notification: not supported or permission not granted')
      return
    }

    showLocalNotification(options)
  }, [isSupported, permission])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Push notifications not supported')
    }

    const perm = await Notification.requestPermission()
    setPermission(perm)
    return perm
  }, [isSupported])

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    showNotification,
    requestPermission
  }
}