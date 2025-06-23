'use client'

import { useState, useCallback } from 'react'

export interface NotificationData {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

export function useNotification() {
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  const showNotification = useCallback((notification: Omit<NotificationData, 'id'>) => {
    const id = `notification-${Date.now()}-${Math.random()}`
    const newNotification: NotificationData = {
      ...notification,
      id
    }
    
    setNotifications(prev => [...prev, newNotification])
    
    return id
  }, [])

  const hideNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const showSuccess = useCallback((title: string, message?: string) => {
    return showNotification({
      type: 'success',
      title,
      message,
      duration: 5000
    })
  }, [showNotification])

  const showError = useCallback((title: string, message?: string) => {
    return showNotification({
      type: 'error',
      title,
      message,
      duration: 8000
    })
  }, [showNotification])

  const showWarning = useCallback((title: string, message?: string) => {
    return showNotification({
      type: 'warning',
      title,
      message,
      duration: 6000
    })
  }, [showNotification])

  const showInfo = useCallback((title: string, message?: string) => {
    return showNotification({
      type: 'info',
      title,
      message,
      duration: 5000
    })
  }, [showNotification])

  return {
    notifications,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}