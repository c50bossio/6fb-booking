/**
 * TypeScript interfaces and types for product management
 * Matches backend product schemas
 */

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DRAFT = 'draft',
  ARCHIVED = 'archived'
}

export enum ProductType {
  PHYSICAL = 'physical',
  SERVICE = 'service',
  DIGITAL = 'digital',
  GIFT_CARD = 'gift_card'
}

export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PARTIALLY_PAID = 'partially_paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum FulfillmentStatus {
  UNFULFILLED = 'unfulfilled',
  PARTIAL = 'partial',
  FULFILLED = 'fulfilled',
  CANCELLED = 'cancelled'
}

export interface Product {
  id: number
  name: string
  sku: string
  description?: string
  product_type: ProductType
  status: ProductStatus
  price: number
  compare_at_price?: number
  cost?: number
  barcode?: string
  track_inventory: boolean
  weight?: number
  weight_unit?: string
  vendor?: string
  location_id?: number
  shopify_product_id?: string
  shopify_handle?: string
  tags: string[]
  images: string[]
  published: boolean
  published_at?: string
  created_at: string
  updated_at: string
  variants?: ProductVariant[]
  inventory?: InventoryItem[]
}

export interface ProductVariant {
  id: number
  product_id: number
  title: string
  sku?: string
  price: number
  compare_at_price?: number
  cost?: number
  barcode?: string
  inventory_quantity: number
  weight?: number
  weight_unit?: string
  shopify_variant_id?: string
  shopify_inventory_item_id?: string
  image_url?: string
  position: number
  option1?: string
  option2?: string
  option3?: string
  taxable: boolean
  requires_shipping: boolean
  created_at: string
  updated_at: string
}

export interface InventoryItem {
  id: number
  product_id: number
  variant_id?: number
  location_id: number
  quantity_available: number
  quantity_reserved: number
  quantity_incoming: number
  reorder_point?: number
  reorder_quantity?: number
  tracked: boolean
  updated_at: string
}

export interface Order {
  id: number
  order_number: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  status: OrderStatus
  payment_status: PaymentStatus
  fulfillment_status: FulfillmentStatus
  subtotal: number
  tax: number
  discount: number
  shipping: number
  total: number
  currency: string
  notes?: string
  tags: string[]
  barber_id?: number
  commission_barber_id?: number
  location_id?: number
  shopify_order_id?: string
  shopify_order_number?: string
  source_type: string
  payment_method?: string
  paid_at?: string
  fulfilled_at?: string
  cancelled_at?: string
  refunded_at?: string
  created_at: string
  updated_at: string
  items?: OrderItem[]
  commissions?: CommissionDetail[]
}

export interface OrderItem {
  id: number
  order_id: number
  product_id: number
  variant_id?: number
  product_name: string
  variant_title?: string
  sku?: string
  price: number
  quantity: number
  discount: number
  tax: number
  line_total: number
  requires_shipping: boolean
  is_gift_card: boolean
  shopify_line_item_id?: string
  fulfilled_quantity: number
  commission_rate: number
  commission_amount: number
  commission_paid: boolean
  commission_paid_at?: string
  notes?: string
  created_at: string
  updated_at: string
  product?: Product
  variant?: ProductVariant
}

export interface POSTransaction {
  id: number
  transaction_number: string
  barber_id: number
  location_id?: number
  items_json: any
  subtotal: number
  tax_amount: number
  discount_amount: number
  tip_amount: number
  total_amount: number
  payment_method: string
  payment_reference?: string
  customer_name?: string
  customer_phone?: string
  notes?: string
  commission_rate: number
  commission_amount: number
  commission_paid: boolean
  commission_paid_at?: string
  voided: boolean
  voided_at?: string
  voided_by?: number
  voided_reason?: string
  created_at: string
  updated_at: string
}

export interface CommissionDetail {
  id: number
  order_id?: number
  pos_transaction_id?: number
  barber_id: number
  amount: number
  rate: number
  status: 'pending' | 'paid' | 'cancelled'
  paid_at?: string
  payout_id?: string
  created_at: string
}

// API request/response types

export interface ProductCreate {
  name: string
  sku: string
  description?: string
  product_type: ProductType
  status?: ProductStatus
  price: number
  compare_at_price?: number
  cost?: number
  barcode?: string
  track_inventory?: boolean
  weight?: number
  weight_unit?: string
  vendor?: string
  location_id?: number
  tags?: string[]
  images?: string[]
  published?: boolean
}

export interface ProductUpdate extends Partial<ProductCreate> {}

export interface ProductCatalogFilter {
  search?: string
  product_type?: ProductType
  status?: ProductStatus
  vendor?: string
  location_id?: number
  published?: boolean
  min_price?: number
  max_price?: number
  tags?: string[]
  limit?: number
  offset?: number
}

export interface ProductCatalogResponse {
  products: Product[]
  total: number
  limit: number
  offset: number
  has_more: boolean
}

export interface InventoryUpdate {
  quantity_available?: number
  quantity_reserved?: number
  quantity_incoming?: number
  reorder_point?: number
  reorder_quantity?: number
}

export interface InventoryAdjustment {
  variant_id: number
  location_id: number
  adjustment: number
  reason: string
}

export interface InventoryReport {
  location_id: number
  total_products: number
  total_variants: number
  total_value: number
  low_stock_items: Array<{
    product_id: number
    variant_id?: number
    product_name: string
    variant_title?: string
    current_quantity: number
    reorder_point: number
  }>
  out_of_stock_items: Array<{
    product_id: number
    variant_id?: number
    product_name: string
    variant_title?: string
  }>
}

export interface OrderCreate {
  customer_name: string
  customer_email?: string
  customer_phone?: string
  notes?: string
  tags?: string[]
  barber_id?: number
  commission_barber_id?: number
  location_id?: number
  items: Array<{
    product_id: number
    variant_id?: number
    quantity: number
    price?: number
    discount?: number
  }>
}

export interface OrderUpdate {
  status?: OrderStatus
  payment_status?: PaymentStatus
  fulfillment_status?: FulfillmentStatus
  notes?: string
  tags?: string[]
}

export interface SalesReport {
  period_start: string
  period_end: string
  total_orders: number
  total_revenue: number
  total_products_sold: number
  total_commissions: number
  average_order_value: number
  top_products: Array<{
    product_id: number
    product_name: string
    quantity_sold: number
    revenue: number
  }>
  sales_by_day: Array<{
    date: string
    orders: number
    revenue: number
  }>
  commission_summary: {
    total_pending: number
    total_paid: number
    by_barber: Array<{
      barber_id: number
      barber_name: string
      pending_amount: number
      paid_amount: number
    }>
  }
}

export interface ShopifyProductSyncRequest {
  integration_id: number
  sync_type: 'full' | 'incremental'
  options?: {
    include_archived?: boolean
    update_existing?: boolean
  }
}

export interface ShopifyProductSyncResponse {
  success: boolean
  message: string
  synced_at: string
  products_synced: number
  products_created: number
  products_updated: number
  products_skipped: number
  errors: string[]
}