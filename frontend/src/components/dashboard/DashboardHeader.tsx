'use client'

import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function DashboardHeader() {
  // TODO: Get user data from authentication context
  const barberName = "Demo Barber"
  const businessName = "Six Figure Cuts"
  const [isConnected, setIsConnected] = useState(true)

  const handleSettingsClick = () => {
    alert('Settings panel would open here. In Phase 2: User preferences, Trafft API configuration, business settings.')
  }

  const handleAddAppointmentClick = () => {
    alert('Add Appointment modal would open here. In Phase 2: Quick appointment entry form with client selection.')
  }

  const handleConnectionClick = () => {
    setIsConnected(!isConnected)
    alert(isConnected ? 'Trafft disconnected (demo)' : 'Trafft connected (demo)')
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-4">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          {/* Left side - Branding */}
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 text-white px-3 py-2 rounded-lg font-bold text-lg">
              6FB
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{businessName}</h1>
              <p className="text-sm text-gray-600">Welcome back, {barberName}</p>
            </div>
          </div>

          {/* Right side - Status and Actions */}
          <div className="flex items-center space-x-4">
            <Badge
              variant="secondary"
              className={`cursor-pointer ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
              onClick={handleConnectionClick}
            >
              {isConnected ? 'Trafft Connected' : 'Trafft Disconnected'}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleSettingsClick}>
              Settings
            </Button>
            <Button size="sm" onClick={handleAddAppointmentClick}>
              Add Appointment
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
