'use client'

import React, { useState, useMemo } from 'react'
import DragDropCalendar from '@/components/calendar/DragDropCalendar'
import { CalendarAppointment } from '@/components/calendar/PremiumCalendar'
// SmartScheduler components will be imported when available
// import SmartSchedulerPanel, { useSmartScheduler } from '@/components/calendar/SmartScheduler'

// Demo appointments with various statuses and times
const demoAppointments: CalendarAppointment[] = [
  {
    id: '1',
    title: 'Premium Haircut & Beard Trim',
    client: 'John Smith',
    clientId: 1,
    barber: 'Marcus Johnson',
    barberId: 1,
    startTime: '09:00',
    endTime: '10:00',
    service: 'Premium Cut & Beard',
    serviceId: 1,
    price: 85,
    status: 'confirmed',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    clientPhone: '+1 (555) 123-4567',
    clientEmail: 'john.smith@email.com',
    notes: 'Regular client, prefers scissors over clippers'
  },
  {
    id: '2',
    title: 'Fade Cut',
    client: 'David Rodriguez',
    clientId: 2,
    barber: 'Marcus Johnson',
    barberId: 1,
    startTime: '10:30',
    endTime: '11:30',
    service: 'Classic Fade',
    serviceId: 2,
    price: 45,
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    duration: 60
  },
  {
    id: '3',
    title: 'Beard Styling',
    client: 'Michael Brown',
    clientId: 3,
    barber: 'Sarah Mitchell',
    barberId: 2,
    startTime: '14:00',
    endTime: '14:30',
    service: 'Beard Trim',
    serviceId: 3,
    price: 35,
    status: 'confirmed',
    date: new Date().toISOString().split('T')[0],
    duration: 30
  },
  {
    id: '4',
    title: 'Executive Cut',
    client: 'Robert Johnson',
    clientId: 4,
    barber: 'Marcus Johnson',
    barberId: 1,
    startTime: '15:00',
    endTime: '16:00',
    service: 'Executive Package',
    serviceId: 4,
    price: 120,
    status: 'confirmed',
    date: new Date().toISOString().split('T')[0],
    duration: 60
  }
]

