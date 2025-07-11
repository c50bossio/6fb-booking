'use client'

import React, { createContext, useContext, ReactNode, useEffect } from 'react'
import { useUndoRedo } from '@/hooks/useUndoRedo'
import { Button } from '@/components/ui/Button'
import { toast } from '@/hooks/use-toast'
import { Undo2, Redo2 } from 'lucide-react'
import { apiRequest } from '@/lib/api'

export interface AppointmentAction {
  id: string
  type: 'create' | 'update' | 'delete' | 'reschedule' | 'cancel'
  timestamp: Date
  appointmentId?: number
  previousData?: any
  newData?: any
  description: string
}

interface AppointmentUndoRedoContextType {
  addAction: (action: Omit<AppointmentAction, 'id' | 'timestamp'>) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  history: {
    past: AppointmentAction[]
    future: AppointmentAction[]
    total: number
  }
}

const AppointmentUndoRedoContext = createContext<AppointmentUndoRedoContextType | null>(null)

export function useAppointmentUndoRedo() {
  const context = useContext(AppointmentUndoRedoContext)
  if (!context) {
    throw new Error('useAppointmentUndoRedo must be used within AppointmentUndoRedoProvider')
  }
  return context
}

interface AppointmentUndoRedoProviderProps {
  children: ReactNode
  onActionComplete?: () => void
}

export function AppointmentUndoRedoProvider({ 
  children, 
  onActionComplete 
}: AppointmentUndoRedoProviderProps) {
  const {
    state: currentAction,
    setState: setCurrentAction,
    undo: undoAction,
    redo: redoAction,
    canUndo,
    canRedo,
    history
  } = useUndoRedo<AppointmentAction | null>(null, {
    maxHistorySize: 20,
    onUpdate: async (action) => {
      if (!action) return
      
      // Execute the undo/redo operation
      try {
        await executeAction(action, true)
        if (onActionComplete) {
          onActionComplete()
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to execute action',
          variant: 'destructive'
        })
      }
    }
  })

  const executeAction = async (action: AppointmentAction, isUndoRedo: boolean = false) => {
    switch (action.type) {
      case 'create':
        if (isUndoRedo && action.appointmentId) {
          // Undo create = delete
          await apiRequest(`/api/v1/appointments/${action.appointmentId}`, {
            method: 'DELETE'
          })
          toast({
            title: 'Appointment deleted',
            description: 'The appointment has been removed'
          })
        } else if (action.newData) {
          // Redo create = recreate
          const response = await apiRequest('/api/v1/appointments', {
            method: 'POST',
            data: action.newData
          })
          // Update the action with the new appointment ID
          action.appointmentId = response.data.id
          toast({
            title: 'Appointment created',
            description: 'The appointment has been restored'
          })
        }
        break

      case 'update':
        if (action.appointmentId) {
          const dataToApply = isUndoRedo ? action.previousData : action.newData
          await apiRequest(`/api/v1/appointments/${action.appointmentId}`, {
            method: 'PUT',
            data: dataToApply
          })
          toast({
            title: 'Appointment updated',
            description: isUndoRedo ? 'Changes have been reverted' : 'Changes have been applied'
          })
        }
        break

      case 'delete':
        if (isUndoRedo && action.previousData) {
          // Undo delete = recreate
          const response = await apiRequest('/api/v1/appointments', {
            method: 'POST',
            data: action.previousData
          })
          action.appointmentId = response.data.id
          toast({
            title: 'Appointment restored',
            description: 'The deleted appointment has been restored'
          })
        } else if (action.appointmentId) {
          // Redo delete = delete again
          await apiRequest(`/api/v1/appointments/${action.appointmentId}`, {
            method: 'DELETE'
          })
          toast({
            title: 'Appointment deleted',
            description: 'The appointment has been removed'
          })
        }
        break

      case 'reschedule':
        if (action.appointmentId) {
          const dataToApply = isUndoRedo ? action.previousData : action.newData
          await apiRequest(`/api/v1/appointments/${action.appointmentId}`, {
            method: 'PUT',
            data: {
              appointment_time: dataToApply.appointment_time,
              end_time: dataToApply.end_time
            }
          })
          toast({
            title: 'Appointment rescheduled',
            description: isUndoRedo ? 'Returned to original time' : 'Moved to new time'
          })
        }
        break

      case 'cancel':
        if (action.appointmentId) {
          const newStatus = isUndoRedo ? 'confirmed' : 'cancelled'
          await apiRequest(`/api/v1/appointments/${action.appointmentId}/status`, {
            method: 'PUT',
            data: { status: newStatus }
          })
          toast({
            title: isUndoRedo ? 'Appointment restored' : 'Appointment cancelled',
            description: isUndoRedo ? 'The cancellation has been reversed' : 'The appointment has been cancelled'
          })
        }
        break
    }
  }

  const addAction = (actionData: Omit<AppointmentAction, 'id' | 'timestamp'>) => {
    const action: AppointmentAction = {
      ...actionData,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    }
    setCurrentAction(action)
  }

  const undo = () => {
    if (canUndo) {
      undoAction()
    }
  }

  const redo = () => {
    if (canRedo) {
      redoAction()
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (canUndo) undo()
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault()
        if (canRedo) redo()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [canUndo, canRedo])

  return (
    <AppointmentUndoRedoContext.Provider
      value={{
        addAction,
        undo,
        redo,
        canUndo,
        canRedo,
        history: {
          past: history.past.filter(Boolean) as AppointmentAction[],
          future: history.future.filter(Boolean) as AppointmentAction[],
          total: history.total
        }
      }}
    >
      {children}
    </AppointmentUndoRedoContext.Provider>
  )
}

export function AppointmentUndoRedoControls() {
  const { undo, redo, canUndo, canRedo, history } = useAppointmentUndoRedo()

  if (!canUndo && !canRedo) return null

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
      {history.total > 1 && (
        <span className="text-xs text-muted-foreground ml-2">
          {history.past.length + 1} / {history.total}
        </span>
      )}
    </div>
  )
}

// Helper component to show recent actions
export function AppointmentActionHistory() {
  const { history } = useAppointmentUndoRedo()
  const recentActions = [...history.past].reverse().slice(0, 5)

  if (recentActions.length === 0) return null

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Recent Actions</h4>
      <div className="space-y-1">
        {recentActions.map((action) => (
          <div key={action.id} className="text-xs text-muted-foreground">
            <span className="font-medium">{action.type}:</span> {action.description}
            <span className="ml-2">
              {new Date(action.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}