'use client'

/**
 * Premium Calendar Drag Preview Component
 * Provides enhanced floating drag preview with smooth cursor following,
 * service theming, and premium visual effects
 */

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { format } from 'date-fns'
import { 
  ClockIcon, 
  UserIcon, 
  CheckIcon, 
  ExclamationTriangleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'
import { 
  Appointment, 
  DragState, 
  CALENDAR_CONSTANTS 
} from '@/types/calendar'
import { 
  SERVICE_TYPES,
  SERVICE_STYLES,
  getServiceConfig,
  getBarberSymbol,
  getServiceIcon,
  getServiceGradient,
  getThemeClasses,
  PREMIUM_EFFECTS,
  Z_LAYERS,
  PERFORMANCE,
  ServiceType
} from '@/lib/calendar-constants'

interface CalendarDragPreviewProps {
  dragState: DragState
  isDropZoneValid?: boolean
  dropZoneHint?: string
  isDarkMode?: boolean
  showMagneticHints?: boolean
  enableRotation?: boolean
  enableGlow?: boolean
  performance?: 'high' | 'medium' | 'low'
}

interface DragPreviewState {
  position: { x: number; y: number }
  opacity: number
  scale: number
  rotation: number
  isVisible: boolean
  nearEdge: boolean
  magneticZone: boolean
}

interface MousePosition {
  x: number
  y: number
  deltaX: number
  deltaY: number
  velocity: number
}

// Premium drag preview with enhanced visual effects
const PremiumDragPreview: React.FC<CalendarDragPreviewProps> = ({
  dragState,
  isDropZoneValid = false,
  dropZoneHint = 'Drop to reschedule',
  isDarkMode = false,
  showMagneticHints = true,
  enableRotation = true,
  enableGlow = true,
  performance = 'high'
}) => {
  const [mounted, setMounted] = useState(false)
  const [dragPreviewState, setDragPreviewState] = useState<DragPreviewState>({
    position: { x: 0, y: 0 },
    opacity: 0,
    scale: 1,
    rotation: 0,
    isVisible: false,
    nearEdge: false,
    magneticZone: false
  })
  
  const [mouseState, setMouseState] = useState<MousePosition>({
    x: 0,
    y: 0,
    deltaX: 0,
    deltaY: 0,
    velocity: 0
  })
  
  const lastMousePosition = useRef({ x: 0, y: 0 })
  const lastUpdateTime = useRef(Date.now())
  const animationFrameRef = useRef<number>()
  const velocityHistory = useRef<number[]>([])
  
  // Mount check
  useEffect(() => {
    setMounted(true)
  }, [])
  
  // Mouse tracking with performance optimization
  const updateMousePosition = useCallback((clientX: number, clientY: number) => {
    const now = Date.now()
    const deltaTime = now - lastUpdateTime.current
    
    if (deltaTime < 16 && performance === 'high') return // 60fps limit
    if (deltaTime < 33 && performance === 'medium') return // 30fps limit
    if (deltaTime < 66 && performance === 'low') return // 15fps limit
    
    const deltaX = clientX - lastMousePosition.current.x
    const deltaY = clientY - lastMousePosition.current.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const velocity = distance / (deltaTime || 1)
    
    // Update velocity history for smooth calculations
    velocityHistory.current.push(velocity)
    if (velocityHistory.current.length > 5) {
      velocityHistory.current.shift()
    }
    
    const avgVelocity = velocityHistory.current.reduce((a, b) => a + b, 0) / velocityHistory.current.length
    
    setMouseState({
      x: clientX,
      y: clientY,
      deltaX,
      deltaY,
      velocity: avgVelocity
    })
    
    lastMousePosition.current = { x: clientX, y: clientY }
    lastUpdateTime.current = now
  }, [performance])
  
  // Smooth position updates with easing
  const updateDragPreview = useCallback(() => {
    if (!dragState.isDragging) return
    
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight
    const offset = 20
    
    // Calculate target position with offset
    const targetX = Math.min(Math.max(mouseState.x + offset, 50), screenWidth - 300)
    const targetY = Math.min(Math.max(mouseState.y - offset, 50), screenHeight - 150)
    
    // Smooth easing towards target
    const easeSpeed = performance === 'high' ? 0.15 : 0.1
    const currentX = dragPreviewState.position.x
    const currentY = dragPreviewState.position.y
    
    const newX = currentX + (targetX - currentX) * easeSpeed
    const newY = currentY + (targetY - currentY) * easeSpeed
    
    // Calculate rotation based on velocity and direction
    let rotation = 0
    if (enableRotation && mouseState.velocity > 0.5) {
      const angle = Math.atan2(mouseState.deltaY, mouseState.deltaX)
      rotation = Math.sin(angle) * Math.min(mouseState.velocity * 2, 8)
    }
    
    // Check for edge proximity
    const nearEdge = targetX < 100 || targetX > screenWidth - 100 || 
                    targetY < 100 || targetY > screenHeight - 100
    
    // Magnetic zone detection (placeholder - would be enhanced with actual drop zones)
    const magneticZone = showMagneticHints && isDropZoneValid
    
    setDragPreviewState(prev => ({
      ...prev,
      position: { x: newX, y: newY },
      rotation,
      nearEdge,
      magneticZone,
      isVisible: true,
      opacity: 1,
      scale: magneticZone ? 1.05 : 1
    }))
    
    animationFrameRef.current = requestAnimationFrame(updateDragPreview)
  }, [
    dragState.isDragging,
    mouseState,
    dragPreviewState.position,
    enableRotation,
    showMagneticHints,
    isDropZoneValid,
    performance
  ])
  
  // Mouse move handler
  useEffect(() => {
    if (!dragState.isDragging) return
    
    const handleMouseMove = (event: MouseEvent) => {
      updateMousePosition(event.clientX, event.clientY)
    }
    
    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [dragState.isDragging, updateMousePosition])
  
  // Start/stop animation loop
  useEffect(() => {
    if (dragState.isDragging) {
      setDragPreviewState(prev => ({ ...prev, isVisible: true, opacity: 1 }))
      updateDragPreview()
    } else {
      setDragPreviewState(prev => ({ ...prev, isVisible: false, opacity: 0 }))
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [dragState.isDragging, updateDragPreview])
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])
  
  if (!mounted || !dragState.isDragging || !dragState.draggedAppointment || !dragPreviewState.isVisible) {
    return null
  }
  
  const appointment = dragState.draggedAppointment
  const serviceType = (appointment.service_name?.toLowerCase() || 'haircut') as ServiceType
  const serviceConfig = getServiceConfig(serviceType in SERVICE_TYPES ? serviceType : SERVICE_TYPES.HAIRCUT)
  const barberSymbol = getBarberSymbol(appointment.barber_id || appointment.barber_name || 'default')
  const themeClasses = getThemeClasses(isDarkMode)
  
  // Create drag preview element
  const dragPreviewElement = (
    <div
      className="fixed pointer-events-none select-none"
      style={{
        left: dragPreviewState.position.x,
        top: dragPreviewState.position.y,
        zIndex: Z_LAYERS.overlay,
        opacity: dragPreviewState.opacity,
        transform: `
          translate(-50%, -50%) 
          scale(${dragPreviewState.scale}) 
          rotate(${dragPreviewState.rotation}deg)
        `,
        transition: performance === 'high' ? 'none' : 'all 0.1s ease-out',
        willChange: 'transform, opacity'
      }}
    >
      {/* Main drag preview card */}
      <div className={`
        relative max-w-sm min-w-64 
        ${themeClasses.glass}
        ${enableGlow ? PREMIUM_EFFECTS.shadows.glow : PREMIUM_EFFECTS.shadows.floating}
        rounded-xl p-4 
        border-2 transition-all duration-200
        ${dragPreviewState.magneticZone ? 'border-green-400' : 'border-gray-300'}
      `}>
        {/* Service gradient background */}
        <div className={`
          absolute inset-0 rounded-xl opacity-10
          ${getServiceGradient(serviceType in SERVICE_TYPES ? serviceType : SERVICE_TYPES.HAIRCUT, isDarkMode)}
        `} />
        
        {/* Content */}
        <div className="relative z-10">
          {/* Header with service info */}
          <div className="flex items-start gap-3 mb-3">
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center text-lg
              ${serviceConfig.gradient.from} ${serviceConfig.gradient.to}
              bg-gradient-to-r shadow-lg
            `}>
              {getServiceIcon(serviceType in SERVICE_TYPES ? serviceType : SERVICE_TYPES.HAIRCUT)}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className={`font-semibold text-sm ${themeClasses.text} truncate`}>
                {appointment.client_name || 'Client'}
              </div>
              <div className={`text-xs ${themeClasses.textMuted} truncate`}>
                {appointment.service_name}
              </div>
            </div>
            
            {/* Barber symbol */}
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm
              ${themeClasses.background} ${themeClasses.border} border
            `}>
              {barberSymbol}
            </div>
          </div>
          
          {/* Appointment details */}
          <div className="space-y-2">
            <div className={`flex items-center gap-2 text-xs ${themeClasses.textMuted}`}>
              <ClockIcon className="w-3 h-3" />
              <span>
                {format(new Date(appointment.start_time), 'h:mm a')}
                {appointment.duration_minutes && ` (${appointment.duration_minutes}m)`}
              </span>
            </div>
            
            {appointment.barber_name && (
              <div className={`flex items-center gap-2 text-xs ${themeClasses.textMuted}`}>
                <UserIcon className="w-3 h-3" />
                <span>{appointment.barber_name}</span>
              </div>
            )}
          </div>
          
          {/* Drop zone indicator */}
          <div className={`
            mt-3 p-2 rounded-lg border border-dashed transition-all duration-200
            ${dragPreviewState.magneticZone 
              ? 'border-green-400 bg-green-50 dark:bg-green-900/20' 
              : 'border-gray-300 dark:border-gray-600'
            }
          `}>
            <div className="flex items-center gap-2">
              {dragPreviewState.magneticZone ? (
                <CheckIcon className="w-4 h-4 text-green-600" />
              ) : isDropZoneValid ? (
                <MagnifyingGlassIcon className="w-4 h-4 text-blue-600" />
              ) : (
                <ExclamationTriangleIcon className="w-4 h-4 text-orange-600" />
              )}
              
              <span className={`
                text-xs font-medium
                ${dragPreviewState.magneticZone 
                  ? 'text-green-700 dark:text-green-300' 
                  : isDropZoneValid 
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-orange-700 dark:text-orange-300'
                }
              `}>
                {dragPreviewState.magneticZone 
                  ? 'Drop here to reschedule' 
                  : dropZoneHint
                }
              </span>
            </div>
          </div>
        </div>
        
        {/* Magnetic zone glow effect */}
        {dragPreviewState.magneticZone && enableGlow && (
          <div className="absolute inset-0 rounded-xl bg-green-400/10 animate-pulse" />
        )}
        
        {/* Edge warning indicator */}
        {dragPreviewState.nearEdge && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />
        )}
      </div>
      
      {/* Velocity trail effect for high performance mode */}
      {performance === 'high' && mouseState.velocity > 2 && (
        <div 
          className="absolute inset-0 rounded-xl opacity-20"
          style={{
            background: `linear-gradient(${
              Math.atan2(mouseState.deltaY, mouseState.deltaX) * 180 / Math.PI + 90
            }deg, transparent, ${serviceConfig.color})`,
            transform: `scale(${1 + mouseState.velocity * 0.1})`,
            filter: 'blur(2px)'
          }}
        />
      )}
    </div>
  )
  
  return typeof window !== 'undefined' 
    ? createPortal(dragPreviewElement, document.body)
    : null
}

