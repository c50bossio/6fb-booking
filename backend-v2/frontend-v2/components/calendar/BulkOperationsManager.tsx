'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { format, addDays, isSameDay, parseISO } from 'date-fns'
import { CheckIcon, XMarkIcon, ArrowPathIcon, CalendarIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { CheckSquareIcon, SquareIcon, MinusIcon } from '@heroicons/react/24/outline'

export interface BulkOperation {
  id: string
  type: 'reschedule' | 'cancel' | 'complete' | 'reassign' | 'update_status' | 'send_notifications' | 'export' | 'duplicate'
  name: string
  description: string
  icon: React.ComponentType<any>
  requiresInput?: boolean
  inputType?: 'date' | 'time' | 'barber' | 'status' | 'text'
  batchSize?: number
  estimatedTime?: number // seconds
}

export interface SelectionState {
  selectedIds: Set<number>
  selectionMode: 'none' | 'single' | 'multiple' | 'range'
  lastSelectedIndex: number
  rangeStart: number | null
  selectAll: boolean
}

export interface BulkOperationRequest {
  operation: BulkOperation
  appointmentIds: number[]
  parameters: Record<string, any>
  confirmationRequired: boolean
}

export interface BulkOperationResult {
  success: boolean
  processed: number
  failed: number
  results: Array<{
    appointmentId: number
    success: boolean
    error?: string
    newData?: any
  }>
  summary: string
}

export interface BulkOperationsManagerProps {
  appointments: Array<{
    id: number
    start_time: string
    client_name: string
    service_name: string
    barber_name?: string
    status: string
    duration_minutes: number
  }>
  onBulkOperation: (request: BulkOperationRequest) => Promise<BulkOperationResult>
  onSelectionChange?: (selectedIds: number[]) => void
  maxSelectableItems?: number
  enabledOperations?: string[]
  className?: string
}

const BULK_OPERATIONS: BulkOperation[] = [
  {
    id: 'reschedule',
    type: 'reschedule',
    name: 'Reschedule',
    description: 'Move selected appointments to a new date/time',
    icon: CalendarIcon,
    requiresInput: true,
    inputType: 'date',
    batchSize: 10,
    estimatedTime: 30
  },
  {
    id: 'cancel',
    type: 'cancel',
    name: 'Cancel',
    description: 'Cancel selected appointments',
    icon: XMarkIcon,
    batchSize: 50,
    estimatedTime: 10
  },
  {
    id: 'complete',
    type: 'complete',
    name: 'Mark Complete',
    description: 'Mark selected appointments as completed',
    icon: CheckIcon,
    batchSize: 100,
    estimatedTime: 5
  },
  {
    id: 'reassign',
    type: 'reassign',
    name: 'Reassign Barber',
    description: 'Assign selected appointments to a different barber',
    icon: UserGroupIcon,
    requiresInput: true,
    inputType: 'barber',
    batchSize: 20,
    estimatedTime: 15
  },
  {
    id: 'update_status',
    type: 'update_status',
    name: 'Update Status',
    description: 'Change the status of selected appointments',
    icon: ArrowPathIcon,
    requiresInput: true,
    inputType: 'status',
    batchSize: 50,
    estimatedTime: 10
  },
  {
    id: 'send_notifications',
    type: 'send_notifications',
    name: 'Send Notifications',
    description: 'Send reminder or update notifications to clients',
    icon: ClockIcon,
    requiresInput: true,
    inputType: 'text',
    batchSize: 100,
    estimatedTime: 60
  }
]

export function BulkOperationsManager({
  appointments,
  onBulkOperation,
  onSelectionChange,
  maxSelectableItems = 100,
  enabledOperations = [],
  className = ''
}: BulkOperationsManagerProps) {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedIds: new Set(),
    selectionMode: 'none',
    lastSelectedIndex: -1,
    rangeStart: null,
    selectAll: false
  })

  const [showOperationPanel, setShowOperationPanel] = useState(false)
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null)
  const [operationParameters, setOperationParameters] = useState<Record<string, any>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [operationResult, setOperationResult] = useState<BulkOperationResult | null>(null)

  const selectionPanelRef = useRef<HTMLDivElement>(null)

  // Available operations (filtered by enabled list)
  const availableOperations = useMemo(() => {
    return enabledOperations.length > 0 
      ? BULK_OPERATIONS.filter(op => enabledOperations.includes(op.id))
      : BULK_OPERATIONS
  }, [enabledOperations])

  // Selected appointments data
  const selectedAppointments = useMemo(() => {
    return appointments.filter(apt => selectionState.selectedIds.has(apt.id))
  }, [appointments, selectionState.selectedIds])

  // Selection statistics
  const selectionStats = useMemo(() => {
    const selected = selectedAppointments
    const statuses = selected.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const barbers = selected.reduce((acc, apt) => {
      const barber = apt.barber_name || 'Unassigned'
      acc[barber] = (acc[barber] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      total: selected.length,
      statuses,
      barbers,
      dateRange: selected.length > 0 ? {
        start: selected.reduce((min, apt) => 
          apt.start_time < min ? apt.start_time : min, selected[0].start_time),
        end: selected.reduce((max, apt) => 
          apt.start_time > max ? apt.start_time : max, selected[0].start_time)
      } : null
    }
  }, [selectedAppointments])

  // Handle individual appointment selection
  const handleAppointmentSelect = useCallback((appointmentId: number, event: React.MouseEvent) => {
    const appointmentIndex = appointments.findIndex(apt => apt.id === appointmentId)
    
    setSelectionState(prev => {
      const newSelectedIds = new Set(prev.selectedIds)
      
      if (event.shiftKey && prev.lastSelectedIndex !== -1 && prev.selectionMode !== 'single') {
        // Range selection
        const start = Math.min(prev.lastSelectedIndex, appointmentIndex)
        const end = Math.max(prev.lastSelectedIndex, appointmentIndex)
        
        for (let i = start; i <= end; i++) {
          if (newSelectedIds.size < maxSelectableItems) {
            newSelectedIds.add(appointments[i].id)
          }
        }
        
        return {
          ...prev,
          selectedIds: newSelectedIds,
          selectionMode: 'range',
          rangeStart: prev.lastSelectedIndex
        }
      } else if (event.ctrlKey || event.metaKey) {
        // Multi-selection
        if (newSelectedIds.has(appointmentId)) {
          newSelectedIds.delete(appointmentId)
        } else if (newSelectedIds.size < maxSelectableItems) {
          newSelectedIds.add(appointmentId)
        }
        
        return {
          ...prev,
          selectedIds: newSelectedIds,
          selectionMode: newSelectedIds.size > 1 ? 'multiple' : 'single',
          lastSelectedIndex: appointmentIndex
        }
      } else {
        // Single selection (or toggle if already selected)
        if (newSelectedIds.has(appointmentId) && newSelectedIds.size === 1) {
          newSelectedIds.clear()
          return {
            ...prev,
            selectedIds: newSelectedIds,
            selectionMode: 'none',
            lastSelectedIndex: -1
          }
        } else {
          newSelectedIds.clear()
          newSelectedIds.add(appointmentId)
          return {
            ...prev,
            selectedIds: newSelectedIds,
            selectionMode: 'single',
            lastSelectedIndex: appointmentIndex
          }
        }
      }
    })
  }, [appointments, maxSelectableItems])

  // Handle select all
  const handleSelectAll = useCallback(() => {
    setSelectionState(prev => {
      if (prev.selectAll || prev.selectedIds.size === appointments.length) {
        // Deselect all
        return {
          ...prev,
          selectedIds: new Set(),
          selectionMode: 'none',
          selectAll: false,
          lastSelectedIndex: -1
        }
      } else {
        // Select all (up to limit)
        const newSelectedIds = new Set<number>()
        appointments.slice(0, maxSelectableItems).forEach(apt => {
          newSelectedIds.add(apt.id)
        })
        
        return {
          ...prev,
          selectedIds: newSelectedIds,
          selectionMode: 'multiple',
          selectAll: true
        }
      }
    })
  }, [appointments, maxSelectableItems])

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectionState({
      selectedIds: new Set(),
      selectionMode: 'none',
      lastSelectedIndex: -1,
      rangeStart: null,
      selectAll: false
    })
    setShowOperationPanel(false)
    setSelectedOperation(null)
    setOperationResult(null)
  }, [])

  // Execute bulk operation
  const executeBulkOperation = useCallback(async () => {
    if (!selectedOperation || selectionState.selectedIds.size === 0) return

    const request: BulkOperationRequest = {
      operation: selectedOperation,
      appointmentIds: Array.from(selectionState.selectedIds),
      parameters: operationParameters,
      confirmationRequired: selectionState.selectedIds.size > 10 || ['cancel', 'delete'].includes(selectedOperation.type)
    }

    setIsProcessing(true)
    setProcessingProgress(0)

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const result = await onBulkOperation(request)
      
      clearInterval(progressInterval)
      setProcessingProgress(100)
      
      setTimeout(() => {
        setIsProcessing(false)
        setOperationResult(result)
        
        if (result.success) {
          // Clear selection on successful operation
          setTimeout(() => {
            clearSelection()
          }, 3000)
        }
      }, 500)

    } catch (error) {
      setIsProcessing(false)
      setOperationResult({
        success: false,
        processed: 0,
        failed: selectionState.selectedIds.size,
        results: [],
        summary: `Operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }, [selectedOperation, selectionState.selectedIds, operationParameters, onBulkOperation, clearSelection])

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(Array.from(selectionState.selectedIds))
  }, [selectionState.selectedIds, onSelectionChange])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes((event.target as HTMLElement).tagName)) {
        return
      }

      switch (event.key) {
        case 'a':
        case 'A':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault()
            handleSelectAll()
          }
          break
        case 'Escape':
          clearSelection()
          break
        case 'Delete':
          if (selectionState.selectedIds.size > 0) {
            const cancelOp = availableOperations.find(op => op.type === 'cancel')
            if (cancelOp) {
              setSelectedOperation(cancelOp)
              setShowOperationPanel(true)
            }
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectionState.selectedIds.size, handleSelectAll, clearSelection, availableOperations])

  const getSelectionIcon = () => {
    if (selectionState.selectAll || selectionState.selectedIds.size === appointments.length) {
      return <CheckSquareIcon className="w-5 h-5" />
    } else if (selectionState.selectedIds.size > 0) {
      return <MinusIcon className="w-5 h-5" />
    } else {
      return <SquareIcon className="w-5 h-5" />
    }
  }

  return (
    <div className={`bulk-operations-manager ${className}`}>
      {/* Selection Header */}
      {selectionState.selectedIds.size > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-blue-700 hover:text-blue-900"
                title={selectionState.selectAll ? 'Deselect all' : 'Select all'}
              >
                {getSelectionIcon()}
                <span className="font-medium">
                  {selectionState.selectedIds.size} of {appointments.length} selected
                </span>
              </button>
              
              {selectionState.selectedIds.size >= maxSelectableItems && (
                <span className="text-sm text-orange-600">
                  (Maximum {maxSelectableItems} items)
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOperationPanel(!showOperationPanel)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Bulk Actions
              </button>
              <button
                onClick={clearSelection}
                className="px-3 py-2 text-gray-600 hover:text-gray-800"
                title="Clear selection"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Selection Stats */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Status Distribution:</span>
              <div className="mt-1">
                {Object.entries(selectionStats.statuses).map(([status, count]) => (
                  <span key={status} className="inline-block mr-3 text-blue-700">
                    {status}: {count}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <span className="text-gray-600">Barbers:</span>
              <div className="mt-1">
                {Object.entries(selectionStats.barbers).map(([barber, count]) => (
                  <span key={barber} className="inline-block mr-3 text-blue-700">
                    {barber}: {count}
                  </span>
                ))}
              </div>
            </div>
            
            {selectionStats.dateRange && (
              <div>
                <span className="text-gray-600">Date Range:</span>
                <div className="mt-1 text-blue-700">
                  {format(parseISO(selectionStats.dateRange.start), 'MMM d')} - {format(parseISO(selectionStats.dateRange.end), 'MMM d')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk Operations Panel */}
      {showOperationPanel && selectionState.selectedIds.size > 0 && (
        <div ref={selectionPanelRef} className="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
          <h3 className="font-medium mb-4">Bulk Operations</h3>
          
          {!selectedOperation ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableOperations.map((operation) => {
                const Icon = operation.icon
                const estimatedTotal = Math.ceil(selectionState.selectedIds.size / (operation.batchSize || 1)) * (operation.estimatedTime || 10)
                
                return (
                  <button
                    key={operation.id}
                    onClick={() => setSelectedOperation(operation)}
                    className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-gray-600" />
                      <span className="font-medium text-sm">{operation.name}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">{operation.description}</p>
                    <div className="text-xs text-gray-500">
                      ~{estimatedTotal}s for {selectionState.selectedIds.size} items
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">{selectedOperation.name}</h4>
                <button
                  onClick={() => setSelectedOperation(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600">{selectedOperation.description}</p>
              
              {/* Operation-specific inputs */}
              {selectedOperation.requiresInput && (
                <div className="space-y-3">
                  {selectedOperation.inputType === 'date' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Date
                      </label>
                      <input
                        type="date"
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                        onChange={(e) => setOperationParameters({...operationParameters, date: e.target.value})}
                      />
                    </div>
                  )}
                  
                  {selectedOperation.inputType === 'time' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Time
                      </label>
                      <input
                        type="time"
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                        onChange={(e) => setOperationParameters({...operationParameters, time: e.target.value})}
                      />
                    </div>
                  )}
                  
                  {selectedOperation.inputType === 'status' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Status
                      </label>
                      <select
                        className="border border-gray-300 rounded px-3 py-2 text-sm"
                        onChange={(e) => setOperationParameters({...operationParameters, status: e.target.value})}
                      >
                        <option value="">Select status...</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no_show">No Show</option>
                      </select>
                    </div>
                  )}
                  
                  {selectedOperation.inputType === 'text' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Message
                      </label>
                      <textarea
                        className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
                        rows={3}
                        placeholder="Enter message..."
                        onChange={(e) => setOperationParameters({...operationParameters, message: e.target.value})}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Processing Progress */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Processing {selectionState.selectedIds.size} appointments...</span>
                    <span>{processingProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Operation Result */}
              {operationResult && (
                <div className={`p-3 rounded-lg border ${operationResult.success ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <div className="font-medium">
                    {operationResult.success ? 'Operation Completed' : 'Operation Failed'}
                  </div>
                  <div className="text-sm mt-1">
                    {operationResult.summary}
                  </div>
                  {operationResult.processed > 0 && (
                    <div className="text-sm mt-1">
                      Processed: {operationResult.processed}, Failed: {operationResult.failed}
                    </div>
                  )}
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={executeBulkOperation}
                  disabled={isProcessing || (selectedOperation.requiresInput && !Object.keys(operationParameters).length)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? 'Processing...' : `Apply to ${selectionState.selectedIds.size} appointments`}
                </button>
                <button
                  onClick={() => setSelectedOperation(null)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selection Instructions */}
      {selectionState.selectedIds.size === 0 && (
        <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg">
          <p className="font-medium mb-1">Multi-Select Instructions:</p>
          <ul className="space-y-1">
            <li>• Click to select individual appointments</li>
            <li>• Ctrl/Cmd + Click for multi-selection</li>
            <li>• Shift + Click for range selection</li>
            <li>• Ctrl/Cmd + A to select all</li>
            <li>• Delete key to quickly cancel selected</li>
          </ul>
        </div>
      )}
    </div>
  )
}

// Hook for managing bulk operations state
export function useBulkOperations(appointments: any[]) {
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedIds: new Set(),
    selectionMode: 'none',
    lastSelectedIndex: -1,
    rangeStart: null,
    selectAll: false
  })

  const selectedAppointments = useMemo(() => {
    return appointments.filter(apt => selectionState.selectedIds.has(apt.id))
  }, [appointments, selectionState.selectedIds])

  const toggleSelection = useCallback((id: number) => {
    setSelectionState(prev => {
      const newSelectedIds = new Set(prev.selectedIds)
      if (newSelectedIds.has(id)) {
        newSelectedIds.delete(id)
      } else {
        newSelectedIds.add(id)
      }
      
      return {
        ...prev,
        selectedIds: newSelectedIds,
        selectionMode: newSelectedIds.size > 1 ? 'multiple' : newSelectedIds.size === 1 ? 'single' : 'none'
      }
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectionState({
      selectedIds: new Set(),
      selectionMode: 'none',
      lastSelectedIndex: -1,
      rangeStart: null,
      selectAll: false
    })
  }, [])

  const selectAll = useCallback(() => {
    const allIds = new Set(appointments.map(apt => apt.id))
    setSelectionState(prev => ({
      ...prev,
      selectedIds: allIds,
      selectionMode: 'multiple',
      selectAll: true
    }))
  }, [appointments])

  return {
    selectionState,
    selectedAppointments,
    toggleSelection,
    clearSelection,
    selectAll,
    hasSelection: selectionState.selectedIds.size > 0
  }
}

export default BulkOperationsManager