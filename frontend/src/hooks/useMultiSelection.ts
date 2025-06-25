'use client'

/**
 * Multi-Selection Hook for Bulk Calendar Operations
 *
 * This hook provides comprehensive multi-selection functionality:
 * - Click-to-select with Ctrl/Cmd multi-select
 * - Shift-click range selection
 * - Drag-to-select (lasso selection)
 * - Select all/none operations
 * - Bulk move operations
 * - Selection persistence across view changes
 * - Keyboard selection support
 * - Visual selection feedback
 * - Bulk action operations (delete, reschedule, etc.)
 */

import { useCallback, useRef, useEffect, useState } from 'react'
import { CalendarAppointment } from '@/components/calendar/RobustCalendar'

export interface SelectionState {
  selectedAppointments: Set<string>
  lastSelectedId: string | null
  selectionMode: 'single' | 'multi' | 'range' | 'lasso'
  isSelecting: boolean
  selectionBox: SelectionBox | null
  selectionHistory: SelectionSnapshot[]
  quickSelectFilters: QuickSelectFilter[]
}

export interface SelectionBox {
  startX: number
  startY: number
  currentX: number
  currentY: number
  element: HTMLElement | null
  visible: boolean
}

export interface SelectionSnapshot {
  id: string
  selectedIds: Set<string>
  timestamp: number
  action: 'select' | 'deselect' | 'select_all' | 'clear' | 'range_select' | 'lasso_select'
}

export interface QuickSelectFilter {
  id: string
  name: string
  description: string
  filter: (appointment: CalendarAppointment) => boolean
  shortcut?: string
  icon?: string
}

export interface BulkOperation {
  id: string
  name: string
  description: string
  icon: string
  requiresTarget?: boolean
  confirmationRequired?: boolean
  operation: (appointments: CalendarAppointment[], target?: any) => Promise<BulkOperationResult>
}

export interface BulkOperationResult {
  success: boolean
  processed: number
  failed: number
  errors: string[]
  results: Array<{
    appointmentId: string
    success: boolean
    error?: string
  }>
}

export interface MultiSelectionHookReturn {
  // State
  selectionState: SelectionState
  selectedCount: number
  selectedAppointments: CalendarAppointment[]
  canBulkMove: boolean

  // Selection methods
  selectAppointment: (appointmentId: string, mode?: 'single' | 'toggle' | 'range') => void
  deselectAppointment: (appointmentId: string) => void
  toggleAppointment: (appointmentId: string) => void
  selectRange: (fromId: string, toId: string) => void
  selectAll: (filter?: (appointment: CalendarAppointment) => boolean) => void
  selectNone: () => void
  invertSelection: () => void

  // Lasso selection
  startLassoSelection: (event: React.MouseEvent) => void
  updateLassoSelection: (event: React.MouseEvent) => void
  endLassoSelection: () => void

  // Keyboard selection
  handleSelectionKeyboard: (event: React.KeyboardEvent) => boolean
  selectNext: () => void
  selectPrevious: () => void
  extendSelectionNext: () => void
  extendSelectionPrevious: () => void

  // Quick select filters
  applyQuickSelect: (filterId: string) => void
  addQuickSelectFilter: (filter: QuickSelectFilter) => void
  removeQuickSelectFilter: (filterId: string) => void

  // Bulk operations
  bulkMove: (targetDate: string, targetTime: string) => Promise<BulkOperationResult>
  bulkReschedule: (offset: { days?: number; hours?: number; minutes?: number }) => Promise<BulkOperationResult>
  bulkDelete: () => Promise<BulkOperationResult>
  bulkUpdateStatus: (status: CalendarAppointment['status']) => Promise<BulkOperationResult>
  bulkApplyOperation: (operation: BulkOperation, target?: any) => Promise<BulkOperationResult>

  // Selection persistence
  saveSelection: (name: string) => void
  loadSelection: (name: string) => void
  getSavedSelections: () => Array<{ name: string; count: number; timestamp: number }>

