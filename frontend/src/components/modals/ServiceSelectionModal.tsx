'use client'

import { useState, useMemo, useEffect } from 'react'
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
import { servicesService, type Service, type ServiceCategory } from '@/lib/api/services'

interface ServiceSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (service: Service) => void
  selectedServiceId?: number
  barberId?: number
  locationId?: number
}

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
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch services and categories when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, barberId, locationId])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch categories
      const categoriesResponse = await servicesService.getCategories(true)
      setCategories(categoriesResponse.data || [])

      // Fetch services with filters
      const servicesResponse = await servicesService.getServices({
        is_active: true,
        barber_id: barberId,
        location_id: locationId,
        limit: 100
      })
      setServices(servicesResponse.data || [])
    } catch (error) {
      console.error('Failed to fetch services:', error)
      // Fallback to empty arrays if API fails
      setServices([])
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  // Filter services based on search term and category
  const filteredServices = useMemo(() => {
    let filtered = services.filter(service => service.is_active)

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchLower) ||
        (service.description && service.description.toLowerCase().includes(searchLower)) ||
        (service.category_name && service.category_name.toLowerCase().includes(searchLower)) ||
        (service.tags && service.tags.some(tag => tag.toLowerCase().includes(searchLower)))
      )
    }

    // Filter by category
    if (selectedCategoryId !== null) {
      filtered = filtered.filter(service => service.category_id === selectedCategoryId)
    }

    return filtered
  }, [services, selectedCategoryId, searchTerm])

  // Group services by category
  const servicesByCategory = useMemo(() => {
    const grouped = filteredServices.reduce((acc, service) => {
      const categoryName = service.category_name || 'Uncategorized'
      if (!acc[categoryName]) {
        acc[categoryName] = []
      }
      acc[categoryName].push(service)
      return acc
    }, {} as Record<string, Service[]>)

    // Sort services within each category by display order and price
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => {
        // First by display order
        if (a.display_order !== b.display_order) {
          return (a.display_order || 0) - (b.display_order || 0)
        }
        // Then by price
        return a.base_price - b.base_price
      })
    })

    return grouped
  }, [filteredServices])

  const handleServiceSelect = (service: Service) => {
    onSelect(service)
    onClose()
  }

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName)
    return category?.color || '#6b7280'
  }

  const getCategoryIcon = (categoryName: string) => {
    // Map category names to icons
    const iconMap: Record<string, React.ReactNode> = {
      'Haircuts': <ScissorsIcon className="h-4 w-4" />,
      'Beard Services': <SparklesIcon className="h-4 w-4" />,
      'Styling': <StarIcon className="h-4 w-4" />,
      'Add-ons': <TagIcon className="h-4 w-4" />
    }
    return iconMap[categoryName] || <ScissorsIcon className="h-4 w-4" />
  }

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Select a Service"
      maxWidth="max-w-4xl"
    >
      {/* Search and Category Filter */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search services..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-gray-900"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedCategoryId === null
                ? 'bg-slate-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Services
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategoryId(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedCategoryId === category.id
                  ? 'text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              style={
                selectedCategoryId === category.id
                  ? { backgroundColor: category.color || '#6b7280' }
                  : {}
              }
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        ) : Object.entries(servicesByCategory).length === 0 ? (
          <div className="text-center py-12">
            <ScissorsIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No services found matching your criteria.</p>
          </div>
        ) : (
          Object.entries(servicesByCategory).map(([categoryName, categoryServices]) => (
            <div key={categoryName}>
              <div className="flex items-center mb-3">
                <div
                  className="p-2 rounded-lg mr-3"
                  style={{ backgroundColor: `${getCategoryColor(categoryName)}20` }}
                >
                  <div style={{ color: getCategoryColor(categoryName) }}>
                    {getCategoryIcon(categoryName)}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">{categoryName}</h3>
              </div>

              <div className="grid gap-3">
                {categoryServices.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className={`
                      relative p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${
                        selectedServiceId === service.id
                          ? 'border-slate-600 bg-slate-50'
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-1">
                          <h4 className="text-base font-medium text-gray-900">
                            {service.name}
                          </h4>
                          {service.is_featured && (
                            <span className="ml-2 px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                              Popular
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center">
                            <ClockIcon className="h-4 w-4 mr-1" />
                            {service.duration_minutes} min
                          </div>
                          <div className="flex items-center font-medium text-gray-900">
                            <CurrencyDollarIcon className="h-4 w-4 mr-1" />
                            {service.min_price && service.max_price && service.min_price !== service.max_price ? (
                              <span>${service.min_price} - ${service.max_price}</span>
                            ) : (
                              <span>${service.base_price}</span>
                            )}
                          </div>
                        </div>
                        {service.tags && service.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {service.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedServiceId === service.id && (
                        <CheckCircleIcon className="h-6 w-6 text-slate-600 flex-shrink-0 ml-3" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </BaseModal>
  )
}