export default function CalendarDemoPage() {
  const [appointments, setAppointments] = useState<CalendarAppointment[]>(demoAppointments)
  const [showConflicts, setShowConflicts] = useState(true)
  const [allowConflicts, setAllowConflicts] = useState(false)
  const [snapInterval, setSnapInterval] = useState<15 | 30>(15)
  const [enableCascade, setEnableCascade] = useState(false)
  const [selectedBarber, setSelectedBarber] = useState(1)
  const [selectedDuration, setSelectedDuration] = useState(60)

  // Demo dependencies - appointment 2 depends on appointment 1
  const appointmentDependencies = useMemo(() => {
    const deps = new Map<string, string[]>()
    deps.set('1', ['2']) // When appointment 1 moves, appointment 2 follows
    return deps
  }, [])

  // Smart scheduler functionality (to be added)
  const smartSuggestions = []

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
    await new Promise(resolve => setTimeout(resolve, 300))

    // Update the appointment in state
    setAppointments(prev => prev.map(apt => {
      if (apt.id === appointmentId) {
        const [hours, minutes] = newTime.split(':').map(Number)
        const endMinutes = hours * 60 + minutes + apt.duration
        const endHours = Math.floor(endMinutes / 60)
        const endMins = endMinutes % 60
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`

        return {
          ...apt,
          date: newDate,
          startTime: newTime,
          endTime
        }
      }
      return apt
    }))
  }

  const handleAppointmentClick = (appointment: CalendarAppointment) => {
    console.log('Clicked appointment:', appointment)
  }

  const handleTimeSlotClick = (date: string, time: string) => {
    console.log('Clicked time slot:', { date, time })
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Enhanced Calendar Demo</h1>
          <p className="text-gray-400">
            Drag and drop appointments to reschedule them. Try the different settings below.
          </p>
        </div>

        {/* Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Calendar Settings</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="flex items-center space-x-3 text-gray-300">
                <input
                  type="checkbox"
                  checked={showConflicts}
                  onChange={(e) => setShowConflicts(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-violet-600 focus:ring-violet-500"
                />
                <span>Show Conflicts</span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-7">
                Visual indicators when appointments overlap
              </p>
            </div>

            <div>
              <label className="flex items-center space-x-3 text-gray-300">
                <input
                  type="checkbox"
                  checked={allowConflicts}
                  onChange={(e) => setAllowConflicts(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-violet-600 focus:ring-violet-500"
                />
                <span>Allow Conflicts</span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-7">
                Allow overlapping appointments
              </p>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Snap Interval</label>
              <select
                value={snapInterval}
                onChange={(e) => setSnapInterval(Number(e.target.value) as 15 | 30)}
                className="block w-full rounded-lg border-gray-600 bg-gray-700 text-white px-3 py-2 focus:border-violet-500 focus:ring-violet-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            <div>
              <label className="flex items-center space-x-3 text-gray-300">
                <input
                  type="checkbox"
                  checked={enableCascade}
                  onChange={(e) => setEnableCascade(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-violet-600 focus:ring-violet-500"
                />
                <span>Cascade Rescheduling</span>
              </label>
              <p className="text-sm text-gray-500 mt-1 ml-7">
                Move dependent appointments together
              </p>
            </div>
          </div>
        </div>

        {/* Smart Scheduler Controls */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Smart Scheduler</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
            <div>
              <label className="block text-gray-300 mb-2">Select Barber</label>
              <select
                value={selectedBarber}
                onChange={(e) => setSelectedBarber(Number(e.target.value))}
                className="block w-full rounded-lg border-gray-600 bg-gray-700 text-white px-3 py-2"
              >
                <option value={1}>Marcus Johnson</option>
                <option value={2}>Sarah Mitchell</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">Appointment Duration</label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(Number(e.target.value))}
                className="block w-full rounded-lg border-gray-600 bg-gray-700 text-white px-3 py-2"
              >
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
                <option value={90}>90 minutes</option>
              </select>
            </div>
          </div>

          <div className="text-gray-400">
            <p>Smart scheduling features coming soon...</p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-r from-violet-900/20 to-purple-900/20 border border-violet-700 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-violet-400 mb-3">How to Use</h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start">
              <span className="text-violet-500 mr-2">•</span>
              <span><strong>Drag & Drop:</strong> Click and hold any appointment, then drag it to a new time slot</span>
            </li>
            <li className="flex items-start">
              <span className="text-violet-500 mr-2">•</span>
              <span><strong>Undo/Redo:</strong> Use Ctrl+Z to undo and Ctrl+Y to redo appointment moves</span>
            </li>
            <li className="flex items-start">
              <span className="text-violet-500 mr-2">•</span>
              <span><strong>Snap to Grid:</strong> Appointments automatically snap to the nearest {snapInterval}-minute interval</span>
            </li>
            <li className="flex items-start">
              <span className="text-violet-500 mr-2">•</span>
              <span><strong>Conflict Detection:</strong> Red indicators show when appointments would overlap</span>
            </li>
            <li className="flex items-start">
              <span className="text-violet-500 mr-2">•</span>
              <span><strong>Cascade Rescheduling:</strong> When enabled, dependent appointments move together (try moving the first appointment)</span>
            </li>
            <li className="flex items-start">
              <span className="text-violet-500 mr-2">•</span>
              <span><strong>Smart Suggestions:</strong> AI-powered time slot recommendations based on schedule optimization</span>
            </li>
          </ul>
        </div>

        {/* Calendar */}
        <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700">
          <DragDropCalendar
            appointments={appointments}
            onAppointmentMove={handleAppointmentMove}
            onAppointmentClick={handleAppointmentClick}
            onTimeSlotClick={handleTimeSlotClick}
            enableDragDrop={true}
            snapInterval={snapInterval}
            showConflicts={showConflicts}
            allowConflicts={allowConflicts}
            enableCascadeRescheduling={enableCascade}
            appointmentDependencies={appointmentDependencies}
            initialView="week"
            darkMode={true}
          />
        </div>
      </div>
    </div>
  )
}
