'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { format } from 'date-fns'
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon, 
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ChartBarIcon,
  PencilIcon,
  StarIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

interface Client {
  id: number
  first_name: string
  last_name: string
  email: string
  phone?: string
  created_at?: string
  last_visit?: string
  total_visits?: number
  total_spent?: number
  notes?: string
}

interface Appointment {
  id: number
  start_time: string
  end_time?: string
  service_name: string
  barber_name?: string
  status: string
  price?: number
  notes?: string
}

interface ClientDetailModalProps {
  isOpen: boolean
  onClose: () => void
  client: Client | null
  appointments?: Appointment[]
  onEdit?: (client: Client) => void
  onBookAppointment?: (clientId: number) => void
}

export default function ClientDetailModal({
  isOpen,
  onClose,
  client,
  appointments = [],
  onEdit,
  onBookAppointment
}: ClientDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'notes'>('overview')
  const [appointmentHistory, setAppointmentHistory] = useState<Appointment[]>([])

  useEffect(() => {
    if (client && appointments.length > 0) {
      // Filter appointments for this client
      const clientAppointments = appointments.filter(apt => 
        apt.barber_name?.toLowerCase().includes(client.first_name.toLowerCase()) ||
        apt.barber_name?.toLowerCase().includes(client.last_name.toLowerCase())
      )
      setAppointmentHistory(clientAppointments)
    }
  }, [client, appointments])

  if (!client) return null

  const upcomingAppointments = appointmentHistory.filter(apt => 
    new Date(apt.start_time) > new Date() && apt.status !== 'cancelled'
  )
  const pastAppointments = appointmentHistory.filter(apt => 
    new Date(apt.start_time) <= new Date() || apt.status === 'completed'
  )

  const averageSpending = client.total_spent && client.total_visits 
    ? (client.total_spent / client.total_visits).toFixed(2)
    : '0.00'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      case 'cancelled':
        return 'text-red-600 bg-red-50'
      case 'completed':
        return 'text-blue-600 bg-blue-50'
      case 'no-show':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Client Details"
      size="2xl"
      variant="default"
      position="center"
      className="max-h-[90vh]"
    >
      <div className="flex flex-col h-full">
        {/* Client Header */}
        <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 p-6 -m-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center text-white text-2xl font-semibold">
                {client.first_name.charAt(0)}{client.last_name.charAt(0)}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {client.first_name} {client.last_name}
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Client since {client.created_at ? format(new Date(client.created_at), 'MMMM yyyy') : 'Unknown'}
                </p>
              </div>
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(client)}
                className="flex items-center gap-2"
              >
                <PencilIcon className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'appointments'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Appointments ({appointmentHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Notes
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-700 dark:text-gray-300">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-3">
                      <PhoneIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-700 dark:text-gray-300">{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Statistics */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Client Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <CalendarDaysIcon className="w-4 h-4" />
                      <span className="text-sm">Total Visits</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {client.total_visits || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <CurrencyDollarIcon className="w-4 h-4" />
                      <span className="text-sm">Total Spent</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${client.total_spent?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <ChartBarIcon className="w-4 h-4" />
                      <span className="text-sm">Avg. Spending</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${averageSpending}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-1">
                      <ClockIcon className="w-4 h-4" />
                      <span className="text-sm">Last Visit</span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {client.last_visit 
                        ? format(new Date(client.last_visit), 'MMM d, yyyy')
                        : 'Never'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Upcoming Appointments */}
              {upcomingAppointments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Upcoming Appointments
                  </h3>
                  <div className="space-y-2">
                    {upcomingAppointments.slice(0, 3).map(apt => (
                      <div key={apt.id} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {apt.service_name}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {format(new Date(apt.start_time), 'MMM d, yyyy • h:mm a')}
                            </div>
                          </div>
                          <div className="text-green-600 dark:text-green-400 font-medium">
                            ${apt.price?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-6">
              {/* Appointment History */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Appointment History
                  </h3>
                  {onBookAppointment && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onBookAppointment(client.id)}
                    >
                      Book New Appointment
                    </Button>
                  )}
                </div>
                
                {appointmentHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No appointments found
                  </div>
                ) : (
                  <div className="space-y-3">
                    {appointmentHistory.map(apt => (
                      <div key={apt.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {apt.service_name}
                              </h4>
                              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(apt.status)}`}>
                                {apt.status}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {format(new Date(apt.start_time), 'EEEE, MMMM d, yyyy • h:mm a')}
                            </div>
                            {apt.barber_name && (
                              <div className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                                with {apt.barber_name}
                              </div>
                            )}
                            {apt.notes && (
                              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                                "{apt.notes}"
                              </div>
                            )}
                          </div>
                          <div className="text-lg font-semibold text-gray-900 dark:text-white">
                            ${apt.price?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Client Notes
                </h3>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  {client.notes ? (
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {client.notes}
                    </p>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400 italic">
                      No notes available for this client
                    </p>
                  )}
                </div>
              </div>

              {/* Preferences */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Preferences & Important Info
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">SMS reminders enabled</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">Email notifications enabled</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {onBookAppointment && (
            <Button
              variant="primary"
              onClick={() => onBookAppointment(client.id)}
            >
              Book Appointment
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}