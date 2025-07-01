'use client'

/**
 * Calendar Visual Feedback System
 * Provides enhanced visual cues for drag-and-drop, hover states, and user interactions
 */

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { 
  Appointment, 
  VisualState, 
  DragState, 
  CALENDAR_CONSTANTS 
} from '@/types/calendar'
import { 
  CheckIcon, 
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface CalendarVisualFeedbackProps {
  visualState: VisualState
  dragState: DragState
  isHighContrast?: boolean
  enableAnimations?: boolean
}

interface GhostElementProps {
  appointment: Appointment
  position: { x: number; y: number }
  isDragging: boolean
}

interface DropZoneIndicatorProps {
  target: VisualState['dragOverTarget']
  isValid: boolean
  position?: { x: number; y: number; width: number; height: number }
}

interface HoverTooltipProps {
  appointment: Appointment | null
  date: Date | null
  position: { x: number; y: number }
  visible: boolean
}

// Ghost element that follows the cursor during drag
const DragGhost: React.FC<GhostElementProps> = ({ 
  appointment, 
  position, 
  isDragging 
}) => {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted || !isDragging) return null
  
  const ghostElement = (
    <div
      className="fixed pointer-events-none z-50 transform -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150"
      style={{
        left: position.x,
        top: position.y,
        zIndex: CALENDAR_CONSTANTS.Z_INDEX.DRAG_GHOST
      }}
    >
      <div className="bg-white dark:bg-gray-800 border-2 border-primary-500 rounded-lg shadow-2xl p-3 max-w-xs opacity-90 animate-pulse">
        <div className="flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4 text-primary-500 animate-spin" />
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            Moving appointment...
          </div>
        </div>
        
        <div className="mt-2 space-y-1">
          <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {appointment.client_name || 'Client'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {appointment.service_name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
            <ClockIcon className="w-3 h-3" />
            {format(new Date(appointment.start_time), 'h:mm a')}
            {appointment.duration_minutes && ` (${appointment.duration_minutes}m)`}
          </div>
        </div>
        
        {/* Drop hint */}
        <div className="mt-2 text-xs text-primary-600 dark:text-primary-400 font-medium">
          📍 Drop on a time slot to reschedule
        </div>
      </div>
    </div>
  )
  
  return typeof window !== 'undefined' 
    ? createPortal(ghostElement, document.body)
    : null
}

// Drop zone indicator with clear visual feedback
const DropZoneIndicator: React.FC<DropZoneIndicatorProps> = ({ 
  target, 
  isValid, 
  position 
}) => {
  if (!target || !position) return null
  
  return (
    <div
      className={`absolute pointer-events-none transition-all duration-200 rounded-lg border-2 ${
        isValid 
          ? 'border-green-500 bg-green-100 dark:bg-green-900/30' 
          : 'border-red-500 bg-red-100 dark:bg-red-900/30'
      }`}
      style={{
        left: position.x,
        top: position.y,
        width: position.width,
        height: position.height,
        zIndex: CALENDAR_CONSTANTS.Z_INDEX.HOVER
      }}
    >
      {/* Drop indicator icon */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        {isValid ? (
          <div className="flex items-center gap-1 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
            <CheckIcon className="w-3 h-3" />
            Drop here
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
            <ExclamationTriangleIcon className="w-3 h-3" />
            Invalid
          </div>
        )}
      </div>
      
      {/* Animated border effect */}
      <div className={`absolute inset-0 rounded-lg border-2 ${
        isValid ? 'border-green-400' : 'border-red-400'
      } animate-pulse opacity-60`} />
    </div>
  )
}

// Enhanced hover tooltip
const HoverTooltip: React.FC<HoverTooltipProps> = ({ 
  appointment, 
  date, 
  position, 
  visible 
}) => {
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted || !visible || (!appointment && !date)) return null
  
  const tooltipElement = (
    <div
      className="fixed pointer-events-none z-40 transform -translate-x-1/2 transition-all duration-200"
      style={{
        left: position.x,
        top: position.y - 10,
        zIndex: CALENDAR_CONSTANTS.Z_INDEX.TOOLTIP
      }}
    >
      <div className="bg-gray-900 dark:bg-gray-700 text-white p-3 rounded-lg shadow-xl max-w-xs">
        {appointment ? (
          // Appointment tooltip
          <div className="space-y-2">
            <div className="font-semibold text-sm">
              {appointment.client_name || 'Client'}
            </div>
            <div className="text-xs opacity-90">
              {appointment.service_name}
            </div>
            <div className="text-xs opacity-75 flex items-center gap-1">
              <ClockIcon className="w-3 h-3" />
              {format(new Date(appointment.start_time), 'EEEE, MMMM d')}
              <br />
              {format(new Date(appointment.start_time), 'h:mm a')}
              {appointment.duration_minutes && ` (${appointment.duration_minutes}m)`}
            </div>
            {appointment.barber_name && (
              <div className="text-xs opacity-75">
                with {appointment.barber_name}
              </div>
            )}
            <div className="text-xs mt-2 capitalize opacity-90 flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${
                CALENDAR_CONSTANTS.STATUS_COLORS[appointment.status]?.includes('green') ? 'bg-green-400' :
                CALENDAR_CONSTANTS.STATUS_COLORS[appointment.status]?.includes('yellow') ? 'bg-yellow-400' :
                CALENDAR_CONSTANTS.STATUS_COLORS[appointment.status]?.includes('blue') ? 'bg-blue-400' :
                CALENDAR_CONSTANTS.STATUS_COLORS[appointment.status]?.includes('red') ? 'bg-red-400' :
                'bg-gray-400'
              }`} />
              {appointment.status}
            </div>
          </div>
        ) : date ? (
          // Date tooltip
          <div className="space-y-1">
            <div className="font-semibold text-sm">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </div>
            <div className="text-xs opacity-75">
              Click to select • Double-click to create appointment
            </div>
          </div>
        ) : null}
        
        {/* Tooltip arrow */}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2">
          <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
        </div>
      </div>
    </div>
  )
  
  return typeof window !== 'undefined' 
    ? createPortal(tooltipElement, document.body)
    : null
}

// Selection indicator for multi-select mode
const SelectionIndicator: React.FC<{ 
  selectedCount: number 
  isVisible: boolean 
}> = ({ selectedCount, isVisible }) => {
  if (!isVisible || selectedCount === 0) return null
  
  return (
    <div className="fixed top-4 right-4 z-50 bg-primary-500 text-white px-4 py-2 rounded-lg shadow-lg animate-slide-down">
      <div className="flex items-center gap-2">
        <CheckIcon className="w-4 h-4" />
        <span className="text-sm font-medium">
          {selectedCount} appointment{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>
    </div>
  )
}

// Accessibility announcements for screen readers
const AccessibilityAnnouncer: React.FC<{ 
  announcements: string[]
  priority: 'polite' | 'assertive'
}> = ({ announcements, priority }) => {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    >
      {announcements.map((announcement, index) => (
        <div key={index}>{announcement}</div>
      ))}
    </div>
  )
}

// Main visual feedback component
export const CalendarVisualFeedback: React.FC<CalendarVisualFeedbackProps> = ({
  visualState,
  dragState,
  isHighContrast = false,
  enableAnimations = true
}) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [dropZonePosition, setDropZonePosition] = useState<{ 
    x: number; y: number; width: number; height: number 
  } | null>(null)
  
  const tooltipTimerRef = useRef<NodeJS.Timeout>()
  
  // Track mouse position for ghost element
  useEffect(() => {
    if (!dragState.isDragging) return
    
    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY })
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [dragState.isDragging])
  
  // Handle tooltip visibility with delay
  useEffect(() => {
    if (tooltipTimerRef.current) {
      clearTimeout(tooltipTimerRef.current)
    }
    
    if (visualState.hoveredAppointment || visualState.hoveredDate) {
      tooltipTimerRef.current = setTimeout(() => {
        setTooltipVisible(true)
      }, CALENDAR_CONSTANTS.HOVER_DELAY)
    } else {
      setTooltipVisible(false)
    }
    
    return () => {
      if (tooltipTimerRef.current) {
        clearTimeout(tooltipTimerRef.current)
      }
    }
  }, [visualState.hoveredAppointment, visualState.hoveredDate])
  
  // Calculate drop zone position
  useEffect(() => {
    if (!visualState.dragOverTarget) {
      setDropZonePosition(null)
      return
    }
    
    // This would need to be calculated based on the actual DOM element
    // For now, we'll use placeholder values
    setDropZonePosition({
      x: 0,
      y: 0,
      width: 100,
      height: 40
    })
  }, [visualState.dragOverTarget])
  
  return (
    <>
      {/* Drag ghost element */}
      {dragState.isDragging && dragState.draggedAppointment && (
        <DragGhost
          appointment={dragState.draggedAppointment}
          position={mousePosition}
          isDragging={dragState.isDragging}
        />
      )}
      
      {/* Drop zone indicator */}
      {dragState.isDragging && visualState.dragOverTarget && dropZonePosition && (
        <DropZoneIndicator
          target={visualState.dragOverTarget}
          isValid={true} // This would be calculated based on business rules
          position={dropZonePosition}
        />
      )}
      
      {/* Hover tooltip */}
      <HoverTooltip
        appointment={visualState.hoveredAppointment}
        date={visualState.hoveredDate}
        position={mousePosition}
        visible={tooltipVisible}
      />
      
      {/* Selection indicator */}
      <SelectionIndicator
        selectedCount={visualState.selectedAppointments.size}
        isVisible={visualState.isSelectionMode}
      />
      
      {/* High contrast indicators */}
      {isHighContrast && (
        <style jsx global>{`
          .calendar-drop-zone {
            border-width: 3px !important;
            border-style: dashed !important;
          }
          
          .calendar-selected {
            outline: 3px solid #000 !important;
            outline-offset: 2px !important;
          }
          
          .calendar-dragging {
            filter: contrast(1.5) brightness(1.2) !important;
          }
        `}</style>
      )}
      
      {/* CSS for animations */}
      {enableAnimations && (
        <style jsx global>{`
          @keyframes slide-down {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes pulse-border {
            0%, 100% {
              border-color: rgba(59, 130, 246, 0.5);
            }
            50% {
              border-color: rgba(59, 130, 246, 1);
            }
          }
          
          @keyframes drag-shimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }
          
          .animate-slide-down {
            animation: slide-down 0.3s ease-out;
          }
          
          .animate-pulse-border {
            animation: pulse-border 2s infinite;
          }
          
          .animate-drag-shimmer {
            background: linear-gradient(
              90deg,
              transparent 25%,
              rgba(255, 255, 255, 0.2) 50%,
              transparent 75%
            );
            background-size: 200% 100%;
            animation: drag-shimmer 1.5s infinite;
          }
          
          .calendar-appointment:hover {
            transform: scale(1.02);
            transition: transform 0.15s ease-out;
          }
          
          .calendar-date-cell:hover {
            background-color: rgba(59, 130, 246, 0.05);
            transition: background-color 0.15s ease-out;
          }
          
          .calendar-time-slot:hover::before {
            content: "+ Add appointment";
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(59, 130, 246, 0.9);
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 500;
            opacity: 0;
            animation: fade-in 0.2s forwards;
          }
          
          @keyframes fade-in {
            to {
              opacity: 1;
            }
          }
        `}</style>
      )}
    </>
  )
}

// Hook for managing visual feedback state
export function useCalendarVisualFeedback() {
  const [visualState, setVisualState] = useState<VisualState>({
    hoveredDate: null,
    hoveredAppointment: null,
    selectedAppointments: new Set(),
    highlightedTimeSlots: [],
    isSelectionMode: false,
    dragOverTarget: null
  })
  
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedAppointment: null,
    startPosition: null,
    currentPosition: null,
    dropTarget: null
  })
  
  const updateVisualState = useCallback((updates: Partial<VisualState>) => {
    setVisualState(prev => ({ ...prev, ...updates }))
  }, [])
  
  const updateDragState = useCallback((updates: Partial<DragState>) => {
    setDragState(prev => ({ ...prev, ...updates }))
  }, [])
  
  return {
    visualState,
    dragState,
    updateVisualState,
    updateDragState,
    clearAllStates: () => {
      setVisualState({
        hoveredDate: null,
        hoveredAppointment: null,
        selectedAppointments: new Set(),
        highlightedTimeSlots: [],
        isSelectionMode: false,
        dragOverTarget: null
      })
      setDragState({
        isDragging: false,
        draggedAppointment: null,
        startPosition: null,
        currentPosition: null,
        dropTarget: null
      })
    }
  }
}