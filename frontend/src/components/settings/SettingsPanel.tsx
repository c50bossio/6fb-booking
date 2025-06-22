'use client'

import React, { useState, useEffect } from 'react'
import {
  Cog6ToothIcon,
  UserIcon,
  BuildingOfficeIcon,
  BellIcon,
  EyeIcon,
  CogIcon,
  ShieldCheckIcon,
  PuzzlePieceIcon,
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

import { UserPreferencesSettings } from './UserPreferencesSettings'
import { BusinessConfigSettings } from './BusinessConfigSettings'
import { DisplayOptionsSettings } from './DisplayOptionsSettings'
import { BookingRulesSettings } from './BookingRulesSettings'
import { NotificationSettings } from './NotificationSettings'
import { AccessibilitySettings } from './AccessibilitySettings'
import { IntegrationSettings } from './IntegrationSettings'
import { SecuritySettings } from './SecuritySettings'
import { SettingsTemplates } from './SettingsTemplates'

import {
  SettingsScope,
  SettingsCategory,
  settingsApi,
  type UserPreferences,
  type LocationSettings,
  type SettingsTemplate
} from '@/lib/api/settings'

interface SettingsPanelProps {
  isOpen: boolean
  onClose: () => void
  scope: SettingsScope
  scopeId?: number
  title?: string
  className?: string
  theme?: 'light' | 'dark'
}

interface SettingsSection {
  id: SettingsCategory
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  component: React.ComponentType<any>
  requiredPermission?: string
  isAdvanced?: boolean
}

const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: SettingsCategory.USER_EXPERIENCE,
    title: 'User Experience',
    description: 'Theme, layout, and personal preferences',
    icon: UserIcon,
    component: UserPreferencesSettings
  },
  {
    id: SettingsCategory.BUSINESS_CONFIG,
    title: 'Business Configuration',
    description: 'Hours, booking rules, and operational settings',
    icon: BuildingOfficeIcon,
    component: BusinessConfigSettings,
    requiredPermission: 'manage_locations'
  },
  {
    id: SettingsCategory.DISPLAY_OPTIONS,
    title: 'Display Options',
    description: 'Calendar views, colors, and information density',
    icon: EyeIcon,
    component: DisplayOptionsSettings
  },
  {
    id: SettingsCategory.BOOKING_RULES,
    title: 'Booking Rules',
    description: 'Advance booking, cancellation policies, and restrictions',
    icon: CogIcon,
    component: BookingRulesSettings,
    requiredPermission: 'manage_locations'
  },
  {
    id: SettingsCategory.NOTIFICATION,
    title: 'Notifications',
    description: 'Email, SMS, and in-app notification preferences',
    icon: BellIcon,
    component: NotificationSettings
  },
  {
    id: SettingsCategory.ACCESSIBILITY,
    title: 'Accessibility',
    description: 'Font sizes, contrast, and assistive features',
    icon: EyeIcon,
    component: AccessibilitySettings
  },
  {
    id: SettingsCategory.INTEGRATION,
    title: 'Integrations',
    description: 'Calendar sync, payments, and third-party services',
    icon: PuzzlePieceIcon,
    component: IntegrationSettings,
    requiredPermission: 'manage_integrations',
    isAdvanced: true
  },
  {
    id: SettingsCategory.SECURITY,
    title: 'Security',
    description: 'Authentication, permissions, and audit settings',
    icon: ShieldCheckIcon,
    component: SecuritySettings,
    requiredPermission: 'manage_security',
    isAdvanced: true
  }
]

