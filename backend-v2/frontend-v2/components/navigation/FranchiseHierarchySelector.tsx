'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { 
  BuildingOffice2Icon,
  BuildingOfficeIcon, 
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  CheckIcon,
  GlobeAltIcon,
  RectangleGroupIcon
} from '@heroicons/react/24/outline'
import { useThemeStyles } from '@/hooks/useTheme'

export interface FranchiseNetwork {
  id: number
  name: string
  brand: string
  network_type: 'corporate_owned' | 'franchisee_owned' | 'master_franchise' | 'area_development' | 'hybrid'
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'terminated' | 'development'
  total_locations_target: number
  current_locations_count: number
  total_regions?: number
  total_groups?: number
  network_revenue_ytd?: number
}

export interface FranchiseRegion {
  id: number
  network_id: number
  name: string
  code: string
  target_locations: number
  total_groups?: number
  total_locations?: number
  region_revenue_ytd?: number
  compliance_score?: number
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'terminated' | 'development'
}

export interface FranchiseGroup {
  id: number
  region_id: number
  name: string
  code: string
  group_type: string
  status: 'active' | 'inactive' | 'pending' | 'suspended' | 'terminated' | 'development'
  total_locations?: number
  group_revenue_ytd?: number
}

export interface FranchiseLocation {
  id: number
  group_id?: number
  region_id?: number
  network_id?: number
  name: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  phoneNumber?: string
  email?: string
  isActive: boolean
  stats?: {
    activeBarbers?: number
    todayBookings?: number
    weekRevenue?: number
    occupancyRate?: number
  }
}

export interface FranchiseHierarchy {
  network?: FranchiseNetwork
  region?: FranchiseRegion
  group?: FranchiseGroup
  location?: FranchiseLocation
}

interface FranchiseHierarchySelectorProps {
  networks: FranchiseNetwork[]
  regions: FranchiseRegion[]
  groups: FranchiseGroup[]
  locations: FranchiseLocation[]
  currentSelection: FranchiseHierarchy
  onSelectionChange: (selection: FranchiseHierarchy) => void
  level: 'network' | 'region' | 'group' | 'location'
  showStats?: boolean
  searchable?: boolean
  placeholder?: string
  className?: string
  dropdownClassName?: string
  compact?: boolean
  enableRealTime?: boolean
}

