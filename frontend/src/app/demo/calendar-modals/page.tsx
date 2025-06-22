'use client'

import { useState } from 'react'
import {
  CalendarDaysIcon,
  UserIcon,
  CurrencyDollarIcon,
  ClockIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'
import {
  CreateAppointmentModal,
  AppointmentDetailsModal,
  ClientSelectionModal,
  ServiceSelectionModal,
  TimeSlotPickerModal,
  ConfirmationModal
} from '../../../components/modals'
import type { Booking } from '../../../lib/api/bookings'

// Mock data
const mockAppointment = {
  id: '1',
  title: 'Premium Haircut',
  client: 'John Smith',
  barber: 'Marcus Johnson',
  startTime: '14:00',
  endTime: '15:00',
  service: 'Premium Cut',
  price: 65,
  status: 'confirmed' as const,
  date: '2024-06-22',
  clientEmail: 'john.smith@email.com',
  clientPhone: '(555) 123-4567',
  notes: 'Prefers shorter cuts, regular customer',
  confirmationNumber: 'BK123456789'
}

const mockClient = {
  id: '1',
  name: 'John Smith',
  email: 'john.smith@email.com',
  phone: '(555) 123-4567',
  lastVisit: '2024-06-15',
  totalVisits: 12,
  notes: 'Regular customer, prefers classic cuts'
}

const mockService = {
  id: 1,
  name: 'Premium Haircut',
  description: 'Complete styling with wash and finish',
  category: 'Haircuts',
  category_id: 1,
  duration: 60,
  price: 65,
  is_active: true,
  popular: true
}

export default function CalendarModalsDemo() {
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showClientModal, setShowClientModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showTimePickerModal, setShowTimePickerModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const handleBookingSuccess = (booking: Booking) => {
    console.log('Booking created:', booking)
    alert('Appointment created successfully!')
  }

  const handleClientSelect = (client: any) => {
    console.log('Client selected:', client)
    alert(`Selected client: ${client.name}`)
  }

  const handleServiceSelect = (service: any) => {
    console.log('Service selected:', service)
    alert(`Selected service: ${service.name} - $${service.price}`)
  }

  const handleTimeSlotSelect = (timeSlot: any) => {
    console.log('Time slot selected:', timeSlot)
    alert(`Selected: ${timeSlot.date} at ${timeSlot.time}`)
  }

  const handleAppointmentUpdate = (appointment: any) => {
    console.log('Appointment updated:', appointment)
    alert('Appointment updated successfully!')
  }

  const handleAppointmentDelete = (appointmentId: string) => {
    console.log('Appointment deleted:', appointmentId)
    alert('Appointment cancelled successfully!')
  }

  const handleConfirmAction = () => {
    console.log('Action confirmed!')
    alert('Action confirmed!')
    setShowConfirmModal(false)
  }

  return (
    <div className="relative min-h-full">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-violet-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 p-8 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
              <CalendarDaysIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar Modals Demo</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Experience our beautiful, functional modal system for appointment management
              </p>
            </div>
          </div>
        </div>

        {/* Demo Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Create Appointment Modal */}
            <div className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 hover:bg-white/60 dark:hover:bg-white/20 transition-all duration-300 hover:-translate-y-1 group shadow-lg">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <CalendarDaysIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create Appointment</h3>
                  <p className="text-gray-600 dark:text-purple-200 text-sm">Full appointment creation flow</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-purple-300 text-sm mb-6">
                Complete appointment creation with client information, service selection, date/time picker, and form validation.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="w-full premium-button text-sm"
              >
                Open Create Modal
              </button>
            </div>

            {/* Appointment Details Modal */}
            <div className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 hover:bg-white/60 dark:hover:bg-white/20 transition-all duration-300 hover:-translate-y-1 group shadow-lg">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Cog6ToothIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Appointment Details</h3>
                  <p className="text-gray-600 dark:text-purple-200 text-sm">View and edit appointments</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-purple-300 text-sm mb-6">
                Detailed appointment view with inline editing capabilities, status management, and cancellation options.
              </p>
              <button
                onClick={() => setShowDetailsModal(true)}
                className="w-full premium-button text-sm"
              >
                Open Details Modal
              </button>
            </div>

            {/* Client Selection Modal */}
            <div className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 hover:bg-white/60 dark:hover:bg-white/20 transition-all duration-300 hover:-translate-y-1 group shadow-lg">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Client Selection</h3>
                  <p className="text-gray-600 dark:text-purple-200 text-sm">Search and select clients</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-purple-300 text-sm mb-6">
                Advanced client search with categories for recent and frequent clients, plus the ability to add new clients.
              </p>
              <button
                onClick={() => setShowClientModal(true)}
                className="w-full premium-button text-sm"
              >
                Open Client Modal
              </button>
            </div>

            {/* Service Selection Modal */}
            <div className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 hover:bg-white/60 dark:hover:bg-white/20 transition-all duration-300 hover:-translate-y-1 group shadow-lg">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <CurrencyDollarIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Service Selection</h3>
                  <p className="text-gray-600 dark:text-purple-200 text-sm">Browse services with pricing</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-purple-300 text-sm mb-6">
                Beautiful service catalog with categories, pricing, duration, popularity indicators, and feature highlights.
              </p>
              <button
                onClick={() => setShowServiceModal(true)}
                className="w-full premium-button text-sm"
              >
                Open Service Modal
              </button>
            </div>

            {/* Time Slot Picker Modal */}
            <div className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 hover:bg-white/60 dark:hover:bg-white/20 transition-all duration-300 hover:-translate-y-1 group shadow-lg">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <ClockIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Time Slot Picker</h3>
                  <p className="text-gray-600 dark:text-purple-200 text-sm">Visual time selection</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-purple-300 text-sm mb-6">
                Interactive time slot picker with date navigation, availability visualization, and time period grouping.
              </p>
              <button
                onClick={() => setShowTimePickerModal(true)}
                className="w-full premium-button text-sm"
              >
                Open Time Picker
              </button>
            </div>

            {/* Confirmation Modal */}
            <div className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-2xl p-6 hover:bg-white/60 dark:hover:bg-white/20 transition-all duration-300 hover:-translate-y-1 group shadow-lg">
              <div className="flex items-center space-x-4 mb-4">
                <div className="p-3 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Cog6ToothIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Confirmation Dialog</h3>
                  <p className="text-gray-600 dark:text-purple-200 text-sm">Action confirmations</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-purple-300 text-sm mb-6">
                Clean confirmation dialogs for destructive actions with customizable styling and loading states.
              </p>
              <button
                onClick={() => setShowConfirmModal(true)}
                className="w-full premium-button text-sm"
              >
                Open Confirmation
              </button>
            </div>
          </div>

        {/* Features List */}
        <div className="bg-white/50 dark:bg-white/10 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">Modal Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-violet-600 dark:text-violet-300">🎨 Design Features</h3>
              <ul className="space-y-2 text-gray-700 dark:text-purple-200 text-sm">
                <li>• Glass morphism with backdrop blur</li>
                <li>• Dual light/dark theme support</li>
                <li>• Smooth animations and transitions</li>
                <li>• Responsive design for all devices</li>
                <li>• Beautiful loading states</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-violet-600 dark:text-violet-300">⚡ Functionality</h3>
              <ul className="space-y-2 text-gray-700 dark:text-purple-200 text-sm">
                <li>• Form validation with error states</li>
                <li>• Search and filtering capabilities</li>
                <li>• Keyboard navigation support</li>
                <li>• Focus management and accessibility</li>
                <li>• API integration ready</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

      {/* Modals */}
      <CreateAppointmentModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleBookingSuccess}
      />

      <AppointmentDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        appointment={mockAppointment}
        onUpdate={handleAppointmentUpdate}
        onDelete={handleAppointmentDelete}
      />

      <ClientSelectionModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSelect={handleClientSelect}
      />

      <ServiceSelectionModal
        isOpen={showServiceModal}
        onClose={() => setShowServiceModal(false)}
        onSelect={handleServiceSelect}
      />

      <TimeSlotPickerModal
        isOpen={showTimePickerModal}
        onClose={() => setShowTimePickerModal(false)}
        onSelect={handleTimeSlotSelect}
        serviceDuration={60}
      />

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmAction}
        title="Confirm Action"
        message="Are you sure you want to perform this action? This cannot be undone."
        confirmText="Yes, Continue"
        cancelText="Cancel"
      />
    </div>
  )
}
