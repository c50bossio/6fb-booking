'use client'

import React, { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  ClockIcon,
  UserIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  TagIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { CalendarAppointment, Barber, Service } from './RobustCalendar'
import { searchService } from '@/services/searchService'
import { useTheme } from '@/contexts/ThemeContext'

// ===== TYPES =====

interface SearchSuggestionsProps {
  query: string
  appointments: CalendarAppointment[]
  barbers: Barber[]
  services: Service[]
  onSelect: (suggestion: string) => void
  onClose: () => void
  maxSuggestions?: number
}

interface Suggestion {
  type: 'text' | 'client' | 'barber' | 'service' | 'date' | 'status' | 'natural'
  value: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  metadata?: any
}

// ===== COMPONENT =====

export default function SearchSuggestions({
  query,
  appointments,
  barbers,
  services,
  onSelect,
  onClose,
  maxSuggestions = 8
}: SearchSuggestionsProps) {
  const { theme, getThemeColors } = useTheme()
  const colors = getThemeColors()

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)

  // ===== SUGGESTION GENERATION =====

  const generateSuggestions = useMemo(() => {
    const allSuggestions: Suggestion[] = []
    const lowerQuery = query.toLowerCase()

    if (!query.trim()) return []

    // Natural language suggestions
    const naturalLanguagePatterns = [
      { pattern: 'today', label: 'Today\'s appointments' },
      { pattern: 'tomorrow', label: 'Tomorrow\'s appointments' },
      { pattern: 'this week', label: 'This week\'s appointments' },
      { pattern: 'next week', label: 'Next week\'s appointments' },
      { pattern: 'confirmed', label: 'Confirmed appointments' },
      { pattern: 'pending', label: 'Pending appointments' },
      { pattern: 'paid', label: 'Paid appointments' },
      { pattern: 'unpaid', label: 'Unpaid appointments' }
    ]

    naturalLanguagePatterns.forEach(({ pattern, label }) => {
      if (pattern.includes(lowerQuery) || lowerQuery.includes(pattern)) {
        allSuggestions.push({
          type: 'natural',
          value: pattern,
          label,
          icon: SparklesIcon
        })
      }
    })

    // Client suggestions
    const clientNames = new Set<string>()
    appointments.forEach(apt => {
      if (apt.client.toLowerCase().includes(lowerQuery)) {
        clientNames.add(apt.client)
      }
    })

    Array.from(clientNames).slice(0, 3).forEach(client => {
      allSuggestions.push({
        type: 'client',
        value: client,
        label: `Client: ${client}`,
        icon: UserIcon
      })
    })

    // Barber suggestions
    barbers.forEach(barber => {
      if (barber.name.toLowerCase().includes(lowerQuery)) {
        allSuggestions.push({
          type: 'barber',
          value: barber.name,
          label: `Barber: ${barber.name}`,
          icon: ({ className }) => <div className={className}>✂️</div>,
          metadata: barber
        })
      }
    })

    // Service suggestions
    services.forEach(service => {
      if (service.name.toLowerCase().includes(lowerQuery)) {
        allSuggestions.push({
          type: 'service',
          value: service.name,
          label: `${service.name} ($${service.price})`,
          icon: ({ className }) => <div className={className}>💈</div>,
          metadata: service
        })
      }
    })

    // Date suggestions
    const datePatterns = [
      { value: 'today', label: 'Today' },
      { value: 'tomorrow', label: 'Tomorrow' },
      { value: 'this week', label: 'This week' },
      { value: 'next week', label: 'Next week' },
      { value: 'this month', label: 'This month' }
    ]

    datePatterns.forEach(({ value, label }) => {
      if (value.includes(lowerQuery)) {
        allSuggestions.push({
          type: 'date',
          value,
          label: `Date: ${label}`,
          icon: CalendarDaysIcon
        })
      }
    })

    // Status suggestions
    const statuses = [
      { value: 'confirmed', label: 'Confirmed', color: 'text-green-600' },
      { value: 'pending', label: 'Pending', color: 'text-yellow-600' },
      { value: 'completed', label: 'Completed', color: 'text-blue-600' },
      { value: 'cancelled', label: 'Cancelled', color: 'text-red-600' }
    ]

    statuses.forEach(({ value, label, color }) => {
      if (value.includes(lowerQuery)) {
        allSuggestions.push({
          type: 'status',
          value,
          label: `Status: ${label}`,
          icon: ({ className }) => (
            <TagIcon className={`${className} ${color}`} />
          )
        })
      }
    })

    // Price range suggestions
    if (lowerQuery.includes('$') || lowerQuery.match(/\d+/)) {
      const priceMatch = lowerQuery.match(/\$?(\d+)/)
      if (priceMatch) {
        const price = parseInt(priceMatch[1])
        allSuggestions.push({
          type: 'text',
          value: `under $${price}`,
          label: `Price under $${price}`,
          icon: CurrencyDollarIcon
        })
        allSuggestions.push({
          type: 'text',
          value: `over $${price}`,
          label: `Price over $${price}`,
          icon: CurrencyDollarIcon
        })
      }
    }

    // Remove duplicates and limit
    const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) =>
      index === self.findIndex(s => s.value === suggestion.value)
    )

    return uniqueSuggestions.slice(0, maxSuggestions)
  }, [query, appointments, barbers, services, maxSuggestions])

  useEffect(() => {
    setSuggestions(generateSuggestions)
    setSelectedIndex(0)
  }, [generateSuggestions])

  // ===== KEYBOARD NAVIGATION =====

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          )
          break

        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          )
          break

        case 'Enter':
          e.preventDefault()
          if (suggestions[selectedIndex]) {
            onSelect(suggestions[selectedIndex].value)
          }
          break

        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [suggestions, selectedIndex, onSelect, onClose])

  // ===== RENDER =====

  if (suggestions.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border overflow-hidden"
      style={{
        backgroundColor: colors.cardBackground,
        borderColor: colors.border
      }}
    >
      <div className="max-h-80 overflow-y-auto">
        {suggestions.map((suggestion, index) => {
          const Icon = suggestion.icon
          const isSelected = index === selectedIndex

          return (
            <motion.button
              key={`${suggestion.type}-${suggestion.value}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelect(suggestion.value)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-4 py-3 flex items-center space-x-3 transition-colors ${
                isSelected
                  ? 'bg-violet-50 dark:bg-violet-900/20'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <Icon className="h-5 w-5 flex-shrink-0"
                    style={{ color: isSelected ? '#8b5cf6' : colors.textSecondary }} />

              <div className="flex-1 text-left">
                <div className="flex items-center space-x-2">
                  <span className="font-medium" style={{ color: colors.textPrimary }}>
                    {suggestion.label}
                  </span>
                  {suggestion.type === 'natural' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30">
                      Smart
                    </span>
                  )}
                </div>

                {suggestion.metadata && (
                  <div className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                    {suggestion.type === 'service' && suggestion.metadata.duration && (
                      <span>{suggestion.metadata.duration} min</span>
                    )}
                    {suggestion.type === 'barber' && suggestion.metadata.specialties && (
                      <span>{suggestion.metadata.specialties.join(', ')}</span>
                    )}
                  </div>
                )}
              </div>

              {isSelected && (
                <div className="flex items-center space-x-1 text-xs"
                     style={{ color: colors.textSecondary }}>
                  <span>Press</span>
                  <kbd className="px-1.5 py-0.5 rounded border"
                       style={{ borderColor: colors.border, backgroundColor: colors.background }}>
                    Enter
                  </kbd>
                </div>
              )}
            </motion.button>
          )
        })}
      </div>

      <div className="px-4 py-2 border-t flex items-center justify-between text-xs"
           style={{ borderColor: colors.border, color: colors.textSecondary }}>
        <div className="flex items-center space-x-2">
          <kbd className="px-1.5 py-0.5 rounded border"
               style={{ borderColor: colors.border, backgroundColor: colors.background }}>
            ↑↓
          </kbd>
          <span>Navigate</span>
        </div>
        <div className="flex items-center space-x-2">
          <kbd className="px-1.5 py-0.5 rounded border"
               style={{ borderColor: colors.border, backgroundColor: colors.background }}>
            Esc
          </kbd>
          <span>Close</span>
        </div>
      </div>
    </motion.div>
  )
}
