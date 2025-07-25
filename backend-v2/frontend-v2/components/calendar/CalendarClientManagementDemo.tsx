'use client'

import React, { useState } from 'react'
import UnifiedCalendar from '@/components/UnifiedCalendar'
import type { CalendarView } from '@/types/calendar'

// Mock data for demonstration
const mockClients = [
  {
    id: 1,
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    created_at: '2024-01-15T10:30:00Z',
    last_appointment: '2024-06-20T14:00:00Z',
    total_appointments: 12,
    total_revenue: 840.00,
    is_vip: true,
    is_favorite: false,
    tags: ['VIP', 'Regular'],
    status: 'active'
  },
  {
    id: 2,
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.johnson@email.com',
    phone: '+1 (555) 987-6543',
    created_at: '2024-03-10T09:15:00Z',
    last_appointment: '2024-06-18T11:30:00Z',
    total_appointments: 8,
    total_revenue: 480.00,
    is_vip: false,
    is_favorite: true,
    tags: ['Favorite', 'Punctual'],
    status: 'active'
  }
]

const mockAppointments = [
  {
    id: 1,
    client_id: 1,
    client_name: 'John Smith',
    barber_id: 1,
    start_time: '2024-07-25T10:00:00Z',
    end_time: '2024-07-25T11:00:00Z',
    service_name: 'Premium Haircut & Styling',
    service_id: 1,
    status: 'completed',
    price: 85.00,
    duration_minutes: 60,
    notes: 'VIP client - premium service',
    is_premium: true,
    add_ons: ['Beard Trim', 'Hot Towel'],
    tips: 17.00,
    client: mockClients[0]
  },
  {
    id: 2,
    client_id: 2,
    client_name: 'Sarah Johnson',
    barber_id: 1,
    start_time: '2024-07-25T14:00:00Z',
    end_time: '2024-07-25T15:30:00Z',
    service_name: 'Signature Cut & Style',
    service_id: 2,
    status: 'completed',
    price: 95.00,
    duration_minutes: 90,
    notes: 'Loyal client - personalized service',
    is_premium: true,
    add_ons: ['Deep Conditioning'],
    tips: 20.00,
    client: mockClients[1]
  },
  {
    id: 3,
    client_id: 1,
    client_name: 'John Smith',
    barber_id: 1,
    start_time: '2024-07-24T15:00:00Z',
    end_time: '2024-07-24T16:00:00Z',
    service_name: 'Premium Haircut & Styling',
    service_id: 1,
    status: 'completed',
    price: 85.00,
    duration_minutes: 60,
    notes: 'Regular appointment',
    is_premium: true,
    tips: 15.00,
    client: mockClients[0]
  },
  {
    id: 4,
    client_id: 2,
    client_name: 'Sarah Johnson',
    barber_id: 1,
    start_time: '2024-07-23T11:00:00Z',
    end_time: '2024-07-23T12:00:00Z',
    service_name: 'Basic Cut',
    service_id: 3,
    status: 'completed',
    price: 55.00,
    duration_minutes: 60,
    notes: 'Standard service',
    is_premium: false,
    tips: 8.00,
    client: mockClients[1]
  }
]

const mockBarbers = [
  {
    id: 1,
    name: 'Mike Wilson',
    first_name: 'Mike',
    last_name: 'Wilson',
    email: 'mike@barbershop.com',
    avatar: '/avatars/mike.jpg'
  }
]

export default function CalendarClientManagementDemo() {
  const [view, setView] = useState<CalendarView>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedBarberId, setSelectedBarberId] = useState<number | 'all'>('all')

  const handleAppointmentClick = (appointment: any) => {
    console.log('Appointment clicked:', appointment)
    // In a real app, this would open an appointment edit modal
  }

  const handleClientClick = (client: any) => {
    console.log('Client clicked:', client)
    // In a real app, this would open client details or select the client
  }

  const handleTimeSlotClick = (date: Date, barberId?: number) => {
    console.log('Time slot clicked:', { date, barberId })
    // In a real app, this would open a new appointment modal
  }

  const handleCreateAppointment = (clientId?: number) => {
    console.log('Create appointment for client:', clientId)
    // In a real app, this would open appointment creation form with pre-selected client
  }

  const handleUpdateClient = (client: any) => {
    console.log('Update client:', client)
    // In a real app, this would update the client data
  }

  const handleViewClientHistory = (clientId: number) => {
    console.log('View client history:', clientId)
    // In a real app, this would show detailed client history
  }

  const handleAppointmentUpdate = async (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => {
    console.log('Update appointment:', { appointmentId, newStartTime, isDragDrop })
    // In a real app, this would update the appointment in the database
  }

  return (
    <div className="h-screen w-full">
      <div className="p-4 bg-gray-100 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Calendar with Business Intelligence Integration
        </h1>
        <p className="text-gray-600">
          Click the "Clients" button to open client management panel, or "Revenue" button to access Six Figure Barber analytics and optimization tools.
          Try exploring the different panels and their features.
        </p>
        
        <div className="flex items-center space-x-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as CalendarView)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="day">Day View</option>
              <option value="week">Week View</option>
              <option value="month">Month View</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Barber</label>
            <select
              value={selectedBarberId}
              onChange={(e) => setSelectedBarberId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            >
              <option value="all">All Barbers</option>
              {mockBarbers.map(barber => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      <div className="flex-1 h-full">
        <UnifiedCalendar
          view={view}
          onViewChange={setView}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          appointments={mockAppointments}
          barbers={mockBarbers}
          clients={mockClients}
          selectedBarberId={selectedBarberId}
          onBarberSelect={setSelectedBarberId}
          onAppointmentClick={handleAppointmentClick}
          onClientClick={handleClientClick}
          onTimeSlotClick={handleTimeSlotClick}
          onAppointmentUpdate={handleAppointmentUpdate}
          onCreateAppointment={handleCreateAppointment}
          onUpdateClient={handleUpdateClient}
          onViewClientHistory={handleViewClientHistory}
          startHour={8}
          endHour={18}
          slotDuration={30}
          className="h-full"
        />
      </div>
    </div>
  )
}