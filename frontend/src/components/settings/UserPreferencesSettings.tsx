'use client'

import React, { useState, useEffect } from 'react'
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  EyeIcon,
  CalendarDaysIcon,
  ClockIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  Squares2X2Icon,
  BellIcon,
  KeyboardIcon,
  ArrowPathIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

import {
  SettingsScope,
  ThemeMode,
  CalendarView,
  TimeFormat,
  DateFormat,
  FontSize,
  settingsApi,
  type UserPreferences,
  type UserPreferencesUpdateRequest
} from '@/lib/api/settings'

interface UserPreferencesSettingsProps {
  scope: SettingsScope
  scopeId?: number
  theme?: 'light' | 'dark'
  onSettingsChange?: (hasChanges: boolean) => void
}

interface SettingsGroup {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: 'theme',
    title: 'Theme & Appearance',
    description: 'Customize the visual appearance of your workspace',
    icon: PaintBrushIcon
  },
  {
    id: 'calendar',
    title: 'Calendar Preferences',
    description: 'Default views and calendar behavior',
    icon: CalendarDaysIcon
  },
  {
    id: 'time',
    title: 'Time & Date Format',
    description: 'How dates and times are displayed',
    icon: ClockIcon
  },
  {
    id: 'layout',
    title: 'Layout & Navigation',
    description: 'Workspace layout and navigation preferences',
    icon: Squares2X2Icon
  },
  {
    id: 'notifications',
    title: 'Notification Preferences',
    description: 'Control when and how you receive notifications',
    icon: BellIcon
  },
  {
    id: 'productivity',
    title: 'Productivity Features',
    description: 'Shortcuts, animations, and performance settings',
    icon: KeyboardIcon
  }
]

const THEME_OPTIONS = [
  { value: ThemeMode.LIGHT, label: 'Light', icon: SunIcon, description: 'Clean, bright interface' },
  { value: ThemeMode.DARK, label: 'Dark', icon: MoonIcon, description: 'Easy on the eyes' },
  { value: ThemeMode.AUTO, label: 'Auto', icon: ComputerDesktopIcon, description: 'Follows system setting' },
  { value: ThemeMode.HIGH_CONTRAST, label: 'High Contrast', icon: EyeIcon, description: 'Maximum accessibility' }
]

const CALENDAR_VIEW_OPTIONS = [
  { value: CalendarView.DAY, label: 'Day View', description: 'Focus on a single day' },
  { value: CalendarView.WEEK, label: 'Week View', description: 'See the entire week' },
  { value: CalendarView.MONTH, label: 'Month View', description: 'Monthly overview' },
  { value: CalendarView.AGENDA, label: 'Agenda View', description: 'List of upcoming appointments' }
]

const TIME_FORMAT_OPTIONS = [
  { value: TimeFormat.TWELVE_HOUR, label: '12-hour (2:30 PM)', description: 'Standard format' },
  { value: TimeFormat.TWENTY_FOUR_HOUR, label: '24-hour (14:30)', description: 'Military time' }
]

const DATE_FORMAT_OPTIONS = [
  { value: DateFormat.US, label: 'MM/DD/YYYY', description: 'US format' },
  { value: DateFormat.EUROPEAN, label: 'DD/MM/YYYY', description: 'European format' },
  { value: DateFormat.ISO, label: 'YYYY-MM-DD', description: 'ISO standard' },
  { value: DateFormat.RELATIVE, label: 'Relative (Today, Tomorrow)', description: 'Natural language' }
]

const FONT_SIZE_OPTIONS = [
  { value: FontSize.SMALL, label: 'Small', description: 'Compact text' },
  { value: FontSize.MEDIUM, label: 'Medium', description: 'Standard size' },
  { value: FontSize.LARGE, label: 'Large', description: 'Easier to read' },
  { value: FontSize.X_LARGE, label: 'Extra Large', description: 'Maximum readability' }
]

