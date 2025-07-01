'use client'

import { useState, useEffect } from 'react'
import { getUserTimezone, getTimezoneDisplayName } from '@/lib/timezone'

interface TimezoneSelectorProps {
  value?: string
  onChange?: (timezone: string) => void
  onTimezoneChange?: (timezone: string) => void // deprecated, use onChange
  className?: string
}

// Common timezones for quick selection
const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time' },
  { value: 'Asia/Tokyo', label: 'Japan Time' },
  { value: 'Australia/Sydney', label: 'Sydney Time' },
]

export default function TimezoneSelector({ 
  value,
  onChange,
  onTimezoneChange, 
  className = '' 
}: TimezoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTimezone, setSelectedTimezone] = useState(value || getUserTimezone())
  
  // Update selectedTimezone when value prop changes
  useEffect(() => {
    if (value && value !== selectedTimezone) {
      setSelectedTimezone(value)
    }
  }, [value])
  
  const handleTimezoneChange = (timezone: string) => {
    setSelectedTimezone(timezone)
    setIsOpen(false)
    
    // Call onChange if provided (preferred)
    if (onChange) {
      onChange(timezone)
    }
    // Fall back to onTimezoneChange for backward compatibility
    else if (onTimezoneChange) {
      onTimezoneChange(timezone)
    }
  }
  
  // Get display name for the selected timezone
  const getDisplayNameForTimezone = (tz: string) => {
    try {
      const savedTimezone = getUserTimezone()
      // Temporarily set the timezone context
      const date = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'long'
      })
      const parts = formatter.formatToParts(date)
      const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || tz
      
      // Get abbreviation
      const shortFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: 'short'
      })
      const shortParts = shortFormatter.formatToParts(date)
      const abbr = shortParts.find(part => part.type === 'timeZoneName')?.value || ''
      
      return abbr ? `${timeZoneName} (${abbr})` : timeZoneName
    } catch {
      return tz
    }
  }
  
  const currentTimezoneDisplay = getDisplayNameForTimezone(selectedTimezone)
  
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
      >
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {currentTimezoneDisplay}
        <svg className={`w-4 h-4 ml-1.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-2">
              <p className="text-xs text-gray-500 px-2 py-1">Select timezone</p>
              <div className="max-h-60 overflow-y-auto">
                {COMMON_TIMEZONES.map(tz => (
                  <button
                    key={tz.value}
                    onClick={() => handleTimezoneChange(tz.value)}
                    className={`
                      w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors
                      ${selectedTimezone === tz.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                    `}
                  >
                    {tz.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}