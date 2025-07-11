'use client'

import React from 'react'
import UnifiedCalendar, { CalendarView } from '../UnifiedCalendar'
import { 
  AppointmentUndoRedoProvider, 
  AppointmentUndoRedoControls,
  useAppointmentUndoRedo 
} from '../appointments/AppointmentUndoRedo'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Info } from 'lucide-react'
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface CalendarWithUndoRedoProps {
  view?: CalendarView
  onViewChange?: (view: CalendarView) => void
  currentDate?: Date
  onDateChange?: (date: Date) => void
  appointments?: any[]
  barbers?: any[]
  onCreateAppointment?: (data: any) => void
  onUpdateAppointment?: (id: number, data: any) => void
  onDeleteAppointment?: (id: number) => void
  showCreateButton?: boolean
  hideControls?: boolean
}

function CalendarWithUndoRedoInner(props: CalendarWithUndoRedoProps) {
  const { addAction } = useAppointmentUndoRedo()
  
  // Wrap the appointment handlers to add undo/redo actions
  const handleCreateAppointment = (data: any) => {
    if (props.onCreateAppointment) {
      props.onCreateAppointment(data)
      
      // Add to undo history
      addAction({
        type: 'create',
        newData: data,
        description: `Created appointment for ${data.client_name || 'client'}`
      })
    }
  }

  const handleUpdateAppointment = (id: number, data: any) => {
    if (props.onUpdateAppointment) {
      // Find the appointment to get previous data
      const previousAppointment = props.appointments?.find(apt => apt.id === id)
      
      props.onUpdateAppointment(id, data)
      
      // Add to undo history
      addAction({
        type: 'update',
        appointmentId: id,
        previousData: previousAppointment,
        newData: { ...previousAppointment, ...data },
        description: `Updated appointment #${id}`
      })
    }
  }

  const handleDeleteAppointment = (id: number) => {
    if (props.onDeleteAppointment) {
      // Find the appointment to store for undo
      const appointment = props.appointments?.find(apt => apt.id === id)
      
      props.onDeleteAppointment(id)
      
      // Add to undo history
      if (appointment) {
        addAction({
          type: 'delete',
          appointmentId: id,
          previousData: appointment,
          description: `Deleted appointment for ${appointment.client_name || 'client'}`
        })
      }
    }
  }

  const handleDragDrop = (appointmentId: number, newTime: Date, newBarberId?: number) => {
    const appointment = props.appointments?.find(apt => apt.id === appointmentId)
    if (!appointment) return

    const previousData = {
      appointment_time: appointment.appointment_time,
      barber_id: appointment.barber_id
    }

    const newData = {
      appointment_time: newTime.toISOString(),
      barber_id: newBarberId || appointment.barber_id
    }

    handleUpdateAppointment(appointmentId, newData)

    // Add specific action for drag and drop
    addAction({
      type: 'reschedule',
      appointmentId: appointmentId,
      previousData,
      newData,
      description: `Moved appointment to ${newTime.toLocaleTimeString()}`
    })
  }

  return (
    <div className="space-y-4">
      {!props.hideControls && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AppointmentUndoRedoControls />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-sm">
                    Use <kbd>Ctrl+Z</kbd> to undo and <kbd>Ctrl+Y</kbd> to redo appointment changes
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      )}
      
      <UnifiedCalendar
        {...props}
        onCreateAppointment={handleCreateAppointment}
        onUpdateAppointment={handleUpdateAppointment}
        onDeleteAppointment={handleDeleteAppointment}
        onDragDrop={handleDragDrop}
      />
    </div>
  )
}

export default function CalendarWithUndoRedo(props: CalendarWithUndoRedoProps) {
  const [refreshKey, setRefreshKey] = React.useState(0)
  
  const handleActionComplete = () => {
    // Force calendar to refresh after undo/redo
    setRefreshKey(prev => prev + 1)
  }

  return (
    <AppointmentUndoRedoProvider onActionComplete={handleActionComplete}>
      <CalendarWithUndoRedoInner {...props} key={refreshKey} />
    </AppointmentUndoRedoProvider>
  )
}