export function FranchiseHierarchySelector({
  networks,
  regions,
  groups,
  locations,
  currentSelection,
  onSelectionChange,
  level,
  showStats = true,
  searchable = true,
  placeholder,
  className = '',
  dropdownClassName = '',
  compact = false,
  enableRealTime = false
}: FranchiseHierarchySelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredItemId, setHoveredItemId] = useState<number | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const { colors } = useThemeStyles()

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!enableRealTime) return

    const ws = new WebSocket(
      `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/franchise/hierarchy`
    )

    ws.onopen = () => {
      console.log('🔗 Franchise hierarchy WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'hierarchy_update') {
          // Handle real-time hierarchy updates
          console.log('📊 Franchise hierarchy updated:', data.payload)
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error)
      }
    }

    ws.onclose = () => {
      console.log('🔌 Franchise hierarchy WebSocket disconnected')
    }

    return () => {
      ws.close()
    }
  }, [enableRealTime])

  // Get current selection based on level
  const currentItem = useMemo(() => {
    switch (level) {
      case 'network':
        return currentSelection.network
      case 'region':
        return currentSelection.region
      case 'group':
        return currentSelection.group
      case 'location':
        return currentSelection.location
      default:
        return null
    }
  }, [currentSelection, level])

  // Get filtered items based on level and hierarchy
  const availableItems = useMemo(() => {
    switch (level) {
      case 'network':
        return networks
      case 'region':
        return currentSelection.network 
          ? regions.filter(r => r.network_id === currentSelection.network!.id)
          : []
      case 'group':
        return currentSelection.region
          ? groups.filter(g => g.region_id === currentSelection.region!.id)
          : []
      case 'location':
        if (currentSelection.group) {
          return locations.filter(l => l.group_id === currentSelection.group!.id)
        } else if (currentSelection.region) {
          return locations.filter(l => l.region_id === currentSelection.region!.id)
        } else if (currentSelection.network) {
          return locations.filter(l => l.network_id === currentSelection.network!.id)
        }
        return []
      default:
        return []
    }
  }, [level, currentSelection, networks, regions, groups, locations])

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return availableItems
    
    const query = searchQuery.toLowerCase()
    return availableItems.filter(item => 
      item.name.toLowerCase().includes(query) ||
      ('code' in item && item.code?.toLowerCase().includes(query)) ||
      ('brand' in item && item.brand?.toLowerCase().includes(query)) ||
      ('city' in item && item.city?.toLowerCase().includes(query))
    )
  }, [availableItems, searchQuery])

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

  const handleItemSelect = (item: any) => {
    const newSelection = { ...currentSelection }
    
    switch (level) {
      case 'network':
        newSelection.network = item
        // Clear lower levels when changing network
        newSelection.region = undefined
        newSelection.group = undefined
        newSelection.location = undefined
        break
      case 'region':
        newSelection.region = item
        // Clear lower levels when changing region
        newSelection.group = undefined
        newSelection.location = undefined
        break
      case 'group':
        newSelection.group = item
        // Clear location when changing group
        newSelection.location = undefined
        break
      case 'location':
        newSelection.location = item
        break
    }
    
    onSelectionChange(newSelection)
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

  const getIcon = () => {
    switch (level) {
      case 'network':
        return <GlobeAltIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      case 'region':
        return <RectangleGroupIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      case 'group':
        return <UserGroupIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      case 'location':
        return <BuildingOfficeIcon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      default:
        return <BuildingOffice2Icon className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
    }
  }

  const getPlaceholder = () => {
    if (placeholder) return placeholder
    switch (level) {
      case 'network':
        return 'Select franchise network'
      case 'region':
        return 'Select region'
      case 'group':
        return 'Select group'
      case 'location':
        return 'Select location'
      default:
        return 'Select item'
    }
  }

  const renderItemStats = (item: any) => {
    if (!showStats) return null

    switch (level) {
      case 'network':
        return (
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <BuildingOfficeIcon className="w-3 h-3 mr-1" />
              {item.current_locations_count || 0} locations
            </span>
            <span className="flex items-center">
              <RectangleGroupIcon className="w-3 h-3 mr-1" />
              {item.total_regions || 0} regions
            </span>
            {item.network_revenue_ytd && (
              <span className="flex items-center">
                <CurrencyDollarIcon className="w-3 h-3 mr-1" />
                {formatCurrency(item.network_revenue_ytd)}
              </span>
            )}
          </div>
        )
      case 'region':
        return (
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <BuildingOfficeIcon className="w-3 h-3 mr-1" />
              {item.total_locations || 0} locations
            </span>
            <span className="flex items-center">
              <UserGroupIcon className="w-3 h-3 mr-1" />
              {item.total_groups || 0} groups
            </span>
            {item.region_revenue_ytd && (
              <span className="flex items-center">
                <CurrencyDollarIcon className="w-3 h-3 mr-1" />
                {formatCurrency(item.region_revenue_ytd)}
              </span>
            )}
            {item.compliance_score && (
              <span className="flex items-center">
                <ChartBarIcon className="w-3 h-3 mr-1" />
                {formatPercentage(item.compliance_score)}
              </span>
            )}
          </div>
        )
      case 'group':
        return (
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <BuildingOfficeIcon className="w-3 h-3 mr-1" />
              {item.total_locations || 0} locations
            </span>
            {item.group_revenue_ytd && (
              <span className="flex items-center">
                <CurrencyDollarIcon className="w-3 h-3 mr-1" />
                {formatCurrency(item.group_revenue_ytd)}
              </span>
            )}
            <span className="text-gray-400">{item.group_type}</span>
          </div>
        )
      case 'location':
        return item.stats ? (
          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center">
              <UserGroupIcon className="w-3 h-3 mr-1" />
              {item.stats.activeBarbers || 0} barbers
            </span>
            <span className="flex items-center">
              <ChartBarIcon className="w-3 h-3 mr-1" />
              {item.stats.todayBookings || 0} today
            </span>
            {item.stats.weekRevenue && (
              <span className="flex items-center">
                <CurrencyDollarIcon className="w-3 h-3 mr-1" />
                {formatCurrency(item.stats.weekRevenue)}
              </span>
            )}
            {item.stats.occupancyRate && (
              <span className="flex items-center">
                {formatPercentage(item.stats.occupancyRate)} occupancy
              </span>
            )}
          </div>
        ) : null
      default:
        return null
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Select ${level}. Current: ${currentItem?.name || 'None selected'}`}
        disabled={availableItems.length === 0}
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
          ${availableItems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex items-center space-x-3 min-w-0">
          {getIcon()}
          <div className="text-left min-w-0">
            <div className="font-medium text-gray-900 dark:text-white truncate">
              {currentItem?.name || getPlaceholder()}
            </div>
            {currentItem && 'code' in currentItem && currentItem.code && !compact && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {currentItem.code}
                {('brand' in currentItem && currentItem.brand) && ` • ${currentItem.brand}`}
                {('city' in currentItem && currentItem.city) && ` • ${currentItem.city}, ${currentItem.state}`}
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
          aria-label={`${level} options`}
          className={`
            absolute z-50 mt-2 w-full min-w-[350px] max-w-[90vw]
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
                  placeholder={`Search ${level}s...`}
                  aria-label={`Search ${level}s`}
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

          {/* Items List */}
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              <MapPinIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No {level}s found</p>
              {searchQuery && (
                <p className="text-xs mt-1">Try adjusting your search terms</p>
              )}
            </div>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
              {filteredItems.map((item: any) => (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={currentItem?.id === item.id}
                  onMouseEnter={() => setHoveredItemId(item.id)}
                  onMouseLeave={() => setHoveredItemId(null)}
                  onClick={() => handleItemSelect(item)}
                  className={`
                    px-4 py-3 cursor-pointer
                    transition-all duration-200 ease-out
                    border-l-4
                    ${currentItem?.id === item.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 border-l-primary-500 text-primary-900 dark:text-primary-100'
                      : hoveredItemId === item.id
                      ? 'bg-gray-50 dark:bg-zinc-700 border-l-transparent'
                      : 'border-l-transparent hover:bg-gray-50 dark:hover:bg-zinc-700'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 min-w-0">
                      {getIcon()}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate flex items-center">
                          {item.name}
                          {currentItem?.id === item.id && (
                            <CheckIcon className="w-4 h-4 ml-2 text-primary-500 flex-shrink-0" />
                          )}
                        </div>
                        {'code' in item && item.code && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.code}
                            {('brand' in item && item.brand) && ` • ${item.brand}`}
                            {('city' in item && item.city) && ` • ${item.city}, ${item.state}`}
                          </div>
                        )}
                        {renderItemStats(item)}
                      </div>
                    </div>
                    {item.status && (
                      <span className={`
                        inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${item.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                          : item.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'
                          : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                        }
                      `}>
                        {item.status}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer with count */}
          {availableItems.length > 5 && (
            <div className="px-4 py-2 text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-zinc-900">
              <span className="font-medium">{filteredItems.length}</span> of <span className="font-medium">{availableItems.length}</span> {level}s
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
export function CompactFranchiseHierarchySelector(props: FranchiseHierarchySelectorProps) {
  return <FranchiseHierarchySelector {...props} compact={true} showStats={false} />
}

// Multi-level hierarchy selector that shows all levels in a breadcrumb-style layout
export function FranchiseHierarchyBreadcrumb({
  networks,
  regions,
  groups,
  locations,
  currentSelection,
  onSelectionChange,
  showStats = false,
  enableRealTime = false
}: Omit<FranchiseHierarchySelectorProps, 'level'>) {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto">
      {/* Network Selector */}
      <FranchiseHierarchySelector
        networks={networks}
        regions={regions}
        groups={groups}
        locations={locations}
        currentSelection={currentSelection}
        onSelectionChange={onSelectionChange}
        level="network"
        showStats={showStats}
        compact={true}
        enableRealTime={enableRealTime}
        className="flex-shrink-0 min-w-[200px]"
      />

      {/* Region Selector */}
      {currentSelection.network && (
        <>
          <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <FranchiseHierarchySelector
            networks={networks}
            regions={regions}
            groups={groups}
            locations={locations}
            currentSelection={currentSelection}
            onSelectionChange={onSelectionChange}
            level="region"
            showStats={showStats}
            compact={true}
            enableRealTime={enableRealTime}
            className="flex-shrink-0 min-w-[180px]"
          />
        </>
      )}

      {/* Group Selector */}
      {currentSelection.region && (
        <>
          <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <FranchiseHierarchySelector
            networks={networks}
            regions={regions}
            groups={groups}
            locations={locations}
            currentSelection={currentSelection}
            onSelectionChange={onSelectionChange}
            level="group"
            showStats={showStats}
            compact={true}
            enableRealTime={enableRealTime}
            className="flex-shrink-0 min-w-[160px]"
          />
        </>
      )}

      {/* Location Selector */}
      {(currentSelection.group || currentSelection.region) && (
        <>
          <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <FranchiseHierarchySelector
            networks={networks}
            regions={regions}
            groups={groups}
            locations={locations}
            currentSelection={currentSelection}
            onSelectionChange={onSelectionChange}
            level="location"
            showStats={showStats}
            compact={true}
            enableRealTime={enableRealTime}
            className="flex-shrink-0 min-w-[200px]"
          />
        </>
      )}
    </div>
  )
}