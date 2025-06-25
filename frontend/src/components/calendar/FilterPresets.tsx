'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BookmarkIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  StarIcon
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import { AdvancedSearchQuery } from '@/services/searchService'
import { useTheme } from '@/contexts/ThemeContext'

// ===== TYPES =====

interface FilterPreset {
  id: string
  name: string
  description: string
  query: AdvancedSearchQuery
  icon?: string
  color?: string
  isDefault?: boolean
  createdAt: Date
  usageCount: number
}

interface FilterPresetsProps {
  currentQuery: AdvancedSearchQuery
  onSelectPreset: (preset: AdvancedSearchQuery) => void
  onClose: () => void
}

// ===== DEFAULT PRESETS =====

const defaultPresets: FilterPreset[] = [
  {
    id: 'today-confirmed',
    name: 'Today\'s Confirmed',
    description: 'All confirmed appointments for today',
    query: {
      query: 'today',
      statuses: ['confirmed'],
      naturalLanguage: true,
      operator: 'AND'
    },
    icon: '✅',
    color: 'bg-green-100 text-green-600',
    isDefault: true,
    createdAt: new Date(),
    usageCount: 0
  },
  {
    id: 'pending-payments',
    name: 'Pending Payments',
    description: 'Appointments with unpaid or partial payments',
    query: {
      paymentStatuses: ['unpaid', 'partial'],
      operator: 'OR'
    },
    icon: '💰',
    color: 'bg-yellow-100 text-yellow-600',
    isDefault: true,
    createdAt: new Date(),
    usageCount: 0
  },
  {
    id: 'this-week-high-value',
    name: 'High Value This Week',
    description: 'Services over $75 scheduled this week',
    query: {
      query: 'this week',
      priceRange: { min: 75, max: 999 },
      naturalLanguage: true,
      operator: 'AND'
    },
    icon: '💎',
    color: 'bg-purple-100 text-purple-600',
    isDefault: true,
    createdAt: new Date(),
    usageCount: 0
  },
  {
    id: 'no-shows-cancellations',
    name: 'No Shows & Cancellations',
    description: 'Track missed appointments',
    query: {
      statuses: ['no_show', 'cancelled'],
      operator: 'OR'
    },
    icon: '🚫',
    color: 'bg-red-100 text-red-600',
    isDefault: true,
    createdAt: new Date(),
    usageCount: 0
  },
  {
    id: 'premium-services',
    name: 'Premium Services',
    description: 'Long duration premium appointments',
    query: {
      durationRange: { min: 60, max: 180 },
      priceRange: { min: 80, max: 999 },
      operator: 'AND'
    },
    icon: '⭐',
    color: 'bg-violet-100 text-violet-600',
    isDefault: true,
    createdAt: new Date(),
    usageCount: 0
  }
]

// ===== COMPONENT =====

