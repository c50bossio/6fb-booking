'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Badge } from '@/components/ui/badge'
import { bookingService } from '@/lib/api/bookings'
import { cn } from '@/lib/utils'

export interface Service {
  id: number
  name: string
  description?: string
  category: string
  duration: number
  price: number
  is_active: boolean
  popular?: boolean
  available_addons?: ServiceAddon[]
}

export interface ServiceAddon {
  id: number
  name: string
  price: number
  duration?: number
}

export interface ServiceSelectorProps {
  locationId?: number
  barberId?: number
  onServiceSelect: (service: Service) => void
  selectedService: Service | null
  className?: string
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  locationId,
  barberId,
  onServiceSelect,
  selectedService,
  className
}) => {
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadServices()
  }, [locationId, barberId])

  const loadServices = async () => {
    try {
      setLoading(true)
      setError(null)

      const params: any = {}
      if (locationId) params.location_id = locationId
      if (barberId) params.barber_id = barberId

      const response = await bookingService.getServices(params)
      const servicesData = response.data

      setServices(servicesData)

      // Extract unique categories
      const uniqueCategories = Array.from(
        new Set(servicesData.map((s: Service) => s.category))
      ).sort()
      setCategories(uniqueCategories)

    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  const filteredServices = services.filter(service => {
    const matchesCategory = selectedCategory === 'all' || service.category === selectedCategory
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch && service.is_active
  })

  const groupedServices = filteredServices.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = []
    }
    acc[service.category].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  if (loading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn('text-center p-8', className)}>
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadServices} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Search and Filter */}
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Search services..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
          >
            All Services
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      {selectedCategory === 'all' ? (
        // Show grouped by category
        <div className="space-y-8">
          {Object.entries(groupedServices).map(([category, categoryServices]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryServices.map(service => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    isSelected={selectedService?.id === service.id}
                    onSelect={() => onServiceSelect(service)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Show filtered services
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredServices.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              isSelected={selectedService?.id === service.id}
              onSelect={() => onServiceSelect(service)}
            />
          ))}
        </div>
      )}

      {filteredServices.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No services found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}

interface ServiceCardProps {
  service: Service
  isSelected: boolean
  onSelect: () => void
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, isSelected, onSelect }) => {
  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-lg',
        isSelected && 'ring-2 ring-blue-500 bg-blue-50'
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">{service.name}</h4>
            {service.popular && (
              <Badge variant="secondary" className="mt-1">
                Popular
              </Badge>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-gray-900">${service.price}</p>
            <p className="text-sm text-gray-500">{service.duration} min</p>
          </div>
        </div>

        {service.description && (
          <p className="text-sm text-gray-600 mt-2">{service.description}</p>
        )}

        {service.available_addons && service.available_addons.length > 0 && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-gray-500 mb-1">Available add-ons:</p>
            <div className="flex flex-wrap gap-1">
              {service.available_addons.map(addon => (
                <Badge key={addon.id} variant="outline" className="text-xs">
                  {addon.name} +${addon.price}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {isSelected && (
          <div className="mt-3 flex items-center justify-center">
            <Badge className="bg-blue-600">Selected</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ServiceSelector
