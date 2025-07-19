'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BulkSelectableAppointmentList } from '@/components/appointments/BulkSelectableAppointmentList'
import { EnhancedCalendarExport } from '@/components/calendar/EnhancedCalendarExport'
import { Appointment } from '@/types/appointment'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'

// Mock data generator for demonstration
function generateMockAppointments(): Appointment[] {
  const statuses: Appointment['status'][] = ['confirmed', 'completed', 'cancelled', 'pending', 'no_show']
  const services = [
    { id: 1, name: 'Premium Haircut', duration: 45, price: 65 },
    { id: 2, name: 'Beard Trim', duration: 30, price: 35 },
    { id: 3, name: 'Hot Towel Shave', duration: 60, price: 80 },
    { id: 4, name: 'Hair & Beard Combo', duration: 75, price: 95 },
    { id: 5, name: 'Kids Cut', duration: 30, price: 25 }
  ]
  
  const barbers = [
    { id: 1, name: 'Marcus Johnson', email: 'marcus@bookedbarber.com', location: 'Downtown Shop' },
    { id: 2, name: 'David Chen', email: 'david@bookedbarber.com', location: 'Westside Location' },
    { id: 3, name: 'Tony Rodriguez', email: 'tony@bookedbarber.com', location: 'Downtown Shop' }
  ]
  
  const clients = [
    { id: 1, name: 'John Smith', email: 'john.smith@email.com', phone: '555-0123' },
    { id: 2, name: 'Michael Johnson', email: 'michael.j@email.com', phone: '555-0124' },
    { id: 3, name: 'Robert Williams', email: 'robert.w@email.com', phone: '555-0125' },
    { id: 4, name: 'James Brown', email: 'james.b@email.com', phone: '555-0126' },
    { id: 5, name: 'William Davis', email: 'william.d@email.com', phone: '555-0127' }
  ]
  
  const appointments: Appointment[] = []
  const now = new Date()
  
  // Generate appointments for the past 30 days and next 30 days
  for (let i = -30; i <= 30; i++) {
    const date = new Date(now)
    date.setDate(date.getDate() + i)
    
    // Generate 2-5 appointments per day
    const appointmentsPerDay = Math.floor(Math.random() * 4) + 2
    
    for (let j = 0; j < appointmentsPerDay; j++) {
      const service = services[Math.floor(Math.random() * services.length)]
      const barber = barbers[Math.floor(Math.random() * barbers.length)]
      const client = clients[Math.floor(Math.random() * clients.length)]
      
      // Set random time between 9 AM and 6 PM
      const hour = Math.floor(Math.random() * 9) + 9
      const minute = Math.random() < 0.5 ? 0 : 30
      
      const startTime = new Date(date)
      startTime.setHours(hour, minute, 0, 0)
      
      const endTime = new Date(startTime)
      endTime.setMinutes(endTime.getMinutes() + service.duration)
      
      // Past appointments are mostly completed, future ones are confirmed
      let status: Appointment['status']
      if (i < 0) {
        status = Math.random() < 0.8 ? 'completed' : 
                 Math.random() < 0.9 ? 'no_show' : 'cancelled'
      } else if (i === 0) {
        status = Math.random() < 0.7 ? 'confirmed' : 'pending'
      } else {
        status = Math.random() < 0.9 ? 'confirmed' : 'pending'
      }
      
      appointments.push({
        id: appointments.length + 1,
        barber_id: barber.id,
        client_id: client.id,
        service_id: service.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status,
        total_price: service.price,
        notes: Math.random() < 0.3 ? 'Client prefers shorter style on sides' : undefined,
        created_at: new Date(startTime.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: startTime.toISOString(),
        barber,
        client,
        service
      })
    }
  }
  
  return appointments.sort((a, b) => 
    new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )
}

export default function AppointmentExportPage() {
  const { toast } = useToast()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedAppointments, setSelectedAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In a real app, this would fetch from the API
    // For demo purposes, we'll use mock data
    const mockData = generateMockAppointments()
    setAppointments(mockData)
    setIsLoading(false)
  }, [])

  const handleExport = (format: string, count: number) => {
    }

  const handleStatusChange = (id: number, status: Appointment['status']) => {
    setAppointments(prev => 
      prev.map(apt => apt.id === id ? { ...apt, status } : apt)
    )
    toast({
      title: 'Status updated',
      description: `Appointment status changed to ${status}`
    })
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Appointment Export Center</CardTitle>
          <CardDescription>
            Export appointments with advanced filtering, bulk selection, and multiple format options
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <InfoIcon className="h-4 w-4" />
            <AlertDescription>
              This page demonstrates the enhanced calendar export functionality with bulk operations,
              PDF/JSON exports, email integration, and scheduling capabilities.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-muted-foreground">
              Total appointments: {appointments.length} • 
              Selected: {selectedAppointments.length}
            </div>
            <EnhancedCalendarExport
              appointments={appointments}
              selectedAppointments={selectedAppointments}
              onExport={handleExport}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">Appointment List</TabsTrigger>
          <TabsTrigger value="insights">Export Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <BulkSelectableAppointmentList
            appointments={appointments}
            onSelectionChange={setSelectedAppointments}
            onStatusChange={handleStatusChange}
          />
        </TabsContent>

        <TabsContent value="insights">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(
                  appointments.reduce((acc, apt) => {
                    if (!acc[apt.status]) acc[apt.status] = 0
                    acc[apt.status] += apt.total_price
                    return acc
                  }, {} as Record<string, number>)
                ).map(([status, revenue]) => (
                  <div key={status} className="flex justify-between py-1">
                    <span className="text-sm capitalize">{status.replace('_', ' ')}</span>
                    <span className="text-sm font-medium">${revenue.toFixed(2)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Services</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.entries(
                  appointments.reduce((acc, apt) => {
                    const service = apt.service?.name || 'Unknown'
                    if (!acc[service]) acc[service] = 0
                    acc[service]++
                    return acc
                  }, {} as Record<string, number>)
                )
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 5)
                  .map(([service, count]) => (
                    <div key={service} className="flex justify-between py-1">
                      <span className="text-sm">{service}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Features</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  <li>✓ Bulk selection with filters</li>
                  <li>✓ PDF reports with 6FB metrics</li>
                  <li>✓ JSON backup/migration export</li>
                  <li>✓ Email export integration</li>
                  <li>✓ Scheduled recurring exports</li>
                  <li>✓ Export history tracking</li>
                  <li>✓ Saved export configurations</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}