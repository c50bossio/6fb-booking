'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '@/hooks/useToast'

interface RealtimeEvent {
  type: 'appointment_booked' | 'appointment_completed' | 'appointment_cancelled' | 'payment_received' | 'client_registered'
  data: {
    id: string
    timestamp: string
    value?: number
    clientId?: string
    serviceId?: string
    barberId?: string
    metadata?: Record<string, any>
  }
}

interface AnalyticsUpdate {
  revenue: {
    current: number
    daily: number[]
    monthly: number[]
  }
  appointments: {
    total: number
    completed: number
    cancelled: number
    daily: number[]
  }
  clients: {
    total: number
    new: number
    returning: number
  }
  lastUpdated: string
}

interface UseRealtimeAnalyticsOptions {
  enabled?: boolean
  reconnectAttempts?: number
  reconnectInterval?: number
  showNotifications?: boolean
}

export function useRealtimeAnalytics(options: UseRealtimeAnalyticsOptions = {}) {
  const {
    enabled = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    showNotifications = true
  } = options

  const [isConnected, setIsConnected] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsUpdate | null>(null)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectCountRef = useRef(0)
  const mountedRef = useRef(true)
  
  const { success, error: showError, info } = useToast()

  // Get WebSocket URL based on environment
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    const port = process.env.NODE_ENV === 'development' ? '8000' : ''
    const wsHost = port ? host.replace(':3002', ':8000').replace(':3000', ':8000') : host
    
    return `${protocol}//${wsHost}/ws/analytics`
  }, [])

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data)
      
      if (message.type === 'analytics_update') {
        setAnalyticsData(message.data)
        setLastEvent(null) // Clear individual events when we get bulk update
      } else if (message.type === 'realtime_event') {
        const realtimeEvent: RealtimeEvent = message.data
        setLastEvent(realtimeEvent)
        
        // Show user-friendly notifications for important events
        if (showNotifications && mountedRef.current) {
          switch (realtimeEvent.type) {
            case 'appointment_booked':
              success('New Appointment Booked! 📅', {
                description: 'A new appointment has been scheduled.',
                duration: 3000
              })
              break
            case 'appointment_completed':
              success('Appointment Completed! ✅', {
                description: `Revenue updated: +$${realtimeEvent.data.value || 0}`,
                duration: 3000
              })
              break
            case 'payment_received':
              success('Payment Received! 💰', {
                description: `+$${realtimeEvent.data.value || 0} added to today's revenue`,
                duration: 4000
              })
              break
            case 'client_registered':
              info('New Client Registered! 👤', {
                description: 'Your client base is growing!',
                duration: 3000
              })
              break
          }
        }
      } else if (message.type === 'connection_confirmed') {
        setIsConnected(true)
        setConnectionError(null)
        reconnectCountRef.current = 0
        
        if (showNotifications && reconnectCountRef.current > 0) {
          success('Dashboard Connected', {
            description: 'Real-time updates are now active',
            duration: 2000
          })
        }
      }
    } catch (err) {
      console.warn('Failed to parse WebSocket message:', err)
    }
  }, [showNotifications, success, info])

  // Handle WebSocket connection errors
  const handleError = useCallback((event: Event) => {
    console.error('WebSocket error:', event)
    setConnectionError('Connection error occurred')
    setIsConnected(false)
  }, [])

  // Handle WebSocket connection close
  const handleClose = useCallback((event: CloseEvent) => {
    setIsConnected(false)
    wsRef.current = null
    
    // Only attempt reconnection if not intentionally closed and component is mounted
    if (event.code !== 1000 && mountedRef.current && enabled && reconnectCountRef.current < reconnectAttempts) {
      const delay = reconnectInterval * Math.pow(1.5, reconnectCountRef.current) // Exponential backoff
      
      setConnectionError(`Connection lost. Reconnecting in ${delay / 1000}s... (${reconnectCountRef.current + 1}/${reconnectAttempts})`)
      
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectCountRef.current++
        connectWebSocket()
      }, delay)
    } else if (reconnectCountRef.current >= reconnectAttempts) {
      setConnectionError('Failed to connect after multiple attempts. Please refresh the page.')
      if (showNotifications) {
        showError('Connection Failed', {
          description: 'Real-time updates are unavailable. Please refresh the page.',
          duration: 10000
        })
      }
    }
  }, [enabled, reconnectAttempts, reconnectInterval, showNotifications, showError])

  // Establish WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!enabled || !mountedRef.current) return

    try {
      const wsUrl = getWebSocketUrl()
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        
        // Send authentication token if available
        const token = localStorage.getItem('token')
        if (token) {
          ws.send(JSON.stringify({
            type: 'authenticate',
            token
          }))
        }
      }
      
      ws.onmessage = handleMessage
      ws.onerror = handleError
      ws.onclose = handleClose
      
      wsRef.current = ws
      
    } catch (err) {
      console.error('Failed to create WebSocket connection:', err)
      setConnectionError('Failed to create connection')
    }
  }, [enabled, getWebSocketUrl, handleMessage, handleError, handleClose])

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000) // Normal closure
      wsRef.current = null
    }
    
    setIsConnected(false)
    setConnectionError(null)
    reconnectCountRef.current = 0
  }, [])

  // Manually trigger reconnection
  const reconnect = useCallback(() => {
    disconnect()
    reconnectCountRef.current = 0
    setConnectionError(null)
    
    setTimeout(() => {
      if (mountedRef.current) {
        connectWebSocket()
      }
    }, 500)
  }, [disconnect, connectWebSocket])

  // Send message to WebSocket
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    return false
  }, [])

  // Initialize WebSocket connection
  useEffect(() => {
    if (enabled) {
      connectWebSocket()
    }

    return () => {
      mountedRef.current = false
      disconnect()
    }
  }, [enabled, connectWebSocket, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    // Connection state
    isConnected,
    connectionError,
    
    // Data
    analyticsData,
    lastEvent,
    
    // Actions
    reconnect,
    disconnect,
    sendMessage,
    
    // Status
    reconnectCount: reconnectCountRef.current,
    maxReconnectAttempts: reconnectAttempts
  }
}

export default useRealtimeAnalytics