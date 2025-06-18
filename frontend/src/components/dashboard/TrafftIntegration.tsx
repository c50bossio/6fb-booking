'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Mock data - in real app this would come from API
const mockTrafftStatus = {
  connected: true,
  lastSync: "2024-12-18 14:30:25",
  webhookStatus: "active",
  totalAppointments: 156,
  syncedToday: 23,
  pendingSync: 0,
  errors: [],
  apiHealth: "healthy"
}

const mockSyncHistory = [
  {
    id: 1,
    timestamp: "2024-12-18 14:30:25",
    type: "webhook",
    event: "appointment.created",
    status: "success",
    details: "New appointment for John Smith synced"
  },
  {
    id: 2,
    timestamp: "2024-12-18 14:15:12",
    type: "webhook", 
    event: "appointment.updated",
    status: "success",
    details: "Appointment status changed to completed"
  },
  {
    id: 3,
    timestamp: "2024-12-18 13:45:33",
    type: "periodic",
    event: "bulk_sync",
    status: "success",
    details: "12 appointments synced from last 24 hours"
  },
  {
    id: 4,
    timestamp: "2024-12-18 12:30:15",
    type: "webhook",
    event: "payment.completed", 
    status: "success",
    details: "Payment of $75.00 recorded for appointment"
  },
  {
    id: 5,
    timestamp: "2024-12-18 11:22:44",
    type: "webhook",
    event: "customer.created",
    status: "warning", 
    details: "Customer created but missing phone number"
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800'
    case 'warning':
      return 'bg-yellow-100 text-yellow-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getSyncTypeIcon = (type: string) => {
  switch (type) {
    case 'webhook':
      return '⚡'
    case 'periodic':
      return '🔄'
    case 'manual':
      return '👤'
    default:
      return '📡'
  }
}

export default function TrafftIntegration() {
  const [isConnected, setIsConnected] = useState(mockTrafftStatus.connected)
  const [lastSync, setLastSync] = useState(mockTrafftStatus.lastSync)
  const [syncHistory, setSyncHistory] = useState(mockSyncHistory)
  const [isLoading, setIsLoading] = useState(false)

  const handleConnect = () => {
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setIsConnected(!isConnected)
      setIsLoading(false)
      alert(`Trafft ${isConnected ? 'disconnected' : 'connected'}! In Phase 2: Real API integration.`)
    }, 1000)
  }

  const handleManualSync = () => {
    setIsLoading(true)
    // Simulate sync
    setTimeout(() => {
      const newSyncEvent = {
        id: syncHistory.length + 1,
        timestamp: new Date().toLocaleString(),
        type: "manual",
        event: "manual_sync",
        status: "success",
        details: "Manual sync completed - 5 new appointments imported"
      }
      setSyncHistory([newSyncEvent, ...syncHistory])
      setLastSync(new Date().toLocaleString())
      setIsLoading(false)
      alert('Manual sync completed! In Phase 2: Real data import from Trafft.')
    }, 2000)
  }

  const handleInitialImport = () => {
    alert('Initial Import started! In Phase 2: Import last 30 days of appointments, customers, and services from Trafft.')
  }

  const handleWebhookConfig = () => {
    alert('Webhook Configuration! In Phase 2: Configure real-time webhook endpoints for appointment updates.')
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span>Trafft Integration</span>
                <Badge variant={isConnected ? "default" : "destructive"}>
                  {isConnected ? "Connected" : "Disconnected"}
                </Badge>
              </CardTitle>
              <CardDescription>
                Real-time synchronization with your Trafft booking system
              </CardDescription>
            </div>
            <Button 
              variant={isConnected ? "outline" : "default"}
              onClick={handleConnect}
              disabled={isLoading}
            >
              {isLoading ? "..." : (isConnected ? "Disconnect" : "Connect")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{mockTrafftStatus.totalAppointments}</div>
              <div className="text-sm text-gray-600">Total Appointments</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">{mockTrafftStatus.syncedToday}</div>
              <div className="text-sm text-gray-600">Synced Today</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">{mockTrafftStatus.pendingSync}</div>
              <div className="text-sm text-gray-600">Pending Sync</div>
            </div>
            <div className="text-center">
              <Badge variant="default" className="bg-green-100 text-green-800">
                {mockTrafftStatus.apiHealth}
              </Badge>
              <div className="text-sm text-gray-600 mt-1">API Status</div>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <span className="font-medium">Last Sync:</span> {lastSync}
          </div>
        </CardContent>
      </Card>

      {/* Sync Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Controls</CardTitle>
          <CardDescription>Manage data synchronization with Trafft</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              onClick={handleManualSync}
              disabled={!isConnected || isLoading}
              className="flex items-center gap-2"
            >
              🔄 Manual Sync
            </Button>
            <Button 
              variant="outline" 
              onClick={handleInitialImport}
              disabled={!isConnected}
              className="flex items-center gap-2"
            >
              📥 Initial Import
            </Button>
            <Button 
              variant="outline" 
              onClick={handleWebhookConfig}
              disabled={!isConnected}
              className="flex items-center gap-2"
            >
              ⚙️ Webhook Config
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Status */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Real-time Webhook Status</CardTitle>
            <CardDescription>Live updates from Trafft</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Appointment Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Customer Events</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse"></div>
                <span className="text-sm">Payment Events</span>
              </div>
            </div>
            
            <div className="text-sm text-gray-600">
              <div>• Receiving real-time updates from Trafft</div>
              <div>• Webhook endpoint: /api/webhooks/trafft</div>
              <div>• Events processed automatically</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>Recent synchronization events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {syncHistory.map((event) => (
              <div 
                key={event.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getSyncTypeIcon(event.type)}</span>
                  <div>
                    <div className="font-medium text-sm">{event.event}</div>
                    <div className="text-xs text-gray-600">{event.details}</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-xs text-gray-500">{event.timestamp}</div>
                  <Badge 
                    variant="secondary" 
                    className={getStatusColor(event.status)}
                  >
                    {event.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          
          {syncHistory.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No sync events yet. Connect to Trafft to start syncing.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Log */}
      {mockTrafftStatus.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Sync Errors</CardTitle>
            <CardDescription>Issues that need attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {mockTrafftStatus.errors.map((error, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}