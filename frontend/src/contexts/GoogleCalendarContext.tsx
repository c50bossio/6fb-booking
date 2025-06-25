'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { CalendarAppointment } from '@/components/calendar/PremiumCalendar'
import { googleCalendarClient } from '@/lib/google-calendar/client'
import { googleCalendarSync } from '@/lib/google-calendar/sync-service'
import { GOOGLE_CALENDAR_CONFIG } from '@/lib/google-calendar/config'
import {
  GoogleCalendarSyncState,
  GoogleAuthState,
  GoogleCalendar,
  SyncedCalendar,
  ConflictItem,
  SyncStats,
  GoogleCalendarEvent
} from '@/lib/google-calendar/types'

interface GoogleCalendarContextType {
  // Auth state
  authState: GoogleAuthState
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  handleAuthCallback: (code: string) => Promise<void>

  // Sync state
  syncState: GoogleCalendarSyncState

  // Calendar management
  getCalendars: () => Promise<GoogleCalendar[]>
  enableCalendarSync: (calendarId: string, syncDirection: 'both' | 'to-google' | 'from-google') => void
  disableCalendarSync: (calendarId: string) => void

  // Sync operations
  syncNow: () => Promise<void>
  startAutoSync: (intervalMinutes?: number) => void
  stopAutoSync: () => void

  // Event operations
  createEvent: (appointment: CalendarAppointment, calendarId?: string) => Promise<void>
  updateEvent: (eventId: string, appointment: CalendarAppointment, calendarId?: string) => Promise<void>
  deleteEvent: (eventId: string, calendarId?: string) => Promise<void>

  // Conflict resolution
  resolveConflict: (conflictId: string, resolution: 'local' | 'google') => void

  // Callbacks for parent component
  onGoogleEventCreated?: (event: GoogleCalendarEvent) => void
  onGoogleEventUpdated?: (event: GoogleCalendarEvent) => void
  onGoogleEventDeleted?: (eventId: string) => void
}

const GoogleCalendarContext = createContext<GoogleCalendarContextType | undefined>(undefined)

interface GoogleCalendarProviderProps {
  children: ReactNode
  onGoogleEventCreated?: (event: GoogleCalendarEvent) => void
  onGoogleEventUpdated?: (event: GoogleCalendarEvent) => void
  onGoogleEventDeleted?: (eventId: string) => void
}

