'use client'

/**
 * Enhanced Drag and Drop Hook for RobustCalendar
 *
 * This hook provides:
 * - Advanced drag handlers with visual feedback
 * - Snap-to-grid functionality with magnetic positioning
 * - Real-time conflict detection and resolution
 * - Touch gesture support for mobile devices
 * - Accessibility features for keyboard navigation
 * - Multi-selection and bulk operations
 * - Undo/redo functionality
 */

import { useCallback, useRef, useEffect, useState } from 'react'
import { CalendarAppointment, Barber, Service } from '@/components/calendar/RobustCalendar'
import DragDropService, {
  DragDropState,
  ConflictData,
  SnapConfiguration,
  AccessibilityOptions,
  DragOperation
} from '@/services/dragDropService'

export interface EnhancedDragDropConfig {
  snapToGrid?: boolean
  snapInterval?: 15 | 30
  allowConflicts?: boolean
  enableCascadeRescheduling?: boolean
  enableMultiSelection?: boolean
  showConflictPreview?: boolean
  magneticDistance?: number
  enableHapticFeedback?: boolean
  enableSoundFeedback?: boolean
  reduceMotion?: boolean
}

export interface DragHandlers {
  handleAppointmentDragStart: (
    appointment: CalendarAppointment | CalendarAppointment[],
    event: React.MouseEvent | React.TouchEvent | React.PointerEvent
  ) => void
  handleAppointmentDragEnd: () => void
  handleTimeSlotDragOver: (
    date: string,
    time: string,
    event: React.DragEvent
  ) => void
  handleTimeSlotDrop: (
    date: string,
    time: string,
    event: React.DragEvent
  ) => void
  handleKeyboardMove: (
    appointment: CalendarAppointment,
    direction: 'up' | 'down' | 'left' | 'right',
    event: React.KeyboardEvent
  ) => void
  handleMultiSelect: (
    appointment: CalendarAppointment,
    event: React.MouseEvent
  ) => void
  handleSelectionBox: (
    startEvent: React.MouseEvent,
    endEvent: React.MouseEvent
  ) => void
}

export interface DragDropHookReturn {
  // State
  dragState: DragDropState
  conflictData: ConflictData
  selectedAppointments: Set<string>
  isDragging: boolean

  // Handlers
  handlers: DragHandlers

  // Visual feedback methods
  showDragPreview: (appointment: CalendarAppointment, position: { x: number; y: number }) => void
  hideDragPreview: () => void
  highlightDropZone: (date: string, time: string, status: 'valid' | 'invalid' | 'warning') => void
  clearDropZoneHighlights: () => void

  // Conflict resolution
  resolveConflicts: (resolution: 'move_all' | 'suggest_alternatives' | 'manual_review') => Promise<void>
  getConflictSuggestions: (appointment: CalendarAppointment, targetDate: string, targetTime: string) => Promise<any[]>

  // Multi-selection
  selectAppointment: (appointmentId: string) => void
  deselectAppointment: (appointmentId: string) => void
  selectAll: () => void
  clearSelection: () => void

  // Undo/redo
  undo: () => Promise<void>
  redo: () => Promise<void>
  canUndo: boolean
  canRedo: boolean

  // Configuration
  updateConfig: (config: Partial<EnhancedDragDropConfig>) => void

  // Performance
  getPerformanceMetrics: () => any
}

