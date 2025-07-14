import apiClient from './client'

// Types for Services (Barbershop Services)
export interface Service {
  id: number
  name: string
  description?: string
  category: 'haircut' | 'shave' | 'beard' | 'hair_treatment' | 'styling' | 'color' | 'package' | 'other'
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
  barber_id?: number
  created_at: string
  updated_at: string
  pricing_rules?: ServicePricingRule[]
  booking_rules?: ServiceBookingRule[]
}

export interface ServicePricingRule {
  id: number
  service_id: number
  rule_type: 'time_of_day' | 'day_of_week' | 'date_range' | 'demand'
  start_time?: string
  end_time?: string
  day_of_week?: number
  start_date?: string
  end_date?: string
  price_adjustment_type: 'percentage' | 'fixed'
  price_adjustment_value: number
  priority: number
  is_active: boolean
  created_at: string
}

export interface ServiceBookingRule {
  id: number
  service_id: number
  rule_type: string
  min_age?: number
  max_age?: number
  requires_consultation: boolean
  requires_patch_test: boolean
  patch_test_hours_before: number
  max_bookings_per_day?: number
  min_days_between_bookings?: number
  blocked_days_of_week?: number[]
  required_service_ids?: number[]
  incompatible_service_ids?: number[]
  is_active: boolean
  message?: string
  created_at: string
}

