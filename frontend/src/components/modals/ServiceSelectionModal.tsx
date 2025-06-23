'use client'

import { useState, useMemo } from 'react'
import BaseModal from './BaseModal'
import {
  MagnifyingGlassIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  StarIcon,
  TagIcon,
  ScissorsIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'

interface Service {
  id: number
  name: string
  description?: string
  category: string
  category_id: number
  duration: number
  price: number
  is_active: boolean
  popular?: boolean
  barber_ids?: number[]
  location_ids?: number[]
  image?: string
  features?: string[]
}

interface ServiceCategory {
  id: number
  name: string
  description?: string
  icon?: React.ReactNode
  color?: string
}

interface ServiceSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (service: Service) => void
  selectedServiceId?: number
  barberId?: number
  locationId?: number
}

// Mock service categories
const serviceCategories: ServiceCategory[] = [
  {
    id: 1,
    name: 'Haircuts',
    description: 'Professional cuts and styling',
    icon: <ScissorsIcon className="h-5 w-5" />,
    color: 'slate'
  },
  {
    id: 2,
    name: 'Grooming',
    description: 'Beard and mustache services',
    icon: <SparklesIcon className="h-5 w-5" />,
    color: 'emerald'
  },
  {
    id: 3,
    name: 'Styling',
    description: 'Special occasion styling',
    icon: <StarIcon className="h-5 w-5" />,
    color: 'amber'
  }
]

// Mock services data
const mockServices: Service[] = [
  {
    id: 1,
    name: 'Premium Haircut',
    description: 'Complete styling with consultation, wash, cut, and finish',
    category: 'Haircuts',
    category_id: 1,
    duration: 60,
    price: 65,
    is_active: true,
    popular: true,
    features: ['Consultation', 'Wash & Cut', 'Styling', 'Hot Towel']
  },
  {
    id: 2,
    name: 'Classic Fade',
    description: 'Traditional fade cut with modern techniques',
    category: 'Haircuts',
    category_id: 1,
    duration: 45,
    price: 45,
    is_active: true,
    popular: true,
    features: ['Precision Cut', 'Fade Styling', 'Line Up']
  },
  {
    id: 3,
    name: 'Beard Trim',
    description: 'Professional beard shaping and grooming',
    category: 'Grooming',
    category_id: 2,
    duration: 30,
    price: 25,
    is_active: true,
    features: ['Trim & Shape', 'Hot Towel', 'Conditioning']
  },
  {
    id: 4,
    name: 'Full Grooming Package',
    description: 'Complete haircut and beard service',
    category: 'Grooming',
    category_id: 2,
    duration: 90,
    price: 85,
    is_active: true,
    popular: true,
    features: ['Haircut', 'Beard Trim', 'Hot Towel', 'Styling', 'Aftercare']
  },
  {
    id: 5,
    name: 'Classic Cut',
    description: 'Traditional barbershop experience',
    category: 'Haircuts',
    category_id: 1,
    duration: 30,
    price: 35,
    is_active: true,
    features: ['Traditional Cut', 'Basic Styling']
  },
  {
    id: 6,
    name: 'Mustache Trim',
    description: 'Precision mustache grooming',
    category: 'Grooming',
    category_id: 2,
    duration: 15,
    price: 15,
    is_active: true,
    features: ['Precision Trim', 'Wax Application']
  },
  {
    id: 7,
    name: 'Special Event Styling',
    description: 'Premium styling for weddings and special occasions',
    category: 'Styling',
    category_id: 3,
    duration: 75,
    price: 95,
    is_active: true,
    features: ['Consultation', 'Premium Products', 'Photo Touch-ups', 'Style Hold']
  },
  {
    id: 8,
    name: 'Kids Cut',
    description: 'Fun and comfortable cuts for children',
    category: 'Haircuts',
    category_id: 1,
    duration: 30,
    price: 25,
    is_active: true,
    features: ['Kid-Friendly', 'Quick Service', 'Fun Experience']
  }
]

