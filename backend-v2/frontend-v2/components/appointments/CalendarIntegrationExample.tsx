'use client'

import { useState } from 'react'
import { QuickBookingFlow, QuickReschedule } from '@/components/appointments'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { format } from 'date-fns'
import { 
  CalendarIcon,
  PlusIcon,
  ArrowPathIcon,
  BoltIcon
} from '@heroicons/react/24/outline'
import type { BookingResponse } from '@/lib/api'

interface CalendarIntegrationExampleProps {
  appointments: BookingResponse[]
  onAppointmentCreated?: () => void
  onAppointmentUpdated?: () => void
}

export default function CalendarIntegrationExample({
  appointments,
  onAppointmentCreated,
  onAppointmentUpdated
}: CalendarIntegrationExampleProps) {
  const [showQuickBooking, setShowQuickBooking] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<BookingResponse | null>(null)
  const [showReschedule, setShowReschedule] = useState(false)

  const handleQuickBookingSuccess = () => {
    setShowQuickBooking(false)
    onAppointmentCreated?.()
  }

  const handleRescheduleSuccess = () => {
    setShowReschedule(false)
    setSelectedAppointment(null)
    onAppointmentUpdated?.()
  }

  return (
    <div className="space-y-6">
      {/* Quick Actions Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Calendar Quick Actions
          </h3>
          
          <Button
            variant="primary"
            onClick={() => setShowQuickBooking(true)}
            className="flex items-center gap-2"
          >
            <BoltIcon className="w-4 h-4" />
            Quick Book
          </Button>
        </div>
      </div>

      {/* Appointments List with Inline Actions */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Today's Appointments
        </h4>
        
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h5 className="font-medium text-gray-900 dark:text-white">
                  {appointment.client_name}
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {appointment.service_name} • {format(new Date(appointment.start_time), 'h:mm a')}
                </p>
                {appointment.barber_name && (
                  <p className="text-xs text-gray-500 mt-1">
                    with {appointment.barber_name}
                  </p>
                )}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedAppointment(appointment)
                  setShowReschedule(true)
                }}
                className="flex items-center gap-1"
              >
                <ArrowPathIcon className="w-3 h-3" />
                Reschedule
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Time Slot Integration Example */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-6">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Calendar Integration Example
        </h4>
        
        <div className="grid grid-cols-4 gap-2">
          {['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM'].map((time) => (
            <button
              key={time}
              onClick={() => setShowQuickBooking(true)}
              className="p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors group"
            >
              <p className="text-sm font-medium text-gray-900 dark:text-white">{time}</p>
              <p className="text-xs text-gray-500 mt-1">Available</p>
              <PlusIcon className="w-4 h-4 mx-auto mt-2 text-gray-400 group-hover:text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
        
        <p className="text-xs text-gray-500 mt-4 text-center">
          Click any available time slot to quick book
        </p>
      </div>

      {/* Quick Booking Modal */}
      <Modal
        isOpen={showQuickBooking}
        onClose={() => setShowQuickBooking(false)}
        title=""
        size="xl"
      >
        <QuickBookingFlow
          onSuccess={handleQuickBookingSuccess}
          onCancel={() => setShowQuickBooking(false)}
        />
      </Modal>

      {/* Reschedule Modal */}
      {selectedAppointment && (
        <Modal
          isOpen={showReschedule}
          onClose={() => {
            setShowReschedule(false)
            setSelectedAppointment(null)
          }}
          title=""
          size="xl"
        >
          <QuickReschedule
            appointment={selectedAppointment}
            onSuccess={handleRescheduleSuccess}
            onCancel={() => {
              setShowReschedule(false)
              setSelectedAppointment(null)
            }}
          />
        </Modal>
      )}
    </div>
  )
}