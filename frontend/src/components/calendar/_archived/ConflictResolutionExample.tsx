'use client'

import React, { useState } from 'react'
import DragDropCalendar from './DragDropCalendar'
import { CalendarAppointment } from './PremiumCalendar'
import { ConflictResolution } from '../modals/ConflictResolutionModal'

// Example implementation showing the conflict resolution system in action
export default function ConflictResolutionExample() {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>([
    {
      id: '1',
      title: 'Premium Cut',
      client: 'John Smith',
      clientId: 1,
      barber: 'Marcus Johnson',
      barberId: 1,
      startTime: '10:00',
      endTime: '11:00',
      service: 'Premium Haircut',
      serviceId: 1,
      price: 75,
      status: 'confirmed',
      date: '2024-06-25',
      duration: 60,
      clientPhone: '+1 (555) 123-4567',
      clientEmail: 'john.smith@email.com'
    },
    {
      id: '2',
      title: 'Beard Trim',
      client: 'Mike Johnson',
      clientId: 2,
      barber: 'Marcus Johnson',
      barberId: 1,
      startTime: '11:30',
      endTime: '12:00',
      service: 'Beard Trim',
      serviceId: 2,
      price: 35,
      status: 'confirmed',
      date: '2024-06-25',
      duration: 30,
      clientPhone: '+1 (555) 234-5678',
      clientEmail: 'mike.johnson@email.com'
    },
    {
      id: '3',
      title: 'Full Service',
      client: 'David Wilson',
      clientId: 3,
      barber: 'Alex Thompson',
      barberId: 2,
      startTime: '14:00',
      endTime: '15:30',
      service: 'Cut & Beard Package',
      serviceId: 3,
      price: 95,
      status: 'confirmed',
      date: '2024-06-25',
      duration: 90,
      clientPhone: '+1 (555) 345-6789',
      clientEmail: 'david.wilson@email.com'
    }
  ])

  const handleAppointmentMove = async (
    appointmentId: string,
    newDate: string,
    newTime: string,
    originalDate: string,
    originalTime: string
  ) => {
    console.log('Moving appointment:', {
      appointmentId,
      from: `${originalDate} ${originalTime}`,
      to: `${newDate} ${newTime}`
    })

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Update the appointment in state
    setAppointments(prev => prev.map(apt => {
      if (apt.id === appointmentId) {
        const newEndTime = calculateEndTime(newTime, apt.duration)
        return {
          ...apt,
          date: newDate,
          startTime: newTime,
          endTime: newEndTime
        }
      }
      return apt
    }))

    console.log('Appointment moved successfully!')
  }

  const handleConflictResolution = async (resolution: ConflictResolution) => {
    console.log('Conflict resolution applied:', resolution)

    // Log the type of resolution chosen
    switch (resolution.type) {
      case 'accept_suggestion':
        console.log('User chose alternative time:', resolution.selectedSuggestion)
        break
      case 'bump_appointments':
        console.log('User chose to bump conflicting appointments:', resolution.appointmentsToBump)
        break
      case 'allow_overlap':
        console.log('User chose to allow double booking (not recommended)')
        break
    }

    if (resolution.note) {
      console.log('Resolution note:', resolution.note)
    }
  }

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes + duration
    const endHours = Math.floor(totalMinutes / 60)
    const endMinutes = totalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Smart Conflict Resolution Demo
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Try dragging an appointment to a conflicting time slot to see the conflict resolution system in action.
              The system will suggest alternative times, allow you to bump other appointments, or warn against double booking.
            </p>
          </div>

          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Test Scenarios:
            </h3>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• Try dragging John's 10:00 appointment to 11:30 (conflicts with Mike's appointment)</li>
              <li>• Try dragging David's 14:00 appointment to 10:30 (partial conflict with John's appointment)</li>
              <li>• The system will show smart suggestions for nearby available time slots</li>
              <li>• You can choose to bump conflicting appointments to alternative times</li>
            </ul>
          </div>

          <DragDropCalendar
            appointments={appointments}
            onAppointmentMove={handleAppointmentMove}
            onConflictResolution={handleConflictResolution}
            enableDragDrop={true}
            enableSmartConflictResolution={true}
            showConflicts={true}
            allowConflicts={false}
            snapInterval={15}
            workingHours={{ start: '08:00', end: '18:00' }}
            initialView="day"
            initialDate={new Date('2024-06-25')}
            barbers={[
              { id: 1, name: 'Marcus Johnson', color: '#8B5CF6' },
              { id: 2, name: 'Alex Thompson', color: '#10B981' }
            ]}
            services={[
              { id: 1, name: 'Premium Haircut', duration: 60, price: 75 },
              { id: 2, name: 'Beard Trim', duration: 30, price: 35 },
              { id: 3, name: 'Cut & Beard Package', duration: 90, price: 95 }
            ]}
          />
        </div>
      </div>
    </div>
  )
}

// Example of how to use the conflict resolution system in your own components
export const ExampleUsage = `
import DragDropCalendar from './components/calendar/DragDropCalendar'
import { ConflictResolution } from './components/modals/ConflictResolutionModal'

function MyCalendar() {
  const handleAppointmentMove = async (appointmentId, newDate, newTime, originalDate, originalTime) => {
    // Your appointment move logic here
    await moveAppointmentAPI(appointmentId, newDate, newTime)
  }

  const handleConflictResolution = async (resolution: ConflictResolution) => {
    switch (resolution.type) {
      case 'accept_suggestion':
        // User chose an alternative time
        console.log('Alternative time chosen:', resolution.selectedSuggestion)
        break
      case 'bump_appointments':
        // User chose to move conflicting appointments
        console.log('Appointments to bump:', resolution.appointmentsToBump)
        break
      case 'allow_overlap':
        // User chose to allow double booking
        console.log('Double booking allowed')
        break
    }
  }

  return (
    <DragDropCalendar
      appointments={appointments}
      onAppointmentMove={handleAppointmentMove}
      onConflictResolution={handleConflictResolution}
      enableSmartConflictResolution={true}
      workingHours={{ start: '08:00', end: '18:00' }}
    />
  )
}
`
