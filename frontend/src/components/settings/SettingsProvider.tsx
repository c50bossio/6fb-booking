'use client'

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react'
import {
  SettingsScope,
  SettingsCategory,
  ThemeMode,
  CalendarView,
  TimeFormat,
  DateFormat,
  FontSize,
  settingsApi,
  type UserPreferences,
  type LocationSettings,
  type NotificationSettings,
  type AccessibilitySettings,
  type IntegrationSettings,
  type SettingsConfig
} from '@/lib/api/settings'

// Types
interface SettingsState {
  // User preferences
  userPreferences: UserPreferences | null
  
  // Location settings (if applicable)
  locationSettings: LocationSettings | null
  
  // Notification settings
  notificationSettings: NotificationSettings | null
  
  // Accessibility settings
  accessibilitySettings: AccessibilitySettings | null
  
  // Integration settings
  integrationSettings: IntegrationSettings | null
  
  // General settings config
  settingsConfig: Record<string, SettingsConfig[]>
  
  // State management
  isLoading: boolean
  error: string | null
  hasUnsavedChanges: boolean
  currentScope: SettingsScope
  currentScopeId?: number
}

type SettingsAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_SCOPE'; payload: { scope: SettingsScope; scopeId?: number } }
  | { type: 'SET_USER_PREFERENCES'; payload: UserPreferences }
  | { type: 'UPDATE_USER_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'SET_LOCATION_SETTINGS'; payload: LocationSettings }
  | { type: 'UPDATE_LOCATION_SETTINGS'; payload: Partial<LocationSettings> }
  | { type: 'SET_NOTIFICATION_SETTINGS'; payload: NotificationSettings }
  | { type: 'UPDATE_NOTIFICATION_SETTINGS'; payload: Partial<NotificationSettings> }
  | { type: 'SET_ACCESSIBILITY_SETTINGS'; payload: AccessibilitySettings }
  | { type: 'UPDATE_ACCESSIBILITY_SETTINGS'; payload: Partial<AccessibilitySettings> }
  | { type: 'SET_INTEGRATION_SETTINGS'; payload: IntegrationSettings }
  | { type: 'UPDATE_INTEGRATION_SETTINGS'; payload: Partial<IntegrationSettings> }
  | { type: 'SET_SETTINGS_CONFIG'; payload: { category: string; settings: SettingsConfig[] } }
  | { type: 'SET_UNSAVED_CHANGES'; payload: boolean }
  | { type: 'RESET_SETTINGS' }

interface SettingsContextValue {
  state: SettingsState
  
  // Actions
  setScope: (scope: SettingsScope, scopeId?: number) => void
  loadUserPreferences: () => Promise<void>
  updateUserPreferences: (updates: Partial<UserPreferences>) => Promise<void>
  loadLocationSettings: (locationId: number) => Promise<void>
  updateLocationSettings: (locationId: number, updates: Partial<LocationSettings>) => Promise<void>
  loadNotificationSettings: (scope: SettingsScope, scopeId?: number) => Promise<void>
  updateNotificationSettings: (scope: SettingsScope, updates: Partial<NotificationSettings>, scopeId?: number) => Promise<void>
  loadAccessibilitySettings: () => Promise<void>
  updateAccessibilitySettings: (updates: Partial<AccessibilitySettings>) => Promise<void>
  loadIntegrationSettings: (scope: SettingsScope, scopeId?: number) => Promise<void>
  updateIntegrationSettings: (scope: SettingsScope, updates: Partial<IntegrationSettings>, scopeId?: number) => Promise<void>
  loadSettingsConfig: (scope: SettingsScope, category?: SettingsCategory, scopeId?: number) => Promise<void>
  applyTemplate: (templateId: number, scope: SettingsScope, scopeId?: number) => Promise<void>
  exportSettings: (scope: SettingsScope, scopeId?: number) => Promise<any>
  importSettings: (data: any, overwrite?: boolean) => Promise<void>
  resetSettings: () => void
  
  // Computed values
  getCurrentTheme: () => 'light' | 'dark' | 'auto' | 'high_contrast'
  getCurrentLocale: () => string
  getEffectiveSettings: <T>(key: keyof SettingsState) => T | null
}

// Initial state
const initialState: SettingsState = {
  userPreferences: null,
  locationSettings: null,
  notificationSettings: null,
  accessibilitySettings: null,
  integrationSettings: null,
  settingsConfig: {},
  isLoading: false,
  error: null,
  hasUnsavedChanges: false,
  currentScope: SettingsScope.USER,
  currentScopeId: undefined
}

// Reducer
function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }
      
    case 'SET_SCOPE':
      return { 
        ...state, 
        currentScope: action.payload.scope,
        currentScopeId: action.payload.scopeId
      }
      
    case 'SET_USER_PREFERENCES':
      return { ...state, userPreferences: action.payload, hasUnsavedChanges: false }
      
    case 'UPDATE_USER_PREFERENCES':
      return {
        ...state,
        userPreferences: state.userPreferences ? { ...state.userPreferences, ...action.payload } : null,
        hasUnsavedChanges: true
      }
      
    case 'SET_LOCATION_SETTINGS':
      return { ...state, locationSettings: action.payload, hasUnsavedChanges: false }
      
    case 'UPDATE_LOCATION_SETTINGS':
      return {
        ...state,
        locationSettings: state.locationSettings ? { ...state.locationSettings, ...action.payload } : null,
        hasUnsavedChanges: true
      }
      
    case 'SET_NOTIFICATION_SETTINGS':
      return { ...state, notificationSettings: action.payload, hasUnsavedChanges: false }
      
    case 'UPDATE_NOTIFICATION_SETTINGS':
      return {
        ...state,
        notificationSettings: state.notificationSettings ? { ...state.notificationSettings, ...action.payload } : null,
        hasUnsavedChanges: true
      }
      
    case 'SET_ACCESSIBILITY_SETTINGS':
      return { ...state, accessibilitySettings: action.payload, hasUnsavedChanges: false }
      
    case 'UPDATE_ACCESSIBILITY_SETTINGS':
      return {
        ...state,
        accessibilitySettings: state.accessibilitySettings ? { ...state.accessibilitySettings, ...action.payload } : null,
        hasUnsavedChanges: true
      }
      
    case 'SET_INTEGRATION_SETTINGS':
      return { ...state, integrationSettings: action.payload, hasUnsavedChanges: false }
      
    case 'UPDATE_INTEGRATION_SETTINGS':
      return {
        ...state,
        integrationSettings: state.integrationSettings ? { ...state.integrationSettings, ...action.payload } : null,
        hasUnsavedChanges: true
      }
      
    case 'SET_SETTINGS_CONFIG':
      return {
        ...state,
        settingsConfig: {
          ...state.settingsConfig,
          [action.payload.category]: action.payload.settings
        }
      }
      
    case 'SET_UNSAVED_CHANGES':
      return { ...state, hasUnsavedChanges: action.payload }
      
    case 'RESET_SETTINGS':
      return { ...initialState, currentScope: state.currentScope, currentScopeId: state.currentScopeId }
      
    default:
      return state
  }
}

