'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { 
  BuildingOfficeIcon, 
  ChevronDownIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useThemeStyles } from '@/hooks/useTheme'
import { VirtualizedLocationList } from './VirtualizedLocationList'

export interface Location {
  id: string
  name: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  phoneNumber?: string
  email?: string
  isActive: boolean
  // Quick stats for preview
  stats?: {
    activeBarbers?: number
    todayBookings?: number
    weekRevenue?: number
    occupancyRate?: number
  }
  // Hierarchy
  enterpriseId?: string
  enterpriseName?: string
}

interface LocationSelectorProps {
  locations: Location[]
  currentLocationId?: string
  onLocationChange: (location: Location) => void
  showStats?: boolean
  searchable?: boolean
  groupByEnterprise?: boolean
  placeholder?: string
  className?: string
  dropdownClassName?: string
  compact?: boolean
}

export function LocationSelector({
  locations,
  currentLocationId,
  onLocationChange,
  showStats = true,
  searchable = true,
  groupByEnterprise = false,
  placeholder = 'Select location',
  className = '',
  dropdownClassName = '',
  compact = false
}: LocationSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { colors } = useThemeStyles()

  // Get current location
  const currentLocation = useMemo(
    () => locations.find(loc => loc.id === currentLocationId),
    [locations, currentLocationId]
  )

  // Filter locations based on search
  const filteredLocations = useMemo(() => {
    if (!searchQuery) return locations
    
    const query = searchQuery.toLowerCase()
    return locations.filter(location => 
      location.name.toLowerCase().includes(query) ||
      location.city?.toLowerCase().includes(query) ||
      location.state?.toLowerCase().includes(query) ||
      location.address?.toLowerCase().includes(query)
    )
  }, [locations, searchQuery])

  // Group locations by enterprise if needed
  const groupedLocations = useMemo(() => {
    if (!groupByEnterprise) return { '': filteredLocations }
    
    return filteredLocations.reduce((groups, location) => {
      const key = location.enterpriseName || 'Independent'
      if (!groups[key]) groups[key] = []
      groups[key].push(location)
      return groups
    }, {} as Record<string, Location[]>)
  }, [filteredLocations, groupByEnterprise])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen, searchable])

  const handleLocationSelect = (location: Location) => {
    onLocationChange(location)
    setIsOpen(false)
    setSearchQuery('')
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value?: number) => {
    if (!value) return '0%'
    return `${Math.round(value)}%`
  }

  // Keyboard navigation handler
  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault()
        setIsOpen(!isOpen)
        break
      case 'Escape':
        if (isOpen) {
          setIsOpen(false)
          buttonRef.current?.focus()
        }
        break
      case 'ArrowDown':
        if (!isOpen) {
          setIsOpen(true)
        }
        break
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Select location. Current: ${currentLocation?.name || 'None selected'}`}
        className={`
          flex items-center justify-between w-full
          ${compact ? 'px-3 py-2' : 'px-4 py-3'}
          bg-white dark:bg-zinc-800 
          border ${colors.border.default}
          rounded-ios-lg
          hover:border-primary-400 dark:hover:border-primary-500
          focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
          transition-all duration-300 ease-out
          transform hover:scale-[1.01] active:scale-[0.99]
          ${isOpen ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-lg' : 'shadow-sm hover:shadow-md'}
        `}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <BuildingOfficeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
          <div className="text-left min-w-0">
            <div className="font-medium text-gray-900 dark:text-white truncate">
              {currentLocation?.name || placeholder}
            </div>
            {currentLocation?.city && !compact && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {currentLocation.city}, {currentLocation.state}
              </div>
            )}
          </div>
        </div>
        <ChevronDownIcon 
          className={`
            w-5 h-5 text-gray-400 transition-all duration-300 ease-out flex-shrink-0 ml-2
            ${isOpen ? 'rotate-180 text-primary-500' : 'group-hover:text-gray-600'}
          `}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Location options"
          className={`
            absolute z-50 mt-2 w-full min-w-[300px] max-w-[90vw]
            bg-white dark:bg-zinc-800
            border ${colors.border.default}
            rounded-ios-xl shadow-2xl
            overflow-hidden
            animate-in slide-in-from-top-2 fade-in-0 duration-300
            ${dropdownClassName}
          `}
          style={{ 
            maxHeight: '400px',
            left: window.innerWidth < 640 ? '-50%' : '0'
          }}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-zinc-900/50">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 transition-colors duration-200" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search locations..."
                  aria-label="Search locations"
                  autoComplete="off"
                  className={`
                    w-full pl-10 pr-10 py-2.5
                    bg-white dark:bg-zinc-800
                    border ${colors.border.default}
                    rounded-ios
                    text-sm text-gray-900 dark:text-white
                    placeholder:text-gray-500 dark:placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                    transition-all duration-200
                    hover:border-gray-300 dark:hover:border-gray-600
                  `}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    aria-label="Clear search"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Location List */}
          {filteredLocations.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <MapPinIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No locations found</p>
              {searchQuery && (
                <p className="text-xs mt-1">Try adjusting your search terms</p>
              )}
            </div>
          ) : groupByEnterprise ? (
            <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
              {Object.entries(groupedLocations).map(([groupName, groupLocations]) => (
                <div key={groupName}>
                  {groupName && (
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-zinc-900">
                      {groupName}
                    </div>
                  )}
                  <VirtualizedLocationList
                    locations={groupLocations}
                    currentLocationId={currentLocationId}
                    onLocationSelect={handleLocationSelect}
                    showStats={showStats}
                    hoveredLocationId={hoveredLocationId}
                    setHoveredLocationId={setHoveredLocationId}
                    maxHeight={320}
                  />
                </div>
              ))}
            </div>
          ) : (
            <VirtualizedLocationList
              locations={filteredLocations}
              currentLocationId={currentLocationId}
              onLocationSelect={handleLocationSelect}
              showStats={showStats}
              hoveredLocationId={hoveredLocationId}
              setHoveredLocationId={setHoveredLocationId}
              maxHeight={320}
            />
          )}

          {/* Footer with count */}
          {locations.length > 5 && (
            <div className="px-4 py-2 text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900">
              <span className="font-medium">{filteredLocations.length}</span> of <span className="font-medium">{locations.length}</span> locations
              {searchQuery && (
                <span className="ml-2 text-primary-600 dark:text-primary-400">
                  (filtered)
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Compact version for header/navigation bars
export function CompactLocationSelector(props: LocationSelectorProps) {
  return <LocationSelector {...props} compact={true} showStats={false} />
}