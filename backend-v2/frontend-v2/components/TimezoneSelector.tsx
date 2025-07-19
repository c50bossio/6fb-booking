'use client'

import { useState, useEffect } from 'react'
import { getUserTimezone, getTimezoneDisplayName, detectBrowserTimezone, isValidTimezone } from '@/lib/timezone'

interface TimezoneInfo {
  name: string
  display_name: string
  offset: string
  region?: string
  is_common?: boolean
}

interface TimezoneSelectorProps {
  value?: string
  onChange?: (timezone: string) => void
  onTimezoneChange?: (timezone: string) => void // deprecated, use onChange
  onAutoDetect?: (timezone: string) => void
  allowAutoDetect?: boolean
  showCurrentTime?: boolean
  showDetectionSuggestion?: boolean
  className?: string
  disabled?: boolean
  compact?: boolean
}

// Fallback common timezones if API fails
const FALLBACK_COMMON_TIMEZONES = [
  { name: 'America/New_York', display_name: 'Eastern Time (ET)', offset: '-05:00', is_common: true },
  { name: 'America/Chicago', display_name: 'Central Time (CT)', offset: '-06:00', is_common: true },
  { name: 'America/Denver', display_name: 'Mountain Time (MT)', offset: '-07:00', is_common: true },
  { name: 'America/Los_Angeles', display_name: 'Pacific Time (PT)', offset: '-08:00', is_common: true },
  { name: 'America/Phoenix', display_name: 'Arizona Time', offset: '-07:00', is_common: true },
  { name: 'Europe/London', display_name: 'London (GMT/BST)', offset: '+00:00', is_common: true },
  { name: 'Europe/Paris', display_name: 'Central European Time', offset: '+01:00', is_common: true },
  { name: 'Asia/Tokyo', display_name: 'Japan Time', offset: '+09:00', is_common: true },
  { name: 'Australia/Sydney', display_name: 'Sydney Time', offset: '+11:00', is_common: true },
]

