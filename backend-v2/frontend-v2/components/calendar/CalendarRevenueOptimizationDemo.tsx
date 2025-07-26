'use client'

import React, { useState } from 'react'
import UnifiedCalendar from '@/components/UnifiedCalendar'
import type { CalendarView } from '@/types/calendar'

// Enhanced mock data aligned with Six Figure Barber methodology
const mockClients = [
  {
    id: 1,
    first_name: 'Michael',
    last_name: 'Rodriguez',
    email: 'michael.rodriguez@email.com',
    phone: '+1 (555) 123-4567',
    created_at: '2024-01-15T10:30:00Z',
    last_appointment: '2024-07-25T14:00:00Z',
    total_appointments: 24,
    total_revenue: 2640.00,
    average_rating: 5.0,
    is_vip: true,
    is_favorite: true,
    lifetime_value: 2640.00,
    referral_count: 3,
    tags: ['VIP', 'Premium Client', 'Regular'],
    status: 'active'
  },
  {
    id: 2,
    first_name: 'Jennifer',
    last_name: 'Chen',
    email: 'jennifer.chen@email.com',
    phone: '+1 (555) 987-6543',
    created_at: '2024-02-10T09:15:00Z',
    last_appointment: '2024-07-24T11:30:00Z',
    total_appointments: 16,
    total_revenue: 1520.00,
    average_rating: 4.8,
    is_vip: true,
    is_favorite: false,
    lifetime_value: 1520.00,
    referral_count: 2,
    tags: ['VIP', 'Professional'],
    status: 'active'
  },
  {
    id: 3,
    first_name: 'David',
    last_name: 'Thompson',
    email: 'david.thompson@email.com',
    phone: '+1 (555) 456-7890',
    created_at: '2024-03-20T14:20:00Z',
    last_appointment: '2024-07-23T16:00:00Z',
    total_appointments: 8,
    total_revenue: 520.00,
    average_rating: 4.5,
    is_vip: false,
    is_favorite: true,
    lifetime_value: 520.00,
    referral_count: 1,
    tags: ['Regular', 'Growing'],
    status: 'active'
  }
]

// Six Figure Barber aligned appointment data with premium pricing
const mockAppointments = [
  // Today's appointments (premium services)
  {
    id: 1,
    client_id: 1,
    client_name: 'Michael Rodriguez',
    barber_id: 1,
    start_time: '2024-07-25T09:00:00Z',
    end_time: '2024-07-25T10:30:00Z',
    service_name: 'Signature Executive Cut',
    service_id: 1,
    status: 'completed',
    price: 120.00,
    duration_minutes: 90,
    notes: 'Executive client - premium experience',
    is_premium: true,
    add_ons: ['Executive Shampoo', 'Styling', 'Beard Grooming'],
    tips: 25.00,
    client: mockClients[0]
  },
  {
    id: 2,
    client_id: 2,
    client_name: 'Jennifer Chen',
    barber_id: 1,
    start_time: '2024-07-25T11:00:00Z',
    end_time: '2024-07-25T12:30:00Z',
    service_name: 'VIP Cut & Style Package',
    service_id: 2,
    status: 'completed',
    price: 150.00,
    duration_minutes: 90,
    notes: 'VIP treatment with full consultation',
    is_premium: true,
    add_ons: ['Deep Conditioning', 'Scalp Treatment', 'Styling'],
    tips: 30.00,
    client: mockClients[1]
  },
  {
    id: 3,
    client_id: 3,
    client_name: 'David Thompson',
    barber_id: 1,
    start_time: '2024-07-25T14:00:00Z',
    end_time: '2024-07-25T15:00:00Z',
    service_name: 'Classic Haircut',
    service_id: 3,
    status: 'completed',
    price: 65.00,
    duration_minutes: 60,
    notes: 'Standard service with potential for upselling',
    is_premium: false,
    add_ons: [],
    tips: 10.00,
    client: mockClients[2]
  },
  
  // Yesterday's appointments
  {
    id: 4,
    client_id: 1,
    client_name: 'Michael Rodriguez',
    barber_id: 1,
    start_time: '2024-07-24T10:00:00Z',
    end_time: '2024-07-24T11:30:00Z',
    service_name: 'Signature Executive Cut',
    service_id: 1,
    status: 'completed',
    price: 120.00,
    duration_minutes: 90,
    notes: 'Regular VIP appointment',
    is_premium: true,
    add_ons: ['Executive Shampoo', 'Beard Grooming'],
    tips: 24.00,
    client: mockClients[0]
  },
  {
    id: 5,
    client_id: 2,
    client_name: 'Jennifer Chen',
    barber_id: 1,
    start_time: '2024-07-24T15:00:00Z',
    end_time: '2024-07-24T16:00:00Z',
    service_name: 'Premium Styling',
    service_id: 4,
    status: 'completed',
    price: 85.00,
    duration_minutes: 60,
    notes: 'Styling appointment',
    is_premium: true,
    add_ons: ['Heat Protection'],
    tips: 17.00,
    client: mockClients[1]
  },
  
  // Previous week's appointments
  {
    id: 6,
    client_id: 3,
    client_name: 'David Thompson',
    barber_id: 1,
    start_time: '2024-07-23T16:00:00Z',
    end_time: '2024-07-23T17:00:00Z',
    service_name: 'Classic Haircut',
    service_id: 3,
    status: 'completed',
    price: 65.00,
    duration_minutes: 60,
    notes: 'Opportunity for premium upgrade next visit',
    is_premium: false,
    add_ons: [],
    tips: 8.00,
    client: mockClients[2]
  },
  {
    id: 7,
    client_id: 1,
    client_name: 'Michael Rodriguez',
    barber_id: 1,
    start_time: '2024-07-22T09:30:00Z',
    end_time: '2024-07-22T11:00:00Z',
    service_name: 'VIP Grooming Experience',
    service_id: 5,
    status: 'completed',
    price: 180.00,
    duration_minutes: 90,
    notes: 'Full grooming package',
    is_premium: true,
    add_ons: ['Hot Towel', 'Face Mask', 'Beard Oil', 'Styling'],
    tips: 36.00,
    client: mockClients[0]
  }
]