export default function FilterPresets({
  currentQuery,
  onSelectPreset,
  onClose
}: FilterPresetsProps) {
  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()

  const [presets, setPresets] = useState<FilterPreset[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newPresetName, setNewPresetName] = useState('')
  const [newPresetDescription, setNewPresetDescription] = useState('')
  const [selectedIcon, setSelectedIcon] = useState('🔍')

  const availableIcons = ['🔍', '📅', '💰', '⭐', '🎯', '📊', '🏆', '💎', '🚀', '📌']

  // ===== EFFECTS =====

  useEffect(() => {
    loadPresets()
  }, [])

  // ===== HELPERS =====

  const loadPresets = () => {
    // Load from localStorage
    const savedPresets = localStorage.getItem('calendarFilterPresets')
    if (savedPresets) {
      try {
        const parsed = JSON.parse(savedPresets)
        // Merge with default presets
        const merged = [...defaultPresets]
        parsed.forEach((preset: FilterPreset) => {
          if (!preset.isDefault) {
            merged.push({
              ...preset,
              createdAt: new Date(preset.createdAt)
            })
          }
        })
        setPresets(merged)
      } catch (e) {
        setPresets(defaultPresets)
      }
    } else {
      setPresets(defaultPresets)
    }
  }

  const savePresets = (updatedPresets: FilterPreset[]) => {
    // Only save custom presets to localStorage
    const customPresets = updatedPresets.filter(p => !p.isDefault)
    localStorage.setItem('calendarFilterPresets', JSON.stringify(customPresets))
    setPresets(updatedPresets)
  }

  const createPreset = () => {
    if (!newPresetName.trim()) return

    const newPreset: FilterPreset = {
      id: `custom-${Date.now()}`,
      name: newPresetName,
      description: newPresetDescription,
      query: currentQuery,
      icon: selectedIcon,
      color: 'bg-blue-100 text-blue-600',
      isDefault: false,
      createdAt: new Date(),
      usageCount: 0
    }

    const updatedPresets = [...presets, newPreset]
    savePresets(updatedPresets)

    // Reset form
    setIsCreating(false)
    setNewPresetName('')
    setNewPresetDescription('')
    setSelectedIcon('🔍')
  }

  const deletePreset = (id: string) => {
    const updatedPresets = presets.filter(p => p.id !== id)
    savePresets(updatedPresets)
  }

  const updatePresetUsage = (id: string) => {
    const updatedPresets = presets.map(p =>
      p.id === id ? { ...p, usageCount: p.usageCount + 1 } : p
    )
    savePresets(updatedPresets)
  }

  const handleSelectPreset = (preset: FilterPreset) => {
    updatePresetUsage(preset.id)
    onSelectPreset(preset.query)
  }

  const getQuerySummary = (query: AdvancedSearchQuery): string => {
    const parts: string[] = []

    if (query.query) parts.push(`"${query.query}"`)
    if (query.barberIds?.length) parts.push(`${query.barberIds.length} barber(s)`)
    if (query.serviceIds?.length) parts.push(`${query.serviceIds.length} service(s)`)
    if (query.statuses?.length) parts.push(query.statuses.join(', '))
    if (query.paymentStatuses?.length) parts.push(`Payment: ${query.paymentStatuses.join(', ')}`)
    if (query.dateRange?.start) parts.push('Date range')
    if (query.priceRange) parts.push(`$${query.priceRange.min}-$${query.priceRange.max}`)
    if (query.durationRange) parts.push(`${query.durationRange.min}-${query.durationRange.max} min`)

    return parts.length > 0 ? parts.join(' • ') : 'No filters'
  }

  // Sort presets by usage count and then by date
  const sortedPresets = [...presets].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1
    if (!a.isDefault && b.isDefault) return 1
    return b.usageCount - a.usageCount
  })

  // ===== RENDER =====

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="border-y"
      style={{ borderColor: colors.border, backgroundColor: colors.background }}
    >
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center space-x-2" style={{ color: colors.textPrimary }}>
            <BookmarkIcon className="h-5 w-5" />
            <span>Filter Presets</span>
          </h4>

          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center space-x-1 px-3 py-1 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Save Current</span>
          </button>
        </div>

        {/* Create New Preset Form */}
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg border space-y-3"
            style={{ borderColor: colors.border, backgroundColor: colors.cardBackground }}
          >
            <div className="flex items-center space-x-2">
              {/* Icon Selector */}
              <div className="flex space-x-1">
                {availableIcons.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setSelectedIcon(icon)}
                    className={`p-1 rounded transition-colors ${
                      selectedIcon === icon ? 'bg-violet-100 dark:bg-violet-900/30' : ''
                    }`}
                  >
                    <span className="text-lg">{icon}</span>
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset name..."
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
              autoFocus
            />

            <input
              type="text"
              value={newPresetDescription}
              onChange={(e) => setNewPresetDescription(e.target.value)}
              placeholder="Description (optional)..."
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
            />

            <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: colors.background }}>
              <p className="font-medium mb-1" style={{ color: colors.textSecondary }}>
                Current filters:
              </p>
              <p style={{ color: colors.textPrimary }}>
                {getQuerySummary(currentQuery)}
              </p>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  setIsCreating(false)
                  setNewPresetName('')
                  setNewPresetDescription('')
                  setSelectedIcon('🔍')
                }}
                className="px-3 py-1 text-sm rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                style={{ borderColor: colors.border }}
              >
                Cancel
              </button>
              <button
                onClick={createPreset}
                disabled={!newPresetName.trim()}
                className="px-3 py-1 text-sm rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Save Preset
              </button>
            </div>
          </motion.div>
        )}

        {/* Presets List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {sortedPresets.map((preset) => (
            <motion.div
              key={preset.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`group relative p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${
                preset.color || 'bg-gray-100 text-gray-600'
              }`}
              style={{
                borderColor: colors.border,
                backgroundColor: theme === 'dark' || theme === 'charcoal'
                  ? colors.cardBackground
                  : undefined
              }}
              onClick={() => handleSelectPreset(preset)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-2xl">{preset.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium" style={{ color: colors.textPrimary }}>
                        {preset.name}
                      </h5>
                      {preset.isDefault && (
                        <StarIconSolid className="h-4 w-4 text-yellow-500" />
                      )}
                      {preset.usageCount > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700"
                              style={{ color: colors.textSecondary }}>
                          Used {preset.usageCount}x
                        </span>
                      )}
                    </div>
                    {preset.description && (
                      <p className="text-sm mt-1" style={{ color: colors.textSecondary }}>
                        {preset.description}
                      </p>
                    )}
                    <p className="text-xs mt-2" style={{ color: colors.textSecondary }}>
                      {getQuerySummary(preset.query)}
                    </p>
                  </div>
                </div>

                {!preset.isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deletePreset(preset.id)
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                  >
                    <TrashIcon className="h-4 w-4 text-red-500" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {presets.length === 0 && (
          <div className="text-center py-8">
            <BookmarkIcon className="h-12 w-12 mx-auto mb-3" style={{ color: colors.textSecondary }} />
            <p className="text-sm" style={{ color: colors.textSecondary }}>
              No filter presets yet. Create one to save your current filters!
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
