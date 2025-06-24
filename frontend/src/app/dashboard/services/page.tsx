'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ScissorsIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CurrencyDollarIcon,
  TagIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline'
import ModernLayout from '@/components/ModernLayout'
import { servicesService, type Service, type ServiceCategory } from '@/lib/api/services'


export default function ServicesPage() {
  const router = useRouter()
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [showCategoryModal, setShowCategoryModal] = useState(false)

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    setLoading(true)
    try {
      // Fetch categories first
      const categoriesResponse = await servicesService.getCategories(true)
      setCategories(categoriesResponse.data || [])

      // Fetch services
      const servicesResponse = await servicesService.getServices({
        is_active: true,
        limit: 100
      })
      setServices(servicesResponse.data || [])
    } catch (error) {
      console.error('Failed to fetch services:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (service.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || service.category_name === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleDelete = async (serviceId: number) => {
    if (confirm('Are you sure you want to delete this service?')) {
      try {
        await servicesService.deleteService(serviceId)
        await fetchServices() // Refresh the list
      } catch (error) {
        console.error('Failed to delete service:', error)
        alert('Failed to delete service')
      }
    }
  }

  const handleToggleActive = async (serviceId: number) => {
    try {
      await servicesService.toggleServiceStatus(serviceId)
      await fetchServices() // Refresh the list
    } catch (error) {
      console.error('Failed to toggle service status:', error)
    }
  }

  const getCategoryColor = (categoryName?: string) => {
    if (!categoryName) return '#6b7280'
    const category = categories.find(c => c.name === categoryName)
    return category?.color || '#6b7280'
  }

  const getTotalRevenue = () => {
    return filteredServices.reduce((sum, service) => sum + service.base_price, 0)
  }

  const getAverageDuration = () => {
    if (filteredServices.length === 0) return 0
    const totalDuration = filteredServices.reduce((sum, service) => sum + service.duration_minutes, 0)
    return Math.round(totalDuration / filteredServices.length)
  }

  return (
    <ModernLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Services</h1>
            <p className="text-gray-600">Manage your service catalog and pricing</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCategoryModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
            >
              <Squares2X2Icon className="h-4 w-4" />
              <span>Manage Categories</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Service</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search services..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.name}>{category.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500"
            >
              <option value="all">All Services</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className={`bg-white rounded-lg border ${service.isActive ? 'border-gray-200' : 'border-gray-300 opacity-60'} p-6 hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${getCategoryColor(service.category_name)}20` }}
                  >
                    <ScissorsIcon
                      className="h-6 w-6"
                      style={{ color: getCategoryColor(service.category_name) }}
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full inline-block mt-1"
                      style={{
                        backgroundColor: `${getCategoryColor(service.category)}20`,
                        color: getCategoryColor(service.category)
                      }}
                    >
                      {service.category}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setSelectedService(service)
                      setShowEditModal(true)
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="Edit service"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete service"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{service.description}</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2 text-gray-500">
                    <ClockIcon className="h-4 w-4" />
                    <span>{service.duration} minutes</span>
                  </div>
                  <div className="flex items-center space-x-2 font-semibold text-gray-900">
                    <CurrencyDollarIcon className="h-4 w-4" />
                    <span>${service.price}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleToggleActive(service.id)}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    service.isActive
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {service.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredServices.length === 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <ScissorsIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCategory !== 'all'
                ? 'Try adjusting your filters to see more services.'
                : 'Get started by adding your first service.'
              }
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              Add Service
            </button>
          </div>
        )}

        {/* Summary Stats */}
        {filteredServices.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <ScissorsIcon className="h-8 w-8 text-slate-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Services</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {filteredServices.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <TagIcon className="h-8 w-8 text-violet-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Categories</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {categories.length}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-amber-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Avg Duration</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {getAverageDuration()} min
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Value</p>
                  <p className="text-lg font-semibold text-gray-900">
                    ${getTotalRevenue()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModernLayout>
  )
}
