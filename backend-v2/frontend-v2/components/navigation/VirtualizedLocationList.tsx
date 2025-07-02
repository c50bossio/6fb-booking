'use client'

import React, { useMemo, useState, useRef, useEffect } from 'react'
import { 
  CheckIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import { Location } from './LocationSelector'

interface VirtualizedLocationListProps {
  locations: Location[]
  currentLocationId?: string
  onLocationSelect: (location: Location) => void
  showStats?: boolean
  hoveredLocationId: string | null
  setHoveredLocationId: (id: string | null) => void
  maxHeight?: number
  itemHeight?: number
}

export function VirtualizedLocationList({
  locations,
  currentLocationId,
  onLocationSelect,
  showStats = true,
  hoveredLocationId,
  setHoveredLocationId,
  maxHeight = 400,
  itemHeight = 80
}: VirtualizedLocationListProps) {
  const [scrollTop, setScrollTop] = useState(0)
  const scrollElementRef = useRef<HTMLDivElement>(null)
  
  // Calculate visible items
  const visibleItems = useMemo(() => {
    const containerHeight = maxHeight
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      locations.length
    )
    
    return {
      startIndex,
      endIndex,
      visibleItems: locations.slice(startIndex, endIndex)
    }
  }, [scrollTop, itemHeight, maxHeight, locations])
  
  // Handle scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }
  
  // Format currency helper
  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  // Format percentage helper
  const formatPercentage = (value?: number) => {
    if (!value) return '0%'
    return `${Math.round(value)}%`
  }
  
  // Only virtualize if we have many locations
  const shouldVirtualize = locations.length > 20
  
  if (!shouldVirtualize) {
    // Render normally for small lists
    return (
      <div className="overflow-y-auto" style={{ maxHeight }}>
        {locations.map((location, index) => (
          <LocationItem
            key={location.id}
            location={location}
            isSelected={location.id === currentLocationId}
            isHovered={hoveredLocationId === location.id}
            onSelect={() => onLocationSelect(location)}
            onHover={() => setHoveredLocationId(location.id)}
            onLeave={() => setHoveredLocationId(null)}
            showStats={showStats}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
            animationDelay={index * 50}
          />
        ))}
      </div>
    )
  }
  
  // Virtualized rendering for large lists
  const totalHeight = locations.length * itemHeight
  const offsetY = visibleItems.startIndex * itemHeight
  
  return (
    <div 
      ref={scrollElementRef}
      className="overflow-y-auto"
      style={{ maxHeight }}
      onScroll={handleScroll}
    >
      {/* Total height container */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items container */}
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.visibleItems.map((location, index) => (
            <LocationItem
              key={location.id}
              location={location}
              isSelected={location.id === currentLocationId}
              isHovered={hoveredLocationId === location.id}
              onSelect={() => onLocationSelect(location)}
              onHover={() => setHoveredLocationId(location.id)}
              onLeave={() => setHoveredLocationId(null)}
              showStats={showStats}
              formatCurrency={formatCurrency}
              formatPercentage={formatPercentage}
              animationDelay={0} // Skip animations in virtualized mode for performance
              style={{ height: itemHeight }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// Memoized location item component
const LocationItem = React.memo(function LocationItem({
  location,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onLeave,
  showStats,
  formatCurrency,
  formatPercentage,
  animationDelay,
  style
}: {
  location: Location
  isSelected: boolean
  isHovered: boolean
  onSelect: () => void
  onHover: () => void
  onLeave: () => void
  showStats: boolean
  formatCurrency: (amount?: number) => string
  formatPercentage: (value?: number) => string
  animationDelay: number
  style?: React.CSSProperties
}) {
  return (
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`
        relative px-4 py-3 cursor-pointer focus:outline-none
        transition-all duration-200 ease-out
        hover:scale-[1.01] active:scale-[0.99]
        ${animationDelay > 0 ? 'animate-in fade-in-0 slide-in-from-left-1' : ''}
        ${isSelected
          ? 'bg-primary-50 dark:bg-primary-950/50 border-l-4 border-primary-500'
          : 'hover:bg-gray-50 dark:hover:bg-zinc-700/50 focus:bg-gray-50 dark:focus:bg-zinc-700/50'
        }
      `}
      style={{
        ...style,
        animationDelay: animationDelay > 0 ? `${animationDelay}ms` : undefined
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <h4 className={`
              font-medium truncate
              ${isSelected
                ? 'text-primary-700 dark:text-primary-300'
                : 'text-gray-900 dark:text-white'
              }
            `}>
              {location.name}
            </h4>
            {isSelected && (
              <CheckIcon className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0 animate-in zoom-in-50 duration-200" />
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
      {showStats && location.stats && isHovered && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 animate-in fade-in-0 slide-in-from-top-1 duration-300">
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
  )
})