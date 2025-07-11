'use client'

import React from 'react'
import { format } from 'date-fns'
import { getServiceConfig, getBarberSymbol, type ServiceType } from '@/lib/calendar-constants'
import type { BookingResponse } from '@/lib/api'

interface Appointment extends BookingResponse {
  height?: number // Calendar-specific computed field
}

interface AppointmentCardProps {
  appointment: Appointment
  isDraggable?: boolean
  isDragging?: boolean
  isSelected?: boolean
  viewType: 'day' | 'week' | 'month'
  onClick?: (appointment: Appointment) => void
  onDragStart?: (e: React.DragEvent, appointment: Appointment) => void
  onDragEnd?: (e: React.DragEvent) => void
  onMoveClick?: (appointment: Appointment) => void
  showDropIndicator?: boolean
  getStatusColor: (status: string) => string
}

export const AppointmentCard = React.memo(function AppointmentCard({
  appointment,
  isDraggable = false,
  isDragging = false,
  isSelected = false,
  viewType,
  onClick,
  onDragStart,
  onDragEnd,
  onMoveClick,
  showDropIndicator = false,
  getStatusColor
}: AppointmentCardProps) {
  // Get service configuration for premium styling
  const serviceType = appointment.service_name?.toLowerCase() || 'haircut'
  const serviceConfig = getServiceConfig(serviceType as ServiceType)
  const barberSymbol = getBarberSymbol(appointment.barber_id?.toString() || appointment.barber_name || '')

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDragging && onClick) {
      onClick(appointment)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault()
      onClick(appointment)
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart && isDraggable) {
      onDragStart(e, appointment)
    }
  }

  const handleMoveClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onMoveClick) {
      onMoveClick(appointment)
    }
  }

  // Different styles based on view type
  const getViewSpecificClasses = () => {
    switch (viewType) {
      case 'day':
        return 'p-2 text-xs'
      case 'week':
        return 'p-1 text-xs'
      case 'month':
        return 'p-1 text-xs truncate'
      default:
        return 'p-2 text-xs'
    }
  }

  const baseClasses = `unified-calendar-appointment premium-appointment rounded cursor-pointer overflow-hidden transition-all text-white group ${getViewSpecificClasses()} ${getStatusColor(appointment.status)}`
  
  const dragClasses = isDragging 
    ? 'opacity-30 scale-95 ring-2 ring-gray-400 dark:ring-gray-300 ring-opacity-70 animate-pulse' 
    : 'hover:shadow-xl hover:scale-105 hover:z-20 hover:ring-2 hover:ring-gray-600 hover:ring-opacity-80 dark:hover:ring-gray-300 dark:hover:ring-opacity-70 hover:shadow-gray-500/25 dark:hover:shadow-gray-300/25'
  
  const cursorClass = isDraggable ? 'cursor-move' : 'cursor-pointer'
  
  const selectionClasses = isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-800' : ''

  const style = {
    background: serviceConfig?.gradient?.light || 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
    borderColor: serviceConfig?.color || '#3b82f6',
    boxShadow: viewType === 'month' 
      ? undefined 
      : `0 0 0 1px ${serviceConfig?.color || '#3b82f6'}40, ${serviceConfig?.glow || '0 4px 12px rgba(59, 130, 246, 0.3)'}`
  }

  // Month view has simpler rendering
  if (viewType === 'month') {
    return (
      <div
        data-appointment-id={appointment.id}
        draggable={isDraggable}
        className={`${baseClasses} ${dragClasses} ${cursorClass}`}
        style={style}
        onClick={handleClick}
        onDragStart={handleDragStart}
        onDragEnd={onDragEnd}
      >
        {appointment.client_name}
      </div>
    )
  }

  // Day and Week views have richer content
  return (
    <div
      data-appointment-id={appointment.id}
      draggable={isDraggable}
      tabIndex={0}
      role="button"
      aria-label={`Appointment with ${appointment.client_name} for ${appointment.service_name} at ${format(new Date(appointment.start_time), 'h:mm a')}. Status: ${appointment.status}`}
      aria-selected={isSelected}
      className={`${baseClasses} ${dragClasses} ${cursorClass} ${selectionClasses}`}
      style={style}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Barber symbol in top-right corner */}
      <div 
        className={`absolute ${viewType === 'week' ? 'top-0.5 right-0.5' : 'top-1 right-1'} text-xs opacity-70 font-bold text-white bg-black bg-opacity-20 rounded-full ${viewType === 'week' ? 'w-4 h-4' : 'w-5 h-5'} flex items-center justify-center`} 
        title={`Barber: ${appointment.barber_name || 'Unknown'}`}
      >
        {barberSymbol}
      </div>
      
      {/* Service icon in bottom-left corner */}
      <div 
        className={`absolute ${viewType === 'week' ? 'bottom-0.5 left-0.5 text-xs' : 'bottom-1 left-1 text-sm'} opacity-80`} 
        title={`Service: ${appointment.service_name}`}
      >
        {serviceConfig?.icon || '✂️'}
      </div>
      
      {/* Content */}
      <div className={`relative z-10 ${viewType === 'week' ? 'mt-1' : 'space-y-1'}`}>
        <div className={`font-medium ${viewType === 'week' ? 'truncate' : ''} text-white`}>
          {appointment.client_name}
        </div>
        <div className={`text-white text-xs opacity-90 ${viewType === 'week' ? 'truncate' : ''}`}>
          {appointment.service_name}
        </div>
        {viewType === 'day' && appointment.duration_minutes && (
          <div className="text-white text-xs opacity-75">{appointment.duration_minutes} min</div>
        )}
      </div>
      
      {/* Drop zone indicator when dragging */}
      {showDropIndicator && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg">
            Drop here
          </div>
        </div>
      )}
      
      {/* Move button fallback for non-drag browsers or touch devices */}
      {isDraggable && !isDragging && onMoveClick && (
        <button
          className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white/20 hover:bg-white/30 rounded p-1"
          onClick={handleMoveClick}
          title="Move appointment"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
      )}
    </div>
  )
})

AppointmentCard.displayName = 'AppointmentCard'