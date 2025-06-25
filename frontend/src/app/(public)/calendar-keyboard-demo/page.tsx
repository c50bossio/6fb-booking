'use client'

import React, { useState } from 'react'
import KeyboardAccessibleCalendar from '@/components/calendar/KeyboardAccessibleCalendar'
import { CalendarAppointment, Barber, Service } from '@/components/calendar/RobustCalendar'
import '@/styles/calendar-accessibility.css'

// Mock data
const mockAppointments: CalendarAppointment[] = [
  {
    id: '1',
    title: 'Premium Haircut',
    client: 'John Smith',
    clientId: 1,
    barber: 'Marcus Johnson',
    barberId: 1,
    startTime: '09:00',
    endTime: '10:00',
    service: 'Premium Cut',
    serviceId: 1,
    price: 85,
    status: 'confirmed',
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    clientPhone: '+1 (555) 123-4567',
    clientEmail: 'john@example.com',
    paymentStatus: 'paid'
  },
  {
    id: '2',
    title: 'Beard Trim',
    client: 'David Wilson',
    clientId: 2,
    barber: 'Sarah Mitchell',
    barberId: 2,
    startTime: '10:30',
    endTime: '11:00',
    service: 'Beard Styling',
    serviceId: 2,
    price: 45,
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    duration: 30,
    paymentStatus: 'unpaid'
  }
]

const mockBarbers: Barber[] = [
  { id: 1, name: 'Marcus Johnson', color: '#8b5cf6' },
  { id: 2, name: 'Sarah Mitchell', color: '#06b6d4' }
]

const mockServices: Service[] = [
  { id: 1, name: 'Premium Cut', duration: 60, price: 85 },
  { id: 2, name: 'Beard Styling', duration: 30, price: 45 }
]

export default function CalendarKeyboardDemoPage() {
  const [appointments, setAppointments] = useState(mockAppointments)
  const [lastAction, setLastAction] = useState<string>('')

  const handleCreateAppointment = async (appointment: Partial<CalendarAppointment>) => {
    const newAppointment: CalendarAppointment = {
      id: `new-${Date.now()}`,
      title: appointment.service || 'New Appointment',
      client: 'New Client',
      clientId: 999,
      barber: barbers.find(b => b.id === appointment.barberId)?.name || 'Unknown',
      barberId: appointment.barberId || 1,
      startTime: appointment.startTime || '09:00',
      endTime: appointment.endTime || '10:00',
      service: appointment.service || 'Service',
      serviceId: appointment.serviceId || 1,
      price: appointment.price || 50,
      status: 'pending',
      date: appointment.date || new Date().toISOString().split('T')[0],
      duration: appointment.duration || 60
    }

    setAppointments([...appointments, newAppointment])
    setLastAction(`Created appointment for ${newAppointment.client}`)
  }

  const handleUpdateAppointment = async (appointment: CalendarAppointment) => {
    setAppointments(appointments.map(apt =>
      apt.id === appointment.id ? appointment : apt
    ))
    setLastAction(`Updated appointment for ${appointment.client}`)
  }

  const handleDeleteAppointment = async (appointmentId: string) => {
    const appointment = appointments.find(apt => apt.id === appointmentId)
    setAppointments(appointments.filter(apt => apt.id !== appointmentId))
    setLastAction(`Deleted appointment for ${appointment?.client}`)
  }

  const handleAppointmentMove = async (
    appointmentId: string,
    newDate: string,
    newTime: string,
    originalDate: string,
    originalTime: string
  ) => {
    setAppointments(appointments.map(apt =>
      apt.id === appointmentId
        ? { ...apt, date: newDate, startTime: newTime }
        : apt
    ))
    setLastAction(`Moved appointment from ${originalDate} ${originalTime} to ${newDate} ${newTime}`)
  }

  const handleCommandExecute = (commandId: string) => {
    setLastAction(`Executed command: ${commandId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Keyboard Navigation Demo
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
            Experience the fully accessible calendar with comprehensive keyboard navigation
          </p>

          {/* Quick Start Guide */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Quick Start Guide
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Essential Shortcuts
                </h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>• <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Arrow Keys</kbd> - Navigate</li>
                  <li>• <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Enter</kbd> - Select/Open</li>
                  <li>• <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">N</kbd> - New appointment</li>
                  <li>• <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">?</kbd> - Show all shortcuts</li>
                  <li>• <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+K</kbd> - Command palette</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Try These Actions
                </h3>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <li>1. Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Tab</kbd> to start keyboard navigation</li>
                  <li>2. Use arrows to move between time slots</li>
                  <li>3. Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Space</kbd> on an empty slot to create</li>
                  <li>4. Press <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">1</kbd>, <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">2</kbd>, or <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">3</kbd> to change views</li>
                  <li>5. Try <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">Ctrl+K</kbd> for quick commands</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Feedback */}
          {lastAction && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 mb-4 max-w-3xl mx-auto">
              <p className="text-sm text-green-800 dark:text-green-200">
                <span className="font-medium">Last Action:</span> {lastAction}
              </p>
            </div>
          )}
        </div>

        {/* Accessibility Options */}
        <div className="mb-6 flex justify-center space-x-4">
          <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="rounded text-violet-600 focus:ring-violet-500"
              onChange={(e) => {
                document.documentElement.setAttribute('data-high-contrast', e.target.checked ? 'true' : 'false')
              }}
            />
            <span>High Contrast Mode</span>
          </label>
          <label className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              className="rounded text-violet-600 focus:ring-violet-500"
              onChange={(e) => {
                document.documentElement.setAttribute('data-reduced-motion', e.target.checked ? 'true' : 'false')
              }}
            />
            <span>Reduce Motion</span>
          </label>
        </div>

        {/* Calendar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          <KeyboardAccessibleCalendar
            appointments={appointments}
            barbers={mockBarbers}
            services={mockServices}
            onCreateAppointment={handleCreateAppointment}
            onUpdateAppointment={handleUpdateAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onAppointmentMove={handleAppointmentMove}
            onCommandExecute={handleCommandExecute}
            enableDragDrop={true}
            enableSearch={true}
            enableFilters={true}
            enableExport={true}
            enableStatistics={true}
            enablePayments={false}
            enableCommandPalette={true}
            enableKeyboardHelp={true}
            enableAccessibilityFeatures={true}
          />
        </div>

        {/* Features List */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">
              Navigation Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>✓ Arrow key navigation</li>
              <li>✓ Tab order management</li>
              <li>✓ Home/End key support</li>
              <li>✓ Page Up/Down navigation</li>
              <li>✓ Focus indicators</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">
              Accessibility Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>✓ Screen reader support</li>
              <li>✓ ARIA labels</li>
              <li>✓ Live announcements</li>
              <li>✓ High contrast mode</li>
              <li>✓ Reduced motion</li>
            </ul>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h3 className="font-semibold text-lg mb-3 text-gray-900 dark:text-white">
              Power Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>✓ Command palette</li>
              <li>✓ Context-sensitive help</li>
              <li>✓ Keyboard shortcuts</li>
              <li>✓ Quick actions</li>
              <li>✓ Focus management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