const THEME_COLORS = [
  { value: '#8b5cf6', label: 'Violet', color: 'bg-violet-500' },
  { value: '#3b82f6', label: 'Blue', color: 'bg-blue-500' },
  { value: '#10b981', label: 'Emerald', color: 'bg-emerald-500' },
  { value: '#f59e0b', label: 'Amber', color: 'bg-amber-500' },
  { value: '#ef4444', label: 'Red', color: 'bg-red-500' },
  { value: '#ec4899', label: 'Pink', color: 'bg-pink-500' },
  { value: '#8b5a2b', label: 'Brown', color: 'bg-amber-800' },
  { value: '#64748b', label: 'Slate', color: 'bg-slate-500' }
]

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Phoenix', label: 'Arizona Time' },
  { value: 'America/Anchorage', label: 'Alaska Time' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time' },
  { value: 'UTC', label: 'Coordinated Universal Time (UTC)' }
]

export function UserPreferencesSettings({
  scope,
  scopeId,
  theme = 'dark',
  onSettingsChange
}: UserPreferencesSettingsProps) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [originalPreferences, setOriginalPreferences] = useState<UserPreferences | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeGroup, setActiveGroup] = useState('theme')
  const [customShortcuts, setCustomShortcuts] = useState<Record<string, string>>({})

  useEffect(() => {
    loadPreferences()
  }, [])

  useEffect(() => {
    const hasChanges = preferences && originalPreferences &&
      JSON.stringify(preferences) !== JSON.stringify(originalPreferences)
    onSettingsChange?.(!!hasChanges)
  }, [preferences, originalPreferences, onSettingsChange])

  const loadPreferences = async () => {
    try {
      setIsLoading(true)
      const data = await settingsApi.getUserPreferences()
      setPreferences(data)
      setOriginalPreferences(data)
      setCustomShortcuts(data.keyboard_shortcuts || {})
    } catch (error) {
      console.error('Failed to load preferences:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    if (!preferences) return

    setPreferences({
      ...preferences,
      [key]: value
    })
  }

  const handleSave = async () => {
    if (!preferences || !originalPreferences) return

    try {
      setIsSaving(true)

      // Calculate what changed
      const updates: UserPreferencesUpdateRequest = {}
      Object.keys(preferences).forEach((key) => {
        const prefKey = key as keyof UserPreferences
        if (preferences[prefKey] !== originalPreferences[prefKey]) {
          // @ts-ignore - Dynamic key assignment
          updates[prefKey] = preferences[prefKey]
        }
      })

      await settingsApi.updateUserPreferences(updates)
      setOriginalPreferences(preferences)

    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    if (originalPreferences) {
      setPreferences(originalPreferences)
      setCustomShortcuts(originalPreferences.keyboard_shortcuts || {})
    }
  }

  const handleAddShortcut = (action: string, keys: string) => {
    const newShortcuts = { ...customShortcuts, [action]: keys }
    setCustomShortcuts(newShortcuts)
    updatePreference('keyboard_shortcuts', newShortcuts)
  }

  const handleRemoveShortcut = (action: string) => {
    const newShortcuts = { ...customShortcuts }
    delete newShortcuts[action]
    setCustomShortcuts(newShortcuts)
    updatePreference('keyboard_shortcuts', newShortcuts)
  }

  const renderSettingsGroup = () => {
    if (!preferences) return null

    switch (activeGroup) {
      case 'theme':
        return (
          <div className="space-y-6">
            {/* Theme Mode */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Theme Mode
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon
                  const isSelected = preferences.theme_mode === option.value

                  return (
                    <button
                      key={option.value}
                      onClick={() => updatePreference('theme_mode', option.value)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                          : theme === 'dark'
                            ? 'border-gray-700 bg-gray-800 hover:border-gray-600'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`h-5 w-5 ${
                          isSelected ? 'text-violet-600' : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`} />
                        <div className="text-left">
                          <div className={`text-sm font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>
                            {option.label}
                          </div>
                          <div className={`text-xs ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {option.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Theme Color */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Accent Color
              </h4>
              <div className="flex flex-wrap gap-2">
                {THEME_COLORS.map((color) => {
                  const isSelected = preferences.theme_color === color.value

                  return (
                    <button
                      key={color.value}
                      onClick={() => updatePreference('theme_color', color.value)}
                      className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-white shadow-lg' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.label}
                    >
                      {isSelected && <CheckIcon className="h-5 w-5 text-white" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Font Size
              </h4>
              <div className="space-y-2">
                {FONT_SIZE_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="font-size"
                      value={option.value}
                      checked={preferences.font_size === option.value}
                      onChange={() => updatePreference('font_size', option.value)}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <div className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </div>
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* High Contrast */}
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.high_contrast_mode}
                  onChange={(e) => updatePreference('high_contrast_mode', e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <div>
                  <div className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    High Contrast Mode
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Increases contrast for better visibility
                  </div>
                </div>
              </label>
            </div>
          </div>
        )

      case 'calendar':
        return (
          <div className="space-y-6">
            {/* Default View */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Default Calendar View
              </h4>
              <div className="space-y-2">
                {CALENDAR_VIEW_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="default-view"
                      value={option.value}
                      checked={preferences.default_view === option.value}
                      onChange={() => updatePreference('default_view', option.value)}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <div className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </div>
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Show Weekends */}
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.show_weekends}
                  onChange={(e) => updatePreference('show_weekends', e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <div>
                  <div className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Show Weekends
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Display Saturday and Sunday in week view
                  </div>
                </div>
              </label>
            </div>

            {/* Week Start Day */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Week Starts On
              </h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => updatePreference('start_week_on', 0)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    preferences.start_week_on === 0
                      ? 'bg-violet-600 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Sunday
                </button>
                <button
                  onClick={() => updatePreference('start_week_on', 1)}
                  className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                    preferences.start_week_on === 1
                      ? 'bg-violet-600 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Monday
                </button>
              </div>
            </div>
          </div>
        )

      case 'time':
        return (
          <div className="space-y-6">
            {/* Time Format */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Time Format
              </h4>
              <div className="space-y-2">
                {TIME_FORMAT_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="time-format"
                      value={option.value}
                      checked={preferences.time_format === option.value}
                      onChange={() => updatePreference('time_format', option.value)}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <div className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </div>
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Format */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Date Format
              </h4>
              <div className="space-y-2">
                {DATE_FORMAT_OPTIONS.map((option) => (
                  <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="radio"
                      name="date-format"
                      value={option.value}
                      checked={preferences.date_format === option.value}
                      onChange={() => updatePreference('date_format', option.value)}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <div className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {option.label}
                      </div>
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Timezone */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Timezone
              </h4>
              <select
                value={preferences.timezone}
                onChange={(e) => updatePreference('timezone', e.target.value)}
                className={`w-full px-3 py-2 text-sm rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white focus:border-violet-500'
                    : 'bg-white border-gray-300 text-gray-900 focus:border-violet-500'
                }`}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )

      case 'layout':
        return (
          <div className="space-y-6">
            {/* Sidebar Collapsed */}
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.sidebar_collapsed}
                  onChange={(e) => updatePreference('sidebar_collapsed', e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <div>
                  <div className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Collapse Sidebar by Default
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Start with a collapsed navigation sidebar
                  </div>
                </div>
              </label>
            </div>

            {/* Panel Layout */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Panel Layout
              </h4>
              <div className="space-y-2">
                {Object.entries({
                  left: 'Left Panel',
                  right: 'Right Panel',
                  bottom: 'Bottom Panel'
                }).map(([key, label]) => (
                  <label key={key} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.panel_layout[key as keyof typeof preferences.panel_layout]}
                      onChange={(e) => updatePreference('panel_layout', {
                        ...preferences.panel_layout,
                        [key]: e.target.checked
                      })}
                      className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className={`text-sm ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                      Show {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )

      case 'notifications':
        return (
          <div className="space-y-6">
            {/* Desktop Notifications */}
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.desktop_notifications}
                  onChange={(e) => updatePreference('desktop_notifications', e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <div>
                  <div className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Desktop Notifications
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Show browser notifications for important events
                  </div>
                </div>
              </label>
            </div>
          </div>
        )

      case 'productivity':
        return (
          <div className="space-y-6">
            {/* Enable Animations */}
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.enable_animations}
                  onChange={(e) => updatePreference('enable_animations', e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <div>
                  <div className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Enable Animations
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Show smooth transitions and animations
                  </div>
                </div>
              </label>
            </div>

            {/* Reduce Motion */}
            <div>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.reduce_motion}
                  onChange={(e) => updatePreference('reduce_motion', e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <div>
                  <div className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                    Reduce Motion
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Minimize animations for accessibility
                  </div>
                </div>
              </label>
            </div>

            {/* Keyboard Shortcuts */}
            <div>
              <h4 className={`text-sm font-medium mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                Custom Keyboard Shortcuts
              </h4>
              <div className="space-y-3">
                {Object.entries(customShortcuts).map(([action, keys]) => (
                  <div key={action} className={`flex items-center justify-between p-3 rounded-lg border ${
                    theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div>
                      <div className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        {action}
                      </div>
                      <div className={`text-xs ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {keys}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveShortcut(action)}
                      className={`text-xs px-3 py-1 rounded transition-colors ${
                        theme === 'dark'
                          ? 'text-red-400 hover:bg-red-900/20'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {Object.keys(customShortcuts).length === 0 && (
                  <div className={`text-sm text-center py-8 ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    No custom shortcuts configured
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    )
  }

  if (!preferences) {
    return (
      <div className="text-center py-12">
        <div className={`text-lg font-medium mb-2 ${
          theme === 'dark' ? 'text-white' : 'text-gray-900'
        }`}>
          Failed to load preferences
        </div>
        <button
          onClick={loadPreferences}
          className="text-violet-600 hover:text-violet-700 text-sm"
        >
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Settings Groups Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {SETTINGS_GROUPS.map((group) => {
          const Icon = group.icon
          const isActive = activeGroup === group.id

          return (
            <button
              key={group.id}
              onClick={() => setActiveGroup(group.id)}
              className={`p-3 text-left rounded-lg transition-all ${
                isActive
                  ? 'bg-violet-600 text-white'
                  : theme === 'dark'
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{group.title}</div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Active Settings Group */}
      <div className={`p-6 rounded-lg border ${
        theme === 'dark'
          ? 'border-gray-700 bg-gray-800/50'
          : 'border-gray-200 bg-gray-50/50'
      }`}>
        <div className="mb-4">
          <h3 className={`text-lg font-semibold ${
            theme === 'dark' ? 'text-white' : 'text-gray-900'
          }`}>
            {SETTINGS_GROUPS.find(g => g.id === activeGroup)?.title}
          </h3>
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {SETTINGS_GROUPS.find(g => g.id === activeGroup)?.description}
          </p>
        </div>

        {renderSettingsGroup()}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleReset}
          disabled={!preferences || JSON.stringify(preferences) === JSON.stringify(originalPreferences)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            theme === 'dark'
              ? 'text-gray-300 hover:text-white hover:bg-gray-700 disabled:opacity-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 disabled:opacity-50'
          }`}
        >
          <ArrowPathIcon className="h-4 w-4 mr-2 inline" />
          Reset Changes
        </button>

        <button
          onClick={handleSave}
          disabled={isSaving || !preferences || JSON.stringify(preferences) === JSON.stringify(originalPreferences)}
          className="px-6 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <ArrowPathIcon className="h-4 w-4 mr-2 inline animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckIcon className="h-4 w-4 mr-2 inline" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </div>
  )
}
