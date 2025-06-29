'use client'

import { useState } from 'react'
import { type Service } from '../lib/api'

interface ServiceListProps {
  services: Service[]
  onEdit: (service: Service) => void
  onDelete: (serviceId: number) => void
  onManagePricingRules?: (service: Service) => void
}

export default function ServiceList({ services, onEdit, onDelete, onManagePricingRules }: ServiceListProps) {
  const [selectedServices, setSelectedServices] = useState<number[]>([])
  const [sortField, setSortField] = useState<keyof Service>('display_order')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSelectAll = (checked: boolean) => {
    setSelectedServices(checked ? services.map(s => s.id) : [])
  }

  const handleSelectService = (serviceId: number, checked: boolean) => {
    setSelectedServices(prev =>
      checked
        ? [...prev, serviceId]
        : prev.filter(id => id !== serviceId)
    )
  }

  const handleBulkDelete = () => {
    if (selectedServices.length === 0) return
    
    if (confirm(`Are you sure you want to delete ${selectedServices.length} service(s)?`)) {
      selectedServices.forEach(serviceId => {
        onDelete(serviceId)
      })
      setSelectedServices([])
    }
  }

  const handleSort = (field: keyof Service) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedServices = [...services].sort((a, b) => {
    const aVal = a[sortField]
    const bVal = b[sortField]
    
    if (aVal === bVal) return 0
    
    const comparison = aVal < bVal ? -1 : 1
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const getCategoryLabel = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const getStatusBadge = (service: Service) => {
    if (!service.is_active) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Inactive</span>
    }
    if (!service.is_bookable_online) {
      return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">In-store Only</span>
    }
    return <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
  }

  const SortIcon = ({ field }: { field: keyof Service }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
      </svg>
    )
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <svg 
          className="mx-auto h-12 w-12 text-gray-400" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No services found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first service.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Bulk Actions */}
      {selectedServices.length > 0 && (
        <div className="bg-blue-50 px-6 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedServices.length} service(s) selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleBulkDelete}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedServices([])}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Services Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedServices.length === services.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Service</span>
                  <SortIcon field="name" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('category')}
              >
                <div className="flex items-center space-x-1">
                  <span>Category</span>
                  <SortIcon field="category" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('base_price')}
              >
                <div className="flex items-center space-x-1">
                  <span>Price</span>
                  <SortIcon field="base_price" />
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('duration_minutes')}
              >
                <div className="flex items-center space-x-1">
                  <span>Duration</span>
                  <SortIcon field="duration_minutes" />
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('display_order')}
              >
                <div className="flex items-center space-x-1">
                  <span>Order</span>
                  <SortIcon field="display_order" />
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedServices.map((service) => (
              <tr key={service.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service.id)}
                    onChange={(e) => handleSelectService(service.id, e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900 flex items-center">
                      {service.name}
                      {service.is_package && (
                        <span className="ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          Package
                        </span>
                      )}
                    </div>
                    {service.description && (
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {service.description}
                      </div>
                    )}
                    {service.sku && (
                      <div className="text-xs text-gray-400">SKU: {service.sku}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900">
                    {getCategoryLabel(service.category)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    ${service.base_price.toFixed(2)}
                    {(service.min_price || service.max_price) && (
                      <div className="text-xs text-gray-500">
                        Range: ${service.min_price || 0} - ${service.max_price || '∞'}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {service.duration_minutes} min
                    {service.buffer_time_minutes > 0 && (
                      <div className="text-xs text-gray-500">
                        +{service.buffer_time_minutes} buffer
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(service)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {service.display_order}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => onEdit(service)}
                      className="text-blue-600 hover:text-blue-900 text-sm"
                    >
                      Edit
                    </button>
                    {onManagePricingRules && (
                      <button
                        onClick={() => onManagePricingRules(service)}
                        className="text-teal-600 hover:text-teal-900 text-sm"
                      >
                        Pricing
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(service.id)}
                      className="text-red-600 hover:text-red-900 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Package Items Details */}
      {sortedServices.some(s => s.is_package && s.package_items?.length) && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Package Details</h4>
          {sortedServices
            .filter(s => s.is_package && s.package_items?.length)
            .map(service => (
              <div key={service.id} className="mb-4 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">{service.name}</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {service.package_items?.map(item => (
                    <div key={item.id} className="text-sm text-gray-600">
                      • {item.name} (${item.base_price}, {item.duration_minutes}min)
                    </div>
                  ))}
                </div>
                {(service.package_discount_percent || service.package_discount_amount) && (
                  <div className="mt-2 text-sm text-green-600">
                    Discount: {service.package_discount_percent ? `${service.package_discount_percent}%` : ''}
                    {service.package_discount_amount ? ` $${service.package_discount_amount}` : ''}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Summary */}
      <div className="mt-6 px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total Services: {services.length}</span>
          <span>
            Active: {services.filter(s => s.is_active).length} | 
            Packages: {services.filter(s => s.is_package).length} | 
            Online Bookable: {services.filter(s => s.is_bookable_online).length}
          </span>
        </div>
      </div>
    </div>
  )
}