  // Undo/redo
  undoSelection: () => void
  redoSelection: () => void
  canUndo: boolean
  canRedo: boolean

  // Visual feedback
  getSelectionBoxStyle: () => React.CSSProperties | null
  isAppointmentSelected: (appointmentId: string) => boolean
  getSelectionClass: (appointmentId: string) => string

  // Statistics
  getSelectionStats: () => {
    total: number
    byStatus: Record<string, number>
    byBarber: Record<string, number>
    byService: Record<string, number>
    totalValue: number
    totalDuration: number
  }
}

const DEFAULT_QUICK_SELECT_FILTERS: QuickSelectFilter[] = [
  {
    id: 'today',
    name: 'Today',
    description: 'Select all appointments for today',
    filter: (apt) => apt.date === new Date().toISOString().split('T')[0],
    shortcut: 'Ctrl+T',
    icon: '📅'
  },
  {
    id: 'pending',
    name: 'Pending',
    description: 'Select all pending appointments',
    filter: (apt) => apt.status === 'pending',
    shortcut: 'Ctrl+P',
    icon: '⏳'
  },
  {
    id: 'confirmed',
    name: 'Confirmed',
    description: 'Select all confirmed appointments',
    filter: (apt) => apt.status === 'confirmed',
    shortcut: 'Ctrl+C',
    icon: '✅'
  },
  {
    id: 'high_value',
    name: 'High Value',
    description: 'Select appointments over $75',
    filter: (apt) => apt.price > 75,
    shortcut: 'Ctrl+H',
    icon: '💰'
  }
]

