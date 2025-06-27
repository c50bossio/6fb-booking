'use client'

import React from 'react'
import { CalendarIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid'
import { useTheme } from '@/contexts/ThemeContext'

interface GoogleCalendarIndicatorProps {
  connected: boolean
  showGoogleEvents: boolean
  onToggle: () => void
  className?: string
}

export default function GoogleCalendarIndicator({
  connected,
  showGoogleEvents,
  onToggle,
  className = ''
}: GoogleCalendarIndicatorProps) {
  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()

  if (!connected) {
    return null
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all"
        style={{
          backgroundColor: showGoogleEvents
            ? (theme === 'soft-light' ? 'rgba(124, 152, 133, 0.1)' : 'rgba(66, 133, 244, 0.1)')
            : 'transparent',
          borderColor: showGoogleEvents
            ? (theme === 'soft-light' ? '#7c9885' : '#4285f4')
            : colors.border,
          border: '1px solid',
          color: showGoogleEvents
            ? (theme === 'soft-light' ? '#7c9885' : '#4285f4')
            : colors.textSecondary
        }}
        onMouseEnter={(e) => {
          if (!showGoogleEvents) {
            e.currentTarget.style.backgroundColor = theme === 'light' || theme === 'soft-light' ? '#f3f4f6' : 'rgba(55, 65, 81, 0.3)'
          }
        }}
        onMouseLeave={(e) => {
          if (!showGoogleEvents) {
            e.currentTarget.style.backgroundColor = 'transparent'
          }
        }}
      >
        <CalendarIcon className="h-4 w-4" />
        <span className="text-sm font-medium">Google Calendar</span>
        {showGoogleEvents ? (
          <CheckCircleIcon className="h-4 w-4" />
        ) : (
          <div className="w-4 h-4 rounded-full border-2" style={{ borderColor: 'currentColor' }} />
        )}
      </button>

      {showGoogleEvents && (
        <div className="flex items-center space-x-1">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: theme === 'soft-light' ? '#7c9885' : '#34a853' }}
          />
          <span className="text-xs" style={{ color: colors.textSecondary }}>
            Synced
          </span>
        </div>
      )}
    </div>
  )
}
