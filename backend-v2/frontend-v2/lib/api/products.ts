/**
 * API client for product management and e-commerce functionality
 */

import { fetchAPI } from '../api'
import {
  Product,
  ProductCreate,
  ProductUpdate,
  ProductCatalogFilter,
  ProductCatalogResponse,
  ProductVariant,
  InventoryItem,
  InventoryUpdate,
  InventoryAdjustment,
  InventoryReport,
  Order,
  OrderCreate,
  OrderUpdate,
  POSTransaction,
  SalesReport,
  ShopifyProductSyncRequest,
  ShopifyProductSyncResponse
} from '@/types/product'

export const productsAPI = {
  // Product management
  async getProducts(filters?: ProductCatalogFilter): Promise<ProductCatalogResponse> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','))
          } else {
            params.append(key, String(value))
          }
        }
      })
    }
    
    return fetchAPI(`/api/v1/products?${params}`)
  },

  async getProduct(productId: number): Promise<Product> {
    return fetchAPI(`/api/v1/products/${productId}`)
  },

  async createProduct(product: ProductCreate): Promise<Product> {
    return fetchAPI('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(product)
    })
  },

  async updateProduct(productId: number, updates: ProductUpdate): Promise<Product> {
    return fetchAPI(`/api/v1/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },

  async deleteProduct(productId: number): Promise<{ message: string }> {
    return fetchAPI(`/api/v1/products/${productId}`, {
      method: 'DELETE'
    })
  },

  async uploadProductImage(productId: number, file: File): Promise<{ image_url: string }> {
    const formData = new FormData()
    formData.append('file', file)
    
    return fetchAPI(`/api/v1/products/${productId}/images`, {
      method: 'POST',
      body: formData
    })
  },

  // Product variants
  async createVariant(productId: number, variant: Omit<ProductVariant, 'id' | 'created_at' | 'updated_at'>): Promise<ProductVariant> {
    return fetchAPI(`/api/v1/products/${productId}/variants`, {
      method: 'POST',
      body: JSON.stringify(variant)
    })
  },

  async updateVariant(productId: number, variantId: number, updates: Partial<ProductVariant>): Promise<ProductVariant> {
    return fetchAPI(`/api/v1/products/${productId}/variants/${variantId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },

  async deleteVariant(productId: number, variantId: number): Promise<{ message: string }> {
    return fetchAPI(`/api/v1/products/${productId}/variants/${variantId}`, {
      method: 'DELETE'
    })
  },

  // Inventory management
  async getInventory(productId: number, locationId?: number): Promise<InventoryItem[]> {
    const params = locationId ? `?location_id=${locationId}` : ''
    return fetchAPI(`/api/v1/products/${productId}/inventory${params}`)
  },

  async updateInventory(productId: number, variantId: number, locationId: number, updates: InventoryUpdate): Promise<InventoryItem> {
    return fetchAPI(`/api/v1/products/${productId}/inventory`, {
      method: 'PUT',
      body: JSON.stringify({
        variant_id: variantId,
        location_id: locationId,
        ...updates
      })
    })
  },

  async adjustInventory(adjustments: InventoryAdjustment[]): Promise<{ message: string; updated: number }> {
    return fetchAPI('/api/v1/products/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({ adjustments })
    })
  },

  async getInventoryReport(locationId: number): Promise<InventoryReport> {
    return fetchAPI(`/api/v1/products/inventory/report?location_id=${locationId}`)
  },

  // Orders
  async getOrders(filters?: {
    status?: string
    payment_status?: string
    fulfillment_status?: string
    barber_id?: number
    start_date?: string
    end_date?: string
    limit?: number
    offset?: number
  }): Promise<{ orders: Order[]; total: number }> {
    const params = new URLSearchParams()
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value))
        }
      })
    }
    
    return fetchAPI(`/api/v1/products/orders?${params}`)
  },

  async getOrder(orderId: number): Promise<Order> {
    return fetchAPI(`/api/v1/products/orders/${orderId}`)
  },

  async createOrder(order: OrderCreate): Promise<Order> {
    return fetchAPI('/api/v1/products/orders', {
      method: 'POST',
      body: JSON.stringify(order)
    })
  },

  async updateOrder(orderId: number, updates: OrderUpdate): Promise<Order> {
    return fetchAPI(`/api/v1/products/orders/${orderId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })
  },

  async cancelOrder(orderId: number, reason?: string): Promise<Order> {
    return fetchAPI(`/api/v1/products/orders/${orderId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    })
  },

  async fulfillOrder(orderId: number, items?: Array<{ item_id: number; quantity: number }>): Promise<Order> {
    return fetchAPI(`/api/v1/products/orders/${orderId}/fulfill`, {
      method: 'POST',
      body: JSON.stringify({ items })
    })
  },

  // POS transactions
  async createPOSTransaction(transaction: Omit<POSTransaction, 'id' | 'created_at' | 'updated_at'>): Promise<POSTransaction> {
    return fetchAPI('/api/v1/products/pos/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction)
    })
  },

  async voidPOSTransaction(transactionId: number, reason: string): Promise<POSTransaction> {
    return fetchAPI(`/api/v1/products/pos/transactions/${transactionId}/void`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    })
  },

  // Reports
  async getSalesReport(params: {
    start_date: string
    end_date: string
    location_id?: number
    barber_id?: number
  }): Promise<SalesReport> {
    const queryParams = new URLSearchParams(params as any)
    return fetchAPI(`/api/v1/products/reports/sales?${queryParams}`)
  },

  async getCommissionReport(params: {
    barber_id: number
    start_date: string
    end_date: string
    include_paid?: boolean
  }): Promise<{
    total_pending: number
    total_paid: number
    items: Array<{
      date: string
      order_id?: number
      pos_transaction_id?: number
      description: string
      amount: number
      commission_rate: number
      commission_amount: number
      status: string
    }>
  }> {
    const queryParams = new URLSearchParams(params as any)
    return fetchAPI(`/api/v1/products/reports/commissions?${queryParams}`)
  },

  // Shopify integration
  async syncShopifyProducts(request: ShopifyProductSyncRequest): Promise<ShopifyProductSyncResponse> {
    return fetchAPI('/api/v1/products/shopify/sync', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  },

  async getShopifySyncStatus(integrationId: number): Promise<{
    last_sync_at?: string
    products_synced: number
    sync_in_progress: boolean
    last_error?: string
  }> {
    return fetchAPI(`/api/v1/products/shopify/status?integration_id=${integrationId}`)
  },

  async triggerShopifyWebhookResync(integrationId: number): Promise<{ message: string }> {
    return fetchAPI(`/api/v1/products/shopify/webhooks/resync`, {
      method: 'POST',
      body: JSON.stringify({ integration_id: integrationId })
    })
  }
}