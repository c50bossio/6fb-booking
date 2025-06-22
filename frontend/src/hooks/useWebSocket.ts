import { useEffect, useRef, useCallback, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'

interface WebSocketMessage {
  type: string
  data?: any
  timestamp?: string
  notification_type?: string
}

interface WebSocketHook {
  isConnected: boolean
  sendMessage: (message: WebSocketMessage) => void
  lastMessage: WebSocketMessage | null
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
}

export function useWebSocket(): WebSocketHook {
  const { user } = useAuth()
  const ws = useRef<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<WebSocketHook['connectionStatus']>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const [isClient, setIsClient] = useState(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    if (!user || !isClient || ws.current?.readyState === WebSocket.OPEN) {
      return
    }

    setConnectionStatus('connecting')

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
    const url = token ? `${wsUrl}/api/v1/ws?token=${encodeURIComponent(token)}` : `${wsUrl}/api/v1/ws`

    try {
      ws.current = new WebSocket(url)

      ws.current.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionStatus('connected')
        reconnectAttemptsRef.current = 0

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }))
          }
        }, 30000)

        // Store interval ID for cleanup
        ws.current.addEventListener('close', () => {
          clearInterval(pingInterval)
        })
      }

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('WebSocket message received:', message)
          setLastMessage(message)

          // Handle different message types
          handleMessage(message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
      }

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setConnectionStatus('disconnected')

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000)
          reconnectAttemptsRef.current++

          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        }
      }
    } catch (error) {
      console.error('Error creating WebSocket:', error)
      setConnectionStatus('error')
    }
  }, [user, isClient])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    if (ws.current) {
      ws.current.close()
      ws.current = null
    }

    setIsConnected(false)
    setConnectionStatus('disconnected')
  }, [])

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket is not connected')
    }
  }, [])

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'notification':
        handleNotification(message)
        break
      case 'team_update':
        handleTeamUpdate(message)
        break
      case 'performance_alert':
        handlePerformanceAlert(message)
        break
      case 'achievement':
        handleAchievement(message)
        break
      default:
        console.log('Unhandled message type:', message.type)
    }
  }

  const handleNotification = (message: WebSocketMessage) => {
    // Show notification using browser API or toast library
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(message.data?.title || 'New Notification', {
        body: message.data?.message || '',
        icon: '/logo.png',
        tag: message.data?.id?.toString() || 'notification'
      })
    }
  }

  const handleTeamUpdate = (message: WebSocketMessage) => {
    // Handle team updates
    console.log('Team update:', message.data)
  }

  const handlePerformanceAlert = (message: WebSocketMessage) => {
    // Handle performance alerts
    console.log('Performance alert:', message.data)
  }

  const handleAchievement = (message: WebSocketMessage) => {
    // Handle achievements with celebration
    console.log('Achievement unlocked!', message.data)

    if (message.data?.celebration) {
      // Trigger celebration animation
      // This could dispatch to a global celebration component
    }
  }

  // Set client flag
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Connect when component mounts and user is authenticated
  useEffect(() => {
    if (user && isClient) {
      connect()

      // Request notification permission
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }

    return () => {
      disconnect()
    }
  }, [user, isClient, connect, disconnect])

  return {
    isConnected,
    sendMessage,
    lastMessage,
    connectionStatus
  }
}
