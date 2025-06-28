'use client'

import React, { useState } from 'react'

// Mock data - in real app this would come from API
const mockTrafftStatus = {
  connected: true,
  lastSync: "2024-12-20 14:30:25",
  webhookStatus: "active",
  totalAppointments: 342,
  syncedToday: 18,
  pendingSync: 0,
  errors: [],
  apiHealth: "healthy",
  businessName: "Headlines Barbershop",
  locationCount: 3,
  staffCount: 8,
  todayRevenue: 1250.00
}

const mockSyncHistory = [
  {
    id: 1,
    timestamp: "2024-12-20 14:30:25",
    type: "webhook",
    event: "appointment.created",
    status: "success",
    details: "New appointment: Marcus Johnson - Fade + Beard Trim ($45)"
  },
  {
    id: 2,
    timestamp: "2024-12-20 14:15:12",
    type: "webhook",
    event: "appointment.completed",
    status: "success",
    details: "Appointment completed: DeAndre Williams - Classic Cut ($35)"
  },
  {
    id: 3,
    timestamp: "2024-12-20 13:45:33",
    type: "periodic",
    event: "bulk_sync",
    status: "success",
    details: "18 appointments synced from Headlines Barbershop"
  },
  {
    id: 4,
    timestamp: "2024-12-20 12:30:15",
    type: "webhook",
    event: "payment.completed",
    status: "success",
    details: "Payment processed: $65.00 - Jaylen Carter (Signature Cut)"
  },
  {
    id: 5,
    timestamp: "2024-12-20 11:22:44",
    type: "webhook",
    event: "customer.updated",
    status: "success",
    details: "Customer profile updated: Isaiah Brooks - loyalty points added"
  },
  {
    id: 6,
    timestamp: "2024-12-20 10:15:33",
    type: "webhook",
    event: "appointment.cancelled",
    status: "warning",
    details: "Appointment cancelled: Xavier Thompson - Refund processed"
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

  return (
    <div className="p-6">
      {/* Status Overview - Clean & Minimal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <div className="text-xl font-bold text-white">{mockTrafftStatus.totalAppointments}</div>
          <div className="text-xs text-slate-400 font-medium">Total Synced</div>
        </div>
        <div className="text-center p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <div className="text-xl font-bold text-emerald-400">{mockTrafftStatus.syncedToday}</div>
          <div className="text-xs text-slate-400 font-medium">Today</div>
        </div>
        <div className="text-center p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <div className="text-xl font-bold text-blue-400">{mockTrafftStatus.locationCount}</div>
          <div className="text-xs text-slate-400 font-medium">Locations</div>
        </div>
        <div className="text-center p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
          <div className="text-xl font-bold text-amber-400">${mockTrafftStatus.todayRevenue.toLocaleString()}</div>
          <div className="text-xs text-slate-400 font-medium">Revenue</div>
        </div>
      </div>

      {/* Business Info - Streamlined */}
      <div className="flex items-center justify-between p-4 bg-slate-700/20 rounded-lg border border-slate-600/30 mb-6">
        <div>
          <div className="text-sm font-medium text-white">{mockTrafftStatus.businessName}</div>
          <div className="text-xs text-slate-400">{mockTrafftStatus.staffCount} barbers • Last sync: {new Date(lastSync).toLocaleTimeString()}</div>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          <span className="text-xs font-medium text-emerald-400">Live</span>
        </div>
      </div>

      {/* Recent Activity - Simplified */}
      <div>
        <h4 className="text-sm font-medium text-white mb-3">Recent Sync Activity</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {mockSyncHistory.slice(0, 4).map((event) => (
            <div
              key={event.id}
              className="flex items-center justify-between p-3 bg-slate-700/20 rounded-lg border border-slate-600/20 hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <span className="text-sm">{getSyncTypeIcon(event.type)}</span>
                <div>
                  <div className="text-xs font-medium text-white">{event.event.replace('_', ' ')}</div>
                  <div className="text-xs text-slate-400 truncate max-w-64">{event.details}</div>
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