export function GoogleCalendarProvider({
  children,
  onGoogleEventCreated,
  onGoogleEventUpdated,
  onGoogleEventDeleted
}: GoogleCalendarProviderProps) {
  // Auth state
  const [authState, setAuthState] = useState<GoogleAuthState>({
    isSignedIn: false,
    isLoading: true
  })

  // Sync state
  const [syncState, setSyncState] = useState<GoogleCalendarSyncState>({
    isAuthenticated: false,
    isLoading: false,
    isSyncing: false,
    syncedCalendars: [],
    syncQueue: [],
    conflictQueue: [],
    syncStats: {
      totalSynced: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      conflicts: 0,
      errors: 0
    }
  })

  // Initialize auth state
  useEffect(() => {
    const checkAuthStatus = () => {
      const authStatus = googleCalendarClient.getAuthStatus()
      setAuthState(prev => ({
        ...prev,
        isSignedIn: authStatus.isAuthenticated,
        isLoading: false
      }))
      setSyncState(prev => ({
        ...prev,
        isAuthenticated: authStatus.isAuthenticated
      }))
    }

    checkAuthStatus()

    // Load synced calendars from storage
    const savedCalendars = localStorage.getItem(GOOGLE_CALENDAR_CONFIG.storageKeys.syncedCalendars)
    if (savedCalendars) {
      try {
        const calendars = JSON.parse(savedCalendars)
        setSyncState(prev => ({ ...prev, syncedCalendars: calendars }))
      } catch (e) {
        console.error('Failed to load synced calendars:', e)
      }
    }
  }, [])

  // Auth methods
  const signIn = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    try {
      await googleCalendarClient.authenticate()
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      }))
    }
  }, [])

  const signOut = useCallback(async () => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    try {
      await googleCalendarClient.signOut()
      setAuthState({
        isSignedIn: false,
        isLoading: false
      })
      setSyncState(prev => ({
        ...prev,
        isAuthenticated: false,
        syncedCalendars: []
      }))
      localStorage.removeItem(GOOGLE_CALENDAR_CONFIG.storageKeys.syncedCalendars)
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      }))
    }
  }, [])

  const handleAuthCallback = useCallback(async (code: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true }))
    try {
      const tokens = await googleCalendarClient.handleAuthCallback(code)

      // Fetch user info
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokens.accessToken}` }
      })
      const user = await userResponse.json()

      setAuthState({
        isSignedIn: true,
        isLoading: false,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          givenName: user.given_name,
          familyName: user.family_name,
          imageUrl: user.picture
        },
        tokens
      })

      setSyncState(prev => ({ ...prev, isAuthenticated: true }))
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication callback failed'
      }))
    }
  }, [])

  // Calendar management
  const getCalendars = useCallback(async (): Promise<GoogleCalendar[]> => {
    try {
      return await googleCalendarSync.getCalendars()
    } catch (error) {
      console.error('Failed to get calendars:', error)
      return []
    }
  }, [])

  const enableCalendarSync = useCallback((
    calendarId: string,
    syncDirection: 'both' | 'to-google' | 'from-google'
  ) => {
    setSyncState(prev => {
      const existing = prev.syncedCalendars.find(cal => cal.id === calendarId)
      const updatedCalendars = existing
        ? prev.syncedCalendars.map(cal =>
            cal.id === calendarId ? { ...cal, isEnabled: true, syncDirection } : cal
          )
        : [...prev.syncedCalendars, {
            id: calendarId,
            summary: calendarId,
            isEnabled: true,
            syncDirection
          }]

      localStorage.setItem(
        GOOGLE_CALENDAR_CONFIG.storageKeys.syncedCalendars,
        JSON.stringify(updatedCalendars)
      )

      return { ...prev, syncedCalendars: updatedCalendars }
    })

    // Setup realtime sync if enabled
    googleCalendarSync.setupRealtimeSync(calendarId).catch(console.error)
  }, [])

  const disableCalendarSync = useCallback((calendarId: string) => {
    setSyncState(prev => {
      const updatedCalendars = prev.syncedCalendars.map(cal =>
        cal.id === calendarId ? { ...cal, isEnabled: false } : cal
      )

      localStorage.setItem(
        GOOGLE_CALENDAR_CONFIG.storageKeys.syncedCalendars,
        JSON.stringify(updatedCalendars)
      )

      return { ...prev, syncedCalendars: updatedCalendars }
    })

    // Stop realtime sync
    googleCalendarSync.stopRealtimeSync(calendarId).catch(console.error)
  }, [])

  // Sync operations
  const syncNow = useCallback(async () => {
    setSyncState(prev => ({ ...prev, isSyncing: true, syncError: undefined }))

    try {
      const stats = await googleCalendarSync.syncAll()
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: new Date(),
        syncStats: stats,
        conflictQueue: googleCalendarSync.getConflicts()
      }))
    } catch (error) {
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed'
      }))
    }
  }, [])

  const startAutoSync = useCallback((intervalMinutes?: number) => {
    googleCalendarSync.startAutoSync(intervalMinutes).catch(console.error)

    // Update sync state periodically
    const statusInterval = setInterval(() => {
      const status = googleCalendarSync.getSyncStatus()
      setSyncState(prev => ({
        ...prev,
        isSyncing: status.isSyncing,
        conflictQueue: googleCalendarSync.getConflicts(),
        lastSyncTime: status.lastSync
      }))
    }, 5000)

    // Store interval ID for cleanup
    ;(window as any).__syncStatusInterval = statusInterval
  }, [])

  const stopAutoSync = useCallback(() => {
    googleCalendarSync.stopAutoSync()

    // Clear status update interval
    const interval = (window as any).__syncStatusInterval
    if (interval) {
      clearInterval(interval)
      delete (window as any).__syncStatusInterval
    }
  }, [])

  // Event operations
  const createEvent = useCallback(async (
    appointment: CalendarAppointment,
    calendarId: string = 'primary'
  ) => {
    try {
      const event = await googleCalendarSync.createGoogleEvent(appointment, calendarId)
      setSyncState(prev => ({
        ...prev,
        syncStats: {
          ...prev.syncStats,
          created: prev.syncStats.created + 1,
          totalSynced: prev.syncStats.totalSynced + 1
        }
      }))
    } catch (error) {
      console.error('Failed to create event:', error)
      throw error
    }
  }, [])

  const updateEvent = useCallback(async (
    eventId: string,
    appointment: CalendarAppointment,
    calendarId: string = 'primary'
  ) => {
    try {
      const event = await googleCalendarSync.updateGoogleEvent(eventId, appointment, calendarId)
      setSyncState(prev => ({
        ...prev,
        syncStats: {
          ...prev.syncStats,
          updated: prev.syncStats.updated + 1,
          totalSynced: prev.syncStats.totalSynced + 1
        }
      }))
    } catch (error) {
      console.error('Failed to update event:', error)
      throw error
    }
  }, [])

  const deleteEvent = useCallback(async (
    eventId: string,
    calendarId: string = 'primary'
  ) => {
    try {
      await googleCalendarSync.deleteGoogleEvent(eventId, calendarId)
      setSyncState(prev => ({
        ...prev,
        syncStats: {
          ...prev.syncStats,
          deleted: prev.syncStats.deleted + 1
        }
      }))
    } catch (error) {
      console.error('Failed to delete event:', error)
      throw error
    }
  }, [])

  // Conflict resolution
  const resolveConflict = useCallback((conflictId: string, resolution: 'local' | 'google') => {
    googleCalendarSync.resolveConflictManually(conflictId, resolution)
    setSyncState(prev => ({
      ...prev,
      conflictQueue: googleCalendarSync.getConflicts()
    }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const interval = (window as any).__syncStatusInterval
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [])

  const value: GoogleCalendarContextType = {
    authState,
    signIn,
    signOut,
    handleAuthCallback,
    syncState,
    getCalendars,
    enableCalendarSync,
    disableCalendarSync,
    syncNow,
    startAutoSync,
    stopAutoSync,
    createEvent,
    updateEvent,
    deleteEvent,
    resolveConflict,
    onGoogleEventCreated,
    onGoogleEventUpdated,
    onGoogleEventDeleted
  }

  return (
    <GoogleCalendarContext.Provider value={value}>
      {children}
    </GoogleCalendarContext.Provider>
  )
}

export function useGoogleCalendar() {
  const context = useContext(GoogleCalendarContext)
  if (!context) {
    throw new Error('useGoogleCalendar must be used within a GoogleCalendarProvider')
  }
  return context
}
