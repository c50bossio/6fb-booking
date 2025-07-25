'use client'

import React, { useState } from 'react'
import { 
  AppointmentUndoRedoProvider, 
  AppointmentUndoRedoControls,
  AppointmentActionHistory,
  useAppointmentUndoRedo 
} from './AppointmentUndoRedo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Clock, User, Trash2, Edit, RotateCcw } from 'lucide-react'
import { apiRequest } from '@/lib/api-client-sentry'
import { toast } from '@/hooks/use-toast'

interface Appointment {
  id: number
  client_name: string
  service_name: string
  appointment_time: string
  end_time: string
  status: string
  price: number
}

function AppointmentCard({ appointment, onRefresh }: { appointment: Appointment, onRefresh: () => void }) {
  const { addAction } = useAppointmentUndoRedo()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isRescheduling, setIsRescheduling] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      // Store the appointment data before deletion for undo
      addAction({
        type: 'delete',
        appointmentId: appointment.id,
        previousData: appointment,
        description: `Deleted appointment for ${appointment.client_name}`
      })

      await apiRequest(`/api/v2/appointments/${appointment.id}`, {
        method: 'DELETE'
      })

      toast({
        title: 'Appointment deleted',
        description: 'Use Ctrl+Z to undo',
      })

      onRefresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete appointment',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleReschedule = async () => {
    // This is a simplified example - in real app, you'd show a date/time picker
    const newTime = new Date(appointment.appointment_time)
    newTime.setHours(newTime.getHours() + 1) // Move 1 hour later

    const newEndTime = new Date(appointment.end_time)
    newEndTime.setHours(newEndTime.getHours() + 1)

    setIsRescheduling(true)
    try {
      addAction({
        type: 'reschedule',
        appointmentId: appointment.id,
        previousData: {
          appointment_time: appointment.appointment_time,
          end_time: appointment.end_time
        },
        newData: {
          appointment_time: newTime.toISOString(),
          end_time: newEndTime.toISOString()
        },
        description: `Rescheduled ${appointment.client_name} to ${newTime.toLocaleTimeString()}`
      })

      await apiRequest(`/api/v2/appointments/${appointment.id}`, {
        method: 'PUT',
        data: {
          appointment_time: newTime.toISOString(),
          end_time: newEndTime.toISOString()
        }
      })

      toast({
        title: 'Appointment rescheduled',
        description: 'Use Ctrl+Z to undo',
      })

      onRefresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reschedule appointment',
        variant: 'destructive'
      })
    } finally {
      setIsRescheduling(false)
    }
  }

  const handleCancel = async () => {
    try {
      addAction({
        type: 'cancel',
        appointmentId: appointment.id,
        description: `Cancelled appointment for ${appointment.client_name}`
      })

      await apiRequest(`/api/v2/appointments/${appointment.id}/status`, {
        method: 'PUT',
        data: { status: 'cancelled' }
      })

      toast({
        title: 'Appointment cancelled',
        description: 'Use Ctrl+Z to undo',
      })

      onRefresh()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel appointment',
        variant: 'destructive'
      })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{appointment.service_name}</CardTitle>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReschedule}
              disabled={isRescheduling}
              title="Reschedule"
            >
              <Clock className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCancel}
              disabled={appointment.status === 'cancelled'}
              title="Cancel"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{appointment.client_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date(appointment.appointment_time).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {new Date(appointment.appointment_time).toLocaleTimeString()} - 
              {new Date(appointment.end_time).toLocaleTimeString()}
            </span>
          </div>
          <div className="flex items-center justify-between pt-2">
            <span className={`text-xs px-2 py-1 rounded-full ${
              appointment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
              appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {appointment.status}
            </span>
            <span className="font-medium">${appointment.price}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AppointmentManagementWithUndo() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAppointments = async () => {
    try {
      const response = await apiRequest('/api/v2/appointments', {
        method: 'GET'
      })
      setAppointments(response.data || [])
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load appointments',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchAppointments()
  }, [])

  return (
    <AppointmentUndoRedoProvider onActionComplete={fetchAppointments}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Appointment Management</h2>
          <AppointmentUndoRedoControls />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">
              Loading appointments...
            </div>
          ) : appointments.length === 0 ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No appointments found
            </div>
          ) : (
            appointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                onRefresh={fetchAppointments}
              />
            ))
          )}
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Action History</CardTitle>
            </CardHeader>
            <CardContent>
              <AppointmentActionHistory />
            </CardContent>
          </Card>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Keyboard shortcuts:</p>
          <ul className="mt-2 space-y-1">
            <li>• <kbd>Ctrl</kbd> + <kbd>Z</kbd> - Undo last action</li>
            <li>• <kbd>Ctrl</kbd> + <kbd>Y</kbd> - Redo last undone action</li>
            <li>• <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> - Redo (alternative)</li>
          </ul>
        </div>
      </div>
    </AppointmentUndoRedoProvider>
  )
}