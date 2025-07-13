/**
 * Services API Client
 * 
 * Provides comprehensive service catalog management functionality including:
 * - Service creation and management
 * - Service categories and pricing
 * - Service pricing rules and booking rules
 * - Barber-service assignments
 * - Public service catalog access
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ===============================
// TypeScript Interfaces
// ===============================

export type ServiceCategory = 
  | 'haircut'
  | 'shave'
  | 'beard'
  | 'hair_treatment'
  | 'styling'
  | 'color'
  | 'package'
  | 'other'

export interface ServiceBase {
  name: string
  description?: string
  category: ServiceCategory
  sku?: string
  base_price: number
  min_price?: number
  max_price?: number
  duration_minutes: number
  buffer_time_minutes: number
  is_active: boolean
  is_bookable_online: boolean
  max_advance_booking_days?: number
  min_advance_booking_hours?: number
  is_package: boolean
  package_discount_percent?: number
  package_discount_amount?: number
  display_order: number
  image_url?: string
  location_id?: number
}

export interface ServiceCreate extends ServiceBase {
  package_item_ids?: number[]
}

export interface ServiceUpdate {
  name?: string
  description?: string
  category?: ServiceCategory
  sku?: string
  base_price?: number
  min_price?: number
  max_price?: number
  duration_minutes?: number
  buffer_time_minutes?: number
  is_active?: boolean
  is_bookable_online?: boolean
  max_advance_booking_days?: number
  min_advance_booking_hours?: number
  is_package?: boolean
  package_discount_percent?: number
  package_discount_amount?: number
  display_order?: number
  image_url?: string
  location_id?: number
}

export interface Service extends ServiceBase {
  id: number
  created_at: string
  updated_at: string
  created_by_id?: number
  package_items?: Service[]
  pricing_rules?: ServicePricingRule[]
  booking_rules?: ServiceBookingRule[]
}

export interface ServiceResponse {
  service?: Service
  message?: string
}

export interface ServiceCategory {
  value: string
  name: string
  label: string
}

export interface ServicePricingRuleBase {
  rule_type: 'time_of_day' | 'day_of_week' | 'date_range' | 'demand'
  start_time?: string // HH:MM format
  end_time?: string // HH:MM format
  day_of_week?: number // 0-6 (Monday-Sunday)
  start_date?: string // YYYY-MM-DD format
  end_date?: string // YYYY-MM-DD format
  price_adjustment_type: 'percentage' | 'fixed'
  price_adjustment_value: number
  priority: number
  is_active: boolean
}

export interface ServicePricingRuleCreate extends ServicePricingRuleBase {}

export interface ServicePricingRule extends ServicePricingRuleBase {
  id: number
  service_id: number
  created_at: string
}

export interface ServiceBookingRuleBase {
  rule_type: string
  min_age?: number
  max_age?: number
  requires_consultation: boolean
  requires_patch_test: boolean
  patch_test_hours_before: number
  max_bookings_per_day?: number
  min_days_between_bookings?: number
  blocked_days_of_week?: number[] // 0-6 for days
  required_service_ids?: number[]
}

export interface ServiceBookingRuleCreate extends ServiceBookingRuleBase {}

export interface ServiceBookingRule extends ServiceBookingRuleBase {
  id: number
  service_id: number
  created_at: string
}

export interface BarberServiceAssignment {
  barber_id: number
  service_id: number
  is_available: boolean
  custom_price?: number
  custom_duration?: number
  notes?: string
}

export interface ServicePriceCalculation {
  base_price: number
  adjusted_price: number
  applied_rules: ServicePricingRule[]
  discount_amount?: number
  final_price: number
}

export interface ServiceFilters {
  category?: ServiceCategory
  barber_id?: number
  is_active?: boolean
  is_bookable_online?: boolean
  skip?: number
  limit?: number
}

export interface PublicServiceFilters {
  category?: ServiceCategory
  skip?: number
  limit?: number
}

// ===============================
// Utility Functions
// ===============================

/**
 * Get authorization headers with current JWT token
 */
function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

/**
 * Handle API response and extract data
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(errorData.detail || `Request failed with status ${response.status}`)
  }
  return response.json()
}

/**
 * Build query string from parameters
 */
