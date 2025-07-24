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
  onTimeSlotClick?: (date: Date, barberId?: number) => void
  onAppointmentClick?: (appointment: any) => void
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

  const handleAppointmentUpdate = (appointmentId: number, newStartTime: string, isDragDrop?: boolean) => {
    if (props.onUpdateAppointment) {
      // Find the appointment to get previous data
      const previousAppointment = props.appointments?.find(apt => apt.id === appointmentId)
      
      // Convert to the expected format
      const updateData = { start_time: newStartTime }
      props.onUpdateAppointment(appointmentId, updateData)
      
      // Add to undo history
      addAction({
        type: isDragDrop ? 'reschedule' : 'update',
        appointmentId: appointmentId,
        previousData: previousAppointment,
        newData: { ...previousAppointment, ...updateData },
        description: isDragDrop ? 
          `Moved appointment to ${new Date(newStartTime).toLocaleTimeString()}` :
          `Updated appointment #${appointmentId}`
      })
    }
  }

  const handleTimeSlotClick = (date: Date, barberId?: number) => {
    if (props.onCreateAppointment) {
      // Create appointment data from time slot click
      const appointmentData = {
        start_time: date.toISOString(),
        barber_id: barberId,
        // Add other default fields as needed
      }
      
      props.onCreateAppointment(appointmentData)
      
      // Add to undo history (this will be updated after the appointment is actually created)
      addAction({
        type: 'create',
        newData: appointmentData,
        description: `Created appointment at ${date.toLocaleTimeString()}`
      })
    } else if (props.onTimeSlotClick) {
      // Fall back to the original time slot click handler
      props.onTimeSlotClick(date, barberId)
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
        view={props.view || 'week'}
        onViewChange={props.onViewChange}
        currentDate={props.currentDate}
        onDateChange={props.onDateChange}
        appointments={props.appointments || []}
        barbers={props.barbers}
        onTimeSlotClick={handleTimeSlotClick}
        onAppointmentClick={props.onAppointmentClick}
        onAppointmentUpdate={handleAppointmentUpdate}
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