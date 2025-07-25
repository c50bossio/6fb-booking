'use client'

import React, { useEffect, useCallback } from 'react'
import { ArrowUturnLeftIcon, ArrowUturnRightIcon, ClockIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useCalendar, useCalendarSelectors } from '@/contexts/CalendarContext'
import { cn } from '@/lib/utils'

interface UndoRedoControlsProps {
  className?: string
  showShortcuts?: boolean
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline'
}

export default function UndoRedoControls({
  className,
  showShortcuts = true,
  position = 'top-right'
}: UndoRedoControlsProps) {
  const { actions } = useCalendar()
  const { canUndo, canRedo } = useCalendarSelectors()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if we're in an input field
      const isInputField = (event.target as HTMLElement)?.tagName?.toLowerCase() === 'input' ||
                          (event.target as HTMLElement)?.tagName?.toLowerCase() === 'textarea' ||
                          (event.target as HTMLElement)?.contentEditable === 'true'

      if (isInputField) return

      // Undo: Ctrl+Z (Cmd+Z on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        if (canUndo) {
          actions.undo()
          showUndoToast()
        }
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z (Cmd+Y or Cmd+Shift+Z on Mac)
      if (((event.ctrlKey || event.metaKey) && event.key === 'y') ||
          ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z')) {
        event.preventDefault()
        if (canRedo) {
          actions.redo()
          showRedoToast()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [canUndo, canRedo, actions])

  const showUndoToast = useCallback(() => {
    // In a real implementation, you'd use a toast library
    console.log('Action undone')
  }, [])

  const showRedoToast = useCallback(() => {
    // In a real implementation, you'd use a toast library
    console.log('Action redone')
  }, [])

  const handleUndo = useCallback(() => {
    actions.undo()
    showUndoToast()
  }, [actions, showUndoToast])

  const handleRedo = useCallback(() => {
    actions.redo()
    showRedoToast()
  }, [actions, showRedoToast])

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'fixed top-4 right-4 z-50'
      case 'top-left':
        return 'fixed top-4 left-4 z-50'
      case 'bottom-right':
        return 'fixed bottom-4 right-4 z-50'
      case 'bottom-left':
        return 'fixed bottom-4 left-4 z-50'
      case 'inline':
      default:
        return ''
    }
  }

  if (position === 'inline') {
    return (
      <div className={cn("flex items-center space-x-2", className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!canUndo}
                onClick={handleUndo}
                className="flex items-center space-x-1"
              >
                <ArrowUturnLeftIcon className="h-4 w-4" />
                {showShortcuts && <span className="text-xs">Ctrl+Z</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo last action</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={!canRedo}
                onClick={handleRedo}
                className="flex items-center space-x-1"
              >
                <ArrowUturnRightIcon className="h-4 w-4" />
                {showShortcuts && <span className="text-xs">Ctrl+Y</span>}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo last action</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <div className={cn(
      "bg-white/95 backdrop-blur-sm border rounded-lg shadow-lg p-2",
      "flex items-center space-x-1",
      getPositionClasses(),
      className
    )}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canUndo}
              onClick={handleUndo}
              className="h-8 w-8 p-0"
            >
              <ArrowUturnLeftIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo (Ctrl+Z)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={!canRedo}
              onClick={handleRedo}
              className="h-8 w-8 p-0"
            >
              <ArrowUturnRightIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo (Ctrl+Y)</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

// Advanced Undo/Redo History Component
export function UndoRedoHistory({ className }: { className?: string }) {
  const { state } = useCalendar()
  
  if (state.history.length === 0) {
    return null
  }

  return (
    <div className={cn("bg-white border rounded-lg shadow-sm p-3 max-w-xs", className)}>
      <div className="flex items-center space-x-2 mb-2">
        <ClockIcon className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">Action History</span>
      </div>
      
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {state.history.slice(-10).map((_, index) => {
          const isCurrentState = index === state.historyIndex
          const isFutureState = index > state.historyIndex
          
          return (
            <div
              key={index}
              className={cn(
                "text-xs p-2 rounded",
                isCurrentState && "bg-blue-100 border border-blue-200",
                isFutureState && "text-gray-400",
                !isCurrentState && !isFutureState && "bg-gray-50"
              )}
            >
              <div className="flex items-center justify-between">
                <span>Action {index + 1}</span>
                {isCurrentState && (
                  <Badge variant="secondary" className="text-xs">
                    Current
                  </Badge>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Hook for tracking calendar actions with automatic state saving
export function useAutoSaveCalendarState() {
  const { actions } = useCalendar()

  const saveStateWithAction = useCallback((actionFn: () => void) => {
    // Save current state before action
    actions.saveState()
    
    // Execute the action
    actionFn()
    
    // The new state becomes the current state automatically
  }, [actions])

  return { saveStateWithAction }
}

// Enhanced calendar actions with automatic undo/redo support
export function useUndoableCalendarActions() {
  const { actions } = useCalendar()
  const { saveStateWithAction } = useAutoSaveCalendarState()

  return {
    // Appointment actions with undo support
    addAppointmentWithUndo: useCallback((appointment: any) => {
      saveStateWithAction(() => {
        actions.addAppointment(appointment)
      })
    }, [actions, saveStateWithAction]),

    updateAppointmentWithUndo: useCallback((id: number, updates: any) => {
      saveStateWithAction(() => {
        actions.updateAppointment(id, updates)
      })
    }, [actions, saveStateWithAction]),

    deleteAppointmentWithUndo: useCallback((id: number) => {
      saveStateWithAction(() => {
        actions.deleteAppointment(id)
      })
    }, [actions, saveStateWithAction]),

    // View changes with undo support
    setViewWithUndo: useCallback((view: any) => {
      saveStateWithAction(() => {
        actions.setView(view)
      })
    }, [actions, saveStateWithAction]),

    setDateWithUndo: useCallback((date: Date) => {
      saveStateWithAction(() => {
        actions.setDate(date)
      })
    }, [actions, saveStateWithAction]),

    // Filter changes with undo support
    setFiltersWithUndo: useCallback((filters: any) => {
      saveStateWithAction(() => {
        actions.setFilters(filters)
      })
    }, [actions, saveStateWithAction])
  }
}