'use client'

import React, { useState, useRef, useEffect } from 'react'
import { format, differenceInMinutes } from 'date-fns'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  ClockIcon,
  UserIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  InformationCircleIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface AppointmentTooltipProps {
  appointment: any
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  showAdvanced?: boolean
}

interface TimeSlotTooltipProps {
  date: Date
  barber?: any
  isAvailable: boolean
  children: React.ReactNode
  conflictInfo?: {
    hasConflict: boolean
    reason?: string
    suggestions?: string[]
  }
}

interface SmartSuggestionTooltipProps {
  suggestion: {
    confidence: number
    reasoning: string[]
    optimization_score: number
    buffer_info: string
    revenue_potential?: number
  }
  children: React.ReactNode
}

export function AppointmentTooltip({
  appointment,
  children,
  position = 'top',
  showAdvanced = false
}: AppointmentTooltipProps) {
  const startTime = new Date(appointment.start_time)
  const endTime = new Date(appointment.end_time || new Date(startTime.getTime() + (appointment.duration_minutes || 60) * 60000))
  const duration = differenceInMinutes(endTime, startTime)
  
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'text-green-600'
      case 'pending': return 'text-yellow-600'
      case 'completed': return 'text-blue-600'
      case 'cancelled': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return CheckCircleIcon
      case 'pending': return ClockIcon
      case 'completed': return CheckCircleIcon
      case 'cancelled': return ExclamationTriangleIcon
      default: return InformationCircleIcon
    }
  }

  const StatusIcon = getStatusIcon(appointment.status || 'pending')

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side={position} 
          className="max-w-sm p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
          sideOffset={8}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  {appointment.client_name || 'Unknown Client'}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {appointment.service_name || 'Service'}
                </p>
              </div>
              <div className={`flex items-center ${getStatusColor(appointment.status)}`}>
                <StatusIcon className="h-4 w-4 mr-1" />
                <span className="text-xs font-medium capitalize">
                  {appointment.status || 'Pending'}
                </span>
              </div>
            </div>

            {/* Time & Duration */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <ClockIcon className="h-4 w-4 mr-2" />
                <div>
                  <div className="font-medium">
                    {format(startTime, 'h:mm a')}
                  </div>
                  <div className="text-xs">
                    {duration} minutes
                  </div>
                </div>
              </div>
              
              {appointment.barber_name && (
                <div className="flex items-center text-gray-600 dark:text-gray-400">
                  <UserIcon className="h-4 w-4 mr-2" />
                  <div>
                    <div className="font-medium">
                      {appointment.barber_name}
                    </div>
                    <div className="text-xs">
                      Barber
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Price */}
            {appointment.price && (
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                <span className="font-medium">${appointment.price}</span>
              </div>
            )}

            {/* Advanced Info */}
            {showAdvanced && (
              <>
                {appointment.notes && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Notes:</strong> {appointment.notes}
                  </div>
                )}
                
                {appointment.client_phone && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Phone:</strong> {appointment.client_phone}
                  </div>
                )}
                
                <div className="text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
                  Created: {format(new Date(appointment.created_at || Date.now()), 'MMM d, h:mm a')}
                </div>
              </>
            )}

            {/* Quick Actions Hint */}
            <div className="text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Click</kbd> to edit • 
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs ml-1">Drag</kbd> to reschedule
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function TimeSlotTooltip({
  date,
  barber,
  isAvailable,
  children,
  conflictInfo
}: TimeSlotTooltipProps) {
  const dayOfWeek = format(date, 'EEEE')
  const timeString = format(date, 'h:mm a')
  const dateString = format(date, 'MMM d, yyyy')

  return (
    <TooltipProvider>
      <Tooltip delayDuration={500}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-xs p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
          sideOffset={8}
        >
          <div className="space-y-2">
            {/* Time & Date */}
            <div className="text-center">
              <div className="font-semibold text-gray-900 dark:text-gray-100">
                {timeString}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {dayOfWeek}, {dateString}
              </div>
            </div>

            {/* Barber Info */}
            {barber && (
              <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
                <UserIcon className="h-4 w-4 mr-2" />
                {barber.name || `${barber.first_name} ${barber.last_name}`.trim()}
              </div>
            )}

            {/* Availability Status */}
            <div className={`text-center text-sm ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
              {isAvailable ? (
                <div className="flex items-center justify-center">
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  Available
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  Not Available
                </div>
              )}
            </div>

            {/* Conflict Information */}
            {conflictInfo?.hasConflict && (
              <div className="text-sm text-orange-600 dark:text-orange-400">
                <div className="font-medium">⚠️ Potential Conflict</div>
                {conflictInfo.reason && (
                  <div className="text-xs mt-1">{conflictInfo.reason}</div>
                )}
                {conflictInfo.suggestions && conflictInfo.suggestions.length > 0 && (
                  <div className="text-xs mt-1">
                    <strong>Suggestions:</strong>
                    <ul className="mt-1 space-y-1">
                      {conflictInfo.suggestions.map((suggestion, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-1">•</span>
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Action Hint */}
            <div className="text-xs text-gray-500 dark:text-gray-500 text-center pt-2 border-t border-gray-200 dark:border-gray-700">
              {isAvailable ? (
                <>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Click</kbd> to book appointment
                </>
              ) : (
                'Slot not available'
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function SmartSuggestionTooltip({
  suggestion,
  children
}: SmartSuggestionTooltipProps) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600'
    if (confidence >= 70) return 'text-blue-600'
    if (confidence >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 85) return CheckCircleIcon
    if (confidence >= 50) return InformationCircleIcon
    return ExclamationTriangleIcon
  }

  const ConfidenceIcon = getConfidenceIcon(suggestion.confidence)

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="right" 
          className="max-w-sm p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
          sideOffset={8}
        >
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center">
              <SparklesIcon className="h-5 w-5 text-blue-500 mr-2" />
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                Smart Suggestion
              </h4>
            </div>

            {/* Confidence Score */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Confidence</span>
              <div className={`flex items-center ${getConfidenceColor(suggestion.confidence)}`}>
                <ConfidenceIcon className="h-4 w-4 mr-1" />
                <span className="font-semibold">{suggestion.confidence}%</span>
              </div>
            </div>

            {/* Optimization Score */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Optimization</span>
              <div className="flex items-center">
                <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${suggestion.optimization_score}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{suggestion.optimization_score}/100</span>
              </div>
            </div>

            {/* Buffer Information */}
            {suggestion.buffer_info && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Buffer:</strong> {suggestion.buffer_info}
              </div>
            )}

            {/* Revenue Potential */}
            {suggestion.revenue_potential && (
              <div className="flex items-center text-sm text-green-600 dark:text-green-400">
                <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                <span>Est. Revenue: ${suggestion.revenue_potential}</span>
              </div>
            )}

            {/* Reasoning */}
            {suggestion.reasoning && suggestion.reasoning.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Why this slot?
                </div>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {suggestion.reasoning.map((reason, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2 mt-0.5">•</span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Hint */}
            <div className="text-xs text-gray-500 dark:text-gray-500 pt-2 border-t border-gray-200 dark:border-gray-700">
              <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">Click</kbd> to select this time slot
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Keyboard shortcut display component
export function KeyboardShortcutDisplay({ 
  shortcut, 
  description, 
  className = "" 
}: { 
  shortcut: string[], 
  description: string, 
  className?: string 
}) {
  return (
    <div className={`flex items-center justify-between text-sm ${className}`}>
      <span className="text-gray-600 dark:text-gray-400">{description}</span>
      <div className="flex items-center space-x-1">
        {shortcut.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-gray-400">+</span>}
            <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded text-xs font-mono">
              {key}
            </kbd>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

// Quick help tooltip for complex interactions
export function QuickHelpTooltip({
  children,
  shortcuts = [],
  tips = []
}: {
  children: React.ReactNode
  shortcuts?: Array<{ keys: string[], description: string }>
  tips?: string[]
}) {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={800}>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="bottom" 
          className="max-w-md p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
          sideOffset={8}
        >
          <div className="space-y-3">
            {shortcuts.length > 0 && (
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Keyboard Shortcuts
                </div>
                <div className="space-y-2">
                  {shortcuts.map((shortcut, index) => (
                    <KeyboardShortcutDisplay
                      key={index}
                      shortcut={shortcut.keys}
                      description={shortcut.description}
                    />
                  ))}
                </div>
              </div>
            )}

            {tips.length > 0 && (
              <div>
                {shortcuts.length > 0 && <div className="border-t border-gray-200 dark:border-gray-700 my-3" />}
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Tips
                </div>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  {tips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2 mt-0.5">💡</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default {
  AppointmentTooltip,
  TimeSlotTooltip,
  SmartSuggestionTooltip,
  KeyboardShortcutDisplay,
  QuickHelpTooltip
}