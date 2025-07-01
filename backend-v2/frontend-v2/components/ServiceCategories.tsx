'use client'

import { useState, useEffect } from 'react'
import { type Service, type ServiceCategory } from '../lib/api'

interface ServiceCategoriesProps {
  categories: ServiceCategory[]
  services: Service[]
  onCategoriesChange: () => void
}

export default function ServiceCategories({ 
  categories, 
  services, 
  onCategoriesChange 
}: ServiceCategoriesProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [servicesToMove, setServicesToMove] = useState<Service[]>([])
  const [targetCategory, setTargetCategory] = useState<string>('')

  // Group services by category with counts
  const categoryStats = categories.map(category => {
    const categoryServices = services.filter(service => service.category === category.value)
    const activeCount = categoryServices.filter(service => service.is_active).length
    const packageCount = categoryServices.filter(service => service.is_package).length
    const totalRevenue = categoryServices.reduce((sum, service) => sum + service.base_price, 0)
    
    return {
      ...category,
      services: categoryServices,
      totalCount: categoryServices.length,
      activeCount,
      packageCount,
      totalRevenue
    }
  })

  // Services with no category or unknown categories
  const uncategorizedServices = services.filter(service => 
    !categories.some(cat => cat.value === service.category)
  )

  const handleMoveServices = (fromCategory: string) => {
    const servicesToMove = services.filter(service => service.category === fromCategory)
    setServicesToMove(servicesToMove)
    setSelectedCategory(fromCategory)
    setShowMoveDialog(true)
  }

  const confirmMoveServices = async () => {
    if (!targetCategory || servicesToMove.length === 0) return

    try {
      // Note: This would require implementing a bulk update endpoint
      // For now, we'll show a message about the limitation
      alert(`This feature would move ${servicesToMove.length} services from "${selectedCategory}" to "${targetCategory}". Implementation requires a bulk update API endpoint.`)
      
      setShowMoveDialog(false)
      setServicesToMove([])
      setSelectedCategory('')
      setTargetCategory('')
    } catch (error) {
      console.error('Failed to move services:', error)
    }
  }

  const getCategoryUsageColor = (count: number, total: number) => {
    if (count === 0) return 'text-gray-400'
    const percentage = (count / total) * 100
    if (percentage > 75) return 'text-green-600'
    if (percentage > 50) return 'text-blue-600'
    if (percentage > 25) return 'text-yellow-600'
    return 'text-red-600'
  }

  const totalServices = services.length
  const totalActiveServices = services.filter(s => s.is_active).length

  return (
    <div className="p-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Service Categories</h2>
        <p className="text-gray-600 mt-1">
          Overview of how your services are organized by category
        </p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{totalServices}</div>
          <div className="text-sm text-blue-800">Total Services</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{totalActiveServices}</div>
          <div className="text-sm text-green-800">Active Services</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{categories.length}</div>
          <div className="text-sm text-purple-800">Categories</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{uncategorizedServices.length}</div>
          <div className="text-sm text-yellow-800">Uncategorized</div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Category Breakdown</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {categoryStats.map((category) => (
            <div key={category.value} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">{category.label}</h4>
                  <p className="text-sm text-gray-500">{category.value}</p>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-semibold ${getCategoryUsageColor(category.totalCount, totalServices)}`}>
                    {category.totalCount}
                  </div>
                  <div className="text-xs text-gray-500">services</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <div className="text-lg font-medium text-green-600">{category.activeCount}</div>
                  <div className="text-xs text-gray-500">Active</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-purple-600">{category.packageCount}</div>
                  <div className="text-xs text-gray-500">Packages</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-blue-600">${category.totalRevenue.toFixed(0)}</div>
                  <div className="text-xs text-gray-500">Total Price</div>
                </div>
              </div>

              {category.services.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <div className="text-sm text-gray-600 mb-2">Services in this category:</div>
                  <div className="max-h-32 overflow-y-auto">
                    {category.services.map((service) => (
                      <div key={service.id} className="flex justify-between items-center py-1 text-sm">
                        <span className={service.is_active ? 'text-gray-900' : 'text-gray-400'}>
                          {service.name}
                          {service.is_package && <span className="text-purple-600 ml-1">(Package)</span>}
                        </span>
                        <span className="text-gray-500">${service.base_price}</span>
                      </div>
                    ))}
                  </div>
                  
                  {category.services.length > 1 && (
                    <button
                      onClick={() => handleMoveServices(category.value)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      Move all services to another category
                    </button>
                  )}
                </div>
              )}

              {category.services.length === 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-sm text-gray-400 italic">No services in this category</p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Uncategorized Services */}
        {uncategorizedServices.length > 0 && (
          <div className="border border-red-200 bg-red-50 rounded-lg p-4">
            <h4 className="text-lg font-medium text-red-900 mb-3">Uncategorized Services</h4>
            <p className="text-sm text-red-700 mb-3">
              These services have categories that don't match the predefined options. 
              Consider updating them to use standard categories.
            </p>
            <div className="space-y-2">
              {uncategorizedServices.map((service) => (
                <div key={service.id} className="flex justify-between items-center bg-white p-2 rounded border">
                  <div>
                    <span className="font-medium text-gray-900">{service.name}</span>
                    <span className="ml-2 text-sm text-red-600">({service.category})</span>
                  </div>
                  <span className="text-sm text-gray-500">${service.base_price}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category Usage Chart */}
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Category Distribution</h3>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="space-y-3">
            {categoryStats
              .filter(cat => cat.totalCount > 0)
              .sort((a, b) => b.totalCount - a.totalCount)
              .map((category) => {
                const percentage = totalServices > 0 ? (category.totalCount / totalServices) * 100 : 0
                return (
                  <div key={category.value} className="flex items-center">
                    <div className="w-32 text-sm text-gray-600 truncate">{category.label}</div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-sm text-gray-900 text-right">
                      {category.totalCount} ({percentage.toFixed(1)}%)
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </div>

      {/* Move Services Dialog */}
      {showMoveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Move Services</h3>
            <p className="text-sm text-gray-600 mb-4">
              Move {servicesToMove.length} services from "{categories.find(c => c.value === selectedCategory)?.label}" to:
            </p>
            
            <select
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
            >
              <option value="">Select target category</option>
              {categories
                .filter(cat => cat.value !== selectedCategory)
                .map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
            </select>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowMoveDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmMoveServices}
                disabled={!targetCategory}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Move Services
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Category Management Tips</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Categories help organize services for easier booking and management</li>
          <li>• Ensure all services have appropriate categories for better user experience</li>
          <li>• Package services can contain items from multiple categories</li>
          <li>• Consider service pricing and duration when organizing categories</li>
        </ul>
      </div>
    </div>
  )
}