// Screen reader announcements for accessibility
const DragAccessibilityAnnouncer: React.FC<{
  dragState: DragState
  isDropZoneValid?: boolean
}> = ({ dragState, isDropZoneValid }) => {
  const [announcement, setAnnouncement] = useState<string>('')
  
  useEffect(() => {
    if (dragState.isDragging && dragState.draggedAppointment) {
      const appointment = dragState.draggedAppointment
      const message = `Moving appointment for ${appointment.client_name || 'client'}, ${appointment.service_name}. ${
        isDropZoneValid ? 'Valid drop zone available.' : 'Find a valid time slot to drop.'
      }`
      setAnnouncement(message)
    } else {
      setAnnouncement('')
    }
  }, [dragState.isDragging, dragState.draggedAppointment, isDropZoneValid])
  
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  )
}

// Hook for managing drag preview state
export const useDragPreview = (options: {
  performance?: 'high' | 'medium' | 'low'
  enableEffects?: boolean
} = {}) => {
  const [dragPreviewOptions, setDragPreviewOptions] = useState({
    performance: options.performance || 'high',
    enableRotation: options.enableEffects !== false,
    enableGlow: options.enableEffects !== false,
    showMagneticHints: options.enableEffects !== false
  })
  
  const updateOptions = useCallback((newOptions: Partial<typeof dragPreviewOptions>) => {
    setDragPreviewOptions(prev => ({ ...prev, ...newOptions }))
  }, [])
  
  return {
    dragPreviewOptions,
    updateOptions
  }
}

// Main export component with combined functionality
export const CalendarDragPreview: React.FC<CalendarDragPreviewProps> = (props) => {
  return (
    <>
      <PremiumDragPreview {...props} />
      <DragAccessibilityAnnouncer 
        dragState={props.dragState} 
        isDropZoneValid={props.isDropZoneValid}
      />
    </>
  )
}

// Export individual components for flexibility
export { PremiumDragPreview, DragAccessibilityAnnouncer, useDragPreview }

// Default export
export default CalendarDragPreview