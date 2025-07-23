'use client'

import { useState, useEffect, useRef, memo } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'
import { type Service } from '@/lib/api'
import { cn } from '@/lib/utils'

interface ServiceSelectorProps {
  selectedService: Service | null
  onSelectService: (service: Service) => void
  services: Service[]
  loadingServices: boolean
  className?: string
}

export const ServiceSelector = memo(function ServiceSelector({
  selectedService,
  onSelectService,
  services,
  loadingServices,
  className = ''
}: ServiceSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-semibold text-gray-900 dark:text-white">
        Service *
      </label>
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-left flex items-center justify-between hover:border-gray-400 dark:hover:border-gray-500 transition-colors"
        >
          <span className={selectedService ? 'text-gray-900 dark:text-white' : 'text-gray-500'}>
            {selectedService ? selectedService.name : 'Select service'}
          </span>
          <ChevronDownIcon className={cn(
            'w-5 h-5 text-gray-400 transition-transform',
            isDropdownOpen && 'rotate-180'
          )} />
        </button>

        {isDropdownOpen && (
          <ServiceDropdownContent
            services={services}
            loadingServices={loadingServices}
            onSelectService={(service) => {
              onSelectService(service)
              setIsDropdownOpen(false)
            }}
          />
        )}
      </div>
    </div>
  )
})

// Separate component for dropdown content
const ServiceDropdownContent = memo(function ServiceDropdownContent({
  services,
  loadingServices,
  onSelectService
}: {
  services: Service[]
  loadingServices: boolean
  onSelectService: (service: Service) => void
}) {
  return (
    <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
      {loadingServices ? (
        <div className="p-3 text-center text-gray-500">Loading services...</div>
      ) : services.length > 0 ? (
        <div className="py-1">
          {services.map((service) => (
            <ServiceItem
              key={service.id}
              service={service}
              onSelect={() => onSelectService(service)}
            />
          ))}
        </div>
      ) : (
        <div className="p-3 text-center text-gray-500">No services available</div>
      )}
    </div>
  )
})

// Individual service item component
const ServiceItem = memo(function ServiceItem({
  service,
  onSelect
}: {
  service: Service
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex flex-col transition-colors"
    >
      <span className="font-medium text-gray-900 dark:text-white">
        {service.name}
      </span>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span className="font-semibold text-primary-600 dark:text-primary-400">
          ${service.base_price}
        </span>
        <span>•</span>
        <span>{service.duration_minutes} min</span>
        {service.description && (
          <>
            <span>•</span>
            <span className="truncate max-w-[200px]">{service.description}</span>
          </>
        )}
      </div>
    </button>
  )
})

// Helper function to group services by category
export function groupServicesByCategory(services: Service[]) {
  const grouped = services.reduce((acc, service) => {
    const category = service.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
}