// Context
const SettingsContext = createContext<SettingsContextValue | null>(null)

// Provider component
interface SettingsProviderProps {
  children: React.ReactNode
  initialScope?: SettingsScope
  initialScopeId?: number
}

export function SettingsProvider({ 
  children, 
  initialScope = SettingsScope.USER,
  initialScopeId 
}: SettingsProviderProps) {
  const [state, dispatch] = useReducer(settingsReducer, {
    ...initialState,
    currentScope: initialScope,
    currentScopeId: initialScopeId
  })

  // Set scope
  const setScope = useCallback((scope: SettingsScope, scopeId?: number) => {
    dispatch({ type: 'SET_SCOPE', payload: { scope, scopeId } })
  }, [])

  // Load user preferences
  const loadUserPreferences = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const preferences = await settingsApi.getUserPreferences()
      dispatch({ type: 'SET_USER_PREFERENCES', payload: preferences })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load user preferences' })
      console.error('Failed to load user preferences:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Update user preferences
  const updateUserPreferences = useCallback(async (updates: Partial<UserPreferences>) => {
    try {
      await settingsApi.updateUserPreferences(updates)
      dispatch({ type: 'UPDATE_USER_PREFERENCES', payload: updates })
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update user preferences' })
      console.error('Failed to update user preferences:', error)
    }
  }, [])

  // Load location settings
  const loadLocationSettings = useCallback(async (locationId: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const settings = await settingsApi.getLocationSettings(locationId)
      dispatch({ type: 'SET_LOCATION_SETTINGS', payload: settings })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load location settings' })
      console.error('Failed to load location settings:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Update location settings
  const updateLocationSettings = useCallback(async (locationId: number, updates: Partial<LocationSettings>) => {
    try {
      await settingsApi.updateLocationSettings(locationId, updates)
      dispatch({ type: 'UPDATE_LOCATION_SETTINGS', payload: updates })
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update location settings' })
      console.error('Failed to update location settings:', error)
    }
  }, [])

  // Load notification settings
  const loadNotificationSettings = useCallback(async (scope: SettingsScope, scopeId?: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const settings = await settingsApi.getNotificationSettings(scope, scopeId)
      dispatch({ type: 'SET_NOTIFICATION_SETTINGS', payload: settings })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load notification settings' })
      console.error('Failed to load notification settings:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Update notification settings
  const updateNotificationSettings = useCallback(async (
    scope: SettingsScope, 
    updates: Partial<NotificationSettings>, 
    scopeId?: number
  ) => {
    try {
      await settingsApi.updateNotificationSettings(scope, updates, scopeId)
      dispatch({ type: 'UPDATE_NOTIFICATION_SETTINGS', payload: updates })
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update notification settings' })
      console.error('Failed to update notification settings:', error)
    }
  }, [])

  // Load accessibility settings
  const loadAccessibilitySettings = useCallback(async () => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const settings = await settingsApi.getAccessibilitySettings()
      dispatch({ type: 'SET_ACCESSIBILITY_SETTINGS', payload: settings })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load accessibility settings' })
      console.error('Failed to load accessibility settings:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Update accessibility settings
  const updateAccessibilitySettings = useCallback(async (updates: Partial<AccessibilitySettings>) => {
    try {
      await settingsApi.updateAccessibilitySettings(updates)
      dispatch({ type: 'UPDATE_ACCESSIBILITY_SETTINGS', payload: updates })
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update accessibility settings' })
      console.error('Failed to update accessibility settings:', error)
    }
  }, [])

  // Load integration settings
  const loadIntegrationSettings = useCallback(async (scope: SettingsScope, scopeId?: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const settings = await settingsApi.getIntegrationSettings(scope, scopeId)
      dispatch({ type: 'SET_INTEGRATION_SETTINGS', payload: settings })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load integration settings' })
      console.error('Failed to load integration settings:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Update integration settings
  const updateIntegrationSettings = useCallback(async (
    scope: SettingsScope,
    updates: Partial<IntegrationSettings>,
    scopeId?: number
  ) => {
    try {
      await settingsApi.updateIntegrationSettings(scope, updates, scopeId)
      dispatch({ type: 'UPDATE_INTEGRATION_SETTINGS', payload: updates })
      dispatch({ type: 'SET_UNSAVED_CHANGES', payload: false })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to update integration settings' })
      console.error('Failed to update integration settings:', error)
    }
  }, [])

  // Load settings config
  const loadSettingsConfig = useCallback(async (
    scope: SettingsScope,
    category?: SettingsCategory,
    scopeId?: number
  ) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      const settings = await settingsApi.getConfig(scope, scopeId, category)
      const categoryKey = category || 'all'
      dispatch({ type: 'SET_SETTINGS_CONFIG', payload: { category: categoryKey, settings } })
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load settings configuration' })
      console.error('Failed to load settings configuration:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [])

  // Apply template
  const applyTemplate = useCallback(async (templateId: number, scope: SettingsScope, scopeId?: number) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      await settingsApi.applyTemplate(templateId, scope, scopeId)
      
      // Reload relevant settings after applying template
      if (scope === SettingsScope.USER) {
        await loadUserPreferences()
      } else if (scope === SettingsScope.LOCATION && scopeId) {
        await loadLocationSettings(scopeId)
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to apply template' })
      console.error('Failed to apply template:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [loadUserPreferences, loadLocationSettings])

  // Export settings
  const exportSettings = useCallback(async (scope: SettingsScope, scopeId?: number) => {
    try {
      return await settingsApi.exportSettings(scope, scopeId)
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to export settings' })
      console.error('Failed to export settings:', error)
      throw error
    }
  }, [])

  // Import settings
  const importSettings = useCallback(async (data: any, overwrite = false) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true })
      await settingsApi.importSettings(data, overwrite)
      
      // Reload settings after import
      const scope = data.scope as SettingsScope
      const scopeId = data.scope_id
      
      if (scope === SettingsScope.USER) {
        await loadUserPreferences()
      } else if (scope === SettingsScope.LOCATION && scopeId) {
        await loadLocationSettings(scopeId)
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to import settings' })
      console.error('Failed to import settings:', error)
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false })
    }
  }, [loadUserPreferences, loadLocationSettings])

  // Reset settings
  const resetSettings = useCallback(() => {
    dispatch({ type: 'RESET_SETTINGS' })
  }, [])

  // Computed values
  const getCurrentTheme = useCallback((): 'light' | 'dark' | 'auto' | 'high_contrast' => {
    if (!state.userPreferences) return 'dark'
    
    switch (state.userPreferences.theme_mode) {
      case ThemeMode.LIGHT:
        return 'light'
      case ThemeMode.DARK:
        return 'dark'
      case ThemeMode.AUTO:
        return 'auto'
      case ThemeMode.HIGH_CONTRAST:
        return 'high_contrast'
      default:
        return 'dark'
    }
  }, [state.userPreferences])

  const getCurrentLocale = useCallback((): string => {
    if (!state.userPreferences) return 'en-US'
    
    // Build locale from date format and timezone
    const dateFormat = state.userPreferences.date_format
    const region = state.userPreferences.timezone.split('/')[1] || 'US'
    
    switch (dateFormat) {
      case DateFormat.EUROPEAN:
        return 'en-GB'
      case DateFormat.ISO:
        return 'en-ISO'
      default:
        return `en-${region}`
    }
  }, [state.userPreferences])

  const getEffectiveSettings = useCallback(<T extends any>(key: keyof SettingsState): T | null => {
    return state[key] as T | null
  }, [state])

  // Auto-load user preferences on mount
  useEffect(() => {
    if (state.currentScope === SettingsScope.USER) {
      loadUserPreferences()
    }
  }, [state.currentScope, loadUserPreferences])

  // Auto-load location settings when scope changes
  useEffect(() => {
    if (state.currentScope === SettingsScope.LOCATION && state.currentScopeId) {
      loadLocationSettings(state.currentScopeId)
    }
  }, [state.currentScope, state.currentScopeId, loadLocationSettings])

  // Apply theme changes to document
  useEffect(() => {
    if (state.userPreferences) {
      const theme = getCurrentTheme()
      const root = document.documentElement
      
      // Apply theme class
      root.className = root.className.replace(/\btheme-\w+\b/g, '')
      root.classList.add(`theme-${theme}`)
      
      // Apply custom CSS variables
      root.style.setProperty('--primary-color', state.userPreferences.theme_color)
      root.style.setProperty('--font-size-base', state.userPreferences.font_size)
      
      // Apply accessibility settings
      if (state.accessibilitySettings) {
        if (state.accessibilitySettings.cognitive_settings.reduce_motion) {
          root.style.setProperty('--animation-duration', '0s')
        }
        
        if (state.accessibilitySettings.contrast_settings.high_contrast) {
          root.classList.add('high-contrast')
        }
      }
    }
  }, [state.userPreferences, state.accessibilitySettings, getCurrentTheme])

  const contextValue: SettingsContextValue = {
    state,
    setScope,
    loadUserPreferences,
    updateUserPreferences,
    loadLocationSettings,
    updateLocationSettings,
    loadNotificationSettings,
    updateNotificationSettings,
    loadAccessibilitySettings,
    updateAccessibilitySettings,
    loadIntegrationSettings,
    updateIntegrationSettings,
    loadSettingsConfig,
    applyTemplate,
    exportSettings,
    importSettings,
    resetSettings,
    getCurrentTheme,
    getCurrentLocale,
    getEffectiveSettings
  }

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  )
}

// Hook to use settings context
export function useSettings() {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

// Specialized hooks for specific settings
export function useUserPreferences() {
  const { state, loadUserPreferences, updateUserPreferences } = useSettings()
  
  return {
    preferences: state.userPreferences,
    isLoading: state.isLoading,
    error: state.error,
    loadPreferences: loadUserPreferences,
    updatePreferences: updateUserPreferences
  }
}

export function useTheme() {
  const { state, getCurrentTheme } = useSettings()
  
  return {
    theme: getCurrentTheme(),
    themeColor: state.userPreferences?.theme_color || '#8b5cf6',
    fontSize: state.userPreferences?.font_size || FontSize.MEDIUM,
    highContrast: state.userPreferences?.high_contrast_mode || false
  }
}

export function useCalendarPreferences() {
  const { state } = useSettings()
  
  return {
    defaultView: state.userPreferences?.default_view || CalendarView.WEEK,
    showWeekends: state.userPreferences?.show_weekends ?? true,
    timeFormat: state.userPreferences?.time_format || TimeFormat.TWELVE_HOUR,
    dateFormat: state.userPreferences?.date_format || DateFormat.US,
    timezone: state.userPreferences?.timezone || 'America/New_York',
    startWeekOn: state.userPreferences?.start_week_on || 1
  }
}

export function useAccessibilitySettings() {
  const { state, loadAccessibilitySettings, updateAccessibilitySettings } = useSettings()
  
  return {
    settings: state.accessibilitySettings,
    isLoading: state.isLoading,
    error: state.error,
    loadSettings: loadAccessibilitySettings,
    updateSettings: updateAccessibilitySettings
  }
}

export default SettingsProvider