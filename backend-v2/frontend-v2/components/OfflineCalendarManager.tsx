'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Upload,
  Download,
  Wifi,
  WifiOff
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface OfflineAppointment {
  id: string
  clientName: string
  clientPhone?: string
  serviceName: string
  servicePrice: number
  startTime: string
  endTime: string
  duration: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  isOfflineCreated: boolean
  lastModified: string
  barberId: string
}

interface OfflineAction {
  id: string
  type: 'create' | 'update' | 'delete'
  appointmentId: string
  timestamp: string
  data: any
  status: 'pending' | 'syncing' | 'synced' | 'error'
}

interface OfflineCalendarManagerProps {
  className?: string
  onAppointmentUpdate?: (appointment: OfflineAppointment) => void
}

export function OfflineCalendarManager({ 
  className, 
  onAppointmentUpdate 
}: OfflineCalendarManagerProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineAppointments, setOfflineAppointments] = useState<OfflineAppointment[]>([])
  const [pendingActions, setPendingActions] = useState<OfflineAction[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [dbReady, setDbReady] = useState(false)
  
  const { toast } = useToast()

  // Initialize IndexedDB for offline storage
  useEffect(() => {
    const initDB = async () => {
      if (!('indexedDB' in window)) {
        console.warn('IndexedDB not supported')
        return
      }

      try {
        const db = await openDatabase()
        setDbReady(true)
        loadOfflineData()
      } catch (error) {
        console.error('Failed to initialize offline database:', error)
      }
    }

    initDB()
  }, [])

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast({
        title: "Connection restored",
        description: "Syncing offline changes..."
      })
      syncOfflineChanges()
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      toast({
        title: "You're offline",
        description: "Changes will be saved locally and synced when connection returns."
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const openDatabase = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OfflineCalendar', 1)
      
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        
        // Appointments store
        if (!db.objectStoreNames.contains('appointments')) {
          const appointmentStore = db.createObjectStore('appointments', { keyPath: 'id' })
          appointmentStore.createIndex('date', 'startTime')
          appointmentStore.createIndex('status', 'status')
          appointmentStore.createIndex('barberId', 'barberId')
        }
        
        // Actions queue store
        if (!db.objectStoreNames.contains('actions')) {
          const actionStore = db.createObjectStore('actions', { keyPath: 'id' })
          actionStore.createIndex('timestamp', 'timestamp')
          actionStore.createIndex('status', 'status')
        }
      }
    })
  }

  const loadOfflineData = async () => {
    try {
      const db = await openDatabase()
      
      // Load appointments
      const appointmentTx = db.transaction(['appointments'], 'readonly')
      const appointmentStore = appointmentTx.objectStore('appointments')
      const appointments = await getAllFromStore(appointmentStore)
      setOfflineAppointments(appointments)
      
      // Load pending actions
      const actionTx = db.transaction(['actions'], 'readonly')
      const actionStore = actionTx.objectStore('actions')
      const actions = await getAllFromStore(actionStore)
      setPendingActions(actions.filter(action => action.status !== 'synced'))
      
    } catch (error) {
      console.error('Failed to load offline data:', error)
    }
  }

  const getAllFromStore = (store: IDBObjectStore): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  const saveAppointmentOffline = async (appointment: OfflineAppointment) => {
    try {
      const db = await openDatabase()
      const tx = db.transaction(['appointments'], 'readwrite')
      const store = tx.objectStore('appointments')
      
      await new Promise((resolve, reject) => {
        const request = store.put(appointment)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      
      // Update local state
      setOfflineAppointments(prev => {
        const existing = prev.findIndex(a => a.id === appointment.id)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = appointment
          return updated
        } else {
          return [...prev, appointment]
        }
      })
      
      onAppointmentUpdate?.(appointment)
      
    } catch (error) {
      console.error('Failed to save appointment offline:', error)
      throw error
    }
  }

  const queueAction = async (action: Omit<OfflineAction, 'id' | 'timestamp' | 'status'>) => {
    try {
      const db = await openDatabase()
      const tx = db.transaction(['actions'], 'readwrite')
      const store = tx.objectStore('actions')
      
      const fullAction: OfflineAction = {
        ...action,
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        status: 'pending'
      }
      
      await new Promise((resolve, reject) => {
        const request = store.put(fullAction)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      
      setPendingActions(prev => [...prev, fullAction])
      
    } catch (error) {
      console.error('Failed to queue action:', error)
    }
  }

  const createAppointmentOffline = async (appointmentData: Partial<OfflineAppointment>) => {
    const appointment: OfflineAppointment = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientName: appointmentData.clientName || 'Unknown Client',
      clientPhone: appointmentData.clientPhone,
      serviceName: appointmentData.serviceName || 'Service',
      servicePrice: appointmentData.servicePrice || 0,
      startTime: appointmentData.startTime || new Date().toISOString(),
      endTime: appointmentData.endTime || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      duration: appointmentData.duration || 60,
      status: appointmentData.status || 'scheduled',
      notes: appointmentData.notes,
      isOfflineCreated: true,
      lastModified: new Date().toISOString(),
      barberId: appointmentData.barberId || 'current_barber'
    }
    
    await saveAppointmentOffline(appointment)
    
    // Queue for sync when online
    await queueAction({
      type: 'create',
      appointmentId: appointment.id,
      data: appointment
    })
    
    toast({
      title: "Appointment created offline",
      description: `${appointment.clientName} - ${appointment.serviceName}`
    })
    
    return appointment
  }

  const syncOfflineChanges = async () => {
    if (!isOnline || isSyncing || pendingActions.length === 0) return
    
    setIsSyncing(true)
    
    try {
      for (const action of pendingActions) {
        if (action.status !== 'pending') continue
        
        // Update action status to syncing
        action.status = 'syncing'
        
        try {
          switch (action.type) {
            case 'create':
              await syncCreateAppointment(action)
              break
            case 'update':
              await syncUpdateAppointment(action)
              break
            case 'delete':
              await syncDeleteAppointment(action)
              break
          }
          
          action.status = 'synced'
          
        } catch (error) {
          console.error(`Failed to sync ${action.type} action:`, error)
          action.status = 'error'
        }
      }
      
      // Remove synced actions
      const db = await openDatabase()
      const tx = db.transaction(['actions'], 'readwrite')
      const store = tx.objectStore('actions')
      
      for (const action of pendingActions) {
        if (action.status === 'synced') {
          await new Promise((resolve, reject) => {
            const request = store.delete(action.id)
            request.onsuccess = () => resolve(request.result)
            request.onerror = () => reject(request.error)
          })
        }
      }
      
      setPendingActions(prev => prev.filter(a => a.status !== 'synced'))
      
      toast({
        title: "Sync completed",
        description: "All offline changes have been synchronized"
      })
      
    } catch (error) {
      console.error('Sync failed:', error)
      
      toast({
        variant: "destructive",
        title: "Sync failed",
        description: "Some changes could not be synchronized"
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const syncCreateAppointment = async (action: OfflineAction) => {
    const response = await fetch('/api/v2/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.data)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to create appointment: ${response.statusText}`)
    }
    
    const serverAppointment = await response.json()
    
    // Update local appointment with server ID
    const localAppointment = offlineAppointments.find(a => a.id === action.appointmentId)
    if (localAppointment) {
      localAppointment.id = serverAppointment.id
      localAppointment.isOfflineCreated = false
      await saveAppointmentOffline(localAppointment)
    }
  }

  const syncUpdateAppointment = async (action: OfflineAction) => {
    const response = await fetch(`/api/v2/appointments/${action.appointmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(action.data)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update appointment: ${response.statusText}`)
    }
  }

  const syncDeleteAppointment = async (action: OfflineAction) => {
    const response = await fetch(`/api/v2/appointments/${action.appointmentId}`, {
      method: 'DELETE'
    })
    
    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to delete appointment: ${response.statusText}`)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'cancelled':
      case 'no-show':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-blue-500" />
    }
  }

  const getNextAppointment = () => {
    const now = new Date()
    return offlineAppointments
      .filter(apt => new Date(apt.startTime) > now && apt.status === 'scheduled')
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0]
  }

  const getTodayAppointments = () => {
    const today = new Date().toDateString()
    return offlineAppointments.filter(apt => 
      new Date(apt.startTime).toDateString() === today
    )
  }

  const nextAppointment = getNextAppointment()
  const todayAppointments = getTodayAppointments()

  if (!dbReady) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading offline calendar...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Network Status Alert */}
      {!isOnline && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            You're offline. Changes are saved locally and will sync when connection returns.
            {pendingActions.length > 0 && (
              <span className="block mt-1 font-medium">
                {pendingActions.length} change(s) waiting to sync
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Sync Status */}
      {isOnline && pendingActions.length > 0 && (
        <Alert>
          <Upload className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              {isSyncing ? 'Syncing changes...' : `${pendingActions.length} change(s) ready to sync`}
            </span>
            {!isSyncing && (
              <Button size="sm" onClick={syncOfflineChanges}>
                Sync Now
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Next Appointment */}
      {nextAppointment && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Next Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span className="font-medium">{nextAppointment.clientName}</span>
                  {nextAppointment.isOfflineCreated && (
                    <Badge variant="secondary" className="text-xs">Offline</Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(nextAppointment.status)}
                  <span className="text-sm text-muted-foreground">
                    {new Date(nextAppointment.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{nextAppointment.serviceName}</span>
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {nextAppointment.servicePrice}
                </span>
                {nextAppointment.clientPhone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {nextAppointment.clientPhone}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today's Schedule */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Schedule
            </div>
            <Badge variant="outline">
              {todayAppointments.length} appointment(s)
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No appointments scheduled for today
            </p>
          ) : (
            <div className="space-y-3">
              {todayAppointments
                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                .map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(appointment.status)}
                      <div>
                        <p className="font-medium">{appointment.clientName}</p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.serviceName}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {new Date(appointment.startTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        ${appointment.servicePrice}
                      </p>
                      {appointment.isOfflineCreated && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          Offline
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Offline Actions Summary */}
      {pendingActions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5" />
              Pending Changes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between text-sm">
                <span>
                  {action.type.charAt(0).toUpperCase() + action.type.slice(1)} appointment
                </span>
                <Badge 
                  variant={
                    action.status === 'synced' ? 'default' :
                    action.status === 'error' ? 'destructive' :
                    action.status === 'syncing' ? 'secondary' : 'outline'
                  }
                >
                  {action.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}