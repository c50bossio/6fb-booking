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

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full
          ${compact ? 'px-3 py-2' : 'px-4 py-3'}
          bg-white dark:bg-zinc-800 
          border ${colors.border.default}
          rounded-ios-lg
          hover:border-primary-400 dark:hover:border-primary-500
          focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
          transition-all duration-200
          ${isOpen ? 'border-primary-500 ring-2 ring-primary-500/20' : ''}
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
            w-5 h-5 text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2
            ${isOpen ? 'rotate-180' : ''}
          `}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className={`
            absolute z-50 mt-2 w-full min-w-[320px]
            bg-white dark:bg-zinc-800
            border ${colors.border.default}
            rounded-ios-xl shadow-ios-xl
            overflow-hidden
            animate-ios-slide-down
            ${dropdownClassName}
          `}
          style={{ maxHeight: '400px' }}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search locations..."
                  className={`
                    w-full pl-10 pr-3 py-2
                    bg-gray-50 dark:bg-zinc-900
                    border ${colors.border.default}
                    rounded-ios
                    text-sm text-gray-900 dark:text-white
                    placeholder:text-gray-500 dark:placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
                    transition-colors duration-200
                  `}
                />
              </div>
            </div>
          )}

          {/* Location List */}
          <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
            {Object.entries(groupedLocations).map(([groupName, groupLocations]) => (
              <div key={groupName}>
                {groupByEnterprise && groupName && (
                  <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-zinc-900">
                    {groupName}
                  </div>
                )}
                
                {groupLocations.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    <MapPinIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No locations found</p>
                  </div>
                ) : (
                  groupLocations.map((location) => (
                    <div
                      key={location.id}
                      onClick={() => handleLocationSelect(location)}
                      onMouseEnter={() => setHoveredLocationId(location.id)}
                      onMouseLeave={() => setHoveredLocationId(null)}
                      className={`
                        relative px-4 py-3 cursor-pointer
                        transition-colors duration-150
                        ${location.id === currentLocationId
                          ? 'bg-primary-50 dark:bg-primary-950/50'
                          : 'hover:bg-gray-50 dark:hover:bg-zinc-700/50'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h4 className={`
                              font-medium truncate
                              ${location.id === currentLocationId
                                ? 'text-primary-700 dark:text-primary-300'
                                : 'text-gray-900 dark:text-white'
                              }
                            `}>
                              {location.name}
                            </h4>
                            {location.id === currentLocationId && (
                              <CheckIcon className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {location.address}
                          </p>
                          
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {location.city}, {location.state} {location.zipCode}
                          </p>
                        </div>

                        {!location.isActive && (
                          <span className="ml-2 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Quick Stats Preview on Hover */}
                      {showStats && location.stats && hoveredLocationId === location.id && (
                        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 animate-ios-fade-in">
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="flex items-center space-x-2">
                              <UserGroupIcon className="w-4 h-4 text-gray-400" />
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Barbers:</span>
                                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                  {location.stats.activeBarbers || 0}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <ChartBarIcon className="w-4 h-4 text-gray-400" />
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Today:</span>
                                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                  {location.stats.todayBookings || 0} bookings
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <CurrencyDollarIcon className="w-4 h-4 text-gray-400" />
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Week:</span>
                                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(location.stats.weekRevenue)}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <div className="w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 relative overflow-hidden">
                                <div 
                                  className="absolute bottom-0 left-0 right-0 bg-primary-500"
                                  style={{ height: `${location.stats.occupancyRate || 0}%` }}
                                />
                              </div>
                              <div>
                                <span className="text-gray-500 dark:text-gray-400">Occupancy:</span>
                                <span className="ml-1 font-medium text-gray-900 dark:text-white">
                                  {formatPercentage(location.stats.occupancyRate)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>

          {/* Footer with count */}
          {locations.length > 5 && (
            <div className="px-4 py-2 text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
              {filteredLocations.length} of {locations.length} locations
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