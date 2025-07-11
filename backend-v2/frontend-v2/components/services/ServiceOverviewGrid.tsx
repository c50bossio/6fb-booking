'use client'

import { useState } from 'react'
import { 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Copy, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  DollarSign,
  Clock,
  Users,
  TrendingUp,
  Star
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Service } from '@/lib/api'

interface ServiceOverviewGridProps {
  services: Service[]
  selectedServices: number[]
  onSelectionChange: (selected: number[]) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  filterCategory: string
  onFilterChange: (category: string) => void
  onServiceEdit: (service: Service) => void
}

export default function ServiceOverviewGrid({
  services,
  selectedServices,
  onSelectionChange,
  searchQuery,
  onSearchChange,
  filterCategory,
  onFilterChange,
  onServiceEdit
}: ServiceOverviewGridProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'bookings' | 'revenue'>('name')

  const categories = Array.from(new Set(services.map(s => s.category)))

  const handleSelectAll = (checked: boolean) => {
    onSelectionChange(checked ? services.map(s => s.id) : [])
  }

  const handleSelectService = (serviceId: number, checked: boolean) => {
    onSelectionChange(
      checked
        ? [...selectedServices, serviceId]
        : selectedServices.filter(id => id !== serviceId)
    )
  }

  const sortedServices = [...services].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return b.base_price - a.base_price
      case 'bookings':
        return (b.booking_count || 0) - (a.booking_count || 0)
      case 'revenue':
        return ((b.booking_count || 0) * b.base_price) - ((a.booking_count || 0) * a.base_price)
      default:
        return a.name.localeCompare(b.name)
    }
  })

  const getServiceMetrics = (service: Service) => {
    const bookings = service.booking_count || 0
    const revenue = bookings * service.base_price
    const rating = service.average_rating || 0
    const trend = service.growth_percentage || 0

    return { bookings, revenue, rating, trend }
  }

  const getServiceBadges = (service: Service) => {
    const badges = []
    
    if (service.is_package) {
      badges.push({ label: 'Package', variant: 'purple' })
    }
    
    if (service.base_price >= 75) {
      badges.push({ label: 'Premium', variant: 'gold' })
    }
    
    if (!service.is_active) {
      badges.push({ label: 'Inactive', variant: 'gray' })
    }
    
    if (service.is_featured) {
      badges.push({ label: 'Featured', variant: 'blue' })
    }

    return badges
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex-1 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filterCategory}
              onValueChange={onFilterChange}
              className="w-48"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </Select>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as any)}
              className="w-40"
            >
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="bookings">Sort by Bookings</option>
              <option value="revenue">Sort by Revenue</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? 'List View' : 'Grid View'}
            </Button>
          </div>
        </div>

        {/* Selection Bar */}
        {selectedServices.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4 flex items-center justify-between">
            <span className="text-sm font-medium">
              {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSelectionChange([])}
            >
              Clear Selection
            </Button>
          </div>
        )}

        {/* Services Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedServices.map((service) => {
              const metrics = getServiceMetrics(service)
              const badges = getServiceBadges(service)
              const isSelected = selectedServices.includes(service.id)

              return (
                <Card
                  key={service.id}
                  className={`relative hover:shadow-lg transition-shadow ${
                    isSelected ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    {/* Selection and Actions */}
                    <div className="flex items-start justify-between mb-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectService(service.id, checked as boolean)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onServiceEdit(service)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            {service.is_active ? (
                              <>
                                <ToggleLeft className="w-4 h-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ToggleRight className="w-4 h-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Service Info */}
                    <h3 className="font-semibold text-lg mb-1">{service.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                      {service.description || 'No description'}
                    </p>

                    {/* Badges */}
                    {badges.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {badges.map((badge, idx) => (
                          <Badge key={idx} variant={badge.variant as any}>
                            {badge.label}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Price and Duration */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold">${service.base_price}</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{service.duration_minutes}min</span>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-2 pt-3 border-t">
                      <div>
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Users className="w-3 h-3" />
                          <span className="text-xs">Bookings</span>
                        </div>
                        <p className="font-semibold">{metrics.bookings}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <TrendingUp className="w-3 h-3" />
                          <span className="text-xs">Revenue</span>
                        </div>
                        <p className="font-semibold">${metrics.revenue}</p>
                      </div>
                    </div>

                    {/* Rating */}
                    {metrics.rating > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{metrics.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {/* List view implementation */}
            {sortedServices.map((service) => {
              const metrics = getServiceMetrics(service)
              const isSelected = selectedServices.includes(service.id)

              return (
                <div
                  key={service.id}
                  className={`flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border ${
                    isSelected ? 'border-blue-500' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleSelectService(service.id, checked as boolean)}
                  />
                  
                  <div className="flex-1">
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      ${service.base_price} • {service.duration_minutes}min
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Bookings:</span> {metrics.bookings}
                    </div>
                    <div>
                      <span className="text-gray-500">Revenue:</span> ${metrics.revenue}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onServiceEdit(service)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {sortedServices.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No services found matching your criteria.</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}