function buildQueryString(params: Record<string, any>): string {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${encodeURIComponent(key)}=${value.map(v => encodeURIComponent(v)).join(',')}`
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
  
  return filtered.length > 0 ? `?${filtered.join('&')}` : ''
}

// ===============================
// Services API Client
// ===============================

export const servicesApi = {
  // ===============================
  // Public Service Access (No Auth Required)
  // ===============================

  /**
   * Get public services available for online booking
   */
  async getPublicServices(filters: PublicServiceFilters = {}): Promise<Service[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/public/services/${buildQueryString(filters)}`
    )

    return handleResponse(response)
  },

  /**
   * Get public service categories
   */
  async getPublicServiceCategories(): Promise<ServiceCategory[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/public/services/categories`)
    return handleResponse(response)
  },

  // ===============================
  // Service Categories
  // ===============================

  /**
   * Get all service categories
   */
  async getServiceCategories(): Promise<ServiceCategory[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/services/categories`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // Service Management
  // ===============================

  /**
   * Get list of services with optional filtering
   */
  async getServices(filters: ServiceFilters = {}): Promise<Service[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/services/${buildQueryString(filters)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get specific service by ID
   */
  async getService(serviceId: number): Promise<Service> {
    const response = await fetch(`${API_BASE_URL}/api/v1/services/${serviceId}`, {
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  /**
   * Create a new service
   */
  async createService(serviceData: ServiceCreate): Promise<Service> {
    const response = await fetch(`${API_BASE_URL}/api/v1/services/`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(serviceData)
    })

    return handleResponse(response)
  },

  /**
   * Update service information
   */
  async updateService(serviceId: number, updates: ServiceUpdate): Promise<Service> {
    const response = await fetch(`${API_BASE_URL}/api/v1/services/${serviceId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates)
    })

    return handleResponse(response)
  },

  /**
   * Delete service
   */
  async deleteService(serviceId: number): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/services/${serviceId}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    })

    return handleResponse(response)
  },

  // ===============================
  // Service Pricing Rules
  // ===============================

  /**
   * Create pricing rule for service
   */
  async createPricingRule(
    serviceId: number, 
    ruleData: ServicePricingRuleCreate
  ): Promise<ServicePricingRule> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/services/${serviceId}/pricing-rules`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(ruleData)
      }
    )

    return handleResponse(response)
  },

  /**
   * Get pricing rules for service
   */
  async getPricingRules(serviceId: number): Promise<ServicePricingRule[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/services/${serviceId}/pricing-rules`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Delete pricing rule
   */
  async deletePricingRule(serviceId: number, ruleId: number): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/services/${serviceId}/pricing-rules/${ruleId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Service Booking Rules
  // ===============================

  /**
   * Create booking rule for service
   */
  async createBookingRule(
    serviceId: number, 
    ruleData: ServiceBookingRuleCreate
  ): Promise<ServiceBookingRule> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/services/${serviceId}/booking-rules`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(ruleData)
      }
    )

    return handleResponse(response)
  },

  /**
   * Get booking rules for service
   */
  async getBookingRules(serviceId: number): Promise<ServiceBookingRule[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/services/${serviceId}/booking-rules`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Delete booking rule
   */
  async deleteBookingRule(serviceId: number, ruleId: number): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/services/${serviceId}/booking-rules/${ruleId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Barber-Service Assignments
  // ===============================

  /**
   * Assign service to barber
   */
  async assignServiceToBarber(
    serviceId: number, 
    barberId: number, 
    assignmentData?: Partial<BarberServiceAssignment>
  ): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/services/${serviceId}/barbers/${barberId}`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(assignmentData || {})
      }
    )

    return handleResponse(response)
  },

  /**
   * Remove service from barber
   */
  async removeServiceFromBarber(serviceId: number, barberId: number): Promise<{ message: string }> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/services/${serviceId}/barbers/${barberId}`,
      {
        method: 'DELETE',
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  /**
   * Get services offered by specific barber
   */
  async getBarberServices(barberId: number): Promise<Service[]> {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/services/barbers/${barberId}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Service Price Calculation
  // ===============================

  /**
   * Calculate service price with rules applied
   */
  async calculateServicePrice(
    serviceId: number,
    appointmentDate?: string,
    appointmentTime?: string,
    barberId?: number
  ): Promise<ServicePriceCalculation> {
    const params = {
      ...(appointmentDate && { appointment_date: appointmentDate }),
      ...(appointmentTime && { appointment_time: appointmentTime }),
      ...(barberId && { barber_id: barberId })
    }

    const response = await fetch(
      `${API_BASE_URL}/api/v1/services/${serviceId}/calculate-price${buildQueryString(params)}`,
      {
        headers: getAuthHeaders()
      }
    )

    return handleResponse(response)
  },

  // ===============================
  // Utility Methods
  // ===============================

  /**
   * Get category display name
   */
  getCategoryDisplay(category: ServiceCategory): string {
    const categoryMap: Record<ServiceCategory, string> = {
      'haircut': 'Haircut',
      'shave': 'Shave',
      'beard': 'Beard Care',
      'hair_treatment': 'Hair Treatment',
      'styling': 'Hair Styling',
      'color': 'Hair Color',
      'package': 'Service Package',
      'other': 'Other Services'
    }
    
    return categoryMap[category] || category
  },

  /**
   * Format service duration for display
   */
  formatDuration(durationMinutes: number): string {
    const hours = Math.floor(durationMinutes / 60)
    const minutes = durationMinutes % 60
    
    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}m`
    } else if (hours > 0) {
      return `${hours}h`
    } else {
      return `${minutes}m`
    }
  },

  /**
   * Format service price for display
   */
  formatPrice(price: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(price)
  },

  /**
   * Get price range display for variable pricing
   */
  getPriceRangeDisplay(service: Service): string {
    if (service.min_price && service.max_price) {
      return `${this.formatPrice(service.min_price)} - ${this.formatPrice(service.max_price)}`
    } else if (service.min_price) {
      return `From ${this.formatPrice(service.min_price)}`
    } else if (service.max_price) {
      return `Up to ${this.formatPrice(service.max_price)}`
    } else {
      return this.formatPrice(service.base_price)
    }
  },

  /**
   * Check if service has variable pricing
   */
  hasVariablePricing(service: Service): boolean {
    return !!(service.min_price || service.max_price)
  },

  /**
   * Check if service is a package
   */
  isPackage(service: Service): boolean {
    return service.is_package && service.package_items && service.package_items.length > 0
  },

  /**
   * Calculate package savings
   */
  calculatePackageSavings(service: Service): number {
    if (!this.isPackage(service) || !service.package_items) {
      return 0
    }

    const individualTotal = service.package_items.reduce(
      (total, item) => total + item.base_price, 
      0
    )
    
    if (service.package_discount_percent) {
      return individualTotal * (service.package_discount_percent / 100)
    } else if (service.package_discount_amount) {
      return service.package_discount_amount
    }
    
    return individualTotal - service.base_price
  },

  /**
   * Get service availability status
   */
  getAvailabilityStatus(service: Service): 'available' | 'unavailable' | 'online_only' | 'consultation_required' {
    if (!service.is_active) {
      return 'unavailable'
    }
    
    const hasConsultationRule = service.booking_rules?.some(rule => rule.requires_consultation)
    if (hasConsultationRule) {
      return 'consultation_required'
    }
    
    if (service.is_bookable_online) {
      return 'available'
    }
    
    return 'online_only'
  },

  /**
   * Check if service requires age verification
   */
  requiresAgeVerification(service: Service): boolean {
    return service.booking_rules?.some(rule => rule.min_age || rule.max_age) || false
  },

  /**
   * Check if service requires patch test
   */
  requiresPatchTest(service: Service): boolean {
    return service.booking_rules?.some(rule => rule.requires_patch_test) || false
  },

  /**
   * Get days of week that service is blocked
   */
  getBlockedDaysOfWeek(service: Service): number[] {
    const blockedDays: number[] = []
    
    service.booking_rules?.forEach(rule => {
      if (rule.blocked_days_of_week) {
        blockedDays.push(...rule.blocked_days_of_week)
      }
    })
    
    return [...new Set(blockedDays)] // Remove duplicates
  },

  /**
   * Sort services by category and display order
   */
  sortServices(services: Service[]): Service[] {
    return services.sort((a, b) => {
      // First sort by category
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      
      // Then by display order
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order
      }
      
      // Finally by name
      return a.name.localeCompare(b.name)
    })
  },

  /**
   * Group services by category
   */
  groupServicesByCategory(services: Service[]): Record<ServiceCategory, Service[]> {
    const grouped: Record<string, Service[]> = {}
    
    services.forEach(service => {
      if (!grouped[service.category]) {
        grouped[service.category] = []
      }
      grouped[service.category].push(service)
    })
    
    // Sort services within each category
    Object.keys(grouped).forEach(category => {
      grouped[category] = this.sortServices(grouped[category])
    })
    
    return grouped as Record<ServiceCategory, Service[]>
  }
}

export default servicesApi