export function useMultiSelection(
  appointments: CalendarAppointment[],
  onBulkMove?: (appointmentIds: string[], targetDate: string, targetTime: string) => Promise<BulkOperationResult>,
  onBulkDelete?: (appointmentIds: string[]) => Promise<BulkOperationResult>,
  onBulkUpdate?: (appointmentIds: string[], updates: Partial<CalendarAppointment>) => Promise<BulkOperationResult>,
  enablePersistence: boolean = true
): MultiSelectionHookReturn {

  // Selection state
  const [selectionState, setSelectionState] = useState<SelectionState>({
    selectedAppointments: new Set(),
    lastSelectedId: null,
    selectionMode: 'single',
    isSelecting: false,
    selectionBox: null,
    selectionHistory: [],
    quickSelectFilters: DEFAULT_QUICK_SELECT_FILTERS
  })

  // History for undo/redo
  const [historyIndex, setHistoryIndex] = useState(-1)
  const maxHistorySize = 50

  // Refs for tracking
  const containerRef = useRef<HTMLElement | null>(null)
  const selectionBoxRef = useRef<HTMLElement | null>(null)
  const savedSelectionsRef = useRef<Map<string, Set<string>>>(new Map())

  // Computed values
  const selectedCount = selectionState.selectedAppointments.size
  const selectedAppointments = appointments.filter(apt =>
    selectionState.selectedAppointments.has(apt.id)
  )
  const canBulkMove = selectedCount > 0 && !!onBulkMove

  // Add selection to history
  const addToHistory = useCallback((
    action: SelectionSnapshot['action'],
    selectedIds: Set<string>
  ) => {
    const snapshot: SelectionSnapshot = {
      id: `selection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selectedIds: new Set(selectedIds),
      timestamp: Date.now(),
      action
    }

    setSelectionState(prev => {
      const newHistory = [
        ...prev.selectionHistory.slice(0, historyIndex + 1),
        snapshot
      ].slice(-maxHistorySize)

      return {
        ...prev,
        selectionHistory: newHistory
      }
    })

    setHistoryIndex(prev => Math.min(prev + 1, maxHistorySize - 1))
  }, [historyIndex])

  // Basic selection methods
  const selectAppointment = useCallback((
    appointmentId: string,
    mode: 'single' | 'toggle' | 'range' = 'single'
  ) => {
    setSelectionState(prev => {
      let newSelection = new Set(prev.selectedAppointments)
      let action: SelectionSnapshot['action'] = 'select'

      switch (mode) {
        case 'single':
          newSelection = new Set([appointmentId])
          action = 'select'
          break

        case 'toggle':
          if (newSelection.has(appointmentId)) {
            newSelection.delete(appointmentId)
            action = 'deselect'
          } else {
            newSelection.add(appointmentId)
            action = 'select'
          }
          break

        case 'range':
          if (prev.lastSelectedId) {
            const fromIndex = appointments.findIndex(apt => apt.id === prev.lastSelectedId)
            const toIndex = appointments.findIndex(apt => apt.id === appointmentId)

            if (fromIndex >= 0 && toIndex >= 0) {
              const start = Math.min(fromIndex, toIndex)
              const end = Math.max(fromIndex, toIndex)

              for (let i = start; i <= end; i++) {
                newSelection.add(appointments[i].id)
              }
              action = 'range_select'
            }
          }
          break
      }

      addToHistory(action, newSelection)

      return {
        ...prev,
        selectedAppointments: newSelection,
        lastSelectedId: appointmentId
      }
    })
  }, [appointments, addToHistory])

  const deselectAppointment = useCallback((appointmentId: string) => {
    setSelectionState(prev => {
      const newSelection = new Set(prev.selectedAppointments)
      newSelection.delete(appointmentId)

      addToHistory('deselect', newSelection)

      return {
        ...prev,
        selectedAppointments: newSelection
      }
    })
  }, [addToHistory])

  const toggleAppointment = useCallback((appointmentId: string) => {
    selectAppointment(appointmentId, 'toggle')
  }, [selectAppointment])

  const selectRange = useCallback((fromId: string, toId: string) => {
    const fromIndex = appointments.findIndex(apt => apt.id === fromId)
    const toIndex = appointments.findIndex(apt => apt.id === toId)

    if (fromIndex >= 0 && toIndex >= 0) {
      const start = Math.min(fromIndex, toIndex)
      const end = Math.max(fromIndex, toIndex)

      setSelectionState(prev => {
        const newSelection = new Set(prev.selectedAppointments)

        for (let i = start; i <= end; i++) {
          newSelection.add(appointments[i].id)
        }

        addToHistory('range_select', newSelection)

        return {
          ...prev,
          selectedAppointments: newSelection,
          lastSelectedId: toId
        }
      })
    }
  }, [appointments, addToHistory])

  const selectAll = useCallback((filter?: (appointment: CalendarAppointment) => boolean) => {
    const appointmentsToSelect = filter ? appointments.filter(filter) : appointments
    const newSelection = new Set(appointmentsToSelect.map(apt => apt.id))

    setSelectionState(prev => ({
      ...prev,
      selectedAppointments: newSelection
    }))

    addToHistory('select_all', newSelection)
  }, [appointments, addToHistory])

  const selectNone = useCallback(() => {
    setSelectionState(prev => ({
      ...prev,
      selectedAppointments: new Set(),
      lastSelectedId: null
    }))

    addToHistory('clear', new Set())
  }, [addToHistory])

  const invertSelection = useCallback(() => {
    setSelectionState(prev => {
      const newSelection = new Set<string>()

      appointments.forEach(apt => {
        if (!prev.selectedAppointments.has(apt.id)) {
          newSelection.add(apt.id)
        }
      })

      addToHistory('select', newSelection)

      return {
        ...prev,
        selectedAppointments: newSelection
      }
    })
  }, [appointments, addToHistory])

  // Lasso selection
  const startLassoSelection = useCallback((event: React.MouseEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const startX = event.clientX - rect.left
    const startY = event.clientY - rect.top

    // Create selection box element
    const selectionBox = document.createElement('div')
    selectionBox.className = 'selection-box'
    selectionBox.style.cssText = `
      position: absolute;
      border: 2px dashed #8b5cf6;
      background: rgba(139, 92, 246, 0.1);
      pointer-events: none;
      z-index: 1000;
      left: ${startX}px;
      top: ${startY}px;
      width: 0;
      height: 0;
    `;

    (event.currentTarget as HTMLElement).appendChild(selectionBox)
    selectionBoxRef.current = selectionBox

    setSelectionState(prev => ({
      ...prev,
      isSelecting: true,
      selectionMode: 'lasso',
      selectionBox: {
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        element: selectionBox,
        visible: true
      }
    }))

    // Prevent text selection
    event.preventDefault()
  }, [])

  const updateLassoSelection = useCallback((event: React.MouseEvent) => {
    if (!selectionState.isSelecting || !selectionState.selectionBox) return

    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const currentX = event.clientX - rect.left
    const currentY = event.clientY - rect.top

    const { startX, startY } = selectionState.selectionBox
    const width = Math.abs(currentX - startX)
    const height = Math.abs(currentY - startY)
    const left = Math.min(startX, currentX)
    const top = Math.min(startY, currentY)

    // Update selection box
    if (selectionBoxRef.current) {
      selectionBoxRef.current.style.left = `${left}px`
      selectionBoxRef.current.style.top = `${top}px`
      selectionBoxRef.current.style.width = `${width}px`
      selectionBoxRef.current.style.height = `${height}px`
    }

    setSelectionState(prev => ({
      ...prev,
      selectionBox: prev.selectionBox ? {
        ...prev.selectionBox,
        currentX,
        currentY
      } : null
    }))

    // Find appointments within selection box
    const selectionRect = { left, top, right: left + width, bottom: top + height }
    const newSelection = new Set<string>()

    appointments.forEach(appointment => {
      const appointmentElement = document.querySelector(`[data-appointment-id="${appointment.id}"]`)
      if (appointmentElement) {
        const elementRect = appointmentElement.getBoundingClientRect()
        const containerRect = (event.currentTarget as HTMLElement).getBoundingClientRect()

        const elementRelativeRect = {
          left: elementRect.left - containerRect.left,
          top: elementRect.top - containerRect.top,
          right: elementRect.right - containerRect.left,
          bottom: elementRect.bottom - containerRect.top
        }

        // Check if element intersects with selection box
        if (!(elementRelativeRect.right < selectionRect.left ||
              elementRelativeRect.left > selectionRect.right ||
              elementRelativeRect.bottom < selectionRect.top ||
              elementRelativeRect.top > selectionRect.bottom)) {
          newSelection.add(appointment.id)
        }
      }
    })

    setSelectionState(prev => ({
      ...prev,
      selectedAppointments: newSelection
    }))

  }, [selectionState.isSelecting, selectionState.selectionBox, appointments])

  const endLassoSelection = useCallback(() => {
    // Remove selection box
    if (selectionBoxRef.current && selectionBoxRef.current.parentNode) {
      selectionBoxRef.current.parentNode.removeChild(selectionBoxRef.current)
      selectionBoxRef.current = null
    }

    addToHistory('lasso_select', selectionState.selectedAppointments)

    setSelectionState(prev => ({
      ...prev,
      isSelecting: false,
      selectionMode: 'multi',
      selectionBox: null
    }))
  }, [selectionState.selectedAppointments, addToHistory])

  // Keyboard selection
  const handleSelectionKeyboard = useCallback((event: React.KeyboardEvent): boolean => {
    const { key, ctrlKey, metaKey, shiftKey } = event
    const modifierKey = ctrlKey || metaKey

    // Select all
    if (modifierKey && key === 'a') {
      event.preventDefault()
      selectAll()
      return true
    }

    // Clear selection
    if (key === 'Escape') {
      event.preventDefault()
      selectNone()
      return true
    }

    // Invert selection
    if (modifierKey && shiftKey && key === 'i') {
      event.preventDefault()
      invertSelection()
      return true
    }

    // Quick select filters
    const activeFilter = selectionState.quickSelectFilters.find(filter => {
      if (!filter.shortcut) return false
      const shortcutParts = filter.shortcut.toLowerCase().split('+')
      const keyMatches = shortcutParts.includes(key.toLowerCase())
      const modifierMatches = shortcutParts.includes('ctrl') ? modifierKey : !modifierKey
      return keyMatches && modifierMatches
    })

    if (activeFilter) {
      event.preventDefault()
      applyQuickSelect(activeFilter.id)
      return true
    }

    return false
  }, [selectAll, selectNone, invertSelection, selectionState.quickSelectFilters])

  const selectNext = useCallback(() => {
    if (appointments.length === 0) return

    const currentIndex = selectionState.lastSelectedId
      ? appointments.findIndex(apt => apt.id === selectionState.lastSelectedId)
      : -1

    const nextIndex = (currentIndex + 1) % appointments.length
    selectAppointment(appointments[nextIndex].id, 'single')
  }, [appointments, selectionState.lastSelectedId, selectAppointment])

  const selectPrevious = useCallback(() => {
    if (appointments.length === 0) return

    const currentIndex = selectionState.lastSelectedId
      ? appointments.findIndex(apt => apt.id === selectionState.lastSelectedId)
      : 0

    const prevIndex = currentIndex > 0 ? currentIndex - 1 : appointments.length - 1
    selectAppointment(appointments[prevIndex].id, 'single')
  }, [appointments, selectionState.lastSelectedId, selectAppointment])

  const extendSelectionNext = useCallback(() => {
    if (appointments.length === 0 || !selectionState.lastSelectedId) return

    const currentIndex = appointments.findIndex(apt => apt.id === selectionState.lastSelectedId)
    const nextIndex = Math.min(currentIndex + 1, appointments.length - 1)

    if (nextIndex !== currentIndex) {
      selectAppointment(appointments[nextIndex].id, 'toggle')
    }
  }, [appointments, selectionState.lastSelectedId, selectAppointment])

  const extendSelectionPrevious = useCallback(() => {
    if (appointments.length === 0 || !selectionState.lastSelectedId) return

    const currentIndex = appointments.findIndex(apt => apt.id === selectionState.lastSelectedId)
    const prevIndex = Math.max(currentIndex - 1, 0)

    if (prevIndex !== currentIndex) {
      selectAppointment(appointments[prevIndex].id, 'toggle')
    }
  }, [appointments, selectionState.lastSelectedId, selectAppointment])

  // Quick select filters
  const applyQuickSelect = useCallback((filterId: string) => {
    const filter = selectionState.quickSelectFilters.find(f => f.id === filterId)
    if (filter) {
      selectAll(filter.filter)
    }
  }, [selectionState.quickSelectFilters, selectAll])

  const addQuickSelectFilter = useCallback((filter: QuickSelectFilter) => {
    setSelectionState(prev => ({
      ...prev,
      quickSelectFilters: [...prev.quickSelectFilters, filter]
    }))
  }, [])

  const removeQuickSelectFilter = useCallback((filterId: string) => {
    setSelectionState(prev => ({
      ...prev,
      quickSelectFilters: prev.quickSelectFilters.filter(f => f.id !== filterId)
    }))
  }, [])

  // Bulk operations
  const bulkMove = useCallback(async (
    targetDate: string,
    targetTime: string
  ): Promise<BulkOperationResult> => {
    if (!onBulkMove || selectedCount === 0) {
      return {
        success: false,
        processed: 0,
        failed: selectedCount,
        errors: ['No move handler provided or no appointments selected'],
        results: []
      }
    }

    return await onBulkMove(Array.from(selectionState.selectedAppointments), targetDate, targetTime)
  }, [onBulkMove, selectedCount, selectionState.selectedAppointments])

  const bulkReschedule = useCallback(async (
    offset: { days?: number; hours?: number; minutes?: number }
  ): Promise<BulkOperationResult> => {
    const results: BulkOperationResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
      results: []
    }

    for (const appointment of selectedAppointments) {
      try {
        const currentDate = new Date(appointment.date + ' ' + appointment.startTime)

        if (offset.days) currentDate.setDate(currentDate.getDate() + offset.days)
        if (offset.hours) currentDate.setHours(currentDate.getHours() + offset.hours)
        if (offset.minutes) currentDate.setMinutes(currentDate.getMinutes() + offset.minutes)

        const newDate = currentDate.toISOString().split('T')[0]
        const newTime = currentDate.toTimeString().slice(0, 5)

        if (onBulkMove) {
          await onBulkMove([appointment.id], newDate, newTime)
          results.processed++
          results.results.push({ appointmentId: appointment.id, success: true })
        }
      } catch (error) {
        results.failed++
        results.errors.push(`Failed to reschedule ${appointment.id}: ${error}`)
        results.results.push({
          appointmentId: appointment.id,
          success: false,
          error: String(error)
        })
      }
    }

    results.success = results.failed === 0
    return results
  }, [selectedAppointments, onBulkMove])

  const bulkDelete = useCallback(async (): Promise<BulkOperationResult> => {
    if (!onBulkDelete || selectedCount === 0) {
      return {
        success: false,
        processed: 0,
        failed: selectedCount,
        errors: ['No delete handler provided or no appointments selected'],
        results: []
      }
    }

    const result = await onBulkDelete(Array.from(selectionState.selectedAppointments))

    // Clear selection after successful delete
    if (result.success) {
      selectNone()
    }

    return result
  }, [onBulkDelete, selectedCount, selectionState.selectedAppointments, selectNone])

  const bulkUpdateStatus = useCallback(async (
    status: CalendarAppointment['status']
  ): Promise<BulkOperationResult> => {
    if (!onBulkUpdate || selectedCount === 0) {
      return {
        success: false,
        processed: 0,
        failed: selectedCount,
        errors: ['No update handler provided or no appointments selected'],
        results: []
      }
    }

    return await onBulkUpdate(Array.from(selectionState.selectedAppointments), { status })
  }, [onBulkUpdate, selectedCount, selectionState.selectedAppointments])

  const bulkApplyOperation = useCallback(async (
    operation: BulkOperation,
    target?: any
  ): Promise<BulkOperationResult> => {
    if (selectedCount === 0) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: ['No appointments selected'],
        results: []
      }
    }

    return await operation.operation(selectedAppointments, target)
  }, [selectedCount, selectedAppointments])

  // Selection persistence
  const saveSelection = useCallback((name: string) => {
    if (!enablePersistence) return

    savedSelectionsRef.current.set(name, new Set(selectionState.selectedAppointments))

    // Persist to localStorage
    const saved = Object.fromEntries(
      Array.from(savedSelectionsRef.current.entries()).map(([key, value]) => [
        key,
        Array.from(value)
      ])
    )
    localStorage.setItem('calendarSelections', JSON.stringify(saved))
  }, [enablePersistence, selectionState.selectedAppointments])

  const loadSelection = useCallback((name: string) => {
    if (!enablePersistence) return

    const saved = savedSelectionsRef.current.get(name)
    if (saved) {
      setSelectionState(prev => ({
        ...prev,
        selectedAppointments: new Set(saved)
      }))

      addToHistory('select', saved)
    }
  }, [enablePersistence, addToHistory])

  const getSavedSelections = useCallback(() => {
    if (!enablePersistence) return []

    return Array.from(savedSelectionsRef.current.entries()).map(([name, selection]) => ({
      name,
      count: selection.size,
      timestamp: Date.now() // Would be saved with actual timestamp
    }))
  }, [enablePersistence])

  // Load saved selections on mount
  useEffect(() => {
    if (!enablePersistence) return

    const saved = localStorage.getItem('calendarSelections')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        Object.entries(parsed).forEach(([name, ids]) => {
          savedSelectionsRef.current.set(name, new Set(ids as string[]))
        })
      } catch (error) {
        console.error('Failed to load saved selections:', error)
      }
    }
  }, [enablePersistence])

  // Undo/redo
  const undoSelection = useCallback(() => {
    if (historyIndex > 0) {
      const previousSnapshot = selectionState.selectionHistory[historyIndex - 1]
      setSelectionState(prev => ({
        ...prev,
        selectedAppointments: new Set(previousSnapshot.selectedIds)
      }))
      setHistoryIndex(prev => prev - 1)
    }
  }, [historyIndex, selectionState.selectionHistory])

  const redoSelection = useCallback(() => {
    if (historyIndex < selectionState.selectionHistory.length - 1) {
      const nextSnapshot = selectionState.selectionHistory[historyIndex + 1]
      setSelectionState(prev => ({
        ...prev,
        selectedAppointments: new Set(nextSnapshot.selectedIds)
      }))
      setHistoryIndex(prev => prev + 1)
    }
  }, [historyIndex, selectionState.selectionHistory])

  // Visual feedback
  const getSelectionBoxStyle = useCallback((): React.CSSProperties | null => {
    if (!selectionState.selectionBox || !selectionState.selectionBox.visible) {
      return null
    }

    const { startX, startY, currentX, currentY } = selectionState.selectionBox

    return {
      position: 'absolute',
      left: Math.min(startX, currentX),
      top: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
      border: '2px dashed #8b5cf6',
      background: 'rgba(139, 92, 246, 0.1)',
      pointerEvents: 'none',
      zIndex: 1000
    }
  }, [selectionState.selectionBox])

  const isAppointmentSelected = useCallback((appointmentId: string): boolean => {
    return selectionState.selectedAppointments.has(appointmentId)
  }, [selectionState.selectedAppointments])

  const getSelectionClass = useCallback((appointmentId: string): string => {
    const isSelected = selectionState.selectedAppointments.has(appointmentId)
    const isLast = selectionState.lastSelectedId === appointmentId

    let classes = []
    if (isSelected) classes.push('selected')
    if (isLast) classes.push('last-selected')

    return classes.join(' ')
  }, [selectionState.selectedAppointments, selectionState.lastSelectedId])

  // Statistics
  const getSelectionStats = useCallback(() => {
    const stats = {
      total: selectedCount,
      byStatus: {} as Record<string, number>,
      byBarber: {} as Record<string, number>,
      byService: {} as Record<string, number>,
      totalValue: 0,
      totalDuration: 0
    }

    selectedAppointments.forEach(appointment => {
      // Status stats
      stats.byStatus[appointment.status] = (stats.byStatus[appointment.status] || 0) + 1

      // Barber stats
      stats.byBarber[appointment.barber] = (stats.byBarber[appointment.barber] || 0) + 1

      // Service stats
      stats.byService[appointment.service] = (stats.byService[appointment.service] || 0) + 1

      // Totals
      stats.totalValue += appointment.price
      stats.totalDuration += appointment.duration
    })

    return stats
  }, [selectedCount, selectedAppointments])

  return {
    // State
    selectionState,
    selectedCount,
    selectedAppointments,
    canBulkMove,

    // Selection methods
    selectAppointment,
    deselectAppointment,
    toggleAppointment,
    selectRange,
    selectAll,
    selectNone,
    invertSelection,

    // Lasso selection
    startLassoSelection,
    updateLassoSelection,
    endLassoSelection,

    // Keyboard selection
    handleSelectionKeyboard,
    selectNext,
    selectPrevious,
    extendSelectionNext,
    extendSelectionPrevious,

    // Quick select filters
    applyQuickSelect,
    addQuickSelectFilter,
    removeQuickSelectFilter,

    // Bulk operations
    bulkMove,
    bulkReschedule,
    bulkDelete,
    bulkUpdateStatus,
    bulkApplyOperation,

    // Selection persistence
    saveSelection,
    loadSelection,
    getSavedSelections,

    // Undo/redo
    undoSelection,
    redoSelection,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < selectionState.selectionHistory.length - 1,

    // Visual feedback
    getSelectionBoxStyle,
    isAppointmentSelected,
    getSelectionClass,

    // Statistics
    getSelectionStats
  }
}

export default useMultiSelection
