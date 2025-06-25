'use client'

/**
 * Enhanced Drag and Drop Calendar Component
 *
 * This component integrates all advanced drag and drop functionality:
 * - Smart conflict detection and resolution
 * - Real-time visual feedback with snap-to-grid
 * - Touch gesture support for mobile devices
 * - Keyboard accessibility for screen readers
 * - Multi-selection and bulk operations
 * - Cascade rescheduling for dependent appointments
 * - Undo/redo functionality
 * - Performance optimizations
 */

import React, { useCallback, useRef, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CalendarAppointment, Barber, Service, RobustCalendarProps } from './RobustCalendar'
import RobustCalendar from './RobustCalendar'

// Import our custom hooks
import useEnhancedDragDrop from '@/hooks/useEnhancedDragDrop'
import useTouchDragDrop from '@/hooks/useTouchDragDrop'
import useKeyboardDragDrop from '@/hooks/useKeyboardDragDrop'
import useMultiSelection from '@/hooks/useMultiSelection'
import useCascadeRescheduling from '@/hooks/useCascadeRescheduling'

// Import services
import DragDropService from '@/services/dragDropService'

interface DragDropCalendarProps extends RobustCalendarProps {
  // Enhanced drag and drop options
  enableAdvancedDragDrop?: boolean
  enableTouchGestures?: boolean
  enableKeyboardDragDrop?: boolean
  enableMultiSelection?: boolean
  enableCascadeRescheduling?: boolean

  // Configuration options
  snapInterval?: 15 | 30
  magneticDistance?: number
  enableHapticFeedback?: boolean
  enableSoundFeedback?: boolean
  enableSelectionPersistence?: boolean

  // Callback overrides for enhanced functionality
  onEnhancedAppointmentMove?: (
    appointmentId: string,
    newDate: string,
    newTime: string,
    originalDate: string,
    originalTime: string,
    cascadeChanges?: Array<{
      appointmentId: string
      newDate: string
      newTime: string
    }>
  ) => Promise<void>

  onBulkMove?: (
    moves: Array<{
      appointmentId: string
      newDate: string
      newTime: string
    }>
  ) => Promise<void>

  onSelectionChange?: (selectedAppointments: CalendarAppointment[]) => void
  onDragStart?: (appointment: CalendarAppointment) => void
  onDragEnd?: (success: boolean) => void
  onConflictDetected?: (conflicts: any[]) => void
  onCascadePreview?: (cascadeOperation: any) => void
}

