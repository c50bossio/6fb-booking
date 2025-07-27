'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { 
  WifiIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  BoltIcon,
  EyeIcon,
  PencilIcon,
  UserPlusIcon,
  SignalIcon
} from '@heroicons/react/24/outline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useCalendar, CalendarAppointment } from '@/contexts/CalendarContext'
import { cn } from '@/lib/utils'

interface RealtimeUser {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'owner' | 'barber' | 'admin' | 'staff'
  lastSeen: Date
  isOnline: boolean
  currentView?: string
  isEditing?: string // appointment ID being edited
}

interface RealtimeEvent {
  id: string
  type: 'appointment_created' | 'appointment_updated' | 'appointment_deleted' | 'user_joined' | 'user_left' | 'user_editing' | 'conflict_detected'
  userId: string
  userName: string
  timestamp: Date
  data: any
  appointmentId?: string
}

interface CalendarConflict {
  id: string
  type: 'concurrent_edit' | 'double_booking' | 'data_sync'
  description: string
  affectedUsers: string[]
  appointmentId?: string
  resolution?: 'auto' | 'manual'
  timestamp: Date
}

interface RealtimeCalendarManagerProps {
  className?: string
  userId: string
  userName: string
  userRole: string
  enableCollaborationFeatures?: boolean
  enableConflictDetection?: boolean
  onEventReceived?: (event: RealtimeEvent) => void
  onConflictDetected?: (conflict: CalendarConflict) => void
  onUserActivity?: (user: RealtimeUser) => void
}

