/**
 * Example: Appointments with Optimistic Updates
 * Shows how to integrate optimistic updates into appointment management
 */

import React, { useState } from 'react'
import { useOptimisticAppointment } from '@/hooks/useOptimisticUpdate'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Clock, User, X, Edit2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

interface Appointment {
  id: string | number
  client_name: string
  appointment_date: string
  appointment_time: string
  service_name: string
  barber_name: string
  status: string
  duration_minutes: number
}

interface AppointmentCardProps {
  appointment: Appointment
  onUpdate: (data: any) => void
  onCancel: () => void
  onReschedule: (date: string, time: string) => void
}

// Individual appointment card with optimistic actions
export function OptimisticAppointmentCard({ 
  appointment, 
  onUpdate, 
  onCancel, 
  onReschedule 
}: AppointmentCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  
  const { update, cancel, reschedule } = useOptimisticAppointment()

  const handleCancel = async () => {
    await cancel.mutate({
      id: appointment.id as number,
      reason: 'Cancelled by staff'
    })
    onCancel()
  }

  const handleUpdate = async () => {
    await update.mutate({
      id: appointment.id as number,
      data: { notes: editNotes }
    })
    setIsEditing(false)
    onUpdate({ notes: editNotes })
  }

  const handleReschedule = async () => {
    // In a real app, this would open a date/time picker
    const newDate = '2024-01-15'
    const newTime = '14:00'
    
    await reschedule.mutate({
      id: appointment.id as number,
      date: newDate,
      time: newTime,
      reason: 'Customer request'
    })
    onReschedule(newDate, newTime)
  }

  // Show loading state during mutations
  const isLoading = update.isLoading || cancel.isLoading || reschedule.isLoading

  return (
    <Card className={`p-4 transition-all ${isLoading ? 'opacity-70' : ''}`}>
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2">
            <User className="w-4 h-4" />
            {appointment.client_name}
          </h3>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(appointment.appointment_date), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {appointment.appointment_time}
            </span>
          </div>
          
          <div className="text-sm">
            <span className="font-medium">{appointment.service_name}</span>
            <span className="text-gray-500"> with </span>
            <span className="font-medium">{appointment.barber_name}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
              appointment.status === 'confirmed' ? 'bg-green-100 text-green-700' :
              appointment.status === 'cancelled' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {appointment.status}
            </span>
            {isLoading && (
              <span className="text-xs text-gray-500 animate-pulse">
                Updating...
              </span>
            )}
          </div>

          {isEditing && (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes..."
                className="w-full px-2 py-1 text-sm border rounded"
                disabled={isLoading}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleUpdate}
                  disabled={isLoading}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(!isEditing)}
            disabled={isLoading || appointment.status === 'cancelled'}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReschedule}
            disabled={isLoading || appointment.status === 'cancelled'}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading || appointment.status === 'cancelled'}
            className="text-red-600 hover:text-red-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}

// List view with optimistic create
export function OptimisticAppointmentList() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  
  const { create } = useOptimisticAppointment()

  const handleCreate = async (data: any) => {
    const result = await create.mutate({
      ...data,
      appointment_date: data.date,
      appointment_time: data.time,
      duration_minutes: 30,
      source: 'staff'
    })

    if (result) {
      // Optimistically add to list
      setAppointments([...appointments, result as Appointment])
      setShowCreateForm(false)
    }
  }

  const handleUpdate = (id: string | number, updates: any) => {
    setAppointments(appointments.map(apt => 
      apt.id === id ? { ...apt, ...updates } : apt
    ))
  }

  const handleCancel = (id: string | number) => {
    setAppointments(appointments.map(apt => 
      apt.id === id ? { ...apt, status: 'cancelled' } : apt
    ))
  }

  const handleReschedule = (id: string | number, date: string, time: string) => {
    setAppointments(appointments.map(apt => 
      apt.id === id ? { ...apt, appointment_date: date, appointment_time: time } : apt
    ))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Appointments</h2>
        <Button 
          onClick={() => setShowCreateForm(!showCreateForm)}
          disabled={create.isLoading}
        >
          New Appointment
        </Button>
      </div>

      {showCreateForm && (
        <QuickCreateForm 
          onSubmit={handleCreate}
          onCancel={() => setShowCreateForm(false)}
          isLoading={create.isLoading}
        />
      )}

      <div className="space-y-3">
        {appointments.map((appointment) => (
          <OptimisticAppointmentCard
            key={appointment.id}
            appointment={appointment}
            onUpdate={(updates) => handleUpdate(appointment.id, updates)}
            onCancel={() => handleCancel(appointment.id)}
            onReschedule={(date, time) => handleReschedule(appointment.id, date, time)}
          />
        ))}
      </div>

      {appointments.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No appointments scheduled
        </div>
      )}
    </div>
  )
}

// Quick create form
function QuickCreateForm({ 
  onSubmit, 
  onCancel, 
  isLoading 
}: { 
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [formData, setFormData] = useState({
    client_name: '',
    client_email: '',
    client_phone: '',
    barber_id: 1,
    service_id: 1,
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00'
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Client name"
            value={formData.client_name}
            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            className="px-3 py-2 border rounded"
            required
            disabled={isLoading}
          />
          
          <input
            type="email"
            placeholder="Client email"
            value={formData.client_email}
            onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
            className="px-3 py-2 border rounded"
            disabled={isLoading}
          />
          
          <input
            type="tel"
            placeholder="Phone number"
            value={formData.client_phone}
            onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
            className="px-3 py-2 border rounded"
            disabled={isLoading}
          />
          
          <div className="flex gap-2">
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="px-3 py-2 border rounded flex-1"
              disabled={isLoading}
            />
            
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="px-3 py-2 border rounded"
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Appointment'}
          </Button>
        </div>
      </form>
    </Card>
  )
}