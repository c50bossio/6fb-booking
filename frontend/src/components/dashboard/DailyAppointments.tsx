'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

// Mock data - in real app this would come from API
const mockAppointments = [
  {
    id: 1,
    time: "9:00 AM",
    clientName: "John Smith",
    service: "Haircut & Beard Trim",
    revenue: 75.00,
    status: "completed",
    customerType: "returning",
    duration: 60
  },
  {
    id: 2,
    time: "10:30 AM",
    clientName: "Mike Johnson",
    service: "Standard Cut",
    revenue: 45.00,
    status: "completed",
    customerType: "new",
    duration: 45
  },
  {
    id: 3,
    time: "12:00 PM",
    clientName: "David Wilson",
    service: "Premium Cut + Styling",
    revenue: 85.00,
    status: "completed",
    customerType: "returning",
    duration: 75
  },
  {
    id: 4,
    time: "2:00 PM",
    clientName: "Alex Brown",
    service: "Haircut",
    revenue: 50.00,
    status: "in_progress",
    customerType: "returning",
    duration: 60
  },
  {
    id: 5,
    time: "3:30 PM",
    clientName: "Robert Davis",
    service: "Cut + Beard",
    revenue: 70.00,
    status: "scheduled",
    customerType: "new",
    duration: 60
  },
  {
    id: 6,
    time: "5:00 PM",
    clientName: "Chris Miller",
    service: "Standard Cut",
    revenue: 45.00,
    status: "scheduled",
    customerType: "returning",
    duration: 45
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800'
    case 'in_progress':
      return 'bg-blue-100 text-blue-800'
    case 'scheduled':
      return 'bg-gray-100 text-gray-800'
    case 'cancelled':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getCustomerTypeColor = (type: string) => {
  return type === 'new' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
}

export default function DailyAppointments() {
  const [appointments, setAppointments] = useState(mockAppointments)

  const completedAppointments = appointments.filter(apt => apt.status === 'completed')
  const totalRevenue = completedAppointments.reduce((sum, apt) => sum + apt.revenue, 0)
  const averageTicket = completedAppointments.length > 0 ? totalRevenue / completedAppointments.length : 0

  const handleCheckIn = (appointmentId: number) => {
    setAppointments(prev => prev.map(apt =>
      apt.id === appointmentId
        ? { ...apt, status: 'in_progress' }
        : apt
    ))
  }

  const handleAddWalkIn = () => {
    const newAppointment = {
      id: appointments.length + 1,
      time: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      clientName: "Walk-in Customer",
      service: "Standard Cut",
      revenue: 45.00,
      status: "in_progress",
      customerType: "new",
      duration: 45
    }
    setAppointments(prev => [...prev, newAppointment])
    alert('Walk-in appointment added! In Phase 2: Full appointment form with client selection.')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Today&apos;s Appointments</CardTitle>
            <CardDescription>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">${totalRevenue.toFixed(2)}</div>
            <div className="text-sm text-gray-600">
              {completedAppointments.length} completed • Avg: ${averageTicket.toFixed(2)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold">{appointments.length}</div>
              <div className="text-sm text-gray-600">Total Scheduled</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">{completedAppointments.length}</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold">
                {appointments.filter(apt => apt.customerType === 'new').length}
              </div>
              <div className="text-sm text-gray-600">New Customers</div>
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-2">
            {appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-sm font-medium text-gray-900 min-w-[80px]">
                    {appointment.time}
                  </div>
                  <div>
                    <div className="font-medium">{appointment.clientName}</div>
                    <div className="text-sm text-gray-600">{appointment.service}</div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge
                    variant="secondary"
                    className={getCustomerTypeColor(appointment.customerType)}
                  >
                    {appointment.customerType}
                  </Badge>

                  <div className="text-right min-w-[80px]">
                    <div className="font-medium">${appointment.revenue.toFixed(2)}</div>
                    <div className="text-xs text-gray-600">{appointment.duration}min</div>
                  </div>

                  <Badge
                    variant="secondary"
                    className={getStatusColor(appointment.status)}
                  >
                    {appointment.status.replace('_', ' ')}
                  </Badge>

                  {appointment.status === 'scheduled' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCheckIn(appointment.id)}
                    >
                      Check In
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add Appointment Button */}
          <div className="pt-4 border-t">
            <Button
              className="w-full"
              variant="outline"
              onClick={handleAddWalkIn}
            >
              + Add Walk-in Appointment
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