export default function TimezoneSelector({ 
  value,
  onChange,
  onTimezoneChange, 
  onAutoDetect,
  allowAutoDetect = true,
  showCurrentTime = true,
  showDetectionSuggestion = true,
  className = '',
  disabled = false,
  compact = false
}: TimezoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedTimezone, setSelectedTimezone] = useState(value || getUserTimezone())
  const [detectedTimezone, setDetectedTimezone] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<string>('')
  const [isDetecting, setIsDetecting] = useState(false)
  const [availableTimezones, setAvailableTimezones] = useState<TimezoneInfo[]>(FALLBACK_COMMON_TIMEZONES)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Load available timezones from API
  useEffect(() => {
    const loadTimezones = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/v2/users/timezone/allowed')
        if (response.ok) {
          const data = await response.json()
          if (data.allowed_timezones && data.allowed_timezones.length > 0) {
            setAvailableTimezones(data.allowed_timezones)
          }
        } else {
          // Try common timezones endpoint as fallback
          const commonResponse = await fetch('/api/v2/timezones/common')
          if (commonResponse.ok) {
            const commonData = await commonResponse.json()
            if (commonData.timezones) {
              setAvailableTimezones(commonData.timezones)
            }
          }
        }
      } catch (error) {
        setError('Failed to load timezones')
        // Keep fallback timezones
      } finally {
        setLoading(false)
      }
    }

    loadTimezones()
  }, [])
  
  // Auto-detect timezone on mount
  useEffect(() => {
    if (allowAutoDetect && showDetectionSuggestion) {
      const detected = detectBrowserTimezone()
      if (detected && detected !== selectedTimezone && isValidTimezone(detected)) {
        setDetectedTimezone(detected)
      }
    }
  }, [allowAutoDetect, showDetectionSuggestion, selectedTimezone])
  
  // Update selectedTimezone when value prop changes
  useEffect(() => {
    if (value && value !== selectedTimezone) {
      setSelectedTimezone(value)
    }
  }, [value])
  
  // Update current time display
  useEffect(() => {
    if (!showCurrentTime) return

    const updateTime = () => {
      try {
        const now = new Date()
        const timeString = now.toLocaleString('en-US', {
          timeZone: selectedTimezone,
          hour: '2-digit',
          minute: '2-digit',
          timeZoneName: 'short'
        })
        setCurrentTime(timeString)
      } catch (error) {
        setCurrentTime('Invalid timezone')
      }
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [selectedTimezone, showCurrentTime])
  
  const handleTimezoneChange = (timezone: string) => {
    if (!isValidTimezone(timezone)) {
      setError('Invalid timezone selected')
      return
    }

    setSelectedTimezone(timezone)
    setIsOpen(false)
    setDetectedTimezone(null) // Clear detection suggestion
    setError(null)
    
    // Call onChange if provided (preferred)
    if (onChange) {
      onChange(timezone)
    }
    // Fall back to onTimezoneChange for backward compatibility
    else if (onTimezoneChange) {
      onTimezoneChange(timezone)
    }
  }

  const handleAutoDetect = async () => {
    if (!allowAutoDetect || disabled) return

    setIsDetecting(true)
    setError(null)
    
    try {
      const detected = detectBrowserTimezone()
      if (detected) {
        // Validate with backend
        const response = await fetch('/api/v2/users/me/timezone/detect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            detected_timezone: detected,
            confidence: 1.0,
            browser_info: {
              userAgent: navigator.userAgent,
              language: navigator.language
            }
          })
        })

        if (response.ok) {
          const data = await response.json()
          const timezoneToSet = data.suggested_timezone || detected
          handleTimezoneChange(timezoneToSet)
          
          if (onAutoDetect) {
            onAutoDetect(timezoneToSet)
          }
        } else {
          const errorData = await response.json()
          setError(errorData.detail || 'Failed to auto-detect timezone')
        }
      } else {
        setError('Could not detect timezone from browser')
      }
    } catch (error) {
      setError('Failed to auto-detect timezone')
    } finally {
      setIsDetecting(false)
    }
  }
  
  // Get display name for the selected timezone
  const getDisplayNameForTimezone = (tz: string) => {
    const timezoneInfo = availableTimezones.find(t => t.name === tz)
    if (timezoneInfo) {
      return compact ? timezoneInfo.display_name.split(' (')[0] : timezoneInfo.display_name
    }
    
    try {
      const date = new Date()
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        timeZoneName: compact ? 'short' : 'long'
      })
      const parts = formatter.formatToParts(date)
      const timeZoneName = parts.find(part => part.type === 'timeZoneName')?.value || tz
      return timeZoneName
    } catch {
      return tz
    }
  }
  
  const currentTimezoneDisplay = getDisplayNameForTimezone(selectedTimezone)
  
  // Group timezones by region
  const groupedTimezones = availableTimezones.reduce((groups, tz) => {
    const region = tz.region || 'Other'
    if (!groups[region]) {
      groups[region] = []
    }
    groups[region].push(tz)
    return groups
  }, {} as Record<string, TimezoneInfo[]>)
  
  return (
    <div className={`relative ${className}`}>
      {/* Auto-detection suggestion */}
      {detectedTimezone && detectedTimezone !== selectedTimezone && showDetectionSuggestion && !isOpen && (
        <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-blue-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-blue-700">Detected: {getDisplayNameForTimezone(detectedTimezone)}</span>
            </div>
            <button
              onClick={() => handleTimezoneChange(detectedTimezone)}
              className="text-blue-600 hover:text-blue-800 font-medium"
              disabled={disabled}
            >
              Use
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-sm text-red-700">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Main selector button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
          ${disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-gray-100 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
          }
          ${compact ? 'px-2 py-1' : 'px-3 py-1.5'}
        `}
      >
        <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {currentTimezoneDisplay}
        <svg className={`w-4 h-4 ml-1.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Current time display */}
      {showCurrentTime && currentTime && !compact && (
        <div className="mt-1 text-xs text-gray-500">
          Current time: {currentTime}
        </div>
      )}
      
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          
          {/* Dropdown */}
          <div className={`absolute right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-20 ${compact ? 'w-56' : 'w-80'}`}>
            <div className="p-2">
              {/* Header */}
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <p className="text-xs text-gray-500">Select timezone</p>
                {loading && (
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                )}
              </div>

              {/* Auto-detect button */}
              {allowAutoDetect && (
                <button
                  onClick={handleAutoDetect}
                  disabled={isDetecting}
                  className="w-full text-left px-3 py-2 text-sm rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors mb-2 flex items-center"
                >
                  {isDetecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mr-2" />
                      Detecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Auto-detect timezone
                    </>
                  )}
                </button>
              )}

              {/* Timezone list */}
              <div className="max-h-60 overflow-y-auto">
                {Object.entries(groupedTimezones).map(([region, timezones]) => (
                  <div key={region} className="mb-2">
                    <p className="text-xs font-medium text-gray-400 px-2 py-1 uppercase tracking-wide">
                      {region}
                    </p>
                    {timezones.map(tz => (
                      <button
                        key={tz.name}
                        onClick={() => handleTimezoneChange(tz.name)}
                        className={`
                          w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors flex items-center justify-between
                          ${selectedTimezone === tz.name ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}
                        `}
                      >
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span>{tz.display_name}</span>
                            {tz.is_common && (
                              <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                                Popular
                              </span>
                            )}
                          </div>
                          {!compact && (
                            <div className="text-xs text-gray-500">
                              {tz.name} • {tz.offset}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}