const mockBarbers = [
  {
    id: 1,
    name: 'Alex Martinez',
    first_name: 'Alex',
    last_name: 'Martinez',
    email: 'alex@sixfigurebarbershop.com',
    avatar: '/avatars/alex.jpg'
  }
]

export default function CalendarRevenueOptimizationDemo() {
  const [view, setView] = useState<CalendarView>('day')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedBarberId, setSelectedBarberId] = useState<number | 'all'>('all')

  const handleAppointmentClick = (appointment: any) => {
    console.log('Appointment clicked:', appointment)
  }

  const handleClientClick = (client: any) => {
    console.log('Client clicked:', client)
  }

  const handleTimeSlotClick = (date: Date, barberId?: number) => {
    console.log('Time slot clicked:', { date, barberId })
  }

  const handleCreateAppointment = (clientId?: number) => {
    console.log('Create appointment for client:', clientId)
  }

  const handleUpdateClient = (client: any) => {
    console.log('Update client:', client)
  }

  const handleViewClientHistory = (clientId: number) => {
    console.log('View client history:', clientId)
  }

  const handleAppointmentUpdate = async (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => {
    console.log('Update appointment:', { appointmentId, newStartTime, isDragDrop })
  }

  return (
    <div className="h-screen w-full">
      <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center">
          <span className="bg-green-600 text-white px-3 py-1 rounded-lg text-lg mr-3">6FB</span>
          Advanced Analytics Suite
        </h1>
        <p className="text-gray-700 mb-3">
          <strong>Six Figure Barber Platform:</strong> Click the "Revenue" button to access the advanced analytics suite with 
          interactive charts, predictive forecasting, and AI-powered business intelligence aligned with 6FB methodology.
        </p>
        
        <div className="bg-white p-3 rounded-lg border border-gray-200 mb-4">
          <h3 className="font-semibold text-gray-800 mb-2">Key Features Demonstrated:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong className="text-green-600">Interactive Charts:</strong>
              <ul className="text-gray-600 mt-1">
                <li>• Real-time revenue visualization</li>
                <li>• Line & bar chart options</li>
                <li>• Appointment vs revenue trends</li>
              </ul>
            </div>
            <div>
              <strong className="text-blue-600">Client Analytics:</strong>
              <ul className="text-gray-600 mt-1">
                <li>• Client distribution charts</li>
                <li>• VIP vs regular analysis</li>
                <li>• Retention rate tracking</li>
              </ul>
            </div>
            <div>
              <strong className="text-purple-600">AI Predictions:</strong>
              <ul className="text-gray-600 mt-1">
                <li>• Revenue forecasting</li>
                <li>• Seasonal trend analysis</li>
                <li>• Smart recommendations</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
            <select
              value={view}
              onChange={(e) => setView(e.target.value as CalendarView)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
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
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
            >
              <option value="all">All Barbers</option>
              {mockBarbers.map(barber => (
                <option key={barber.id} value={barber.id}>
                  {barber.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="bg-white px-3 py-2 rounded-lg border border-green-200">
            <div className="text-xs text-gray-600">Today's Revenue</div>
            <div className="text-lg font-bold text-green-600">$400</div>
          </div>
          
          <div className="bg-white px-3 py-2 rounded-lg border border-blue-200">
            <div className="text-xs text-gray-600">Six Figure Progress</div>
            <div className="text-lg font-bold text-blue-600">47.8%</div>
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