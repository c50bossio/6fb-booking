'use client'

import { useState, useEffect } from 'react'
import { 
  createService, 
  updateService, 
  type Service, 
  type ServiceCreate, 
  type ServiceUpdate, 
  type ServiceCategory 
} from '../lib/api'
import PricingValidationWidget from './PricingValidationWidget'
import { 
  ServiceCategoryEnum, 
  PricingValidationResult, 
  PricingRecommendation,
  SixFBTier,
  MarketType
} from '../lib/pricing-validation'

interface ServiceFormProps {
  service?: Service | null
  categories: ServiceCategory[]
  services: Service[] // For package selection
  onSave: () => void
  onCancel: () => void
}

export default function ServiceForm({ 
  service, 
  categories, 
  services, 
  onSave, 
  onCancel 
}: ServiceFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    sku: '',
    base_price: 0,
    min_price: 0,
    max_price: 0,
    duration_minutes: 30,
    buffer_time_minutes: 0,
    is_active: true,
    is_bookable_online: true,
    max_advance_booking_days: 30,
    min_advance_booking_hours: 1,
    is_package: false,
    package_discount_percent: 0,
    package_discount_amount: 0,
    display_order: 0,
    image_url: '',
    package_item_ids: [] as number[]
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Pricing validation state
  const [showPricingValidation, setShowPricingValidation] = useState(true)
  const [pricingValidation, setPricingValidation] = useState<PricingValidationResult | null>(null)
  const [selectedTier, setSelectedTier] = useState<SixFBTier>(SixFBTier.PROFESSIONAL)
  const [selectedMarketType, setSelectedMarketType] = useState<MarketType>(MarketType.URBAN)

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name,
        description: service.description || '',
        category: service.category,
        sku: service.sku || '',
        base_price: service.base_price,
        min_price: service.min_price || 0,
        max_price: service.max_price || 0,
        duration_minutes: service.duration_minutes,
        buffer_time_minutes: service.buffer_time_minutes,
        is_active: service.is_active,
        is_bookable_online: service.is_bookable_online,
        max_advance_booking_days: service.max_advance_booking_days || 30,
        min_advance_booking_hours: service.min_advance_booking_hours || 1,
        is_package: service.is_package,
        package_discount_percent: service.package_discount_percent || 0,
        package_discount_amount: service.package_discount_amount || 0,
        display_order: service.display_order,
        image_url: service.image_url || '',
        package_item_ids: service.package_items?.map(item => item.id) || []
      })
      // Show advanced section if service has advanced settings
      setShowAdvanced(
        !!(service.min_price || service.max_price || service.buffer_time_minutes || 
           service.max_advance_booking_days !== 30 || service.min_advance_booking_hours !== 1 ||
           service.package_discount_percent || service.package_discount_amount || service.image_url)
      )
    }
  }, [service])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  const handlePackageItemToggle = (itemId: number) => {
    setFormData(prev => ({
      ...prev,
      package_item_ids: prev.package_item_ids.includes(itemId)
        ? prev.package_item_ids.filter(id => id !== itemId)
        : [...prev.package_item_ids, itemId]
    }))
  }

  // Pricing validation handlers
  const handlePricingValidation = (validation: PricingValidationResult) => {
    setPricingValidation(validation)
  }

  const handleRecommendationApply = (recommendation: PricingRecommendation) => {
    // Apply the recommended price
    setFormData(prev => ({
      ...prev,
      base_price: recommendation.recommendedPrice
    }))
    
    // Show success message
    setError('')
    // Could show a temporary success message here
  }

  const mapCategoryToEnum = (category: string): ServiceCategoryEnum => {
    // Map API category strings to enum values
    switch (category.toLowerCase()) {
      case 'haircut': return ServiceCategoryEnum.HAIRCUT;
      case 'beard': return ServiceCategoryEnum.BEARD;
      case 'shave': return ServiceCategoryEnum.SHAVE;
      case 'hair_treatment': return ServiceCategoryEnum.HAIR_TREATMENT;
      case 'styling': return ServiceCategoryEnum.STYLING;
      case 'color': return ServiceCategoryEnum.COLOR;
      case 'package': return ServiceCategoryEnum.PACKAGE;
      default: return ServiceCategoryEnum.OTHER;
    }
  }

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Service name is required'
    }
    
    if (!formData.category) {
      return 'Category is required'
    }
    
    if (formData.base_price <= 0) {
      return 'Base price must be greater than 0'
    }
    
    if (formData.duration_minutes <= 0) {
      return 'Duration must be greater than 0'
    }
    
    if (formData.min_price && formData.min_price > formData.base_price) {
      return 'Minimum price cannot be greater than base price'
    }
    
    if (formData.max_price && formData.max_price < formData.base_price) {
      return 'Maximum price cannot be less than base price'
    }
    
    if (formData.is_package && formData.package_item_ids.length === 0) {
      return 'Package services must have at least one item'
    }
    
    if (formData.package_discount_percent && (formData.package_discount_percent < 0 || formData.package_discount_percent > 100)) {
      return 'Package discount percentage must be between 0 and 100'
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const validationError = validateForm()
      if (validationError) {
        throw new Error(validationError)
      }

      // Prepare data for submission
      const submitData = {
        ...formData,
        // Convert empty strings to undefined for optional fields
        description: formData.description || undefined,
        sku: formData.sku || undefined,
        image_url: formData.image_url || undefined,
        // Only include pricing ranges if they're set
        min_price: formData.min_price || undefined,
        max_price: formData.max_price || undefined,
        // Only include package data if it's a package
        package_discount_percent: formData.is_package ? formData.package_discount_percent || undefined : undefined,
        package_discount_amount: formData.is_package ? formData.package_discount_amount || undefined : undefined,
        package_item_ids: formData.is_package ? formData.package_item_ids : undefined,
        // Only include booking limits if they're different from defaults
        max_advance_booking_days: formData.max_advance_booking_days !== 30 ? formData.max_advance_booking_days : undefined,
        min_advance_booking_hours: formData.min_advance_booking_hours !== 1 ? formData.min_advance_booking_hours : undefined
      }

      if (service) {
        await updateService(service.id, submitData as ServiceUpdate)
      } else {
        await createService(submitData as ServiceCreate)
      }

      onSave()
    } catch (err: any) {
      setError(err.message || 'Failed to save service')
    } finally {
      setLoading(false)
    }
  }

  // Get available services for packages (exclude current service and other packages)
  const availableForPackage = services.filter(s => 
    !s.is_package && 
    s.is_active && 
    (!service || s.id !== service.id)
  )

  return (
    <div className="p-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {service ? 'Edit Service' : 'Add New Service'}
        </h2>
        <p className="text-gray-600 mt-1">
          {service ? 'Update service details and settings' : 'Create a new service for your business'}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Classic Haircut"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Brief description of the service..."
            />
          </div>
        </div>

        {/* Pricing and Duration */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Base Price * ($)
            </label>
            <input
              type="number"
              value={formData.base_price}
              onChange={(e) => handleInputChange('base_price', parseFloat(e.target.value) || 0)}
              min="0"
              step="0.01"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Duration * (minutes)
            </label>
            <input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => handleInputChange('duration_minutes', parseInt(e.target.value) || 0)}
              min="5"
              step="5"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Display Order
            </label>
            <input
              type="number"
              value={formData.display_order}
              onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 0)}
              min="0"
              className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 6FB Pricing Validation */}
        {showPricingValidation && formData.name && formData.category && formData.base_price > 0 && formData.duration_minutes > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">6FB Pricing Validation</h3>
              <button
                type="button"
                onClick={() => setShowPricingValidation(!showPricingValidation)}
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                {showPricingValidation ? 'Hide' : 'Show'} Validation
              </button>
            </div>

            {/* Tier and Market Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target 6FB Tier
                </label>
                <select
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value as SixFBTier)}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={SixFBTier.STARTER}>Starter - Foundation Services</option>
                  <option value={SixFBTier.PROFESSIONAL}>Professional - Enhanced Services</option>
                  <option value={SixFBTier.PREMIUM}>Premium - Luxury Services</option>
                  <option value={SixFBTier.LUXURY}>Luxury - Ultimate Services</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Market Type
                </label>
                <select
                  value={selectedMarketType}
                  onChange={(e) => setSelectedMarketType(e.target.value as MarketType)}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={MarketType.URBAN}>Urban - City Market</option>
                  <option value={MarketType.SUBURBAN}>Suburban - Neighborhood Market</option>
                  <option value={MarketType.LUXURY}>Luxury - High-End Market</option>
                  <option value={MarketType.ECONOMY}>Economy - Budget Market</option>
                </select>
              </div>
            </div>

            {/* Pricing Validation Widget */}
            <PricingValidationWidget
              serviceName={formData.name}
              category={mapCategoryToEnum(formData.category)}
              basePrice={formData.base_price}
              duration={formData.duration_minutes}
              minPrice={formData.min_price}
              maxPrice={formData.max_price}
              isPackage={formData.is_package}
              marketType={selectedMarketType}
              targetTier={selectedTier}
              onChange={handlePricingValidation}
              onRecommendationApply={handleRecommendationApply}
              showRecommendations={true}
              showBenchmarks={true}
              showEducational={true}
              compact={false}
            />

            {/* Validation Summary */}
            {pricingValidation && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="font-medium text-blue-900 mb-2">Validation Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700">6FB Alignment:</span>
                    <span className="ml-2 font-semibold text-blue-900">
                      {pricingValidation.methodologyAlignment}%
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-700">Revenue Optimization:</span>
                    <span className="ml-2 font-semibold text-blue-900">
                      {pricingValidation.revenueOptimization}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status Toggles */}
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Service is active
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_bookable_online"
              checked={formData.is_bookable_online}
              onChange={(e) => handleInputChange('is_bookable_online', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_bookable_online" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Allow online booking
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_package"
              checked={formData.is_package}
              onChange={(e) => handleInputChange('is_package', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_package" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              This is a package (combination of multiple services)
            </label>
          </div>
        </div>

        {/* Package Configuration */}
        {formData.is_package && (
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Package Configuration</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Discount Percentage (%)
                </label>
                <input
                  type="number"
                  value={formData.package_discount_percent}
                  onChange={(e) => handleInputChange('package_discount_percent', parseFloat(e.target.value) || 0)}
                  min="0"
                  max="100"
                  step="0.1"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Fixed Discount Amount ($)
                </label>
                <input
                  type="number"
                  value={formData.package_discount_amount}
                  onChange={(e) => handleInputChange('package_discount_amount', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Package Items (Select services to include)
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                {availableForPackage.length > 0 ? (
                  availableForPackage.map(service => (
                    <div key={service.id} className="p-3 border-b border-gray-100 last:border-b-0">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.package_item_ids.includes(service.id)}
                          onChange={() => handlePackageItemToggle(service.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{service.name}</div>
                          <div className="text-sm text-gray-500">
                            ${service.base_price} • {service.duration_minutes} min
                          </div>
                        </div>
                      </label>
                    </div>
                  ))
                ) : (
                  <p className="p-3 text-sm text-gray-500">No services available for packages</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Advanced Settings */}
        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Settings</span>
            <svg 
              className={`ml-1 h-4 w-4 transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {showAdvanced && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Advanced Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SKU/Product Code
                </label>
                <input
                  type="text"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., HC001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Buffer Time (minutes)
                </label>
                <input
                  type="number"
                  value={formData.buffer_time_minutes}
                  onChange={(e) => handleInputChange('buffer_time_minutes', parseInt(e.target.value) || 0)}
                  min="0"
                  max="60"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Price ($)
                </label>
                <input
                  type="number"
                  value={formData.min_price}
                  onChange={(e) => handleInputChange('min_price', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Price ($)
                </label>
                <input
                  type="number"
                  value={formData.max_price}
                  onChange={(e) => handleInputChange('max_price', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Advance Booking (days)
                </label>
                <input
                  type="number"
                  value={formData.max_advance_booking_days}
                  onChange={(e) => handleInputChange('max_advance_booking_days', parseInt(e.target.value) || 0)}
                  min="1"
                  max="365"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Min Advance Booking (hours)
                </label>
                <input
                  type="number"
                  value={formData.min_advance_booking_hours}
                  onChange={(e) => handleInputChange('min_advance_booking_hours', parseInt(e.target.value) || 0)}
                  min="0"
                  max="168"
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image URL
                </label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => handleInputChange('image_url', e.target.value)}
                  className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : (service ? 'Update Service' : 'Create Service')}
          </button>
        </div>
      </form>
    </div>
  )
}