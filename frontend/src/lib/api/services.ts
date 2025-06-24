/**
 * Services API - Managing barber services, categories, and pricing
 */

import apiClient from './client'
import type { ApiResponse, PaginatedResponse } from './client'

// === DEMO MODE CONFIGURATION ===
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// === MOCK DATA FOR DEMO MODE ===
const MOCK_CATEGORIES: ServiceCategory[] = [
  {
    id: 1,
    name: "Haircuts",
    slug: "haircuts",
    description: "Professional haircut services",
    display_order: 1,
    icon: "scissors",
    color: "#3b82f6",
    is_active: true,
    services_count: 8,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    name: "Beard Services",
    slug: "beard-services",
    description: "Beard trimming and styling",
    display_order: 2,
    icon: "razor",
    color: "#10b981",
    is_active: true,
    services_count: 5,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    name: "Hair Treatments",
    slug: "hair-treatments",
    description: "Specialized hair care treatments",
    display_order: 3,
    icon: "sparkles",
    color: "#8b5cf6",
    is_active: true,
    services_count: 4,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 4,
    name: "Styling",
    slug: "styling",
    description: "Hair styling and finishing",
    display_order: 4,
    icon: "brush",
    color: "#f59e0b",
    is_active: true,
    services_count: 3,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
]

const MOCK_SERVICES: Service[] = [
  // Haircuts
  {
    id: 1,
    name: "Classic Cut",
    description: "Traditional haircut with scissor work and styling",
    category_id: 1,
    category_name: "Haircuts",
    base_price: 35,
    duration_minutes: 30,
    buffer_minutes: 5,
    requires_deposit: false,
    is_addon: false,
    can_overlap: false,
    max_advance_days: 30,
    min_advance_hours: 2,
    display_order: 1,
    is_active: true,
    is_featured: true,
    tags: ["popular", "classic"],
    booking_count: 245,
    total_revenue: 8575,
    average_rating: 4.8,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 2,
    name: "Fade Master",
    description: "Precision fade with multiple gradient levels",
    category_id: 1,
    category_name: "Haircuts",
    base_price: 40,
    duration_minutes: 45,
    buffer_minutes: 5,
    requires_deposit: false,
    is_addon: false,
    can_overlap: false,
    max_advance_days: 30,
    min_advance_hours: 2,
    display_order: 2,
    is_active: true,
    is_featured: true,
    tags: ["fade", "precision", "popular"],
    booking_count: 312,
    total_revenue: 12480,
    average_rating: 4.9,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 3,
    name: "Executive Package",
    description: "Premium cut with hot towel service and styling",
    category_id: 1,
    category_name: "Haircuts",
    base_price: 65,
    duration_minutes: 60,
    buffer_minutes: 10,
    requires_deposit: true,
    deposit_type: "percentage",
    deposit_amount: 25,
    is_addon: false,
    can_overlap: false,
    max_advance_days: 30,
    min_advance_hours: 4,
    display_order: 3,
    is_active: true,
    is_featured: false,
    tags: ["premium", "executive"],
    booking_count: 89,
    total_revenue: 5785,
    average_rating: 5.0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  // Beard Services
  {
    id: 4,
    name: "Beard Trim",
    description: "Professional beard shaping and trimming",
    category_id: 2,
    category_name: "Beard Services",
    base_price: 25,
    duration_minutes: 20,
    buffer_minutes: 5,
    requires_deposit: false,
    is_addon: false,
    can_overlap: false,
    max_advance_days: 30,
    min_advance_hours: 1,
    display_order: 1,
    is_active: true,
    is_featured: false,
    tags: ["beard", "trim"],
    booking_count: 178,
    total_revenue: 4450,
    average_rating: 4.7,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 5,
    name: "Beard Design",
    description: "Custom beard styling with line work",
    category_id: 2,
    category_name: "Beard Services",
    base_price: 35,
    duration_minutes: 30,
    buffer_minutes: 5,
    requires_deposit: false,
    is_addon: false,
    can_overlap: false,
    max_advance_days: 30,
    min_advance_hours: 2,
    display_order: 2,
    is_active: true,
    is_featured: false,
    tags: ["beard", "design", "styling"],
    booking_count: 134,
    total_revenue: 4690,
    average_rating: 4.8,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  // Hair Treatments
  {
    id: 6,
    name: "Deep Conditioning",
    description: "Intensive hair treatment for damaged hair",
    category_id: 3,
    category_name: "Hair Treatments",
    base_price: 30,
    duration_minutes: 30,
    buffer_minutes: 5,
    requires_deposit: false,
    is_addon: true,
    can_overlap: true,
    max_advance_days: 30,
    min_advance_hours: 2,
    display_order: 1,
    is_active: true,
    is_featured: false,
    tags: ["treatment", "conditioning"],
    booking_count: 67,
    total_revenue: 2010,
    average_rating: 4.6,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  {
    id: 7,
    name: "Scalp Treatment",
    description: "Therapeutic scalp massage and treatment",
    category_id: 3,
    category_name: "Hair Treatments",
    base_price: 40,
    duration_minutes: 40,
    buffer_minutes: 5,
    requires_deposit: false,
    is_addon: true,
    can_overlap: true,
    max_advance_days: 30,
    min_advance_hours: 3,
    display_order: 2,
    is_active: false,
    is_featured: false,
    tags: ["treatment", "scalp", "therapeutic"],
    booking_count: 45,
    total_revenue: 1800,
    average_rating: 4.9,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  },
  // Styling
  {
    id: 8,
    name: "Event Styling",
    description: "Special occasion hair styling",
    category_id: 4,
    category_name: "Styling",
    base_price: 50,
    duration_minutes: 45,
    buffer_minutes: 10,
    requires_deposit: true,
    deposit_type: "fixed",
    deposit_amount: 20,
    is_addon: false,
    can_overlap: false,
    max_advance_days: 60,
    min_advance_hours: 24,
    display_order: 1,
    is_active: true,
    is_featured: false,
    tags: ["styling", "event", "special"],
    booking_count: 23,
    total_revenue: 1150,
    average_rating: 5.0,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z"
  }
]

const MOCK_SERVICE_STATS: ServiceStats = {
  total_services: 20,
  active_services: 15,
  featured_services: 3,
  addon_services: 5,
  categories_count: 4,
  average_price: 38.5,
  average_duration: 35,
  price_range: { min: 15, max: 85 },
  most_popular_service: {
    id: 2,
    name: "Fade Master",
    booking_count: 312
  },
  highest_revenue_service: {
    id: 2,
    name: "Fade Master",
    revenue: 12480
  },
  booking_distribution: [
    {
      service_id: 2,
      service_name: "Fade Master",
      booking_count: 312,
      revenue: 12480,
      percentage: 28.5
    },
    {
      service_id: 1,
      service_name: "Classic Cut",
      booking_count: 245,
      revenue: 8575,
      percentage: 22.3
    },
    {
      service_id: 4,
      service_name: "Beard Trim",
      booking_count: 178,
      revenue: 4450,
      percentage: 16.2
    }
  ]
}

// === TYPE DEFINITIONS ===

export interface ServiceCategory {
  id: number
  name: string
  slug: string
  description?: string
  display_order: number
  icon?: string
  color?: string
  is_active: boolean
  services_count?: number
  created_at: string
  updated_at: string
}

export interface Service {
  id: number
  name: string
  description?: string
  category_id: number
  category_name?: string
  category?: ServiceCategory

  // Pricing
  base_price: number
  min_price?: number
  max_price?: number

  // Duration
  duration_minutes: number
  buffer_minutes?: number

  // Deposit Settings
  requires_deposit: boolean
  deposit_type?: 'percentage' | 'fixed'
  deposit_amount?: number

  // Service Settings
  is_addon: boolean
  can_overlap: boolean
  max_advance_days: number
  min_advance_hours: number

  // Availability
  location_id?: number
  location_name?: string
  barber_id?: number
  barber_name?: string

  // Display Settings
  display_order: number
  is_active: boolean
  is_featured: boolean

  // SEO/Marketing
  tags?: string[]
  meta_description?: string

  // Statistics
  booking_count?: number
  total_revenue?: number
  average_rating?: number

  created_at: string
  updated_at: string
}

export interface ServiceAddon {
  id: number
  name: string
  description?: string
  price: number
  duration_minutes?: number
  is_active: boolean
  can_combine_with?: number[] // Service IDs this addon works with
}

export interface ServicePackage {
  id: number
  name: string
  description?: string
  service_ids: number[]
  services?: Service[]
  total_duration: number
  individual_price: number
  package_price: number
  discount_amount: number
  discount_percentage: number
  is_active: boolean
  location_id?: number
  barber_id?: number
}

export interface PricingRule {
  id: number
  name: string
  description?: string
  rule_type: 'time_based' | 'day_based' | 'volume_based' | 'client_based'
  conditions: {
    // Time-based: peak hours pricing
    start_time?: string
    end_time?: string
    days_of_week?: number[]

    // Volume-based: bulk booking discounts
    min_services?: number
    max_services?: number

    // Client-based: loyalty discounts
    client_type?: 'new' | 'returning' | 'vip'
    min_visits?: number
  }
  adjustment: {
    type: 'percentage' | 'fixed'
    amount: number
    operation: 'add' | 'subtract' | 'multiply'
  }
  priority: number
  is_active: boolean
  effective_from?: string
  effective_until?: string
  location_id?: number
  barber_id?: number
  service_id?: number
}

export interface ServiceAvailability {
  service_id: number
  barber_id: number
  location_id: number
  is_available: boolean
  custom_price?: number
  custom_duration?: number
  notes?: string
  effective_from?: string
  effective_until?: string
}

export interface ServiceFilter {
  category_id?: number
  location_id?: number
  barber_id?: number
  is_active?: boolean
  is_featured?: boolean
  is_addon?: boolean
  min_price?: number
  max_price?: number
  min_duration?: number
  max_duration?: number
  tags?: string[]
  search?: string
  skip?: number
  limit?: number
}

export interface ServiceStats {
  total_services: number
  active_services: number
  featured_services: number
  addon_services: number
  categories_count: number
  average_price: number
  average_duration: number
  price_range?: { min: number; max: number }
  most_popular_service: {
    id: number
    name: string
    booking_count: number
  }
  highest_revenue_service: {
    id: number
    name: string
    revenue: number
  }
  booking_distribution: Array<{
    service_id: number
    service_name: string
    booking_count: number
    revenue: number
    percentage: number
  }>
}

export interface CreateServiceRequest {
  name: string
  description?: string
  category_id: number
  base_price: number
  min_price?: number
  max_price?: number
  duration_minutes: number
  buffer_minutes?: number
  requires_deposit?: boolean
  deposit_type?: 'percentage' | 'fixed'
  deposit_amount?: number
  is_addon?: boolean
  can_overlap?: boolean
  max_advance_days?: number
  min_advance_hours?: number
  location_id?: number
  barber_id?: number
  display_order?: number
  is_featured?: boolean
  tags?: string[]
  meta_description?: string
}

export interface UpdateServiceRequest extends Partial<CreateServiceRequest> {
  is_active?: boolean
}

export interface CreateCategoryRequest {
  name: string
  slug?: string
  description?: string
  display_order?: number
  icon?: string
  color?: string
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  is_active?: boolean
}

// === SERVICES API ===

export const servicesService = {
  // === SERVICES CRUD ===

  /**
   * Get list of services with filtering and pagination
   */
  async getServices(filters?: ServiceFilter): Promise<PaginatedResponse<Service>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock services')
      let filteredServices = [...MOCK_SERVICES]

      // Apply filters
      if (filters?.category_id) {
        filteredServices = filteredServices.filter(s => s.category_id === filters.category_id)
      }
      if (filters?.is_active !== undefined) {
        filteredServices = filteredServices.filter(s => s.is_active === filters.is_active)
      }
      if (filters?.search) {
        const search = filters.search.toLowerCase()
        filteredServices = filteredServices.filter(s =>
          s.name.toLowerCase().includes(search) ||
          s.description?.toLowerCase().includes(search)
        )
      }

      const limit = filters?.limit || 20
      const skip = filters?.skip || 0
      const paginatedServices = filteredServices.slice(skip, skip + limit)

      return {
        data: paginatedServices,
        total: filteredServices.length,
        page: Math.floor(skip / limit) + 1,
        totalPages: Math.ceil(filteredServices.length / limit),
        hasNext: skip + limit < filteredServices.length,
        hasPrev: skip > 0
      }
    }

    const params = new URLSearchParams()

    if (filters?.category_id) params.append('category_id', filters.category_id.toString())
    if (filters?.location_id) params.append('location_id', filters.location_id.toString())
    if (filters?.barber_id) params.append('barber_id', filters.barber_id.toString())
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString())
    if (filters?.is_featured !== undefined) params.append('is_featured', filters.is_featured.toString())
    if (filters?.is_addon !== undefined) params.append('is_addon', filters.is_addon.toString())
    if (filters?.min_price) params.append('min_price', filters.min_price.toString())
    if (filters?.max_price) params.append('max_price', filters.max_price.toString())
    if (filters?.min_duration) params.append('min_duration', filters.min_duration.toString())
    if (filters?.max_duration) params.append('max_duration', filters.max_duration.toString())
    if (filters?.search) params.append('search', filters.search)
    if (filters?.skip) params.append('skip', filters.skip.toString())
    if (filters?.limit) params.append('limit', filters.limit.toString())

    if (filters?.tags?.length) {
      filters.tags.forEach(tag => params.append('tags', tag))
    }

    const response = await apiClient.get<PaginatedResponse<Service>>(`/services?${params.toString()}`)
    return response.data
  },

  /**
   * Get service by ID
   */
  async getService(serviceId: number): Promise<ApiResponse<Service>> {
    const response = await apiClient.get<Service>(`/services/${serviceId}`)
    return { data: response.data }
  },

  /**
   * Create new service
   */
  async createService(data: CreateServiceRequest): Promise<ApiResponse<Service>> {
    const response = await apiClient.post<Service>('/services', data)
    return { data: response.data }
  },

  /**
   * Update service
   */
  async updateService(serviceId: number, data: UpdateServiceRequest): Promise<ApiResponse<Service>> {
    const response = await apiClient.put<Service>(`/services/${serviceId}`, data)
    return { data: response.data }
  },

  /**
   * Delete service
   */
  async deleteService(serviceId: number): Promise<ApiResponse<void>> {
    if (DEMO_MODE) {
      const index = MOCK_SERVICES.findIndex(s => s.id === serviceId)
      if (index > -1) {
        MOCK_SERVICES.splice(index, 1)
        console.log(`Demo mode: Deleted service ${serviceId}`)
        return { data: undefined }
      }
      throw new Error('Service not found')
    }

    const response = await apiClient.delete(`/services/${serviceId}`)
    return { data: response.data }
  },

  /**
   * Toggle service active status
   */
  async toggleServiceStatus(serviceId: number): Promise<ApiResponse<Service>> {
    if (DEMO_MODE) {
      const service = MOCK_SERVICES.find(s => s.id === serviceId)
      if (service) {
        service.is_active = !service.is_active
        console.log(`Demo mode: Toggled service ${serviceId} status to ${service.is_active}`)
        return { data: { ...service } }
      }
      throw new Error('Service not found')
    }

    const response = await apiClient.post<Service>(`/services/${serviceId}/toggle-status`)
    return { data: response.data }
  },

  // === CATEGORIES CRUD ===

  /**
   * Get all service categories
   */
  async getCategories(includeStats = false): Promise<ApiResponse<ServiceCategory[]>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock categories')
      return { data: MOCK_CATEGORIES }
    }

    const params = includeStats ? '?include_stats=true' : ''
    const response = await apiClient.get<ServiceCategory[]>(`/services/categories${params}`)
    return { data: response.data }
  },

  /**
   * Get category by ID
   */
  async getCategory(categoryId: number): Promise<ApiResponse<ServiceCategory>> {
    const response = await apiClient.get<ServiceCategory>(`/services/categories/${categoryId}`)
    return { data: response.data }
  },

  /**
   * Create new category
   */
  async createCategory(data: CreateCategoryRequest): Promise<ApiResponse<ServiceCategory>> {
    const response = await apiClient.post<ServiceCategory>('/services/categories', data)
    return { data: response.data }
  },

  /**
   * Update category
   */
  async updateCategory(categoryId: number, data: UpdateCategoryRequest): Promise<ApiResponse<ServiceCategory>> {
    const response = await apiClient.patch<ServiceCategory>(`/services/categories/${categoryId}`, data)
    return { data: response.data }
  },

  /**
   * Delete category
   */
  async deleteCategory(categoryId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/services/categories/${categoryId}`)
    return { data: response.data }
  },

  /**
   * Reorder categories
   */
  async reorderCategories(categoryOrders: Array<{ id: number; display_order: number }>): Promise<ApiResponse<void>> {
    const response = await apiClient.post('/services/categories/reorder', { categories: categoryOrders })
    return { data: response.data }
  },

  // === SERVICE AVAILABILITY ===

  /**
   * Get service availability for barber/location
   */
  async getServiceAvailability(serviceId: number, barberId?: number, locationId?: number): Promise<ApiResponse<ServiceAvailability[]>> {
    const params = new URLSearchParams()
    if (barberId) params.append('barber_id', barberId.toString())
    if (locationId) params.append('location_id', locationId.toString())

    const response = await apiClient.get<ServiceAvailability[]>(`/services/${serviceId}/availability?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Update service availability
   */
  async updateServiceAvailability(
    serviceId: number,
    barberId: number,
    locationId: number,
    data: Partial<ServiceAvailability>
  ): Promise<ApiResponse<ServiceAvailability>> {
    const response = await apiClient.post<ServiceAvailability>(`/services/${serviceId}/availability`, {
      barber_id: barberId,
      location_id: locationId,
      ...data
    })
    return { data: response.data }
  },

  // === PRICING RULES ===

  /**
   * Get pricing rules for service
   */
  async getPricingRules(serviceId?: number, barberId?: number, locationId?: number): Promise<ApiResponse<PricingRule[]>> {
    const params = new URLSearchParams()
    if (serviceId) params.append('service_id', serviceId.toString())
    if (barberId) params.append('barber_id', barberId.toString())
    if (locationId) params.append('location_id', locationId.toString())

    const response = await apiClient.get<PricingRule[]>(`/services/pricing-rules?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Create pricing rule
   */
  async createPricingRule(data: Omit<PricingRule, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<PricingRule>> {
    const response = await apiClient.post<PricingRule>('/services/pricing-rules', data)
    return { data: response.data }
  },

  /**
   * Update pricing rule
   */
  async updatePricingRule(ruleId: number, data: Partial<PricingRule>): Promise<ApiResponse<PricingRule>> {
    const response = await apiClient.patch<PricingRule>(`/services/pricing-rules/${ruleId}`, data)
    return { data: response.data }
  },

  /**
   * Delete pricing rule
   */
  async deletePricingRule(ruleId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/services/pricing-rules/${ruleId}`)
    return { data: response.data }
  },

  /**
   * Calculate service price with rules applied
   */
  async calculatePrice(
    serviceId: number,
    barberId: number,
    appointmentDate: string,
    appointmentTime: string,
    clientId?: number
  ): Promise<ApiResponse<{
    base_price: number
    final_price: number
    applied_rules: Array<{
      rule_id: number
      rule_name: string
      adjustment: number
      description: string
    }>
    deposit_required: boolean
    deposit_amount?: number
  }>> {
    const response = await apiClient.post(`/services/${serviceId}/calculate-price`, {
      barber_id: barberId,
      appointment_date: appointmentDate,
      appointment_time: appointmentTime,
      client_id: clientId
    })
    return { data: response.data }
  },

  // === SERVICE PACKAGES ===

  /**
   * Get service packages
   */
  async getPackages(locationId?: number, barberId?: number): Promise<ApiResponse<ServicePackage[]>> {
    const params = new URLSearchParams()
    if (locationId) params.append('location_id', locationId.toString())
    if (barberId) params.append('barber_id', barberId.toString())

    const response = await apiClient.get<ServicePackage[]>(`/services/packages?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Create service package
   */
  async createPackage(data: Omit<ServicePackage, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<ServicePackage>> {
    const response = await apiClient.post<ServicePackage>('/services/packages', data)
    return { data: response.data }
  },

  /**
   * Update service package
   */
  async updatePackage(packageId: number, data: Partial<ServicePackage>): Promise<ApiResponse<ServicePackage>> {
    const response = await apiClient.patch<ServicePackage>(`/services/packages/${packageId}`, data)
    return { data: response.data }
  },

  /**
   * Delete service package
   */
  async deletePackage(packageId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/services/packages/${packageId}`)
    return { data: response.data }
  },

  // === ADDONS ===

  /**
   * Get service addons
   */
  async getAddons(serviceId?: number): Promise<ApiResponse<ServiceAddon[]>> {
    const params = serviceId ? `?service_id=${serviceId}` : ''
    const response = await apiClient.get<ServiceAddon[]>(`/services/addons${params}`)
    return { data: response.data }
  },

  /**
   * Create service addon
   */
  async createAddon(data: Omit<ServiceAddon, 'id'>): Promise<ApiResponse<ServiceAddon>> {
    const response = await apiClient.post<ServiceAddon>('/services/addons', data)
    return { data: response.data }
  },

  /**
   * Update service addon
   */
  async updateAddon(addonId: number, data: Partial<ServiceAddon>): Promise<ApiResponse<ServiceAddon>> {
    const response = await apiClient.patch<ServiceAddon>(`/services/addons/${addonId}`, data)
    return { data: response.data }
  },

  /**
   * Delete service addon
   */
  async deleteAddon(addonId: number): Promise<ApiResponse<void>> {
    const response = await apiClient.delete(`/services/addons/${addonId}`)
    return { data: response.data }
  },

  // === STATISTICS ===

  /**
   * Get service statistics
   */
  async getStats(
    startDate?: string,
    endDate?: string,
    locationId?: number,
    barberId?: number
  ): Promise<ApiResponse<ServiceStats>> {
    if (DEMO_MODE) {
      console.log('Demo mode active - returning mock service stats')
      return { data: MOCK_SERVICE_STATS }
    }

    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (locationId) params.append('location_id', locationId.toString())
    if (barberId) params.append('barber_id', barberId.toString())

    const response = await apiClient.get<ServiceStats>(`/services/stats?${params.toString()}`)
    return { data: response.data }
  },

  /**
   * Get popular services
   */
  async getPopularServices(
    limit = 10,
    period = '30d',
    locationId?: number,
    barberId?: number
  ): Promise<ApiResponse<Array<Service & { booking_count: number; revenue: number }>>> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      period
    })
    if (locationId) params.append('location_id', locationId.toString())
    if (barberId) params.append('barber_id', barberId.toString())

    const response = await apiClient.get(`/services/popular?${params.toString()}`)
    return { data: response.data }
  },

  // === BULK OPERATIONS ===

  /**
   * Bulk update services
   */
  async bulkUpdateServices(
    serviceIds: number[],
    updates: Partial<UpdateServiceRequest>
  ): Promise<ApiResponse<Service[]>> {
    const response = await apiClient.post<Service[]>('/services/bulk-update', {
      service_ids: serviceIds,
      updates
    })
    return { data: response.data }
  },

  /**
   * Bulk toggle service status
   */
  async bulkToggleStatus(serviceIds: number[], isActive: boolean): Promise<ApiResponse<Service[]>> {
    const response = await apiClient.post<Service[]>('/services/bulk-toggle-status', {
      service_ids: serviceIds,
      is_active: isActive
    })
    return { data: response.data }
  },

  /**
   * Duplicate service
   */
  async duplicateService(serviceId: number, newName?: string): Promise<ApiResponse<Service>> {
    const response = await apiClient.post<Service>(`/services/${serviceId}/duplicate`, {
      name: newName
    })
    return { data: response.data }
  },

  // === UTILITY METHODS ===

  /**
   * Search services
   */
  async searchServices(
    query: string,
    filters?: Omit<ServiceFilter, 'search'>
  ): Promise<PaginatedResponse<Service>> {
    return this.getServices({
      ...filters,
      search: query
    })
  },

  /**
   * Get services by category
   */
  async getServicesByCategory(categoryId: number, filters?: Omit<ServiceFilter, 'category_id'>): Promise<Service[]> {
    const response = await this.getServices({
      ...filters,
      category_id: categoryId,
      limit: 1000 // Get all services in category
    })
    return response.data
  },

  /**
   * Get featured services
   */
  async getFeaturedServices(locationId?: number, barberId?: number): Promise<Service[]> {
    const response = await this.getServices({
      is_featured: true,
      is_active: true,
      location_id: locationId,
      barber_id: barberId,
      limit: 100
    })
    return response.data
  },

  /**
   * Format service price
   */
  formatPrice(service: Service): string {
    if (service.min_price && service.max_price && service.min_price !== service.max_price) {
      return `$${service.min_price} - $${service.max_price}`
    }
    return `$${service.base_price}`
  },

  /**
   * Format service duration
   */
  formatDuration(durationMinutes: number): string {
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60

    if (hours === 0) {
      return `${minutes}m`
    } else if (minutes === 0) {
      return `${hours}h`
    } else {
      return `${hours}h ${minutes}m`
    }
  },

  /**
   * Get service color based on category
   */
  getServiceColor(service: Service): string {
    return service.category?.color || '#6b7280'
  },

  /**
   * Check if service requires deposit
   */
  requiresDeposit(service: Service): boolean {
    return service.requires_deposit && Boolean(service.deposit_amount)
  },

  /**
   * Calculate deposit amount
   */
  calculateDeposit(service: Service, totalPrice?: number): number {
    if (!service.requires_deposit || !service.deposit_amount) return 0

    if (service.deposit_type === 'percentage') {
      const price = totalPrice || service.base_price
      return (price * service.deposit_amount) / 100
    }

    return service.deposit_amount
  }
}