export default function ServiceSelectionModal({
  isOpen,
  onClose,
  onSelect,
  selectedServiceId,
  barberId,
  locationId
}: ServiceSelectionModalProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [services] = useState<Service[]>(mockServices)

  // Filter services based on search term and category
  const filteredServices = useMemo(() => {
    let filtered = services.filter(service => service.is_active)

    // Filter by barber availability
    if (barberId) {
      filtered = filtered.filter(service =>
        !service.barber_ids || service.barber_ids.includes(barberId)
      )
    }

    // Filter by location availability
    if (locationId) {
      filtered = filtered.filter(service =>
        !service.location_ids || service.location_ids.includes(locationId)
      )
    }

    // Filter by category
    if (selectedCategoryId) {
      filtered = filtered.filter(service => service.category_id === selectedCategoryId)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchLower) ||
        service.description?.toLowerCase().includes(searchLower) ||
        service.category.toLowerCase().includes(searchLower) ||
        service.features?.some(feature => feature.toLowerCase().includes(searchLower))
      )
    }

    return filtered
  }, [services, barberId, locationId, selectedCategoryId, searchTerm])

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped = filteredServices.reduce((acc, service) => {
      const category = service.category
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(service)
      return acc
    }, {} as Record<string, Service[]>)

    // Sort services within each category by popularity and price
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => {
        if (a.popular && !b.popular) return -1
        if (!a.popular && b.popular) return 1
        return a.price - b.price
      })
    })

    return grouped
  }, [filteredServices])

  const handleServiceSelect = (service: Service) => {
    onSelect(service)
    onClose()
  }

  const getCategoryColor = (categoryName: string) => {
    const category = serviceCategories.find(cat => cat.name === categoryName)
    return category?.color || 'slate'
  }

  const getCategoryIcon = (categoryName: string) => {
    const category = serviceCategories.find(cat => cat.name === categoryName)
    return category?.icon || <TagIcon className="h-5 w-5" />
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (remainingMinutes === 0) {
      return `${hours}h`
    }
    return `${hours}h ${remainingMinutes}m`
  }

  const ServiceCard = ({ service, isSelected = false }: { service: Service; isSelected?: boolean }) => {
    const categoryColor = getCategoryColor(service.category)

    return (
      <div
        onClick={() => handleServiceSelect(service)}
        className={`
          relative p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 group
          ${isSelected
            ? 'border-teal-500 bg-teal-50 shadow-lg'
            : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50 hover:shadow-md'
          }
        `}
      >
        {/* Popular Badge */}
        {service.popular && (
          <div className="absolute -top-2 -right-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg">
              <StarIcon className="h-3 w-3 mr-1" />
              Popular
            </span>
          </div>
        )}

        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Service Header */}
            <div className="flex items-center space-x-2 mb-2">
              <div className={`p-1 rounded-lg bg-${categoryColor}-100`}>
                {getCategoryIcon(service.category)}
              </div>
              <span className={`text-xs font-medium text-${categoryColor}-600 uppercase tracking-wide`}>
                {service.category}
              </span>
            </div>

            {/* Service Name */}
            <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-teal-700 transition-colors">
              {service.name}
            </h3>

            {/* Description */}
            {service.description && (
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {service.description}
              </p>
            )}

            {/* Features */}
            {service.features && service.features.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4">
                {service.features.slice(0, 3).map((feature, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                  >
                    {feature}
                  </span>
                ))}
                {service.features.length > 3 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                    +{service.features.length - 3} more
                  </span>
                )}
              </div>
            )}

            {/* Duration & Price */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-1" />
                  <span>{formatDuration(service.duration)}</span>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">${service.price}</div>
              </div>
            </div>
          </div>

          {/* Selection Indicator */}
          {isSelected && (
            <div className="ml-4">
              <CheckCircleIcon className="h-6 w-6 text-teal-600" />
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Service"
      size="3xl"
    >
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="premium-input w-full pl-10"
            placeholder="Search services by name, description, or features..."
          />
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${!selectedCategoryId
                ? 'bg-slate-100 text-slate-700 border-2 border-slate-200'
                : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
              }
            `}
          >
            All Services
          </button>
          {serviceCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={`
                flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2
                ${selectedCategoryId === category.id
                  ? `bg-${category.color}-100 text-${category.color}-700 border-${category.color}-200`
                  : 'bg-gray-100 text-gray-700 border-transparent hover:bg-gray-200'
                }
              `}
            >
              {category.icon}
              <span>{category.name}</span>
            </button>
          ))}
        </div>

        {/* Services Grid */}
        <div className="max-h-96 overflow-y-auto space-y-6">
          {Object.keys(servicesByCategory).length > 0 ? (
            Object.entries(servicesByCategory).map(([categoryName, categoryServices]) => (
              <div key={categoryName}>
                <div className="flex items-center space-x-2 mb-4">
                  {getCategoryIcon(categoryName)}
                  <h3 className="text-lg font-semibold text-gray-900">{categoryName}</h3>
                  <span className="text-sm text-gray-500">({categoryServices.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      isSelected={selectedServiceId === service.id}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <ScissorsIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No services found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm
                  ? 'No services match your search criteria.'
                  : 'No services available for the selected filters.'
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} available
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="premium-button-secondary text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </BaseModal>
  )
}