export default function RealtimeCalendarManager({
  className,
  userId,
  userName,
  userRole,
  enableCollaborationFeatures = true,
  enableConflictDetection = true,
  onEventReceived,
  onConflictDetected,
  onUserActivity
}: RealtimeCalendarManagerProps) {
  const { state, actions } = useCalendar()
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [onlineUsers, setOnlineUsers] = useState<RealtimeUser[]>([])
  const [recentEvents, setRecentEvents] = useState<RealtimeEvent[]>([])
  const [activeConflicts, setActiveConflicts] = useState<CalendarConflict[]>([])
  const [latency, setLatency] = useState<number>(0)
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPingRef = useRef<number>(0)

  // WebSocket connection management
  const connectWebSocket = useCallback(() => {
    if (wsConnection?.readyState === WebSocket.OPEN) return

    setConnectionStatus('connecting')
    
    // In production, this would use the actual WebSocket URL
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? `wss://${window.location.host}/ws/calendar`
      : `ws://localhost:8000/ws/calendar`
    
    try {
      const ws = new WebSocket(wsUrl)
      
      ws.onopen = () => {
        console.log('WebSocket connected')
        setConnectionStatus('connected')
        setWsConnection(ws)
        
        // Send initial user data
        ws.send(JSON.stringify({
          type: 'user_join',
          userId,
          userName,
          userRole,
          timestamp: new Date().toISOString()
        }))
        
        // Start heartbeat
        startHeartbeat(ws)
      }
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          handleWebSocketMessage(message)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }
      
      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setConnectionStatus('disconnected')
        setWsConnection(null)
        
        // Attempt to reconnect unless it was a manual close
        if (event.code !== 1000) {
          scheduleReconnect()
        }
        
        stopHeartbeat()
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionStatus('error')
      }
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionStatus('error')
      scheduleReconnect()
    }
  }, [userId, userName, userRole, wsConnection])

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = useCallback((message: any) => {
    const event: RealtimeEvent = {
      id: message.id || `${Date.now()}-${Math.random()}`,
      type: message.type,
      userId: message.userId,
      userName: message.userName,
      timestamp: new Date(message.timestamp),
      data: message.data,
      appointmentId: message.appointmentId
    }

    switch (message.type) {
      case 'appointment_created':
        if (message.userId !== userId) {
          actions.addAppointment(message.data)
          showNotification(`${message.userName} created a new appointment`)
        }
        break
        
      case 'appointment_updated':
        if (message.userId !== userId) {
          actions.updateAppointment(message.appointmentId, message.data)
          showNotification(`${message.userName} updated an appointment`)
        }
        break
        
      case 'appointment_deleted':
        if (message.userId !== userId) {
          actions.deleteAppointment(message.appointmentId)
          showNotification(`${message.userName} deleted an appointment`)
        }
        break
        
      case 'user_joined':
        setOnlineUsers(prev => {
          const existing = prev.find(u => u.id === message.userId)
          if (existing) {
            return prev.map(u => u.id === message.userId 
              ? { ...u, isOnline: true, lastSeen: new Date() }
              : u
            )
          }
          return [...prev, {
            id: message.userId,
            name: message.userName,
            email: message.data?.email || '',
            role: message.data?.role || 'staff',
            lastSeen: new Date(),
            isOnline: true
          }]
        })
        break
        
      case 'user_left':
        setOnlineUsers(prev => 
          prev.map(u => u.id === message.userId 
            ? { ...u, isOnline: false, lastSeen: new Date() }
            : u
          )
        )
        break
        
      case 'user_editing':
        setOnlineUsers(prev => 
          prev.map(u => u.id === message.userId 
            ? { ...u, isEditing: message.appointmentId }
            : u
          )
        )
        
        // Detect concurrent editing conflicts
        if (enableConflictDetection && message.appointmentId) {
          const otherEditors = onlineUsers.filter(u => 
            u.id !== message.userId && u.isEditing === message.appointmentId
          )
          
          if (otherEditors.length > 0) {
            const conflict: CalendarConflict = {
              id: `conflict-${Date.now()}`,
              type: 'concurrent_edit',
              description: `Multiple users editing appointment ${message.appointmentId}`,
              affectedUsers: [message.userId, ...otherEditors.map(u => u.id)],
              appointmentId: message.appointmentId,
              timestamp: new Date()
            }
            
            setActiveConflicts(prev => [...prev, conflict])
            onConflictDetected?.(conflict)
          }
        }
        break
        
      case 'pong':
        // Calculate latency
        const now = Date.now()
        setLatency(now - lastPingRef.current)
        break
    }

    // Add to recent events
    setRecentEvents(prev => [event, ...prev.slice(0, 49)]) // Keep last 50 events
    onEventReceived?.(event)
  }, [userId, actions, onlineUsers, enableConflictDetection, onEventReceived, onConflictDetected])

  // Send WebSocket message
  const sendMessage = useCallback((message: any) => {
    if (wsConnection?.readyState === WebSocket.OPEN) {
      wsConnection.send(JSON.stringify({
        ...message,
        userId,
        userName,
        timestamp: new Date().toISOString()
      }))
    }
  }, [wsConnection, userId, userName])

  // Broadcast appointment changes
  const broadcastAppointmentChange = useCallback((
    type: 'created' | 'updated' | 'deleted',
    appointmentId: string | number,
    data?: any
  ) => {
    sendMessage({
      type: `appointment_${type}`,
      appointmentId: appointmentId.toString(),
      data
    })
  }, [sendMessage])

  // Broadcast user activity
  const broadcastUserActivity = useCallback((activity: string, appointmentId?: string) => {
    sendMessage({
      type: 'user_editing',
      appointmentId,
      data: { activity }
    })
  }, [sendMessage])

  // Heartbeat management
  const startHeartbeat = useCallback((ws: WebSocket) => {
    heartbeatIntervalRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        lastPingRef.current = Date.now()
        ws.send(JSON.stringify({ type: 'ping', timestamp: lastPingRef.current }))
      }
    }, 30000) // Ping every 30 seconds
  }, [])

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
  }, [])

  // Reconnection logic
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      connectWebSocket()
    }, 5000) // Reconnect after 5 seconds
  }, [connectWebSocket])

  // Initialize connection
  useEffect(() => {
    connectWebSocket()
    
    return () => {
      if (wsConnection) {
        wsConnection.close(1000, 'Component unmounting')
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      stopHeartbeat()
    }
  }, [])

  // Disconnect on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (wsConnection) {
        wsConnection.close(1000, 'Page unloading')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [wsConnection])

  // Show notification
  const showNotification = useCallback((message: string) => {
    // In production, this would use a proper notification system
    console.log('Realtime notification:', message)
  }, [])

  // Resolve conflict
  const resolveConflict = useCallback((conflictId: string, resolution: 'accept_changes' | 'reject_changes' | 'merge') => {
    setActiveConflicts(prev => prev.filter(c => c.id !== conflictId))
    
    sendMessage({
      type: 'conflict_resolved',
      conflictId,
      resolution
    })
  }, [sendMessage])

  // Get connection status color
  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600'
      case 'connecting': return 'text-yellow-600'
      case 'disconnected': return 'text-gray-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return WifiIcon
      case 'connecting': return ArrowPathIcon
      case 'disconnected': return ExclamationTriangleIcon
      case 'error': return ExclamationTriangleIcon
      default: return WifiIcon
    }
  }

  const ConnectionIcon = getConnectionStatusIcon()

  return (
    <div className={cn("space-y-4", className)}>
      {/* Connection Status */}
      <Card className={cn(
        "border-l-4",
        connectionStatus === 'connected' ? "border-l-green-500" : 
        connectionStatus === 'connecting' ? "border-l-yellow-500" : "border-l-red-500"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ConnectionIcon className={cn("h-4 w-4", getConnectionStatusColor())} />
              <span className="capitalize">{connectionStatus}</span>
              {connectionStatus === 'connected' && (
                <Badge variant="secondary" className="text-xs">
                  {latency}ms
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {onlineUsers.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  {onlineUsers.filter(u => u.isOnline).length} online
                </Badge>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={connectWebSocket}
                disabled={connectionStatus === 'connecting'}
              >
                <ArrowPathIcon className="h-4 w-4" />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        {enableCollaborationFeatures && (
          <CardContent className="pt-0">
            {/* Online Users */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Active users:</span>
              <div className="flex items-center space-x-1">
                {onlineUsers.filter(u => u.isOnline).slice(0, 5).map(user => (
                  <TooltipProvider key={user.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          <Avatar className="h-6 w-6">
                            {user.avatar && <AvatarImage src={user.avatar} />}
                            <AvatarFallback className="text-xs">
                              {user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {user.isEditing && (
                            <div className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full flex items-center justify-center">
                              <PencilIcon className="h-2 w-2 text-white" />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{user.name} ({user.role})</p>
                        {user.isEditing && <p>Editing appointment</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
                
                {onlineUsers.filter(u => u.isOnline).length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{onlineUsers.filter(u => u.isOnline).length - 5}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Active Conflicts */}
      {activeConflicts.length > 0 && (
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-orange-600" />
              <span>Collaboration Conflicts ({activeConflicts.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {activeConflicts.map(conflict => (
                <Alert key={conflict.id}>
                  <AlertDescription>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{conflict.description}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {conflict.affectedUsers.length} users affected • {format(conflict.timestamp, 'h:mm a')}
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveConflict(conflict.id, 'accept_changes')}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => resolveConflict(conflict.id, 'reject_changes')}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      {recentEvents.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center space-x-2">
              <ClockIcon className="h-4 w-4" />
              <span>Recent Activity</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentEvents.slice(0, 10).map(event => (
                <div key={event.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    {event.type.includes('appointment') && <CalendarIcon className="h-3 w-3 text-blue-600" />}
                    {event.type.includes('user') && <UsersIcon className="h-3 w-3 text-green-600" />}
                    <span className="font-medium">{event.userName}</span>
                    <span className="text-gray-600">
                      {event.type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {format(event.timestamp, 'h:mm a')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Hook for real-time calendar integration
export function useRealtimeCalendar(userId: string, userName: string) {
  const [isOnline, setIsOnline] = useState(false)
  const [collaborators, setCollaborators] = useState<RealtimeUser[]>([])
  
  return {
    isOnline,
    collaborators,
    broadcastChange: (type: string, data: any) => {
      // Implementation would broadcast changes
      console.log('Broadcasting change:', type, data)
    },
    subscribeToChanges: (callback: (event: RealtimeEvent) => void) => {
      // Implementation would subscribe to real-time changes
      console.log('Subscribing to changes')
    }
  }
}

// Component for showing real-time editing indicators
export function RealtimeEditingIndicator({ 
  appointmentId, 
  editors 
}: { 
  appointmentId: string
  editors: RealtimeUser[] 
}) {
  if (editors.length === 0) return null

  return (
    <div className="absolute top-2 right-2 flex items-center space-x-1">
      {editors.slice(0, 3).map(editor => (
        <TooltipProvider key={editor.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                <PencilIcon className="h-3 w-3 text-white" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{editor.name} is editing</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
      {editors.length > 3 && (
        <Badge variant="secondary" className="text-xs">
          +{editors.length - 3}
        </Badge>
      )}
    </div>
  )
}