export function SettingsPanel({
  isOpen,
  onClose,
  scope,
  scopeId,
  title,
  className = '',
  theme = 'dark'
}: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<SettingsCategory>(SettingsCategory.USER_EXPERIENCE)
  const [searchQuery, setSearchQuery] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [availableTemplates, setAvailableTemplates] = useState<SettingsTemplate[]>([])
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // Load templates when panel opens
  useEffect(() => {
    if (isOpen && scope !== SettingsScope.USER) {
      loadTemplates()
    }
  }, [isOpen, scope])

  const loadTemplates = async () => {
    try {
      const templates = await settingsApi.getTemplates()
      setAvailableTemplates(templates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const handleApplyTemplate = async (templateId: number) => {
    try {
      setIsLoading(true)
      await settingsApi.applyTemplate(templateId, scope, scopeId)

      setNotification({
        type: 'success',
        message: 'Settings template applied successfully'
      })

      // Reset notification after 3 seconds
      setTimeout(() => setNotification(null), 3000)

    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to apply template'
      })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsLoading(false)
      setShowTemplates(false)
    }
  }

  const handleExportSettings = async () => {
    try {
      setIsLoading(true)
      const exportData = await settingsApi.exportSettings(scope, scopeId)

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `settings-${scope}-${scopeId || 'global'}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setNotification({
        type: 'success',
        message: 'Settings exported successfully'
      })
      setTimeout(() => setNotification(null), 3000)

    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to export settings'
      })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const handleImportSettings = async (file: File) => {
    try {
      setIsLoading(true)
      const fileContent = await file.text()
      const importData = JSON.parse(fileContent)

      const result = await settingsApi.importSettings(importData, false)

      setNotification({
        type: result.errors.length > 0 ? 'info' : 'success',
        message: `Imported ${result.imported_count} settings${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`
      })
      setTimeout(() => setNotification(null), 3000)

    } catch (error) {
      setNotification({
        type: 'error',
        message: 'Failed to import settings'
      })
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredSections = SETTINGS_SECTIONS.filter(section => {
    if (!showAdvanced && section.isAdvanced) return false
    if (searchQuery) {
      return section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
             section.description.toLowerCase().includes(searchQuery.toLowerCase())
    }
    return true
  })

  const ActiveComponent = SETTINGS_SECTIONS.find(s => s.id === activeSection)?.component

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 overflow-hidden ${className}`}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`absolute right-0 top-0 h-full w-full max-w-6xl flex ${
        theme === 'dark'
          ? 'bg-gray-900 border-gray-700'
          : 'bg-white border-gray-200'
      } border-l shadow-2xl`}>

        {/* Sidebar */}
        <div className={`w-80 flex-shrink-0 border-r ${
          theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
        }`}>
          {/* Header */}
          <div className={`p-6 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Cog6ToothIcon className={`h-6 w-6 ${
                  theme === 'dark' ? 'text-violet-400' : 'text-violet-600'
                }`} />
                <h2 className={`text-xl font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {title || 'Settings'}
                </h2>
              </div>
              <button
                onClick={onClose}
                className={`p-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search settings..."
                className={`w-full pl-10 pr-4 py-2 text-sm rounded-lg border transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-violet-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-violet-500'
                }`}
              />
              <MagnifyingGlassIcon className={`absolute left-3 top-2.5 h-4 w-4 ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`} />
            </div>
          </div>

          {/* Quick Actions */}
          {scope !== SettingsScope.USER && (
            <div className={`p-4 border-b ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowTemplates(true)}
                  className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Templates
                </button>
                <button
                  onClick={handleExportSettings}
                  disabled={isLoading}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                </button>
                <label className={`px-3 py-2 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                  <DocumentArrowUpIcon className="h-4 w-4" />
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleImportSettings(file)
                    }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Settings Sections */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              {filteredSections.map((section) => {
                const Icon = section.icon
                const isActive = activeSection === section.id

                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full p-3 text-left rounded-lg transition-all duration-200 group ${
                      isActive
                        ? theme === 'dark'
                          ? 'bg-violet-600 text-white'
                          : 'bg-violet-600 text-white'
                        : theme === 'dark'
                          ? 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`h-5 w-5 flex-shrink-0 ${
                        isActive ? 'text-white' : 'text-current'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {section.title}
                        </div>
                        <div className={`text-xs truncate ${
                          isActive
                            ? 'text-violet-100'
                            : theme === 'dark'
                              ? 'text-gray-400'
                              : 'text-gray-500'
                        }`}>
                          {section.description}
                        </div>
                      </div>
                      <ChevronRightIcon className={`h-4 w-4 transition-transform ${
                        isActive ? 'rotate-90' : 'group-hover:translate-x-1'
                      }`} />
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Advanced Toggle */}
            <div className={`p-4 border-t ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAdvanced}
                  onChange={(e) => setShowAdvanced(e.target.checked)}
                  className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className={`text-sm ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Show advanced settings
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Content Header */}
          <div className={`p-6 border-b ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`text-lg font-semibold ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>
                  {SETTINGS_SECTIONS.find(s => s.id === activeSection)?.title}
                </h3>
                <p className={`text-sm mt-1 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {SETTINGS_SECTIONS.find(s => s.id === activeSection)?.description}
                </p>
              </div>

              {hasUnsavedChanges && (
                <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium ${
                  theme === 'dark'
                    ? 'bg-amber-900/20 text-amber-400'
                    : 'bg-amber-50 text-amber-700'
                }`}>
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  <span>Unsaved changes</span>
                </div>
              )}
            </div>
          </div>

          {/* Notification */}
          {notification && (
            <div className={`mx-6 mt-4 p-4 rounded-lg flex items-center space-x-3 ${
              notification.type === 'success'
                ? theme === 'dark'
                  ? 'bg-emerald-900/20 text-emerald-400 border border-emerald-800'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : notification.type === 'error'
                  ? theme === 'dark'
                    ? 'bg-red-900/20 text-red-400 border border-red-800'
                    : 'bg-red-50 text-red-700 border border-red-200'
                  : theme === 'dark'
                    ? 'bg-blue-900/20 text-blue-400 border border-blue-800'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <CheckIcon className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{notification.message}</span>
            </div>
          )}

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {ActiveComponent && (
              <ActiveComponent
                scope={scope}
                scopeId={scopeId}
                theme={theme}
                onSettingsChange={(hasChanges: boolean) => setHasUnsavedChanges(hasChanges)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Templates Modal */}
      {showTemplates && (
        <SettingsTemplates
          isOpen={showTemplates}
          onClose={() => setShowTemplates(false)}
          templates={availableTemplates}
          onApplyTemplate={handleApplyTemplate}
          isLoading={isLoading}
          theme={theme}
        />
      )}
    </div>
  )
}
