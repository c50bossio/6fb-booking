'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { addDays, subDays } from 'date-fns'
import EnhancedMobileCalendar from './EnhancedMobileCalendar'

// Mock data for demonstration
const mockServices = [
  {
    id: 1,
    name: 'Haircut & Styling',
    duration: 45,
    price: 35,
    description: 'Professional haircut with styling'
  },
  {
    id: 2,
    name: 'Beard Trim',
    duration: 20,
    price: 15,
    description: 'Precision beard trimming and grooming'
  },
  {
    id: 3,
    name: 'Full Service',
    duration: 75,
    price: 50,
    description: 'Haircut, beard trim, and hot towel treatment'
  },
  {
    id: 4,
    name: 'Kids Cut',
    duration: 30,
    price: 20,
    description: 'Haircut for children under 12'
  }
]

const mockBarbers = [
  {
    id: 1,
    name: 'Mike Johnson',
    avatar: '/api/placeholder/48/48',
    specialties: ['Classic Cuts', 'Beard Styling']
  },
  {
    id: 2,
    name: 'Sarah Williams',
    avatar: '/api/placeholder/48/48',
    specialties: ['Modern Styles', 'Hair Coloring']
  },
  {
    id: 3,
    name: 'David Chen',
    avatar: '/api/placeholder/48/48',
    specialties: ['Fades', 'Traditional Barbering']
  }
]

const generateMockAppointments = (date: Date) => {
  const appointments = []
  const baseTime = new Date(date)
  
  // Generate some random appointments for demo
  const statuses = ['confirmed', 'pending', 'completed', 'cancelled']
  
  for (let i = 0; i < Math.floor(Math.random() * 8) + 2; i++) {
    const hour = Math.floor(Math.random() * 10) + 9 // 9 AM to 6 PM
    const minute = Math.random() > 0.5 ? 0 : 30
    const service = mockServices[Math.floor(Math.random() * mockServices.length)]
    const barber = mockBarbers[Math.floor(Math.random() * mockBarbers.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    appointments.push({
      id: i + 1,
      start_time: new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour, minute).toISOString(),
      service_name: service.name,
      client_name: `Client ${i + 1}`,
      client_email: `client${i + 1}@example.com`,
      client_phone: `(555) 123-456${i}`,
      barber_id: barber.id,
      barber_name: barber.name,
      status: status,
      duration_minutes: service.duration,
      price: service.price
    })
  }
  
  return appointments.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
}

interface MobileCalendarDemoProps {
  className?: string
}

export default function MobileCalendarDemo({ className = '' }: MobileCalendarDemoProps) {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [appointments, setAppointments] = useState(() => generateMockAppointments(new Date()))
  const [isLoading, setIsLoading] = useState(false)
  const [selectedBarberId, setSelectedBarberId] = useState<number | 'all'>('all')

  // Regenerate appointments when date changes
  useEffect(() => {
    setAppointments(generateMockAppointments(selectedDate))
  }, [selectedDate])

  // Handle date change
  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])

  // Handle appointment click
  const handleAppointmentClick = useCallback((appointment: any) => {
    console.log('Appointment clicked:', appointment)
  }, [])

  // Handle booking creation
  const handleBookingCreate = useCallback(async (bookingData: any) => {
    console.log('Creating booking:', bookingData)
    
    // Simulate API call
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Create new appointment
    const newAppointment = {
      id: appointments.length + 1,
      start_time: new Date(
        bookingData.date.getFullYear(),
        bookingData.date.getMonth(),
        bookingData.date.getDate(),
        bookingData.time.hour,
        bookingData.time.minute
      ).toISOString(),
      service_name: bookingData.service.name,
      client_name: bookingData.client.name,
      client_email: bookingData.client.email,
      client_phone: bookingData.client.phone,
      barber_id: bookingData.barber.id,
      barber_name: bookingData.barber.name,
      status: 'pending',
      duration_minutes: bookingData.service.duration,
      price: bookingData.service.price
    }
    
    setAppointments(prev => [...prev, newAppointment].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ))
    
    setIsLoading(false)
  }, [appointments.length])

  // Handle appointment update
  const handleAppointmentUpdate = useCallback(async (appointment: any) => {
    console.log('Updating appointment:', appointment)
    
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setAppointments(prev => 
      prev.map(apt => apt.id === appointment.id ? { ...apt, ...appointment } : apt)
    )
    
    setIsLoading(false)
  }, [])

  // Handle appointment deletion
  const handleAppointmentDelete = useCallback(async (appointmentId: number) => {
    console.log('Deleting appointment:', appointmentId)
    
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    
    setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
    
    setIsLoading(false)
  }, [])

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    console.log('Refreshing calendar data')
    
    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Regenerate appointments with some randomness
    setAppointments(generateMockAppointments(selectedDate))
    
    setIsLoading(false)
  }, [selectedDate])

  return (
    <div className={`h-screen bg-gray-50 dark:bg-gray-900 ${className}`}>
      {/* Demo header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 md:hidden">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">
          Mobile Calendar Demo
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Interactive mobile-optimized calendar booking system
        </p>
      </div>

      {/* Barber filter (for demo) */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 md:hidden">
        <select
          value={selectedBarberId}
          onChange={(e) => setSelectedBarberId(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
          className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
        >
          <option value="all">All Barbers</option>
          {mockBarbers.map(barber => (
            <option key={barber.id} value={barber.id}>
              {barber.name}
            </option>
          ))}
        </select>
      </div>

      {/* Main calendar */}
      <div className="flex-1 overflow-hidden">
        <EnhancedMobileCalendar
          appointments={appointments}
          services={mockServices}
          barbers={mockBarbers}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onAppointmentClick={handleAppointmentClick}
          onBookingCreate={handleBookingCreate}
          onAppointmentUpdate={handleAppointmentUpdate}
          onAppointmentDelete={handleAppointmentDelete}
          onRefresh={handleRefresh}
          selectedBarberId={selectedBarberId}
          isLoading={isLoading}
          enableAccessibility={true}
          className="h-full"
        />
      </div>

      {/* Demo instructions (desktop only) */}
      <div className="hidden md:block fixed bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-sm">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          Mobile Features Demo
        </h3>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>• Touch-friendly 44px+ tap targets</li>
          <li>• Swipe gestures for navigation</li>
          <li>• Pull-to-refresh calendar data</li>
          <li>• Long press for quick actions</li>
          <li>• Haptic feedback responses</li>
          <li>• Responsive layouts</li>
          <li>• Screen reader accessibility</li>
          <li>• Smooth animations</li>
        </ul>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Best experienced on mobile devices
        </p>
      </div>
    </div>
  )
}