export interface ServiceCreateData {
  name: string
  description?: string
  category: string
  sku?: string
  base_price: number
  min_price?: number
  max_price?: number
  duration_minutes: number
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

// Types for Products (Retail Products)
export interface Product {
  id: number
  external_id?: string
  sku?: string
  name: string
  description?: string
  product_type: 'hair_care' | 'tools' | 'accessories' | 'merchandise' | 'services'
  vendor?: string
  tags: string[]
  price: number
  compare_at_price?: number
  cost_per_item?: number
  status: 'active' | 'inactive' | 'draft' | 'archived'
  published: boolean
  published_at?: string
  seo_title?: string
  seo_description?: string
  handle?: string
  location_id?: number
  commission_rate: number
  requires_shipping: boolean
  taxable: boolean
  created_at: string
  updated_at: string
  variants?: ProductVariant[]
  inventory_items?: InventoryItem[]
}

export interface ProductVariant {
  id: number
  product_id: number
  external_id?: string
  sku?: string
  title: string
  option1?: string
  option2?: string
  option3?: string
  price: number
  compare_at_price?: number
  cost_per_item?: number
  weight?: number
  weight_unit: string
  requires_shipping: boolean
  taxable: boolean
  inventory_quantity: number
  inventory_policy: string
  available: boolean
  position: number
  barcode?: string
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: number
  product_id: number
  location_id: number
  quantity_available: number
  quantity_reserved: number
  quantity_committed: number
  reorder_point: number
  reorder_quantity: number
  cost_per_item?: number
  currency: string
  track_inventory: boolean
  allow_oversell: boolean
  created_at: string
  updated_at: string
}

export interface ProductCreateData {
  name: string
  description?: string
  product_type: string
  vendor?: string
  tags?: string[]
  price: number
  compare_at_price?: number
  cost_per_item?: number
  status?: string
  published?: boolean
  seo_title?: string
  seo_description?: string
  handle?: string
  location_id?: number
  commission_rate?: number
  requires_shipping?: boolean
  taxable?: boolean
}

export interface CatalogStats {
  total_services: number
  total_products: number
  active_services: number
  active_products: number
  total_service_revenue: number
  total_product_revenue: number
  top_services: Service[]
  top_products: Product[]
  low_stock_products: Product[]
}

// Catalog Management API
export const catalogApi = {
  // Services Management
  async getServices(locationId?: number): Promise<Service[]> {
    const params = locationId ? { location_id: locationId } : {}
    const response = await apiClient.get('/services', { params })
    return response.data
  },

  async getService(id: number): Promise<Service> {
    const response = await apiClient.get(`/services/${id}`)
    return response.data
  },

  async createService(data: ServiceCreateData): Promise<Service> {
    const response = await apiClient.post('/services', data)
    return response.data
  },

  async updateService(id: number, data: Partial<ServiceCreateData>): Promise<Service> {
    const response = await apiClient.put(`/services/${id}`, data)
    return response.data
  },

  async deleteService(id: number): Promise<void> {
    await apiClient.delete(`/services/${id}`)
  },

  async duplicateService(id: number, newName: string): Promise<Service> {
    const response = await apiClient.post(`/services/${id}/duplicate`, { name: newName })
    return response.data
  },

  // Service Pricing Rules
  async getServicePricingRules(serviceId: number): Promise<ServicePricingRule[]> {
    const response = await apiClient.get(`/services/${serviceId}/pricing-rules`)
    return response.data
  },

  async createServicePricingRule(serviceId: number, data: any): Promise<ServicePricingRule> {
    const response = await apiClient.post(`/services/${serviceId}/pricing-rules`, data)
    return response.data
  },

  async updateServicePricingRule(serviceId: number, ruleId: number, data: any): Promise<ServicePricingRule> {
    const response = await apiClient.put(`/services/${serviceId}/pricing-rules/${ruleId}`, data)
    return response.data
  },

  async deleteServicePricingRule(serviceId: number, ruleId: number): Promise<void> {
    await apiClient.delete(`/services/${serviceId}/pricing-rules/${ruleId}`)
  },

  // Service Booking Rules
  async getServiceBookingRules(serviceId: number): Promise<ServiceBookingRule[]> {
    const response = await apiClient.get(`/services/${serviceId}/booking-rules`)
    return response.data
  },

  async createServiceBookingRule(serviceId: number, data: any): Promise<ServiceBookingRule> {
    const response = await apiClient.post(`/services/${serviceId}/booking-rules`, data)
    return response.data
  },

  async updateServiceBookingRule(serviceId: number, ruleId: number, data: any): Promise<ServiceBookingRule> {
    const response = await apiClient.put(`/services/${serviceId}/booking-rules/${ruleId}`, data)
    return response.data
  },

  async deleteServiceBookingRule(serviceId: number, ruleId: number): Promise<void> {
    await apiClient.delete(`/services/${serviceId}/booking-rules/${ruleId}`)
  },

  // Products Management
  async getProducts(locationId?: number): Promise<Product[]> {
    const params = locationId ? { location_id: locationId } : {}
    const response = await apiClient.get('/products', { params })
    return response.data
  },

  async getProduct(id: number): Promise<Product> {
    const response = await apiClient.get(`/products/${id}`)
    return response.data
  },

  async createProduct(data: ProductCreateData): Promise<Product> {
    const response = await apiClient.post('/products', data)
    return response.data
  },

  async updateProduct(id: number, data: Partial<ProductCreateData>): Promise<Product> {
    const response = await apiClient.put(`/products/${id}`, data)
    return response.data
  },

  async deleteProduct(id: number): Promise<void> {
    await apiClient.delete(`/products/${id}`)
  },

  async duplicateProduct(id: number, newName: string): Promise<Product> {
    const response = await apiClient.post(`/products/${id}/duplicate`, { name: newName })
    return response.data
  },

  // Product Variants
  async getProductVariants(productId: number): Promise<ProductVariant[]> {
    const response = await apiClient.get(`/products/${productId}/variants`)
    return response.data
  },

  async createProductVariant(productId: number, data: any): Promise<ProductVariant> {
    const response = await apiClient.post(`/products/${productId}/variants`, data)
    return response.data
  },

  async updateProductVariant(productId: number, variantId: number, data: any): Promise<ProductVariant> {
    const response = await apiClient.put(`/products/${productId}/variants/${variantId}`, data)
    return response.data
  },

  async deleteProductVariant(productId: number, variantId: number): Promise<void> {
    await apiClient.delete(`/products/${productId}/variants/${variantId}`)
  },

  // Inventory Management
  async getInventoryItems(productId: number): Promise<InventoryItem[]> {
    const response = await apiClient.get(`/products/${productId}/inventory`)
    return response.data
  },

  async updateInventoryItem(productId: number, locationId: number, data: any): Promise<InventoryItem> {
    const response = await apiClient.put(`/products/${productId}/inventory/${locationId}`, data)
    return response.data
  },

  async getLowStockProducts(locationId?: number): Promise<Product[]> {
    const params = locationId ? { location_id: locationId } : {}
    const response = await apiClient.get('/products/low-stock', { params })
    return response.data
  },

  // Catalog Statistics
  async getCatalogStats(locationId?: number): Promise<CatalogStats> {
    const params = locationId ? { location_id: locationId } : {}
    const response = await apiClient.get('/catalog/stats', { params })
    return response.data
  },

  // Bulk Operations
  async bulkUpdateServices(updates: Array<{ id: number; data: Partial<ServiceCreateData> }>): Promise<{ success: number; failed: number }> {
    const response = await apiClient.post('/services/bulk-update', { updates })
    return response.data
  },

  async bulkUpdateProducts(updates: Array<{ id: number; data: Partial<ProductCreateData> }>): Promise<{ success: number; failed: number }> {
    const response = await apiClient.post('/products/bulk-update', { updates })
    return response.data
  },

  async bulkDeleteServices(ids: number[]): Promise<{ success: number; failed: number }> {
    const response = await apiClient.post('/services/bulk-delete', { ids })
    return response.data
  },

  async bulkDeleteProducts(ids: number[]): Promise<{ success: number; failed: number }> {
    const response = await apiClient.post('/products/bulk-delete', { ids })
    return response.data
  },

  // Import/Export
  async importServices(file: File, locationId?: number): Promise<{ success: number; failed: number; errors: string[] }> {
    const formData = new FormData()
    formData.append('file', file)
    if (locationId) formData.append('location_id', locationId.toString())
    
    const response = await apiClient.post('/services/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  async importProducts(file: File, locationId?: number): Promise<{ success: number; failed: number; errors: string[] }> {
    const formData = new FormData()
    formData.append('file', file)
    if (locationId) formData.append('location_id', locationId.toString())
    
    const response = await apiClient.post('/products/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  async exportServices(locationId?: number, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const params: any = { format }
    if (locationId) params.location_id = locationId
    
    const response = await apiClient.get('/services/export', {
      params,
      responseType: 'blob'
    })
    return response.data
  },

  async exportProducts(locationId?: number, format: 'csv' | 'excel' = 'csv'): Promise<Blob> {
    const params: any = { format }
    if (locationId) params.location_id = locationId
    
    const response = await apiClient.get('/products/export', {
      params,
      responseType: 'blob'
    })
    return response.data
  },

  // Analytics
  async getServiceAnalytics(serviceId: number, dateRange?: { start: string; end: string }): Promise<any> {
    const params = dateRange ? { start_date: dateRange.start, end_date: dateRange.end } : {}
    const response = await apiClient.get(`/services/${serviceId}/analytics`, { params })
    return response.data
  },

  async getServiceMetrics(serviceId?: number, dateRange?: { start: string; end: string }): Promise<any> {
    // Placeholder for service metrics - returns empty metrics for now
    return {
      total_bookings: 0,
      total_revenue: 0,
      average_rating: 0,
      repeat_customers: 0,
      popular_times: [],
      performance_trends: []
    }
  },

  async getProductAnalytics(productId: number, dateRange?: { start: string; end: string }): Promise<any> {
    const params = dateRange ? { start_date: dateRange.start, end_date: dateRange.end } : {}
    const response = await apiClient.get(`/products/${productId}/analytics`, { params })
    return response.data
  }
}

export default catalogApi

// Export individual functions for direct imports
export const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  duplicateService,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCatalogStats,
  getServiceAnalytics,
  getServiceMetrics,
  getProductAnalytics
} = catalogApi