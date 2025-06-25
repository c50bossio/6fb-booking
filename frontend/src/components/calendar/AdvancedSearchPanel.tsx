'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ClockIcon,
  TagIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  BookmarkIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import {
  CalendarAppointment,
  Barber,
  Service
} from './RobustCalendar'
import {
  searchService,
  AdvancedSearchQuery,
  SearchResult
} from '@/services/searchService'
import SearchSuggestions from './SearchSuggestions'
import FilterPresets from './FilterPresets'
import { useTheme } from '@/contexts/ThemeContext'

// ===== TYPES =====

interface AdvancedSearchPanelProps {
  appointments: CalendarAppointment[]
  barbers: Barber[]
  services: Service[]
  onSearchResults: (results: SearchResult<CalendarAppointment>[]) => void
  onClose?: () => void
  isOpen?: boolean
  className?: string
}

interface FilterSection {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  expanded: boolean
}

// ===== COMPONENT =====

export default function AdvancedSearchPanel({
  appointments,
  barbers,
  services,
  onSearchResults,
  onClose,
  isOpen = true,
  className = ''
}: AdvancedSearchPanelProps) {
  const { theme, getThemeColors } = useTheme()
  const colors = useMemo(() => getThemeColors(), [theme, getThemeColors])

  // ===== STATE =====

  const [query, setQuery] = useState<AdvancedSearchQuery>({
    query: '',
    operator: 'AND',
    naturalLanguage: true
  })

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['basic'])
  )

  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showPresets, setShowPresets] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])

  // Date range state
  const [dateRangeType, setDateRangeType] = useState<'preset' | 'custom'>('preset')
  const [datePreset, setDatePreset] = useState<string>('')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  // ===== EFFECTS =====

  useEffect(() => {
    // Load recent searches on mount
    setRecentSearches(searchService.getRecentSearches(5))
  }, [])

  useEffect(() => {
    // Debounced search
    const timer = setTimeout(() => {
      if (query.query || hasActiveFilters()) {
        performSearch()
      } else {
        // Reset to show all appointments when no filters
        onSearchResults(appointments.map(item => ({ item })))
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, appointments])

  // ===== HELPERS =====

  const hasActiveFilters = (): boolean => {
    return !!(
      query.barberIds?.length ||
      query.serviceIds?.length ||
      query.statuses?.length ||
      query.paymentStatuses?.length ||
      query.dateRange?.start ||
      query.priceRange ||
      query.durationRange ||
      query.tags?.length
    )
  }

  const performSearch = useCallback(async () => {
    setIsSearching(true)

    try {
      const results = searchService.searchAppointments(appointments, query, {
        fuzzyThreshold: 0.3,
        sortByRelevance: true,
        includeScore: true
      })

      onSearchResults(results)

      // Update recent searches if there's a text query
      if (query.query && query.query.trim()) {
        setRecentSearches(searchService.getRecentSearches(5))
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setIsSearching(false)
    }
  }, [appointments, query, onSearchResults])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  const clearAllFilters = () => {
    setQuery({
      query: '',
      operator: 'AND',
      naturalLanguage: true
    })
    setDatePreset('')
    setCustomStartDate('')
    setCustomEndDate('')
    setDateRangeType('preset')
  }

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset)
    setDateRangeType('preset')

    // Apply date range based on preset
    const naturalLanguageQuery = `appointments ${preset}`
    const parsed = searchService['parseNaturalLanguage'](naturalLanguageQuery)

    setQuery(prev => ({
      ...prev,
      dateRange: parsed.dateRange
    }))
  }

  const handleCustomDateChange = () => {
    if (customStartDate && customEndDate) {
      setQuery(prev => ({
        ...prev,
        dateRange: {
          start: new Date(customStartDate),
          end: new Date(customEndDate)
        }
      }))
    }
  }

  const handlePresetSelect = (preset: AdvancedSearchQuery) => {
    setQuery(preset)
    setShowPresets(false)
  }

  // ===== RENDER SECTIONS =====

  const renderBasicSearch = () => (
    <div className="space-y-4">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5"
                             style={{ color: colors.textSecondary }} />
        <input
          type="text"
          value={query.query || ''}
          onChange={(e) => setQuery(prev => ({ ...prev, query: e.target.value }))}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Search appointments, clients, services..."
          className="w-full pl-10 pr-4 py-3 rounded-lg border transition-all focus:ring-2 focus:ring-violet-500"
          style={{
            backgroundColor: colors.cardBackground,
            borderColor: colors.border,
            color: colors.textPrimary
          }}
        />

        {query.query && (
          <button
            onClick={() => setQuery(prev => ({ ...prev, query: '' }))}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" style={{ color: colors.textSecondary }} />
          </button>
        )}
      </div>

      {/* Natural Language Toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={query.naturalLanguage}
            onChange={(e) => setQuery(prev => ({ ...prev, naturalLanguage: e.target.checked }))}
            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          <span className="text-sm flex items-center space-x-1" style={{ color: colors.textSecondary }}>
            <SparklesIcon className="h-4 w-4" />
            <span>Natural language search</span>
          </span>
        </label>

        <div className="flex items-center space-x-2">
          <span className="text-sm" style={{ color: colors.textSecondary }}>Operator:</span>
          <select
            value={query.operator}
            onChange={(e) => setQuery(prev => ({ ...prev, operator: e.target.value as 'AND' | 'OR' }))}
            className="text-sm px-2 py-1 rounded border"
            style={{
              backgroundColor: colors.cardBackground,
              borderColor: colors.border,
              color: colors.textPrimary
            }}
          >
            <option value="AND">AND</option>
            <option value="OR">OR</option>
          </select>
        </div>
      </div>

      {/* Recent Searches */}
      {recentSearches.length > 0 && !query.query && (
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: colors.textSecondary }}>
            Recent searches:
          </p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((search, index) => (
              <button
                key={index}
                onClick={() => setQuery(prev => ({ ...prev, query: search }))}
                className="px-3 py-1 text-sm rounded-full border hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                style={{ borderColor: colors.border }}
              >
                {search}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search Suggestions */}
      <AnimatePresence>
        {showSuggestions && query.query && (
          <SearchSuggestions
            query={query.query || ''}
            appointments={appointments}
            barbers={barbers}
            services={services}
            onSelect={(suggestion) => {
              setQuery(prev => ({ ...prev, query: suggestion }))
              setShowSuggestions(false)
            }}
            onClose={() => setShowSuggestions(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )

  const renderBarberFilter = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {barbers.map(barber => (
          <label key={barber.id} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={query.barberIds?.includes(barber.id) || false}
              onChange={(e) => {
                const newBarberIds = e.target.checked
                  ? [...(query.barberIds || []), barber.id]
                  : (query.barberIds || []).filter(id => id !== barber.id)
                setQuery(prev => ({ ...prev, barberIds: newBarberIds }))
              }}
              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span className="text-sm" style={{ color: colors.textPrimary }}>
              {barber.name}
            </span>
            {barber.color && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: barber.color }}
              />
            )}
          </label>
        ))}
      </div>
    </div>
  )

  const renderServiceFilter = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
        {services.map(service => (
          <label key={service.id} className="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={query.serviceIds?.includes(service.id) || false}
                onChange={(e) => {
                  const newServiceIds = e.target.checked
                    ? [...(query.serviceIds || []), service.id]
                    : (query.serviceIds || []).filter(id => id !== service.id)
                  setQuery(prev => ({ ...prev, serviceIds: newServiceIds }))
                }}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className="text-sm" style={{ color: colors.textPrimary }}>
                {service.name}
              </span>
            </div>
            <span className="text-sm" style={{ color: colors.textSecondary }}>
              ${service.price}
            </span>
          </label>
        ))}
      </div>
    </div>
  )

  const renderStatusFilter = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: 'confirmed', label: 'Confirmed', color: 'bg-green-100 text-green-800' },
          { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
          { value: 'completed', label: 'Completed', color: 'bg-blue-100 text-blue-800' },
          { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
          { value: 'no_show', label: 'No Show', color: 'bg-gray-100 text-gray-800' }
        ].map(status => (
          <label key={status.value} className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={query.statuses?.includes(status.value) || false}
              onChange={(e) => {
                const newStatuses = e.target.checked
                  ? [...(query.statuses || []), status.value]
                  : (query.statuses || []).filter(s => s !== status.value)
                setQuery(prev => ({ ...prev, statuses: newStatuses }))
              }}
              className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
            />
            <span className={`text-sm px-2 py-0.5 rounded ${status.color}`}>
              {status.label}
            </span>
          </label>
        ))}
      </div>

      {/* Payment Status */}
      <div className="pt-3 border-t" style={{ borderColor: colors.border }}>
        <p className="text-sm font-medium mb-2" style={{ color: colors.textSecondary }}>
          Payment Status
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'paid', label: 'Paid', color: 'text-green-600' },
            { value: 'unpaid', label: 'Unpaid', color: 'text-red-600' },
            { value: 'partial', label: 'Partial', color: 'text-yellow-600' },
            { value: 'refunded', label: 'Refunded', color: 'text-purple-600' }
          ].map(paymentStatus => (
            <label key={paymentStatus.value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={query.paymentStatuses?.includes(paymentStatus.value) || false}
                onChange={(e) => {
                  const newPaymentStatuses = e.target.checked
                    ? [...(query.paymentStatuses || []), paymentStatus.value]
                    : (query.paymentStatuses || []).filter(s => s !== paymentStatus.value)
                  setQuery(prev => ({ ...prev, paymentStatuses: newPaymentStatuses }))
                }}
                className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
              />
              <span className={`text-sm ${paymentStatus.color}`}>
                {paymentStatus.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )

  const renderDateFilter = () => (
    <div className="space-y-4">
      {/* Date Range Type Toggle */}
      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: colors.border }}>
        <button
          onClick={() => setDateRangeType('preset')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            dateRangeType === 'preset' ? 'bg-violet-600 text-white' : ''
          }`}
          style={{
            backgroundColor: dateRangeType === 'preset' ? undefined : colors.cardBackground,
            color: dateRangeType === 'preset' ? undefined : colors.textPrimary
          }}
        >
          Preset Ranges
        </button>
        <button
          onClick={() => setDateRangeType('custom')}
          className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
            dateRangeType === 'custom' ? 'bg-violet-600 text-white' : ''
          }`}
          style={{
            backgroundColor: dateRangeType === 'custom' ? undefined : colors.cardBackground,
            color: dateRangeType === 'custom' ? undefined : colors.textPrimary
          }}
        >
          Custom Range
        </button>
      </div>

      {dateRangeType === 'preset' ? (
        <div className="grid grid-cols-2 gap-2">
          {[
            'today', 'tomorrow', 'this week', 'next week',
            'last week', 'this month', 'next month', 'last month'
          ].map(preset => (
            <button
              key={preset}
              onClick={() => handleDatePresetChange(preset)}
              className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                datePreset === preset ? 'bg-violet-600 text-white border-violet-600' : ''
              }`}
              style={{
                borderColor: datePreset === preset ? undefined : colors.border,
                backgroundColor: datePreset === preset ? undefined : colors.cardBackground,
                color: datePreset === preset ? undefined : colors.textPrimary
              }}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
              Start Date
            </label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value)
                handleCustomDateChange()
              }}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
              End Date
            </label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value)
                handleCustomDateChange()
              }}
              className="w-full px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
            />
          </div>
        </div>
      )}
    </div>
  )

  const renderPriceFilter = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
            Min Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm"
                  style={{ color: colors.textSecondary }}>$</span>
            <input
              type="number"
              min="0"
              value={query.priceRange?.min || 0}
              onChange={(e) => setQuery(prev => ({
                ...prev,
                priceRange: {
                  min: parseInt(e.target.value) || 0,
                  max: prev.priceRange?.max || 1000
                }
              }))}
              className="w-full pl-8 pr-3 py-2 rounded-lg border"
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
            />
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
            Max Price
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm"
                  style={{ color: colors.textSecondary }}>$</span>
            <input
              type="number"
              min="0"
              value={query.priceRange?.max || 1000}
              onChange={(e) => setQuery(prev => ({
                ...prev,
                priceRange: {
                  min: prev.priceRange?.min || 0,
                  max: parseInt(e.target.value) || 1000
                }
              }))}
              className="w-full pl-8 pr-3 py-2 rounded-lg border"
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
            />
          </div>
        </div>
      </div>

      {/* Price Range Slider */}
      <div className="px-2">
        <input
          type="range"
          min="0"
          max="500"
          value={query.priceRange?.min || 0}
          onChange={(e) => setQuery(prev => ({
            ...prev,
            priceRange: {
              min: parseInt(e.target.value),
              max: Math.max(parseInt(e.target.value), prev.priceRange?.max || 1000)
            }
          }))}
          className="w-full accent-violet-600"
        />
        <div className="flex justify-between text-xs mt-1" style={{ color: colors.textSecondary }}>
          <span>$0</span>
          <span>$500+</span>
        </div>
      </div>
    </div>
  )

  const renderDurationFilter = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-3">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
            Min Duration
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="15"
              value={query.durationRange?.min || 0}
              onChange={(e) => setQuery(prev => ({
                ...prev,
                durationRange: {
                  min: parseInt(e.target.value) || 0,
                  max: prev.durationRange?.max || 180
                }
              }))}
              className="w-full pr-12 px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm"
                  style={{ color: colors.textSecondary }}>min</span>
          </div>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium mb-1" style={{ color: colors.textSecondary }}>
            Max Duration
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="15"
              value={query.durationRange?.max || 180}
              onChange={(e) => setQuery(prev => ({
                ...prev,
                durationRange: {
                  min: prev.durationRange?.min || 0,
                  max: parseInt(e.target.value) || 180
                }
              }))}
              className="w-full pr-12 px-3 py-2 rounded-lg border"
              style={{
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
                color: colors.textPrimary
              }}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm"
                  style={{ color: colors.textSecondary }}>min</span>
          </div>
        </div>
      </div>

      {/* Quick Duration Buttons */}
      <div className="grid grid-cols-4 gap-2">
        {[30, 45, 60, 90].map(duration => (
          <button
            key={duration}
            onClick={() => setQuery(prev => ({
              ...prev,
              durationRange: { min: duration, max: duration }
            }))}
            className="px-2 py-1 text-sm rounded border hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
            style={{ borderColor: colors.border }}
          >
            {duration} min
          </button>
        ))}
      </div>
    </div>
  )

  // ===== MAIN RENDER =====

  const sections: FilterSection[] = [
    { id: 'basic', label: 'Search', icon: MagnifyingGlassIcon, expanded: true },
    { id: 'barbers', label: 'Barbers', icon: ({ className }) => <div className={className}>👤</div>, expanded: false },
    { id: 'services', label: 'Services', icon: ({ className }) => <div className={className}>✂️</div>, expanded: false },
    { id: 'status', label: 'Status', icon: ({ className }) => <div className={className}>📋</div>, expanded: false },
    { id: 'date', label: 'Date Range', icon: CalendarDaysIcon, expanded: false },
    { id: 'price', label: 'Price Range', icon: CurrencyDollarIcon, expanded: false },
    { id: 'duration', label: 'Duration', icon: ClockIcon, expanded: false }
  ]

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`rounded-lg shadow-lg border overflow-hidden ${className}`}
      style={{
        backgroundColor: colors.cardBackground,
        borderColor: colors.border
      }}
    >
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between"
           style={{ borderColor: colors.border }}>
        <div className="flex items-center space-x-3">
          <FunnelIcon className="h-5 w-5 text-violet-600" />
          <h3 className="text-lg font-semibold" style={{ color: colors.textPrimary }}>
            Advanced Search & Filters
          </h3>
          {hasActiveFilters() && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/20">
              {Object.values(query).filter(v =>
                v && (Array.isArray(v) ? v.length > 0 : true)
              ).length} active
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Filter Presets"
          >
            <BookmarkIcon className="h-4 w-4" style={{ color: colors.textSecondary }} />
          </button>

          {hasActiveFilters() && (
            <button
              onClick={clearAllFilters}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Clear All Filters"
            >
              <ArrowPathIcon className="h-4 w-4" style={{ color: colors.textSecondary }} />
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" style={{ color: colors.textSecondary }} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Presets */}
      <AnimatePresence>
        {showPresets && (
          <FilterPresets
            currentQuery={query}
            onSelectPreset={handlePresetSelect}
            onClose={() => setShowPresets(false)}
          />
        )}
      </AnimatePresence>

      {/* Sections */}
      <div className="max-h-[600px] overflow-y-auto">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section.id)
          const Icon = section.icon

          return (
            <div key={section.id} className="border-b last:border-b-0"
                 style={{ borderColor: colors.border }}>
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="h-5 w-5" style={{ color: colors.textSecondary }} />
                  <span className="font-medium" style={{ color: colors.textPrimary }}>
                    {section.label}
                  </span>
                </div>
                <ChevronDownIcon
                  className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  style={{ color: colors.textSecondary }}
                />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 pb-4 overflow-hidden"
                  >
                    {section.id === 'basic' && renderBasicSearch()}
                    {section.id === 'barbers' && renderBarberFilter()}
                    {section.id === 'services' && renderServiceFilter()}
                    {section.id === 'status' && renderStatusFilter()}
                    {section.id === 'date' && renderDateFilter()}
                    {section.id === 'price' && renderPriceFilter()}
                    {section.id === 'duration' && renderDurationFilter()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Footer with search stats */}
      {isSearching && (
        <div className="p-3 border-t flex items-center justify-center space-x-2"
             style={{ borderColor: colors.border }}>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-600"></div>
          <span className="text-sm" style={{ color: colors.textSecondary }}>
            Searching...
          </span>
        </div>
      )}
    </motion.div>
  )
}
