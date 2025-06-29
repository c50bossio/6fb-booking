'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getProfile, updateUserTimezone } from './api'
import { detectBrowserTimezone, isValidTimezone } from './timezone'

interface TimezoneContextType {
  timezone: string
  isLoading: boolean
  error: Error | null
  setTimezone: (timezone: string) => Promise<void>
  detectAndSetTimezone: () => Promise<void>
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined)

interface TimezoneProviderProps {
  children: ReactNode
  defaultTimezone?: string
}

export function TimezoneProvider({ children, defaultTimezone = 'UTC' }: TimezoneProviderProps) {
  const [timezone, setTimezoneState] = useState<string>(defaultTimezone)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Load user's timezone on mount
  useEffect(() => {
    loadUserTimezone()
  }, [])

  const loadUserTimezone = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Try to get user's saved timezone from profile
      const profile = await getProfile()
      
      if (profile.timezone && isValidTimezone(profile.timezone)) {
        setTimezoneState(profile.timezone)
      } else {
        // If no saved timezone, detect browser timezone
        const browserTimezone = detectBrowserTimezone()
        if (isValidTimezone(browserTimezone)) {
          setTimezoneState(browserTimezone)
          // Optionally save the detected timezone
          await updateUserTimezone(browserTimezone).catch(console.error)
        }
      }
    } catch (err) {
      // If not authenticated or error, use browser timezone
      const browserTimezone = detectBrowserTimezone()
      if (isValidTimezone(browserTimezone)) {
        setTimezoneState(browserTimezone)
      }
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }

  const setTimezone = async (newTimezone: string) => {
    if (!isValidTimezone(newTimezone)) {
      throw new Error(`Invalid timezone: ${newTimezone}`)
    }

    try {
      setIsLoading(true)
      setError(null)
      
      // Update timezone on the server
      await updateUserTimezone(newTimezone)
      
      // Update local state
      setTimezoneState(newTimezone)
      
      // Store in localStorage as backup
      localStorage.setItem('userTimezone', newTimezone)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const detectAndSetTimezone = async () => {
    const browserTimezone = detectBrowserTimezone()
    if (isValidTimezone(browserTimezone)) {
      await setTimezone(browserTimezone)
    } else {
      throw new Error('Could not detect valid browser timezone')
    }
  }

  const value: TimezoneContextType = {
    timezone,
    isLoading,
    error,
    setTimezone,
    detectAndSetTimezone,
  }

  return <TimezoneContext.Provider value={value}>{children}</TimezoneContext.Provider>
}

export function useTimezone() {
  const context = useContext(TimezoneContext)
  if (context === undefined) {
    throw new Error('useTimezone must be used within a TimezoneProvider')
  }
  return context
}

// Additional hook for timezone conversion utilities
export function useTimezoneUtils() {
  const { timezone } = useTimezone()
  
  return {
    timezone,
    // Re-export timezone utilities with current timezone as default
    formatInTimezone: (date: Date | string, format: string, tz?: string) => {
      const { formatDateInTimezone } = require('./timezone')
      return formatDateInTimezone(date, format, tz || timezone)
    },
    convertToTimezone: (date: Date | string, toTz?: string) => {
      const { convertTimezone } = require('./timezone')
      return convertTimezone(date, timezone, toTz || timezone)
    },
    formatWithTimezone: (date: Date | string, includeDate?: boolean, tz?: string) => {
      const { formatWithTimezone } = require('./timezone')
      return formatWithTimezone(date, tz || timezone, includeDate)
    },
    getCurrentTime: (tz?: string) => {
      const { getCurrentTimeInTimezone } = require('./timezone')
      return getCurrentTimeInTimezone(tz || timezone)
    },
    localToUTC: (date: Date | string) => {
      const { localToUTC } = require('./timezone')
      return localToUTC(date, timezone)
    },
    utcToLocal: (date: Date | string) => {
      const { utcToLocal } = require('./timezone')
      return utcToLocal(date, timezone)
    },
  }
}

// Hook to get timezone from localStorage (for SSR compatibility)
export function useLocalTimezone(defaultTimezone = 'UTC'): string {
  const [timezone, setTimezone] = useState(defaultTimezone)

  useEffect(() => {
    // Check localStorage for saved timezone
    const savedTimezone = localStorage.getItem('userTimezone')
    if (savedTimezone && isValidTimezone(savedTimezone)) {
      setTimezone(savedTimezone)
    } else {
      // Detect browser timezone
      const browserTimezone = detectBrowserTimezone()
      if (isValidTimezone(browserTimezone)) {
        setTimezone(browserTimezone)
        localStorage.setItem('userTimezone', browserTimezone)
      }
    }
  }, [])

  return timezone
}