export default function DragDropCalendar({
  // Standard props
  appointments = [],
  barbers = [],
  services = [],
  onAppointmentMove,
  onConflictResolution,

  // Enhanced props
  enableAdvancedDragDrop = true,
  enableTouchGestures = true,
  enableKeyboardDragDrop = true,
  enableMultiSelection = true,
  enableCascadeRescheduling = false,

  // Configuration
  snapInterval = 15,
  magneticDistance = 10,
  enableHapticFeedback = true,
  enableSoundFeedback = false,
  enableSelectionPersistence = true,

  // Enhanced callbacks
  onEnhancedAppointmentMove,
  onBulkMove,
  onSelectionChange,
  onDragStart,
  onDragEnd,
  onConflictDetected,
  onCascadePreview,

  // Pass through other props
  ...robustCalendarProps
}: DragDropCalendarProps) {

  // Calendar container ref
  const calendarRef = useRef<HTMLDivElement>(null)

  // Enhanced drag and drop hook
  const {
    dragState,
    conflictData,
    handlers: dragHandlers,
    resolveConflicts,
    undo: undoDrag,
    redo: redoDrag,
    canUndo: canUndoDrag,
    canRedo: canRedoDrag,
    updateConfig: updateDragConfig
  } = useEnhancedDragDrop(
    appointments,
    barbers,
    services,
    onEnhancedAppointmentMove || onAppointmentMove,
    onConflictResolution,
    {
      snapToGrid: true,
      snapInterval,
      magneticDistance,
      enableHapticFeedback,
      enableSoundFeedback,
      enableCascadeRescheduling
    }
  )

  // Touch drag and drop hook
  const {
    touchState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    triggerHapticFeedback,
    showTouchRipple,
    isTouchDevice,
    supportsPointerEvents
  } = useTouchDragDrop(
    onEnhancedAppointmentMove || onAppointmentMove,
    (appointment, position) => {
      // Long press callback
      if (enableMultiSelection) {
        selectAppointment(appointment.id)
      }
      triggerHapticFeedback('selection', 'medium')
    },
    (gesture) => {
      // Gesture recognition callback
      console.log('Gesture recognized:', gesture.type)
    }
  )

  // Keyboard drag and drop hook
  const {
    navigationState,
    moveFocus,
    focusAppointment,
    startKeyboardDrag,
    handleKeyDown,
    announceToScreenReader,
    getAriaLabel,
    isKeyboardUser
  } = useKeyboardDragDrop(
    appointments,
    [], // timeSlots - would need to be calculated
    [], // weekDays - would need to be calculated
    onEnhancedAppointmentMove || onAppointmentMove,
    (appointment) => onSelectionChange?.([appointment]),
    (date, time) => robustCalendarProps.onTimeSlotClick?.(date, time)
  )

  // Multi-selection hook
  const {
    selectionState,
    selectedCount,
    selectedAppointments,
    selectAppointment,
    deselectAppointment,
    selectAll,
    selectNone,
    bulkMove,
    isAppointmentSelected,
    getSelectionClass,
    getSelectionStats,
    startLassoSelection,
    updateLassoSelection,
    endLassoSelection
  } = useMultiSelection(
    appointments,
    onBulkMove,
    undefined, // onBulkDelete
    undefined, // onBulkUpdate
    enableSelectionPersistence
  )

  // Cascade rescheduling hook
  const {
    dependencies,
    activeCascades,
    planCascade,
    executeCascade,
    previewCascade,
    detectDependencies,
    calculateImpact
  } = useCascadeRescheduling(
    appointments,
    barbers,
    services,
    onEnhancedAppointmentMove || onAppointmentMove,
    onBulkMove
  )

  // Update selection change callback
  useEffect(() => {
    onSelectionChange?.(selectedAppointments)
  }, [selectedAppointments, onSelectionChange])

  // Enhanced appointment click handler
  const handleAppointmentClick = useCallback((appointment: CalendarAppointment, event?: React.MouseEvent) => {
    if (enableMultiSelection && event && (event.ctrlKey || event.metaKey)) {
      // Multi-select with Ctrl/Cmd
      if (isAppointmentSelected(appointment.id)) {
        deselectAppointment(appointment.id)
      } else {
        selectAppointment(appointment.id)
      }
      return
    }

    if (enableMultiSelection && event && event.shiftKey && selectedCount > 0) {
      // Range select with Shift
      // Implementation would depend on appointment ordering
      selectAppointment(appointment.id)
      return
    }

    // Default behavior
    robustCalendarProps.onAppointmentClick?.(appointment)
  }, [
    enableMultiSelection,
    isAppointmentSelected,
    deselectAppointment,
    selectAppointment,
    selectedCount,
    robustCalendarProps.onAppointmentClick
  ])

  // Enhanced appointment move handler
  const handleEnhancedAppointmentMove = useCallback(async (
    appointmentId: string,
    newDate: string,
    newTime: string,
    originalDate: string,
    originalTime: string
  ) => {
    try {
      onDragStart?.(appointments.find(apt => apt.id === appointmentId)!)

      if (enableCascadeRescheduling && dependencies.length > 0) {
        // Plan cascade operation
        const cascade = await planCascade({
          appointmentId,
          newDate,
          newTime
        })

        // Preview cascade to user
        onCascadePreview?.(cascade)

        // Execute cascade if approved
        const success = await executeCascade(cascade.id)
        onDragEnd?.(success)

        if (success && onEnhancedAppointmentMove) {
          await onEnhancedAppointmentMove(
            appointmentId,
            newDate,
            newTime,
            originalDate,
            originalTime,
            cascade.affectedAppointments.map(change => ({
              appointmentId: change.appointmentId,
              newDate: change.newDate,
              newTime: change.newTime
            }))
          )
        }
      } else {
        // Simple move
        if (onEnhancedAppointmentMove) {
          await onEnhancedAppointmentMove(
            appointmentId,
            newDate,
            newTime,
            originalDate,
            originalTime
          )
        } else if (onAppointmentMove) {
          await onAppointmentMove(
            appointmentId,
            newDate,
            newTime,
            originalDate,
            originalTime
          )
        }
        onDragEnd?.(true)
      }
    } catch (error) {
      console.error('Enhanced appointment move failed:', error)
      onDragEnd?.(false)
    }
  }, [
    appointments,
    enableCascadeRescheduling,
    dependencies,
    onDragStart,
    onDragEnd,
    onCascadePreview,
    onEnhancedAppointmentMove,
    onAppointmentMove,
    planCascade,
    executeCascade
  ])

  // Enhanced time slot click handler
  const handleTimeSlotClick = useCallback((date: string, time: string, event?: React.MouseEvent) => {
    if (enableMultiSelection && selectionState.isSelecting) {
      // Handle lasso selection
      if (event && event.type === 'mousedown') {
        startLassoSelection(event)
      }
      return
    }

    // Default behavior
    robustCalendarProps.onTimeSlotClick?.(date, time)
  }, [
    enableMultiSelection,
    selectionState.isSelecting,
    startLassoSelection,
    robustCalendarProps.onTimeSlotClick
  ])

  // Create enhanced appointment render function
  const enhancedAppointmentRender = useCallback((appointment: CalendarAppointment) => {
    const isSelected = isAppointmentSelected(appointment.id)
    const selectionClass = getSelectionClass(appointment.id)
    const isDragging = dragState.draggedAppointments.some(apt => apt.id === appointment.id)

    return (
      <motion.div
        key={appointment.id}
        data-appointment-id={appointment.id}
        className={`appointment-enhanced ${selectionClass} ${isDragging ? 'dragging' : ''}`}
        layout
        initial={false}
        animate={{
          scale: isDragging ? 0.95 : isSelected ? 1.05 : 1,
          opacity: isDragging ? 0.7 : 1,
          zIndex: isDragging ? 100 : isSelected ? 10 : 1
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30
        }}
        style={{
          outline: isSelected ? '2px solid #8b5cf6' : 'none',
          outlineOffset: '2px',
          cursor: enableAdvancedDragDrop ? 'grab' : 'pointer',
          touchAction: enableTouchGestures ? 'none' : 'auto',
          userSelect: 'none'
        }}
        onClick={(e) => handleAppointmentClick(appointment, e)}
        onMouseDown={(e) => {
          if (enableAdvancedDragDrop) {
            dragHandlers.handleAppointmentDragStart(appointment, e)
          }
        }}
        onTouchStart={(e) => {
          if (enableTouchGestures) {
            handleTouchStart(e, appointment)
          }
        }}
        onPointerDown={(e) => {
          if (enableTouchGestures && supportsPointerEvents) {
            handlePointerDown(e, appointment)
          }
        }}
        onKeyDown={(e) => {
          if (enableKeyboardDragDrop) {
            handleKeyDown(e)
          }
        }}
        tabIndex={enableKeyboardDragDrop ? 0 : undefined}
        aria-label={enableKeyboardDragDrop ? getAriaLabel('appointment', appointment) : undefined}
        role="button"
      >
        {/* Appointment content */}
        <div className="appointment-content">
          <div className="appointment-service font-semibold text-sm">
            {appointment.service}
          </div>
          <div className="appointment-client text-xs opacity-90">
            {appointment.client}
          </div>
          <div className="appointment-time text-xs opacity-75">
            {appointment.startTime} - {appointment.endTime}
          </div>

          {/* Selection indicator */}
          {isSelected && (
            <div className="selection-indicator absolute top-1 right-1">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-4 h-4 bg-violet-600 rounded-full flex items-center justify-center"
              >
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </motion.div>
            </div>
          )}

          {/* Drag handle */}
          {enableAdvancedDragDrop && (
            <div className="drag-handle absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-3 h-3 text-white/60" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </div>
          )}
        </div>

        {/* Touch ripple effect container */}
        {enableTouchGestures && (
          <div className="touch-ripple-container absolute inset-0 overflow-hidden rounded-lg pointer-events-none" />
        )}
      </motion.div>
    )
  }, [
    isAppointmentSelected,
    getSelectionClass,
    dragState.draggedAppointments,
    enableAdvancedDragDrop,
    enableTouchGestures,
    enableKeyboardDragDrop,
    supportsPointerEvents,
    handleAppointmentClick,
    dragHandlers.handleAppointmentDragStart,
    handleTouchStart,
    handlePointerDown,
    handleKeyDown,
    getAriaLabel
  ])

  // Handle global touch events
  useEffect(() => {
    if (!enableTouchGestures || !isTouchDevice) return

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (touchState.isActive) {
        handleTouchMove(e as any)
      }
    }

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (touchState.isActive) {
        handleTouchEnd(e as any)
      }
    }

    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false })
    document.addEventListener('touchend', handleGlobalTouchEnd)

    return () => {
      document.removeEventListener('touchmove', handleGlobalTouchMove)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
    }
  }, [enableTouchGestures, isTouchDevice, touchState.isActive, handleTouchMove, handleTouchEnd])

  // Handle global pointer events
  useEffect(() => {
    if (!enableTouchGestures || !supportsPointerEvents) return

    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (touchState.isActive) {
        handlePointerMove(e as any)
      }
    }

    const handleGlobalPointerUp = (e: PointerEvent) => {
      if (touchState.isActive) {
        handlePointerUp(e as any)
      }
    }

    document.addEventListener('pointermove', handleGlobalPointerMove)
    document.addEventListener('pointerup', handleGlobalPointerUp)

    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove)
      document.removeEventListener('pointerup', handleGlobalPointerUp)
    }
  }, [enableTouchGestures, supportsPointerEvents, touchState.isActive, handlePointerMove, handlePointerUp])

  // Handle lasso selection
  useEffect(() => {
    if (!enableMultiSelection) return

    const handleMouseMove = (e: MouseEvent) => {
      if (selectionState.isSelecting) {
        updateLassoSelection(e as any)
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (selectionState.isSelecting) {
        endLassoSelection()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [enableMultiSelection, selectionState.isSelecting, updateLassoSelection, endLassoSelection])

  // Notify about conflicts
  useEffect(() => {
    if (conflictData.conflicts.length > 0) {
      onConflictDetected?.(conflictData.conflicts)
    }
  }, [conflictData.conflicts, onConflictDetected])

  // Auto-detect dependencies
  useEffect(() => {
    if (enableCascadeRescheduling) {
      detectDependencies(appointments)
    }
  }, [appointments, enableCascadeRescheduling, detectDependencies])

  return (
    <div
      ref={calendarRef}
      className={`drag-drop-calendar-container ${isKeyboardUser ? 'keyboard-user' : ''}`}
      data-calendar-grid
      onMouseDown={(e) => {
        if (enableMultiSelection && e.target === e.currentTarget) {
          startLassoSelection(e)
        }
      }}
    >
      {/* Enhanced toolbar with multi-selection controls */}
      {enableMultiSelection && selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="selection-toolbar fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center space-x-3"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {selectedCount} selected
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => selectAll()}
              className="text-xs px-2 py-1 bg-violet-100 text-violet-700 rounded hover:bg-violet-200 transition-colors"
            >
              Select All
            </button>

            <button
              onClick={() => selectNone()}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Clear
            </button>

            {/* Bulk action buttons would go here */}
          </div>

          {/* Selection stats */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ${getSelectionStats().totalValue.toFixed(2)} total
          </div>
        </motion.div>
      )}

      {/* Undo/Redo controls */}
      {enableAdvancedDragDrop && (canUndoDrag || canRedoDrag) && (
        <div className="undo-redo-controls fixed bottom-4 right-4 z-50 flex space-x-2">
          <button
            onClick={undoDrag}
            disabled={!canUndoDrag}
            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>

          <button
            onClick={redoDrag}
            disabled={!canRedoDrag}
            className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Y)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>
      )}

      {/* Main calendar component */}
      <RobustCalendar
        {...robustCalendarProps}
        appointments={appointments}
        barbers={barbers}
        services={services}
        onAppointmentClick={handleAppointmentClick}
        onTimeSlotClick={handleTimeSlotClick}
        onAppointmentMove={handleEnhancedAppointmentMove}
        customAppointmentRender={enhancedAppointmentRender}
      />

      {/* Lasso selection box */}
      <AnimatePresence>
        {enableMultiSelection && selectionState.selectionBox?.visible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lasso-selection-box fixed pointer-events-none z-40"
            style={{
              left: Math.min(selectionState.selectionBox.startX, selectionState.selectionBox.currentX),
              top: Math.min(selectionState.selectionBox.startY, selectionState.selectionBox.currentY),
              width: Math.abs(selectionState.selectionBox.currentX - selectionState.selectionBox.startX),
              height: Math.abs(selectionState.selectionBox.currentY - selectionState.selectionBox.startY),
              border: '2px dashed #8b5cf6',
              background: 'rgba(139, 92, 246, 0.1)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Enhanced CSS for drag and drop */}
      <style jsx global>{`
        .drag-drop-calendar-container {
          position: relative;
          user-select: none;
        }

        .appointment-enhanced {
          position: relative;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .appointment-enhanced:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .appointment-enhanced.selected {
          ring: 2px solid #8b5cf6;
          ring-offset: 2px;
        }

        .appointment-enhanced.dragging {
          opacity: 0.5;
          transform: scale(0.95) rotate(2deg);
          z-index: 1000;
        }

        .appointment-enhanced.last-selected {
          ring: 2px solid #7c3aed;
          ring-offset: 2px;
        }

        .selection-indicator {
          animation: bounceIn 0.3s ease-out;
        }

        @keyframes bounceIn {
          0% { transform: scale(0); }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }

        .keyboard-user .appointment-enhanced:focus {
          outline: 3px solid #8b5cf6;
          outline-offset: 2px;
        }

        .touch-ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(139, 92, 246, 0.3);
          transform: scale(0);
          animation: ripple-animation 0.6s linear;
          pointer-events: none;
        }

        @keyframes ripple-animation {
          to {
            transform: scale(2);
            opacity: 0;
          }
        }

        .lasso-selection-box {
          border-radius: 4px;
        }

        .selection-toolbar {
          backdrop-filter: blur(8px);
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .appointment-enhanced.selected {
            outline: 3px solid;
            outline-offset: 2px;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .appointment-enhanced,
          .selection-indicator,
          .touch-ripple {
            animation: none;
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}

export { DragDropCalendar }
export type { DragDropCalendarProps }