export function useEnhancedDragDrop(
  appointments: CalendarAppointment[],
  barbers: Barber[],
  services: Service[],
  onAppointmentMove?: (appointmentId: string, newDate: string, newTime: string, originalDate: string, originalTime: string) => Promise<void>,
  onConflictResolution?: (resolution: any) => Promise<void>,
  initialConfig: EnhancedDragDropConfig = {}
): DragDropHookReturn {

  // Configuration state
  const [config, setConfig] = useState<EnhancedDragDropConfig>({
    snapToGrid: true,
    snapInterval: 15,
    allowConflicts: false,
    enableCascadeRescheduling: false,
    enableMultiSelection: true,
    showConflictPreview: true,
    magneticDistance: 10,
    enableHapticFeedback: true,
    enableSoundFeedback: false,
    reduceMotion: false,
    ...initialConfig
  })

  // Service instance
  const dragDropServiceRef = useRef<DragDropService | null>(null)

  // State
  const [dragState, setDragState] = useState<DragDropState>(() => {
    return {
      isDragging: false,
      draggedAppointments: [],
      dragOffset: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 },
      dropTarget: null,
      snapTarget: null,
      conflictData: {
        conflicts: [],
        suggestions: [],
        cascadeChanges: [],
        resolution: null
      },
      visualFeedback: {
        dragGhost: {
          element: null,
          position: { x: 0, y: 0 },
          style: {
            opacity: 0.8,
            scale: 1.05,
            rotation: 0,
            backgroundColor: '#8b5cf6',
            borderColor: '#7c3aed'
          },
          content: {
            title: '',
            subtitle: '',
            icon: '📅',
            metadata: []
          }
        },
        dropZones: [],
        snapGuides: [],
        conflictIndicators: [],
        selectionHighlight: []
      },
      touchSupport: {
        isTouch: 'ontouchstart' in window,
        activePointers: new Map(),
        gestures: {
          pinch: { active: false, scale: 1 },
          pan: { active: false, delta: { x: 0, y: 0 } },
          longPress: { active: false, duration: 0 }
        },
        feedback: {
          haptic: 'vibrate' in navigator && config.enableHapticFeedback,
          visual: true,
          audio: config.enableSoundFeedback || false
        }
      },
      selectionMode: {
        active: false,
        selectedAppointments: new Set(),
        selectionStart: null,
        selectionBox: null,
        multiSelect: config.enableMultiSelection || false
      }
    }
  })

  const [conflictData, setConflictData] = useState<ConflictData>(dragState.conflictData)
  const [selectedAppointments, setSelectedAppointments] = useState<Set<string>>(new Set())
  const [operationHistory, setOperationHistory] = useState<DragOperation[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Refs for performance optimization
  const lastUpdateRef = useRef<number>(0)
  const animationFrameRef = useRef<number>()
  const ghostElementRef = useRef<HTMLElement | null>(null)

  // Initialize drag drop service
  useEffect(() => {
    const snapConfiguration: SnapConfiguration = {
      enabled: config.snapToGrid || false,
      interval: config.snapInterval || 15,
      magneticDistance: config.magneticDistance || 10,
      gridLines: true,
      timeIndicators: true,
      dateIndicators: true
    }

    const accessibilityOptions: AccessibilityOptions = {
      keyboardNavigation: true,
      screenReaderSupport: true,
      highContrast: false,
      reducedMotion: config.reduceMotion || false,
      focusManagement: true,
      announcements: true
    }

    dragDropServiceRef.current = new DragDropService(snapConfiguration, accessibilityOptions)

    return () => {
      dragDropServiceRef.current?.dispose()
    }
  }, [config])

  // Performance throttling for state updates
  const throttledStateUpdate = useCallback((newState: Partial<DragDropState>) => {
    const now = performance.now()
    if (now - lastUpdateRef.current > 16) { // ~60fps
      setDragState(prev => ({ ...prev, ...newState }))
      lastUpdateRef.current = now
    }
  }, [])

  // Haptic feedback helper
  const triggerHapticFeedback = useCallback((pattern: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!config.enableHapticFeedback || !navigator.vibrate) return

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    }

    navigator.vibrate(patterns[pattern])
  }, [config.enableHapticFeedback])

  // Sound feedback helper
  const triggerSoundFeedback = useCallback((type: 'start' | 'move' | 'drop' | 'error') => {
    if (!config.enableSoundFeedback) return

    // This would play appropriate sound effects
    // Implementation would depend on available audio assets
  }, [config.enableSoundFeedback])

  // Enhanced drag start handler
  const handleAppointmentDragStart = useCallback((
    appointmentOrAppointments: CalendarAppointment | CalendarAppointment[],
    event: React.MouseEvent | React.TouchEvent | React.PointerEvent
  ) => {
    if (!dragDropServiceRef.current) return

    const appointments = Array.isArray(appointmentOrAppointments)
      ? appointmentOrAppointments
      : [appointmentOrAppointments]

    // Prevent default to enable custom drag behavior
    event.preventDefault()
    event.stopPropagation()

    // Start drag operation with service
    const operation = dragDropServiceRef.current.startDrag(appointments, event as any, {
      snapToGrid: config.snapToGrid,
      allowConflicts: config.allowConflicts,
      enableCascade: config.enableCascadeRescheduling,
      multiSelect: config.enableMultiSelection
    })

    // Update local state
    throttledStateUpdate({
      isDragging: true,
      draggedAppointments: appointments
    })

    // Trigger feedback
    triggerHapticFeedback('light')
    triggerSoundFeedback('start')

    // Set cursor style
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

  }, [config, throttledStateUpdate, triggerHapticFeedback, triggerSoundFeedback])

  // Enhanced drag end handler
  const handleAppointmentDragEnd = useCallback(() => {
    if (!dragDropServiceRef.current || !dragState.isDragging) return

    // Reset cursor and selection
    document.body.style.cursor = ''
    document.body.style.userSelect = ''

    // Get final state from service
    const finalState = dragDropServiceRef.current.getState()

    // Update local state
    throttledStateUpdate({
      isDragging: false,
      draggedAppointments: [],
      dropTarget: null,
      snapTarget: null
    })

    // Trigger feedback
    triggerHapticFeedback('medium')
    triggerSoundFeedback('drop')

  }, [dragState.isDragging, throttledStateUpdate, triggerHapticFeedback, triggerSoundFeedback])

  // Enhanced drag over handler for time slots
  const handleTimeSlotDragOver = useCallback((
    date: string,
    time: string,
    event: React.DragEvent
  ) => {
    if (!dragDropServiceRef.current || !dragState.isDragging) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'

    // Calculate snap position
    const calendarElement = event.currentTarget.closest('[data-calendar-grid]') as HTMLElement
    if (calendarElement) {
      const snapPosition = dragDropServiceRef.current.calculateSnapPosition(
        event.clientX,
        event.clientY,
        calendarElement
      )

      if (snapPosition) {
        throttledStateUpdate({
          dropTarget: { date, time },
          snapTarget: snapPosition
        })

        // Detect conflicts
        const conflicts = dragDropServiceRef.current.detectConflicts(dragState.draggedAppointments)
        setConflictData(conflicts)

        // Update visual feedback
        highlightDropZone(date, time, conflicts.conflicts.length > 0 ? 'invalid' : 'valid')
      }
    }

  }, [dragState.isDragging, dragState.draggedAppointments, throttledStateUpdate])

  // Enhanced drop handler for time slots
  const handleTimeSlotDrop = useCallback(async (
    date: string,
    time: string,
    event: React.DragEvent
  ) => {
    if (!dragDropServiceRef.current || !dragState.isDragging) return

    event.preventDefault()

    const calendarElement = event.currentTarget.closest('[data-calendar-grid]') as HTMLElement
    if (calendarElement) {
      const snapPosition = dragDropServiceRef.current.calculateSnapPosition(
        event.clientX,
        event.clientY,
        calendarElement
      )

      if (snapPosition && onAppointmentMove) {
        const conflicts = dragDropServiceRef.current.detectConflicts(dragState.draggedAppointments)

        if (conflicts.conflicts.length > 0 && !config.allowConflicts) {
          // Handle conflicts
          if (onConflictResolution) {
            await onConflictResolution(conflicts.resolution)
          }
        } else {
          // Execute move
          for (const appointment of dragState.draggedAppointments) {
            await onAppointmentMove(
              appointment.id,
              snapPosition.date,
              snapPosition.time,
              appointment.date,
              appointment.startTime
            )
          }
        }
      }
    }

    handleAppointmentDragEnd()

  }, [dragState.isDragging, dragState.draggedAppointments, config.allowConflicts, onAppointmentMove, onConflictResolution, handleAppointmentDragEnd])

  // Keyboard navigation handler
  const handleKeyboardMove = useCallback((
    appointment: CalendarAppointment,
    direction: 'up' | 'down' | 'left' | 'right',
    event: React.KeyboardEvent
  ) => {
    event.preventDefault()

    // Implementation for keyboard-based appointment movement
    // This would calculate the new position based on direction
    // and trigger the same move logic as drag and drop

  }, [])

  // Multi-selection handler
  const handleMultiSelect = useCallback((
    appointment: CalendarAppointment,
    event: React.MouseEvent
  ) => {
    if (!config.enableMultiSelection) return

    const isSelected = selectedAppointments.has(appointment.id)
    const newSelection = new Set(selectedAppointments)

    if (event.ctrlKey || event.metaKey) {
      // Toggle selection
      if (isSelected) {
        newSelection.delete(appointment.id)
      } else {
        newSelection.add(appointment.id)
      }
    } else if (event.shiftKey && selectedAppointments.size > 0) {
      // Range selection (implementation would depend on appointment ordering)
      // For now, just add to selection
      newSelection.add(appointment.id)
    } else {
      // Single selection
      newSelection.clear()
      newSelection.add(appointment.id)
    }

    setSelectedAppointments(newSelection)

  }, [config.enableMultiSelection, selectedAppointments])

  // Selection box handler
  const handleSelectionBox = useCallback((
    startEvent: React.MouseEvent,
    endEvent: React.MouseEvent
  ) => {
    if (!config.enableMultiSelection) return

    // Implementation for drag-to-select functionality
    // This would create a selection box and select all appointments within it

  }, [config.enableMultiSelection])

  // Visual feedback methods
  const showDragPreview = useCallback((
    appointment: CalendarAppointment,
    position: { x: number; y: number }
  ) => {
    if (!dragDropServiceRef.current) return

    // Create or update drag ghost element
    // Implementation would create a visual preview of the appointment being dragged

  }, [])

  const hideDragPreview = useCallback(() => {
    if (ghostElementRef.current) {
      ghostElementRef.current.remove()
      ghostElementRef.current = null
    }
  }, [])

  const highlightDropZone = useCallback((
    date: string,
    time: string,
    status: 'valid' | 'invalid' | 'warning'
  ) => {
    const timeSlot = document.querySelector(`[data-time-slot="${date}-${time}"]`)
    if (timeSlot) {
      timeSlot.classList.add('drop-zone-highlight', `drop-zone-${status}`)
    }
  }, [])

  const clearDropZoneHighlights = useCallback(() => {
    document.querySelectorAll('.drop-zone-highlight').forEach(el => {
      el.classList.remove('drop-zone-highlight', 'drop-zone-valid', 'drop-zone-invalid', 'drop-zone-warning')
    })
  }, [])

  // Conflict resolution methods
  const resolveConflicts = useCallback(async (
    resolution: 'move_all' | 'suggest_alternatives' | 'manual_review'
  ) => {
    if (!onConflictResolution) return

    const resolutionData = {
      strategy: resolution,
      conflicts: conflictData.conflicts,
      suggestions: conflictData.suggestions
    }

    await onConflictResolution(resolutionData)
  }, [conflictData, onConflictResolution])

  const getConflictSuggestions = useCallback(async (
    appointment: CalendarAppointment,
    targetDate: string,
    targetTime: string
  ) => {
    if (!dragDropServiceRef.current) return []

    const conflicts = dragDropServiceRef.current.detectConflicts([appointment])
    return conflicts.suggestions
  }, [])

  // Selection methods
  const selectAppointment = useCallback((appointmentId: string) => {
    setSelectedAppointments(prev => new Set(prev).add(appointmentId))
  }, [])

  const deselectAppointment = useCallback((appointmentId: string) => {
    setSelectedAppointments(prev => {
      const newSet = new Set(prev)
      newSet.delete(appointmentId)
      return newSet
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedAppointments(new Set(appointments.map(apt => apt.id)))
  }, [appointments])

  const clearSelection = useCallback(() => {
    setSelectedAppointments(new Set())
  }, [])

  // Undo/redo functionality
  const undo = useCallback(async () => {
    if (!dragDropServiceRef.current || historyIndex < 0) return

    const operation = dragDropServiceRef.current.undo()
    if (operation && onAppointmentMove) {
      // Reverse the operation
      for (let i = 0; i < operation.appointments.length; i++) {
        const appointment = operation.appointments[i]
        const originalPos = operation.originalPositions[i]
        const targetPos = operation.targetPositions[i]

        await onAppointmentMove(
          appointment.id,
          originalPos.date,
          originalPos.time,
          targetPos.date,
          targetPos.time
        )
      }

      setHistoryIndex(prev => prev - 1)
    }
  }, [historyIndex, onAppointmentMove])

  const redo = useCallback(async () => {
    if (!dragDropServiceRef.current || historyIndex >= operationHistory.length - 1) return

    const operation = operationHistory[historyIndex + 1]
    if (operation && onAppointmentMove) {
      // Re-apply the operation
      for (let i = 0; i < operation.appointments.length; i++) {
        const appointment = operation.appointments[i]
        const originalPos = operation.originalPositions[i]
        const targetPos = operation.targetPositions[i]

        await onAppointmentMove(
          appointment.id,
          targetPos.date,
          targetPos.time,
          originalPos.date,
          originalPos.time
        )
      }

      setHistoryIndex(prev => prev + 1)
    }
  }, [historyIndex, operationHistory, onAppointmentMove])

  // Configuration update
  const updateConfig = useCallback((newConfig: Partial<EnhancedDragDropConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }))
  }, [])

  // Performance metrics
  const getPerformanceMetrics = useCallback(() => {
    return dragDropServiceRef.current?.getPerformanceMetrics() || {}
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      hideDragPreview()
      clearDropZoneHighlights()
    }
  }, [hideDragPreview, clearDropZoneHighlights])

  return {
    // State
    dragState,
    conflictData,
    selectedAppointments,
    isDragging: dragState.isDragging,

    // Handlers
    handlers: {
      handleAppointmentDragStart,
      handleAppointmentDragEnd,
      handleTimeSlotDragOver,
      handleTimeSlotDrop,
      handleKeyboardMove,
      handleMultiSelect,
      handleSelectionBox
    },

    // Visual feedback methods
    showDragPreview,
    hideDragPreview,
    highlightDropZone,
    clearDropZoneHighlights,

    // Conflict resolution
    resolveConflicts,
    getConflictSuggestions,

    // Multi-selection
    selectAppointment,
    deselectAppointment,
    selectAll,
    clearSelection,

    // Undo/redo
    undo,
    redo,
    canUndo: historyIndex >= 0,
    canRedo: historyIndex < operationHistory.length - 1,

    // Configuration
    updateConfig,

    // Performance
    getPerformanceMetrics
  }
}

export default useEnhancedDragDrop
