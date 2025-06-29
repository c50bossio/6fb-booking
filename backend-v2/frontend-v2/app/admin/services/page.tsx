'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  getProfile,
  getServices, 
  getServiceCategories, 
  deleteService, 
  type Service, 
  type ServiceCategory 
} from '../../../lib/api'
import ServiceList from '../../../components/ServiceList'
import ServiceForm from '../../../components/ServiceForm'
import ServiceCategories from '../../../components/ServiceCategories'
import PricingRuleEditor from '../../../components/PricingRuleEditor'

export default function AdminServicesPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [services, setServices] = useState<Service[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // UI state
  const [activeTab, setActiveTab] = useState<'list' | 'form' | 'categories' | 'pricing'>('list')
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [pricingService, setPricingService] = useState<Service | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Check if user is authenticated and is admin
      const userProfile = await getProfile()
      if (userProfile.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setUser(userProfile)

      // Load services and categories
      const [servicesData, categoriesData] = await Promise.all([
        getServices(),
        getServiceCategories()
      ])
      
      setServices(servicesData)
      setCategories(categoriesData)
    } catch (err: any) {
      setError(err.message || 'Failed to load data')
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        router.push('/login')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateService = () => {
    setEditingService(null)
    setActiveTab('form')
  }

  const handleEditService = (service: Service) => {
    setEditingService(service)
    setActiveTab('form')
  }

  const handleDeleteService = async (serviceId: number) => {
    if (!confirm('Are you sure you want to delete this service? If it has been used in appointments, it will be deactivated instead.')) {
      return
    }

    try {
      const result = await deleteService(serviceId)
      setSuccess(result.message)
      loadData() // Reload data
    } catch (err: any) {
      setError(err.message || 'Failed to delete service')
    }
  }

  const handleManagePricingRules = (service: Service) => {
    setPricingService(service)
    setActiveTab('pricing')
  }

  const handleServiceSaved = () => {
    setSuccess('Service saved successfully!')
    setActiveTab('list')
    loadData() // Reload data
  }

  const handleFormCancel = () => {
    setEditingService(null)
    setActiveTab('list')
  }

  // Filter services based on search and filters
  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (service.description && service.description.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = !categoryFilter || service.category === categoryFilter
    
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && service.is_active) ||
                         (statusFilter === 'inactive' && !service.is_active)
    
    return matchesSearch && matchesCategory && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading services...</div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-red-600">Access denied. Admin role required.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Service Management</h1>
                <p className="text-gray-600 mt-1">Manage your service offerings, pricing, and categories</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Back to Admin
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="px-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('list')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'list'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Services ({filteredServices.length})
              </button>
              <button
                onClick={() => setActiveTab('form')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'form'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {editingService ? 'Edit Service' : 'Add Service'}
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'categories'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Categories
              </button>
              {pricingService && (
                <button
                  onClick={() => setActiveTab('pricing')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'pricing'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Pricing Rules - {pricingService.name}
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
            <button 
              onClick={() => setError('')}
              className="mt-2 text-sm text-red-600 hover:text-red-500"
            >
              Dismiss
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700">{success}</p>
            <button 
              onClick={() => setSuccess('')}
              className="mt-2 text-sm text-green-600 hover:text-green-500"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'list' && (
          <div className="bg-white shadow-sm rounded-lg">
            {/* Search and Filters */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Search services by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button
                  onClick={handleCreateService}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 whitespace-nowrap"
                >
                  Add Service
                </button>
              </div>
            </div>

            <ServiceList
              services={filteredServices}
              onEdit={handleEditService}
              onDelete={handleDeleteService}
              onManagePricingRules={handleManagePricingRules}
            />
          </div>
        )}

        {activeTab === 'form' && (
          <div className="bg-white shadow-sm rounded-lg">
            <ServiceForm
              service={editingService}
              categories={categories}
              services={services} // For package selection
              onSave={handleServiceSaved}
              onCancel={handleFormCancel}
            />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="bg-white shadow-sm rounded-lg">
            <ServiceCategories
              categories={categories}
              services={services}
              onCategoriesChange={loadData}
            />
          </div>
        )}

        {activeTab === 'pricing' && pricingService && (
          <div className="bg-white shadow-sm rounded-lg p-6">
            <div className="mb-4">
              <button
                onClick={() => {
                  setActiveTab('list')
                  setPricingService(null)
                }}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                ← Back to Services
              </button>
            </div>
            <PricingRuleEditor
              serviceId={pricingService.id}
              serviceName={pricingService.name}
              basePrice={pricingService.base_price}
            />
          </div>
        )}
      </div>
    </div>
  )
}